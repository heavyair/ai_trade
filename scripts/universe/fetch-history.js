// Batch-fetches N years of daily history for every symbol in universe/symbols.json
// by calling this server's own /api/klines endpoint (same endpoint the live app uses),
// which already persists rows into the symbols/daily_prices Postgres tables
// (see persistKlineData in server.js). Safe to re-run: the DB upsert is idempotent
// and this script skips symbols already marked "ok" in the state file, so an
// interrupted run can just be restarted.
//
// Usage: node scripts/universe/fetch-history.js [years]
//   years defaults to 5.
//
// Intended to run on the production host itself (calls http://127.0.0.1:3000),
// so it shares the server's existing EastMoney/AKShare/Yahoo fallback chain.

const fs = require("fs");
const path = require("path");
const http = require("http");

const YEARS = Math.max(1, Number(process.argv[2]) || 5);
const BASE_URL = process.env.AI_TRADE_BASE_URL || "http://127.0.0.1:3000";
const REQUEST_DELAY_MS = Number(process.env.FETCH_DELAY_MS || 2500);
const MAX_ATTEMPTS = 3;

const SYMBOLS_PATH = path.join(__dirname, "symbols.json");
const STATE_PATH = path.join(__dirname, "fetch-history.state.json");

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function yearsAgoIso(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
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
    req.setTimeout(60000, () => req.destroy(new Error("request timed out")));
  });
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch (error) {
    console.warn(`state file unreadable, starting fresh: ${error.message}`);
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function fetchOne(symbol, start, end) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const query = `/api/klines?code=${encodeURIComponent(symbol.code)}&start=${start}&end=${end}`;
      const result = await fetchJson(query);
      const rowCount = Array.isArray(result.rows) ? result.rows.length : 0;
      return { ok: true, rowCount, source: result.source || "" };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(REQUEST_DELAY_MS * attempt * 2);
      }
    }
  }
  return { ok: false, error: lastError ? lastError.message : "unknown error" };
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(SYMBOLS_PATH, "utf8"));
  const symbols = manifest.symbols;
  const start = yearsAgoIso(YEARS);
  const end = todayIso();
  const state = loadState();

  console.log(`fetching ${symbols.length} symbols, ${start} to ${end}, base=${BASE_URL}`);

  let done = 0;
  let okCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const symbol of symbols) {
    const key = `${symbol.market}:${symbol.code}`;
    done += 1;

    if (state[key] && state[key].ok) {
      skipCount += 1;
      console.log(`[${done}/${symbols.length}] SKIP ${key} (already fetched: ${state[key].rowCount} rows)`);
      continue;
    }

    const result = await fetchOne(symbol, start, end);
    state[key] = { ...result, fetchedAt: new Date().toISOString() };
    saveState(state);

    if (result.ok) {
      okCount += 1;
      console.log(`[${done}/${symbols.length}] OK   ${key} rows=${result.rowCount} source=${result.source}`);
    } else {
      failCount += 1;
      console.log(`[${done}/${symbols.length}] FAIL ${key} error=${result.error}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\ndone. ok=${okCount} fail=${failCount} skip=${skipCount} total=${symbols.length}`);
  const failed = Object.entries(state).filter(([, value]) => !value.ok).map(([key]) => key);
  if (failed.length > 0) {
    console.log(`failed symbols (re-run this script to retry): ${failed.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
