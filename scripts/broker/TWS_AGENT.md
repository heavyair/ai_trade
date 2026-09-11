# IBKR TWS Agent Contract

The app server does not connect directly to TWS or IB Gateway. A separate agent should run on
the same machine as TWS/IB Gateway and expose a private HTTP endpoint to the app server.

Default first-phase flow:

1. A watch creates a `trade_intents` row.
2. The user reviews and approves the intent in the app.
3. The app calls `POST ${IBKR_TWS_AGENT_URL}/orders` after the intent is approved.
4. The agent translates the intent into a TWS API `placeOrder` call and returns the broker
   order id/status.

Expected request:

```json
{
  "intent": {
    "id": "intent_xxx",
    "brokerAccountId": "DU1234567",
    "symbol": "NVDA",
    "market": "US",
    "side": "buy",
    "quantity": 100,
    "orderType": "LMT",
    "limitPrice": 125.5,
    "timeInForce": "DAY",
    "outsideRth": false
  }
}
```

Expected response:

```json
{
  "orderId": "123456789",
  "status": "Submitted"
}
```

Agent endpoints:

- `GET /health`: checks that the local agent process is running.
- `GET /tws-health`: connects to TWS/IB Gateway and requests server time.
- `GET /account-state`: reads account summary, positions, open orders, recent executions, and completed orders.
- `GET /order-snapshots`: reads only open orders, recent executions, and completed orders for status polling.
- `GET /order-events`: reads recent in-memory events captured by the agent for one `orderId`/`orderRef`.
- `POST /orders`: submits a US stock limit order only when execution is enabled (starts disabled; toggled via the IBKR page's "允许提交订单到 IBKR" switch, which calls `POST /execution`).
- `POST /orders/cancel`: cancels an order by broker order id, same execution-enabled gate as above.

Order status sync:

- Run `IBKR_TWS_AGENT_URL=http://127.0.0.1:7077 node scripts/broker/sync-order-status.js` from the same private network that can reach the agent.
- For continuous local paper/live tracking, run it every minute with cron/Task Scheduler, or run `node scripts/broker/sync-order-status.js --loop`.
- The sync is read-only: it polls `/order-snapshots` plus the agent's recent event cache, then updates `broker_orders` / `broker_order_events`.

TWS/IB Gateway settings:

- Paper IB Gateway API port: `4002`
- Live IB Gateway API port: `4001`
- Paper TWS API port: `7497`
- Live TWS API port: `7496`
- The agent host should be private, not public internet-facing.
- Use a unique `clientId` for this app, for example `77`.
- Start with paper trading and limit orders only.
