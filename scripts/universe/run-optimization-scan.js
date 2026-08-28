// Batch parameter-optimization scan: for every symbol in the universe and every currently-
// active (non-hidden) saved strategy preset, re-optimizes that preset's own parameters — but
// with a train/test split instead of optimizing and evaluating on the same data:
//
//   - TRAIN window: trainYears years of history, ending testYears years ago — parameter
//     search runs here, picking the best-scoring config.
//   - TEST windows: testYears SEPARATE, non-overlapping 1-year windows right after training,
//     each scored independently — that SAME (unchanged) config is then run once more against
//     each year of out-of-sample data the search never saw, purely to measure it. Never merged
//     into one blended number: a strategy that does great in year 1 and terrible in year 2
//     should not be able to hide behind an averaged figure.
//
// Both the train-period and each test year's annualized return get saved, along with their
// absolute differences (annualized_diff_year1/year2) — the smaller those differences, the more
// consistent the model's real-world behavior was with what the parameter search "promised",
// which is what the admin list defaults to sorting by (ascending, on the most recent year)
// instead of raw return.
//
// This is intentionally decoupled from server.js/app.js: it reads directly from the
// symbols/daily_prices/strategy_presets tables that already exist for the live app, and
// owns its own results table, so it can't affect the live site's request-handling code path.
//
// Long-running (candidate count x symbol count x preset count). Meant to run detached in
// the background and be safely re-run/resumed: each (symbol, preset) result is upserted,
// and already-scanned pairs are skipped unless --rescan is passed — a pair whose existing
// row predates the train/test methodology (no train_start_date) is always treated as
// unscanned regardless, so normal runs incrementally upgrade old rows over time.
//
// Usage: node scripts/universe/run-optimization-scan.js [--candidates=300] [--minTrainRows=200]
//   [--minTestRows=50] [--trainYears=4] [--testYears=2] [--rescan] [--presetIds=id1,id2]
//   [--symbols=513100,AMD]
//   --presetIds restricts the scan to specific (already-active) preset IDs, e.g. for an
//   admin-triggered "rescan just this model" run instead of the full active set.
//   --symbols restricts the scan to specific stock codes instead of the full universe (same
//   override mechanism as run-auto-generate.js's --symbols=) — an explicitly-requested symbol
//   is always scanned even if it isn't part of symbols.json's fixed universe list.

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { searchBestConfig } = require("./search-best-config.js");
const { loadExpandedUniverse, inferMarket } = require("../shared/universe-loader.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { splitTrainTestWindows } = require("../shared/train-test-window.js");
const { ensureResultsTable, saveOptimizationResult, needsScan } = require("../shared/optimization-results.js");

// Live progress, polled by server.js's optimization-scan status endpoint so the admin panel
// can show "currently on symbol X, trying model Y, N/M candidates" instead of just a raw
// pair-count — same file-based reporting convention as run-auto-generate.js's own progress
// file. server.js deletes this file right before spawning a new run (see launchScanProcess),
// so a finished/crashed prior run's numbers never flash on screen before this run's first write.
const PROGRESS_FILE = path.join(__dirname, "..", "..", "data", "scan-progress.json");
let progressState = {};
function writeProgress(patch) {
  progressState = { ...progressState, ...patch, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressState));
  } catch (error) {
    // Best-effort only — progress reporting must never take down the actual job.
  }
}

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
const CANDIDATES_PER_PAIR = Math.max(1, getArg("candidates", 300));
const MIN_TRAIN_ROWS = Math.max(30, getArg("minTrainRows", 200));
const MIN_TEST_ROWS = Math.max(10, getArg("minTestRows", 50));
// Whole years only — shiftYears (scripts/shared/train-test-window.js) uses Date.setFullYear,
// which truncates a fractional argument rather than applying it proportionally, so a
// fractional value here wouldn't do what it looks like it does.
const TRAIN_YEARS = Math.max(1, Math.round(getArg("trainYears", 4)));
const TEST_YEARS = Math.max(1, Math.round(getArg("testYears", 2)));
const SYMBOL_LIMIT = getArg("limit", 0);
const RESCAN = args.includes("--rescan");
const PRESET_IDS_FILTER = getArgString("presetIds").split(",").map((s) => s.trim()).filter(Boolean);
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
// When resuming a --rescan run that crashed partway through, pass the ORIGINAL session's
// start time here so pairs already redone since then are skipped instead of redone again
// (plain --rescan with no session marker always redoes everything, since a fresh rescan
// is supposed to override every existing row regardless of age).
const SESSION_SINCE = getArgString("sessionSince") || null;
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

