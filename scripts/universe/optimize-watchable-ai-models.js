// Batch parameter-optimization report for currently watchable AI scan results.
// It reads validated-search rows, applies the same strict watchable filters, tests parameter
// candidates on the original training window, then validates surviving configs on the two
// original validation years. It never writes or replaces models.

const fs = require("fs");
const crypto = require("crypto");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { buildCandidates } = require("./search-best-config.js");
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
    apply: false,
    candidates: 1000,
    pointCount: 5,
    limit: 0,
    output: "",
    json: false,
    ownerEmail: String(process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase(),
  };
  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg.startsWith("--candidates=")) options.candidates = Math.max(1, Math.round(Number(arg.slice(13))) || options.candidates);
    else if (arg.startsWith("--pointCount=")) options.pointCount = Math.max(2, Math.min(10, Math.round(Number(arg.slice(13))) || options.pointCount));
    else if (arg.startsWith("--limit=")) options.limit = Math.max(0, Math.round(Number(arg.slice(8))) || 0);
    else if (arg.startsWith("--output=")) options.output = arg.slice(9).trim();
    else if (arg.startsWith("--ownerEmail=")) options.ownerEmail = arg.slice(13).trim().toLowerCase();
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

function computeWindowStats(states, start, end) {
  let baselineIndex = -1;
  let endIndex = -1;
  for (let i = 0; i < states.length; i += 1) {
    const date = states[i].row.date;
    if (date < start) baselineIndex = i;
    if (date < end) endIndex = i;
  }
  if (endIndex < 0) return null;
  const baselineEquity = baselineIndex >= 0 ? states[baselineIndex].equity : states[0].equity;
  const rowsInWindow = endIndex - baselineIndex;
  if (rowsInWindow <= 0 || !(baselineEquity > 0)) return null;
  const returnRate = ((states[endIndex].equity - baselineEquity) / baselineEquity) * 100;
  const baselineTrades = baselineIndex >= 0 ? states[baselineIndex].trades.length : 0;
  let peak = baselineEquity;
  let maxDrawdown = 0;
  for (let i = baselineIndex + 1; i <= endIndex; i += 1) {
    const equity = states[i].equity;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? ((peak - equity) / peak) * 100 : 0);
  }
  return {
    annualizedReturn: annualizedReturnRate(returnRate, rowsInWindow),
    returnRate,
    trades: states[endIndex].trades.length - baselineTrades,
    maxDrawdown,
    rows: rowsInWindow,
  };
}

function buildWindowBreakdown({ allRows, states, start, end, upsideThresholdPercent, drawdownTolerancePercent, targetPercent = null }) {
  const windowRows = allRows.filter((row) => row.date >= start && row.date < end);
  const upsideDeviation = windowRows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(windowRows) : null;
  const requiredAnnualizedReturn = upsideDeviation !== null ? (Number(upsideThresholdPercent) / 100) * upsideDeviation : null;
  let buyHoldMaxDrawdown = null;
  if (windowRows.length > 0) {
    const buyHoldStates = engine.buildBuyHoldStates(windowRows, INITIAL_CASH, TRADE_FEE);
    buyHoldMaxDrawdown = buyHoldStates.length ? buyHoldStates[buyHoldStates.length - 1].maxDrawdown : null;
  }
  const allowedMaxDrawdown = buyHoldMaxDrawdown !== null ? buyHoldMaxDrawdown * (1 + Number(drawdownTolerancePercent) / 100) : null;
  const stats = computeWindowStats(states, start, end);
  return {
    start,
    end,
    annualizedReturn: stats ? stats.annualizedReturn : null,
    returnRate: stats ? stats.returnRate : null,
    trades: stats ? stats.trades : null,
    maxDrawdown: stats ? stats.maxDrawdown : null,
    rows: stats ? stats.rows : 0,
    buyHoldMaxDrawdown,
    upsideDeviation,
    requiredAnnualizedReturn,
    allowedMaxDrawdown,
    passesTargetGate: targetPercent === null || Boolean(stats && Number(stats.annualizedReturn) >= Number(targetPercent)),
    passesUpsideGate: Boolean(stats && requiredAnnualizedReturn !== null && Number(stats.annualizedReturn) >= requiredAnnualizedReturn),
    passesDrawdownGate: Boolean(stats && allowedMaxDrawdown !== null && Number(stats.maxDrawdown) < allowedMaxDrawdown),
  };
}

