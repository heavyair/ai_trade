const http = require("http");
const { IBApi, EventName, SecType, OrderAction, OrderType } = require("@stoqey/ib");

const PORT = Number(process.env.TWS_AGENT_PORT || 7077);
const TWS_HOST = process.env.TWS_HOST || "127.0.0.1";
const TWS_PORT = Number(process.env.TWS_PORT || 4002);
const TWS_CLIENT_ID = Number(process.env.TWS_CLIENT_ID || 77);
let executionEnabled = String(process.env.TWS_AGENT_EXECUTION_ENABLED || "").toLowerCase() === "true";
const TWS_CONNECT_TIMEOUT_MS = Number(process.env.TWS_CONNECT_TIMEOUT_MS || 10000);
const TWS_ORDER_TIMEOUT_MS = Number(process.env.TWS_ORDER_TIMEOUT_MS || 15000);
const TWS_CANCEL_TIMEOUT_MS = Number(process.env.TWS_CANCEL_TIMEOUT_MS || 15000);
const TWS_ACCOUNT_TIMEOUT_MS = Number(process.env.TWS_ACCOUNT_TIMEOUT_MS || 15000);

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

function defaultTwsConfig() {
  return {
    host: TWS_HOST,
    port: TWS_PORT,
    clientId: TWS_CLIENT_ID,
  };
}

function normalizeTwsConfig(raw = {}) {
  const host = String(raw.host || TWS_HOST).trim() || TWS_HOST;
  const port = Math.round(Number(raw.port || TWS_PORT));
  const clientId = Math.round(Number(raw.clientId || TWS_CLIENT_ID));
  if (!(port > 0 && port <= 65535)) throw new Error("TWS port is invalid");
  if (!(clientId >= 0 && clientId <= 999999)) throw new Error("TWS clientId is invalid");
  return { host, port, clientId };
}

function twsConfigFromUrl(url) {
  return normalizeTwsConfig({
    host: url.searchParams.get("host") || TWS_HOST,
    port: url.searchParams.get("port") || TWS_PORT,
    clientId: url.searchParams.get("clientId") || TWS_CLIENT_ID,
  });
}

