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
const { annualizedUpsideDeviation } = require("../shared/volatility.js");
const { splitTrainTestWindows, shiftYears, toIsoDate } = require("../shared/train-test-window.js");
const { ensureResultsTable, saveOptimizationResult, fetchPriorSuccessfulModels } = require("../shared/optimization-results.js");

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
// New gate (on top of TARGET_PERCENT): a model's annualized return for a given year must ALSO
// clear this fraction of that SAME STOCK's own annualized upside deviation for that year — see
// scripts/shared/volatility.js's header comment for why this is a volatility-scaled bar rather
// than a flat one. Applies to every individual training year AND to each validation year
// separately (never a blended average) — same "no single good year can carry a bad one"
// philosophy as TARGET_PERCENT already uses across the two validation years.
const UPSIDE_THRESHOLD_PERCENT = Math.max(0, getArg("upsideThresholdPercent", 30));
// A year-slice this thin makes both the return and the upside-deviation numbers mostly noise
// (see the real cases surfaced by manual analysis this session — some symbols' first nominal
// training year had well under 30 rows of actual price history). Below this row count the gate
// is skipped for that specific year (treated as unevaluable, not as a pass or a fail) rather than
// let a handful of days decide whether an otherwise-solid model gets thrown out.
const MIN_UPSIDE_GATE_ROWS = 30;
// Per-year drawdown gate tolerance: a model's max drawdown in a given year must be smaller than
// buy-hold's OWN drawdown in that same year, scaled up by this percentage — e.g. 5 means the
// model may draw down up to buy-hold's drawdown × 1.05. Proportional rather than a flat
// percentage-point margin, so a stock with a small buy-hold drawdown (little room to begin with)
// isn't given the same absolute slack as one with a large buy-hold drawdown.
const DRAWDOWN_TOLERANCE_PERCENT = Math.max(0, getArg("drawdownTolerancePercent", 5));
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
      open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.volume),
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