// Source of truth for "which presets does the batch scan test" is
// original_model_id = '0' — a preset is scanned iff it's itself a root
// (hand-crafted or admin-designated root), not a derived parameter variant.
async function loadActivePresets() {
  const result = await pool.query(`
    SELECT sp.id, sp.name, sp.label, sp.strategy_type, sp.config, sp.meta, sp.updated_at
    FROM strategy_presets sp
    WHERE sp.original_model_id = '0' AND sp.hidden_at IS NULL
    ORDER BY sp.strategy_type, sp.name
  `);
  return result.rows.map((row) => ({
    id: row.id,
    label: row.label,
    strategyType: row.strategy_type,
    updatedAt: row.updated_at,
    ...row.config,
  }));
}

async function loadRows(symbol, market) {
  const result = await pool.query(`
    SELECT dp.trade_date, dp.open, dp.high, dp.low, dp.close, dp.volume,
           dv.pe, dv.pe_ttm, dv.pb
    FROM daily_prices dp
    LEFT JOIN daily_valuations dv
      ON dv.symbol = dp.symbol AND dv.market = dp.market AND dv.trade_date = dp.trade_date
    WHERE dp.symbol = $1 AND dp.market = $2
    ORDER BY dp.trade_date ASC
  `, [symbol, market]);
  return result.rows
    .map((row) => ({
      date: row.trade_date.toISOString().slice(0, 10),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
      pe: row.pe !== null ? Number(row.pe) : undefined,
      peTtm: row.pe_ttm !== null ? Number(row.pe_ttm) : undefined,
      pb: row.pb !== null ? Number(row.pb) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

async function main() {
  await ensureResultsTable(pool);

  const universe = SYMBOLS_FILTER.length > 0
    ? SYMBOLS_FILTER.map((code) => ({ code, market: inferMarket(code), name: code }))
    : await loadExpandedUniverse(pool);
  const symbols = SYMBOL_LIMIT > 0 ? universe.slice(0, SYMBOL_LIMIT) : universe;
  const presetIdFilterSet = PRESET_IDS_FILTER.length > 0 ? new Set(PRESET_IDS_FILTER) : null;
  const presets = (await loadActivePresets()).filter((p) => !presetIdFilterSet || presetIdFilterSet.has(p.id));
  console.log(`symbols=${symbols.length} active presets=${presets.length} candidatesPerPair=${CANDIDATES_PER_PAIR} minTrainRows=${MIN_TRAIN_ROWS} minTestRows=${MIN_TEST_ROWS} trainYears=${TRAIN_YEARS} testYears=${TEST_YEARS} rescan=${RESCAN}${presetIdFilterSet ? ` presetFilter=${PRESET_IDS_FILTER.join(",")}` : ""}${SYMBOLS_FILTER.length > 0 ? ` symbolsFilter=${SYMBOLS_FILTER.join(",")}` : ""}`);
  presets.forEach((p) => console.log(`  preset: ${p.label} (${p.strategyType}) id=${p.id}`));

  writeProgress({
    status: "running",
    totalPairs: symbols.length * presets.length,
    totalSymbols: symbols.length,
    modelsCount: presets.length,
    candidatesPerPair: CANDIDATES_PER_PAIR,
    pairIndex: 0,
    symbolsStarted: 0,
    sessionTestedCandidates: 0,
    skipped: 0,
    dataSkipped: 0,
  });

  const windowCache = new Map(); // symbol:market -> { trainRows, testWindows, trainStartDate, trainEndDate, buyHold }
  let pairIndex = 0;
  let skipped = 0;
  let dataSkipped = 0;
  const totalPairs = symbols.length * presets.length;

  for (const symbolEntry of symbols) {
    const dbMarket = symbolEntry.market === "CN"
      ? (/^[569]/.test(symbolEntry.code) ? "1" : "0")
      : "US";
    writeProgress({
      symbolsStarted: progressState.symbolsStarted + 1,
      currentSymbol: symbolEntry.code,
      currentSymbolName: symbolEntry.name,
    });

    // A transient DB hiccup here (or anywhere per-symbol, before the per-pair try/catch
    // below even starts) would otherwise be an uncaught rejection that kills the whole
    // process — catch it, skip this one symbol, and keep going instead of crashing a
    // multi-hour run over what's usually a momentary connection blip.
    let window;
    try {
      const cacheKey = `${symbolEntry.code}:${dbMarket}`;
      window = windowCache.get(cacheKey);
      if (window === undefined) {
        const freshness = await ensureFreshData(pool, symbolEntry.code, dbMarket);
        if (freshness.refreshed) {
          console.log(`[refresh] ${symbolEntry.code} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before scanning`);
        }
        const rows = await loadRows(symbolEntry.code, dbMarket);
        const { trainRows, trainStartDate, trainEndDate, testWindows } = splitTrainTestWindows(rows, TRAIN_YEARS, TEST_YEARS);
        const testWindowRowCounts = testWindows.map(
          (win) => rows.filter((row) => row.date >= win.startDate && row.date < win.endDate).length,
        );

        if (trainRows.length < MIN_TRAIN_ROWS || testWindowRowCounts.some((count) => count < MIN_TEST_ROWS)) {
          window = { insufficientData: true, trainRows, testWindowRowCounts };
        } else {
          const buyHoldStates = engine.buildBuyHoldStates(trainRows, INITIAL_CASH, TRADE_FEE);
          const buyHold = buyHoldStates[buyHoldStates.length - 1];
          window = { rows, trainRows, testWindows, trainStartDate, trainEndDate, buyHold };
        }
        windowCache.set(cacheKey, window);
      }

      if (window.insufficientData) {
        dataSkipped += presets.length;
        pairIndex += presets.length;
        writeProgress({ pairIndex, dataSkipped });
        console.log(`[skip-data] ${symbolEntry.code} trainRows=${window.trainRows.length} (<${MIN_TRAIN_ROWS}?) testWindowRows=${window.testWindowRowCounts.join("/")} (<${MIN_TEST_ROWS}?), skipping all presets`);
        continue;
      }
    } catch (error) {
      console.error(`[error] loading ${symbolEntry.code}: ${error.message}`);
      pairIndex += presets.length;
      writeProgress({ pairIndex });
      continue;
    }

    const { rows, trainRows, testWindows, trainStartDate, trainEndDate, buyHold } = window;
    engine.setActiveLotSizeSymbol(symbolEntry.code);
    const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: "wave" };

    for (const preset of presets) {
      pairIndex += 1;

      try {
        if (!(await needsScan(pool, symbolEntry.code, dbMarket, preset.id, { rescan: RESCAN, sessionSince: SESSION_SINCE }))) {
          skipped += 1;
          writeProgress({ pairIndex, skipped });
          continue;
        }

        writeProgress({
          pairIndex,
          currentSymbol: symbolEntry.code,
          currentSymbolName: symbolEntry.name,
          currentPresetId: preset.id,
          currentPresetLabel: preset.label,
          currentStrategyType: preset.strategyType,
        });

        const config0 = engine.buildConfigFromPresetObject(preset, { ...baseConfig, strategyType: preset.strategyType });
        const baselineStates = engine.buildBacktestStates(trainRows, config0);
        const baselineLast = baselineStates[baselineStates.length - 1];

        const best = searchBestConfig(engine, preset, trainRows, { ...baseConfig, strategyType: preset.strategyType }, CANDIDATES_PER_PAIR);
        if (!best) {
          console.error(`[error] ${symbolEntry.code} x ${preset.label}: no candidate produced a valid backtest`);
          continue;
        }
        const bestScore = best.score;

        // Out-of-sample: run the EXACT found config (unchanged) against EACH validation year
        // separately, which the parameter search above never saw. Scored against the FULL
        // history (not just each window's own rows) so rolling-window indicators (moving
        // averages, N-day highs, etc.) have real warmup data instead of being starved by a
        // test window shorter than their own lookback — see buildScoredBacktestStates's
        // comment for why this matters.
        const scoredYear1 = engine.buildScoredBacktestStates(rows, best.config, testWindows[0].startDate, testWindows[0].endDate);
        const scoredYear2 = engine.buildScoredBacktestStates(rows, best.config, testWindows[1].startDate, testWindows[1].endDate);

        const trainAnnualizedReturn = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
        const testYear1AnnualizedReturn = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
        const testYear2AnnualizedReturn = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;
        const annualizedDiffYear1 = Math.abs(testYear1AnnualizedReturn - trainAnnualizedReturn);
        const annualizedDiffYear2 = Math.abs(testYear2AnnualizedReturn - trainAnnualizedReturn);

        await saveOptimizationResult(pool, {
          symbol: symbolEntry.code,
          market: dbMarket,
          symbolName: symbolEntry.name,
          presetId: preset.id,
          presetLabel: preset.label,
          strategyType: preset.strategyType,
          rowsTested: trainRows.length,
          baselineReturnRate: baselineLast.returnRate,
          baselineMaxDrawdown: baselineLast.maxDrawdown,
          bestReturnRate: best.last.returnRate,
          bestMaxDrawdown: best.last.maxDrawdown,
          bestScore,
          bestTrades: best.last.trades.length,
          testedCandidates: best.testedCandidates,
          bestConfig: best.config,
          buyHoldReturnRate: buyHold.returnRate,
          buyHoldMaxDrawdown: buyHold.maxDrawdown,
          trainAnnualizedReturn,
          testYear1ReturnRate: scoredYear1.returnRate,
          testYear1MaxDrawdown: scoredYear1.maxDrawdown,
          testYear1AnnualizedReturn,
          testYear1Trades: scoredYear1.trades.length,
          testYear1RowsTested: scoredYear1.rowsScored,
          testYear1StartDate: testWindows[0].startDate,
          testYear1EndDate: testWindows[0].endDate,
          testYear2ReturnRate: scoredYear2.returnRate,
          testYear2MaxDrawdown: scoredYear2.maxDrawdown,
          testYear2AnnualizedReturn,
          testYear2Trades: scoredYear2.trades.length,
          testYear2RowsTested: scoredYear2.rowsScored,
          testYear2StartDate: testWindows[1].startDate,
          testYear2EndDate: testWindows[1].endDate,
          annualizedDiffYear1,
          annualizedDiffYear2,
          trainStartDate,
          trainEndDate,
        });

        writeProgress({ sessionTestedCandidates: progressState.sessionTestedCandidates + best.testedCandidates });

        if (pairIndex % 20 === 0 || pairIndex === totalPairs) {
          console.log(`[${pairIndex}/${totalPairs}] ${symbolEntry.code} x ${preset.label}: train=${trainAnnualizedReturn.toFixed(1)}%年化 year1=${testYear1AnnualizedReturn.toFixed(1)}%年化 year2=${testYear2AnnualizedReturn.toFixed(1)}%年化 diff1=${annualizedDiffYear1.toFixed(1)} diff2=${annualizedDiffYear2.toFixed(1)}`);
        }
      } catch (error) {
        console.error(`[error] ${symbolEntry.code} x ${preset.label}: ${error.message}`);
      }
    }
  }

  console.log(`\ndone. total pairs=${totalPairs} skipped(already scanned)=${skipped} skipped(insufficient data)=${dataSkipped}`);
  writeProgress({ status: "done", pairIndex: totalPairs, skipped, dataSkipped });
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
