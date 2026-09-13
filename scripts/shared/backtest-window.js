const { annualizedReturnRate } = require("./annualize.js");

// Slice a continuous account using its preceding equity as the window baseline.
// Shared with the production validated search; validation years still use reset accounts.
function computeWindowStats(states, windowStart, windowEnd) {
  let baselineIndex = -1;
  let endIndex = -1;
  for (let i = 0; i < states.length; i += 1) {
    const date = states[i].row.date;
    if (date < windowStart) baselineIndex = i;
    if (date < windowEnd) endIndex = i;
  }
  if (endIndex < 0) return null;
  const baselineEquity = baselineIndex >= 0 ? states[baselineIndex].equity : states[0].equity;
  const rowsInWindow = endIndex - baselineIndex;
  if (rowsInWindow <= 0 || !(baselineEquity > 0)) return null;
  const returnPct = ((states[endIndex].equity - baselineEquity) / baselineEquity) * 100;
  const baselineTrades = baselineIndex >= 0 && states[baselineIndex].trades ? states[baselineIndex].trades.length : 0;
  const trades = (states[endIndex].trades ? states[endIndex].trades.length : 0) - baselineTrades;
  let peak = baselineEquity;
  let maxDrawdown = 0;
  for (let i = baselineIndex + 1; i <= endIndex; i += 1) {
    const equity = states[i].equity;
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  return { ann: annualizedReturnRate(returnPct, rowsInWindow), returnRate: returnPct, maxDrawdown, trades, rows: rowsInWindow };
}

module.exports = { computeWindowStats };
