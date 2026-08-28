// Backtest + parameter-optimization engine, ported verbatim (via exact line-range
// extraction from public/app.js, not hand-retyped) so batch/offline runs use the same
// logic as the live app instead of a hand-reimplemented, drift-prone copy.
//
// Source of truth: public/app.js. If the browser engine changes (bug fix, new
// strategy type, new indicator), re-run scripts/universe/extract-engine.js to
// regenerate this file rather than hand-editing it.
//
// The only intentional deviation from app.js is getMinTradeLotSize(), which reads a
// DOM input in the browser (codeInput.value) — here it reads a module-level variable
// set via setActiveLotSizeSymbol() before each symbol's backtest run instead.

const FormulaEngine = require("../../public/formula-engine.js");

const defaultBuyRules = [
  { drop: 5, target: 30 },
  { drop: 10, target: 60 },
  { drop: 15, target: 100 },
  { drop: 20, target: 100 },
  { drop: 25, target: 100 },
  { drop: 30, target: 100 },
];


const defaultSellRules = [
  { rise: 5, reduce: 10 },
  { rise: 15, reduce: 30 },
  { rise: 30, reduce: 60 },
  { rise: 50, reduce: 100 },
];


const defaultNoNewHighExitRule = {
  lookbackDays: 6,
  stalledDays: 5,
  reduce: 100,
};


const defaultLocalLadderRule = {
  lookbackDays: 5,
  entryDrop: 2,
  ladderDrop: 4,
  buyAdd: 30,
  maxTarget: 100,
  sellRise: 4,
  sellReduce: 25,
  stopLoss: 25,
  stopReduce: 100,
  maxSellsPerDay: 2,
  resetPositionBelow: 10,
};


const defaultMaRsiBandRule = {
  fastMa: 60,
  slowMa: 120,
  slowBuffer: 0,
  useSlowTrend: true,
  bearTarget: 30,
  bullTarget: 100,
  useFastBull: true,
  fastBullTarget: 100,
  useFastCut: true,
  fastBearTarget: 0,
  fastCut: 3,
  rsiDays: 14,
  useRsiBuy: true,
  rsiBuy: 35,
  rsiTarget: 100,
  useRsiSell: true,
  rsiSell: 70,
  hotTarget: 40,
  atrDays: 14,
  useAtr: true,
  highAtr: 7,
  volTarget: 40,
};


const defaultOrderGridRule = {
  lookbackDays: 3,
  entryDrop: 2,
  orderCapitalPercent: 20,
  addDrop: 2,
  takeProfit: 2,
  maxLots: 5,
};


const defaultPeVolumeRule = {
  peLookbackDays: 252,
  lowPePercentile: 30,
  highPePercentile: 80,
  volumeMaDays: 20,
  volumeBuyMultiplier: 1.2,
  volumeSellMultiplier: 0.7,
  lowPeTarget: 80,
  neutralTarget: 40,
  highPeTarget: 0,
};


const defaultStagnationReversalRule = {
  buyLookbackDays: 5,
  buyStalledDays: 5,
  buyTarget: 100,
  sellLookbackDays: 5,
  sellStalledDays: 5,
  sellReduce: 100,
};


const defaultBuyBlockRules = [];

const defaultSellBlockRules = [];

const defaultScoreRules = [];

const defaultPositionBands = [];


function formatPrice(value) {
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}


function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}


function readStagnationReversalRule(rule = defaultStagnationReversalRule) {
  const readNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  return {
    buyLookbackDays: Math.max(2, Math.round(readNumber(rule.buyLookbackDays, defaultStagnationReversalRule.buyLookbackDays))),
    buyStalledDays: Math.max(1, Math.round(readNumber(rule.buyStalledDays, defaultStagnationReversalRule.buyStalledDays))),
    buyTarget: Math.min(100, Math.max(1, readNumber(rule.buyTarget, defaultStagnationReversalRule.buyTarget))),
    sellLookbackDays: Math.max(2, Math.round(readNumber(rule.sellLookbackDays, defaultStagnationReversalRule.sellLookbackDays))),
    sellStalledDays: Math.max(1, Math.round(readNumber(rule.sellStalledDays, defaultStagnationReversalRule.sellStalledDays))),
    sellReduce: Math.min(100, Math.max(1, readNumber(rule.sellReduce, defaultStagnationReversalRule.sellReduce))),
  };
}


function cloneRuleBlocks(rules, defaults) {
  return (Array.isArray(rules) ? rules : defaults).map((block) => ({
    enabled: block && block.enabled !== false,
    conditions: Array.isArray(block && block.conditions)
      ? block.conditions.map((condition) => ({ ...condition }))
      : [],
    action: block && block.action && typeof block.action === "object" ? { ...block.action } : { type: "exitAll" },
  }));
}


function cloneRules(rules, defaults) {
  return (rules || defaults).map((rule) => ({ ...rule }));
}


function cloneScoreRules(rules, defaults) {
  return (Array.isArray(rules) ? rules : defaults).map((rule) => ({
    enabled: rule && rule.enabled !== false,
    conditions: Array.isArray(rule && rule.conditions) ? rule.conditions.map((c) => ({ ...c })) : [],
    points: Number(rule && rule.points) || 0,
  }));
}


function clonePositionBands(bands, defaults) {
  return (Array.isArray(bands) ? bands : defaults).map((band) => ({
    minScore: Number(band && band.minScore) || 0,
    targetPercent: Math.min(100, Math.max(0, Number(band && band.targetPercent) || 0)),
  }));
}


function buildConfigFromPresetObject(preset, baseConfig) {
  return {
    ...baseConfig,
    strategyType: preset.strategyType || "wave",
    waveThreshold: Math.max(0.1, Number(preset.waveThreshold || baseConfig.waveThreshold)),
    localLadderRule: {
      ...defaultLocalLadderRule,
      ...(preset.localLadderRule || {}),
    },
    maRsiBandRule: {
      ...defaultMaRsiBandRule,
      ...(preset.maRsiBandRule || {}),
    },
    orderGridRule: {
      ...defaultOrderGridRule,
      ...(preset.orderGridRule || {}),
    },
    peVolumeRule: {
      ...defaultPeVolumeRule,
      ...(preset.peVolumeRule || {}),
    },
    stagnationReversalRule: readStagnationReversalRule(preset.stagnationReversalRule || defaultStagnationReversalRule),
    buyBlockRules: cloneRuleBlocks(preset.buyBlockRules, defaultBuyBlockRules),
    sellBlockRules: cloneRuleBlocks(preset.sellBlockRules, defaultSellBlockRules),
    scoreRules: cloneScoreRules(preset.scoreRules, defaultScoreRules),
    positionBands: clonePositionBands(preset.positionBands, defaultPositionBands),
    buyRules: cloneRules(preset.buyRules, defaultBuyRules)
      .filter((rule) => rule.enabled !== false)
      .sort((a, b) => a.drop - b.drop),
    sellRules: cloneRules(preset.sellRules, defaultSellRules)
      .filter((rule) => rule.enabled !== false)
      .sort((a, b) => a.rise - b.rise),
    noNewHighExitRule: {
      enabled: Boolean(preset.noNewHighExitRule && preset.noNewHighExitRule.enabled),
      ...defaultNoNewHighExitRule,
      ...(preset.noNewHighExitRule || {}),
    },
  };
}


function createWaveTracker(firstRow, threshold) {
  return {
    trend: "none",
    threshold,
    high: { price: firstRow.high, date: firstRow.date, version: 0 },
    low: { price: firstRow.low, date: firstRow.date, version: 0 },
    candidateHigh: { price: firstRow.high, date: firstRow.date },
    candidateLow: { price: firstRow.low, date: firstRow.date },
  };
}


function updateWaveTracker(wave, row) {
  const events = [];

  if (row.high > wave.candidateHigh.price) {
    wave.candidateHigh = { price: row.high, date: row.date };
  }

  if (row.low < wave.candidateLow.price) {
    wave.candidateLow = { price: row.low, date: row.date };
  }

  const drawdownFromCandidateHigh = ((wave.candidateHigh.price - row.low) / wave.candidateHigh.price) * 100;
  if (wave.trend !== "down" && drawdownFromCandidateHigh >= wave.threshold) {
    wave.high = {
      price: wave.candidateHigh.price,
      date: wave.candidateHigh.date,
      version: wave.high.version + 1,
    };
    wave.trend = "down";
    wave.candidateLow = { price: row.low, date: row.date };
    events.push("new-high");
  }

  const riseFromCandidateLow = ((row.high - wave.candidateLow.price) / wave.candidateLow.price) * 100;
  if (wave.trend !== "up" && riseFromCandidateLow >= wave.threshold) {
    wave.low = {
      price: wave.candidateLow.price,
      date: wave.candidateLow.date,
      version: wave.low.version + 1,
    };
    wave.trend = "up";
    wave.candidateHigh = { price: row.high, date: row.date };
    events.push("new-low");
  }

  return events;
}


function getMovingAverageSeries(rows, days) {
  const values = new Array(rows.length).fill(null);
  let sum = 0;
  rows.forEach((row, index) => {
    sum += row.close;
    if (index >= days) sum -= rows[index - days].close;
    values[index] = index + 1 >= days ? sum / days : null;
  });
  return values;
}


function getRsiSeries(rows, days) {
  const values = new Array(rows.length).fill(null);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const change = rows[index].close - rows[index - 1].close;
    gains += Math.max(0, change);
    losses += Math.max(0, -change);

    if (index > days) {
      const oldChange = rows[index - days].close - rows[index - days - 1].close;
      gains -= Math.max(0, oldChange);
      losses -= Math.max(0, -oldChange);
    }

    if (index >= days) {
      values[index] = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
    }
  }

  return values;
}


function getAtrPercentSeries(rows, days) {
  const values = new Array(rows.length).fill(null);
  let sum = 0;

  rows.forEach((row, index) => {
    const previousClose = index > 0 ? rows[index - 1].close : row.close;
    const trueRange = Math.max(
      row.high - row.low,
      Math.abs(row.high - previousClose),
      Math.abs(row.low - previousClose)
    );
    sum += trueRange;

    if (index >= days) {
      const old = rows[index - days];
      const oldPreviousClose = index - days > 0 ? rows[index - days - 1].close : old.close;
      sum -= Math.max(
        old.high - old.low,
        Math.abs(old.high - oldPreviousClose),
        Math.abs(old.low - oldPreviousClose)
      );
    }

    values[index] = index + 1 >= days ? (sum / days / row.close) * 100 : null;
  });

  return values;
}


function getVolumeAverageSeries(rows, days) {
  const values = new Array(rows.length).fill(null);
  let sum = 0;
  rows.forEach((row, index) => {
    const volume = Number(row.volume);
    sum += Number.isFinite(volume) ? volume : 0;
    if (index >= days) {
      const oldVolume = Number(rows[index - days].volume);
      sum -= Number.isFinite(oldVolume) ? oldVolume : 0;
    }
    values[index] = index + 1 >= days ? sum / days : null;
  });
  return values;
}


function getPeValue(row) {
  const pe = Number(row && (row.peTtm || row.pe));
  return Number.isFinite(pe) && pe > 0 ? pe : null;
}


function percentile(sortedValues, percentileRank) {
  if (!sortedValues.length) return null;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.round((percentileRank / 100) * (sortedValues.length - 1)))
  );
  return sortedValues[index];
}


function getPeBandSeries(rows, days, lowPercentile, highPercentile) {
  return rows.map((row, index) => {
    const start = Math.max(0, index - days + 1);
    const values = rows
      .slice(start, index + 1)
      .map(getPeValue)
      .filter((value) => value !== null)
      .sort((a, b) => a - b);
    if (values.length < Math.min(20, days)) {
      return { low: null, high: null, sampleSize: values.length };
    }
    return {
      low: percentile(values, lowPercentile),
      high: percentile(values, highPercentile),
      sampleSize: values.length,
    };
  });
}


function getRollingLow(rows, index, lookbackDays) {
  const start = Math.max(0, index - lookbackDays + 1);
  let bestIndex = start;
  for (let i = start + 1; i <= index; i += 1) {
    if (rows[i].low < rows[bestIndex].low) bestIndex = i;
  }
  return {
    ...rows[bestIndex],
    rowIndex: bestIndex,
  };
}