function buildBreakdowns(allRows, config, row) {
  const trainStart = toIsoDate(row.train_start_date);
  const trainEnd = toIsoDate(row.train_end_date);
  const y1Start = toIsoDate(row.test_year1_start_date);
  const y1End = toIsoDate(row.test_year1_end_date);
  const y2Start = toIsoDate(row.test_year2_start_date);
  const y2End = toIsoDate(row.test_year2_end_date);
  const trainRows = allRows.filter((priceRow) => priceRow.date >= trainStart && priceRow.date < trainEnd);
  const trainStates = engine.buildBacktestStates(trainRows, config);
  const validationRows = allRows.filter((priceRow) => priceRow.date >= y1Start && priceRow.date < y2End);
  const validationStates = engine.buildBacktestStates(validationRows, config);
  const train = [];
  for (let yearIndex = 0; yearIndex < 10; yearIndex += 1) {
    const start = toIsoDate(shiftYears(new Date(trainStart), yearIndex));
    const end = toIsoDate(shiftYears(new Date(trainStart), yearIndex + 1));
    if (!start || !end || start >= trainEnd) break;
    train.push(buildWindowBreakdown({
      allRows,
      states: trainStates,
      start,
      end: end > trainEnd ? trainEnd : end,
      upsideThresholdPercent: row.upside_threshold_percent,
      drawdownTolerancePercent: row.drawdown_tolerance_percent,
    }));
  }
  const validation = [
    buildWindowBreakdown({
      allRows,
      states: validationStates,
      start: y1Start,
      end: y1End,
      upsideThresholdPercent: row.upside_threshold_percent,
      drawdownTolerancePercent: row.drawdown_tolerance_percent,
      targetPercent: row.target_percent,
    }),
    buildWindowBreakdown({
      allRows,
      states: validationStates,
      start: y2Start,
      end: y2End,
      upsideThresholdPercent: row.upside_threshold_percent,
      drawdownTolerancePercent: row.drawdown_tolerance_percent,
      targetPercent: row.target_percent,
    }),
  ];
  return { train, validation, trainRows, validationRows };
}

