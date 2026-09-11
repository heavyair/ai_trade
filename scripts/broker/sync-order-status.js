// Poll IBKR Gateway/TWS through the local agent and persist non-terminal order states.
//
// Usage:
//   IBKR_TWS_AGENT_URL=http://127.0.0.1:7077 node scripts/broker/sync-order-status.js
//   IBKR_TWS_AGENT_URL=http://127.0.0.1:7077 node scripts/broker/sync-order-status.js --loop

const http = require("http");
const https = require("https");
const { Pool } = require("pg");

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
    message: candidate.warningText || "",
    payload: candidate,
    eventAt: new Date().toISOString(),
  };
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
  const accountState = await getJson(`${IBKR_TWS_AGENT_URL}/account-state`, REQUEST_TIMEOUT_MS);
  const orders = await pool.query(`
    SELECT *
    FROM broker_orders
    WHERE provider = 'ibkr-tws'
      AND broker_order_id <> ''
      AND LOWER(status) <> ALL($1::text[])
    ORDER BY updated_at ASC
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
    if (!options.dryRun) {
      await pool.query(`
        UPDATE broker_orders
        SET status = $2, last_event = $3::jsonb, updated_at = NOW()
        WHERE id = $1
      `, [row.id, nextStatus || row.status, JSON.stringify(latest)]);
    }
    changed += 1;
  }

  return {
    checked: orders.rows.length,
    changed,
    openOrders: (accountState.openOrders || []).length,
    executions: (accountState.executions || []).length,
    completedOrders: (accountState.completedOrders || []).length,
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
