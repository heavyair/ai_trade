// Poll IBKR Gateway/TWS through the local agent and persist non-terminal order states.
//
// Usage:
//   IBKR_TWS_AGENT_URL=http://127.0.0.1:7077 node scripts/broker/sync-order-status.js
//   IBKR_TWS_AGENT_URL=http://127.0.0.1:7077 node scripts/broker/sync-order-status.js --loop

const http = require("http");
const https = require("https");
const { Pool } = require("pg");
const { postJsonToResend, EMAIL_FROM } = require("../shared/send-email.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const DATABASE_SSL = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
const IBKR_TWS_AGENT_URL = String(process.env.IBKR_TWS_AGENT_URL || "").trim().replace(/\/+$/, "");
const POLL_INTERVAL_MS = Math.max(15_000, Number(process.env.BROKER_ORDER_SYNC_INTERVAL_MS || 60_000));
const REQUEST_TIMEOUT_MS = Math.max(5_000, Number(process.env.BROKER_ORDER_SYNC_TIMEOUT_MS || 20_000));
const TERMINAL_STATUSES = new Set(["filled", "cancelled", "apicancelled", "inactive", "rejected"]);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

function parseArgs(argv) {
  return {
    loop: argv.includes("--loop"),
    dryRun: argv.includes("--dryRun"),
    limit: Number(argv.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length)) || 200,
  };
}

function getJson(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const target = url instanceof URL ? url : new URL(url);
    const client = target.protocol === "http:" ? http : https;
    const req = client.get(target, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        let parsed = {};
        try {
          parsed = body ? JSON.parse(body) : {};
        } catch (error) {
          reject(new Error(`IBKR agent returned invalid JSON: ${body.slice(0, 120)}`));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(parsed.error || `IBKR agent returned HTTP ${response.statusCode}`));
          return;
        }
        resolve(parsed);
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("IBKR agent request timed out"));
    });
    req.on("error", reject);
  });
}

function postJson(url, payload, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const target = url instanceof URL ? url : new URL(url);
    const client = target.protocol === "http:" ? http : https;
    const body = JSON.stringify(payload || {});
    const req = client.request(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        let parsed = {};
        try {
          parsed = responseBody ? JSON.parse(responseBody) : {};
        } catch (error) {
          reject(new Error(`IBKR agent returned invalid JSON: ${responseBody.slice(0, 120)}`));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(parsed.error || `IBKR agent returned HTTP ${response.statusCode}`);
          error.statusCode = response.statusCode;
          error.payload = parsed;
          error.responseBody = responseBody;
          reject(error);
          return;
        }
        resolve(parsed);
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("IBKR agent request timed out"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function orderRefFromPayload(payload) {
  const row = parseJsonField(payload) || {};
  return row.id ? `ai_trade:${row.id}` : "";
}

function idSetForOrder(row) {
  const lastEvent = parseJsonField(row.last_event) || {};
  return new Set([
    row.broker_order_id,
    lastEvent.orderId,
    lastEvent.permId,
    orderRefFromPayload(row.submitted_payload),
  ].filter(Boolean).map(String));
}

function matchesOrder(candidate, ids) {
  if (!candidate || !ids || ids.size === 0) return false;
  return [
    candidate.orderId,
    candidate.permId,
    candidate.orderRef,
    candidate.execId,
  ].filter(Boolean).some((value) => ids.has(String(value)));
}

function normalizeStatus(status) {
  const text = String(status || "").trim();
  return text || "";
}

function statusFromCandidate(candidate, fallback = "") {
  if (!candidate) return fallback;
  return normalizeStatus(candidate.status || candidate.completedStatus || fallback);
}

function eventFromCandidate(eventType, candidate, status) {
  return {
    eventType,
    status: statusFromCandidate(candidate, status),
    orderId: candidate.orderId ? String(candidate.orderId) : "",
    permId: candidate.permId ? String(candidate.permId) : "",
    orderRef: candidate.orderRef ? String(candidate.orderRef) : "",
    message: candidate.completedStatus || candidate.warningText || "",
    payload: candidate,
    eventAt: new Date().toISOString(),
  };
}

function brokerConnectionAgentParams(connection) {
  const row = connection || {};
  return {
    host: String(row.host || "127.0.0.1").trim() || "127.0.0.1",
    port: Number(row.port) || 4002,
    clientId: Number(row.client_id) || 77,
  };
}

async function insertBrokerOrderFailure(intent, event) {
  await pool.query(`
    INSERT INTO broker_orders (id, intent_id, owner_user_id, provider, account_id, broker_order_id, status, submitted_payload, last_event)
    VALUES ($1, $2, $3, 'ibkr-tws', $4, '', 'rejected', $5::jsonb, $6::jsonb)
  `, [
    `border_${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`,
    intent.id,
    intent.owner_user_id,
    intent.broker_account_id || "",
    JSON.stringify(intent),
    JSON.stringify(event),
  ]);
}

async function insertBrokerOrderSuccess(intent, agentResult) {
  await pool.query(`
    INSERT INTO broker_orders (id, intent_id, owner_user_id, provider, account_id, broker_order_id, status, submitted_payload, last_event)
    VALUES ($1, $2, $3, 'ibkr-tws', $4, $5, $6, $7::jsonb, $8::jsonb)
  `, [
    `border_${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`,
    intent.id,
    intent.owner_user_id,
    intent.broker_account_id || "",
    String(agentResult.orderId || agentResult.brokerOrderId || ""),
    String(agentResult.status || "submitted"),
    JSON.stringify(intent),
    JSON.stringify(agentResult),
  ]);
}

async function notifyAutoTrade(intent, result) {
  try {
    const actionText = intent.side === "buy" ? "买入" : "卖出";
    const symbolLabel = `${intent.symbol_name || intent.symbol}（${intent.symbol}）`;
    const ok = result.ok;
    const detail = ok
      ? `IBKR 已接收订单：${result.status || ""} ${result.orderId ? `#${result.orderId}` : ""}`
      : `IBKR 自动下单失败：${result.error || ""}`;
    const subject = `IBKR Paper自动下单${ok ? "已提交" : "失败"}：${symbolLabel} ${actionText}`;
    const text = [
      subject,
      `模型：${intent.preset_label}`,
      `股票：${symbolLabel}`,
      `方向：${actionText}`,
      `数量：${intent.quantity}`,
      `限价：${intent.limit_price}`,
      detail,
      "后续订单状态会由系统定时从 IBKR Gateway 拉取。",
    ].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><h2>${subject}</h2><pre>${text}</pre></div>`;
    await postJsonToResend({ from: EMAIL_FROM, to: [intent.owner_email], subject, html, text });
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: `failed to send auto-trade notice: ${error.message}`, intentId: intent.id }));
  }
}

// Requirement: "任何通过 IBKR 交易的单子状态都需要直接发邮件给客户" — this is where actual
// IBKR-side transitions (filled/cancelled/rejected/...) are observed, so it's where they get
// emailed; the confirm/decline/submit-failed emails around the confirmation step live in
// server.js and run-watch-alerts.js instead, next to where those decisions are made.
async function notifyOrderStatusChange(row, nextStatus) {
  if (!row.intent_owner_email) return;
  try {
    const symbolLabel = `${row.intent_symbol_name || row.intent_symbol || ""}（${row.intent_symbol || ""}）`;
    const actionText = row.intent_side === "buy" ? "买入" : row.intent_side === "sell" ? "卖出" : (row.intent_side || "");
    const subject = `IBKR 订单状态更新：${symbolLabel} ${actionText} -> ${nextStatus}`;
    const text = [subject, `订单号：${row.broker_order_id}`, `新状态：${nextStatus}`].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><h2>${subject}</h2><p>订单号：${row.broker_order_id}</p><p>新状态：${nextStatus}</p></div>`;
    await postJsonToResend({ from: EMAIL_FROM, to: [row.intent_owner_email], subject, html, text });
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: `failed to send order-status notice: ${error.message}`, brokerOrderId: row.id }));
  }
}

