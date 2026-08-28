// Index mapping table — the single source of truth for "what indices can a 指数盯盘 watch
// (or anything else) target, and how do we resolve each one's CURRENT constituent list."
// Backed by the index_catalog DB table (see server.js's initializeDatabase, which seeds it
// from CATALOG_SEED below on every startup) so it's queryable directly via SQL/admin tools,
// not just a hardcoded JS array — but the seed data itself still lives in code, versioned
// alongside the fetch logic that depends on it.
//
// Every code below was verified LIVE against AKShare/csindex.com.cn on 2026-08-28 before being
// trusted — index codes are opaque and easy to mix up (e.g. 930713 "中证人工智能主题指数" vs
// 931071 "中证人工智能产业指数" are two different indices that both plausibly match a vague
// name search).
const fs = require("fs");
const path = require("path");
const { runAkshareBridge } = require("./akshare-client.js");

// fetchSource: "akshare" (ak.index_stock_cons(symbol=code) — confirmed to work uniformly
// across 中证/国证/深证-published indices, not just CSI-branded ones, despite AKShare having a
// separate CSI-only index_stock_cons_csindex function) or "static_snapshot" (no live
// constituent-fetch path found — falls back to scripts/universe/symbols.json's `index` tag,
// which is a hand-refreshed point-in-time list, not live).
const CATALOG_SEED = [
  {
    mappingId: "CSI300", officialName: "沪深300", shortName: "沪深300", code: "000300",
    indexCompany: "中证指数", marketCoverage: "沪深A股", constituentCountHint: "300",
    fetchSource: "akshare", market: "CN", available: true,
  },
  {
    mappingId: "A_SHARE_AI", officialName: "中证人工智能主题指数", shortName: "CS人工智", code: "930713",
    indexCompany: "中证指数", marketCoverage: "沪深A股", constituentCountHint: "50",
    fetchSource: "akshare", market: "CN", available: true,
  },
  {
    mappingId: "STAR_CHIP", officialName: "上证科创板芯片指数", shortName: "科创芯片", code: "000685",
    indexCompany: "中证指数", marketCoverage: "科创板", constituentCountHint: "50",
    fetchSource: "akshare", market: "CN", available: true,
  },
  {
    mappingId: "SZ_AI50", officialName: "深证人工智能50指数", shortName: "AI 50", code: "399284",
    indexCompany: "国证指数/深交所", marketCoverage: "深市A股", constituentCountHint: "50",
    fetchSource: "akshare", market: "CN", available: true,
  },
  {
    mappingId: "CSI_ROBOT", officialName: "中证机器人指数", shortName: "机器人", code: "H30590",
    indexCompany: "中证指数", marketCoverage: "A股", constituentCountHint: "当前66",
    fetchSource: "akshare", market: "CN", available: true,
  },
  {
    mappingId: "CNI_CHIP", officialName: "国证半导体芯片指数", shortName: "国证芯片", code: "980017",
    indexCompany: "国证指数", marketCoverage: "沪深北等符合条件证券", constituentCountHint: "30",
    fetchSource: "akshare", market: "CN", available: true,
  },
  {
    mappingId: "NASDAQ100", officialName: "Nasdaq-100 Index", shortName: "纳指100", code: "NDX",
    indexCompany: "Nasdaq", marketCoverage: "美国 Nasdaq", constituentCountHint: "100家公司*",
    fetchSource: "static_snapshot", market: "US", available: true,
  },
];

