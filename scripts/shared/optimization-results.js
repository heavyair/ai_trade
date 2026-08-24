// Owns the optimization_scan_results table — one row per (symbol, market, preset). Shared by
// run-optimization-scan.js (re-optimizing existing presets) and run-auto-generate.js (a newly
// AI-generated preset gets a row here too, right after it's saved), so both pipelines' results
// live in one place with one schema instead of AI自动生成 only ever showing up as text baked
// into a preset's label.
//
// Since the train/test methodology change (see scripts/shared/train-test-window.js), the
// existing baseline_return_rate/best_return_rate/buy_hold_return_rate/rows_tested columns are
// computed from the TRAIN window slice, not the whole history — same columns, new meaning,
// no rename (this file's callers just feed them different input than before). New columns
// hold the out-of-sample TEST-window numbers plus the annualized figures used for ranking.

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
  `);
}

async function saveOptimizationResult(pool, row) {
  const id = `scan_${row.symbol}_${row.market}_${row.presetId}`.replace(/[^a-zA-Z0-9_]/g, "_");
  await pool.query(`
    INSERT INTO optimization_scan_results (
      id, symbol, market, symbol_name, preset_id, preset_label, strategy_type, rows_tested,
      baseline_return_rate, baseline_max_drawdown, best_return_rate, best_max_drawdown,
      best_score, best_trades, tested_candidates, best_config,
      buy_hold_return_rate, buy_hold_max_drawdown,
      train_annualized_return, test_return_rate, test_max_drawdown, test_annualized_return,
      test_trades, test_rows_tested, annualized_diff, train_start_date, test_start_date,
      scanned_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW())
    ON CONFLICT (symbol, market, preset_id) DO UPDATE SET
      symbol_name = EXCLUDED.symbol_name,
      preset_label = EXCLUDED.preset_label,
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
      scanned_at = NOW()
  `, [
    id, row.symbol, row.market, row.symbolName, row.presetId, row.presetLabel, row.strategyType, row.rowsTested,
    row.baselineReturnRate, row.baselineMaxDrawdown, row.bestReturnRate, row.bestMaxDrawdown,
    row.bestScore, row.bestTrades, row.testedCandidates, JSON.stringify(row.bestConfig),
    row.buyHoldReturnRate, row.buyHoldMaxDrawdown,
    row.trainAnnualizedReturn, row.testReturnRate, row.testMaxDrawdown, row.testAnnualizedReturn,
    row.testTrades, row.testRowsTested, row.annualizedDiff, row.trainStartDate, row.testStartDate,
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
