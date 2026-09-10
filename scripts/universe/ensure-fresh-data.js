// Shared "is this symbol's daily_prices history current, and if not, refresh it" helper,
// used by both run-optimization-scan.js and run-universe-validation.js so a batch run
// doesn't silently compute against stale history just because nobody re-ran
// fetch-history.js recently. Refreshing goes through the server's own /api/klines endpoint
// (same upstream EastMoney/AKShare/Yahoo fallback chain + persistKlineData upsert the live
// app uses), not duplicated fetch logic here.

const http = require("http");

const BASE_URL = process.env.AI_TRADE_BASE_URL || "http://127.0.0.1:3000";
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

function isoFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function previousWeekdayIso(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return isoFromDate(d);
}

function expectedLatestTradeDateIso(dbMarket, now = new Date()) {
  const utcDay = now.getUTCDay();
  if (utcDay === 0 || utcDay === 6) return previousWeekdayIso(now);

  const today = isoFromDate(now);
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const market = String(dbMarket || "").toUpperCase();
  // Daily bars are only considered due after a conservative post-close buffer.
  // US: 23:00 UTC covers both EDT and EST close plus vendor lag.
  // CN: 08:30 UTC is after the 15:00 China close, again with a small buffer.
  const cutoffUtcHour = market === "US" ? 23 : 8.5;
  return utcHour >= cutoffUtcHour ? today : previousWeekdayIso(now);
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

// Checks daily_prices for the symbol's newest stored trade_date; if the database is already
// current for the latest market day that should be available, does nothing. Otherwise calls
// /api/klines for the short gap since the last stored row. persistKlineData's ON CONFLICT
// upsert makes re-requesting already-current days a harmless no-op.
async function ensureFreshData(pool, symbolCode, dbMarket) {
  const result = await pool.query(
    "SELECT MAX(trade_date) AS last_date FROM daily_prices WHERE symbol = $1 AND market = $2",
    [symbolCode, dbMarket]
  );
  const lastDate = result.rows[0] && result.rows[0].last_date
    ? result.rows[0].last_date.toISOString().slice(0, 10)
    : null;
  const today = todayIso();
  const expectedLatestDate = expectedLatestTradeDateIso(dbMarket);
  if (lastDate && lastDate >= expectedLatestDate) {
    return { refreshed: false, lastDate, expectedLatestDate };
  }

  const start = lastDate ? shiftIsoDate(lastDate, -3) : shiftIsoDate(today, -30);
  try {
    await fetchJson(`/api/klines?code=${encodeURIComponent(symbolCode)}&start=${start}&end=${today}`);
    await sleep(POST_REFRESH_DELAY_MS);
    return { refreshed: true, lastDate, expectedLatestDate };
  } catch (error) {
    console.error(`[warn] failed to refresh ${symbolCode} (last stored date: ${lastDate || "none"}): ${error.message}`);
    return { refreshed: false, lastDate, expectedLatestDate, error: error.message };
  }
}

module.exports = { ensureFreshData };
