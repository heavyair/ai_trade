// Backfill preset_validation_snapshots.train_year_breakdown and validation_year_breakdown
// for legacy "我的模型" snapshots. This only fills audit/display data; it does not change
// reached_target or any saved aggregate validation result.

const { Pool } = require("pg");
const engine = require("./engine.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { annualizedUpsideDeviation } = require("../shared/volatility.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const DATABASE_SSL = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
const MIN_UPSIDE_GATE_ROWS = 30;

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: 0,
    ownerUserId: "",
    onlyMissing: true,
  };
  for (const arg of argv) {
    if (arg === "--dryRun") options.dryRun = true;
    else if (arg === "--all") options.onlyMissing = false;
    else if (arg.startsWith("--limit=")) {
      const value = Math.round(Number(arg.slice("--limit=".length)));
      if (Number.isFinite(value) && value > 0) options.limit = value;
    } else if (arg.startsWith("--ownerUserId=")) {
      options.ownerUserId = arg.slice("--ownerUserId=".length).trim();
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

function buildWindowBreakdown({ allRows, states, start, end, upsideThresholdPercent, drawdownTolerancePercent, targetPercent = null }) {
  const windowRows = allRows.filter((row) => row.date >= start && row.date < end);
  let baselineIndex = -1;
  let endIndex = -1;
  for (let i = 0; i < states.length; i += 1) {
    const date = states[i].row.date;
    if (date < start) baselineIndex = i;
    if (date < end) endIndex = i;
  }

  const upsideDeviation = windowRows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(windowRows) : null;
  const requiredAnnualizedReturn = upsideDeviation !== null ? (upsideThresholdPercent / 100) * upsideDeviation : null;
  let buyHoldMaxDrawdown = null;
  let allowedMaxDrawdown = null;
  if (windowRows.length > 0) {
    const buyHoldStates = engine.buildBuyHoldStates(windowRows, INITIAL_CASH, TRADE_FEE);
    buyHoldMaxDrawdown = buyHoldStates.length ? buyHoldStates[buyHoldStates.length - 1].maxDrawdown : null;
    allowedMaxDrawdown = buyHoldMaxDrawdown !== null ? buyHoldMaxDrawdown * (1 + drawdownTolerancePercent / 100) : null;
  }

  if (endIndex < 0) {
    return {
      start, end, annualizedReturn: null, returnRate: null, trades: null, rows: 0,
      maxDrawdown: null, buyHoldMaxDrawdown, upsideDeviation, requiredAnnualizedReturn,
      allowedMaxDrawdown, passesTargetGate: targetPercent === null,
      passesUpsideGate: requiredAnnualizedReturn === null,
      passesDrawdownGate: allowedMaxDrawdown === null,
    };
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

  return {
    start, end, annualizedReturn, returnRate, trades, rows: rowsInWindow,
    maxDrawdown, buyHoldMaxDrawdown, upsideDeviation, requiredAnnualizedReturn,
    allowedMaxDrawdown,
    passesTargetGate: targetPercent === null || (annualizedReturn !== null && annualizedReturn >= targetPercent),
    passesUpsideGate: requiredAnnualizedReturn === null || (annualizedReturn !== null && annualizedReturn >= requiredAnnualizedReturn),
    passesDrawdownGate: allowedMaxDrawdown === null || maxDrawdown < allowedMaxDrawdown,
  };
}

function buildTrainBreakdown(allRows, config, row) {
  const trainStartDate = toIsoDate(row.train_start_date);
  const trainEndDate = toIsoDate(row.train_end_date);
  if (!trainStartDate || !trainEndDate || trainStartDate >= trainEndDate) return [];
  const trainRows = allRows.filter((priceRow) => priceRow.date >= trainStartDate && priceRow.date < trainEndDate);
  if (!trainRows.length) return [];
  const states = engine.buildBacktestStates(trainRows, config);
  if (!states.length) return [];
  const breakdown = [];
  for (let yearIndex = 0; yearIndex < 10; yearIndex += 1) {
    const start = toIsoDate(shiftYears(new Date(trainStartDate), yearIndex));
    const nextEnd = toIsoDate(shiftYears(new Date(trainStartDate), yearIndex + 1));
    if (!start || !nextEnd || start >= trainEndDate) break;
    const end = nextEnd > trainEndDate ? trainEndDate : nextEnd;
    breakdown.push(buildWindowBreakdown({
      allRows,
      states,
      start,
      end,
      upsideThresholdPercent: row.upside_threshold_percent,
      drawdownTolerancePercent: row.drawdown_tolerance_percent,
    }));
  }
  return breakdown;
}

function buildValidationBreakdown(allRows, config, row) {
  const windows = [
    [toIsoDate(row.test_year1_start_date), toIsoDate(row.test_year1_end_date)],
    [toIsoDate(row.test_year2_start_date), toIsoDate(row.test_year2_end_date)],
  ].filter(([start, end]) => start && end && start < end);
  if (!windows.length) return [];
  const firstStart = windows[0][0];
  const lastEnd = windows[windows.length - 1][1];
  const rows = allRows.filter((priceRow) => priceRow.date >= firstStart && priceRow.date < lastEnd);
  if (!rows.length) return [];
  const states = engine.buildBacktestStates(rows, config);
  if (!states.length) return [];
  return windows.map(([start, end]) => buildWindowBreakdown({
    allRows,
    states,
    start,
    end,
    upsideThresholdPercent: row.upside_threshold_percent,
    drawdownTolerancePercent: row.drawdown_tolerance_percent,
    targetPercent: row.target_percent,
  }));
}

async function loadCandidates(pool, options) {
  const params = [];
  const filters = [
    "sp.hidden_at IS NULL",
    "COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', '')) IS NOT NULL",
  ];
  if (options.onlyMissing) {
    filters.push("(jsonb_array_length(COALESCE(pvs.train_year_breakdown, '[]'::jsonb)) = 0 OR jsonb_array_length(COALESCE(pvs.validation_year_breakdown, '[]'::jsonb)) = 0)");
  }
  if (options.ownerUserId) {
    params.push(options.ownerUserId);
    filters.push(`sp.owner_user_id = $${params.length}`);
  }
  let limitClause = "";
  if (options.limit > 0) {
    params.push(options.limit);
    limitClause = `LIMIT $${params.length}`;
  }
  const result = await pool.query(`
    SELECT
      pvs.*, sp.owner_user_id, sp.label, sp.strategy_type, sp.config,
      UPPER(COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', ''))) AS symbol,
      CASE
        WHEN UPPER(COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', ''))) ~ '^[0-9]{6}$'
          THEN CASE WHEN UPPER(COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', ''))) ~ '^[569]' THEN '1' ELSE '0' END
        ELSE 'US'
      END AS market
    FROM preset_validation_snapshots pvs
    JOIN strategy_presets sp ON sp.id = pvs.preset_id
    WHERE ${filters.join(" AND ")}
    ORDER BY pvs.updated_at ASC
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
    const candidates = await loadCandidates(pool, options);
    console.log(`[backfill-preset-breakdowns] candidates=${candidates.length} dryRun=${options.dryRun} onlyMissing=${options.onlyMissing}`);
    let updated = 0;
    let skipped = 0;
    let errored = 0;
    for (const row of candidates) {
      try {
        const rawConfig = row.config && typeof row.config === "object" ? row.config : {};
        const strategyType = row.strategy_type || rawConfig.strategyType || "wave";
        const config = engine.buildConfigFromPresetObject(
          { ...rawConfig, strategyType },
          { initialCash: Number(rawConfig.initialCash) || INITIAL_CASH, tradeFee: Number(rawConfig.tradeFee) || TRADE_FEE, strategyType }
        );
        engine.setActiveLotSizeSymbol(row.symbol);
        const allRows = await loadRowsForSymbol(pool, row.symbol, row.market);
        const trainBreakdown = buildTrainBreakdown(allRows, config, row);
        const validationBreakdown = buildValidationBreakdown(allRows, config, row);
        if (!trainBreakdown.length && !validationBreakdown.length) {
          skipped += 1;
          console.log(`[skip] ${row.preset_id} ${row.symbol}: no breakdown`);
          continue;
        }
        if (!options.dryRun) {
          await pool.query(`
            UPDATE preset_validation_snapshots
            SET
              train_year_breakdown = CASE WHEN $2::jsonb <> '[]'::jsonb THEN $2::jsonb ELSE train_year_breakdown END,
              validation_year_breakdown = CASE WHEN $3::jsonb <> '[]'::jsonb THEN $3::jsonb ELSE validation_year_breakdown END,
              updated_at = NOW()
            WHERE preset_id = $1
          `, [row.preset_id, JSON.stringify(trainBreakdown), JSON.stringify(validationBreakdown)]);
        }
        updated += 1;
        console.log(`[${options.dryRun ? "dry" : "updated"}] ${row.preset_id} ${row.symbol}: trainYears=${trainBreakdown.length} validationYears=${validationBreakdown.length}`);
      } catch (error) {
        errored += 1;
        console.error(`[error] ${row.preset_id} ${row.symbol}: ${error.message}`);
      }
    }
    console.log(`[backfill-preset-breakdowns] done updated=${updated} skipped=${skipped} errored=${errored}`);
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
