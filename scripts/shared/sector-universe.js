// 板块 + 市场的标的解析：供"AI 搜索按板块/市场搜索"使用。
//
// 为什么是人工维护的清单而不是拉行业数据：这个代码库没有行业分类数据源。东方财富的板块接口
// （stock_board_industry_name_em / stock_board_concept_name_em，底层都是 push2.eastmoney.com）
// 从生产服务器访问会返回 302，实测重试无效——同一台机器上 push2his 的 K 线接口也只返回空
// 响应体，说明是出口被拦而不是接口本身有问题。公司名称里也基本不含行业词（467 个 A 股里用
// "机器人|能源|芯片" 等关键词只能匹配到 1 个），所以关键词分类同样走不通。
//
// 因此沿用 stock-categories.js 已有的做法：人工维护清单，只覆盖当前标的池里确实存在、且归属
// 明确的标的。归不了类的标的不会被任何板块选中，而不是硬塞进某一类。
//
// 清单里的每个代码都必须真实存在于标的池中（scripts/universe/symbols.json 或库里的
// daily_prices），解析时还会再跟数据库核对一次，没有行情数据的会被剔除——否则搜索会在
// 一堆取不到数据的代码上空转。

// 板块与市场的定义统一放在 public/stock-tags.js（浏览器和 Node 共用，同 formula-engine.js
// 的模式）——模型列表的标签筛选在浏览器里跑，搜索的标的解析在 Node 里跑，两边必须用同一份
// 清单，否则"界面筛出来的"和"搜索实际跑的"会对不上。
const StockTags = require("../../public/stock-tags.js");

const SECTORS = Object.fromEntries(
  StockTags.SECTORS.map((entry) => [entry.id, { label: entry.label, codes: entry.codes }])
);

const MARKETS = {
  US: { label: "美股", dbMarkets: ["US"] },
  CN: { label: "A股", dbMarkets: ["0", "1"] },
  HK: { label: "H股", dbMarkets: ["HK"] },
};

function listSectors() {
  return Object.entries(SECTORS).map(([id, entry]) => ({ id, label: entry.label }));
}

function listMarkets() {
  return Object.entries(MARKETS).map(([id, entry]) => ({ id, label: entry.label }));
}

// 取某个板块 × 某个市场的代码清单（未经数据库核对）。market 省略表示全部市场。
function sectorCodes(sectorId, marketId = "") {
  const sector = SECTORS[sectorId];
  if (!sector) return [];
  const markets = marketId ? [String(marketId).toUpperCase()] : Object.keys(MARKETS);
  const out = [];
  for (const m of markets) {
    for (const code of sector.codes[m] || []) out.push(String(code).toUpperCase());
  }
  return [...new Set(out)];
}

// 跟数据库核对：只保留确实有行情数据的标的，并要求数据量够跑 4 年训练 + 2 年验证。
// 没有这一步，搜索会在一堆取不到数据的代码上空转（实测港股接入前，H股 清单里的 50 个
// 标的一行数据都没有）。
async function resolveSectorSymbols(pool, { sector = "", market = "", minRows = 400 } = {}) {
  const marketId = String(market || "").toUpperCase();
  const dbMarkets = marketId && MARKETS[marketId] ? MARKETS[marketId].dbMarkets : null;

  let codes = null;
  if (sector) {
    codes = sectorCodes(sector, marketId);
    if (codes.length === 0) return { symbols: [], skipped: [], reason: "该板块在这个市场下没有维护任何标的。" };
  }

  const params = [];
  const where = ["1=1"];
  if (codes) { params.push(codes); where.push(`upper(symbol) = ANY($${params.length})`); }
  if (dbMarkets) { params.push(dbMarkets); where.push(`market = ANY($${params.length})`); }
  params.push(minRows);
  const result = await pool.query(
    `SELECT upper(symbol) AS code, market, count(*) AS rows
     FROM daily_prices WHERE ${where.join(" AND ")}
     GROUP BY 1, 2 HAVING count(*) >= $${params.length}
     ORDER BY 1`, params);

  const found = new Set(result.rows.map((row) => row.code));
  const skipped = codes ? codes.filter((code) => !found.has(code)) : [];
  return { symbols: result.rows.map((row) => row.code), skipped, reason: "" };
}

module.exports = { SECTORS, MARKETS, listSectors, listMarkets, sectorCodes, resolveSectorSymbols };
