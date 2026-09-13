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
const { buildTrainingFeedback, buildRefinementPrompt, generateStructuralVariants, createSeededRandom } = require("../shared/model-evolution.js");
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
// 允许多少个训练年没过上行波动门槛。
//
// 【实测结论：默认 1】原先是 0（四个训练年必须全部通过），这道门槛因此成为整个搜索的主瓶颈，
// 而且它拒绝掉的恰恰是最终能达标的那批模型。五条证据互相印证：
//
// 1. 归因：4 标的 × 12 轮的搜索里，31 次尝试有 28 次(90%)死在这道门槛上；跑输买入持有 0 次、
//    回撤门槛 0 次、买单指标门槛 0 次——预算几乎全耗在这一道上。
// 2. 预测力：把 272 条已保存结果按"最勉强的那个训练年超过门槛的倍数"分箱，刚好过线(1~1.5倍)
//    的验证达标率 52.0%，远超门槛(4~8倍)的只有 40.0%。倍数越高达标率并不越高，甚至略微反向
//    ——与"训练期期望过高反而预示过拟合"是同一个规律。
// 3. 吞吐：同一批标的、同样的 AI 调用数，容忍 0 年时只有 2 个候选进入验证，容忍 1 年有 19 个。
// 4. 归属（最关键，同一次运行内部分组，不受标的难易干扰）：10 标的 × 12 轮共 110 次尝试，
//    23 个候选进入验证——其中"本来就能通过严格门槛"的只有 2 个且 0 个达标，"只因放宽才进来"
//    的有 21 个、达标 3 个(14.3%)。三个达标模型全部来自现行门槛会拒绝的区域。
// 5. 边界：容忍 2 年不再增益（28 个进入验证、0 个达标），所以不是越松越好，1 是拐点。
//
// 放宽的代价只是更多候选进入验证阶段（两次回测 + 一次入库），而验证期的达标标准完全没动
// ——期望≥1.5%、盈亏比≥1.2、样本量、年化门槛全部照旧，所以"达标"的含义没有被稀释。
// 实测验证阶段的主要淘汰原因是"每买单期望不足"(47 条记录里 42 条)，质量关口仍然有效。
const MAX_FAILING_TRAIN_YEARS = Math.max(0, Math.round(getArg("maxFailingTrainYears", 1)));
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
const MIN_CLOSED_BUYS_PER_YEAR = Math.max(0, Math.round(getArg("minClosedBuysPerYear", 1)));
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
// 结构级改进的预算占比。
//
// 【实测结论：默认 0，即保持纯随机重启】A/B/C 三臂对照（NET+TSLA，每臂 20 轮×2 标的 =
// 120 次 AI 调用，回测上限严格对齐）：
//
//   组                          训练通过  验证达标  训练冠军的较差年年化
//   A 纯随机重启(基线)          7 / 4       1        NET +33.17% / TSLA  +5.71%
//   B 锁定父模型+逐笔诊断改进   3 / 0       0        NET +13.22% / TSLA −37.18%
//   C = B + 程序化结构变异      7 / 1       0        NET  −5.74% / TSLA  +2.26%
//
// 唯一一个验证达标的模型出自基线 A；两个标的的排序一致都是 A > C > B（上一次 3 轮/臂的小跑
// 里两标的排序相反，那才是噪音，40 轮/臂后方向一致了）。
//
// 失败原因很清楚：B 会把父模型长期锁死。NET 的 B 组 20 轮里多轮都在改进同一个
// NET-B-1-0-796e53f7，一旦早期选中的父模型方向不好，后面所有轮次都被锁在这个方向上；
// 而 A 每轮独立重启，20 轮就是 20 次独立机会。TSLA 的 B 组 20 轮一次训练门槛都没过。
// C 好于 B，很可能正是因为结构变异提供了额外多样性，部分抵消了锁死。
//
// 也就是说"缺的是收敛而非随机性"这个判断，前提是"当前最优结构值得深耕"——而父模型是用
// 训练期指标选的，本身就很容易选错。在这个问题上随机重启的探索价值高于围绕单一父模型深耕。
// 功能和开关保留，便于将来改进父模型选择策略后重新评估；要改默认值请先重跑那个实验。
const REFINE_RATIO = Math.max(0, Math.min(1, getArg("refineRatio", 0)));
// 每次尝试额外派生多少个结构变体（0 = 关闭，保持历史行为）。变体不花 AI 调用，但会把参数
// 寻优的预算分摊掉，所以默认先关着，等实测确认收益为正再决定默认值。
const MUTATIONS = Math.max(0, Math.round(getArg("mutations", 0)));
// 画像维度开关，用于对照实验：--profileDims=base 退回只有价格衍生指标的旧画像，
// 默认 full 包含估值/成交量/基本面/微观结构。
const PROFILE_DIMS = getArgString("profileDims") === "base"
  ? { valuation: false, volume: false, fundamentals: false, microstructure: false }
  : {};
