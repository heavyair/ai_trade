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

// AI 芯片：直接受益于 AI 算力需求的半导体，比"所有半导体"窄。分三类收录——
// 算力芯片本身、制造/设备/EDA 这些卡脖子环节、以及 HBM/先进封装等 AI 专属配套。
const AI_CHIP = {
  US: [
    "NVDA", "AMD", "AVGO", "MRVL", "ARM", "TSM", "MU", "MPWR",
    "AMAT", "LRCX", "KLAC", "ASML", "SNPS", "CDNS", "ASX",
  ],
  CN: [
    "688981", "688041", "688008", "688256", "688521", "688012", "688396",
    "603501", "002049", "300661", "688126", "688082", "600584",
  ],
  HK: ["0981", "1347"],
};

// 机器人：本体制造、核心零部件（减速器/伺服/控制器）、以及机器人化程度高的应用。
// 美股池里纯机器人标的很少，ISRG（手术机器人）是最明确的一个；把"沾边"的都塞进来会让
// 这个板块失去意义，所以宁缺毋滥。
const ROBOTICS = {
  US: ["ISRG", "AXON"],
  CN: [
    "300024", "002472", "300607", "002050", "300124", "688017", "300100",
    "002611", "300097", "688169", "002896",
  ],
  HK: ["9880", "2382"],
};

// 能源：油气开采与服务、电力与公用事业、以及新能源（光伏/风电/储能/电池）。
// 新能源和传统能源放在一起，因为用户口径的"能源板块"通常两者都要。
const ENERGY = {
  US: ["FANG", "BKR", "CEG", "EXC", "AEP", "XEL"],
  CN: [
    "601857", "600028", "601088", "600900", "601985", "300750", "002594",
    "601012", "688599", "300274", "002129", "601668",
  ],
  HK: ["0386", "0857", "0883", "0836", "1088", "0916"],
};

// 科技股：比 AI 芯片宽，含软件/互联网/IT 硬件；AI 芯片是它的子集。
const TECH = {
  US: [
    "AAPL", "MSFT", "GOOGL", "GOOG", "META", "AMZN", "NFLX", "ADBE", "CSCO", "INTU",
    "TEAM", "ADSK", "CRWD", "DDOG", "FTNT", "PANW", "WDAY", "ZS", "PYPL", "SHOP",
    "PLTR", "APP", "TSLA", "NET", "MSTR", "DASH", "ABNB", "BKNG", "MELI", "PDD",
    "QCOM", "TXN", "ADI", "NXPI", "MCHP", "INTC", "STX", "WDC", "CTSH", "CSGP",
  ],
  CN: [
    "000725", "000938", "000977", "000988", "002236", "002241", "002415", "300033",
    "300059", "300124", "300308", "300394", "300418", "300433", "300476", "300502",
    "300866", "600588", "600845", "601360", "603019", "603296", "688036", "688111",
    "688183", "688271",
  ],
  HK: ["0700", "9988", "3690", "1810", "9618", "0981", "0268", "0992"],
};

const SECTORS = {
  "ai-chip": { label: "AI 芯片", codes: AI_CHIP },
  robotics: { label: "机器人", codes: ROBOTICS },
  energy: { label: "能源", codes: ENERGY },
  tech: { label: "科技股", codes: TECH },
};

// 市场标识：对外用 US/CN/HK，库里 A 股分沪深两个代码（1=沪、0=深），这里统一处理。
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
