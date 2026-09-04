// Autonomous "AI looks at a symbol's own price history, proposes a timing model, the model
// gets parameter-optimized, and if the best-found config beats buy-and-hold on BOTH return
// rate and max drawdown, it gets saved as a real preset" pipeline.
//
// This is deliberately NOT the same as generateModelFromDescription (server.js's interactive
// "生成安全模型" — a human-typed description, no data). Here the AI never sees a human
// description at all; it only sees buildSymbolDataProfile's statistical digest of the
// symbol's actual history (see scripts/shared/model-generator.js), and is asked to design
// something suited to what that data looks like.
//
// Same conventions as the other scripts/universe/*.js batch jobs: standalone Pool, own
// DATABASE_URL env resolution, per-symbol try/catch so one bad symbol doesn't kill the run.
// The one thing that's NEW here versus those scripts: generateModelFromDataProfile costs
// real API money per call, and (unlike server.js's interactive endpoint) there is currently
// no rate limiting on it anywhere — so --maxAttempts is a hard stop on AI call count,
// independent of how many symbols are left to process.
//
// For each symbol, multiple AI attempts are made (--attemptsPerSymbol) instead of accepting
// whatever the first call produces — each attempt is told what strategyType/approach earlier
// attempts for the SAME symbol already used (see generateModelFromDataProfile's
// previousAttempts param) and is asked to try something structurally different, so the
// attempts are a genuine spread of ideas rather than re-rolls of the same one. Only the
// single best-scoring attempt that beats buy-and-hold on both return and drawdown gets saved
// per symbol — trying several ideas is about raising the chance of finding one good model,
// not about saving every idea that happens to clear the bar.
//
// Train/test split (scripts/shared/train-test-window.js): the AI only ever sees the TRAIN
// window's data profile, and parameter search only ever runs against the TRAIN window — the
// TEST years (--testYears separate 1-year windows, most recent --testYears years) are never
// shown to the AI or the optimizer, so their out-of-sample results are a genuine, uncontaminated
// stability check. Each test year is scored INDEPENDENTLY (never blended into one number) — a
// model that did great in one year and terrible in the other is not the same as one that was
// consistently good, and blending would hide that. The winning model's train annualized return
// and each test year's annualized return (and diff vs train) get saved into
// optimization_scan_results — the same table run-optimization-scan.js writes — instead of
// only ever existing as text baked into the saved preset's label.
//
// Usage: node scripts/universe/run-auto-generate.js [--symbols=513100,588000] [--limit=5]
//   [--maxAttempts=20] [--attemptsPerSymbol=10] [--candidates=400] [--pointCount=5]
//   [--minTrainRows=200] [--minTestRows=50] [--trainYears=4] [--testYears=2]
//   --pointCount (3-10) controls how many discrete values each freshly-discovered parameter
//   range gets tested at (engine.js's setOptimizationPointCountOverride).

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { searchBestConfig } = require("./search-best-config.js");
const ModelGenerator = require("../shared/model-generator.js");
const { loadExpandedUniverse, inferMarket } = require("../shared/universe-loader.js");
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
const SYMBOL_LIMIT = Math.max(0, getArg("limit", 0));
const MAX_ATTEMPTS = Math.max(1, getArg("maxAttempts", 20));
const ATTEMPTS_PER_SYMBOL = Math.max(1, getArg("attemptsPerSymbol", 10));
const CANDIDATES_PER_SYMBOL = Math.max(1, getArg("candidates", 400));
// How many discrete values each freshly-discovered parameter range gets tested at during
// the post-generation optimization search (engine.js's setOptimizationPointCountOverride) —
// higher means a finer-grained search per parameter at the cost of more candidates needed
// to cover the same combination space.
const POINT_COUNT = Math.max(3, Math.min(10, Math.round(getArg("pointCount", 5))));
const MIN_TRAIN_ROWS = Math.max(30, getArg("minTrainRows", 200));
const MIN_TEST_ROWS = Math.max(10, getArg("minTestRows", 50));
// Whole years only — shiftYears (scripts/shared/train-test-window.js) uses Date.setFullYear,
// which truncates a fractional argument rather than applying it proportionally.
const TRAIN_YEARS = Math.max(1, Math.round(getArg("trainYears", 4)));
const TEST_YEARS = Math.max(1, Math.round(getArg("testYears", 2)));
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

