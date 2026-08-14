const form = document.querySelector("#queryForm");
const codeInput = document.querySelector("#codeInput");
const symbolPresetSelect = document.querySelector("#symbolPresetSelect");
const rangePresetSelect = document.querySelector("#rangePresetSelect");
const startInput = document.querySelector("#startInput");
const endInput = document.querySelector("#endInput");
const statusBand = document.querySelector(".status-band");
const statusText = document.querySelector("#statusText");
const wizardButtons = Array.from(document.querySelectorAll("[data-wizard-target]"));
const wizardPages = Array.from(document.querySelectorAll("[data-wizard-page]"));
const simulationProgressButtons = Array.from(document.querySelectorAll("[data-simulation-step]"));
const historyPanels = Array.from(document.querySelectorAll("[data-history-panel]"));
const returnNavButtons = Array.from(document.querySelectorAll(".return-nav-button"));
const authDialog = document.querySelector("#authDialog");
const authForm = document.querySelector("#authForm");
const authStatusText = document.querySelector("#authStatusText");
const openAuthButton = document.querySelector("#openAuthButton");
const logoutButton = document.querySelector("#logoutButton");
const resendVerificationButton = document.querySelector("#resendVerificationButton");
const closeAuthButton = document.querySelector("#closeAuthButton");
const authLoginTab = document.querySelector("#authLoginTab");
const authRegisterTab = document.querySelector("#authRegisterTab");
const authEmailInput = document.querySelector("#authEmailInput");
const authPasswordInput = document.querySelector("#authPasswordInput");
const authMessage = document.querySelector("#authMessage");
const submitAuthButton = document.querySelector("#submitAuthButton");
const newModelAuthNote = document.querySelector("#newModelAuthNote");
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
const backtestWindowModeSelect = document.querySelector("#backtestWindowModeSelect");
const backtestYearsSelect = document.querySelector("#backtestYearsSelect");
const strategyPresetSelect = document.querySelector("#strategyPresetSelect");
const applyPresetButton = document.querySelector("#applyPresetButton");
const compareCurrentConfigInput = document.querySelector("#compareCurrentConfigInput");
const modelCompareOptions = document.querySelector("#modelCompareOptions");
const modelCompareTable = document.querySelector("#modelCompareTable");
const modelPerformancePanel = document.querySelector("#modelPerformancePanel");
const showModelPerformanceButton = document.querySelector("#showModelPerformanceButton");
const selectedModelDetail = document.querySelector("#selectedModelDetail");
const rankingPresetList = document.querySelector("#rankingPresetList");
const optimizeSelectedModelButton = document.querySelector("#optimizeSelectedModelButton");
const presetParamDialog = document.querySelector("#presetParamDialog");
const closePresetParamButton = document.querySelector("#closePresetParamButton");
const savePresetParamButton = document.querySelector("#savePresetParamButton");
const presetParamTitle = document.querySelector("#presetParamTitle");
const presetParamSubtitle = document.querySelector("#presetParamSubtitle");
const presetParamNameInput = document.querySelector("#presetParamNameInput");
const presetParamNarrative = document.querySelector("#presetParamNarrative");
const presetParamEditor = document.querySelector("#presetParamEditor");
const optimizationDialog = document.querySelector("#optimizationDialog");
const optimizationTitle = document.querySelector("#optimizationTitle");
const optimizationSubtitle = document.querySelector("#optimizationSubtitle");
const optimizationReport = document.querySelector("#optimizationReport");
const optimizationNarrative = document.querySelector("#optimizationNarrative");
const optimizationParamPreview = document.querySelector("#optimizationParamPreview");
const closeOptimizationButton = document.querySelector("#closeOptimizationButton");
const saveOptimizationButton = document.querySelector("#saveOptimizationButton");
const customModelForm = document.querySelector("#customModelForm");
const customModelPrompt = document.querySelector("#customModelPrompt");
const customModelCreatorInput = document.querySelector("#customModelCreatorInput");
const customModelLabelInput = document.querySelector("#customModelLabelInput");
const generateModelCodeButton = document.querySelector("#generateModelCodeButton");
const saveGeneratedModelButton = document.querySelector("#saveGeneratedModelButton");
const generatedModelCode = document.querySelector("#generatedModelCode");
const tradeDetailPanel = document.querySelector("#tradeDetailPanel");
const localLadderPanel = document.querySelector("#localLadderPanel");
const maRsiBandPanel = document.querySelector("#maRsiBandPanel");
const orderGridPanel = document.querySelector("#orderGridPanel");
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
const maFastMaInput = document.querySelector("#maFastMaInput");
const maSlowMaInput = document.querySelector("#maSlowMaInput");
const maSlowBufferInput = document.querySelector("#maSlowBufferInput");
const maUseSlowTrendInput = document.querySelector("#maUseSlowTrendInput");
const maBearTargetInput = document.querySelector("#maBearTargetInput");
const maBullTargetInput = document.querySelector("#maBullTargetInput");
const maUseFastBullInput = document.querySelector("#maUseFastBullInput");
const maFastBullTargetInput = document.querySelector("#maFastBullTargetInput");
const maUseFastCutInput = document.querySelector("#maUseFastCutInput");
const maFastBearTargetInput = document.querySelector("#maFastBearTargetInput");
const maFastCutInput = document.querySelector("#maFastCutInput");
const maRsiDaysInput = document.querySelector("#maRsiDaysInput");
const maUseRsiBuyInput = document.querySelector("#maUseRsiBuyInput");
const maRsiBuyInput = document.querySelector("#maRsiBuyInput");
const maRsiTargetInput = document.querySelector("#maRsiTargetInput");
const maUseRsiSellInput = document.querySelector("#maUseRsiSellInput");
const maRsiSellInput = document.querySelector("#maRsiSellInput");
const maHotTargetInput = document.querySelector("#maHotTargetInput");
const maAtrDaysInput = document.querySelector("#maAtrDaysInput");
const maUseAtrInput = document.querySelector("#maUseAtrInput");
const maHighAtrInput = document.querySelector("#maHighAtrInput");
const maVolTargetInput = document.querySelector("#maVolTargetInput");
const orderLookbackInput = document.querySelector("#orderLookbackInput");
const orderEntryDropInput = document.querySelector("#orderEntryDropInput");
const orderCapitalInput = document.querySelector("#orderCapitalInput");
const orderAddDropInput = document.querySelector("#orderAddDropInput");
const orderTakeProfitInput = document.querySelector("#orderTakeProfitInput");
const orderMaxLotsInput = document.querySelector("#orderMaxLotsInput");
const peVolumePanel = document.querySelector("#peVolumePanel");
const peLookbackInput = document.querySelector("#peLookbackInput");
const peLowPercentileInput = document.querySelector("#peLowPercentileInput");
const peHighPercentileInput = document.querySelector("#peHighPercentileInput");
const volumeMaDaysInput = document.querySelector("#volumeMaDaysInput");
const volumeBuyMultiplierInput = document.querySelector("#volumeBuyMultiplierInput");
const volumeSellMultiplierInput = document.querySelector("#volumeSellMultiplierInput");
const peLowTargetInput = document.querySelector("#peLowTargetInput");
const peNeutralTargetInput = document.querySelector("#peNeutralTargetInput");
const peHighTargetInput = document.querySelector("#peHighTargetInput");
const riskEnabledInput = document.querySelector("#riskEnabledInput");
const riskLookbackInput = document.querySelector("#riskLookbackInput");
const riskStalledInput = document.querySelector("#riskStalledInput");
const riskReduceInput = document.querySelector("#riskReduceInput");
let lastRows = null;
let lastSummary = null;
let backtestTimer = null;
let backtestStates = [];
let backtestIndex = 0;
let activeBacktestRows = null;
let activeBacktestRangeLabel = "";
let comparisonResults = [];
let hasBacktestRun = false;
let priceChartZoom = 1;
let tradePriceZoom = 1;
let generatedPresetDraft = null;
let lastRenderedTrades = [];
let selectedTradeForChart = null;
let selectedTradeChartStates = [];
let editingPresetName = null;
let activeOptimizationId = 0;
let optimizationPresetDraft = null;
let activeSimulationStep = "models";
let currentUser = null;
let authMode = "login";

const symbolPresets = ["513100", "588000", "NET", "QQQ", "AMD"];
const recentSymbolStorageKey = "aiTradeRecentSymbols";
const customPresetStorageKey = "aiTradeCustomStrategyPresets";
const customPresetMigrationKey = "aiTradeCustomStrategyPresetsMigratedToServer";
const rankingRecordStorageKey = "aiTradeRankingRecords";
const rankingPeriods = [1, 3, 5];
let recentSymbolPresets = [];
let rankingRecords = [];

const fields = {
  highestPrice: document.querySelector("#highestPrice"),
  highestDate: document.querySelector("#highestDate"),
  lowestPrice: document.querySelector("#lowestPrice"),
  lowestDate: document.querySelector("#lowestDate"),
  latestClose: document.querySelector("#latestClose"),
  latestDate: document.querySelector("#latestDate"),
  tradeCount: document.querySelector("#tradeCount"),
  dataRange: document.querySelector("#dataRange"),
  latestPe: document.querySelector("#latestPe"),
  peAvailability: document.querySelector("#peAvailability"),
  latestVolume: document.querySelector("#latestVolume"),
  volumeAvailability: document.querySelector("#volumeAvailability"),
  chartTitle: document.querySelector("#chartTitle"),
  chartSubtitle: document.querySelector("#chartSubtitle"),
};

const companyFields = {
  name: document.querySelector("#companyName"),
  code: document.querySelector("#companyCode"),
  market: document.querySelector("#companyMarket"),
  exchange: document.querySelector("#companyExchange"),
  currency: document.querySelector("#companyCurrency"),
  source: document.querySelector("#companySource"),
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
  maRsiBand513100: {
    label: "513100 MA-RSI 波段策略",
    strategyType: "ma-rsi-band",
    waveThreshold: 5,
    maRsiBandRule: {
      ...defaultMaRsiBandRule,
    },
    buyRules: defaultBuyRules.map((rule) => ({ ...rule, enabled: false })),
    sellRules: defaultSellRules.map((rule) => ({ ...rule, enabled: false })),
    noNewHighExitRule: {
      enabled: false,
      ...defaultNoNewHighExitRule,
    },
  },
  orderGridBase: {
    label: "近端高点订单网格策略",
    strategyType: "order-grid",
    waveThreshold: 5,
    orderGridRule: {
      ...defaultOrderGridRule,
    },
    buyRules: defaultBuyRules.map((rule) => ({ ...rule, enabled: false })),
    sellRules: defaultSellRules.map((rule) => ({ ...rule, enabled: false })),
    noNewHighExitRule: {
      enabled: false,
      ...defaultNoNewHighExitRule,
    },
  },
  peVolumeBase: {
    label: "PE-成交量估值策略",
    strategyType: "pe-volume",
    waveThreshold: 5,
    peVolumeRule: {
      ...defaultPeVolumeRule,
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

const builtinPresetMetadata = {
  optimized: {
    targetSymbol: "513100",
    provedPeriod: "1/3/5/8年",
    creator: "Codex",
    createdAt: "2026-08-12",
    updatedAt: "2026-08-12",
  },
  optimized588000: {
    targetSymbol: "588000",
    provedPeriod: "1/3/5/8年",
    creator: "Codex",
    createdAt: "2026-08-12",
    updatedAt: "2026-08-12",
  },
  localLadder588000: {
    targetSymbol: "588000",
    provedPeriod: "1/3/5/8年",
    creator: "Codex",
    createdAt: "2026-08-12",
    updatedAt: "2026-08-12",
  },
  maRsiBand513100: {
    targetSymbol: "513100",
    provedPeriod: "1/3/5/8年",
    creator: "Codex",
    createdAt: "2026-08-12",
    updatedAt: "2026-08-12",
  },
  orderGridBase: {
    targetSymbol: "通用",
    provedPeriod: "手动验证",
    creator: "Codex",
    createdAt: "2026-08-12",
    updatedAt: "2026-08-12",
  },
  peVolumeBase: {
    targetSymbol: "A股个股",
    provedPeriod: "待本地验证",
    creator: "Codex",
    createdAt: "2026-08-13",
    updatedAt: "2026-08-13",
  },
  original: {
    targetSymbol: "通用",
    provedPeriod: "原始规则",
    creator: "user",
    createdAt: "2026-08-12",
    updatedAt: "2026-08-12",
  },
};

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayText() {
  return formatDate(new Date());
}

function getPresetMetadata(name, preset) {
  return {
    targetSymbol: normalizeSymbolInput(codeInput.value) || "通用",
    provedPeriod: activeBacktestRangeLabel || `${startInput.value || "?"}至${endInput.value || "?"}`,
    creator: "user",
    createdAt: todayText(),
    updatedAt: todayText(),
    ...(builtinPresetMetadata[name] || {}),
    ...(preset.meta || {}),
  };
}

function getPresetResearchName(name, preset) {
  const meta = getPresetMetadata(name, preset);
  return `${getStrategyTypeLabel(preset.strategyType || "wave")}*${meta.targetSymbol}*${meta.provedPeriod}*${meta.creator}*${meta.createdAt}_${meta.updatedAt}`;
}

function sanitizeStoredPreset(name, preset) {
  if (!preset || typeof preset !== "object") return null;
  const strategyType = ["wave", "local-high-ladder", "ma-rsi-band", "order-grid", "pe-volume"].includes(preset.strategyType)
    ? preset.strategyType
    : "wave";
  return {
    label: String(preset.label || name).slice(0, 80),
    strategyType,
    waveThreshold: Math.max(0.1, Number(preset.waveThreshold || 5)),
    buyRules: cloneRules(preset.buyRules, defaultBuyRules),
    sellRules: cloneRules(preset.sellRules, defaultSellRules),
    noNewHighExitRule: {
      enabled: Boolean(preset.noNewHighExitRule && preset.noNewHighExitRule.enabled),
      ...defaultNoNewHighExitRule,
      ...(preset.noNewHighExitRule || {}),
    },
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
    meta: {
      targetSymbol: String(preset.meta && preset.meta.targetSymbol || "通用").slice(0, 24),
      provedPeriod: String(preset.meta && preset.meta.provedPeriod || "本地保存").slice(0, 40),
      creator: String(preset.meta && preset.meta.creator || "user").slice(0, 32),
      createdAt: String(preset.meta && preset.meta.createdAt || todayText()).slice(0, 16),
      updatedAt: String(preset.meta && preset.meta.updatedAt || todayText()).slice(0, 16),
    },
  };
}

function loadLocalCustomStrategyPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(customPresetStorageKey) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce((next, [name, preset]) => {
      const key = String(name || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
      const safePreset = sanitizeStoredPreset(key, preset);
      if (key && safePreset) next[key] = safePreset;
      return next;
    }, {});
  } catch (error) {
    return {};
  }
}

function saveCustomStrategyPresets() {
  if (!requireSignedInForSave()) return Promise.resolve(false);
  const customPresets = Object.fromEntries(
    Object.entries(strategyPresets).filter(([name]) => name.startsWith("custom_") || name.startsWith("auto_"))
  );
  return saveServerCustomStrategyPresets(customPresets).then((payload) => {
    if (!payload) return false;
    localStorage.setItem(customPresetStorageKey, JSON.stringify(customPresets));
    return true;
  });
}

async function fetchServerCustomStrategyPresets() {
  const response = await fetch("/api/presets", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "读取服务器预设失败。");
  }
  currentUser = payload.authenticated ? payload.user : currentUser;
  renderAuthState();
  return payload.presets && typeof payload.presets === "object" ? payload.presets : {};
}

async function saveServerCustomStrategyPresets(customPresets) {
  try {
    const response = await fetch("/api/presets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ presets: customPresets }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "保存服务器预设失败。");
    }
    if (payload.user) {
      currentUser = payload.user;
      renderAuthState();
    }
    if (payload.presets && typeof payload.presets === "object") {
      removeCustomStrategyPresets();
      Object.assign(strategyPresets, normalizeCustomPresetMap(payload.presets));
      localStorage.setItem(customPresetStorageKey, JSON.stringify(getCurrentCustomPresets()));
    }
    return payload;
  } catch (error) {
    if (/注册|登录|401/.test(error.message)) {
      openAuthDialog("register", error.message);
    }
    setStatus(`服务器预设保存失败：${error.message}`, true);
    return null;
  }
}

function normalizeCustomPresetMap(presets) {
  if (!presets || typeof presets !== "object" || Array.isArray(presets)) return {};
  return Object.entries(presets).reduce((next, [name, preset]) => {
    const key = String(name || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    const safePreset = sanitizeStoredPreset(key, preset);
    if (key && safePreset) next[key] = safePreset;
    return next;
  }, {});
}

function getCurrentCustomPresets() {
  return Object.fromEntries(
    Object.entries(strategyPresets).filter(([name]) => name.startsWith("custom_") || name.startsWith("auto_"))
  );
}

function removeCustomStrategyPresets() {
  Object.keys(strategyPresets).forEach((name) => {
    if (name.startsWith("custom_") || name.startsWith("auto_")) {
      delete strategyPresets[name];
    }
  });
}

async function initializeServerCustomPresets() {
  const localPresets = loadLocalCustomStrategyPresets();
  const hasLocalPresets = Object.keys(localPresets).length > 0;
  try {
    const serverPayload = await fetchServerCustomStrategyPresets();
    const serverPresets = normalizeCustomPresetMap(serverPayload);
    removeCustomStrategyPresets();
    Object.assign(strategyPresets, serverPresets);

    if (currentUser && hasLocalPresets && localStorage.getItem(customPresetMigrationKey) !== "true") {
      Object.assign(strategyPresets, localPresets);
      await saveServerCustomStrategyPresets(getCurrentCustomPresets());
      localStorage.setItem(customPresetMigrationKey, "true");
      setStatus(`已将浏览器本地自定义模型迁移到 ${currentUser.email} 的服务器账户。`);
    } else if (!currentUser && hasLocalPresets && localStorage.getItem(customPresetMigrationKey) !== "true") {
      setStatus("检测到浏览器本地旧模型；登录后会迁移到你的服务器账户。");
    } else {
      localStorage.setItem(customPresetStorageKey, JSON.stringify(getCurrentCustomPresets()));
    }

    renderModelCompareOptions();
    renderModelRanking();
    const selectedPreset = strategyPresetSelect ? strategyPresetSelect.value : "";
    const selectedType = indicatorModelSelect ? indicatorModelSelect.value : "wave";
    renderStrategyPresetOptions(selectedType, selectedPreset);
  } catch (error) {
    setStatus(`服务器预设读取失败：${error.message}`, true);
  }
}

function buildRankingRecordKey(symbol, periodYears, presetName, startDate = "", endDate = "") {
  return `${String(symbol || "").toUpperCase()}:${periodYears}:${startDate}:${endDate}:${presetName}`;
}

function sanitizeRankingRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const periodYears = Number(record.periodYears);
  if (!rankingPeriods.includes(periodYears)) return null;
  const symbol = String(record.symbol || "").trim().toUpperCase().slice(0, 16);
  const presetName = String(record.presetName || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  if (!symbol || !presetName) return null;
  const numberValue = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  return {
    key: String(record.key || buildRankingRecordKey(symbol, periodYears, presetName, record.startDate, record.endDate)).slice(0, 160),
    symbol,
    symbolName: String(record.symbolName || symbol).slice(0, 80),
    periodYears,
    periodLabel: `${periodYears} 年`,
    startDate: String(record.startDate || "").slice(0, 16),
    endDate: String(record.endDate || "").slice(0, 16),
    presetName,
    presetLabel: String(record.presetLabel || presetName).slice(0, 100),
    strategyType: ["wave", "local-high-ladder", "ma-rsi-band", "order-grid", "pe-volume"].includes(record.strategyType)
      ? record.strategyType
      : "wave",
    returnRate: numberValue(record.returnRate),
    annualizedReturn: numberValue(record.annualizedReturn),
    buyHoldReturnRate: numberValue(record.buyHoldReturnRate),
    excessReturn: numberValue(record.excessReturn),
    maxDrawdown: numberValue(record.maxDrawdown),
    buyHoldMaxDrawdown: numberValue(record.buyHoldMaxDrawdown),
    drawdownDiff: numberValue(record.drawdownDiff),
    totalFees: numberValue(record.totalFees),
    buyHoldFees: numberValue(record.buyHoldFees),
    trades: Math.max(0, Math.round(numberValue(record.trades))),
    updatedAt: String(record.updatedAt || todayText()).slice(0, 16),
  };
}

function normalizeRankingRecords(records) {
  if (!Array.isArray(records)) return [];
  const merged = new Map();
  records.forEach((record) => {
    const safeRecord = sanitizeRankingRecord(record);
    if (safeRecord) merged.set(safeRecord.key, safeRecord);
  });
  return Array.from(merged.values());
}

function loadLocalRankingRecords() {
  try {
    return normalizeRankingRecords(JSON.parse(localStorage.getItem(rankingRecordStorageKey) || "[]"));
  } catch (error) {
    return [];
  }
}

function mergeRankingRecords(records) {
  rankingRecords = normalizeRankingRecords([...rankingRecords, ...(records || [])]);
  localStorage.setItem(rankingRecordStorageKey, JSON.stringify(rankingRecords));
}

async function fetchServerRankingRecords() {
  const response = await fetch("/api/rankings", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "读取服务器排行失败。");
  }
  return Array.isArray(payload.records) ? payload.records : [];
}

async function saveServerRankingRecords(records) {
  try {
    const response = await fetch("/api/rankings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "保存服务器排行失败。");
    }
    if (Array.isArray(payload.records)) {
      mergeRankingRecords(payload.records);
      renderModelRanking();
    }
  } catch (error) {
    setStatus(`服务器排行保存失败，已保留浏览器本地备份：${error.message}`, true);
  }
}

function serializeTradeForBacktestSave(trade) {
  return {
    date: trade.date,
    side: trade.side,
    label: trade.label,
    price: Number(trade.price) || 0,
    shares: Number(trade.shares) || 0,
    positionRatio: Number(trade.positionRatio) || 0,
    accountCash: Number(trade.accountCash) || 0,
    accountEquity: Number(trade.accountEquity) || 0,
    fee: Number(trade.fee) || 0,
    reason: trade.reason || "",
    reference: trade.reference || null,
  };
}

function serializeResultForBacktestSave(result, rank) {
  const state = result.finalState || {};
  const buyHold = state.buyHold || {};
  return {
    name: result.name,
    label: result.label,
    strategyType: result.strategyType || "wave",
    rank,
    config: result.config || {},
    finalState: {
      equity: Number(state.equity) || 0,
      returnRate: Number(state.returnRate) || 0,
      maxDrawdown: Number(state.maxDrawdown) || 0,
      excessReturn: Number(state.excessReturn) || 0,
      drawdownDiff: Number(state.drawdownDiff) || 0,
      totalFees: Number(state.totalFees) || 0,
      buyHold: {
        returnRate: Number(buyHold.returnRate) || 0,
        maxDrawdown: Number(buyHold.maxDrawdown) || 0,
        totalFees: Number(buyHold.totalFees) || 0,
      },
    },
    trades: (state.trades || []).map(serializeTradeForBacktestSave),
  };
}

async function saveBacktestRunToServer(config) {
  if (!currentUser || !comparisonResults || comparisonResults.length === 0 || !activeBacktestRows || activeBacktestRows.length === 0) {
    return null;
  }
  const symbolInfo = getActiveRankingSymbolInfo();
  const payload = {
    symbol: symbolInfo.symbol,
    symbolName: symbolInfo.symbolName,
    market: lastSummary && lastSummary.symbol ? lastSummary.symbol.market : "",
    startDate: activeBacktestRows[0].date,
    endDate: activeBacktestRows[activeBacktestRows.length - 1].date,
    rangeLabel: activeBacktestRangeLabel,
    initialCash: config.initialCash,
    tradeFee: config.tradeFee,
    config,
    summary: {
      rowCount: activeBacktestRows.length,
      source: lastSummary && lastSummary.source ? lastSummary.source : "",
    },
    results: comparisonResults.map((result, index) => serializeResultForBacktestSave(result, index + 1)),
  };

  try {
    const response = await fetch("/api/backtests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "回测记录保存失败。");
    return result;
  } catch (error) {
    setStatus(`模拟完成，但历史测试记录保存失败：${error.message}`, true);
    return null;
  }
}

async function initializeServerRankingRecords() {
  rankingRecords = loadLocalRankingRecords();
  renderModelRanking();
  try {
    mergeRankingRecords(await fetchServerRankingRecords());
    renderModelRanking();
    if (rankingRecords.length > 0) saveServerRankingRecords(rankingRecords);
  } catch (error) {
    setStatus(`服务器排行读取失败，暂时使用浏览器本地备份：${error.message}`, true);
  }
}

rankingRecords = loadLocalRankingRecords();

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

function shiftDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeSymbolInput(value) {
  return String(value || "").trim().toUpperCase();
}

function loadRecentSymbols() {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentSymbolStorageKey) || "[]");
    return Array.isArray(parsed)
      ? parsed.map(normalizeSymbolInput).filter(Boolean).slice(0, 20)
      : [];
  } catch (error) {
    return [];
  }
}

