// Daily fixed-start model validation.
//
// This is intentionally not an AI search and not a parameter optimizer. It takes already
// qualified/followed models, keeps the original validation snapshot as the baseline, and extends
// that same fixed validation start through the newest stored trading day. A separate incremental
// segment records only data that arrived after the original validation end date.

const { Pool } = require("pg");
const engine = require("./engine.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { ensureModelValidationStateTable } = require("../shared/model-validation-state.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const DATABASE_SSL = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
const INITIAL_CASH = Number(process.env.MODEL_VALIDATION_INITIAL_CASH || 2000000);
const TRADE_FEE = Number(process.env.MODEL_VALIDATION_TRADE_FEE || 5);

function parseArgs(argv) {
  const options = {
    symbols: [],
    dryRun: false,
    targetPercent: 50,
    minIncrementalDays: 60,
    minIncrementalTrades: 1,
  };
  for (const arg of argv) {
    if (arg === "--dryRun") options.dryRun = true;
    else if (arg.startsWith("--symbols=")) {
      options.symbols = arg.slice("--symbols=".length).split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);
    } else if (arg.startsWith("--targetPercent=")) {
      const value = Number(arg.slice("--targetPercent=".length));
      if (Number.isFinite(value) && value > 0) options.targetPercent = value;
    } else if (arg.startsWith("--minIncrementalDays=")) {
      const value = Math.round(Number(arg.slice("--minIncrementalDays=".length)));
      if (Number.isFinite(value) && value >= 0) options.minIncrementalDays = value;
    } else if (arg.startsWith("--minIncrementalTrades=")) {
      const value = Math.round(Number(arg.slice("--minIncrementalTrades=".length)));
      if (Number.isFinite(value) && value >= 0) options.minIncrementalTrades = value;
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

function inferDbMarket(symbol, market) {
  const normalizedMarket = String(market || "").trim().toUpperCase();
  if (normalizedMarket === "US") return "US";
  const code = String(symbol || "").trim().toUpperCase();
  if (/^\d{6}$/.test(code)) return /^[569]/.test(code) ? "1" : "0";
  return normalizedMarket === "1" || normalizedMarket === "0" ? normalizedMarket : "US";
}

function rowsFromDate(rows, startDate, { exclusive = false } = {}) {
  if (!startDate) return [];
  return rows.filter((row) => exclusive ? row.date > startDate : row.date >= startDate);
}

function buyHoldSummary(rows, initialCash, tradeFee) {
  if (!rows.length) {
    return { returnRate: null, maxDrawdown: null };
  }
  const states = engine.buildBuyHoldStates(rows, initialCash, tradeFee);
  const last = states[states.length - 1];
  return {
    returnRate: last ? last.returnRate : null,
    maxDrawdown: last ? last.maxDrawdown : null,
  };
}

function scoreWindow(rows, config, startDate) {
  const scoredRows = rowsFromDate(rows, startDate);
  if (!scoredRows.length) {
    return {
      startDate: "",
      days: 0,
      returnRate: null,
      annualizedReturn: null,
      maxDrawdown: null,
      trades: 0,
      buyHoldReturnRate: null,
      buyHoldMaxDrawdown: null,
    };
  }
  const scored = engine.buildScoredBacktestStates(rows, config, scoredRows[0].date);
  const buyHold = buyHoldSummary(scoredRows, config.initialCash, config.tradeFee);
  return {
    startDate: scoredRows[0].date,
    days: scored.rowsScored || scoredRows.length,
    returnRate: scored.returnRate,
    annualizedReturn: annualizedReturnRate(scored.returnRate, scored.rowsScored || scoredRows.length),
    maxDrawdown: scored.maxDrawdown,
    trades: Array.isArray(scored.trades) ? scored.trades.length : 0,
    buyHoldReturnRate: buyHold.returnRate,
    buyHoldMaxDrawdown: buyHold.maxDrawdown,
  };
}

function scoreIncrementalWindow(rows, config, originalEndDate) {
  const incrementalRows = rowsFromDate(rows, originalEndDate, { exclusive: true });
  if (!incrementalRows.length) {
    return {
      startDate: "",
      days: 0,
      returnRate: null,
      annualizedReturn: null,
      maxDrawdown: null,
      trades: 0,
      buyHoldReturnRate: null,
      buyHoldMaxDrawdown: null,
    };
  }
  return scoreWindow(rows, config, incrementalRows[0].date);
}

function deriveStatus(cumulative, incremental, candidate, options) {
  const target = Number(candidate.target_percent) || options.targetPercent;
  const originalMaxDrawdown = Number(candidate.original_validation_max_drawdown);
  const hasDrawdownBaseline = Number.isFinite(originalMaxDrawdown) && originalMaxDrawdown > 0;
  const drawdownWarningLimit = hasDrawdownBaseline ? Math.max(originalMaxDrawdown + 5, originalMaxDrawdown * 1.25) : null;
  const enoughNewDays = incremental.days >= options.minIncrementalDays;
  const enoughNewTrades = incremental.trades >= options.minIncrementalTrades;
  const hasNewEvidence = enoughNewDays && enoughNewTrades;

  if (!cumulative.days) {
    return { status: "insufficient", reason: "没有可用于累计验证的行情数据。" };
  }
  if (cumulative.days < 50) {
    return { status: "insufficient", reason: `累计验证只有 ${cumulative.days} 个交易日，样本不足。` };
  }

  const cumulativeAnnualized = Number(cumulative.annualizedReturn);
  const cumulativeReturnMiss = Number.isFinite(cumulativeAnnualized) && cumulativeAnnualized < target;
  const drawdownMiss = drawdownWarningLimit !== null
    && Number.isFinite(Number(cumulative.maxDrawdown))
    && Number(cumulative.maxDrawdown) > drawdownWarningLimit;
  const reasons = [];

  if (!hasNewEvidence) {
    if (cumulativeReturnMiss) {
      reasons.push(`累计年化 ${cumulativeAnnualized.toFixed(1)}% 低于目标 ${target.toFixed(1)}%，但新增区间只有 ${incremental.days} 个交易日、${incremental.trades} 笔交易，先标记观察。`);
      return { status: "watching", reason: reasons.join(" ") };
    }
    reasons.push(`累计验证仍达标；新增区间 ${incremental.days} 个交易日、${incremental.trades} 笔交易，暂不足以单独判定。`);
    return { status: "valid", reason: reasons.join(" ") };
  }

  const incrementalAnnualized = Number(incremental.annualizedReturn);
  const incrementalWeak = Number.isFinite(incrementalAnnualized) && incrementalAnnualized < target * 0.5;
  if (cumulativeReturnMiss) {
    reasons.push(`累计年化 ${cumulativeAnnualized.toFixed(1)}% 低于目标 ${target.toFixed(1)}%。`);
  }
  if (incrementalWeak) {
    reasons.push(`新增区间年化 ${incrementalAnnualized.toFixed(1)}% 明显低于目标。`);
  }
  if (drawdownMiss) {
    reasons.push(`累计最大回撤 ${Number(cumulative.maxDrawdown).toFixed(1)}% 超过原验证回撤参考 ${originalMaxDrawdown.toFixed(1)}% 的容忍线 ${drawdownWarningLimit.toFixed(1)}%。`);
  }

  if (cumulativeReturnMiss && (incrementalWeak || drawdownMiss)) {
    return { status: "invalid", reason: `${reasons.join(" ")} 模型需要重新验证或更换。` };
  }
  if (cumulativeReturnMiss || incrementalWeak || drawdownMiss) {
    return { status: "warning", reason: `${reasons.join(" ")} 模型仍保留，但需要关注。` };
  }
  return {
    status: "valid",
    reason: `累计年化 ${cumulativeAnnualized.toFixed(1)}% 达到目标 ${target.toFixed(1)}%，新增区间 ${incremental.days} 个交易日、${incremental.trades} 笔交易。`,
  };
}

async function loadCandidates(pool, options) {
  const symbolFilter = options.symbols.length
    ? "AND UPPER(symbol) = ANY($1)"
    : "";
  const params = options.symbols.length ? [options.symbols] : [];
  const result = await pool.query(`
    WITH ai_models AS (
      SELECT
        'ai_scan'::text AS subject_type,
        osr.id AS subject_id,
        osr.id AS scan_result_id,
        NULL::text AS preset_id,
        NULL::text AS watch_id,
        NULL::text AS owner_user_id,
        ''::text AS owner_email,
        osr.symbol,
        osr.market,
        osr.preset_label AS model_label,
        osr.strategy_type,
        osr.best_config,
        osr.test_year1_start_date AS validation_start_date,
        COALESCE(osr.test_year2_end_date, osr.test_year1_end_date) AS original_validation_end_date,
        GREATEST(COALESCE(osr.test_year1_max_drawdown, 0), COALESCE(osr.test_year2_max_drawdown, 0)) AS original_validation_max_drawdown,
        $${params.length + 1}::double precision AS target_percent
      FROM optimization_scan_results osr
      WHERE osr.source = 'validated-search' AND osr.reached_target = TRUE
    ),
    owned_presets AS (
      SELECT
        'owned_preset'::text AS subject_type,
        sp.id AS subject_id,
        NULL::text AS scan_result_id,
        sp.id AS preset_id,
        NULL::text AS watch_id,
        sp.owner_user_id,
        COALESCE(u.email, '') AS owner_email,
        UPPER(COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', ''))) AS symbol,
        CASE
          WHEN UPPER(COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', ''))) ~ '^[0-9]{6}$'
            THEN CASE WHEN UPPER(COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', ''))) ~ '^[569]' THEN '1' ELSE '0' END
          ELSE 'US'
        END AS market,
        sp.label AS model_label,
        sp.strategy_type,
        sp.config AS best_config,
        pvs.test_year1_start_date AS validation_start_date,
        COALESCE(pvs.test_year2_end_date, pvs.test_year1_end_date) AS original_validation_end_date,
        GREATEST(COALESCE(pvs.test_year1_max_drawdown, 0), COALESCE(pvs.test_year2_max_drawdown, 0)) AS original_validation_max_drawdown,
        $${params.length + 1}::double precision AS target_percent
      FROM strategy_presets sp
      JOIN preset_validation_snapshots pvs ON pvs.preset_id = sp.id
      LEFT JOIN users u ON u.id = sp.owner_user_id
      WHERE sp.hidden_at IS NULL AND pvs.reached_target = TRUE
        AND COALESCE(NULLIF(sp.meta->>'targetSymbol', ''), NULLIF(sp.meta->>'symbol', '')) IS NOT NULL
    ),
    watches AS (
      SELECT
        'watch'::text AS subject_type,
        wa.id AS subject_id,
        NULL::text AS scan_result_id,
        wa.preset_id,
        wa.id AS watch_id,
        wa.owner_user_id,
        wa.owner_email,
        UPPER(wa.symbol) AS symbol,
        CASE WHEN wa.market = 'CN' THEN CASE WHEN wa.symbol ~ '^[569]' THEN '1' ELSE '0' END ELSE wa.market END AS market,
        COALESCE(wa.frozen_label, wa.preset_label) AS model_label,
        COALESCE(wa.frozen_strategy_type, sp.strategy_type) AS strategy_type,
        COALESCE(wa.frozen_config, sp.config) AS best_config,
        COALESCE(pvs.test_year1_start_date, wa.created_at::date) AS validation_start_date,
        COALESCE(pvs.test_year2_end_date, pvs.test_year1_end_date, wa.created_at::date) AS original_validation_end_date,
        GREATEST(COALESCE(pvs.test_year1_max_drawdown, 0), COALESCE(pvs.test_year2_max_drawdown, 0)) AS original_validation_max_drawdown,
        $${params.length + 1}::double precision AS target_percent
      FROM watch_alerts wa
      LEFT JOIN strategy_presets sp ON sp.id = wa.preset_id
      LEFT JOIN preset_validation_snapshots pvs ON pvs.preset_id = wa.preset_id
      WHERE wa.enabled = TRUE AND wa.index_code IS NULL AND wa.symbol IS NOT NULL
    )
    SELECT * FROM ai_models WHERE symbol IS NOT NULL AND symbol <> '' ${symbolFilter}
    UNION ALL
    SELECT * FROM owned_presets WHERE symbol IS NOT NULL AND symbol <> '' ${symbolFilter}
    UNION ALL
    SELECT * FROM watches WHERE symbol IS NOT NULL AND symbol <> '' ${symbolFilter}
    ORDER BY subject_type, symbol, subject_id
  `, [...params, options.targetPercent]);
  return result.rows;
}

async function saveState(pool, candidate, rows, cumulative, incremental, status, options) {
  await pool.query(`
    INSERT INTO model_validation_states (
      subject_type, subject_id, scan_result_id, preset_id, watch_id, owner_user_id, owner_email,
      symbol, market, model_label, strategy_type, validation_start_date, original_validation_end_date,
      latest_trade_date, cumulative_days, cumulative_return_rate, cumulative_annualized_return,
      cumulative_max_drawdown, cumulative_trades, cumulative_buy_hold_return_rate, cumulative_buy_hold_max_drawdown,
      incremental_start_date, incremental_days, incremental_return_rate, incremental_annualized_return,
      incremental_max_drawdown, incremental_trades, incremental_buy_hold_return_rate, incremental_buy_hold_max_drawdown,
      target_percent, original_validation_max_drawdown, min_incremental_days, min_incremental_trades,
      status, status_reason, last_checked_at, last_error, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19, $20, $21,
      $22, $23, $24, $25,
      $26, $27, $28, $29,
      $30, $31, $32, $33,
      $34, $35, NOW(), '', NOW()
    )
    ON CONFLICT (subject_type, subject_id) DO UPDATE SET
      scan_result_id = EXCLUDED.scan_result_id,
      preset_id = EXCLUDED.preset_id,
      watch_id = EXCLUDED.watch_id,
      owner_user_id = EXCLUDED.owner_user_id,
      owner_email = EXCLUDED.owner_email,
      symbol = EXCLUDED.symbol,
      market = EXCLUDED.market,
      model_label = EXCLUDED.model_label,
      strategy_type = EXCLUDED.strategy_type,
      validation_start_date = EXCLUDED.validation_start_date,
      original_validation_end_date = EXCLUDED.original_validation_end_date,
      latest_trade_date = EXCLUDED.latest_trade_date,
      cumulative_days = EXCLUDED.cumulative_days,
      cumulative_return_rate = EXCLUDED.cumulative_return_rate,
      cumulative_annualized_return = EXCLUDED.cumulative_annualized_return,
      cumulative_max_drawdown = EXCLUDED.cumulative_max_drawdown,
      cumulative_trades = EXCLUDED.cumulative_trades,
      cumulative_buy_hold_return_rate = EXCLUDED.cumulative_buy_hold_return_rate,
      cumulative_buy_hold_max_drawdown = EXCLUDED.cumulative_buy_hold_max_drawdown,
      incremental_start_date = EXCLUDED.incremental_start_date,
      incremental_days = EXCLUDED.incremental_days,
      incremental_return_rate = EXCLUDED.incremental_return_rate,
      incremental_annualized_return = EXCLUDED.incremental_annualized_return,
      incremental_max_drawdown = EXCLUDED.incremental_max_drawdown,
      incremental_trades = EXCLUDED.incremental_trades,
      incremental_buy_hold_return_rate = EXCLUDED.incremental_buy_hold_return_rate,
      incremental_buy_hold_max_drawdown = EXCLUDED.incremental_buy_hold_max_drawdown,
      target_percent = EXCLUDED.target_percent,
      original_validation_max_drawdown = EXCLUDED.original_validation_max_drawdown,
      min_incremental_days = EXCLUDED.min_incremental_days,
      min_incremental_trades = EXCLUDED.min_incremental_trades,
      status = EXCLUDED.status,
      status_reason = EXCLUDED.status_reason,
      last_checked_at = NOW(),
      last_error = '',
      updated_at = NOW()
  `, [
    candidate.subject_type, candidate.subject_id, candidate.scan_result_id, candidate.preset_id, candidate.watch_id,
    candidate.owner_user_id, candidate.owner_email || "", candidate.symbol, candidate.dbMarket, candidate.model_label || "",
    candidate.strategy_type || "", toIsoDate(candidate.validation_start_date), toIsoDate(candidate.original_validation_end_date),
    rows.length ? rows[rows.length - 1].date : null, cumulative.days, cumulative.returnRate, cumulative.annualizedReturn,
    cumulative.maxDrawdown, cumulative.trades, cumulative.buyHoldReturnRate, cumulative.buyHoldMaxDrawdown,
    incremental.startDate || null, incremental.days, incremental.returnRate, incremental.annualizedReturn,
    incremental.maxDrawdown, incremental.trades, incremental.buyHoldReturnRate, incremental.buyHoldMaxDrawdown,
    Number(candidate.target_percent) || options.targetPercent, candidate.original_validation_max_drawdown || null,
    options.minIncrementalDays, options.minIncrementalTrades, status.status, status.reason,
  ]);
}

async function saveError(pool, candidate, message) {
  await pool.query(`
    INSERT INTO model_validation_states (
      subject_type, subject_id, scan_result_id, preset_id, watch_id, owner_user_id, owner_email,
      symbol, market, model_label, strategy_type, status, status_reason, last_checked_at, last_error, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'error', $12, NOW(), $12, NOW())
    ON CONFLICT (subject_type, subject_id) DO UPDATE SET
      status = 'error',
      status_reason = EXCLUDED.status_reason,
      last_checked_at = NOW(),
      last_error = EXCLUDED.last_error,
      updated_at = NOW()
  `, [
    candidate.subject_type, candidate.subject_id, candidate.scan_result_id, candidate.preset_id, candidate.watch_id,
    candidate.owner_user_id, candidate.owner_email || "", candidate.symbol || "", candidate.dbMarket || candidate.market || "",
    candidate.model_label || "", candidate.strategy_type || "", message.slice(0, 1000),
  ]);
}

async function processCandidate(pool, rawCandidate, options) {
  const candidate = {
    ...rawCandidate,
    symbol: String(rawCandidate.symbol || "").trim().toUpperCase(),
    dbMarket: inferDbMarket(rawCandidate.symbol, rawCandidate.market),
  };
  const validationStartDate = toIsoDate(candidate.validation_start_date);
  if (!candidate.symbol || !validationStartDate) {
    throw new Error("缺少股票代码或原始验证起点。");
  }
  const preset = {
    label: candidate.model_label,
    strategyType: candidate.strategy_type || "wave",
    ...(candidate.best_config && typeof candidate.best_config === "object" ? candidate.best_config : {}),
  };
  const baseConfig = engine.buildConfigFromPresetObject(preset, {
    initialCash: INITIAL_CASH,
    tradeFee: TRADE_FEE,
    strategyType: preset.strategyType,
  });
  engine.setActiveLotSizeSymbol(candidate.symbol);
  await ensureFreshData(pool, candidate.symbol, candidate.dbMarket);
  const rows = await loadRowsForSymbol(pool, candidate.symbol, candidate.dbMarket);
  const cumulative = scoreWindow(rows, baseConfig, validationStartDate);
  const incremental = scoreIncrementalWindow(rows, baseConfig, toIsoDate(candidate.original_validation_end_date));
  const status = deriveStatus(cumulative, incremental, candidate, options);
  if (!options.dryRun) {
    await saveState(pool, candidate, rows, cumulative, incremental, status, options);
  }
  return {
    subjectType: candidate.subject_type,
    subjectId: candidate.subject_id,
    symbol: candidate.symbol,
    market: candidate.dbMarket,
    status: status.status,
    reason: status.reason,
    latestTradeDate: rows.length ? rows[rows.length - 1].date : "",
    cumulative,
    incremental,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
  });
  try {
    await ensureModelValidationStateTable(pool);
    const candidates = await loadCandidates(pool, options);
    console.log(`[model-validation] candidates=${candidates.length} dryRun=${options.dryRun}`);
    const summary = { valid: 0, watching: 0, warning: 0, invalid: 0, insufficient: 0, error: 0 };
    for (const candidate of candidates) {
      try {
        const result = await processCandidate(pool, candidate, options);
        summary[result.status] = (summary[result.status] || 0) + 1;
        console.log(`[${result.status}] ${result.subjectType}:${result.subjectId} ${result.symbol} latest=${result.latestTradeDate} cumulative=${result.cumulative.days}d/${result.cumulative.trades}t incremental=${result.incremental.days}d/${result.incremental.trades}t`);
      } catch (error) {
        summary.error += 1;
        const enriched = { ...candidate, dbMarket: inferDbMarket(candidate.symbol, candidate.market) };
        if (!options.dryRun) {
          await saveError(pool, enriched, error.message || "validation failed");
        }
        console.error(`[error] ${candidate.subject_type}:${candidate.subject_id} ${candidate.symbol || ""}: ${error.message}`);
      }
    }
    console.log(`[model-validation] done ${JSON.stringify(summary)}`);
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
