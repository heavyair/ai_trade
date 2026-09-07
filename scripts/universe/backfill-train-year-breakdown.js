// Backfill optimization_scan_results.train_year_breakdown for legacy validated-search rows.
// This is an audit-data fill only: it never changes reached_target. The watchable-model list
// still applies its strict current gate when deciding whether a row can be shown.

const { Pool } = require("pg");
const engine = require("./engine.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { annualizedUpsideDeviation } = require("../shared/volatility.js");
const { ensureResultsTable } = require("../shared/optimization-results.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const DATABASE_SSL = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
const MIN_UPSIDE_GATE_ROWS = 30;

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: 0,
    onlyReachedTarget: true,
  };
  for (const arg of argv) {
    if (arg === "--dryRun") options.dryRun = true;
    else if (arg === "--all") options.onlyReachedTarget = false;
    else if (arg.startsWith("--limit=")) {
      const value = Math.round(Number(arg.slice("--limit=".length)));
      if (Number.isFinite(value) && value > 0) options.limit = value;
    }
  }
  return options;
}

function toIsoDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function shiftYears(date, years) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

function buildYearBreakdown(rows, config, row) {
  const trainStartDate = toIsoDate(row.train_start_date);
  const trainEndDate = toIsoDate(row.train_end_date);
  if (!trainStartDate || !trainEndDate) return [];
  const trainRows = rows.filter((priceRow) => priceRow.date >= trainStartDate && priceRow.date < trainEndDate);
  if (!trainRows.length) return [];

  engine.setActiveLotSizeSymbol(row.symbol);
  const states = engine.buildBacktestStates(trainRows, config);
  if (!states.length) return [];

  const upsideThresholdPercent = Number(row.upside_threshold_percent) || 30;
  const drawdownTolerancePercent = Number(row.drawdown_tolerance_percent) || 5;
  const breakdown = [];
  for (let yearIndex = 0; yearIndex < 10; yearIndex += 1) {
    const start = toIsoDate(shiftYears(new Date(trainStartDate), yearIndex));
    const end = toIsoDate(shiftYears(new Date(trainStartDate), yearIndex + 1));
    if (!start || !end || start >= trainEndDate) break;
    const cappedEnd = end > trainEndDate ? trainEndDate : end;
    const yearRows = rows.filter((priceRow) => priceRow.date >= start && priceRow.date < cappedEnd);

    let baselineIndex = -1;
    let endIndex = -1;
    for (let i = 0; i < states.length; i += 1) {
      const date = states[i].row.date;
      if (date < start) baselineIndex = i;
      if (date < cappedEnd) endIndex = i;
    }

    const upsideDeviation = yearRows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(yearRows) : null;
    const requiredAnnualizedReturn = upsideDeviation !== null ? (upsideThresholdPercent / 100) * upsideDeviation : null;
    let buyHoldMaxDrawdown = null;
    let allowedMaxDrawdown = null;
    if (yearRows.length > 0) {
      const buyHoldStates = engine.buildBuyHoldStates(yearRows, INITIAL_CASH, TRADE_FEE);
      buyHoldMaxDrawdown = buyHoldStates.length ? buyHoldStates[buyHoldStates.length - 1].maxDrawdown : null;
      allowedMaxDrawdown = buyHoldMaxDrawdown !== null ? buyHoldMaxDrawdown * (1 + drawdownTolerancePercent / 100) : null;
    }

    if (endIndex < 0) {
      breakdown.push({
        start, end: cappedEnd, annualizedReturn: null, returnRate: null, trades: null, rows: 0,
        maxDrawdown: null, buyHoldMaxDrawdown, upsideDeviation, requiredAnnualizedReturn,
        allowedMaxDrawdown, passesUpsideGate: false, passesDrawdownGate: false,
      });
      continue;
    }

    const baselineEquity = baselineIndex >= 0 ? states[baselineIndex].equity : states[0].equity;
    const rowsInWindow = endIndex - baselineIndex;
    const baselineTrades = baselineIndex >= 0 ? states[baselineIndex].trades.length : 0;
    const returnRate = rowsInWindow > 0 && baselineEquity > 0
      ? ((states[endIndex].equity - baselineEquity) / baselineEquity) * 100
      : null;
    const annualizedReturn = returnRate !== null ? annualizedReturnRate(returnRate, rowsInWindow) : null;
    const trades = states[endIndex].trades.length - baselineTrades;

    let peak = baselineEquity;
    let maxDrawdown = 0;
    for (let i = baselineIndex + 1; i <= endIndex; i += 1) {
      const equity = states[i].equity;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak > 0 ? ((peak - equity) / peak) * 100 : 0);
    }

    breakdown.push({
      start, end: cappedEnd, annualizedReturn, returnRate, trades, rows: rowsInWindow,
      maxDrawdown, buyHoldMaxDrawdown, upsideDeviation, requiredAnnualizedReturn,
      allowedMaxDrawdown,
      passesUpsideGate: requiredAnnualizedReturn !== null && annualizedReturn !== null && annualizedReturn >= requiredAnnualizedReturn,
      passesDrawdownGate: allowedMaxDrawdown !== null && maxDrawdown < allowedMaxDrawdown,
    });
  }
  return breakdown;
}

