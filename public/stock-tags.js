// 标的的板块/市场标签——浏览器与 Node 共用（同 public/formula-engine.js、
// public/model-recommendation.js 的模式：实现放 public/ 下，Node 侧用
// require("../../public/stock-tags.js") 引用，浏览器侧 <script> 引入后取 window.StockTags）。
//
// 用途：所有模型列表都按标签筛选。模型本身不存板块字段，标签是从它的标的代码现算出来的，
// 所以新增/调整板块归类只改这一个文件，不需要回填任何数据。
//
// 为什么是人工维护的清单而不是拉行业数据：这个代码库没有行业分类数据源。东方财富的板块接口
// 从生产服务器访问返回 302（实测重试无效，同机器上它的 K 线接口也只回空响应体，是出口被拦
// 而不是接口本身有问题）；公司名称里也基本不含行业词——467 个 A 股用「机器人|能源|芯片」等
// 关键词只能匹配到 1 个。所以沿用 scripts/shared/stock-categories.js 已有的做法。
//
// 归不了类的标的不会被任何板块选中，而不是硬塞进某一类——宁缺毋滥，否则板块筛选会失去意义。

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.StockTags = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // AI 芯片：直接受益于 AI 算力需求的半导体，比「所有半导体」窄。含算力芯片本身、
  // 制造/设备/EDA 这些卡脖子环节，以及 HBM/先进封装等 AI 专属配套。
  const AI_CHIP = {
    US: ["NVDA", "AMD", "AVGO", "MRVL", "ARM", "TSM", "MU", "MPWR",
      "AMAT", "LRCX", "KLAC", "ASML", "SNPS", "CDNS", "ASX"],
    CN: ["688981", "688041", "688008", "688256", "688521", "688012", "688396",
      "603501", "002049", "300661", "688126", "688082", "600584"],
    HK: ["0981", "1347"],
  };

  // 机器人：本体制造、核心零部件（减速器/伺服/控制器）、机器人化程度高的应用。
  // 美股池里纯机器人标的很少，ISRG(手术机器人)是最明确的一个。
  const ROBOTICS = {
    US: ["ISRG", "AXON"],
    CN: ["300024", "002472", "300607", "002050", "300124", "688017", "300100",
      "002611", "300097", "688169", "002896"],
    HK: ["9880", "2382"],
  };

  // 能源：油气开采与服务、电力与公用事业、新能源（光伏/风电/储能/电池）。
  // 传统与新能源放在一起，因为用户口径的「能源板块」通常两者都要。
  const ENERGY = {
    US: ["FANG", "BKR", "CEG", "EXC", "AEP", "XEL"],
    CN: ["601857", "600028", "601088", "600900", "601985", "300750", "002594",
      "601012", "688599", "300274", "002129", "601668"],
    HK: ["0386", "0857", "0883", "0836", "1088", "0916"],
  };

  // 科技股：比 AI 芯片宽，含软件/互联网/IT 硬件；AI 芯片是它的子集。
  const TECH = {
    US: ["AAPL", "MSFT", "GOOGL", "GOOG", "META", "AMZN", "NFLX", "ADBE", "CSCO", "INTU",
      "TEAM", "ADSK", "CRWD", "DDOG", "FTNT", "PANW", "WDAY", "ZS", "PYPL", "SHOP",
      "PLTR", "APP", "TSLA", "NET", "MSTR", "DASH", "ABNB", "BKNG", "MELI", "PDD",
      "QCOM", "TXN", "ADI", "NXPI", "MCHP", "INTC", "STX", "WDC", "CTSH", "CSGP"],
    CN: ["000725", "000938", "000977", "000988", "002236", "002241", "002415", "300033",
      "300059", "300124", "300308", "300394", "300418", "300433", "300476", "300502",
      "300866", "600588", "600845", "601360", "603019", "603296", "688036", "688111",
      "688183", "688271"],
    HK: ["0700", "9988", "3690", "1810", "9618", "0981", "0268", "0992"],
  };

  const SECTORS = [
    { id: "ai-chip", label: "AI 芯片", codes: AI_CHIP },
    { id: "robotics", label: "机器人", codes: ROBOTICS },
    { id: "energy", label: "能源", codes: ENERGY },
    { id: "tech", label: "科技股", codes: TECH },
  ];

  const MARKETS = [
    { id: "US", label: "美股" },
    { id: "CN", label: "A股" },
    { id: "HK", label: "H股" },
  ];

  // 代码 -> 板块 id 列表。建一次索引，列表渲染时每行只做一次 Map 查找。
  const sectorIndex = new Map();
  for (const sector of SECTORS) {
    for (const market of Object.keys(sector.codes)) {
      for (const code of sector.codes[market]) {
        const key = String(code).toUpperCase();
        if (!sectorIndex.has(key)) sectorIndex.set(key, []);
        sectorIndex.get(key).push(sector.id);
      }
    }
  }

  // 市场从代码形态推断：6 位数字是 A 股，4~5 位数字是港股，其余按美股 ticker。
  // 跟 scripts/shared/universe-loader.js 的 inferMarket 保持同一套规则——港股代码
  // （0700、9988）既不是 6 位也不是字母开头，不特判会被当成美股。
  function marketOf(code) {
    const value = String(code || "").trim();
    if (/^\d{6}$/.test(value)) return "CN";
    if (/^\d{4,5}$/.test(value)) return "HK";
    if (!value) return "";
    return "US";
  }

  function sectorsOf(code) {
    return sectorIndex.get(String(code || "").trim().toUpperCase()) || [];
  }

  // 一个标的的全部标签：市场 1 个 + 板块 0~N 个。列表筛选直接比对这个数组。
  function tagsOf(code) {
    const market = marketOf(code);
    return market ? [market, ...sectorsOf(code)] : sectorsOf(code);
  }

  function labelOf(tagId) {
    const market = MARKETS.find((m) => m.id === tagId);
    if (market) return market.label;
    const sector = SECTORS.find((s) => s.id === tagId);
    return sector ? sector.label : tagId;
  }

  // 选中的标签之间是「与」：市场和板块都选时要求同时满足（例如"美股 + AI 芯片"）；
  // 同一类里选多个是「或」（例如"美股 或 H股"）。不这样分组的话，选两个市场会得到空集。
  function matchesTags(code, selectedTags) {
    if (!selectedTags || selectedTags.length === 0) return true;
    const tags = tagsOf(code);
    const marketIds = MARKETS.map((m) => m.id);
    const selectedMarkets = selectedTags.filter((t) => marketIds.includes(t));
    const selectedSectors = selectedTags.filter((t) => !marketIds.includes(t));
    if (selectedMarkets.length > 0 && !selectedMarkets.some((t) => tags.includes(t))) return false;
    if (selectedSectors.length > 0 && !selectedSectors.some((t) => tags.includes(t))) return false;
    return true;
  }

  return { SECTORS, MARKETS, marketOf, sectorsOf, tagsOf, labelOf, matchesTags };
});
