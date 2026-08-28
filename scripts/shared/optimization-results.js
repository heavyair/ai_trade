// Owns the optimization_scan_results table — one row per (symbol, market, preset).
// run-optimization-scan.js writes rows here for existing, already-promoted strategy_presets
// (preset_id is a real strategy_presets.id in that case). run-auto-generate.js and
// search-validated-best.js ALSO write here, but for THEM this table is the entire home of
// their candidate results — they never touch strategy_presets at all (that table is reserved
// for manually-curated/explicitly-promoted models); preset_id for their rows is just an
// internal candidate-pool key (e.g. `ai_validated_NET_20260827`), not a real FK. The `source`
// column distinguishes which of the two AI scripts a row came from ('auto-generate' /
// 'validated-search'); rows from run-optimization-scan.js leave it blank.
//
// Since the train/test methodology change (see scripts/shared/train-test-window.js), the
// existing baseline_return_rate/best_return_rate/buy_hold_return_rate/rows_tested columns are
// computed from the TRAIN window slice, not the whole history — same columns, new meaning,
// no rename (this file's callers just feed them different input than before). New columns
// hold the out-of-sample TEST-window numbers plus the annualized figures used for ranking.

const crypto = require("crypto");

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

async function ensureResultsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS optimization_scan_results (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      symbol_name TEXT NOT NULL DEFAULT '',
      preset_id TEXT NOT NULL,
      preset_label TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      rows_tested INTEGER NOT NULL DEFAULT 0,
      baseline_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      baseline_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_trades INTEGER NOT NULL DEFAULT 0,
      tested_candidates INTEGER NOT NULL DEFAULT 0,
      best_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      buy_hold_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(symbol, market, preset_id)
    );
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS buy_hold_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS buy_hold_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0;

    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS train_annualized_return DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_annualized_return DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_trades INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_rows_tested INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS annualized_diff DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS train_start_date DATE;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_start_date DATE;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS reached_target BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT '';
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS model_reason TEXT NOT NULL DEFAULT '';
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS numeric_id BIGSERIAL;
  `);
}

async function saveOptimizationResult(pool, row) {
  // id is only ever looked up by (symbol, market, preset_id) via the UNIQUE constraint below —
  // never used as the ON CONFLICT target itself — so a fresh opaque id per first-insert (never
  // recomputed from symbol/market/presetId) is a safe drop-in replacement for the old
  // business-derived string.
  const id = randomId("scan");
  await pool.query(`
    INSERT INTO optimization_scan_results (
      id, symbol, market, symbol_name, preset_id, preset_label, strategy_type, rows_tested,
      baseline_return_rate, baseline_max_drawdown, best_return_rate, best_max_drawdown,
      best_score, best_trades, tested_candidates, best_config,
      buy_hold_return_rate, buy_hold_max_drawdown,
      train_annualized_return, test_return_rate, test_max_drawdown, test_annualized_return,
      test_trades, test_rows_tested, annualized_diff, train_start_date, test_start_date,
      reached_target, source, model_reason, scanned_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,NOW())
    ON CONFLICT (symbol, market, preset_id) DO UPDATE SET
      symbol_name = EXCLUDED.symbol_name,
      preset_label = EXCLUDED.preset_label,
      strategy_type = EXCLUDED.strategy_type,
      rows_tested = EXCLUDED.rows_tested,
      baseline_return_rate = EXCLUDED.baseline_return_rate,
      baseline_max_drawdown = EXCLUDED.baseline_max_drawdown,
      best_return_rate = EXCLUDED.best_return_rate,
      best_max_drawdown = EXCLUDED.best_max_drawdown,
      best_score = EXCLUDED.best_score,
      best_trades = EXCLUDED.best_trades,
      tested_candidates = EXCLUDED.tested_candidates,
      best_config = EXCLUDED.best_config,
      buy_hold_return_rate = EXCLUDED.buy_hold_return_rate,
      buy_hold_max_drawdown = EXCLUDED.buy_hold_max_drawdown,
      train_annualized_return = EXCLUDED.train_annualized_return,
      test_return_rate = EXCLUDED.test_return_rate,
      test_max_drawdown = EXCLUDED.test_max_drawdown,
      test_annualized_return = EXCLUDED.test_annualized_return,
      test_trades = EXCLUDED.test_trades,
      test_rows_tested = EXCLUDED.test_rows_tested,
      annualized_diff = EXCLUDED.annualized_diff,
      train_start_date = EXCLUDED.train_start_date,
      test_start_date = EXCLUDED.test_start_date,
      reached_target = EXCLUDED.reached_target,
      source = EXCLUDED.source,
      model_reason = EXCLUDED.model_reason,
      scanned_at = NOW()
  `, [
    id, row.symbol, row.market, row.symbolName, row.presetId, row.presetLabel, row.strategyType, row.rowsTested,
    row.baselineReturnRate, row.baselineMaxDrawdown, row.bestReturnRate, row.bestMaxDrawdown,
    row.bestScore, row.bestTrades, row.testedCandidates, JSON.stringify(row.bestConfig),
    row.buyHoldReturnRate, row.buyHoldMaxDrawdown,
    row.trainAnnualizedReturn, row.testReturnRate, row.testMaxDrawdown, row.testAnnualizedReturn,
    row.testTrades, row.testRowsTested, row.annualizedDiff, row.trainStartDate, row.testStartDate,
    Boolean(row.reachedTarget), row.source || "", row.modelReason || "",
  ]);
}

// Whether (symbol, market, presetId) should be treated as "not yet scanned" — true if there's
// no row at all, OR if the existing row predates the train/test methodology (train_start_date
// IS NULL, i.e. it was written by the single-window scan this replaced). That second case lets
// a normal (non --rescan) run incrementally upgrade old rows over time without the admin
// needing to force a full rescan of everything at once.
async function needsScan(pool, symbol, market, presetId, { rescan, sessionSince }) {
  if (!rescan) {
    const result = await pool.query(
      "SELECT train_start_date FROM optimization_scan_results WHERE symbol = $1 AND market = $2 AND preset_id = $3",
      [symbol, market, presetId]
    );
    if (result.rowCount === 0) return true;
    return result.rows[0].train_start_date === null;
  }
  if (!sessionSince) return true;
  // Resuming: only skip a pair if it was already redone since THIS rescan session started,
  // not merely because a (possibly stale/pre-fix) row exists from earlier.
  const result = await pool.query(
    "SELECT 1 FROM optimization_scan_results WHERE symbol = $1 AND market = $2 AND preset_id = $3 AND scanned_at >= $4",
    [symbol, market, presetId, sessionSince]
  );
  return result.rowCount === 0;
}

module.exports = { ensureResultsTable, saveOptimizationResult, needsScan };