// 策略类型轮转表。AI 自由选择时会把 82% 的尝试压在 block-rules 和 score-rules 上，多半是
// 提示词里各类型说明长度悬殊造成的偏好，不是这些策略真的更合适，所以改由轮转表分配名额。
//
// 【实测结论：用 legacy 表，按达标率重排的那版更差】
//
// 曾按"历史达标率"重排过名额（ma-rsi-band 62.5%(n=16)、stagnation-reversal 52.2%(n=23)、
// block-rules 25.4%(n=264)、score-rules 20.5%(n=249)、wave 3.2%(n=62)），把 wave 从 3/12 降到
// 1/12，名额让给前两者。对照实验（8 标的 × 12 轮 × 2 臂，上行门槛已修复因而两臂都能真正跑到
// 验证阶段）结果相反：
//
//   legacy 表：90 次尝试 → 24 个进入验证 → 达标 4（block-rules×3、ma-rsi-band×1）
//   yield  表：88 次尝试 → 34 个进入验证 → 达标 2（stagnation-reversal×1、block-rules×1）
//
// 新表让 ma-rsi-band 的尝试从 7 次涨到 21 次、stagnation-reversal 从 7 次涨到 22 次，产出却没有
// 按比例增加（ma-rsi-band 21 次尝试 0 达标，而 legacy 里 7 次尝试出了 1 个）。
//
// 【根因是那个达标率本身有选择偏差】：它是在【已保存的结果】上统计的，而保存本身是有条件的。
// 极少被生成的类型（ma-rsi-band 只有 16 条、stagnation-reversal 23 条）只有在碰巧不错时才会被
// 保存下来，于是它们的表观达标率被抬得很高；真正强迫搜索把大量尝试投进去，真实比率就现形了。
// block-rules 样本 264 条、达标率 25.4% 才是可信的估计，而它也确实是实际产出的主力
// （两臂 6 个达标模型里 4 个出自 block-rules）。
//
// 教训：在"被结果筛选过的样本"上统计各组的成功率，不能直接当成"给该组更多预算会得到的成功率"。
// 要改名额分配，必须用强制分配的对照实验来定，不能用历史统计反推。
// 两张表都保留，--rotation=yield 可切到被否决的那版以便复现实验。
const STRATEGY_TYPE_ROTATION_BY_YIELD = [
  "ma-rsi-band", "block-rules", "stagnation-reversal", "score-rules",
  "ma-rsi-band", "block-rules", "stagnation-reversal", "local-high-ladder",
  "ma-rsi-band", "block-rules", "stagnation-reversal", "wave",
];
// 上一版（按平均期望排）保留下来做对照，--rotation=legacy 可切回。
const STRATEGY_TYPE_ROTATION_LEGACY = [
  "block-rules", "wave", "order-grid", "block-rules", "stagnation-reversal",
  "wave", "ma-rsi-band", "block-rules", "order-grid", "local-high-ladder",
  "wave", "score-rules",
];
const ROTATION_MODE = getArgString("rotation") || "legacy";
const STRATEGY_TYPE_ROTATION = ROTATION_MODE === "legacy"
  ? STRATEGY_TYPE_ROTATION_LEGACY
  : STRATEGY_TYPE_ROTATION_BY_YIELD;

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
const { computeWindowStats } = require("../shared/backtest-window.js");

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
  console.log(`minExpectancyPct=${MIN_EXPECTANCY_PERCENT}% minPayoffRatio=${MIN_PAYOFF_RATIO} minTotalClosedBuys=${MIN_TOTAL_CLOSED_BUYS} minClosedBuysPerYear=${MIN_CLOSED_BUYS_PER_YEAR} minTrainClosedBuys=${MIN_TRAIN_CLOSED_BUYS} minTrainPayoffFloor=${MIN_TRAIN_PAYOFF_FLOOR} refineRatio=${REFINE_RATIO} mutations=${MUTATIONS} profileDims=${getArgString("profileDims") || "full"} rotation=${ROTATION_MODE} maxFailingTrainYears=${MAX_FAILING_TRAIN_YEARS} targetPercent=${TARGET_PERCENT}% upsideThresholdPercent=${UPSIDE_THRESHOLD_PERCENT}% drawdownTolerancePercent=${DRAWDOWN_TOLERANCE_PERCENT}% attemptsPerSymbol=${ATTEMPTS_PER_SYMBOL} maxAttempts=${MAX_ATTEMPTS} candidates=${CANDIDATES_PER_SYMBOL} pointCount=${POINT_COUNT} trainYears=${TRAIN_YEARS} testYears=${TEST_YEARS} save=${SHOULD_SAVE} symbols=${symbols.map((s) => s.code).join(",")}`);

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

      const profile = ModelGenerator.buildSymbolDataProfile(trainRows, PROFILE_DIMS);
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
      // 当前最好的结构，只用【训练期】指标挑选——验证期数据绝不能参与这个决定，否则后面
      // 拿验证期评估就不再是样本外检验。改进提示词里喂给 AI 的也只有训练期指标。
      let bestStructure = null;

      // Phase 1: run the FULL requested attempt budget against TRAIN data only, collecting
      // every attempt that beats buy-hold — no early exit once one candidate looks good, and
      // no test-period evaluation yet (keeps this phase strictly train-only).
      for (let attempt = 0; attempt < ATTEMPTS_PER_SYMBOL; attempt += 1) {
        if (aiCalls >= MAX_ATTEMPTS) {
          console.log(`[budget] reached --maxAttempts=${MAX_ATTEMPTS} AI calls total, stopping entirely`);
          break;
        }

        // A/B 实验已收口：给 AI 看其他股票的达标模型（few-shot）对产出【没有帮助】。
        // 671 条实测——盲生成组 328 条里 64 条达标(19.5%)、平均较差年每买单期望 7.51%；
        // 参考示例组 343 条里 64 条达标(18.7%)、期望只有 5.36%。达标率没有差别，而期望明显更差，
        // 说明示例在诱导 AI 往"看起来像成功案例"的方向靠，而不是针对当前这只票的特征设计。
        // 保留 used_prior_examples 字段写 false，只是为了不破坏历史数据的可比性。
        const usedPriorExamples = false;
        const priorSuccessfulModels = [];

        // 策略类型轮转：实测 AI 自由选择时会把 82% 的尝试压在 block-rules 和 score-rules 上，
        // 而 score-rules 的平均较差年期望只有 1.59%（全部类型里最差，低于 1.5% 的达标线），
        // 反倒是 wave(19.64%) 和 order-grid(38.60%) 期望极高却几乎不被选中（order-grid 只生成过
        // 2 次）。这更像是提示词里类型描述的长度/顺序造成的偏好，不是这些策略真的更合适。
        // 这里按尝试序号轮转给出一个倾向类型，让采样次数和产出质量对得上；AI 仍可在数据特征
        // 明显不适合时改选别的，所以不会强行套用。
        const suggestedStrategyType = STRATEGY_TYPE_ROTATION[attempt % STRATEGY_TYPE_ROTATION.length];

        // 有可改进的结构时，按 REFINE_RATIO 的比例把这次尝试用于改进而不是探索。
        // 用确定性的取模而不是随机数：同样的参数跑两次得到同样的探索/改进配比，做对照实验时
        // 两个分支才可比。
        const canRefine = bestStructure !== null && REFINE_RATIO > 0;
        // 每 10 次尝试里后 round(ratio*10) 次用于改进，前面的用于探索——把探索排在前面，
        // 是因为一开始还没有可改进的结构，让改进名额落在已经有东西可改的时候。
        const refinePerTen = Math.round(REFINE_RATIO * 10);
        const isRefineAttempt = canRefine && (attempt % 10) >= (10 - refinePerTen);
        writeProgress({ attempt: attempt + 1, currentReason: isRefineAttempt ? "AI 正在改进当前最优模型…" : "AI 正在分析数据、设计模型…" });
        aiCalls += 1;
        let model;
        try {
          model = isRefineAttempt
            ? await ModelGenerator.generateImprovedModel(
              profile, symbolEntry.code, bestStructure.refinementPrompt,
              { strategyType: bestStructure.model.strategyType }
            )
            : await ModelGenerator.generateModelFromDataProfile(
              profile, symbolEntry.code, previousAttempts, priorSuccessfulModels,
              { suggestedStrategyType }
            );
        } catch (aiError) {
          console.error(`[ai-error] ${symbolEntry.code} attempt ${attempt + 1}: ${aiError.message}`);
          errored += 1;
          writeProgress({ aiCalls, errored });
          continue;
        }
        // outcome 在本轮后面的各个淘汰点上回填，供下一次生成时作为改进依据（见
        // model-generator.js 的 diversityLine）。对象先入列再改字段，是为了不必在每个
        // continue 之前都重复一次 push。
        const attemptRecord = { strategyType: model.strategyType, reason: model.reason, outcome: null };
        previousAttempts.push(attemptRecord);
        // 清洗阶段丢掉的东西以前完全不可见（见 model-generator.js 的 droppedSummary 注释）。
        // 既写进日志，也回传给下一轮——"indicator xxx 不存在"这类错误 AI 看到就能自己改对。
        const dropped = model.droppedSummary || [];
        if (dropped.length > 0) {
          console.log(`[cleanup] ${symbolEntry.code} attempt ${attempt + 1}: 生成结果有 ${dropped.length} 处被丢弃/改写 — ${dropped.join("；")}`);
          attemptRecord.dropped = dropped;
        }
        if (!modelHasRules(model)) {
          attemptRecord.outcome = "生成的模型没有任何可用规则";
          console.log(`[empty-model] ${symbolEntry.code} attempt ${attempt + 1}: no usable rules, skipping`);
          continue;
        }

        // 结构变异：在 AI 提案的基础上机械地派生若干结构变体（删规则/删条件/替换成标准过滤
        // 条件/公式 sma↔ema 或窗口缩放/加时间止损/切换 ma-rsi-band 的布尔开关）。这些都是
        // 确定性操作，【不消耗 AI 调用】，只花回测。
        //
        // 关键纪律：参数寻优的预算在 AI 提案和各变体之间【均分】，总回测次数保持不变——
        // 否则这个功能就是靠多花算力换结果，比较起来不公平，也会让单次搜索的耗时悄悄翻几倍。
        const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: model.strategyType };
        const proposals = [{ model, operation: "ai-proposal" }];
        if (MUTATIONS > 0) {
          try {
            proposals.push(...generateStructuralVariants(model, {
              normalize: ModelGenerator.normalizeGeneratedModel,
              random: createSeededRandom(`${symbolEntry.code}:${attempt}`),
              limit: MUTATIONS,
            }));
          } catch (mutationError) {
            console.log(`[mutate-skip] ${symbolEntry.code} attempt ${attempt + 1}: ${mutationError.message}`);
          }
        }
        const budgetPer = Math.max(1, Math.floor(CANDIDATES_PER_SYMBOL / proposals.length));
        let best = null;
        let bestProposal = null;
        for (const proposal of proposals) {
          const candidate = searchBestConfig(
            engine, proposal.model, trainRows,
            { ...baseConfig, strategyType: proposal.model.strategyType }, budgetPer
          );
          if (!candidate) continue;
          if (!best || candidate.score > best.score) {
            best = candidate;
            bestProposal = proposal;
          }
        }
        if (!best) continue;
        // 变体胜出时，后续所有环节（门槛判定、入库、改进的父模型）都必须用变体的模型对象，
        // 否则存下来的结构和实际被回测的配置就对不上了。
        if (bestProposal && bestProposal.operation !== "ai-proposal") {
          console.log(`[mutate] ${symbolEntry.code} attempt ${attempt + 1}: 结构变体胜出（${bestProposal.operation} @ ${bestProposal.path || "-"}）`);
          model = bestProposal.model;
        }

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
          // 算不出上行标准差/买入持有回撤 = 这一年的行情数据太少，无法评估——按本文件
          // MIN_UPSIDE_GATE_ROWS 注释里写明的设计，这种年份应当【跳过】，既不算通过也不算
          // 失败。原来的写法把"无法评估"当成"不达标"，后果很严重：splitTrainTestWindows 按
          // "今天往前 6 年"切训练窗口，并不管这只股票实际有没有那么长的历史，而库里 574 个
          // 标的中有 459 个（80%）的训练第 1 年不足 30 行（美股数据只到 2018 年，很多 A 股是
          // 次新股）。于是这些标的上的每一个 AI 模型都会被这道门无条件否决，而日志看起来
          // 像是"模型不够好"，掩盖了真正的原因。
          if (win.upsideDev === null || required === null) {
            // 不改 passesUpside，保持该年"未参与判定"
          } else if (!(stats.ann >= required)) {
            failingTrainYears.push(`${win.start}~${win.end}: ${stats.ann.toFixed(1)}%<${required.toFixed(1)}%`);
            passesUpside = false;
          }
          if (buyHoldDD === null || allowedDD === null) {
            // 同上：无法评估的年份跳过
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
        const passesTrainUpsideGate = failingTrainYears.length <= MAX_FAILING_TRAIN_YEARS;
        const passesTrainDrawdownGate = failingTrainDrawdownYears.length === 0;

        if (!beatsReturn || !beatsDrawdown) {
          attemptRecord.outcome = `训练期${best.last.returnRate.toFixed(1)}%/回撤${best.last.maxDrawdown.toFixed(1)}%，买入持有${buyHold.returnRate.toFixed(1)}%/回撤${buyHold.maxDrawdown.toFixed(1)}%，${!beatsReturn ? "收益跑输" : "回撤更大"}`;
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [${isRefineAttempt ? "refine" : "explore"}] train=${best.last.returnRate.toFixed(1)}% — didn't beat buy-hold, skipping`);
          continue;
        }
        if (!passesTrainUpsideGate) {
          attemptRecord.outcome = `跑赢买入持有，但有训练年的收益没达到该年自身上行波动的${UPSIDE_THRESHOLD_PERCENT}%（${failingTrainYears.length}个年份不达标）`;
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [${isRefineAttempt ? "refine" : "explore"}] beat buy-hold overall but missed the upside-deviation gate in: ${failingTrainYears.join("; ")} — skipping`);
          continue;
        }
        if (!passesTrainDrawdownGate) {
          attemptRecord.outcome = `跑赢买入持有，但有${failingTrainDrawdownYears.length}个训练年的回撤大于买入持有同期回撤`;
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [${isRefineAttempt ? "refine" : "explore"}] beat buy-hold overall but missed the per-year drawdown gate in: ${failingTrainDrawdownYears.join("; ")} — skipping`);
          continue;
        }

        // 早退：训练期自身的每笔统计就已经说明没有边际优势的，不值得再花两年验证回测。
        // 注意用 best.last.trades（训练期完整成交流水），跟入库时写 train_buy_* 的是同一份数据。
        const trainBuyWin = engine.buildBuyWinStats(best.last.trades);
        const trainPayoff = trainBuyWin.payoffRatio;
        if (trainBuyWin.closedBuys < MIN_TRAIN_CLOSED_BUYS) {
          attemptRecord.outcome = `跑赢买入持有，但训练期只做成${trainBuyWin.closedBuys}笔完整买卖（需要至少${MIN_TRAIN_CLOSED_BUYS}笔），买入条件太苛刻`;
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [${isRefineAttempt ? "refine" : "explore"}] 跑赢买入持有，但训练期只有 ${trainBuyWin.closedBuys} 个完整平仓买单(<${MIN_TRAIN_CLOSED_BUYS}) — skipping`);
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
          attemptRecord.outcome = `跑赢买入持有，但训练期${shown}——${why}`;
          console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [${isRefineAttempt ? "refine" : "explore"}] 跑赢买入持有，但训练期${shown} — ${why}，skipping`);
          continue;
        }

        const trainAnnualized = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
        attemptRecord.outcome = `训练期${trainAnnualized.toFixed(1)}%年化、${trainBuyWin.closedBuys}笔完整买卖，已通过训练阶段进入验证`;
        // 更新"当前最优结构"：以训练期每买单期望为主依据（跟寻优目标函数、跟达标标准同一个
        // 口径——衡量每笔的边际优势，而不是会被仓位放大的账户收益）。
        const structureScore = Number.isFinite(trainBuyWin.expectancyPct) ? trainBuyWin.expectancyPct : -Infinity;
        if (!bestStructure || structureScore > bestStructure.score) {
          // 逐笔诊断由 buildTrainingFeedback 生成：MFE/MAE、持仓天数、按入场趋势分组的胜率与
          // 期望、"曾经浮盈最后却亏损"的笔数，外加最差/最好各三笔的具体样本。它会在行情行或
          // 成交日期越出训练窗口时直接抛错——前视偏差由代码拦住，不靠调用方自觉。
          // 这里传的 trainRows / 训练窗口边界都是训练期的，验证期数据不参与。
          try {
            const feedback = buildTrainingFeedback(engine, trainRows, best.config, best.last, {
              startDate: trainStartDate,
              endDate: trainEndDate,
              parentId: `attempt-${attempt + 1}`,
            });
            bestStructure = {
              model,
              score: structureScore,
              refinementPrompt: buildRefinementPrompt(feedback),
            };
          } catch (feedbackError) {
            // 诊断构造失败不能把整轮搜索带下水：保留上一个 bestStructure，本次只是不更新。
            console.log(`[feedback-skip] ${symbolEntry.code} attempt ${attempt + 1}: ${feedbackError.message}`);
          }
        }
        qualifyingAttempts.push({
          model, best, trainAnnualized, trainYearBreakdown,
          passesTrainUpsideGate, passesTrainDrawdownGate, usedPriorExamples,
          // 随条目带过去：验证阶段是独立的 map 回调，取不到尝试循环里的局部变量。
          // 之前直接在那里引用 isRefineAttempt 导致 ReferenceError，而且只在"有候选进入
          // 验证"时才触发——恰恰是最稀有的路径，冒烟测试全都没碰到，却让整轮实验的结果作废。
          isRefineAttempt,
          // 该候选在训练期有几年没过上行波动门槛：0 = 本来就能通过严格门槛，
          // >0 = 只因放宽才进来的。用于在同一次运行内部比较两组的验证达标率，
          // 从而判断这道门槛是否在拒绝本该通过的模型（组内对比不额外花 AI 调用）。
          failingTrainYearCount: failingTrainYears.length,
        });
        console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} [${isRefineAttempt ? "refine" : "explore"}] train=${trainAnnualized.toFixed(1)}%年化 — beat buy-hold, queued for validation (${qualifyingAttempts.length} so far)`);
        writeProgress({
          aiCalls,
          currentReason: `训练阶段第${attempt + 1}/${ATTEMPTS_PER_SYMBOL}次：${model.strategyType} 跑赢买入持有，已收集${qualifyingAttempts.length}个候选（训练阶段跑完后统一验证）`,
        });
      }

      // Phase 2: NOW validate every train-qualifying candidate against both validation years
      // (reset-account scoring, see engine.js's buildScoredBacktestStates) — every candidate
      // gets checked, not just whichever happened to be found first or scored best on train.
      console.log(`[${symbolEntry.code}] train phase done: ${qualifyingAttempts.length} candidate(s) beat buy-hold, validating each against both test years...`);
      const validated = qualifyingAttempts.map(({ model, best, trainAnnualized, trainYearBreakdown, passesTrainUpsideGate, passesTrainDrawdownGate, usedPriorExamples, isRefineAttempt, failingTrainYearCount }, i) => {
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
          { minTotal: MIN_TOTAL_CLOSED_BUYS, minPerYear: MIN_CLOSED_BUYS_PER_YEAR, rows: allRows }
        );
        const worstClosedBuys = sampleGate.total;
        // 始终记录较差验证年的胜率，供实验做分布统计——原先这些指标只在失败时才出现在日志里，
        // 通过的候选反而什么都不打印，导致"用期望/胜率衡量改动效果"这件事根本无法测量。
        const worstWinRate = (buyWin1.winRate === null || buyWin2.winRate === null)
          ? null : Math.min(buyWin1.winRate, buyWin2.winRate);
        const passesSample = sampleGate.passes;
        const passesExpectancy = worstExpectancyPct >= MIN_EXPECTANCY_PERCENT;
        const passesPayoff = worstPayoffRatio >= MIN_PAYOFF_RATIO;
        const reachedTarget = passesTrainUpsideGate && passesTrainDrawdownGate
          && passesSample && passesExpectancy && passesPayoff
          && year1Annualized >= TARGET_PERCENT && year2Annualized >= TARGET_PERCENT
          && passesUpsideYear1 && passesUpsideYear2 && passesDrawdownYear1 && passesDrawdownYear2;
        console.log(`[${symbolEntry.code}] validate ${i + 1}/${qualifyingAttempts.length} (${model.strategyType}) [${isRefineAttempt ? "refine" : "explore"}][训练年未过门槛数=${failingTrainYearCount}]: train=${trainAnnualized.toFixed(1)}%年化 year1=${year1Annualized.toFixed(1)}%年化${passesUpsideYear1 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear1 ? "" : "(回撤未小于买入持有)"} year2=${year2Annualized.toFixed(1)}%年化 [较差年 期望${worstExpectancyPct === -Infinity ? "无" : `${worstExpectancyPct >= 0 ? "+" : ""}${worstExpectancyPct.toFixed(2)}%`}·盈亏比${worstPayoffRatio === Infinity ? "∞" : worstPayoffRatio === -Infinity ? "无" : worstPayoffRatio.toFixed(2)}·胜率${worstWinRate === null ? "--" : `${worstWinRate.toFixed(0)}%`}·平仓${sampleGate.total}单]${passesUpsideYear2 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear2 ? "" : "(回撤未小于买入持有)"}${passesSample ? "" : `(样本不足:${describeBuySampleGate(sampleGate)}${sampleGate.passesTotal ? `,第${sampleGate.failingYears.map((y) => y.index).join("/")}年不足${MIN_CLOSED_BUYS_PER_YEAR}单` : `<${MIN_TOTAL_CLOSED_BUYS}单`})`}${passesExpectancy ? "" : `(每买单期望${worstExpectancyPct === -Infinity ? "无" : worstExpectancyPct.toFixed(2) + "%"}<${MIN_EXPECTANCY_PERCENT}%)`}${passesPayoff ? "" : `(盈亏比${worstPayoffRatio === Infinity ? "无" : worstPayoffRatio.toFixed(2)}<${MIN_PAYOFF_RATIO})`}${reachedTarget ? " — TARGET MET" : ""}`);
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
