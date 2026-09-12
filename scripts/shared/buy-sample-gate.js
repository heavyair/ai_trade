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

// 一个年份桶要有这么多个实际交易日，"这一年一笔完整买卖都没有"才说明得了问题。低于这个数
// 的桶属于【无法评估】，跳过——既不算通过也不算失败，跟 MIN_UPSIDE_GATE_ROWS 对数据太少的
// 年份的处理方式一致。
//
// 这条不是可有可无的边角料：很多科创板/创业板标的上市时间晚于模型的训练起点（例如 688041
// 行情从 2022-08 才开始，而训练起点是 2020-08），前一两个"年份"里这只股票根本不存在。没有
// 这条豁免，就是在拿"股票还没上市的年份"判模型断档——实测 266 条复查里有 113 条是仅因此
// 被降级的，其中不乏合计 348 笔完整买卖的模型。
const MIN_ROWS_FOR_YEAR_CHECK = 120;

// closedLots 来自 engine.buildBuyWinStats(trades).closedLots——必须是【整段历史一次连续回测】
// 得到的成交流水，不能把各年分别回测的结果拼起来：分段回测每段都会重置账户，跨年的买单会被
// 算成两笔或者干脆丢掉。
//
// rows 是该标的的全部行情（带 date），用来判断每个年份桶有没有足够数据可评估。
//
// minPerYear 只作用于【完整且有足够行情】的年份桶。最后一桶通常不足一年（截到最新交易日），
// 对它按整年的标准要求会把刚跨过周年没几天的模型误判成断档，所以也不参与这条判定。
function evaluateBuySampleGate(closedLots, startDate, latestDate, { minTotal, minPerYear, rows }) {
  const lots = Array.isArray(closedLots) ? closedLots : [];
  const priceRows = Array.isArray(rows) ? rows : [];
  const total = lots.length;
  const buckets = buildYearBuckets(startDate, latestDate).map((bucket) => {
    const fullYear = toIsoDate(shiftYears(new Date(bucket.start), 1)) <= latestDate;
    const count = lots.filter((lot) => lot.closeDate >= bucket.start && lot.closeDate < bucket.end).length;
    const rowCount = priceRows.filter((row) => row.date >= bucket.start && row.date < bucket.end).length;
    // 没传 rows 时退化成"只看是否整年"，保持旧行为而不是把所有桶都当成无法评估。
    const evaluable = fullYear && (priceRows.length === 0 || rowCount >= MIN_ROWS_FOR_YEAR_CHECK);
    return { ...bucket, count, rowCount, fullYear, evaluable };
  });
  const failingYears = buckets.filter((bucket) => bucket.evaluable && bucket.count < minPerYear);
  return {
    total,
    buckets,
    failingYears,
    passesTotal: total >= minTotal,
    passesPerYear: failingYears.length === 0,
    passes: total >= minTotal && failingYears.length === 0,
  };
}

// 给日志用的一行摘要，例如 "合计14单(各年:5/4/3/2*)"；带 * 的是未参与年度判定的桶
// （不足一年，或行情数据太少无法评估）。
function describeBuySampleGate(result) {
  return `合计${result.total}单(各年:${result.buckets.map((b) => `${b.count}${b.evaluable ? "" : "*"}`).join("/")})`;
}

module.exports = { evaluateBuySampleGate, describeBuySampleGate, buildYearBuckets };