async function submitPendingAutoTradeIntents(options) {
  const state = await getJson(`${IBKR_TWS_AGENT_URL}/execution`, 8_000);
  if (!state.executionEnabled) return { submitted: 0, failed: 0, skipped: "agent execution disabled" };
  const result = await pool.query(`
    SELECT ti.*, bc.host, bc.port, bc.client_id
    FROM trade_intents ti
    JOIN watch_alerts wa ON wa.id = ti.watch_id AND wa.trade_enabled = TRUE
    JOIN broker_connections bc ON bc.owner_user_id = ti.owner_user_id
      AND bc.provider = 'ibkr-tws'
      AND bc.enabled = TRUE
      AND bc.trading_mode = 'paper'
    LEFT JOIN broker_orders bo ON bo.intent_id = ti.id
    WHERE ti.status = 'approved'
      AND ti.risk_status = 'passed'
      AND ti.market = 'US'
      AND bo.id IS NULL
    ORDER BY ti.updated_at ASC
    LIMIT $1
  `, [Math.min(options.limit, 50)]);
  let submitted = 0;
  let failed = 0;
  for (const intent of result.rows) {
    const connection = { host: intent.host, port: intent.port, client_id: intent.client_id };
    try {
      const agentResult = await postJson(`${IBKR_TWS_AGENT_URL}/orders`, {
        intent: {
          id: intent.id,
          brokerAccountId: intent.broker_account_id || "",
          symbol: intent.symbol,
          market: intent.market,
          side: intent.side,
          quantity: Number(intent.quantity) || 0,
          orderType: intent.order_type || "LMT",
          limitPrice: Number(intent.limit_price) || 0,
          timeInForce: intent.time_in_force || "DAY",
          outsideRth: Boolean(intent.outside_rth),
        },
        connection: brokerConnectionAgentParams(connection),
      });
      await insertBrokerOrderSuccess(intent, agentResult);
      await pool.query(`
        UPDATE trade_intents SET status = 'submitted', submitted_at = NOW(), broker_order_id = $3, updated_at = NOW()
        WHERE id = $1 AND owner_user_id = $2
      `, [intent.id, intent.owner_user_id, String(agentResult.orderId || agentResult.brokerOrderId || "")]);
      await notifyAutoTrade(intent, { ok: true, ...agentResult });
      submitted += 1;
    } catch (error) {
      const failureEvent = {
        ok: false,
        error: error.message || "IBKR API agent 提交失败。",
        statusCode: error.statusCode || 0,
        response: error.payload || null,
        responseBody: error.responseBody || "",
        failedAt: new Date().toISOString(),
      };
      await insertBrokerOrderFailure(intent, failureEvent);
      await notifyAutoTrade(intent, { ok: false, error: failureEvent.error });
      failed += 1;
    }
  }
  return { submitted, failed };
}

