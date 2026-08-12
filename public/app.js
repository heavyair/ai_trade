const form = document.querySelector("#queryForm");
const codeInput = document.querySelector("#codeInput");
const startInput = document.querySelector("#startInput");
const endInput = document.querySelector("#endInput");
const statusBand = document.querySelector(".status-band");
const statusText = document.querySelector("#statusText");
const chart = document.querySelector("#priceChart");
const returnCompareChart = document.querySelector("#returnCompareChart");
const tradePriceChart = document.querySelector("#tradePriceChart");
const tableBody = document.querySelector("#dataTable");
const startBacktestButton = document.querySelector("#startBacktestButton");
const priceZoomOutButton = document.querySelector("#priceZoomOutButton");
const priceZoomResetButton = document.querySelector("#priceZoomResetButton");
const priceZoomInButton = document.querySelector("#priceZoomInButton");
const tradeZoomOutButton = document.querySelector("#tradeZoomOutButton");
const tradeZoomResetButton = document.querySelector("#tradeZoomResetButton");
const tradeZoomInButton = document.querySelector("#tradeZoomInButton");
const buyRulesContainer = document.querySelector("#buyRules");
const sellRulesContainer = document.querySelector("#sellRules");
const initialCashInput = document.querySelector("#initialCashInput");
const indicatorModelSelect = document.querySelector("#indicatorModelSelect");
const waveThresholdInput = document.querySelector("#waveThresholdInput");
const playSpeedInput = document.querySelector("#playSpeedInput");
const tradeFeeInput = document.querySelector("#tradeFeeInput");
const strategyPresetSelect = document.querySelector("#strategyPresetSelect");
const applyPresetButton = document.querySelector("#applyPresetButton");
const localLadderPanel = document.querySelector("#localLadderPanel");
const waveBuyPanel = document.querySelector("#waveBuyPanel");
const waveSellPanel = document.querySelector("#waveSellPanel");
const indicatorHighLegend = document.querySelector("#indicatorHighLegend");
const indicatorLowLegend = document.querySelector("#indicatorLowLegend");
const indicatorConfirmLegend = document.querySelector("#indicatorConfirmLegend");
const ladderLookbackInput = document.querySelector("#ladderLookbackInput");
const ladderEntryDropInput = document.querySelector("#ladderEntryDropInput");
const ladderStepDropInput = document.querySelector("#ladderStepDropInput");
const ladderBuyAddInput = document.querySelector("#ladderBuyAddInput");
const ladderMaxTargetInput = document.querySelector("#ladderMaxTargetInput");
const ladderSellRiseInput = document.querySelector("#ladderSellRiseInput");
const ladderSellReduceInput = document.querySelector("#ladderSellReduceInput");
const ladderStopLossInput = document.querySelector("#ladderStopLossInput");
const ladderStopReduceInput = document.querySelector("#ladderStopReduceInput");
const riskEnabledInput = document.querySelector("#riskEnabledInput");
const riskLookbackInput = document.querySelector("#riskLookbackInput");
const riskStalledInput = document.querySelector("#riskStalledInput");
const riskReduceInput = document.querySelector("#riskReduceInput");
let lastRows = null;
let lastSummary = null;
let backtestTimer = null;
let backtestStates = [];
let backtestIndex = 0;
let hasBacktestRun = false;
let priceChartZoom = 1;
let tradePriceZoom = 1;

const fields = {
  highestPrice: document.querySelector("#highestPrice"),
  highestDate: document.querySelector("#highestDate"),
  lowestPrice: document.querySelector("#lowestPrice"),
  lowestDate: document.querySelector("#lowestDate"),
  latestClose: document.querySelector("#latestClose"),
  latestDate: document.querySelector("#latestDate"),
  tradeCount: document.querySelector("#tradeCount"),
  dataRange: document.querySelector("#dataRange"),
  chartTitle: document.querySelector("#chartTitle"),
  chartSubtitle: document.querySelector("#chartSubtitle"),
};

const backtestFields = {
  date: document.querySelector("#btDate"),
  equity: document.querySelector("#btEquity"),
  cash: document.querySelector("#btCash"),
  position: document.querySelector("#btPosition"),
  progress: document.querySelector("#btProgress"),
  returnRate: document.querySelector("#btReturn"),
  buyHoldReturn: document.querySelector("#btBuyHoldReturn"),
  buyHoldPolicy: document.querySelector("#btBuyHoldPolicy"),
  excessReturn: document.querySelector("#btExcessReturn"),
  maxDrawdown: document.querySelector("#btMaxDrawdown"),
  modelFees: document.querySelector("#btModelFees"),
  buyHoldMaxDrawdown: document.querySelector("#btBuyHoldMaxDrawdown"),
  buyHoldFees: document.querySelector("#btBuyHoldFees"),
  drawdownDiff: document.querySelector("#btDrawdownDiff"),
  trades: document.querySelector("#btTrades"),
  shares: document.querySelector("#btShares"),
  tradeLog: document.querySelector("#tradeLog"),
};

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

