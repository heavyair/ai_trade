// 可调参数个数 × 搜索预算 的网格实验：参数集该开放到多大？
//
// 背景见 engine.js 里 OPTIMIZATION_TYPE_CONFIG 上方的说明——那份配置原本是给人用的表单渲染
// 配置，被原样搬成了机器搜索的参数集。ma-rsi-band 有 22 个字段却只开放 4 个，搜索空间小到
// 400 的预算一次穷举完。
//
// 但"参数越多越好"同样是没有根据的直觉，而且有反面证据：从已优化的参数再优化一遍，训练期
// 分数不变差、验证期却从 66.0% 掉到 62.1%（见 experiment-param-budget.js）。参数越多越容易
// 在训练期找到一组"恰好很好看"的组合，到验证期原形毕露。所以要实测拐点。
//
// 为什么必须是网格而不是单变量：参数变多会让同样的预算在更大的空间里显得稀疏，
// 如果只扫参数个数、固定预算，就分不清"参数多了有害"还是"预算不够采样太稀"。
//
// 选择只用训练数据（searchBestConfig 只看 trainRows），验证窗口仅用于最后评估。
//
// 用法：node scripts/universe/experiment-param-fields.js [--types=ma-rsi-band,pe-volume]
//        [--extras=0,2,4,6] [--budgets=400,4000] [--repeats=3] [--limit=6]

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
const nums = (name, fallback) => (getArgString(name) || fallback).split(",").map((n) => Number(n.trim())).filter((n) => Number.isFinite(n));
const TYPES = (getArgString("types") || "ma-rsi-band,local-high-ladder,pe-volume").split(",").map((t) => t.trim()).filter(Boolean);
const EXTRAS = nums("extras", "0,2,4,6");
const BUDGETS = nums("budgets", "400,4000");
const REPEATS = Math.max(1, Number(getArgString("repeats") || 3));
const LIMIT = Math.max(1, Number(getArgString("limit") || 6));

const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
const TRAIN_YEARS = 4;
const TEST_YEARS = 2;

function evaluate(allRows, config, testWindows) {
  const num = (v, fallback) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? fallback : Number(v));
  const years = testWindows.slice(0, 2).map((win) => {
    const scored = engine.buildScoredBacktestStates(allRows, config, win.startDate, win.endDate);
    const buyWin = engine.buildBuyWinStats(scored.trades);
    return {
      annualized: annualizedReturnRate(scored.returnRate, scored.rowsScored) || 0,
      // 盈亏比 null = 那一年没有亏损单（全胜），按无穷大处理，不能当 0。
      payoff: num(buyWin.payoffRatio, Infinity),
      expectancy: num(buyWin.expectancyPct, -Infinity),
      closed: buyWin.closedBuys,
    };
  });
  return {
    worstAnnualized: Math.min(...years.map((y) => y.annualized)),
    worstExpectancy: Math.min(...years.map((y) => y.expectancy)),
    worstPayoff: Math.min(...years.map((y) => y.payoff)),
    totalClosed: years.reduce((s, y) => s + y.closed, 0),
  };
}

const median = (values) => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
};

async function main() {
  const { rows } = await pool.query(`
    SELECT numeric_id, symbol, market, strategy_type, best_config
    FROM optimization_scan_results
    WHERE source = 'validated-search' AND strategy_type = ANY($1) AND best_config IS NOT NULL
    ORDER BY scanned_at DESC LIMIT $2`, [TYPES, LIMIT]);
  if (rows.length === 0) {
    console.error("没有匹配的模型");
    process.exit(1);
  }
  console.log(`模型 ${rows.length} 个：${rows.map((r) => `#${r.numeric_id}/${r.symbol}/${r.strategy_type}`).join(", ")}`);
  console.log(`extras=${EXTRAS.join(",")} budgets=${BUDGETS.join(",")} repeats=${REPEATS}\n`);

  const prepared = [];
  for (const row of rows) {
    let allRows;
    try {
      allRows = await loadRowsForSymbol(pool, row.symbol, row.market);
    } catch (error) { continue; }
    const split = splitTrainTestWindows(allRows, TRAIN_YEARS, TEST_YEARS);
    if (!split.trainRows || split.trainRows.length < 200 || !split.testWindows || split.testWindows.length < 2) continue;
    prepared.push({ row, allRows, trainRows: split.trainRows, testWindows: split.testWindows });
  }

  const cells = [];
  for (const extras of EXTRAS) {
    for (const budget of BUDGETS) {
      engine.setOptimizationExtraFieldCount(extras);
      const perModel = { ann: [], exp: [], payoff: [], closed: [], trainAnn: [], paramCount: [] };
      for (const item of prepared) {
        const sourcePreset = { ...item.row.best_config, strategyType: item.row.strategy_type };
        const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: item.row.strategy_type };
        perModel.paramCount.push(engine.discoverOptimizationParameters(sourcePreset).length);
        const runs = [];
        for (let r = 0; r < REPEATS; r += 1) {
          const best = searchBestConfig(engine, sourcePreset, item.trainRows, baseConfig, budget);
          if (!best) continue;
          runs.push({
            trainAnn: annualizedReturnRate(best.last.returnRate, item.trainRows.length) || 0,
            ...evaluate(item.allRows, best.config, item.testWindows),
          });
        }
        if (runs.length === 0) continue;
        // 每个模型先对重复次数取中位数，再跨模型取中位数——避免某个波动大的标的主导结果。
        perModel.ann.push(median(runs.map((x) => x.worstAnnualized)));
        perModel.exp.push(median(runs.map((x) => x.worstExpectancy)));
        perModel.payoff.push(median(runs.map((x) => x.worstPayoff)));
        perModel.closed.push(median(runs.map((x) => x.totalClosed)));
        perModel.trainAnn.push(median(runs.map((x) => x.trainAnn)));
        process.stdout.write(".");
      }
      cells.push({
        "额外参数": extras,
        "预算": budget,
        "平均参数个数": (perModel.paramCount.reduce((a, b) => a + b, 0) / Math.max(1, perModel.paramCount.length)).toFixed(1),
        "训练期年化%": median(perModel.trainAnn).toFixed(1),
        "验证较差年年化%": median(perModel.ann).toFixed(1),
        "验证较差年期望%": median(perModel.exp).toFixed(2),
        "验证较差年盈亏比": median(perModel.payoff).toFixed(2),
        "验证平仓数": median(perModel.closed),
      });
    }
    process.stdout.write("\n");
  }
  engine.setOptimizationExtraFieldCount(0);

  console.log("\n============ 结果（跨模型中位数）============");
  console.table(cells);
  console.log("\n看点：训练期年化随参数增多单调上升、而验证期不升反降 = 过拟合的典型信号。");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
