const http = require("http");
const { IBApi, EventName, SecType, OrderAction, OrderType } = require("@stoqey/ib");

const PORT = Number(process.env.TWS_AGENT_PORT || 7077);
const BIND_HOST = process.env.TWS_AGENT_BIND_HOST || "127.0.0.1";
const TWS_HOST = process.env.TWS_HOST || "127.0.0.1";
const TWS_PORT = Number(process.env.TWS_PORT || 4002);
const TWS_CLIENT_ID = Number(process.env.TWS_CLIENT_ID || 77);
let executionEnabled = String(process.env.TWS_AGENT_EXECUTION_ENABLED || "").toLowerCase() === "true";
const TWS_CONNECT_TIMEOUT_MS = Number(process.env.TWS_CONNECT_TIMEOUT_MS || 10000);
const TWS_ORDER_TIMEOUT_MS = Number(process.env.TWS_ORDER_TIMEOUT_MS || 15000);
const TWS_CANCEL_TIMEOUT_MS = Number(process.env.TWS_CANCEL_TIMEOUT_MS || 15000);
const TWS_ACCOUNT_TIMEOUT_MS = Number(process.env.TWS_ACCOUNT_TIMEOUT_MS || 15000);
const TWS_ORDER_MONITOR_MS = Number(process.env.TWS_ORDER_MONITOR_MS || 0);
const ORDER_EVENT_TTL_MS = Number(process.env.TWS_ORDER_EVENT_TTL_MS || 24 * 60 * 60 * 1000);
const MAX_ORDER_EVENTS_PER_KEY = 200;
const orderEventHistory = new Map();

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

function normalizeUsStockLimitPrice(value) {
  const price = Number(value);
  if (!(price > 0)) return NaN;
  const tick = price >= 1 ? 0.01 : 0.0001;
  const decimals = price >= 1 ? 2 : 4;
  return Number((Math.round(price / tick) * tick).toFixed(decimals));
}

function orderRefForIntent(order) {
  return order && order.id ? `ai_trade:${order.id}` : "ai_trade";
}

function isTerminalOrderStatus(status) {
  return ["filled", "cancelled", "apicancelled", "inactive", "rejected"].includes(String(status || "").toLowerCase());
}

function normalizeOrderEvent(event) {
  return {
    ...event,
    eventAt: event.eventAt || new Date().toISOString(),
  };
}

function rememberOrderEvent(keys, event) {
  const normalized = normalizeOrderEvent(event);
  Array.from(new Set(keys.filter(Boolean).map(String))).forEach((key) => {
    const rows = orderEventHistory.get(key) || [];
    const last = rows[rows.length - 1];
    if (!last || JSON.stringify(last) !== JSON.stringify(normalized)) {
      rows.push(normalized);
    }
    const cutoff = Date.now() - ORDER_EVENT_TTL_MS;
    const kept = rows
      .filter((row) => !row.eventAt || Date.parse(row.eventAt) >= cutoff)
      .slice(-MAX_ORDER_EVENTS_PER_KEY);
    orderEventHistory.set(key, kept);
  });
}

function readOrderEvents(orderId, orderRef) {
  const merged = [];
  const seen = new Set();
  [orderId, orderRef].filter(Boolean).map(String).forEach((key) => {
    (orderEventHistory.get(key) || []).forEach((event) => {
      const eventKey = JSON.stringify(event);
      if (seen.has(eventKey)) return;
      seen.add(eventKey);
      merged.push(event);
    });
  });
  merged.sort((a, b) => Date.parse(a.eventAt || "") - Date.parse(b.eventAt || ""));
  return merged;
}

