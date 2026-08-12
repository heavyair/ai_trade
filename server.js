const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function normalizeCode(code) {
  const value = String(code || "").trim();
  if (/^\d{6}$/.test(value)) {
    return value;
  }
  const ticker = value.toUpperCase();
  if (/^[A-Z][A-Z0-9.-]{0,15}$/.test(ticker)) {
    return ticker;
  }
  throw new Error("股票代码必须是 6 位 A 股代码，或美股 ticker，例如 NET、QQQ、AMD。");
}

function isChinaCode(code) {
  return /^\d{6}$/.test(code);
}

function normalizeDate(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error(`${fieldName} 必须是 YYYY-MM-DD 格式。`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} 不是有效日期。`);
  }
  return String(value);
}

function toEastMoneyDate(date) {
  return date.replace(/-/g, "");
}

function inferMarket(code) {
  if (/^[569]/.test(code)) return "1";
  if (/^[0123]/.test(code)) return "0";
  if (/^[48]/.test(code)) return "0";
  return "1";
}

function getMarketName(code, market) {
  if (market === "US") return "US";
  if (/^[48]/.test(code)) return "北京证券交易所";
  if (market === "1") return "上海证券交易所";
  return "深圳证券交易所";
}

function parseEastMoneyKlineRow(row) {
  const parts = row.split(",");
  return {
    date: parts[0],
    open: Number(parts[1]),
    close: Number(parts[2]),
    high: Number(parts[3]),
    low: Number(parts[4]),
    volume: Number(parts[5]),
    amount: Number(parts[6]),
    amplitude: Number(parts[7]),
    changePercent: Number(parts[8]),
    change: Number(parts[9]),
    turnover: Number(parts[10]),
  };
}

function isValidKlineRow(row) {
  return Number.isFinite(row.open)
    && Number.isFinite(row.close)
    && Number.isFinite(row.high)
    && Number.isFinite(row.low)
    && row.open > 0
    && row.close > 0
    && row.high > 0
    && row.low > 0;
}

function summarize(symbol, name, rows) {
  const highest = rows.reduce((best, item) => (item.high > best.high ? item : best), rows[0]);
  const lowest = rows.reduce((best, item) => (item.low < best.low ? item : best), rows[0]);
  const latest = rows[rows.length - 1];

  return {
    symbol,
    name,
    count: rows.length,
    startDate: rows[0].date,
    endDate: latest.date,
    highest: {
      date: highest.date,
      price: highest.high,
      close: highest.close,
    },
    lowest: {
      date: lowest.date,
      price: lowest.low,
      close: lowest.close,
    },
    latest: {
      date: latest.date,
      close: latest.close,
      changePercent: latest.changePercent,
    },
  };
}

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "http:" ? http : https;
    const req = client.get(url, { headers }, (response) => {
      let body = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`行情服务返回 HTTP ${response.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error("行情服务返回的数据不是有效 JSON。"));
        }
      });
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error("行情服务请求超时。"));
    });
    req.on("error", reject);
  });
}

async function getJsonWithRetry(urls, headers = {}, attempts = 1) {
  const candidates = Array.isArray(urls) ? urls : [urls];
  let lastError;

  for (const url of candidates) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await getJson(url, headers);
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
        }
      }
    }
  }

  throw lastError;
}

function buildEastMoneyUrls({ code, market, start, end }) {
  return ["https:", "http:"].map((protocol) => {
    const url = new URL(`${protocol}//push2his.eastmoney.com/api/qt/stock/kline/get`);
    url.searchParams.set("secid", `${market}.${code}`);
    url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
    url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61");
    url.searchParams.set("ut", "7eea3edcaed734bea9cbfc24409ed989");
    url.searchParams.set("klt", "101");
    url.searchParams.set("fqt", "1");
    url.searchParams.set("beg", toEastMoneyDate(start));
    url.searchParams.set("end", toEastMoneyDate(end));
    url.searchParams.set("_", String(Date.now()));
    return url;
  });
}

function toYahooSymbol(code, market) {
  if (market === "US") return code;
  if (market === "1") return `${code}.SS`;
  if (/^[48]/.test(code)) return `${code}.BJ`;
  return `${code}.SZ`;
}

function toUnixSeconds(date, isEnd = false) {
  const suffix = isEnd ? "T23:59:59Z" : "T00:00:00Z";
  return Math.floor(new Date(`${date}${suffix}`).getTime() / 1000);
}