const strategyPresets = {
  optimized: {
    label: "513100 多周期优化策略",
    strategyType: "wave",
    waveThreshold: 15,
    buyRules: [
      { enabled: true, drop: 5, target: 40 },
      { enabled: true, drop: 10, target: 70 },
      { enabled: true, drop: 15, target: 100 },
      { enabled: false, drop: 20, target: 100 },
      { enabled: false, drop: 25, target: 100 },
      { enabled: false, drop: 30, target: 100 },
    ],
    sellRules: [
      { enabled: true, rise: 30, reduce: 30 },
      { enabled: true, rise: 70, reduce: 70 },
      { enabled: true, rise: 80, reduce: 100 },
      { enabled: false, rise: 110, reduce: 100 },
    ],
    noNewHighExitRule: {
      enabled: false,
      lookbackDays: 6,
      stalledDays: 5,
      reduce: 100,
    },
  },
  optimized588000: {
    label: "588000 多周期优化策略",
    strategyType: "wave",
    waveThreshold: 20,
    buyRules: [
      { enabled: true, drop: 5, target: 35 },
      { enabled: true, drop: 10, target: 60 },
      { enabled: true, drop: 15, target: 100 },
      { enabled: false, drop: 20, target: 100 },
      { enabled: false, drop: 25, target: 100 },
      { enabled: false, drop: 30, target: 100 },
    ],
    sellRules: [
      { enabled: true, rise: 40, reduce: 25 },
      { enabled: true, rise: 70, reduce: 70 },
      { enabled: true, rise: 80, reduce: 100 },
      { enabled: false, rise: 110, reduce: 100 },
    ],
    noNewHighExitRule: {
      enabled: false,
      lookbackDays: 6,
      stalledDays: 5,
      reduce: 100,
    },
  },
  localLadder588000: {
    label: "588000 近端高点阶梯策略",
    strategyType: "local-high-ladder",
    waveThreshold: 20,
    localLadderRule: {
      ...defaultLocalLadderRule,
    },
    buyRules: defaultBuyRules.map((rule) => ({ ...rule, enabled: false })),
    sellRules: defaultSellRules.map((rule) => ({ ...rule, enabled: false })),
    noNewHighExitRule: {
      enabled: false,
      ...defaultNoNewHighExitRule,
    },
  },
  original: {
    label: "原始分批加仓策略",
    strategyType: "wave",
    waveThreshold: 5,
    buyRules: defaultBuyRules.map((rule) => ({ ...rule, enabled: true })),
    sellRules: defaultSellRules.map((rule) => ({ ...rule, enabled: true })),
    noNewHighExitRule: {
      enabled: true,
      ...defaultNoNewHighExitRule,
    },
  },
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function formatPrice(value) {
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatMoney(value) {
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}

function formatShares(value) {
  return Math.floor(Number(value)).toLocaleString("zh-CN");
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusBand.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  form.querySelector("button").disabled = isLoading;
}

function renderRuleInputs(presetName = "optimized") {
  const preset = strategyPresets[presetName] || strategyPresets.optimized;
  const buyRules = preset.buyRules || defaultBuyRules;
  const sellRules = preset.sellRules || defaultSellRules;

  buyRulesContainer.innerHTML = buyRules
    .map((rule, index) => {
      const checked = rule.enabled === false ? "" : " checked";
      return `
        <div class="rule-row">
          <label class="rule-switch">
            <input class="buy-enabled" data-index="${index}" type="checkbox"${checked}>
            启用
          </label>
          <label>
            回撤 %
            <input class="buy-drop" data-index="${index}" type="number" min="0" max="90" step="0.5" value="${rule.drop}">
          </label>
          <label>
            目标仓位 %
            <input class="buy-target" data-index="${index}" type="number" min="0" max="100" step="1" value="${rule.target}">
          </label>
        </div>
      `;
    })
    .join("");

  sellRulesContainer.innerHTML = sellRules
    .map((rule, index) => {
      const checked = rule.enabled === false ? "" : " checked";
      return `
        <div class="rule-row">
          <label class="rule-switch">
            <input class="sell-enabled" data-index="${index}" type="checkbox"${checked}>
            启用
          </label>
          <label>
            上涨 %
            <input class="sell-rise" data-index="${index}" type="number" min="0" max="90" step="0.5" value="${rule.rise}">
          </label>
          <label>
            减仓 %
            <input class="sell-reduce" data-index="${index}" type="number" min="0" max="100" step="1" value="${rule.reduce}">
          </label>
        </div>
      `;
    })
    .join("");
}

function readLocalLadderRule() {
  const readNumber = (input, fallback) => {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  };

  return {
    lookbackDays: Math.max(2, Math.round(readNumber(ladderLookbackInput, defaultLocalLadderRule.lookbackDays))),
    entryDrop: Math.max(0, readNumber(ladderEntryDropInput, defaultLocalLadderRule.entryDrop)),
    ladderDrop: Math.max(0.1, readNumber(ladderStepDropInput, defaultLocalLadderRule.ladderDrop)),
    buyAdd: Math.min(100, Math.max(1, readNumber(ladderBuyAddInput, defaultLocalLadderRule.buyAdd))),
    maxTarget: Math.min(100, Math.max(1, readNumber(ladderMaxTargetInput, defaultLocalLadderRule.maxTarget))),
    sellRise: Math.max(0.1, readNumber(ladderSellRiseInput, defaultLocalLadderRule.sellRise)),
    sellReduce: Math.min(100, Math.max(1, readNumber(ladderSellReduceInput, defaultLocalLadderRule.sellReduce))),
    stopLoss: Math.max(0, readNumber(ladderStopLossInput, defaultLocalLadderRule.stopLoss)),
    stopReduce: Math.min(100, Math.max(0, readNumber(ladderStopReduceInput, defaultLocalLadderRule.stopReduce))),
    maxSellsPerDay: defaultLocalLadderRule.maxSellsPerDay,
    resetPositionBelow: defaultLocalLadderRule.resetPositionBelow,
  };
}

function applyLocalLadderRule(rule = defaultLocalLadderRule) {
  ladderLookbackInput.value = rule.lookbackDays;
  ladderEntryDropInput.value = rule.entryDrop;
  ladderStepDropInput.value = rule.ladderDrop;
  ladderBuyAddInput.value = rule.buyAdd;
  ladderMaxTargetInput.value = rule.maxTarget;
  ladderSellRiseInput.value = rule.sellRise;
  ladderSellReduceInput.value = rule.sellReduce;
  ladderStopLossInput.value = rule.stopLoss;
  ladderStopReduceInput.value = rule.stopReduce;
}

function updateIndicatorUi() {
  const isLocalLadder = indicatorModelSelect.value === "local-high-ladder";
  document.querySelectorAll(".wave-param").forEach((item) => item.classList.toggle("hidden", isLocalLadder));
  localLadderPanel.classList.toggle("hidden", !isLocalLadder);
  waveBuyPanel.classList.toggle("hidden", isLocalLadder);
  waveSellPanel.classList.toggle("hidden", isLocalLadder);

  indicatorHighLegend.textContent = isLocalLadder ? "近端高点" : "波浪高点";
  indicatorLowLegend.textContent = isLocalLadder ? "阶梯触发低点" : "波浪低点";
  indicatorConfirmLegend.textContent = isLocalLadder ? "卖出/保护点" : "确认点";
}

function getPresetEntriesForType(strategyType) {
  return Object.entries(strategyPresets).filter(([, preset]) => {
    return (preset.strategyType || "wave") === strategyType;
  });
}

function renderStrategyPresetOptions(strategyType, selectedPresetName) {
  const presetEntries = getPresetEntriesForType(strategyType);
  const fallbackName = presetEntries.length > 0 ? presetEntries[0][0] : "";
  const nextSelectedName = presetEntries.some(([name]) => name === selectedPresetName)
    ? selectedPresetName
    : fallbackName;

  strategyPresetSelect.innerHTML = presetEntries
    .map(([name, preset]) => {
      const selected = name === nextSelectedName ? " selected" : "";
      return `<option value="${name}"${selected}>${preset.label}</option>`;
    })
    .join("");

  return nextSelectedName;
}

function fillStrategyPresetControls(presetName) {
  const preset = strategyPresets[presetName] || strategyPresets.optimized;
  const strategyType = preset.strategyType || "wave";
  if (indicatorModelSelect) indicatorModelSelect.value = strategyType;
  if (strategyPresetSelect) renderStrategyPresetOptions(strategyType, presetName);
  waveThresholdInput.value = preset.waveThreshold;
  renderRuleInputs(presetName);
  applyLocalLadderRule(preset.localLadderRule || defaultLocalLadderRule);
  updateIndicatorUi();

  if (riskEnabledInput && preset.noNewHighExitRule) {
    riskEnabledInput.checked = Boolean(preset.noNewHighExitRule.enabled);
    riskLookbackInput.value = preset.noNewHighExitRule.lookbackDays;
    riskStalledInput.value = preset.noNewHighExitRule.stalledDays;
    riskReduceInput.value = preset.noNewHighExitRule.reduce;
  }

  return preset;
}

function applyStrategyPreset(presetName, shouldAnnounce = true) {
  const preset = fillStrategyPresetControls(presetName);

  if (lastRows && lastSummary) {
    drawChart(lastRows, lastSummary);
    if (hasBacktestRun) {
      recomputeBacktestWithLatestConfig();
    } else if (shouldAnnounce) {
      setStatus(`已套用 ${preset.label}，历史图表已按当前指标参数刷新。`);
    }
  } else if (shouldAnnounce) {
    setStatus(`已套用 ${preset.label}。`);
  }
}

function readBacktestConfig() {
  const buyEnabled = Array.from(document.querySelectorAll(".buy-enabled"));
  const buyDrops = Array.from(document.querySelectorAll(".buy-drop"));
  const buyTargets = Array.from(document.querySelectorAll(".buy-target"));
  const sellEnabled = Array.from(document.querySelectorAll(".sell-enabled"));
  const sellRises = Array.from(document.querySelectorAll(".sell-rise"));
  const sellReduces = Array.from(document.querySelectorAll(".sell-reduce"));

  const buyRules = buyDrops
    .map((input, index) => ({
      enabled: buyEnabled[index] ? buyEnabled[index].checked : true,
      drop: Number(input.value),
      target: Number(buyTargets[index].value),
    }))
    .filter((rule) => rule.enabled && Number.isFinite(rule.drop) && Number.isFinite(rule.target))
    .sort((a, b) => a.drop - b.drop);

  const sellRules = sellRises
    .map((input, index) => ({
      enabled: sellEnabled[index] ? sellEnabled[index].checked : true,
      rise: Number(input.value),
      reduce: Number(sellReduces[index].value),
    }))
    .filter((rule) => rule.enabled && Number.isFinite(rule.rise) && Number.isFinite(rule.reduce))
    .sort((a, b) => a.rise - b.rise);

  return {
    strategyType: indicatorModelSelect ? indicatorModelSelect.value : "wave",
    initialCash: Math.max(0, Number(initialCashInput.value)),
    waveThreshold: Math.max(0.1, Number(waveThresholdInput.value)),
    localLadderRule: readLocalLadderRule(),
    playSpeed: Math.max(10, Number(playSpeedInput.value)),
    tradeFee: Math.max(0, Number(tradeFeeInput.value) || 0),
    buyRules,
    sellRules,
    noNewHighExitRule: {
      enabled: riskEnabledInput ? riskEnabledInput.checked : true,
      lookbackDays: Math.max(2, Math.round(Number(riskLookbackInput.value) || defaultNoNewHighExitRule.lookbackDays)),
      stalledDays: Math.max(1, Math.round(Number(riskStalledInput.value) || defaultNoNewHighExitRule.stalledDays)),
      reduce: Math.min(100, Math.max(0, Number(riskReduceInput.value) || defaultNoNewHighExitRule.reduce)),
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

function getWaveThreshold() {
  return Math.max(0.1, Number(waveThresholdInput.value) || 5);
}

function calculateWavePoints(rows, threshold) {
  if (!rows || rows.length === 0) {
    return { highs: [], lows: [] };
  }

  const wave = createWaveTracker(rows[0], threshold);
  const dateToIndex = new Map(rows.map((row, index) => [row.date, index]));
  const highs = [];
  const lows = [];
  const seenHighs = new Set();
  const seenLows = new Set();

  rows.forEach((row) => {
    const events = updateWaveTracker(wave, row);

    if (events.includes("new-high")) {
      const key = `${wave.high.version}:${wave.high.date}:${wave.high.price}`;
      if (!seenHighs.has(key)) {
        highs.push({
          date: wave.high.date,
          price: wave.high.price,
          rowIndex: dateToIndex.get(wave.high.date),
          confirmDate: row.date,
          confirmPrice: row.low,
          confirmRowIndex: dateToIndex.get(row.date),
          confirmLabel: "确认低价",
          version: wave.high.version,
        });
        seenHighs.add(key);
      }
    }

    if (events.includes("new-low")) {
      const key = `${wave.low.version}:${wave.low.date}:${wave.low.price}`;
      if (!seenLows.has(key)) {
        lows.push({
          date: wave.low.date,
          price: wave.low.price,
          rowIndex: dateToIndex.get(wave.low.date),
          confirmDate: row.date,
          confirmPrice: row.high,
          confirmRowIndex: dateToIndex.get(row.date),
          confirmLabel: "确认高价",
          version: wave.low.version,
        });
        seenLows.add(key);
      }
    }
  });

  return { highs, lows };
}

function calculateLocalLadderPoints(rows, rule) {
  if (!rows || rows.length === 0) {
    return { highs: [], lows: [] };
  }

  const highs = [];
  const lows = [];
  const seenHighs = new Set();
  let anchorHigh = getRollingHigh(rows, 0, rule.lookbackDays);
  let deepestLevelBought = 0;
  let positionRatio = 0;
  const buyLots = [];

  rows.forEach((row, index) => {
    const rollingHigh = getRollingHigh(rows, index, rule.lookbackDays);
    const allowAnchorReset = positionRatio <= rule.resetPositionBelow || row.high >= anchorHigh.high;

    if (allowAnchorReset && rollingHigh.high > anchorHigh.high) {
      anchorHigh = rollingHigh;
      deepestLevelBought = 0;
    }

    if (row.high > anchorHigh.high) {
      anchorHigh = { ...row, rowIndex: index };
      deepestLevelBought = 0;
    }

    const highKey = `${anchorHigh.date}:${anchorHigh.high}`;
    if (!seenHighs.has(highKey)) {
      highs.push({
        date: anchorHigh.date,
        price: anchorHigh.high,
        rowIndex: anchorHigh.rowIndex,
        version: highs.length + 1,
      });
      seenHighs.add(highKey);
    }

    const pullback = anchorHigh.high > 0 ? ((anchorHigh.high - row.close) / anchorHigh.high) * 100 : 0;
    if (pullback >= rule.entryDrop) {
      const level = 1 + Math.floor((pullback - rule.entryDrop) / rule.ladderDrop);
      while (deepestLevelBought < level && positionRatio < rule.maxTarget - 0.5) {
        positionRatio = Math.min(rule.maxTarget, positionRatio + rule.buyAdd);
        buyLots.push({ price: row.close });
        lows.push({
          date: row.date,
          price: row.close,
          rowIndex: index,
          confirmDate: anchorHigh.date,
          confirmPrice: anchorHigh.high,
          confirmRowIndex: anchorHigh.rowIndex,
          confirmLabel: "锚定高点",
          version: lows.length + 1,
        });
        deepestLevelBought += 1;
      }
    }

    let sellsToday = 0;
    while (buyLots.length > 0 && sellsToday < rule.maxSellsPerDay) {
      const lastBuy = buyLots[buyLots.length - 1];
      const rise = lastBuy.price > 0 ? ((row.close - lastBuy.price) / lastBuy.price) * 100 : 0;
      if (rise < rule.sellRise) break;
      positionRatio = Math.max(0, positionRatio - rule.sellReduce);
      buyLots.pop();
      sellsToday += 1;
    }

    if (rule.stopLoss > 0 && positionRatio > 0) {
      const stopPullback = anchorHigh.high > 0 ? ((anchorHigh.high - row.close) / anchorHigh.high) * 100 : 0;
      if (stopPullback >= rule.stopLoss) {
        positionRatio = Math.max(0, positionRatio - rule.stopReduce);
        if (positionRatio <= rule.resetPositionBelow) {
          buyLots.length = 0;
          deepestLevelBought = 0;
        }
      }
    }
  });

  return { highs, lows };
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

function buyToTarget(account, row, rowIndex, targetPercent, reference, triggerPercent, trades, tradeFee = 0) {
  const price = row.close;
  const equity = account.cash + account.shares * price;
  const currentValue = account.shares * price;
  const targetValue = equity * (targetPercent / 100);
  const availableCash = Math.max(0, account.cash - tradeFee);
  const buyValue = Math.min(availableCash, targetValue - currentValue);
  const shares = Math.floor(buyValue / price);

  if (shares <= 0) return false;

  account.cash -= shares * price + tradeFee;
  account.shares += shares;
  account.totalFees = (account.totalFees || 0) + tradeFee;
  const positionRatio = ((account.shares * price) / (account.cash + account.shares * price)) * 100;
  const trade = {
    date: row.date,
    rowIndex,
    side: "buy",
    label: "买入",
    price,
    shares,
    fee: tradeFee,
    totalFees: account.totalFees,
    positionRatio,
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
  const shares = Math.min(account.shares, Math.floor(sellValue / price));

  if (shares <= 0) return false;

  account.cash += shares * price - tradeFee;
  account.shares -= shares;
  account.totalFees = (account.totalFees || 0) + tradeFee;
  const positionRatio = ((account.shares * price) / (account.cash + account.shares * price)) * 100;
  const trade = {
    date: row.date,
    rowIndex,
    side: "sell",
    label: "卖出",
    price,
    shares,
    fee: tradeFee,
    totalFees: account.totalFees,
    positionRatio,
    reference,
    triggerPercent,
    reason: `较${reference.label}上涨 ${formatPercent(triggerPercent)}`,
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
  const previousRows = rows.slice(index - lookbackDays, index);
  return previousRows.reduce((best, item) => (item.high > best.high ? item : best), previousRows[0]);
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

    config.buyRules.forEach((rule) => {
      const key = `${wave.high.version}:${rule.drop}:${rule.target}`;
      if (drawdown >= rule.drop && !triggeredBuys.has(key)) {
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
          lastBuyTrade = trade;
          triggeredSells.clear();
          noNewHighDays = 0;
          boughtToday = true;
        }
        triggeredBuys.add(key);
      }
    });

    if (lastBuyTrade && account.shares > 0) {
      const riseFromLastBuy = lastBuyTrade.price > 0
        ? ((row.close - lastBuyTrade.price) / lastBuyTrade.price) * 100
        : 0;

      config.sellRules.forEach((rule) => {
        const key = `${lastBuyTrade.rowIndex}:${lastBuyTrade.price}:${rule.rise}:${rule.reduce}`;
        if (riseFromLastBuy >= rule.rise && !triggeredSells.has(key)) {
          sellByReduction(
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

function buildBacktestStates(rows, config) {
  if (config.strategyType === "local-high-ladder") {
    return buildLocalLadderBacktestStates(rows, config);
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

function renderTradeLog(trades) {
  const recentTrades = trades.slice(-80).reverse();
  backtestFields.tradeLog.innerHTML = recentTrades.length
    ? recentTrades
      .map((trade) => {
        const reference = trade.reference
          ? `${trade.reference.label} ${trade.reference.date} ${formatPrice(trade.reference.price)}`
          : "--";
        return `
          <tr class="${trade.side}">
            <td>${trade.date}</td>
            <td>${trade.label}</td>
            <td>${formatPrice(trade.price)}</td>
            <td>${formatShares(trade.shares)}</td>
            <td>${formatPercent(trade.positionRatio)}</td>
            <td>${formatMoney(trade.fee || 0)}</td>
            <td>${reference}</td>
            <td>${trade.reason}</td>
          </tr>
        `;
      })
      .join("")
    : '<tr><td colspan="8">暂无交易</td></tr>';
}

function drawReturnComparison(states) {
  const usableStates = states.filter((state) => state && state.buyHold);
  const rect = returnCompareChart.getBoundingClientRect();
  const width = Math.max(640, Math.round(rect.width));
  const height = Math.max(240, Math.round(rect.height));
  const pad = { top: 24, right: 72, bottom: 38, left: 52 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;

  returnCompareChart.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (usableStates.length === 0) {
    returnCompareChart.innerHTML = `
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcff"></rect>
      <text class="tick-label" x="${width / 2}" y="${height / 2}" text-anchor="middle">等待回测数据</text>
    `;
    return;
  }

  const values = usableStates.flatMap((state) => [state.returnRate, state.buyHold.returnRate, 0]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = max - min || 1;
  const yMax = max + spread * 0.12;
  const yMin = min - spread * 0.12;
  const scaleY = (value) => pad.top + ((yMax - value) / (yMax - yMin)) * innerHeight;

  const makePath = (selector) => usableStates
    .map((state, index) => {
      const command = index === 0 ? "M" : "L";
      const x = pointX(index, usableStates.length, pad.left, innerWidth);
      return `${command}${x.toFixed(2)},${scaleY(selector(state)).toFixed(2)}`;
    })
    .join(" ");

  const ticks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) / 4) * index);
  const dateTickIndexes = Array.from(new Set([
    0,
    Math.floor((usableStates.length - 1) * 0.5),
    usableStates.length - 1,
  ]));
  const zeroY = scaleY(0);

  returnCompareChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcff"></rect>
    ${ticks
      .map((value) => {
        const y = scaleY(value);
        return `
          <line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"></line>
          <text class="tick-label" x="${width - pad.right + 10}" y="${y + 4}">${formatPercent(value)}</text>
        `;
      })
      .join("")}
    <line class="zero-line" x1="${pad.left}" x2="${width - pad.right}" y1="${zeroY}" y2="${zeroY}"></line>
    <line class="axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
    <line class="axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
    <path class="model-return-line" d="${makePath((state) => state.returnRate)}"></path>
    <path class="hold-return-line" d="${makePath((state) => state.buyHold.returnRate)}"></path>
    ${dateTickIndexes
      .map((index) => {
        const x = pointX(index, usableStates.length, pad.left, innerWidth);
        return `<text class="tick-label" x="${x}" y="${height - 14}" text-anchor="middle">${usableStates[index].row.date.slice(5)}</text>`;
      })
      .join("")}
  `;
}

function drawTradePriceChart(states) {
  const usableStates = states.filter((state) => state && state.row);
  const rect = tradePriceChart.parentElement
    ? tradePriceChart.parentElement.getBoundingClientRect()
    : tradePriceChart.getBoundingClientRect();
  const viewportWidth = Math.max(720, Math.round(rect.width));
  const width = Math.round(viewportWidth * tradePriceZoom);
  const height = Math.max(280, Math.round(rect.height));
  const pad = { top: 26, right: 74, bottom: 42, left: 58 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;

  tradePriceChart.style.width = `${width}px`;
  tradePriceChart.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (usableStates.length === 0) {
    tradePriceChart.innerHTML = `
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcff"></rect>
      <text class="tick-label" x="${width / 2}" y="${height / 2}" text-anchor="middle">等待回测数据</text>
    `;
    return;
  }

  const rows = usableStates.map((state) => state.row);
  const trades = usableStates[usableStates.length - 1].trades;
  const waveHighs = usableStates[usableStates.length - 1].waveHighs || [];
  const highPointLabel = indicatorModelSelect.value === "local-high-ladder" ? "近端高点" : "波浪高点";
  const dateToIndex = new Map(rows.map((row, index) => [row.date, index]));
  const priceValues = rows.flatMap((row) => [row.high, row.low, row.close]);

  trades.forEach((trade) => {
    priceValues.push(trade.price);
    if (trade.reference) priceValues.push(trade.reference.price);
  });
  waveHighs.forEach((point) => {
    priceValues.push(point.price);
  });

  const max = Math.max(...priceValues);
  const min = Math.min(...priceValues);
  const spread = max - min || max * 0.02 || 1;
  const yMax = max + spread * 0.12;
  const yMin = Math.max(0, min - spread * 0.12);
  const scaleY = (value) => pad.top + ((yMax - value) / (yMax - yMin)) * innerHeight;
  const xForIndex = (index) => pointX(index, rows.length, pad.left, innerWidth);

  const pricePath = rows
    .map((row, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${xForIndex(index).toFixed(2)},${scaleY(row.close).toFixed(2)}`;
    })
    .join(" ");

  const ticks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) / 4) * index);
  const dateTickIndexes = Array.from(new Set([
    0,
    Math.floor((rows.length - 1) * 0.5),
    rows.length - 1,
  ]));

  const waveHighNodes = waveHighs
    .map((point, index) => {
      const pointIndex = dateToIndex.get(point.date);
      if (!Number.isInteger(pointIndex)) return "";

      const x = xForIndex(pointIndex);
      const y = scaleY(point.price);
      const hasConfirmPoint = Number.isInteger(point.confirmRowIndex);
      const confirmX = hasConfirmPoint ? xForIndex(point.confirmRowIndex) : x;
      const confirmY = hasConfirmPoint ? scaleY(point.confirmPrice) : y;
      const labelX = Math.min(Math.max(x + 8, pad.left + 4), width - pad.right - 150);
      const labelY = Math.min(Math.max(y + (index % 2 === 0 ? -36 : 18), pad.top + 4), height - pad.bottom - 34);
      const confirmLabelX = Math.min(Math.max(confirmX + 8, pad.left + 4), width - pad.right - 150);
      const confirmLabelY = Math.min(Math.max(confirmY + 18, pad.top + 4), height - pad.bottom - 34);

      return `
        ${hasConfirmPoint ? `<line class="trade-ref-line" x1="${x}" y1="${y}" x2="${confirmX}" y2="${confirmY}"></line>` : ""}
        <circle cx="${x}" cy="${y}" r="5" fill="#8a4b08"></circle>
        <rect class="trade-label-bg" x="${labelX}" y="${labelY}" width="142" height="31" rx="4"></rect>
        <text class="trade-label" x="${labelX + 6}" y="${labelY + 12}">${highPointLabel} ${formatPrice(point.price)}</text>
        <text class="trade-label" x="${labelX + 6}" y="${labelY + 25}">${point.date}</text>
        ${hasConfirmPoint ? `<circle cx="${confirmX}" cy="${confirmY}" r="4.5" fill="#f0a202"></circle>` : ""}
        ${hasConfirmPoint ? `<rect class="trade-label-bg" x="${confirmLabelX}" y="${confirmLabelY}" width="142" height="31" rx="4"></rect>` : ""}
        ${hasConfirmPoint ? `<text class="trade-label" x="${confirmLabelX + 6}" y="${confirmLabelY + 12}">${point.confirmLabel} ${formatPrice(point.confirmPrice)}</text>` : ""}
        ${hasConfirmPoint ? `<text class="trade-label" x="${confirmLabelX + 6}" y="${confirmLabelY + 25}">${point.confirmDate}</text>` : ""}
      `;
    })
    .join("");

  const tradeNodes = trades
    .map((trade, index) => {
      const tradeIndex = Math.min(trade.rowIndex, rows.length - 1);
      if (tradeIndex < 0) return "";

      const tradeX = xForIndex(tradeIndex);
      const tradeY = scaleY(trade.price);
      const refIndex = trade.reference ? dateToIndex.get(trade.reference.date) : null;
      const hasReference = Number.isInteger(refIndex);
      const refX = hasReference ? xForIndex(refIndex) : tradeX;
      const refY = hasReference ? scaleY(trade.reference.price) : tradeY;
      const sideColor = trade.side === "buy" ? "#c2413b" : "#227a4f";
      const refColor = trade.reference && (trade.reference.type === "high" || trade.reference.type === "rolling-high")
        ? "#8a4b08"
        : "#344054";
      const labelAbove = index % 2 === 0;
      const labelX = Math.min(Math.max(tradeX + 8, pad.left + 4), width - pad.right - 150);
      const labelY = Math.min(Math.max(tradeY + (labelAbove ? -38 : 18), pad.top + 4), height - pad.bottom - 34);
      const label = `${trade.label} ${formatPrice(trade.price)}`;
      const refLabel = trade.reference
        ? `${trade.reference.label} ${trade.reference.date} ${formatPrice(trade.reference.price)}`
        : "";

      return `
        ${hasReference ? `<line class="trade-ref-line" x1="${refX}" y1="${refY}" x2="${tradeX}" y2="${tradeY}"></line>` : ""}
        ${hasReference ? `<circle cx="${refX}" cy="${refY}" r="4.5" fill="${refColor}"></circle>` : ""}
        <circle cx="${tradeX}" cy="${tradeY}" r="5.5" fill="${sideColor}"></circle>
        <rect class="trade-label-bg" x="${labelX}" y="${labelY}" width="142" height="31" rx="4"></rect>
        <text class="trade-label" x="${labelX + 6}" y="${labelY + 12}">${label}</text>
        <text class="trade-label" x="${labelX + 6}" y="${labelY + 25}">${refLabel}</text>
      `;
    })
    .join("");

  tradePriceChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcff"></rect>
    ${ticks
      .map((value) => {
        const y = scaleY(value);
        return `
          <line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"></line>
          <text class="tick-label" x="${width - pad.right + 10}" y="${y + 4}">${formatPrice(value)}</text>
        `;
      })
      .join("")}
    <line class="axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
    <line class="axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
    <path class="price-line" d="${pricePath}"></path>
    ${waveHighNodes}
    ${tradeNodes}
    ${dateTickIndexes
      .map((index) => {
        const x = xForIndex(index);
        return `<text class="tick-label" x="${x}" y="${height - 16}" text-anchor="middle">${rows[index].date.slice(5)}</text>`;
      })
      .join("")}
  `;
}

function renderBacktestState(state, index, total) {
  if (!state) {
    backtestFields.date.textContent = "--";
    backtestFields.equity.textContent = "--";
    backtestFields.cash.textContent = "--";
    backtestFields.position.textContent = "--";
    backtestFields.returnRate.textContent = "--";
    backtestFields.buyHoldReturn.textContent = "--";
    backtestFields.buyHoldPolicy.textContent = "历史第一天全仓买入，之后一直持有，不执行卖出。交易日志只显示模型策略交易。";
    backtestFields.excessReturn.textContent = "--";
    backtestFields.maxDrawdown.textContent = "--";
    backtestFields.modelFees.textContent = "--";
    backtestFields.buyHoldMaxDrawdown.textContent = "--";
    backtestFields.buyHoldFees.textContent = "--";
    backtestFields.drawdownDiff.textContent = "--";
    backtestFields.trades.textContent = "--";
    backtestFields.shares.textContent = "--";
    backtestFields.progress.style.width = "0%";
    renderTradeLog([]);
    drawReturnComparison([]);
    drawTradePriceChart([]);
    return;
  }

  backtestFields.date.textContent = state.row.date;
  backtestFields.equity.textContent = formatMoney(state.equity);
  backtestFields.cash.textContent = formatMoney(state.cash);
  backtestFields.position.textContent = formatPercent(state.positionRatio);
  backtestFields.returnRate.textContent = formatPercent(state.returnRate);
  backtestFields.buyHoldReturn.textContent = formatPercent(state.buyHold.returnRate);
  backtestFields.buyHoldPolicy.textContent = `${state.buyHold.entryDate} 以收盘价 ${formatPrice(state.buyHold.entryPrice)} 全仓买入 ${formatShares(state.buyHold.shares)} 份，扣交易费 ${formatMoney(state.buyHold.totalFees || 0)} 元，之后一直持有，不执行卖出。`;
  backtestFields.excessReturn.textContent = formatPercent(state.excessReturn);
  backtestFields.maxDrawdown.textContent = formatPercent(state.maxDrawdown);
  backtestFields.modelFees.textContent = formatMoney(state.totalFees || 0);
  backtestFields.buyHoldMaxDrawdown.textContent = formatPercent(state.buyHold.maxDrawdown);
  backtestFields.buyHoldFees.textContent = formatMoney(state.buyHold.totalFees || 0);
  backtestFields.drawdownDiff.textContent = formatPercent(state.drawdownDiff);
  backtestFields.trades.textContent = String(state.trades.length);
  backtestFields.shares.textContent = formatShares(state.shares);
  backtestFields.progress.style.width = `${total > 1 ? (index / (total - 1)) * 100 : 100}%`;
  renderTradeLog(state.trades);
  drawReturnComparison(backtestStates.slice(0, index + 1));
  drawTradePriceChart(backtestStates.slice(0, index + 1));
}

function getVisibleBacktestStates() {
  if (backtestStates.length === 0) return [];
  const currentIndex = Math.max(0, Math.min(backtestIndex - 1, backtestStates.length - 1));
  return backtestStates.slice(0, currentIndex + 1);
}

function redrawVisibleBacktestCharts() {
  const visibleStates = getVisibleBacktestStates();
  drawReturnComparison(visibleStates);
  drawTradePriceChart(visibleStates);
}

function setTradePriceZoom(nextZoom) {
  tradePriceZoom = Math.min(12, Math.max(1, nextZoom));
  redrawVisibleBacktestCharts();
}

function setPriceChartZoom(nextZoom) {
  priceChartZoom = Math.min(12, Math.max(1, nextZoom));
  if (lastRows && lastSummary) {
    drawChart(lastRows, lastSummary);
  }
}

function stopBacktestReplay() {
  if (backtestTimer) {
    clearInterval(backtestTimer);
    backtestTimer = null;
  }
  startBacktestButton.disabled = false;
  startBacktestButton.textContent = "开始测试";
}

function resetBacktest() {
  stopBacktestReplay();
  backtestStates = [];
  backtestIndex = 0;
  hasBacktestRun = false;
  renderBacktestState(null, 0, 0);
}

function recomputeBacktestWithLatestConfig() {
  if (!lastRows || lastRows.length === 0 || !hasBacktestRun) return;

  const config = readBacktestConfig();
  stopBacktestReplay();
  backtestStates = buildParallelBacktestStates(lastRows, config);
  backtestIndex = backtestStates.length;
  const finalState = backtestStates[backtestStates.length - 1];
  renderBacktestState(finalState, backtestStates.length - 1, backtestStates.length);
  const status = config.strategyType === "local-high-ladder"
    ? "已按近端高点阶梯指标同步重算图表点位和回测交易。"
    : `已按 ${formatPercent(config.waveThreshold)} 波动阈值同步重算历史波浪点和回测交易。`;
  setStatus(status);
}

function startBacktest() {
  if (!lastRows || lastRows.length === 0) {
    setStatus("请先查询行情数据，再开始回测。", true);
    return;
  }

  const config = readBacktestConfig();
  if (config.initialCash <= 0) {
    setStatus("初始现金必须大于 0。", true);
    return;
  }

  stopBacktestReplay();
  backtestStates = buildParallelBacktestStates(lastRows, config);
  backtestIndex = 0;
  hasBacktestRun = true;
  startBacktestButton.disabled = true;
  startBacktestButton.textContent = "测试中";
  setStatus("正在并行回放模型策略和全仓基准...");

  backtestTimer = setInterval(() => {
    renderBacktestState(backtestStates[backtestIndex], backtestIndex, backtestStates.length);
    backtestIndex += 1;

    if (backtestIndex >= backtestStates.length) {
      const finalState = backtestStates[backtestStates.length - 1];
      stopBacktestReplay();
      renderBacktestState(finalState, backtestStates.length - 1, backtestStates.length);
      setStatus(`回测完成：模型收益 ${formatPercent(finalState.returnRate)}，全仓收益 ${formatPercent(finalState.buyHold.returnRate)}；模型回撤 ${formatPercent(finalState.maxDrawdown)}，全仓回撤 ${formatPercent(finalState.buyHold.maxDrawdown)}。`);
    }
  }, config.playSpeed);
}

function pointX(index, count, left, width) {
  if (count <= 1) return left + width / 2;
  return left + (index / (count - 1)) * width;
}

function drawChart(rows, summary) {
  const rect = chart.parentElement
    ? chart.parentElement.getBoundingClientRect()
    : chart.getBoundingClientRect();
  const viewportWidth = Math.max(640, Math.round(rect.width));
  const width = Math.round(viewportWidth * priceChartZoom);
  const height = Math.max(320, Math.round(rect.height));
  const pad = { top: 28, right: 68, bottom: 46, left: 58 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const closes = rows.map((row) => row.close);
  const highs = rows.map((row) => row.high);
  const lows = rows.map((row) => row.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const spread = max - min || max * 0.02 || 1;
  const yMax = max + spread * 0.08;
  const yMin = Math.max(0, min - spread * 0.08);

  const scaleY = (value) => {
    return pad.top + ((yMax - value) / (yMax - yMin)) * innerHeight;
  };

  const linePath = closes
    .map((value, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${pointX(index, rows.length, pad.left, innerWidth).toFixed(2)},${scaleY(value).toFixed(2)}`;
    })
    .join(" ");

  const highIndex = rows.findIndex((row) => row.date === summary.highest.date);
  const lowIndex = rows.findIndex((row) => row.date === summary.lowest.date);
  const highX = pointX(highIndex, rows.length, pad.left, innerWidth);
  const highY = scaleY(summary.highest.price);
  const lowX = pointX(lowIndex, rows.length, pad.left, innerWidth);
  const lowY = scaleY(summary.lowest.price);
  const indicatorType = indicatorModelSelect ? indicatorModelSelect.value : "wave";
  const isLocalLadder = indicatorType === "local-high-ladder";
  const waveThreshold = getWaveThreshold();
  const localLadderRule = readLocalLadderRule();
  const indicatorPoints = isLocalLadder
    ? calculateLocalLadderPoints(rows, localLadderRule)
    : calculateWavePoints(rows, waveThreshold);
  const priceTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) / 4) * index);
  const dateTickIndexes = Array.from(new Set([
    0,
    Math.floor((rows.length - 1) * 0.25),
    Math.floor((rows.length - 1) * 0.5),
    Math.floor((rows.length - 1) * 0.75),
    rows.length - 1,
  ]));

  const renderIndicatorPoint = (point, type, index) => {
    if (!Number.isInteger(point.rowIndex)) return "";

    const x = pointX(point.rowIndex, rows.length, pad.left, innerWidth);
    const y = scaleY(point.price);
    const hasConfirmPoint = Number.isInteger(point.confirmRowIndex);
    const confirmX = hasConfirmPoint ? pointX(point.confirmRowIndex, rows.length, pad.left, innerWidth) : x;
    const confirmY = hasConfirmPoint ? scaleY(point.confirmPrice) : y;
    const isHigh = type === "high";
    const color = isHigh ? "#8a4b08" : "#344054";
    const label = isLocalLadder
      ? (isHigh ? "近端高" : "阶梯低")
      : (isHigh ? "波浪高" : "波浪低");
    const baseY = isHigh ? y - 38 : y + 18;
    const labelX = Math.min(Math.max(x + 8, pad.left + 4), width - pad.right - 126);
    const labelY = Math.min(Math.max(baseY + (index % 2) * (isHigh ? -8 : 8), pad.top + 4), height - pad.bottom - 32);
    const confirmLabelX = Math.min(Math.max(confirmX + 8, pad.left + 4), width - pad.right - 132);
    const confirmLabelY = Math.min(Math.max(confirmY + (isHigh ? 18 : -38), pad.top + 4), height - pad.bottom - 32);

    return `
      ${hasConfirmPoint ? `<line class="trade-ref-line" x1="${x}" y1="${y}" x2="${confirmX}" y2="${confirmY}"></line>` : ""}
      <circle cx="${x}" cy="${y}" r="4.5" fill="${color}"></circle>
      <rect class="trade-label-bg" x="${labelX}" y="${labelY}" width="118" height="31" rx="4"></rect>
      <text class="trade-label" x="${labelX + 6}" y="${labelY + 12}">${label} ${formatPrice(point.price)}</text>
      <text class="trade-label" x="${labelX + 6}" y="${labelY + 25}">${point.date}</text>
      ${hasConfirmPoint ? `<circle cx="${confirmX}" cy="${confirmY}" r="4.5" fill="#f0a202"></circle>` : ""}
      ${hasConfirmPoint ? `<rect class="trade-label-bg" x="${confirmLabelX}" y="${confirmLabelY}" width="126" height="31" rx="4"></rect>` : ""}
      ${hasConfirmPoint ? `<text class="trade-label" x="${confirmLabelX + 6}" y="${confirmLabelY + 12}">${point.confirmLabel} ${formatPrice(point.confirmPrice)}</text>` : ""}
      ${hasConfirmPoint ? `<text class="trade-label" x="${confirmLabelX + 6}" y="${confirmLabelY + 25}">${point.confirmDate}</text>` : ""}
    `;
  };

  const indicatorPointNodes = [
    ...indicatorPoints.highs.map((point, index) => renderIndicatorPoint(point, "high", index)),
    ...indicatorPoints.lows.map((point, index) => renderIndicatorPoint(point, "low", index)),
  ].join("");
  const indicatorSummary = isLocalLadder
    ? `${localLadderRule.lookbackDays}日近端高点：高点 ${indicatorPoints.highs.length}，阶梯触发 ${indicatorPoints.lows.length}；回落 ${formatPercent(localLadderRule.entryDrop)} / 阶梯 ${formatPercent(localLadderRule.ladderDrop)} / 加仓 ${formatPercent(localLadderRule.buyAdd)} / 反弹卖出 ${formatPercent(localLadderRule.sellRise)}`
    : `波浪阈值 ${formatPercent(waveThreshold)}：高点 ${indicatorPoints.highs.length}，低点 ${indicatorPoints.lows.length}`;

  chart.style.width = `${width}px`;
  chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  chart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcff"></rect>
    ${priceTicks
      .map((value) => {
        const y = scaleY(value);
        return `
          <line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"></line>
          <text class="tick-label" x="${width - pad.right + 10}" y="${y + 4}">${formatPrice(value)}</text>
        `;
      })
      .join("")}
    <line class="axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
    <line class="axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
    <path class="price-line" d="${linePath}"></path>
    ${indicatorPointNodes}
    <circle cx="${highX}" cy="${highY}" r="5.5" fill="#c2413b"></circle>
    <text class="point-label" x="${Math.min(highX + 8, width - 190)}" y="${Math.max(highY - 10, 18)}">最高 ${formatPrice(summary.highest.price)}</text>
    <circle cx="${lowX}" cy="${lowY}" r="5.5" fill="#227a4f"></circle>
    <text class="point-label" x="${Math.min(lowX + 8, width - 190)}" y="${Math.min(lowY + 22, height - 12)}">最低 ${formatPrice(summary.lowest.price)}</text>
    ${dateTickIndexes
      .map((index) => {
        const x = pointX(index, rows.length, pad.left, innerWidth);
        return `<text class="tick-label" x="${x}" y="${height - 16}" text-anchor="middle">${rows[index].date.slice(5)}</text>`;
      })
      .join("")}
    <text class="tick-label" x="${pad.left}" y="${pad.top - 8}">${indicatorSummary}</text>
  `;
}

function renderTable(rows) {
  const recentRows = rows.slice(-30).reverse();
  tableBody.innerHTML = recentRows
    .map((row) => {
      const changeClass = row.changePercent > 0 ? "up" : row.changePercent < 0 ? "down" : "";
      return `
        <tr>
          <td>${row.date}</td>
          <td>${formatPrice(row.open)}</td>
          <td>${formatPrice(row.high)}</td>
          <td>${formatPrice(row.low)}</td>
          <td>${formatPrice(row.close)}</td>
          <td class="${changeClass}">${row.changePercent.toFixed(2)}%</td>
        </tr>
      `;
    })
    .join("");
}

function renderResult(result) {
  const { rows, summary, name, code } = result;
  const displayName = name ? `${code} ${name}` : code;
  lastRows = rows;
  lastSummary = summary;

  fields.highestPrice.textContent = formatPrice(summary.highest.price);
  fields.highestDate.textContent = `${summary.highest.date} 收盘 ${formatPrice(summary.highest.close)}`;
  fields.lowestPrice.textContent = formatPrice(summary.lowest.price);
  fields.lowestDate.textContent = `${summary.lowest.date} 收盘 ${formatPrice(summary.lowest.close)}`;
  fields.latestClose.textContent = formatPrice(summary.latest.close);
  fields.latestDate.textContent = `${summary.latest.date} ${summary.latest.changePercent.toFixed(2)}%`;
  fields.tradeCount.textContent = String(summary.count);
  fields.dataRange.textContent = `${summary.startDate} 至 ${summary.endDate}`;
  fields.chartTitle.textContent = displayName;
  fields.chartSubtitle.textContent = `${startInput.value} 至 ${endInput.value}`;

  const wavePresetName = renderStrategyPresetOptions("wave", strategyPresetSelect.value);
  fillStrategyPresetControls(wavePresetName || "optimized");
  drawChart(rows, summary);
  renderTable(rows);
  resetBacktest();
  setStatus(`已更新 ${displayName}，数据源：${result.source}。`);
}

async function loadData() {
  const params = new URLSearchParams({
    code: codeInput.value.trim(),
    start: startInput.value,
    end: endInput.value,
  });

  setLoading(true);
  setStatus("正在获取行情数据...");

  try {
    const response = await fetch(`/api/klines?${params.toString()}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "查询失败。");
    }
    renderResult(result);
  } catch (error) {
    setStatus(error.message || "查询失败。", true);
  } finally {
    setLoading(false);
  }
}

function initializeDates() {
  const today = new Date();
  endInput.value = formatDate(today);
  startInput.value = formatDate(shiftYears(today, -1));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadData();
});