async function loadCandidates(pool, options) {
  const params = [];
  const filters = [
    "source = 'validated-search'",
    "jsonb_array_length(COALESCE(train_year_breakdown, '[]'::jsonb)) = 0",
    "train_start_date IS NOT NULL",
    "train_end_date IS NOT NULL",
  ];
  if (options.onlyReachedTarget) filters.push("reached_target = TRUE");
  let limitClause = "";
  if (options.limit > 0) {
    params.push(options.limit);
    limitClause = `LIMIT $${params.length}`;
  }
  const result = await pool.query(`
    SELECT id, symbol, market, preset_label, strategy_type, best_config,
           train_start_date, train_end_date, target_percent,
           upside_threshold_percent, drawdown_tolerance_percent
    FROM optimization_scan_results
    WHERE ${filters.join(" AND ")}
    ORDER BY scanned_at ASC
    ${limitClause}
  `, params);
  return result.rows;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
  });
  try {
    await ensureResultsTable(pool);
    const candidates = await loadCandidates(pool, options);
    console.log(`[backfill-train-year] candidates=${candidates.length} dryRun=${options.dryRun} onlyReachedTarget=${options.onlyReachedTarget}`);
    let updated = 0;
    let skipped = 0;
    let errored = 0;
    for (const row of candidates) {
      try {
        const rawConfig = row.best_config && typeof row.best_config === "object" ? row.best_config : {};
        const strategyType = row.strategy_type || rawConfig.strategyType || "wave";
        const config = engine.buildConfigFromPresetObject(
          { ...rawConfig, strategyType },
          { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType }
        );
        const rows = await loadRowsForSymbol(pool, row.symbol, row.market);
        const breakdown = buildYearBreakdown(rows, config, row);
        if (!breakdown.length) {
          skipped += 1;
          console.log(`[skip] ${row.id} ${row.symbol}: no train-year breakdown`);
          continue;
        }
        const failed = breakdown.filter((year) => !year.passesUpsideGate || !year.passesDrawdownGate).length;
        if (!options.dryRun) {
          await pool.query(
            "UPDATE optimization_scan_results SET train_year_breakdown = $2::jsonb WHERE id = $1",
            [row.id, JSON.stringify(breakdown)]
          );
        }
        updated += 1;
        console.log(`[${options.dryRun ? "dry" : "updated"}] ${row.id} ${row.symbol}: years=${breakdown.length} failedYears=${failed}`);
      } catch (error) {
        errored += 1;
        console.error(`[error] ${row.id} ${row.symbol}: ${error.message}`);
      }
    }
    console.log(`[backfill-train-year] done updated=${updated} skipped=${skipped} errored=${errored}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
