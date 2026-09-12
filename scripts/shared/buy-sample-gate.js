// 买单样本量门槛：一个模型的每买单期望/盈亏比要可信，得先有足够多的完整买卖。
//
// 口径是"全部历史合计 + 每年不断档"，而不是按验证年各自计数：
//
//   - 合计按【整段历史】算（训练起点 ~ 最新交易日）。统计功效来自独立成交的总笔数，而两个
//     验证年的切分只是窗口构造方式的副产品，不是一条有统计意义的边界。早先按"每个验证年各
//     ≥10"判，等于把功效要求翻倍还多，实测把 NVDA（两年 10 笔 + 9 笔）这种明显够用的模型
//     也砍掉了，纯属规则本身的问题而非模型的问题。
//   - 每年另设一条很低的下限，只为排除"整整一年一笔完整买卖都没有"的断档模型。这类模型的
//     年化可能很漂亮，但那一年实际上没有任何证据，合计数字全靠另一年撑着。
//
// 年份分桶用的是【从训练起点起算的周年】，不是自然年——模型的生命周期从它自己的训练起点
// 开始，用 1 月 1 日切分会把第一年和最后一年切成不完整的碎片，人为制造断档。

const { shiftYears, toIsoDate } = require("./train-test-window.js");

// 把 [startDate, latestDate) 按周年切成若干桶，最后一桶可能不足一年（截到 latestDate）。
function buildYearBuckets(startDate, latestDate) {
  const buckets = [];
  const start = new Date(startDate);
  for (let i = 0; i < 100; i += 1) {
    const from = toIsoDate(shiftYears(start, i));
    if (from >= latestDate) break;
    const nextFrom = toIsoDate(shiftYears(start, i + 1));
    buckets.push({ index: i + 1, start: from, end: nextFrom > latestDate ? latestDate : nextFrom });
    if (nextFrom >= latestDate) break;
  }
  return buckets;
}

// closedLots 来自 engine.buildBuyWinStats(trades).closedLots——必须是【整段历史一次连续回测】
// 得到的成交流水，不能把各年分别回测的结果拼起来：分段回测每段都会重置账户，跨年的买单会被
// 算成两笔或者干脆丢掉。
//
// minPerYear 只作用于【完整的】年份桶。最后一桶通常不足一年（截到最新交易日），对它按整年的
// 标准要求会把刚跨过周年没几天的模型误判成断档，所以不足一年的桶不参与这条判定。
function evaluateBuySampleGate(closedLots, startDate, latestDate, { minTotal, minPerYear }) {
  const lots = Array.isArray(closedLots) ? closedLots : [];
  const total = lots.length;
  const buckets = buildYearBuckets(startDate, latestDate).map((bucket) => {
    const fullYear = toIsoDate(shiftYears(new Date(bucket.start), 1)) <= latestDate;
    const count = lots.filter((lot) => lot.closeDate >= bucket.start && lot.closeDate < bucket.end).length;
    return { ...bucket, count, fullYear };
  });
  const failingYears = buckets.filter((bucket) => bucket.fullYear && bucket.count < minPerYear);
  return {
    total,
    buckets,
    failingYears,
    passesTotal: total >= minTotal,
    passesPerYear: failingYears.length === 0,
    passes: total >= minTotal && failingYears.length === 0,
  };
}

// 给日志用的一行摘要，例如 "合计14单(各年:5/4/3/2)"。
function describeBuySampleGate(result) {
  return `合计${result.total}单(各年:${result.buckets.map((b) => `${b.count}${b.fullYear ? "" : "*"}`).join("/")})`;
}

module.exports = { evaluateBuySampleGate, describeBuySampleGate, buildYearBuckets };
