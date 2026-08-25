// Static, hand-curated sector tags for the admin "后台模型排行" filters. The app has no
// external sector/industry data feed (scripts/backfill_us_pe_from_huggingface.py only ever
// fetched PE data), so 芯片股/high-tech classification is a manually maintained ticker list
// rather than anything derived from a live source — it only covers well-known chip/tech
// names within the current scan universe (scripts/universe/symbols.json) plus whatever's
// been queried into symbol_query_history; an unrecognized ticker is simply untagged.
// QQQ membership instead reuses symbols.json's existing `index` field (QQQ tracks the
// Nasdaq-100 1:1 by design, so ndx100 members are QQQ constituents) rather than a separate
// hardcoded list, since that data is already curated there.
const CHIP_STOCK_CODES = new Set([
  // US: semiconductor design / equipment / EDA / foundry
  "NVDA", "AMD", "INTC", "AVGO", "QCOM", "TXN", "MU", "AMAT", "LRCX", "KLAC",
  "MRVL", "ADI", "NXPI", "MCHP", "ASML", "ARM", "CDNS", "SNPS",
  // CN: semiconductor design / equipment / foundry / packaging & testing
  "002049", "002371", "300661", "600460", "600584", "603501", "603893", "603986",
  "688008", "688012", "688041", "688047", "688072", "688082", "688126", "688256",
  "688396", "688521", "688981",
]);

const TECH_STOCK_CODES = new Set([
  ...CHIP_STOCK_CODES,
  // US: broader software / internet / tech-hardware names
  "AAPL", "MSFT", "GOOGL", "GOOG", "META", "AMZN", "NFLX", "ADBE", "CSCO", "INTU",
  "TEAM", "ADSK", "CRWD", "DDOG", "FTNT", "PANW", "WDAY", "ZS", "PYPL", "SHOP",
  "PLTR", "MSTR", "APP", "TSLA", "ISRG",
  // CN: broader software / internet / IT hardware / electronics names
  "000725", "000938", "000977", "000988", "002236", "002241", "002415", "300033",
  "300059", "300124", "300308", "300394", "300418", "300433", "300476", "300502",
  "300866", "600588", "600845", "601360", "603019", "603296", "688036", "688111",
  "688183", "688271",
]);

function isQqqConstituent(code, universeIndexByCode) {
  if (!universeIndexByCode) return false;
  // Only "ndx100" is an actual verified index-membership tag. symbols.json's "extra" bucket
  // (QQQ itself, plus NET which was added by request rather than because it's a real
  // Nasdaq-100/QQQ holding) is NOT membership data and must not be treated as such.
  const entry = universeIndexByCode.get(String(code || "").toUpperCase());
  return Boolean(entry && entry.market === "US" && entry.index === "ndx100");
}

function getStockCategories(code, universeIndexByCode) {
  const normalized = String(code || "").toUpperCase();
  return {
    isChip: CHIP_STOCK_CODES.has(normalized),
    isTech: TECH_STOCK_CODES.has(normalized),
    isQqq: isQqqConstituent(code, universeIndexByCode),
  };
}

module.exports = { getStockCategories, CHIP_STOCK_CODES, TECH_STOCK_CODES };
