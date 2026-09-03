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

    -- Two-separate-validation-years methodology (train N years, then TWO independent 1-year
    -- test windows scored separately — never blended into one number). The old bare test_*/
    -- annualized_diff columns above are left in place but no longer written by any script —
    -- see this file's header comment; every writer now populates test_year1_*/test_year2_*
    -- instead. year1 = the OLDER validation year (right after training ends), year2 = the
    -- MORE RECENT year (closest to today).
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year1_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year1_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year1_annualized_return DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year1_trades INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year1_rows_tested INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year1_start_date DATE;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year1_end_date DATE;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year2_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year2_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year2_annualized_return DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year2_trades INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year2_rows_tested INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year2_start_date DATE;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS test_year2_end_date DATE;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS annualized_diff_year1 DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS annualized_diff_year2 DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS train_end_date DATE;

    -- search-validated-best.js A/B-tests whether showing the AI generator a sample of OTHER
    -- symbols' already-target-reached models (see fetchPriorSuccessfulModels below) improves
    -- the train-phase qualify rate over blind generation from just the data profile — each
    -- attempt independently coin-flips which arm it's in. Recorded on saved rows so the two
    -- arms' reached_target rates can be compared later instead of relying on scrollback logs.
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS used_prior_examples BOOLEAN NOT NULL DEFAULT FALSE;

    -- 达标复查 (run-qualified-recheck.js): re-scores an already-qualified (reached_target=TRUE,
    -- source='validated-search') row's frozen best_config against the two MOST RECENT 1-year
    -- validation windows (splitTrainTestWindows is always anchored on "today" at call time, so
    -- simply calling it again naturally slides both windows forward to use freshly-arrived data
    -- — no need to remember the original run's dates). test_year1/test_year2 are left alone
    -- either way — that's the historical record of what it achieved when it first qualified;
    -- the fresh numbers land in recheck_year1/year2 instead, so "did it qualify originally" and
    -- "what does it score now" are both visible side by side. reached_target is the one
    -- exception: saveRecheckResult demotes it to FALSE the moment a recheck comes back
    -- stillQualifies=FALSE (see that function's comment for why a stale "达标" flag actively
    -- misleads other parts of the app) — a passing or inconclusive recheck never touches it.
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS last_rechecked_at TIMESTAMPTZ;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS recheck_still_qualifies BOOLEAN;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS recheck_year1_annualized_return DOUBLE PRECISION;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS recheck_year2_annualized_return DOUBLE PRECISION;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS recheck_target_percent DOUBLE PRECISION;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS recheck_error TEXT NOT NULL DEFAULT '';

    -- Upside-deviation gate (see scripts/shared/volatility.js + search-validated-best.js's
    -- UPSIDE_THRESHOLD_PERCENT): the fraction of that year's own upside deviation a recheck
    -- required the model to clear, recorded alongside recheck_target_percent for the same
    -- "what standard was this judged against" transparency.
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS recheck_upside_threshold_percent DOUBLE PRECISION;
  `);
}

// Small sample of OTHER symbols' already-validated (reached_target=TRUE) models, for
// search-validated-best.js to optionally show the AI generator as few-shot "what has worked
// elsewhere" context. Always excludes the symbol currently being searched (excludeSymbol/
// excludeMarket) — showing a symbol its OWN historical results would leak information about
// that symbol's own test-period performance into the generation of its next candidate, which
// is a real leakage channel, not a hypothetical one. ORDER BY RANDOM() so repeated calls across
// a run sample different corners of the (currently small, ~dozens of rows) table instead of
// always the same top-N; fine at this scale, revisit if the table grows to the point RANDOM()
// itself becomes the bottleneck.
async function fetchPriorSuccessfulModels(pool, { excludeSymbol, excludeMarket, limit = 8 } = {}) {
  const result = await pool.query(`
    SELECT symbol, strategy_type, model_reason, test_year1_annualized_return, test_year2_annualized_return
    FROM optimization_scan_results
    WHERE reached_target = TRUE
      AND NOT (symbol = $1 AND market = $2)
    ORDER BY RANDOM()
    LIMIT $3
  `, [excludeSymbol || "", excludeMarket || "", limit]);
  return result.rows.map((row) => ({
    symbol: row.symbol,
    strategyType: row.strategy_type,
    reason: row.model_reason || "",
    year1Annualized: Number(row.test_year1_annualized_return) || 0,
    year2Annualized: Number(row.test_year2_annualized_return) || 0,
  }));
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
      train_annualized_return, train_start_date, train_end_date,
      test_year1_return_rate, test_year1_max_drawdown, test_year1_annualized_return,
      test_year1_trades, test_year1_rows_tested, test_year1_start_date, test_year1_end_date,
      test_year2_return_rate, test_year2_max_drawdown, test_year2_annualized_return,
      test_year2_trades, test_year2_rows_tested, test_year2_start_date, test_year2_end_date,
      annualized_diff_year1, annualized_diff_year2,
      reached_target, source, model_reason, used_prior_examples, scanned_at
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,
      $19,$20,$21,
      $22,$23,$24,$25,$26,$27,$28,
      $29,$30,$31,$32,$33,$34,$35,
      $36,$37,
      $38,$39,$40,$41,NOW()
    )
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
      train_start_date = EXCLUDED.train_start_date,
      train_end_date = EXCLUDED.train_end_date,
      test_year1_return_rate = EXCLUDED.test_year1_return_rate,
      test_year1_max_drawdown = EXCLUDED.test_year1_max_drawdown,
      test_year1_annualized_return = EXCLUDED.test_year1_annualized_return,
      test_year1_trades = EXCLUDED.test_year1_trades,
      test_year1_rows_tested = EXCLUDED.test_year1_rows_tested,
      test_year1_start_date = EXCLUDED.test_year1_start_date,
      test_year1_end_date = EXCLUDED.test_year1_end_date,
      test_year2_return_rate = EXCLUDED.test_year2_return_rate,
      test_year2_max_drawdown = EXCLUDED.test_year2_max_drawdown,
      test_year2_annualized_return = EXCLUDED.test_year2_annualized_return,
      test_year2_trades = EXCLUDED.test_year2_trades,
      test_year2_rows_tested = EXCLUDED.test_year2_rows_tested,
      test_year2_start_date = EXCLUDED.test_year2_start_date,
      test_year2_end_date = EXCLUDED.test_year2_end_date,
      annualized_diff_year1 = EXCLUDED.annualized_diff_year1,
      annualized_diff_year2 = EXCLUDED.annualized_diff_year2,
      reached_target = EXCLUDED.reached_target,
      source = EXCLUDED.source,
      model_reason = EXCLUDED.model_reason,
      used_prior_examples = EXCLUDED.used_prior_examples,
      scanned_at = NOW()
  `, [
    id, row.symbol, row.market, row.symbolName, row.presetId, row.presetLabel, row.strategyType, row.rowsTested,
    row.baselineReturnRate, row.baselineMaxDrawdown, row.bestReturnRate, row.bestMaxDrawdown,
    row.bestScore, row.bestTrades, row.testedCandidates, JSON.stringify(row.bestConfig),
    row.buyHoldReturnRate, row.buyHoldMaxDrawdown,
    row.trainAnnualizedReturn, row.trainStartDate, row.trainEndDate,
    row.testYear1ReturnRate, row.testYear1MaxDrawdown, row.testYear1AnnualizedReturn,
    row.testYear1Trades, row.testYear1RowsTested, row.testYear1StartDate, row.testYear1EndDate,
    row.testYear2ReturnRate, row.testYear2MaxDrawdown, row.testYear2AnnualizedReturn,
    row.testYear2Trades, row.testYear2RowsTested, row.testYear2StartDate, row.testYear2EndDate,
    row.annualizedDiffYear1, row.annualizedDiffYear2,
    Boolean(row.reachedTarget), row.source || "", row.modelReason || "", Boolean(row.usedPriorExamples),
  ]);
}

