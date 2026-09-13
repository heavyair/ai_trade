const http = require("http");

const BASE_URL = String(process.env.APP_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const SYMBOLS = String(process.env.SYMBOLS || "QQQ,AMD,NET")
  .split(",")
  .map((item) => item.trim().toUpperCase())
  .filter(Boolean);
const TIMEFRAME = String(process.env.TIMEFRAME || "5min").trim();
const DAYS = Math.max(1, Number(process.env.DAYS || 7));
const REFRESH = String(process.env.REFRESH || "").toLowerCase() === "true" || process.env.REFRESH === "1";

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function fetchJson(pathname) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, BASE_URL);
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        let parsed = {};
        try {
          parsed = body ? JSON.parse(body) : {};
        } catch (error) {
          reject(new Error(`Invalid JSON from ${url}: ${body.slice(0, 160)}`));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(parsed.error || `HTTP ${res.statusCode} from ${url}`));
          return;
        }
        resolve(parsed);
      });
    });
    req.setTimeout(180000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
    req.on("error", reject);
  });
}

async function main() {
  const end = new Date();
  const start = new Date(end.getTime() - DAYS * 24 * 60 * 60 * 1000);
  for (const symbol of SYMBOLS) {
    const url = new URL("/api/intraday-bars", BASE_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("timeframe", TIMEFRAME);
    url.searchParams.set("start", isoDate(start));
    url.searchParams.set("end", isoDate(end));
    url.searchParams.set("rthOnly", "1");
    if (REFRESH) url.searchParams.set("refresh", "1");
    const payload = await fetchJson(`${url.pathname}${url.search}`);
    console.log(`\n${symbol} ${payload.timeframe} ${payload.startDate}..${payload.endDate}`);
    console.log(`source=${payload.source} count=${payload.count} cacheHit=${payload.cache && payload.cache.hit}`);
    console.log(`first=${payload.firstBar ? `${payload.firstBar.datetime} close=${payload.firstBar.close}` : "none"}`);
    console.log(`last=${payload.lastBar ? `${payload.lastBar.datetime} close=${payload.lastBar.close}` : "none"}`);
    for (const day of payload.completeness || []) {
      console.log(`  ${day.date}: ${day.bars}/${day.expectedRegularBars} bars complete=${day.completeRegularSession}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