startBacktestButton.addEventListener("click", () => {
  startBacktest();
});

applyPresetButton.addEventListener("click", () => {
  applyStrategyPreset(strategyPresetSelect.value);
});

strategyPresetSelect.addEventListener("change", () => {
  applyStrategyPreset(strategyPresetSelect.value);
});

function refreshIndicatorView(message) {
  updateIndicatorUi();
  if (lastRows && lastSummary) {
    drawChart(lastRows, lastSummary);
    if (hasBacktestRun) {
      recomputeBacktestWithLatestConfig();
    } else {
      setStatus(message);
    }
  }
}

indicatorModelSelect.addEventListener("change", () => {
  const strategyType = indicatorModelSelect.value;
  const presetName = renderStrategyPresetOptions(strategyType);
  if (presetName) {
    applyStrategyPreset(presetName);
  } else {
    refreshIndicatorView(strategyType === "local-high-ladder"
      ? "已切换到近端高点阶梯指标。"
      : "已切换到波浪模型。");
  }
});

waveThresholdInput.addEventListener("input", () => {
  if (indicatorModelSelect.value !== "wave") return;
  if (lastRows && lastSummary) {
    drawChart(lastRows, lastSummary);
    if (hasBacktestRun) {
      recomputeBacktestWithLatestConfig();
    } else {
      setStatus(`已按 ${formatPercent(getWaveThreshold())} 波动阈值重新计算历史波浪高低点。`);
    }
  }
});