// Whether (symbol, market, presetId) should be treated as "not yet scanned" — true if there's
// no row at all, OR if the existing row predates the train/test methodology (train_start_date
// IS NULL, i.e. it was written by the single-window scan this replaced), OR if it predates the
// two-separate-validation-years methodology (test_year1_start_date IS NULL, i.e. it was written
// by the old single-test-window scoring). Any of these cases lets a normal (non --rescan) run
// incrementally upgrade old rows over time without the admin needing to force a full rescan of
// everything at once.
async function needsScan(pool, symbol, market, presetId, { rescan, sessionSince }) {
  if (!rescan) {
    const result = await pool.query(
      "SELECT train_start_date, test_year1_start_date FROM optimization_scan_results WHERE symbol = $1 AND market = $2 AND preset_id = $3",
      [symbol, market, presetId]
    );
    if (result.rowCount === 0) return true;
    return result.rows[0].train_start_date === null || result.rows[0].test_year1_start_date === null;
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

// Candidate pool for run-qualified-recheck.js — only source='validated-search' rows ever have
// a real reached_target signal (run-auto-generate.js's own save path never sets it, see this
// file's header comment), so that's the only source worth re-checking. symbols, if given,
// narrows to just those (case already normalized by the caller); omitted/empty means "every
// qualified row".
async function fetchQualifiedForRecheck(pool, { symbols } = {}) {
  const hasSymbolFilter = Array.isArray(symbols) && symbols.length > 0;
  const result = await pool.query(
    `SELECT id, symbol, market, preset_label, best_config
     FROM optimization_scan_results
     WHERE source = 'validated-search' AND reached_target = TRUE
       ${hasSymbolFilter ? "AND symbol = ANY($1)" : ""}
     ORDER BY scanned_at ASC`,
    hasSymbolFilter ? [symbols] : []
  );
  return result.rows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    market: row.market,
    label: row.preset_label,
    bestConfig: row.best_config && typeof row.best_config === "object" ? row.best_config : {},
  }));
}