function computeRollingExtremeIndices(rows, lookbackDays, key, isBetter, excludeCurrent) {
  const result = new Array(rows.length).fill(null);
  const deque = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (excludeCurrent) {
      const lower = i - lookbackDays;
      while (deque.length && deque[0] < lower) deque.shift();
      result[i] = i >= lookbackDays && deque.length ? deque[0] : null;
      while (deque.length && isBetter(rows[i][key], rows[deque[deque.length - 1]][key])) deque.pop();
      deque.push(i);
    } else {
      const lower = i - lookbackDays + 1;
      while (deque.length && deque[0] < lower) deque.shift();
      while (deque.length && isBetter(rows[i][key], rows[deque[deque.length - 1]][key])) deque.pop();
      deque.push(i);
      result[i] = deque[0];
    }
  }
  return result;
}


function getDrawdownFromHighSeries(rows, lookbackDays) {
  const highIndices = computeRollingExtremeIndices(rows, lookbackDays, "high", (a, b) => a >= b, false);
  return rows.map((row, index) => {
    const high = rows[highIndices[index]].high;
    return high > 0 ? ((high - row.close) / high) * 100 : null;
  });
}


function getDrawdownFromWaveHighSeries(rows, waveThreshold) {
  if (!rows || rows.length === 0) return [];
  const wave = createWaveTracker(rows[0], waveThreshold);
  return rows.map((row) => {
    updateWaveTracker(wave, row);
    const high = wave.high.price;
    return high > 0 ? ((high - row.close) / high) * 100 : null;
  });
}


function getRiseFromLowSeries(rows, lookbackDays) {
  const lowIndices = computeRollingExtremeIndices(rows, lookbackDays, "low", (a, b) => a <= b, false);
  return rows.map((row, index) => {
    const low = rows[lowIndices[index]].low;
    return low > 0 ? ((row.close - low) / low) * 100 : null;
  });
}


function getMaValueDiffSeries(rows, maDays) {
  const ma = getMovingAverageSeries(rows, maDays);
  return rows.map((row, index) => (ma[index] ? ((row.close - ma[index]) / ma[index]) * 100 : null));
}


function getMaSlopeSeries(rows, maDays, slopeWindowDays) {
  const window = Math.max(1, Number(slopeWindowDays) || 1);
  const ma = getMovingAverageSeries(rows, maDays);
  return rows.map((row, index) => {
    const previousIndex = index - window;
    if (ma[index] == null || previousIndex < 0 || !ma[previousIndex]) return null;
    return ((ma[index] - ma[previousIndex]) / ma[previousIndex]) * 100;
  });
}


function getMaCompareSeries(rows, fastDays, slowDays) {
  const fastMa = getMovingAverageSeries(rows, fastDays);
  const slowMa = getMovingAverageSeries(rows, slowDays);
  return rows.map((row, index) => (
    fastMa[index] != null && slowMa[index] ? ((fastMa[index] - slowMa[index]) / slowMa[index]) * 100 : null
  ));
}


function getCandleBodySeries(rows) {
  return rows.map((row) => (row.open ? ((row.close - row.open) / row.open) * 100 : null));
}


function getVolumeRatioSeries(rows, maDays) {
  const volumeMa = getVolumeAverageSeries(rows, maDays);
  return rows.map((row, index) => {
    const volume = Number(row.volume);
    return volumeMa[index] && Number.isFinite(volume) ? volume / volumeMa[index] : null;
  });
}


function getDaysSinceNewHighSeries(rows, lookbackDays) {
  const values = new Array(rows.length).fill(null);
  const previousHighIndices = computeRollingExtremeIndices(rows, lookbackDays, "high", (a, b) => a >= b, true);
  let streak = 0;
  rows.forEach((row, index) => {
    if (previousHighIndices[index] === null) return;
    const previousHigh = rows[previousHighIndices[index]];
    streak = row.high > previousHigh.high ? 0 : streak + 1;
    values[index] = streak;
  });
  return values;
}

// Unlike drawdownFromHigh (a fixed-width window recomputed fresh every day, so its
// reference high silently "forgets" a breakout once that candle slides out of the
// window), this anchors on a specific breakout event and holds that anchor indefinitely:
// whenever today's high exceeds the preceding lookbackDays-day high, the anchor freezes
// at that PRE-breakout high price; the anchor only ever moves again on a fresh, higher
// breakout. The result stays <=0 for as long as price hasn't closed back below the level
// it broke out from, even long after that breakout candle would have exited a rolling
// window — this is what "创新高后有没有跌破那次突破的高点" actually needs.
function getDrawdownFromBreakoutHighSeries(rows, lookbackDays) {
  const values = new Array(rows.length).fill(null);
  const previousHighIndices = computeRollingExtremeIndices(rows, lookbackDays, "high", (a, b) => a >= b, true);
  let anchor = null;
  rows.forEach((row, index) => {
    if (previousHighIndices[index] === null) return;
    const previousHigh = rows[previousHighIndices[index]];
    if (row.high > previousHigh.high) anchor = previousHigh.high;
    values[index] = anchor > 0 ? ((anchor - row.close) / anchor) * 100 : null;
  });
  return values;
}


function getDaysSinceNewLowSeries(rows, lookbackDays) {
  const values = new Array(rows.length).fill(null);
  const previousLowIndices = computeRollingExtremeIndices(rows, lookbackDays, "low", (a, b) => a <= b, true);
  let streak = 0;
  rows.forEach((row, index) => {
    if (previousLowIndices[index] === null) return;
    const previousLow = rows[previousLowIndices[index]];
    streak = row.low < previousLow.low ? 0 : streak + 1;
    values[index] = streak;
  });
  return values;
}


function getUpDayCountSeries(rows, lookbackDays) {
  const values = new Array(rows.length).fill(null);
  const isUp = rows.map((row, index) => (index > 0 && row.close > rows[index - 1].close ? 1 : 0));
  let sum = 0;
  rows.forEach((row, index) => {
    sum += isUp[index];
    if (index >= lookbackDays) sum -= isUp[index - lookbackDays];
    values[index] = index + 1 >= lookbackDays ? sum : null;
  });
  return values;
}


function getDownDayCountSeries(rows, lookbackDays) {
  const values = new Array(rows.length).fill(null);
  const isDown = rows.map((row, index) => (index > 0 && row.close < rows[index - 1].close ? 1 : 0));
  let sum = 0;
  rows.forEach((row, index) => {
    sum += isDown[index];
    if (index >= lookbackDays) sum -= isDown[index - lookbackDays];
    values[index] = index + 1 >= lookbackDays ? sum : null;
  });
  return values;
}


function buildPeVolumeSeries(rows, rule) {
  return {
    volumeMa: getVolumeAverageSeries(rows, rule.volumeMaDays),
    peBands: getPeBandSeries(rows, rule.peLookbackDays, rule.lowPePercentile, rule.highPePercentile),
  };
}


function buildMaRsiBandSeries(rows, rule) {
  return {
    fastMa: getMovingAverageSeries(rows, rule.fastMa),
    slowMa: getMovingAverageSeries(rows, rule.slowMa),
    rsi: getRsiSeries(rows, rule.rsiDays),
    atr: getAtrPercentSeries(rows, rule.atrDays),
  };
}


function getMaRsiBandDecision(row, index, series, rule) {
  const fastMa = series.fastMa[index];
  const slowMa = series.slowMa[index];
  const rsi = series.rsi[index];
  const atr = series.atr[index];
  const reasons = [];

  if (!fastMa || !slowMa) {
    return {
      target: 0,
      fastMa,
      slowMa,
      rsi,
      atr,
      reason: "均线数据不足，空仓等待",
    };
  }

  let target = rule.bearTarget;
  if (rule.useSlowTrend !== false) {
    target = row.close >= slowMa * (1 + rule.slowBuffer / 100)
      ? rule.bullTarget
      : rule.bearTarget;
    reasons.push(row.close >= slowMa * (1 + rule.slowBuffer / 100)
      ? `收盘价站上慢线，目标 ${formatPercent(rule.bullTarget)}`
      : `收盘价低于慢线，目标 ${formatPercent(rule.bearTarget)}`);
  } else {
    reasons.push(`慢线趋势关闭，基础目标 ${formatPercent(rule.bearTarget)}`);
  }

  if (rule.useFastBull !== false && row.close >= fastMa && fastMa >= slowMa) {
    target = Math.max(target, rule.fastBullTarget);
    reasons.push(`快线强势，目标不低于 ${formatPercent(rule.fastBullTarget)}`);
  }

  if (rule.useFastCut !== false && row.close < fastMa * (1 - rule.fastCut / 100)) {
    target = Math.min(target, rule.fastBearTarget);
    reasons.push(`跌破快线 ${formatPercent(rule.fastCut)}，目标不高于 ${formatPercent(rule.fastBearTarget)}`);
  }

  if (rule.useRsiBuy !== false && rsi !== null && rsi <= rule.rsiBuy) {
    target = Math.max(target, rule.rsiTarget);
    reasons.push(`RSI ${rsi.toFixed(1)} 超跌，目标不低于 ${formatPercent(rule.rsiTarget)}`);
  }

  if (rule.useRsiSell !== false && rsi !== null && rsi >= rule.rsiSell) {
    target = Math.min(target, rule.hotTarget);
    reasons.push(`RSI ${rsi.toFixed(1)} 过热，目标不高于 ${formatPercent(rule.hotTarget)}`);
  }

  if (rule.useAtr !== false && atr !== null && atr >= rule.highAtr) {
    target = Math.min(target, rule.volTarget);
    reasons.push(`ATR ${formatPercent(atr)} 高波动，目标不高于 ${formatPercent(rule.volTarget)}`);
  }

  return {
    target: Math.min(100, Math.max(0, target)),
    fastMa,
    slowMa,
    rsi,
    atr,
    reason: reasons.join("；"),
  };
}


function getPeVolumeDecision(row, index, series, rule) {
  const pe = getPeValue(row);
  const volume = Number(row.volume);
  const volumeMa = series.volumeMa[index];
  const band = series.peBands[index] || {};
  const reasons = [];

  if (!pe || !volume || !volumeMa || !band.low || !band.high) {
    return {
      target: 0,
      pe,
      volume,
      volumeMa,
      peLow: band.low,
      peHigh: band.high,
      volumeRatio: null,
      reason: "PE 或成交量样本不足，空仓等待",
    };
  }

  const volumeRatio = volumeMa > 0 ? volume / volumeMa : 0;
  let target = rule.neutralTarget;
  reasons.push(`PE ${pe.toFixed(2)}，低分位 ${band.low.toFixed(2)}，高分位 ${band.high.toFixed(2)}；成交量为均量 ${volumeRatio.toFixed(2)} 倍`);

  if (pe <= band.low && volumeRatio >= rule.volumeBuyMultiplier) {
    target = rule.lowPeTarget;
    reasons.push(`低 PE 且放量，目标 ${formatPercent(rule.lowPeTarget)}`);
  } else if (pe >= band.high || volumeRatio <= rule.volumeSellMultiplier) {
    target = rule.highPeTarget;
    reasons.push(pe >= band.high
      ? `高 PE，目标 ${formatPercent(rule.highPeTarget)}`
      : `缩量，目标 ${formatPercent(rule.highPeTarget)}`);
  } else {
    reasons.push(`估值和量能中性，目标 ${formatPercent(rule.neutralTarget)}`);
  }

  return {
    target: Math.min(100, Math.max(0, target)),
    pe,
    volume,
    volumeMa,
    peLow: band.low,
    peHigh: band.high,
    volumeRatio,
    reason: reasons.join("；"),
  };
}


function getOrderGridMaxLots(rule) {
  const capitalLimitedLots = Math.max(1, Math.floor(100 / Math.max(1, rule.orderCapitalPercent)));
  return Math.max(1, Math.min(rule.maxLots, capitalLimitedLots));
}


