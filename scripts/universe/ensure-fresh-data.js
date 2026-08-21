// Shared "is this symbol's daily_prices history current, and if not, refresh it" helper,
// used by both run-optimization-scan.js and run-universe-validation.js so a batch run
// doesn't silently compute against stale history just because nobody re-ran
// fetch-history.js recently. Refreshing goes through the server's own /api/klines endpoint
// (same upstream EastMoney/AKShare/Yahoo fallback chain + persistKlineData upsert the live
// app uses), not duplicated fetch logic here.

const http = require("http");

const BASE_URL = process.env.AI_TRADE_BASE_URL || "http://127.0.0.1:3000";
// Generous enough to cover weekends/holidays without needing a real trading calendar — if
// the newest stored row is within this many days of today, treat it as current and skip
// the much more expensive live fetch.
const STALE_TOLERANCE_DAYS = 4;
const REQUEST_TIMEOUT_MS = 30000;
// Only applied after an actual live fetch (not on every symbol — most symbols will already
// be fresh and skip straight past this), so a run that hits a lot of stale symbols at once
// doesn't burst-hammer the upstream data provider.
const POST_REFRESH_DELAY_MS = 750;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function shiftIsoDate(iso, deltaDays) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function daysBetween(isoA, isoB) {
  const a = new Date(`${isoA}T00:00:00Z`);
  const b = new Date(`${isoB}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(pathAndQuery) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathAndQuery, BASE_URL);
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (error) {
          reject(new Error(`invalid JSON response: ${error.message}`));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          return;
        }
        resolve(parsed);
      });
    });
    req.on("error", reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("request timed out")));
  });
}

// Checks daily_prices for the symbol's newest stored trade_date; if it's already within
// tolerance of today, does nothing. Otherwise calls /api/klines for the (short) gap since
// the last stored row — persistKlineData's ON CONFLICT upsert makes re-requesting
// already-current days a harmless no-op, so this is safe to call unconditionally per symbol.
async function ensureFreshData(pool, symbolCode, dbMarket) {
  const result = await pool.query(
    "SELECT MAX(trade_date) AS last_date FROM daily_prices WHERE symbol = $1 AND market = $2",
    [symbolCode, dbMarket]
  );
  const lastDate = result.rows[0] && result.rows[0].last_date
    ? result.rows[0].last_date.toISOString().slice(0, 10)
    : null;
  const today = todayIso();
  if (lastDate && daysBetween(lastDate, today) <= STALE_TOLERANCE_DAYS) {
    return { refreshed: false, lastDate };
  }

  const start = lastDate ? shiftIsoDate(lastDate, -3) : shiftIsoDate(today, -30);
  try {
    await fetchJson(`/api/klines?code=${encodeURIComponent(symbolCode)}&start=${start}&end=${today}`);
    await sleep(POST_REFRESH_DELAY_MS);
    return { refreshed: true, lastDate };
  } catch (error) {
    console.error(`[warn] failed to refresh ${symbolCode} (last stored date: ${lastDate || "none"}): ${error.message}`);
    return { refreshed: false, lastDate, error: error.message };
  }
}

module.exports = { ensureFreshData };
