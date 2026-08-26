// Batch parameter-optimization scan: for every symbol in the universe and every currently-
// active (non-hidden) saved strategy preset, re-optimizes that preset's own parameters — but
// with a train/test split instead of optimizing and evaluating on the same data:
//
//   - TRAIN window: [trainYearsAgo years ago, testYearsAgo years ago) — parameter search runs
//     here, picking the best-scoring config.
//   - TEST window: [testYearsAgo years ago, today] — that SAME (unchanged) config is then run
//     once more against this out-of-sample data the search never saw, purely to measure it.
//
// Both the train-period and test-period annualized returns get saved, along with their
// absolute difference (annualized_diff) — the smaller that difference, the more consistent
// the model's real-world behavior was with what the parameter search "promised", which is
// what the admin list defaults to sorting by (ascending) instead of raw return.
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
//   [--minTestRows=50] [--trainYearsAgo=5] [--testYearsAgo=1] [--rescan] [--presetIds=id1,id2]
//   [--symbols=513100,AMD]
//   --presetIds restricts the scan to specific (already-active) preset IDs, e.g. for an
//   admin-triggered "rescan just this model" run instead of the full active set.
//   --symbols restricts the scan to specific stock codes instead of the full universe (same
//   override mechanism as run-auto-generate.js's --symbols=) — an explicitly-requested symbol
//   is always scanned even if it isn't part of symbols.json's fixed universe list.

const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { searchBestConfig } = require("./search-best-config.js");
const { loadExpandedUniverse, inferMarket } = require("../shared/universe-loader.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { splitTrainTestRows } = require("../shared/train-test-window.js");
const { ensureResultsTable, saveOptimizationResult, needsScan } = require("../shared/optimization-results.js");

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
const TRAIN_YEARS_AGO = Math.max(1, Math.round(getArg("trainYearsAgo", 5)));
const TEST_YEARS_AGO = Math.max(1, Math.round(getArg("testYearsAgo", 1)));
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

if (TRAIN_YEARS_AGO <= TEST_YEARS_AGO) {
  console.error(`usage error: --trainYearsAgo (${TRAIN_YEARS_AGO}) must be greater than --testYearsAgo (${TEST_YEARS_AGO})`);
  process.exit(1);
}

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
  console.log(`symbols=${symbols.length} active presets=${presets.length} candidatesPerPair=${CANDIDATES_PER_PAIR} minTrainRows=${MIN_TRAIN_ROWS} minTestRows=${MIN_TEST_ROWS} trainYearsAgo=${TRAIN_YEARS_AGO} testYearsAgo=${TEST_YEARS_AGO} rescan=${RESCAN}${presetIdFilterSet ? ` presetFilter=${PRESET_IDS_FILTER.join(",")}` : ""}${SYMBOLS_FILTER.length > 0 ? ` symbolsFilter=${SYMBOLS_FILTER.join(",")}` : ""}`);
  presets.forEach((p) => console.log(`  preset: ${p.label} (${p.strategyType}) id=${p.id}`));

  const windowCache = new Map(); // symbol:market -> { trainRows, testRows, trainStartDate, testStartDate, buyHold }
  let pairIndex = 0;
  let skipped = 0;
  let dataSkipped = 0;
  const totalPairs = symbols.length * presets.length;

  for (const symbolEntry of symbols) {
    const dbMarket = symbolEntry.market === "CN"
      ? (/^[569]/.test(symbolEntry.code) ? "1" : "0")
      : "US";

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
        const { trainRows, testRows, trainStartDate, testStartDate } = splitTrainTestRows(rows, TRAIN_YEARS_AGO, TEST_YEARS_AGO);

        if (trainRows.length < MIN_TRAIN_ROWS || testRows.length < MIN_TEST_ROWS) {
          window = { insufficientData: true, trainRows, testRows };
        } else {
          const buyHoldStates = engine.buildBuyHoldStates(trainRows, INITIAL_CASH, TRADE_FEE);
          const buyHold = buyHoldStates[buyHoldStates.length - 1];
          window = { trainRows, testRows, trainStartDate, testStartDate, buyHold };
        }
        windowCache.set(cacheKey, window);
      }

      if (window.insufficientData) {
        dataSkipped += presets.length;
        pairIndex += presets.length;
        console.log(`[skip-data] ${symbolEntry.code} trainRows=${window.trainRows.length} (<${MIN_TRAIN_ROWS}?) testRows=${window.testRows.length} (<${MIN_TEST_ROWS}?), skipping all presets`);
        continue;
      }
    } catch (error) {
      console.error(`[error] loading ${symbolEntry.code}: ${error.message}`);
      pairIndex += presets.length;
      continue;
    }

    const { trainRows, testRows, trainStartDate, testStartDate, buyHold } = window;
    engine.setActiveLotSizeSymbol(symbolEntry.code);
    const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: "wave" };

    for (const preset of presets) {
      pairIndex += 1;

      try {
        if (!(await needsScan(pool, symbolEntry.code, dbMarket, preset.id, { rescan: RESCAN, sessionSince: SESSION_SINCE }))) {
          skipped += 1;
          continue;
        }

        const config0 = engine.buildConfigFromPresetObject(preset, { ...baseConfig, strategyType: preset.strategyType });
        const baselineStates = engine.buildBacktestStates(trainRows, config0);
        const baselineLast = baselineStates[baselineStates.length - 1];

        const best = searchBestConfig(engine, preset, trainRows, { ...baseConfig, strategyType: preset.strategyType }, CANDIDATES_PER_PAIR);
        if (!best) {
          console.error(`[error] ${symbolEntry.code} x ${preset.label}: no candidate produced a valid backtest`);
          continue;
        }
        const bestScore = best.score;

        // Out-of-sample: run the EXACT found config (unchanged) against the test window,
        // which the parameter search above never saw.
        const testStates = engine.buildBacktestStates(testRows, best.config);
        const testLast = testStates[testStates.length - 1];

        const trainAnnualizedReturn = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
        const testAnnualizedReturn = annualizedReturnRate(testLast.returnRate, testRows.length) || 0;
        const annualizedDiff = Math.abs(testAnnualizedReturn - trainAnnualizedReturn);

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
          testReturnRate: testLast.returnRate,
          testMaxDrawdown: testLast.maxDrawdown,
          testAnnualizedReturn,
          testTrades: testLast.trades.length,
          testRowsTested: testRows.length,
          annualizedDiff,
          trainStartDate,
          testStartDate,
        });

        if (pairIndex % 20 === 0 || pairIndex === totalPairs) {
          console.log(`[${pairIndex}/${totalPairs}] ${symbolEntry.code} x ${preset.label}: train=${trainAnnualizedReturn.toFixed(1)}%年化 test=${testAnnualizedReturn.toFixed(1)}%年化 diff=${annualizedDiff.toFixed(1)}`);
        }
      } catch (error) {
        console.error(`[error] ${symbolEntry.code} x ${preset.label}: ${error.message}`);
      }
    }
  }

  console.log(`\ndone. total pairs=${totalPairs} skipped(already scanned)=${skipped} skipped(insufficient data)=${dataSkipped}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