async function ensureIndexCatalogTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS index_catalog (
      mapping_id TEXT PRIMARY KEY,
      official_name TEXT NOT NULL,
      short_name TEXT NOT NULL DEFAULT '',
      code TEXT,
      index_company TEXT NOT NULL DEFAULT '',
      market_coverage TEXT NOT NULL DEFAULT '',
      constituent_count_hint TEXT NOT NULL DEFAULT '',
      fetch_source TEXT NOT NULL DEFAULT 'akshare',
      market TEXT NOT NULL DEFAULT 'CN',
      available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  for (const entry of CATALOG_SEED) {
    await pool.query(`
      INSERT INTO index_catalog (
        mapping_id, official_name, short_name, code, index_company, market_coverage,
        constituent_count_hint, fetch_source, market, available, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (mapping_id) DO UPDATE SET
        official_name = EXCLUDED.official_name,
        short_name = EXCLUDED.short_name,
        code = EXCLUDED.code,
        index_company = EXCLUDED.index_company,
        market_coverage = EXCLUDED.market_coverage,
        constituent_count_hint = EXCLUDED.constituent_count_hint,
        fetch_source = EXCLUDED.fetch_source,
        market = EXCLUDED.market,
        available = EXCLUDED.available,
        updated_at = NOW()
    `, [
      entry.mappingId, entry.officialName, entry.shortName, entry.code, entry.indexCompany,
      entry.marketCoverage, entry.constituentCountHint, entry.fetchSource, entry.market, entry.available,
    ]);
  }
}

function mapIndexCatalogRow(row) {
  return {
    mappingId: row.mapping_id,
    officialName: row.official_name,
    shortName: row.short_name,
    code: row.code,
    indexCompany: row.index_company,
    marketCoverage: row.market_coverage,
    constituentCountHint: row.constituent_count_hint,
    fetchSource: row.fetch_source,
    market: row.market,
    available: row.available,
  };
}

async function listIndexCatalog(pool) {
  const result = await pool.query(`SELECT * FROM index_catalog ORDER BY market ASC, mapping_id ASC`);
  return result.rows.map(mapIndexCatalogRow);
}

async function getIndexCatalogEntry(pool, mappingId) {
  const result = await pool.query(`SELECT * FROM index_catalog WHERE mapping_id = $1`, [mappingId]);
  return result.rows.length > 0 ? mapIndexCatalogRow(result.rows[0]) : null;
}

let cachedStaticUniverse = null;
function loadStaticSnapshotConstituents(tag) {
  if (!cachedStaticUniverse) {
    const raw = fs.readFileSync(path.join(__dirname, "..", "universe", "symbols.json"), "utf8");
    cachedStaticUniverse = JSON.parse(raw).symbols || [];
  }
  return cachedStaticUniverse
    .filter((entry) => entry.index === tag)
    .map((entry) => ({ code: entry.code, name: entry.name }));
}

// The one place "given this index, what are its current constituents" gets resolved —
// used both by handleWatchAlertsApi (to prove an index-watch is creatable) and
// run-watch-alerts.js (to re-scan an index-watch's membership every check cycle). Returns
// `{ code, name }[]`, uniformly regardless of whether the underlying source is a live AKShare
// fetch or symbols.json's static NASDAQ-100 snapshot.
async function resolveIndexConstituents(pool, mappingId) {
  const entry = await getIndexCatalogEntry(pool, mappingId);
  if (!entry || !entry.available) {
    throw new Error("不支持的指数，或者这个指数的成分股数据源还没接入。");
  }
  if (entry.fetchSource === "static_snapshot") {
    // Only NASDAQ-100 uses this path today — symbols.json tags its entries "ndx100".
    const rows = loadStaticSnapshotConstituents("ndx100");
    if (rows.length === 0) throw new Error("静态成分股快照为空。");
    return { entry, rows };
  }
  const bridgeResult = await runAkshareBridge("index_cons", { indexCode: entry.code });
  const rows = bridgeResult && Array.isArray(bridgeResult.rows) ? bridgeResult.rows : [];
  if (rows.length === 0) throw new Error("无法获取该指数的成分股列表。");
  return { entry, rows };
}

module.exports = {
  CATALOG_SEED,
  ensureIndexCatalogTable,
  listIndexCatalog,
  getIndexCatalogEntry,
  resolveIndexConstituents,
};
