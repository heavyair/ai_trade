const http = require("http");

const PORT = Number(process.env.TWS_AGENT_PORT || 7077);
const TWS_HOST = process.env.TWS_HOST || "127.0.0.1";
const TWS_PORT = Number(process.env.TWS_PORT || 7497);
const TWS_CLIENT_ID = Number(process.env.TWS_CLIENT_ID || 77);
const EXECUTION_ENABLED = String(process.env.TWS_AGENT_EXECUTION_ENABLED || "").toLowerCase() === "true";

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload || {});
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function normalizeOrderIntent(raw) {
  const intent = raw && raw.intent ? raw.intent : {};
  const side = String(intent.side || "").toUpperCase();
  const symbol = String(intent.symbol || "").trim().toUpperCase();
  const quantity = Math.floor(Number(intent.quantity) || 0);
  const limitPrice = Number(intent.limitPrice);
  const orderType = String(intent.orderType || "LMT").trim().toUpperCase();
  const timeInForce = String(intent.timeInForce || "DAY").trim().toUpperCase();
  if (side !== "BUY" && side !== "SELL") throw new Error("side must be buy or sell");
  if (!symbol) throw new Error("symbol is required");
  if (quantity <= 0) throw new Error("quantity must be positive");
  if (orderType !== "LMT") throw new Error("first phase only supports LMT orders");
  if (!(limitPrice > 0)) throw new Error("limitPrice must be positive");
  return {
    id: String(intent.id || ""),
    accountId: String(intent.brokerAccountId || ""),
    symbol,
    side,
    quantity,
    orderType,
    limitPrice,
    timeInForce,
    outsideRth: Boolean(intent.outsideRth),
  };
}

async function handleOrder(req, res) {
  const body = await readBody(req);
  const payload = body ? JSON.parse(body) : {};
  const order = normalizeOrderIntent(payload);
  if (!EXECUTION_ENABLED) {
    sendJson(res, 409, {
      error: "TWS agent execution is disabled. Set TWS_AGENT_EXECUTION_ENABLED=true only after paper-account testing.",
      order,
      tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
    });
    return;
  }
  sendJson(res, 501, {
    error: "TWS socket adapter is not installed in this agent yet.",
    order,
    tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        executionEnabled: EXECUTION_ENABLED,
        tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/orders") {
      await handleOrder(req, res);
      return;
    }
    sendJson(res, 404, { error: "not found" });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "request failed" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`IBKR TWS agent stub listening on http://127.0.0.1:${PORT}`);
  console.log(`TWS target ${TWS_HOST}:${TWS_PORT}, clientId=${TWS_CLIENT_ID}, execution=${EXECUTION_ENABLED ? "enabled" : "disabled"}`);
});
