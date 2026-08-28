// Index mapping table — the single source of truth for "what indices can a 指数盯盘 watch
// (or AI 验证搜索's 按指数搜索) target, and how do we resolve each one's CURRENT constituent
// list." Backed by two DB tables (see server.js's initializeDatabase, which calls
// ensureIndexCatalogTable on every startup) so both are queryable directly via SQL/admin
// tools, not just hardcoded JS:
//
//   - index_catalog: metadata (one row per index — name/code/publisher/fetch strategy), seeded
//     from CATALOG_SEED below on every startup.
//   - index_constituents: a CACHE of each index's current member list, refreshed once every 24
//     hours by scripts/universe/refresh-index-catalog.js (host-cron driven, see that script's
//     header). Watches/searches read from this cache instead of hitting AKShare on every single
//     check — an index's membership essentially never changes intraday, so re-fetching it live
//     on every 15-30 minute watch-check cycle would just be wasted AKShare calls. If the cache
//     is empty or badly stale (the daily cron missed >48h somehow), resolveIndexConstituents
//     falls back to a live fetch so the system still works, it's just slower that one time.
//
// Every code in CATALOG_SEED below was verified LIVE against AKShare/csindex.com.cn on
// 2026-08-28 before being trusted — index codes are opaque and easy to mix up (e.g. 930713
// "中证人工智能主题指数" vs 931071 "中证人工智能产业指数" are two different indices that both
// plausibly match a vague name search).
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

// If the daily refresh cron has missed more than this, resolveIndexConstituents stops trusting
// the cache and falls back to a live fetch rather than silently serving very stale data.
const MAX_CACHE_AGE_MS = 48 * 60 * 60 * 1000;

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS index_constituents (
      mapping_id TEXT PRIMARY KEY REFERENCES index_catalog(mapping_id) ON DELETE CASCADE,
      constituents JSONB NOT NULL DEFAULT '[]'::jsonb,
      refreshed_at TIMESTAMPTZ,
      last_error TEXT NOT NULL DEFAULT ''
    );
  `);
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
  const result = await pool.query(`
    SELECT ic.*, con.refreshed_at AS constituents_refreshed_at, con.last_error AS constituents_last_error,
      jsonb_array_length(COALESCE(con.constituents, '[]'::jsonb)) AS cached_count
    FROM index_catalog ic
    LEFT JOIN index_constituents con ON con.mapping_id = ic.mapping_id
    ORDER BY ic.market ASC, ic.mapping_id ASC
  `);
  return result.rows.map((row) => ({
    ...mapIndexCatalogRow(row),
    constituentsRefreshedAt: row.constituents_refreshed_at ? new Date(row.constituents_refreshed_at).toISOString() : null,
    constituentsLastError: row.constituents_last_error || "",
    cachedCount: row.cached_count || 0,
  }));
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

// Always does the real fetch (live AKShare call or static-snapshot read), bypassing the
// index_constituents cache entirely — used by resolveIndexConstituents's cache-miss/stale
// fallback, and by scripts/universe/refresh-index-catalog.js's daily cron refresh.
async function fetchIndexConstituentsFromSource(entry) {
  if (entry.fetchSource === "static_snapshot") {
    // Only NASDAQ-100 uses this path today — symbols.json tags its entries "ndx100".
    const rows = loadStaticSnapshotConstituents("ndx100");
    if (rows.length === 0) throw new Error("静态成分股快照为空。");
    return rows;
  }
  const bridgeResult = await runAkshareBridge("index_cons", { indexCode: entry.code });
  const rows = bridgeResult && Array.isArray(bridgeResult.rows) ? bridgeResult.rows : [];
  if (rows.length === 0) throw new Error("无法获取该指数的成分股列表。");
  return rows;
}

// Unconditionally refreshes one index's cached constituent list (used by the daily cron script,
// and by resolveIndexConstituents to opportunistically populate the cache on a miss). Records
// last_error on failure instead of throwing, so a scheduled bulk refresh over all indices can
// keep going past one bad index — the CALLER decides whether a failure should be fatal.
async function refreshIndexConstituentsCache(pool, entry) {
  try {
    const rows = await fetchIndexConstituentsFromSource(entry);
    await pool.query(`
      INSERT INTO index_constituents (mapping_id, constituents, refreshed_at, last_error)
      VALUES ($1, $2::jsonb, NOW(), '')
      ON CONFLICT (mapping_id) DO UPDATE SET
        constituents = EXCLUDED.constituents, refreshed_at = NOW(), last_error = ''
    `, [entry.mappingId, JSON.stringify(rows)]);
    return { ok: true, count: rows.length, rows };
  } catch (error) {
    await pool.query(`
      INSERT INTO index_constituents (mapping_id, refreshed_at, last_error)
      VALUES ($1, NULL, $2)
      ON CONFLICT (mapping_id) DO UPDATE SET last_error = EXCLUDED.last_error
    `, [entry.mappingId, String(error.message || error).slice(0, 500)]);
    return { ok: false, error: error.message || String(error) };
  }
}

// The one place "given this index, what are its current constituents" gets resolved — used by
// handleWatchAlertsApi (指数盯盘 creation), run-watch-alerts.js (每周期重新扫描), and AI 验证
// 搜索's 按指数搜索. Reads from the index_constituents cache when it's fresh; falls back to a
// live fetch (and opportunistically populates the cache) on a cold/stale cache so the feature
// still works correctly even before the first daily refresh has run. Returns
// `{ entry, rows: {code, name}[] }`.
async function resolveIndexConstituents(pool, mappingId) {
  const entry = await getIndexCatalogEntry(pool, mappingId);
  if (!entry || !entry.available) {
    throw new Error("不支持的指数，或者这个指数的成分股数据源还没接入。");
  }

  const cacheResult = await pool.query(
    `SELECT constituents, refreshed_at FROM index_constituents WHERE mapping_id = $1`,
    [mappingId]
  );
  const cacheRow = cacheResult.rows[0];
  if (cacheRow && cacheRow.refreshed_at) {
    const ageMs = Date.now() - new Date(cacheRow.refreshed_at).getTime();
    const cachedRows = Array.isArray(cacheRow.constituents) ? cacheRow.constituents : [];
    if (ageMs <= MAX_CACHE_AGE_MS && cachedRows.length > 0) {
      return { entry, rows: cachedRows };
    }
  }

  // Cold or stale cache — fetch live and opportunistically fill the cache so the next call
  // (and tomorrow's cron) has something fresh to work from immediately.
  const refreshResult = await refreshIndexConstituentsCache(pool, entry);
  if (!refreshResult.ok) {
    throw new Error(refreshResult.error || "无法获取该指数的成分股列表。");
  }
  return { entry, rows: refreshResult.rows };
}

module.exports = {
  CATALOG_SEED,
  ensureIndexCatalogTable,
  listIndexCatalog,
  getIndexCatalogEntry,
  fetchIndexConstituentsFromSource,
  refreshIndexConstituentsCache,
  resolveIndexConstituents,
};
