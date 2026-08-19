// One-off backfill: computes buy_hold_return_rate/buy_hold_max_drawdown for rows in
// optimization_scan_results that were written before those columns existed, without
// re-running the (expensive) parameter optimization itself. Buy-hold only depends on
// the symbol's price series, not on the preset, so this computes it once per distinct
// symbol and updates every result row for that symbol.

const { Pool } = require("pg");
const engine = require("./engine.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

async function loadRows(symbol, market) {
  const result = await pool.query(`
    SELECT trade_date, open, high, low, close, volume
    FROM daily_prices
    WHERE symbol = $1 AND market = $2
    ORDER BY trade_date ASC
  `, [symbol, market]);
  return result.rows
    .map((row) => ({
      date: row.trade_date.toISOString().slice(0, 10),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

async function main() {
  await pool.query(`
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS buy_hold_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS buy_hold_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0;
  `);
  const symbolsResult = await pool.query(`
    SELECT DISTINCT symbol, market FROM optimization_scan_results
    WHERE buy_hold_return_rate = 0 AND buy_hold_max_drawdown = 0
  `);
  console.log(`backfilling buy-hold for ${symbolsResult.rows.length} distinct symbols`);

  let done = 0;
  for (const { symbol, market } of symbolsResult.rows) {
    const rows = await loadRows(symbol, market);
    if (rows.length === 0) {
      console.log(`[skip] ${symbol}:${market} no rows`);
      continue;
    }
    const states = engine.buildBuyHoldStates(rows, INITIAL_CASH, TRADE_FEE);
    const last = states[states.length - 1];
    await pool.query(
      "UPDATE optimization_scan_results SET buy_hold_return_rate = $1, buy_hold_max_drawdown = $2 WHERE symbol = $3 AND market = $4",
      [last.returnRate, last.maxDrawdown, symbol, market]
    );
    done += 1;
    if (done % 50 === 0) console.log(`[${done}/${symbolsResult.rows.length}] ...`);
  }

  console.log(`done. backfilled ${done} symbols`);
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
