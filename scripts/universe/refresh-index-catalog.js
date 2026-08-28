// Refreshes the index_constituents cache (scripts/shared/index-catalog.js) for every available
// entry in index_catalog. Run once every 24 hours via host cron — see the crontab entry
// alongside run-watch-alerts.js's ("*/15 * * * *") on the production host. Index membership
// essentially never changes intraday (CSI/国证/深证 rebalances are semi-annual/annual events),
// so refreshing daily keeps 指数盯盘 and AI 验证搜索's 按指数搜索 fast (they read the cache
// instead of spawning an AKShare subprocess on every single check/run) while still picking up
// a rebalance within a day of it happening, instead of freezing membership indefinitely.
//
// Usage: node scripts/universe/refresh-index-catalog.js   (no args — refreshes every available index)

const { Pool } = require("pg");
const { listIndexCatalog, refreshIndexConstituentsCache } = require("../shared/index-catalog.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const catalog = await listIndexCatalog(pool);
  const available = catalog.filter((entry) => entry.available);
  console.log(`[refresh-index-catalog] ${available.length} available index(es)`);

  let ok = 0;
  let failed = 0;
  for (const entry of available) {
    const result = await refreshIndexConstituentsCache(pool, entry);
    if (result.ok) {
      ok += 1;
      console.log(`[refreshed] ${entry.mappingId} (${entry.officialName}): ${result.count} constituents`);
    } else {
      failed += 1;
      console.error(`[error] ${entry.mappingId} (${entry.officialName}): ${result.error}`);
    }
  }

  console.log(`[refresh-index-catalog] done. ok=${ok} failed=${failed}`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  try {
    await pool.end();
  } catch (endError) {
    // pool already closed or never opened — fine to ignore
  }
  process.exit(1);
});