function getAccountSnapshot(account, row, initialCash, peakEquity, trades) {
  const positionValue = account.shares * row.close;
  const equity = account.cash + positionValue;
  const positionRatio = equity > 0 ? (positionValue / equity) * 100 : 0;
  const nextPeak = Math.max(peakEquity, equity);
  const drawdown = nextPeak > 0 ? ((nextPeak - equity) / nextPeak) * 100 : 0;

  return {
    row,
    cash: account.cash,
    shares: account.shares,
    positionValue,
    equity,
    positionRatio,
    totalFees: account.totalFees || 0,
    returnRate: initialCash > 0 ? ((equity - initialCash) / initialCash) * 100 : 0,
    peakEquity: nextPeak,
    drawdown,
    trades: trades.slice(),
  };
}


function getTradeAccountState(account, price) {
  const positionValue = account.shares * price;
  const equity = account.cash + positionValue;
  return {
    accountCash: account.cash,
    accountShares: account.shares,
    accountEquity: equity,
    accountPositionRatio: equity > 0 ? (positionValue / equity) * 100 : 0,
  };
}


function isStarMarketSymbol(symbol) {
  return /^688/.test(String(symbol || "").trim());
}


// Ported from public/app.js, which reads this from a DOM input (codeInput.value)
// since the browser only ever runs one backtest at a time for "the current symbol".
// Here it's a module-level value the caller sets before each symbol's backtest run.
let activeLotSizeSymbol = "";
function setActiveLotSizeSymbol(symbol) {
  activeLotSizeSymbol = symbol || "";
}
function getMinTradeLotSize() {
  return isStarMarketSymbol(activeLotSizeSymbol) ? 200 : 100;
}


function roundDownToLot(shares, lotSize) {
  if (!(lotSize > 0)) return Math.floor(shares);
  return Math.floor(shares / lotSize) * lotSize;
}


function buyToTarget(account, row, rowIndex, targetPercent, reference, triggerPercent, trades, tradeFee = 0) {
  const price = row.close;
  const equity = account.cash + account.shares * price;
  const currentValue = account.shares * price;
  const targetValue = equity * (targetPercent / 100);
  const availableCash = Math.max(0, account.cash - tradeFee);
  const buyValue = Math.min(availableCash, targetValue - currentValue);
  const shares = roundDownToLot(Math.floor(buyValue / price), getMinTradeLotSize());

  if (shares <= 0) return false;

  account.cash -= shares * price + tradeFee;
  account.shares += shares;
  account.totalFees = (account.totalFees || 0) + tradeFee;
  const accountState = getTradeAccountState(account, price);
  const trade = {
    date: row.date,
    rowIndex,
    side: "buy",
    label: "买入",
    price,
    shares,
    fee: tradeFee,
    totalFees: account.totalFees,
    positionRatio: accountState.accountPositionRatio,
    ...accountState,
    reference,
    triggerPercent,
    reason: `较${reference.label}回撤 ${formatPercent(triggerPercent)}`,
  };
  trades.push(trade);
  return trade;
}


function sellByReduction(account, row, rowIndex, reducePercent, reference, triggerPercent, trades, tradeFee = 0) {
  const price = row.close;
  const equity = account.cash + account.shares * price;
  const currentValue = account.shares * price;
  const currentRatio = equity > 0 ? (currentValue / equity) * 100 : 0;
  const targetRatio = Math.max(0, currentRatio - reducePercent);
  const targetValue = equity * (targetRatio / 100);
  const sellValue = Math.max(0, currentValue - targetValue);
  const rawShares = Math.min(account.shares, Math.floor(sellValue / price));
  // A full exit is always allowed regardless of lot size; a partial sell must round
  // down to a whole lot so we never leave (or create) an unsellable sub-lot trade.
  const shares = rawShares >= account.shares ? rawShares : roundDownToLot(rawShares, getMinTradeLotSize());

  if (shares <= 0) return false;

  account.cash += shares * price - tradeFee;
  account.shares -= shares;
  account.totalFees = (account.totalFees || 0) + tradeFee;
  const accountState = getTradeAccountState(account, price);
  const trade = {
    date: row.date,
    rowIndex,
    side: "sell",
    label: "卖出",
    price,
    shares,
    fee: tradeFee,
    totalFees: account.totalFees,
    positionRatio: accountState.accountPositionRatio,
    ...accountState,
    reference,
    triggerPercent,
    reason: `较${reference.label}上涨 ${formatPercent(triggerPercent)}`,
  };
  trades.push(trade);
  return trade;
}


function rebalanceToTarget(account, row, rowIndex, targetPercent, reference, reason, trades, tradeFee = 0) {
  const price = row.close;
  const equity = account.cash + account.shares * price;
  if (equity <= 0 || price <= 0) return false;

  const currentRatio = getPositionRatio(account, row);
  const targetRatio = Math.min(100, Math.max(0, targetPercent));
  const targetShares = Math.floor((equity * targetRatio / 100) / price);
  const delta = targetShares - account.shares;
  if (delta === 0) return false;

  if (delta > 0) {
    const maxShares = Math.floor(Math.max(0, account.cash - tradeFee) / price);
    const shares = roundDownToLot(Math.min(delta, maxShares), getMinTradeLotSize());
    if (shares <= 0) return false;

    account.cash -= shares * price + tradeFee;
    account.shares += shares;
    account.totalFees = (account.totalFees || 0) + tradeFee;
    const accountState = getTradeAccountState(account, price);
    const trade = {
      date: row.date,
      rowIndex,
      side: "buy",
      label: "买入",
      price,
      shares,
      fee: tradeFee,
      totalFees: account.totalFees,
      positionRatio: accountState.accountPositionRatio,
      ...accountState,
      reference,
      triggerPercent: targetRatio - currentRatio,
      reason,
    };
    trades.push(trade);
    return trade;
  }

  const rawShares = Math.min(account.shares, -delta);
  const isFullExit = rawShares >= account.shares;
  const shares = isFullExit ? rawShares : roundDownToLot(rawShares, getMinTradeLotSize());
  if (shares <= 0) return false;

  account.cash += shares * price - tradeFee;
  account.shares -= shares;
  account.totalFees = (account.totalFees || 0) + tradeFee;
  const accountState = getTradeAccountState(account, price);
  const trade = {
    date: row.date,
    rowIndex,
    side: "sell",
    label: "卖出",
    price,
    shares,
    fee: tradeFee,
    totalFees: account.totalFees,
    positionRatio: accountState.accountPositionRatio,
    ...accountState,
    reference,
    triggerPercent: currentRatio - targetRatio,
    reason,
  };
  trades.push(trade);
  return trade;
}


function buyFixedCapitalLot(account, row, rowIndex, capitalAmount, reference, triggerPercent, reason, trades, tradeFee = 0) {
  const price = row.close;
  const buyValue = Math.min(Math.max(0, account.cash - tradeFee), capitalAmount);
  const shares = roundDownToLot(Math.floor(buyValue / price), getMinTradeLotSize());
  if (shares <= 0) return false;

  account.cash -= shares * price + tradeFee;
  account.shares += shares;
  account.totalFees = (account.totalFees || 0) + tradeFee;
  const accountState = getTradeAccountState(account, price);
  const trade = {
    date: row.date,
    rowIndex,
    side: "buy",
    label: "买入",
    price,
    shares,
    fee: tradeFee,
    totalFees: account.totalFees,
    positionRatio: accountState.accountPositionRatio,
    ...accountState,
    reference,
    triggerPercent,
    reason,
  };
  trades.push(trade);
  return trade;
}


function sellExactShares(account, row, rowIndex, sharesToSell, reference, triggerPercent, reason, trades, tradeFee = 0) {
  const price = row.close;
  const shares = Math.min(account.shares, Math.floor(sharesToSell));
  if (shares <= 0) return false;

  account.cash += shares * price - tradeFee;
  account.shares -= shares;
  account.totalFees = (account.totalFees || 0) + tradeFee;
  const accountState = getTradeAccountState(account, price);
  const trade = {
    date: row.date,
    rowIndex,
    side: "sell",
    label: "卖出",
    price,
    shares,
    fee: tradeFee,
    totalFees: account.totalFees,
    positionRatio: accountState.accountPositionRatio,
    ...accountState,
    reference,
    triggerPercent,
    reason,
  };
  trades.push(trade);
  return trade;
}


function getPositionRatio(account, row) {
  const equity = account.cash + account.shares * row.close;
  return equity > 0 ? ((account.shares * row.close) / equity) * 100 : 0;
}


function getPreviousHigh(rows, index, lookbackDays) {
  if (index < lookbackDays) return null;
  const start = index - lookbackDays;
  let bestIndex = start;
  for (let i = start + 1; i < index; i += 1) {
    if (rows[i].high > rows[bestIndex].high) bestIndex = i;
  }
  return {
    ...rows[bestIndex],
    rowIndex: bestIndex,
  };
}


function getPreviousLow(rows, index, lookbackDays) {
  if (index < lookbackDays) return null;
  const start = index - lookbackDays;
  let bestIndex = start;
  for (let i = start + 1; i < index; i += 1) {
    if (rows[i].low < rows[bestIndex].low) bestIndex = i;
  }
  return {
    ...rows[bestIndex],
    rowIndex: bestIndex,
  };
}


function buildStagnationReversalBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const rule = readStagnationReversalRule(config.stagnationReversalRule || defaultStagnationReversalRule);
  const account = {
    cash: config.initialCash,
    shares: 0,
    totalFees: 0,
  };
  const trades = [];
  const states = [];
  const buySignals = [];
  const sellSignals = [];
  let noNewLowDays = 0;
  let noNewHighDays = 0;
  let waitingForSell = false;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const previousLow = getPreviousLow(rows, index, rule.buyLookbackDays);
    const previousHigh = getPreviousHigh(rows, index, rule.sellLookbackDays);

    if (previousLow) {
      noNewLowDays = row.low < previousLow.low ? 0 : noNewLowDays + 1;
    }

    if (!waitingForSell && previousLow && noNewLowDays >= rule.buyStalledDays) {
      const trade = buyToTarget(
        account,
        row,
        index,
        rule.buyTarget,
        {
          type: "rolling-low",
          label: `${rule.buyLookbackDays}日低点`,
          date: previousLow.date,
          price: previousLow.low,
          confirmDate: row.date,
          confirmPrice: row.low,
          confirmLabel: "未创新低确认",
        },
        noNewLowDays,
        trades,
        config.tradeFee
      );
      if (trade) {
        trade.reason = `连续 ${noNewLowDays} 天未跌破前 ${rule.buyLookbackDays} 日低点 ${formatPrice(previousLow.low)}，买入到 ${formatPercent(rule.buyTarget)}`;
        buySignals.push({
          date: row.date,
          price: row.close,
          rowIndex: index,
          confirmDate: previousLow.date,
          confirmPrice: previousLow.low,
          confirmRowIndex: previousLow.rowIndex,
          confirmLabel: `${rule.buyLookbackDays}日低点`,
          version: buySignals.length + 1,
        });
        waitingForSell = true;
        noNewHighDays = 0;
      }
    }

    if (account.shares > 0 && previousHigh) {
      noNewHighDays = row.high > previousHigh.high ? 0 : noNewHighDays + 1;
      if (noNewHighDays >= rule.sellStalledDays) {
        const trade = sellByReduction(
          account,
          row,
          index,
          rule.sellReduce,
          {
            type: "rolling-high",
            label: `${rule.sellLookbackDays}日高点`,
            date: previousHigh.date,
            price: previousHigh.high,
            confirmDate: row.date,
            confirmPrice: row.high,
            confirmLabel: "未创新高确认",
          },
          noNewHighDays,
          trades,
          config.tradeFee
        );
        if (trade) {
          trade.reason = `连续 ${noNewHighDays} 天未突破前 ${rule.sellLookbackDays} 日高点 ${formatPrice(previousHigh.high)}，卖出 ${formatPercent(rule.sellReduce)}`;
          sellSignals.push({
            date: row.date,
            price: row.close,
            rowIndex: index,
            confirmDate: previousHigh.date,
            confirmPrice: previousHigh.high,
            confirmRowIndex: previousHigh.rowIndex,
            confirmLabel: `${rule.sellLookbackDays}日高点`,
            version: sellSignals.length + 1,
          });
          if (getPositionRatio(account, row) <= 0.5 || rule.sellReduce >= 100) {
            waitingForSell = false;
            noNewLowDays = 0;
          }
          noNewHighDays = 0;
        }
      }
    }

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = sellSignals.slice();
    snapshot.indicatorLows = buySignals.slice();
    states.push(snapshot);
  });

  return states;
}


function buildWaveBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const account = {
    cash: config.initialCash,
    shares: 0,
    totalFees: 0,
  };
  const wave = createWaveTracker(rows[0], config.waveThreshold);
  const noNewHighRule = config.noNewHighExitRule || defaultNoNewHighExitRule;
  const triggeredBuys = new Set();
  const triggeredSells = new Set();
  const trades = [];
  const states = [];
  const waveHighs = [];
  let lastBuyTrade = null;
  let noNewHighDays = 0;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const events = updateWaveTracker(wave, row);
    if (events.includes("new-high")) {
      triggeredBuys.clear();
      waveHighs.push({
        date: wave.high.date,
        price: wave.high.price,
        rowIndex: rows.findIndex((item) => item.date === wave.high.date),
        confirmDate: row.date,
        confirmPrice: row.low,
        confirmRowIndex: index,
        confirmLabel: "确认低价",
        version: wave.high.version,
      });
    }
    let boughtToday = false;

    const drawdown = wave.high.price > 0
      ? ((wave.high.price - row.close) / wave.high.price) * 100
      : 0;

    let deepestUntriggeredBuyRule = null;
    config.buyRules.forEach((rule) => {
      const key = `${wave.high.version}:${rule.drop}:${rule.target}`;
      if (drawdown >= rule.drop && !triggeredBuys.has(key)) {
        if (!deepestUntriggeredBuyRule || rule.drop > deepestUntriggeredBuyRule.drop) {
          deepestUntriggeredBuyRule = rule;
        }
      }
    });
    if (deepestUntriggeredBuyRule) {
      const rule = deepestUntriggeredBuyRule;
      const trade = buyToTarget(
        account,
        row,
        index,
        Math.min(100, Math.max(0, rule.target)),
        {
          type: "high",
          label: "阶段高点",
          date: wave.high.date,
          price: wave.high.price,
          confirmDate: row.date,
          confirmPrice: row.low,
          confirmLabel: "确认低价",
        },
        drawdown,
        trades,
        config.tradeFee
      );
      if (trade) {
        trade.reason = `触发买入规则：较阶段高点回撤 ${formatPercent(drawdown)}，达到 ${formatPercent(rule.drop)} 阈值，加仓到 ${formatPercent(rule.target)}`;
        lastBuyTrade = trade;
        triggeredSells.clear();
        noNewHighDays = 0;
        boughtToday = true;
      }
      // Mark this rule and every shallower rule as triggered so a later day with a
      // smaller drawdown never re-fires a shallower rule and walks the position back down.
      config.buyRules.forEach((otherRule) => {
        if (otherRule.drop <= rule.drop) {
          triggeredBuys.add(`${wave.high.version}:${otherRule.drop}:${otherRule.target}`);
        }
      });
    }

    if (lastBuyTrade && account.shares > 0) {
      const riseFromLastBuy = lastBuyTrade.price > 0
        ? ((row.close - lastBuyTrade.price) / lastBuyTrade.price) * 100
        : 0;

      config.sellRules.forEach((rule) => {
        const key = `${lastBuyTrade.rowIndex}:${lastBuyTrade.price}:${rule.rise}:${rule.reduce}`;
        if (riseFromLastBuy >= rule.rise && !triggeredSells.has(key)) {
          const trade = sellByReduction(
            account,
            row,
            index,
            Math.min(100, Math.max(0, rule.reduce)),
            {
              type: "last-buy",
              label: "最近买入价",
              date: lastBuyTrade.date,
              price: lastBuyTrade.price,
            },
            riseFromLastBuy,
            trades,
            config.tradeFee
          );
          if (trade) {
            trade.reason = `触发卖出规则：较最近买入价上涨 ${formatPercent(riseFromLastBuy)}，达到 ${formatPercent(rule.rise)} 阈值，减仓 ${formatPercent(rule.reduce)}`;
          }
          triggeredSells.add(key);
        }
      });
    }

    if (noNewHighRule.enabled && account.shares > 0 && !boughtToday) {
      const previousHigh = getPreviousHigh(rows, index, noNewHighRule.lookbackDays);
      if (previousHigh) {
        if (row.high > previousHigh.high) {
          noNewHighDays = 0;
        } else {
          noNewHighDays += 1;
        }

        if (noNewHighDays >= noNewHighRule.stalledDays) {
          const trade = sellByReduction(
            account,
            row,
            index,
            noNewHighRule.reduce,
            {
              type: "rolling-high",
              label: `${noNewHighRule.lookbackDays}日高点`,
              date: previousHigh.date,
              price: previousHigh.high,
            },
            noNewHighDays,
            trades,
            config.tradeFee
          );

          if (trade) {
            const closeText = noNewHighRule.reduce >= 100
              ? "全平"
              : `平仓 ${formatPercent(noNewHighRule.reduce)}`;
            trade.reason = `连续 ${noNewHighDays} 天未突破前 ${noNewHighRule.lookbackDays} 日高点，${closeText}`;
            lastBuyTrade = null;
            triggeredSells.clear();
            noNewHighDays = 0;
          }
        }
      }
    }

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = waveHighs.slice();
    states.push(snapshot);
  });

  return states;
}


function getRollingHigh(rows, index, lookbackDays) {
  const start = Math.max(0, index - lookbackDays + 1);
  let bestIndex = start;
  for (let i = start + 1; i <= index; i += 1) {
    if (rows[i].high > rows[bestIndex].high) bestIndex = i;
  }
  return {
    ...rows[bestIndex],
    rowIndex: bestIndex,
  };
}


function buildLocalLadderBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const rule = config.localLadderRule || defaultLocalLadderRule;
  const account = {
    cash: config.initialCash,
    shares: 0,
    totalFees: 0,
  };
  const buyLots = [];
  const trades = [];
  const states = [];
  const indicatorHighs = [];
  const indicatorLows = [];
  let anchorHigh = getRollingHigh(rows, 0, rule.lookbackDays);
  let deepestLevelBought = 0;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const rollingHigh = getRollingHigh(rows, index, rule.lookbackDays);
    const ratioBefore = getPositionRatio(account, row);
    const allowAnchorReset = ratioBefore <= rule.resetPositionBelow || row.high >= anchorHigh.high;

    if (allowAnchorReset && rollingHigh.high > anchorHigh.high) {
      anchorHigh = rollingHigh;
      deepestLevelBought = 0;
      indicatorHighs.push({
        date: anchorHigh.date,
        price: anchorHigh.high,
        rowIndex: anchorHigh.rowIndex,
        version: indicatorHighs.length + 1,
      });
    }

    if (row.high > anchorHigh.high) {
      anchorHigh = { ...row, rowIndex: index };
      deepestLevelBought = 0;
      indicatorHighs.push({
        date: row.date,
        price: row.high,
        rowIndex: index,
        version: indicatorHighs.length + 1,
      });
    }

    const pullback = anchorHigh.high > 0 ? ((anchorHigh.high - row.close) / anchorHigh.high) * 100 : 0;
    if (pullback >= rule.entryDrop) {
      const level = 1 + Math.floor((pullback - rule.entryDrop) / rule.ladderDrop);
      while (deepestLevelBought < level) {
        const currentRatio = getPositionRatio(account, row);
        const target = Math.min(rule.maxTarget, currentRatio + rule.buyAdd);
        if (target <= currentRatio + 0.01) break;
        const trade = buyToTarget(
          account,
          row,
          index,
          target,
          {
            type: "local-high",
            label: `${rule.lookbackDays}日近端高点`,
            date: anchorHigh.date,
            price: anchorHigh.high,
          },
          pullback,
          trades,
          config.tradeFee
        );

        if (trade) {
          trade.reason = `较${rule.lookbackDays}日近端高点回落 ${formatPercent(pullback)}，阶梯加仓到 ${formatPercent(target)}`;
          buyLots.push({ price: row.close, date: row.date, rowIndex: index, level: deepestLevelBought + 1 });
          indicatorLows.push({
            date: row.date,
            price: row.close,
            rowIndex: index,
            confirmDate: anchorHigh.date,
            confirmPrice: anchorHigh.high,
            confirmRowIndex: anchorHigh.rowIndex,
            confirmLabel: "锚定高点",
            version: indicatorLows.length + 1,
          });
        }

        deepestLevelBought += 1;
        if (getPositionRatio(account, row) >= rule.maxTarget - 0.5) break;
      }
    }

    if (account.shares > 0 && buyLots.length > 0) {
      let sellsToday = 0;
      while (buyLots.length > 0 && sellsToday < rule.maxSellsPerDay) {
        const lastBuy = buyLots[buyLots.length - 1];
        const rise = lastBuy.price > 0 ? ((row.close - lastBuy.price) / lastBuy.price) * 100 : 0;
        if (rise < rule.sellRise) break;

        const trade = sellByReduction(
          account,
          row,
          index,
          rule.sellReduce,
          {
            type: "last-buy",
            label: "最近阶梯买入价",
            date: lastBuy.date,
            price: lastBuy.price,
          },
          rise,
          trades,
          config.tradeFee
        );

        if (!trade) break;
        trade.reason = `较最近阶梯买入价上涨 ${formatPercent(rise)}，减仓 ${formatPercent(rule.sellReduce)}`;
        buyLots.pop();
        sellsToday += 1;
      }
    }

    if (rule.stopLoss > 0 && account.shares > 0) {
      const stopPullback = anchorHigh.high > 0 ? ((anchorHigh.high - row.close) / anchorHigh.high) * 100 : 0;
      if (stopPullback >= rule.stopLoss) {
        const trade = sellByReduction(
          account,
          row,
          index,
          rule.stopReduce,
          {
            type: "local-high",
            label: "深跌保护高点",
            date: anchorHigh.date,
            price: anchorHigh.high,
          },
          stopPullback,
          trades,
          config.tradeFee
        );

        if (trade) {
          trade.reason = `较近端高点回落 ${formatPercent(stopPullback)}，深跌保护平仓 ${formatPercent(rule.stopReduce)}`;
          buyLots.length = 0;
          deepestLevelBought = 0;
          anchorHigh = rollingHigh;
        }
      }
    }

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = indicatorHighs.slice();
    snapshot.indicatorLows = indicatorLows.slice();
    states.push(snapshot);
  });

  return states;
}


function buildMaRsiBandBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const rule = config.maRsiBandRule || defaultMaRsiBandRule;
  const series = buildMaRsiBandSeries(rows, rule);
  const account = {
    cash: config.initialCash,
    shares: 0,
    totalFees: 0,
  };
  const trades = [];
  const states = [];
  const targetDownSignals = [];
  const targetUpSignals = [];
  let previousTarget = 0;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const decision = getMaRsiBandDecision(row, index, series, rule);

    if (decision.target > previousTarget + 0.5) {
      targetUpSignals.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        confirmDate: row.date,
        confirmPrice: decision.slowMa || row.close,
        confirmRowIndex: index,
        confirmLabel: "慢均线",
        version: targetUpSignals.length + 1,
      });
    } else if (decision.target < previousTarget - 0.5) {
      targetDownSignals.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        confirmDate: row.date,
        confirmPrice: decision.fastMa || row.close,
        confirmRowIndex: index,
        confirmLabel: "快均线",
        version: targetDownSignals.length + 1,
      });
    }

    const currentRatio = getPositionRatio(account, row);
    const reference = {
      type: "indicator",
      label: "目标仓位",
      date: row.date,
      price: row.close,
    };
    const actionText = decision.target >= currentRatio ? "加仓" : "减仓";
    const reason = `${actionText}到 ${formatPercent(decision.target)}；${decision.reason}`;
    rebalanceToTarget(account, row, index, decision.target, reference, reason, trades, config.tradeFee);
    previousTarget = decision.target;

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = targetDownSignals.slice();
    snapshot.indicatorLows = targetUpSignals.slice();
    states.push(snapshot);
  });

  return states;
}


function buildOrderGridBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const rule = config.orderGridRule || defaultOrderGridRule;
  const account = {
    cash: config.initialCash,
    shares: 0,
    totalFees: 0,
  };
  const lots = [];
  const trades = [];
  const states = [];
  const indicatorHighs = [];
  const indicatorLows = [];
  const seenHighs = new Set();
  const lotCapital = config.initialCash * (rule.orderCapitalPercent / 100);
  const maxLots = getOrderGridMaxLots(rule);
  let nextLotId = 1;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const rollingHigh = getRollingHigh(rows, index, rule.lookbackDays);
    const highKey = `${rollingHigh.date}:${rollingHigh.high}`;
    if (!seenHighs.has(highKey)) {
      indicatorHighs.push({
        date: rollingHigh.date,
        price: rollingHigh.high,
        rowIndex: rollingHigh.rowIndex,
        version: indicatorHighs.length + 1,
      });
      seenHighs.add(highKey);
    }

    for (let lotIndex = lots.length - 1; lotIndex >= 0; lotIndex -= 1) {
      const lot = lots[lotIndex];
      const rise = lot.price > 0 ? ((row.close - lot.price) / lot.price) * 100 : 0;
      if (rise >= rule.takeProfit) {
        const trade = sellExactShares(
          account,
          row,
          index,
          lot.shares,
          {
            type: "order-lot",
            label: `订单 ${lot.id} 买入价`,
            date: lot.date,
            price: lot.price,
          },
          rise,
          `订单 ${lot.id} 触发止盈：较下单价上涨 ${formatPercent(rise)}，达到 ${formatPercent(rule.takeProfit)} 阈值，卖出此单`,
          trades,
          config.tradeFee
        );
        if (trade) lots.splice(lotIndex, 1);
      }
    }

    if (lots.length === 0) {
      const pullback = rollingHigh.high > 0 ? ((rollingHigh.high - row.close) / rollingHigh.high) * 100 : 0;
      if (pullback >= rule.entryDrop) {
        const trade = buyFixedCapitalLot(
          account,
          row,
          index,
          lotCapital,
          {
            type: "rolling-high",
            label: `${rule.lookbackDays}日高点`,
            date: rollingHigh.date,
            price: rollingHigh.high,
          },
          pullback,
          `空仓触发首单：较最近 ${rule.lookbackDays} 天高点回撤 ${formatPercent(pullback)}，达到 ${formatPercent(rule.entryDrop)} 阈值，买入初始资金 ${formatPercent(rule.orderCapitalPercent)}`,
          trades,
          config.tradeFee
        );
        if (trade) {
          lots.push({ id: nextLotId, price: row.close, shares: trade.shares, date: row.date, rowIndex: index });
          nextLotId += 1;
          indicatorLows.push({
            date: row.date,
            price: row.close,
            rowIndex: index,
            confirmDate: rollingHigh.date,
            confirmPrice: rollingHigh.high,
            confirmRowIndex: rollingHigh.rowIndex,
            confirmLabel: `${rule.lookbackDays}日高点`,
            version: indicatorLows.length + 1,
          });
        }
      }
    } else {
      while (lots.length < maxLots) {
        const lastLot = lots[lots.length - 1];
        const drop = lastLot.price > 0 ? ((lastLot.price - row.close) / lastLot.price) * 100 : 0;
        if (drop < rule.addDrop) break;
        const trade = buyFixedCapitalLot(
          account,
          row,
          index,
          lotCapital,
          {
            type: "order-lot",
            label: `订单 ${lastLot.id} 买入价`,
            date: lastLot.date,
            price: lastLot.price,
          },
          drop,
          `触发追加订单：较上一单 ${lastLot.id} 下单价下跌 ${formatPercent(drop)}，达到 ${formatPercent(rule.addDrop)} 阈值，买入初始资金 ${formatPercent(rule.orderCapitalPercent)}`,
          trades,
          config.tradeFee
        );
        if (!trade) break;
        lots.push({ id: nextLotId, price: row.close, shares: trade.shares, date: row.date, rowIndex: index });
        nextLotId += 1;
        indicatorLows.push({
          date: row.date,
          price: row.close,
          rowIndex: index,
          confirmDate: lastLot.date,
          confirmPrice: lastLot.price,
          confirmRowIndex: lastLot.rowIndex,
          confirmLabel: "上一单价格",
          version: indicatorLows.length + 1,
        });
      }
    }

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = indicatorHighs.slice();
    snapshot.indicatorLows = indicatorLows.slice();
    states.push(snapshot);
  });

  return states;
}


function buildPeVolumeBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const rule = config.peVolumeRule || defaultPeVolumeRule;
  const series = buildPeVolumeSeries(rows, rule);
  const account = {
    cash: config.initialCash,
    shares: 0,
    totalFees: 0,
  };
  const trades = [];
  const states = [];
  const targetDownSignals = [];
  const targetUpSignals = [];
  let previousTarget = 0;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const decision = getPeVolumeDecision(row, index, series, rule);

    if (decision.target > previousTarget + 0.5) {
      targetUpSignals.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        version: targetUpSignals.length + 1,
      });
    } else if (decision.target < previousTarget - 0.5) {
      targetDownSignals.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        version: targetDownSignals.length + 1,
      });
    }

    const currentRatio = getPositionRatio(account, row);
    const reference = {
      type: "pe-volume",
      label: "PE-成交量",
      date: row.date,
      price: row.close,
    };
    const actionText = decision.target >= currentRatio ? "加仓" : "减仓";
    const reason = `${actionText}到 ${formatPercent(decision.target)}；${decision.reason}`;
    rebalanceToTarget(account, row, index, decision.target, reference, reason, trades, config.tradeFee);
    previousTarget = decision.target;

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = targetDownSignals.slice();
    snapshot.indicatorLows = targetUpSignals.slice();
    states.push(snapshot);
  });

  return states;
}


// Formula conditions are keyed by their own formula text (different formula strings must
// never share a cache slot), everything else keeps the existing lookbackDays/slopeWindowDays
// key — shared by buildBlockRuleSeriesCache/getBlockConditionValue/getBlockConditionSeries so
// the three don't each reimplement (and risk drifting on) the same key format.
function getConditionCacheKey(condition) {
  if (condition.indicator === "formula") return `formula:${condition.formula}`;
  return `${condition.indicator}:${condition.lookbackDays || 0}:${condition.slopeWindowDays || 1}`;
}


function buildBlockRuleSeriesCache(rows, buyBlockRules, sellBlockRules, waveThreshold) {
  const cache = new Map();
  const ensure = (condition) => {
    if (!condition || condition.indicator === "positionRatio" || condition.indicator === "holdingDays") return;
    const key = getConditionCacheKey(condition);
    if (cache.has(key)) return;
    let series = null;
    if (condition.indicator === "drawdownFromHigh") series = getDrawdownFromHighSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "drawdownFromWaveHigh") series = getDrawdownFromWaveHighSeries(rows, waveThreshold || 5);
    else if (condition.indicator === "drawdownFromBreakoutHigh") series = getDrawdownFromBreakoutHighSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "riseFromLow") series = getRiseFromLowSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "maValue") series = getMaValueDiffSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "maLevel") series = getMovingAverageSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "maSlope") series = getMaSlopeSeries(rows, condition.lookbackDays, condition.slopeWindowDays);
    else if (condition.indicator === "rsi") series = getRsiSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "atrPercent") series = getAtrPercentSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "volumeRatio") series = getVolumeRatioSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "daysSinceNewHigh") series = getDaysSinceNewHighSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "daysSinceNewLow") series = getDaysSinceNewLowSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "upDayCount") series = getUpDayCountSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "downDayCount") series = getDownDayCountSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "maCompare") series = getMaCompareSeries(rows, condition.lookbackDays, condition.slopeWindowDays);
    else if (condition.indicator === "candleBody") series = getCandleBodySeries(rows);
    else if (condition.indicator === "formula") series = FormulaEngine.compileFormulaSeries(rows, condition.formula);
    if (series) cache.set(key, series);
  };
  [...(buyBlockRules || []), ...(sellBlockRules || [])].forEach((block) => {
    (block && block.conditions || []).forEach(ensure);
  });
  return cache;
}


function getBlockConditionValue(condition, index, cache, positionRatioHistory, holdingDaysHistory) {
  if (condition.indicator === "positionRatio") return positionRatioHistory[index];
  if (condition.indicator === "holdingDays") return holdingDaysHistory[index];
  const series = cache.get(getConditionCacheKey(condition));
  return series ? series[index] : null;
}


function compareBlockValue(value, comparator, target) {
  if (value === null || value === undefined || !Number.isFinite(value)) return false;
  if (comparator === ">") return value > target;
  if (comparator === ">=") return value >= target;
  if (comparator === "<") return value < target;
  if (comparator === "<=") return value <= target;
  if (comparator === "==") return value === target;
  return false;
}


function getBlockConditionSeries(condition, cache, positionRatioHistory, holdingDaysHistory) {
  if (condition.indicator === "positionRatio") return positionRatioHistory;
  if (condition.indicator === "holdingDays") return holdingDaysHistory;
  return cache.get(getConditionCacheKey(condition)) || null;
}

// True iff the indicator's own series moved the same direction every day for the last
// `days` day-over-day comparisons ending at `index` — i.e. a genuine consecutive streak,
// not just "higher/lower than N days ago" (which a few zig-zag days in between could still
// satisfy without ever being a real streak).
function isMonotonicStreak(series, index, days, direction) {
  if (!series || !Number.isFinite(days) || days < 1 || index < days) return false;
  for (let offset = 0; offset < days; offset += 1) {
    const curr = series[index - offset];
    const prev = series[index - offset - 1];
    if (curr === null || curr === undefined || prev === null || prev === undefined) return false;
    if (direction > 0 ? !(curr > prev) : !(curr < prev)) return false;
  }
  return true;
}

function evaluateBlockCondition(condition, index, cache, positionRatioHistory, holdingDaysHistory) {
  if (condition.comparator === "risingStreak" || condition.comparator === "fallingStreak") {
    const days = Math.max(1, Math.round(Number(condition.value) || 1));
    const direction = condition.comparator === "risingStreak" ? 1 : -1;
    const series = getBlockConditionSeries(condition, cache, positionRatioHistory, holdingDaysHistory);
    return isMonotonicStreak(series, index, days, direction);
  }
  const sustainedDays = Math.max(1, Math.round(Number(condition.sustainedDays) || 1));
  for (let offset = 0; offset < sustainedDays; offset += 1) {
    const dayIndex = index - offset;
    if (dayIndex < 0) return false;
    const value = getBlockConditionValue(condition, dayIndex, cache, positionRatioHistory, holdingDaysHistory);
    if (!compareBlockValue(value, condition.comparator, condition.value)) return false;
  }
  return true;
}


function evaluateBlockRuleConditions(block, index, cache, positionRatioHistory, holdingDaysHistory) {
  if (!block || !block.enabled || !Array.isArray(block.conditions) || block.conditions.length === 0) return false;
  return block.conditions.every((condition) => evaluateBlockCondition(condition, index, cache, positionRatioHistory, holdingDaysHistory));
}


function resolveBlockActionToTargetPercent(action, account, row, currentRatio) {
  const value = Number(action && action.value);
  const type = action && action.type;
  if (type === "targetPercent") return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  if (type === "targetShares") {
    const equity = account.cash + account.shares * row.close;
    if (equity <= 0 || row.close <= 0 || !Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, ((value * row.close) / equity) * 100));
  }
  if (type === "reducePercent") return Math.min(100, Math.max(0, currentRatio - (Number.isFinite(value) ? value : 0)));
  if (type === "exitAll") return 0;
  return currentRatio;
}


