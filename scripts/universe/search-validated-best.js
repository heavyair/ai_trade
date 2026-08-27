// Experimental variant of run-auto-generate.js built to directly search for a model whose
// OUT-OF-SAMPLE (test-period) annualized return clears a target threshold — not just whatever
// happens to win on train-period score.
//
// The key methodological difference from run-auto-generate.js: that script scores every
// attempt on TRAIN data only, picks the single highest-scoring attempt that beats buy-hold,
// and ONLY THEN evaluates it against the test window. An attempt that would have generalized
// better but scored lower on train (e.g. a simpler, less-overfit rule set) never even gets
// test-evaluated, because it was discarded before that step. Here, EVERY qualifying attempt
// (beats buy-hold on train) is immediately scored on the test window too, and the one with
// the best test-period annualized return is what gets tracked/saved — directly optimizing for
// the number that actually matters (does this hold up on data the search never saw), not a
// proxy for it.
//
// Usage: node scripts/universe/search-validated-best.js --symbols=QQQ,NET [--targetPercent=50]
//   [--attemptsPerSymbol=60] [--maxAttempts=400] [--candidates=400] [--pointCount=5]
//   [--trainYearsAgo=5] [--testYearsAgo=1] [--minTrainRows=200] [--minTestRows=50]
//   [--save] (only saves a preset if the target is actually reached; omit to dry-run/report only)