// Live progress, polled by server.js's /api/admin/auto-generate status endpoint so the admin
// panel can show "currently trying model X, attempt N/M" instead of just "running" — same
// file-based reporting convention as server.js's own scan-session-state.json, just owned by
// this script instead of the server (the server never runs the loop itself, only spawns it).
const PROGRESS_FILE = path.join(__dirname, "..", "..", "data", "auto-generate-progress.json");
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
           dv.pe, dv.pe_ttm, dv.pb,
           sf.gross_margin, sf.roe, sf.revenue_growth
    FROM daily_prices dp
    LEFT JOIN LATERAL (
      -- Forward-fill: see run-watch-alerts.js's loadRows for why (US PE lands once a day,
      -- up to ~10 days lookback so a real data outage still surfaces as missing PE).
      SELECT pe, pe_ttm, pb
      FROM daily_valuations
      WHERE symbol = dp.symbol AND market = dp.market
        AND trade_date <= dp.trade_date AND trade_date >= dp.trade_date - INTERVAL '10 days'
      ORDER BY trade_date DESC
      LIMIT 1
    ) dv ON TRUE
    LEFT JOIN LATERAL (
      -- Same forward-fill idea, but financial-statement data lands quarterly (A-share) or only
      -- annually (US, via AKShare) rather than daily, so the lookback has to be wide enough to
      -- span a full US annual gap plus filing delay — 400 days covers that with margin.
      SELECT gross_margin, roe, revenue_growth
      FROM stock_fundamentals
      WHERE symbol = dp.symbol AND market = dp.market
        AND report_date <= dp.trade_date AND report_date >= dp.trade_date - INTERVAL '400 days'
      ORDER BY report_date DESC
      LIMIT 1
    ) sf ON TRUE
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
      grossMargin: row.gross_margin !== null ? Number(row.gross_margin) : undefined,
      roe: row.roe !== null ? Number(row.roe) : undefined,
      revenueGrowth: row.revenue_growth !== null ? Number(row.revenue_growth) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