function latestEventForOrder(row, accountState, eventState) {
  const ids = idSetForOrder(row);
  const cachedEvents = Array.isArray(eventState && eventState.events) ? eventState.events : [];
  const latestCached = (eventState && eventState.latest) || cachedEvents[cachedEvents.length - 1] || null;
  if (latestCached) return latestCached;

  const openOrder = (accountState.openOrders || []).find((order) => matchesOrder(order, ids));
  if (openOrder) return eventFromCandidate("openOrderSnapshot", openOrder, openOrder.status || row.status);

  const completedOrder = (accountState.completedOrders || []).find((order) => matchesOrder(order, ids));
  if (completedOrder) return eventFromCandidate("completedOrderSnapshot", completedOrder, completedOrder.status || completedOrder.completedStatus || row.status);

  const execution = (accountState.executions || []).find((order) => matchesOrder(order, ids));
  if (execution) return eventFromCandidate("executionSnapshot", execution, "Filled");

  return null;
}

async function insertBrokerEvent(row, event, dryRun) {
  const payloadText = JSON.stringify(event);
  const exists = await pool.query(`
    SELECT id FROM broker_order_events
    WHERE broker_order_id = $1 AND payload = $2::jsonb
    LIMIT 1
  `, [row.id, payloadText]);
  if (exists.rows.length > 0) return false;
  if (dryRun) return true;
  await pool.query(`
    INSERT INTO broker_order_events (id, broker_order_id, intent_id, event_type, payload)
    VALUES ($1, $2, $3, $4, $5::jsonb)
  `, [
    `bevent_${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`,
    row.id,
    row.intent_id,
    String(event.eventType || event.status || "orderEvent"),
    payloadText,
  ]);
  return true;
}

async function syncOnce(options) {
  if (!IBKR_TWS_AGENT_URL) throw new Error("IBKR_TWS_AGENT_URL is not configured");
  await getJson(`${IBKR_TWS_AGENT_URL}/health`, 5_000);
  const autoTrade = await submitPendingAutoTradeIntents(options);
  const accountState = await getJson(`${IBKR_TWS_AGENT_URL}/order-snapshots`, REQUEST_TIMEOUT_MS);
  const orders = await pool.query(`
    SELECT bo.*, ti.symbol AS intent_symbol, ti.symbol_name AS intent_symbol_name,
           ti.side AS intent_side, ti.owner_email AS intent_owner_email
    FROM broker_orders bo
    LEFT JOIN trade_intents ti ON ti.id = bo.intent_id
    WHERE bo.provider = 'ibkr-tws'
      AND bo.broker_order_id <> ''
      AND LOWER(bo.status) <> ALL($1::text[])
    ORDER BY bo.updated_at ASC
    LIMIT $2
  `, [Array.from(TERMINAL_STATUSES), options.limit]);

  let changed = 0;
  for (const row of orders.rows) {
    const orderRef = orderRefFromPayload(row.submitted_payload);
    const eventUrl = new URL(`${IBKR_TWS_AGENT_URL}/order-events`);
    eventUrl.searchParams.set("orderId", row.broker_order_id);
    if (orderRef) eventUrl.searchParams.set("orderRef", orderRef);
    let eventState = {};
    try {
      eventState = await getJson(eventUrl, 8_000);
    } catch (error) {
      eventState = {};
    }
    const latest = latestEventForOrder(row, accountState, eventState);
    if (!latest) continue;
    const nextStatus = statusFromCandidate(latest, row.status);
    await insertBrokerEvent(row, latest, options.dryRun);
    if (!options.dryRun && nextStatus && nextStatus !== row.status) {
      await pool.query(`
        UPDATE broker_orders
        SET status = $2, last_event = $3::jsonb, updated_at = NOW()
        WHERE id = $1
      `, [row.id, nextStatus, JSON.stringify(latest)]);
      await notifyOrderStatusChange(row, nextStatus);
    }
    changed += 1;
  }

  return {
    checked: orders.rows.length,
    changed,
    openOrders: (accountState.openOrders || []).length,
    executions: (accountState.executions || []).length,
    completedOrders: (accountState.completedOrders || []).length,
    autoTrade,
    at: new Date().toISOString(),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  do {
    try {
      const result = await syncOnce(options);
      console.log(JSON.stringify({ ok: true, ...result }));
    } catch (error) {
      console.error(JSON.stringify({ ok: false, error: error.message || String(error), at: new Date().toISOString() }));
      if (!options.loop) process.exitCode = 1;
    }
    if (!options.loop) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  } while (options.loop);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