function normalizeOrderIntent(raw) {
  const intent = raw && raw.intent ? raw.intent : {};
  const side = String(intent.side || "").toUpperCase();
  const symbol = String(intent.symbol || "").trim().toUpperCase();
  const quantity = Math.floor(Number(intent.quantity) || 0);
  const limitPrice = normalizeUsStockLimitPrice(intent.limitPrice);
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
  const orderRef = orderRefForIntent(order);

  const operation = new Promise((resolve, reject) => {
    let submittedOrderId = null;
    let monitorTimer = null;
    let resolved = false;
    const cleanup = () => {
      timeout.cancel();
      if (monitorTimer) clearTimeout(monitorTimer);
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.nextValidId);
      ib.removeAllListeners(EventName.orderStatus);
      ib.removeAllListeners(EventName.openOrder);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    const eventKeys = () => [submittedOrderId !== null ? String(submittedOrderId) : "", orderRef];
    const stopMonitoringSoon = (delayMs = 0) => {
      if (monitorTimer) clearTimeout(monitorTimer);
      monitorTimer = setTimeout(cleanup, Math.max(0, delayMs));
    };
    const finish = (payload) => {
      if (resolved) return;
      resolved = true;
      timeout.cancel();
      stopMonitoringSoon(TWS_ORDER_MONITOR_MS);
      resolve({
        ...payload,
        orderRef,
        events: readOrderEvents(payload.orderId || "", orderRef),
        monitorMs: TWS_ORDER_MONITOR_MS,
      });
    };

    ib.on(EventName.error, (err, code, reqId) => {
      if (submittedOrderId !== null && reqId !== submittedOrderId && code) return;
      const message = `${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}${Number.isFinite(reqId) ? ` reqId ${reqId}` : ""}`;
      rememberOrderEvent(eventKeys(), {
        eventType: "error",
        status: "Rejected",
        orderId: submittedOrderId !== null ? String(submittedOrderId) : "",
        orderRef,
        code: Number(code) || 0,
        reqId: Number.isFinite(reqId) ? Number(reqId) : null,
        message,
      });
      if (!resolved) {
        cleanup();
        reject(new Error(message));
        return;
      }
      stopMonitoringSoon(1000);
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
        orderRef,
      };
      if (order.accountId) ibOrder.account = order.accountId;
      rememberOrderEvent(eventKeys(), {
        eventType: "placeOrder",
        status: "PendingSubmit",
        orderId: String(submittedOrderId),
        orderRef,
        order,
        tws,
      });
      ib.placeOrder(submittedOrderId, contract, ibOrder);
    });
    ib.on(EventName.openOrder, (orderId, contract, ibOrder, orderState) => {
      if (Number(orderId) === submittedOrderId) {
        const status = String((orderState && orderState.status) || "OpenOrderAccepted");
        rememberOrderEvent(eventKeys(), {
          eventType: "openOrder",
          status,
          orderId: String(orderId),
          orderRef,
          contract: normalizeContract(contract),
          warningText: String((orderState && orderState.warningText) || ""),
        });
        finish({ orderId: String(orderId), status });
        if (isTerminalOrderStatus(status)) stopMonitoringSoon(1000);
      }
    });
    ib.on(EventName.orderStatus, (orderId, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld) => {
      if (Number(orderId) === submittedOrderId) {
        const normalizedStatus = String(status || "Submitted");
        rememberOrderEvent(eventKeys(), {
          eventType: "orderStatus",
          status: normalizedStatus,
          orderId: String(orderId),
          orderRef,
          filled: Number(filled) || 0,
          remaining: Number(remaining) || 0,
          avgFillPrice: Number(avgFillPrice) || 0,
          lastFillPrice: Number(lastFillPrice) || 0,
          permId: permId !== undefined ? String(permId) : "",
          clientId: clientId !== undefined ? String(clientId) : "",
          whyHeld: String(whyHeld || ""),
        });
        finish({ orderId: String(orderId), status: normalizedStatus });
        if (isTerminalOrderStatus(normalizedStatus)) stopMonitoringSoon(1000);
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

function fetchCompletedOrders(config = defaultTwsConfig()) {
  const ib = createIbClient(config, 5);
  const timeout = withTimeout(TWS_ACCOUNT_TIMEOUT_MS, "Timed out reading IBKR completed orders", () => disconnectQuietly(ib));

  const operation = new Promise((resolve, reject) => {
    const rows = [];
    const cleanup = () => {
      timeout.cancel();
      ib.removeAllListeners(EventName.error);
      ib.removeAllListeners(EventName.completedOrder);
      ib.removeAllListeners(EventName.completedOrdersEnd);
      ib.removeAllListeners(EventName.connected);
      disconnectQuietly(ib);
    };
    ib.on(EventName.error, (err, code, reqId) => {
      if (isIgnorableIbErrorCode(code)) return;
      cleanup();
      reject(new Error(`${err && err.message ? err.message : "IB Gateway error"}${code ? ` (code ${code})` : ""}${Number.isFinite(reqId) ? ` reqId ${reqId}` : ""}`));
    });
    ib.on(EventName.completedOrder, (contract, order, orderState) => {
      rows.push({
        orderId: order && order.orderId !== undefined ? String(order.orderId) : "",
        permId: order && order.permId !== undefined ? String(order.permId) : "",
        account: String((order && order.account) || ""),
        contract: normalizeContract(contract),
        action: String((order && order.action) || ""),
        orderType: String((order && order.orderType) || ""),
        totalQuantity: Number(order && order.totalQuantity) || 0,
        limitPrice: order && order.lmtPrice !== undefined ? Number(order.lmtPrice) : null,
        tif: String((order && order.tif) || ""),
        status: String((orderState && orderState.status) || ""),
        completedTime: String((orderState && orderState.completedTime) || ""),
        completedStatus: String((orderState && orderState.completedStatus) || ""),
        warningText: String((orderState && orderState.warningText) || ""),
        orderRef: String((order && order.orderRef) || ""),
      });
    });
    ib.once(EventName.completedOrdersEnd, () => {
      cleanup();
      resolve(rows);
    });
    ib.once(EventName.connected, () => {
      ib.reqCompletedOrders(false);
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
    fetchCompletedOrders(tws),
  ]);
  const sectionNames = ["summary", "positions", "openOrders", "executions", "completedOrders"];
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

async function fetchOrderSnapshots(config = defaultTwsConfig()) {
  const tws = normalizeTwsConfig(config);
  const sections = await Promise.allSettled([
    fetchOpenOrders(tws),
    fetchExecutions(tws),
    fetchCompletedOrders(tws),
  ]);
  const sectionNames = ["openOrders", "executions", "completedOrders"];
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

async function handleOrderSnapshots(req, res, url) {
  const result = await fetchOrderSnapshots(twsConfigFromUrl(url));
  sendJson(res, 200, result);
}

async function handleOrderEvents(req, res, url) {
  const orderId = String(url.searchParams.get("orderId") || "").trim();
  const orderRef = String(url.searchParams.get("orderRef") || "").trim();
  const events = readOrderEvents(orderId, orderRef);
  sendJson(res, 200, {
    ok: true,
    orderId,
    orderRef,
    events,
    latest: events[events.length - 1] || null,
    refreshedAt: new Date().toISOString(),
  });
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
    if (req.method === "GET" && url.pathname === "/order-snapshots") {
      await handleOrderSnapshots(req, res, url);
      return;
    }
    if (req.method === "GET" && url.pathname === "/order-events") {
      await handleOrderEvents(req, res, url);
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

server.listen(PORT, BIND_HOST, () => {
  console.log(`IBKR TWS agent stub listening on http://${BIND_HOST}:${PORT}`);
  console.log(`TWS target ${TWS_HOST}:${TWS_PORT}, clientId=${TWS_CLIENT_ID}, execution=${executionEnabled ? "enabled" : "disabled"}`);
});
