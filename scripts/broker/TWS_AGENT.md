# IBKR TWS Agent Contract

The app server does not connect directly to TWS or IB Gateway. A separate agent should run on
the same machine as TWS/IB Gateway and expose a private HTTP endpoint to the app server.

Default first-phase flow:

1. A watch creates a `trade_intents` row.
2. The user reviews and approves the intent in the app.
3. The app calls `POST ${IBKR_TWS_AGENT_URL}/orders` only when
   `IBKR_TWS_TRADING_ENABLED=true`.
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

TWS/IB Gateway settings:

- Paper TWS API port: `7497`
- Live TWS API port: `7496`
- The agent host should be private, not public internet-facing.
- Use a unique `clientId` for this app, for example `77`.
- Start with paper trading and limit orders only.