function createIbClient(config = defaultTwsConfig(), clientIdOffset = 0) {
  const tws = normalizeTwsConfig(config);
  return new IBApi({
    host: tws.host,
    port: tws.port,
    clientId: tws.clientId + clientIdOffset,
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

function isIgnorableIbErrorCode(code) {
  return [2104, 2106, 2107, 2108, 2158].includes(Number(code));
}

function normalizeContract(contract) {
  return {
    symbol: contract && contract.symbol ? String(contract.symbol) : "",
    secType: contract && contract.secType ? String(contract.secType) : "",
    exchange: contract && contract.exchange ? String(contract.exchange) : "",
    currency: contract && contract.currency ? String(contract.currency) : "",
    primaryExch: contract && contract.primaryExch ? String(contract.primaryExch) : "",
    conId: contract && contract.conId !== undefined ? Number(contract.conId) : null,
  };
}

function checkTwsConnection(config = defaultTwsConfig()) {
  const tws = normalizeTwsConfig(config);
  const ib = createIbClient(tws);
  const timeout = withTimeout(TWS_CONNECT_TIMEOUT_MS, `Timed out connecting to IB Gateway at ${tws.host}:${tws.port}`, () => disconnectQuietly(ib));

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
        tws,
      });
    });
    ib.once(EventName.connected, () => {
      ib.reqCurrentTime();
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

function submitLimitStockOrder(order, config = defaultTwsConfig()) {
  const tws = normalizeTwsConfig(config);
  const ib = createIbClient(tws);
  const timeout = withTimeout(TWS_ORDER_TIMEOUT_MS, `Timed out submitting order to IB Gateway at ${tws.host}:${tws.port}`, () => disconnectQuietly(ib));

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

function fetchAccountSummary(config = defaultTwsConfig()) {
  const ib = createIbClient(config, 1);
  const reqId = 9101;
  const tags = [
    "NetLiquidation",
    "TotalCashValue",
    "AvailableFunds",
    "BuyingPower",
    "InitMarginReq",
    "MaintMarginReq",
    "GrossPositionValue",
    "UnrealizedPnL",
    "RealizedPnL",
  ].join(",");
  const timeout = withTimeout(TWS_ACCOUNT_TIMEOUT_MS, "Timed out reading IBKR account summary", () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    const rows = [];
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.accountSummary);
      ib.removeAllListeners(EventName.accountSummaryEnd);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    ib.on(EventName.error, (err, code, seenReqId) => {
      if (isIgnorableIbErrorCode(code)) return;
      if (Number.isFinite(seenReqId) && Number(seenReqId) !== -1 && Number(seenReqId) !== reqId) return;
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}`));
    });
    ib.on(EventName.accountSummary, (seenReqId, account, tag, value, currency) => {
      if (Number(seenReqId) !== reqId) return;
      rows.push({ account: String(account || ""), tag: String(tag || ""), value: String(value || ""), currency: String(currency || "") });
    });
    ib.once(EventName.accountSummaryEnd, (seenReqId) => {
      if (Number(seenReqId) !== reqId) return;
      cleanup();
      resolve(rows);
    });
    ib.once(EventName.connected, () => {
      ib.reqAccountSummary(reqId, "All", tags);
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

function fetchPositions(config = defaultTwsConfig()) {
  const ib = createIbClient(config, 2);
  const timeout = withTimeout(TWS_ACCOUNT_TIMEOUT_MS, "Timed out reading IBKR positions", () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    const rows = [];
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.position);
      ib.removeAllListeners(EventName.positionEnd);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    ib.on(EventName.error, (err, code, reqId) => {
      if (isIgnorableIbErrorCode(code)) return;
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}${Number.isFinite(reqId) ? ` reqId ${reqId}` : ""}`));
    });
    ib.on(EventName.position, (account, contract, pos, avgCost) => {
      if (Number(pos) === 0) return;
      rows.push({
        account: String(account || ""),
        contract: normalizeContract(contract),
        position: Number(pos) || 0,
        avgCost: avgCost === undefined ? null : Number(avgCost),
      });
    });
    ib.once(EventName.positionEnd, () => {
      cleanup();
      resolve(rows);
    });
    ib.once(EventName.connected, () => {
      ib.reqPositions();
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

function fetchOpenOrders(config = defaultTwsConfig()) {
  const ib = createIbClient(config, 3);
  const timeout = withTimeout(TWS_ACCOUNT_TIMEOUT_MS, "Timed out reading IBKR open orders", () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    const rows = [];
    const statuses = new Map();
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.openOrder);
      ib.removeAllListeners(EventName.openOrderEnd);
      ib.removeAllListeners(EventName.orderStatus);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    ib.on(EventName.error, (err, code, reqId) => {
      if (isIgnorableIbErrorCode(code)) return;
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}${Number.isFinite(reqId) ? ` reqId ${reqId}` : ""}`));
    });
    ib.on(EventName.orderStatus, (orderId, status, filled, remaining, avgFillPrice) => {
      statuses.set(Number(orderId), {
        status: String(status || ""),
        filled: Number(filled) || 0,
        remaining: Number(remaining) || 0,
        avgFillPrice: Number(avgFillPrice) || 0,
      });
    });
    ib.on(EventName.openOrder, (orderId, contract, order, orderState) => {
      const status = statuses.get(Number(orderId)) || {};
      rows.push({
        orderId: String(orderId),
        account: String((order && order.account) || ""),
        contract: normalizeContract(contract),
        action: String((order && order.action) || ""),
        orderType: String((order && order.orderType) || ""),
        totalQuantity: Number(order && order.totalQuantity) || 0,
        limitPrice: order && order.lmtPrice !== undefined ? Number(order.lmtPrice) : null,
        tif: String((order && order.tif) || ""),
        status: String((orderState && orderState.status) || status.status || ""),
        filled: status.filled || 0,
        remaining: status.remaining || 0,
        avgFillPrice: status.avgFillPrice || 0,
        orderRef: String((order && order.orderRef) || ""),
      });
    });
    ib.once(EventName.openOrderEnd, () => {
      cleanup();
      resolve(rows);
    });
    ib.once(EventName.connected, () => {
      ib.reqAllOpenOrders();
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

function fetchExecutions(config = defaultTwsConfig()) {
  const ib = createIbClient(config, 4);
  const reqId = 9102;
  const timeout = withTimeout(TWS_ACCOUNT_TIMEOUT_MS, "Timed out reading IBKR executions", () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    const rows = [];
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.execDetails);
      ib.removeAllListeners(EventName.execDetailsEnd);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    ib.on(EventName.error, (err, code, seenReqId) => {
      if (isIgnorableIbErrorCode(code)) return;
      if (Number.isFinite(seenReqId) && Number(seenReqId) !== -1 && Number(seenReqId) !== reqId) return;
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}`));
    });
    ib.on(EventName.execDetails, (seenReqId, contract, execution) => {
      if (Number(seenReqId) !== reqId) return;
      rows.push({
        execId: String((execution && execution.execId) || ""),
        orderId: execution && execution.orderId !== undefined ? String(execution.orderId) : "",
        account: String((execution && execution.acctNumber) || ""),
        contract: normalizeContract(contract),
        side: String((execution && execution.side) || ""),
        shares: Number(execution && execution.shares) || 0,
        price: Number(execution && execution.price) || 0,
        avgPrice: Number(execution && execution.avgPrice) || 0,
        time: String((execution && execution.time) || ""),
        exchange: String((execution && execution.exchange) || ""),
        orderRef: String((execution && execution.orderRef) || ""),
      });
    });
    ib.once(EventName.execDetailsEnd, (seenReqId) => {
      if (Number(seenReqId) !== reqId) return;
      cleanup();
      resolve(rows);
    });
    ib.once(EventName.connected, () => {
      ib.reqExecutions(reqId, {});
    });
    ib.connect();
  });
  return Promise.race([operation, timeout.promise]);
}