// Model's annualized return AND max drawdown for one arbitrary [windowStart, windowEnd) slice of
// a CONTINUOUS states array (see engine.js's buildBacktestStates) — finds the account's equity
// the day before windowStart as the baseline (falling back to the very first state if the window
// starts at or before the data begins) and the equity at the last day inside the window as the
// endpoint, exactly the same baseline/endpoint convention run-watch-alerts.js's
// deriveAccountStatsSinceDate uses for a live paper account. The drawdown's peak is reset to that
// SAME baseline equity (not carried over from before the window), so it measures this window's
// own peak-to-trough, not a drawdown that happened to already be underway when the window opened
// — the same semantics engine.js's buildScoredBacktestStates already uses for validation years.
// Returns null when the window has no rows in this states array at all (can't evaluate, not "0%
// return / 0% drawdown").
function computeWindowStats(states, windowStart, windowEnd) {
  let baselineIndex = -1;
  let endIndex = -1;
  for (let i = 0; i < states.length; i += 1) {
    const date = states[i].row.date;
    if (date < windowStart) baselineIndex = i;
    if (date < windowEnd) endIndex = i;
  }
  if (endIndex < 0) return null;
  const baselineEquity = baselineIndex >= 0 ? states[baselineIndex].equity : states[0].equity;
  const rowsInWindow = endIndex - baselineIndex;
  if (rowsInWindow <= 0 || !(baselineEquity > 0)) return null;
  const returnPct = ((states[endIndex].equity - baselineEquity) / baselineEquity) * 100;

  let peak = baselineEquity;
  let maxDrawdown = 0;
  for (let i = baselineIndex + 1; i <= endIndex; i += 1) {
    const equity = states[i].equity;
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return { ann: annualizedReturnRate(returnPct, rowsInWindow), maxDrawdown };
}

// Splits the training window into TRAIN_YEARS sequential 1-year [start, end) slices (anchored on
// trainStartDate, same convention testWindows already uses relative to "today") and precomputes
// each slice's own annualized upside deviation from the raw price history — done once per symbol
// since it only depends on price data, not on any particular AI attempt's config.
function buildTrainYearWindows(allRows, trainStartDate, trainYears) {
  const windows = [];
  for (let y = 0; y < trainYears; y += 1) {
    const start = toIsoDate(shiftYears(new Date(trainStartDate), y));
    const end = toIsoDate(shiftYears(new Date(trainStartDate), y + 1));
    const yearRows = allRows.filter((row) => row.date >= start && row.date < end);
    const upsideDev = yearRows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(yearRows) : null;
    windows.push({ start, end, upsideDev });
  }
  return windows;
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
  console.log(`targetPercent=${TARGET_PERCENT}% upsideThresholdPercent=${UPSIDE_THRESHOLD_PERCENT}% drawdownTolerancePercent=${DRAWDOWN_TOLERANCE_PERCENT}% attemptsPerSymbol=${ATTEMPTS_PER_SYMBOL} maxAttempts=${MAX_ATTEMPTS} candidates=${CANDIDATES_PER_SYMBOL} pointCount=${POINT_COUNT} trainYears=${TRAIN_YEARS} testYears=${TEST_YEARS} save=${SHOULD_SAVE} symbols=${symbols.map((s) => s.code).join(",")}`);

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

      // Upside-deviation gate inputs — computed once per symbol from raw price data, reused by
      // every AI attempt below (see UPSIDE_THRESHOLD_PERCENT's doc comment).
      const trainYearWindows = buildTrainYearWindows(allRows, trainStartDate, TRAIN_YEARS);
      const testUpsideDev = testWindows.map((win) => {
        const winRows = allRows.filter((row) => row.date >= win.startDate && row.date < win.endDate);
        return winRows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(winRows) : null;
      });
      console.log(`[${symbolEntry.code}] upside deviation — train years: ${trainYearWindows.map((w) => w.upsideDev === null ? "N/A" : `${w.upsideDev.toFixed(1)}%`).join("/")}; test years: ${testUpsideDev.map((v) => v === null ? "N/A" : `${v.toFixed(1)}%`).join("/")}`);

      // Per-year drawdown gate inputs — buy-hold's OWN max drawdown within each year, computed
      // once per symbol (doesn't depend on any attempt's config). Train years reuse the SAME
      // continuous buyHoldStates array already built above, sliced with the same
      // reset-peak-at-window-baseline convention computeWindowStats uses for the model side —
      // train years and test years use consistent semantics for what "this year's drawdown"
      // means. Test years get a fresh, dedicated buy-hold run scoped to just that window (not a
      // slice of buyHoldStates, which only spans the training window).
      const trainYearBuyHoldDD = trainYearWindows.map((win) => {
        const stats = computeWindowStats(buyHoldStates, win.start, win.end);
        return stats ? stats.maxDrawdown : null;
      });
      const testBuyHoldDD = testWindows.map((win) => {
        const winRows = allRows.filter((row) => row.date >= win.startDate && row.date < win.endDate);
        if (winRows.length === 0) return null;
        const states = engine.buildBuyHoldStates(winRows, INITIAL_CASH, TRADE_FEE);
        return states[states.length - 1].maxDrawdown;
      });
      console.log(`[${symbolEntry.code}] buy-hold drawdown — train years: ${trainYearBuyHoldDD.map((v) => v === null ? "N/A" : `${v.toFixed(1)}%`).join("/")}; test years: ${testBuyHoldDD.map((v) => v === null ? "N/A" : `${v.toFixed(1)}%`).join("/")}`);

      const previousAttempts = [];
      const qualifyingAttempts = []; // { model, best, trainAnnualized } — every attempt that beat buy-hold on TRAIN

      // Phase 1: run the FULL requested attempt budget against TRAIN data only, collecting
      // every attempt that beats buy-hold — no early exit once one candidate looks good, and
      // no test-period evaluation yet (keeps this phase strictly train-only).
      for (let attempt = 0; attempt < ATTEMPTS_PER_SYMBOL; attempt += 1) {
        if (aiCalls >= MAX_ATTEMPTS) {
          console.log(`[budget] reached --maxAttempts=${MAX_ATTEMPTS} AI calls total, stopping entirely`);
          break;
        }

        // A/B test: does showing the AI a few other symbols' already-validated models (as
        // idea-level few-shot context, never raw thresholds — see model-generator.js's doc
        // comment) actually lift the train-phase qualify rate over blind generation from just
        // this symbol's own data profile? Each attempt independently coin-flips which arm it's
        // in, and usedPriorExamples travels with the attempt all the way to the saved row
        // (used_prior_examples column) so the two arms' reached_target rates can be compared
        // later instead of guessing. excludeSymbol/excludeMarket keeps this symbol's own
        // history out of its own few-shot examples (that would leak its own test-period result).
        const usedPriorExamples = Math.random() < 0.5;
        const priorSuccessfulModels = usedPriorExamples
          ? await fetchPriorSuccessfulModels(pool, { excludeSymbol: symbolEntry.code, excludeMarket: dbMarket, limit: 8 })
          : [];

        writeProgress({ attempt: attempt + 1, currentReason: `AI 正在分析数据、设计模型…${usedPriorExamples ? "（参考了其他股票的历史达标模型）" : ""}` });
        aiCalls += 1;
        let model;
        try {
          model = await ModelGenerator.generateModelFromDataProfile(profile, symbolEntry.code, previousAttempts, priorSuccessfulModels);
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

        // Upside-deviation AND per-year-drawdown gates: re-run this exact config as one
        // continuous backtest over the full training window (best.last only carries the FINAL
        // day's state, not the day-by-day states this per-year slicing needs) and require EVERY
        // individual training year — not just the 4-year aggregate beatsReturn/beatsDrawdown
        // check above — to (a) clear UPSIDE_THRESHOLD_PERCENT of that year's own upside deviation
        // and (b) have a smaller max drawdown than buy-hold's OWN drawdown in that same year. A
        // year with too little price history to evaluate (upsideDev/buy-hold-DD === null) is
        // skipped, not treated as a pass or a fail.
        const trainStates = engine.buildBacktestStates(trainRows, best.config);
        const failingTrainYears = [];
        const failingTrainDrawdownYears = [];
        trainYearWindows.forEach((win, i) => {
          const stats = computeWindowStats(trainStates, win.start, win.end);
          if (!stats) return;
          if (win.upsideDev !== null) {
            const required = (UPSIDE_THRESHOLD_PERCENT / 100) * win.upsideDev;
            if (!(stats.ann >= required)) {
              failingTrainYears.push(`${win.start}~${win.end}: ${stats.ann.toFixed(1)}%<${required.toFixed(1)}%`);
            }
          }
          const buyHoldDD = trainYearBuyHoldDD[i];
          if (buyHoldDD !== null) {
            const allowedDD = buyHoldDD * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);
            if (!(stats.maxDrawdown < allowedDD)) {
              failingTrainDrawdownYears.push(`${win.start}~${win.end}: 回撤${stats.maxDrawdown.toFixed(1)}%>=买入持有${buyHoldDD.toFixed(1)}%×${(1 + DRAWDOWN_TOLERANCE_PERCENT / 100).toFixed(2)}=${allowedDD.toFixed(1)}%`);
            }
          }
        });
        const passesTrainUpsideGate = failingTrainYears.length === 0;
        const passesTrainDrawdownGate = failingTrainDrawdownYears.length === 0;

        if (!beatsReturn || !beatsDrawdown) {
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [examples:${usedPriorExamples ? "on" : "off"}] train=${best.last.returnRate.toFixed(1)}% — didn't beat buy-hold, skipping`);
          continue;
        }
        if (!passesTrainUpsideGate) {
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [examples:${usedPriorExamples ? "on" : "off"}] beat buy-hold overall but missed the upside-deviation gate in: ${failingTrainYears.join("; ")} — skipping`);
          continue;
        }
        if (!passesTrainDrawdownGate) {
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [examples:${usedPriorExamples ? "on" : "off"}] beat buy-hold overall but missed the per-year drawdown gate in: ${failingTrainDrawdownYears.join("; ")} — skipping`);
          continue;
        }

        const trainAnnualized = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
        qualifyingAttempts.push({ model, best, trainAnnualized, usedPriorExamples });
        console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [examples:${usedPriorExamples ? "on" : "off"}] train=${trainAnnualized.toFixed(1)}%年化 — beat buy-hold, queued for validation (${qualifyingAttempts.length} so far)`);
        writeProgress({
          aiCalls,
          currentReason: `训练阶段第${attempt + 1}/${ATTEMPTS_PER_SYMBOL}次：${model.strategyType} 跑赢买入持有，已收集${qualifyingAttempts.length}个候选（训练阶段跑完后统一验证）`,
        });
      }

      // Phase 2: NOW validate every train-qualifying candidate against both validation years
      // (reset-account scoring, see engine.js's buildScoredBacktestStates) — every candidate
      // gets checked, not just whichever happened to be found first or scored best on train.
      console.log(`[${symbolEntry.code}] train phase done: ${qualifyingAttempts.length} candidate(s) beat buy-hold, validating each against both test years...`);
      const validated = qualifyingAttempts.map(({ model, best, trainAnnualized, usedPriorExamples }, i) => {
        const scoredYear1 = engine.buildScoredBacktestStates(allRows, best.config, testWindows[0].startDate, testWindows[0].endDate);
        const scoredYear2 = engine.buildScoredBacktestStates(allRows, best.config, testWindows[1].startDate, testWindows[1].endDate);
        const year1Annualized = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
        const year2Annualized = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;
        const worstTestAnnualized = Math.min(year1Annualized, year2Annualized);
        // Same upside-deviation gate as the training phase, applied to each validation year
        // separately (never averaged) — a year whose upsideDev couldn't be computed
        // (testUpsideDev[n] === null, too little price history) is treated as passing, same as
        // the training-year gate does.
        const passesUpsideYear1 = testUpsideDev[0] === null || year1Annualized >= (UPSIDE_THRESHOLD_PERCENT / 100) * testUpsideDev[0];
        const passesUpsideYear2 = testUpsideDev[1] === null || year2Annualized >= (UPSIDE_THRESHOLD_PERCENT / 100) * testUpsideDev[1];
        // Per-year drawdown gate, validation side: this validation year's own max drawdown
        // (scoredYearN.maxDrawdown, reset at the window's own start — same semantics as
        // testBuyHoldDD's dedicated buy-hold run for that window) must be smaller than buy-hold's
        // own drawdown in that SAME window. A window whose buy-hold drawdown couldn't be computed
        // is treated as passing.
        const passesDrawdownYear1 = testBuyHoldDD[0] === null || scoredYear1.maxDrawdown < testBuyHoldDD[0] * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);
        const passesDrawdownYear2 = testBuyHoldDD[1] === null || scoredYear2.maxDrawdown < testBuyHoldDD[1] * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);
        const reachedTarget = year1Annualized >= TARGET_PERCENT && year2Annualized >= TARGET_PERCENT
          && passesUpsideYear1 && passesUpsideYear2 && passesDrawdownYear1 && passesDrawdownYear2;
        console.log(`[${symbolEntry.code}] validate ${i + 1}/${qualifyingAttempts.length} (${model.strategyType}) [examples:${usedPriorExamples ? "on" : "off"}]: train=${trainAnnualized.toFixed(1)}%年化 year1=${year1Annualized.toFixed(1)}%年化${passesUpsideYear1 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear1 ? "" : "(回撤未小于买入持有)"} year2=${year2Annualized.toFixed(1)}%年化${passesUpsideYear2 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear2 ? "" : "(回撤未小于买入持有)"}${reachedTarget ? " — TARGET MET" : ""}`);
        writeProgress({ currentReason: `验证阶段第${i + 1}/${qualifyingAttempts.length}个候选：${model.strategyType} 验证第1年${year1Annualized.toFixed(1)}%年化 / 第2年${year2Annualized.toFixed(1)}%年化` });
        return { model, best, trainAnnualized, year1Annualized, year2Annualized, worstTestAnnualized, scoredYear1, scoredYear2, reachedTarget, usedPriorExamples };
      });

      const passing = validated.filter((v) => v.reachedTarget);
      if (validated.length > 0) {
        const topByWorst = validated.reduce((a, b) => (b.worstTestAnnualized > a.worstTestAnnualized ? b : a), validated[0]);
        if (bestAnnualizedReturn === null || topByWorst.worstTestAnnualized > bestAnnualizedReturn) {
          bestAnnualizedReturn = topByWorst.worstTestAnnualized;
          bestAnnualizedSymbol = symbolEntry.code;
        }
      }

      // Every candidate that reached target gets saved (not just one "best" pick). If NONE
      // reached target, fall back to saving just the single best-by-worst-year attempt (as
      // before) so "继续寻找" progress tracking still shows how close this symbol got.
      const toSave = passing.length > 0
        ? passing
        : (validated.length > 0
          ? [validated.reduce((a, b) => (b.worstTestAnnualized > a.worstTestAnnualized ? b : a), validated[0])]
          : []);
      toSave.forEach((entry) => results.push({ symbol: symbolEntry.code, ...entry }));

      if (toSave.length > 0) {
        console.log(`[${symbolEntry.code}] ${passing.length}/${validated.length} candidate(s) reached target; saving ${toSave.length}`);
        if (SHOULD_SAVE) {
          for (let i = 0; i < toSave.length; i += 1) {
            const entry = toSave[i];
            const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const name = `ai_validated_${symbolEntry.code}_${dateSlug}_${i + 1}`;
            const label = entry.reachedTarget
              ? `AI验证达标·${symbolEntry.code}·第1年+${entry.year1Annualized.toFixed(1)}%·第2年+${entry.year2Annualized.toFixed(1)}%·${dateSlug}`
              : `AI搜索中·${symbolEntry.code}·当前最差年份+${entry.worstTestAnnualized.toFixed(1)}%年化·${dateSlug}`;
            // This candidate never touches strategy_presets — it only ever lives in
            // optimization_scan_results (see that file's header comment). presetId is just an
            // internal candidate-pool key, not a real strategy_presets.id; a human promotes it
            // into a real model via the admin panel's "另存为" button when it's worth keeping.
            const presetId = name;
            await saveOptimizationResult(pool, {
              symbol: symbolEntry.code,
              market: dbMarket,
              symbolName: symbolEntry.name,
              presetId,
              presetLabel: label,
              strategyType: entry.model.strategyType,
              rowsTested: trainRows.length,
              baselineReturnRate: 0,
              baselineMaxDrawdown: 0,
              bestReturnRate: entry.best.last.returnRate,
              bestMaxDrawdown: entry.best.last.maxDrawdown,
              bestScore: entry.best.score,
              bestTrades: entry.best.last.trades.length,
              testedCandidates: entry.best.testedCandidates,
              bestConfig: entry.best.config,
              buyHoldReturnRate: buyHold.returnRate,
              buyHoldMaxDrawdown: buyHold.maxDrawdown,
              trainAnnualizedReturn: entry.trainAnnualized,
              testYear1ReturnRate: entry.scoredYear1.returnRate,
              testYear1MaxDrawdown: entry.scoredYear1.maxDrawdown,
              testYear1AnnualizedReturn: entry.year1Annualized,
              testYear1Trades: entry.scoredYear1.trades.length,
              testYear1RowsTested: entry.scoredYear1.rowsScored,
              testYear1StartDate: testWindows[0].startDate,
              testYear1EndDate: testWindows[0].endDate,
              testYear2ReturnRate: entry.scoredYear2.returnRate,
              testYear2MaxDrawdown: entry.scoredYear2.maxDrawdown,
              testYear2AnnualizedReturn: entry.year2Annualized,
              testYear2Trades: entry.scoredYear2.trades.length,
              testYear2RowsTested: entry.scoredYear2.rowsScored,
              testYear2StartDate: testWindows[1].startDate,
              testYear2EndDate: testWindows[1].endDate,
              annualizedDiffYear1: Math.abs(entry.year1Annualized - entry.trainAnnualized),
              annualizedDiffYear2: Math.abs(entry.year2Annualized - entry.trainAnnualized),
              trainStartDate,
              trainEndDate,
              reachedTarget: entry.reachedTarget,
              source: "validated-search",
              modelReason: entry.model.reason || "",
              usedPriorExamples: entry.usedPriorExamples,
            });
            saved += 1;
            console.log(`[saved] ${symbolEntry.code}: ${presetId} ${entry.reachedTarget ? "(TARGET MET)" : "(best-so-far, below target)"}`);
          }
          writeProgress({ saved, currentReason: `${symbolEntry.code}：已保存 ${toSave.length} 个模型（其中 ${passing.length} 个达标）` });
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
