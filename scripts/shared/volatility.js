// Annualized upside semi-deviation of a daily close-price series — same square-root-of-time
// annualization as buildSymbolDataProfile's annualizedVolatilityPercent (see
// scripts/shared/model-generator.js), but the variance sum only includes days whose return beat
// the window's own mean; days at or below the mean contribute 0. This mirrors the standard
// downside-deviation construction (the one Sortino ratio uses) with the direction flipped.
//
// Used as a volatility-scaled minimum-performance bar (see search-validated-best.js's
// UPSIDE_THRESHOLD_PERCENT gate and run-qualified-recheck.js's recheck of it): instead of a flat
// "must clear 50% annualized" target, a model's return for a given year is also required to clear
// some fraction of that SAME STOCK's own upside volatility that year — a fast-moving stock has a
// higher bar to prove it's actually adding value beyond "this stock just moves a lot", while a
// calm stock only needs a modest return to clear the same fraction of its own (smaller) upside
// swings.
function annualizedUpsideDeviation(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const dailyReturns = [];
  for (let i = 1; i < rows.length; i += 1) {
    const prevClose = rows[i - 1].close;
    if (!(prevClose > 0)) continue;
    dailyReturns.push((rows[i].close - prevClose) / prevClose);
  }
  if (dailyReturns.length === 0) return null;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const upsideVariance = dailyReturns.reduce(
    (acc, r) => acc + (r > mean ? (r - mean) * (r - mean) : 0),
    0
  ) / dailyReturns.length;
  return Math.sqrt(upsideVariance) * Math.sqrt(252) * 100;
}

module.exports = { annualizedUpsideDeviation };