// Records one recheck outcome against the row it re-tested. When the recheck comes back
// stillQualifies===false, this ALSO demotes the row's own reached_target to FALSE — a model
// that's been shown to no longer hold up shouldn't keep counting as "达标" elsewhere in the
// app (it would otherwise keep being sorted/badged as a validated success in the 验证搜索
// list, and keep being fed to fetchPriorSuccessfulModels as a "here's what worked" few-shot
// example for OTHER symbols' AI generation — actively misleading once it's known to be stale).
// A passing recheck (stillQualifies===true) or an inconclusive one (null — error/insufficient
// data) never touches reached_target: once demoted a row stays demoted until a human
// re-promotes it (or a future search re-discovers and re-saves it), it doesn't get silently
// re-promoted by a later recheck run — an occasional lucky recheck shouldn't undo a real
// finding. The original test_year1/test_year2 numbers are left alone either way (that's the
// historical record of what it achieved when it first qualified); recheck_year1/year2 above
// carry the fresh numbers instead of overwriting them.
async function saveRecheckResult(pool, { id, stillQualifies, year1Annualized, year2Annualized, targetPercent, upsideThresholdPercent, error }) {
  await pool.query(
    `UPDATE optimization_scan_results
     SET last_rechecked_at = NOW(),
         recheck_still_qualifies = $2,
         recheck_year1_annualized_return = $3,
         recheck_year2_annualized_return = $4,
         recheck_target_percent = $5,
         recheck_upside_threshold_percent = $6,
         recheck_error = $7,
         reached_target = CASE WHEN $2 = FALSE THEN FALSE ELSE reached_target END
     WHERE id = $1`,
    [id, stillQualifies === undefined || stillQualifies === null ? null : Boolean(stillQualifies),
      year1Annualized === undefined || year1Annualized === null ? null : Number(year1Annualized),
      year2Annualized === undefined || year2Annualized === null ? null : Number(year2Annualized),
      targetPercent === undefined || targetPercent === null ? null : Number(targetPercent),
      upsideThresholdPercent === undefined || upsideThresholdPercent === null ? null : Number(upsideThresholdPercent),
      String(error || "")]
  );
}

module.exports = {
  ensureResultsTable, saveOptimizationResult, needsScan, fetchPriorSuccessfulModels,
  fetchQualifiedForRecheck, saveRecheckResult,
};
