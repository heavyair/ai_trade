// 批量抓取 symbols.json 里 50 只港股（恒生成分）的历史行情。
//
// 为什么单独写一个而不是复用 fetch-history.js：那个脚本按代码推断市场，而港股代码是 4 位数字
// （0700、9988），会被 inferMarket 当成深市 0 开头的 A 股。这里显式传 market=HK。
//
// 数据来源是 Yahoo（server.js 的 fetchYahooKlines）。东方财富从生产服务器的出口已被拦截
// ——push2 返回 302、push2his 返回空响应体，实测 A 股同一接口也拿不到数据，现有 A 股行情
// 能用是因为早已落库。所以港股只有 Yahoo 一条路，也因此没有估值数据（PE/PB 全为 null），
// 数据画像的 valuation 会是 null，提示词已说明此时不要设计依赖估值的规则。
//
// 用法（在生产机上跑，调本机 3000 端口）：
//   node scripts/universe/fetch-hk-history.js [years]
//   years 默认 6，跟 4 年训练 + 2 年验证的窗口对齐。

const fs = require("fs");
const path = require("path");
const http = require("http");

const YEARS = Math.max(1, Math.round(Number(process.argv[2]) || 6));
const HOST = process.env.APP_HOST || "127.0.0.1";
const PORT = Number(process.env.APP_PORT || 3000);
const STATE_FILE = path.join(__dirname, "..", "..", "data", "fetch-hk-history-state.json");

function loadUniverse() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "symbols.json"), "utf8"));
  const list = Array.isArray(raw) ? raw : (raw.symbols || []);
  return list.filter((item) => String(item.market || "").toUpperCase() === "HK");
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch (error) {
    return {};
  }
}

function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    // 状态文件只是为了断点续跑，写不进去不该让整个任务失败。
  }
}

function requestKlines(code, start, end) {
  const query = `/api/klines?code=${encodeURIComponent(code)}&market=HK&start=${start}&end=${end}`;
  return new Promise((resolve, reject) => {
    const req = http.get({ host: HOST, port: PORT, path: query, timeout: 120000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 160)}`)); return; }
        try { resolve(JSON.parse(body)); } catch (error) { reject(new Error("返回的不是合法 JSON")); }
      });
    });
    req.on("timeout", () => { req.destroy(new Error("请求超时")); });
    req.on("error", reject);
  });
}

async function main() {
  const symbols = loadUniverse();
  if (symbols.length === 0) {
    console.error("symbols.json 里没有 market=HK 的标的。");
    process.exit(1);
  }
  const end = new Date().toISOString().slice(0, 10);
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS);
  const start = startDate.toISOString().slice(0, 10);
  console.log(`港股标的 ${symbols.length} 个，区间 ${start} ~ ${end}`);

  const state = loadState();
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  for (let i = 0; i < symbols.length; i += 1) {
    const entry = symbols[i];
    const code = String(entry.code || "").trim();
    if (!code) continue;
    if (state[code] && state[code].status === "ok") { skipped += 1; continue; }
    try {
      const result = await requestKlines(code, start, end);
      const rows = Array.isArray(result.rows) ? result.rows.length : 0;
      state[code] = { status: rows > 0 ? "ok" : "empty", rows, name: result.name || "", at: new Date().toISOString() };
      if (rows > 0) ok += 1; else failed += 1;
      console.log(`[${i + 1}/${symbols.length}] ${code} ${result.name || ""} → ${rows} 行`);
    } catch (error) {
      failed += 1;
      state[code] = { status: "error", error: String(error.message || error).slice(0, 200), at: new Date().toISOString() };
      console.log(`[${i + 1}/${symbols.length}] ${code} 失败：${error.message}`);
    }
    saveState(state);
  }
  console.log(`\n完成：成功 ${ok}，失败/空 ${failed}，跳过(已抓过) ${skipped}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
