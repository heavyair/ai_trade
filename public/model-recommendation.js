// 模型推荐评分与分级的唯一 JS 实现（浏览器与 Node 共用，跟 public/formula-engine.js 同一个
// 模式：实现放在 public/ 下，Node 侧用 require("../../public/model-recommendation.js") 引用，
// 浏览器侧用 <script> 引入后取 window.ModelRecommendation）。
//
// 合并前这套公式在 JS 里有两份完全一样的拷贝：public/app.js 的 getWatchableRecommendation 和
// scripts/universe/optimize-watchable-ai-models.js 的 recommendationScore，改一处忘另一处就会
// 出现"界面上的评分跟优化脚本挑出来的最优参数不是一个标准"。
//
// 还有第三份拷贝在 server.js 里 handleWatchableAiModelsApi 的内联 SQL —— 那份是"推荐盯盘"主列表
// ORDER BY 的权威来源，因为排序必须在数据库里做，不能把几百条全拉回来再排，所以没法复用这里的
// 代码。但两边必须保持同一套口径：改这个文件时一定要同步改 server.js 里那段 SQL，反之亦然。
//
// 评分构成（为什么这么设计见下面每一项的注释）：
//   验证状态分 + 交易笔数区间分 + 每买单期望分 + 盈亏比分 + 年化辅助分 − 两个一致性惩罚

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ModelRecommendation = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // 样本不足(<10单)时，把"每笔边际优势"这两项证据打折——2 单 100% 胜率是噪音，不该冲到榜首。
  // 只折减这两项而不是整个评分：验证状态/交易笔数/一致性惩罚不会因为样本小而失真。
  const MIN_BUY_WIN_SAMPLE = 10;
  const SMALL_SAMPLE_FACTOR = 0.4;

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function tradeCountScore(totalTrades) {
    if (totalTrades >= 11 && totalTrades <= 60) return 220;
    if (totalTrades >= 61 && totalTrades <= 120) return 180;
    if (totalTrades >= 6 && totalTrades <= 10) return 130;
    if (totalTrades > 120) return 90;
    if (totalTrades >= 3 && totalTrades <= 5) return 60;
    return 0;
  }

  // input 用归一化后的驼峰字段，调用方负责把自己的行形状（接口返回 / snake_case 数据库行）映射过来。
  function buildModelRecommendation(input) {
    const totalTrades = Number.isFinite(Number(input.totalTrades))
      ? Number(input.totalTrades)
      : toNumber(input.year1Trades) + toNumber(input.year2Trades);
    const year1Return = toNumber(input.year1AnnualizedReturn);
    const year2Return = toNumber(input.year2AnnualizedReturn);
    const worstYearReturn = Math.min(year1Return, year2Return);
    const avgYearReturn = (year1Return + year2Return) / 2;
    const maxAnnualizedDiff = Math.max(toNumber(input.annualizedDiffYear1), toNumber(input.annualizedDiffYear2));
    const tradeDiff = Math.abs(toNumber(input.year1Trades) - toNumber(input.year2Trades));
    const validationStatus = input.validationStatus || "valid";

    // 一律取"较差的那个验证年"，跟 worstYearReturn、跟"两年都要达标"是同一个看最坏情况的原则。
    const worstExpectancyPct = Math.min(toNumber(input.year1BuyExpectancyPct), toNumber(input.year2BuyExpectancyPct));
    const worstPayoff = Math.min(toNumber(input.year1BuyPayoffRatio), toNumber(input.year2BuyPayoffRatio));
    const worstClosed = Math.min(toNumber(input.year1BuyClosedCount), toNumber(input.year2BuyClosedCount));
    const sampleFactor = worstClosed >= MIN_BUY_WIN_SAMPLE ? 1 : worstClosed > 0 ? SMALL_SAMPLE_FACTOR : 0;

    const statusScore = validationStatus === "valid" ? 1000 : validationStatus === "watching" ? 780 : 0;
    // 主收益项是每买单期望%，取代了原来的"较差年年化"：年化是账户层面的复利结果，会被仓位大小
    // 放大，分不清"每笔都有边际优势"和"碰巧几笔大的把整体拉回来"。
    const expectancyScore = Math.min(Math.max(worstExpectancyPct, -5), 10) * 40 * sampleFactor;
    // 盈亏比只在 >1 时加分：赢一次赚的要多过输一次亏的，否则是靠高胜率硬撑的脆弱结构。
    const payoffScore = Math.min(Math.max(worstPayoff - 1, 0) * 60, 180) * sampleFactor;
    // 年化降为辅助项（原来是 ×1、上限 300）。策略类型的写死先验也已移除：有了期望值这种直接
    // 证据，就不需要再用"哪种策略类型一般更好"去猜。
    const annualizedScore = Math.min(Math.max(worstYearReturn, 0), 300) * 0.3;

    const recommendationScore = statusScore
      + tradeCountScore(totalTrades)
      + expectancyScore
      + payoffScore
      + annualizedScore
      - Math.min(maxAnnualizedDiff, 300) * 0.15
      - Math.min(tradeDiff, 200) * 0.25;

    const recommendationTier = validationStatus === "watching" ? "观察中"
      : (worstClosed >= MIN_BUY_WIN_SAMPLE && worstExpectancyPct >= 2 && worstPayoff >= 1.2 && totalTrades >= 6) ? "优先"
        : (worstClosed >= MIN_BUY_WIN_SAMPLE && worstExpectancyPct > 0 && totalTrades >= 6) ? "可用"
          : "谨慎";

    return {
      totalTrades,
      worstYearReturn,
      avgYearReturn,
      maxAnnualizedDiff,
      tradeDiff,
      validationStatus,
      worstExpectancyPct,
      worstPayoff,
      worstClosed,
      recommendationScore,
      recommendationTier,
    };
  }

  // optimization_scan_results / preset_validation_snapshots 那一族 snake_case 行。
  function recommendationFromDbRow(row) {
    return buildModelRecommendation({
      year1AnnualizedReturn: row.test_year1_annualized_return,
      year2AnnualizedReturn: row.test_year2_annualized_return,
      year1Trades: row.test_year1_trades,
      year2Trades: row.test_year2_trades,
      annualizedDiffYear1: row.annualized_diff_year1,
      annualizedDiffYear2: row.annualized_diff_year2,
      validationStatus: row.validation_status,
      year1BuyExpectancyPct: row.test_year1_buy_expectancy_pct,
      year2BuyExpectancyPct: row.test_year2_buy_expectancy_pct,
      year1BuyPayoffRatio: row.test_year1_buy_payoff_ratio,
      year2BuyPayoffRatio: row.test_year2_buy_payoff_ratio,
      year1BuyClosedCount: row.test_year1_buy_closed_count,
      year2BuyClosedCount: row.test_year2_buy_closed_count,
    });
  }

  return { buildModelRecommendation, recommendationFromDbRow, MIN_BUY_WIN_SAMPLE };
});