function getAllSymbolPresets() {
  return Array.from(new Set([...symbolPresets, ...recentSymbolPresets]));
}

function renderSymbolPresetOptions(selectedSymbol = normalizeSymbolInput(codeInput.value)) {
  if (!symbolPresetSelect) return;
  const selected = normalizeSymbolInput(selectedSymbol);
  const allSymbols = getAllSymbolPresets();
  if (selected && !allSymbols.includes(selected)) allSymbols.unshift(selected);

  symbolPresetSelect.innerHTML = allSymbols
    .map((symbol) => {
      const selectedAttr = symbol === selected ? " selected" : "";
      const recentLabel = !symbolPresets.includes(symbol) ? "最近 " : "";
      return `<option value="${symbol}"${selectedAttr}>${recentLabel}${symbol}</option>`;
    })
    .join("");
}

function updateSymbolPresetFromInput() {
  const symbol = normalizeSymbolInput(codeInput.value);
  if (symbolPresetSelect && getAllSymbolPresets().includes(symbol)) {
    symbolPresetSelect.value = symbol;
  }
}

function rememberLoadedSymbol(symbol) {
  const normalized = normalizeSymbolInput(symbol);
  if (!normalized) return;
  recentSymbolPresets = [
    normalized,
    ...recentSymbolPresets.filter((item) => item !== normalized),
  ]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 20);
  localStorage.setItem(recentSymbolStorageKey, JSON.stringify(recentSymbolPresets));
  renderSymbolPresetOptions(normalized);
}

function setDateRangeByYears(years) {
  const endDate = new Date();
  endInput.value = formatDate(endDate);
  startInput.value = formatDate(shiftYears(endDate, -years));
}

function applyRangePreset() {
  if (!rangePresetSelect || rangePresetSelect.value === "custom") return;
  if (rangePresetSelect.value === "4w") {
    const endDate = new Date();
    endInput.value = formatDate(endDate);
    startInput.value = formatDate(shiftDays(endDate, -28));
    return;
  }
  setDateRangeByYears(Number(rangePresetSelect.value));
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

function formatLargeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "--";
  if (number >= 100000000) return `${(number / 100000000).toFixed(2)}亿`;
  if (number >= 10000) return `${(number / 10000).toFixed(2)}万`;
  return Math.round(number).toLocaleString("zh-CN");
}

function formatOptionalNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number.toFixed(digits) : "--";
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusBand.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  form.querySelector("button").disabled = isLoading;
}

function renderAuthState() {
  const isSignedIn = Boolean(currentUser && currentUser.email);
  const needsVerification = isSignedIn && currentUser.emailEnabled && currentUser.emailVerified === false;
  if (authStatusText) {
    authStatusText.textContent = isSignedIn
      ? `${currentUser.email}${needsVerification ? "（待验证）" : ""}`
      : "未登录";
  }
  if (openAuthButton) {
    openAuthButton.textContent = isSignedIn ? "切换账户" : "注册 / 登录";
  }
  if (logoutButton) logoutButton.classList.toggle("hidden", !isSignedIn);
  if (resendVerificationButton) resendVerificationButton.classList.toggle("hidden", !needsVerification);
  if (newModelAuthNote) newModelAuthNote.classList.toggle("hidden", isSignedIn && !needsVerification);
  if (customModelCreatorInput && isSignedIn) {
    customModelCreatorInput.value = currentUser.email;
  }
}

function setAuthMessage(message, isError = false) {
  if (!authMessage) return;
  authMessage.textContent = message || "";
  authMessage.classList.toggle("hidden", !message);
  authMessage.classList.toggle("error", isError);
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "login";
  if (authLoginTab) authLoginTab.classList.toggle("active", authMode === "login");
  if (authRegisterTab) authRegisterTab.classList.toggle("active", authMode === "register");
  if (submitAuthButton) submitAuthButton.textContent = authMode === "register" ? "免费注册" : "登录";
  setAuthMessage(authMode === "register" ? "注册后请验证电子邮件，然后可把新模型和优化参数保存到服务器端。" : "", false);
}

function openAuthDialog(mode = "login", message = "") {
  setAuthMode(mode);
  if (message) setAuthMessage(message, true);
  if (!authDialog) return;
  if (typeof authDialog.showModal === "function") {
    authDialog.showModal();
  } else {
    authDialog.setAttribute("open", "open");
  }
  if (authEmailInput) authEmailInput.focus();
}

async function fetchAuthSession() {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const payload = await response.json();
    currentUser = payload.authenticated ? payload.user : null;
    renderAuthState();
    return currentUser;
  } catch (error) {
    currentUser = null;
    renderAuthState();
    return null;
  }
}