function getBlockIndicatorLabel(indicator) {
  const labels = {
    drawdownFromHigh: "距N日滚动高点回撤%",
    drawdownFromWaveHigh: "距波浪确认高点回撤%",
    drawdownFromBreakoutHigh: "距最近一次突破高点回撤%",
    riseFromLow: "距低点反弹%",
    maValue: "均线偏离%",
    maLevel: "均线数值",
    maSlope: "均线斜率%",
    rsi: "RSI",
    atrPercent: "ATR%",
    volumeRatio: "量比",
    daysSinceNewHigh: "未创新高天数",
    daysSinceNewLow: "未创新低天数",
    upDayCount: "上涨天数",
    downDayCount: "下跌天数",
    maCompare: "均线快慢线差%",
    candleBody: "K线阳阴%",
    positionRatio: "当前仓位%",
    holdingDays: "持仓天数",
    formula: "自定义公式",
  };
  return labels[indicator] || indicator;
}


function describeBlockCondition(condition) {
  if (condition.indicator === "formula") {
    const sustain = condition.sustainedDays && condition.sustainedDays > 1 ? `连续${condition.sustainedDays}天` : "";
    return `${sustain}公式[${condition.formula}]${condition.comparator}${condition.value}`;
  }
  const label = getBlockIndicatorLabel(condition.indicator);
  const days = condition.lookbackDays ? `${condition.lookbackDays}日` : "";
  const slopeWindow = condition.indicator === "maSlope" && condition.slopeWindowDays && condition.slopeWindowDays > 1
    ? `(较${condition.slopeWindowDays}日前)`
    : "";
  if (condition.comparator === "risingStreak" || condition.comparator === "fallingStreak") {
    const streakDays = Math.max(1, Math.round(Number(condition.value) || 1));
    const direction = condition.comparator === "risingStreak" ? "连续上升" : "连续下降";
    return `${days}${label}${slopeWindow}${direction}${streakDays}天`;
  }
  const sustain = condition.sustainedDays && condition.sustainedDays > 1 ? `连续${condition.sustainedDays}天` : "";
  return `${sustain}${days}${label}${slopeWindow}${condition.comparator}${condition.value}`;
}


function describeBlockConditions(conditions) {
  return (conditions || []).map(describeBlockCondition).join("且");
}


function describeBlockAction(action) {
  if (!action) return "";
  if (action.type === "targetPercent") return `调仓到${formatPercent(action.value)}`;
  if (action.type === "targetShares") return `调仓到${action.value}股`;
  if (action.type === "reducePercent") return `减仓${formatPercent(action.value)}`;
  if (action.type === "exitAll") return "全部清仓";
  return "";
}


function buildGenericBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const buyBlockRules = Array.isArray(config.buyBlockRules) ? config.buyBlockRules : defaultBuyBlockRules;
  const sellBlockRules = Array.isArray(config.sellBlockRules) ? config.sellBlockRules : defaultSellBlockRules;
  const cache = buildBlockRuleSeriesCache(rows, buyBlockRules, sellBlockRules, config.waveThreshold);

  const account = { cash: config.initialCash, shares: 0, totalFees: 0 };
  const trades = [];
  const states = [];
  const buySignals = [];
  const sellSignals = [];
  const positionRatioHistory = [];
  const holdingDaysHistory = [];
  const buyBlockWasActive = new Array(buyBlockRules.length).fill(false);
  const sellBlockWasActive = new Array(sellBlockRules.length).fill(false);
  let holdingDaysCounter = 0;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const currentRatio = getPositionRatio(account, row);
    positionRatioHistory[index] = currentRatio;
    holdingDaysCounter = account.shares > 0 ? holdingDaysCounter + 1 : 0;
    holdingDaysHistory[index] = holdingDaysCounter;

    let sellTarget = null;
    let sellReason = "";
    sellBlockRules.forEach((block, blockIndex) => {
      const matches = evaluateBlockRuleConditions(block, index, cache, positionRatioHistory, holdingDaysHistory);
      const fired = matches && !sellBlockWasActive[blockIndex];
      sellBlockWasActive[blockIndex] = matches;
      if (!fired) return;
      const target = resolveBlockActionToTargetPercent(block.action, account, row, currentRatio);
      if (sellTarget === null || target < sellTarget) {
        sellTarget = target;
        sellReason = `卖出规则${blockIndex + 1}触发：${describeBlockConditions(block.conditions)} → ${describeBlockAction(block.action)}`;
      }
    });

    let buyTarget = null;
    let buyReason = "";
    buyBlockRules.forEach((block, blockIndex) => {
      const matches = evaluateBlockRuleConditions(block, index, cache, positionRatioHistory, holdingDaysHistory);
      const fired = matches && !buyBlockWasActive[blockIndex];
      buyBlockWasActive[blockIndex] = matches;
      if (!fired) return;
      const target = resolveBlockActionToTargetPercent(block.action, account, row, currentRatio);
      if (buyTarget === null || target > buyTarget) {
        buyTarget = target;
        buyReason = `买入规则${blockIndex + 1}触发：${describeBlockConditions(block.conditions)} → ${describeBlockAction(block.action)}`;
      }
    });

    const reference = { type: "block-rules", label: "组合规则", date: row.date, price: row.close };
    if (sellTarget !== null) {
      const trade = rebalanceToTarget(account, row, index, sellTarget, reference, sellReason, trades, config.tradeFee);
      if (trade) sellSignals.push({ date: row.date, price: row.close, rowIndex: index, version: sellSignals.length + 1 });
    } else if (buyTarget !== null) {
      const trade = rebalanceToTarget(account, row, index, buyTarget, reference, buyReason, trades, config.tradeFee);
      if (trade) buySignals.push({ date: row.date, price: row.close, rowIndex: index, version: buySignals.length + 1 });
    }

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = sellSignals.slice();
    snapshot.indicatorLows = buySignals.slice();
    states.push(snapshot);
  });

  return states;
}


function buildScoreRuleBacktestStates(rows, config) {
  if (!rows || rows.length === 0) return [];

  const scoreRules = Array.isArray(config.scoreRules) ? config.scoreRules : defaultScoreRules;
  const positionBands = (Array.isArray(config.positionBands) ? config.positionBands : defaultPositionBands)
    .filter((band) => band && Number.isFinite(Number(band.minScore)))
    .slice()
    .sort((a, b) => Number(b.minScore) - Number(a.minScore));
  const cache = buildBlockRuleSeriesCache(rows, scoreRules, [], config.waveThreshold);

  const account = { cash: config.initialCash, shares: 0, totalFees: 0 };
  const trades = [];
  const states = [];
  const tradeSignals = [];
  const positionRatioHistory = [];
  const holdingDaysHistory = [];
  let holdingDaysCounter = 0;
  let peakEquity = config.initialCash;
  let maxDrawdown = 0;

  rows.forEach((row, index) => {
    const currentRatio = getPositionRatio(account, row);
    positionRatioHistory[index] = currentRatio;
    holdingDaysCounter = account.shares > 0 ? holdingDaysCounter + 1 : 0;
    holdingDaysHistory[index] = holdingDaysCounter;

    let totalScore = 0;
    const hitDescriptions = [];
    scoreRules.forEach((rule, ruleIndex) => {
      if (!rule || rule.enabled === false) return;
      if (!evaluateBlockRuleConditions(rule, index, cache, positionRatioHistory, holdingDaysHistory)) return;
      const points = Number(rule.points) || 0;
      totalScore += points;
      hitDescriptions.push(`规则${ruleIndex + 1}(+${points}分：${describeBlockConditions(rule.conditions)})`);
    });

    const matchedBand = positionBands.find((band) => totalScore >= Number(band.minScore));
    const targetPercent = matchedBand ? Math.min(100, Math.max(0, Number(matchedBand.targetPercent) || 0)) : 0;
    const reason = `总分${totalScore}：${hitDescriptions.join("、") || "无命中规则"} → 目标仓位${formatPercent(targetPercent)}`;
    const reference = { type: "score-rules", label: "打分模型", date: row.date, price: row.close };
    const trade = rebalanceToTarget(account, row, index, targetPercent, reference, reason, trades, config.tradeFee);
    if (trade) tradeSignals.push({ date: row.date, price: row.close, rowIndex: index, version: tradeSignals.length + 1 });

    const snapshot = getAccountSnapshot(account, row, config.initialCash, peakEquity, trades);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
    snapshot.maxDrawdown = maxDrawdown;
    snapshot.waveHighs = tradeSignals.slice();
    snapshot.indicatorLows = tradeSignals.slice();
    states.push(snapshot);
  });

  return states;
}


