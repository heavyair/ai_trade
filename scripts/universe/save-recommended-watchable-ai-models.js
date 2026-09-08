// Save recommended watchable AI scan results as the admin user's own models.
// Selection rule: for each stock and strategy type, keep only the highest recommendation score.
// Existing models from the same scan_id are skipped.

const crypto = require("crypto");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { annualizedUpsideDeviation } = require("../shared/volatility.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const DATABASE_SSL = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
const MIN_UPSIDE_GATE_ROWS = 30;

function parseArgs(argv) {
  const options = {
    dryRun: false,
    ownerEmail: ADMIN_EMAIL,
    limit: 0,
  };
  for (const arg of argv) {
    if (arg === "--dryRun") options.dryRun = true;
    else if (arg.startsWith("--ownerEmail=")) options.ownerEmail = arg.slice("--ownerEmail=".length).trim().toLowerCase();
    else if (arg.startsWith("--limit=")) {
      const value = Math.round(Number(arg.slice("--limit=".length)));
      if (Number.isFinite(value) && value > 0) options.limit = value;
    }
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

function userIdForEmail(email) {
  return `user_${sha256(email).slice(0, 32)}`;
}

function normalizePresetKey(name) {
  return String(name || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
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

function buildScanPresetLabel(row) {
  const symbol = String(row.symbol || "").trim();
  const formatReturn = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? `${number >= 0 ? "+" : ""}${number.toFixed(1)}%` : "--";
  };
  const formatTrades = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? `${Math.max(0, Math.round(number))}笔` : "--";
  };
  return [
    "AI",
    symbol,
    "验证1年",
    formatReturn(row.test_year1_annualized_return),
    formatTrades(row.test_year1_trades),
    "验证2年",
    formatReturn(row.test_year2_annualized_return),
    formatTrades(row.test_year2_trades),
  ].filter(Boolean).join(" ").slice(0, 100);
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
      passesUpsideGate: false,
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
    passesUpsideGate: requiredAnnualizedReturn !== null && annualizedReturn !== null && annualizedReturn >= requiredAnnualizedReturn,
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
    breakdown.push(buildWindowBreakdown({
      allRows,
      states,
      start,
      end: nextEnd > trainEndDate ? trainEndDate : nextEnd,
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

function yearBreakdownPasses(years, options = {}) {
  const visible = Array.isArray(years) ? years : [];
  const minYears = Number(options.minYears) || 1;
  const targetPercent = Number(options.targetPercent) || 50;
  const requireTarget = Boolean(options.requireTarget);
  if (visible.length < minYears) return false;
  return visible.slice(0, minYears).every((year) => {
    const annualized = Number(year.annualizedReturn);
    if (!Number.isFinite(annualized)) return false;
    if (requireTarget && annualized < targetPercent) return false;
    if ((Number(year.rows) || 0) < MIN_UPSIDE_GATE_ROWS) return false;
    if (year.requiredAnnualizedReturn === null || year.requiredAnnualizedReturn === undefined) return false;
    const requiredAnnualizedReturn = Number(year.requiredAnnualizedReturn);
    if (!Number.isFinite(requiredAnnualizedReturn) || annualized < requiredAnnualizedReturn) return false;
    const allowedMaxDrawdown = Number(year.allowedMaxDrawdown);
    const maxDrawdown = Number(year.maxDrawdown);
    if (!Number.isFinite(allowedMaxDrawdown) || !Number.isFinite(maxDrawdown) || !(maxDrawdown < allowedMaxDrawdown)) return false;
    if (year.passesUpsideGate === false || year.passesDrawdownGate === false) return false;
    if (year.passesTargetGate === false) return false;
    return true;
  });
}

function recommendationScore(row) {
  const status = row.validation_status || "valid";
  const totalTrades = Number(row.test_year1_trades || 0) + Number(row.test_year2_trades || 0);
  const worstYearReturn = Math.min(Number(row.test_year1_annualized_return) || 0, Number(row.test_year2_annualized_return) || 0);
  const maxDiff = Math.max(Number(row.annualized_diff_year1) || 0, Number(row.annualized_diff_year2) || 0);
  const tradeDiff = Math.abs(Number(row.test_year1_trades || 0) - Number(row.test_year2_trades || 0));
  const strategyScores = {
    "block-rules": 90,
    wave: 80,
    "local-high-ladder": 75,
    "order-grid": 55,
    "score-rules": 45,
    "stagnation-reversal": 30,
    "ma-rsi-band": 20,
  };
  const tradeScore = totalTrades >= 11 && totalTrades <= 60 ? 220
    : totalTrades >= 61 && totalTrades <= 120 ? 180
      : totalTrades >= 6 && totalTrades <= 10 ? 130
        : totalTrades > 120 ? 90
          : totalTrades >= 3 && totalTrades <= 5 ? 60
            : 0;
  return (status === "valid" ? 1000 : status === "watching" ? 780 : 0)
    + tradeScore
    + (strategyScores[row.strategy_type] || 10)
    + Math.min(Math.max(worstYearReturn, 0), 300)
    - Math.min(maxDiff, 300) * 0.15
    - Math.min(tradeDiff, 200) * 0.25;
}

async function loadRawCandidates(pool) {
  const result = await pool.query(`
    SELECT osr.*, COALESCE(mvs.status, 'valid') AS validation_status
    FROM optimization_scan_results osr
    LEFT JOIN model_validation_states mvs
      ON mvs.subject_type = 'ai_scan' AND mvs.subject_id = osr.id
    WHERE osr.source = 'validated-search'
      AND osr.reached_target = TRUE
      AND (osr.test_year1_trades + osr.test_year2_trades) > 0
      AND COALESCE(mvs.status, 'valid') <> 'invalid'
    ORDER BY osr.scanned_at DESC
  `);
  return result.rows;
}

async function saveCandidate(pool, row, ownerUserId, ownerEmail, breakdowns, dryRun) {
  const exists = await pool.query(`
    SELECT id, label
    FROM strategy_presets
    WHERE owner_user_id = $1 AND original_model_id = $2 AND hidden_at IS NULL
    LIMIT 1
  `, [ownerUserId, row.id]);
  if (exists.rows.length > 0) {
    return { status: "skipped", reason: "已在我的模型", presetId: exists.rows[0].id, label: exists.rows[0].label };
  }
  const rawConfig = row.best_config && typeof row.best_config === "object" ? row.best_config : {};
  const strategyType = row.strategy_type || rawConfig.strategyType || "wave";
  const configPayload = { ...rawConfig, strategyType };
  const newId = randomId("preset");
  const label = buildScanPresetLabel(row) || row.preset_label || "AI 模型";
  const today = new Date().toISOString().slice(0, 10);
  const meta = {
    targetSymbol: row.symbol || "通用",
    provedPeriod: `${toIsoDate(row.train_start_date) || "?"}至${toIsoDate(row.test_year2_end_date) || "?"}`,
    creator: "auto",
    createdAt: today,
    updatedAt: today,
    originalText: row.model_reason || "",
    modelText: row.model_reason || "",
    ownerEmail,
    isOwner: true,
    isPublic: false,
    isLegacy: false,
    originalModelId: row.id,
    originalModelLabel: row.preset_label || "",
    originalModelNumericId: row.numeric_id !== null && row.numeric_id !== undefined ? Number(row.numeric_id) : null,
  };
  const trainYears = toIsoDate(row.train_start_date) && toIsoDate(row.train_end_date)
    ? Math.max(1, Math.round((new Date(row.train_end_date) - new Date(row.train_start_date)) / 86400000 / 365.25))
    : 4;
  const testYears = toIsoDate(row.test_year1_start_date) && toIsoDate(row.test_year2_end_date)
    ? Math.max(1, Math.round((new Date(row.test_year2_end_date) - new Date(row.test_year1_start_date)) / 86400000 / 365.25))
    : 2;

  if (!dryRun) {
    await pool.query(`
      INSERT INTO strategy_presets (
        id, owner_user_id, name, label, strategy_type, config, meta,
        original_text, model_text, is_legacy, original_model_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, FALSE, $10, NOW(), NOW())
    `, [
      newId, ownerUserId, normalizePresetKey(newId), label, strategyType,
      JSON.stringify(configPayload), JSON.stringify(meta),
      row.model_reason || "", row.model_reason || "", row.id,
    ]);
    await pool.query(`
      INSERT INTO preset_validation_snapshots (
        preset_id, train_years, test_years,
        train_annualized_return, train_start_date, train_end_date,
        test_year1_annualized_return, test_year1_return_rate, test_year1_max_drawdown, test_year1_trades, test_year1_start_date, test_year1_end_date,
        test_year2_annualized_return, test_year2_return_rate, test_year2_max_drawdown, test_year2_trades, test_year2_start_date, test_year2_end_date,
        annualized_diff_year1, annualized_diff_year2, reached_target,
        train_year_breakdown, validation_year_breakdown,
        target_percent, upside_threshold_percent, drawdown_tolerance_percent,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11::date, $12::date, $13, $14, $15, $16, $17::date, $18::date, $19, $20, TRUE, $21::jsonb, $22::jsonb, $23, $24, $25, NOW())
    `, [
      newId, trainYears, testYears,
      Number(row.train_annualized_return) || 0, row.train_start_date, row.train_end_date,
      Number(row.test_year1_annualized_return) || 0, Number(row.test_year1_return_rate) || 0, Number(row.test_year1_max_drawdown) || 0, row.test_year1_trades || 0, row.test_year1_start_date, row.test_year1_end_date,
      Number(row.test_year2_annualized_return) || 0, Number(row.test_year2_return_rate) || 0, Number(row.test_year2_max_drawdown) || 0, row.test_year2_trades || 0, row.test_year2_start_date, row.test_year2_end_date,
      Number(row.annualized_diff_year1) || 0, Number(row.annualized_diff_year2) || 0,
      JSON.stringify(breakdowns.train), JSON.stringify(breakdowns.validation),
      Number(row.target_percent) || 50, Number(row.upside_threshold_percent) || 30, Number(row.drawdown_tolerance_percent) || 5,
    ]);
  }
  return { status: dryRun ? "dry" : "saved", presetId: newId, label };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ownerUserId = userIdForEmail(options.ownerEmail);
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
  });
  try {
    const rawCandidates = await loadRawCandidates(pool);
    const eligible = [];
    let rejected = 0;
    for (const row of rawCandidates) {
      try {
        const rawConfig = row.best_config && typeof row.best_config === "object" ? row.best_config : {};
        const strategyType = row.strategy_type || rawConfig.strategyType || "wave";
        const config = engine.buildConfigFromPresetObject(
          { ...rawConfig, strategyType },
          { initialCash: Number(rawConfig.initialCash) || INITIAL_CASH, tradeFee: Number(rawConfig.tradeFee) || TRADE_FEE, strategyType }
        );
        engine.setActiveLotSizeSymbol(row.symbol);
        const allRows = await loadRowsForSymbol(pool, row.symbol, row.market);
        const train = buildTrainBreakdown(allRows, config, row);
        const validation = buildValidationBreakdown(allRows, config, row);
        const targetPercent = Number(row.target_percent) || 50;
        if (!yearBreakdownPasses(train, { minYears: 4 }) || !yearBreakdownPasses(validation, { requireTarget: true, targetPercent, minYears: 2 })) {
          rejected += 1;
          continue;
        }
        eligible.push({ row, score: recommendationScore(row), train, validation });
      } catch (error) {
        rejected += 1;
        console.error(`[reject] ${row.id} ${row.symbol}: ${error.message}`);
      }
    }

    const bestBySymbolStrategy = new Map();
    for (const item of eligible) {
      const key = `${item.row.symbol}::${item.row.strategy_type}`;
      const existing = bestBySymbolStrategy.get(key);
      if (!existing || item.score > existing.score) bestBySymbolStrategy.set(key, item);
    }
    let selected = [...bestBySymbolStrategy.values()].sort((a, b) => b.score - a.score);
    if (options.limit > 0) selected = selected.slice(0, options.limit);

    console.log(`[save-recommended-watchable-ai] raw=${rawCandidates.length} eligible=${eligible.length} selected=${selected.length} rejected=${rejected} owner=${options.ownerEmail} dryRun=${options.dryRun}`);
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    for (const item of selected) {
      try {
        const result = await saveCandidate(pool, item.row, ownerUserId, options.ownerEmail, { train: item.train, validation: item.validation }, options.dryRun);
        if (result.status === "skipped") skipped += 1;
        else saved += 1;
        console.log(`[${result.status}] ${item.row.symbol} ${item.row.strategy_type} #${item.row.numeric_id} score=${item.score.toFixed(1)} ${result.label}`);
      } catch (error) {
        failed += 1;
        console.error(`[error] ${item.row.symbol} ${item.row.strategy_type} #${item.row.numeric_id}: ${error.message}`);
      }
    }
    console.log(`[save-recommended-watchable-ai] done saved=${saved} skipped=${skipped} failed=${failed}`);
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