async function submitAuthForm() {
  if (!authEmailInput || !authPasswordInput) return;
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) {
    setAuthMessage("请输入电子邮件和密码。", true);
    return;
  }
  if (submitAuthButton) submitAuthButton.disabled = true;
  setAuthMessage(authMode === "register" ? "正在注册..." : "正在登录...", false);

  try {
    const response = await fetch(`/api/auth/${authMode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "账户操作失败。");
    }
    currentUser = payload.user;
    renderAuthState();
    await initializeServerCustomPresets();
    if (authDialog && authDialog.open) authDialog.close();
    if (currentUser.emailEnabled && currentUser.emailVerified === false) {
      const emailStatus = payload.verificationEmail && payload.verificationEmail.error
        ? `验证邮件发送失败：${payload.verificationEmail.error}`
        : "请到邮箱点击验证链接，验证后就可以保存模型。";
      setStatus(`${currentUser.email} 已登录。${emailStatus}`, payload.verificationEmail && payload.verificationEmail.error);
    } else {
      setStatus(`${currentUser.email} 已登录，服务器端模型已加载。`);
    }
  } catch (error) {
    setAuthMessage(error.message || "账户操作失败。", true);
  } finally {
    if (submitAuthButton) submitAuthButton.disabled = false;
  }
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    // The local UI can still reset even if the logout request is interrupted.
  }
  currentUser = null;
  renderAuthState();
  removeCustomStrategyPresets();
  await initializeServerCustomPresets();
  setStatus("已退出账户。需要保存模型时请重新登录。");
}

function requireSignedInForSave() {
  if (currentUser && currentUser.email && !(currentUser.emailEnabled && currentUser.emailVerified === false)) return true;
  if (currentUser && currentUser.email) {
    setStatus("保存到服务器前，请先验证电子邮件。可以点击账户区域的“重发验证邮件”。", true);
    return false;
  }
  openAuthDialog("register", "保存模型需要先免费注册或登录。");
  setStatus("保存模型需要先注册或登录。", true);
  return false;
}

async function resendVerificationEmail() {
  if (!currentUser || !currentUser.email) {
    openAuthDialog("register", "请先注册或登录。");
    return;
  }
  if (resendVerificationButton) resendVerificationButton.disabled = true;
  setStatus("正在发送验证邮件...");
  try {
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "验证邮件发送失败。");
    }
    if (payload.alreadyVerified) {
      await fetchAuthSession();
      setStatus("电子邮件已经验证，可以保存模型。");
      return;
    }
    setStatus("验证邮件已发送，请检查邮箱。");
  } catch (error) {
    setStatus(error.message || "验证邮件发送失败。", true);
  } finally {
    if (resendVerificationButton) resendVerificationButton.disabled = false;
  }
}

function revealHistoryPanels() {
  historyPanels.forEach((panel) => panel.classList.remove("hidden"));
}

function hideHistoryPanels() {
  historyPanels.forEach((panel) => panel.classList.add("hidden"));
}

function scrollToModelPerformance() {
  if (!modelPerformancePanel) return;
  modelPerformancePanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function getSimulationStepTarget(stepName) {
  if (stepName === "data") return document.querySelector("#simulationDataSection");
  if (stepName === "results") return document.querySelector("#simulationResultsSection");
  return document.querySelector("#simulationModelsSection");
}

function setSimulationStep(stepName) {
  const order = ["models", "data", "results"];
  const nextStep = order.includes(stepName) ? stepName : "models";
  const activeIndex = order.indexOf(nextStep);
  activeSimulationStep = nextStep;
  simulationProgressButtons.forEach((button) => {
    const stepIndex = order.indexOf(button.dataset.simulationStep);
    const isActive = button.dataset.simulationStep === nextStep;
    button.classList.toggle("active", isActive);
    button.classList.toggle("complete", stepIndex >= 0 && stepIndex < activeIndex);
    button.setAttribute("aria-current", isActive ? "step" : "false");
  });
}

function scrollToSimulationStep(stepName) {
  const target = getSimulationStepTarget(stepName);
  if (!target) return;
  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function setWizardPage(pageName) {
  const nextPage = pageName || "simulation";
  wizardButtons.forEach((button) => {
    const isActive = button.dataset.wizardTarget === nextPage;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  wizardPages.forEach((page) => {
    page.classList.toggle("active", page.dataset.wizardPage === nextPage);
  });

  if (nextPage === "ranking") {
    renderModelRanking();
  }

  window.requestAnimationFrame(() => {
    if (lastRows && lastSummary) {
      drawChart(lastRows, lastSummary);
    }
    if (backtestStates.length > 0) {
      redrawVisibleBacktestCharts();
    }
  });
}

function resetGeneratedModelDraft() {
  generatedPresetDraft = null;
  if (generatedModelCode) generatedModelCode.textContent = "等待生成...";
  if (saveGeneratedModelButton) saveGeneratedModelButton.disabled = true;
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

function readMaRsiBandRule() {
  const readNumber = (input, fallback) => {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  };

  const clampPercent = (value) => Math.min(100, Math.max(0, value));

  return {
    fastMa: Math.max(2, Math.round(readNumber(maFastMaInput, defaultMaRsiBandRule.fastMa))),
    slowMa: Math.max(5, Math.round(readNumber(maSlowMaInput, defaultMaRsiBandRule.slowMa))),
    slowBuffer: readNumber(maSlowBufferInput, defaultMaRsiBandRule.slowBuffer),
    useSlowTrend: maUseSlowTrendInput ? maUseSlowTrendInput.checked : defaultMaRsiBandRule.useSlowTrend,
    bearTarget: clampPercent(readNumber(maBearTargetInput, defaultMaRsiBandRule.bearTarget)),
    bullTarget: clampPercent(readNumber(maBullTargetInput, defaultMaRsiBandRule.bullTarget)),
    useFastBull: maUseFastBullInput ? maUseFastBullInput.checked : defaultMaRsiBandRule.useFastBull,
    fastBullTarget: clampPercent(readNumber(maFastBullTargetInput, defaultMaRsiBandRule.fastBullTarget)),
    useFastCut: maUseFastCutInput ? maUseFastCutInput.checked : defaultMaRsiBandRule.useFastCut,
    fastBearTarget: clampPercent(readNumber(maFastBearTargetInput, defaultMaRsiBandRule.fastBearTarget)),
    fastCut: Math.max(0, readNumber(maFastCutInput, defaultMaRsiBandRule.fastCut)),
    rsiDays: Math.max(2, Math.round(readNumber(maRsiDaysInput, defaultMaRsiBandRule.rsiDays))),
    useRsiBuy: maUseRsiBuyInput ? maUseRsiBuyInput.checked : defaultMaRsiBandRule.useRsiBuy,
    rsiBuy: Math.min(99, Math.max(1, readNumber(maRsiBuyInput, defaultMaRsiBandRule.rsiBuy))),
    rsiTarget: clampPercent(readNumber(maRsiTargetInput, defaultMaRsiBandRule.rsiTarget)),
    useRsiSell: maUseRsiSellInput ? maUseRsiSellInput.checked : defaultMaRsiBandRule.useRsiSell,
    rsiSell: Math.min(99, Math.max(1, readNumber(maRsiSellInput, defaultMaRsiBandRule.rsiSell))),
    hotTarget: clampPercent(readNumber(maHotTargetInput, defaultMaRsiBandRule.hotTarget)),
    atrDays: Math.max(2, Math.round(readNumber(maAtrDaysInput, defaultMaRsiBandRule.atrDays))),
    useAtr: maUseAtrInput ? maUseAtrInput.checked : defaultMaRsiBandRule.useAtr,
    highAtr: Math.max(0, readNumber(maHighAtrInput, defaultMaRsiBandRule.highAtr)),
    volTarget: clampPercent(readNumber(maVolTargetInput, defaultMaRsiBandRule.volTarget)),
  };
}

function applyMaRsiBandRule(rule = defaultMaRsiBandRule) {
  maFastMaInput.value = rule.fastMa;
  maSlowMaInput.value = rule.slowMa;
  maSlowBufferInput.value = rule.slowBuffer;
  maUseSlowTrendInput.checked = rule.useSlowTrend !== false;
  maBearTargetInput.value = rule.bearTarget;
  maBullTargetInput.value = rule.bullTarget;
  maUseFastBullInput.checked = rule.useFastBull !== false;
  maFastBullTargetInput.value = rule.fastBullTarget;
  maUseFastCutInput.checked = rule.useFastCut !== false;
  maFastBearTargetInput.value = rule.fastBearTarget;
  maFastCutInput.value = rule.fastCut;
  maRsiDaysInput.value = rule.rsiDays;
  maUseRsiBuyInput.checked = rule.useRsiBuy !== false;
  maRsiBuyInput.value = rule.rsiBuy;
  maRsiTargetInput.value = rule.rsiTarget;
  maUseRsiSellInput.checked = rule.useRsiSell !== false;
  maRsiSellInput.value = rule.rsiSell;
  maHotTargetInput.value = rule.hotTarget;
  maAtrDaysInput.value = rule.atrDays;
  maUseAtrInput.checked = rule.useAtr !== false;
  maHighAtrInput.value = rule.highAtr;
  maVolTargetInput.value = rule.volTarget;
}

function readOrderGridRule() {
  const readNumber = (input, fallback) => {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  };

  return {
    lookbackDays: Math.max(2, Math.round(readNumber(orderLookbackInput, defaultOrderGridRule.lookbackDays))),
    entryDrop: Math.max(0, readNumber(orderEntryDropInput, defaultOrderGridRule.entryDrop)),
    orderCapitalPercent: Math.min(100, Math.max(1, readNumber(orderCapitalInput, defaultOrderGridRule.orderCapitalPercent))),
    addDrop: Math.max(0.1, readNumber(orderAddDropInput, defaultOrderGridRule.addDrop)),
    takeProfit: Math.max(0.1, readNumber(orderTakeProfitInput, defaultOrderGridRule.takeProfit)),
    maxLots: Math.max(1, Math.round(readNumber(orderMaxLotsInput, defaultOrderGridRule.maxLots))),
  };
}

function applyOrderGridRule(rule = defaultOrderGridRule) {
  orderLookbackInput.value = rule.lookbackDays;
  orderEntryDropInput.value = rule.entryDrop;
  orderCapitalInput.value = rule.orderCapitalPercent;
  orderAddDropInput.value = rule.addDrop;
  orderTakeProfitInput.value = rule.takeProfit;
  orderMaxLotsInput.value = rule.maxLots;
}

function readPeVolumeRule() {
  const readNumber = (input, fallback) => {
    const value = Number(input && input.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const clampPercent = (value) => Math.min(100, Math.max(0, value));
  const lowPercentile = Math.min(99, Math.max(1, readNumber(peLowPercentileInput, defaultPeVolumeRule.lowPePercentile)));
  const highPercentile = Math.min(99, Math.max(lowPercentile + 1, readNumber(peHighPercentileInput, defaultPeVolumeRule.highPePercentile)));

  return {
    peLookbackDays: Math.max(20, Math.round(readNumber(peLookbackInput, defaultPeVolumeRule.peLookbackDays))),
    lowPePercentile: lowPercentile,
    highPePercentile: highPercentile,
    volumeMaDays: Math.max(2, Math.round(readNumber(volumeMaDaysInput, defaultPeVolumeRule.volumeMaDays))),
    volumeBuyMultiplier: Math.max(0.1, readNumber(volumeBuyMultiplierInput, defaultPeVolumeRule.volumeBuyMultiplier)),
    volumeSellMultiplier: Math.max(0.1, readNumber(volumeSellMultiplierInput, defaultPeVolumeRule.volumeSellMultiplier)),
    lowPeTarget: clampPercent(readNumber(peLowTargetInput, defaultPeVolumeRule.lowPeTarget)),
    neutralTarget: clampPercent(readNumber(peNeutralTargetInput, defaultPeVolumeRule.neutralTarget)),
    highPeTarget: clampPercent(readNumber(peHighTargetInput, defaultPeVolumeRule.highPeTarget)),
  };
}

function applyPeVolumeRule(rule = defaultPeVolumeRule) {
  peLookbackInput.value = rule.peLookbackDays;
  peLowPercentileInput.value = rule.lowPePercentile;
  peHighPercentileInput.value = rule.highPePercentile;
  volumeMaDaysInput.value = rule.volumeMaDays;
  volumeBuyMultiplierInput.value = rule.volumeBuyMultiplier;
  volumeSellMultiplierInput.value = rule.volumeSellMultiplier;
  peLowTargetInput.value = rule.lowPeTarget;
  peNeutralTargetInput.value = rule.neutralTarget;
  peHighTargetInput.value = rule.highPeTarget;
}

function updateIndicatorUi() {
  const strategyType = indicatorModelSelect.value;
  const isWave = strategyType === "wave";
  const isLocalLadder = strategyType === "local-high-ladder";
  const isMaRsiBand = strategyType === "ma-rsi-band";
  const isOrderGrid = strategyType === "order-grid";
  const isPeVolume = strategyType === "pe-volume";
  document.querySelectorAll(".wave-param").forEach((item) => item.classList.add("hidden"));
  localLadderPanel.classList.add("hidden");
  maRsiBandPanel.classList.add("hidden");
  orderGridPanel.classList.add("hidden");
  peVolumePanel.classList.add("hidden");
  waveBuyPanel.classList.add("hidden");
  waveSellPanel.classList.add("hidden");

  if (isLocalLadder) {
    indicatorHighLegend.textContent = "近端高点";
    indicatorLowLegend.textContent = "阶梯触发低点";
    indicatorConfirmLegend.textContent = "卖出/保护点";
  } else if (isMaRsiBand) {
    indicatorHighLegend.textContent = "减仓信号";
    indicatorLowLegend.textContent = "加仓信号";
    indicatorConfirmLegend.textContent = "指标参考";
  } else if (isOrderGrid) {
    indicatorHighLegend.textContent = "近端高点";
    indicatorLowLegend.textContent = "订单买入";
    indicatorConfirmLegend.textContent = "订单参考";
  } else if (isPeVolume) {
    indicatorHighLegend.textContent = "降仓信号";
    indicatorLowLegend.textContent = "加仓信号";
    indicatorConfirmLegend.textContent = "PE/量能参考";
  } else {
    indicatorHighLegend.textContent = "波浪高点";
    indicatorLowLegend.textContent = "波浪低点";
    indicatorConfirmLegend.textContent = "确认点";
  }
}

function getPresetEntriesForType(strategyType) {
  return Object.entries(strategyPresets).filter(([, preset]) => {
    return (preset.strategyType || "wave") === strategyType;
  });
}

function getStrategyTypeLabel(strategyType) {
  if (strategyType === "local-high-ladder") return "近端阶梯";
  if (strategyType === "ma-rsi-band") return "MA-RSI";
  if (strategyType === "order-grid") return "订单网格";
  if (strategyType === "pe-volume") return "PE-成交量";
  return "波浪";
}

function getCurrentConfigLabel(config) {
  return `当前界面参数（${getStrategyTypeLabel(config.strategyType)}）`;
}

function cloneRules(rules, defaults) {
  return (rules || defaults).map((rule) => ({ ...rule }));
}

function createConfigFromPreset(presetName, baseConfig) {
  const preset = strategyPresets[presetName] || strategyPresets.optimized;
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

function renderModelCompareOptions() {
  if (!modelCompareOptions) return;
  const selectedNames = new Set(getSelectedComparisonPresetNames());
  const presetEntries = Object.entries(strategyPresets);

  modelCompareOptions.innerHTML = presetEntries
    .map(([name, preset]) => {
      const checked = selectedNames.has(name) ? " checked" : "";
      return `
        <div class="model-preset-card" data-preset-name="${escapeHtml(name)}">
          <label>
            <input class="model-compare-enabled" type="checkbox" value="${escapeHtml(name)}"${checked}>
            <span>${escapeHtml(preset.label)}</span>
            <small>${escapeHtml(getPresetResearchName(name, preset))}</small>
          </label>
          <button class="preset-param-button" type="button" data-preset-name="${escapeHtml(name)}">参数</button>
          <button class="preset-optimize-button" type="button" data-preset-name="${escapeHtml(name)}">优化</button>
        </div>
      `;
    })
    .join("");

  if (presetEntries.length === 0) {
    modelCompareOptions.innerHTML = '<div class="ranking-empty">还没有预存模型。</div>';
  }
}

function getSelectedComparisonPresetNames() {
  return Array.from(document.querySelectorAll(".model-compare-enabled:checked"))
    .map((input) => input.value)
    .filter((name) => strategyPresets[name]);
}

function isCurrentConfigComparisonEnabled() {
  return false;
}

function markSelectedComparePreset(presetName) {
  if (!modelCompareOptions) return;
  modelCompareOptions.querySelectorAll("[data-preset-name]").forEach((card) => {
    card.classList.toggle("selected", card.dataset.presetName === presetName);
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
      return `<option value="${escapeHtml(name)}"${selected}>${escapeHtml(preset.label)}</option>`;
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
  applyMaRsiBandRule(preset.maRsiBandRule || defaultMaRsiBandRule);
  applyOrderGridRule(preset.orderGridRule || defaultOrderGridRule);
  applyPeVolumeRule(preset.peVolumeRule || defaultPeVolumeRule);
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
  markSelectedComparePreset(presetName);
  renderModelRanking();

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
    maRsiBandRule: readMaRsiBandRule(),
    orderGridRule: readOrderGridRule(),
    peVolumeRule: readPeVolumeRule(),
    playSpeed: Math.max(10, Number(playSpeedInput.value)),
    tradeFee: Math.max(0, Number(tradeFeeInput.value) || 0),
    backtestWindowMode: "all",
    backtestYears: 1,
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

function calculatePeVolumePoints(rows, rule) {
  if (!rows || rows.length === 0) {
    return { highs: [], lows: [] };
  }

  const series = buildPeVolumeSeries(rows, rule);
  const highs = [];
  const lows = [];
  let previousTarget = 0;

  rows.forEach((row, index) => {
    const decision = getPeVolumeDecision(row, index, series, rule);
    if (decision.target > previousTarget + 0.5) {
      lows.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        version: lows.length + 1,
      });
    } else if (decision.target < previousTarget - 0.5) {
      highs.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        version: highs.length + 1,
      });
    }
    previousTarget = decision.target;
  });

  return { highs, lows };
}

function calculateMaRsiBandPoints(rows, rule) {
  if (!rows || rows.length === 0) {
    return { highs: [], lows: [] };
  }

  const series = buildMaRsiBandSeries(rows, rule);
  const highs = [];
  const lows = [];
  let previousTarget = 0;

  rows.forEach((row, index) => {
    const decision = getMaRsiBandDecision(row, index, series, rule);
    if (decision.target > previousTarget + 0.5) {
      lows.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        confirmDate: row.date,
        confirmPrice: decision.slowMa || row.close,
        confirmRowIndex: index,
        confirmLabel: "慢均线",
        version: lows.length + 1,
      });
    } else if (decision.target < previousTarget - 0.5) {
      highs.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        confirmDate: row.date,
        confirmPrice: decision.fastMa || row.close,
        confirmRowIndex: index,
        confirmLabel: "快均线",
        version: highs.length + 1,
      });
    }
    previousTarget = decision.target;
  });

  return { highs, lows };
}

function getOrderGridMaxLots(rule) {
  const capitalLimitedLots = Math.max(1, Math.floor(100 / Math.max(1, rule.orderCapitalPercent)));
  return Math.max(1, Math.min(rule.maxLots, capitalLimitedLots));
}

function calculateOrderGridPoints(rows, rule) {
  if (!rows || rows.length === 0) {
    return { highs: [], lows: [] };
  }

  const highs = [];
  const lows = [];
  const seenHighs = new Set();
  const lots = [];
  let nextLotId = 1;

  rows.forEach((row, index) => {
    const rollingHigh = getRollingHigh(rows, index, rule.lookbackDays);
    const highKey = `${rollingHigh.date}:${rollingHigh.high}`;
    if (!seenHighs.has(highKey)) {
      highs.push({
        date: rollingHigh.date,
        price: rollingHigh.high,
        rowIndex: rollingHigh.rowIndex,
        version: highs.length + 1,
      });
      seenHighs.add(highKey);
    }

    for (let lotIndex = lots.length - 1; lotIndex >= 0; lotIndex -= 1) {
      const lot = lots[lotIndex];
      const rise = lot.price > 0 ? ((row.close - lot.price) / lot.price) * 100 : 0;
      if (rise >= rule.takeProfit) lots.splice(lotIndex, 1);
    }

    if (lots.length === 0) {
      const pullback = rollingHigh.high > 0 ? ((rollingHigh.high - row.close) / rollingHigh.high) * 100 : 0;
      if (pullback >= rule.entryDrop) {
        lots.push({ id: nextLotId, price: row.close, date: row.date, rowIndex: index });
        nextLotId += 1;
        lows.push({
          date: row.date,
          price: row.close,
          rowIndex: index,
          confirmDate: rollingHigh.date,
          confirmPrice: rollingHigh.high,
          confirmRowIndex: rollingHigh.rowIndex,
          confirmLabel: `${rule.lookbackDays}日高点`,
          version: lows.length + 1,
        });
      }
      return;
    }

    while (lots.length < getOrderGridMaxLots(rule)) {
      const lastLot = lots[lots.length - 1];
      const drop = lastLot.price > 0 ? ((lastLot.price - row.close) / lastLot.price) * 100 : 0;
      if (drop < rule.addDrop) break;
      lots.push({ id: nextLotId, price: row.close, date: row.date, rowIndex: index });
      nextLotId += 1;
      lows.push({
        date: row.date,
        price: row.close,
        rowIndex: index,
        confirmDate: lastLot.date || row.date,
        confirmPrice: lastLot.price,
        confirmRowIndex: lastLot.rowIndex || index,
        confirmLabel: "上一单价格",
        version: lows.length + 1,
      });
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
  const shares = Math.min(account.shares, Math.floor(sellValue / price));

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
    const shares = Math.min(delta, maxShares);
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

  const shares = Math.min(account.shares, -delta);
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
  const shares = Math.floor(buyValue / price);
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
          trade.reason = `触发买入规则：较阶段高点回撤 ${formatPercent(drawdown)}，达到 ${formatPercent(rule.drop)} 阈值，加仓到 ${formatPercent(rule.target)}`;
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

function buildBacktestStates(rows, config) {
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

function getCompareVerdict(state) {
  const beatsReturn = state.returnRate >= state.buyHold.returnRate;
  const lowersDrawdown = state.maxDrawdown <= state.buyHold.maxDrawdown;
  if (beatsReturn && lowersDrawdown) return "收益领先且回撤更低";
  if (beatsReturn) return "收益领先";
  if (lowersDrawdown) return "回撤更低";
  return "未跑赢";
}

function getModelDataRequirements(config) {
  if (!config || config.strategyType !== "pe-volume") return [];
  return ["pe", "volume"];
}

function getRowsDataAvailability(rows) {
  const peCount = (rows || []).filter((row) => getPeValue(row) !== null).length;
  const volumeCount = (rows || []).filter((row) => Number.isFinite(Number(row.volume)) && Number(row.volume) > 0).length;
  return {
    pe: peCount > 0,
    volume: volumeCount > 0,
    peCount,
    volumeCount,
  };
}

function validateBacktestDataRequirements(rows, entries) {
  const availability = getRowsDataAvailability(rows);
  const missing = new Set();
  (entries || []).forEach((entry) => {
    getModelDataRequirements(entry.config).forEach((requirement) => {
      if (!availability[requirement]) missing.add(requirement);
    });
  });

  if (missing.size === 0) return;
  const names = Array.from(missing).map((item) => item === "pe" ? "PE" : "成交量").join("、");
  const modelNames = (entries || [])
    .filter((entry) => getModelDataRequirements(entry.config).some((requirement) => missing.has(requirement)))
    .map((entry) => entry.label)
    .join("、");
  throw new Error(`当前股票缺少 ${names} 数据，不能运行需要这些指标的模型：${modelNames || "已选模型"}。请换股票或取消这些模型。`);
}

function buildRequirementEntries(config) {
  const entries = [{
    name: "__current__",
    label: getCurrentConfigLabel(config),
    config,
  }];
  getSelectedComparisonPresetNames().forEach((presetName) => {
    const preset = strategyPresets[presetName];
    if (!preset) return;
    entries.push({
      name: presetName,
      label: preset.label,
      config: createConfigFromPreset(presetName, config),
    });
  });
  return entries;
}

function buildModelComparisonResults(rows, currentConfig) {
  if (!rows || rows.length === 0) return [];

  const entries = isCurrentConfigComparisonEnabled()
    ? [{
      name: "__current__",
      label: getCurrentConfigLabel(currentConfig),
      strategyType: currentConfig.strategyType,
      config: currentConfig,
    }]
    : [];

  getSelectedComparisonPresetNames().forEach((presetName) => {
    const preset = strategyPresets[presetName];
    entries.push({
      name: presetName,
      label: preset.label,
      strategyType: preset.strategyType || "wave",
      config: createConfigFromPreset(presetName, currentConfig),
    });
  });

  validateBacktestDataRequirements(rows, entries);

  return entries
    .map((entry) => {
      const states = buildParallelBacktestStates(rows, entry.config);
      const finalState = states[states.length - 1];
      if (!finalState || !finalState.buyHold) return null;
      return {
        ...entry,
        states,
        finalState,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.name === "__current__") return -1;
      if (b.name === "__current__") return 1;
      return b.finalState.returnRate - a.finalState.returnRate;
    });
}

function withTradeModelLabel(trades, modelLabel) {
  return trades.map((trade) => ({
    ...trade,
    modelLabel,
  }));
}

function collectComparisonTrades(results) {
  return (results || [])
    .flatMap((result) => withTradeModelLabel(result.finalState.trades || [], result.label))
    .sort((a, b) => {
      const dateCompare = String(a.date).localeCompare(String(b.date));
      if (dateCompare !== 0) return dateCompare;
      return String(a.modelLabel || "").localeCompare(String(b.modelLabel || ""));
    });
}

function renderModelComparisonTable(results) {
  if (!modelCompareTable) return;

  if (!results || results.length === 0) {
    modelCompareTable.innerHTML = '<div class="ranking-empty">加载历史数据后，选择一个或多个预存模型即可显示表现。</div>';
    return;
  }

  const bestReturn = results.reduce((best, item) => (
    !best || item.finalState.returnRate > best.finalState.returnRate ? item : best
  ), null);
  const bestDrawdown = results.reduce((best, item) => (
    !best || item.finalState.maxDrawdown < best.finalState.maxDrawdown ? item : best
  ), null);
  const beatCount = results.filter((item) => item.finalState.returnRate >= item.finalState.buyHold.returnRate).length;

  modelCompareTable.innerHTML = `
    <div class="model-performance-summary">
      <article>
        <span>已测试模型</span>
        <strong>${results.length}</strong>
      </article>
      <article>
        <span>最佳收益</span>
        <strong>${escapeHtml(bestReturn ? bestReturn.label : "--")} ${bestReturn ? formatPercent(bestReturn.finalState.returnRate) : "--"}</strong>
      </article>
      <article>
        <span>最低回撤</span>
        <strong>${escapeHtml(bestDrawdown ? bestDrawdown.label : "--")} ${bestDrawdown ? formatPercent(bestDrawdown.finalState.maxDrawdown) : "--"}</strong>
      </article>
      <article>
        <span>跑赢全仓</span>
        <strong>${beatCount}</strong>
      </article>
    </div>
    <div class="model-performance-cards">
      ${results
    .map((result, index) => {
      const state = result.finalState;
      const canEditPreset = result.name !== "__current__" && strategyPresets[result.name];
      return `
        <article class="model-performance-card${index === 0 ? " selected" : ""}" data-result-name="${escapeHtml(result.name)}">
          <div class="performance-card-head">
            <span class="rank-badge">#${index + 1}</span>
            <div>
              <strong>${escapeHtml(result.label)}</strong>
              <small>${escapeHtml(getStrategyTypeLabel(result.strategyType))} · ${escapeHtml(getCompareVerdict(state))}</small>
            </div>
          </div>
          <div class="performance-metrics">
            <div>
              <span>收益</span>
              <strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(state.returnRate)}</strong>
            </div>
            <div>
              <span>最大回撤</span>
              <strong>${formatPercent(state.maxDrawdown)}</strong>
            </div>
            <div>
              <span>全仓收益</span>
              <strong>${formatPercent(state.buyHold.returnRate)}</strong>
            </div>
            <div>
              <span>全仓回撤</span>
              <strong>${formatPercent(state.buyHold.maxDrawdown)}</strong>
            </div>
            <div>
              <span>超额</span>
              <strong class="${state.excessReturn >= 0 ? "up" : "down"}">${formatPercent(state.excessReturn)}</strong>
            </div>
            <div>
              <span>回撤差异</span>
              <strong class="${state.drawdownDiff <= 0 ? "up" : "down"}">${formatPercent(state.drawdownDiff)}</strong>
            </div>
          </div>
          <div class="performance-foot">
            <span>资产 ${formatMoney(state.equity)}</span>
            <span>仓位 ${formatPercent(state.positionRatio)}</span>
            <span>费用 ${formatMoney(state.totalFees || 0)}</span>
            <span>交易 ${state.trades.length}</span>
          </div>
          <div class="performance-actions">
            <button class="result-chart-button" type="button" data-result-name="${escapeHtml(result.name)}">查看曲线</button>
            ${canEditPreset ? `<button class="result-param-button" type="button" data-preset-name="${escapeHtml(result.name)}">查看参数</button>` : ""}
            ${canEditPreset ? `<button class="result-optimize-button" type="button" data-preset-name="${escapeHtml(result.name)}">优化</button>` : ""}
          </div>
        </article>
      `;
    })
    .join("")}
    </div>
  `;
}

function updateModelComparisonTable(rows, currentConfig) {
  const results = buildModelComparisonResults(rows, currentConfig);
  renderModelComparisonTable(results);
  renderModelRanking();
  return results;
}

function buildPresetPerformance(presetName) {
  if (!hasBacktestRun || !activeBacktestRows || activeBacktestRows.length === 0) return null;
  const baseConfig = readBacktestConfig();
  const states = buildParallelBacktestStates(activeBacktestRows, createConfigFromPreset(presetName, baseConfig));
  const finalState = states[states.length - 1];
  return finalState ? { states, finalState } : null;
}

function getPresetPerformanceSummary(presetName) {
  const fromComparison = comparisonResults.find((result) => result.name === presetName);
  if (fromComparison) {
    return {
      states: fromComparison.states,
      finalState: fromComparison.finalState,
    };
  }
  return buildPresetPerformance(presetName);
}

function selectTrailingRowsByYears(rows, years) {
  if (!rows || rows.length < 2) return null;
  const endDate = new Date(`${rows[rows.length - 1].date}T00:00:00`);
  const startBoundary = shiftYears(endDate, -years);
  const startIndex = rows.findIndex((row) => new Date(`${row.date}T00:00:00`) >= startBoundary);
  if (startIndex < 0 || rows.length - startIndex < 2) return null;
  const selectedRows = rows.slice(startIndex);
  const actualStart = new Date(`${selectedRows[0].date}T00:00:00`);
  const monthsCovered = (endDate.getFullYear() - actualStart.getFullYear()) * 12
    + (endDate.getMonth() - actualStart.getMonth());
  if (monthsCovered < years * 12 - 2) return null;
  return selectedRows;
}

function getActiveRankingSymbolInfo() {
  const summarySymbol = lastSummary && lastSummary.symbol ? lastSummary.symbol : {};
  const symbol = normalizeSymbolInput(summarySymbol.code || codeInput.value) || String(summarySymbol.code || codeInput.value || "").toUpperCase();
  return {
    symbol,
    symbolName: String(lastSummary && lastSummary.name || summarySymbol.name || symbol || "未知标的"),
  };
}

function annualizeReturn(returnRate, years) {
  if (!Number.isFinite(returnRate) || years <= 0) return 0;
  if (returnRate <= -100) return -100;
  return (Math.pow(1 + returnRate / 100, 1 / years) - 1) * 100;
}

function buildPresetRankingResults(rows, currentConfig, presetNames) {
  return presetNames
    .map((presetName) => {
      const preset = strategyPresets[presetName];
      if (!preset) return null;
      const states = buildParallelBacktestStates(rows, createConfigFromPreset(presetName, currentConfig));
      const finalState = states[states.length - 1];
      if (!finalState || !finalState.buyHold) return null;
      return {
        name: presetName,
        label: preset.label,
        strategyType: preset.strategyType || "wave",
        finalState,
      };
    })
    .filter(Boolean);
}

function createRankingRecord(symbolInfo, periodYears, rowsForPeriod, result) {
  const state = result.finalState;
  return sanitizeRankingRecord({
    key: buildRankingRecordKey(
      symbolInfo.symbol,
      periodYears,
      result.name,
      rowsForPeriod[0].date,
      rowsForPeriod[rowsForPeriod.length - 1].date
    ),
    symbol: symbolInfo.symbol,
    symbolName: symbolInfo.symbolName,
    periodYears,
    startDate: rowsForPeriod[0].date,
    endDate: rowsForPeriod[rowsForPeriod.length - 1].date,
    presetName: result.name,
    presetLabel: result.label,
    strategyType: result.strategyType,
    returnRate: state.returnRate,
    annualizedReturn: annualizeReturn(state.returnRate, periodYears),
    buyHoldReturnRate: state.buyHold.returnRate,
    excessReturn: state.excessReturn,
    maxDrawdown: state.maxDrawdown,
    buyHoldMaxDrawdown: state.buyHold.maxDrawdown,
    drawdownDiff: state.drawdownDiff,
    totalFees: state.totalFees || 0,
    buyHoldFees: state.buyHold.totalFees || 0,
    trades: state.trades.length,
    updatedAt: todayText(),
  });
}

function recordRankingResultsForLoadedData(currentConfig) {
  const presetNames = getSelectedComparisonPresetNames();
  if (!lastRows || lastRows.length < 2 || presetNames.length === 0) return;
  const symbolInfo = getActiveRankingSymbolInfo();
  if (!symbolInfo.symbol) return;

  const nextRecords = [];
  rankingPeriods.forEach((periodYears) => {
    const rowsForPeriod = selectTrailingRowsByYears(lastRows, periodYears);
    if (!rowsForPeriod) return;
    buildPresetRankingResults(rowsForPeriod, currentConfig, presetNames).forEach((result) => {
      const record = createRankingRecord(symbolInfo, periodYears, rowsForPeriod, result);
      if (record) nextRecords.push(record);
    });
  });

  if (nextRecords.length === 0) return;
  mergeRankingRecords(nextRecords);
  saveServerRankingRecords(nextRecords);
  renderModelRanking();
}

function renderModelRanking() {
  if (!rankingPresetList) return;

  if (rankingRecords.length === 0) {
    rankingPresetList.innerHTML = '<div class="ranking-empty">暂无排行记录。进入历史模拟，选择模型并开始模拟后，会按 1 年、3 年、5 年分别记录成绩。</div>';
    return;
  }

  rankingPresetList.innerHTML = rankingPeriods
    .map((periodYears) => {
      const records = rankingRecords
        .filter((record) => record.periodYears === periodYears)
        .sort((a, b) => b.returnRate - a.returnRate);
      if (records.length === 0) {
        return `
          <section class="ranking-table-section">
            <h3>${periodYears} 年排行</h3>
            <div class="ranking-empty">暂无 ${periodYears} 年记录。</div>
          </section>
        `;
      }
      return `
        <section class="ranking-table-section">
          <h3>${periodYears} 年排行</h3>
          <div class="ranking-table-wrap">
            <table class="ranking-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>股票</th>
                  <th>区间</th>
                  <th>模型</th>
                  <th>类型</th>
                  <th>收益</th>
                  <th>年化</th>
                  <th>全仓收益</th>
                  <th>超额</th>
                  <th>最大回撤</th>
                  <th>全仓回撤</th>
                  <th>费用</th>
                  <th>交易</th>
                  <th>更新</th>
                </tr>
              </thead>
              <tbody>
                ${records.map((record, index) => `
                  <tr data-preset-name="${escapeHtml(record.presetName)}">
                    <td>#${index + 1}</td>
                    <td>${escapeHtml(record.symbol)} ${escapeHtml(record.symbolName)}</td>
                    <td>${escapeHtml(record.startDate)} 至 ${escapeHtml(record.endDate)}</td>
                    <td>${escapeHtml(record.presetLabel)}</td>
                    <td>${escapeHtml(getStrategyTypeLabel(record.strategyType))}</td>
                    <td class="${record.returnRate >= 0 ? "up" : "down"}">${formatPercent(record.returnRate)}</td>
                    <td class="${record.annualizedReturn >= 0 ? "up" : "down"}">${formatPercent(record.annualizedReturn)}</td>
                    <td>${formatPercent(record.buyHoldReturnRate)}</td>
                    <td class="${record.excessReturn >= 0 ? "up" : "down"}">${formatPercent(record.excessReturn)}</td>
                    <td>${formatPercent(record.maxDrawdown)}</td>
                    <td>${formatPercent(record.buyHoldMaxDrawdown)}</td>
                    <td>${formatMoney(record.totalFees || 0)}</td>
                    <td>${record.trades}</td>
                    <td>${escapeHtml(record.updatedAt)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");
}

function summarizePresetParameters(preset) {
  const type = preset.strategyType || "wave";
  if (type === "order-grid") {
    const rule = { ...defaultOrderGridRule, ...(preset.orderGridRule || {}) };
    return `近端${rule.lookbackDays}天，高点回撤${rule.entryDrop}%，每单${rule.orderCapitalPercent}%，追加${rule.addDrop}%，止盈${rule.takeProfit}%，最多${rule.maxLots}单`;
  }
  if (type === "local-high-ladder") {
    const rule = { ...defaultLocalLadderRule, ...(preset.localLadderRule || {}) };
    return `近端${rule.lookbackDays}天，首次回落${rule.entryDrop}%，阶梯${rule.ladderDrop}%，加仓${rule.buyAdd}%，反弹卖${rule.sellRise}%`;
  }
  if (type === "ma-rsi-band") {
    const rule = { ...defaultMaRsiBandRule, ...(preset.maRsiBandRule || {}) };
    return `快线${rule.fastMa}，慢线${rule.slowMa}，RSI买${rule.rsiBuy}，RSI卖${rule.rsiSell}，ATR${rule.atrDays}`;
  }
  if (type === "pe-volume") {
    const rule = { ...defaultPeVolumeRule, ...(preset.peVolumeRule || {}) };
    return `PE${rule.peLookbackDays}日分位：低${rule.lowPePercentile}%/高${rule.highPePercentile}%；量均${rule.volumeMaDays}日，放量${rule.volumeBuyMultiplier}倍，目标${rule.lowPeTarget}/${rule.neutralTarget}/${rule.highPeTarget}%`;
  }
  const buyText = cloneRules(preset.buyRules, defaultBuyRules)
    .filter((rule) => rule.enabled !== false)
    .map((rule) => `跌${rule.drop}%到${rule.target}%`)
    .join(" / ") || "无买入规则";
  const sellText = cloneRules(preset.sellRules, defaultSellRules)
    .filter((rule) => rule.enabled !== false)
    .map((rule) => `涨${rule.rise}%卖${rule.reduce}%`)
    .join(" / ") || "无卖出规则";
  return `波动阈值${preset.waveThreshold || 5}%；${buyText}；${sellText}`;
}

function isUserEditablePreset(name) {
  return String(name || "").startsWith("custom_") || String(name || "").startsWith("auto_");
}

function getSerializablePreset(preset) {
  return {
    label: preset.label,
    strategyType: preset.strategyType || "wave",
    waveThreshold: preset.waveThreshold || 5,
    localLadderRule: preset.localLadderRule || undefined,
    maRsiBandRule: preset.maRsiBandRule || undefined,
    orderGridRule: preset.orderGridRule || undefined,
    peVolumeRule: preset.peVolumeRule || undefined,
    buyRules: preset.buyRules || undefined,
    sellRules: preset.sellRules || undefined,
    noNewHighExitRule: preset.noNewHighExitRule || undefined,
    meta: preset.meta || undefined,
  };
}

function openPresetParamEditor(presetName) {
  const preset = strategyPresets[presetName];
  if (!preset || !presetParamDialog || !presetParamEditor) return;
  editingPresetName = presetName;
  if (presetParamTitle) presetParamTitle.textContent = "编辑预设模型";
  if (presetParamSubtitle) presetParamSubtitle.textContent = isUserEditablePreset(presetName)
    ? "这个账户预设会保存到服务器端。"
    : "这是内置预设，保存时会创建一个账户副本。";
  if (presetParamNameInput) presetParamNameInput.value = preset.label || presetName;
  renderPresetParamNarrative(presetName);
  presetParamEditor.value = JSON.stringify(getSerializablePreset(preset), null, 2);
  if (typeof presetParamDialog.showModal === "function") {
    presetParamDialog.showModal();
  } else {
    presetParamDialog.setAttribute("open", "open");
  }
}

async function saveEditedPresetParameters() {
  if (!editingPresetName || !presetParamEditor) return;
  if (!requireSignedInForSave()) return;
  let parsed;
  try {
    parsed = JSON.parse(presetParamEditor.value);
  } catch (error) {
    setStatus("参数 JSON 格式不正确，无法保存。", true);
    return;
  }

  const existing = strategyPresets[editingPresetName];
  const existingLabel = String(existing && existing.label || editingPresetName);
  const requestedLabel = String(
    presetParamNameInput && presetParamNameInput.value
      ? presetParamNameInput.value
      : parsed.label || existingLabel
  ).trim().slice(0, 80);
  parsed = {
    ...parsed,
    label: requestedLabel || existingLabel,
  };
  const now = todayText();
  const nextPreset = sanitizeStoredPreset(editingPresetName, {
    ...existing,
    ...parsed,
    meta: {
      ...(existing && existing.meta ? existing.meta : {}),
      ...(parsed.meta || {}),
      updatedAt: now,
    },
  });
  if (!nextPreset) {
    setStatus("参数内容无效，无法保存。", true);
    return;
  }

  let savedName = editingPresetName;
  if (isUserEditablePreset(editingPresetName)) {
    strategyPresets[editingPresetName] = nextPreset;
  } else {
    savedName = `custom_${Date.now()}`;
    const userRenamedPreset = nextPreset.label !== existingLabel;
    strategyPresets[savedName] = {
      ...nextPreset,
      label: userRenamedPreset ? nextPreset.label : `${nextPreset.label} 本地修改`,
      meta: {
        ...nextPreset.meta,
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  const saved = await saveCustomStrategyPresets();
  if (!saved) return;
  renderModelCompareOptions();
  renderModelRanking();
  fillStrategyPresetControls(savedName);
  markSelectedComparePreset(savedName);
  const checkbox = Array.from(document.querySelectorAll(".model-compare-enabled"))
    .find((input) => input.value === savedName);
  if (checkbox) checkbox.checked = true;
  if (presetParamDialog && presetParamDialog.open) presetParamDialog.close();
  editingPresetName = null;

  if (lastRows && lastRows.length > 0) {
    startBacktest();
  } else {
    setStatus(`已保存 ${strategyPresets[savedName].label}。`);
  }
}

function numberNear(text, patterns, fallback) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return fallback;
}

function inferStrategyTypeFromText(text) {
  if (/PE|pe|市盈率|估值|成交量|放量|缩量/.test(text)) return "pe-volume";
  if (/订单|单子|每笔|每单|网格/.test(text)) return "order-grid";
  if (/RSI|rsi|均线|MA|ma|ATR|atr/.test(text)) return "ma-rsi-band";
  if (/近端|最近\d*天.*高点|阶梯/.test(text)) return "local-high-ladder";
  return "wave";
}

function createPresetFromConfig(label, config, meta = {}) {
  return {
    label,
    strategyType: config.strategyType,
    waveThreshold: config.waveThreshold,
    buyRules: cloneRules(config.buyRules, defaultBuyRules).map((rule) => ({ ...rule, enabled: true })),
    sellRules: cloneRules(config.sellRules, defaultSellRules).map((rule) => ({ ...rule, enabled: true })),
    noNewHighExitRule: {
      enabled: Boolean(config.noNewHighExitRule && config.noNewHighExitRule.enabled),
      ...defaultNoNewHighExitRule,
      ...(config.noNewHighExitRule || {}),
    },
    localLadderRule: {
      ...defaultLocalLadderRule,
      ...(config.localLadderRule || {}),
    },
    maRsiBandRule: {
      ...defaultMaRsiBandRule,
      ...(config.maRsiBandRule || {}),
    },
    orderGridRule: {
      ...defaultOrderGridRule,
      ...(config.orderGridRule || {}),
    },
    peVolumeRule: {
      ...defaultPeVolumeRule,
      ...(config.peVolumeRule || {}),
    },
    meta,
  };
}

function createSafePresetDraft(description) {
  const text = String(description || "").trim();
  const strategyType = inferStrategyTypeFromText(text);
  const symbol = normalizeSymbolInput(codeInput.value) || "通用";
  const now = todayText();
  const creator = String(customModelCreatorInput && customModelCreatorInput.value || "user").trim().slice(0, 32) || "user";
  const label = String(customModelLabelInput && customModelLabelInput.value || "").trim()
    || `${symbol} ${getStrategyTypeLabel(strategyType)} 自定义策略`;
  const baseConfig = readBacktestConfig();
  const config = {
    ...baseConfig,
    strategyType,
    buyRules: defaultBuyRules.map((rule) => ({ ...rule, enabled: false })),
    sellRules: defaultSellRules.map((rule) => ({ ...rule, enabled: false })),
    noNewHighExitRule: {
      enabled: false,
      ...defaultNoNewHighExitRule,
    },
  };

  if (strategyType === "order-grid") {
    const lookbackDays = numberNear(text, [/最近\s*(\d+)\s*天/, /(\d+)\s*日高点/], defaultOrderGridRule.lookbackDays);
    const entryDrop = numberNear(text, [/回撤\s*(\d+(?:\.\d+)?)\s*%/, /回落\s*(\d+(?:\.\d+)?)\s*%/], defaultOrderGridRule.entryDrop);
    const orderCapitalPercent = numberNear(text, [/买入\s*(\d+(?:\.\d+)?)\s*%/, /每(?:笔|单).*?(\d+(?:\.\d+)?)\s*%/, /建仓\s*(\d+(?:\.\d+)?)\s*%/], defaultOrderGridRule.orderCapitalPercent);
    const addDrop = numberNear(text, [/每次下跌\s*(\d+(?:\.\d+)?)\s*%/, /每下跌\s*(\d+(?:\.\d+)?)\s*%/, /追加下跌\s*(\d+(?:\.\d+)?)\s*%/], defaultOrderGridRule.addDrop);
    const takeProfit = numberNear(text, [/上涨(?:超过)?\s*(\d+(?:\.\d+)?)\s*%/, /止盈\s*(\d+(?:\.\d+)?)\s*%/], defaultOrderGridRule.takeProfit);
    config.orderGridRule = {
      ...defaultOrderGridRule,
      lookbackDays: Math.min(60, Math.max(2, Math.round(lookbackDays))),
      entryDrop: Math.min(50, Math.max(0.1, entryDrop)),
      orderCapitalPercent: Math.min(100, Math.max(1, orderCapitalPercent)),
      addDrop: Math.min(50, Math.max(0.1, addDrop)),
      takeProfit: Math.min(50, Math.max(0.1, takeProfit)),
      maxLots: Math.min(20, Math.max(1, Math.ceil(100 / Math.max(1, orderCapitalPercent)))),
    };
  } else if (strategyType === "local-high-ladder") {
    const lookbackDays = numberNear(text, [/最近\s*(\d+)\s*天/, /(\d+)\s*日高点/], defaultLocalLadderRule.lookbackDays);
    const entryDrop = numberNear(text, [/回撤\s*(\d+(?:\.\d+)?)\s*%/, /回落\s*(\d+(?:\.\d+)?)\s*%/], defaultLocalLadderRule.entryDrop);
    const ladderDrop = numberNear(text, [/每次下跌\s*(\d+(?:\.\d+)?)\s*%/, /每下跌\s*(\d+(?:\.\d+)?)\s*%/], defaultLocalLadderRule.ladderDrop);
    const buyAdd = numberNear(text, [/加仓\s*(\d+(?:\.\d+)?)\s*%/, /买入\s*(\d+(?:\.\d+)?)\s*%/], defaultLocalLadderRule.buyAdd);
    const sellRise = numberNear(text, [/上涨(?:超过)?\s*(\d+(?:\.\d+)?)\s*%/, /反弹\s*(\d+(?:\.\d+)?)\s*%/], defaultLocalLadderRule.sellRise);
    config.localLadderRule = {
      ...defaultLocalLadderRule,
      lookbackDays: Math.min(60, Math.max(2, Math.round(lookbackDays))),
      entryDrop: Math.min(50, Math.max(0.1, entryDrop)),
      ladderDrop: Math.min(50, Math.max(0.1, ladderDrop)),
      buyAdd: Math.min(100, Math.max(1, buyAdd)),
      sellRise: Math.min(50, Math.max(0.1, sellRise)),
    };
  } else if (strategyType === "ma-rsi-band") {
    config.maRsiBandRule = {
      ...defaultMaRsiBandRule,
      rsiBuy: numberNear(text, [/RSI.*?买入.*?(\d+(?:\.\d+)?)/i, /低于\s*(\d+(?:\.\d+)?).*?买入/], defaultMaRsiBandRule.rsiBuy),
      rsiSell: numberNear(text, [/RSI.*?卖出.*?(\d+(?:\.\d+)?)/i, /高于\s*(\d+(?:\.\d+)?).*?卖出/], defaultMaRsiBandRule.rsiSell),
      fastMa: numberNear(text, [/快均线\s*(\d+)/, /MA\s*(\d+)/i], defaultMaRsiBandRule.fastMa),
      slowMa: numberNear(text, [/慢均线\s*(\d+)/], defaultMaRsiBandRule.slowMa),
    };
  } else if (strategyType === "pe-volume") {
    config.peVolumeRule = {
      ...defaultPeVolumeRule,
      peLookbackDays: numberNear(text, [/PE.*?(\d+)\s*(?:天|日)/i, /市盈率.*?(\d+)\s*(?:天|日)/], defaultPeVolumeRule.peLookbackDays),
      lowPePercentile: numberNear(text, [/低(?:PE|市盈率).*?(\d+(?:\.\d+)?)\s*%/i, /低估.*?(\d+(?:\.\d+)?)\s*%/], defaultPeVolumeRule.lowPePercentile),
      highPePercentile: numberNear(text, [/高(?:PE|市盈率).*?(\d+(?:\.\d+)?)\s*%/i, /高估.*?(\d+(?:\.\d+)?)\s*%/], defaultPeVolumeRule.highPePercentile),
      volumeMaDays: numberNear(text, [/成交量.*?(\d+)\s*(?:天|日)/, /量均.*?(\d+)\s*(?:天|日)/], defaultPeVolumeRule.volumeMaDays),
      volumeBuyMultiplier: numberNear(text, [/放量.*?(\d+(?:\.\d+)?)\s*倍/, /成交量.*?(\d+(?:\.\d+)?)\s*倍.*?买/], defaultPeVolumeRule.volumeBuyMultiplier),
      volumeSellMultiplier: numberNear(text, [/缩量.*?(\d+(?:\.\d+)?)\s*倍/, /成交量.*?(\d+(?:\.\d+)?)\s*倍.*?卖/], defaultPeVolumeRule.volumeSellMultiplier),
    };
  } else {
    const threshold = numberNear(text, [/波动\s*(\d+(?:\.\d+)?)\s*%/, /阈值\s*(\d+(?:\.\d+)?)\s*%/], defaultBuyRules[0].drop);
    const firstDrop = numberNear(text, [/回撤\s*(\d+(?:\.\d+)?)\s*%/, /下跌\s*(\d+(?:\.\d+)?)\s*%/], defaultBuyRules[0].drop);
    const target = numberNear(text, [/加仓到\s*(\d+(?:\.\d+)?)\s*%/, /建仓\s*(\d+(?:\.\d+)?)\s*%/], 30);
    const sellRise = numberNear(text, [/上涨(?:超过)?\s*(\d+(?:\.\d+)?)\s*%/], defaultSellRules[0].rise);
    const reduce = numberNear(text, [/减仓\s*(\d+(?:\.\d+)?)\s*%/, /卖出\s*(\d+(?:\.\d+)?)\s*%/], defaultSellRules[0].reduce);
    config.waveThreshold = Math.max(0.1, threshold);
    config.buyRules = [{ enabled: true, drop: firstDrop, target: Math.min(100, Math.max(0, target)) }];
    config.sellRules = [{ enabled: true, rise: sellRise, reduce: Math.min(100, Math.max(0, reduce)) }];
  }

  const meta = {
    targetSymbol: symbol,
    provedPeriod: activeBacktestRangeLabel || `${startInput.value || "?"}至${endInput.value || "?"}`,
    creator,
    createdAt: now,
    updatedAt: now,
  };
  const preset = createPresetFromConfig(label, config, meta);
  const code = `// Safe client-side strategy preset. No eval / Function is used.
const modelPreset = ${JSON.stringify(preset, null, 2)};`;
  return { preset, code };
}

async function saveGeneratedPreset(preset) {
  if (!requireSignedInForSave()) return null;
  const keyPrefix = preset.meta && preset.meta.creator === "auto" ? "auto" : "custom";
  const presetName = `${keyPrefix}_${Date.now()}`;
  strategyPresets[presetName] = sanitizeStoredPreset(presetName, preset);
  const saved = await saveCustomStrategyPresets();
  if (!saved) {
    delete strategyPresets[presetName];
    renderModelCompareOptions();
    renderModelRanking();
    return null;
  }
  renderModelCompareOptions();
  renderStrategyPresetOptions(strategyPresets[presetName].strategyType, presetName);
  applyStrategyPreset(presetName);
  renderModelRanking();
  return presetName;
}

function buildOptimizationCandidates(basePreset, strategyType) {
  const base = {
    ...readBacktestConfig(),
    strategyType,
  };
  const candidates = [];
  const push = (config) => candidates.push(config);

  if (strategyType === "order-grid") {
    [2, 3, 5].forEach((lookbackDays) => {
      [1.5, 2, 3].forEach((entryDrop) => {
        [1, 2, 3].forEach((addDrop) => {
          [1.5, 2, 3, 4].forEach((takeProfit) => {
            [10, 20, 25].forEach((orderCapitalPercent) => {
              push({
                ...base,
                orderGridRule: {
                  ...defaultOrderGridRule,
                  lookbackDays,
                  entryDrop,
                  addDrop,
                  takeProfit,
                  orderCapitalPercent,
                  maxLots: Math.ceil(100 / orderCapitalPercent),
                },
              });
            });
          });
        });
      });
    });
  } else if (strategyType === "local-high-ladder") {
    [3, 5, 8].forEach((lookbackDays) => {
      [1.5, 2, 3].forEach((entryDrop) => {
        [2, 3, 4].forEach((ladderDrop) => {
          [20, 30, 40].forEach((buyAdd) => {
            [2, 3, 4].forEach((sellRise) => {
              push({
                ...base,
                localLadderRule: {
                  ...defaultLocalLadderRule,
                  lookbackDays,
                  entryDrop,
                  ladderDrop,
                  buyAdd,
                  sellRise,
                  sellReduce: buyAdd,
                  maxTarget: 100,
                },
              });
            });
          });
        });
      });
    });
  } else if (strategyType === "ma-rsi-band") {
    [20, 40, 60].forEach((fastMa) => {
      [80, 120, 180].forEach((slowMa) => {
        [30, 35, 40].forEach((rsiBuy) => {
          [65, 70, 75].forEach((rsiSell) => {
            push({
              ...base,
              maRsiBandRule: {
                ...defaultMaRsiBandRule,
                fastMa,
                slowMa,
                rsiBuy,
                rsiSell,
              },
            });
          });
        });
      });
    });
  } else if (strategyType === "pe-volume") {
    [126, 252, 504].forEach((peLookbackDays) => {
      [[20, 70], [30, 80], [40, 85]].forEach(([lowPePercentile, highPePercentile]) => {
        [10, 20, 40].forEach((volumeMaDays) => {
          [1.1, 1.3, 1.6].forEach((volumeBuyMultiplier) => {
            [0.5, 0.7, 0.9].forEach((volumeSellMultiplier) => {
              push({
                ...base,
                peVolumeRule: {
                  ...defaultPeVolumeRule,
                  peLookbackDays,
                  lowPePercentile,
                  highPePercentile,
                  volumeMaDays,
                  volumeBuyMultiplier,
                  volumeSellMultiplier,
                },
              });
            });
          });
        });
      });
    });
  } else {
    [5, 10, 15, 20].forEach((waveThreshold) => {
      [20, 30, 40].forEach((firstTarget) => {
        [50, 60, 70].forEach((secondTarget) => {
          [15, 30, 50].forEach((sellRise) => {
            push({
              ...base,
              waveThreshold,
              buyRules: [
                { enabled: true, drop: 5, target: firstTarget },
                { enabled: true, drop: 10, target: secondTarget },
                { enabled: true, drop: 15, target: 100 },
              ],
              sellRules: [
                { enabled: true, rise: sellRise, reduce: 50 },
                { enabled: true, rise: sellRise * 2, reduce: 100 },
              ],
              noNewHighExitRule: {
                enabled: false,
                ...defaultNoNewHighExitRule,
              },
            });
          });
        });
      });
    });
  }

  if (basePreset) {
    candidates.unshift(createConfigFromPreset(basePreset, base));
  }
  return candidates;
}

function scoreBacktestState(state) {
  return state ? state.returnRate - state.maxDrawdown * 0.25 : -Infinity;
}

function buildOptimizationPreset(presetName, config, rowsForTest) {
  const sourcePreset = strategyPresets[presetName] || {};
  const now = todayText();
  return createPresetFromConfig(`${sourcePreset.label || getStrategyTypeLabel(config.strategyType)} 优化参数`, config, {
    targetSymbol: normalizeSymbolInput(codeInput.value) || "通用",
    provedPeriod: activeBacktestRangeLabel || `${rowsForTest[0].date}至${rowsForTest[rowsForTest.length - 1].date}`,
    creator: "auto",
    createdAt: now,
    updatedAt: now,
  });
}

function renderNarrativeList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function describeWaveConfig(config) {
  const buyRules = cloneRules(config.buyRules, defaultBuyRules).filter((rule) => rule.enabled !== false);
  const sellRules = cloneRules(config.sellRules, defaultSellRules).filter((rule) => rule.enabled !== false);
  const risk = config.noNewHighExitRule || defaultNoNewHighExitRule;
  return {
    title: "波浪回撤分批建仓模型",
    build: [
      `波浪确认阈值为 ${formatPercent(config.waveThreshold)}，小于这个幅度的高低点变化不作为新波浪。`,
      buyRules.length
        ? `从最近确认的阶段高点开始计算回撤，达到 ${buyRules.map((rule) => `${formatPercent(rule.drop)} 调仓到 ${formatPercent(rule.target)}`).join("，")}。`
        : "当前没有启用买入规则，因此模型不会主动建仓。",
      "每次买入不是买固定金额，而是把账户总仓位调整到该规则指定的目标仓位。"
    ],
    exit: [
      sellRules.length
        ? `卖出以最近一次模型买入价为参考，价格上涨到 ${sellRules.map((rule) => `${formatPercent(rule.rise)} 减仓 ${formatPercent(rule.reduce)}`).join("，")}。`
        : "当前没有启用卖出规则。",
      risk && risk.enabled
        ? `风控开启：连续 ${risk.stalledDays} 个交易日未突破最近 ${risk.lookbackDays} 日高点时，减仓 ${formatPercent(risk.reduce)}。`
        : "风控平仓关闭。"
    ],
  };
}

function describeLocalLadderConfig(config) {
  const rule = { ...defaultLocalLadderRule, ...(config.localLadderRule || {}) };
  return {
    title: "近端高点阶梯模型",
    build: [
      `每个交易日寻找最近 ${rule.lookbackDays} 天最高点作为近端高点。`,
      `当收盘价从该近端高点回落 ${formatPercent(rule.entryDrop)} 时开始建仓。`,
      `之后每继续下跌 ${formatPercent(rule.ladderDrop)}，目标仓位增加 ${formatPercent(rule.buyAdd)}，最高不超过 ${formatPercent(rule.maxTarget)}。`,
      "仓位按账户总资产比例调整，不是按当日现金比例调整。"
    ],
    exit: [
      `当价格相对最近一笔模型买入价反弹 ${formatPercent(rule.sellRise)} 时，减仓 ${formatPercent(rule.sellReduce)}。`,
      rule.stopLoss > 0
        ? `深跌保护：若相对锚定高点回落 ${formatPercent(rule.stopLoss)}，减仓 ${formatPercent(rule.stopReduce)}。`
        : "深跌保护关闭。",
      `仓位低于 ${formatPercent(rule.resetPositionBelow)} 后，模型允许重新寻找新的近端高点循环。`
    ],
  };
}

function describeOrderGridConfig(config) {
  const rule = { ...defaultOrderGridRule, ...(config.orderGridRule || {}) };
  return {
    title: "近端高点订单网格模型",
    build: [
      `空仓时寻找最近 ${rule.lookbackDays} 天最高点。`,
      `当价格从该高点回撤 ${formatPercent(rule.entryDrop)}，建立第一笔订单。`,
      `每笔订单投入原始资金的 ${formatPercent(rule.orderCapitalPercent)}，最多 ${getOrderGridMaxLots(rule)} 笔。`,
      `持仓后，若价格相对上一笔订单买入价再下跌 ${formatPercent(rule.addDrop)}，追加下一笔订单。`
    ],
    exit: [
      `每笔订单独立止盈：任意订单相对自己的买入价上涨 ${formatPercent(rule.takeProfit)}，只卖出该订单。`,
      "当所有订单卖出后，模型回到空仓状态，重新寻找近端高点和回撤建仓机会。"
    ],
  };
}

function describeMaRsiBandConfig(config) {
  const rule = { ...defaultMaRsiBandRule, ...(config.maRsiBandRule || {}) };
  return {
    title: "MA-RSI 波段目标仓位模型",
    build: [
      `快均线为 ${rule.fastMa} 日，慢均线为 ${rule.slowMa} 日。`,
      rule.useSlowTrend !== false
        ? `收盘价站上慢线加 ${formatPercent(rule.slowBuffer)} 缓冲时，基础目标仓位为 ${formatPercent(rule.bullTarget)}；跌破慢线时为 ${formatPercent(rule.bearTarget)}。`
        : `慢线趋势关闭，基础目标仓位为 ${formatPercent(rule.bearTarget)}。`,
      rule.useRsiBuy !== false
        ? `RSI ${rule.rsiDays} 日低于 ${rule.rsiBuy} 时，视为超跌，目标仓位不低于 ${formatPercent(rule.rsiTarget)}。`
        : "RSI 超跌买入条件关闭。"
    ],
    exit: [
      rule.useFastCut !== false
        ? `跌破快线 ${formatPercent(rule.fastCut)} 时，目标仓位不高于 ${formatPercent(rule.fastBearTarget)}。`
        : "快线跌破减仓条件关闭。",
      rule.useRsiSell !== false
        ? `RSI 高于 ${rule.rsiSell} 时，视为过热，目标仓位不高于 ${formatPercent(rule.hotTarget)}。`
        : "RSI 过热卖出条件关闭。",
      rule.useAtr !== false
        ? `ATR ${rule.atrDays} 日高于 ${formatPercent(rule.highAtr)} 时，视为高波动，目标仓位不高于 ${formatPercent(rule.volTarget)}。`
        : "ATR 高波动风控关闭。"
    ],
  };
}

function describePeVolumeConfig(config) {
  const rule = { ...defaultPeVolumeRule, ...(config.peVolumeRule || {}) };
  return {
    title: "PE-成交量估值模型",
    build: [
      `用最近 ${rule.peLookbackDays} 个交易日的 PE 计算估值分位。`,
      `低 PE 阈值为历史 ${formatPercent(rule.lowPePercentile)} 分位，高 PE 阈值为历史 ${formatPercent(rule.highPePercentile)} 分位。`,
      `成交量均线为 ${rule.volumeMaDays} 日；当成交量达到均量 ${rule.volumeBuyMultiplier.toFixed(2)} 倍且 PE 低于低分位时，目标仓位为 ${formatPercent(rule.lowPeTarget)}。`,
      `估值和量能中性时，目标仓位为 ${formatPercent(rule.neutralTarget)}。`
    ],
    exit: [
      `当 PE 高于高分位，或成交量低于均量 ${rule.volumeSellMultiplier.toFixed(2)} 倍时，目标仓位降到 ${formatPercent(rule.highPeTarget)}。`,
      "如果当前股票没有 PE 或成交量数据，此模型不会运行，系统会提示并停止测试。"
    ],
  };
}

function describeOptimizationConfig(config) {
  const strategyType = config.strategyType || "wave";
  if (strategyType === "local-high-ladder") return describeLocalLadderConfig(config);
  if (strategyType === "ma-rsi-band") return describeMaRsiBandConfig(config);
  if (strategyType === "order-grid") return describeOrderGridConfig(config);
  if (strategyType === "pe-volume") return describePeVolumeConfig(config);
  return describeWaveConfig(config);
}

function renderOptimizationNarrative(config) {
  if (!optimizationNarrative) return;
  const narrative = describeOptimizationConfig(config);
  optimizationNarrative.innerHTML = `
    <section>
      <h3>${escapeHtml(narrative.title)}</h3>
      <p>${escapeHtml(summarizePresetParameters(createPresetFromConfig("优化参数说明", config)))}</p>
    </section>
    <section>
      <h4>如何建仓</h4>
      ${renderNarrativeList(narrative.build)}
    </section>
    <section>
      <h4>如何卖出或降仓</h4>
      ${renderNarrativeList(narrative.exit)}
    </section>
  `;
}

function renderPresetParamNarrative(presetName) {
  if (!presetParamNarrative) return;
  const preset = strategyPresets[presetName];
  if (!preset) {
    presetParamNarrative.innerHTML = "";
    return;
  }
  const config = createConfigFromPreset(presetName, readBacktestConfig());
  const narrative = describeOptimizationConfig(config);
  presetParamNarrative.innerHTML = `
    <section>
      <h3>${escapeHtml(narrative.title)}</h3>
      <p>${escapeHtml(summarizePresetParameters(preset))}</p>
    </section>
    <section>
      <h4>如何使用这个模型建仓</h4>
      ${renderNarrativeList(narrative.build)}
    </section>
    <section>
      <h4>如何卖出或降仓</h4>
      ${renderNarrativeList(narrative.exit)}
    </section>
  `;
}

function renderSelectedModelDetail(result) {
  if (!selectedModelDetail) return;
  if (!result || !result.finalState) {
    selectedModelDetail.innerHTML = `
      <strong>选择排行榜中的模型查看详情</strong>
      <span>收益曲线、交易记录和这个模型的参数说明会显示在下方。</span>
    `;
    return;
  }

  const state = result.finalState;
  const preset = result.name !== "__current__" ? strategyPresets[result.name] : null;
  const narrative = describeOptimizationConfig(result.config);
  const presetSummary = preset
    ? summarizePresetParameters(preset)
    : summarizePresetParameters(createPresetFromConfig(result.label, result.config));

  selectedModelDetail.innerHTML = `
    <div class="selected-model-detail-head">
      <div>
        <span>当前查看模型</span>
        <strong>${escapeHtml(result.label)}</strong>
        <small>${escapeHtml(getStrategyTypeLabel(result.strategyType))} · ${escapeHtml(presetSummary)}</small>
      </div>
      <button class="selected-model-param-button" type="button" data-preset-name="${escapeHtml(result.name)}">查看参数</button>
    </div>
    <div class="selected-model-metrics">
      <article>
        <span>模型收益</span>
        <strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(state.returnRate)}</strong>
      </article>
      <article>
        <span>最大回撤</span>
        <strong>${formatPercent(state.maxDrawdown)}</strong>
      </article>
      <article>
        <span>全仓收益</span>
        <strong>${formatPercent(state.buyHold.returnRate)}</strong>
      </article>
      <article>
        <span>超额收益</span>
        <strong class="${state.excessReturn >= 0 ? "up" : "down"}">${formatPercent(state.excessReturn)}</strong>
      </article>
      <article>
        <span>交易费用</span>
        <strong>${formatMoney(state.totalFees || 0)}</strong>
      </article>
      <article>
        <span>交易次数</span>
        <strong>${state.trades.length}</strong>
      </article>
    </div>
    <div class="optimization-narrative">
      <section>
        <h3>${escapeHtml(narrative.title)}</h3>
        <p>${escapeHtml(presetSummary)}</p>
      </section>
      <section>
        <h4>如何使用这个模型建仓</h4>
        ${renderNarrativeList(narrative.build)}
      </section>
      <section>
        <h4>如何卖出或降仓</h4>
        ${renderNarrativeList(narrative.exit)}
      </section>
    </div>
  `;

  const paramButton = selectedModelDetail.querySelector(".selected-model-param-button");
  if (paramButton) {
    paramButton.disabled = !preset;
    paramButton.hidden = !preset;
  }
}

function renderOptimizationReport(sourcePresetName, baseResult, bestResult, testedCount) {
  if (!optimizationReport || !optimizationParamPreview) return;
  const sourcePreset = strategyPresets[sourcePresetName] || {};
  const improvement = bestResult.finalState.returnRate - baseResult.finalState.returnRate;
  const drawdownChange = bestResult.finalState.maxDrawdown - baseResult.finalState.maxDrawdown;
  const scoreChange = bestResult.score - baseResult.score;
  const verdict = scoreChange > 0
    ? "找到更优参数"
    : "未找到评分更高的参数，当前展示的是最佳候选";

  if (optimizationTitle) optimizationTitle.textContent = `${sourcePreset.label || "模型"} 参数优化报告`;
  if (optimizationSubtitle) optimizationSubtitle.textContent = `${verdict}；共测试 ${testedCount} 组参数。`;
  optimizationReport.innerHTML = `
    <article>
      <span>原参数收益 / 回撤</span>
      <strong>${formatPercent(baseResult.finalState.returnRate)} / ${formatPercent(baseResult.finalState.maxDrawdown)}</strong>
      <p>交易 ${baseResult.finalState.trades.length} 次；评分 ${baseResult.score.toFixed(2)}</p>
    </article>
    <article>
      <span>最佳参数收益 / 回撤</span>
      <strong>${formatPercent(bestResult.finalState.returnRate)} / ${formatPercent(bestResult.finalState.maxDrawdown)}</strong>
      <p>交易 ${bestResult.finalState.trades.length} 次；评分 ${bestResult.score.toFixed(2)}</p>
    </article>
    <article>
      <span>收益变化</span>
      <strong class="${improvement >= 0 ? "up" : "down"}">${formatPercent(improvement)}</strong>
      <p>相对原预设收益率变化。</p>
    </article>
    <article>
      <span>回撤变化</span>
      <strong class="${drawdownChange <= 0 ? "up" : "down"}">${formatPercent(drawdownChange)}</strong>
      <p>负数表示最大回撤降低。</p>
    </article>
  `;
  renderOptimizationNarrative(bestResult.config);
  optimizationParamPreview.textContent = JSON.stringify(getSerializablePreset(optimizationPresetDraft), null, 2);
  if (saveOptimizationButton) saveOptimizationButton.disabled = false;
  if (optimizationDialog && !optimizationDialog.open) {
    if (typeof optimizationDialog.showModal === "function") {
      optimizationDialog.showModal();
    } else {
      optimizationDialog.setAttribute("open", "open");
    }
  }
}

function openOptimizationDialog(message) {
  if (optimizationReport) optimizationReport.innerHTML = `<div class="ranking-empty">${escapeHtml(message)}</div>`;
  if (optimizationNarrative) optimizationNarrative.innerHTML = "";
  if (optimizationParamPreview) optimizationParamPreview.textContent = "优化进行中...";
  if (saveOptimizationButton) saveOptimizationButton.disabled = true;
  if (optimizationTitle) optimizationTitle.textContent = "参数优化中";
  if (optimizationSubtitle) optimizationSubtitle.textContent = message;
}

function optimizePresetParameters(presetName) {
  const preset = strategyPresets[presetName];
  if (!preset) return;
  if (!lastRows || lastRows.length === 0) {
    setStatus("请先加载历史行情，再优化模型参数。", true);
    return;
  }

  let rowsForTest = activeBacktestRows;
  const baseConfig = readBacktestConfig();
  if (!rowsForTest || rowsForTest.length === 0) {
    try {
      const selected = selectBacktestRows(lastRows, baseConfig);
      rowsForTest = selected.rows;
      activeBacktestRows = selected.rows;
      activeBacktestRangeLabel = selected.label;
    } catch (error) {
      setStatus(error.message || "优化区间选择失败。", true);
      return;
    }
  }

  const strategyType = preset.strategyType || "wave";
  const candidates = buildOptimizationCandidates(presetName, strategyType);
  if (candidates.length === 0) {
    setStatus("这个模型没有可尝试的参数组合。", true);
    return;
  }

  try {
    validateBacktestDataRequirements(rowsForTest, [{
      name: presetName,
      label: preset.label,
      config: createConfigFromPreset(presetName, baseConfig),
    }]);
  } catch (error) {
    setStatus(error.message || "当前数据不满足模型指标要求。", true);
    return;
  }

  activeOptimizationId += 1;
  const runId = activeOptimizationId;
  optimizationPresetDraft = null;
  let index = 0;
  let best = null;
  let baseResult = null;
  const chunkSize = 12;

  openOptimizationDialog(`正在优化 ${preset.label}，共 ${candidates.length} 组参数。`);
  setStatus(`正在尝试 ${preset.label} 的参数组合，不会打断当前模拟界面...`);

  const runChunk = () => {
    if (runId !== activeOptimizationId) return;
    const end = Math.min(candidates.length, index + chunkSize);
    for (; index < end; index += 1) {
      const config = candidates[index];
      const states = buildParallelBacktestStates(rowsForTest, config);
      const finalState = states[states.length - 1];
      if (!finalState) continue;
      const score = scoreBacktestState(finalState);
      const result = { config, states, finalState, score };
      if (index === 0) baseResult = result;
      if (!best || score > best.score) best = result;
    }

    if (optimizationSubtitle) {
      optimizationSubtitle.textContent = `正在优化 ${preset.label}：${index}/${candidates.length}`;
    }

    if (index < candidates.length) {
      window.setTimeout(runChunk, 0);
      return;
    }

    if (!best || !baseResult) {
      setStatus("没有找到可用的优化结果。", true);
      return;
    }

    optimizationPresetDraft = buildOptimizationPreset(presetName, best.config, rowsForTest);
    renderOptimizationReport(presetName, baseResult, best, candidates.length);
    setStatus(`优化完成：${preset.label}；最佳收益 ${formatPercent(best.finalState.returnRate)}，最大回撤 ${formatPercent(best.finalState.maxDrawdown)}。`);
  };

  window.setTimeout(runChunk, 0);
}

function optimizeSelectedModel() {
  const selectedPreset = strategyPresetSelect ? strategyPresetSelect.value : "";
  optimizePresetParameters(selectedPreset);
}

async function saveOptimizationPreset() {
  if (!optimizationPresetDraft) {
    setStatus("没有可保存的优化参数。", true);
    return;
  }
  const presetName = await saveGeneratedPreset(optimizationPresetDraft);
  if (!presetName) return;
  const checkbox = Array.from(document.querySelectorAll(".model-compare-enabled"))
    .find((input) => input.value === presetName);
  if (checkbox) checkbox.checked = true;
  if (optimizationDialog && optimizationDialog.open) optimizationDialog.close();
  optimizationPresetDraft = null;
  if (lastRows && lastRows.length > 0) {
    startBacktest();
  } else {
    setStatus(`已保存优化参数：${strategyPresets[presetName].label}。`);
  }
}

function renderTradeLog(trades, fallbackModelLabel = "当前模型") {
  const recentTrades = trades.slice(-80).reverse();
  lastRenderedTrades = recentTrades;
  backtestFields.tradeLog.innerHTML = recentTrades.length
    ? recentTrades
      .map((trade, index) => {
        const reference = trade.reference
          ? `${trade.reference.label} ${trade.reference.date} ${formatPrice(trade.reference.price)}`
          : "--";
        return `
          <tr class="${trade.side}" data-trade-index="${index}">
            <td>${escapeHtml(trade.date)}</td>
            <td>${escapeHtml(trade.modelLabel || fallbackModelLabel)}</td>
            <td>${escapeHtml(trade.label)}</td>
            <td>${formatPrice(trade.price)}</td>
            <td>${formatShares(trade.shares)}</td>
            <td>${formatPercent(trade.positionRatio)}</td>
            <td>${formatMoney(Number.isFinite(trade.accountCash) ? trade.accountCash : 0)}</td>
            <td>${formatMoney(Number.isFinite(trade.accountEquity) ? trade.accountEquity : 0)}</td>
            <td>${formatMoney(trade.fee || 0)}</td>
            <td>${escapeHtml(reference)}</td>
            <td>${escapeHtml(trade.reason)}</td>
          </tr>
        `;
      })
      .join("")
    : '<tr><td colspan="11">暂无交易</td></tr>';
}

function renderTradeDetail(trade) {
  if (!tradeDetailPanel) return;
  if (!trade) {
    tradeDetailPanel.innerHTML = `
      <strong>交易详情</strong>
      <span>点击交易记录后，会显示触发条件并把下方价格图放大到对应区间。</span>
    `;
    return;
  }
  const reference = trade.reference
    ? `${trade.reference.label}：${trade.reference.date}，价格 ${formatPrice(trade.reference.price)}`
    : "无参考点";
  tradeDetailPanel.innerHTML = `
    <strong>${escapeHtml(trade.modelLabel || "当前模型")} / ${escapeHtml(trade.label)} / ${escapeHtml(trade.date)}</strong>
    <dl>
      <div><dt>成交价</dt><dd>${formatPrice(trade.price)}</dd></div>
      <div><dt>数量</dt><dd>${formatShares(trade.shares)}</dd></div>
      <div><dt>仓位</dt><dd>${formatPercent(trade.positionRatio)}</dd></div>
      <div><dt>现金</dt><dd>${formatMoney(Number.isFinite(trade.accountCash) ? trade.accountCash : 0)}</dd></div>
      <div><dt>总资产</dt><dd>${formatMoney(Number.isFinite(trade.accountEquity) ? trade.accountEquity : 0)}</dd></div>
      <div><dt>费用</dt><dd>${formatMoney(trade.fee || 0)}</dd></div>
    </dl>
    <p>${escapeHtml(trade.reason || "--")}</p>
    <span>${escapeHtml(reference)}</span>
  `;
}

function findComparisonResultForTrade(trade) {
  if (!trade || !trade.modelLabel) return null;
  return comparisonResults.find((result) => result.label === trade.modelLabel) || null;
}

function focusTradeOnChart(trade) {
  if (!trade || !activeBacktestRows || activeBacktestRows.length === 0) return;
  const result = findComparisonResultForTrade(trade);
  tradePriceZoom = Math.max(tradePriceZoom, 8);
  const chartStates = result && result.states && result.states.length > 0
    ? result.states
    : getVisibleBacktestStates();
  selectedTradeForChart = trade;
  selectedTradeChartStates = chartStates;
  drawTradePriceChart(chartStates, { selectedTrade: trade });

  window.requestAnimationFrame(() => {
    const wrap = tradePriceChart ? tradePriceChart.parentElement : null;
    if (!wrap) return;
    const rows = result && result.states ? result.states.map((state) => state.row) : getVisibleBacktestStates().map((state) => state.row);
    const count = Math.max(1, rows.length - 1);
    const rowIndex = Math.max(0, Math.min(Number(trade.rowIndex) || 0, count));
    const ratio = rowIndex / count;
    wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) * ratio - wrap.clientWidth * 0.35);
  });
}

function renderModelResultCharts(result) {
  if (!result || !result.states || result.states.length === 0) return;
  selectedTradeForChart = null;
  selectedTradeChartStates = [];
  renderSelectedModelDetail(result);
  renderTradeLog(withTradeModelLabel(result.finalState.trades || [], result.label), result.label);
  renderTradeDetail(null);
  drawReturnComparison(result.states);
  drawTradePriceChart([]);
  setStatus(`已切换到 ${result.label}：下方只显示这个模型的交易记录。请选择一条交易查看对应价格、参考高低点和趋势。`);
}

function selectTradeLogRow(row) {
  if (!backtestFields.tradeLog) return;
  backtestFields.tradeLog.querySelectorAll("tr").forEach((item) => {
    item.classList.toggle("selected", item === row);
  });
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
      <text class="tick-label" x="${width / 2}" y="${height / 2}" text-anchor="middle">点击模型表现表后显示收益曲线</text>
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

function uniqueChartPoints(points) {
  const seen = new Set();
  return points.filter((point) => {
    if (!point || !point.date || !Number.isFinite(point.price)) return false;
    const key = `${point.date}:${Number(point.price).toFixed(6)}:${point.type || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getNearestPointBefore(points, rowIndex) {
  return (points || [])
    .filter((point) => Number.isInteger(point.rowIndex) && point.rowIndex <= rowIndex)
    .sort((a, b) => b.rowIndex - a.rowIndex)[0] || null;
}

function getExactReferencePoint(points, reference) {
  if (!reference) return null;
  return (points || []).find((point) => {
    return point.date === reference.date && Math.abs(Number(point.price) - Number(reference.price)) < 0.000001;
  }) || null;
}

function createReferenceChartPoint(reference, rows) {
  if (!reference || !reference.date || !Number.isFinite(reference.price)) return null;
  const rowIndex = rows.findIndex((row) => row.date === reference.date);
  return {
    type: reference.type || "reference",
    date: reference.date,
    price: reference.price,
    rowIndex,
    confirmDate: reference.confirmDate,
    confirmPrice: reference.confirmPrice,
    confirmRowIndex: reference.confirmDate ? rows.findIndex((row) => row.date === reference.confirmDate) : undefined,
    confirmLabel: reference.confirmLabel || "确认点",
    version: 0,
  };
}

function buildSelectedTradeContext(rows, finalState, trade) {
  const tradeIndex = Math.max(0, Math.min(Number(trade.rowIndex) || 0, rows.length - 1));
  const reference = trade.reference || null;
  const allHighs = finalState.waveHighs || [];
  const allLows = finalState.indicatorLows || [];
  const exactHigh = getExactReferencePoint(allHighs, reference);
  const exactLow = getExactReferencePoint(allLows, reference);
  const recentHigh = getNearestPointBefore(allHighs, tradeIndex);
  const recentLow = getNearestPointBefore(allLows, tradeIndex);
  const fallbackReference = createReferenceChartPoint(reference, rows);
  const referenceIsHigh = reference && (reference.type === "high" || reference.type === "rolling-high");
  const highs = uniqueChartPoints([
    exactHigh,
    referenceIsHigh ? fallbackReference : null,
    recentHigh,
  ]);
  const lows = uniqueChartPoints([
    exactLow,
    referenceIsHigh ? null : fallbackReference,
    recentLow,
  ]);
  const lookbackIndex = Math.max(0, tradeIndex - 20);
  const lookbackRow = rows[lookbackIndex];
  const tradeRow = rows[tradeIndex] || rows[rows.length - 1];
  const trendPercent = lookbackRow && lookbackRow.close > 0
    ? ((tradeRow.close - lookbackRow.close) / lookbackRow.close) * 100
    : 0;
  const referenceMove = reference && reference.price > 0
    ? ((trade.price - reference.price) / reference.price) * 100
    : null;
  const referenceText = reference
    ? `${reference.label} ${reference.date} ${formatPrice(reference.price)}`
    : "无参考点";
  const triggerText = Number.isFinite(trade.triggerPercent)
    ? `触发值 ${formatPercent(trade.triggerPercent)}`
    : "触发值 --";

  return {
    highs,
    lows,
    summaryLine: `${trade.label} ${trade.date} ${formatPrice(trade.price)}；${referenceText}；${triggerText}`,
    trendLine: `近20日趋势 ${formatPercent(trendPercent)}${referenceMove == null ? "" : `；相对参考点 ${formatPercent(referenceMove)}`}`,
  };
}

function drawTradePriceChart(states, options = {}) {
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
      <text class="tick-label" x="${width / 2}" y="${height / 2}" text-anchor="middle">点击模型或交易记录后显示价格曲线</text>
    `;
    return;
  }

  const rows = usableStates.map((state) => state.row);
  const finalState = usableStates[usableStates.length - 1];
  const selectedTrade = options.selectedTrade || null;
  const tradeContext = selectedTrade ? buildSelectedTradeContext(rows, finalState, selectedTrade) : null;
  const trades = selectedTrade ? [selectedTrade] : [];
  const waveHighs = tradeContext ? tradeContext.highs : [];
  const indicatorLows = tradeContext ? tradeContext.lows : [];
  const indicatorType = indicatorModelSelect ? indicatorModelSelect.value : "wave";
  const highPointLabel = indicatorType === "local-high-ladder"
    ? "近端高点"
    : indicatorType === "ma-rsi-band"
      ? "减仓信号"
      : indicatorType === "order-grid"
        ? "近端高点"
      : "波浪高点";
  const lowPointLabel = indicatorType === "local-high-ladder"
    ? "阶梯触发"
    : indicatorType === "ma-rsi-band"
      ? "加仓信号"
      : indicatorType === "order-grid"
        ? "订单买入"
      : "波浪低点";
  const dateToIndex = new Map(rows.map((row, index) => [row.date, index]));
  const priceValues = rows.flatMap((row) => [row.high, row.low, row.close]);

  trades.forEach((trade) => {
    priceValues.push(trade.price);
    if (trade.reference) priceValues.push(trade.reference.price);
  });
  waveHighs.forEach((point) => {
    priceValues.push(point.price);
  });
  indicatorLows.forEach((point) => {
    priceValues.push(point.price);
    if (point.confirmPrice) priceValues.push(point.confirmPrice);
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

  const indicatorLowNodes = indicatorLows
    .map((point, index) => {
      const pointIndex = dateToIndex.get(point.date);
      if (!Number.isInteger(pointIndex)) return "";

      const x = xForIndex(pointIndex);
      const y = scaleY(point.price);
      const hasConfirmPoint = Number.isInteger(point.confirmRowIndex);
      const confirmX = hasConfirmPoint ? xForIndex(point.confirmRowIndex) : x;
      const confirmY = hasConfirmPoint ? scaleY(point.confirmPrice) : y;
      const labelX = Math.min(Math.max(x + 8, pad.left + 4), width - pad.right - 150);
      const labelY = Math.min(Math.max(y + (index % 2 === 0 ? 18 : -36), pad.top + 4), height - pad.bottom - 34);

      return `
        ${hasConfirmPoint ? `<line class="trade-ref-line" x1="${confirmX}" y1="${confirmY}" x2="${x}" y2="${y}"></line>` : ""}
        <circle cx="${x}" cy="${y}" r="5" fill="#344054"></circle>
        <rect class="trade-label-bg" x="${labelX}" y="${labelY}" width="142" height="31" rx="4"></rect>
        <text class="trade-label" x="${labelX + 6}" y="${labelY + 12}">${lowPointLabel} ${formatPrice(point.price)}</text>
        <text class="trade-label" x="${labelX + 6}" y="${labelY + 25}">${point.date}</text>
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
    ${tradeContext ? `
      <rect class="trade-label-bg" x="${pad.left + 8}" y="${pad.top + 6}" width="${Math.min(520, width - pad.left - pad.right - 16)}" height="48" rx="4"></rect>
      <text class="trade-label" x="${pad.left + 18}" y="${pad.top + 24}">${escapeHtml(tradeContext.summaryLine)}</text>
      <text class="trade-label" x="${pad.left + 18}" y="${pad.top + 40}">${escapeHtml(tradeContext.trendLine)}</text>
    ` : ""}
    ${waveHighNodes}
    ${indicatorLowNodes}
    ${tradeNodes}
    ${dateTickIndexes
      .map((index) => {
        const x = xForIndex(index);
        return `<text class="tick-label" x="${x}" y="${height - 16}" text-anchor="middle">${rows[index].date.slice(5)}</text>`;
      })
      .join("")}
  `;
}

function renderBacktestState(state, index, total, options = {}) {
  const shouldDrawCharts = options.drawCharts !== false;
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
    if (shouldDrawCharts) {
      drawReturnComparison([]);
      drawTradePriceChart([]);
    }
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
  if (comparisonResults.length > 0) {
    renderTradeLog(collectComparisonTrades(comparisonResults), getCurrentConfigLabel(readBacktestConfig()));
  } else if (isCurrentConfigComparisonEnabled()) {
    const currentLabel = getCurrentConfigLabel(readBacktestConfig());
    renderTradeLog(withTradeModelLabel(state.trades, currentLabel), currentLabel);
  } else {
    renderTradeLog([]);
  }
  if (shouldDrawCharts) {
    drawReturnComparison(backtestStates.slice(0, index + 1));
    drawTradePriceChart(backtestStates.slice(0, index + 1));
  }
}

function getVisibleBacktestStates() {
  if (backtestStates.length === 0) return [];
  const currentIndex = Math.max(0, Math.min(backtestIndex - 1, backtestStates.length - 1));
  return backtestStates.slice(0, currentIndex + 1);
}

function redrawVisibleBacktestCharts() {
  const visibleStates = getVisibleBacktestStates();
  drawReturnComparison(visibleStates);
  if (selectedTradeForChart && selectedTradeChartStates.length > 0) {
    drawTradePriceChart(selectedTradeChartStates, { selectedTrade: selectedTradeForChart });
  } else {
    drawTradePriceChart([]);
  }
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
  startBacktestButton.textContent = "开始模拟";
}

function resetBacktest() {
  stopBacktestReplay();
  backtestStates = [];
  backtestIndex = 0;
  activeBacktestRows = null;
  activeBacktestRangeLabel = "";
  comparisonResults = [];
  hasBacktestRun = false;
  selectedTradeForChart = null;
  selectedTradeChartStates = [];
  renderBacktestState(null, 0, 0);
  renderModelComparisonTable([]);
  renderTradeDetail(null);
  renderSelectedModelDetail(null);
  renderModelRanking();
}

function selectBacktestRows(rows, config) {
  if (!rows || rows.length === 0) {
    return { rows: [], label: "" };
  }

  if (config.backtestWindowMode !== "random") {
    return {
      rows,
      label: `${rows[0].date} 至 ${rows[rows.length - 1].date}`,
    };
  }

  const years = config.backtestYears;
  const lastDate = new Date(`${rows[rows.length - 1].date}T00:00:00`);
  const latestAllowedStart = shiftYears(lastDate, -years);
  const candidateIndexes = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => new Date(`${row.date}T00:00:00`) <= latestAllowedStart)
    .map(({ index }) => index);

  if (candidateIndexes.length === 0) {
    throw new Error(`导入历史数据不足 ${years} 年，无法随机抽样测试。请先加载更长历史区间。`);
  }

  const startIndex = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
  const startDate = new Date(`${rows[startIndex].date}T00:00:00`);
  const targetEndDate = shiftYears(startDate, years);
  let endIndex = startIndex;

  while (endIndex + 1 < rows.length && new Date(`${rows[endIndex + 1].date}T00:00:00`) <= targetEndDate) {
    endIndex += 1;
  }

  const selectedRows = rows.slice(startIndex, endIndex + 1);
  if (selectedRows.length < 2) {
    throw new Error("随机抽样窗口内可用交易日太少，无法回测。");
  }

  return {
    rows: selectedRows,
    label: `${selectedRows[0].date} 至 ${selectedRows[selectedRows.length - 1].date}（随机 ${years} 年）`,
  };
}

function recomputeBacktestWithLatestConfig() {
  if (!lastRows || lastRows.length === 0 || !hasBacktestRun) return;

  const config = readBacktestConfig();
  stopBacktestReplay();
  const rowsForBacktest = activeBacktestRows || lastRows;
  try {
    validateBacktestDataRequirements(rowsForBacktest, buildRequirementEntries(config));
  } catch (error) {
    setStatus(error.message || "当前数据不满足模型指标要求。", true);
    return;
  }
  backtestStates = buildParallelBacktestStates(rowsForBacktest, config);
  backtestIndex = backtestStates.length;
  const finalState = backtestStates[backtestStates.length - 1];
  renderBacktestState(finalState, backtestStates.length - 1, backtestStates.length, { drawCharts: false });
  try {
    comparisonResults = updateModelComparisonTable(rowsForBacktest, config);
    recordRankingResultsForLoadedData(config);
  } catch (error) {
    setStatus(error.message || "当前数据不满足模型指标要求。", true);
    return;
  }
  renderTradeLog(collectComparisonTrades(comparisonResults), getCurrentConfigLabel(config));
  selectedTradeForChart = null;
  selectedTradeChartStates = [];
  drawReturnComparison([]);
  drawTradePriceChart([]);
  renderTradeDetail(null);
  renderSelectedModelDetail(comparisonResults[0] || null);
  const status = config.strategyType === "local-high-ladder"
    ? "已按近端高点阶梯指标同步重算表现和回测交易。"
    : config.strategyType === "ma-rsi-band"
      ? "已按 MA-RSI 波段参数同步重算表现和回测交易。"
      : config.strategyType === "order-grid"
        ? "已按近端高点订单网格参数同步重算表现和回测交易。"
        : config.strategyType === "pe-volume"
          ? "已按 PE-成交量参数同步重算表现和回测交易。"
      : `已按 ${formatPercent(config.waveThreshold)} 波动阈值同步重算表现和回测交易。`;
  setStatus(activeBacktestRangeLabel ? `${status} 回测区间：${activeBacktestRangeLabel}。` : status);
}

function startBacktest() {
  if (!lastRows || lastRows.length === 0) {
    setStatus("请先查询行情数据，再开始回测。", true);
    return;
  }

  if (getSelectedComparisonPresetNames().length === 0) {
    renderModelComparisonTable([]);
    renderTradeLog([]);
    renderSelectedModelDetail(null);
    setSimulationStep("models");
    setStatus("请至少选择一个预存模型进行历史模拟。");
    return;
  }

  const config = readBacktestConfig();
  let selected;

  if (config.initialCash <= 0) {
    setStatus("初始现金必须大于 0。", true);
    return;
  }

  try {
    selected = selectBacktestRows(lastRows, config);
  } catch (error) {
    setStatus(error.message || "回测区间选择失败。", true);
    return;
  }

  stopBacktestReplay();
  activeBacktestRows = selected.rows;
  activeBacktestRangeLabel = selected.label;
  try {
    validateBacktestDataRequirements(activeBacktestRows, buildRequirementEntries(config));
  } catch (error) {
    setStatus(error.message || "当前数据不满足模型指标要求。", true);
    return;
  }
  backtestStates = buildParallelBacktestStates(activeBacktestRows, config);
  comparisonResults = updateModelComparisonTable(activeBacktestRows, config);
  recordRankingResultsForLoadedData(config);
  renderTradeLog(collectComparisonTrades(comparisonResults), getCurrentConfigLabel(config));
  selectedTradeForChart = null;
  selectedTradeChartStates = [];
  backtestIndex = backtestStates.length;
  hasBacktestRun = true;
  const finalState = backtestStates[backtestStates.length - 1];
  renderBacktestState(finalState, backtestStates.length - 1, backtestStates.length, { drawCharts: false });
  drawReturnComparison([]);
  drawTradePriceChart([]);
  renderTradeDetail(null);
  const leadingResult = comparisonResults[0];
  if (leadingResult) {
    renderModelResultCharts(leadingResult);
  } else {
    renderSelectedModelDetail(null);
  }
  startBacktestButton.disabled = false;
  startBacktestButton.textContent = "开始模拟";
  const leadingText = leadingResult
    ? `当前排名第一：${leadingResult.label}，收益 ${formatPercent(leadingResult.finalState.returnRate)}，最大回撤 ${formatPercent(leadingResult.finalState.maxDrawdown)}。`
    : "";
  setStatus(`模拟完成：${activeBacktestRangeLabel}；已生成表现表和交易记录。${leadingText} 点击某个模型查看收益曲线，点击交易记录查看对应价格高低点。`);
  saveBacktestRunToServer(config).then((saved) => {
    if (saved && saved.runId) {
      setStatus(`模拟完成：${activeBacktestRangeLabel}；历史测试记录已保存到 Postgres。${leadingText} 点击某个模型查看收益曲线，点击交易记录查看对应价格高低点。`);
    }
  });
  setSimulationStep("results");
  window.setTimeout(scrollToModelPerformance, 80);
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
  const isMaRsiBand = indicatorType === "ma-rsi-band";
  const isOrderGrid = indicatorType === "order-grid";
  const isPeVolume = indicatorType === "pe-volume";
  const waveThreshold = getWaveThreshold();
  const localLadderRule = readLocalLadderRule();
  const maRsiBandRule = readMaRsiBandRule();
  const orderGridRule = readOrderGridRule();
  const peVolumeRule = readPeVolumeRule();
  const indicatorPoints = isLocalLadder
    ? calculateLocalLadderPoints(rows, localLadderRule)
    : isMaRsiBand
      ? calculateMaRsiBandPoints(rows, maRsiBandRule)
      : isOrderGrid
        ? calculateOrderGridPoints(rows, orderGridRule)
        : isPeVolume
          ? calculatePeVolumePoints(rows, peVolumeRule)
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
      : isMaRsiBand
        ? (isHigh ? "减仓" : "加仓")
        : isOrderGrid
          ? (isHigh ? "近端高" : "订单买")
          : isPeVolume
            ? (isHigh ? "降仓" : "加仓")
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
    : isMaRsiBand
      ? `MA-RSI：快 ${maRsiBandRule.fastMa} / 慢 ${maRsiBandRule.slowMa} / RSI ${maRsiBandRule.rsiDays}；加仓信号 ${indicatorPoints.lows.length}，减仓信号 ${indicatorPoints.highs.length}`
      : isOrderGrid
        ? `订单网格：${orderGridRule.lookbackDays}日高点回撤 ${formatPercent(orderGridRule.entryDrop)} 首单；每单 ${formatPercent(orderGridRule.orderCapitalPercent)} / 加仓跌幅 ${formatPercent(orderGridRule.addDrop)} / 单笔止盈 ${formatPercent(orderGridRule.takeProfit)}`
        : isPeVolume
          ? `PE-成交量：PE${peVolumeRule.peLookbackDays}日分位低${formatPercent(peVolumeRule.lowPePercentile)}高${formatPercent(peVolumeRule.highPePercentile)}；量均${peVolumeRule.volumeMaDays}日，信号 ${indicatorPoints.lows.length}/${indicatorPoints.highs.length}`
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
          <td>${formatLargeNumber(row.volume)}</td>
          <td>${formatLargeNumber(row.amount)}</td>
          <td>${formatOptionalNumber(row.turnover, 2)}%</td>
          <td>${formatOptionalNumber(row.peTtm || row.pe, 2)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderCompanyInfo(result) {
  const info = result.info || {};
  const marketText = info.marketName || info.market || result.market || "--";
  const nameText = info.name || result.name || result.code || "--";

  companyFields.name.textContent = nameText;
  companyFields.code.textContent = info.symbol || result.code || "--";
  companyFields.market.textContent = marketText;
  companyFields.exchange.textContent = info.exchangeName || marketText;
  companyFields.currency.textContent = info.currency || "--";
  companyFields.source.textContent = result.source || "--";
}

function renderResult(result) {
  const { rows, summary, name, code } = result;
  const displayName = name ? `${code} ${name}` : code;
  lastRows = rows;
  lastSummary = summary;
  revealHistoryPanels();

  fields.highestPrice.textContent = formatPrice(summary.highest.price);
  fields.highestDate.textContent = `${summary.highest.date} 收盘 ${formatPrice(summary.highest.close)}`;
  fields.lowestPrice.textContent = formatPrice(summary.lowest.price);
  fields.lowestDate.textContent = `${summary.lowest.date} 收盘 ${formatPrice(summary.lowest.close)}`;
  fields.latestClose.textContent = formatPrice(summary.latest.close);
  fields.latestDate.textContent = `${summary.latest.date} ${summary.latest.changePercent.toFixed(2)}%`;
  fields.tradeCount.textContent = String(summary.count);
  fields.dataRange.textContent = `${summary.startDate} 至 ${summary.endDate}`;
  if (fields.latestPe) fields.latestPe.textContent = formatOptionalNumber(summary.latest.peTtm || summary.latest.pe, 2);
  if (fields.peAvailability) {
    const peInfo = summary.indicators && summary.indicators.pe;
    fields.peAvailability.textContent = peInfo && peInfo.available ? `${peInfo.count} 日有 PE` : "PE 不可用";
  }
  if (fields.latestVolume) fields.latestVolume.textContent = formatLargeNumber(summary.latest.volume);
  if (fields.volumeAvailability) {
    const volumeInfo = summary.indicators && summary.indicators.volume;
    fields.volumeAvailability.textContent = volumeInfo && volumeInfo.available ? `${volumeInfo.count} 日有成交量` : "成交量不可用";
  }
  fields.chartTitle.textContent = displayName;
  fields.chartSubtitle.textContent = `${startInput.value} 至 ${endInput.value}`;
  renderCompanyInfo(result);
  rememberLoadedSymbol(code);

  drawChart(rows, summary);
  renderTable(rows);
  resetBacktest();
  if (getSelectedComparisonPresetNames().length > 0) {
    setStatus(`已更新 ${displayName}，数据源：${result.source}。正在自动模拟已选择模型...`);
    startBacktest();
  } else {
    setSimulationStep("results");
    setStatus(`已更新 ${displayName}，数据源：${result.source}。请选择一个或多个预存模型进行历史模拟。`);
    window.setTimeout(scrollToModelPerformance, 80);
  }
}

async function loadData() {
  const symbol = normalizeSymbolInput(codeInput.value);
  codeInput.value = symbol;
  updateSymbolPresetFromInput();

  const params = new URLSearchParams({
    code: symbol,
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
  if (rangePresetSelect) {
    rangePresetSelect.value = "4w";
  }
  applyRangePreset();
}

function updateBacktestWindowUi() {
  if (!backtestWindowModeSelect || !backtestYearsSelect) return;
  backtestYearsSelect.disabled = backtestWindowModeSelect.value !== "random";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadData();
});

symbolPresetSelect.addEventListener("change", () => {
  codeInput.value = symbolPresetSelect.value;
});

codeInput.addEventListener("input", () => {
  codeInput.value = normalizeSymbolInput(codeInput.value);
  updateSymbolPresetFromInput();
});

rangePresetSelect.addEventListener("change", () => {
  applyRangePreset();
});

[startInput, endInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (rangePresetSelect) {
      rangePresetSelect.value = "custom";
    }
  });
});

backtestWindowModeSelect.addEventListener("change", () => {
  updateBacktestWindowUi();
});

compareCurrentConfigInput.addEventListener("change", () => {
  if (compareCurrentConfigInput) compareCurrentConfigInput.checked = false;
});

modelCompareOptions.addEventListener("change", () => {
  if (lastRows && lastRows.length > 0) {
    startBacktest();
  } else if (getSelectedComparisonPresetNames().length > 0) {
    setSimulationStep("data");
    scrollToSimulationStep("data");
  } else {
    setSimulationStep("models");
  }
});

modelCompareOptions.addEventListener("click", (event) => {
  const target = event.target && event.target.closest ? event.target : event.target.parentElement;
  if (target && target.matches && target.matches(".model-compare-enabled")) return;
  const paramButton = target ? target.closest(".preset-param-button") : null;
  if (paramButton) {
    openPresetParamEditor(paramButton.dataset.presetName);
    return;
  }
  const optimizeButton = target ? target.closest(".preset-optimize-button") : null;
  if (optimizeButton) {
    optimizePresetParameters(optimizeButton.dataset.presetName);
    return;
  }
  const option = target ? target.closest("[data-preset-name]") : null;
  if (!option) return;
  applyStrategyPreset(option.dataset.presetName);
});

wizardButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.wizardTarget === "new-model") {
      resetGeneratedModelDraft();
    }
    setWizardPage(button.dataset.wizardTarget);
  });
});

returnNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".wizard-hero").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

simulationProgressButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const stepName = button.dataset.simulationStep || activeSimulationStep;
    setSimulationStep(stepName);
    scrollToSimulationStep(stepName);
  });
});

if (openAuthButton) {
  openAuthButton.addEventListener("click", () => {
    openAuthDialog(currentUser ? "login" : "register");
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    logout();
  });
}

if (resendVerificationButton) {
  resendVerificationButton.addEventListener("click", () => {
    resendVerificationEmail();
  });
}

if (closeAuthButton && authDialog) {
  closeAuthButton.addEventListener("click", () => {
    authDialog.close();
  });
}

if (authLoginTab) {
  authLoginTab.addEventListener("click", () => {
    setAuthMode("login");
  });
}

if (authRegisterTab) {
  authRegisterTab.addEventListener("click", () => {
    setAuthMode("register");
  });
}

if (authForm) {
  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAuthForm();
  });
}

if (rankingPresetList) {
  rankingPresetList.addEventListener("click", (event) => {
    const card = event.target && event.target.closest ? event.target.closest("[data-preset-name]") : null;
    if (!card) return;
    applyStrategyPreset(card.dataset.presetName);
  });
}

if (modelCompareTable) {
  modelCompareTable.addEventListener("click", (event) => {
    const target = event.target;
    const paramButton = target && target.closest ? target.closest(".result-param-button") : null;
    if (paramButton) {
      openPresetParamEditor(paramButton.dataset.presetName);
      return;
    }
    const optimizeButton = target && target.closest ? target.closest(".result-optimize-button") : null;
    if (optimizeButton) {
      optimizePresetParameters(optimizeButton.dataset.presetName);
      return;
    }

    const card = target && target.closest ? target.closest("[data-result-name]") : null;
    if (!card) return;
    const result = comparisonResults.find((item) => item.name === card.dataset.resultName);
    if (!result) return;
    modelCompareTable.querySelectorAll("[data-result-name]").forEach((item) => {
      item.classList.toggle("selected", item === card);
    });
    if (result.name !== "__current__") {
      applyStrategyPreset(result.name);
    }
    renderModelResultCharts(result);
  });
}

if (showModelPerformanceButton) {
  showModelPerformanceButton.addEventListener("click", () => {
    setSimulationStep("results");
    scrollToModelPerformance();
  });
}

if (selectedModelDetail) {
  selectedModelDetail.addEventListener("click", (event) => {
    const paramButton = event.target && event.target.closest ? event.target.closest(".selected-model-param-button") : null;
    if (!paramButton || !paramButton.dataset.presetName || paramButton.dataset.presetName === "__current__") return;
    openPresetParamEditor(paramButton.dataset.presetName);
  });
}

if (backtestFields.tradeLog) {
  backtestFields.tradeLog.addEventListener("click", (event) => {
    const row = event.target && event.target.closest ? event.target.closest("[data-trade-index]") : null;
    if (!row) return;
    const trade = lastRenderedTrades[Number(row.dataset.tradeIndex)];
    if (!trade) return;
    selectTradeLogRow(row);
    renderTradeDetail(trade);
    focusTradeOnChart(trade);
  });
}

if (customModelForm) {
  customModelForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

if (closePresetParamButton && presetParamDialog) {
  closePresetParamButton.addEventListener("click", () => {
    editingPresetName = null;
    presetParamDialog.close();
  });
}

if (savePresetParamButton) {
  savePresetParamButton.addEventListener("click", () => {
    saveEditedPresetParameters();
  });
}

if (closeOptimizationButton && optimizationDialog) {
  closeOptimizationButton.addEventListener("click", () => {
    activeOptimizationId += 1;
    optimizationPresetDraft = null;
    optimizationDialog.close();
  });
}

if (saveOptimizationButton) {
  saveOptimizationButton.addEventListener("click", () => {
    saveOptimizationPreset();
  });
}

if (generateModelCodeButton) {
  generateModelCodeButton.addEventListener("click", () => {
    if (!customModelPrompt || !customModelPrompt.value.trim()) {
      if (generatedModelCode) generatedModelCode.textContent = "请先输入模型描述。";
      return;
    }
    generatedPresetDraft = createSafePresetDraft(customModelPrompt.value);
    if (generatedModelCode) generatedModelCode.textContent = generatedPresetDraft.code;
    if (saveGeneratedModelButton) saveGeneratedModelButton.disabled = false;
  });
}

if (saveGeneratedModelButton) {
  saveGeneratedModelButton.addEventListener("click", async () => {
    if (!generatedPresetDraft) return;
    const presetName = await saveGeneratedPreset(generatedPresetDraft.preset);
    if (!presetName) return;
    generatedPresetDraft = null;
    setWizardPage("ranking");
    setStatus(`已保存新模型预设：${strategyPresets[presetName].label}。`);
  });
}

if (optimizeSelectedModelButton) {
  optimizeSelectedModelButton.addEventListener("click", () => {
    optimizeSelectedModel();
  });
}

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
    const message = strategyType === "local-high-ladder"
      ? "已切换到近端高点阶梯指标。"
      : strategyType === "ma-rsi-band"
        ? "已切换到 MA-RSI 波段模型。"
        : strategyType === "order-grid"
          ? "已切换到近端高点订单网格模型。"
          : strategyType === "pe-volume"
            ? "已切换到 PE-成交量指标模型。"
        : "已切换到波浪模型。";
    refreshIndicatorView(message);
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

[
  maUseSlowTrendInput,
  maFastMaInput,
  maSlowMaInput,
  maSlowBufferInput,
  maBearTargetInput,
  maBullTargetInput,
  maUseFastBullInput,
  maFastBullTargetInput,
  maUseFastCutInput,
  maFastBearTargetInput,
  maFastCutInput,
  maRsiDaysInput,
  maUseRsiBuyInput,
  maRsiBuyInput,
  maRsiTargetInput,
  maUseRsiSellInput,
  maRsiSellInput,
  maHotTargetInput,
  maAtrDaysInput,
  maUseAtrInput,
  maHighAtrInput,
  maVolTargetInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (indicatorModelSelect.value === "ma-rsi-band") {
      refreshIndicatorView("已按 MA-RSI 波段参数刷新历史图表。");
    }
  });
});

[
  orderLookbackInput,
  orderEntryDropInput,
  orderCapitalInput,
  orderAddDropInput,
  orderTakeProfitInput,
  orderMaxLotsInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (indicatorModelSelect.value === "order-grid") {
      refreshIndicatorView("已按近端高点订单网格参数刷新历史图表。");
    }
  });
});

[
  peLookbackInput,
  peLowPercentileInput,
  peHighPercentileInput,
  volumeMaDaysInput,
  volumeBuyMultiplierInput,
  volumeSellMultiplierInput,
  peLowTargetInput,
  peNeutralTargetInput,
  peHighTargetInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (indicatorModelSelect.value === "pe-volume") {
      refreshIndicatorView("已按 PE-成交量参数刷新历史图表。");
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

async function initializeApp() {
  recentSymbolPresets = loadRecentSymbols();
  renderSymbolPresetOptions(codeInput.value);
  renderModelCompareOptions();
  renderModelRanking();
  setSimulationStep("models");
  hideHistoryPanels();
  applyStrategyPreset("optimized", false);
  initializeDates();
  updateBacktestWindowUi();
  renderAuthState();
  await fetchAuthSession();
  await initializeServerCustomPresets();
  initializeServerRankingRecords();
  setStatus("请选择功能、模型和股票区间；页面不会自动加载历史数据。");
}

initializeApp();