// Runs the backtest over the FULL rows array (which the caller is expected to include
// history well before scoringStartDate) so rolling-window indicators — moving averages,
// N-day highs/lows, breakout lookbacks, etc — have real data to compute from, then reports
// performance as if scoring only started at scoringStartDate: equity change is measured
// from the state immediately before scoringStartDate (not from config.initialCash, which
// would double-count whatever happened during the warmup period), drawdown is re-peaked at
// that same baseline, and trades are filtered to those on/after scoringStartDate. Without
// this, a strategy whose lookback period exceeds the scored window's own row count (e.g. a
// 357-day moving average measured over a 1-year test window) can never produce a valid
// signal at all — its 0% "result" would be a warmup artifact, not a real backtest outcome.
//
// scoringEndDate (optional, exclusive upper bound) bounds the TOP of the window too, so a
// caller can score a single bounded year out of a multi-year rows array (e.g. "2 years ago to
// 1 year ago") instead of always scoring open-ended through to the end of rows. Omitting it
// preserves the original "score to the end of rows" behavior exactly — every existing caller
// that only ever passed 3 args is unaffected.
function buildScoredBacktestStates(rows, config, scoringStartDate, scoringEndDate = null) {
  const states = buildBacktestStates(rows, config);
  if (states.length === 0) {
    return {
      returnRate: 0, maxDrawdown: 0, trades: [], rowsScored: 0, equity: config.initialCash || 0,
      cash: config.initialCash || 0, shares: 0, positionRatio: 0,
    };
  }
  const scoringStartIndex = rows.findIndex((row) => row.date >= scoringStartDate);
  const effectiveStartIndex = scoringStartIndex < 0 ? states.length : scoringStartIndex;
  const baselineEquity = effectiveStartIndex > 0
    ? states[effectiveStartIndex - 1].equity
    : (Number(config.initialCash) || 0);

  let effectiveEndIndex = states.length - 1;
  if (scoringEndDate) {
    const endIndex = rows.findIndex((row) => row.date >= scoringEndDate);
    effectiveEndIndex = endIndex < 0 ? states.length - 1 : Math.max(effectiveStartIndex, endIndex - 1);
  }

  const finalState = states[Math.min(effectiveEndIndex, states.length - 1)];
  const finalEquity = finalState.equity;
  const returnRate = baselineEquity > 0 ? ((finalEquity - baselineEquity) / baselineEquity) * 100 : 0;

  let peakEquity = baselineEquity;
  let maxDrawdown = 0;
  for (let i = effectiveStartIndex; i <= effectiveEndIndex && i < states.length; i += 1) {
    const equity = states[i].equity;
    peakEquity = Math.max(peakEquity, equity);
    const drawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  const trades = (finalState.trades || []).filter((trade) => trade.date >= scoringStartDate
    && (!scoringEndDate || trade.date < scoringEndDate));

  // cash/shares/equity are rebased the same way returnRate already is: scaled as if the
  // account had actually been reset to config.initialCash at the baseline (scoringStartDate),
  // not left at whatever dollar value the backtest happened to compound to across the full
  // (possibly multi-year) rows array before that point. Without this, a caller asking "what
  // would my account look like if I'd started trading on this date" would see the account's
  // true full-history-compounded balance (e.g. $18M from a 5-year warmup run) instead of a
  // number consistent with returnRate and a real starting balance — positionRatio needs no
  // scaling since it's already a ratio, invariant to the account's absolute size.
  const scale = baselineEquity > 0 ? (Number(config.initialCash) || 0) / baselineEquity : 1;

  return {
    returnRate,
    maxDrawdown,
    trades,
    rowsScored: Math.min(effectiveEndIndex, states.length - 1) - effectiveStartIndex + 1,
    equity: finalEquity * scale,
    cash: finalState.cash * scale,
    shares: finalState.shares * scale,
    positionRatio: finalState.positionRatio,
  };
}


function buildBacktestStates(rows, config) {
  if (config.strategyType === "block-rules") {
    return buildGenericBacktestStates(rows, config);
  }
  if (config.strategyType === "score-rules") {
    return buildScoreRuleBacktestStates(rows, config);
  }
  if (config.strategyType === "local-high-ladder") {
    return buildLocalLadderBacktestStates(rows, config);
  }
  if (config.strategyType === "ma-rsi-band") {
    return buildMaRsiBandBacktestStates(rows, config);
  }
  if (config.strategyType === "order-grid") {
    return buildOrderGridBacktestStates(rows, config);
  }
  if (config.strategyType === "pe-volume") {
    return buildPeVolumeBacktestStates(rows, config);
  }
  if (config.strategyType === "stagnation-reversal") {
    return buildStagnationReversalBacktestStates(rows, config);
  }
  return buildWaveBacktestStates(rows, config);
}


function buildBuyHoldStates(rows, initialCash, tradeFee = 0) {
  if (!rows || rows.length === 0) return [];

  const firstPrice = rows[0].close;
  const availableCash = Math.max(0, initialCash - tradeFee);
  const shares = firstPrice > 0 ? Math.floor(availableCash / firstPrice) : 0;
  const totalFees = shares > 0 ? tradeFee : 0;
  const cash = initialCash - shares * firstPrice - totalFees;
  let peakEquity = initialCash;
  let maxDrawdown = 0;

  return rows.map((row) => {
    const equity = cash + shares * row.close;
    peakEquity = Math.max(peakEquity, equity);
    const drawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    return {
      row,
      entryDate: rows[0].date,
      entryPrice: firstPrice,
      totalFees,
      cash,
      shares,
      equity,
      returnRate: initialCash > 0 ? ((equity - initialCash) / initialCash) * 100 : 0,
      maxDrawdown,
      positionRatio: equity > 0 ? ((shares * row.close) / equity) * 100 : 0,
    };
  });
}


function buildParallelBacktestStates(rows, config) {
  const modelStates = buildBacktestStates(rows, config);
  const buyHoldStates = buildBuyHoldStates(rows, config.initialCash, config.tradeFee);

  return modelStates.map((state, index) => {
    const buyHold = buyHoldStates[index];
    return {
      ...state,
      buyHold,
      excessReturn: buyHold ? state.returnRate - buyHold.returnRate : 0,
      drawdownDiff: buyHold ? state.maxDrawdown - buyHold.maxDrawdown : 0,
    };
  });
}


const DEFAULT_OPTIMIZATION_POINT_COUNT = 5;
const MAX_OPTIMIZATION_POINT_COUNT = 200;
const MAX_OPTIMIZATION_COMBINATIONS = 10000;

// Lets a batch caller (run-auto-generate.js) control how many discrete values each freshly-
// discovered parameter range gets tested at, without threading an extra argument through
// every discoverXxxParameters/computeDefaultParamRange call site — same module-level
// "current run context" convention as setActiveLotSizeSymbol above. 0 means "no override,
// use DEFAULT_OPTIMIZATION_POINT_COUNT" (the pre-existing behavior every other caller keeps).
let optimizationPointCountOverride = 0;
function setOptimizationPointCountOverride(pointCount) {
  optimizationPointCountOverride = Math.max(0, Math.round(Number(pointCount)) || 0);
}

function computeDefaultParamRange(value, isInteger, isPercent) {
  const pointCount = optimizationPointCountOverride > 0 ? optimizationPointCountOverride : DEFAULT_OPTIMIZATION_POINT_COUNT;
  if (isPercent) {
    return { min: 1, max: 100, pointCount };
  }
  const current = Number(value) || 0;
  const min = 1;
  let max = (current - min) * 3;
  if (isInteger) {
    max = Math.max(min + 1, Math.round(max));
  } else {
    max = Math.round(max * 100) / 100;
  }
  return { min, max, pointCount };
}


const CONDITION_FIELD_LABELS = {
  lookbackDays: "回看天数",
  slopeWindowDays: "斜率窗口天数",
  sustainedDays: "持续天数",
  value: "阈值",
};
const CONDITION_INTEGER_FIELDS = new Set(["lookbackDays", "slopeWindowDays", "sustainedDays"]);
// These indicators are inherently day-counts, so their comparison threshold (the
// "value" field) only ever makes sense as a whole number too — e.g. "未创新低天数
// >= 0.667" is meaningless, since a day count can't be a fraction of a day.
const CONDITION_DAY_COUNT_INDICATORS = new Set(["daysSinceNewHigh", "daysSinceNewLow", "upDayCount", "downDayCount"]);
const CONDITION_PERCENT_INDICATORS = new Set(["drawdownFromHigh", "drawdownFromWaveHigh", "riseFromLow", "maValue", "maSlope", "maCompare", "candleBody", "positionRatio"]);
const CONDITION_STREAK_COMPARATORS = new Set(["risingStreak", "fallingStreak"]);

// Shared by discoverBlockRuleParameters and discoverScoreRuleParameters — walking a
// condition list's numeric fields into optimization descriptors doesn't depend on what
// the enclosing rule/block does with the conditions once they're true.
function pushConditionParamDescriptors(descriptors, conditions, condLabelPrefix, pathPrefix) {
  (Array.isArray(conditions) ? conditions : []).forEach((condition, conditionIndex) => {
    const condLabel = `${condLabelPrefix}·条件${conditionIndex + 1}`;
    ["lookbackDays", "slopeWindowDays", "sustainedDays", "value"].forEach((field) => {
      const raw = condition[field];
      if (raw === null || raw === undefined || raw === "") return;
      const current = Number(raw);
      if (!Number.isFinite(current)) return;
      // risingStreak/fallingStreak repurpose "value" as a day count (see
      // blockRuleComparators comment), never a threshold — always integer, never percent.
      const isStreakDayCount = field === "value" && CONDITION_STREAK_COMPARATORS.has(condition.comparator);
      const isInteger = CONDITION_INTEGER_FIELDS.has(field) || isStreakDayCount || (field === "value" && CONDITION_DAY_COUNT_INDICATORS.has(condition.indicator));
      const isPercent = !isStreakDayCount && field === "value" && CONDITION_PERCENT_INDICATORS.has(condition.indicator);
      const range = computeDefaultParamRange(current, isInteger, isPercent);
      const fieldLabel = isStreakDayCount ? "连续天数" : CONDITION_FIELD_LABELS[field];
      descriptors.push({
        path: `${pathPrefix}.conditions[${conditionIndex}].${field}`,
        label: `${condLabel}·${fieldLabel}`,
        currentValue: current,
        isInteger,
        locked: false,
        min: range.min,
        max: range.max,
        pointCount: range.pointCount,
      });
    });
  });
}

function discoverBlockRuleParameters(preset) {
  const descriptors = [];
  const percentActionTypes = new Set(["targetPercent", "reducePercent"]);
  const walkBlocks = (blocks, sideLabel, sideKey) => {
    (Array.isArray(blocks) ? blocks : []).forEach((block, blockIndex) => {
      const blockLabel = `${sideLabel}规则${blockIndex + 1}`;
      pushConditionParamDescriptors(descriptors, block && block.conditions, blockLabel, `${sideKey}[${blockIndex}]`);
      if (block && block.action && block.action.type !== "exitAll") {
        const raw = block.action.value;
        if (raw !== null && raw !== undefined && raw !== "") {
          const current = Number(raw);
          if (Number.isFinite(current)) {
            const isInteger = block.action.type === "targetShares";
            const isPercent = percentActionTypes.has(block.action.type);
            const range = computeDefaultParamRange(current, isInteger, isPercent);
            descriptors.push({
              path: `${sideKey}[${blockIndex}].action.value`,
              label: `${blockLabel}·动作数值`,
              currentValue: current,
              isInteger,
              locked: false,
              min: range.min,
              max: range.max,
              pointCount: range.pointCount,
            });
          }
        }
      }
    });
  };
  walkBlocks(preset && preset.buyBlockRules, "买入", "buyBlockRules");
  walkBlocks(preset && preset.sellBlockRules, "卖出", "sellBlockRules");
  return descriptors;
}

function discoverScoreRuleParameters(preset) {
  const descriptors = [];
  (Array.isArray(preset && preset.scoreRules) ? preset.scoreRules : []).forEach((rule, ruleIndex) => {
    const ruleLabel = `打分规则${ruleIndex + 1}`;
    pushConditionParamDescriptors(descriptors, rule && rule.conditions, ruleLabel, `scoreRules[${ruleIndex}]`);
    const points = Number(rule && rule.points);
    if (Number.isFinite(points)) {
      const range = computeDefaultParamRange(points, true, false);
      descriptors.push({
        path: `scoreRules[${ruleIndex}].points`,
        label: `${ruleLabel}·分值`,
        currentValue: points,
        isInteger: true,
        locked: false,
        min: range.min,
        max: range.max,
        pointCount: range.pointCount,
      });
    }
  });
  (Array.isArray(preset && preset.positionBands) ? preset.positionBands : []).forEach((band, bandIndex) => {
    const bandLabel = `仓位档位${bandIndex + 1}`;
    const minScore = Number(band && band.minScore);
    if (Number.isFinite(minScore)) {
      const range = computeDefaultParamRange(minScore, true, false);
      descriptors.push({
        path: `positionBands[${bandIndex}].minScore`,
        label: `${bandLabel}·所需总分`,
        currentValue: minScore,
        isInteger: true,
        locked: false,
        min: range.min,
        max: range.max,
        pointCount: range.pointCount,
      });
    }
    const targetPercent = Number(band && band.targetPercent);
    if (Number.isFinite(targetPercent)) {
      const range = computeDefaultParamRange(targetPercent, false, true);
      descriptors.push({
        path: `positionBands[${bandIndex}].targetPercent`,
        label: `${bandLabel}·目标仓位%`,
        currentValue: targetPercent,
        isInteger: false,
        locked: false,
        min: range.min,
        max: range.max,
        pointCount: range.pointCount,
      });
    }
  });
  return descriptors;
}


const OPTIMIZATION_TYPE_CONFIG = {
  "order-grid": {
    ruleKey: "orderGridRule",
    defaultRule: defaultOrderGridRule,
    fields: [
      { key: "lookbackDays", label: "回看天数", isInteger: true },
      { key: "entryDrop", label: "首次建仓回撤%", isInteger: false, isPercent: true },
      { key: "addDrop", label: "每次加仓步进%", isInteger: false, isPercent: true },
      { key: "takeProfit", label: "止盈%", isInteger: false, isPercent: true },
      { key: "orderCapitalPercent", label: "单笔仓位%", isInteger: false, isPercent: true },
    ],
    postProcess: (rule) => {
      rule.maxLots = Math.max(1, Math.ceil(100 / Math.max(1, Number(rule.orderCapitalPercent) || 1)));
    },
  },
  "local-high-ladder": {
    ruleKey: "localLadderRule",
    defaultRule: defaultLocalLadderRule,
    fields: [
      { key: "lookbackDays", label: "回看天数", isInteger: true },
      { key: "entryDrop", label: "首次建仓回撤%", isInteger: false, isPercent: true },
      { key: "ladderDrop", label: "每级加仓步进%", isInteger: false, isPercent: true },
      { key: "buyAdd", label: "每级加仓比例%", isInteger: false, isPercent: true },
      { key: "sellRise", label: "每级减仓涨幅%", isInteger: false, isPercent: true },
    ],
    postProcess: (rule) => {
      rule.sellReduce = rule.buyAdd;
      rule.maxTarget = 100;
    },
  },
  "ma-rsi-band": {
    ruleKey: "maRsiBandRule",
    defaultRule: defaultMaRsiBandRule,
    fields: [
      { key: "fastMa", label: "快均线天数", isInteger: true },
      { key: "slowMa", label: "慢均线天数", isInteger: true },
      { key: "rsiBuy", label: "RSI买入阈值", isInteger: false },
      { key: "rsiSell", label: "RSI卖出阈值", isInteger: false },
    ],
  },
  "pe-volume": {
    ruleKey: "peVolumeRule",
    defaultRule: defaultPeVolumeRule,
    fields: [
      { key: "peLookbackDays", label: "PE回看天数", isInteger: true },
      { key: "lowPePercentile", label: "低PE分位", isInteger: false },
      { key: "highPePercentile", label: "高PE分位", isInteger: false },
      { key: "volumeMaDays", label: "成交量均线天数", isInteger: true },
      { key: "volumeBuyMultiplier", label: "放量买入倍数", isInteger: false },
      { key: "volumeSellMultiplier", label: "缩量卖出倍数", isInteger: false },
    ],
    postProcess: (rule) => {
      if (Number(rule.lowPePercentile) > Number(rule.highPePercentile)) {
        const tmp = rule.lowPePercentile;
        rule.lowPePercentile = rule.highPePercentile;
        rule.highPePercentile = tmp;
      }
    },
  },
  "stagnation-reversal": {
    ruleKey: "stagnationReversalRule",
    defaultRule: defaultStagnationReversalRule,
    fields: [
      { key: "buyStalledDays", label: "买入·未创新低天数", isInteger: true },
      { key: "sellStalledDays", label: "卖出·未创新高天数", isInteger: true },
      { key: "buyTarget", label: "买入目标仓位%", isInteger: false, isPercent: true },
      { key: "sellReduce", label: "卖出减仓%", isInteger: false, isPercent: true },
    ],
    postProcess: (rule) => {
      rule.buyLookbackDays = rule.buyStalledDays;
      rule.sellLookbackDays = rule.sellStalledDays;
    },
  },
};


function discoverWaveParameters(preset) {
  const descriptors = [];
  const waveThreshold = Math.max(0.1, Number(preset && preset.waveThreshold) || 5);
  const wtRange = computeDefaultParamRange(waveThreshold, false, true);
  descriptors.push({
    path: "waveThreshold",
    label: "波浪确认阈值%",
    currentValue: waveThreshold,
    isInteger: false,
    locked: false,
    min: wtRange.min,
    max: wtRange.max,
    pointCount: wtRange.pointCount,
  });
  const buyRules = cloneRules(preset && preset.buyRules, defaultBuyRules).filter((rule) => rule.enabled !== false);
  const sellRules = cloneRules(preset && preset.sellRules, defaultSellRules).filter((rule) => rule.enabled !== false);
  buyRules.forEach((rule, index) => {
    [["drop", "回撤%"], ["target", "目标仓位%"]].forEach(([key, label]) => {
      const current = Number(rule[key]) || 0;
      const range = computeDefaultParamRange(current, false, true);
      descriptors.push({
        path: `buyRules[${index}].${key}`,
        label: `买入规则${index + 1}·${label}`,
        currentValue: current,
        isInteger: false,
        locked: false,
        min: range.min,
        max: range.max,
        pointCount: range.pointCount,
      });
    });
  });
  sellRules.forEach((rule, index) => {
    [["rise", "涨幅%"], ["reduce", "减仓%"]].forEach(([key, label]) => {
      const current = Number(rule[key]) || 0;
      const range = computeDefaultParamRange(current, false, true);
      descriptors.push({
        path: `sellRules[${index}].${key}`,
        label: `卖出规则${index + 1}·${label}`,
        currentValue: current,
        isInteger: false,
        locked: false,
        min: range.min,
        max: range.max,
        pointCount: range.pointCount,
      });
    });
  });
  return descriptors;
}


function discoverOptimizationParameters(preset) {
  if (!preset) return [];
  const strategyType = preset.strategyType || "wave";
  if (strategyType === "block-rules") return discoverBlockRuleParameters(preset);
  if (strategyType === "score-rules") return discoverScoreRuleParameters(preset);
  if (strategyType === "wave") return discoverWaveParameters(preset);
  const typeConfig = OPTIMIZATION_TYPE_CONFIG[strategyType];
  if (!typeConfig) return discoverWaveParameters(preset);
  const rule = { ...typeConfig.defaultRule, ...(preset[typeConfig.ruleKey] || {}) };
  return typeConfig.fields.map((field) => {
    const current = Number(rule[field.key]);
    const value = Number.isFinite(current) ? current : 0;
    const range = computeDefaultParamRange(value, field.isInteger, field.isPercent);
    return {
      path: `${typeConfig.ruleKey}.${field.key}`,
      label: field.label,
      currentValue: value,
      isInteger: field.isInteger,
      locked: false,
      min: range.min,
      max: range.max,
      pointCount: range.pointCount,
    };
  });
}


function buildConfigFromDescriptorCombo(base, sourcePreset, strategyType, descriptors, combo) {
  if (strategyType === "block-rules") {
    const buyBlockRules = cloneRuleBlocks(sourcePreset.buyBlockRules, defaultBuyBlockRules);
    const sellBlockRules = cloneRuleBlocks(sourcePreset.sellBlockRules, defaultSellBlockRules);
    const root = { buyBlockRules, sellBlockRules };
    descriptors.forEach((descriptor, index) => {
      setBlockRuleValueAtPath(root, descriptor.path, combo[index]);
    });
    return { ...base, buyBlockRules, sellBlockRules };
  }
  if (strategyType === "score-rules") {
    const scoreRules = cloneScoreRules(sourcePreset.scoreRules, defaultScoreRules);
    const positionBands = clonePositionBands(sourcePreset.positionBands, defaultPositionBands);
    const root = { scoreRules, positionBands };
    descriptors.forEach((descriptor, index) => {
      setBlockRuleValueAtPath(root, descriptor.path, combo[index]);
    });
    return { ...base, scoreRules, positionBands };
  }
  const typeConfig = OPTIMIZATION_TYPE_CONFIG[strategyType];
  if (typeConfig) {
    const rule = { ...typeConfig.defaultRule, ...(sourcePreset[typeConfig.ruleKey] || {}) };
    const root = { [typeConfig.ruleKey]: rule };
    descriptors.forEach((descriptor, index) => {
      setBlockRuleValueAtPath(root, descriptor.path, combo[index]);
    });
    if (typeConfig.postProcess) typeConfig.postProcess(rule);
    return { ...base, [typeConfig.ruleKey]: rule };
  }
  // wave (and unknown fallback types) use buyRules/sellRules arrays instead of a single flat rule object.
  const buyRules = cloneRules(sourcePreset.buyRules, defaultBuyRules)
    .filter((rule) => rule.enabled !== false)
    .map((rule) => ({ ...rule }));
  const sellRules = cloneRules(sourcePreset.sellRules, defaultSellRules)
    .filter((rule) => rule.enabled !== false)
    .map((rule) => ({ ...rule }));
  const root = { waveThreshold: Math.max(0.1, Number(sourcePreset.waveThreshold) || 5), buyRules, sellRules };
  descriptors.forEach((descriptor, index) => {
    setBlockRuleValueAtPath(root, descriptor.path, combo[index]);
  });
  enforceMonotonicRules(root.buyRules, "drop", "target");
  enforceMonotonicRules(root.sellRules, "rise", "reduce");
  return {
    ...base,
    waveThreshold: root.waveThreshold,
    buyRules: root.buyRules,
    sellRules: root.sellRules,
    noNewHighExitRule: { enabled: false, ...defaultNoNewHighExitRule },
  };
}

// Independently-sampled optimization candidates can pair a deep drawdown/rise
// threshold with a small target/reduce (or vice versa), which is backwards for a
// tiered wave model — deeper drawdowns should always target at least as much
// position as shallower ones (and bigger rises should reduce at least as much).
// Re-pairing the same sampled values in sorted order fixes this without discarding
// any of the search diversity, and as a side effect leaves the rules array itself
// sorted by threshold for a sane narrative/UI display.

function enforceMonotonicRules(rules, thresholdKey, targetKey) {
  if (!Array.isArray(rules) || rules.length < 2) return rules;
  const thresholds = rules.map((rule) => rule[thresholdKey]).sort((a, b) => a - b);
  // Two sibling rules independently sampled from the same descriptor range can land on
  // the exact same threshold — since same-day ties always resolve to the rule with the
  // larger threshold, the lower-target rule at that threshold could then never fire on
  // its own, silently collapsing a tier. Nudge duplicates apart (keeping sort order) so
  // every rule keeps a distinct trigger point.
  for (let i = 1; i < thresholds.length; i += 1) {
    if (thresholds[i] <= thresholds[i - 1]) {
      thresholds[i] = Math.round((thresholds[i - 1] + 0.01) * 1000) / 1000;
    }
  }
  const targets = rules.map((rule) => rule[targetKey]).sort((a, b) => a - b);
  rules.forEach((rule, index) => {
    rule[thresholdKey] = thresholds[index];
    rule[targetKey] = targets[index];
  });
  return rules;
}


function setBlockRuleValueAtPath(root, path, value) {
  const segments = path.match(/[^[\].]+/g) || [];
  let target = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    target = target[/^\d+$/.test(segment) ? Number(segment) : segment];
    if (!target) return;
  }
  const lastSegment = segments[segments.length - 1];
  target[lastSegment] = value;
}