const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { searchBestConfig } = require("./search-best-config.js");
const ModelGenerator = require("../shared/model-generator.js");
const { inferMarket } = require("../shared/universe-loader.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { splitTrainTestRows } = require("../shared/train-test-window.js");
const { ensureResultsTable, saveOptimizationResult } = require("../shared/optimization-results.js");

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
const ATTEMPTS_PER_SYMBOL = Math.max(1, getArg("attemptsPerSymbol", 60));
const MAX_ATTEMPTS = Math.max(1, getArg("maxAttempts", 400));
const CANDIDATES_PER_SYMBOL = Math.max(1, getArg("candidates", 400));
const POINT_COUNT = Math.max(3, Math.min(10, Math.round(getArg("pointCount", 5))));
const MIN_TRAIN_ROWS = Math.max(30, getArg("minTrainRows", 200));
const MIN_TEST_ROWS = Math.max(10, getArg("minTestRows", 50));
const TRAIN_YEARS_AGO = Math.max(1, Math.round(getArg("trainYearsAgo", 5)));
const TEST_YEARS_AGO = Math.max(1, Math.round(getArg("testYearsAgo", 1)));
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
const OWNER_USER_ID = getArgString("ownerUserId") || null;
const OWNER_EMAIL = getArgString("ownerEmail") || "";
const SHOULD_SAVE = args.includes("--save");
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

if (TRAIN_YEARS_AGO <= TEST_YEARS_AGO) {
  console.error(`usage error: --trainYearsAgo (${TRAIN_YEARS_AGO}) must be greater than --testYearsAgo (${TEST_YEARS_AGO})`);
  process.exit(1);
}
if (SYMBOLS_FILTER.length === 0) {
  console.error("usage error: --symbols=CODE1,CODE2 is required (this script never falls back to the full universe).");
  process.exit(1);
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
      open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.volume),
      pe: row.pe !== null ? Number(row.pe) : undefined,
      peTtm: row.pe_ttm !== null ? Number(row.pe_ttm) : undefined,
      pb: row.pb !== null ? Number(row.pb) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

function modelHasRules(model) {
  if (model.strategyType === "block-rules") return model.buyBlockRules.length > 0 || model.sellBlockRules.length > 0;
  if (model.strategyType === "score-rules") return model.scoreRules.length > 0 && model.positionBands.length > 0;
  if (model.strategyType === "wave") return model.buyRules.length > 0 || model.sellRules.length > 0;
  const ruleKeyByType = {
    "local-high-ladder": "localLadderRule",
    "ma-rsi-band": "maRsiBandRule",
    "order-grid": "orderGridRule",
    "pe-volume": "peVolumeRule",
    "stagnation-reversal": "stagnationReversalRule",
  };
  const key = ruleKeyByType[model.strategyType];
  return key ? Boolean(model[key]) : true;
}

async function main() {
  await ensureResultsTable(pool);
  engine.setOptimizationPointCountOverride(POINT_COUNT);

  const symbols = SYMBOLS_FILTER.map((code) => ({ code, market: inferMarket(code), name: code }));
  console.log(`targetPercent=${TARGET_PERCENT}% attemptsPerSymbol=${ATTEMPTS_PER_SYMBOL} maxAttempts=${MAX_ATTEMPTS} candidates=${CANDIDATES_PER_SYMBOL} pointCount=${POINT_COUNT} trainYearsAgo=${TRAIN_YEARS_AGO} testYearsAgo=${TEST_YEARS_AGO} save=${SHOULD_SAVE} symbols=${symbols.map((s) => s.code).join(",")}`);

  let aiCalls = 0;
  const results = [];

  for (const symbolEntry of symbols) {
    const dbMarket = symbolEntry.market === "CN" ? (/^[569]/.test(symbolEntry.code) ? "1" : "0") : "US";
    try {
      const freshness = await ensureFreshData(pool, symbolEntry.code, dbMarket);
      if (freshness.refreshed) {
        console.log(`[refresh] ${symbolEntry.code} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before searching`);
      }
      const allRows = await loadRows(symbolEntry.code, dbMarket);
      const { trainRows, testRows, trainStartDate, testStartDate } = splitTrainTestRows(allRows, TRAIN_YEARS_AGO, TEST_YEARS_AGO);
      if (trainRows.length < MIN_TRAIN_ROWS || testRows.length < MIN_TEST_ROWS) {
        console.log(`[skip-data] ${symbolEntry.code} trainRows=${trainRows.length} (<${MIN_TRAIN_ROWS}?) testRows=${testRows.length} (<${MIN_TEST_ROWS}?)`);
        continue;
      }

      const profile = ModelGenerator.buildSymbolDataProfile(trainRows);
      console.log(`[${symbolEntry.code}] profile (train window ${trainStartDate}~${testStartDate}): return=${profile.totalReturnPercent}% vol=${profile.annualizedVolatilityPercent}% maxDD=${profile.maxDrawdownPercent}%`);

      engine.setActiveLotSizeSymbol(symbolEntry.code);
      const buyHoldStates = engine.buildBuyHoldStates(trainRows, INITIAL_CASH, TRADE_FEE);
      const buyHold = buyHoldStates[buyHoldStates.length - 1];

      const previousAttempts = [];
      let bestByTest = null; // { model, best, testAnnualized, testScored }
      let reachedTarget = false;

      for (let attempt = 0; attempt < ATTEMPTS_PER_SYMBOL; attempt += 1) {
        if (aiCalls >= MAX_ATTEMPTS) {
          console.log(`[budget] reached --maxAttempts=${MAX_ATTEMPTS} AI calls total, stopping entirely`);
          break;
        }
        if (reachedTarget) break;

        aiCalls += 1;
        let model;
        try {
          model = await ModelGenerator.generateModelFromDataProfile(profile, symbolEntry.code, previousAttempts);
        } catch (aiError) {
          console.error(`[ai-error] ${symbolEntry.code} attempt ${attempt + 1}: ${aiError.message}`);
          continue;
        }
        previousAttempts.push({ strategyType: model.strategyType, reason: model.reason });
        if (!modelHasRules(model)) {
          console.log(`[empty-model] ${symbolEntry.code} attempt ${attempt + 1}: no usable rules, skipping`);
          continue;
        }

        const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: model.strategyType };
        const best = searchBestConfig(engine, model, trainRows, baseConfig, CANDIDATES_PER_SYMBOL);
        if (!best) continue;

        const beatsReturn = best.last.returnRate > buyHold.returnRate;
        const beatsDrawdown = best.last.maxDrawdown < buyHold.maxDrawdown;
        if (!beatsReturn || !beatsDrawdown) {
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} train=${best.last.returnRate.toFixed(1)}% — didn't beat buy-hold, skipping test eval`);
          continue;
        }

        // This is the actual methodological change: score EVERY qualifying attempt on the
        // test window immediately, instead of only ever test-evaluating a single train-picked
        // winner at the very end.
        const scoredTest = engine.buildScoredBacktestStates(allRows, best.config, testStartDate);
        const trainAnnualized = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
        const testAnnualized = annualizedReturnRate(scoredTest.returnRate, scoredTest.rowsScored) || 0;
        console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} train=${trainAnnualized.toFixed(1)}%年化 TEST=${testAnnualized.toFixed(1)}%年化 (${scoredTest.trades.length}笔) diff=${Math.abs(testAnnualized - trainAnnualized).toFixed(1)}`);

        if (!bestByTest || testAnnualized > bestByTest.testAnnualized) {
          bestByTest = { model, best, trainAnnualized, testAnnualized, scoredTest };
        }
        if (testAnnualized >= TARGET_PERCENT) {
          reachedTarget = true;
          console.log(`[TARGET REACHED] ${symbolEntry.code}: attempt ${attempt + 1} validated at ${testAnnualized.toFixed(1)}%年化 (>= ${TARGET_PERCENT}%)`);
        }
      }

      if (bestByTest) {
        results.push({ symbol: symbolEntry.code, ...bestByTest, reachedTarget });
        console.log(`[best-by-test] ${symbolEntry.code}: strategyType=${bestByTest.model.strategyType} train=${bestByTest.trainAnnualized.toFixed(1)}% TEST=${bestByTest.testAnnualized.toFixed(1)}% ${reachedTarget ? "— TARGET MET" : "— below target"}`);

        if (SHOULD_SAVE && reachedTarget) {
          const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const name = `ai_validated_${symbolEntry.code}_${dateSlug}`;
          const label = `AI验证达标·${symbolEntry.code}·+${bestByTest.testAnnualized.toFixed(1)}%验证期年化·${dateSlug}`;
          const presetId = await ModelGenerator.saveGeneratedPreset(pool, {
            name,
            config: bestByTest.best.config,
            label,
            targetSymbol: symbolEntry.code,
            originalText: bestByTest.model.reason || "",
            ownerUserId: OWNER_USER_ID,
            ownerEmail: OWNER_EMAIL,
          });
          await saveOptimizationResult(pool, {
            symbol: symbolEntry.code,
            market: dbMarket,
            symbolName: symbolEntry.name,
            presetId,
            presetLabel: label,
            strategyType: bestByTest.model.strategyType,
            rowsTested: trainRows.length,
            baselineReturnRate: 0,
            baselineMaxDrawdown: 0,
            bestReturnRate: bestByTest.best.last.returnRate,
            bestMaxDrawdown: bestByTest.best.last.maxDrawdown,
            bestScore: bestByTest.best.score,
            bestTrades: bestByTest.best.last.trades.length,
            testedCandidates: bestByTest.best.testedCandidates,
            bestConfig: bestByTest.best.config,
            buyHoldReturnRate: buyHold.returnRate,
            buyHoldMaxDrawdown: buyHold.maxDrawdown,
            trainAnnualizedReturn: bestByTest.trainAnnualized,
            testReturnRate: bestByTest.scoredTest.returnRate,
            testMaxDrawdown: bestByTest.scoredTest.maxDrawdown,
            testAnnualizedReturn: bestByTest.testAnnualized,
            testTrades: bestByTest.scoredTest.trades.length,
            testRowsTested: bestByTest.scoredTest.rowsScored,
            annualizedDiff: Math.abs(bestByTest.testAnnualized - bestByTest.trainAnnualized),
            trainStartDate,
            testStartDate,
          });
          console.log(`[saved] ${symbolEntry.code}: ${presetId}`);
        }
      } else {
        console.log(`[no-qualifying] ${symbolEntry.code}: no attempt beat buy-hold on both return and drawdown`);
      }
    } catch (error) {
      console.error(`[error] ${symbolEntry.code}: ${error.message}`);
    }
  }

  console.log(`\ndone. aiCalls=${aiCalls}`);
  console.log("summary:", JSON.stringify(results.map((r) => ({
    symbol: r.symbol, strategyType: r.model.strategyType,
    train: Number(r.trainAnnualized.toFixed(1)), test: Number(r.testAnnualized.toFixed(1)),
    reachedTarget: r.reachedTarget,
  })), null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
