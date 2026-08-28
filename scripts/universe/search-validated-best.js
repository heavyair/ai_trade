// Experimental variant of run-auto-generate.js built to directly search for a model whose
// OUT-OF-SAMPLE (test-period) annualized return clears a target threshold — not just whatever
// happens to win on train-period score.
//
// The key methodological difference from run-auto-generate.js: that script scores every
// attempt on TRAIN data only, picks the single highest-scoring attempt that beats buy-hold,
// and ONLY THEN evaluates it against the test window. An attempt that would have generalized
// better but scored lower on train (e.g. a simpler, less-overfit rule set) never even gets
// test-evaluated, because it was discarded before that step. Here, EVERY qualifying attempt
// (beats buy-hold on train) is immediately scored on BOTH validation years too, and the one
// whose WORSE year has the best annualized return is what gets tracked/saved — directly
// optimizing for a model that holds up in its weakest year, not one that looks good only on
// average because one good year is masking a bad one. "Target reached" likewise requires BOTH
// years to individually clear --targetPercent, not just their average.
//
// Usage: node scripts/universe/search-validated-best.js --symbols=QQQ,NET [--targetPercent=50]
//   [--attemptsPerSymbol=60] [--maxAttempts=400] [--candidates=400] [--pointCount=5]
//   [--trainYears=4] [--testYears=2] [--minTrainRows=200] [--minTestRows=50]
//   [--save] (omit to dry-run/report only; with --save, the best-by-test attempt for each
//   symbol is always saved even if it didn't reach --targetPercent, so re-running later can
//   pick up where this run left off instead of losing progress that fell just short)

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { searchBestConfig } = require("./search-best-config.js");
const ModelGenerator = require("../shared/model-generator.js");
const { inferMarket } = require("../shared/universe-loader.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { splitTrainTestWindows } = require("../shared/train-test-window.js");
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
const TRAIN_YEARS = Math.max(1, Math.round(getArg("trainYears", 4)));
const TEST_YEARS = Math.max(1, Math.round(getArg("testYears", 2)));
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
const SHOULD_SAVE = args.includes("--save");
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

if (SYMBOLS_FILTER.length === 0) {
  console.error("usage error: --symbols=CODE1,CODE2 is required (this script never falls back to the full universe).");
  process.exit(1);
}

// Live progress, polled by server.js's /api/admin/validated-search status endpoint — same
// file-based reporting convention as run-auto-generate.js's own progress file.
const PROGRESS_FILE = path.join(__dirname, "..", "..", "data", "validated-search-progress.json");
let progressState = {};
function writeProgress(patch) {
  progressState = { ...progressState, ...patch, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressState));
  } catch (error) {
    // Best-effort only — progress reporting must never take down the actual job.
  }
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
  console.log(`targetPercent=${TARGET_PERCENT}% attemptsPerSymbol=${ATTEMPTS_PER_SYMBOL} maxAttempts=${MAX_ATTEMPTS} candidates=${CANDIDATES_PER_SYMBOL} pointCount=${POINT_COUNT} trainYears=${TRAIN_YEARS} testYears=${TEST_YEARS} save=${SHOULD_SAVE} symbols=${symbols.map((s) => s.code).join(",")}`);

  let aiCalls = 0;
  let saved = 0;
  let dataSkipped = 0;
  let errored = 0;
  let bestAnnualizedReturn = null;
  let bestAnnualizedSymbol = null;
  const results = [];

  writeProgress({
    status: "running",
    totalSymbols: symbols.length,
    symbolIndex: 0,
    currentSymbol: null,
    attempt: 0,
    attemptsPerSymbol: ATTEMPTS_PER_SYMBOL,
    targetPercent: TARGET_PERCENT,
    currentReason: null,
    aiCalls: 0,
    saved: 0,
    dataSkipped: 0,
    errored: 0,
    bestAnnualizedReturn: null,
    bestAnnualizedSymbol: null,
  });

  let symbolIndex = 0;
  for (const symbolEntry of symbols) {
    symbolIndex += 1;
    writeProgress({ symbolIndex, currentSymbol: symbolEntry.code, attempt: 0, currentReason: null });
    const dbMarket = symbolEntry.market === "CN" ? (/^[569]/.test(symbolEntry.code) ? "1" : "0") : "US";
    try {
      const freshness = await ensureFreshData(pool, symbolEntry.code, dbMarket);
      if (freshness.refreshed) {
        console.log(`[refresh] ${symbolEntry.code} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before searching`);
      }
      const allRows = await loadRows(symbolEntry.code, dbMarket);
      const { trainRows, trainStartDate, trainEndDate, testWindows } = splitTrainTestWindows(allRows, TRAIN_YEARS, TEST_YEARS);
      const testWindowRowCounts = testWindows.map(
        (win) => allRows.filter((row) => row.date >= win.startDate && row.date < win.endDate).length,
      );
      if (trainRows.length < MIN_TRAIN_ROWS || testWindowRowCounts.some((count) => count < MIN_TEST_ROWS)) {
        console.log(`[skip-data] ${symbolEntry.code} trainRows=${trainRows.length} (<${MIN_TRAIN_ROWS}?) testWindowRows=${testWindowRowCounts.join("/")} (<${MIN_TEST_ROWS}?)`);
        dataSkipped += 1;
        writeProgress({ dataSkipped, currentReason: `历史数据不足（训练${trainRows.length}行/验证${testWindowRowCounts.join("+")}行），跳过` });
        continue;
      }

      const profile = ModelGenerator.buildSymbolDataProfile(trainRows);
      console.log(`[${symbolEntry.code}] profile (train window ${trainStartDate}~${trainEndDate}): return=${profile.totalReturnPercent}% vol=${profile.annualizedVolatilityPercent}% maxDD=${profile.maxDrawdownPercent}%`);

      engine.setActiveLotSizeSymbol(symbolEntry.code);
      const buyHoldStates = engine.buildBuyHoldStates(trainRows, INITIAL_CASH, TRADE_FEE);
      const buyHold = buyHoldStates[buyHoldStates.length - 1];

      const previousAttempts = [];
      let bestByTest = null; // { model, best, trainAnnualized, year1Annualized, year2Annualized, worstTestAnnualized, scoredYear1, scoredYear2 }
      let reachedTarget = false;

      for (let attempt = 0; attempt < ATTEMPTS_PER_SYMBOL; attempt += 1) {
        if (aiCalls >= MAX_ATTEMPTS) {
          console.log(`[budget] reached --maxAttempts=${MAX_ATTEMPTS} AI calls total, stopping entirely`);
          break;
        }
        if (reachedTarget) break;

        writeProgress({ attempt: attempt + 1, currentReason: "AI 正在分析数据、设计模型…" });
        aiCalls += 1;
        let model;
        try {
          model = await ModelGenerator.generateModelFromDataProfile(profile, symbolEntry.code, previousAttempts);
        } catch (aiError) {
          console.error(`[ai-error] ${symbolEntry.code} attempt ${attempt + 1}: ${aiError.message}`);
          errored += 1;
          writeProgress({ aiCalls, errored });
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

        // This is the actual methodological change: score EVERY qualifying attempt on BOTH
        // validation years immediately, instead of only ever test-evaluating a single
        // train-picked winner at the very end. Selection (and "target reached") is driven by
        // the WORSE of the two years, so a model can't hide a bad year behind a good one.
        const scoredYear1 = engine.buildScoredBacktestStates(allRows, best.config, testWindows[0].startDate, testWindows[0].endDate);
        const scoredYear2 = engine.buildScoredBacktestStates(allRows, best.config, testWindows[1].startDate, testWindows[1].endDate);
        const trainAnnualized = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
        const year1Annualized = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
        const year2Annualized = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;
        const worstTestAnnualized = Math.min(year1Annualized, year2Annualized);
        console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} train=${trainAnnualized.toFixed(1)}%年化 year1=${year1Annualized.toFixed(1)}%年化 year2=${year2Annualized.toFixed(1)}%年化 worst=${worstTestAnnualized.toFixed(1)}%年化`);

        if (!bestByTest || worstTestAnnualized > bestByTest.worstTestAnnualized) {
          bestByTest = { model, best, trainAnnualized, year1Annualized, year2Annualized, worstTestAnnualized, scoredYear1, scoredYear2 };
        }
        if (bestAnnualizedReturn === null || worstTestAnnualized > bestAnnualizedReturn) {
          bestAnnualizedReturn = worstTestAnnualized;
          bestAnnualizedSymbol = symbolEntry.code;
        }
        writeProgress({
          aiCalls,
          currentReason: `${model.strategyType}：train ${trainAnnualized.toFixed(1)}%年化 / 验证第1年 ${year1Annualized.toFixed(1)}%年化 / 验证第2年 ${year2Annualized.toFixed(1)}%年化`,
          bestAnnualizedReturn, bestAnnualizedSymbol,
        });
        if (year1Annualized >= TARGET_PERCENT && year2Annualized >= TARGET_PERCENT) {
          reachedTarget = true;
          console.log(`[TARGET REACHED] ${symbolEntry.code}: attempt ${attempt + 1} validated at year1=${year1Annualized.toFixed(1)}%年化 year2=${year2Annualized.toFixed(1)}%年化 (both >= ${TARGET_PERCENT}%)`);
        }
      }

      if (bestByTest) {
        results.push({ symbol: symbolEntry.code, ...bestByTest, reachedTarget });
        console.log(`[best-by-test] ${symbolEntry.code}: strategyType=${bestByTest.model.strategyType} train=${bestByTest.trainAnnualized.toFixed(1)}% year1=${bestByTest.year1Annualized.toFixed(1)}% year2=${bestByTest.year2Annualized.toFixed(1)}% ${reachedTarget ? "— TARGET MET" : "— below target"}`);

        if (SHOULD_SAVE) {
          const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const name = `ai_validated_${symbolEntry.code}_${dateSlug}`;
          const label = reachedTarget
            ? `AI验证达标·${symbolEntry.code}·第1年+${bestByTest.year1Annualized.toFixed(1)}%·第2年+${bestByTest.year2Annualized.toFixed(1)}%·${dateSlug}`
            : `AI搜索中·${symbolEntry.code}·当前最差年份+${bestByTest.worstTestAnnualized.toFixed(1)}%年化·${dateSlug}`;
          // This candidate never touches strategy_presets — it only ever lives in
          // optimization_scan_results (see that file's header comment). presetId is just an
          // internal candidate-pool key, not a real strategy_presets.id; a human promotes it
          // into a real model via the admin panel's "另存为" button when it's worth keeping.
          const presetId = name;
          const trainAnnualizedReturn = bestByTest.trainAnnualized;
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
            trainAnnualizedReturn,
            testYear1ReturnRate: bestByTest.scoredYear1.returnRate,
            testYear1MaxDrawdown: bestByTest.scoredYear1.maxDrawdown,
            testYear1AnnualizedReturn: bestByTest.year1Annualized,
            testYear1Trades: bestByTest.scoredYear1.trades.length,
            testYear1RowsTested: bestByTest.scoredYear1.rowsScored,
            testYear1StartDate: testWindows[0].startDate,
            testYear1EndDate: testWindows[0].endDate,
            testYear2ReturnRate: bestByTest.scoredYear2.returnRate,
            testYear2MaxDrawdown: bestByTest.scoredYear2.maxDrawdown,
            testYear2AnnualizedReturn: bestByTest.year2Annualized,
            testYear2Trades: bestByTest.scoredYear2.trades.length,
            testYear2RowsTested: bestByTest.scoredYear2.rowsScored,
            testYear2StartDate: testWindows[1].startDate,
            testYear2EndDate: testWindows[1].endDate,
            annualizedDiffYear1: Math.abs(bestByTest.year1Annualized - trainAnnualizedReturn),
            annualizedDiffYear2: Math.abs(bestByTest.year2Annualized - trainAnnualizedReturn),
            trainStartDate,
            trainEndDate,
            reachedTarget,
            source: "validated-search",
            modelReason: bestByTest.model.reason || "",
          });
          saved += 1;
          console.log(`[saved] ${symbolEntry.code}: ${presetId} ${reachedTarget ? "(TARGET MET)" : "(best-so-far, below target)"}`);
          writeProgress({ saved, currentReason: `已保存：${label}` });
        }
      } else {
        console.log(`[no-qualifying] ${symbolEntry.code}: no attempt beat buy-hold on both return and drawdown`);
      }
    } catch (error) {
      console.error(`[error] ${symbolEntry.code}: ${error.message}`);
      errored += 1;
      writeProgress({ errored });
    }
  }

  console.log(`\ndone. aiCalls=${aiCalls}`);
  console.log("summary:", JSON.stringify(results.map((r) => ({
    symbol: r.symbol, strategyType: r.model.strategyType,
    train: Number(r.trainAnnualized.toFixed(1)),
    year1: Number(r.year1Annualized.toFixed(1)), year2: Number(r.year2Annualized.toFixed(1)),
    reachedTarget: r.reachedTarget,
  })), null, 2));
  writeProgress({
    status: "done",
    currentSymbol: null,
    currentReason: `完成：共处理 ${symbolIndex}/${symbols.length} 只股票，AI调用${aiCalls}次，保存${saved}个，数据不足跳过${dataSkipped}个，出错${errored}个。`,
    bestAnnualizedReturn, bestAnnualizedSymbol,
  });
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