// The AI can still hand back a syntactically-valid-but-empty skeleton (e.g. every condition
// it proposed got filtered out by normalizeGeneratedModel for using a disallowed field) —
// this catches that before wasting a parameter search on a model with nothing to optimize.
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

  let symbols;
  if (SYMBOLS_FILTER.length > 0) {
    // Symbols coming from --symbols= are whatever the admin picked out of their query history
    // (see scripts/shared/model-generator's saveGeneratedPreset / server.js
    // symbol_query_history) — that pool is much broader than the fixed batch-scan universe
    // list in symbols.json, so an explicitly-requested symbol must never be silently dropped
    // just because it isn't ALSO a universe constituent.
    symbols = SYMBOLS_FILTER.map((code) => ({ code, market: inferMarket(code), name: code }));
  } else {
    symbols = await loadExpandedUniverse(pool);
  }
  if (SYMBOL_LIMIT > 0) symbols = symbols.slice(0, SYMBOL_LIMIT);

  console.log(`symbols=${symbols.length} maxAttempts=${MAX_ATTEMPTS} attemptsPerSymbol=${ATTEMPTS_PER_SYMBOL} candidatesPerSymbol=${CANDIDATES_PER_SYMBOL} pointCount=${POINT_COUNT} minTrainRows=${MIN_TRAIN_ROWS} minTestRows=${MIN_TEST_ROWS} trainYears=${TRAIN_YEARS} testYears=${TEST_YEARS}`);
  if (symbols.length === 0) {
    console.log("[warn] no symbols to process (empty --symbols list or empty universe manifest) — exiting without doing anything.");
  }

  let aiCalls = 0;
  let saved = 0;
  let rejected = 0;
  let dataSkipped = 0;
  let errored = 0;
  let budgetExhausted = false;
  // Best ANNUALIZED return seen across every attempt actually backtested this run — tracked
  // independently of whether that attempt beat buy-hold/got saved, so the admin panel can
  // show "best model tested so far" as a running headline even while most attempts are still
  // being rejected.
  let bestAnnualizedReturn = null;
  let bestAnnualizedSymbol = null;
  let bestAnnualizedStrategyType = null;

  writeProgress({
    status: "running",
    totalSymbols: symbols.length,
    symbolIndex: 0,
    currentSymbol: null,
    attempt: 0,
    attemptsPerSymbol: ATTEMPTS_PER_SYMBOL,
    currentStrategyType: null,
    currentReason: null,
    maxAttempts: MAX_ATTEMPTS,
    aiCalls: 0,
    saved: 0,
    rejected: 0,
    bestAnnualizedReturn: null,
    bestAnnualizedSymbol: null,
    bestAnnualizedStrategyType: null,
  });

  let symbolIndex = 0;
  for (const symbolEntry of symbols) {
    if (budgetExhausted) break;
    symbolIndex += 1;
    writeProgress({ symbolIndex, currentSymbol: symbolEntry.code, attempt: 0, currentStrategyType: null, currentReason: null });

    const dbMarket = symbolEntry.market === "CN"
      ? (/^[569]/.test(symbolEntry.code) ? "1" : "0")
      : "US";

    try {
      const freshness = await ensureFreshData(pool, symbolEntry.code, dbMarket);
      if (freshness.refreshed) {
        console.log(`[refresh] ${symbolEntry.code} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before generating`);
      }
      const allRows = await loadRows(symbolEntry.code, dbMarket);
      const { trainRows, trainStartDate, trainEndDate, testWindows } = splitTrainTestWindows(allRows, TRAIN_YEARS, TEST_YEARS);
      const testWindowRowCounts = testWindows.map(
        (window) => allRows.filter((row) => row.date >= window.startDate && row.date < window.endDate).length,
      );
      if (trainRows.length < MIN_TRAIN_ROWS || testWindowRowCounts.some((count) => count < MIN_TEST_ROWS)) {
        console.log(`[skip-data] ${symbolEntry.code} trainRows=${trainRows.length} (<${MIN_TRAIN_ROWS}?) testWindowRows=${testWindowRowCounts.join("/")} (<${MIN_TEST_ROWS}?)`);
        dataSkipped += 1;
        writeProgress({ dataSkipped, currentReason: `历史数据不足（训练${trainRows.length}行/验证${testWindowRowCounts.join("+")}行），跳过` });
        continue;
      }

      // The AI only ever sees the TRAIN window's profile — the test windows must stay
      // completely unseen by both the model design and the parameter search for their later
      // out-of-sample results to mean anything.
      const profile = ModelGenerator.buildSymbolDataProfile(trainRows);
      console.log(`[${symbolEntry.code}] profile (train window ${trainStartDate}~${trainEndDate}): return=${profile.totalReturnPercent}% vol=${profile.annualizedVolatilityPercent}% maxDD=${profile.maxDrawdownPercent}%`);

      engine.setActiveLotSizeSymbol(symbolEntry.code);
      const buyHoldStates = engine.buildBuyHoldStates(trainRows, INITIAL_CASH, TRADE_FEE);
      const buyHold = buyHoldStates[buyHoldStates.length - 1];

      const previousAttempts = [];
      let bestQualifying = null; // { model, best } — highest-scoring attempt that beat buy-hold on both dims
      let attemptedAny = false;

      for (let attempt = 0; attempt < ATTEMPTS_PER_SYMBOL; attempt += 1) {
        if (aiCalls >= MAX_ATTEMPTS) {
          console.log(`[budget] reached --maxAttempts=${MAX_ATTEMPTS} AI calls, stopping`);
          budgetExhausted = true;
          break;
        }

        writeProgress({ attempt: attempt + 1, currentStrategyType: null, currentReason: "AI 正在分析数据、设计模型…" });
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
        attemptedAny = true;
        previousAttempts.push({ strategyType: model.strategyType, reason: model.reason });
        writeProgress({
          aiCalls,
          currentStrategyType: model.strategyType,
          currentReason: String(model.reason || "").slice(0, 120),
        });

        if (!modelHasRules(model)) {
          console.log(`[empty-model] ${symbolEntry.code} attempt ${attempt + 1}: AI output had no usable rules after validation (strategyType=${model.strategyType}), skipping`);
          continue;
        }

        const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: model.strategyType };
        const best = searchBestConfig(engine, model, trainRows, baseConfig, CANDIDATES_PER_SYMBOL);
        if (!best) {
          console.log(`[no-candidate] ${symbolEntry.code} attempt ${attempt + 1}: parameter search produced no valid backtest`);
          continue;
        }

        const beatsReturn = best.last.returnRate > buyHold.returnRate;
        const beatsDrawdown = best.last.maxDrawdown < buyHold.maxDrawdown;
        console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} best=${best.last.returnRate.toFixed(1)}%/dd${best.last.maxDrawdown.toFixed(1)}% vs buyHold=${buyHold.returnRate.toFixed(1)}%/dd${buyHold.maxDrawdown.toFixed(1)}% beatsReturn=${beatsReturn} beatsDrawdown=${beatsDrawdown}`);

        const attemptAnnualized = annualizedReturnRate(best.last.returnRate, trainRows.length);
        if (attemptAnnualized !== null && (bestAnnualizedReturn === null || attemptAnnualized > bestAnnualizedReturn)) {
          bestAnnualizedReturn = attemptAnnualized;
          bestAnnualizedSymbol = symbolEntry.code;
          bestAnnualizedStrategyType = model.strategyType;
        }

        writeProgress({
          currentReason: `${model.strategyType}：回测 ${best.last.returnRate.toFixed(1)}%/回撤${best.last.maxDrawdown.toFixed(1)}%，买入持有 ${buyHold.returnRate.toFixed(1)}%/回撤${buyHold.maxDrawdown.toFixed(1)}% → ${beatsReturn && beatsDrawdown ? "跑赢，候选" : "未跑赢"}`,
          bestAnnualizedReturn, bestAnnualizedSymbol, bestAnnualizedStrategyType,
        });

        if (beatsReturn && beatsDrawdown && (!bestQualifying || best.score > bestQualifying.best.score)) {
          bestQualifying = { model, best };
        }
      }

      if (bestQualifying) {
        const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const name = `ai_auto_${symbolEntry.code}_${dateSlug}`;
        // Label carries the symbol code and the annualized return so it's immediately
        // scannable in a list of many saved models without opening each one — falls back to
        // the raw (non-annualized) return if there isn't enough history to annualize from.
        const savedAnnualized = annualizedReturnRate(bestQualifying.best.last.returnRate, trainRows.length);
        const returnLabel = savedAnnualized !== null
          ? `${savedAnnualized >= 0 ? "+" : ""}${savedAnnualized.toFixed(1)}%年化`
          : `${bestQualifying.best.last.returnRate.toFixed(1)}%`;
        const label = `AI自动·${symbolEntry.code}·${returnLabel}·${dateSlug}`;
        // This candidate never touches strategy_presets — it only ever lives in
        // optimization_scan_results (see that file's header comment). presetId here is just an
        // internal candidate-pool key, not a real strategy_presets.id; a human promotes it into
        // a real model via the admin panel's "另存为" button when they decide it's worth keeping.
        const presetId = name;

        // Out-of-sample: run the EXACT winning config (unchanged) against EACH validation year
        // separately, which neither the AI nor the parameter search ever saw — then record both
        // years' annualized returns into the SAME results table run-optimization-scan.js writes,
        // so this model is rankable by "train/test consistency" the same way as any other. Scored
        // against the FULL history (not just the window's own rows) so rolling-window indicators
        // have real warmup data instead of being starved by a test window shorter than their own
        // lookback — see engine.js's buildScoredBacktestStates comment for why this matters.
        const scoredYear1 = engine.buildScoredBacktestStates(
          allRows, bestQualifying.best.config, testWindows[0].startDate, testWindows[0].endDate,
        );
        const scoredYear2 = engine.buildScoredBacktestStates(
          allRows, bestQualifying.best.config, testWindows[1].startDate, testWindows[1].endDate,
        );
        const trainAnnualizedReturn = savedAnnualized || 0;
        const testYear1AnnualizedReturn = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
        const testYear2AnnualizedReturn = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;
        const annualizedDiffYear1 = Math.abs(testYear1AnnualizedReturn - trainAnnualizedReturn);
        const annualizedDiffYear2 = Math.abs(testYear2AnnualizedReturn - trainAnnualizedReturn);

        await saveOptimizationResult(pool, {
          symbol: symbolEntry.code,
          market: dbMarket,
          symbolName: symbolEntry.name,
          presetId,
          presetLabel: label,
          strategyType: bestQualifying.model.strategyType,
          rowsTested: trainRows.length,
          baselineReturnRate: 0,
          baselineMaxDrawdown: 0,
          bestReturnRate: bestQualifying.best.last.returnRate,
          bestMaxDrawdown: bestQualifying.best.last.maxDrawdown,
          bestScore: bestQualifying.best.score,
          bestTrades: bestQualifying.best.last.trades.length,
          testedCandidates: bestQualifying.best.testedCandidates,
          bestConfig: bestQualifying.best.config,
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
          source: "auto-generate",
          modelReason: bestQualifying.model.reason || "",
        });

        console.log(`[saved] ${symbolEntry.code}: ${presetId} (${label}, best of ${previousAttempts.length} attempts, strategyType=${bestQualifying.model.strategyType}, train=${trainAnnualizedReturn.toFixed(1)}%年化 testYear1=${testYear1AnnualizedReturn.toFixed(1)}%年化 testYear2=${testYear2AnnualizedReturn.toFixed(1)}%年化 diff1=${annualizedDiffYear1.toFixed(1)} diff2=${annualizedDiffYear2.toFixed(1)})`);
        saved += 1;
        writeProgress({ saved, currentReason: `已保存：${label}（${bestQualifying.model.strategyType}）` });
      } else if (attemptedAny) {
        console.log(`[rejected] ${symbolEntry.code}: none of ${previousAttempts.length} attempts beat buy-hold on both return and drawdown`);
        rejected += 1;
        writeProgress({ rejected, currentReason: `${previousAttempts.length} 次尝试都没有跑赢买入持有，未保存` });
      }
    } catch (error) {
      console.error(`[error] ${symbolEntry.code}: ${error.message}`);
      errored += 1;
      writeProgress({ errored });
    }
  }

  const bestSummary = bestAnnualizedReturn !== null
    ? `，测试过的最好年化回报率 ${bestAnnualizedReturn.toFixed(1)}%（${bestAnnualizedSymbol}，${bestAnnualizedStrategyType}）`
    : "";
  console.log(`\ndone. aiCalls=${aiCalls} saved=${saved} rejected(didn't beat buy-hold)=${rejected} skipped(insufficient data)=${dataSkipped} errored=${errored}${bestSummary}`);
  writeProgress({
    status: "done",
    currentSymbol: null,
    currentStrategyType: null,
    currentReason: `完成：共处理 ${symbolIndex}/${symbols.length} 只股票，AI调用${aiCalls}次，保存${saved}个，未跑赢${rejected}个，数据不足跳过${dataSkipped}个，出错${errored}个${bestSummary}。`,
    bestAnnualizedReturn, bestAnnualizedSymbol, bestAnnualizedStrategyType,
  });
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