function parseYahooRows(payload) {
  const result = payload && payload.chart && payload.chart.result && payload.chart.result[0];
  if (!result || !Array.isArray(result.timestamp)) return [];

  const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
  if (!quote) return [];

  return result.timestamp
    .map((timestamp, index) => {
      const row = {
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open: Number(quote.open[index]),
        close: Number(quote.close[index]),
        high: Number(quote.high[index]),
        low: Number(quote.low[index]),
        volume: Number(quote.volume[index] || 0),
        amount: 0,
        amplitude: 0,
        changePercent: 0,
        change: 0,
        turnover: 0,
      };

      if (index > 0 && Number.isFinite(row.close)) {
        const previousClose = Number(quote.close[index - 1]);
        if (Number.isFinite(previousClose) && previousClose !== 0) {
          row.change = row.close - previousClose;
          row.changePercent = (row.change / previousClose) * 100;
        }
      }

      return row;
    })
    .filter(isValidKlineRow);
}

async function fetchEastMoneyKlines({ code, market, start, end }) {
  const payload = await getJsonWithRetry(buildEastMoneyUrls({ code, market, start, end }), {
    "User-Agent": "Mozilla/5.0 A-share local dashboard",
    Referer: "https://quote.eastmoney.com/",
  });

  const data = payload && payload.data;
  if (!data || !Array.isArray(data.klines) || data.klines.length === 0) {
    throw new Error("没有查到该代码在所选时间区间内的日线数据。");
  }

  const rows = data.klines.map(parseEastMoneyKlineRow).filter(isValidKlineRow);

  if (rows.length === 0) {
    throw new Error("行情数据格式异常，无法计算最高和最低点。");
  }

  return {
    source: "EastMoney",
    name: data.name || "",
    info: {
      code,
      name: data.name || "",
      market,
      marketName: getMarketName(code, market),
      exchangeName: getMarketName(code, market),
      currency: "CNY",
      instrumentType: "EQUITY/FUND",
    },
    rows,
  };
}

async function fetchYahooKlines({ code, market, start, end }) {
  const symbol = toYahooSymbol(code, market);
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
  url.searchParams.set("period1", String(toUnixSeconds(start)));
  url.searchParams.set("period2", String(toUnixSeconds(end, true)));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "history");

  const payload = await getJsonWithRetry(url, {
    "User-Agent": "Mozilla/5.0 A-share local dashboard",
  });

  const rows = parseYahooRows(payload);
  if (rows.length === 0) {
    throw new Error("备用行情源也没有返回可用日线数据。");
  }

  const result = payload.chart.result[0];
  const meta = result.meta || {};
  return {
    source: "Yahoo Finance",
    name: meta.longName || meta.shortName || symbol,
    info: {
      code,
      symbol,
      name: meta.longName || meta.shortName || symbol,
      market,
      marketName: "US",
      exchangeName: meta.fullExchangeName || meta.exchangeName || meta.exchange || "--",
      currency: meta.currency || "--",
      instrumentType: meta.instrumentType || "--",
      timezone: meta.timezone || meta.exchangeTimezoneName || "",
    },
    rows,
  };
}

async function fetchKlines({ code, start, end }) {
  const market = isChinaCode(code) ? inferMarket(code) : "US";
  let result;

  if (market === "US") {
    result = await fetchYahooKlines({ code, market, start, end });
  } else {
    try {
      result = await fetchEastMoneyKlines({ code, market, start, end });
    } catch (eastMoneyError) {
      result = await fetchYahooKlines({ code, market, start, end });
    }
  }

  return {
    source: result.source,
    code,
    market,
    name: result.name,
    info: {
      code,
      name: result.name,
      market,
      marketName: getMarketName(code, market),
      source: result.source,
      ...(result.info || {}),
    },
    summary: summarize({ code, market, name: result.name }, result.name, result.rows),
    rows: result.rows,
  };
}

async function handleApi(req, res, requestUrl) {
  try {
    const code = normalizeCode(requestUrl.searchParams.get("code") || "513100");
    const start = normalizeDate(requestUrl.searchParams.get("start"), "开始日期");
    const end = normalizeDate(requestUrl.searchParams.get("end"), "结束日期");

    if (new Date(start) > new Date(end)) {
      throw new Error("开始日期不能晚于结束日期。");
    }

    const result = await fetchKlines({ code, start, end });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "请求失败。" });
  }
}

function serveStatic(req, res, requestUrl) {
  const requestPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decoded = decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decoded));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/api/klines") {
    handleApi(req, res, requestUrl);
    return;
  }

  serveStatic(req, res, requestUrl);
});

server.listen(PORT, () => {
  console.log(`A-share app running at http://localhost:${PORT}`);
});
