// Shared "load a symbol's full daily_prices + forward-filled PE/volume history" query — the
// exact query shape used by every batch script (run-watch-alerts.js, run-optimization-scan.js,
// search-validated-best.js, run-auto-generate.js, run-universe-validation.js,
// run-stock-screen.js all carry their own copy of this same SQL) and now also by server.js's
// on-demand "重新验证" endpoint. Kept here as the one place new callers can reuse instead of
// adding yet another copy — the six existing scripts weren't touched to point at this (already
// working, already consistent with each other; no reason to risk them for an unrelated change).
async function loadRowsForSymbol(pool, symbol, market) {
  const result = await pool.query(`
    SELECT dp.trade_date, dp.open, dp.high, dp.low, dp.close, dp.volume,
           dv.pe, dv.pe_ttm, dv.pb
    FROM daily_prices dp
    LEFT JOIN LATERAL (
      -- Forward-fill: see run-watch-alerts.js's loadRows for why (US PE lands once a day,
      -- up to ~10 days lookback so a real data outage still surfaces as missing PE).
      SELECT pe, pe_ttm, pb
      FROM daily_valuations
      WHERE symbol = dp.symbol AND market = dp.market
        AND trade_date <= dp.trade_date AND trade_date >= dp.trade_date - INTERVAL '10 days'
      ORDER BY trade_date DESC
      LIMIT 1
    ) dv ON TRUE
    WHERE dp.symbol = $1 AND dp.market = $2
    ORDER BY dp.trade_date ASC
  `, [symbol, market]);
  return result.rows
    .map((row) => ({
      date: row.trade_date.toISOString().slice(0, 10),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
      pe: row.pe !== null ? Number(row.pe) : undefined,
      peTtm: row.pe_ttm !== null ? Number(row.pe_ttm) : undefined,
      pb: row.pb !== null ? Number(row.pb) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

module.exports = { loadRowsForSymbol };
