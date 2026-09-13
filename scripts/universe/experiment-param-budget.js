// 参数寻优预算实验：同一个【已知有效】的模型结构，把候选参数组合数从 400 提到几千，
// 验证期表现会不会更好？
//
// 动机：搜索流程里每次 AI 尝试都只给 searchBestConfig 400 个候选组合的预算，而 60 次尝试
// 是 60 个互不相干的全新结构（提示词甚至明确要求"换一个不同的思路"）。也就是说预算全花在
// 了"探索新结构"上，没有一分钱花在"打磨已经跑通的结构"上。这个脚本量化后者的收益。
//
// 方法：取一个已有模型的结构，只改参数搜索预算，在【训练窗口】上各自挑出最优参数，
// 再拿到验证窗口上看表现。参数选择全程只用训练数据，验证窗口仅用于最后的对比评估——
// 否则就是拿考试题当练习题。
//
// 用法：node scripts/universe/experiment-param-budget.js --id=6167 [--budgets=400,2000,8000]

const { Pool } = require("pg");
const engine = require("./engine.js");
const { searchBestConfig } = require("./search-best-config.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { splitTrainTestWindows } = require("../shared/train-test-window.js");
const { annualizedReturnRate } = require("../shared/annualize.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const getArgString = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : "";
};
const NUMERIC_ID = getArgString("id");
const BUDGETS = (getArgString("budgets") || "400,2000,8000").split(",").map((n) => Number(n.trim())).filter(Boolean);
const REPEATS = Math.max(1, Number(getArgString("repeats") || 3));

const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
const TRAIN_YEARS = 4;
const TEST_YEARS = 2;

function evaluateOnWindows(allRows, config, testWindows) {
  const years = testWindows.slice(0, 2).map((win) => {
    const scored = engine.buildScoredBacktestStates(allRows, config, win.startDate, win.endDate);
    const buyWin = engine.buildBuyWinStats(scored.trades);
    return {
      annualized: annualizedReturnRate(scored.returnRate, scored.rowsScored) || 0,
      expectancyPct: buyWin.expectancyPct,
      payoffRatio: buyWin.payoffRatio,
      closedBuys: buyWin.closedBuys,
      maxDrawdown: scored.maxDrawdown,
    };
  });
  const num = (v, fallback) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? fallback : Number(v));
  return {
    worstAnnualized: Math.min(...years.map((y) => y.annualized)),
    // 盈亏比为 null 表示那一年没有亏损单（全胜），不是 0——按无穷大处理才不会把好结果算成差的。
    worstPayoff: Math.min(...years.map((y) => num(y.payoffRatio, Infinity))),
    worstExpectancy: Math.min(...years.map((y) => num(y.expectancyPct, -Infinity))),
    totalClosed: years.reduce((sum, y) => sum + y.closedBuys, 0),
    worstDrawdown: Math.max(...years.map((y) => y.maxDrawdown)),
  };
}

async function main() {
  if (!NUMERIC_ID) {
    console.error("usage: --id=<numeric_id> [--budgets=400,2000,8000] [--repeats=3]");
    process.exit(1);
  }
  const { rows } = await pool.query(
    `SELECT symbol, market, strategy_type, best_config, preset_label
     FROM optimization_scan_results WHERE numeric_id = $1 LIMIT 1`, [NUMERIC_ID]);
  if (rows.length === 0) {
    console.error(`找不到 numeric_id=${NUMERIC_ID} 的模型`);
    process.exit(1);
  }
  const row = rows[0];
  const allRows = await loadRowsForSymbol(pool, row.symbol, row.market);
  const { trainRows, testWindows } = splitTrainTestWindows(allRows, TRAIN_YEARS, TEST_YEARS);
  console.log(`模型 #${NUMERIC_ID} ${row.symbol} (${row.strategy_type})：训练 ${trainRows.length} 行`);

  const baseline = evaluateOnWindows(allRows, row.best_config, testWindows);
  console.log(`\n入库参数的验证期表现：较差年年化 ${baseline.worstAnnualized.toFixed(1)}% · 期望 ${baseline.worstExpectancy.toFixed(2)}% · 盈亏比 ${baseline.worstPayoff.toFixed(2)} · 平仓 ${baseline.totalClosed}`);

  const sourcePreset = { ...row.best_config, strategyType: row.strategy_type };
  const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: row.strategy_type };
  const results = [];
  for (const budget of BUDGETS) {
    // 参数搜索里有随机采样成分（候选组合数超过预算时随机取），所以每档跑多次取中位数，
    // 避免把一次好运当成预算带来的提升。
    const runs = [];
    for (let r = 0; r < REPEATS; r += 1) {
      const best = searchBestConfig(engine, sourcePreset, trainRows, baseConfig, budget);
      if (!best) continue;
      const trainAnnualized = annualizedReturnRate(best.last.returnRate, trainRows.length) || 0;
      const evalResult = evaluateOnWindows(allRows, best.config, testWindows);
      runs.push({ trainAnnualized, trainScore: best.score, ...evalResult });
      process.stdout.write(".");
    }
    const med = (key) => {
      const vals = runs.map((x) => x[key]).filter(Number.isFinite).sort((a, b) => a - b);
      return vals.length ? vals[Math.floor(vals.length / 2)] : NaN;
    };
    results.push({
      预算: budget,
      "训练期年化%": med("trainAnnualized").toFixed(1),
      "验证较差年年化%": med("worstAnnualized").toFixed(1),
      "验证较差年期望%": med("worstExpectancy").toFixed(2),
      "验证较差年盈亏比": med("worstPayoff").toFixed(2),
      "验证期平仓数": med("totalClosed"),
      "验证最大回撤%": med("worstDrawdown").toFixed(1),
    });
    process.stdout.write("\n");
  }
  console.log("\n============ 各预算的验证期表现（每档取 " + REPEATS + " 次的中位数）============");
  console.table(results);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