[
  ladderLookbackInput,
  ladderEntryDropInput,
  ladderStepDropInput,
  ladderBuyAddInput,
  ladderMaxTargetInput,
  ladderSellRiseInput,
  ladderSellReduceInput,
  ladderStopLossInput,
  ladderStopReduceInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (indicatorModelSelect.value === "local-high-ladder") {
      refreshIndicatorView("已按近端高点阶梯参数刷新历史图表。");
    }
  });
});

priceZoomOutButton.addEventListener("click", () => {
  setPriceChartZoom(priceChartZoom - 1);
});

priceZoomResetButton.addEventListener("click", () => {
  setPriceChartZoom(1);
});

priceZoomInButton.addEventListener("click", () => {
  setPriceChartZoom(priceChartZoom + 1);
});

tradeZoomOutButton.addEventListener("click", () => {
  setTradePriceZoom(tradePriceZoom - 1);
});

tradeZoomResetButton.addEventListener("click", () => {
  setTradePriceZoom(1);
});

tradeZoomInButton.addEventListener("click", () => {
  setTradePriceZoom(tradePriceZoom + 1);
});

window.addEventListener("resize", () => {
  if (lastRows && lastSummary) {
    drawChart(lastRows, lastSummary);
  }
  if (backtestStates.length > 0) {
    redrawVisibleBacktestCharts();
  }
});

applyStrategyPreset("optimized", false);
initializeDates();
loadData();