function yearBreakdownPasses(years, { requireTarget = false, targetPercent = 50, minYears = 1 } = {}) {
  if (!Array.isArray(years) || years.length < minYears) return false;
  return years.slice(0, minYears).every((year) => {
    const annualized = Number(year.annualizedReturn);
    if (!Number.isFinite(annualized)) return false;
    if (requireTarget && annualized < targetPercent) return false;
    const requiredAnnualizedReturn = Number(year.requiredAnnualizedReturn);
    if (!Number.isFinite(requiredAnnualizedReturn) || annualized < requiredAnnualizedReturn) return false;
    const allowedMaxDrawdown = Number(year.allowedMaxDrawdown);
    const maxDrawdown = Number(year.maxDrawdown);
    if (!Number.isFinite(allowedMaxDrawdown) || !Number.isFinite(maxDrawdown) || !(maxDrawdown < allowedMaxDrawdown)) return false;
    return year.passesUpsideGate !== false && year.passesDrawdownGate !== false && year.passesTargetGate !== false;
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

function buildMetricsFromBreakdowns(row, config, breakdowns, testedVariants) {
  const year1 = breakdowns.validation[0];
  const year2 = breakdowns.validation[1];
  const trainStates = engine.buildBacktestStates(breakdowns.trainRows, config);
  const trainLast = trainStates[trainStates.length - 1] || null;
  const trainAnnualized = Number(trainLast && breakdowns.trainRows.length
    ? annualizedReturnRate(trainLast.returnRate, breakdowns.trainRows.length)
    : 0);
  const pseudoRow = {
    ...row,
    train_annualized_return: trainAnnualized,
    test_year1_annualized_return: Number(year1 && year1.annualizedReturn) || 0,
    test_year1_trades: Number(year1 && year1.trades) || 0,
    test_year2_annualized_return: Number(year2 && year2.annualizedReturn) || 0,
    test_year2_trades: Number(year2 && year2.trades) || 0,
    annualized_diff_year1: Math.abs((Number(year1 && year1.annualizedReturn) || 0) - trainAnnualized),
    annualized_diff_year2: Math.abs((Number(year2 && year2.annualizedReturn) || 0) - trainAnnualized),
  };
  return {
    recommendationScore: recommendationScore(pseudoRow),
    row: pseudoRow,
    trainLast,
    trainAnnualized,
    bestScore: trainLast ? engine.scoreBacktestState(trainLast) : 0,
    bestReturnRate: trainLast ? Number(trainLast.returnRate) || 0 : 0,
    bestMaxDrawdown: trainLast ? Number(trainLast.maxDrawdown) || 0 : 0,
    bestTrades: trainLast && Array.isArray(trainLast.trades) ? trainLast.trades.length : 0,
    testedCandidates: testedVariants,
  };
}

function buildBaseConfig(rawConfig, strategyType) {
  return {
    initialCash: Number(rawConfig.initialCash) || INITIAL_CASH,
    tradeFee: Number(rawConfig.tradeFee) || TRADE_FEE,
    strategyType,
  };
}

function summarizeParamChanges(descriptors, originalConfig, optimizedConfig) {
  const changes = [];
  for (const descriptor of descriptors) {
    const segments = descriptor.path.match(/[^[\].]+/g) || [];
    const read = (root) => {
      let current = root;
      for (const segment of segments) {
        if (!current) return undefined;
        current = current[/^\d+$/.test(segment) ? Number(segment) : segment];
      }
      return current;
    };
    const before = read(originalConfig);
    const after = read(optimizedConfig);
    if (before === undefined || after === undefined) continue;
    const b = Number(before);
    const a = Number(after);
    if (!Number.isFinite(b) || !Number.isFinite(a) || Math.abs(b - a) < 0.0005) continue;
    changes.push(`${descriptor.label}: ${b} -> ${a}`);
  }
  return changes.slice(0, 8);
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

async function upsertOwnedPreset(pool, row, config, breakdowns, ownerUserId, ownerEmail, label) {
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
  const existing = await pool.query(`
    SELECT id, meta
    FROM strategy_presets
    WHERE owner_user_id = $1 AND original_model_id = $2 AND hidden_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `, [ownerUserId, row.id]);
  const presetId = existing.rows[0] ? existing.rows[0].id : randomId("preset");
  const existingMeta = existing.rows[0] && existing.rows[0].meta && typeof existing.rows[0].meta === "object"
    ? existing.rows[0].meta
    : {};
  const mergedMeta = { ...existingMeta, ...meta };
  const trainYears = toIsoDate(row.train_start_date) && toIsoDate(row.train_end_date)
    ? Math.max(1, Math.round((new Date(row.train_end_date) - new Date(row.train_start_date)) / 86400000 / 365.25))
    : 4;
  const testYears = toIsoDate(row.test_year1_start_date) && toIsoDate(row.test_year2_end_date)
    ? Math.max(1, Math.round((new Date(row.test_year2_end_date) - new Date(row.test_year1_start_date)) / 86400000 / 365.25))
    : 2;

  if (existing.rows[0]) {
    await pool.query(`
      UPDATE strategy_presets
      SET label = $3, strategy_type = $4, config = $5::jsonb, meta = $6::jsonb,
          model_text = $7, original_text = COALESCE(NULLIF(original_text, ''), $7),
          updated_at = NOW()
      WHERE id = $1 AND owner_user_id = $2
    `, [presetId, ownerUserId, label, row.strategy_type, JSON.stringify(config), JSON.stringify(mergedMeta), row.model_reason || ""]);
  } else {
    await pool.query(`
      INSERT INTO strategy_presets (
        id, owner_user_id, name, label, strategy_type, config, meta,
        original_text, model_text, is_legacy, original_model_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, FALSE, $10, NOW(), NOW())
    `, [
      presetId, ownerUserId, normalizePresetKey(presetId), label, row.strategy_type,
      JSON.stringify(config), JSON.stringify(mergedMeta),
      row.model_reason || "", row.model_reason || "", row.id,
    ]);
  }

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
    ON CONFLICT (preset_id) DO UPDATE SET
      train_years = EXCLUDED.train_years,
      test_years = EXCLUDED.test_years,
      train_annualized_return = EXCLUDED.train_annualized_return,
      train_start_date = EXCLUDED.train_start_date,
      train_end_date = EXCLUDED.train_end_date,
      test_year1_annualized_return = EXCLUDED.test_year1_annualized_return,
      test_year1_return_rate = EXCLUDED.test_year1_return_rate,
      test_year1_max_drawdown = EXCLUDED.test_year1_max_drawdown,
      test_year1_trades = EXCLUDED.test_year1_trades,
      test_year1_start_date = EXCLUDED.test_year1_start_date,
      test_year1_end_date = EXCLUDED.test_year1_end_date,
      test_year2_annualized_return = EXCLUDED.test_year2_annualized_return,
      test_year2_return_rate = EXCLUDED.test_year2_return_rate,
      test_year2_max_drawdown = EXCLUDED.test_year2_max_drawdown,
      test_year2_trades = EXCLUDED.test_year2_trades,
      test_year2_start_date = EXCLUDED.test_year2_start_date,
      test_year2_end_date = EXCLUDED.test_year2_end_date,
      annualized_diff_year1 = EXCLUDED.annualized_diff_year1,
      annualized_diff_year2 = EXCLUDED.annualized_diff_year2,
      reached_target = EXCLUDED.reached_target,
      train_year_breakdown = EXCLUDED.train_year_breakdown,
      validation_year_breakdown = EXCLUDED.validation_year_breakdown,
      target_percent = EXCLUDED.target_percent,
      upside_threshold_percent = EXCLUDED.upside_threshold_percent,
      drawdown_tolerance_percent = EXCLUDED.drawdown_tolerance_percent,
      updated_at = NOW()
  `, [
    presetId, trainYears, testYears,
    Number(row.train_annualized_return) || 0, row.train_start_date, row.train_end_date,
    Number(row.test_year1_annualized_return) || 0, Number(row.test_year1_return_rate) || 0, Number(row.test_year1_max_drawdown) || 0, row.test_year1_trades || 0, row.test_year1_start_date, row.test_year1_end_date,
    Number(row.test_year2_annualized_return) || 0, Number(row.test_year2_return_rate) || 0, Number(row.test_year2_max_drawdown) || 0, row.test_year2_trades || 0, row.test_year2_start_date, row.test_year2_end_date,
    Number(row.annualized_diff_year1) || 0, Number(row.annualized_diff_year2) || 0,
    JSON.stringify(breakdowns.train), JSON.stringify(breakdowns.validation),
    Number(row.target_percent) || 50, Number(row.upside_threshold_percent) || 30, Number(row.drawdown_tolerance_percent) || 5,
  ]);

  return { presetId, created: !existing.rows[0] };
}

async function applyOptimizedModel(pool, sourceRow, optimizedConfig, breakdowns, metrics, ownerUserId, ownerEmail) {
  const updatedRow = {
    ...sourceRow,
    ...metrics.row,
    test_year1_return_rate: Number(breakdowns.validation[0] && breakdowns.validation[0].returnRate) || 0,
    test_year1_max_drawdown: Number(breakdowns.validation[0] && breakdowns.validation[0].maxDrawdown) || 0,
    test_year1_rows_tested: Number(breakdowns.validation[0] && breakdowns.validation[0].rows) || 0,
    test_year2_return_rate: Number(breakdowns.validation[1] && breakdowns.validation[1].returnRate) || 0,
    test_year2_max_drawdown: Number(breakdowns.validation[1] && breakdowns.validation[1].maxDrawdown) || 0,
    test_year2_rows_tested: Number(breakdowns.validation[1] && breakdowns.validation[1].rows) || 0,
  };
  const label = buildScanPresetLabel(updatedRow) || sourceRow.preset_label || "AI 模型";
  await pool.query(`
    UPDATE optimization_scan_results
    SET preset_label = $2,
        best_config = $3::jsonb,
        best_return_rate = $4,
        best_max_drawdown = $5,
        best_score = $6,
        best_trades = $7,
        tested_candidates = $8,
        train_annualized_return = $9,
        test_year1_return_rate = $10,
        test_year1_max_drawdown = $11,
        test_year1_annualized_return = $12,
        test_year1_trades = $13,
        test_year1_rows_tested = $14,
        test_year2_return_rate = $15,
        test_year2_max_drawdown = $16,
        test_year2_annualized_return = $17,
        test_year2_trades = $18,
        test_year2_rows_tested = $19,
        annualized_diff_year1 = $20,
        annualized_diff_year2 = $21,
        train_year_breakdown = $22::jsonb,
        scanned_at = NOW(),
        last_rechecked_at = NULL,
        recheck_still_qualifies = NULL,
        recheck_year1_annualized_return = NULL,
        recheck_year2_annualized_return = NULL,
        recheck_error = ''
    WHERE id = $1
  `, [
    sourceRow.id, label, JSON.stringify(optimizedConfig),
    metrics.bestReturnRate, metrics.bestMaxDrawdown, metrics.bestScore, metrics.bestTrades, metrics.testedCandidates,
    Number(updatedRow.train_annualized_return) || 0,
    updatedRow.test_year1_return_rate, updatedRow.test_year1_max_drawdown, Number(updatedRow.test_year1_annualized_return) || 0, Number(updatedRow.test_year1_trades) || 0, updatedRow.test_year1_rows_tested,
    updatedRow.test_year2_return_rate, updatedRow.test_year2_max_drawdown, Number(updatedRow.test_year2_annualized_return) || 0, Number(updatedRow.test_year2_trades) || 0, updatedRow.test_year2_rows_tested,
    Number(updatedRow.annualized_diff_year1) || 0, Number(updatedRow.annualized_diff_year2) || 0,
    JSON.stringify(breakdowns.train),
  ]);
  const presetResult = await upsertOwnedPreset(pool, updatedRow, optimizedConfig, breakdowns, ownerUserId, ownerEmail, label);
  return { label, ...presetResult };
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  engine.setOptimizationPointCountOverride(options.pointCount);
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
  });
  const startedAt = new Date().toISOString();
  const report = {
    startedAt,
    candidatesPerModel: options.candidates,
    pointCount: options.pointCount,
    raw: 0,
    eligible: 0,
    testedModels: 0,
    improved: [],
    unchanged: [],
    rejected: [],
    errors: [],
    applied: [],
  };
  const ownerUserId = userIdForEmail(options.ownerEmail);
  try {
    const rawRows = await loadRawCandidates(pool);
    report.raw = rawRows.length;
    let rows = rawRows;
    if (options.limit > 0) rows = rows.slice(0, options.limit);

    for (const row of rows) {
      try {
        const rawConfig = row.best_config && typeof row.best_config === "object" ? row.best_config : {};
        const strategyType = row.strategy_type || rawConfig.strategyType || "wave";
        const baseConfig = buildBaseConfig(rawConfig, strategyType);
        const originalConfig = engine.buildConfigFromPresetObject({ ...rawConfig, strategyType }, baseConfig);
        engine.setActiveLotSizeSymbol(row.symbol);
        const allRows = await loadRowsForSymbol(pool, row.symbol, row.market);
        const originalBreakdowns = buildBreakdowns(allRows, originalConfig, row);
        const targetPercent = Number(row.target_percent) || 50;
        const originalIsEligible = yearBreakdownPasses(originalBreakdowns.train, { minYears: 4 })
          && yearBreakdownPasses(originalBreakdowns.validation, { requireTarget: true, targetPercent, minYears: 2 });
        if (!originalIsEligible) {
          report.rejected.push({ id: row.id, numericId: row.numeric_id, symbol: row.symbol, strategyType, reason: "current row no longer passes strict watchable filters" });
          continue;
        }
        report.eligible += 1;

        const descriptors = engine.discoverOptimizationParameters({ ...rawConfig, strategyType });
        const generatedConfigs = buildCandidates(engine, { ...rawConfig, strategyType }, descriptors, baseConfig, options.candidates);
        const seenConfigs = new Set();
        const candidateConfigs = [];
        for (const config of [originalConfig, ...generatedConfigs]) {
          const key = JSON.stringify(config);
          if (seenConfigs.has(key)) continue;
          seenConfigs.add(key);
          candidateConfigs.push(config);
        }
        let best = null;
        let passedVariants = 0;
        const originalScore = recommendationScore(row);

        for (const config of candidateConfigs) {
          const breakdowns = buildBreakdowns(allRows, config, row);
          if (!yearBreakdownPasses(breakdowns.train, { minYears: 4 })) continue;
          if (!yearBreakdownPasses(breakdowns.validation, { requireTarget: true, targetPercent, minYears: 2 })) continue;
          passedVariants += 1;
          const metrics = buildMetricsFromBreakdowns(row, config, breakdowns, candidateConfigs.length);
          if (!best || metrics.recommendationScore > best.score) {
            best = { config, breakdowns, score: metrics.recommendationScore, row: metrics.row, metrics };
          }
        }

        report.testedModels += 1;
        const baseWorst = Math.min(Number(row.test_year1_annualized_return) || 0, Number(row.test_year2_annualized_return) || 0);
        if (best && best.score > originalScore + 0.1) {
          const optimizedWorst = Math.min(Number(best.row.test_year1_annualized_return) || 0, Number(best.row.test_year2_annualized_return) || 0);
          const paramChanges = summarizeParamChanges(descriptors, originalConfig, best.config);
          const item = {
            id: row.id,
            numericId: row.numeric_id,
            symbol: row.symbol,
            symbolName: row.symbol_name || "",
            market: row.market,
            strategyType,
            originalScore,
            optimizedScore: best.score,
            scoreDelta: best.score - originalScore,
            originalYear1Annualized: Number(row.test_year1_annualized_return) || 0,
            originalYear1Trades: Number(row.test_year1_trades) || 0,
            originalYear2Annualized: Number(row.test_year2_annualized_return) || 0,
            originalYear2Trades: Number(row.test_year2_trades) || 0,
            optimizedYear1Annualized: Number(best.row.test_year1_annualized_return) || 0,
            optimizedYear1Trades: Number(best.row.test_year1_trades) || 0,
            optimizedYear2Annualized: Number(best.row.test_year2_annualized_return) || 0,
            optimizedYear2Trades: Number(best.row.test_year2_trades) || 0,
            worstYearDelta: optimizedWorst - baseWorst,
            passedVariants,
            testedVariants: candidateConfigs.length,
            paramChanges,
          };
          if (options.apply && paramChanges.length > 0) {
            const applied = await applyOptimizedModel(pool, row, best.config, best.breakdowns, best.metrics, ownerUserId, options.ownerEmail);
            item.applied = true;
            item.ownedPresetId = applied.presetId;
            item.ownedPresetCreated = applied.created;
            item.updatedLabel = applied.label;
            report.applied.push(item);
          }
          report.improved.push(item);
        } else {
          report.unchanged.push({
            id: row.id,
            numericId: row.numeric_id,
            symbol: row.symbol,
            strategyType,
            originalScore,
            bestScore: best ? best.score : null,
            passedVariants,
            testedVariants: candidateConfigs.length,
          });
        }
        console.log(`[${report.testedModels}/${rows.length}] ${row.symbol} #${row.numeric_id} ${strategyType}: eligible variants ${passedVariants}/${candidateConfigs.length}${best && best.score > originalScore + 0.1 ? ` improved +${(best.score - originalScore).toFixed(1)}` : " no better score"}`);
      } catch (error) {
        report.errors.push({ id: row.id, numericId: row.numeric_id, symbol: row.symbol, error: error.message });
        console.error(`[error] ${row.symbol} #${row.numeric_id}: ${error.message}`);
      }
    }

    report.improved.sort((a, b) => b.scoreDelta - a.scoreDelta);
    report.finishedAt = new Date().toISOString();
    if (options.output) fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`[optimize-watchable-ai-models] raw=${report.raw} eligible=${report.eligible} tested=${report.testedModels} improved=${report.improved.length} unchanged=${report.unchanged.length} rejected=${report.rejected.length} errors=${report.errors.length}`);
      report.improved.slice(0, 50).forEach((item, index) => {
        console.log(`${index + 1}. #${item.numericId} ${item.symbol} ${item.strategyType} score ${item.originalScore.toFixed(1)} -> ${item.optimizedScore.toFixed(1)} (${item.scoreDelta >= 0 ? "+" : ""}${item.scoreDelta.toFixed(1)}), Y1 ${item.originalYear1Annualized.toFixed(1)}%/${item.originalYear1Trades} -> ${item.optimizedYear1Annualized.toFixed(1)}%/${item.optimizedYear1Trades}, Y2 ${item.originalYear2Annualized.toFixed(1)}%/${item.originalYear2Trades} -> ${item.optimizedYear2Annualized.toFixed(1)}%/${item.optimizedYear2Trades}, changes: ${item.paramChanges.join("; ") || "none"}`);
      });
    }
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
