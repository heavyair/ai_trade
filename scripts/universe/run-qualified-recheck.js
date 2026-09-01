// 达标复查 (qualification recheck): re-scores every already-qualified model
// (optimization_scan_results.source='validated-search' AND reached_target=TRUE) against the
// two MOST RECENT 1-year validation windows, using freshly-arrived price data — the exact same
// methodology search-validated-best.js used to qualify it in the first place (see that file's
// header comment for why "both years individually clear the target" beats a blended average),
// just re-run later once more real trading days have accumulated. splitTrainTestWindows is
// always anchored on "today" at call time, so simply calling it again naturally slides both
// windows forward — no need to remember or reconstruct the original run's dates.
//
// This does NOT touch reached_target or any test_year*/train_* column — those stay exactly as
// the historical qualification record. The outcome is written to a separate set of recheck_*
// columns (see optimization-results.js's ensureResultsTable comment), so "did it qualify
// originally" and "does it still hold up now" are both visible side by side, not one
// overwriting the other. A model that no longer qualifies is NOT deleted or auto-disabled —
// nothing is "running" for a not-yet-promoted candidate sitting in this table, unlike a 盯盘提醒
// watch (see run-watch-alerts.js) which has a live position to protect; this is purely a signal
// for a human to decide whether to keep trusting/promoting it.
//
// Usage: node scripts/universe/run-qualified-recheck.js [--symbols=NET,GOOGL] [--targetPercent=50] [--testYears=2]
//   (no --symbols = recheck every qualified row)

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { splitTrainTestWindows } = require("../shared/train-test-window.js");
const { ensureResultsTable, fetchQualifiedForRecheck, saveRecheckResult } = require("../shared/optimization-results.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? Number(found.split("=")[1]) : fallback;
};
const getArgString = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : "";
};
const TARGET_PERCENT = getArg("targetPercent", 50);
const TEST_YEARS = Math.max(1, Math.round(getArg("testYears", 2)));
const MIN_TEST_ROWS = Math.max(10, getArg("minTestRows", 50));
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

// Live progress, polled by server.js's /api/admin/qualified-recheck status — same file-based
// reporting convention as run-auto-generate.js/search-validated-best.js.
const PROGRESS_FILE = path.join(__dirname, "..", "..", "data", "qualified-recheck-progress.json");
let progressState = {};
function writeProgress(patch) {
  progressState = { ...progressState, ...patch, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressState));
  } catch (error) {
    // Best-effort only — progress reporting must never take down the actual job.
  }
}