async function fetchAccountState(config = defaultTwsConfig()) {
  const tws = normalizeTwsConfig(config);
  const sections = await Promise.allSettled([
    fetchAccountSummary(tws),
    fetchPositions(tws),
    fetchOpenOrders(tws),
    fetchExecutions(tws),
  ]);
  const sectionNames = ["summary", "positions", "openOrders", "executions"];
  const payload = {};
  const errors = {};
  sections.forEach((section, index) => {
    const name = sectionNames[index];
    if (section.status === "fulfilled") {
      payload[name] = section.value;
    } else {
      payload[name] = [];
      errors[name] = section.reason && section.reason.message ? section.reason.message : "read failed";
    }
  });
  return {
    ok: true,
    ...payload,
    errors,
    tws,
    executionEnabled,
    refreshedAt: new Date().toISOString(),
  };
}

function cancelOrder(orderId, config = defaultTwsConfig()) {
  const numericOrderId = Math.floor(Number(orderId));
  if (!(numericOrderId > 0)) throw new Error("orderId must be positive");
  const tws = normalizeTwsConfig(config);
  const ib = createIbClient(tws);
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

async function handleTwsHealth(req, res, url) {
  const result = await checkTwsConnection(twsConfigFromUrl(url));
  sendJson(res, 200, {
    ...result,
    executionEnabled,
  });
}

async function handleAccountState(req, res, url) {
  const result = await fetchAccountState(twsConfigFromUrl(url));
  sendJson(res, 200, result);
}

async function handleExecutionState(req, res) {
  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      executionEnabled,
      tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  if (req.method === "POST") {
    const body = await readBody(req);
    const payload = body ? JSON.parse(body) : {};
    executionEnabled = Boolean(payload.executionEnabled);
    sendJson(res, 200, {
      ok: true,
      executionEnabled,
      tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  sendJson(res, 405, { error: "method not allowed" });
}

async function handleOrder(req, res) {
  const body = await readBody(req);
  const payload = body ? JSON.parse(body) : {};
  const order = normalizeOrderIntent(payload);
  const tws = normalizeTwsConfig(payload.connection || {});
  if (!executionEnabled) {
    sendJson(res, 409, {
      error: "IBKR API agent execution is disabled. Enable order submission in the IBKR page only after paper-account testing.",
      order,
      tws,
    });
    return;
  }
  const brokerOrder = await submitLimitStockOrder(order, tws);
  sendJson(res, 200, brokerOrder);
}

async function handleCancelOrder(req, res) {
  const body = await readBody(req);
  const payload = body ? JSON.parse(body) : {};
  const tws = normalizeTwsConfig(payload.connection || {});
  if (!executionEnabled) {
    sendJson(res, 409, {
      error: "IBKR API agent execution is disabled. Enable order submission in the IBKR page only after paper-account testing.",
      tws,
    });
    return;
  }
  const result = await cancelOrder(payload.orderId, tws);
  sendJson(res, 200, result);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        executionEnabled,
        tws: { host: TWS_HOST, port: TWS_PORT, clientId: TWS_CLIENT_ID },
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/tws-health") {
      await handleTwsHealth(req, res, url);
      return;
    }
    if (req.method === "GET" && url.pathname === "/account-state") {
      await handleAccountState(req, res, url);
      return;
    }
    if ((req.method === "GET" || req.method === "POST") && url.pathname === "/execution") {
      await handleExecutionState(req, res);
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
  console.log(`TWS target ${TWS_HOST}:${TWS_PORT}, clientId=${TWS_CLIENT_ID}, execution=${executionEnabled ? "enabled" : "disabled"}`);
});
