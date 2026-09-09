const http = require("http");
const { IBApi, EventName, SecType, OrderAction, OrderType } = require("@stoqey/ib");

const PORT = Number(process.env.TWS_AGENT_PORT || 7077);
const TWS_HOST = process.env.TWS_HOST || "127.0.0.1";
const TWS_PORT = Number(process.env.TWS_PORT || 4002);
const TWS_CLIENT_ID = Number(process.env.TWS_CLIENT_ID || 77);
const EXECUTION_ENABLED = String(process.env.TWS_AGENT_EXECUTION_ENABLED || "").toLowerCase() === "true";
const TWS_CONNECT_TIMEOUT_MS = Number(process.env.TWS_CONNECT_TIMEOUT_MS || 10000);
const TWS_ORDER_TIMEOUT_MS = Number(process.env.TWS_ORDER_TIMEOUT_MS || 15000);
const TWS_CANCEL_TIMEOUT_MS = Number(process.env.TWS_CANCEL_TIMEOUT_MS || 15000);

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

function createIbClient() {
  return new IBApi({
    host: TWS_HOST,
    port: TWS_PORT,
    clientId: TWS_CLIENT_ID,
  });
}

function disconnectQuietly(ib) {
  try {
    ib.disconnect();
  } catch (error) {
    // Best effort cleanup after socket errors/timeouts.
  }
}

function withTimeout(ms, message, cleanup) {
  let timer;
  const promise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (cleanup) cleanup();
      reject(new Error(message));
    }, ms);
  });
  return {
    promise,
    cancel() {
      clearTimeout(timer);
    },
  };
}

function checkTwsConnection() {
  const ib = createIbClient();
  const timeout = withTimeout(TWS_CONNECT_TIMEOUT_MS, `Timed out connecting to IB Gateway at ${TWS_HOST}:${TWS_PORT}`, () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.currentTime);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    ib.once(EventName.error, (err, code, reqId) => {
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}${Number.isFinite(reqId) ? ` reqId ${reqId}` : ""}`));
    });
    ib.once(EventName.currentTime, (time) => {
      cleanup();
      resolve({
        ok: true,
        serverTime: time,
        tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
      });
    });
    ib.once(EventName.connected, () => {
      ib.reqCurrentTime();
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

function submitLimitStockOrder(order) {
  const ib = createIbClient();
  const timeout = withTimeout(TWS_ORDER_TIMEOUT_MS, `Timed out submitting order to IB Gateway at ${TWS_HOST}:${TWS_PORT}`, () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    let submittedOrderId = null;
    let resolved = false;
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.nextValidId);
      ib.removeAllListeners(EventName.orderStatus);
      ib.removeAllListeners(EventName.openOrder);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    const finish = (payload) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(payload);
    };

    ib.once(EventName.error, (err, code, reqId) => {
      if (submittedOrderId !== null && reqId !== submittedOrderId && code) return;
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}${Number.isFinite(reqId) ? ` reqId ${reqId}` : ""}`));
    });
    ib.once(EventName.nextValidId, (orderId) => {
      submittedOrderId = Number(orderId);
      const contract = {
        symbol: order.symbol,
        secType: SecType.STK,
        exchange: "SMART",
        currency: "USD",
      };
      const ibOrder = {
        orderId: submittedOrderId,
        action: order.side === "BUY" ? OrderAction.BUY : OrderAction.SELL,
        orderType: OrderType.LMT,
        totalQuantity: order.quantity,
        lmtPrice: order.limitPrice,
        tif: order.timeInForce,
        outsideRth: order.outsideRth,
        transmit: true,
        orderRef: order.id ? `ai_trade:${order.id}` : "ai_trade",
      };
      if (order.accountId) ibOrder.account = order.accountId;
      ib.placeOrder(submittedOrderId, contract, ibOrder);
    });
    ib.on(EventName.openOrder, (orderId) => {
      if (Number(orderId) === submittedOrderId) {
        finish({ orderId: String(orderId), status: "OpenOrderAccepted" });
      }
    });
    ib.on(EventName.orderStatus, (orderId, status) => {
      if (Number(orderId) === submittedOrderId) {
        finish({ orderId: String(orderId), status: String(status || "Submitted") });
      }
    });
    ib.once(EventName.connected, () => {
      ib.reqIds(1);
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

function cancelOrder(orderId) {
  const numericOrderId = Math.floor(Number(orderId));
  if (!(numericOrderId > 0)) throw new Error("orderId must be positive");
  const ib = createIbClient();
  const timeout = withTimeout(TWS_CANCEL_TIMEOUT_MS, `Timed out cancelling order ${numericOrderId} at IB Gateway`, () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    let resolved = false;
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.orderStatus);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    const finish = (payload) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(payload);
    };

    ib.once(EventName.error, (err, code, reqId) => {
      if (Number(reqId) === numericOrderId && Number(code) === 202) {
        finish({ orderId: String(numericOrderId), status: "Cancelled" });
        return;
      }
      if (Number(reqId) !== numericOrderId && code) return;
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}${Number.isFinite(reqId) ? ` reqId ${reqId}` : ""}`));
    });
    ib.on(EventName.orderStatus, (seenOrderId, status) => {
      if (Number(seenOrderId) === numericOrderId && String(status || "").toLowerCase() === "cancelled") {
        finish({ orderId: String(seenOrderId), status: String(status || "Cancelled") });
      }
    });
    ib.once(EventName.connected, () => {
      ib.cancelOrder(numericOrderId);
      setTimeout(() => finish({ orderId: String(numericOrderId), status: "CancelRequested" }), 5000);
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

async function handleTwsHealth(req, res) {
  const result = await checkTwsConnection();
  sendJson(res, 200, {
    ...result,
    executionEnabled: EXECUTION_ENABLED,
  });
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
  const brokerOrder = await submitLimitStockOrder(order);
  sendJson(res, 200, brokerOrder);
}

async function handleCancelOrder(req, res) {
  const body = await readBody(req);
  const payload = body ? JSON.parse(body) : {};
  if (!EXECUTION_ENABLED) {
    sendJson(res, 409, {
      error: "TWS agent execution is disabled. Set TWS_AGENT_EXECUTION_ENABLED=true only after paper-account testing.",
      tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
    });
    return;
  }
  const result = await cancelOrder(payload.orderId);
  sendJson(res, 200, result);
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
    if (req.method === "GET" && url.pathname === "/tws-health") {
      await handleTwsHealth(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/orders") {
      await handleOrder(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/orders/cancel") {
      await handleCancelOrder(req, res);
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