async function loadRows(symbol, dbMarket) {
  const result = await pool.query(`
    SELECT dp.trade_date, dp.open, dp.high, dp.low, dp.close, dp.volume,
           dv.pe, dv.pe_ttm, dv.pb
    FROM daily_prices dp
    LEFT JOIN LATERAL (
      SELECT pe, pe_ttm, pb
      FROM daily_valuations
      WHERE symbol = dp.symbol AND market = dp.market
        AND trade_date <= dp.trade_date AND trade_date >= dp.trade_date - INTERVAL '10 days'
      ORDER BY trade_date DESC
      LIMIT 1
    ) dv ON TRUE
    WHERE dp.symbol = $1 AND dp.market = $2
    ORDER BY dp.trade_date ASC
  `, [symbol, dbMarket]);
  return result.rows
    .map((row) => ({
      date: row.trade_date.toISOString().slice(0, 10),
      open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.volume),
      pe: row.pe !== null ? Number(row.pe) : undefined,
      peTtm: row.pe_ttm !== null ? Number(row.pe_ttm) : undefined,
      pb: row.pb !== null ? Number(row.pb) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

async function main() {
  await ensureResultsTable(pool);

  const candidates = await fetchQualifiedForRecheck(pool, { symbols: SYMBOLS_FILTER });
  console.log(`targetPercent=${TARGET_PERCENT}% testYears=${TEST_YEARS} candidates=${candidates.length}${SYMBOLS_FILTER.length ? ` symbols=${SYMBOLS_FILTER.join(",")}` : " (all qualified rows)"}`);

  let checked = 0;
  let stillQualifies = 0;
  let noLongerQualifies = 0;
  let skipped = 0;

  writeProgress({
    status: "running", total: candidates.length, index: 0, currentSymbol: null,
    checked: 0, stillQualifies: 0, noLongerQualifies: 0, skipped: 0, targetPercent: TARGET_PERCENT,
  });

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    writeProgress({ index: i + 1, currentSymbol: candidate.symbol });
    try {
      const freshness = await ensureFreshData(pool, candidate.symbol, candidate.market);
      if (freshness.refreshed) {
        console.log(`[refresh] ${candidate.symbol} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before rechecking`);
      }
      const allRows = await loadRows(candidate.symbol, candidate.market);
      // trainYears doesn't matter here — a recheck never re-trains, it only re-scores the
      // already-frozen best_config, so only the testWindows half of the split is used.
      const { testWindows } = splitTrainTestWindows(allRows, 1, TEST_YEARS);
      const testWindowRowCounts = testWindows.map(
        (win) => allRows.filter((row) => row.date >= win.startDate && row.date < win.endDate).length,
      );
      if (testWindowRowCounts.some((count) => count < MIN_TEST_ROWS)) {
        console.log(`[skip-data] ${candidate.symbol} testWindowRows=${testWindowRowCounts.join("/")} (<${MIN_TEST_ROWS}?)`);
        skipped += 1;
        await saveRecheckResult(pool, {
          id: candidate.id, stillQualifies: null, year1Annualized: null, year2Annualized: null,
          targetPercent: TARGET_PERCENT, error: `最新数据不足以复查（验证窗口行数 ${testWindowRowCounts.join("/")}，需要至少 ${MIN_TEST_ROWS}）`,
        });
        writeProgress({ skipped });
        continue;
      }

      const scoredYear1 = engine.buildScoredBacktestStates(allRows, candidate.bestConfig, testWindows[0].startDate, testWindows[0].endDate);
      const scoredYear2 = engine.buildScoredBacktestStates(allRows, candidate.bestConfig, testWindows[1].startDate, testWindows[1].endDate);
      const year1Annualized = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
      const year2Annualized = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;
      const nowQualifies = year1Annualized >= TARGET_PERCENT && year2Annualized >= TARGET_PERCENT;

      await saveRecheckResult(pool, {
        id: candidate.id, stillQualifies: nowQualifies, year1Annualized, year2Annualized,
        targetPercent: TARGET_PERCENT, error: "",
      });
      checked += 1;
      if (nowQualifies) stillQualifies += 1; else noLongerQualifies += 1;
      console.log(`[${candidate.symbol}] ${candidate.label}: 复查 year1=${year1Annualized.toFixed(1)}%年化 year2=${year2Annualized.toFixed(1)}%年化 ${nowQualifies ? "— 仍达标" : "— 不再达标"}`);
      writeProgress({ checked, stillQualifies, noLongerQualifies });
    } catch (error) {
      console.error(`[error] ${candidate.symbol}: ${error.message}`);
      skipped += 1;
      try {
        await saveRecheckResult(pool, {
          id: candidate.id, stillQualifies: null, year1Annualized: null, year2Annualized: null,
          targetPercent: TARGET_PERCENT, error: `复查出错：${error.message}`.slice(0, 500),
        });
      } catch (saveError) {
        console.error(`[error] failed to record recheck error for ${candidate.symbol}: ${saveError.message}`);
      }
      writeProgress({ skipped });
    }
  }

  console.log(`\ndone. checked=${checked} stillQualifies=${stillQualifies} noLongerQualifies=${noLongerQualifies} skipped=${skipped}`);
  writeProgress({
    status: "done", currentSymbol: null,
    currentReason: `完成：共复查 ${candidates.length} 个已达标模型，仍达标 ${stillQualifies} 个，不再达标 ${noLongerQualifies} 个，跳过 ${skipped} 个。`,
  });
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
