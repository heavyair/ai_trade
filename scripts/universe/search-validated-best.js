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
const { evaluateBuySampleGate, describeBuySampleGate } = require("../shared/buy-sample-gate.js");
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
// 收益兜底线（原来是主门槛，现已降级——见 MIN_EXPECTANCY_PERCENT 的注释）。实测有每笔边际
// 优势的模型年化自然就上去了：新标准下 90 条的较差年年化中位数 74%，加 20% 底线只砍掉 3 条，
// 所以这里只是挡掉"边际优势真实但绝对收益太低、不值得占用资金"的极端情况。
const TARGET_PERCENT = getArg("targetPercent", 20);
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
// 达标的首要门槛：每笔的边际优势，而不是年化。年化是账户层面的复利结果，会被仓位大小放大，
// 也无法区分"每笔都有优势"和"碰巧几笔大的赚回来"。实测 706 条候选里，按老标准达标的 280 条
// 中有 66% 经不起每笔边际检验，同时有 26 条有真实边际优势的因为年化没到 50% 被误杀。
// 阈值是拿真实数据试出来的：(10单/1.5%/1.2) 全池出 90 条，比原来的 280 条严格但不枯竭。
// 样本量按"整段历史合计 + 每年不断档"判，理由见 shared/buy-sample-gate.js。
const MIN_TOTAL_CLOSED_BUYS = Math.max(0, Math.round(getArg("minTotalClosedBuys", 10)));
const MIN_CLOSED_BUYS_PER_YEAR = Math.max(0, Math.round(getArg("minClosedBuysPerYear", 2)));
const MIN_EXPECTANCY_PERCENT = getArg("minExpectancyPct", 1.5);
const MIN_PAYOFF_RATIO = getArg("minPayoffRatio", 1.2);
// 训练阶段的早退门槛：跑赢买入持有之后、进入验证阶段之前，先用训练期自身的每笔统计筛一道。
// 目的是别把验证算力（每个候选要跑两年重置账户回测再入库）花在肯定没用的候选上。
//
// 训练期用的是跟验证期同一套达标标准（MIN_PAYOFF_RATIO / MIN_EXPECTANCY_PERCENT），但盈亏比
// 和期望是"或"的关系，另外单独设一条防退化底线。理由是实测出来的：把验证期的盈亏比 1.2 硬搬
// 到训练期，多砍 6.6% 的候选却要误杀 85 个达标模型里的 8 个，而这 8 个并不是垃圾——它们训练期
// 有 38~183 笔平仓、期望普遍在 1.8% 以上，只是靠高胜率(54~76%)而不是靠大赢单赚钱，盈亏比自然
// 贴着 1。最极端的 688003 训练期盈亏比只有 0.87，但胜率 76%、每买单期望 7.96%，到了验证期盈亏比
// 反而涨到 2.13、年化 84%。
//
// 根本原因是盈亏比单独用会误判交易风格：它只回答"赢一次比输一次大多少"，不回答"总的是不是
// 赚"。高胜率小赢单和低胜率大赢单是两种都成立的赚钱方式，期望值才是把两者合并的那个量。验证期
// 之所以能用盈亏比 1.2 硬卡，是因为那里同时还卡了期望 ≥1.5%，两道一起才成立；训练期只搬盈亏比
// 一条过来就是单腿站立。所以这里改成"盈亏比达标 或 期望达标"，再用 MIN_TRAIN_PAYOFF_FLOOR
// 兜住真正畸形的"小赢大亏"结构。实测这个组合砍掉 31.9%（比单用盈亏比≥1 的 30.3% 更严），
// 误杀 3/85。
const MIN_TRAIN_CLOSED_BUYS = Math.max(0, Math.round(getArg("minTrainClosedBuys", 10)));
const MIN_TRAIN_PAYOFF_FLOOR = getArg("minTrainPayoffFloor", 0.85);
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
  // Buy-hold states (engine.buildBuyHoldStates) carry no .trades array at all — this function is
  // also called against those (for the per-year buy-hold drawdown reference), so treat a missing
  // .trades as 0 rather than crashing, same as a real backtest state with no trades yet.
  const baselineTrades = baselineIndex >= 0 && states[baselineIndex].trades ? states[baselineIndex].trades.length : 0;
  const trades = (states[endIndex].trades ? states[endIndex].trades.length : 0) - baselineTrades;

  let peak = baselineEquity;
  let maxDrawdown = 0;
  for (let i = baselineIndex + 1; i <= endIndex; i += 1) {
    const equity = states[i].equity;
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return { ann: annualizedReturnRate(returnPct, rowsInWindow), returnRate: returnPct, maxDrawdown, trades, rows: rowsInWindow };
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
  console.log(`minExpectancyPct=${MIN_EXPECTANCY_PERCENT}% minPayoffRatio=${MIN_PAYOFF_RATIO} minTotalClosedBuys=${MIN_TOTAL_CLOSED_BUYS} minClosedBuysPerYear=${MIN_CLOSED_BUYS_PER_YEAR} minTrainClosedBuys=${MIN_TRAIN_CLOSED_BUYS} minTrainPayoffFloor=${MIN_TRAIN_PAYOFF_FLOOR} targetPercent=${TARGET_PERCENT}% upsideThresholdPercent=${UPSIDE_THRESHOLD_PERCENT}% drawdownTolerancePercent=${DRAWDOWN_TOLERANCE_PERCENT}% attemptsPerSymbol=${ATTEMPTS_PER_SYMBOL} maxAttempts=${MAX_ATTEMPTS} candidates=${CANDIDATES_PER_SYMBOL} pointCount=${POINT_COUNT} trainYears=${TRAIN_YEARS} testYears=${TEST_YEARS} save=${SHOULD_SAVE} symbols=${symbols.map((s) => s.code).join(",")}`);

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
        const trainYearBreakdown = [];
        trainYearWindows.forEach((win, i) => {
          const stats = computeWindowStats(trainStates, win.start, win.end);
          const buyHoldDD = trainYearBuyHoldDD[i];
          const required = win.upsideDev !== null ? (UPSIDE_THRESHOLD_PERCENT / 100) * win.upsideDev : null;
          const allowedDD = buyHoldDD !== null ? buyHoldDD * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100) : null;
          let passesUpside = true;
          let passesDrawdown = true;
          if (!stats) {
            failingTrainYears.push(`${win.start}~${win.end}: 无法计算训练年化收益`);
            trainYearBreakdown.push({
              start: win.start,
              end: win.end,
              annualizedReturn: null,
              returnRate: null,
              trades: null,
              maxDrawdown: null,
              buyHoldMaxDrawdown: buyHoldDD,
              upsideDeviation: win.upsideDev,
              requiredAnnualizedReturn: required,
              allowedMaxDrawdown: allowedDD,
              passesUpsideGate: false,
              passesDrawdownGate: false,
            });
            return;
          }
          if (win.upsideDev === null || required === null) {
            failingTrainYears.push(`${win.start}~${win.end}: 无法计算上行标准差`);
            passesUpside = false;
          } else if (!(stats.ann >= required)) {
            failingTrainYears.push(`${win.start}~${win.end}: ${stats.ann.toFixed(1)}%<${required.toFixed(1)}%`);
            passesUpside = false;
          }
          if (buyHoldDD === null || allowedDD === null) {
            failingTrainDrawdownYears.push(`${win.start}~${win.end}: 无法计算买入持有回撤`);
            passesDrawdown = false;
          } else if (!(stats.maxDrawdown < allowedDD)) {
            failingTrainDrawdownYears.push(`${win.start}~${win.end}: 回撤${stats.maxDrawdown.toFixed(1)}%>=买入持有${buyHoldDD.toFixed(1)}%×${(1 + DRAWDOWN_TOLERANCE_PERCENT / 100).toFixed(2)}=${allowedDD.toFixed(1)}%`);
            passesDrawdown = false;
          }
          trainYearBreakdown.push({
            start: win.start,
            end: win.end,
            annualizedReturn: stats.ann,
            returnRate: stats.returnRate,
            trades: stats.trades,
            maxDrawdown: stats.maxDrawdown,
            buyHoldMaxDrawdown: buyHoldDD,
            upsideDeviation: win.upsideDev,
            requiredAnnualizedReturn: required,
            allowedMaxDrawdown: allowedDD,
            passesUpsideGate: passesUpside,
            passesDrawdownGate: passesDrawdown,
          });
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

        // 早退：训练期自身的每笔统计就已经说明没有边际优势的，不值得再花两年验证回测。
        // 注意用 best.last.trades（训练期完整成交流水），跟入库时写 train_buy_* 的是同一份数据。
        const trainBuyWin = engine.buildBuyWinStats(best.last.trades);
        const trainPayoff = trainBuyWin.payoffRatio;
        if (trainBuyWin.closedBuys < MIN_TRAIN_CLOSED_BUYS) {
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [examples:${usedPriorExamples ? "on" : "off"}] 跑赢买入持有，但训练期只有 ${trainBuyWin.closedBuys} 个完整平仓买单(<${MIN_TRAIN_CLOSED_BUYS}) — skipping`);
          continue;
        }
        // payoffRatio 为 null 有两种含义：没有已平仓买单（上面那道门已经排除），或者一笔亏损都
        // 没有（avgLoss===0，除法没有意义）。后者是全胜，两道盈亏比检查都应当放行而不是当成
        // "没有盈亏比"淘汰。
        const trainAllWins = trainBuyWin.lossCount === 0;
        const trainExpectancyPct = trainBuyWin.expectancyPct;
        // 底线：畸形的"小赢大亏"结构，无论期望多好看都不放行（期望可能只是被一两笔大赢单撑起来的）。
        const trainPayoffAboveFloor = trainAllWins || (Number.isFinite(trainPayoff) && trainPayoff >= MIN_TRAIN_PAYOFF_FLOOR);
        // 达标：盈亏比够 或 期望够，二选一即可——见上面常量处对两种赚钱风格的说明。
        const trainMeetsStandard = (trainAllWins || (Number.isFinite(trainPayoff) && trainPayoff >= MIN_PAYOFF_RATIO))
          || (Number.isFinite(trainExpectancyPct) && trainExpectancyPct >= MIN_EXPECTANCY_PERCENT);
        if (!trainPayoffAboveFloor || !trainMeetsStandard) {
          const shown = `盈亏比${Number.isFinite(trainPayoff) ? trainPayoff.toFixed(2) : trainAllWins ? "∞(无亏损)" : "无"}·期望${Number.isFinite(trainExpectancyPct) ? `${trainExpectancyPct >= 0 ? "+" : ""}${trainExpectancyPct.toFixed(2)}%` : "无"}`;
          const why = !trainPayoffAboveFloor
            ? `低于盈亏比底线${MIN_TRAIN_PAYOFF_FLOOR}`
            : `盈亏比未达${MIN_PAYOFF_RATIO}且期望未达${MIN_EXPECTANCY_PERCENT}%`;
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [examples:${usedPriorExamples ? "on" : "off"}] 跑赢买入持有，但训练期${shown} — ${why}，skipping`);
          continue;
        }

        const trainAnnualized = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
        qualifyingAttempts.push({
          model, best, trainAnnualized, trainYearBreakdown,
          passesTrainUpsideGate, passesTrainDrawdownGate, usedPriorExamples,
        });
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
      const validated = qualifyingAttempts.map(({ model, best, trainAnnualized, trainYearBreakdown, passesTrainUpsideGate, passesTrainDrawdownGate, usedPriorExamples }, i) => {
        const scoredYear1 = engine.buildScoredBacktestStates(allRows, best.config, testWindows[0].startDate, testWindows[0].endDate);
        const scoredYear2 = engine.buildScoredBacktestStates(allRows, best.config, testWindows[1].startDate, testWindows[1].endDate);
        const year1Annualized = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
        const year2Annualized = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;
        const worstTestAnnualized = Math.min(year1Annualized, year2Annualized);
        // Same upside-deviation gate as the training phase, applied to each validation year
        // separately (never averaged) — a year whose upsideDev couldn't be computed
        // (testUpsideDev[n] === null, too little price history) is treated as passing, same as
        // the training-year gate does.
        const passesUpsideYear1 = testUpsideDev[0] !== null && year1Annualized >= (UPSIDE_THRESHOLD_PERCENT / 100) * testUpsideDev[0];
        const passesUpsideYear2 = testUpsideDev[1] !== null && year2Annualized >= (UPSIDE_THRESHOLD_PERCENT / 100) * testUpsideDev[1];
        // Per-year drawdown gate, validation side: this validation year's own max drawdown
        // (scoredYearN.maxDrawdown, reset at the window's own start — same semantics as
        // testBuyHoldDD's dedicated buy-hold run for that window) must be smaller than buy-hold's
        // own drawdown in that SAME window. A window whose buy-hold drawdown couldn't be computed
        // is treated as passing.
        const passesDrawdownYear1 = testBuyHoldDD[0] !== null && scoredYear1.maxDrawdown < testBuyHoldDD[0] * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);
        const passesDrawdownYear2 = testBuyHoldDD[1] !== null && scoredYear2.maxDrawdown < testBuyHoldDD[1] * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);
        // 每笔边际优势：两个验证年各自独立判定，不取平均——跟整套代码"看最差情况"的原则一致。
        const buyWin1 = engine.buildBuyWinStats(scoredYear1.trades);
        const buyWin2 = engine.buildBuyWinStats(scoredYear2.trades);
        const worstExpectancyPct = Math.min(
          buyWin1.expectancyPct === null ? -Infinity : buyWin1.expectancyPct,
          buyWin2.expectancyPct === null ? -Infinity : buyWin2.expectancyPct
        );
        const worstPayoffRatio = Math.min(
          buyWin1.payoffRatio === null ? Infinity : buyWin1.payoffRatio,
          buyWin2.payoffRatio === null ? Infinity : buyWin2.payoffRatio
        );
        // 样本量按【整段历史】判（训练起点~验证期末）：合计够 + 每年不断档，口径和判定理由
        // 见 shared/buy-sample-gate.js。必须用一次连续回测的成交流水，分段拼接会因为每段
        // 重置账户而把跨年的买单算错。
        // 盈亏比为 null 表示该年没有亏损单（除数为 0），那是好事不是缺陷，上面用 Infinity
        // 让它不卡门槛。
        const fullSpanEnd = testWindows[testWindows.length - 1].endDate;
        const fullSpan = engine.buildScoredBacktestStates(allRows, best.config, trainStartDate, fullSpanEnd);
        const sampleGate = evaluateBuySampleGate(
          engine.buildBuyWinStats(fullSpan.trades).closedLots,
          trainStartDate, fullSpanEnd,
          { minTotal: MIN_TOTAL_CLOSED_BUYS, minPerYear: MIN_CLOSED_BUYS_PER_YEAR }
        );
        const worstClosedBuys = sampleGate.total;
        const passesSample = sampleGate.passes;
        const passesExpectancy = worstExpectancyPct >= MIN_EXPECTANCY_PERCENT;
        const passesPayoff = worstPayoffRatio >= MIN_PAYOFF_RATIO;
        const reachedTarget = passesTrainUpsideGate && passesTrainDrawdownGate
          && passesSample && passesExpectancy && passesPayoff
          && year1Annualized >= TARGET_PERCENT && year2Annualized >= TARGET_PERCENT
          && passesUpsideYear1 && passesUpsideYear2 && passesDrawdownYear1 && passesDrawdownYear2;
        console.log(`[${symbolEntry.code}] validate ${i + 1}/${qualifyingAttempts.length} (${model.strategyType}) [examples:${usedPriorExamples ? "on" : "off"}]: train=${trainAnnualized.toFixed(1)}%年化 year1=${year1Annualized.toFixed(1)}%年化${passesUpsideYear1 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear1 ? "" : "(回撤未小于买入持有)"} year2=${year2Annualized.toFixed(1)}%年化${passesUpsideYear2 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear2 ? "" : "(回撤未小于买入持有)"}${passesSample ? "" : `(样本不足:${describeBuySampleGate(sampleGate)}${sampleGate.passesTotal ? `,第${sampleGate.failingYears.map((y) => y.index).join("/")}年不足${MIN_CLOSED_BUYS_PER_YEAR}单` : `<${MIN_TOTAL_CLOSED_BUYS}单`})`}${passesExpectancy ? "" : `(每买单期望${worstExpectancyPct === -Infinity ? "无" : worstExpectancyPct.toFixed(2) + "%"}<${MIN_EXPECTANCY_PERCENT}%)`}${passesPayoff ? "" : `(盈亏比${worstPayoffRatio === Infinity ? "无" : worstPayoffRatio.toFixed(2)}<${MIN_PAYOFF_RATIO})`}${reachedTarget ? " — TARGET MET" : ""}`);
        writeProgress({ currentReason: `验证阶段第${i + 1}/${qualifyingAttempts.length}个候选：${model.strategyType} 验证第1年${year1Annualized.toFixed(1)}%年化 / 第2年${year2Annualized.toFixed(1)}%年化` });
        return {
          model, best, trainAnnualized, trainYearBreakdown,
          passesTrainUpsideGate, passesTrainDrawdownGate,
          year1Annualized, year2Annualized, worstTestAnnualized,
          scoredYear1, scoredYear2, reachedTarget, usedPriorExamples,
          buyWin1, buyWin2, worstExpectancyPct, worstPayoffRatio, worstClosedBuys,
        };
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
      // 回退选择也改用"最差年每买单期望"而不是最差年年化——否则达标标准换了口径、回退路径
      // 却还在按旧口径挑模型，"继续寻找"的进度会指向错误的方向。
      // 回退保存还要过一道最低体面线。没有这道线时，历史数据里 706 条结果有 3.5% 是两年合计
      // 不到 3 笔、7.1% 是有一整年一个完整平仓买单都没有、0.7% 是较差年年化为负——这些既算不出
      // 胜率/盈亏比/期望，也不可能靠"再找找"变好，留在库里只会把界面的模型列表撑满噪音。
      // 达标模型不受这道线约束（它们已经过了更严的门槛）。
      const worthKeepingAsFallback = (entry) => {
        const totalTrades = (entry.scoredYear1.trades || []).length + (entry.scoredYear2.trades || []).length;
        if (totalTrades < 3) return false;
        if (entry.buyWin1.closedBuys === 0 || entry.buyWin2.closedBuys === 0) return false;
        if (!(entry.worstTestAnnualized > 0)) return false;
        return true;
      };
      const fallbackPool = validated.filter(worthKeepingAsFallback);
      const toSave = passing.length > 0
        ? passing
        : (fallbackPool.length > 0
          ? [fallbackPool.reduce((a, b) => (b.worstExpectancyPct > a.worstExpectancyPct ? b : a), fallbackPool[0])]
          : []);
      if (passing.length === 0 && validated.length > 0 && fallbackPool.length === 0) {
        console.log(`[${symbolEntry.code}] ${validated.length} 个候选全部达不到回退保存的最低线（两年合计≥3笔、每年都要有完整平仓买单、较差年年化>0），本轮不留记录`);
      }
      toSave.forEach((entry) => results.push({ symbol: symbolEntry.code, ...entry }));

      if (toSave.length > 0) {
        console.log(`[${symbolEntry.code}] ${passing.length}/${validated.length} candidate(s) reached target; saving ${toSave.length}`);
        if (SHOULD_SAVE) {
          for (let i = 0; i < toSave.length; i += 1) {
            const entry = toSave[i];
            const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const name = `ai_validated_${symbolEntry.code}_${dateSlug}_${i + 1}`;
            // 模型名里直接带上验证期的胜率/盈亏比——只看年化会挑反：实测里胜率 80%、盈亏比
            // 0.54 的模型，每买单期望还不如胜率 45%、盈亏比 2.63 的。两个验证年合起来统计，
            // 样本太少（<10 单）就不写进名字，免得给出误导性的 100%。
            const labelWin = engine.buildBuyWinStats([
              ...(entry.scoredYear1.trades || []),
              ...(entry.scoredYear2.trades || []),
            ]);
            const winPart = labelWin.winRate !== null && labelWin.closedBuys >= 10
              ? `·胜率${labelWin.winRate.toFixed(0)}%${labelWin.payoffRatio !== null ? `·盈亏比${labelWin.payoffRatio.toFixed(2)}` : ""}${labelWin.expectancyPct !== null ? `·期望${labelWin.expectancyPct >= 0 ? "+" : ""}${labelWin.expectancyPct.toFixed(1)}%` : ""}`
              : "";
            const label = entry.reachedTarget
              ? `AI验证达标·${symbolEntry.code}·第1年+${entry.year1Annualized.toFixed(1)}%·第2年+${entry.year2Annualized.toFixed(1)}%${winPart}·${dateSlug}`
              : `AI搜索中·${symbolEntry.code}·当前最差年份+${entry.worstTestAnnualized.toFixed(1)}%年化${winPart}·${dateSlug}`;
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
              trainBuyWin: engine.buildBuyWinStats(entry.best.last.trades),
              testYear1BuyWin: engine.buildBuyWinStats(entry.scoredYear1.trades),
              testYear2BuyWin: engine.buildBuyWinStats(entry.scoredYear2.trades),
              testYear2RowsTested: entry.scoredYear2.rowsScored,
              testYear2StartDate: testWindows[1].startDate,
              testYear2EndDate: testWindows[1].endDate,
              annualizedDiffYear1: Math.abs(entry.year1Annualized - entry.trainAnnualized),
              annualizedDiffYear2: Math.abs(entry.year2Annualized - entry.trainAnnualized),
              testYear1UpsideDeviation: testUpsideDev[0],
              testYear2UpsideDeviation: testUpsideDev[1],
              trainYearBreakdown: entry.trainYearBreakdown,
              targetPercent: TARGET_PERCENT,
              upsideThresholdPercent: UPSIDE_THRESHOLD_PERCENT,
              drawdownTolerancePercent: DRAWDOWN_TOLERANCE_PERCENT,
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
      console.error(error.stack);
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
