// CAGR-style annualization: a 30% return over 2 years and a 30% return over 6 months aren't
// comparable as raw numbers, but their annualized rates are. Shared by run-optimization-scan.js
// and run-auto-generate.js — both now compute this for a TRAIN-window backtest and, separately,
// for an out-of-sample TEST-window backtest of the same fixed config, so the same formula
// needs to live in one place instead of two independently-drifting copies.
function annualizedReturnRate(returnRatePercent, tradingDays) {
  if (!Number.isFinite(returnRatePercent) || !Number.isFinite(tradingDays) || tradingDays <= 0) return null;
  const years = tradingDays / 252;
  if (years <= 0) return null;
  const totalMultiple = 1 + returnRatePercent / 100;
  if (totalMultiple <= 0) return -100;
  return (Math.pow(totalMultiple, 1 / years) - 1) * 100;
}

module.exports = { annualizedReturnRate };