function buildRangeValues(descriptor) {
  if (descriptor.locked) {
    return [descriptor.isInteger ? Math.max(1, Math.round(descriptor.currentValue)) : descriptor.currentValue];
  }
  const min = Math.min(descriptor.min, descriptor.max);
  const max = Math.max(descriptor.min, descriptor.max);
  const requestedCount = Math.min(MAX_OPTIMIZATION_POINT_COUNT, Math.max(2, Math.round(descriptor.pointCount) || DEFAULT_OPTIMIZATION_POINT_COUNT));
  // Reserve one slot for the current value so "候选点数" (pointCount) means the
  // total number of values tested, not the grid size before adding the current value.
  const count = Math.max(1, requestedCount - 1);
  const values = [];
  const seen = new Set();
  const pushValue = (raw) => {
    const rounded = descriptor.isInteger ? Math.max(1, Math.round(raw)) : Math.round(raw * 1000) / 1000;
    if (!seen.has(rounded)) {
      seen.add(rounded);
      values.push(rounded);
    }
  };
  // Both endpoints share the same sign and are non-zero: sample on a log scale so
  // points cluster sensibly across a wide multiplicative range instead of a few
  // linear jumps that skip right past the current value.
  const sign = min > 0 && max > 0 ? 1 : (min < 0 && max < 0 ? -1 : 0);
  if (sign !== 0) {
    const logMin = Math.log(Math.abs(min));
    const logMax = Math.log(Math.abs(max));
    for (let i = 0; i < count; i += 1) {
      const t = count > 1 ? i / (count - 1) : 0;
      pushValue(sign * Math.exp(logMin + (logMax - logMin) * t));
    }
  } else {
    const step = count > 1 ? (max - min) / (count - 1) : 0;
    for (let i = 0; i < count; i += 1) {
      pushValue(min + step * i);
    }
  }
  if (Number.isFinite(descriptor.currentValue)) {
    pushValue(descriptor.isInteger ? Math.round(descriptor.currentValue) : descriptor.currentValue);
  }
  values.sort((a, b) => a - b);
  return values;
}


function scoreBacktestState(state) {
  return state ? state.returnRate - state.maxDrawdown * 0.25 : -Infinity;
}


module.exports = {
  defaultBuyRules,
  defaultSellRules,
  defaultNoNewHighExitRule,
  defaultLocalLadderRule,
  defaultMaRsiBandRule,
  defaultOrderGridRule,
  defaultPeVolumeRule,
  defaultStagnationReversalRule,
  defaultBuyBlockRules,
  defaultSellBlockRules,
  defaultScoreRules,
  defaultPositionBands,
  OPTIMIZATION_TYPE_CONFIG,
  DEFAULT_OPTIMIZATION_POINT_COUNT,
  MAX_OPTIMIZATION_POINT_COUNT,
  MAX_OPTIMIZATION_COMBINATIONS,
  isStarMarketSymbol,
  setActiveLotSizeSymbol,
  setOptimizationPointCountOverride,
  buildConfigFromPresetObject,
  buildBacktestStates,
  buildScoredBacktestStates,
  buildBuyHoldStates,
  buildParallelBacktestStates,
  discoverOptimizationParameters,
  buildConfigFromDescriptorCombo,
  buildRangeValues,
  scoreBacktestState,
};
