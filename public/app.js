const form = document.querySelector("#queryForm");
const codeInput = document.querySelector("#codeInput");
const symbolPresetSelect = document.querySelector("#symbolPresetSelect");
const rangePresetSelect = document.querySelector("#rangePresetSelect");
const startInput = document.querySelector("#startInput");
const endInput = document.querySelector("#endInput");
const statusBand = document.querySelector(".status-band");
const statusText = document.querySelector("#statusText");
const loadingOverlay = document.querySelector("#loadingOverlay");
const loadingOverlayText = document.querySelector("#loadingOverlayText");
const LOAD_DATA_TIMEOUT_MS = 30000;
const wizardButtons = Array.from(document.querySelectorAll("[data-wizard-target]"));
const wizardPages = Array.from(document.querySelectorAll("[data-wizard-page]"));
const simulationProgressButtons = Array.from(document.querySelectorAll("[data-simulation-step]"));
const historyPanels = Array.from(document.querySelectorAll("[data-history-panel]"));
const returnNavButtons = Array.from(document.querySelectorAll(".return-nav-button"));
const newModelDialog = document.querySelector("#newModelDialog");
const closeNewModelButton = document.querySelector("#closeNewModelButton");
const watchAlertsDialog = document.querySelector("#watchAlertsDialog");
const closeWatchAlertsButton = document.querySelector("#closeWatchAlertsButton");
const watchAlertsAuthNote = document.querySelector("#watchAlertsAuthNote");
const watchAlertsPresetSelect = document.querySelector("#watchAlertsPresetSelect");
const watchAlertsModeSelect = document.querySelector("#watchAlertsModeSelect");
const watchAlertsMarketLabel = document.querySelector("#watchAlertsMarketLabel");
const watchAlertsMarketSelect = document.querySelector("#watchAlertsMarketSelect");
const watchAlertsSymbolLabel = document.querySelector("#watchAlertsSymbolLabel");
const watchAlertsSymbolInput = document.querySelector("#watchAlertsSymbolInput");
const watchAlertsIndexLabel = document.querySelector("#watchAlertsIndexLabel");
const watchAlertsIndexSelect = document.querySelector("#watchAlertsIndexSelect");
const watchAlertsFrequencySelect = document.querySelector("#watchAlertsFrequencySelect");
const watchAlertsCreateButton = document.querySelector("#watchAlertsCreateButton");
const watchAlertsCreateStatus = document.querySelector("#watchAlertsCreateStatus");
const watchAlertsList = document.querySelector("#watchAlertsList");
const watchAlertsFollowTokenInput = document.querySelector("#watchAlertsFollowTokenInput");
const watchAlertsFollowButton = document.querySelector("#watchAlertsFollowButton");
const watchAlertsFollowStatus = document.querySelector("#watchAlertsFollowStatus");
const watchAlertsOwnedTabButton = document.querySelector("#watchAlertsOwnedTabButton");
const watchAlertsFollowedTabButton = document.querySelector("#watchAlertsFollowedTabButton");
const authDialog = document.querySelector("#authDialog");
const authForm = document.querySelector("#authForm");
const authStatusText = document.querySelector("#authStatusText");
const openAuthButton = document.querySelector("#openAuthButton");
const openAdminButton = document.querySelector("#openAdminButton");
const logoutButton = document.querySelector("#logoutButton");
const resendVerificationButton = document.querySelector("#resendVerificationButton");
const closeAuthButton = document.querySelector("#closeAuthButton");
const languageSelect = document.querySelector("#languageSelect");
const authLoginTab = document.querySelector("#authLoginTab");
const authRegisterTab = document.querySelector("#authRegisterTab");
const authEmailInput = document.querySelector("#authEmailInput");
const authPasswordInput = document.querySelector("#authPasswordInput");
const authMessage = document.querySelector("#authMessage");
const submitAuthButton = document.querySelector("#submitAuthButton");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const newModelAuthNote = document.querySelector("#newModelAuthNote");
const chart = document.querySelector("#priceChart");
const returnCompareChart = document.querySelector("#returnCompareChart");
const tradePriceChart = document.querySelector("#tradePriceChart");
const modelOrderPriceChart = document.querySelector("#modelOrderPriceChart");
const tableBody = document.querySelector("#dataTable");
const startBacktestButton = document.querySelector("#startBacktestButton");
const priceZoomOutButton = document.querySelector("#priceZoomOutButton");
const priceZoomResetButton = document.querySelector("#priceZoomResetButton");
const priceZoomInButton = document.querySelector("#priceZoomInButton");
const tradeZoomOutButton = document.querySelector("#tradeZoomOutButton");
const tradeZoomResetButton = document.querySelector("#tradeZoomResetButton");
const tradeZoomInButton = document.querySelector("#tradeZoomInButton");
const modelTradesZoomOutButton = document.querySelector("#modelTradesZoomOutButton");
const modelTradesZoomResetButton = document.querySelector("#modelTradesZoomResetButton");
const modelTradesZoomInButton = document.querySelector("#modelTradesZoomInButton");
const buyRulesContainer = document.querySelector("#buyRules");
const sellRulesContainer = document.querySelector("#sellRules");
const initialCashInput = document.querySelector("#initialCashInput");
const indicatorModelSelect = document.querySelector("#indicatorModelSelect");
const waveThresholdInput = document.querySelector("#waveThresholdInput");
const waveConditionRow = document.querySelector("#waveConditionRow");
const waveConditionSelect = document.querySelector("#waveConditionSelect");
const playSpeedInput = document.querySelector("#playSpeedInput");
const tradeFeeInput = document.querySelector("#tradeFeeInput");
const backtestWindowModeSelect = document.querySelector("#backtestWindowModeSelect");
const backtestYearsSelect = document.querySelector("#backtestYearsSelect");
const strategyPresetSelect = document.querySelector("#strategyPresetSelect");
const applyPresetButton = document.querySelector("#applyPresetButton");
const compareCurrentConfigInput = document.querySelector("#compareCurrentConfigInput");
const modelCompareOptions = document.querySelector("#modelCompareOptions");
const openResultsDialogButton = document.querySelector("#openResultsDialogButton");
const closeModelSelectorButton = document.querySelector("#closeModelSelectorButton");
const doneModelSelectorButton = document.querySelector("#doneModelSelectorButton");
const modelSelectorDialog = document.querySelector("#modelSelectorDialog");
const dataSelectorDialog = document.querySelector("#dataSelectorDialog");
const closeDataSelectorButton = document.querySelector("#closeDataSelectorButton");
const dataSelectorCurrentData = document.querySelector("#dataSelectorCurrentData");
const marketDataDialog = document.querySelector("#marketDataDialog");
const closeMarketDataButton = document.querySelector("#closeMarketDataButton");
const resultsDialog = document.querySelector("#resultsDialog");
const closeResultsDialogButton = document.querySelector("#closeResultsDialogButton");
const modelTradesDialog = document.querySelector("#modelTradesDialog");
const closeModelTradesButton = document.querySelector("#closeModelTradesButton");
const tradeDetailDialog = document.querySelector("#tradeDetailDialog");
const closeTradeDetailButton = document.querySelector("#closeTradeDetailButton");
const selectedModelSummary = document.querySelector("#selectedModelSummary");
const selectedDataSummary = document.querySelector("#selectedDataSummary");
const selectedResultSummary = document.querySelector("#selectedResultSummary");
const modelCompareTable = document.querySelector("#modelCompareTable");
const modelPerformancePanel = document.querySelector("#modelPerformancePanel");
const showModelPerformanceButton = document.querySelector("#showModelPerformanceButton");
const selectedModelDetail = document.querySelector("#selectedModelDetail");
const rankingPresetList = document.querySelector("#rankingPresetList");
const modelTradesTitle = document.querySelector("#modelTradesTitle");
const modelTradesSubtitle = document.querySelector("#modelTradesSubtitle");
const modelTradesDetail = document.querySelector("#modelTradesDetail");
const modelTradesWaveLegend = document.querySelector("#modelTradesWaveLegend");
const modelTradesLowReferenceLegend = document.querySelector("#modelTradesLowReferenceLegend");
const modelTradesRuleEditorSection = document.querySelector("#modelTradesRuleEditorSection");
const modelTradesRuleEditor = document.querySelector("#modelTradesRuleEditor");
const modelTradesRuleStats = document.querySelector("#modelTradesRuleStats");
const presetParamDialog = document.querySelector("#presetParamDialog");
const closePresetParamButton = document.querySelector("#closePresetParamButton");
const savePresetParamButton = document.querySelector("#savePresetParamButton");
const saveAsNewPresetButton = document.querySelector("#saveAsNewPresetButton");
const presetParamTitle = document.querySelector("#presetParamTitle");
const presetParamSubtitle = document.querySelector("#presetParamSubtitle");
const presetParamNameInput = document.querySelector("#presetParamNameInput");
const presetParamNarrative = document.querySelector("#presetParamNarrative");
const presetParamEditor = document.querySelector("#presetParamEditor");
const presetParamEditorHint = document.querySelector("#presetParamEditorHint");
const presetOriginalText = document.querySelector("#presetOriginalText");
const presetModelText = document.querySelector("#presetModelText");
const blockRuleFormEditor = document.querySelector("#blockRuleFormEditor");
const blockRuleFormActions = document.querySelector("#blockRuleFormActions");
const refreshBlockRuleFormButton = document.querySelector("#refreshBlockRuleFormButton");
const adminDialog = document.querySelector("#adminDialog");
const closeAdminButton = document.querySelector("#closeAdminButton");
const adminPresetList = document.querySelector("#adminPresetList");
const adminPresetIdSearchInput = document.querySelector("#adminPresetIdSearchInput");
const adminPresetsTabButton = document.querySelector("#adminPresetsTabButton");
const adminRankingsTabButton = document.querySelector("#adminRankingsTabButton");
const adminScanTabButton = document.querySelector("#adminScanTabButton");
const adminScanStatusTabButton = document.querySelector("#adminScanStatusTabButton");
const adminValidationTabButton = document.querySelector("#adminValidationTabButton");
const adminPresetsPanel = document.querySelector("#adminPresetsPanel");
const adminRankingsPanel = document.querySelector("#adminRankingsPanel");
const adminScanPanel = document.querySelector("#adminScanPanel");
const adminScanStatusPanel = document.querySelector("#adminScanStatusPanel");
const adminValidationPanel = document.querySelector("#adminValidationPanel");
const adminValidationBuyHoldMaxInput = document.querySelector("#adminValidationBuyHoldMax");
const adminValidationBestReturnMinInput = document.querySelector("#adminValidationBestReturnMin");
const adminValidationRunButton = document.querySelector("#adminValidationRunButton");
const adminValidationRunStatus = document.querySelector("#adminValidationRunStatus");
const adminValidationThresholdInput = document.querySelector("#adminValidationThreshold");
const adminValidationApplyThresholdButton = document.querySelector("#adminValidationApplyThresholdButton");
const adminValidationList = document.querySelector("#adminValidationList");
const adminAutoGenerateTabButton = document.querySelector("#adminAutoGenerateTabButton");
const adminAutoGeneratePanel = document.querySelector("#adminAutoGeneratePanel");
const adminAutoGenerateSymbolGrid = document.querySelector("#adminAutoGenerateSymbolGrid");
const adminAutoGenerateSymbolSearchInput = document.querySelector("#adminAutoGenerateSymbolSearch");
const adminAutoGenerateSymbolSelectAllButton = document.querySelector("#adminAutoGenerateSymbolSelectAllButton");
const adminAutoGenerateSymbolClearButton = document.querySelector("#adminAutoGenerateSymbolClearButton");
const adminAutoGenerateSymbolCount = document.querySelector("#adminAutoGenerateSymbolCount");
const adminScanSymbolGrid = document.querySelector("#adminScanSymbolGrid");
const adminScanSymbolSearchInput = document.querySelector("#adminScanSymbolSearch");
const adminScanSymbolSelectAllButton = document.querySelector("#adminScanSymbolSelectAllButton");
const adminScanSymbolClearButton = document.querySelector("#adminScanSymbolClearButton");
const adminScanSymbolCount = document.querySelector("#adminScanSymbolCount");
const adminAutoGenerateLimitInput = document.querySelector("#adminAutoGenerateLimit");
const adminAutoGenerateAttemptsPerSymbolInput = document.querySelector("#adminAutoGenerateAttemptsPerSymbol");
const adminAutoGenerateMaxAttemptsInput = document.querySelector("#adminAutoGenerateMaxAttempts");
const adminAutoGeneratePointCountInput = document.querySelector("#adminAutoGeneratePointCount");
const adminAutoGenerateTrainYearsAgoInput = document.querySelector("#adminAutoGenerateTrainYearsAgo");
const adminAutoGenerateTestYearsAgoInput = document.querySelector("#adminAutoGenerateTestYearsAgo");
const adminAutoGenerateRunButton = document.querySelector("#adminAutoGenerateRunButton");
const adminAutoGenerateRunStatus = document.querySelector("#adminAutoGenerateRunStatus");
const adminAutoGenerateProgressBanner = document.querySelector("#adminAutoGenerateProgressBanner");
const adminScanProgressBanner = document.querySelector("#adminScanProgressBanner");
const adminAutoGenerateList = document.querySelector("#adminAutoGenerateList");
const adminStockScreenTabButton = document.querySelector("#adminStockScreenTabButton");
const adminWatchAlertsTabButton = document.querySelector("#adminWatchAlertsTabButton");
const adminWatchAlertsPanel = document.querySelector("#adminWatchAlertsPanel");
const adminWatchAlertsList = document.querySelector("#adminWatchAlertsList");
const adminValidatedSearchTabButton = document.querySelector("#adminValidatedSearchTabButton");
const adminValidatedSearchPanel = document.querySelector("#adminValidatedSearchPanel");
const adminValidatedSearchModeSelect = document.querySelector("#adminValidatedSearchModeSelect");
const adminValidatedSearchManualPicker = document.querySelector("#adminValidatedSearchManualPicker");
const adminValidatedSearchIndexPicker = document.querySelector("#adminValidatedSearchIndexPicker");
const adminValidatedSearchIndexSelect = document.querySelector("#adminValidatedSearchIndexSelect");
const adminValidatedSearchSymbolGrid = document.querySelector("#adminValidatedSearchSymbolGrid");
const adminValidatedSearchSymbolSearchInput = document.querySelector("#adminValidatedSearchSymbolSearch");
const adminValidatedSearchSymbolSelectAllButton = document.querySelector("#adminValidatedSearchSymbolSelectAllButton");
const adminValidatedSearchSymbolClearButton = document.querySelector("#adminValidatedSearchSymbolClearButton");
const adminValidatedSearchSymbolCount = document.querySelector("#adminValidatedSearchSymbolCount");
const adminValidatedSearchTargetPercentInput = document.querySelector("#adminValidatedSearchTargetPercent");
const adminValidatedSearchUpsideThresholdPercentInput = document.querySelector("#adminValidatedSearchUpsideThresholdPercent");
const adminValidatedSearchDrawdownTolerancePercentInput = document.querySelector("#adminValidatedSearchDrawdownTolerancePercent");
const adminValidatedSearchAttemptsPerSymbolInput = document.querySelector("#adminValidatedSearchAttemptsPerSymbol");
const adminValidatedSearchMaxAttemptsInput = document.querySelector("#adminValidatedSearchMaxAttempts");
const adminValidatedSearchCandidatesInput = document.querySelector("#adminValidatedSearchCandidates");
const adminValidatedSearchPointCountInput = document.querySelector("#adminValidatedSearchPointCount");
const adminValidatedSearchTrainYearsAgoInput = document.querySelector("#adminValidatedSearchTrainYearsAgo");
const adminValidatedSearchTestYearsAgoInput = document.querySelector("#adminValidatedSearchTestYearsAgo");
const adminValidatedSearchRunButton = document.querySelector("#adminValidatedSearchRunButton");
const adminValidatedSearchPauseResumeButton = document.querySelector("#adminValidatedSearchPauseResumeButton");
const adminValidatedSearchRunStatus = document.querySelector("#adminValidatedSearchRunStatus");
const adminValidatedSearchProgressBanner = document.querySelector("#adminValidatedSearchProgressBanner");
const adminValidatedSearchList = document.querySelector("#adminValidatedSearchList");
const adminValidatedSearchRecommendFilterButton = document.querySelector("#adminValidatedSearchRecommendFilterButton");
const adminQualifiedRecheckTargetPercentInput = document.querySelector("#adminQualifiedRecheckTargetPercent");
const adminQualifiedRecheckUpsideThresholdPercentInput = document.querySelector("#adminQualifiedRecheckUpsideThresholdPercent");
const adminQualifiedRecheckDrawdownTolerancePercentInput = document.querySelector("#adminQualifiedRecheckDrawdownTolerancePercent");
const adminQualifiedRecheckRunButton = document.querySelector("#adminQualifiedRecheckRunButton");
const adminQualifiedRecheckRunStatus = document.querySelector("#adminQualifiedRecheckRunStatus");
const adminQualifiedRecheckProgressBanner = document.querySelector("#adminQualifiedRecheckProgressBanner");
const adminScheduledJobsTabButton = document.querySelector("#adminScheduledJobsTabButton");
const adminScheduledJobsPanel = document.querySelector("#adminScheduledJobsPanel");
const adminScheduledJobsList = document.querySelector("#adminScheduledJobsList");
const adminWaveVisualizerTabButton = document.querySelector("#adminWaveVisualizerTabButton");
const adminWaveVisualizerPanel = document.querySelector("#adminWaveVisualizerPanel");
const waveVisualizerSymbolInput = document.querySelector("#waveVisualizerSymbolInput");
const waveVisualizerMarketSelect = document.querySelector("#waveVisualizerMarketSelect");
const waveVisualizerStartInput = document.querySelector("#waveVisualizerStartInput");
const waveVisualizerEndInput = document.querySelector("#waveVisualizerEndInput");
const waveVisualizerLoadHistoryButton = document.querySelector("#waveVisualizerLoadHistoryButton");
const waveVisualizerPresetSelect = document.querySelector("#waveVisualizerPresetSelect");
const waveVisualizerLoadPresetButton = document.querySelector("#waveVisualizerLoadPresetButton");
const waveVisualizerConditionRow = document.querySelector("#waveVisualizerConditionRow");
const waveVisualizerConditionSelect = document.querySelector("#waveVisualizerConditionSelect");
const waveVisualizerThresholdInput = document.querySelector("#waveVisualizerThresholdInput");
const waveVisualizerThresholdSlider = document.querySelector("#waveVisualizerThresholdSlider");
const waveVisualizerStats = document.querySelector("#waveVisualizerStats");
const waveVisualizerSvg = document.querySelector("#waveVisualizerSvg");
const adminStockScreenPanel = document.querySelector("#adminStockScreenPanel");
const adminStockScreenList = document.querySelector("#adminStockScreenList");
const screenPresetSelect = document.querySelector("#screenPresetSelect");
const screenMarketSelect = document.querySelector("#screenMarketSelect");
const screenStartButton = document.querySelector("#screenStartButton");
const screenStatusText = document.querySelector("#screenStatusText");
const screenProgressBanner = document.querySelector("#screenProgressBanner");
const screenRunList = document.querySelector("#screenRunList");
const adminParamPatternModelSelect = document.querySelector("#adminParamPatternModelSelect");
const adminParamPatternViewButton = document.querySelector("#adminParamPatternViewButton");
const adminParamPatternDialog = document.querySelector("#adminParamPatternDialog");
const adminParamPatternTitle = document.querySelector("#adminParamPatternTitle");
const closeAdminParamPatternButton = document.querySelector("#closeAdminParamPatternButton");
const adminParamPatternList = document.querySelector("#adminParamPatternList");
const adminRankingList = document.querySelector("#adminRankingList");
const adminScanList = document.querySelector("#adminScanList");
const adminScanFilterSymbolInput = document.querySelector("#adminScanFilterSymbol");
const adminScanFilterBuyHoldMaxInput = document.querySelector("#adminScanFilterBuyHoldMax");
const adminScanFilterBestReturnMinInput = document.querySelector("#adminScanFilterBestReturnMin");
const adminScanFilterMarketInput = document.querySelector("#adminScanFilterMarket");
const adminScanFilterChipInput = document.querySelector("#adminScanFilterChip");
const adminScanFilterTechInput = document.querySelector("#adminScanFilterTech");
const adminScanFilterQqqInput = document.querySelector("#adminScanFilterQqq");
const adminScanApplyFilterButton = document.querySelector("#adminScanApplyFilterButton");
const adminScanClearFilterButton = document.querySelector("#adminScanClearFilterButton");
const adminScanFilterSummary = document.querySelector("#adminScanFilterSummary");
const adminScanStatusSummary = document.querySelector("#adminScanStatusSummary");
const adminScanStatusModelList = document.querySelector("#adminScanStatusModelList");
const adminScanRunSelectedButton = document.querySelector("#adminScanRunSelectedButton");
const adminScanRunAllButton = document.querySelector("#adminScanRunAllButton");
const adminScanPauseResumeButton = document.querySelector("#adminScanPauseResumeButton");
const adminScanRunStatus = document.querySelector("#adminScanRunStatus");
const adminRerunDialog = document.querySelector("#adminRerunDialog");
const modelActionDialog = document.querySelector("#modelActionDialog");
const modelActionTitle = document.querySelector("#modelActionTitle");
const closeModelActionButton = document.querySelector("#closeModelActionButton");
const modelActionViewParamsButton = document.querySelector("#modelActionViewParamsButton");
const modelActionViewTradesButton = document.querySelector("#modelActionViewTradesButton");
const modelActionRenameButton = document.querySelector("#modelActionRenameButton");
const modelActionSaveAsButton = document.querySelector("#modelActionSaveAsButton");
const modelActionReloadSimButton = document.querySelector("#modelActionReloadSimButton");
const modelActionCreateWatchButton = document.querySelector("#modelActionCreateWatchButton");
const modelActionScreenMarketButton = document.querySelector("#modelActionScreenMarketButton");
const modelActionRevalidateButton = document.querySelector("#modelActionRevalidateButton");
const revalidateDialog = document.querySelector("#revalidateDialog");
const revalidateTitle = document.querySelector("#revalidateTitle");
const closeRevalidateButton = document.querySelector("#closeRevalidateButton");
const revalidateTrainYearsInput = document.querySelector("#revalidateTrainYears");
const revalidateTestYearsInput = document.querySelector("#revalidateTestYears");
const revalidateTargetPercentInput = document.querySelector("#revalidateTargetPercent");
const revalidateUpsideThresholdPercentInput = document.querySelector("#revalidateUpsideThresholdPercent");
const revalidateDrawdownTolerancePercentInput = document.querySelector("#revalidateDrawdownTolerancePercent");
const revalidateRunButton = document.querySelector("#revalidateRunButton");
const revalidateStatus = document.querySelector("#revalidateStatus");
const revalidateResult = document.querySelector("#revalidateResult");
const adminRerunTitle = document.querySelector("#adminRerunTitle");
const adminRerunSubtitle = document.querySelector("#adminRerunSubtitle");
const closeAdminRerunButton = document.querySelector("#closeAdminRerunButton");
const adminRerunPlayButton = document.querySelector("#adminRerunPlayButton");
const adminRerunPauseButton = document.querySelector("#adminRerunPauseButton");
const adminRerunSkipButton = document.querySelector("#adminRerunSkipButton");
const adminRerunRestartButton = document.querySelector("#adminRerunRestartButton");
const adminRerunZoomOutButton = document.querySelector("#adminRerunZoomOutButton");
const adminRerunZoomResetButton = document.querySelector("#adminRerunZoomResetButton");
const adminRerunZoomInButton = document.querySelector("#adminRerunZoomInButton");
const adminRerunProgressLabel = document.querySelector("#adminRerunProgressLabel");
const adminRerunChartSvg = document.querySelector("#adminRerunChartSvg");
const adminRerunMetrics = document.querySelector("#adminRerunMetrics");
const adminRerunTradeList = document.querySelector("#adminRerunTradeList");
const adminRerunTradeDetailPanel = document.querySelector("#adminRerunTradeDetailPanel");
const adminRerunTradeDetailTitle = document.querySelector("#adminRerunTradeDetailTitle");
const adminRerunTradeDetailChart = document.querySelector("#adminRerunTradeDetailChart");
const adminRerunTradeDetailSummary = document.querySelector("#adminRerunTradeDetailSummary");
const optimizationDialog = document.querySelector("#optimizationDialog");
const optimizationTitle = document.querySelector("#optimizationTitle");
const optimizationSubtitle = document.querySelector("#optimizationSubtitle");
const optimizationReport = document.querySelector("#optimizationReport");
const optimizationNarrative = document.querySelector("#optimizationNarrative");
const optimizationParamPreview = document.querySelector("#optimizationParamPreview");
const optimizationParamRanges = document.querySelector("#optimizationParamRanges");
const optimizationUniformPointCountRow = document.querySelector("#optimizationUniformPointCountRow");
const optimizationUniformPointCountInput = document.querySelector("#optimizationUniformPointCountInput");
const applyUniformPointCountButton = document.querySelector("#applyUniformPointCountButton");
const optimizationCombinationSummary = document.querySelector("#optimizationCombinationSummary");
const optimizationCombinationCount = document.querySelector("#optimizationCombinationCount");
const optimizationMaxCombinationsInput = document.querySelector("#optimizationMaxCombinationsInput");
const optimizationProgress = document.querySelector("#optimizationProgress");
const optimizationProgressBar = document.querySelector("#optimizationProgressBar");
const optimizationProgressLabel = document.querySelector("#optimizationProgressLabel");
const runOptimizationButton = document.querySelector("#runOptimizationButton");
const closeOptimizationButton = document.querySelector("#closeOptimizationButton");
const saveOptimizationButton = document.querySelector("#saveOptimizationButton");
const optimizationSaveNameRow = document.querySelector("#optimizationSaveNameRow");
const optimizationSaveNameInput = document.querySelector("#optimizationSaveNameInput");
const customModelForm = document.querySelector("#customModelForm");
const customModelPrompt = document.querySelector("#customModelPrompt");
const customModelCreatorInput = document.querySelector("#customModelCreatorInput");
const customModelLabelInput = document.querySelector("#customModelLabelInput");
const generateModelCodeButton = document.querySelector("#generateModelCodeButton");
const saveGeneratedModelButton = document.querySelector("#saveGeneratedModelButton");
const viewGeneratedModelParamsButton = document.querySelector("#viewGeneratedModelParamsButton");
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
let modelTradesChartZoom = 1;
let generatedPresetDraft = null;
let lastRenderedTrades = [];
let selectedTradeForChart = null;
let selectedTradeChartStates = [];
let editingPresetName = null;
// Set whenever openPresetParamEditor opens in read-only mode — holds what "另存为模型" needs
// to save a copy of whatever's currently being viewed (admin lists, ranking snapshots, public
// presets you can't edit in place), since 保存参数 only ever updates an owned preset.
let presetParamViewerSaveSource = null;
let activeOptimizationId = 0;
let optimizationPresetDraft = null;
let activeSimulationStep = "models";
let currentUser = null;
let authMode = "login";
let activeLanguage = localStorage.getItem("aiTradeLanguage") || "zh";
let adminOwnerOptions = ["public"];
let adminPresetsCache = [];

const symbolPresets = ["513100", "588000", "NET", "QQQ", "AMD"];
const customPresetStorageKey = "aiTradeCustomStrategyPresets";
const customPresetMigrationKey = "aiTradeCustomStrategyPresetsMigratedToServer";
const rankingRecordStorageKey = "aiTradeRankingRecords";
const rankingPeriods = [1, 3, 5];
const rankingPageSize = 10;
// Server-backed (not per-browser localStorage): every /api/klines call already records the
// resolved name + a fresh timestamp into the `symbols` table (see server.js persistKlineData),
// so this is simply that history read back, most-recent first — shared across devices/users,
// and the single source both the history-simulation "常用代码" dropdown and the admin
// "AI自动生成" symbol picker draw from.
let symbolHistoryCache = [];
let rankingRecords = [];
let publicRankingRecords = [];
let rankingPageByPeriod = {};

const i18n = {
  zh: {
    appTitle: "AI Trade 策略研究向导",
    appSubtitle: "选择一个功能开始：先看模型排行、创建模型，或进入历史模拟。",
    rankModels: "模型排行",
    newModel: "新建模型",
    historySimulation: "历史模拟",
    account: "账户",
    notSignedIn: "未登录",
    registerLogin: "注册 / 登录",
    switchAccount: "切换账户",
    resendVerification: "重发验证邮件",
    logout: "退出",
    rankingSubtitle: "分为 Public 模型排行（公共模型）和个人模型排行（当前账户自己保存的模型），按 1 年、3 年、5 年区间分别记录表现。",
    backToNav: "返回功能导航",
    newModelSubtitle: "用文字描述买卖规则，AI 会理解并生成受限的客户端模型预设。",
    newModelAuthNote: "保存新模型需要免费注册、登录并验证电子邮件。模型会按电子邮件账户保存到服务器端。",
    modelDescription: "模型描述",
    modelPromptPlaceholder: "例如：5天没有形成新低买入100%，5天没有形成新高卖出100%",
    creator: "创建者",
    presetName: "预设名称",
    autoGenerated: "自动生成",
    generateSafeModel: "生成安全模型",
    saveAsPreset: "保存为预设",
    securityNote: "安全策略：不会执行任意 JavaScript，不使用 eval / Function。AI 只生成受支持模型的参数 JSON，浏览器用受控回测引擎运行。",
    waitingGeneration: "等待生成...",
    authDialogSubtitle: "免费账户只需要电子邮件和密码。验证邮箱后，可在服务器端保存模型参数。",
    close: "关闭",
    login: "登录",
    register: "注册",
    freeRegister: "免费注册",
    email: "电子邮件",
    password: "密码",
    forgotPassword: "忘记密码",
    registerHint: "注册后请验证电子邮件，然后可把新模型和优化参数保存到服务器端。",
    enterEmail: "请输入电子邮件。",
    enterEmailPassword: "请输入电子邮件和密码。",
    registering: "正在注册...",
    loggingIn: "正在登录...",
    sendingPasswordReset: "正在发送密码重置邮件...",
    passwordResetSent: "如果这个邮箱已注册，密码重置邮件会发送到该邮箱。",
    passwordResetEmailDisabled: "当前没有启用邮件发送服务，无法发送密码重置邮件。",
    authFailed: "账户操作失败。",
    verificationFailed: "验证邮件发送失败",
    verifyEmailToSave: "请到邮箱点击验证链接，验证后就可以保存模型。",
    signedInServerLoaded: "已登录，服务器端模型已加载。",
    signedOut: "已退出账户。需要保存模型时请重新登录。",
    verifyBeforeSave: "保存到服务器前，请先验证电子邮件。可以点击账户区域的“重发验证邮件”。",
    signInBeforeSave: "保存模型需要先注册或登录。",
    sendingVerification: "正在发送验证邮件...",
    emailAlreadyVerified: "电子邮件已经验证，可以保存模型。",
    verificationSent: "验证邮件已发送，请检查邮箱。",
    selectModel: "选择模型",
    selectPresetModels: "勾选预存模型",
    loadHistory: "加载",
    selectTickerRange: "选择股票和区间",
    viewPerformance: "查看表现",
    rankingChartsTrades: "排行、曲线、交易",
    simulationSubtitle: "选择模型、股票和区间后，系统会直接生成模拟表现。",
    selectTickerRangeButton: "选择股票区间",
    noModelSelected: "尚未选择模型。",
    historyNotLoaded: "尚未加载历史数据",
    historyNotLoadedHint: "点击“选择股票区间”，加载用于模拟的历史价格。",
    currentHistoryData: "当前历史数据",
    queryTickerRangeHint: "请查询股票和时间区间。",
    useCurrentDataSimulation: "使用当前数据模拟",
    loadedTradingDays: "个交易日",
    dateRangeTo: "至",
    loadHistoryFirst: "请先查询历史数据。",
    simulationNotReady: "尚未生成模拟表现",
    simulationNotReadyHint: "选择模型并加载历史数据后会自动开始模拟。",
    viewMarketChart: "查看行情曲线",
    viewModelPerformance: "查看模型表现",
    selectSimulationModels: "选择模拟模型",
    modelSelectorSubtitle: "默认按最新测试日期排序。大量个人测试模型会优先显示最近使用过的结果。",
    model: "模型",
    returnRate: "回报率",
    testedTickerRange: "测试股票区间",
    drawdownRate: "回撤率",
    date: "日期",
    done: "完成选择",
    initialStatus: "请选择功能、模型和股票区间；页面不会自动加载历史数据。",
    noModelInput: "请先输入模型描述。",
  },
  en: {
    appTitle: "AI Trade Strategy Research",
    appSubtitle: "Choose a workflow: rank models, create a model, or run a historical simulation.",
    rankModels: "Model Ranking",
    newModel: "New Model",
    historySimulation: "Historical Simulation",
    account: "Account",
    notSignedIn: "Not signed in",
    registerLogin: "Register / Sign In",
    switchAccount: "Switch Account",
    resendVerification: "Resend Email",
    logout: "Sign Out",
    rankingSubtitle: "Split into Public model ranking and Personal model ranking (models owned by the current account), each ranked by 1-year, 3-year, and 5-year windows.",
    backToNav: "Back to Navigation",
    newModelSubtitle: "Describe trading rules in plain language. AI will convert them into a restricted client-side preset.",
    newModelAuthNote: "Saving a new model requires a free account, sign-in, and email verification. Models are stored on the server by email account.",
    modelDescription: "Model Description",
    modelPromptPlaceholder: "Example: buy to 100% after 5 days without a new low, sell 100% after 5 days without a new high",
    creator: "Creator",
    presetName: "Preset Name",
    autoGenerated: "Auto-generated",
    generateSafeModel: "Generate Safe Model",
    saveAsPreset: "Save as Preset",
    securityNote: "Safety: arbitrary JavaScript is never executed, and eval / Function are not used. AI only returns supported model JSON, which is run by the controlled browser backtest engine.",
    waitingGeneration: "Waiting to generate...",
    authDialogSubtitle: "A free account only needs an email and password. After email verification, model parameters can be saved on the server.",
    close: "Close",
    login: "Sign In",
    register: "Register",
    freeRegister: "Free Register",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot password",
    registerHint: "After registration, please verify your email before saving new models or optimized parameters on the server.",
    enterEmail: "Please enter an email.",
    enterEmailPassword: "Please enter an email and password.",
    registering: "Registering...",
    loggingIn: "Signing in...",
    sendingPasswordReset: "Sending password reset email...",
    passwordResetSent: "If this email is registered, a password reset email will be sent.",
    passwordResetEmailDisabled: "Email sending is not enabled, so a reset email cannot be sent.",
    authFailed: "Account action failed.",
    verificationFailed: "Verification email failed",
    verifyEmailToSave: "Please open the verification link in your email. After verification, you can save models.",
    signedInServerLoaded: "Signed in. Server-side models are loaded.",
    signedOut: "Signed out. Please sign in again before saving models.",
    verifyBeforeSave: "Please verify your email before saving to the server. You can resend the verification email from the account area.",
    signInBeforeSave: "Please register or sign in before saving models.",
    sendingVerification: "Sending verification email...",
    emailAlreadyVerified: "Email is already verified. You can save models.",
    verificationSent: "Verification email sent. Please check your inbox.",
    selectModel: "Select Model",
    selectPresetModels: "Choose preset models",
    loadHistory: "Load",
    selectTickerRange: "Select ticker and range",
    viewPerformance: "View Performance",
    rankingChartsTrades: "Ranking, charts, trades",
    simulationSubtitle: "After selecting models, ticker, and range, the system generates performance automatically.",
    selectTickerRangeButton: "Select Ticker Range",
    noModelSelected: "No model selected.",
    historyNotLoaded: "Historical data not loaded",
    historyNotLoadedHint: "Select a ticker range to load historical prices for simulation.",
    currentHistoryData: "Current Historical Data",
    queryTickerRangeHint: "Please query a ticker and time range.",
    useCurrentDataSimulation: "Use Current Data",
    loadedTradingDays: "trading days",
    dateRangeTo: "to",
    loadHistoryFirst: "Please query historical data first.",
    simulationNotReady: "Simulation performance not ready",
    simulationNotReadyHint: "Simulation starts automatically after models and historical data are selected.",
    viewMarketChart: "View Market Chart",
    viewModelPerformance: "View Model Performance",
    selectSimulationModels: "Select Simulation Models",
    modelSelectorSubtitle: "Sorted by latest test date by default. Recent personal test models are shown first.",
    model: "Model",
    returnRate: "Return",
    testedTickerRange: "Tested ticker range",
    drawdownRate: "Drawdown",
    date: "Date",
    done: "Done",
    initialStatus: "Choose a workflow, model, and ticker range. Historical data is not loaded automatically.",
    noModelInput: "Please enter a model description first.",
  },
};

function t(key) {
  return (i18n[activeLanguage] && i18n[activeLanguage][key]) || i18n.zh[key] || key;
}

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

const defaultStagnationReversalRule = {
  buyLookbackDays: 5,
  buyStalledDays: 5,
  buyTarget: 100,
  sellLookbackDays: 5,
  sellStalledDays: 5,
  sellReduce: 100,
};

const blockRuleIndicators = [
  "drawdownFromHigh", "drawdownFromWaveHigh", "drawdownFromBreakoutHigh", "riseFromLow", "riseFromWaveLow", "maValue", "maLevel",
  "maSlope", "rsi", "atrPercent", "volumeRatio", "daysSinceNewHigh", "daysSinceNewLow", "daysSinceNewWaveLow", "daysSinceNewWaveHigh", "upDayCount", "downDayCount",
  "maCompare", "candleBody", "positionRatio", "holdingDays", "formula",
];
// risingStreak/fallingStreak are special: instead of comparing the indicator's value
// against `value` as a threshold, they check whether the indicator's own series has moved
// monotonically up/down for the last `value` days in a row — e.g. "10日均线连续3天每天都在
// 涨" (10-day MA rises every single day for 3 consecutive days), which maSlope's net
// before/after comparison can't express (it only sees the endpoints, not whether every day
// in between moved the same direction). Applies uniformly to any indicator, not just MA.
const blockRuleComparators = [">", ">=", "<", "<=", "==", "risingStreak", "fallingStreak"];
const blockRuleActionTypes = ["targetPercent", "targetShares", "reducePercent", "exitAll"];

const defaultBuyBlockRules = [];
const defaultSellBlockRules = [];
const defaultScoreRules = [];
const defaultPositionBands = [];

const supportedStrategyTypes = ["wave", "local-high-ladder", "ma-rsi-band", "order-grid", "pe-volume", "stagnation-reversal", "block-rules", "score-rules"];

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
  const strategyType = supportedStrategyTypes.includes(preset.strategyType)
    ? preset.strategyType
    : "wave";
  return {
    id: preset.id ? String(preset.id).slice(0, 200) : undefined,
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
    stagnationReversalRule: {
      ...defaultStagnationReversalRule,
      ...(preset.stagnationReversalRule || {}),
    },
    buyBlockRules: cloneRuleBlocks(preset.buyBlockRules, defaultBuyBlockRules),
    sellBlockRules: cloneRuleBlocks(preset.sellBlockRules, defaultSellBlockRules),
    scoreRules: cloneScoreRules(preset.scoreRules, defaultScoreRules),
    positionBands: clonePositionBands(preset.positionBands, defaultPositionBands),
    meta: {
      targetSymbol: String(preset.meta && preset.meta.targetSymbol || "通用").slice(0, 24),
      provedPeriod: String(preset.meta && preset.meta.provedPeriod || "本地保存").slice(0, 40),
      creator: String(preset.meta && preset.meta.creator || "user").slice(0, 80),
      createdAt: String(preset.meta && preset.meta.createdAt || todayText()).slice(0, 16),
      updatedAt: String(preset.meta && preset.meta.updatedAt || todayText()).slice(0, 16),
      originalText: String(preset.meta && preset.meta.originalText || "").slice(0, 8000),
      modelText: String(preset.meta && (preset.meta.modelText || preset.meta.originalText) || "").slice(0, 8000),
      ownerEmail: String(preset.meta && preset.meta.ownerEmail || "").slice(0, 160),
      isOwner: Boolean(preset.meta && preset.meta.isOwner),
      isPublic: Boolean(preset.meta && preset.meta.isPublic),
      isLegacy: Boolean(preset.meta && preset.meta.isLegacy),
      originalModelId: String(preset.meta && preset.meta.originalModelId || "0").slice(0, 120),
      // A readable snapshot of the source model's own name/id at the moment this preset was
      // 另存为'd from an AI candidate — AI candidates live in a table that gets cleared out
      // periodically, so this can't be a live lookup; it has to be captured once, here.
      originalModelLabel: String(preset.meta && preset.meta.originalModelLabel || "").slice(0, 100),
      originalModelNumericId: preset.meta && preset.meta.originalModelNumericId !== undefined && preset.meta.originalModelNumericId !== null
        ? Number(preset.meta.originalModelNumericId)
        : null,
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
    Object.entries(strategyPresets).filter(([name]) => isOwnedEditablePreset(name))
  );
  return saveServerCustomStrategyPresets(customPresets).then((payload) => {
    if (!payload) return false;
    localStorage.setItem(customPresetStorageKey, JSON.stringify(customPresets));
    return true;
  });
}

async function fetchServerCustomStrategyPresets() {
  const response = await fetch("/api/presets", { cache: "no-store" });
  const payload = await readJsonResponse(response, "读取服务器预设失败。");
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
    const payload = await readJsonResponse(response, "保存服务器预设失败。");
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
    Object.entries(strategyPresets).filter(([name]) => isOwnedEditablePreset(name))
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
    renderScreenPresetOptions();
  } catch (error) {
    setStatus(`服务器预设读取失败：${error.message}`, true);
  }
}

function buildRankingRecordKey(symbol, periodYears, presetName, startDate = "", endDate = "") {
  return `${String(symbol || "").toUpperCase()}:${periodYears}:${startDate}:${endDate}:${presetName}`;
}

function clonePlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return { ...value };
  }
}

function stripPresetDisplayFields(value) {
  const config = clonePlainObject(value);
  delete config.label;
  delete config.meta;
  return config;
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
    presetId: String(record.presetId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 160),
    presetName,
    presetLabel: String(record.presetLabel || presetName).slice(0, 100),
    strategyType: supportedStrategyTypes.includes(record.strategyType)
      ? record.strategyType
      : "wave",
    presetConfigSnapshot: stripPresetDisplayFields(record.presetConfigSnapshot),
    presetMetaSnapshot: clonePlainObject(record.presetMetaSnapshot),
    presetOriginalTextSnapshot: String(record.presetOriginalTextSnapshot || "").slice(0, 8000),
    presetModelTextSnapshot: String(record.presetModelTextSnapshot || record.presetOriginalTextSnapshot || "").slice(0, 8000),
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
  const payload = await readJsonResponse(response, "读取服务器排行失败。");
  return {
    records: Array.isArray(payload.records) ? payload.records : [],
    publicRecords: Array.isArray(payload.publicRecords) ? payload.publicRecords : [],
  };
}

async function saveServerRankingRecords(records, options = {}) {
  if (!currentUser || !currentUser.email) return;
  try {
    const response = await fetch("/api/rankings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records, public: Boolean(options.public) }),
    });
    const payload = await readJsonResponse(response, "保存服务器排行失败。");
    if (Array.isArray(payload.records)) {
      mergeRankingRecords(payload.records);
    }
    if (Array.isArray(payload.publicRecords)) {
      publicRankingRecords = normalizeRankingRecords(payload.publicRecords);
    }
    renderModelRanking();
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
    const result = await readJsonResponse(response, "回测记录保存失败。");
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
    const payload = await fetchServerRankingRecords();
    const serverRecords = normalizeRankingRecords(payload.records);
    publicRankingRecords = normalizeRankingRecords(payload.publicRecords);
    const serverKeys = new Set(serverRecords.map((record) => record.key));
    const localOnlyRecords = rankingRecords.filter((record) => !serverKeys.has(record.key));
    rankingRecords = serverRecords;
    localStorage.setItem(rankingRecordStorageKey, JSON.stringify(rankingRecords));
    renderModelRanking();
    if (localOnlyRecords.length > 0) saveServerRankingRecords(localOnlyRecords);
  } catch (error) {
    setStatus(`服务器排行读取失败，暂时使用浏览器本地备份：${error.message}`, true);
  }
}

function formatAdminDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

function renderAdminPresetCard(preset, presets) {
  const textPreview = String(preset.modelText || preset.originalText || "没有文字版本").slice(0, 160);
  const ownerValue = String(preset.ownerValue || preset.ownerEmail || "public");
  const options = [...new Set([ownerValue, "public", ...adminOwnerOptions])]
    .filter(Boolean)
    .map((owner) => `<option value="${escapeHtml(owner)}"${owner === ownerValue ? " selected" : ""}>${escapeHtml(owner)}</option>`)
    .join("");
  const originalModelId = String(preset.originalModelId || "0");
  const isOrigin = originalModelId === "0";
  const isHidden = Boolean(preset.hiddenAt);
  const rootPreset = !isOrigin ? presets.find((item) => item.id === originalModelId) : null;
  // originalModelId can point at an optimization_scan_results row (from 另存为 on an AI
  // candidate) instead of a strategy_presets row — that table gets cleared out periodically,
  // so rootPreset legitimately won't resolve forever. Fall back to the readable snapshot
  // captured at 另存为 time (meta.originalModelLabel/originalModelNumericId) instead of
  // showing the raw dangling id string.
  const meta = preset.meta && typeof preset.meta === "object" ? preset.meta : {};
  const fallbackLabel = meta.originalModelLabel
    ? `${meta.originalModelNumericId ? `#${meta.originalModelNumericId} · ` : ""}${meta.originalModelLabel}`
    : originalModelId;
  const lineageText = (isOrigin
    ? "原始手工模型"
    : `衍生自：${rootPreset ? escapeHtml(rootPreset.label || rootPreset.name) : escapeHtml(fallbackLabel)}`)
    + (isOrigin ? (isHidden ? " · 已隐藏，不参与后台批量扫描" : " · 纳入后台批量扫描") : (isHidden ? " · 已隐藏" : ""));
  const rootOptionIds = presets
    .filter((item) => String(item.originalModelId || "0") === "0" && item.id !== preset.id)
    .map((item) => item.id);
  const originalModelOptions = [...new Set(["0", originalModelId, ...rootOptionIds])]
    .map((id) => {
      const label = id === "0" ? "无（原始手工模型）" : (() => {
        const match = presets.find((item) => item.id === id);
        return match ? (match.label || match.name) : id;
      })();
      return `<option value="${escapeHtml(id)}"${id === originalModelId ? " selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
  return `
    <article class="admin-preset-card${isHidden ? " admin-preset-card--hidden" : ""}" data-admin-preset-id="${escapeHtml(preset.id)}">
      <div>
        <strong>${formatModelNameLink({
          id: preset.id, numericId: preset.numericId, label: preset.label || preset.name,
          config: preset.config, strategyType: preset.strategyType,
          symbol: meta.targetSymbol && meta.targetSymbol !== "通用" ? meta.targetSymbol : "",
          ownerEmail: ownerValue, isOwner: false, name: null,
        })}</strong>
        <span>${escapeHtml(preset.name)} · ${escapeHtml(getStrategyTypeLabel(preset.strategyType || "wave"))}</span>
        <small>Owner: ${escapeHtml(ownerValue)} · 更新 ${escapeHtml(formatAdminDate(preset.updatedAt))}</small>
        <small class="${isHidden ? "down" : (isOrigin ? "up" : "")}">${lineageText}</small>
        <p>${escapeHtml(textPreview)}</p>
      </div>
      <div class="admin-preset-actions">
        <label>
          Owner
          <select class="admin-owner-select" data-preset-id="${escapeHtml(preset.id)}">${options}</select>
        </label>
        <label>
          原始模型
          <select class="admin-original-select" data-preset-id="${escapeHtml(preset.id)}">${originalModelOptions}</select>
        </label>
        <button class="admin-view-params-button ghost-button" type="button" data-preset-id="${escapeHtml(preset.id)}">查看参数</button>
        <button class="admin-rename-preset-button ghost-button" type="button" data-preset-id="${escapeHtml(preset.id)}" data-preset-label="${escapeHtml(preset.label || preset.name)}">重命名</button>
        <button class="admin-save-owner-button" type="button" data-preset-id="${escapeHtml(preset.id)}">保存 owner</button>
        <button class="admin-save-original-button ghost-button" type="button" data-preset-id="${escapeHtml(preset.id)}">保存原始模型</button>
        <button class="admin-toggle-hidden-button ghost-button" type="button" data-preset-id="${escapeHtml(preset.id)}" data-hidden="${isHidden ? "1" : "0"}">${isHidden ? "取消隐藏" : "隐藏"}</button>
        <button class="admin-delete-preset-button" type="button" data-preset-id="${escapeHtml(preset.id)}" data-preset-label="${escapeHtml(preset.label || preset.name)}">删除</button>
      </div>
    </article>
  `;
}

// Paginated per-group render — page/dataAttr/buttonClass let the two groups (原始模型/衍生模型)
// each keep their own independent page position, mirroring renderAdminScanList's single-list
// pagination (adminScanPage/adminScanPageSize) but applied twice.
function renderAdminPresetGroup(title, list, presets, { page, dataAttr, buttonClass }) {
  if (!list.length) {
    return `
      <div class="admin-preset-group">
        <h4 class="admin-preset-group-title">${escapeHtml(title)}（0）</h4>
        <div class="ranking-empty">暂无。</div>
      </div>
    `;
  }
  const pageCount = Math.max(1, Math.ceil(list.length / adminPresetPageSize));
  const clampedPage = Math.min(Math.max(0, page), pageCount - 1);
  const pageStart = clampedPage * adminPresetPageSize;
  const pageList = list.slice(pageStart, pageStart + adminPresetPageSize);
  const paginationHtml = renderAdminListPagination(clampedPage, pageCount, list.length, dataAttr, `${title}分页`, buttonClass);
  const body = pageList.map((preset) => renderAdminPresetCard(preset, presets)).join("");
  return `
    <div class="admin-preset-group">
      <h4 class="admin-preset-group-title">${escapeHtml(title)}（${list.length}）</h4>
      ${paginationHtml}
      ${body}
      ${paginationHtml}
    </div>
  `;
}

let adminPresetSearchTerm = "";
let adminPresetRootPage = 0;
let adminPresetDerivedPage = 0;
const adminPresetPageSize = 15;

function renderAdminPresetList() {
  if (!adminPresetList) return;
  const presets = adminPresetsCache;
  const previousScrollTop = adminPresetList.scrollTop;
  if (!presets.length) {
    adminPresetList.innerHTML = '<div class="ranking-empty">服务器端还没有保存模型。</div>';
    return;
  }
  const searchTerm = adminPresetSearchTerm.trim();
  if (searchTerm) {
    // Searching by ID short-circuits grouping/pagination entirely — this is meant to jump
    // straight to one specific model, not browse a filtered subset page by page.
    const matches = presets.filter((preset) => String(preset.numericId || "").startsWith(searchTerm));
    adminPresetList.innerHTML = matches.length
      ? `<div class="admin-preset-group">
          <h4 class="admin-preset-group-title">搜索结果（${matches.length}）</h4>
          ${matches.map((preset) => renderAdminPresetCard(preset, presets)).join("")}
        </div>`
      : '<div class="ranking-empty">没有匹配这个数字ID的模型。</div>';
    adminPresetList.scrollTop = previousScrollTop;
    return;
  }
  const roots = presets.filter((preset) => String(preset.originalModelId || "0") === "0");
  const derived = presets.filter((preset) => String(preset.originalModelId || "0") !== "0");
  adminPresetList.innerHTML = renderAdminPresetGroup("原始模型", roots, presets, {
    page: adminPresetRootPage, dataAttr: "admin-preset-root-page", buttonClass: "admin-preset-root-page-button",
  }) + renderAdminPresetGroup("衍生模型", derived, presets, {
    page: adminPresetDerivedPage, dataAttr: "admin-preset-derived-page", buttonClass: "admin-preset-derived-page-button",
  });
  adminPresetList.scrollTop = previousScrollTop;
}

if (adminPresetIdSearchInput) {
  adminPresetIdSearchInput.addEventListener("input", () => {
    adminPresetSearchTerm = adminPresetIdSearchInput.value;
    renderAdminPresetList();
  });
}

function openAdminPresetParamViewer(presetId) {
  const preset = adminPresetsCache.find((item) => item.id === presetId);
  if (!preset) return;
  const config = preset.config && typeof preset.config === "object" ? preset.config : {};
  const meta = preset.meta && typeof preset.meta === "object" ? preset.meta : {};
  const viewPreset = {
    ...config,
    label: preset.label || preset.name,
    strategyType: preset.strategyType || config.strategyType || "wave",
    meta: {
      ...meta,
      originalText: preset.originalText || meta.originalText || "",
      modelText: preset.modelText || meta.modelText || "",
    },
  };
  openPresetParamEditor(presetId, {
    preset: viewPreset,
    readonly: true,
    title: `查看参数：${preset.label || preset.name}`,
    subtitle: `Owner: ${preset.ownerValue || preset.ownerEmail || "public"} · 只读`,
  });
}

if (adminPresetList) {
  adminPresetList.addEventListener("click", (event) => {
    const target = event.target;
    const viewButton = target && target.closest ? target.closest(".admin-view-params-button") : null;
    if (viewButton) {
      openAdminPresetParamViewer(viewButton.dataset.presetId);
      return;
    }
    const rootPageButton = target && target.closest ? target.closest(".admin-preset-root-page-button") : null;
    if (rootPageButton) {
      adminPresetRootPage = Math.max(0, Number(rootPageButton.dataset.adminPresetRootPage) || 0);
      renderAdminPresetList();
      return;
    }
    const derivedPageButton = target && target.closest ? target.closest(".admin-preset-derived-page-button") : null;
    if (derivedPageButton) {
      adminPresetDerivedPage = Math.max(0, Number(derivedPageButton.dataset.adminPresetDerivedPage) || 0);
      renderAdminPresetList();
    }
  });
}

async function loadAdminPresets({ silent = false } = {}) {
  if (!adminPresetList) return;
  if (!silent) {
    adminPresetList.innerHTML = '<div class="ranking-empty">正在读取服务器模型...</div>';
  }
  try {
    const response = await fetch("/api/admin/presets", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取 admin 模型列表失败。");
    adminPresetsCache = Array.isArray(payload.presets) ? payload.presets : [];
    adminOwnerOptions = Array.isArray(payload.owners) ? payload.owners : ["public"];
    renderAdminPresetList();
  } catch (error) {
    adminPresetList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

let adminRankingCache = [];
let adminRankingSortKey = "updatedAt";
let adminRankingSortDirection = "desc";

const ADMIN_RANKING_COLUMNS = [
  { key: "ownerEmail", label: "Owner" },
  { key: "symbolName", label: "标的" },
  { key: "periodLabel", label: "区间" },
  { key: "presetLabel", label: "模型" },
  { key: "strategyType", label: "类型" },
  { key: "returnRate", label: "回报率" },
  { key: "annualizedReturn", label: "年化" },
  { key: "maxDrawdown", label: "最大回撤" },
  { key: "excessReturn", label: "超额收益" },
  { key: "trades", label: "交易次数" },
  { key: "updatedAt", label: "更新时间" },
];

function getAdminRankingSortValue(record, key) {
  if (key === "ownerEmail") return record.ownerEmail || "public";
  if (key === "symbolName") return record.symbolName || record.symbol || "";
  if (key === "periodLabel") return record.periodLabel || "";
  if (key === "presetLabel") return record.presetLabel || record.presetName || "";
  if (key === "strategyType") return getStrategyTypeLabel(record.strategyType || "wave");
  if (key === "updatedAt") return record.updatedAt || "";
  return Number(record[key]) || 0;
}

function sortAdminRankingRecords(records) {
  const key = adminRankingSortKey;
  const dir = adminRankingSortDirection === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const va = getAdminRankingSortValue(a, key);
    const vb = getAdminRankingSortValue(b, key);
    if (typeof va === "string" || typeof vb === "string") {
      return dir * String(va).localeCompare(String(vb), "zh-CN");
    }
    return dir * (va - vb);
  });
}

function renderAdminRankingList() {
  if (!adminRankingList) return;
  if (!adminRankingCache.length) {
    adminRankingList.innerHTML = '<div class="ranking-empty">还没有历史测试记录。</div>';
    return;
  }
  const sorted = sortAdminRankingRecords(adminRankingCache);
  const rows = sorted.map((record) => {
    const returnClass = record.returnRate > 0 ? "up" : record.returnRate < 0 ? "down" : "";
    const hasSnapshot = hasRankingPresetSnapshot(record);
    return `
      <tr>
        <td>${escapeHtml(record.ownerEmail || "public")}</td>
        <td>${escapeHtml(record.symbolName || record.symbol || "")} (${escapeHtml(record.symbol || "")})</td>
        <td>${escapeHtml(record.periodLabel || "")}</td>
        <td>${escapeHtml(record.presetLabel || record.presetName || "")}</td>
        <td>${escapeHtml(getStrategyTypeLabel(record.strategyType || "wave"))}</td>
        <td class="${returnClass}">${formatPercent(record.returnRate)}</td>
        <td>${formatPercent(record.annualizedReturn)}</td>
        <td>${formatPercent(record.maxDrawdown)}</td>
        <td>${formatPercent(record.excessReturn)}</td>
        <td>${record.trades || 0}</td>
        <td>${escapeHtml(formatAdminDate(record.updatedAt))}</td>
        <td class="admin-scan-actions">
          <button type="button" class="admin-ranking-view-params-button" data-ranking-key="${escapeHtml(record.key)}"${hasSnapshot ? "" : " disabled"}>查看参数</button>
          <button type="button" class="admin-ranking-rerun-button" data-ranking-key="${escapeHtml(record.key)}"${hasSnapshot ? "" : " disabled"}>交易记录</button>
        </td>
      </tr>
    `;
  }).join("");
  const headerCells = ADMIN_RANKING_COLUMNS.map((column) => {
    const active = adminRankingSortKey === column.key;
    const arrow = active ? (adminRankingSortDirection === "asc" ? " ▲" : " ▼") : "";
    return `<th class="admin-scan-sort-header${active ? " active" : ""}" data-admin-ranking-sort-key="${column.key}">${escapeHtml(column.label)}${arrow}</th>`;
  }).join("");
  adminRankingList.innerHTML = `
    <table class="admin-ranking-table">
      <thead>
        <tr>${headerCells}<th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

if (adminRankingList) {
  adminRankingList.addEventListener("click", (event) => {
    const target = event.target;
    const viewParamsButton = target && target.closest ? target.closest(".admin-ranking-view-params-button") : null;
    if (viewParamsButton) {
      const record = adminRankingCache.find((item) => item.key === viewParamsButton.dataset.rankingKey);
      if (record) openRankingRecordParamSnapshot(record);
      return;
    }
    const rerunButton = target && target.closest ? target.closest(".admin-ranking-rerun-button") : null;
    if (rerunButton) {
      openAdminRankingRerun(rerunButton.dataset.rankingKey);
      return;
    }
    const sortHeader = target && target.closest ? target.closest(".admin-scan-sort-header[data-admin-ranking-sort-key]") : null;
    if (!sortHeader) return;
    const key = sortHeader.dataset.adminRankingSortKey;
    if (adminRankingSortKey === key) {
      adminRankingSortDirection = adminRankingSortDirection === "asc" ? "desc" : "asc";
    } else {
      adminRankingSortKey = key;
      adminRankingSortDirection = "desc";
    }
    renderAdminRankingList();
  });
}

async function loadAdminRankings() {
  if (!adminRankingList) return;
  adminRankingList.innerHTML = '<div class="ranking-empty">正在读取历史测试记录...</div>';
  try {
    const response = await fetch("/api/admin/rankings", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取历史测试记录失败。");
    adminRankingCache = Array.isArray(payload.records) ? payload.records : [];
    renderAdminRankingList();
  } catch (error) {
    adminRankingList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

let adminScanCache = [];
let adminScanPage = 0;
const adminScanPageSize = 10;
// Default sort is "most stable first" — smallest gap between train-period and the MOST RECENT
// validation year's annualized return, not highest raw return (see
// scripts/universe/run-optimization-scan.js's train/test split methodology — validation is two
// separate 1-year windows, never blended into one number).
let adminScanSortKey = "annualizedDiffYear2";
let adminScanSortDirection = "asc";
let adminScanFilterSymbol = "";
let adminScanFilterBuyHoldMax = 50;
let adminScanFilterBestReturnMin = 100;
let adminScanFilterMarket = "";
let adminScanFilterChip = false;
let adminScanFilterTech = false;
let adminScanFilterQqq = false;

const ADMIN_SCAN_COLUMNS = [
  { key: "symbolName", label: "标的" },
  { key: "presetLabel", label: "模型" },
  { key: "strategyType", label: "类型" },
  { key: "baselineReturnRate", label: "原参数收益率" },
  { key: "bestReturnRate", label: "优化后收益率" },
  { key: "improvement", label: "提升" },
  { key: "bestMaxDrawdown", label: "最大回撤" },
  { key: "buyHoldReturnRate", label: "全仓买入持有收益率" },
  { key: "vsBuyHold", label: "跑赢买入持有" },
  { key: "trainAnnualizedReturn", label: "训练期年化收益率" },
  { key: "testYear1AnnualizedReturn", label: "验证期年化收益率(第1年)" },
  { key: "testYear2AnnualizedReturn", label: "验证期年化收益率(第2年)" },
  { key: "annualizedDiffYear1", label: "年化差异(第1年)" },
  { key: "annualizedDiffYear2", label: "年化差异(第2年)" },
  { key: "bestTrades", label: "交易次数" },
  { key: "testedCandidates", label: "测试组合数" },
  { key: "scannedAt", label: "扫描时间" },
];

function getAdminScanSortValue(record, key) {
  if (key === "improvement") return record.bestReturnRate - record.baselineReturnRate;
  if (key === "vsBuyHold") return record.bestReturnRate - record.buyHoldReturnRate;
  if (key === "symbolName") return record.symbolName || record.symbol || "";
  if (key === "presetLabel") return record.presetLabel || "";
  if (key === "strategyType") return getStrategyTypeLabel(record.strategyType || "wave");
  if (key === "scannedAt") return record.scannedAt || "";
  return Number(record[key]) || 0;
}

function filterAdminScanRecords(records) {
  const symbolQuery = adminScanFilterSymbol.trim().toUpperCase();
  return records.filter((record) => {
    if (symbolQuery) {
      const haystack = `${record.symbol || ""} ${record.symbolName || ""}`.toUpperCase();
      if (!haystack.includes(symbolQuery)) return false;
    }
    if (Number.isFinite(adminScanFilterBuyHoldMax) && !(record.buyHoldReturnRate < adminScanFilterBuyHoldMax)) return false;
    if (Number.isFinite(adminScanFilterBestReturnMin) && !(record.bestReturnRate > adminScanFilterBestReturnMin)) return false;
    if (adminScanFilterMarket && record.market !== adminScanFilterMarket) return false;
    if (adminScanFilterChip && !record.isChip) return false;
    if (adminScanFilterTech && !record.isTech) return false;
    if (adminScanFilterQqq && !record.isQqq) return false;
    return true;
  });
}

// A record whose trainStartDate is empty has never been scanned under the train/test
// methodology — its trainAnnualizedReturn/testYear1*/testYear2*/annualizedDiff* are just
// unset-default zeros, not a genuine "diff of 0" (which would misleadingly look like the
// most stable result of all). Sorting by any of these columns pushes such records to
// the end regardless of direction, matching the server's own default ORDER BY.
const ADMIN_TRAIN_TEST_SORT_KEYS = new Set([
  "trainAnnualizedReturn", "testYear1AnnualizedReturn", "testYear2AnnualizedReturn",
  "annualizedDiffYear1", "annualizedDiffYear2", "maxAnnualizedDiff", "avgTestAnnualizedReturn",
  "tradeCountDiff",
]);

function sortAdminScanRecords(records) {
  const key = adminScanSortKey;
  const dir = adminScanSortDirection === "asc" ? 1 : -1;
  const isTrainTestKey = ADMIN_TRAIN_TEST_SORT_KEYS.has(key);
  return [...records].sort((a, b) => {
    if (isTrainTestKey) {
      const aMigrated = Boolean(a.trainStartDate);
      const bMigrated = Boolean(b.trainStartDate);
      if (aMigrated !== bMigrated) return aMigrated ? -1 : 1;
    }
    const va = getAdminScanSortValue(a, key);
    const vb = getAdminScanSortValue(b, key);
    if (typeof va === "string" || typeof vb === "string") {
      return dir * String(va).localeCompare(String(vb), "zh-CN");
    }
    return dir * (va - vb);
  });
}

// Generic client-side pagination bar, shared by any admin list that slices a sorted/filtered
// array by page — `dataAttr` is the kebab-case data-* attribute name the caller's own
// delegated click handler reads (e.g. "admin-scan-page" -> event.target.dataset.adminScanPage).
function renderAdminListPagination(page, pageCount, totalRecords, dataAttr, ariaLabel, buttonClass) {
  if (pageCount <= 1) return "";
  return `
    <div class="ranking-pagination" aria-label="${escapeHtml(ariaLabel)}">
      <span>第 ${page + 1} / ${pageCount} 页，共 ${totalRecords} 条</span>
      <div>
        <button class="ranking-page-button ${buttonClass}" type="button" data-${dataAttr}="${page - 1}"${page <= 0 ? " disabled" : ""}>上一页</button>
        <button class="ranking-page-button ${buttonClass}" type="button" data-${dataAttr}="${page + 1}"${page >= pageCount - 1 ? " disabled" : ""}>下一页</button>
      </div>
    </div>
  `;
}

function renderAdminScanPagination(page, pageCount, totalRecords) {
  return renderAdminListPagination(page, pageCount, totalRecords, "admin-scan-page", "后台模型排行分页", "admin-scan-page-button");
}

function renderAdminScanList() {
  if (!adminScanList) return;

  if (adminScanFilterSummary) {
    const activeFilters = Boolean(adminScanFilterSymbol) || Number.isFinite(adminScanFilterBuyHoldMax) || Number.isFinite(adminScanFilterBestReturnMin)
      || Boolean(adminScanFilterMarket) || adminScanFilterChip || adminScanFilterTech || adminScanFilterQqq;
    adminScanFilterSummary.textContent = activeFilters
      ? `共 ${adminScanCache.length} 条，符合筛选条件 ${filterAdminScanRecords(adminScanCache).length} 条`
      : `共 ${adminScanCache.length} 条`;
  }

  const filtered = filterAdminScanRecords(adminScanCache);
  if (!filtered.length) {
    adminScanList.innerHTML = `<div class="ranking-empty">${adminScanCache.length ? "没有符合筛选条件的记录。" : "还没有后台优化扫描结果。"}</div>`;
    return;
  }
  const sorted = sortAdminScanRecords(filtered);
  const pageCount = Math.max(1, Math.ceil(sorted.length / adminScanPageSize));
  adminScanPage = Math.min(Math.max(0, adminScanPage), pageCount - 1);
  const pageStart = adminScanPage * adminScanPageSize;
  const pageRecords = sorted.slice(pageStart, pageStart + adminScanPageSize);
  const paginationHtml = renderAdminScanPagination(adminScanPage, pageCount, sorted.length);
  const rows = pageRecords.map((record) => {
    const improvement = record.bestReturnRate - record.baselineReturnRate;
    const improvementClass = improvement > 0 ? "up" : improvement < 0 ? "down" : "";
    const bestClass = record.bestReturnRate > 0 ? "up" : record.bestReturnRate < 0 ? "down" : "";
    const vsBuyHold = record.bestReturnRate - record.buyHoldReturnRate;
    const vsBuyHoldClass = vsBuyHold > 0 ? "up" : vsBuyHold < 0 ? "down" : "";
    const trainClass = record.trainAnnualizedReturn > 0 ? "up" : record.trainAnnualizedReturn < 0 ? "down" : "";
    const testYear1Class = record.testYear1AnnualizedReturn > 0 ? "up" : record.testYear1AnnualizedReturn < 0 ? "down" : "";
    const testYear2Class = record.testYear2AnnualizedReturn > 0 ? "up" : record.testYear2AnnualizedReturn < 0 ? "down" : "";
    const hasTrainTest = Boolean(record.trainStartDate);
    return `
      <tr>
        <td>${escapeHtml(record.symbolName || record.symbol || "")} (${escapeHtml(record.symbol || "")})</td>
        <td>${formatModelNameLink({
          id: record.presetId, numericId: record.presetNumericId, label: record.presetLabel || "",
          config: record.bestConfig, strategyType: record.strategyType, symbol: record.symbol,
          isOwner: false, name: null,
        })}</td>
        <td>${escapeHtml(getStrategyTypeLabel(record.strategyType || "wave"))}</td>
        <td>${formatPercent(record.baselineReturnRate)}</td>
        <td class="${bestClass}">${formatPercent(record.bestReturnRate)}</td>
        <td class="${improvementClass}">${formatPercent(improvement)}</td>
        <td>${formatPercent(record.bestMaxDrawdown)}</td>
        <td>${formatPercent(record.buyHoldReturnRate)}</td>
        <td class="${vsBuyHoldClass}">${formatPercent(vsBuyHold)}</td>
        <td class="${trainClass}">${hasTrainTest ? formatPercent(record.trainAnnualizedReturn) : "待重新扫描"}</td>
        <td class="${testYear1Class}">${hasTrainTest ? formatPercent(record.testYear1AnnualizedReturn) : "待重新扫描"}</td>
        <td class="${testYear2Class}">${hasTrainTest ? formatPercent(record.testYear2AnnualizedReturn) : "待重新扫描"}</td>
        <td>${hasTrainTest ? formatPercent(record.annualizedDiffYear1) : "--"}</td>
        <td>${hasTrainTest ? formatPercent(record.annualizedDiffYear2) : "--"}</td>
        <td>${record.bestTrades || 0}</td>
        <td>${record.testedCandidates || 0}</td>
        <td>${escapeHtml(formatAdminDate(record.scannedAt))}</td>
        <td class="admin-scan-actions">
          <button type="button" class="admin-view-params-button" data-scan-id="${escapeHtml(record.id)}">查看参数</button>
          <button type="button" class="admin-scan-save-button" data-scan-id="${escapeHtml(record.id)}">另存为模型</button>
          <button type="button" class="admin-scan-rerun-button" data-scan-id="${escapeHtml(record.id)}">重新运行</button>
        </td>
      </tr>
    `;
  }).join("");
  const headerCells = ADMIN_SCAN_COLUMNS.map((column) => {
    const active = adminScanSortKey === column.key;
    const arrow = active ? (adminScanSortDirection === "asc" ? " ▲" : " ▼") : "";
    return `<th class="admin-scan-sort-header${active ? " active" : ""}" data-admin-scan-sort-key="${column.key}">${escapeHtml(column.label)}${arrow}</th>`;
  }).join("");
  adminScanList.innerHTML = `
    ${paginationHtml}
    <table class="admin-ranking-table">
      <thead>
        <tr>
          ${headerCells}
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${paginationHtml}
  `;
}

async function loadAdminScanResults() {
  if (!adminScanList) return;
  adminScanList.innerHTML = '<div class="ranking-empty">正在读取后台优化扫描结果...</div>';
  try {
    const response = await fetch("/api/admin/optimization-scan", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取后台优化扫描结果失败。");
    adminScanCache = Array.isArray(payload.records) ? payload.records : [];
    adminScanPage = 0;
    renderAdminScanList();
  } catch (error) {
    adminScanList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

// Shared default-naming rule for "另存为模型" across 后台模型排行 and AI自动生成: 股票代码
// + 验证期年化收益 + 验证期交易次数 + 原模型名缩写(前6字符) — the caller passes in the WORSE
// of the two validation years (not train, and not the better year) since that's the
// out-of-sample figure that actually reflects whether the model held up, consistent with
// reachedTarget requiring both years to clear the target.
function buildAutoSaveLabel({ symbol, annualizedReturn, trades, modelLabel }) {
  const symbolPart = String(symbol || "").trim();
  const returnPart = Number.isFinite(annualizedReturn) ? `${annualizedReturn >= 0 ? "+" : ""}${annualizedReturn.toFixed(1)}%` : "";
  const tradesPart = Number.isFinite(trades) ? `${trades}笔` : "";
  const modelPart = String(modelLabel || "").trim().slice(0, 6);
  return [symbolPart, returnPart, tradesPart, modelPart].filter(Boolean).join(" ").slice(0, 60);
}

function openAdminScanParamViewer(scanId) {
  const record = adminScanCache.find((item) => item.id === scanId);
  if (!record) return;
  const config = record.bestConfig && typeof record.bestConfig === "object" ? record.bestConfig : {};
  const viewPreset = {
    ...config,
    label: `${record.presetLabel} · ${record.symbolName || record.symbol}`,
    strategyType: record.strategyType || config.strategyType || "wave",
  };
  openPresetParamEditor(scanId, {
    preset: viewPreset,
    readonly: true,
    title: `查看优化后参数：${record.symbolName || record.symbol}（${record.presetLabel}）`,
    subtitle: `优化后收益率 ${formatPercent(record.bestReturnRate)} · 最大回撤 ${formatPercent(record.bestMaxDrawdown)} · 只读`,
    saveDefaultLabel: buildAutoSaveLabel({
      symbol: record.symbol,
      annualizedReturn: Math.min(record.testYear1AnnualizedReturn, record.testYear2AnnualizedReturn),
      trades: record.testYear2Trades,
      modelLabel: record.presetLabel,
    }),
  });
}

async function saveAdminScanRecordAsPreset(scanId) {
  const record = adminScanCache.find((item) => item.id === scanId);
  if (!record) return;
  const defaultLabel = buildAutoSaveLabel({
    symbol: record.symbol,
    annualizedReturn: Math.min(record.testYear1AnnualizedReturn, record.testYear2AnnualizedReturn),
    trades: record.testYear2Trades,
    modelLabel: record.presetLabel,
  });
  const label = window.prompt("输入新模型名称：", defaultLabel);
  if (label === null) return;
  const trimmed = label.trim().slice(0, 80);
  if (!trimmed) {
    setStatus("模型名称不能为空。", true);
    return;
  }
  const preset = createPresetFromConfig(trimmed, record.bestConfig || {}, {
    targetSymbol: record.symbol,
    creator: "auto",
    createdAt: todayText(),
    updatedAt: todayText(),
    originalText: `后台批量优化扫描：${record.symbolName || record.symbol}（${record.symbol}），基于模型「${record.presetLabel}」重新优化参数。`,
    originalModelId: record.presetId,
  });
  const presetName = await saveGeneratedPreset(preset);
  if (presetName) {
    setStatus(`已另存为模型：${strategyPresets[presetName].label}。`);
  }
}

let adminRerunState = null;
let adminRerunChartZoom = 1;

function setAdminRerunChartZoom(nextZoom) {
  adminRerunChartZoom = Math.min(12, Math.max(1, nextZoom));
  if (adminRerunState) renderAdminRerunFrame();
}

function stopAdminRerunPlayback() {
  if (adminRerunState && adminRerunState.timerId) {
    window.clearInterval(adminRerunState.timerId);
    adminRerunState.timerId = null;
  }
  if (adminRerunState) adminRerunState.playing = false;
  if (adminRerunPlayButton) adminRerunPlayButton.disabled = false;
  if (adminRerunPauseButton) adminRerunPauseButton.disabled = true;
}

function renderAdminRerunTradeListHtml(trades) {
  if (!trades || trades.length === 0) {
    return '<div class="ranking-empty">还没有产生交易。</div>';
  }
  // Reversed (most recent first) to match renderTradeLog's convention; data-trade-index
  // indexes into this same reversed order so the click handler can look the row back up.
  const reversed = trades.slice().reverse();
  const rows = reversed.map((trade, index) => {
    const reference = trade.reference
      ? `${trade.reference.label} ${trade.reference.date} ${formatPrice(trade.reference.price)}`
      : "--";
    return `
    <tr class="${trade.side}" data-trade-index="${index}">
      <td>${escapeHtml(trade.date)}</td>
      <td>${trade.side === "buy" ? "买入" : "卖出"}</td>
      <td>${formatPrice(trade.price)}</td>
      <td>${formatShares(trade.shares)}</td>
      <td>${formatPercent(trade.positionRatio)}</td>
      <td>${formatMoney(Number.isFinite(trade.accountCash) ? trade.accountCash : 0)}</td>
      <td>${formatMoney(trade.accountEquity || 0)}</td>
      <td>${formatMoney(trade.fee || 0)}</td>
      <td>${escapeHtml(reference)}</td>
      <td>${escapeHtml(trade.reason || "--")}</td>
    </tr>
  `;
  }).join("");
  return `
    <table class="admin-ranking-table">
      <thead>
        <tr>
          <th>日期</th>
          <th>方向</th>
          <th>价格</th>
          <th>数量</th>
          <th>仓位</th>
          <th>现金</th>
          <th>总资产</th>
          <th>费用</th>
          <th>参考点</th>
          <th>原因</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function openAdminRerunTradeDetail(trade) {
  if (!adminRerunState || !trade) return;
  if (adminRerunTradeDetailPanel) adminRerunTradeDetailPanel.classList.remove("hidden");
  if (adminRerunTradeDetailTitle) {
    adminRerunTradeDetailTitle.textContent = `${trade.date} ${trade.label} ${formatPrice(trade.price)} · ${trade.reason || ""}`;
  }
  if (adminRerunTradeDetailSummary) {
    const reference = trade.reference
      ? `${trade.reference.label}：${trade.reference.date}，价格 ${formatPrice(trade.reference.price)}`
      : "无参考点";
    adminRerunTradeDetailSummary.innerHTML = `
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
  if (!adminRerunTradeDetailChart) return;
  const visibleStates = adminRerunState.states.slice(0, adminRerunState.index + 1);
  drawTradePriceChartInto(adminRerunTradeDetailChart, 4, visibleStates, {
    selectedTrade: trade,
    strategyType: adminRerunState.strategyType,
  });
  window.requestAnimationFrame(() => {
    const wrap = adminRerunTradeDetailChart.parentElement;
    if (!wrap) return;
    const count = Math.max(1, adminRerunState.rows.length - 1);
    const rowIndex = Math.max(0, Math.min(Number(trade.rowIndex) || 0, count));
    const ratio = rowIndex / count;
    wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) * ratio - wrap.clientWidth * 0.35);
  });
}

function renderAdminRerunFrame() {
  if (!adminRerunState) return;
  const { rows, states, index, allTrades } = adminRerunState;
  const state = states[index];

  try {
    if (adminRerunChartSvg) {
      drawModelOrderPriceChartInto(adminRerunChartSvg, rows, allTrades, { zoom: adminRerunChartZoom, upToIndex: index });
      // The chart is drawn at a fixed width well beyond most viewports (drawModelOrderPriceChartInto
      // floors it at 720px times zoom) so it scrolls horizontally inside .trade-price-wrap. Without
      // this, the animating "current day" point drawn during playback scrolls out of the visible
      // window almost immediately on a narrow (mobile) screen, making the chart look frozen/blank
      // even though it's still drawing — keep the current index centered every frame instead.
      const wrap = adminRerunChartSvg.parentElement;
      if (wrap) {
        const count = Math.max(1, rows.length - 1);
        const ratio = index / count;
        wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) * ratio - wrap.clientWidth * 0.35);
      }
    }
  } catch (error) {
    console.error("重跑图表渲染失败：", error);
  }
  // Everything below — including the "did the trade count change" check itself — is
  // inside one try block on purpose: any throw anywhere in here (not just inside the
  // innerHTML assignment) must still land in the catch, or the panel stays exactly as
  // it was before this call (blank, since it starts empty on dialog open) with no
  // visible sign anything went wrong.
  try {
    const trades = Array.isArray(state.trades) ? state.trades : [];
    // Rebuilding a table with hundreds/thousands of rows every ~33ms tick is wasted work
    // once the trade count hasn't actually changed since the last frame — skip it.
    if (adminRerunTradeList && trades.length !== adminRerunState.lastRenderedTradeCount) {
      adminRerunTradeList.innerHTML = renderAdminRerunTradeListHtml(trades);
      adminRerunState.lastRenderedTradeCount = trades.length;
      adminRerunState.lastRenderedTrades = trades.slice().reverse();
    }
  } catch (error) {
    console.error("重跑交易明细渲染失败：", error);
    // Surface the failure instead of silently leaving the panel blank — otherwise a
    // thrown error here reads to the user as "trades never show" with no clue why.
    if (adminRerunTradeList) {
      adminRerunTradeList.innerHTML = `<div class="ranking-empty">交易明细渲染出错：${escapeHtml(error && error.message || String(error))}</div>`;
    }
  }
  if (adminRerunMetrics) {
    adminRerunMetrics.innerHTML = `
      <article><span>当前日期</span><strong>${escapeHtml(rows[index].date)}</strong></article>
      <article><span>收益率</span><strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(state.returnRate)}</strong></article>
      <article><span>年化收益率</span><strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(annualizeReturnByTradingDays(state.returnRate, index + 1))}</strong></article>
      <article><span>最大回撤</span><strong>${formatPercent(state.maxDrawdown)}</strong></article>
      <article><span>持仓比例</span><strong>${formatPercent(state.positionRatio)}</strong></article>
      <article><span>总资产</span><strong>${formatMoney(state.equity)}</strong></article>
      <article><span>交易次数</span><strong>${state.trades.length}</strong></article>
    `;
  }
  if (adminRerunProgressLabel) {
    adminRerunProgressLabel.textContent = `${index + 1} / ${rows.length} 个交易日`;
  }
}

function advanceAdminRerunPlayback() {
  if (!adminRerunState) return;
  const { rows } = adminRerunState;
  const step = Math.max(1, Math.ceil(rows.length / 180));
  adminRerunState.index = Math.min(rows.length - 1, adminRerunState.index + step);
  renderAdminRerunFrame();
  if (adminRerunState.index >= rows.length - 1) {
    stopAdminRerunPlayback();
  }
}

function startAdminRerunPlayback() {
  if (!adminRerunState) return;
  stopAdminRerunPlayback();
  if (adminRerunState.index >= adminRerunState.rows.length - 1) {
    adminRerunState.index = 0;
  }
  adminRerunState.playing = true;
  adminRerunState.timerId = window.setInterval(advanceAdminRerunPlayback, 33);
  if (adminRerunPlayButton) adminRerunPlayButton.disabled = true;
  if (adminRerunPauseButton) adminRerunPauseButton.disabled = false;
}

function skipAdminRerunToEnd() {
  if (!adminRerunState) return;
  stopAdminRerunPlayback();
  adminRerunState.index = adminRerunState.rows.length - 1;
  renderAdminRerunFrame();
}

function restartAdminRerunPlayback() {
  if (!adminRerunState) return;
  stopAdminRerunPlayback();
  adminRerunState.index = 0;
  renderAdminRerunFrame();
  startAdminRerunPlayback();
}

// Shared by openAdminRerun (后台模型排行's "重新运行") and openAdminRankingRerun (历史测试
//记录's "交易记录") — both do the same thing (load a symbol's history for a specific date
// range, re-simulate a given config against it client-side, and play back the resulting
// trades in adminRerunDialog); they only differ in which record shape they pull
// symbol/config/label/date-range out of.
async function runAdminRerunPlayback({ title, symbol, config, strategyType, start, end }) {
  stopAdminRerunPlayback();
  adminRerunState = null;
  if (adminRerunTitle) adminRerunTitle.textContent = title;
  if (adminRerunSubtitle) adminRerunSubtitle.textContent = "正在加载历史数据...";
  if (adminRerunChartSvg) adminRerunChartSvg.innerHTML = "";
  if (adminRerunTradeList) adminRerunTradeList.innerHTML = "";
  if (adminRerunMetrics) adminRerunMetrics.innerHTML = "";
  if (adminRerunProgressLabel) adminRerunProgressLabel.textContent = "";
  if (adminRerunTradeDetailPanel) adminRerunTradeDetailPanel.classList.add("hidden");
  showDialog(adminRerunDialog);

  try {
    const params = new URLSearchParams({ code: symbol, start, end });
    const response = await fetch(`/api/klines?${params.toString()}`);
    const result = await readJsonResponse(response, "历史行情读取失败。");
    const rows = (result.rows || []).filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close)
      && row.close > 0 && Number.isFinite(row.high) && Number.isFinite(row.low));
    if (rows.length < 2) {
      throw new Error("历史数据不足，无法回测。");
    }

    const fullConfig = { initialCash: 2000000, tradeFee: 5, ...config };
    const savedCode = codeInput.value;
    codeInput.value = symbol;
    let states;
    try {
      states = buildBacktestStates(rows, fullConfig);
    } finally {
      codeInput.value = savedCode;
    }

    const finalTrades = Array.isArray(states[states.length - 1].trades) ? states[states.length - 1].trades : [];
    adminRerunState = {
      rows, states, index: 0, playing: false, timerId: null,
      lastRenderedTradeCount: -1, lastRenderedTrades: [],
      allTrades: finalTrades, strategyType: strategyType || fullConfig.strategyType || "wave",
    };
    adminRerunChartZoom = 1;
    if (adminRerunSubtitle) {
      adminRerunSubtitle.textContent = `${rows.length} 个交易日 · ${start} 至 ${end} · 初始资金 ¥2,000,000 · 数据源 ${result.source || ""}`;
    }
    renderAdminRerunFrame();
    startAdminRerunPlayback();
  } catch (error) {
    if (adminRerunSubtitle) adminRerunSubtitle.textContent = `加载失败：${error.message || "未知错误"}`;
  }
}

async function openAdminRerun(scanId) {
  const record = adminScanCache.find((item) => item.id === scanId);
  if (!record || !adminRerunDialog) return;
  await runAdminRerunPlayback({
    title: `重新运行：${record.symbolName || record.symbol}（${record.presetLabel}）`,
    symbol: record.symbol,
    config: record.bestConfig || {},
    strategyType: record.strategyType,
    start: formatDate(shiftYears(new Date(), -5)),
    end: todayText(),
  });
}

// Replays the EXACT config snapshot and date range that produced a 历史测试记录 row — not
// today's 5-year window like openAdminRerun above — so the trades shown genuinely match the
// return/drawdown numbers already displayed in that row, even if the underlying preset has
// since been edited.
async function openAdminRankingRerun(recordKey) {
  const record = adminRankingCache.find((item) => item.key === recordKey);
  if (!record || !adminRerunDialog) return;
  if (!hasRankingPresetSnapshot(record)) {
    setStatus("这条记录没有保存参数快照，无法查看交易记录。", true);
    return;
  }
  await runAdminRerunPlayback({
    title: `交易记录：${record.symbolName || record.symbol}（${record.presetLabel}）`,
    symbol: record.symbol,
    config: record.presetConfigSnapshot || {},
    strategyType: record.strategyType,
    start: record.startDate || formatDate(shiftYears(new Date(), -(record.periodYears || 5))),
    end: record.endDate || todayText(),
  });
}

if (closeAdminRerunButton) {
  closeAdminRerunButton.addEventListener("click", () => {
    stopAdminRerunPlayback();
    closeDialog(adminRerunDialog);
  });
}
if (adminRerunPlayButton) {
  adminRerunPlayButton.addEventListener("click", () => startAdminRerunPlayback());
}
if (adminRerunPauseButton) {
  adminRerunPauseButton.addEventListener("click", () => stopAdminRerunPlayback());
}
if (adminRerunSkipButton) {
  adminRerunSkipButton.addEventListener("click", () => skipAdminRerunToEnd());
}
if (adminRerunRestartButton) {
  adminRerunRestartButton.addEventListener("click", () => restartAdminRerunPlayback());
}
if (adminRerunZoomOutButton) {
  adminRerunZoomOutButton.addEventListener("click", () => setAdminRerunChartZoom(adminRerunChartZoom - 1));
}
if (adminRerunZoomResetButton) {
  adminRerunZoomResetButton.addEventListener("click", () => setAdminRerunChartZoom(1));
}
if (adminRerunZoomInButton) {
  adminRerunZoomInButton.addEventListener("click", () => setAdminRerunChartZoom(adminRerunChartZoom + 1));
}
if (adminRerunTradeList) {
  adminRerunTradeList.addEventListener("click", (event) => {
    const target = event.target;
    const row = target && target.closest ? target.closest("[data-trade-index]") : null;
    if (!row || !adminRerunState) return;
    const trade = adminRerunState.lastRenderedTrades[Number(row.dataset.tradeIndex)];
    if (trade) openAdminRerunTradeDetail(trade);
  });
}

if (adminScanList) {
  adminScanList.addEventListener("click", (event) => {
    const target = event.target;
    const viewButton = target && target.closest ? target.closest(".admin-view-params-button") : null;
    if (viewButton) {
      openAdminScanParamViewer(viewButton.dataset.scanId);
      return;
    }
    const saveButton = target && target.closest ? target.closest(".admin-scan-save-button") : null;
    if (saveButton) {
      saveAdminScanRecordAsPreset(saveButton.dataset.scanId);
      return;
    }
    const rerunButton = target && target.closest ? target.closest(".admin-scan-rerun-button") : null;
    if (rerunButton) {
      openAdminRerun(rerunButton.dataset.scanId);
      return;
    }
    const pageButton = target && target.closest ? target.closest(".admin-scan-page-button") : null;
    if (pageButton) {
      adminScanPage = Math.max(0, Number(pageButton.dataset.adminScanPage) || 0);
      renderAdminScanList();
      return;
    }
    const sortHeader = target && target.closest ? target.closest(".admin-scan-sort-header") : null;
    if (sortHeader) {
      const key = sortHeader.dataset.adminScanSortKey;
      if (adminScanSortKey === key) {
        adminScanSortDirection = adminScanSortDirection === "asc" ? "desc" : "asc";
      } else {
        adminScanSortKey = key;
        adminScanSortDirection = "desc";
      }
      adminScanPage = 0;
      renderAdminScanList();
    }
  });
}

if (adminAutoGenerateList) {
  adminAutoGenerateList.addEventListener("click", (event) => {
    const target = event.target;
    const viewParamsButton = target && target.closest ? target.closest(".admin-view-params-button") : null;
    if (viewParamsButton) {
      openAdminAutoGenerateParamViewer(viewParamsButton.dataset.presetId);
      return;
    }
    const rerunButton = target && target.closest ? target.closest(".admin-auto-generate-rerun-button") : null;
    if (rerunButton) {
      openAdminAutoGenerateRerun(rerunButton.dataset.presetId);
      return;
    }
    const sortHeader = target && target.closest ? target.closest(".admin-scan-sort-header") : null;
    if (sortHeader) {
      const key = sortHeader.dataset.adminAutoGenerateSortKey;
      if (adminAutoGenerateSortKey === key) {
        adminAutoGenerateSortDirection = adminAutoGenerateSortDirection === "asc" ? "desc" : "asc";
      } else {
        adminAutoGenerateSortKey = key;
        adminAutoGenerateSortDirection = "desc";
      }
      if (adminAutoGenerateLastPayload) renderAdminAutoGenerateList(adminAutoGenerateLastPayload);
    }
  });
}

function readAdminScanFilterInput(input) {
  if (!input || input.value.trim() === "") return null;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

if (adminScanApplyFilterButton) {
  adminScanApplyFilterButton.addEventListener("click", () => {
    adminScanFilterSymbol = adminScanFilterSymbolInput ? adminScanFilterSymbolInput.value : "";
    adminScanFilterBuyHoldMax = readAdminScanFilterInput(adminScanFilterBuyHoldMaxInput);
    adminScanFilterBestReturnMin = readAdminScanFilterInput(adminScanFilterBestReturnMinInput);
    adminScanFilterMarket = adminScanFilterMarketInput ? adminScanFilterMarketInput.value : "";
    adminScanFilterChip = Boolean(adminScanFilterChipInput && adminScanFilterChipInput.checked);
    adminScanFilterTech = Boolean(adminScanFilterTechInput && adminScanFilterTechInput.checked);
    adminScanFilterQqq = Boolean(adminScanFilterQqqInput && adminScanFilterQqqInput.checked);
    adminScanPage = 0;
    renderAdminScanList();
  });
}

if (adminScanClearFilterButton) {
  adminScanClearFilterButton.addEventListener("click", () => {
    adminScanFilterSymbol = "";
    adminScanFilterBuyHoldMax = null;
    adminScanFilterBestReturnMin = null;
    adminScanFilterMarket = "";
    adminScanFilterChip = false;
    adminScanFilterTech = false;
    adminScanFilterQqq = false;
    if (adminScanFilterSymbolInput) adminScanFilterSymbolInput.value = "";
    if (adminScanFilterBuyHoldMaxInput) adminScanFilterBuyHoldMaxInput.value = "";
    if (adminScanFilterBestReturnMinInput) adminScanFilterBestReturnMinInput.value = "";
    if (adminScanFilterMarketInput) adminScanFilterMarketInput.value = "";
    if (adminScanFilterChipInput) adminScanFilterChipInput.checked = false;
    if (adminScanFilterTechInput) adminScanFilterTechInput.checked = false;
    if (adminScanFilterQqqInput) adminScanFilterQqqInput.checked = false;
    adminScanPage = 0;
    renderAdminScanList();
  });
}

function renderAdminScanStatus(status) {
  if (!adminScanStatusSummary || !adminScanStatusModelList) return;
  const completionRate = status.totalPairs > 0 ? status.completedPairs / status.totalPairs : 0;
  // completedPairs/completionRate above come from the raw row count in
  // optimization_scan_results, which barely moves during a --rescan of models that were
  // already fully scanned before (a rescan updates existing rows in place). When the
  // server reports session-specific progress (only present while a scan job is actually
  // running), show that instead so a rescan's progress is actually visible.
  const sessionCard = status.sessionProgress ? `
    <article>
      <span>本次扫描进度</span>
      <strong>${formatPercent(status.sessionProgress.totalPairs > 0 ? (status.sessionProgress.completedPairs / status.sessionProgress.totalPairs) * 100 : 0)}</strong>
      <p>本次启动的扫描已完成 ${status.sessionProgress.completedPairs} / ${status.sessionProgress.totalPairs} 组（${status.sessionProgress.modelCount} 个模型 × ${status.eligibleStocks} 只股票）。</p>
    </article>
  ` : "";
  adminScanStatusSummary.innerHTML = `
    ${sessionCard}
    <article>
      <span>模型数</span>
      <strong>${status.totalModels}</strong>
      <p>当前未隐藏的已保存模型数量。</p>
    </article>
    <article>
      <span>股票数</span>
      <strong>${status.eligibleStocks} / ${status.totalStocks}</strong>
      <p>目标股票池共 ${status.totalStocks} 只，其中 ${status.eligibleStocks} 只历史数据达标（≥250个交易日）。</p>
    </article>
    <article>
      <span>组合测试完成率</span>
      <strong>${formatPercent(completionRate * 100)}</strong>
      <p>已完成 ${status.completedPairs} / ${status.totalPairs} 组（模型 × 股票）。</p>
    </article>
    <article>
      <span>股票测试完成率</span>
      <strong>${formatPercent(status.stockCompletionRate * 100)}</strong>
      <p>已跑完全部 ${status.totalModels} 个模型的股票有 ${status.stocksFullyTested} / ${status.eligibleStocks} 只。</p>
    </article>
    <article>
      <span>已尝试参数组合总次数</span>
      <strong>${formatCombinationCount(status.totalCandidatesTested)}</strong>
      <p>所有已完成组合累计测试过的候选参数总数。</p>
    </article>
  `;

  if (!status.perModel.length) {
    adminScanStatusModelList.innerHTML = '<div class="ranking-empty">还没有模型完成任何测试。</div>';
  } else {
    const rows = status.perModel.map((model) => `
      <tr>
        <td><input type="checkbox" class="admin-scan-model-checkbox" data-preset-id="${escapeHtml(model.presetId)}"></td>
        <td>${escapeHtml(model.label)}</td>
        <td>${escapeHtml(getStrategyTypeLabel(model.strategyType || "wave"))}</td>
        <td>${model.testedStocks} / ${model.eligibleStocks}</td>
        <td>${formatPercent(model.rate * 100)}</td>
      </tr>
    `).join("");
    adminScanStatusModelList.innerHTML = `
      <table class="admin-ranking-table">
        <thead>
          <tr>
            <th></th>
            <th>模型</th>
            <th>类型</th>
            <th>已测试股票 / 有效股票</th>
            <th>完成率</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const running = Boolean(status.scanRunning);
  if (adminScanRunSelectedButton) adminScanRunSelectedButton.disabled = running;
  if (adminScanRunAllButton) adminScanRunAllButton.disabled = running;

  const last = status.lastScanResult;
  const crashed = Boolean(last && last.exitCode !== 0);
  // One button, two modes: while a scan is running it pauses it; once paused/crashed and
  // idle, the same button resumes it — matches how the resume flow already works, a pause
  // is just a deliberate crash (see handleAdminOptimizationScanPauseApi).
  if (adminScanPauseResumeButton) {
    adminScanPauseResumeButton.classList.toggle("hidden", !running && !crashed);
    adminScanPauseResumeButton.disabled = false;
    if (running) {
      adminScanPauseResumeButton.textContent = "暂停扫描";
      adminScanPauseResumeButton.dataset.mode = "pause";
    } else if (crashed) {
      adminScanPauseResumeButton.textContent = "继续上次中断";
      adminScanPauseResumeButton.dataset.mode = "resume";
    }
  }

  if (adminScanRunStatus) {
    if (running) {
      adminScanRunStatus.textContent = `扫描进行中（由 ${status.scanInfo && status.scanInfo.triggeredBy || "?"} 于 ${escapeHtml(formatAdminDate(status.scanInfo && status.scanInfo.startedAt))} 启动）...`;
    } else if (crashed) {
      adminScanRunStatus.textContent = `上次扫描已暂停/中断（退出码 ${last.exitCode}，${escapeHtml(formatAdminDate(last.endedAt))}）——可以点"继续上次中断"接着跑，不会重复已经完成的部分。`;
    } else if (last) {
      adminScanRunStatus.textContent = `上次扫描已正常完成（${escapeHtml(formatAdminDate(last.endedAt))}）。`;
    } else {
      adminScanRunStatus.textContent = "";
    }
  }

  // status.progress is written live by run-optimization-scan.js itself (see its
  // writeProgress helper) and cleared by server.js right before a new run is spawned, so it
  // only ever reflects THIS session — no stale "currently on symbol X" from a finished or
  // crashed prior run can show through.
  const runningIsScan = running && status.scanInfo && status.scanInfo.jobType === "scan";
  if (adminScanProgressBanner) {
    const progress = status.progress;
    if (runningIsScan && progress) {
      const symbolLabel = progress.currentSymbol
        ? `股票 ${progress.symbolsStarted || "?"}/${progress.totalSymbols || "?"}（${escapeHtml(progress.currentSymbolName || progress.currentSymbol)} ${escapeHtml(progress.currentSymbol)}）`
        : `股票 ${progress.symbolsStarted || 0}/${progress.totalSymbols || "?"}`;
      const modelLabel = progress.currentPresetLabel
        ? `模型：${escapeHtml(progress.currentPresetLabel)}（${escapeHtml(getStrategyTypeLabel(progress.currentStrategyType))}）`
        : "";
      const detailParts = [symbolLabel, modelLabel].filter(Boolean).join(" · ");
      adminScanProgressBanner.classList.remove("hidden");
      adminScanProgressBanner.innerHTML = `
        <div class="admin-progress-banner-title"><span class="admin-progress-banner-dot"></span>后台扫描进行中</div>
        <div class="admin-progress-banner-detail">${detailParts}</div>
        <div class="admin-progress-banner-stats">
          <span>组合进度 <strong>${progress.pairIndex || 0}</strong>/${progress.totalPairs || "?"}</span>
          <span>每组候选参数 <strong>${progress.candidatesPerPair || "?"}</strong></span>
          <span>本次已测试参数组合 <strong>${formatCombinationCount(progress.sessionTestedCandidates || 0)}</strong></span>
          <span>跳过（已扫描过） <strong>${progress.skipped || 0}</strong></span>
          <span>跳过（数据不足） <strong>${progress.dataSkipped || 0}</strong></span>
        </div>
      `;
    } else {
      adminScanProgressBanner.classList.add("hidden");
      adminScanProgressBanner.innerHTML = "";
    }
  }

  if (running) {
    scheduleAdminScanStatusPoll();
  } else {
    stopAdminScanStatusPoll();
  }
}

let adminScanStatusPollTimer = null;

function scheduleAdminScanStatusPoll() {
  if (adminScanStatusPollTimer) return;
  adminScanStatusPollTimer = window.setInterval(() => {
    if (!adminScanStatusPanel || adminScanStatusPanel.classList.contains("hidden")) {
      stopAdminScanStatusPoll();
      return;
    }
    loadAdminScanStatus();
  }, 5000);
}

function stopAdminScanStatusPoll() {
  if (adminScanStatusPollTimer) {
    window.clearInterval(adminScanStatusPollTimer);
    adminScanStatusPollTimer = null;
  }
}

async function loadAdminScanStatus() {
  adminScanSymbolPicker.render();
  loadAdminSymbolHistory().then(() => adminScanSymbolPicker.render()).catch(() => {});
  if (!adminScanStatusSummary) return;
  // Skip the loading placeholder on background polls (while a scan is running) so the
  // already-rendered numbers don't flicker blank every 5 seconds — only show it on the
  // very first load, when there's nothing on screen yet.
  if (!adminScanStatusSummary.innerHTML.trim()) {
    adminScanStatusSummary.innerHTML = '<div class="ranking-empty">正在读取后台计算状态...</div>';
  }
  try {
    const response = await fetch("/api/admin/optimization-scan-status", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取后台计算状态失败。");
    renderAdminScanStatus(payload);
  } catch (error) {
    adminScanStatusSummary.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

async function triggerAdminScanRun(presetIds, options = {}) {
  if (adminScanRunStatus) adminScanRunStatus.textContent = options.resume ? "正在继续上次中断的扫描..." : "正在启动扫描...";
  const trainYearsAgoInput = document.querySelector("#adminScanTrainYearsAgo");
  const testYearsAgoInput = document.querySelector("#adminScanTestYearsAgo");
  const symbols = adminScanSymbolPicker.getSelected();
  const requested = {
    trainYears: trainYearsAgoInput ? Number(trainYearsAgoInput.value) || 4 : 4,
    testYears: testYearsAgoInput ? Number(testYearsAgoInput.value) || 2 : 2,
  };
  try {
    const response = await fetch("/api/admin/optimization-scan/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetIds, symbols, resume: Boolean(options.resume), ...requested }),
    });
    const result = await readJsonResponse(response, "启动扫描失败。");
    const adjustments = ["trainYears", "testYears"]
      .filter((key) => !options.resume && Number.isFinite(result[key]) && result[key] !== requested[key])
      .map((key) => `${key} ${requested[key]}→${result[key]}`);
    const symbolsScopeText = symbols.length > 0 ? `（限定 ${symbols.length} 只股票：${symbols.join("、")}）` : "";
    const scopeText = options.resume
      ? "已继续上次中断的扫描。"
      : `${presetIds.length ? `已对 ${presetIds.length} 个模型` : "已对全部模型"}${symbolsScopeText}启动重新扫描。`;
    setStatus(adjustments.length > 0 ? `${scopeText}（参数超出允许范围，已调整：${adjustments.join("，")}）` : scopeText);
    await loadAdminScanStatus();
  } catch (error) {
    if (adminScanRunStatus) adminScanRunStatus.textContent = "";
    setStatus(`启动扫描失败：${error.message}`, true);
  }
}

async function pauseAdminScan() {
  if (adminScanRunStatus) adminScanRunStatus.textContent = "正在暂停扫描...";
  try {
    const response = await fetch("/api/admin/optimization-scan/pause", { method: "POST" });
    await readJsonResponse(response, "暂停扫描失败。");
    setStatus("扫描已暂停。可以点“继续上次中断”接着跑。");
    await loadAdminScanStatus();
  } catch (error) {
    if (adminScanRunStatus) adminScanRunStatus.textContent = "";
    setStatus(`暂停扫描失败：${error.message}`, true);
  }
}

let adminValidationCache = [];
let adminValidationLastPayload = null;
let adminValidationSortKey = "passRate";
let adminValidationSortDirection = "desc";

const ADMIN_VALIDATION_COLUMNS = [
  { key: "presetLabel", label: "模型" },
  { key: "originSymbol", label: "训练股票" },
  { key: "testedCount", label: "测试股票数" },
  { key: "passingCount", label: "达标股票数" },
  { key: "passRate", label: "通过率" },
  { key: "worstReturnRate", label: "最差收益率" },
  { key: "allPassed", label: "全部通过" },
];

function getAdminValidationSortValue(candidate, key) {
  if (key === "presetLabel") return candidate.presetLabel || "";
  if (key === "originSymbol") return candidate.originSymbol || "";
  if (key === "allPassed") return candidate.allPassed ? 1 : 0;
  return Number(candidate[key]) || 0;
}

function sortAdminValidationCandidates(candidates) {
  const key = adminValidationSortKey;
  const dir = adminValidationSortDirection === "asc" ? 1 : -1;
  return [...candidates].sort((a, b) => {
    const va = getAdminValidationSortValue(a, key);
    const vb = getAdminValidationSortValue(b, key);
    if (typeof va === "string" || typeof vb === "string") {
      return dir * String(va).localeCompare(String(vb), "zh-CN");
    }
    return dir * (va - vb);
  });
}

function renderAdminValidationList(payload) {
  if (!adminValidationList) return;
  adminValidationLastPayload = payload;
  adminValidationCache = Array.isArray(payload.candidates) ? payload.candidates : [];
  const candidates = sortAdminValidationCandidates(adminValidationCache);
  if (!candidates.length) {
    adminValidationList.innerHTML = '<div class="ranking-empty">还没有全市场验证结果，点击上方"运行全市场验证"开始。</div>';
  } else {
    const rows = candidates.map((c) => `
      <tr>
        <td>${formatModelNameLink({
          id: c.presetId, numericId: c.presetNumericId, label: c.presetLabel,
          config: c.bestConfig, strategyType: c.strategyType, symbol: c.originSymbol,
          isOwner: false, name: null,
        })}</td>
        <td>${escapeHtml(c.originSymbol)}</td>
        <td>${c.testedCount}</td>
        <td>${c.passingCount}</td>
        <td>${formatPercent(c.passRate * 100)}</td>
        <td>${formatPercent(c.worstReturnRate)}</td>
        <td class="${c.allPassed ? "up" : ""}">${c.allPassed ? "是" : "否"}</td>
        <td class="admin-scan-actions">
          <button type="button" class="admin-validation-view-params-button" data-source-scan-result-id="${escapeHtml(c.sourceScanResultId)}">查看参数</button>
          <button type="button" class="admin-validation-save-button" data-source-scan-result-id="${escapeHtml(c.sourceScanResultId)}">保存为个人模型</button>
        </td>
      </tr>
    `).join("");
    const headerCells = ADMIN_VALIDATION_COLUMNS.map((column) => {
      const active = adminValidationSortKey === column.key;
      const arrow = active ? (adminValidationSortDirection === "asc" ? " ▲" : " ▼") : "";
      return `<th class="admin-scan-sort-header${active ? " active" : ""}" data-admin-validation-sort-key="${column.key}">${escapeHtml(column.label)}${arrow}</th>`;
    }).join("");
    adminValidationList.innerHTML = `
      <table class="admin-ranking-table">
        <thead>
          <tr>
            ${headerCells}
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const running = Boolean(payload.validationRunning);
  if (adminValidationRunButton) adminValidationRunButton.disabled = running;

  const last = payload.lastScanResult;
  const validationLast = last && last.jobType === "validation" ? last : null;
  const crashed = Boolean(validationLast && validationLast.exitCode !== 0);
  if (adminValidationRunStatus) {
    const runningIsValidation = running && payload.scanInfo && payload.scanInfo.jobType === "validation";
    if (runningIsValidation) {
      adminValidationRunStatus.textContent = `验证进行中（由 ${payload.scanInfo.triggeredBy || "?"} 于 ${escapeHtml(formatAdminDate(payload.scanInfo.startedAt))} 启动）...`;
    } else if (running) {
      adminValidationRunStatus.textContent = "后台优化扫描正在运行，请等它结束后再启动全市场验证。";
    } else if (crashed) {
      adminValidationRunStatus.textContent = `上次验证异常退出（退出码 ${validationLast.exitCode}，${escapeHtml(formatAdminDate(validationLast.endedAt))}）。`;
    } else if (validationLast) {
      adminValidationRunStatus.textContent = `上次验证已完成（${escapeHtml(formatAdminDate(validationLast.endedAt))}）。`;
    } else {
      adminValidationRunStatus.textContent = "";
    }
  }
  if (running) {
    scheduleAdminValidationPoll();
  } else {
    stopAdminValidationPoll();
  }

  if (adminParamPatternModelSelect) {
    const previousValue = adminParamPatternModelSelect.value;
    const uniquePresets = [];
    const seenPresetIds = new Set();
    adminValidationCache.forEach((c) => {
      if (seenPresetIds.has(c.presetId)) return;
      seenPresetIds.add(c.presetId);
      uniquePresets.push({ id: c.presetId, label: c.presetLabel });
    });
    adminParamPatternModelSelect.innerHTML = uniquePresets
      .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`)
      .join("");
    if (uniquePresets.some((p) => p.id === previousValue)) {
      adminParamPatternModelSelect.value = previousValue;
    }
  }
}

let adminValidationPollTimer = null;

function scheduleAdminValidationPoll() {
  if (adminValidationPollTimer) return;
  adminValidationPollTimer = window.setInterval(() => {
    if (!adminValidationPanel || adminValidationPanel.classList.contains("hidden")) {
      stopAdminValidationPoll();
      return;
    }
    loadAdminValidation();
  }, 5000);
}

function stopAdminValidationPoll() {
  if (adminValidationPollTimer) {
    window.clearInterval(adminValidationPollTimer);
    adminValidationPollTimer = null;
  }
}

async function loadAdminValidation() {
  if (!adminValidationList) return;
  const threshold = Number(adminValidationThresholdInput && adminValidationThresholdInput.value);
  const effectiveThreshold = Number.isFinite(threshold) ? threshold : 100;
  if (!adminValidationList.innerHTML.trim()) {
    adminValidationList.innerHTML = '<div class="ranking-empty">正在读取全市场验证结果...</div>';
  }
  try {
    const response = await fetch(`/api/admin/universe-validation?threshold=${encodeURIComponent(effectiveThreshold)}`, { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取全市场验证结果失败。");
    renderAdminValidationList(payload);
  } catch (error) {
    adminValidationList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

async function triggerAdminValidationRun() {
  const buyHoldMax = Number(adminValidationBuyHoldMaxInput && adminValidationBuyHoldMaxInput.value);
  const bestReturnMin = Number(adminValidationBestReturnMinInput && adminValidationBestReturnMinInput.value);
  if (adminValidationRunStatus) adminValidationRunStatus.textContent = "正在启动验证...";
  try {
    const response = await fetch("/api/admin/universe-validation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyHoldMax: Number.isFinite(buyHoldMax) ? buyHoldMax : 50,
        bestReturnMin: Number.isFinite(bestReturnMin) ? bestReturnMin : 100,
      }),
    });
    await readJsonResponse(response, "启动验证失败。");
    setStatus("已启动全市场验证。");
    await loadAdminValidation();
  } catch (error) {
    if (adminValidationRunStatus) adminValidationRunStatus.textContent = "";
    setStatus(`启动验证失败：${error.message}`, true);
  }
}

// Shared by AI自动生成 and 验证搜索 admin panels — both save presets the same way
// (ModelGenerator.saveGeneratedPreset) and list them via server.js's queryAiGeneratedPresets,
// so a preset record has the same shape regardless of which script produced it.
function findAiGeneratedRecord(presetId, payload) {
  const presets = payload && Array.isArray(payload.presets) ? payload.presets : [];
  return presets.find((item) => item.id === presetId);
}

function findAdminAutoGenerateRecord(presetId) {
  return findAiGeneratedRecord(presetId, adminAutoGenerateLastPayload);
}

function findAdminValidatedSearchRecord(presetId) {
  return findAiGeneratedRecord(presetId, adminValidatedSearchLastPayload);
}

// Mirrors openAdminScanParamViewer's readonly-viewer pattern, but sets preset.meta.targetSymbol
// explicitly (openAdminScanParamViewer doesn't, so its own save-as silently falls back to
// whatever symbol happens to be typed in the main page's code input) so "另存为个人模型" here
// always defaults to the AI-generated model's actual target stock, not an unrelated one.
function openAiGeneratedParamViewer(presetId, record, sourceLabel) {
  if (!record) return;
  const config = record.bestConfig && typeof record.bestConfig === "object" ? record.bestConfig : {};
  const viewPreset = {
    ...config,
    label: record.label,
    strategyType: record.strategyType || config.strategyType || "wave",
    meta: {
      targetSymbol: record.targetSymbol,
      originalText: record.reason || "",
      originalModelLabel: record.label,
      originalModelNumericId: record.numericId,
    },
  };
  openPresetParamEditor(presetId, {
    preset: viewPreset,
    readonly: true,
    title: `查看${sourceLabel}参数：${record.targetSymbol}（${record.label}）`,
    subtitle: `训练期年化收益率 ${formatPercent(record.trainAnnualizedReturn)} · 验证期年化收益率(第1年) ${formatPercent(record.testYear1AnnualizedReturn)} · 验证期年化收益率(第2年) ${formatPercent(record.testYear2AnnualizedReturn)} · 只读`,
    saveDefaultLabel: buildAutoSaveLabel({
      symbol: record.targetSymbol,
      annualizedReturn: Math.min(record.testYear1AnnualizedReturn, record.testYear2AnnualizedReturn),
      trades: record.testYear2Trades,
      modelLabel: record.label,
    }),
  });
}

function openAdminAutoGenerateParamViewer(presetId) {
  openAiGeneratedParamViewer(presetId, findAdminAutoGenerateRecord(presetId), "AI 自动生成");
}

function openAdminValidatedSearchParamViewer(presetId) {
  openAiGeneratedParamViewer(presetId, findAdminValidatedSearchRecord(presetId), "验证搜索");
}

async function openAiGeneratedRerun(record) {
  if (!record || !adminRerunDialog) return;
  await runAdminRerunPlayback({
    title: `交易记录：${record.targetSymbol}（${record.label}）`,
    symbol: record.targetSymbol,
    config: record.bestConfig || {},
    strategyType: record.strategyType,
    start: formatDate(shiftYears(new Date(), -5)),
    end: todayText(),
  });
}

async function openAdminAutoGenerateRerun(presetId) {
  await openAiGeneratedRerun(findAdminAutoGenerateRecord(presetId));
}

async function openAdminValidatedSearchRerun(presetId) {
  await openAiGeneratedRerun(findAdminValidatedSearchRecord(presetId));
}

// Unified "click a model's name anywhere" popup — 查看参数/查看历史交易记录/重命名(仅
// owner/admin)/另存/重新加载历史模拟, all delegating to functions that already exist for
// individual lists rather than reimplementing any of the five actions. Keyed by an opaque
// lookup token (not just the model's own id) because 后台模型排行/全市场验证 can show the SAME
// model against MANY different symbols (one row per scanned stock) — the popup needs to know
// which row's symbol was clicked, not just which model.
const modelContextRegistry = new Map();
let modelActionContext = null;

function registerModelContext(context) {
  const refKey = `${context.id}::${context.symbol || ""}`;
  modelContextRegistry.set(refKey, context);
  return refKey;
}

function formatModelNameLink(context) {
  if (!context || !context.id) return escapeHtml(context && context.label || "");
  const refKey = registerModelContext(context);
  const prefix = context.numericId ? `#${context.numericId} · ` : "";
  return `<button type="button" class="model-name-link" data-model-ref-key="${escapeHtml(refKey)}">${prefix}${escapeHtml(context.label || "模型")}</button>`;
}

function openModelActionMenu(context) {
  if (!context) return;
  modelActionContext = context;
  if (modelActionTitle) {
    modelActionTitle.textContent = `${context.numericId ? `#${context.numericId} · ` : ""}${context.label || "模型"}`;
  }
  const canRename = Boolean(context.isOwner || (currentUser && currentUser.isAdmin));
  if (modelActionRenameButton) modelActionRenameButton.classList.toggle("hidden", !canRename);
  const hasSymbol = Boolean(context.symbol);
  if (modelActionViewTradesButton) modelActionViewTradesButton.disabled = !hasSymbol;
  if (modelActionReloadSimButton) modelActionReloadSimButton.disabled = !hasSymbol;
  // 建立盯盘/扫描市场都需要知道具体股票代码（盯盘要盯这只票；扫描市场靠代码推断用哪个市场
  // 的股票池），没有关联股票的模型（比如"通用"模型）这两个按钮先禁用。
  if (modelActionCreateWatchButton) modelActionCreateWatchButton.disabled = !hasSymbol;
  if (modelActionScreenMarketButton) modelActionScreenMarketButton.disabled = !hasSymbol;
  // 重新验证同样需要具体股票代码——用的是这个模型自己的参数原样回测，不是重新搜索。
  if (modelActionRevalidateButton) modelActionRevalidateButton.disabled = !hasSymbol;
  showDialog(modelActionDialog);
}

if (document.body) {
  document.body.addEventListener("click", (event) => {
    const link = event.target && event.target.closest ? event.target.closest(".model-name-link") : null;
    if (!link) return;
    // A name-link can sit inside a <summary> (盯盘提醒's collapsible rows) — without this, the
    // click would also toggle the parent <details> open/closed as a browser default action.
    event.preventDefault();
    const context = modelContextRegistry.get(link.dataset.modelRefKey);
    if (context) openModelActionMenu(context);
  });
}

if (closeModelActionButton && modelActionDialog) {
  closeModelActionButton.addEventListener("click", () => closeDialog(modelActionDialog));
}

if (modelActionViewParamsButton) {
  modelActionViewParamsButton.addEventListener("click", () => {
    const context = modelActionContext;
    if (!context) return;
    closeDialog(modelActionDialog);
    if (context.name && isOwnedEditablePreset(context.name)) {
      openPresetParamEditor(context.name);
      return;
    }
    const config = context.config && typeof context.config === "object" ? context.config : {};
    const viewPreset = {
      ...config,
      label: context.label,
      strategyType: context.strategyType || config.strategyType || "wave",
      meta: { targetSymbol: context.symbol || "通用", originalText: context.reason || "" },
    };
    openPresetParamEditor(context.id, {
      preset: viewPreset,
      readonly: true,
      title: `查看参数：${context.label}`,
      subtitle: context.ownerEmail ? `Owner: ${context.ownerEmail} · 只读` : "只读",
      saveDefaultLabel: `${context.label} 副本`.slice(0, 60),
    });
  });
}

if (modelActionViewTradesButton) {
  modelActionViewTradesButton.addEventListener("click", async () => {
    const context = modelActionContext;
    if (!context || !context.symbol) return;
    closeDialog(modelActionDialog);
    await runAdminRerunPlayback({
      title: `交易记录：${context.symbol}（${context.label}）`,
      symbol: context.symbol,
      config: context.config || {},
      strategyType: context.strategyType,
      start: formatDate(shiftYears(new Date(), -5)),
      end: todayText(),
    });
  });
}

if (modelActionRenameButton) {
  modelActionRenameButton.addEventListener("click", () => {
    const context = modelActionContext;
    if (!context) return;
    closeDialog(modelActionDialog);
    if (context.name && isOwnedEditablePreset(context.name)) {
      renameOwnedPreset(context.name);
    } else {
      renameAdminPreset(context.id, context.label);
    }
  });
}

if (modelActionSaveAsButton) {
  modelActionSaveAsButton.addEventListener("click", async () => {
    const context = modelActionContext;
    if (!context) return;
    const defaultLabel = `${context.label} 副本`.slice(0, 60);
    const label = window.prompt("输入新模型名称：", defaultLabel);
    if (label === null) return;
    const trimmed = label.trim().slice(0, 80);
    if (!trimmed) {
      setStatus("模型名称不能为空。", true);
      return;
    }
    closeDialog(modelActionDialog);
    const preset = createPresetFromConfig(trimmed, context.config || {}, {
      targetSymbol: context.symbol || "通用",
      creator: "auto",
      createdAt: todayText(),
      updatedAt: todayText(),
      originalText: `另存自：${context.label}`,
      originalModelId: context.id,
      originalModelLabel: context.label,
      originalModelNumericId: context.numericId,
    });
    const presetName = await saveGeneratedPreset(preset);
    if (presetName) {
      setStatus(`已另存为模型：${strategyPresets[presetName].label}。`);
    }
  });
}

if (modelActionReloadSimButton) {
  modelActionReloadSimButton.addEventListener("click", async () => {
    const context = modelActionContext;
    if (!context || !context.symbol) return;
    closeDialog(modelActionDialog);
    let targetName = context.name && strategyPresets[context.name] ? context.name : "";
    if (!targetName) {
      targetName = `__viewed_${context.id}`;
      const config = context.config && typeof context.config === "object" ? context.config : {};
      strategyPresets[targetName] = sanitizeStoredPreset(targetName, {
        ...config,
        label: context.label,
        strategyType: context.strategyType || config.strategyType || "wave",
        meta: { targetSymbol: context.symbol, originalText: context.reason || "" },
      });
    }
    setWizardPage("simulation");
    if (codeInput) codeInput.value = context.symbol;
    if (startInput) startInput.value = formatDate(shiftYears(new Date(), -5));
    if (endInput) endInput.value = todayText();
    renderModelCompareOptions();
    document.querySelectorAll(".model-compare-enabled").forEach((input) => {
      input.checked = input.value === targetName;
    });
    await loadData();
  });
}

// Same code=>market convention used server-side for /api/klines and inferMarket()
// (scripts/shared/universe-loader.js) — 6 digits = A股, anything else = 美股.
function inferMarketFromSymbol(symbol) {
  return /^\d{6}$/.test(String(symbol || "").trim()) ? "CN" : "US";
}

// 建立盯盘/扫描市场都要求 presetId 是 strategy_presets 里的真实一行——AI候选模型（只存在于
// optimization_scan_results，context.isAiCandidate 标记的那种）直接拿去用会被服务端 404。
// 这里复用"另存"按钮的克隆逻辑：先让用户确认/改一个名字，另存成正式模型，再用新模型的真实
// id 继续后面的动作。非AI候选的 context 直接透传自己的 id，不用克隆。
async function resolveRealPresetIdForContext(context, actionLabel) {
  if (!context.isAiCandidate) {
    return { id: context.id, label: context.label, numericId: context.numericId };
  }
  const defaultLabel = `${context.label} 副本`.slice(0, 60);
  const label = window.prompt(`这是AI候选模型，${actionLabel}前需要先另存为正式模型。输入新模型名称：`, defaultLabel);
  if (label === null) return null;
  const trimmed = label.trim().slice(0, 80);
  if (!trimmed) {
    setStatus("模型名称不能为空。", true);
    return null;
  }
  const preset = createPresetFromConfig(trimmed, context.config || {}, {
    targetSymbol: context.symbol || "通用",
    creator: "auto",
    createdAt: todayText(),
    updatedAt: todayText(),
    originalText: `另存自：${context.label}`,
    originalModelId: context.id,
    originalModelLabel: context.label,
    originalModelNumericId: context.numericId,
  });
  const presetName = await saveGeneratedPreset(preset);
  if (!presetName) return null;
  const saved = strategyPresets[presetName];
  if (!saved || !saved.id) {
    setStatus("另存模型失败，无法继续。", true);
    return null;
  }
  setStatus(`已另存为新模型：${saved.label}。`);
  return { id: saved.id, label: saved.label, numericId: saved.numericId };
}

if (modelActionCreateWatchButton) {
  modelActionCreateWatchButton.addEventListener("click", async () => {
    const context = modelActionContext;
    if (!context || !context.symbol) return;
    if (!requireSignedInForSave()) return;
    closeDialog(modelActionDialog);
    const resolved = await resolveRealPresetIdForContext(context, "建立盯盘");
    if (!resolved) return;
    const market = inferMarketFromSymbol(context.symbol);
    try {
      const response = await fetch("/api/watch-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: resolved.id, market, symbol: context.symbol, frequencyMinutes: 60 }),
      });
      await readJsonResponse(response, "添加盯盘提醒失败。");
      setStatus(`已为「${resolved.label}」在 ${context.symbol} 建立盯盘（默认每小时检查一次，可以在"设置盯盘提醒"里改）。`);
      await loadMyWatchAlerts();
    } catch (error) {
      setStatus(`建立盯盘失败：${error.message}`, true);
    }
  });
}

if (modelActionScreenMarketButton) {
  modelActionScreenMarketButton.addEventListener("click", async () => {
    const context = modelActionContext;
    if (!context || !context.symbol) return;
    if (!requireSignedInForSave()) return;
    closeDialog(modelActionDialog);
    const resolved = await resolveRealPresetIdForContext(context, "扫描市场");
    if (!resolved) return;
    const market = inferMarketFromSymbol(context.symbol);
    try {
      const response = await fetch("/api/stock-screen/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: resolved.id, market }),
      });
      await readJsonResponse(response, "启动选股扫描失败。");
      setStatus(`已用「${resolved.label}」启动${market === "CN" ? "A股" : "美股"}全市场扫描，可以在"选股"页面查看结果。`);
    } catch (error) {
      setStatus(`启动扫描失败：${error.message}`, true);
    }
  });
}

// 重新验证：用当前模型自己的配置原样回测（不重新搜索/优化参数），只换历史数据区间和目标
// 年化收益率——不需要先另存/克隆AI候选，context 里已经有 symbol/config/strategyType，直接
// 送给服务端跑，几秒内同步拿到结果。
function openRevalidateDialog() {
  const context = modelActionContext;
  if (!context || !context.symbol) return;
  if (revalidateTitle) {
    revalidateTitle.textContent = `重新验证：${context.numericId ? `#${context.numericId} · ` : ""}${context.label || "模型"}（${context.symbol}）`;
  }
  if (revalidateStatus) revalidateStatus.textContent = "";
  if (revalidateResult) revalidateResult.innerHTML = "";
  showDialog(revalidateDialog);
}

if (modelActionRevalidateButton) {
  modelActionRevalidateButton.addEventListener("click", () => {
    if (!modelActionContext || !modelActionContext.symbol) return;
    closeDialog(modelActionDialog);
    openRevalidateDialog();
  });
}

if (closeRevalidateButton && revalidateDialog) {
  closeRevalidateButton.addEventListener("click", () => closeDialog(revalidateDialog));
}

// One row of the 逐年详情 table — shared shape for a training year (from trainYearBreakdown)
// and a validation year (from testYear1/testYear2), so both render through the same function.
function renderYearBreakdownRow(label, year) {
  const gateBits = [];
  if (year.upsideDeviation !== null && year.upsideDeviation !== undefined) {
    gateBits.push(year.passesUpsideGate ? "" : '<span class="down">未过上行波动门槛</span>');
  }
  if (year.buyHoldMaxDrawdown !== null && year.buyHoldMaxDrawdown !== undefined) {
    gateBits.push(year.passesDrawdownGate ? "" : '<span class="down">回撤未小于买入持有</span>');
  }
  const gateText = gateBits.filter(Boolean).join(" · ") || '<span class="up">全部通过</span>';
  return `
    <tr>
      <td>${escapeHtml(label)}</td>
      <td>${escapeHtml(year.start || "")} ~ ${escapeHtml(year.end || "")}</td>
      <td>${year.annualizedReturn === null || year.annualizedReturn === undefined ? "—" : formatPercent(year.annualizedReturn)}</td>
      <td>${year.trades === null || year.trades === undefined ? "—" : year.trades}</td>
      <td>${year.maxDrawdown === null || year.maxDrawdown === undefined ? "—" : formatPercent(year.maxDrawdown)}</td>
      <td>${year.buyHoldMaxDrawdown === null || year.buyHoldMaxDrawdown === undefined ? "—" : formatPercent(year.buyHoldMaxDrawdown)}</td>
      <td>${year.upsideDeviation === null || year.upsideDeviation === undefined ? "—" : formatPercent(year.upsideDeviation)}</td>
      <td>${gateText}</td>
    </tr>
  `;
}

function renderRevalidateResult(payload) {
  if (!revalidateResult) return;
  const badge = payload.reachedTarget
    ? '<span class="up">已达标（两年都 ≥ 目标，且上行波动门槛、逐年回撤门槛也都通过）</span>'
    : '<span class="down">未达标</span>';
  const upsideBadge = payload.passesUpsideGate
    ? '<span class="up">通过</span>'
    : `<span class="down">未通过${payload.failingTrainYears && payload.failingTrainYears.length > 0 ? `（训练期${payload.failingTrainYears.length}个年份未达标）` : ""}</span>`;
  const drawdownBadge = payload.passesDrawdownGate
    ? '<span class="up">通过</span>'
    : `<span class="down">未通过${payload.failingTrainDrawdownYears && payload.failingTrainDrawdownYears.length > 0 ? `（训练期${payload.failingTrainDrawdownYears.length}个年份回撤未小于买入持有）` : ""}</span>`;

  const trainRows = (payload.trainYearBreakdown || [])
    .map((year, i) => renderYearBreakdownRow(`训练第${i + 1}年`, year))
    .join("");
  const testRows = renderYearBreakdownRow("验证第1年", payload.testYear1)
    + renderYearBreakdownRow("验证第2年", payload.testYear2);

  revalidateResult.innerHTML = `
    <div class="admin-progress-banner-stats">
      <div>训练期（${escapeHtml(payload.trainStartDate)} ~ ${escapeHtml(payload.trainEndDate)}）年化：${formatPercent(payload.trainAnnualizedReturn)}</div>
      <div>验证第1年（${escapeHtml(payload.testYear1.startDate)} ~ ${escapeHtml(payload.testYear1.endDate)}）年化：${formatPercent(payload.testYear1.annualizedReturn)} · 最大回撤${formatPercent(payload.testYear1.maxDrawdown)} · ${payload.testYear1.trades}笔交易</div>
      <div>验证第2年（${escapeHtml(payload.testYear2.startDate)} ~ ${escapeHtml(payload.testYear2.endDate)}）年化：${formatPercent(payload.testYear2.annualizedReturn)} · 最大回撤${formatPercent(payload.testYear2.maxDrawdown)} · ${payload.testYear2.trades}笔交易</div>
      <div>目标年化收益率 ${formatPercent(payload.targetPercent)}：${badge}</div>
      <div>上行波动门槛（每年年化收益需≥当年上行标准差的${formatPercent(payload.upsideThresholdPercent)}）：${upsideBadge}</div>
      <div>逐年回撤门槛（每年最大回撤需小于当年买入持有的最大回撤×${(1 + Number(payload.drawdownTolerancePercent || 0) / 100).toFixed(2)}，即容差${formatPercent(payload.drawdownTolerancePercent)}）：${drawdownBadge}</div>
    </div>
    <div class="admin-ranking-list">
      <table class="admin-ranking-table">
        <thead>
          <tr>
            <th>年份</th>
            <th>区间</th>
            <th>年化回报</th>
            <th>交易数</th>
            <th>模型最大回撤</th>
            <th>买入持有最大回撤</th>
            <th>上行标准差</th>
            <th>门槛结果</th>
          </tr>
        </thead>
        <tbody>
          ${trainRows}
          ${testRows}
        </tbody>
      </table>
    </div>
  `;
}

if (revalidateRunButton) {
  revalidateRunButton.addEventListener("click", async () => {
    const context = modelActionContext;
    if (!context || !context.symbol) return;
    const trainYears = Number(revalidateTrainYearsInput && revalidateTrainYearsInput.value) || 4;
    const testYears = Number(revalidateTestYearsInput && revalidateTestYearsInput.value) || 2;
    const targetPercent = Number(revalidateTargetPercentInput && revalidateTargetPercentInput.value) || 50;
    const upsideThresholdPercentRaw = Number(revalidateUpsideThresholdPercentInput && revalidateUpsideThresholdPercentInput.value);
    const upsideThresholdPercent = Number.isFinite(upsideThresholdPercentRaw) ? upsideThresholdPercentRaw : 30;
    const drawdownTolerancePercentRaw = Number(revalidateDrawdownTolerancePercentInput && revalidateDrawdownTolerancePercentInput.value);
    const drawdownTolerancePercent = Number.isFinite(drawdownTolerancePercentRaw) ? drawdownTolerancePercentRaw : 5;
    if (revalidateStatus) revalidateStatus.textContent = "正在用现有参数重新回测...";
    if (revalidateResult) revalidateResult.innerHTML = "";
    revalidateRunButton.disabled = true;
    try {
      const response = await fetch("/api/presets/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: context.symbol,
          strategyType: context.strategyType,
          config: context.config || {},
          trainYears,
          testYears,
          targetPercent,
          upsideThresholdPercent,
          drawdownTolerancePercent,
        }),
      });
      const payload = await readJsonResponse(response, "重新验证失败。");
      if (revalidateStatus) revalidateStatus.textContent = "已完成。";
      renderRevalidateResult(payload);
    } catch (error) {
      if (revalidateStatus) revalidateStatus.textContent = "";
      setStatus(`重新验证失败：${error.message}`, true);
    } finally {
      revalidateRunButton.disabled = false;
    }
  });
}

function formatAdminAutoGenerateReason(reason) {
  const text = String(reason || "").trim();
  if (!text) return "";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

// Same "smallest train/test annualized-return gap first" default as adminScanList — see
// scripts/universe/run-auto-generate.js's train/test split methodology.
let adminAutoGenerateSortKey = "annualizedDiffYear2";
let adminAutoGenerateSortDirection = "asc";

const ADMIN_AUTO_GENERATE_COLUMNS = [
  { key: "targetSymbol", label: "股票" },
  { key: "label", label: "模型名称" },
  { key: "strategyType", label: "策略类型" },
  { key: "trainAnnualizedReturn", label: "训练期年化收益率" },
  { key: "testYear1AnnualizedReturn", label: "验证期年化收益率(第1年)" },
  { key: "testYear2AnnualizedReturn", label: "验证期年化收益率(第2年)" },
  { key: "annualizedDiffYear1", label: "年化差异(第1年)" },
  { key: "annualizedDiffYear2", label: "年化差异(第2年)" },
  { key: "bestTrades", label: "交易次数" },
  { key: "testedCandidates", label: "测试组合数" },
  { key: "reason", label: "AI 生成理由" },
  { key: "updatedAt", label: "更新时间" },
];

function getAdminAutoGenerateSortValue(record, key) {
  if (key === "targetSymbol") return record.targetSymbol || "";
  if (key === "label") return record.label || "";
  if (key === "strategyType") return getStrategyTypeLabel(record.strategyType);
  if (key === "reason") return record.reason || "";
  if (key === "updatedAt") return record.updatedAt || "";
  if (key === "lastRecheckedAt") return record.lastRecheckedAt || "";
  // "两年里差得更多的那一年"——跟reachedTarget要求两年都达标是同一个"看最差情况"的原则，用
  // 这个而不是随便一年单独的差异，才能反映一个模型真正最不可信的那个方面。
  if (key === "maxAnnualizedDiff") return Math.max(Number(record.annualizedDiffYear1) || 0, Number(record.annualizedDiffYear2) || 0);
  // 验证两年平均回报率——"推荐盯盘筛选"的主排序依据，差异率降级成它的并列时的次要依据
  // （见sortAiGeneratedRecords里的处理），不再是主依据。
  if (key === "avgTestAnnualizedReturn") return ((Number(record.testYear1AnnualizedReturn) || 0) + (Number(record.testYear2AnnualizedReturn) || 0)) / 2;
  // 两年交易次数差得越多，说明这个模型在两年里的实际交易行为越不一致（比如一年几乎没动，
  // 另一年频繁交易）——"推荐盯盘筛选"排序链最后一层的并列判据，越小越好。
  if (key === "tradeCountDiff") return Math.abs((Number(record.testYear1Trades) || 0) - (Number(record.testYear2Trades) || 0));
  return Number(record[key]) || 0;
}

// "推荐盯盘"筛选：两年验证期都要有真实交易（排除0笔交易的买入持有假象），并且如果已经复查过
// 必须是仍达标（还没复查过的不排除——reached_target本身还是true，没有证据说明它不行）。
// 这套标准是2026-09-01跟用户对话时商定的人工分析口径，这里做成按钮，不用每次手动查DB。
function passesAdminRecommendFilter(record) {
  if (Number(record.testYear1Trades) <= 0 || Number(record.testYear2Trades) <= 0) return false;
  if (record.lastRecheckedAt && record.recheckStillQualifies === false) return false;
  return true;
}

// 达标复查(recheck_*字段)只在"showStatus"的表(即验证搜索面板)里显示——达标这个概念本来就
// 只对validated-search来源的行有意义，见optimization-results.js的注释。
function formatRecheckCell(p) {
  if (p.recheckError) {
    return `<span class="down" title="${escapeHtml(p.recheckError)}">复查出错/数据不足</span>（${escapeHtml(formatAdminDate(p.lastRecheckedAt))}）`;
  }
  if (p.recheckStillQualifies === true) {
    return `<span class="up">仍达标</span>（第1年${formatPercent(p.recheckYear1AnnualizedReturn)}·第2年${formatPercent(p.recheckYear2AnnualizedReturn)}，目标${p.recheckTargetPercent || "?"}%，${escapeHtml(formatAdminDate(p.lastRecheckedAt))}）`;
  }
  if (p.recheckStillQualifies === false) {
    return `<span class="down">不再达标</span>（第1年${formatPercent(p.recheckYear1AnnualizedReturn)}·第2年${formatPercent(p.recheckYear2AnnualizedReturn)}，目标${p.recheckTargetPercent || "?"}%，${escapeHtml(formatAdminDate(p.lastRecheckedAt))}）`;
  }
  return '<span class="field-hint">尚未复查</span>';
}

// Shared by AI自动生成 and 验证搜索 — both list the exact same kind of record (see
// findAiGeneratedRecord above), so their sort/row/table rendering is one implementation with
// a couple of per-panel switches (whether to show the "状态" 达标/搜索中 badge column, and
// which data- sort-key attribute name the panel's own click handler reads).
// bucketByReachedTarget (验证搜索 only — see caller) always puts 已达标 rows ahead of 搜索中
// rows, no matter which column the user clicked to sort within each group — otherwise sorting
// by, say, "差异(第2年)" freely interleaves a not-yet-qualified candidate with a small diff
// above an actually-qualified one with a bigger diff, which reads as "why are unqualified
// results on top" (real complaint, confirmed against production data: sorting by the default
// column put reached_target=false rows at positions 2/4/5/8/11 among the top 15). This mirrors
// the exact same "bucket first, sort within" pattern already used for the migrated/un-migrated
// train-test split below.
function sortAiGeneratedRecords(records, sortKey, sortDirection, bucketByReachedTarget) {
  const dir = sortDirection === "asc" ? 1 : -1;
  const isTrainTestKey = ADMIN_TRAIN_TEST_SORT_KEYS.has(sortKey);
  return [...records].sort((a, b) => {
    if (bucketByReachedTarget) {
      const aReached = Boolean(a.reachedTarget);
      const bReached = Boolean(b.reachedTarget);
      if (aReached !== bReached) return aReached ? -1 : 1;
    }
    if (isTrainTestKey) {
      const aMigrated = Boolean(a.trainStartDate);
      const bMigrated = Boolean(b.trainStartDate);
      if (aMigrated !== bMigrated) return aMigrated ? -1 : 1;
    }
    const va = getAdminAutoGenerateSortValue(a, sortKey);
    const vb = getAdminAutoGenerateSortValue(b, sortKey);
    if (typeof va === "string" || typeof vb === "string") {
      return dir * String(va).localeCompare(String(vb), "zh-CN");
    }
    const primary = dir * (va - vb);
    // 排序链（"推荐盯盘筛选"专用）：主依据验证两年平均回报率，打平（几乎不会发生）才轮到
    // 下面两层——先比差异率，差异率也打平才比两年交易次数差——两层都永远是"越小越好"，
    // 不受主排序方向影响。
    if (primary !== 0 || sortKey !== "avgTestAnnualizedReturn") return primary;
    const da = getAdminAutoGenerateSortValue(a, "maxAnnualizedDiff");
    const db = getAdminAutoGenerateSortValue(b, "maxAnnualizedDiff");
    if (da !== db) return da - db;
    const ta = getAdminAutoGenerateSortValue(a, "tradeCountDiff");
    const tb = getAdminAutoGenerateSortValue(b, "tradeCountDiff");
    return ta - tb;
  });
}

function renderAiGeneratedPresetRow(p, options = {}) {
  const hasTrainTest = Boolean(p.trainStartDate);
  const trainClass = p.trainAnnualizedReturn > 0 ? "up" : p.trainAnnualizedReturn < 0 ? "down" : "";
  const testYear1Class = p.testYear1AnnualizedReturn > 0 ? "up" : p.testYear1AnnualizedReturn < 0 ? "down" : "";
  const testYear2Class = p.testYear2AnnualizedReturn > 0 ? "up" : p.testYear2AnnualizedReturn < 0 ? "down" : "";
  // "最差年份" (not the better year) keeps this consistent with reachedTarget requiring BOTH
  // years to clear the bar — showing the better year here would be misleading about progress.
  const worstTestAnnualized = Math.min(p.testYear1AnnualizedReturn, p.testYear2AnnualizedReturn);
  const statusCell = options.showStatus
    ? `<td>${p.reachedTarget ? '<span class="up">已验证达标</span>' : `<span class="field-hint">搜索中·最差年份${formatPercent(worstTestAnnualized)}</span>`}</td>`
    : "";
  const recheckCell = options.showStatus ? `<td>${formatRecheckCell(p)}</td>` : "";
  // 只在"推荐盯盘筛选"打开时才显示这一列——平时藏起来，免得跟已有的几列重复；打开筛选时把
  // 排序链依据的三个数字（主：两年平均回报率，次：最大差异，再次：两年交易次数差）一起
  // 亮出来，不然用户看不出表格到底是按什么排的（各自单独的列排序时压根没有一个"综合
  // 考虑"的列可看）。
  const recommendDiffCell = options.showRecommendDiff
    ? `<td>均值${formatPercent(((Number(p.testYear1AnnualizedReturn) || 0) + (Number(p.testYear2AnnualizedReturn) || 0)) / 2)} · 差异${formatPercent(Math.max(Number(p.annualizedDiffYear1) || 0, Number(p.annualizedDiffYear2) || 0))} · 交易次数差${Math.abs((Number(p.testYear1Trades) || 0) - (Number(p.testYear2Trades) || 0))}</td>`
    : "";
  return `
    <tr>
      ${statusCell}
      <td>${escapeHtml(p.targetSymbol || "")}</td>
      <td>${formatModelNameLink({
        id: p.id, numericId: p.numericId, label: p.label || "",
        config: p.bestConfig, strategyType: p.strategyType, symbol: p.targetSymbol,
        reason: p.reason, isOwner: false, name: null, isAiCandidate: true,
      })}</td>
      <td>${escapeHtml(getStrategyTypeLabel(p.strategyType))}</td>
      <td class="${trainClass}">${hasTrainTest ? formatPercent(p.trainAnnualizedReturn) : "--"}</td>
      <td class="${testYear1Class}">${hasTrainTest ? formatPercent(p.testYear1AnnualizedReturn) : "--"}</td>
      <td class="${testYear2Class}">${hasTrainTest ? formatPercent(p.testYear2AnnualizedReturn) : "--"}</td>
      <td>${hasTrainTest ? formatPercent(p.annualizedDiffYear1) : "--"}</td>
      <td>${hasTrainTest ? formatPercent(p.annualizedDiffYear2) : "--"}</td>
      <td>${p.bestTrades || 0}</td>
      <td>${p.testedCandidates || 0}</td>
      <td>${escapeHtml(formatAdminAutoGenerateReason(p.reason))}</td>
      <td>${escapeHtml(formatAdminDate(p.updatedAt))}</td>
      ${recheckCell}
      ${recommendDiffCell}
    </tr>
  `;
}

function renderAiGeneratedPresetTable(presets, { sortKey, sortDirection, sortAttr, showStatus, showRecommendDiff }) {
  if (presets.length === 0) {
    return '<div class="ranking-empty">还没有相关记录。</div>';
  }
  const sorted = sortAiGeneratedRecords(presets, sortKey, sortDirection, showStatus);
  const rows = sorted.map((p) => renderAiGeneratedPresetRow(p, { showStatus, showRecommendDiff })).join("");
  let columns = showStatus
    ? [{ key: "reachedTarget", label: "状态" }, ...ADMIN_AUTO_GENERATE_COLUMNS, { key: "lastRecheckedAt", label: "达标复查" }]
    : ADMIN_AUTO_GENERATE_COLUMNS;
  if (showRecommendDiff) columns = [...columns, { key: "avgTestAnnualizedReturn", label: "推荐排序·均值/差异" }];
  const headerCells = columns.map((column) => {
    const active = sortKey === column.key;
    const arrow = active ? (sortDirection === "asc" ? " ▲" : " ▼") : "";
    return `<th class="admin-scan-sort-header${active ? " active" : ""}" data-${sortAttr}="${column.key}">${escapeHtml(column.label)}${arrow}</th>`;
  }).join("");
  return `
    <table class="admin-ranking-table">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAdminAutoGenerateList(payload) {
  adminAutoGenerateLastPayload = payload;
  const presets = Array.isArray(payload.presets) ? payload.presets : [];
  if (adminAutoGenerateList) {
    if (presets.length === 0) {
      adminAutoGenerateList.innerHTML = '<div class="ranking-empty">还没有自动生成并保存的模型。</div>';
    } else {
      adminAutoGenerateList.innerHTML = renderAiGeneratedPresetTable(presets, {
        sortKey: adminAutoGenerateSortKey,
        sortDirection: adminAutoGenerateSortDirection,
        sortAttr: "admin-auto-generate-sort-key",
        showStatus: false,
      });
    }
  }

  const running = Boolean(payload.running);
  if (adminAutoGenerateRunButton) adminAutoGenerateRunButton.disabled = running;

  const last = payload.lastScanResult;
  const autoGenerateLast = last && last.jobType === "autoGenerate" ? last : null;
  const crashed = Boolean(autoGenerateLast && autoGenerateLast.exitCode !== 0);
  const runningIsAutoGenerate = running && payload.scanInfo && payload.scanInfo.jobType === "autoGenerate";
  if (adminAutoGenerateRunStatus) {
    if (runningIsAutoGenerate) {
      adminAutoGenerateRunStatus.textContent = `自动生成进行中（由 ${payload.scanInfo.triggeredBy || "?"} 于 ${escapeHtml(formatAdminDate(payload.scanInfo.startedAt))} 启动）...`;
    } else if (running) {
      adminAutoGenerateRunStatus.textContent = "已有其它后台任务在运行，请等它结束后再启动自动生成。";
    } else if (crashed) {
      adminAutoGenerateRunStatus.textContent = `上次自动生成异常退出（退出码 ${autoGenerateLast.exitCode}，${escapeHtml(formatAdminDate(autoGenerateLast.endedAt))}）。`;
    } else if (autoGenerateLast) {
      adminAutoGenerateRunStatus.textContent = `上次自动生成已完成（${escapeHtml(formatAdminDate(autoGenerateLast.endedAt))}）。`;
    } else {
      adminAutoGenerateRunStatus.textContent = "";
    }
  }

  if (adminAutoGenerateProgressBanner) {
    const progress = payload.progress;
    if (runningIsAutoGenerate && progress) {
      const symbolLabel = progress.currentSymbol
        ? `股票 ${progress.symbolIndex || "?"}/${progress.totalSymbols || "?"}（${escapeHtml(progress.currentSymbol)}）`
        : `股票 ${progress.symbolIndex || 0}/${progress.totalSymbols || "?"}`;
      const attemptLabel = progress.attempt ? `第 ${progress.attempt}/${progress.attemptsPerSymbol || "?"} 次尝试` : "";
      const strategyLabel = progress.currentStrategyType ? `策略：${escapeHtml(getStrategyTypeLabel(progress.currentStrategyType))}` : "";
      const detailParts = [symbolLabel, attemptLabel, strategyLabel].filter(Boolean).join(" · ");
      const reasonText = progress.currentReason ? escapeHtml(progress.currentReason) : "";
      const bestReturn = Number.isFinite(progress.bestAnnualizedReturn) ? progress.bestAnnualizedReturn : null;
      const bestReturnLabel = bestReturn !== null
        ? `目前最佳年化回报率 <strong>${bestReturn >= 0 ? "+" : ""}${bestReturn.toFixed(1)}%</strong>（${escapeHtml(progress.bestAnnualizedSymbol || "")}·${escapeHtml(getStrategyTypeLabel(progress.bestAnnualizedStrategyType))}）`
        : "目前最佳年化回报率：暂无";
      adminAutoGenerateProgressBanner.classList.remove("hidden");
      adminAutoGenerateProgressBanner.innerHTML = `
        <div class="admin-progress-banner-title"><span class="admin-progress-banner-dot"></span>AI自动生成进行中</div>
        <div class="admin-progress-banner-detail">${detailParts}${reasonText ? `<br>${reasonText}` : ""}</div>
        <div class="admin-progress-banner-best">${bestReturnLabel}</div>
        <div class="admin-progress-banner-stats">
          <span>AI 调用 <strong>${progress.aiCalls || 0}</strong>/${progress.maxAttempts || "?"}</span>
          <span>已保存 <strong>${progress.saved || 0}</strong></span>
          <span>未跑赢 <strong>${progress.rejected || 0}</strong></span>
          <span>数据不足跳过 <strong>${progress.dataSkipped || 0}</strong></span>
          <span>出错 <strong>${progress.errored || 0}</strong></span>
        </div>
      `;
    } else {
      adminAutoGenerateProgressBanner.classList.add("hidden");
      adminAutoGenerateProgressBanner.innerHTML = "";
    }
  }

  if (running) {
    scheduleAdminAutoGeneratePoll();
  } else {
    stopAdminAutoGeneratePoll();
  }
}

let adminAutoGenerateLastPayload = null;
let adminAutoGeneratePollTimer = null;

function scheduleAdminAutoGeneratePoll() {
  if (adminAutoGeneratePollTimer) return;
  adminAutoGeneratePollTimer = window.setInterval(() => {
    if (!adminAutoGeneratePanel || adminAutoGeneratePanel.classList.contains("hidden")) {
      stopAdminAutoGeneratePoll();
      return;
    }
    loadAdminAutoGenerate();
  }, 5000);
}

function stopAdminAutoGeneratePoll() {
  if (adminAutoGeneratePollTimer) {
    window.clearInterval(adminAutoGeneratePollTimer);
    adminAutoGeneratePollTimer = null;
  }
}

// /api/symbol-history is private to the calling owner (logged-in account, or anonymous
// browser cookie) — the history-simulation dropdown uses it via symbolHistoryCache. Admin's
// picker deliberately does NOT reuse that: it needs to see codes ANY user has queried (to
// have a meaningful pool to pick a batch from), so it has its own cache backed by the
// admin-only /api/admin/symbol-history aggregate endpoint instead.
let adminSymbolHistoryCache = [];

async function loadAdminSymbolHistory() {
  try {
    const response = await fetch("/api/admin/symbol-history", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取管理员股票代码历史失败。");
    adminSymbolHistoryCache = Array.isArray(payload.symbols) ? payload.symbols : [];
  } catch (error) {
    adminSymbolHistoryCache = [];
  }
}

function getAdminSymbolOptionsList() {
  const historyCodes = adminSymbolHistoryCache.map((entry) => normalizeSymbolInput(entry.code)).filter(Boolean);
  const historySet = new Set(historyCodes);
  return [...historyCodes, ...symbolPresets.filter((symbol) => !historySet.has(symbol))];
}

function formatAdminSymbolOptionLabel(symbol) {
  const normalized = normalizeSymbolInput(symbol);
  const entry = adminSymbolHistoryCache.find((item) => normalizeSymbolInput(item.code) === normalized);
  const description = entry ? String(entry.description || "").slice(0, 23) : "";
  return description ? `${symbol} ${description}` : symbol;
}

// Shared by every admin panel that needs a "pick some stock codes, or leave empty for the
// full market list" control — AI自动生成 (which stock to design a model for) and 后台计算状态
// (which stocks to target-rescan) both need the exact same search+grid+select-all+clear
// widget, backed by the same known-symbol source (getAdminSymbolOptionsList), so a typed
// code can only ever be one the app actually recognizes — no more free-typed codes of
// unknown validity. Selection state is a plain Set (not native <select multiple> option
// state) so it survives re-renders triggered by the search filter — an option filtered out
// of view must not lose its checked state.
function createAdminSymbolPicker({ gridEl, searchInput, selectAllButton, clearButton, countEl }) {
  const selected = new Set();
  let filterText = "";

  function updateCount() {
    if (countEl) {
      countEl.textContent = selected.size > 0
        ? `已选择 ${selected.size} 个`
        : "未选择（将使用全市场清单）";
    }
  }

  function getFilteredOptions() {
    const allSymbols = getAdminSymbolOptionsList();
    const filter = filterText.trim().toLowerCase();
    if (!filter) return allSymbols;
    return allSymbols.filter((symbol) => formatAdminSymbolOptionLabel(symbol).toLowerCase().includes(filter));
  }

  function render() {
    if (!gridEl) return;
    const visibleSymbols = getFilteredOptions();
    gridEl.innerHTML = visibleSymbols.length === 0
      ? '<div class="admin-symbol-picker-empty">没有匹配的股票代码。</div>'
      : visibleSymbols.map((symbol) => {
        const checked = selected.has(symbol);
        return `
          <label class="admin-symbol-picker-item${checked ? " selected" : ""}">
            <input type="checkbox" value="${escapeHtml(symbol)}"${checked ? " checked" : ""}>
            <span>${escapeHtml(formatAdminSymbolOptionLabel(symbol))}</span>
          </label>
        `;
      }).join("");
    updateCount();
  }

  if (gridEl) {
    gridEl.addEventListener("change", (event) => {
      const checkbox = event.target.closest('input[type="checkbox"]');
      if (!checkbox) return;
      if (checkbox.checked) {
        selected.add(checkbox.value);
      } else {
        selected.delete(checkbox.value);
      }
      checkbox.closest(".admin-symbol-picker-item").classList.toggle("selected", checkbox.checked);
      updateCount();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      filterText = searchInput.value;
      render();
    });
  }
  if (selectAllButton) {
    selectAllButton.addEventListener("click", () => {
      getFilteredOptions().forEach((symbol) => selected.add(symbol));
      render();
    });
  }
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      selected.clear();
      render();
    });
  }

  return { render, getSelected: () => Array.from(selected) };
}

const adminAutoGenerateSymbolPicker = createAdminSymbolPicker({
  gridEl: adminAutoGenerateSymbolGrid,
  searchInput: adminAutoGenerateSymbolSearchInput,
  selectAllButton: adminAutoGenerateSymbolSelectAllButton,
  clearButton: adminAutoGenerateSymbolClearButton,
  countEl: adminAutoGenerateSymbolCount,
});

const adminScanSymbolPicker = createAdminSymbolPicker({
  gridEl: adminScanSymbolGrid,
  searchInput: adminScanSymbolSearchInput,
  selectAllButton: adminScanSymbolSelectAllButton,
  clearButton: adminScanSymbolClearButton,
  countEl: adminScanSymbolCount,
});

const adminValidatedSearchSymbolPicker = createAdminSymbolPicker({
  gridEl: adminValidatedSearchSymbolGrid,
  searchInput: adminValidatedSearchSymbolSearchInput,
  selectAllButton: adminValidatedSearchSymbolSelectAllButton,
  clearButton: adminValidatedSearchSymbolClearButton,
  countEl: adminValidatedSearchSymbolCount,
});

async function loadAdminAutoGenerate() {
  adminAutoGenerateSymbolPicker.render();
  loadAdminSymbolHistory().then(() => adminAutoGenerateSymbolPicker.render()).catch(() => {});
  if (!adminAutoGenerateList) return;
  if (!adminAutoGenerateList.innerHTML.trim()) {
    adminAutoGenerateList.innerHTML = '<div class="ranking-empty">正在读取自动生成的模型...</div>';
  }
  try {
    const response = await fetch("/api/admin/auto-generate", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取自动生成模型失败。");
    renderAdminAutoGenerateList(payload);
  } catch (error) {
    adminAutoGenerateList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

async function triggerAdminAutoGenerateRun() {
  const symbols = adminAutoGenerateSymbolPicker.getSelected();
  const limit = Number(adminAutoGenerateLimitInput && adminAutoGenerateLimitInput.value);
  const attemptsPerSymbol = Number(adminAutoGenerateAttemptsPerSymbolInput && adminAutoGenerateAttemptsPerSymbolInput.value);
  const maxAttempts = Number(adminAutoGenerateMaxAttemptsInput && adminAutoGenerateMaxAttemptsInput.value);
  const pointCount = Number(adminAutoGeneratePointCountInput && adminAutoGeneratePointCountInput.value);
  const trainYearsAgo = Number(adminAutoGenerateTrainYearsAgoInput && adminAutoGenerateTrainYearsAgoInput.value);
  const testYearsAgo = Number(adminAutoGenerateTestYearsAgoInput && adminAutoGenerateTestYearsAgoInput.value);
  const requested = {
    limit: Number.isFinite(limit) ? limit : 0,
    attemptsPerSymbol: Number.isFinite(attemptsPerSymbol) ? attemptsPerSymbol : 10,
    maxAttempts: Number.isFinite(maxAttempts) ? maxAttempts : 20,
    pointCount: Number.isFinite(pointCount) ? pointCount : 5,
    trainYears: Number.isFinite(trainYearsAgo) ? trainYearsAgo : 4,
    testYears: Number.isFinite(testYearsAgo) ? testYearsAgo : 2,
  };
  if (adminAutoGenerateRunStatus) adminAutoGenerateRunStatus.textContent = "正在启动自动生成...";
  try {
    const response = await fetch("/api/admin/auto-generate/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols, ...requested }),
    });
    const result = await readJsonResponse(response, "启动自动生成失败。");
    // The server clamps limit/attemptsPerSymbol/maxAttempts/trainYears/testYears to
    // sane ranges — if what actually got used differs from what was typed, say so explicitly
    // instead of silently running with a different number than the admin asked for (that's
    // exactly what caused this to be confusing before: the cap existed but nothing ever told
    // you your input got adjusted).
    const adjustments = ["limit", "attemptsPerSymbol", "maxAttempts", "pointCount", "trainYears", "testYears"]
      .filter((key) => Number.isFinite(result[key]) && result[key] !== requested[key])
      .map((key) => `${key} ${requested[key]}→${result[key]}`);
    setStatus(adjustments.length > 0
      ? `已启动 AI 自动生成模型（部分参数超出允许范围，已调整：${adjustments.join("，")}）。`
      : "已启动 AI 自动生成模型。");
    await loadAdminAutoGenerate();
  } catch (error) {
    if (adminAutoGenerateRunStatus) adminAutoGenerateRunStatus.textContent = "";
    setStatus(`启动自动生成失败：${error.message}`, true);
  }
}

// "验证搜索"：跟 AI自动生成 的区别见 search-validated-best.js 顶部注释——对每次尝试都立即在
// 验证期打分，直接找验证期年化收益达标的模型；没达标的也会保存当前最好成绩，方便"继续寻找"时
// 知道每支股票已经搜到哪一步。这个功能没有全市场兜底，必须至少选一支股票。
async function loadAdminValidatedSearch() {
  adminValidatedSearchSymbolPicker.render();
  loadAdminSymbolHistory().then(() => adminValidatedSearchSymbolPicker.render()).catch(() => {});
  renderAdminValidatedSearchIndexOptions();
  updateAdminValidatedSearchModeVisibility();
  if (!adminValidatedSearchList) return;
  if (!adminValidatedSearchList.innerHTML.trim()) {
    adminValidatedSearchList.innerHTML = '<div class="ranking-empty">正在读取验证搜索结果...</div>';
  }
  try {
    const response = await fetch("/api/admin/validated-search", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取验证搜索结果失败。");
    renderAdminValidatedSearchList(payload);
  } catch (error) {
    adminValidatedSearchList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

async function triggerAdminValidatedSearchRun(options = {}) {
  const isIndexMode = !options.resume && adminValidatedSearchModeSelect && adminValidatedSearchModeSelect.value === "index";
  const symbols = (options.resume || isIndexMode) ? [] : adminValidatedSearchSymbolPicker.getSelected();
  const indexMappingId = isIndexMode ? (adminValidatedSearchIndexSelect && adminValidatedSearchIndexSelect.value) : "";
  if (isIndexMode && !indexMappingId) {
    setStatus("请选择一个指数。", true);
    return;
  }
  if (!options.resume && !isIndexMode && symbols.length === 0) {
    setStatus("请至少选择一支股票，或者切换到按指数搜索（这个功能不支持全市场搜索）。", true);
    return;
  }
  const targetPercent = Number(adminValidatedSearchTargetPercentInput && adminValidatedSearchTargetPercentInput.value);
  const upsideThresholdPercent = Number(adminValidatedSearchUpsideThresholdPercentInput && adminValidatedSearchUpsideThresholdPercentInput.value);
  const drawdownTolerancePercent = Number(adminValidatedSearchDrawdownTolerancePercentInput && adminValidatedSearchDrawdownTolerancePercentInput.value);
  const attemptsPerSymbol = Number(adminValidatedSearchAttemptsPerSymbolInput && adminValidatedSearchAttemptsPerSymbolInput.value);
  const maxAttempts = Number(adminValidatedSearchMaxAttemptsInput && adminValidatedSearchMaxAttemptsInput.value);
  const candidates = Number(adminValidatedSearchCandidatesInput && adminValidatedSearchCandidatesInput.value);
  const pointCount = Number(adminValidatedSearchPointCountInput && adminValidatedSearchPointCountInput.value);
  const trainYearsAgo = Number(adminValidatedSearchTrainYearsAgoInput && adminValidatedSearchTrainYearsAgoInput.value);
  const testYearsAgo = Number(adminValidatedSearchTestYearsAgoInput && adminValidatedSearchTestYearsAgoInput.value);
  const requested = {
    targetPercent: Number.isFinite(targetPercent) ? targetPercent : 50,
    upsideThresholdPercent: Number.isFinite(upsideThresholdPercent) ? upsideThresholdPercent : 30,
    drawdownTolerancePercent: Number.isFinite(drawdownTolerancePercent) ? drawdownTolerancePercent : 5,
    attemptsPerSymbol: Number.isFinite(attemptsPerSymbol) ? attemptsPerSymbol : 60,
    maxAttempts: Number.isFinite(maxAttempts) ? maxAttempts : 400,
    candidates: Number.isFinite(candidates) ? candidates : 400,
    pointCount: Number.isFinite(pointCount) ? pointCount : 5,
    trainYears: Number.isFinite(trainYearsAgo) ? trainYearsAgo : 4,
    testYears: Number.isFinite(testYearsAgo) ? testYearsAgo : 2,
  };
  if (adminValidatedSearchRunStatus) adminValidatedSearchRunStatus.textContent = options.resume ? "正在继续上次中断的验证搜索..." : "正在启动验证搜索...";
  try {
    const response = await fetch("/api/admin/validated-search/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols, indexMappingId, resume: Boolean(options.resume), ...requested }),
    });
    const result = await readJsonResponse(response, "启动验证搜索失败。");
    const adjustments = ["targetPercent", "upsideThresholdPercent", "drawdownTolerancePercent", "attemptsPerSymbol", "maxAttempts", "candidates", "pointCount", "trainYears", "testYears"]
      .filter((key) => !options.resume && Number.isFinite(result[key]) && result[key] !== requested[key])
      .map((key) => `${key} ${requested[key]}→${result[key]}`);
    setStatus(adjustments.length > 0
      ? `已启动验证搜索（部分参数超出允许范围，已调整：${adjustments.join("，")}）。`
      : options.resume ? "已继续上次中断的验证搜索。" : "已启动验证搜索。");
    await loadAdminValidatedSearch();
  } catch (error) {
    if (adminValidatedSearchRunStatus) adminValidatedSearchRunStatus.textContent = "";
    setStatus(`启动验证搜索失败：${error.message}`, true);
  }
}

// 达标复查：对下面列表里全部已达标(reached_target=TRUE)的行触发一次复查，不需要选股票——
// 候选范围固定是"已经达标的那些"，跟"启动验证搜索"（找新模型）是两个不同的动作，共用同一把
// 后台任务锁（isScanRunning()），所以按钮的启用/禁用要跟着同一个running状态走。
async function triggerAdminQualifiedRecheckRun() {
  const targetPercent = Number(adminQualifiedRecheckTargetPercentInput && adminQualifiedRecheckTargetPercentInput.value);
  const upsideThresholdPercent = Number(adminQualifiedRecheckUpsideThresholdPercentInput && adminQualifiedRecheckUpsideThresholdPercentInput.value);
  const drawdownTolerancePercent = Number(adminQualifiedRecheckDrawdownTolerancePercentInput && adminQualifiedRecheckDrawdownTolerancePercentInput.value);
  if (adminQualifiedRecheckRunStatus) adminQualifiedRecheckRunStatus.textContent = "正在启动达标复查...";
  try {
    const response = await fetch("/api/admin/qualified-recheck/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetPercent: Number.isFinite(targetPercent) ? targetPercent : 50,
        upsideThresholdPercent: Number.isFinite(upsideThresholdPercent) ? upsideThresholdPercent : 30,
        drawdownTolerancePercent: Number.isFinite(drawdownTolerancePercent) ? drawdownTolerancePercent : 5,
      }),
    });
    await readJsonResponse(response, "启动达标复查失败。");
    setStatus("已启动达标复查。");
    await loadAdminValidatedSearch();
  } catch (error) {
    if (adminQualifiedRecheckRunStatus) adminQualifiedRecheckRunStatus.textContent = "";
    setStatus(`启动达标复查失败：${error.message}`, true);
  }
}

async function pauseAdminValidatedSearch() {
  if (adminValidatedSearchRunStatus) adminValidatedSearchRunStatus.textContent = "正在暂停验证搜索...";
  try {
    const response = await fetch("/api/admin/validated-search/pause", { method: "POST" });
    await readJsonResponse(response, "暂停验证搜索失败。");
    setStatus("验证搜索已暂停。可以点“继续上次中断”接着跑。");
    await loadAdminValidatedSearch();
  } catch (error) {
    if (adminValidatedSearchRunStatus) adminValidatedSearchRunStatus.textContent = "";
    setStatus(`暂停验证搜索失败：${error.message}`, true);
  }
}

let adminValidatedSearchSortKey = "annualizedDiffYear2";
let adminValidatedSearchSortDirection = "asc";
let adminValidatedSearchLastPayload = null;
let adminValidatedSearchPollTimer = null;
let adminValidatedSearchRecommendFilterActive = false;

function renderAdminValidatedSearchList(payload) {
  adminValidatedSearchLastPayload = payload;
  const allPresets = Array.isArray(payload.presets) ? payload.presets : [];
  const presets = adminValidatedSearchRecommendFilterActive ? allPresets.filter(passesAdminRecommendFilter) : allPresets;
  if (adminValidatedSearchList) {
    if (presets.length === 0) {
      adminValidatedSearchList.innerHTML = adminValidatedSearchRecommendFilterActive
        ? '<div class="ranking-empty">没有满足"两年都有真实交易+复查仍达标"的记录。</div>'
        : '<div class="ranking-empty">还没有搜索并保存的模型。</div>';
    } else {
      adminValidatedSearchList.innerHTML = renderAiGeneratedPresetTable(presets, {
        sortKey: adminValidatedSearchSortKey,
        sortDirection: adminValidatedSearchSortDirection,
        sortAttr: "admin-validated-search-sort-key",
        showStatus: true,
        showRecommendDiff: adminValidatedSearchRecommendFilterActive,
      });
    }
  }
  if (adminValidatedSearchRecommendFilterButton) {
    adminValidatedSearchRecommendFilterButton.classList.toggle("active", adminValidatedSearchRecommendFilterActive);
    adminValidatedSearchRecommendFilterButton.textContent = adminValidatedSearchRecommendFilterActive
      ? `已筛选（${presets.length}/${allPresets.length}）· 点击恢复全部`
      : "推荐盯盘筛选（真实交易+复查仍达标，按差异排序）";
  }

  const running = Boolean(payload.running);
  if (adminValidatedSearchRunButton) adminValidatedSearchRunButton.disabled = running;

  const runningIsValidatedSearch = running && payload.scanInfo && payload.scanInfo.jobType === "validatedSearch";
  const lastResult = payload.lastScanResult;
  const validatedSearchLast = lastResult && lastResult.jobType === "validatedSearch" ? lastResult : null;
  const crashed = Boolean(validatedSearchLast && validatedSearchLast.exitCode !== 0);

  // Same "kill = pause, same button resumes" pattern as adminScanPauseResumeButton — a pause
  // is just a deliberate crash (handleAdminValidatedSearchPauseApi), so "crashed" and "paused"
  // are the same state from the UI's perspective.
  if (adminValidatedSearchPauseResumeButton) {
    adminValidatedSearchPauseResumeButton.classList.toggle("hidden", !runningIsValidatedSearch && !crashed);
    adminValidatedSearchPauseResumeButton.disabled = false;
    if (runningIsValidatedSearch) {
      adminValidatedSearchPauseResumeButton.textContent = "暂停";
      adminValidatedSearchPauseResumeButton.dataset.mode = "pause";
    } else if (crashed) {
      adminValidatedSearchPauseResumeButton.textContent = "继续上次中断";
      adminValidatedSearchPauseResumeButton.dataset.mode = "resume";
    }
  }

  if (adminValidatedSearchRunStatus) {
    if (runningIsValidatedSearch) {
      adminValidatedSearchRunStatus.textContent = `验证搜索进行中（由 ${payload.scanInfo.triggeredBy || "?"} 于 ${escapeHtml(formatAdminDate(payload.scanInfo.startedAt))} 启动）...`;
    } else if (running) {
      adminValidatedSearchRunStatus.textContent = "已有其它后台任务在运行，请等它结束后再启动验证搜索。";
    } else if (crashed) {
      adminValidatedSearchRunStatus.textContent = `上次验证搜索已停止/暂停（退出码 ${validatedSearchLast.exitCode}，${escapeHtml(formatAdminDate(validatedSearchLast.endedAt))}）——可以点"继续上次中断"接着跑。`;
    } else if (validatedSearchLast) {
      adminValidatedSearchRunStatus.textContent = `上次验证搜索已停止（正常完成，${escapeHtml(formatAdminDate(validatedSearchLast.endedAt))}）。`;
    } else {
      adminValidatedSearchRunStatus.textContent = "还没有运行过验证搜索。";
    }
  }

  if (adminValidatedSearchProgressBanner) {
    const progress = payload.progress;
    if (progress && (runningIsValidatedSearch || validatedSearchLast)) {
      // Once the job stops (normally or via pause), stay visible instead of vanishing — a
      // banner that just disappears leaves no visible confirmation that the search actually
      // stopped rather than the page simply not having refreshed yet.
      const stopped = !runningIsValidatedSearch;
      const titleText = runningIsValidatedSearch ? "验证搜索进行中" : (crashed ? "验证搜索已停止（暂停/中断）" : "验证搜索已停止（正常完成）");
      const symbolLabel = progress.currentSymbol
        ? `股票 ${progress.symbolIndex || "?"}/${progress.totalSymbols || "?"}（${escapeHtml(progress.currentSymbol)}）`
        : `股票 ${progress.symbolIndex || 0}/${progress.totalSymbols || "?"}`;
      const attemptLabel = progress.attempt ? `第 ${progress.attempt}/${progress.attemptsPerSymbol || "?"} 次尝试` : "";
      const detailParts = [symbolLabel, attemptLabel].filter(Boolean).join(" · ");
      const reasonText = progress.currentReason ? escapeHtml(progress.currentReason) : "";
      const bestReturn = Number.isFinite(progress.bestAnnualizedReturn) ? progress.bestAnnualizedReturn : null;
      const bestReturnLabel = bestReturn !== null
        ? `目前最佳验证期年化收益率 <strong>${bestReturn >= 0 ? "+" : ""}${bestReturn.toFixed(1)}%</strong>（${escapeHtml(progress.bestAnnualizedSymbol || "")}，目标 ${progress.targetPercent || "?"}%）`
        : "目前最佳验证期年化收益率：暂无";
      adminValidatedSearchProgressBanner.classList.remove("hidden");
      adminValidatedSearchProgressBanner.classList.toggle("admin-progress-banner--stopped", stopped);
      adminValidatedSearchProgressBanner.innerHTML = `
        <div class="admin-progress-banner-title"><span class="admin-progress-banner-dot"></span>${titleText}</div>
        <div class="admin-progress-banner-detail">${detailParts}${reasonText ? `<br>${reasonText}` : ""}</div>
        <div class="admin-progress-banner-best">${bestReturnLabel}</div>
        <div class="admin-progress-banner-stats">
          <span>AI 调用 <strong>${progress.aiCalls || 0}</strong>/${progress.maxAttempts || "?"}</span>
          <span>已保存 <strong>${progress.saved || 0}</strong></span>
          <span>数据不足跳过 <strong>${progress.dataSkipped || 0}</strong></span>
          <span>出错 <strong>${progress.errored || 0}</strong></span>
        </div>
      `;
    } else {
      adminValidatedSearchProgressBanner.classList.add("hidden");
      adminValidatedSearchProgressBanner.innerHTML = "";
    }
  }

  // 达标复查跟"启动验证搜索"共用同一把锁（running来自同一个isScanRunning()），所以复查按钮
  // 在任意批量任务运行时都要禁用，不只是复查自己在跑的时候。
  const runningIsRecheck = Boolean(payload.qualifiedRecheckRunning);
  if (adminQualifiedRecheckRunButton) adminQualifiedRecheckRunButton.disabled = running;
  const recheckLast = lastResult && lastResult.jobType === "qualifiedRecheck" ? lastResult : null;
  if (adminQualifiedRecheckRunStatus) {
    if (runningIsRecheck) {
      adminQualifiedRecheckRunStatus.textContent = `达标复查进行中（由 ${payload.scanInfo.triggeredBy || "?"} 于 ${escapeHtml(formatAdminDate(payload.scanInfo.startedAt))} 启动）...`;
    } else if (running) {
      adminQualifiedRecheckRunStatus.textContent = "已有其它后台任务在运行，请等它结束后再启动达标复查。";
    } else if (recheckLast) {
      adminQualifiedRecheckRunStatus.textContent = `上次达标复查${recheckLast.exitCode === 0 ? "已完成" : "异常退出"}（${escapeHtml(formatAdminDate(recheckLast.endedAt))}）。`;
    } else {
      adminQualifiedRecheckRunStatus.textContent = "还没有运行过达标复查。";
    }
  }
  if (adminQualifiedRecheckProgressBanner) {
    const recheckProgress = payload.qualifiedRecheckProgress;
    if (recheckProgress && (runningIsRecheck || recheckLast)) {
      const stopped = !runningIsRecheck;
      const titleText = runningIsRecheck ? "达标复查进行中" : "达标复查已停止";
      const symbolLabel = recheckProgress.currentSymbol
        ? `第 ${recheckProgress.index || "?"}/${recheckProgress.total || "?"} 个（${escapeHtml(recheckProgress.currentSymbol)}）`
        : `第 ${recheckProgress.index || 0}/${recheckProgress.total || "?"} 个`;
      const reasonText = recheckProgress.currentReason ? escapeHtml(recheckProgress.currentReason) : "";
      adminQualifiedRecheckProgressBanner.classList.remove("hidden");
      adminQualifiedRecheckProgressBanner.classList.toggle("admin-progress-banner--stopped", stopped);
      adminQualifiedRecheckProgressBanner.innerHTML = `
        <div class="admin-progress-banner-title"><span class="admin-progress-banner-dot"></span>${titleText}</div>
        <div class="admin-progress-banner-detail">${symbolLabel}${reasonText ? `<br>${reasonText}` : ""}</div>
        <div class="admin-progress-banner-stats">
          <span>已复查 <strong>${recheckProgress.checked || 0}</strong></span>
          <span>仍达标 <strong>${recheckProgress.stillQualifies || 0}</strong></span>
          <span>不再达标 <strong>${recheckProgress.noLongerQualifies || 0}</strong></span>
          <span>跳过 <strong>${recheckProgress.skipped || 0}</strong></span>
        </div>
      `;
    } else {
      adminQualifiedRecheckProgressBanner.classList.add("hidden");
      adminQualifiedRecheckProgressBanner.innerHTML = "";
    }
  }

  if (running) {
    scheduleAdminValidatedSearchPoll();
  } else {
    stopAdminValidatedSearchPoll();
  }
}

function scheduleAdminValidatedSearchPoll() {
  if (adminValidatedSearchPollTimer) return;
  adminValidatedSearchPollTimer = window.setInterval(() => {
    if (!adminValidatedSearchPanel || adminValidatedSearchPanel.classList.contains("hidden")) {
      stopAdminValidatedSearchPoll();
      return;
    }
    loadAdminValidatedSearch();
  }, 5000);
}

function stopAdminValidatedSearchPoll() {
  if (adminValidatedSearchPollTimer) {
    window.clearInterval(adminValidatedSearchPollTimer);
    adminValidatedSearchPollTimer = null;
  }
}

// "定时任务"面板：只读列出server.js SCHEDULED_JOB_REGISTRY里已知的host-cron脚本 + 每个任务
// 通过这个面板手动触发过的最近一次结果（不是cron自动触发的历史，见面板顶部提示文案和
// server.js里对应注释）。每个任务各自独立轮询（不是batch共享锁），所以互相不冲突。
let adminScheduledJobsPollTimer = null;

async function loadAdminScheduledJobs() {
  if (!adminScheduledJobsList) return;
  if (!adminScheduledJobsList.innerHTML.trim()) {
    adminScheduledJobsList.innerHTML = '<div class="ranking-empty">正在读取定时任务列表...</div>';
  }
  try {
    const response = await fetch("/api/admin/scheduled-jobs", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取定时任务列表失败。");
    renderAdminScheduledJobsList(payload);
  } catch (error) {
    adminScheduledJobsList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

function renderAdminScheduledJobsList(payload) {
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  const anyRunning = jobs.some((job) => job.running);
  if (adminScheduledJobsList) {
    if (jobs.length === 0) {
      adminScheduledJobsList.innerHTML = '<div class="ranking-empty">没有已知的定时任务。</div>';
    } else {
      const rows = jobs.map((job) => {
        const last = job.lastResult;
        let statusText;
        if (job.running) {
          statusText = `<span class="up">正在执行…</span>（由 ${escapeHtml(last && last.triggeredBy || "?")} 触发）`;
        } else if (last) {
          statusText = last.exitCode === 0
            ? `<span class="up">上次手动执行成功</span>（${escapeHtml(formatAdminDate(last.endedAt))}，由 ${escapeHtml(last.triggeredBy || "?")} 触发）`
            : `<span class="down">上次手动执行失败</span>（退出码 ${last.exitCode}，${escapeHtml(formatAdminDate(last.endedAt))}）`;
        } else {
          statusText = '<span class="field-hint">还没有通过这个面板手动执行过</span>';
        }
        return `
          <tr>
            <td>${escapeHtml(job.label)}</td>
            <td>${escapeHtml(job.scheduleText)}</td>
            <td>${statusText}</td>
            <td><button type="button" class="ghost-button admin-scheduled-job-run-button" data-job-name="${escapeHtml(job.jobName)}" ${job.running ? "disabled" : ""}>立即执行</button></td>
          </tr>
        `;
      }).join("");
      adminScheduledJobsList.innerHTML = `
        <table class="admin-ranking-table">
          <thead><tr><th>任务</th><th>已知调度</th><th>状态</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }
  }
  if (anyRunning) {
    scheduleAdminScheduledJobsPoll();
  } else {
    stopAdminScheduledJobsPoll();
  }
}

function scheduleAdminScheduledJobsPoll() {
  if (adminScheduledJobsPollTimer) return;
  adminScheduledJobsPollTimer = window.setInterval(() => {
    if (!adminScheduledJobsPanel || adminScheduledJobsPanel.classList.contains("hidden")) {
      stopAdminScheduledJobsPoll();
      return;
    }
    loadAdminScheduledJobs();
  }, 5000);
}

function stopAdminScheduledJobsPoll() {
  if (adminScheduledJobsPollTimer) {
    window.clearInterval(adminScheduledJobsPollTimer);
    adminScheduledJobsPollTimer = null;
  }
}

async function triggerAdminScheduledJobRun(jobName) {
  try {
    const response = await fetch("/api/admin/scheduled-jobs/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobName }),
    });
    await readJsonResponse(response, "启动任务失败。");
    setStatus("已启动。");
    await loadAdminScheduledJobs();
  } catch (error) {
    setStatus(`启动任务失败：${error.message}`, true);
  }
}

if (adminScheduledJobsList) {
  adminScheduledJobsList.addEventListener("click", (event) => {
    const button = event.target && event.target.closest ? event.target.closest(".admin-scheduled-job-run-button") : null;
    if (!button || button.disabled) return;
    triggerAdminScheduledJobRun(button.dataset.jobName);
  });
}

if (adminValidatedSearchList) {
  adminValidatedSearchList.addEventListener("click", (event) => {
    const target = event.target;
    const viewParamsButton = target && target.closest ? target.closest(".admin-view-params-button") : null;
    if (viewParamsButton) {
      openAdminValidatedSearchParamViewer(viewParamsButton.dataset.presetId);
      return;
    }
    const rerunButton = target && target.closest ? target.closest(".admin-auto-generate-rerun-button") : null;
    if (rerunButton) {
      openAdminValidatedSearchRerun(rerunButton.dataset.presetId);
      return;
    }
    const sortHeader = target && target.closest ? target.closest(".admin-scan-sort-header") : null;
    if (sortHeader) {
      const key = sortHeader.dataset.adminValidatedSearchSortKey;
      if (adminValidatedSearchSortKey === key) {
        adminValidatedSearchSortDirection = adminValidatedSearchSortDirection === "asc" ? "desc" : "asc";
      } else {
        adminValidatedSearchSortKey = key;
        adminValidatedSearchSortDirection = "desc";
      }
      if (adminValidatedSearchLastPayload) renderAdminValidatedSearchList(adminValidatedSearchLastPayload);
    }
  });
}

// "选股": pick a saved model + a market, server scans that market's whole symbols.json
// universe for stocks whose most recent trading day triggered a buy/sell signal under that
// model. Only server-persisted presets have a database id (built-in hardcoded defaults in
// strategyPresets don't, unless a same-named preset was also saved server-side), and a
// presetId is required to launch a scan, so the picker only lists presets that have one.
// Built-in hardcoded presets (no server row) have no numericId — this returns "" for them
// rather than "#undefined ·", which is the expected/documented limitation (see plan).
function formatModelIdPrefix(preset) {
  return preset && preset.numericId ? `#${preset.numericId} · ` : "";
}

function renderScreenPresetOptions() {
  if (!screenPresetSelect) return;
  const entries = Object.entries(strategyPresets).filter(([, preset]) => preset && preset.id);
  if (entries.length === 0) {
    screenPresetSelect.innerHTML = '<option value="">暂无可用模型（请先保存一个模型）</option>';
    return;
  }
  const previousValue = screenPresetSelect.value;
  screenPresetSelect.innerHTML = entries
    .map(([name, preset]) => `<option value="${escapeHtml(preset.id)}">${formatModelIdPrefix(preset)}${escapeHtml(preset.label || name)}</option>`)
    .join("");
  if (previousValue && entries.some(([, preset]) => preset.id === previousValue)) {
    screenPresetSelect.value = previousValue;
  }
}

function renderScreenMatchesTable(matches, runId) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return '<div class="ranking-empty">暂无符合条件的股票。</div>';
  }
  const rows = matches.map((m, index) => `
    <tr>
      <td>${escapeHtml(m.code || "")}</td>
      <td>${escapeHtml(m.name || "")}</td>
      <td class="${m.action === "buy" ? "up" : "down"}">${escapeHtml(m.label || (m.action === "buy" ? "买入" : "卖出"))}</td>
      <td>${Number.isFinite(m.price) ? m.price.toFixed(2) : ""}</td>
      <td>${Number.isFinite(m.positionRatio) ? `${m.positionRatio.toFixed(1)}%` : ""}</td>
      <td>${escapeHtml(m.reason || "")}</td>
      <td>${escapeHtml(m.date || "")}</td>
      <td><button type="button" class="ghost-button screen-match-rerun-button" data-screen-run-id="${escapeHtml(runId || "")}" data-screen-match-index="${index}">查看模拟</button></td>
    </tr>
  `).join("");
  return `
    <table class="admin-ranking-table">
      <thead>
        <tr><th>代码</th><th>名称</th><th>方向</th><th>价格</th><th>目标仓位</th><th>触发原因</th><th>日期</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatScreenStatusLabel(status) {
  if (status === "running") return "进行中";
  if (status === "done") return "已完成";
  if (status === "crashed") return "出错";
  return status || "";
}

// Shared by both the main-page "选股" list (own runs only) and the admin "选股记录" list
// (all users' runs) — a <details> block keeps the (potentially long) matches table collapsed
// by default without needing separate click-to-expand wiring.
function renderScreenRunEntry(run, options = {}) {
  const marketLabel = run.market === "US" ? "美股" : "A股";
  const statusLabel = formatScreenStatusLabel(run.status);
  const progress = `${run.scannedSymbols || 0}/${run.totalSymbols || "?"}`;
  const ownerPart = options.showOwner ? `${escapeHtml(run.ownerEmail || "")} · ` : "";
  const errorPart = run.error ? ` · ${escapeHtml(run.error)}` : "";
  const summary = `${ownerPart}${escapeHtml(run.presetLabel || run.presetId || "")} · ${marketLabel} · ${statusLabel} · 已扫描 ${progress} · 命中 ${run.matchCount || 0} · ${escapeHtml(formatAdminDate(run.startedAt))}${errorPart}`;
  return `
    <details class="admin-scan-details">
      <summary>${summary}</summary>
      ${renderScreenMatchesTable(run.matches, run.id)}
    </details>
  `;
}

// Opens the shared 重新运行 playback dialog (adminRerunDialog / runAdminRerunPlayback) loaded
// with this match's exact model config, using LIVE data (runAdminRerunPlayback fetches via
// /api/klines, which always live-fetches from third parties, same as regular 历史模拟) rather
// than the scan's own cached local data — then jumps straight to today and highlights the
// trade that made this stock show up as a match, instead of animating from day one.
async function openScreenMatchRerun(run, match) {
  if (!adminRerunDialog || !run || !match) return;
  const config = run.presetConfigSnapshot;
  if (!config || Object.keys(config).length === 0) {
    setStatus("这条扫描记录没有保存模型参数快照，无法查看模拟。", true);
    return;
  }
  await runAdminRerunPlayback({
    title: `选股结果：${match.name || match.code}（${run.presetLabel || ""}）`,
    symbol: match.code,
    config,
    strategyType: config.strategyType,
    start: formatDate(shiftYears(new Date(), -2)),
    end: todayText(),
  });
  skipAdminRerunToEnd();
  if (adminRerunState && adminRerunState.allTrades && adminRerunState.allTrades.length > 0) {
    openAdminRerunTradeDetail(adminRerunState.allTrades[adminRerunState.allTrades.length - 1]);
  }
}

let screenRunsCache = [];
let adminStockScreenRunsCache = [];

function handleScreenMatchRerunClick(event, runsCache) {
  const button = event.target.closest(".screen-match-rerun-button");
  if (!button) return;
  const run = runsCache.find((item) => item.id === button.dataset.screenRunId);
  if (!run) return;
  const match = (run.matches || [])[Number(button.dataset.screenMatchIndex)];
  if (!match) return;
  openScreenMatchRerun(run, match);
}

if (screenRunList) {
  screenRunList.addEventListener("click", (event) => handleScreenMatchRerunClick(event, screenRunsCache));
}
if (adminStockScreenList) {
  adminStockScreenList.addEventListener("click", (event) => handleScreenMatchRerunClick(event, adminStockScreenRunsCache));
}

let screenPollTimer = null;

function scheduleScreenPoll() {
  if (screenPollTimer) return;
  screenPollTimer = window.setInterval(() => {
    const screenPage = document.querySelector('[data-wizard-page="screen"]');
    if (!screenPage || !screenPage.classList.contains("active")) {
      stopScreenPoll();
      return;
    }
    loadStockScreen();
  }, 5000);
}

function stopScreenPoll() {
  if (screenPollTimer) {
    window.clearInterval(screenPollTimer);
    screenPollTimer = null;
  }
}

function renderScreenStatus(payload) {
  const runs = Array.isArray(payload.runs) ? payload.runs : [];
  screenRunsCache = runs;
  const runningRun = runs.find((run) => run.status === "running");

  if (screenStartButton) screenStartButton.disabled = Boolean(runningRun) || Boolean(payload.systemBusy);
  if (screenStatusText) {
    if (runningRun) {
      screenStatusText.textContent = "扫描进行中...";
    } else if (payload.systemBusy) {
      screenStatusText.textContent = "系统正在处理其他后台任务，请稍后再试。";
    } else {
      screenStatusText.textContent = "";
    }
  }

  if (screenProgressBanner) {
    if (runningRun) {
      const marketLabel = runningRun.market === "US" ? "美股" : "A股";
      screenProgressBanner.classList.remove("hidden");
      screenProgressBanner.innerHTML = `
        <div class="admin-progress-banner-title"><span class="admin-progress-banner-dot"></span>选股扫描进行中</div>
        <div class="admin-progress-banner-detail">模型：${escapeHtml(runningRun.presetLabel || "")} · 市场：${marketLabel}</div>
        <div class="admin-progress-banner-stats">
          <span>已扫描 <strong>${runningRun.scannedSymbols || 0}</strong>/${runningRun.totalSymbols || "?"}</span>
          <span>已发现 <strong>${runningRun.matchCount || 0}</strong> 只</span>
        </div>
      `;
    } else {
      screenProgressBanner.classList.add("hidden");
      screenProgressBanner.innerHTML = "";
    }
  }

  if (screenRunList) {
    screenRunList.innerHTML = runs.length === 0
      ? '<div class="ranking-empty">还没有扫描记录。</div>'
      : runs.map((run) => renderScreenRunEntry(run)).join("");
  }

  if (runningRun) {
    scheduleScreenPoll();
  } else {
    stopScreenPoll();
  }
}

async function loadStockScreen() {
  if (!screenRunList) return;
  if (!screenRunList.innerHTML.trim()) {
    screenRunList.innerHTML = '<div class="ranking-empty">正在读取扫描记录...</div>';
  }
  try {
    const response = await fetch("/api/stock-screen", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取选股结果失败。");
    renderScreenStatus(payload);
  } catch (error) {
    screenRunList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

async function triggerStockScreenRun() {
  const presetId = screenPresetSelect && screenPresetSelect.value;
  const market = screenMarketSelect && screenMarketSelect.value;
  if (!presetId) {
    setStatus("请先选择一个模型。", true);
    return;
  }
  if (screenStatusText) screenStatusText.textContent = "正在启动扫描...";
  try {
    const response = await fetch("/api/stock-screen/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetId, market }),
    });
    await readJsonResponse(response, "启动选股扫描失败。");
    setStatus("已启动选股扫描。");
    await loadStockScreen();
  } catch (error) {
    if (screenStatusText) screenStatusText.textContent = "";
    setStatus(`启动选股扫描失败：${error.message}`, true);
  }
}

if (screenStartButton) {
  screenStartButton.addEventListener("click", () => triggerStockScreenRun());
}

// "设置盯盘提醒": the persistent, single-stock, scheduled counterpart to 选股's one-shot
// market-wide scan — a user configures (model, stock, check frequency), and
// scripts/universe/run-watch-alerts.js (host-cron driven) periodically re-checks it and
// emails the owner when a signal fires. Reuses the same preset-list source as 选股's picker.
function renderWatchAlertsPresetOptions() {
  if (!watchAlertsPresetSelect) return;
  const entries = Object.entries(strategyPresets).filter(([, preset]) => preset && preset.id);
  if (entries.length === 0) {
    watchAlertsPresetSelect.innerHTML = '<option value="">暂无可用模型（请先保存一个模型）</option>';
    return;
  }
  const previousValue = watchAlertsPresetSelect.value;
  watchAlertsPresetSelect.innerHTML = entries
    .map(([name, preset]) => `<option value="${escapeHtml(preset.id)}">${formatModelIdPrefix(preset)}${escapeHtml(preset.label || name)}</option>`)
    .join("");
  if (previousValue && entries.some(([, preset]) => preset.id === previousValue)) {
    watchAlertsPresetSelect.value = previousValue;
  }
}

// Cached after the first fetch — this list comes from the index_catalog DB table (see
// scripts/shared/index-catalog.js), shared by 设置盯盘提醒's "整个指数" mode and AI 验证搜索's
// "按指数搜索" mode, no need to re-fetch every time either dialog/panel opens.
let sharedIndexCatalog = null;

async function loadIndexCatalogOnce() {
  if (sharedIndexCatalog) return sharedIndexCatalog;
  const response = await fetch("/api/watch-alert-indexes", { cache: "no-store" });
  const payload = await readJsonResponse(response, "读取指数列表失败。");
  sharedIndexCatalog = (Array.isArray(payload.indexes) ? payload.indexes : [])
    .sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));
  return sharedIndexCatalog;
}

// The <option> value is the mapping_id (e.g. "CSI300") — the server resolves the actual
// AKShare code from index_catalog, callers never need the raw code.
function renderIndexCatalogOptions(selectEl, catalog) {
  selectEl.innerHTML = catalog
    .map((entry) => {
      const label = `${entry.officialName}（${entry.shortName}，${entry.marketCoverage}，样本${entry.constituentCountHint}）`;
      return `<option value="${escapeHtml(entry.mappingId)}"${entry.available ? "" : " disabled"}>${escapeHtml(label)}${entry.available ? "" : "（暂不支持，指数代码待确认）"}</option>`;
    })
    .join("");
  const firstAvailable = catalog.find((entry) => entry.available);
  if (firstAvailable) selectEl.value = firstAvailable.mappingId;
}

async function renderWatchAlertsIndexOptions() {
  if (!watchAlertsIndexSelect) return;
  try {
    const catalog = await loadIndexCatalogOnce();
    renderIndexCatalogOptions(watchAlertsIndexSelect, catalog);
  } catch (error) {
    watchAlertsIndexSelect.innerHTML = `<option value="">读取指数列表失败：${escapeHtml(error.message)}</option>`;
  }
}

async function renderAdminValidatedSearchIndexOptions() {
  if (!adminValidatedSearchIndexSelect) return;
  try {
    const catalog = await loadIndexCatalogOnce();
    renderIndexCatalogOptions(adminValidatedSearchIndexSelect, catalog);
  } catch (error) {
    adminValidatedSearchIndexSelect.innerHTML = `<option value="">读取指数列表失败：${escapeHtml(error.message)}</option>`;
  }
}

function updateAdminValidatedSearchModeVisibility() {
  const isIndexMode = adminValidatedSearchModeSelect && adminValidatedSearchModeSelect.value === "index";
  if (adminValidatedSearchManualPicker) adminValidatedSearchManualPicker.classList.toggle("hidden", isIndexMode);
  if (adminValidatedSearchIndexPicker) adminValidatedSearchIndexPicker.classList.toggle("hidden", !isIndexMode);
}

if (adminValidatedSearchModeSelect) {
  adminValidatedSearchModeSelect.addEventListener("change", updateAdminValidatedSearchModeVisibility);
}

function updateWatchAlertsModeVisibility() {
  const isIndexMode = watchAlertsModeSelect && watchAlertsModeSelect.value === "index";
  if (watchAlertsMarketLabel) watchAlertsMarketLabel.classList.toggle("hidden", isIndexMode);
  if (watchAlertsSymbolLabel) watchAlertsSymbolLabel.classList.toggle("hidden", isIndexMode);
  if (watchAlertsIndexLabel) watchAlertsIndexLabel.classList.toggle("hidden", !isIndexMode);
}

if (watchAlertsModeSelect) {
  watchAlertsModeSelect.addEventListener("change", updateWatchAlertsModeVisibility);
}

function formatWatchAlertFrequency(minutes) {
  if (minutes >= 1440) return "每天一次";
  if (minutes >= 60) return `每 ${minutes / 60} 小时`;
  return `每 ${minutes} 分钟`;
}

// 交易对象的字段形状（side/price/date/reason/label）跟 renderScreenMatchesTable 消费的
// 选股匹配记录一致（两边都来自 engine.js 的回测 trades 数组），所以列结构直接照抄那份。
function renderWatchAlertOrdersTable(trades) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return '<div class="ranking-empty">暂无模拟订单。</div>';
  }
  const rows = trades.map((t) => `
    <tr>
      <td class="${t.side === "buy" ? "up" : "down"}">${t.side === "buy" ? "买入" : "卖出"}</td>
      <td>${Number.isFinite(t.price) ? t.price.toFixed(2) : escapeHtml(t.price)}</td>
      <td>${escapeHtml(t.date || "")}</td>
      <td>${escapeHtml(t.reason || t.label || "")}</td>
    </tr>
  `).join("");
  return `
    <table class="admin-ranking-table">
      <thead><tr><th>方向</th><th>价格</th><th>日期</th><th>原因</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatWatchAlertAccountStats(watch) {
  if (watch.accountEquity === null || watch.accountEquity === undefined || watch.accountRowsScored <= 0) {
    return '<span class="field-hint">账户数据尚未计算（等待下一次检查周期）</span>';
  }
  const returnClass = watch.accountReturnRate >= 0 ? "up" : "down";
  return `
    <span>账户权益 <strong>${watch.accountEquity.toFixed(0)}</strong></span>
    <span class="${returnClass}">回报率 ${watch.accountReturnRate.toFixed(1)}%</span>
    <span class="${returnClass}">年化 ${watch.accountAnnualizedReturn.toFixed(1)}%</span>
    <span>持仓 ${watch.accountPositionRatio.toFixed(1)}%</span>
  `;
}

// Shared by both the main-page "我的盯盘提醒" list (own watches, with toggle/delete actions)
// and the admin "盯盘提醒" list (all users' watches, read-only + owner column) — a <details>
// block keeps each watch's order history collapsed by default, same pattern as
// renderScreenRunEntry uses for 选股 run entries.
// 关注者(follower)权限说明: role="follower" rows come from someone ELSE's watch, shared via an
// invite link (see shareWatchAlert/followWatchByToken) — server.js's mapWatchAlertRow already
// stripped presetConfig/lastSignalReason/each trade's reason before this ever reaches the
// client, so there's nothing left here that could leak the frozen model's actual rules even if
// this function tried to show them. What this function does on top of that: never render the
// model name as a clickable "查看参数" popup trigger for a follower row (every action in that
// popup — 查看参数/查看历史交易记录/重新验证/另存/建立盯盘 — depends on the config this role
// doesn't have), and swap owner-only controls (启用/停用/删除/分享) for a 取消关注 button.
function renderWatchAlertEntry(watch, options = {}) {
  const isIndexWatch = Boolean(watch.indexCode);
  const isFollowerRow = watch.role === "follower";
  const marketLabel = watch.market === "US" ? "美股" : "A股";
  const signalCell = isIndexWatch
    ? (watch.lastSignalDate
      ? `<span class="up" title="${escapeHtml(watch.lastSignalReason || "")}">${escapeHtml(watch.lastSignalDate)} 有成分股触发信号</span>`
      : '<span class="field-hint">暂无信号</span>')
    : (watch.lastSignalDate
      ? `<span class="${watch.lastSignalAction === "buy" ? "up" : "down"}">${watch.lastSignalAction === "buy" ? "买入" : "卖出"} ${escapeHtml(watch.lastSignalDate)}</span>`
      : '<span class="field-hint">暂无信号</span>');
  const failurePart = watch.consecutiveFailures > 0
    ? ` · <span class="down" title="${escapeHtml(watch.lastError || "")}">失败 ${watch.consecutiveFailures} 次</span>`
    : "";
  const ownerPart = options.showOwner ? `${escapeHtml(watch.ownerEmail || "")} · ` : "";
  const statusPart = !watch.enabled ? ' · <span class="down">已停用</span>' : "";
  // 模型冻结在创建盯盘那一刻，不会被后台的重新优化悄悄改变；这里的"已失效"是指冻结的这套
  // 参数在最近一年的新数据上已经跑不赢买入持有了（见 run-watch-alerts.js 的 evaluateModelValidity）。
  const invalidPart = watch.isInvalid
    ? ` · <span class="down" title="${escapeHtml(watch.invalidReason || "")}">⚠ 模型已失效${watch.enabled ? "（仍有持仓，继续跟踪）" : ""}</span>`
    : "";
  const modelLink = isFollowerRow
    ? `${escapeHtml(watch.presetLabel || "模型")}<span class="field-hint">（关注·不可查看参数）</span>`
    : formatModelNameLink({
      id: watch.presetId, numericId: watch.presetNumericId, label: watch.presetLabel,
      config: watch.presetConfig, strategyType: watch.presetStrategyType, symbol: watch.symbol,
      isOwner: false, name: null,
    });
  const targetLabel = isIndexWatch
    ? `${escapeHtml(watch.indexName || watch.indexCode)}（全指数）`
    : `${escapeHtml(watch.symbolName || watch.symbol)}（${escapeHtml(watch.symbol)}）`;
  const summary = `${ownerPart}${modelLink} · ${targetLabel} · ${marketLabel} · ${formatWatchAlertFrequency(watch.frequencyMinutes)} · ${signalCell}${statusPart}${invalidPart}${failurePart} · 设置于 ${escapeHtml(formatAdminDate(watch.createdAt))}`;

  let actionsPart = "";
  if (!options.showOwner && isFollowerRow) {
    actionsPart = `
      <div class="admin-scan-actions">
        <button type="button" class="ghost-button watch-alert-unfollow-button" data-watch-id="${escapeHtml(watch.id)}">取消关注</button>
      </div>
    `;
  } else if (!options.showOwner) {
    actionsPart = `
      <div class="admin-scan-actions">
        <button type="button" class="ghost-button watch-alert-toggle-button" data-watch-id="${escapeHtml(watch.id)}" data-enabled="${watch.enabled ? "1" : "0"}">${watch.enabled ? "停用" : "启用"}</button>
        <button type="button" class="ghost-button watch-alert-delete-button" data-watch-id="${escapeHtml(watch.id)}">删除</button>
        <button type="button" class="ghost-button watch-alert-share-button" data-watch-id="${escapeHtml(watch.id)}" data-regenerate="0">${watch.inviteToken ? "复制分享链接" : "生成分享链接"}</button>
        ${watch.inviteToken ? `<button type="button" class="ghost-button watch-alert-share-button" data-watch-id="${escapeHtml(watch.id)}" data-regenerate="1">重新生成（原链接失效）</button>` : ""}
      </div>
    `;
  }

  // invalidPart/failurePart上面那两个摘要里的title=""都只是悬浮提示——鼠标hover才看得到，
  // 触屏设备基本看不到，之前用户就是这么问"在哪能看到这段文字"的。这里在正文区域把完整
  // 原因都再显示一遍，不用hover就能看见。
  const invalidReasonPart = watch.isInvalid && watch.invalidReason
    ? `<div class="field-hint down">${escapeHtml(watch.invalidReason)}</div>`
    : "";
  const failureReasonPart = watch.consecutiveFailures > 0 && watch.lastError
    ? `<div class="field-hint down">检查失败：${escapeHtml(watch.lastError)}</div>`
    : "";
  // Owner-only: who's currently following this watch, with a per-follower 移除 button. Never
  // shown for a follower's own row (they don't get to see who else follows it) or the admin view.
  const followersPart = (!options.showOwner && !isFollowerRow && Array.isArray(watch.followers))
    ? `<div class="field-hint">关注者（${watch.followers.length}）：${watch.followers.length === 0 ? "暂无" : watch.followers.map((f) => `${escapeHtml(f.followerEmail)} <button type="button" class="ghost-button watch-alert-remove-follower-button" data-watch-id="${escapeHtml(watch.id)}" data-follower-user-id="${escapeHtml(f.followerUserId)}">移除</button>`).join("、 ")}</div>`
    : "";
  // 指数盯盘没有单一股票的模拟账户/价格图/订单表——每次检查扫的是当前全部成分股，不是
  // 一支固定的票，跟"从创建那一刻起模拟交易"的单股账户模型不是一回事。
  const bodyPart = isIndexWatch
    ? `<div class="field-hint">${watch.lastSignalReason ? escapeHtml(watch.lastSignalReason) : "指数盯盘不模拟账户，触发信号时会邮件列出当次所有触发的成分股。"}</div>`
    : `
      ${invalidReasonPart}
      ${failureReasonPart}
      ${followersPart}
      <div class="admin-progress-banner-stats">${formatWatchAlertAccountStats(watch)}</div>
      <div class="trade-price-wrap trade-price-wrap--compact">
        <svg class="watch-alert-chart-svg" role="img" aria-label="盯盘期间价格走势与买卖点"></svg>
      </div>
      ${renderWatchAlertOrdersTable(watch.accountTrades)}
    `;
  return `
    <details class="admin-scan-details" data-watch-id="${escapeHtml(watch.id)}">
      <summary>${summary}</summary>
      ${bodyPart}
      ${actionsPart}
    </details>
  `;
}

let watchAlertsCache = [];
let adminWatchAlertsCache = [];

// Lazy-loads the price chart the first time a watch's <details> row is actually expanded —
// firing an /api/klines request per row on every list render would be wasteful for a list of
// many watches most of which stay collapsed. `toggle` events don't bubble, so delegation below
// listens in the capture phase instead.
async function loadWatchAlertChart(watch, svgEl) {
  if (!svgEl || svgEl.dataset.loaded === "1") return;
  svgEl.dataset.loaded = "1";
  if (!Array.isArray(watch.accountTrades) || watch.accountRowsScored <= 0) return;
  try {
    const start = String(watch.createdAt || "").slice(0, 10);
    const end = todayText();
    const params = new URLSearchParams({ code: watch.symbol, start, end });
    const response = await fetch(`/api/klines?${params.toString()}`);
    const result = await readJsonResponse(response, "行情读取失败。");
    const rows = (result.rows || []).filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close)
      && row.close > 0 && Number.isFinite(row.high) && Number.isFinite(row.low));
    if (rows.length === 0) return;
    const trades = watch.accountTrades
      .map((t) => ({ ...t, rowIndex: rows.findIndex((r) => r.date === t.date) }))
      .filter((t) => t.rowIndex >= 0);
    drawModelOrderPriceChartInto(svgEl, rows, trades);
  } catch (error) {
    // Best-effort — the trade table below still shows the same information as text.
  }
}

function handleWatchAlertsToggle(event, watchesCache) {
  const details = event.target;
  if (!details || details.tagName !== "DETAILS" || !details.open) return;
  const watchId = details.dataset.watchId;
  const watch = watchesCache.find((item) => item.id === watchId);
  const svgEl = details.querySelector(".watch-alert-chart-svg");
  if (watch && svgEl) loadWatchAlertChart(watch, svgEl);
}

// "我的" shows watches this account owns (role="owner"); "关注的" shows watches someone else
// shared a link/code for and this account followed (role="follower", see server.js's
// mapWatchAlertRow doc comment for what's hidden on those rows). Both come back from the same
// GET /api/watch-alerts call — this only switches which slice of the already-fetched cache is
// rendered, no refetch needed.
let watchAlertsActiveTab = "owned";

function renderWatchAlertsList() {
  if (!watchAlertsList) return;
  const wantRole = watchAlertsActiveTab === "followed" ? "follower" : "owner";
  const visible = watchAlertsCache.filter((watch) => (watch.role || "owner") === wantRole);
  if (visible.length === 0) {
    watchAlertsList.innerHTML = `<div class="ranking-empty">${wantRole === "follower" ? "还没有关注任何人的盯盘。" : "还没有设置盯盘提醒。"}</div>`;
    return;
  }
  watchAlertsList.innerHTML = visible.map((watch) => renderWatchAlertEntry(watch)).join("");
}

function setWatchAlertsActiveTab(tab) {
  watchAlertsActiveTab = tab;
  if (watchAlertsOwnedTabButton) watchAlertsOwnedTabButton.classList.toggle("active", tab === "owned");
  if (watchAlertsFollowedTabButton) watchAlertsFollowedTabButton.classList.toggle("active", tab === "followed");
  renderWatchAlertsList();
}

if (watchAlertsOwnedTabButton) {
  watchAlertsOwnedTabButton.addEventListener("click", () => setWatchAlertsActiveTab("owned"));
}
if (watchAlertsFollowedTabButton) {
  watchAlertsFollowedTabButton.addEventListener("click", () => setWatchAlertsActiveTab("followed"));
}

if (watchAlertsList) {
  watchAlertsList.addEventListener("toggle", (event) => handleWatchAlertsToggle(event, watchAlertsCache), true);
}

async function loadMyWatchAlerts() {
  if (!watchAlertsList) return;
  if (!watchAlertsList.innerHTML.trim()) {
    watchAlertsList.innerHTML = '<div class="ranking-empty">正在读取盯盘提醒...</div>';
  }
  try {
    const response = await fetch("/api/watch-alerts", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取盯盘提醒失败。");
    watchAlertsCache = Array.isArray(payload.watches) ? payload.watches : [];
    renderWatchAlertsList();
  } catch (error) {
    watchAlertsList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

function openWatchAlertsDialog() {
  renderWatchAlertsPresetOptions();
  renderWatchAlertsIndexOptions();
  updateWatchAlertsModeVisibility();
  loadMyWatchAlerts();
  showDialog(watchAlertsDialog);
}

async function createWatchAlert() {
  const presetId = watchAlertsPresetSelect && watchAlertsPresetSelect.value;
  const isIndexMode = watchAlertsModeSelect && watchAlertsModeSelect.value === "index";
  const frequencyMinutes = Number(watchAlertsFrequencySelect && watchAlertsFrequencySelect.value);
  if (!presetId) {
    setStatus("请先选择一个模型。", true);
    return;
  }

  let body;
  if (isIndexMode) {
    const indexCode = watchAlertsIndexSelect && watchAlertsIndexSelect.value;
    if (!indexCode) {
      setStatus("请选择一个指数。", true);
      return;
    }
    body = { presetId, indexCode, frequencyMinutes };
  } else {
    const market = watchAlertsMarketSelect && watchAlertsMarketSelect.value;
    const symbol = watchAlertsSymbolInput ? watchAlertsSymbolInput.value.trim() : "";
    if (!symbol) {
      setStatus("请输入股票代码。", true);
      return;
    }
    body = { presetId, market, symbol, frequencyMinutes };
  }

  if (watchAlertsCreateStatus) {
    watchAlertsCreateStatus.textContent = isIndexMode
      ? "正在添加（会先尝试拉取这个指数的成分股列表）..."
      : "正在添加（会先尝试拉取这支股票的行情，验证代码是否存在）...";
  }
  if (watchAlertsCreateButton) watchAlertsCreateButton.disabled = true;
  try {
    const response = await fetch("/api/watch-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await readJsonResponse(response, "添加盯盘提醒失败。");
    if (watchAlertsSymbolInput) watchAlertsSymbolInput.value = "";
    if (watchAlertsCreateStatus) watchAlertsCreateStatus.textContent = "已添加。";
    await loadMyWatchAlerts();
  } catch (error) {
    if (watchAlertsCreateStatus) watchAlertsCreateStatus.textContent = "";
    setStatus(`添加盯盘提醒失败：${error.message}`, true);
  } finally {
    if (watchAlertsCreateButton) watchAlertsCreateButton.disabled = false;
  }
}

async function toggleWatchAlert(id, currentlyEnabled) {
  try {
    const response = await fetch("/api/watch-alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: !currentlyEnabled }),
    });
    await readJsonResponse(response, "更新盯盘提醒失败。");
    await loadMyWatchAlerts();
  } catch (error) {
    setStatus(`更新盯盘提醒失败：${error.message}`, true);
  }
}

async function deleteWatchAlert(id) {
  if (!window.confirm("确定删除这个盯盘提醒吗？")) return;
  try {
    const response = await fetch("/api/watch-alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await readJsonResponse(response, "删除盯盘提醒失败。");
    await loadMyWatchAlerts();
  } catch (error) {
    setStatus(`删除盯盘提醒失败：${error.message}`, true);
  }
}

// A pasted "邀请码" can be either the bare token or a full share URL (?followWatch=<token>) —
// accept both so users don't have to know which one they were handed.
function extractInviteToken(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("followWatch");
    if (fromQuery) return fromQuery;
  } catch (error) {
    // Not a URL — treat the whole thing as a bare token.
  }
  return text;
}

async function followWatchByToken(token, statusEl) {
  const cleanToken = extractInviteToken(token);
  if (!cleanToken) {
    setStatus("请输入邀请码或链接。", true);
    return false;
  }
  if (statusEl) statusEl.textContent = "正在关注...";
  try {
    const response = await fetch("/api/watch-alerts/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cleanToken }),
    });
    const payload = await readJsonResponse(response, "关注失败。");
    if (statusEl) statusEl.textContent = `已关注：${payload.label || ""} ${payload.target || ""}`.trim();
    await loadMyWatchAlerts();
    setWatchAlertsActiveTab("followed");
    return true;
  } catch (error) {
    if (statusEl) statusEl.textContent = "";
    setStatus(`关注失败：${error.message}`, true);
    return false;
  }
}

async function unfollowWatchAlert(watchId) {
  if (!window.confirm("确定取消关注这个盯盘吗？")) return;
  try {
    const response = await fetch("/api/watch-alerts/follow", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchId }),
    });
    await readJsonResponse(response, "取消关注失败。");
    await loadMyWatchAlerts();
  } catch (error) {
    setStatus(`取消关注失败：${error.message}`, true);
  }
}

async function removeWatchFollower(watchId, followerUserId) {
  if (!window.confirm("确定移除这个关注者吗？移除后对方不会再收到这个盯盘的通知。")) return;
  try {
    const response = await fetch("/api/watch-alerts/follow", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchId, followerUserId }),
    });
    await readJsonResponse(response, "移除关注者失败。");
    await loadMyWatchAlerts();
  } catch (error) {
    setStatus(`移除关注者失败：${error.message}`, true);
  }
}

async function shareWatchAlert(id, regenerate) {
  try {
    const response = await fetch("/api/watch-alerts/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, regenerate: Boolean(regenerate) }),
    });
    const payload = await readJsonResponse(response, "生成分享链接失败。");
    const shareUrl = `${location.origin}/?followWatch=${encodeURIComponent(payload.inviteToken)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("分享链接已复制到剪贴板，发给对方即可（对方打开链接、登录后会自动关注，看不到具体规则参数）。");
    } catch (clipboardError) {
      window.prompt("复制这个链接发给对方（对方看不到具体规则参数）：", shareUrl);
    }
    await loadMyWatchAlerts();
  } catch (error) {
    setStatus(`生成分享链接失败：${error.message}`, true);
  }
}

if (watchAlertsFollowButton) {
  watchAlertsFollowButton.addEventListener("click", async () => {
    const ok = await followWatchByToken(watchAlertsFollowTokenInput ? watchAlertsFollowTokenInput.value : "", watchAlertsFollowStatus);
    if (ok && watchAlertsFollowTokenInput) watchAlertsFollowTokenInput.value = "";
  });
}

// A link shared via shareWatchAlert() lands here as ?followWatch=<token>. Called from
// initializeApp() AFTER fetchAuthSession() resolves, so currentUser is already known one way or
// the other by the time this runs — cleans the URL immediately either way so a page refresh
// never tries to follow (or re-prompts to log in) a second time.
function checkAutoFollowFromUrl() {
  const params = new URLSearchParams(location.search);
  const token = params.get("followWatch");
  if (!token) return;
  params.delete("followWatch");
  const nextSearch = params.toString();
  window.history.replaceState({}, "", location.pathname + (nextSearch ? `?${nextSearch}` : "") + location.hash);
  if (!currentUser) {
    setStatus("这是一个盯盘分享链接，请先登录再重新打开链接，登录后会自动关注。", true);
    return;
  }
  followWatchByToken(token).then((ok) => {
    if (ok && watchAlertsDialog) openWatchAlertsDialog();
  });
}

if (watchAlertsCreateButton) {
  watchAlertsCreateButton.addEventListener("click", () => createWatchAlert());
}
if (closeWatchAlertsButton && watchAlertsDialog) {
  closeWatchAlertsButton.addEventListener("click", () => closeDialog(watchAlertsDialog));
}
if (watchAlertsList) {
  watchAlertsList.addEventListener("click", (event) => {
    const target = event.target;
    const toggleButton = target && target.closest ? target.closest(".watch-alert-toggle-button") : null;
    if (toggleButton) {
      toggleWatchAlert(toggleButton.dataset.watchId, toggleButton.dataset.enabled === "1");
      return;
    }
    const deleteButton = target && target.closest ? target.closest(".watch-alert-delete-button") : null;
    if (deleteButton) {
      deleteWatchAlert(deleteButton.dataset.watchId);
      return;
    }
    const shareButton = target && target.closest ? target.closest(".watch-alert-share-button") : null;
    if (shareButton) {
      shareWatchAlert(shareButton.dataset.watchId, shareButton.dataset.regenerate === "1");
      return;
    }
    const unfollowButton = target && target.closest ? target.closest(".watch-alert-unfollow-button") : null;
    if (unfollowButton) {
      unfollowWatchAlert(unfollowButton.dataset.watchId);
      return;
    }
    const removeFollowerButton = target && target.closest ? target.closest(".watch-alert-remove-follower-button") : null;
    if (removeFollowerButton) {
      removeWatchFollower(removeFollowerButton.dataset.watchId, removeFollowerButton.dataset.followerUserId);
    }
  });
}

let adminStockScreenPollTimer = null;

function scheduleAdminStockScreenPoll() {
  if (adminStockScreenPollTimer) return;
  adminStockScreenPollTimer = window.setInterval(() => {
    if (!adminStockScreenPanel || adminStockScreenPanel.classList.contains("hidden")) {
      stopAdminStockScreenPoll();
      return;
    }
    loadAdminStockScreen();
  }, 5000);
}

function stopAdminStockScreenPoll() {
  if (adminStockScreenPollTimer) {
    window.clearInterval(adminStockScreenPollTimer);
    adminStockScreenPollTimer = null;
  }
}

async function loadAdminStockScreen() {
  if (!adminStockScreenList) return;
  if (!adminStockScreenList.innerHTML.trim()) {
    adminStockScreenList.innerHTML = '<div class="ranking-empty">正在读取选股记录...</div>';
  }
  try {
    const response = await fetch("/api/admin/stock-screen", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取选股记录失败。");
    const runs = Array.isArray(payload.runs) ? payload.runs : [];
    adminStockScreenRunsCache = runs;
    adminStockScreenList.innerHTML = runs.length === 0
      ? '<div class="ranking-empty">还没有选股扫描记录。</div>'
      : runs.map((run) => renderScreenRunEntry(run, { showOwner: true })).join("");
    if (runs.some((run) => run.status === "running")) {
      scheduleAdminStockScreenPoll();
    } else {
      stopAdminStockScreenPoll();
    }
  } catch (error) {
    adminStockScreenList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

if (adminStockScreenTabButton) {
  adminStockScreenTabButton.addEventListener("click", () => setAdminTab("stockScreen"));
}

async function loadAdminWatchAlerts() {
  if (!adminWatchAlertsList) return;
  if (!adminWatchAlertsList.innerHTML.trim()) {
    adminWatchAlertsList.innerHTML = '<div class="ranking-empty">正在读取盯盘提醒...</div>';
  }
  try {
    const response = await fetch("/api/admin/watch-alerts", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取盯盘提醒失败。");
    adminWatchAlertsCache = Array.isArray(payload.watches) ? payload.watches : [];
    if (adminWatchAlertsCache.length === 0) {
      adminWatchAlertsList.innerHTML = '<div class="ranking-empty">还没有用户设置盯盘提醒。</div>';
      return;
    }
    adminWatchAlertsList.innerHTML = adminWatchAlertsCache.map((watch) => renderWatchAlertEntry(watch, { showOwner: true })).join("");
  } catch (error) {
    adminWatchAlertsList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "读取失败。")}</div>`;
  }
}

if (adminWatchAlertsTabButton) {
  adminWatchAlertsTabButton.addEventListener("click", () => setAdminTab("watchAlerts"));
}

if (adminWatchAlertsList) {
  adminWatchAlertsList.addEventListener("toggle", (event) => handleWatchAlertsToggle(event, adminWatchAlertsCache), true);
}

function openAdminValidationParamViewer(sourceScanResultId) {
  const candidate = adminValidationCache.find((item) => item.sourceScanResultId === sourceScanResultId);
  if (!candidate) return;
  const config = candidate.bestConfig && typeof candidate.bestConfig === "object" ? candidate.bestConfig : {};
  const viewPreset = {
    ...config,
    label: `${candidate.presetLabel} · ${candidate.originSymbolName || candidate.originSymbol}`,
    strategyType: candidate.strategyType || config.strategyType || "wave",
  };
  openPresetParamEditor(sourceScanResultId, {
    preset: viewPreset,
    readonly: true,
    title: `查看全市场验证参数：${candidate.originSymbolName || candidate.originSymbol}（${candidate.presetLabel}）`,
    subtitle: `测试 ${candidate.testedCount} 支股票，通过 ${candidate.passingCount} 支（${formatPercent(candidate.passRate * 100)}），最差收益率 ${formatPercent(candidate.worstReturnRate)} · 只读`,
  });
}

async function saveAdminValidationCandidateAsPreset(sourceScanResultId) {
  const candidate = adminValidationCache.find((item) => item.sourceScanResultId === sourceScanResultId);
  if (!candidate) return;
  const defaultLabel = `${candidate.originSymbolName || candidate.originSymbol} ${candidate.presetLabel} 全市场验证`.slice(0, 60);
  const label = window.prompt("输入新模型名称：", defaultLabel);
  if (label === null) return;
  const trimmed = label.trim().slice(0, 80);
  if (!trimmed) {
    setStatus("模型名称不能为空。", true);
    return;
  }
  const preset = createPresetFromConfig(trimmed, candidate.bestConfig || {}, {
    targetSymbol: candidate.originSymbol,
    creator: "auto",
    createdAt: todayText(),
    updatedAt: todayText(),
    originalText: `全市场验证：基于模型「${candidate.presetLabel}」在 ${candidate.originSymbolName || candidate.originSymbol} 上优化出的参数，测试 ${candidate.testedCount} 支股票，通过 ${candidate.passingCount} 支（${formatPercent(candidate.passRate * 100)}），最差收益率 ${formatPercent(candidate.worstReturnRate)}。`,
    originalModelId: candidate.presetId,
  });
  const presetName = await saveGeneratedPreset(preset);
  if (presetName) {
    setStatus(`已另存为模型：${strategyPresets[presetName].label}。`);
  }
}

function formatParamStatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return Math.abs(value) >= 1000 ? value.toFixed(0) : (Math.round(value * 1000) / 1000).toString();
}

function renderAdminParamPatternList(payload) {
  if (!adminParamPatternList) return;
  const params = Array.isArray(payload.params) ? payload.params : [];
  if (adminParamPatternTitle) {
    adminParamPatternTitle.textContent = `参数规律：${payload.presetLabel || payload.presetId}（共 ${payload.sampleCount} 支已验证的训练股票）`;
  }
  if (!params.length) {
    adminParamPatternList.innerHTML = '<div class="ranking-empty">这个模型还没有可统计的数值参数或验证数据。</div>';
    return;
  }
  const rows = params.map((p) => `
    <tr>
      <td>${escapeHtml(p.path)}</td>
      <td>${p.sampleSize}</td>
      <td>${formatParamStatNumber(p.mean)}</td>
      <td>${formatParamStatNumber(p.median)}</td>
      <td>${formatParamStatNumber(p.min)}</td>
      <td>${formatParamStatNumber(p.max)}</td>
      <td>${formatParamStatNumber(p.stddev)}</td>
      <td>${p.cv === null ? "N/A" : p.cv.toFixed(3)}</td>
    </tr>
  `).join("");
  adminParamPatternList.innerHTML = `
    <table class="admin-ranking-table">
      <thead>
        <tr>
          <th>参数路径</th>
          <th>样本数</th>
          <th>均值</th>
          <th>中位数</th>
          <th>最小值</th>
          <th>最大值</th>
          <th>标准差</th>
          <th>变异系数</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function openAdminParamPatternDialog(presetId) {
  if (!presetId || !adminParamPatternDialog) return;
  showDialog(adminParamPatternDialog);
  adminParamPatternList.innerHTML = '<div class="ranking-empty">正在统计参数规律...</div>';
  try {
    const response = await fetch(`/api/admin/universe-validation/param-stats?presetId=${encodeURIComponent(presetId)}`, { cache: "no-store" });
    const payload = await readJsonResponse(response, "统计参数规律失败。");
    renderAdminParamPatternList(payload);
  } catch (error) {
    adminParamPatternList.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "统计失败。")}</div>`;
  }
}

function setAdminTab(tab) {
  const showRankings = tab === "rankings";
  const showScan = tab === "scan";
  const showScanStatus = tab === "scanStatus";
  const showValidation = tab === "validation";
  const showAutoGenerate = tab === "autoGenerate";
  const showStockScreen = tab === "stockScreen";
  const showWatchAlerts = tab === "watchAlerts";
  const showValidatedSearch = tab === "validatedSearch";
  const showWaveVisualizer = tab === "waveVisualizer";
  const showScheduledJobs = tab === "scheduledJobs";
  const showPresets = !showRankings && !showScan && !showScanStatus && !showValidation && !showAutoGenerate && !showStockScreen && !showWatchAlerts && !showValidatedSearch && !showWaveVisualizer && !showScheduledJobs;
  if (adminPresetsTabButton) adminPresetsTabButton.classList.toggle("active", showPresets);
  if (adminRankingsTabButton) adminRankingsTabButton.classList.toggle("active", showRankings);
  if (adminScanTabButton) adminScanTabButton.classList.toggle("active", showScan);
  if (adminScanStatusTabButton) adminScanStatusTabButton.classList.toggle("active", showScanStatus);
  if (adminValidationTabButton) adminValidationTabButton.classList.toggle("active", showValidation);
  if (adminAutoGenerateTabButton) adminAutoGenerateTabButton.classList.toggle("active", showAutoGenerate);
  if (adminStockScreenTabButton) adminStockScreenTabButton.classList.toggle("active", showStockScreen);
  if (adminWatchAlertsTabButton) adminWatchAlertsTabButton.classList.toggle("active", showWatchAlerts);
  if (adminValidatedSearchTabButton) adminValidatedSearchTabButton.classList.toggle("active", showValidatedSearch);
  if (adminWaveVisualizerTabButton) adminWaveVisualizerTabButton.classList.toggle("active", showWaveVisualizer);
  if (adminScheduledJobsTabButton) adminScheduledJobsTabButton.classList.toggle("active", showScheduledJobs);
  if (adminPresetsPanel) adminPresetsPanel.classList.toggle("hidden", !showPresets);
  if (adminRankingsPanel) adminRankingsPanel.classList.toggle("hidden", !showRankings);
  if (adminScanPanel) adminScanPanel.classList.toggle("hidden", !showScan);
  if (adminScanStatusPanel) adminScanStatusPanel.classList.toggle("hidden", !showScanStatus);
  if (adminValidationPanel) adminValidationPanel.classList.toggle("hidden", !showValidation);
  if (adminAutoGeneratePanel) adminAutoGeneratePanel.classList.toggle("hidden", !showAutoGenerate);
  if (adminStockScreenPanel) adminStockScreenPanel.classList.toggle("hidden", !showStockScreen);
  if (adminWatchAlertsPanel) adminWatchAlertsPanel.classList.toggle("hidden", !showWatchAlerts);
  if (adminValidatedSearchPanel) adminValidatedSearchPanel.classList.toggle("hidden", !showValidatedSearch);
  if (adminWaveVisualizerPanel) adminWaveVisualizerPanel.classList.toggle("hidden", !showWaveVisualizer);
  if (adminScheduledJobsPanel) adminScheduledJobsPanel.classList.toggle("hidden", !showScheduledJobs);
  if (showRankings) loadAdminRankings();
  if (showScan) loadAdminScanResults();
  if (showScanStatus) loadAdminScanStatus();
  if (showValidation) loadAdminValidation();
  if (showAutoGenerate) loadAdminAutoGenerate();
  if (showStockScreen) loadAdminStockScreen();
  if (showWatchAlerts) loadAdminWatchAlerts();
  if (showValidatedSearch) loadAdminValidatedSearch();
  // No auto-fetch here, unlike the other tabs — this tool's data comes from the user
  // explicitly clicking 加载历史/加载模型, not a background list to load on open. Just keep
  // the preset dropdown current since strategyPresets may have changed since last opened.
  if (showWaveVisualizer) renderWaveVisualizerPresetOptions();
  if (showScheduledJobs) loadAdminScheduledJobs();
}

if (adminPresetsTabButton) {
  adminPresetsTabButton.addEventListener("click", () => setAdminTab("presets"));
}
if (adminRankingsTabButton) {
  adminRankingsTabButton.addEventListener("click", () => setAdminTab("rankings"));
}
if (adminScanTabButton) {
  adminScanTabButton.addEventListener("click", () => setAdminTab("scan"));
}
if (adminScanStatusTabButton) {
  adminScanStatusTabButton.addEventListener("click", () => setAdminTab("scanStatus"));
}
if (adminValidationTabButton) {
  adminValidationTabButton.addEventListener("click", () => setAdminTab("validation"));
}
if (adminAutoGenerateTabButton) {
  adminAutoGenerateTabButton.addEventListener("click", () => setAdminTab("autoGenerate"));
}
if (adminAutoGenerateRunButton) {
  adminAutoGenerateRunButton.addEventListener("click", () => {
    if (!window.confirm("确定要启动 AI 自动生成吗？这会消耗 AI API 调用额度（最多按“总 AI 调用次数上限”计费），并跑参数搜索，可能耗时较久。")) return;
    triggerAdminAutoGenerateRun();
  });
}
if (adminValidatedSearchTabButton) {
  adminValidatedSearchTabButton.addEventListener("click", () => setAdminTab("validatedSearch"));
}
if (adminWaveVisualizerTabButton) {
  adminWaveVisualizerTabButton.addEventListener("click", () => setAdminTab("waveVisualizer"));
}
if (adminScheduledJobsTabButton) {
  adminScheduledJobsTabButton.addEventListener("click", () => setAdminTab("scheduledJobs"));
}
if (adminQualifiedRecheckRunButton) {
  adminQualifiedRecheckRunButton.addEventListener("click", () => {
    if (!window.confirm("确定要对下面全部已达标的模型做一次复查吗？会用最新数据重新跑一遍验证期回测，可能耗时较久，跟其它后台批量任务共用同一个队列。")) return;
    triggerAdminQualifiedRecheckRun();
  });
}
if (adminValidatedSearchRecommendFilterButton) {
  adminValidatedSearchRecommendFilterButton.addEventListener("click", () => {
    adminValidatedSearchRecommendFilterActive = !adminValidatedSearchRecommendFilterActive;
    // 打开筛选时顺手把排序切到"验证两年平均回报率，从高到低"——差异率的优先级排在它后面，
    // 只在平均回报率打平时才当次要依据（见sortAiGeneratedRecords）。关闭筛选不改排序，
    // 回到用户手动点过的那个列。
    if (adminValidatedSearchRecommendFilterActive) {
      adminValidatedSearchSortKey = "avgTestAnnualizedReturn";
      adminValidatedSearchSortDirection = "desc";
    }
    if (adminValidatedSearchLastPayload) renderAdminValidatedSearchList(adminValidatedSearchLastPayload);
  });
}
if (adminValidatedSearchRunButton) {
  adminValidatedSearchRunButton.addEventListener("click", () => {
    if (!window.confirm("确定要启动验证搜索吗？这会消耗 AI API 调用额度（最多按“总 AI 调用次数上限”计费），并跑参数搜索，可能耗时较久。")) return;
    triggerAdminValidatedSearchRun();
  });
}
if (adminValidatedSearchPauseResumeButton) {
  adminValidatedSearchPauseResumeButton.addEventListener("click", () => {
    if (adminValidatedSearchPauseResumeButton.dataset.mode === "pause") {
      pauseAdminValidatedSearch();
    } else {
      triggerAdminValidatedSearchRun({ resume: true });
    }
  });
}
// 波浪可视化: entirely client-side after the initial "加载历史" fetch — waveVisualizerRows is
// kept around so every threshold-slider tick just re-runs getWaveTurningPoints locally and
// redraws, no round-trip per adjustment.
let waveVisualizerRows = [];

function renderWaveVisualizerPresetOptions() {
  if (!waveVisualizerPresetSelect) return;
  const entries = Object.entries(strategyPresets).filter(([, preset]) => preset && preset.id);
  if (entries.length === 0) {
    waveVisualizerPresetSelect.innerHTML = '<option value="">暂无可用模型（请先保存一个模型）</option>';
    return;
  }
  const previousValue = waveVisualizerPresetSelect.value;
  waveVisualizerPresetSelect.innerHTML = entries
    .map(([name, preset]) => `<option value="${escapeHtml(name)}">${formatModelIdPrefix(preset)}${escapeHtml(preset.label || name)}</option>`)
    .join("");
  if (previousValue && entries.some(([name]) => name === previousValue)) {
    waveVisualizerPresetSelect.value = previousValue;
  }
}

// Every drawdownFromWaveHigh/riseFromWaveLow condition across buyBlockRules/sellBlockRules/
// scoreRules — both indicators run the same underlying wave tracker (just reading wave.high vs
// wave.low), so they share the same waveThreshold-editing semantics and belong in one combined
// list. Returns DIRECT REFERENCES to the condition objects (not value snapshots), so callers can
// both read them (admin 波浪可视化 tool: resolveConditionWaveThreshold(entry.condition,
// preset.waveThreshold) for a display-only value) and write them (历史模拟's live indicator
// controls: entry.condition.waveThreshold = x actually mutates the same object living inside
// currentBlockRules/currentScoreRules, since JS objects are reference types — no separate
// "save" step needed, the next backtest run picks it up automatically).
// source: anything shaped like {buyBlockRules, sellBlockRules, scoreRules} — a strategyPresets
// entry, or {buyBlockRules: currentBlockRules.buyBlockRules, ...} both qualify.
function collectWaveConditions(source) {
  const results = [];
  const isWaveIndicator = (indicator) => indicator === "drawdownFromWaveHigh" || indicator === "riseFromWaveLow" || indicator === "daysSinceNewWaveLow" || indicator === "daysSinceNewWaveHigh";
  const targetLabel = (condition) => {
    if (condition.indicator === "drawdownFromWaveHigh") return `回撤目标${condition.value}%`;
    if (condition.indicator === "daysSinceNewWaveLow") return `未创新低天数目标${condition.value}天`;
    if (condition.indicator === "daysSinceNewWaveHigh") return `未创新高天数目标${condition.value}天`;
    return `反弹目标${condition.value}%`;
  };
  const scanBlocks = (blocks, labelPrefix) => {
    (Array.isArray(blocks) ? blocks : []).forEach((block, blockIndex) => {
      (block && block.conditions || []).forEach((condition, conditionIndex) => {
        if (!isWaveIndicator(condition.indicator)) return;
        results.push({
          label: `${labelPrefix}${blockIndex + 1}·条件${conditionIndex + 1}（${targetLabel(condition)}）`,
          condition,
        });
      });
    });
  };
  scanBlocks(source.buyBlockRules, "买入规则块");
  scanBlocks(source.sellBlockRules, "卖出规则块");
  (Array.isArray(source.scoreRules) ? source.scoreRules : []).forEach((rule, ruleIndex) => {
    (rule && rule.conditions || []).forEach((condition, conditionIndex) => {
      if (!isWaveIndicator(condition.indicator)) return;
      results.push({
        label: `打分规则${ruleIndex + 1}·条件${conditionIndex + 1}（${targetLabel(condition)}）`,
        condition,
      });
    });
  });
  return results;
}

// Every downDayCount/daysSinceNewLow condition across buyBlockRules/sellBlockRules/scoreRules,
// same scanning shape as collectWaveConditions — returns direct condition references so the
// caller can read each one's own lookbackDays as the default for the preview controls.
function collectStreakConditions(source) {
  const results = [];
  const isStreakIndicator = (indicator) => indicator === "downDayCount" || indicator === "daysSinceNewLow";
  const indicatorLabel = (indicator) => (indicator === "downDayCount" ? "下跌天数" : "未创新低天数");
  const scanBlocks = (blocks, labelPrefix) => {
    (Array.isArray(blocks) ? blocks : []).forEach((block, blockIndex) => {
      (block && block.conditions || []).forEach((condition, conditionIndex) => {
        if (!isStreakIndicator(condition.indicator)) return;
        results.push({
          indicator: condition.indicator,
          label: `${labelPrefix}${blockIndex + 1}·条件${conditionIndex + 1}（${indicatorLabel(condition.indicator)}）`,
          condition,
        });
      });
    });
  };
  scanBlocks(source.buyBlockRules, "买入规则块");
  scanBlocks(source.sellBlockRules, "卖出规则块");
  (Array.isArray(source.scoreRules) ? source.scoreRules : []).forEach((rule, ruleIndex) => {
    (rule && rule.conditions || []).forEach((condition, conditionIndex) => {
      if (!isStreakIndicator(condition.indicator)) return;
      results.push({
        indicator: condition.indicator,
        label: `打分规则${ruleIndex + 1}·条件${conditionIndex + 1}（${indicatorLabel(condition.indicator)}）`,
        condition,
      });
    });
  });
  return results;
}

function setWaveVisualizerThreshold(value) {
  if (waveVisualizerThresholdInput) waveVisualizerThresholdInput.value = value;
  if (waveVisualizerThresholdSlider) waveVisualizerThresholdSlider.value = value;
}

function redrawWaveVisualizer() {
  if (!waveVisualizerSvg) return;
  if (waveVisualizerRows.length === 0) {
    drawModelOrderPriceChartInto(waveVisualizerSvg, [], [], { emptyMessage: "请先点击“加载历史”" });
    if (waveVisualizerStats) waveVisualizerStats.textContent = "";
    return;
  }
  const threshold = Math.max(0.1, Number(waveVisualizerThresholdInput.value) || 5);
  const wavePoints = getWaveTurningPoints(waveVisualizerRows, threshold);
  drawModelOrderPriceChartInto(waveVisualizerSvg, waveVisualizerRows, [], { wavePoints });
  if (waveVisualizerStats) {
    const highCount = wavePoints.filter((point) => point.type === "high").length;
    const lowCount = wavePoints.filter((point) => point.type === "low").length;
    waveVisualizerStats.textContent = `共 ${highCount} 个波浪高点、${lowCount} 个波浪低点（阈值 ${threshold}%）`;
  }
}

if (waveVisualizerLoadHistoryButton) {
  waveVisualizerLoadHistoryButton.addEventListener("click", async () => {
    const symbol = normalizeSymbolInput(waveVisualizerSymbolInput.value);
    if (!symbol) {
      setStatus("请先输入股票代码。", true);
      return;
    }
    const end = waveVisualizerEndInput.value || todayText();
    const start = waveVisualizerStartInput.value || new Date(Date.now() - 2 * 365 * 86400000).toISOString().slice(0, 10);
    waveVisualizerLoadHistoryButton.disabled = true;
    try {
      const params = new URLSearchParams({ code: symbol, start, end });
      const response = await fetch(`/api/klines?${params.toString()}`);
      const payload = await readJsonResponse(response, "行情读取失败。");
      const rows = (payload.rows || []).filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close)
        && row.close > 0 && Number.isFinite(row.high) && Number.isFinite(row.low));
      if (rows.length === 0) {
        setStatus("没有读到有效行情数据，请检查代码或日期范围。", true);
        return;
      }
      waveVisualizerRows = rows;
      setStatus(`已加载 ${symbol}（${payload.name || symbol}）${rows.length} 天历史行情。`);
      redrawWaveVisualizer();
    } catch (error) {
      setStatus(error.message || "行情读取失败。", true);
    } finally {
      waveVisualizerLoadHistoryButton.disabled = false;
    }
  });
}

if (waveVisualizerLoadPresetButton) {
  waveVisualizerLoadPresetButton.addEventListener("click", () => {
    const name = waveVisualizerPresetSelect ? waveVisualizerPresetSelect.value : "";
    const preset = name ? strategyPresets[name] : null;
    if (!preset) {
      setStatus("请先选择一个模型。", true);
      return;
    }
    if (waveVisualizerConditionRow) waveVisualizerConditionRow.classList.add("hidden");
    if (preset.strategyType === "wave") {
      const threshold = Math.max(0.1, Number(preset.waveThreshold) || 5);
      setWaveVisualizerThreshold(threshold);
      setStatus(`已加载模型「${preset.label}」的波浪阈值（wave 策略自身用的那个）：${threshold}%`);
      redrawWaveVisualizer();
      return;
    }
    const conditions = collectWaveConditions(preset).map((entry) => ({
      label: entry.label,
      threshold: resolveConditionWaveThreshold(entry.condition, preset.waveThreshold),
    }));
    if (conditions.length === 0) {
      setStatus(`模型「${preset.label}」没有用到波浪确认阈值（没有 drawdownFromWaveHigh 条件）。`, true);
      return;
    }
    if (conditions.length === 1) {
      setWaveVisualizerThreshold(conditions[0].threshold);
      setStatus(`已加载模型「${preset.label}」的波浪阈值：${conditions[0].threshold}%`);
      redrawWaveVisualizer();
      return;
    }
    if (waveVisualizerConditionRow) waveVisualizerConditionRow.classList.remove("hidden");
    waveVisualizerConditionSelect.innerHTML = conditions
      .map((c, i) => `<option value="${i}">${escapeHtml(c.label)}：${c.threshold}%</option>`)
      .join("");
    waveVisualizerConditionSelect.dataset.thresholds = JSON.stringify(conditions.map((c) => c.threshold));
    setWaveVisualizerThreshold(conditions[0].threshold);
    setStatus(`模型「${preset.label}」有 ${conditions.length} 条波浪确认条件，已选第一条，可在右侧下拉框切换。`);
    redrawWaveVisualizer();
  });
}

if (waveVisualizerConditionSelect) {
  waveVisualizerConditionSelect.addEventListener("change", () => {
    const thresholds = JSON.parse(waveVisualizerConditionSelect.dataset.thresholds || "[]");
    const threshold = thresholds[Number(waveVisualizerConditionSelect.value)];
    if (Number.isFinite(threshold)) {
      setWaveVisualizerThreshold(threshold);
      redrawWaveVisualizer();
    }
  });
}

if (waveVisualizerThresholdInput) {
  waveVisualizerThresholdInput.addEventListener("input", () => {
    if (waveVisualizerThresholdSlider) waveVisualizerThresholdSlider.value = waveVisualizerThresholdInput.value;
    redrawWaveVisualizer();
  });
}
if (waveVisualizerThresholdSlider) {
  waveVisualizerThresholdSlider.addEventListener("input", () => {
    if (waveVisualizerThresholdInput) waveVisualizerThresholdInput.value = waveVisualizerThresholdSlider.value;
    redrawWaveVisualizer();
  });
}

if (adminValidationRunButton) {
  adminValidationRunButton.addEventListener("click", () => {
    if (!window.confirm("确定要运行全市场验证吗？这会对通过初筛的候选逐一跑全市场股票，可能耗时较久。")) return;
    triggerAdminValidationRun();
  });
}
if (adminValidationApplyThresholdButton) {
  adminValidationApplyThresholdButton.addEventListener("click", () => {
    loadAdminValidation();
  });
}
if (adminParamPatternViewButton) {
  adminParamPatternViewButton.addEventListener("click", () => {
    if (!adminParamPatternModelSelect || !adminParamPatternModelSelect.value) {
      setStatus("还没有可查看的模型，请先运行全市场验证。", true);
      return;
    }
    openAdminParamPatternDialog(adminParamPatternModelSelect.value);
  });
}
if (closeAdminParamPatternButton && adminParamPatternDialog) {
  closeAdminParamPatternButton.addEventListener("click", () => {
    closeDialog(adminParamPatternDialog);
  });
}
if (adminValidationList) {
  adminValidationList.addEventListener("click", (event) => {
    const target = event.target;
    const sortHeader = target && target.closest ? target.closest(".admin-scan-sort-header[data-admin-validation-sort-key]") : null;
    if (sortHeader) {
      const key = sortHeader.dataset.adminValidationSortKey;
      if (adminValidationSortKey === key) {
        adminValidationSortDirection = adminValidationSortDirection === "asc" ? "desc" : "asc";
      } else {
        adminValidationSortKey = key;
        adminValidationSortDirection = "desc";
      }
      if (adminValidationLastPayload) renderAdminValidationList(adminValidationLastPayload);
      return;
    }
    const viewButton = target && target.closest ? target.closest(".admin-validation-view-params-button") : null;
    if (viewButton) {
      openAdminValidationParamViewer(viewButton.dataset.sourceScanResultId);
      return;
    }
    const saveButton = target && target.closest ? target.closest(".admin-validation-save-button") : null;
    if (saveButton) {
      saveAdminValidationCandidateAsPreset(saveButton.dataset.sourceScanResultId);
    }
  });
}
if (adminScanRunSelectedButton) {
  adminScanRunSelectedButton.addEventListener("click", () => {
    const checked = Array.from(document.querySelectorAll(".admin-scan-model-checkbox:checked"));
    const presetIds = checked.map((input) => input.dataset.presetId).filter(Boolean);
    if (presetIds.length === 0) {
      setStatus("请先勾选要重新扫描的模型。", true);
      return;
    }
    triggerAdminScanRun(presetIds);
  });
}
if (adminScanRunAllButton) {
  adminScanRunAllButton.addEventListener("click", () => {
    const hasSymbolScope = adminScanSymbolPicker.getSelected().length > 0;
    const confirmMessage = hasSymbolScope
      ? "确定要对全部当前模型、限定你选择的股票代码重新扫描吗？这会覆盖这些股票已有的结果。"
      : "确定要对全部当前模型重新扫描全部股票吗？这会覆盖已有结果，且可能耗时较久。";
    if (!window.confirm(confirmMessage)) return;
    triggerAdminScanRun([]);
  });
}
if (adminScanPauseResumeButton) {
  adminScanPauseResumeButton.addEventListener("click", () => {
    if (adminScanPauseResumeButton.dataset.mode === "pause") {
      pauseAdminScan();
    } else {
      triggerAdminScanRun([], { resume: true });
    }
  });
}

function openAdminDialog() {
  if (!currentUser || !currentUser.isAdmin || !adminDialog) return;
  showDialog(adminDialog);
  setAdminTab("presets");
  loadAdminPresets();
}

async function updateAdminPresetOwner(id, owner) {
  if (!id || !owner) return;
  try {
    const response = await fetch("/api/admin/presets", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, owner }),
    });
    await readJsonResponse(response, "修改 owner 失败。");
    setStatus(`已把模型 owner 修改为 ${owner}。`);
    await initializeServerCustomPresets();
    await loadAdminPresets({ silent: true });
  } catch (error) {
    setStatus(`修改 owner 失败：${error.message}`, true);
  }
}

async function renameAdminPreset(id, currentLabel) {
  if (!id) return;
  const nextLabel = window.prompt("输入新的模型名称：", currentLabel || "");
  if (nextLabel === null) return;
  const trimmed = nextLabel.trim().slice(0, 80);
  if (!trimmed) {
    setStatus("模型名称不能为空。", true);
    return;
  }
  if (trimmed === currentLabel) return;
  try {
    const response = await fetch("/api/admin/presets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: trimmed }),
    });
    await readJsonResponse(response, "重命名失败。");
    setStatus(`已重命名为：${trimmed}。`);
    await initializeServerCustomPresets();
    await loadAdminPresets({ silent: true });
  } catch (error) {
    setStatus(`重命名失败：${error.message}`, true);
  }
}

async function updateAdminPresetOriginalModelId(id, originalModelId) {
  if (!id) return;
  try {
    const response = await fetch("/api/admin/presets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, originalModelId }),
    });
    await readJsonResponse(response, "修改原始模型失败。");
    setStatus(originalModelId === "0" ? "已设为原始手工模型。" : "已更新原始模型引用。");
    await initializeServerCustomPresets();
    await loadAdminPresets({ silent: true });
  } catch (error) {
    setStatus(`修改原始模型失败：${error.message}`, true);
  }
}

async function toggleAdminPresetHidden(id, currentlyHidden) {
  if (!id) return;
  try {
    const response = await fetch("/api/admin/presets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hidden: !currentlyHidden }),
    });
    await readJsonResponse(response, "操作失败。");
    setStatus(currentlyHidden ? "已取消隐藏。" : "已隐藏该模型。");
    await initializeServerCustomPresets();
    await loadAdminPresets({ silent: true });
  } catch (error) {
    setStatus(`操作失败：${error.message}`, true);
  }
}

async function deleteAdminPreset(id, label) {
  if (!id) return;
  const ok = window.confirm(`确定删除模型“${label || id}”？这个操作会从服务器删除该模型。`);
  if (!ok) return;
  try {
    const response = await fetch("/api/admin/presets", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    const payload = await readJsonResponse(response, "删除模型失败。");
    const deletedName = payload.deleted && payload.deleted.name;
    if (deletedName && strategyPresets[deletedName]) {
      delete strategyPresets[deletedName];
    }
    await initializeServerCustomPresets();
    await loadAdminPresets({ silent: true });
    setStatus(`已删除模型：${label || deletedName || id}。`);
  } catch (error) {
    setStatus(`删除模型失败：${error.message}`, true);
  }
}

async function hideOwnedPreset(name, label) {
  if (!name || !isOwnedEditablePreset(name)) return;
  const ok = window.confirm(`确定删除模型"${label || name}"？`);
  if (!ok) return;
  const presetId = strategyPresets[name] && strategyPresets[name].id;
  if (!presetId) return;
  try {
    const response = await fetch("/api/presets", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: presetId, hidden: true }),
    });
    await readJsonResponse(response, "删除模型失败。");
    delete strategyPresets[name];
    localStorage.setItem(customPresetStorageKey, JSON.stringify(getCurrentCustomPresets()));

    const relatedKeys = rankingRecords.filter((record) => record.presetName === name).map((record) => record.key);
    await Promise.all(relatedKeys.map((key) => fetch("/api/rankings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, hidden: true }),
    }).catch(() => null)));
    rankingRecords = rankingRecords.filter((record) => record.presetName !== name);
    localStorage.setItem(rankingRecordStorageKey, JSON.stringify(rankingRecords));

    comparisonResults = comparisonResults.filter((result) => result.name !== name);
    renderModelComparisonTable(comparisonResults);

    renderModelCompareOptions();
    renderModelRanking();
    setStatus(`已删除模型：${label || name}。`);
  } catch (error) {
    const message = `删除模型失败：${error.message}`;
    setStatus(message, true);
    window.alert(message);
  }
}

async function hideRankingRecord(key) {
  if (!key) return;
  const ok = window.confirm("确定删除这条排行记录？");
  if (!ok) return;
  try {
    const response = await fetch("/api/rankings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, hidden: true }),
    });
    await readJsonResponse(response, "删除排行记录失败。");
    rankingRecords = rankingRecords.filter((record) => record.key !== key);
    localStorage.setItem(rankingRecordStorageKey, JSON.stringify(rankingRecords));
    renderModelRanking();
    setStatus("已删除该排行记录。");
  } catch (error) {
    const message = `删除排行记录失败：${error.message}`;
    setStatus(message, true);
    window.alert(message);
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

async function loadSymbolHistory() {
  try {
    const response = await fetch("/api/symbol-history", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取股票代码历史失败。");
    symbolHistoryCache = Array.isArray(payload.symbols) ? payload.symbols : [];
  } catch (error) {
    symbolHistoryCache = [];
  }
}

// History first (server order = most-recently-used first), then any base preset not already
// covered by history — so a fresh/empty history still shows sensible defaults.
function getAllSymbolPresets() {
  const historyCodes = symbolHistoryCache.map((entry) => normalizeSymbolInput(entry.code)).filter(Boolean);
  const historySet = new Set(historyCodes);
  return [...historyCodes, ...symbolPresets.filter((symbol) => !historySet.has(symbol))];
}

function getSymbolDescription(symbol) {
  const normalized = normalizeSymbolInput(symbol);
  const entry = symbolHistoryCache.find((item) => normalizeSymbolInput(item.code) === normalized);
  return entry ? String(entry.description || "").slice(0, 23) : "";
}

function formatSymbolOptionLabel(symbol) {
  const description = getSymbolDescription(symbol);
  return description ? `${symbol} ${description}` : symbol;
}

function renderSymbolPresetOptions(selectedSymbol = normalizeSymbolInput(codeInput.value)) {
  if (!symbolPresetSelect) return;
  const selected = normalizeSymbolInput(selectedSymbol);
  const allSymbols = getAllSymbolPresets();
  if (selected && !allSymbols.includes(selected)) allSymbols.unshift(selected);

  symbolPresetSelect.innerHTML = allSymbols
    .map((symbol) => {
      const selectedAttr = symbol === selected ? " selected" : "";
      return `<option value="${symbol}"${selectedAttr}>${escapeHtml(formatSymbolOptionLabel(symbol))}</option>`;
    })
    .join("");
}

function updateSymbolPresetFromInput() {
  const symbol = normalizeSymbolInput(codeInput.value);
  if (symbolPresetSelect && getAllSymbolPresets().includes(symbol)) {
    symbolPresetSelect.value = symbol;
  }
}

// The actual recording (code + resolved name + timestamp) already happened server-side as
// part of the /api/klines call that just loaded this symbol's data (see server.js
// persistKlineData) — this just refreshes the client's cache so the dropdown reflects it
// immediately, without waiting for a full page reload.
function rememberLoadedSymbol(symbol, description) {
  const normalized = normalizeSymbolInput(symbol);
  if (!normalized) return;
  const trimmedDescription = String(description || "").slice(0, 23);
  symbolHistoryCache = [
    { code: normalized, description: trimmedDescription, updatedAt: new Date().toISOString() },
    ...symbolHistoryCache.filter((item) => normalizeSymbolInput(item.code) !== normalized),
  ];
  renderSymbolPresetOptions(normalized);
  loadSymbolHistory().then(() => renderSymbolPresetOptions(normalized)).catch(() => {});
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

function setLoading(isLoading, message) {
  form.querySelector("button").disabled = isLoading;
  if (loadingOverlay) loadingOverlay.classList.toggle("hidden", !isLoading);
  if (loadingOverlayText && message) loadingOverlayText.textContent = message;
}

function applyLanguage(language = activeLanguage) {
  activeLanguage = language === "en" ? "en" : "zh";
  localStorage.setItem("aiTradeLanguage", activeLanguage);
  document.documentElement.lang = activeLanguage === "en" ? "en" : "zh-CN";
  if (languageSelect) languageSelect.value = activeLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  renderAuthState();
  setAuthMode(authMode);
}

async function readJsonResponse(response, fallbackMessage = "服务器返回的数据不是有效 JSON。") {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(response.ok ? fallbackMessage : `${fallbackMessage}：${text.slice(0, 120)}`);
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage);
  }
  return payload;
}

function renderAuthState() {
  const isSignedIn = Boolean(currentUser && currentUser.email);
  const needsVerification = isSignedIn && currentUser.emailEnabled && currentUser.emailVerified === false;
  if (authStatusText) {
    authStatusText.textContent = isSignedIn
      ? `${currentUser.email}${needsVerification ? "（待验证）" : ""}`
      : t("notSignedIn");
  }
  if (openAuthButton) {
    openAuthButton.textContent = isSignedIn ? t("switchAccount") : t("registerLogin");
  }
  if (logoutButton) logoutButton.classList.toggle("hidden", !isSignedIn);
  if (openAdminButton) openAdminButton.classList.toggle("hidden", !(isSignedIn && currentUser.isAdmin));
  if (resendVerificationButton) resendVerificationButton.classList.toggle("hidden", !needsVerification);
  if (newModelAuthNote) newModelAuthNote.classList.toggle("hidden", isSignedIn && !needsVerification);
  if (watchAlertsAuthNote) watchAlertsAuthNote.classList.toggle("hidden", isSignedIn && !needsVerification);
  if (customModelCreatorInput && isSignedIn) {
    customModelCreatorInput.value = currentUser.email;
  }
  syncModelAuthoringControls();
}

function canUseModelAuthoring() {
  return Boolean(currentUser && currentUser.email && !(currentUser.emailEnabled && currentUser.emailVerified === false));
}

function syncModelAuthoringControls() {
  const canAuthor = canUseModelAuthoring();
  if (generateModelCodeButton) generateModelCodeButton.disabled = !canAuthor;
  if (saveGeneratedModelButton) saveGeneratedModelButton.disabled = !canAuthor || !generatedPresetDraft;
  if (!canAuthor && saveOptimizationButton) saveOptimizationButton.disabled = true;
  document.querySelectorAll(".result-optimize-button").forEach((button) => {
    button.disabled = !canAuthor;
  });
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
  if (submitAuthButton) submitAuthButton.textContent = authMode === "register" ? t("freeRegister") : t("login");
  if (forgotPasswordButton) forgotPasswordButton.classList.toggle("hidden", authMode !== "login");
  setAuthMessage(authMode === "register" ? t("registerHint") : "", false);
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
    const payload = await readJsonResponse(response, "读取登录状态失败。");
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
    setAuthMessage(t("enterEmailPassword"), true);
    return;
  }
  if (submitAuthButton) submitAuthButton.disabled = true;
  setAuthMessage(authMode === "register" ? t("registering") : t("loggingIn"), false);

  try {
    const response = await fetch(`/api/auth/${authMode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const payload = await readJsonResponse(response, t("authFailed"));
    currentUser = payload.user;
    renderAuthState();
    await initializeServerCustomPresets();
    if (authDialog && authDialog.open) authDialog.close();
    if (currentUser.emailEnabled && currentUser.emailVerified === false) {
      const emailStatus = payload.verificationEmail && payload.verificationEmail.error
        ? `${t("verificationFailed")}：${payload.verificationEmail.error}`
        : t("verifyEmailToSave");
      setStatus(`${currentUser.email} 已登录。${emailStatus}`, payload.verificationEmail && payload.verificationEmail.error);
    } else {
      setStatus(`${currentUser.email} ${t("signedInServerLoaded")}`);
    }
  } catch (error) {
    setAuthMessage(error.message || t("authFailed"), true);
  } finally {
    if (submitAuthButton) submitAuthButton.disabled = false;
  }
}

async function requestPasswordReset() {
  if (!authEmailInput) return;
  const email = authEmailInput.value.trim();
  if (!email) {
    setAuthMessage(t("enterEmail"), true);
    authEmailInput.focus();
    return;
  }
  if (forgotPasswordButton) forgotPasswordButton.disabled = true;
  setAuthMessage(t("sendingPasswordReset"), false);
  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const payload = await readJsonResponse(response, t("authFailed"));
    setAuthMessage(payload.emailEnabled === false ? t("passwordResetEmailDisabled") : t("passwordResetSent"), payload.emailEnabled === false);
  } catch (error) {
    setAuthMessage(error.message || t("authFailed"), true);
  } finally {
    if (forgotPasswordButton) forgotPasswordButton.disabled = false;
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
  setStatus(t("signedOut"));
}

function requireSignedInForSave() {
  if (canUseModelAuthoring()) return true;
  if (currentUser && currentUser.email) {
    setStatus(t("verifyBeforeSave"), true);
    return false;
  }
  openAuthDialog("register", t("signInBeforeSave"));
  setStatus(t("signInBeforeSave"), true);
  return false;
}

async function resendVerificationEmail() {
  if (!currentUser || !currentUser.email) {
    openAuthDialog("register", t("signInBeforeSave"));
    return;
  }
  if (resendVerificationButton) resendVerificationButton.disabled = true;
  setStatus(t("sendingVerification"));
  try {
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const payload = await readJsonResponse(response, t("verificationFailed"));
    if (payload.alreadyVerified) {
      await fetchAuthSession();
      setStatus(t("emailAlreadyVerified"));
      return;
    }
    setStatus(t("verificationSent"));
  } catch (error) {
    setStatus(error.message || t("verificationFailed"), true);
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

function setWizardPage(pageName) {
  if (pageName === "new-model") {
    showDialog(newModelDialog);
    return;
  }
  if (pageName === "watch-alerts") {
    openWatchAlertsDialog();
    return;
  }
  closeDialog(newModelDialog);
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
  if (nextPage === "simulation") {
    renderSimulationOverview();
    window.setTimeout(() => {
      openModelSelectorDialog();
    }, 80);
  }
  if (nextPage === "screen") {
    renderScreenPresetOptions();
    loadStockScreen();
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
  if (generatedModelCode) generatedModelCode.textContent = t("waitingGeneration");
  if (saveGeneratedModelButton) saveGeneratedModelButton.disabled = true;
  if (viewGeneratedModelParamsButton) viewGeneratedModelParamsButton.disabled = true;
}

function openGeneratedModelParamsViewer() {
  if (!generatedPresetDraft || !generatedPresetDraft.preset) return;
  openPresetParamEditor("__generated_model_draft__", {
    preset: generatedPresetDraft.preset,
    readonly: true,
    title: `查看参数：${generatedPresetDraft.preset.label || "生成的模型"}`,
    subtitle: "这是刚生成、还未保存的模型草稿，只读预览。",
  });
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

function getCurrentStagnationReversalRule() {
  const preset = strategyPresetSelect && strategyPresetSelect.value
    ? strategyPresets[strategyPresetSelect.value]
    : null;
  return readStagnationReversalRule(preset && preset.stagnationReversalRule || defaultStagnationReversalRule);
}

// Decides whether the 波浪确认波动% control is relevant at all — not just for strategyType
// "wave", but for ANY loaded model (block-rules/score-rules included) that has one or more
// drawdownFromWaveHigh conditions somewhere in its rules, since that indicator has its own
// wave-confirmation threshold regardless of which strategy type wraps it. When there's more
// than one such condition, shows a picker so waveThresholdInput can target a specific one;
// editing it then writes DIRECTLY into that condition object (see the input listener below),
// live-mutating currentBlockRules/currentScoreRules rather than just refreshing a preview.
function updateWaveConditionControls() {
  const isWave = indicatorModelSelect.value === "wave";
  if (isWave) {
    currentWaveConditions = [];
    currentWaveConditionRef = null;
    if (waveConditionRow) waveConditionRow.classList.add("hidden");
    document.querySelectorAll(".wave-param").forEach((item) => item.classList.remove("hidden"));
    return;
  }
  currentWaveConditions = collectWaveConditions({
    buyBlockRules: currentBlockRules.buyBlockRules,
    sellBlockRules: currentBlockRules.sellBlockRules,
    scoreRules: currentScoreRules.scoreRules,
  });
  if (currentWaveConditions.length === 0) {
    currentWaveConditionRef = null;
    document.querySelectorAll(".wave-param").forEach((item) => item.classList.add("hidden"));
    if (waveConditionRow) waveConditionRow.classList.add("hidden");
    return;
  }
  document.querySelectorAll(".wave-param").forEach((item) => item.classList.remove("hidden"));
  if (currentWaveConditions.length === 1) {
    if (waveConditionRow) waveConditionRow.classList.add("hidden");
  } else if (waveConditionRow && waveConditionSelect) {
    waveConditionRow.classList.remove("hidden");
    waveConditionSelect.innerHTML = currentWaveConditions
      .map((entry, index) => `<option value="${index}">${escapeHtml(entry.label)}</option>`)
      .join("");
    waveConditionSelect.value = "0";
  }
  currentWaveConditionRef = currentWaveConditions[0].condition;
  waveThresholdInput.value = resolveConditionWaveThreshold(currentWaveConditionRef, currentModelTopLevelWaveThreshold);
}

function updateIndicatorUi() {
  const strategyType = indicatorModelSelect.value;
  const isWave = strategyType === "wave";
  const isLocalLadder = strategyType === "local-high-ladder";
  const isMaRsiBand = strategyType === "ma-rsi-band";
  const isOrderGrid = strategyType === "order-grid";
  const isPeVolume = strategyType === "pe-volume";
  updateWaveConditionControls();
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
  } else if (strategyType === "stagnation-reversal") {
    indicatorHighLegend.textContent = "卖出停滞";
    indicatorLowLegend.textContent = "买入停滞";
    indicatorConfirmLegend.textContent = "观察高低点";
  } else {
    indicatorHighLegend.textContent = "波浪高点";
    indicatorLowLegend.textContent = "波浪低点";
    indicatorConfirmLegend.textContent = "确认点";
  }
}

function getPresetEntriesForType(strategyType) {
  return Object.entries(strategyPresets).filter(([name, preset]) => {
    if (builtinPresetMetadata[name]) return false;
    return (preset.strategyType || "wave") === strategyType;
  });
}

function getStrategyTypeLabel(strategyType) {
  if (strategyType === "local-high-ladder") return "近端阶梯";
  if (strategyType === "ma-rsi-band") return "MA-RSI";
  if (strategyType === "order-grid") return "订单网格";
  if (strategyType === "pe-volume") return "PE-成交量";
  if (strategyType === "stagnation-reversal") return "停滞反转";
  if (strategyType === "block-rules") return "组合规则";
  if (strategyType === "score-rules") return "打分模型";
  return "波浪";
}

function getCurrentConfigLabel(config) {
  return `当前界面参数（${getStrategyTypeLabel(config.strategyType)}）`;
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
    conditions: Array.isArray(rule && rule.conditions)
      ? rule.conditions.map((condition) => ({ ...condition }))
      : [],
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

function createConfigFromPreset(presetName, baseConfig) {
  const preset = strategyPresets[presetName] || strategyPresets.optimized;
  return buildConfigFromPresetObject(preset, baseConfig);
}

function getPresetLatestRankingRecord(presetName) {
  const records = rankingRecords
    .filter((record) => record.presetName === presetName)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return records[0] || null;
}

function getPresetDisplayDate(name, preset, record) {
  if (record && record.updatedAt) return record.updatedAt;
  const meta = getPresetMetadata(name, preset);
  return meta.updatedAt || meta.createdAt || "";
}

function isPresetAccessibleToCurrentUser(preset) {
  const ownerEmail = String(preset && preset.meta && preset.meta.ownerEmail || "");
  if (!ownerEmail || ownerEmail === "public") return true;
  return Boolean(currentUser && currentUser.email && ownerEmail === currentUser.email);
}

function buildPresetSelectionRows() {
  return Object.entries(strategyPresets)
    .filter(([name, preset]) => !builtinPresetMetadata[name] && isPresetAccessibleToCurrentUser(preset))
    .map(([name, preset]) => {
      const record = getPresetLatestRankingRecord(name);
      const displayDate = getPresetDisplayDate(name, preset, record);
      return {
        name,
        preset,
        record,
        displayDate,
        sortDate: Date.parse(displayDate) || 0,
      };
    })
    .sort((a, b) => {
      if (b.sortDate !== a.sortDate) return b.sortDate - a.sortDate;
      return String(a.preset.label || a.name).localeCompare(String(b.preset.label || b.name), "zh-Hans-CN");
    });
}

function getPresetTestRangeText(record) {
  if (!record) return "暂无历史测试";
  const symbol = `${record.symbol || ""}${record.symbolName ? ` ${record.symbolName}` : ""}`.trim();
  const period = record.periodLabel || `${record.periodYears || ""}年`;
  const range = record.startDate && record.endDate ? `${record.startDate} 至 ${record.endDate}` : "区间未记录";
  return `${symbol} · ${period} · ${range}`;
}

function renderSelectedModelSummary() {
  if (!selectedModelSummary) return;
  const selectedNames = getSelectedComparisonPresetNames();
  if (selectedNames.length === 0) {
    selectedModelSummary.innerHTML = `
      <strong>尚未选择模型</strong>
      <span>点击“选择模型”，从弹窗中勾选需要参与历史模拟的预存模型。</span>
    `;
    return;
  }

  const labels = selectedNames
    .map((name) => strategyPresets[name] ? strategyPresets[name].label : name)
    .slice(0, 4)
    .join("、");
  const extra = selectedNames.length > 4 ? ` 等 ${selectedNames.length} 个` : "";
  selectedModelSummary.innerHTML = `
    <strong>已选择 ${selectedNames.length} 个模型</strong>
    <span>${escapeHtml(labels)}${escapeHtml(extra)}</span>
  `;
}

function renderSelectedDataSummary() {
  if (!selectedDataSummary) return;
  if (!lastRows || !lastSummary) {
    selectedDataSummary.innerHTML = `
      <strong>尚未加载历史数据</strong>
      <span>点击“选择股票区间”，加载用于模拟的历史价格。</span>
    `;
    return;
  }

  const info = lastSummary.symbol || {};
  const label = info.name && info.code ? `${info.code} ${info.name}` : (info.code || codeInput.value || "--");
  selectedDataSummary.innerHTML = `
    <strong>${escapeHtml(label)}</strong>
    <span>${escapeHtml(lastSummary.startDate)} 至 ${escapeHtml(lastSummary.endDate)} · ${lastSummary.count} 个交易日</span>
  `;
}

function renderSelectedResultSummary() {
  if (!selectedResultSummary) return;
  if (!comparisonResults || comparisonResults.length === 0) {
    selectedResultSummary.innerHTML = `
      <strong>尚未生成模拟表现</strong>
      <span>选择模型并加载历史数据后会自动开始模拟。</span>
    `;
    if (openResultsDialogButton) openResultsDialogButton.disabled = true;
    return;
  }

  const leading = comparisonResults[0];
  const leadingAnnualized = annualizeReturnByTradingDays(leading.finalState.returnRate, leading.states.length);
  selectedResultSummary.innerHTML = `
    <strong>${escapeHtml(leading.label)}</strong>
    <span>收益 ${formatPercent(leading.finalState.returnRate)} · 年化 ${formatPercent(leadingAnnualized)} · 最大回撤 ${formatPercent(leading.finalState.maxDrawdown)} · ${escapeHtml(activeBacktestRangeLabel || "已完成模拟")}</span>
  `;
  if (openResultsDialogButton) openResultsDialogButton.disabled = false;
}

function renderSimulationOverview() {
  renderSelectedModelSummary();
  renderSelectedDataSummary();
  renderSelectedResultSummary();
}

function showDialog(dialog) {
  if (!dialog) return;
  const scrollLeft = window.scrollX;
  const scrollTop = window.scrollY;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "open");
  }
  window.scrollTo(scrollLeft, scrollTop);
  window.requestAnimationFrame(() => {
    window.scrollTo(scrollLeft, scrollTop);
  });
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function renderModelCompareOptions() {
  if (!modelCompareOptions) return;
  const selectedNames = new Set(getSelectedComparisonPresetNames());
  const presetEntries = buildPresetSelectionRows();

  modelCompareOptions.innerHTML = presetEntries
    .map(({ name, preset, record, displayDate }) => {
      const checked = selectedNames.has(name) ? " checked" : "";
      const rangeText = getPresetTestRangeText(record);
      const returnText = record ? `${formatPercent(record.returnRate)}（年化 ${formatPercent(record.annualizedReturn)}）` : "--";
      const drawdownText = record ? formatPercent(record.maxDrawdown) : "--";
      const returnClass = record && record.returnRate >= 0 ? "up" : "down";
      const ownedActions = isOwnedEditablePreset(name)
        ? `<button class="model-hide-button" type="button" data-preset-name="${escapeHtml(name)}" data-preset-label="${escapeHtml(preset.label)}">删除</button>`
        : "";
      return `
        <div class="model-preset-card" data-preset-name="${escapeHtml(name)}">
          <label>
            <input class="model-compare-enabled" type="checkbox" value="${escapeHtml(name)}"${checked}>
            <span>${formatModelIdPrefix(preset)}${escapeHtml(preset.label)}</span>
            <small>${escapeHtml(getStrategyTypeLabel(preset.strategyType || "wave"))} · ${escapeHtml(getPresetResearchName(name, preset))}</small>
          </label>
          <strong class="model-selector-return ${returnClass}" data-label="回报率">${returnText}</strong>
          <span class="model-selector-range" data-label="测试股票区间">${escapeHtml(rangeText)}</span>
          <span class="model-selector-drawdown" data-label="回撤率">${drawdownText}</span>
          <span class="model-selector-date" data-label="日期">${escapeHtml(displayDate || "--")}</span>
          <div class="model-card-actions">
            <button class="preset-param-button" type="button" data-preset-name="${escapeHtml(name)}">参数</button>
            ${ownedActions}
          </div>
        </div>
      `;
    })
    .join("");

  if (presetEntries.length === 0) {
    modelCompareOptions.innerHTML = '<div class="ranking-empty">还没有预存模型。</div>';
  }
  renderSimulationOverview();
}

function openModelSelectorDialog() {
  renderModelCompareOptions();
  showDialog(modelSelectorDialog);
}

function renderDataSelectorCurrentData() {
  if (!dataSelectorCurrentData) return;
  const hasData = Boolean(lastRows && lastRows.length > 0 && lastSummary);
  if (!hasData) {
    dataSelectorCurrentData.innerHTML = `
      <div>
        <span>${t("currentHistoryData")}</span>
        <strong>${t("historyNotLoaded")}</strong>
        <small>${t("queryTickerRangeHint")}</small>
      </div>
      <button id="useCurrentDataButton" class="ghost-button" type="button" disabled>${t("useCurrentDataSimulation")}</button>
    `;
    return;
  }

  const info = lastSummary.symbol || {};
  const label = info.name && info.code ? `${info.code} ${info.name}` : (info.code || codeInput.value || "--");
  dataSelectorCurrentData.innerHTML = `
    <div>
      <span>${t("currentHistoryData")}</span>
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(lastSummary.startDate)} ${t("dateRangeTo")} ${escapeHtml(lastSummary.endDate)} · ${lastSummary.count} ${t("loadedTradingDays")}</small>
    </div>
    <button id="useCurrentDataButton" class="ghost-button" type="button">${t("useCurrentDataSimulation")}</button>
  `;
}

function openDataSelectorDialog() {
  renderDataSelectorCurrentData();
  showDialog(dataSelectorDialog);
}

function openMarketDataDialog() {
  if (!lastRows || !lastSummary) {
    openDataSelectorDialog();
    return;
  }
  // Force a fresh re-sync of "does the currently active model use drawdownFromWaveHigh, and
  // what's its resolved threshold" right at the moment this dialog opens, rather than trusting
  // whatever updateWaveConditionControls() last left waveThresholdInput showing. That value can
  // otherwise go stale — updateIndicatorUi() only runs reactively (preset load, indicator type
  // change), not whenever this dialog happens to be opened — so without this call the chart
  // could show a leftover threshold from a previously-viewed model instead of the one that's
  // actually active now.
  updateIndicatorUi();
  showDialog(marketDataDialog);
  window.requestAnimationFrame(() => {
    drawChart(lastRows, lastSummary);
  });
}

function openResultsDialog() {
  if (!comparisonResults || comparisonResults.length === 0) {
    if (!lastRows || !lastSummary) {
      openDataSelectorDialog();
      return;
    }
    openModelSelectorDialog();
    return;
  }
  showDialog(resultsDialog);
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
      return `<option value="${escapeHtml(name)}"${selected}>${formatModelIdPrefix(preset)}${escapeHtml(preset.label)}</option>`;
    })
    .join("");

  return nextSelectedName;
}

let currentBlockRules = { buyBlockRules: [], sellBlockRules: [] };
let currentScoreRules = { scoreRules: [], positionBands: [] };
// 历史模拟's live "which wave condition is the 波浪确认波动% input currently editing" state.
let currentWaveConditions = []; // [{label, condition}] recomputed by updateWaveConditionControls()
let currentWaveConditionRef = null; // direct reference into currentBlockRules/currentScoreRules,
// or null when strategyType is "wave" (that case uses the old top-level-only path).
let currentModelTopLevelWaveThreshold = 5; // the loaded model's own top-level waveThreshold, kept
// separate from what waveThresholdInput displays so previewing one condition's threshold never
// leaks into the shared fallback other un-overridden conditions in the same model rely on.

function fillStrategyPresetControls(presetName) {
  const preset = strategyPresets[presetName] || strategyPresets.optimized;
  const strategyType = preset.strategyType || "wave";
  if (indicatorModelSelect) indicatorModelSelect.value = strategyType;
  if (strategyPresetSelect) renderStrategyPresetOptions(strategyType, presetName);
  waveThresholdInput.value = preset.waveThreshold;
  currentModelTopLevelWaveThreshold = Number(preset.waveThreshold) || 5;
  renderRuleInputs(presetName);
  applyLocalLadderRule(preset.localLadderRule || defaultLocalLadderRule);
  applyMaRsiBandRule(preset.maRsiBandRule || defaultMaRsiBandRule);
  applyOrderGridRule(preset.orderGridRule || defaultOrderGridRule);
  applyPeVolumeRule(preset.peVolumeRule || defaultPeVolumeRule);
  currentBlockRules = {
    buyBlockRules: cloneRuleBlocks(preset.buyBlockRules, defaultBuyBlockRules),
    sellBlockRules: cloneRuleBlocks(preset.sellBlockRules, defaultSellBlockRules),
  };
  currentScoreRules = {
    scoreRules: cloneScoreRules(preset.scoreRules, defaultScoreRules),
    positionBands: clonePositionBands(preset.positionBands, defaultPositionBands),
  };
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
    // While previewing/editing one specific drawdownFromWaveHigh condition's own threshold
    // (currentWaveConditionRef set), the top-level field must stay at the model's own original
    // default — NOT whatever that one condition's input currently shows — otherwise it'd leak
    // into the shared fallback any OTHER un-overridden wave condition in the same model relies on.
    waveThreshold: currentWaveConditionRef
      ? Math.max(0.1, Number(currentModelTopLevelWaveThreshold) || 5)
      : Math.max(0.1, Number(waveThresholdInput.value)),
    localLadderRule: readLocalLadderRule(),
    maRsiBandRule: readMaRsiBandRule(),
    orderGridRule: readOrderGridRule(),
    peVolumeRule: readPeVolumeRule(),
    stagnationReversalRule: getCurrentStagnationReversalRule(),
    buyBlockRules: currentBlockRules.buyBlockRules,
    sellBlockRules: currentBlockRules.sellBlockRules,
    scoreRules: currentScoreRules.scoreRules,
    positionBands: currentScoreRules.positionBands,
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

// Thin wrapper for the 波浪可视化 admin tool — reuses createWaveTracker/updateWaveTracker
// as-is (same algorithm getDrawdownFromWaveHighSeries already runs on every backtest) rather
// than reimplementing the zigzag logic, just collects each CONFIRMED turning point's
// date/price/rowIndex/type instead of a per-day drawdown series. A "new-high" event on the
// CONFIRMATION day refers to a peak that was actually SET on an earlier day (wave.high.date) —
// look that day's rowIndex back up via a date map so the marker lands on the real peak, not on
// the day the pullback happened to confirm it.
function getWaveTurningPoints(rows, waveThreshold) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const rowIndexByDate = new Map(rows.map((row, index) => [row.date, index]));
  const wave = createWaveTracker(rows[0], waveThreshold);
  const points = [];
  rows.forEach((row) => {
    const events = updateWaveTracker(wave, row);
    if (events.includes("new-high")) {
      points.push({ rowIndex: rowIndexByDate.get(wave.high.date), date: wave.high.date, price: wave.high.price, type: "high" });
    }
    if (events.includes("new-low")) {
      points.push({ rowIndex: rowIndexByDate.get(wave.low.date), date: wave.low.date, price: wave.low.price, type: "low" });
    }
  });
  return points;
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

// Mirror of getDrawdownFromWaveHighSeries on the low side — same wave tracker (it already
// maintains both wave.high and wave.low internally; only the high side had a condition
// indicator exposing it until now), just reading wave.low instead. Unlike riseFromLow's fixed
// N-day rolling window, this only updates wave.low once price has reversed back UP by
// waveThreshold% from a candidate low — the same threshold-confirmed "real turning point, not
// daily noise" semantics drawdownFromWaveHigh already has, just upside.
function getRiseFromWaveLowSeries(rows, waveThreshold) {
  if (!rows || rows.length === 0) return [];
  const wave = createWaveTracker(rows[0], waveThreshold);
  return rows.map((row) => {
    updateWaveTracker(wave, row);
    const low = wave.low.price;
    return low > 0 ? ((row.close - low) / low) * 100 : null;
  });
}

// Mirror of getDaysSinceNewLowSeries, but driven by the wave tracker's candidateLow instead of a
// fixed N-day rolling window — see engine.js's copy of this function for the full explanation.
// "0" means today's low extended the current down-leg's own (still-forming) low; growing counts
// mean price has held above it for that many days; a "new-high" confirmation event (candidateLow
// force-reset to today, starting a fresh down-leg) also counts as day 0.
function getDaysSinceNewWaveLowSeries(rows, waveThreshold) {
  if (!rows || rows.length === 0) return [];
  const wave = createWaveTracker(rows[0], waveThreshold);
  // Starts at -1, not 0 — see engine.js's copy of this function for why (day-0 double
  // processing quirk shared with getRiseFromWaveLowSeries; without this, day one reads 1
  // instead of the correct 0).
  let streak = -1;
  return rows.map((row) => {
    const beforePrice = wave.candidateLow.price;
    const events = updateWaveTracker(wave, row);
    const extendedLow = wave.candidateLow.price < beforePrice;
    const startedNewDownLeg = events.includes("new-high");
    streak = (extendedLow || startedNewDownLeg) ? 0 : streak + 1;
    return streak;
  });
}

// Exact mirror of getDaysSinceNewWaveLowSeries on the high side — see engine.js's copy for the
// full explanation.
function getDaysSinceNewWaveHighSeries(rows, waveThreshold) {
  if (!rows || rows.length === 0) return [];
  const wave = createWaveTracker(rows[0], waveThreshold);
  let streak = -1;
  return rows.map((row) => {
    const beforePrice = wave.candidateHigh.price;
    const events = updateWaveTracker(wave, row);
    const extendedHigh = wave.candidateHigh.price > beforePrice;
    const startedNewUpLeg = events.includes("new-low");
    streak = (extendedHigh || startedNewUpLeg) ? 0 : streak + 1;
    return streak;
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

// The actual reference low price daysSinceNewLow compares each day against — reuses the exact
// same rolling-window lookup (excludeCurrent=true, so "today" never counts as its own reference)
// so this always agrees with getDaysSinceNewLowSeries about which low is "the N日最低价". Only
// used for display (交易记录弹窗's streak preview chart/stats), not by the backtest engine.
function getRollingLowPriceSeries(rows, lookbackDays) {
  const previousLowIndices = computeRollingExtremeIndices(rows, lookbackDays, "low", (a, b) => a <= b, true);
  return rows.map((row, index) => (previousLowIndices[index] === null ? null : rows[previousLowIndices[index]].low));
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

function calculateStagnationReversalPoints(rows, ruleInput) {
  if (!rows || rows.length === 0) {
    return { highs: [], lows: [] };
  }

  const rule = readStagnationReversalRule(ruleInput || defaultStagnationReversalRule);
  const highs = [];
  const lows = [];
  let noNewLowDays = 0;
  let noNewHighDays = 0;
  let inPosition = false;

  rows.forEach((row, index) => {
    const previousLow = getPreviousLow(rows, index, rule.buyLookbackDays);
    const previousHigh = getPreviousHigh(rows, index, rule.sellLookbackDays);

    if (previousLow) {
      noNewLowDays = row.low < previousLow.low ? 0 : noNewLowDays + 1;
      if (!inPosition && noNewLowDays >= rule.buyStalledDays) {
        lows.push({
          date: row.date,
          price: row.close,
          rowIndex: index,
          confirmDate: previousLow.date,
          confirmPrice: previousLow.low,
          confirmRowIndex: previousLow.rowIndex,
          confirmLabel: `${rule.buyLookbackDays}日低点`,
          version: lows.length + 1,
        });
        inPosition = true;
        noNewHighDays = 0;
      }
    }

    if (inPosition && previousHigh) {
      noNewHighDays = row.high > previousHigh.high ? 0 : noNewHighDays + 1;
      if (noNewHighDays >= rule.sellStalledDays) {
        highs.push({
          date: row.date,
          price: row.close,
          rowIndex: index,
          confirmDate: previousHigh.date,
          confirmPrice: previousHigh.high,
          confirmRowIndex: previousHigh.rowIndex,
          confirmLabel: `${rule.sellLookbackDays}日高点`,
          version: highs.length + 1,
        });
        if (rule.sellReduce >= 100) {
          inPosition = false;
          noNewLowDays = 0;
        }
        noNewHighDays = 0;
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

function getMinTradeLotSize() {
  const symbol = normalizeSymbolInput(codeInput.value);
  return isStarMarketSymbol(symbol) ? 200 : 100;
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
// drawdownFromWaveHigh/riseFromWaveLow have no lookbackDays/slopeWindowDays of their own, so
// without something distinguishing them in the key, every condition of the same indicator in a
// model collides on the same cache entry — conditions with an explicit per-condition
// waveThreshold get their own key (and therefore their own independently-cached wave series).
// Conditions without one now resolve to value-scaled defaults (2/3 of the condition's own
// drawdown/rise target, see resolveConditionWaveThreshold) rather than one shared flat default,
// so they must also be keyed by their own value — two no-override conditions with different
// value targets are NOT interchangeable and must not share a cache slot. Only conditions with
// neither an explicit waveThreshold nor a usable value (falling back to the model-level
// config.waveThreshold) still share the old "shared" key. Each branch is prefixed with its own
// indicator name, so a drawdownFromWaveHigh condition and a riseFromWaveLow condition never
// collide even at the same threshold/value — they compute different series off different sides
// of the wave tracker.
function getConditionCacheKey(condition) {
  if (condition.indicator === "formula") return `formula:${condition.formula}`;
  if (condition.indicator === "drawdownFromWaveHigh" || condition.indicator === "riseFromWaveLow") {
    const explicit = Number(condition && condition.waveThreshold);
    if (Number.isFinite(explicit) && explicit > 0) return `${condition.indicator}:${explicit}`;
    const targetValue = Number(condition && condition.value);
    return Number.isFinite(targetValue) && targetValue > 0
      ? `${condition.indicator}:default:${targetValue}`
      : `${condition.indicator}:shared`;
  }
  // daysSinceNewWaveLow's own `value` is a day count, not a %, so (unlike the two above) it
  // can't be scaled into a sane default waveThreshold — every no-override condition here
  // resolves to the same flat default regardless of its own value, so they share one cache slot.
  if (condition.indicator === "daysSinceNewWaveLow" || condition.indicator === "daysSinceNewWaveHigh") {
    const explicit = Number(condition && condition.waveThreshold);
    return Number.isFinite(explicit) && explicit > 0 ? `${condition.indicator}:${explicit}` : `${condition.indicator}:shared`;
  }
  return `${condition.indicator}:${condition.lookbackDays || 0}:${condition.slopeWindowDays || 1}`;
}

// condition.waveThreshold (per-condition override) beats the shared config-level
// fallbackWaveThreshold when it's a real positive number; existing saved models never have
// this field set, so they fall through to the value-scaled default below. When no explicit
// override is set, the default is 2/3 of the condition's own drawdown target (value) rather
// than a flat number — the confirmation sensitivity should scale with how big a drawdown is
// being screened for. Ceiling is the condition's own drawdown target (value) — a confirmation
// threshold at or above the drawdown being screened for defeats the point — falling back to 30
// only when value isn't a usable positive number.
function resolveConditionWaveThreshold(condition, fallbackWaveThreshold) {
  const explicit = Number(condition && condition.waveThreshold);
  // daysSinceNewWaveLow's `value` is a day count, not a %, so it skips the value-scaled default
  // below entirely — see engine.js's copy of this function for the full explanation.
  if (condition && (condition.indicator === "daysSinceNewWaveLow" || condition.indicator === "daysSinceNewWaveHigh")) {
    if (Number.isFinite(explicit) && explicit > 0) return Math.min(30, Math.max(1, explicit));
    return Number(fallbackWaveThreshold) || 5;
  }
  const targetValue = Number(condition && condition.value);
  const ceiling = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 30;
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(ceiling, Math.max(1, explicit));
  if (Number.isFinite(targetValue) && targetValue > 0) return Math.min(ceiling, Math.max(1, (targetValue * 2) / 3));
  return Number(fallbackWaveThreshold) || 5;
}

function buildBlockRuleSeriesCache(rows, buyBlockRules, sellBlockRules, waveThreshold) {
  const cache = new Map();
  const ensure = (condition) => {
    if (!condition || condition.indicator === "positionRatio" || condition.indicator === "holdingDays") return;
    const key = getConditionCacheKey(condition);
    if (cache.has(key)) return;
    let series = null;
    if (condition.indicator === "drawdownFromHigh") series = getDrawdownFromHighSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "drawdownFromWaveHigh") series = getDrawdownFromWaveHighSeries(rows, resolveConditionWaveThreshold(condition, waveThreshold));
    else if (condition.indicator === "drawdownFromBreakoutHigh") series = getDrawdownFromBreakoutHighSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "riseFromLow") series = getRiseFromLowSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "riseFromWaveLow") series = getRiseFromWaveLowSeries(rows, resolveConditionWaveThreshold(condition, waveThreshold));
    else if (condition.indicator === "maValue") series = getMaValueDiffSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "maLevel") series = getMovingAverageSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "maSlope") series = getMaSlopeSeries(rows, condition.lookbackDays, condition.slopeWindowDays);
    else if (condition.indicator === "rsi") series = getRsiSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "atrPercent") series = getAtrPercentSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "volumeRatio") series = getVolumeRatioSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "daysSinceNewHigh") series = getDaysSinceNewHighSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "daysSinceNewLow") series = getDaysSinceNewLowSeries(rows, condition.lookbackDays);
    else if (condition.indicator === "daysSinceNewWaveLow") series = getDaysSinceNewWaveLowSeries(rows, resolveConditionWaveThreshold(condition, waveThreshold));
    else if (condition.indicator === "daysSinceNewWaveHigh") series = getDaysSinceNewWaveHighSeries(rows, resolveConditionWaveThreshold(condition, waveThreshold));
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
    riseFromWaveLow: "距波浪确认低点反弹%",
    maValue: "均线偏离%",
    maLevel: "均线数值",
    maSlope: "均线斜率%",
    rsi: "RSI",
    atrPercent: "ATR%",
    volumeRatio: "量比",
    daysSinceNewHigh: "未创新高天数",
    daysSinceNewLow: "未创新低天数",
    daysSinceNewWaveLow: "波浪未创新低天数",
    daysSinceNewWaveHigh: "波浪未创新高天数",
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

function getBlockActionTypeLabel(type) {
  const labels = {
    targetPercent: "调仓到目标仓位%",
    targetShares: "调仓到目标股数",
    reducePercent: "在当前仓位基础上减仓%",
    exitAll: "全部清仓",
  };
  return labels[type] || type;
}

function createEmptyBlockCondition() {
  return { indicator: "drawdownFromHigh", comparator: ">", value: 0, lookbackDays: 20, slopeWindowDays: null, sustainedDays: null, waveThreshold: null };
}

function createEmptyBlockAction() {
  return { type: "targetPercent", value: 50 };
}

function createEmptyBlockRule() {
  return { enabled: true, conditions: [createEmptyBlockCondition()], action: createEmptyBlockAction() };
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

// Scoring model: unlike block-rules' edge-triggered "AND-block fires one action" model,
// every scoreRule is evaluated independently every day (not mutually exclusive — several
// can hit the same day and their points add up), and the resulting total score is looked
// up against positionBands (highest minScore the score clears wins) to get a continuous
// target position — same "recompute target every day and let rebalanceToTarget track it"
// style as buildMaRsiBandBacktestStates, not a one-shot trigger. Condition evaluation
// itself is 100% reused from block-rules (buildBlockRuleSeriesCache/evaluateBlockRuleConditions
// don't care what the caller does with a "did this rule's conditions hold today" result).
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
    renderSimulationOverview();
    return;
  }

  const bestReturn = results.reduce((best, item) => (
    !best || item.finalState.returnRate > best.finalState.returnRate ? item : best
  ), null);
  const bestDrawdown = results.reduce((best, item) => (
    !best || item.finalState.maxDrawdown < best.finalState.maxDrawdown ? item : best
  ), null);
  const beatCount = results.filter((item) => item.finalState.returnRate >= item.finalState.buyHold.returnRate).length;
  const canOptimizePresets = canUseModelAuthoring();

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
              <span>年化收益</span>
              <strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(annualizeReturnByTradingDays(state.returnRate, result.states.length))}</strong>
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
            ${canEditPreset ? `<button class="result-param-button" type="button" data-preset-name="${escapeHtml(result.name)}">查看参数</button>` : ""}
            ${canOptimizePresets && result.name !== "__current__" && strategyPresets[result.name] ? `<button class="result-optimize-button" type="button" data-preset-name="${escapeHtml(result.name)}">优化参数</button>` : ""}
            <button class="result-trades-button" type="button" data-result-name="${escapeHtml(result.name)}">交易记录</button>
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

// Same CAGR formula as annualizeReturn, but for the common case where what's on hand is a
// trading-day count (rows.length / states array position) rather than a calendar year count
// — 252 trading days/year matches scripts/shared/annualize.js's annualizedReturnRate so a
// single-backtest result annualizes the same way here as it does in the batch scan scripts.
function annualizeReturnByTradingDays(returnRate, tradingDays) {
  return annualizeReturn(returnRate, tradingDays / 252);
}

function buildRankingPresetSnapshot(preset, config) {
  return {
    ...stripPresetDisplayFields(getSerializablePreset(preset)),
    initialCash: Number(config.initialCash) || 0,
    tradeFee: Number(config.tradeFee) || 0,
  };
}

function buildPresetRankingResults(rows, currentConfig, presetNames) {
  return presetNames
    .map((presetName) => {
      const preset = strategyPresets[presetName];
      if (!preset) return null;
      const config = createConfigFromPreset(presetName, currentConfig);
      const states = buildParallelBacktestStates(rows, config);
      const finalState = states[states.length - 1];
      if (!finalState || !finalState.buyHold) return null;
      return {
        name: presetName,
        label: preset.label,
        strategyType: preset.strategyType || "wave",
        config,
        presetConfigSnapshot: buildRankingPresetSnapshot(preset, config),
        presetMetaSnapshot: clonePlainObject(preset.meta),
        presetOriginalTextSnapshot: String(preset.meta && preset.meta.originalText || "").slice(0, 8000),
        presetModelTextSnapshot: String(preset.meta && (preset.meta.modelText || preset.meta.originalText) || "").slice(0, 8000),
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
    presetConfigSnapshot: result.presetConfigSnapshot,
    presetMetaSnapshot: result.presetMetaSnapshot,
    presetOriginalTextSnapshot: result.presetOriginalTextSnapshot,
    presetModelTextSnapshot: result.presetModelTextSnapshot,
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
  const presetNames = getSelectedComparisonPresetNames()
    .filter((presetName) => {
      const preset = strategyPresets[presetName];
      if (!preset || !preset.meta) return false;
      if (preset.meta.isOwner && isUserEditablePreset(presetName)) return true;
      return Boolean(preset.meta.isPublic);
    });
  if (!lastRows || lastRows.length < 2 || presetNames.length === 0) return;
  const symbolInfo = getActiveRankingSymbolInfo();
  if (!symbolInfo.symbol) return;

  const ownRecords = [];
  const publicRecords = [];
  let coveredAnyPeriod = false;
  rankingPeriods.forEach((periodYears) => {
    const rowsForPeriod = selectTrailingRowsByYears(lastRows, periodYears);
    if (!rowsForPeriod) return;
    coveredAnyPeriod = true;
    buildPresetRankingResults(rowsForPeriod, currentConfig, presetNames).forEach((result) => {
      const record = createRankingRecord(symbolInfo, periodYears, rowsForPeriod, result);
      if (!record) return;
      const preset = strategyPresets[result.name];
      if (preset && preset.meta && preset.meta.isPublic) {
        publicRecords.push(record);
      } else {
        ownRecords.push(record);
      }
    });
  });

  if (ownRecords.length === 0 && publicRecords.length === 0) {
    if (!coveredAnyPeriod) {
      setStatus(`历史数据区间不足 ${rankingPeriods[0]} 年，未生成模型排行记录；选择更长的区间（最近 ${rankingPeriods.join("/")} 年）后会自动记录。`);
    }
    return;
  }
  if (ownRecords.length > 0) {
    mergeRankingRecords(ownRecords);
    saveServerRankingRecords(ownRecords);
  }
  if (publicRecords.length > 0) {
    saveServerRankingRecords(publicRecords, { public: true });
  }
  renderModelRanking();
  renderModelCompareOptions();
}

function hasRankingPresetSnapshot(record) {
  return Boolean(record && record.presetConfigSnapshot && Object.keys(record.presetConfigSnapshot).length > 0);
}

function renderRankingPagination(pageKey, periodYears, page, pageCount, totalRecords) {
  if (pageCount <= 1) return "";
  return `
    <div class="ranking-pagination" aria-label="${periodYears} 年排行分页">
      <span>第 ${page + 1} / ${pageCount} 页，共 ${totalRecords} 条</span>
      <div>
        <button class="ranking-page-button" type="button" data-ranking-page-key="${escapeHtml(pageKey)}" data-ranking-page="${page - 1}"${page <= 0 ? " disabled" : ""}>上一页</button>
        <button class="ranking-page-button" type="button" data-ranking-page-key="${escapeHtml(pageKey)}" data-ranking-page="${page + 1}"${page >= pageCount - 1 ? " disabled" : ""}>下一页</button>
      </div>
    </div>
  `;
}

function renderRankingSection(sectionKey, records, options = {}) {
  const showActions = Boolean(options.showActions);

  if (records.length === 0) {
    return `<div class="ranking-empty">${escapeHtml(options.emptyMessage || "暂无记录。")}</div>`;
  }

  return rankingPeriods
    .map((periodYears) => {
      // Return rate first; when that ties, prefer the lower drawdown; when both tie, prefer
      // fewer trades (a model that reaches the same result with less trading is simpler and
      // has less execution/slippage risk, so it should rank above one that churns more for
      // the same outcome).
      const periodRecords = records
        .filter((record) => record.periodYears === periodYears)
        .sort((a, b) => {
          if (b.returnRate !== a.returnRate) return b.returnRate - a.returnRate;
          if (a.maxDrawdown !== b.maxDrawdown) return a.maxDrawdown - b.maxDrawdown;
          return a.trades - b.trades;
        });
      const pageKey = `${sectionKey}_${periodYears}`;
      const pageCount = Math.max(1, Math.ceil(periodRecords.length / rankingPageSize));
      const currentPage = Math.min(Math.max(0, Number(rankingPageByPeriod[pageKey]) || 0), pageCount - 1);
      rankingPageByPeriod[pageKey] = currentPage;
      const pageStart = currentPage * rankingPageSize;
      const visibleRecords = periodRecords.slice(pageStart, pageStart + rankingPageSize);
      if (periodRecords.length === 0) {
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
                  <th>收益</th>
                  <th>年化</th>
                  <th>全仓收益</th>
                  <th>超额</th>
                  <th>最大回撤</th>
                  <th>全仓回撤</th>
                  <th>费用</th>
                  <th>交易</th>
                  <th>股票</th>
                  <th>区间</th>
                  <th>模型</th>
                  <th>类型</th>
                  <th>更新</th>
                  <th>参数</th>
                  ${showActions ? "<th>操作</th>" : ""}
                </tr>
              </thead>
              <tbody>
                ${visibleRecords.map((record, index) => `
                  <tr data-preset-name="${escapeHtml(record.presetName)}" data-ranking-key="${escapeHtml(record.key)}">
                    <td>#${pageStart + index + 1}</td>
                    <td class="${record.returnRate >= 0 ? "up" : "down"}">${formatPercent(record.returnRate)}</td>
                    <td class="${record.annualizedReturn >= 0 ? "up" : "down"}">${formatPercent(record.annualizedReturn)}</td>
                    <td>${formatPercent(record.buyHoldReturnRate)}</td>
                    <td class="${record.excessReturn >= 0 ? "up" : "down"}">${formatPercent(record.excessReturn)}</td>
                    <td>${formatPercent(record.maxDrawdown)}</td>
                    <td>${formatPercent(record.buyHoldMaxDrawdown)}</td>
                    <td>${formatMoney(record.totalFees || 0)}</td>
                    <td>${record.trades}</td>
                    <td>${escapeHtml(record.symbol)} ${escapeHtml(record.symbolName)}</td>
                    <td>${escapeHtml(record.startDate)} 至 ${escapeHtml(record.endDate)}</td>
                    <td>${escapeHtml(record.presetLabel)}</td>
                    <td>${escapeHtml(getStrategyTypeLabel(record.strategyType))}</td>
                    <td>${escapeHtml(record.updatedAt)}</td>
                    <td><button class="ranking-param-button" type="button" data-ranking-key="${escapeHtml(record.key)}" data-preset-name="${escapeHtml(record.presetName)}">参数</button></td>
                    ${showActions ? `<td><button class="ranking-hide-button" type="button" data-ranking-key="${escapeHtml(record.key)}">删除</button></td>` : ""}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          ${renderRankingPagination(pageKey, periodYears, currentPage, pageCount, periodRecords.length)}
        </section>
      `;
    })
    .join("");
}

function renderMyModelsList() {
  if (!currentUser) return "";
  const myModels = Object.entries(strategyPresets).filter(([name]) => isOwnedEditablePreset(name));
  if (myModels.length === 0) {
    return '<div class="ranking-empty">还没有创建自己的模型。</div>';
  }
  return `
    <div class="my-models-list">
      ${myModels.map(([name, preset]) => `
        <div class="my-model-row" data-preset-name="${escapeHtml(name)}">
          <div class="my-model-info">
            <strong>${formatModelNameLink({
              id: preset.id, numericId: preset.numericId, label: preset.label || name,
              config: preset, strategyType: preset.strategyType,
              symbol: preset.meta && preset.meta.targetSymbol && preset.meta.targetSymbol !== "通用" ? preset.meta.targetSymbol : "",
              isOwner: true, name,
            })}</strong>
            <small>${escapeHtml(getStrategyTypeLabel(preset.strategyType || "wave"))}</small>
          </div>
          <div class="my-model-actions">
            <button class="my-model-rename-button" type="button" data-preset-name="${escapeHtml(name)}">重命名</button>
            <button class="preset-param-button" type="button" data-preset-name="${escapeHtml(name)}">参数</button>
            <button class="model-hide-button" type="button" data-preset-name="${escapeHtml(name)}" data-preset-label="${escapeHtml(preset.label || name)}">删除</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function renameOwnedPreset(name) {
  const preset = strategyPresets[name];
  if (!preset || !isOwnedEditablePreset(name)) return;
  const nextLabel = window.prompt("输入新的模型名称：", preset.label || name);
  if (nextLabel === null) return;
  const trimmed = nextLabel.trim().slice(0, 80);
  if (!trimmed) {
    setStatus("模型名称不能为空。", true);
    return;
  }
  if (trimmed === preset.label) return;
  strategyPresets[name] = {
    ...preset,
    label: trimmed,
    meta: {
      ...preset.meta,
      updatedAt: todayText(),
    },
  };
  const saved = await saveCustomStrategyPresets();
  if (!saved) return;
  renderModelCompareOptions();
  renderModelRanking();
  setStatus(`已重命名为：${trimmed}。`);
}

function renderModelRanking() {
  if (!rankingPresetList) return;

  const publicHtml = renderRankingSection("public", publicRankingRecords, {
    showActions: false,
    emptyMessage: "暂无公共模型排行。",
  });
  const ownHtml = currentUser
    ? renderRankingSection("own", rankingRecords, {
        showActions: true,
        emptyMessage: "暂无你的模型排行。保存自己的模型，然后进入历史模拟生成 1 年、3 年、5 年成绩。",
      })
    : '<div class="ranking-empty">登录后可以查看和管理你自己的模型排行。</div>';
  const myModelsHtml = currentUser
    ? `<h3 class="ranking-subgroup-title">我的模型</h3>${renderMyModelsList()}`
    : "";

  rankingPresetList.innerHTML = `
    <div class="ranking-group">
      <h2 class="ranking-group-title">Public 模型排行</h2>
      ${publicHtml}
    </div>
    <div class="ranking-group">
      <h2 class="ranking-group-title">个人模型排行</h2>
      ${myModelsHtml}
      ${ownHtml}
    </div>
  `;
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
  if (type === "stagnation-reversal") {
    const rule = readStagnationReversalRule(preset.stagnationReversalRule || defaultStagnationReversalRule);
    return `${rule.buyStalledDays}天未创新低买到${rule.buyTarget}%；${rule.sellStalledDays}天未创新高卖${rule.sellReduce}%`;
  }
  if (type === "block-rules") {
    const buyCount = (preset.buyBlockRules || []).filter((block) => block.enabled !== false).length;
    const sellCount = (preset.sellBlockRules || []).filter((block) => block.enabled !== false).length;
    return `买入 ${buyCount} 条规则 / 卖出 ${sellCount} 条规则`;
  }
  if (type === "score-rules") {
    const ruleCount = (preset.scoreRules || []).filter((rule) => rule.enabled !== false).length;
    const bandCount = (preset.positionBands || []).length;
    return `打分规则 ${ruleCount} 条 / 仓位档位 ${bandCount} 档`;
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

function isOwnedEditablePreset(name) {
  const preset = strategyPresets[name];
  return Boolean(
    preset
    && isUserEditablePreset(name)
    && preset.meta
    && preset.meta.isOwner
    && !preset.meta.isPublic
  );
}

function getSerializablePreset(preset) {
  return {
    strategyType: preset.strategyType || "wave",
    waveThreshold: preset.waveThreshold || 5,
    localLadderRule: preset.localLadderRule || undefined,
    maRsiBandRule: preset.maRsiBandRule || undefined,
    orderGridRule: preset.orderGridRule || undefined,
    peVolumeRule: preset.peVolumeRule || undefined,
    stagnationReversalRule: preset.stagnationReversalRule || undefined,
    buyRules: preset.buyRules || undefined,
    sellRules: preset.sellRules || undefined,
    noNewHighExitRule: preset.noNewHighExitRule || undefined,
    buyBlockRules: preset.buyBlockRules && preset.buyBlockRules.length ? preset.buyBlockRules : undefined,
    sellBlockRules: preset.sellBlockRules && preset.sellBlockRules.length ? preset.sellBlockRules : undefined,
    scoreRules: preset.scoreRules && preset.scoreRules.length ? preset.scoreRules : undefined,
    positionBands: preset.positionBands && preset.positionBands.length ? preset.positionBands : undefined,
  };
}

let blockRuleFormState = null;
let blockRuleFormReadonly = false;
let editingRuleFormMode = null;
let editingRuleFormStrategyType = null;

const RULE_FIELD_LABELS = {
  localLadderRule: {
    lookbackDays: "回看天数", entryDrop: "首次建仓回撤%", ladderDrop: "每级加仓步进%", buyAdd: "每级加仓比例%",
    maxTarget: "最高目标仓位%", sellRise: "每级减仓涨幅%", sellReduce: "每级减仓比例%", stopLoss: "止损回撤%",
    stopReduce: "止损减仓%", maxSellsPerDay: "每日最多减仓次数", resetPositionBelow: "仓位低于此值重置%",
  },
  maRsiBandRule: {
    fastMa: "快均线天数", slowMa: "慢均线天数", slowBuffer: "慢线缓冲%", useSlowTrend: "启用慢线趋势判断",
    bearTarget: "熊市目标仓位%", bullTarget: "牛市目标仓位%", useFastBull: "启用快线强势加仓", fastBullTarget: "快线强势目标仓位%",
    useFastCut: "启用快线止损", fastBearTarget: "快线止损目标仓位%", fastCut: "快线止损跌幅%", rsiDays: "RSI天数",
    useRsiBuy: "启用RSI超卖加仓", rsiBuy: "RSI超卖阈值", rsiTarget: "RSI超卖目标仓位%", useRsiSell: "启用RSI超买减仓",
    rsiSell: "RSI超买阈值", hotTarget: "RSI超买目标仓位%", atrDays: "ATR天数", useAtr: "启用ATR波动率控制",
    highAtr: "高波动ATR%阈值", volTarget: "高波动目标仓位%",
  },
  orderGridRule: {
    lookbackDays: "回看天数", entryDrop: "首次建仓回撤%", orderCapitalPercent: "单笔仓位%", addDrop: "每次加仓步进%",
    takeProfit: "止盈%", maxLots: "最大网格数",
  },
  peVolumeRule: {
    peLookbackDays: "PE回看天数", lowPePercentile: "低PE分位", highPePercentile: "高PE分位", volumeMaDays: "成交量均线天数",
    volumeBuyMultiplier: "放量买入倍数", volumeSellMultiplier: "缩量卖出倍数", lowPeTarget: "低PE目标仓位%",
    neutralTarget: "中性目标仓位%", highPeTarget: "高PE目标仓位%",
  },
  stagnationReversalRule: {
    buyLookbackDays: "买入回看天数", buyStalledDays: "买入停滞天数", buyTarget: "买入目标仓位%",
    sellLookbackDays: "卖出回看天数", sellStalledDays: "卖出停滞天数", sellReduce: "卖出减仓%",
  },
};

function renderBlockConditionRow(condition, sideKey, blockIndex, conditionIndex) {
  const showSlopeWindow = condition.indicator === "maSlope";
  const showFormula = condition.indicator === "formula";
  const showWaveThreshold = condition.indicator === "drawdownFromWaveHigh" || condition.indicator === "riseFromWaveLow" || condition.indicator === "daysSinceNewWaveLow" || condition.indicator === "daysSinceNewWaveHigh";
  const numOrEmpty = (value) => (value === null || value === undefined ? "" : value);
  return `
    <div class="block-rule-condition-row" data-condition-index="${conditionIndex}">
      <select data-role="indicator">
        ${blockRuleIndicators.map((ind) => `<option value="${ind}" ${condition.indicator === ind ? "selected" : ""}>${escapeHtml(getBlockIndicatorLabel(ind))}</option>`).join("")}
      </select>
      <input type="text" data-role="formula" value="${escapeHtml(condition.formula || "")}" placeholder="公式，如 peTtm 或 close/sma(close,20)" ${showFormula ? "" : "disabled"}>
      <input type="number" data-role="lookbackDays" value="${numOrEmpty(condition.lookbackDays)}" placeholder="回看天数" min="1" step="1" ${showFormula ? "disabled" : ""}>
      <select data-role="comparator">
        ${blockRuleComparators.map((c) => `<option value="${escapeHtml(c)}" ${condition.comparator === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
      </select>
      <input type="number" data-role="value" value="${numOrEmpty(condition.value)}" placeholder="数值" step="any">
      <input type="number" data-role="slopeWindowDays" value="${numOrEmpty(condition.slopeWindowDays)}" placeholder="斜率窗口(仅均线斜率)" min="1" step="1" ${showSlopeWindow ? "" : "disabled"}>
      <input type="number" data-role="sustainedDays" value="${numOrEmpty(condition.sustainedDays)}" placeholder="连续天数(可选)" min="1" step="1">
      <input type="number" data-role="waveThreshold" value="${numOrEmpty(condition.waveThreshold)}" placeholder="波浪确认阈值%(留空=回撤目标的2/3)" min="1" step="any" ${showWaveThreshold ? "" : "disabled"}>
      <button type="button" class="ghost-button block-rule-remove-condition" data-side="${sideKey}" data-block-index="${blockIndex}" data-condition-index="${conditionIndex}">删除条件</button>
    </div>
  `;
}

function renderBlockActionRow(action) {
  const isExitAll = action.type === "exitAll";
  const value = action.value === null || action.value === undefined ? "" : action.value;
  return `
    <div class="block-rule-action-row">
      <span class="block-rule-action-label">→ 动作</span>
      <select data-role="action-type">
        ${blockRuleActionTypes.map((t) => `<option value="${t}" ${action.type === t ? "selected" : ""}>${escapeHtml(getBlockActionTypeLabel(t))}</option>`).join("")}
      </select>
      <input type="number" data-role="action-value" value="${value}" placeholder="数值" step="any" ${isExitAll ? "disabled" : ""}>
    </div>
  `;
}

function renderBlockRuleBlock(block, sideKey, blockIndex) {
  const conditions = Array.isArray(block.conditions) ? block.conditions : [];
  return `
    <div class="block-rule-block" data-side="${sideKey}" data-block-index="${blockIndex}">
      <div class="block-rule-block-head">
        <label><input type="checkbox" data-role="enabled" ${block.enabled !== false ? "checked" : ""}> 启用</label>
        <button type="button" class="ghost-button block-rule-remove-block" data-side="${sideKey}" data-block-index="${blockIndex}">删除规则块</button>
      </div>
      <div class="block-rule-conditions">
        ${conditions.map((c, ci) => renderBlockConditionRow(c, sideKey, blockIndex, ci)).join("") || `<div class="ranking-empty">这个规则块还没有条件。</div>`}
      </div>
      <button type="button" class="ghost-button block-rule-add-condition" data-side="${sideKey}" data-block-index="${blockIndex}">+ 添加条件</button>
      ${renderBlockActionRow(block.action || createEmptyBlockAction())}
    </div>
  `;
}

function renderBlockRuleFormEditor() {
  if (!blockRuleFormEditor || !blockRuleFormState) return;
  const buyBlocks = Array.isArray(blockRuleFormState.buyBlockRules) ? blockRuleFormState.buyBlockRules : [];
  const sellBlocks = Array.isArray(blockRuleFormState.sellBlockRules) ? blockRuleFormState.sellBlockRules : [];
  const buyHtml = buyBlocks.map((b, i) => renderBlockRuleBlock(b, "buyBlockRules", i)).join("") || `<div class="ranking-empty">还没有买入规则块。</div>`;
  const sellHtml = sellBlocks.map((b, i) => renderBlockRuleBlock(b, "sellBlockRules", i)).join("") || `<div class="ranking-empty">还没有卖出规则块。</div>`;
  blockRuleFormEditor.innerHTML = `
    <div class="block-rule-side">
      <h4>买入规则块（块内条件“且”，块间“或”）</h4>
      <div class="block-rule-list">${buyHtml}</div>
      <button type="button" class="ghost-button" id="addBuyBlockRuleButton">+ 添加买入规则块</button>
    </div>
    <div class="block-rule-side">
      <h4>卖出规则块</h4>
      <div class="block-rule-list">${sellHtml}</div>
      <button type="button" class="ghost-button" id="addSellBlockRuleButton">+ 添加卖出规则块</button>
    </div>
  `;
  if (blockRuleFormReadonly) {
    blockRuleFormEditor.querySelectorAll("input, select, button").forEach((el) => { el.disabled = true; });
  }
  syncBlockRuleFormToEditor();
}

function collectBlockRuleFormState() {
  if (!blockRuleFormEditor) return blockRuleFormState;
  const collectSide = (sideKey) => {
    const blockEls = blockRuleFormEditor.querySelectorAll(`.block-rule-block[data-side="${sideKey}"]`);
    return Array.from(blockEls).map((blockEl) => {
      const enabled = blockEl.querySelector('[data-role="enabled"]').checked;
      const rowEls = blockEl.querySelectorAll(".block-rule-condition-row");
      const conditions = Array.from(rowEls).map((rowEl) => {
        const indicator = rowEl.querySelector('[data-role="indicator"]').value;
        const comparator = rowEl.querySelector('[data-role="comparator"]').value;
        const value = Number(rowEl.querySelector('[data-role="value"]').value);
        const formulaRaw = rowEl.querySelector('[data-role="formula"]').value;
        const lookbackRaw = rowEl.querySelector('[data-role="lookbackDays"]').value;
        const slopeRaw = rowEl.querySelector('[data-role="slopeWindowDays"]').value;
        const sustainRaw = rowEl.querySelector('[data-role="sustainedDays"]').value;
        const waveThresholdRaw = rowEl.querySelector('[data-role="waveThreshold"]').value;
        return {
          indicator,
          comparator,
          value: Number.isFinite(value) ? value : 0,
          formula: indicator === "formula" ? formulaRaw.trim() : null,
          lookbackDays: indicator === "formula" || lookbackRaw === "" ? null : Math.max(1, Math.round(Number(lookbackRaw) || 1)),
          slopeWindowDays: slopeRaw === "" ? null : Math.max(1, Math.round(Number(slopeRaw) || 1)),
          sustainedDays: sustainRaw === "" ? null : Math.max(1, Math.round(Number(sustainRaw) || 1)),
          waveThreshold: (indicator !== "drawdownFromWaveHigh" && indicator !== "riseFromWaveLow" && indicator !== "daysSinceNewWaveLow" && indicator !== "daysSinceNewWaveHigh") || waveThresholdRaw === "" ? null : Math.max(1, Number(waveThresholdRaw) || 1),
        };
      });
      const actionType = blockEl.querySelector('[data-role="action-type"]').value;
      const actionValueRaw = blockEl.querySelector('[data-role="action-value"]').value;
      const action = actionType === "exitAll"
        ? { type: "exitAll", value: null }
        : { type: actionType, value: actionValueRaw === "" ? 0 : Number(actionValueRaw) };
      return { enabled, conditions, action };
    });
  };
  return {
    buyBlockRules: collectSide("buyBlockRules"),
    sellBlockRules: collectSide("sellBlockRules"),
  };
}

function syncBlockRuleFormToEditor() {
  if (!presetParamEditor) return;
  blockRuleFormState = collectBlockRuleFormState();
  let base = {};
  try {
    base = JSON.parse(presetParamEditor.value) || {};
  } catch (error) {
    base = {};
  }
  base.buyBlockRules = blockRuleFormState.buyBlockRules;
  base.sellBlockRules = blockRuleFormState.sellBlockRules;
  presetParamEditor.value = JSON.stringify(base, null, 2);
}

function refreshBlockRuleFormFromJson() {
  if (!presetParamEditor || blockRuleFormReadonly) return;
  let parsed;
  try {
    parsed = JSON.parse(presetParamEditor.value);
  } catch (error) {
    setStatus("参数 JSON 格式不正确，无法刷新表单。", true);
    return;
  }
  if (editingRuleFormMode === "wave") {
    renderWaveRuleFormEditor(parsed);
    return;
  }
  if (editingRuleFormMode === "flat") {
    const typeConfig = OPTIMIZATION_TYPE_CONFIG[editingRuleFormStrategyType];
    if (!typeConfig) return;
    const rule = { ...typeConfig.defaultRule, ...(parsed[typeConfig.ruleKey] || {}) };
    renderFlatRuleFormEditor(editingRuleFormStrategyType, rule);
    return;
  }
  blockRuleFormState = {
    buyBlockRules: cloneRuleBlocks(parsed.buyBlockRules, defaultBuyBlockRules),
    sellBlockRules: cloneRuleBlocks(parsed.sellBlockRules, defaultSellBlockRules),
  };
  renderBlockRuleFormEditor();
}

function renderFlatRuleFormEditor(strategyType, rule) {
  if (!blockRuleFormEditor) return;
  const typeConfig = OPTIMIZATION_TYPE_CONFIG[strategyType];
  if (!typeConfig) return;
  const labels = RULE_FIELD_LABELS[typeConfig.ruleKey] || {};
  const keys = Object.keys(typeConfig.defaultRule);
  blockRuleFormEditor.innerHTML = `
    <div class="flat-rule-form">
      ${keys.map((key) => {
        const value = rule[key];
        const label = labels[key] || key;
        if (typeof typeConfig.defaultRule[key] === "boolean") {
          return `
            <label class="flat-rule-field flat-rule-field-checkbox">
              <input type="checkbox" data-role="flat-field" data-key="${key}" ${value ? "checked" : ""}>
              ${escapeHtml(label)}
            </label>
          `;
        }
        return `
          <label class="flat-rule-field">
            <span>${escapeHtml(label)}</span>
            <input type="number" step="any" data-role="flat-field" data-key="${key}" value="${value}">
          </label>
        `;
      }).join("")}
    </div>
  `;
  if (blockRuleFormReadonly) {
    blockRuleFormEditor.querySelectorAll("input").forEach((el) => { el.disabled = true; });
  }
  syncFlatRuleFormToEditor(strategyType);
}

function collectFlatRuleFormState(strategyType) {
  const typeConfig = OPTIMIZATION_TYPE_CONFIG[strategyType];
  if (!typeConfig || !blockRuleFormEditor) return null;
  const rule = {};
  Object.keys(typeConfig.defaultRule).forEach((key) => {
    const input = blockRuleFormEditor.querySelector(`[data-role="flat-field"][data-key="${key}"]`);
    if (!input) {
      rule[key] = typeConfig.defaultRule[key];
      return;
    }
    if (input.type === "checkbox") {
      rule[key] = input.checked;
    } else {
      const num = Number(input.value);
      rule[key] = Number.isFinite(num) ? num : typeConfig.defaultRule[key];
    }
  });
  return rule;
}

function syncFlatRuleFormToEditor(strategyType) {
  if (!presetParamEditor) return;
  const typeConfig = OPTIMIZATION_TYPE_CONFIG[strategyType];
  const rule = collectFlatRuleFormState(strategyType);
  if (!typeConfig || !rule) return;
  let base = {};
  try {
    base = JSON.parse(presetParamEditor.value) || {};
  } catch (error) {
    base = {};
  }
  base[typeConfig.ruleKey] = rule;
  presetParamEditor.value = JSON.stringify(base, null, 2);
}

function renderWaveRuleFormEditor(config) {
  if (!blockRuleFormEditor) return;
  const buyRules = Array.isArray(config && config.buyRules) ? config.buyRules : [];
  const sellRules = Array.isArray(config && config.sellRules) ? config.sellRules : [];
  const waveThreshold = config && config.waveThreshold !== undefined ? config.waveThreshold : 5;
  const riskRule = { ...defaultNoNewHighExitRule, ...((config && config.noNewHighExitRule) || {}) };
  const renderRuleBlock = (rule, sideKey, index, fieldA, labelA, fieldB, labelB) => `
    <div class="block-rule-block" data-wave-side="${sideKey}" data-block-index="${index}">
      <div class="block-rule-block-head">
        <label><input type="checkbox" data-role="wave-enabled" ${rule.enabled !== false ? "checked" : ""}> 启用</label>
        <button type="button" class="ghost-button wave-remove-rule" data-side="${sideKey}" data-index="${index}">删除规则</button>
      </div>
      <div class="flat-rule-form">
        <label class="flat-rule-field"><span>${labelA}</span><input type="number" step="any" data-role="wave-${fieldA}" value="${rule[fieldA]}"></label>
        <label class="flat-rule-field"><span>${labelB}</span><input type="number" step="any" data-role="wave-${fieldB}" value="${rule[fieldB]}"></label>
      </div>
    </div>
  `;
  blockRuleFormEditor.innerHTML = `
    <label class="flat-rule-field">
      <span>波浪确认阈值%</span>
      <input type="number" step="any" data-role="wave-threshold" value="${waveThreshold}">
    </label>
    <div class="block-rule-form-editor">
      <div class="block-rule-side">
        <h4>买入规则</h4>
        <div class="block-rule-list">
          ${buyRules.map((rule, i) => renderRuleBlock(rule, "buyRules", i, "drop", "回撤%", "target", "目标仓位%")).join("") || `<div class="ranking-empty">还没有买入规则。</div>`}
        </div>
        <button type="button" class="ghost-button" id="addWaveBuyRuleButton">+ 添加买入规则</button>
      </div>
      <div class="block-rule-side">
        <h4>卖出规则</h4>
        <div class="block-rule-list">
          ${sellRules.map((rule, i) => renderRuleBlock(rule, "sellRules", i, "rise", "涨幅%", "reduce", "减仓%")).join("") || `<div class="ranking-empty">还没有卖出规则。</div>`}
        </div>
        <button type="button" class="ghost-button" id="addWaveSellRuleButton">+ 添加卖出规则</button>
      </div>
    </div>
    <div class="block-rule-block">
      <div class="block-rule-block-head">
        <label><input type="checkbox" data-role="wave-risk-enabled" ${riskRule.enabled ? "checked" : ""}> 启用风控平仓（滞涨止损）</label>
      </div>
      <div class="flat-rule-form">
        <label class="flat-rule-field"><span>回看天数</span><input type="number" step="1" min="2" data-role="wave-risk-lookbackDays" value="${riskRule.lookbackDays}"></label>
        <label class="flat-rule-field"><span>未创新高天数</span><input type="number" step="1" min="1" data-role="wave-risk-stalledDays" value="${riskRule.stalledDays}"></label>
        <label class="flat-rule-field"><span>触发时减仓%</span><input type="number" step="any" min="0" max="100" data-role="wave-risk-reduce" value="${riskRule.reduce}"></label>
      </div>
    </div>
  `;
  if (blockRuleFormReadonly) {
    blockRuleFormEditor.querySelectorAll("input, button").forEach((el) => { el.disabled = true; });
  }
  syncWaveRuleFormToEditor();
}

function collectWaveRuleFormState() {
  if (!blockRuleFormEditor) return { waveThreshold: 5, buyRules: [], sellRules: [], noNewHighExitRule: { ...defaultNoNewHighExitRule, enabled: false } };
  const thresholdInput = blockRuleFormEditor.querySelector('[data-role="wave-threshold"]');
  const waveThreshold = thresholdInput ? Number(thresholdInput.value) || 5 : 5;
  const collectSide = (sideKey, fieldA, fieldB) => {
    const blockEls = blockRuleFormEditor.querySelectorAll(`.block-rule-block[data-wave-side="${sideKey}"]`);
    return Array.from(blockEls).map((el) => {
      const enabled = el.querySelector('[data-role="wave-enabled"]').checked;
      const a = Number(el.querySelector(`[data-role="wave-${fieldA}"]`).value) || 0;
      const b = Number(el.querySelector(`[data-role="wave-${fieldB}"]`).value) || 0;
      return { enabled, [fieldA]: a, [fieldB]: b };
    });
  };
  const riskEnabledInput = blockRuleFormEditor.querySelector('[data-role="wave-risk-enabled"]');
  const riskLookbackInput = blockRuleFormEditor.querySelector('[data-role="wave-risk-lookbackDays"]');
  const riskStalledInput = blockRuleFormEditor.querySelector('[data-role="wave-risk-stalledDays"]');
  const riskReduceInput = blockRuleFormEditor.querySelector('[data-role="wave-risk-reduce"]');
  const noNewHighExitRule = {
    enabled: Boolean(riskEnabledInput && riskEnabledInput.checked),
    lookbackDays: Math.max(2, Math.round(Number(riskLookbackInput && riskLookbackInput.value) || defaultNoNewHighExitRule.lookbackDays)),
    stalledDays: Math.max(1, Math.round(Number(riskStalledInput && riskStalledInput.value) || defaultNoNewHighExitRule.stalledDays)),
    reduce: Math.min(100, Math.max(0, Number(riskReduceInput && riskReduceInput.value) || defaultNoNewHighExitRule.reduce)),
  };
  return {
    waveThreshold,
    buyRules: collectSide("buyRules", "drop", "target"),
    sellRules: collectSide("sellRules", "rise", "reduce"),
    noNewHighExitRule,
  };
}

function syncWaveRuleFormToEditor() {
  if (!presetParamEditor) return;
  const state = collectWaveRuleFormState();
  let base = {};
  try {
    base = JSON.parse(presetParamEditor.value) || {};
  } catch (error) {
    base = {};
  }
  base.waveThreshold = state.waveThreshold;
  base.buyRules = state.buyRules;
  base.sellRules = state.sellRules;
  base.noNewHighExitRule = state.noNewHighExitRule;
  presetParamEditor.value = JSON.stringify(base, null, 2);
}

if (blockRuleFormEditor) {
  blockRuleFormEditor.addEventListener("input", () => {
    if (blockRuleFormReadonly) return;
    if (editingRuleFormMode === "wave") {
      syncWaveRuleFormToEditor();
      return;
    }
    if (editingRuleFormMode === "flat") {
      syncFlatRuleFormToEditor(editingRuleFormStrategyType);
      return;
    }
    syncBlockRuleFormToEditor();
  });
  blockRuleFormEditor.addEventListener("change", (event) => {
    if (blockRuleFormReadonly) return;
    const target = event.target;
    if (editingRuleFormMode === "wave") {
      syncWaveRuleFormToEditor();
      return;
    }
    if (editingRuleFormMode === "flat") {
      syncFlatRuleFormToEditor(editingRuleFormStrategyType);
      return;
    }
    if (target && target.dataset && target.dataset.role === "indicator") {
      const row = target.closest(".block-rule-condition-row");
      const slopeInput = row && row.querySelector('[data-role="slopeWindowDays"]');
      if (slopeInput) slopeInput.disabled = target.value !== "maSlope";
      const isFormula = target.value === "formula";
      const formulaInput = row && row.querySelector('[data-role="formula"]');
      if (formulaInput) formulaInput.disabled = !isFormula;
      const lookbackInput = row && row.querySelector('[data-role="lookbackDays"]');
      if (lookbackInput) lookbackInput.disabled = isFormula;
      const waveInput = row && row.querySelector('[data-role="waveThreshold"]');
      if (waveInput) waveInput.disabled = target.value !== "drawdownFromWaveHigh" && target.value !== "riseFromWaveLow" && target.value !== "daysSinceNewWaveLow" && target.value !== "daysSinceNewWaveHigh";
    }
    if (target && target.dataset && target.dataset.role === "action-type") {
      const actionRow = target.closest(".block-rule-action-row");
      const valueInput = actionRow && actionRow.querySelector('[data-role="action-value"]');
      if (valueInput) valueInput.disabled = target.value === "exitAll";
    }
    syncBlockRuleFormToEditor();
  });
  blockRuleFormEditor.addEventListener("click", (event) => {
    if (blockRuleFormReadonly) return;
    const target = event.target;
    if (editingRuleFormMode === "wave") {
      const removeRule = target.closest(".wave-remove-rule");
      if (removeRule) {
        const state = collectWaveRuleFormState();
        const side = removeRule.dataset.side;
        const index = Number(removeRule.dataset.index);
        state[side].splice(index, 1);
        renderWaveRuleFormEditor(state);
        return;
      }
      if (target.closest("#addWaveBuyRuleButton")) {
        const state = collectWaveRuleFormState();
        state.buyRules.push({ enabled: true, drop: 5, target: 50 });
        renderWaveRuleFormEditor(state);
        return;
      }
      if (target.closest("#addWaveSellRuleButton")) {
        const state = collectWaveRuleFormState();
        state.sellRules.push({ enabled: true, rise: 10, reduce: 50 });
        renderWaveRuleFormEditor(state);
        return;
      }
      return;
    }
    if (editingRuleFormMode === "flat") return;
    const addCondition = target.closest(".block-rule-add-condition");
    if (addCondition) {
      const side = addCondition.dataset.side;
      const blockIndex = Number(addCondition.dataset.blockIndex);
      blockRuleFormState = collectBlockRuleFormState();
      blockRuleFormState[side][blockIndex].conditions.push(createEmptyBlockCondition());
      renderBlockRuleFormEditor();
      return;
    }
    const removeCondition = target.closest(".block-rule-remove-condition");
    if (removeCondition) {
      const side = removeCondition.dataset.side;
      const blockIndex = Number(removeCondition.dataset.blockIndex);
      const conditionIndex = Number(removeCondition.dataset.conditionIndex);
      blockRuleFormState = collectBlockRuleFormState();
      blockRuleFormState[side][blockIndex].conditions.splice(conditionIndex, 1);
      renderBlockRuleFormEditor();
      return;
    }
    const removeBlock = target.closest(".block-rule-remove-block");
    if (removeBlock) {
      const side = removeBlock.dataset.side;
      const blockIndex = Number(removeBlock.dataset.blockIndex);
      blockRuleFormState = collectBlockRuleFormState();
      blockRuleFormState[side].splice(blockIndex, 1);
      renderBlockRuleFormEditor();
      return;
    }
    if (target.closest("#addBuyBlockRuleButton")) {
      blockRuleFormState = collectBlockRuleFormState();
      blockRuleFormState.buyBlockRules.push(createEmptyBlockRule());
      renderBlockRuleFormEditor();
      return;
    }
    if (target.closest("#addSellBlockRuleButton")) {
      blockRuleFormState = collectBlockRuleFormState();
      blockRuleFormState.sellBlockRules.push(createEmptyBlockRule());
      renderBlockRuleFormEditor();
      return;
    }
  });
}

if (refreshBlockRuleFormButton) {
  refreshBlockRuleFormButton.addEventListener("click", () => {
    refreshBlockRuleFormFromJson();
  });
}

function openPresetParamEditor(presetName, options = {}) {
  const preset = options.preset || strategyPresets[presetName];
  if (!preset || !presetParamDialog || !presetParamEditor) return;
  const canEdit = isOwnedEditablePreset(presetName);
  const readonly = Boolean(options.readonly || (preset.meta && preset.meta.isPublic && !canEdit));
  editingPresetName = readonly ? null : presetName;
  if (presetParamTitle) presetParamTitle.textContent = options.title || "编辑预设模型";
  if (presetParamSubtitle) presetParamSubtitle.textContent = options.subtitle || (readonly
    ? "这是 public 预设，只能查看；可以在历史模拟结果里优化参数并保存成自己的模型。"
    : (canEdit
      ? "这个账户预设会保存到服务器端。"
      : "这是内置预设，保存时会创建一个账户副本。"));
  if (presetParamNameInput) presetParamNameInput.value = preset.label || presetName;
  if (presetParamNameInput) presetParamNameInput.disabled = readonly;
  const originalText = preset.meta && preset.meta.originalText ? preset.meta.originalText : "";
  const modelText = preset.meta && preset.meta.modelText ? preset.meta.modelText : originalText;
  if (presetOriginalText) presetOriginalText.value = originalText || "这个模型没有保存最初文字版本。";
  if (presetOriginalText) presetOriginalText.disabled = readonly;
  if (presetModelText) {
    presetModelText.value = modelText;
    presetModelText.disabled = readonly || !canEdit;
  }
  renderPresetParamNarrativeFromPreset(preset, options.config || buildConfigFromPresetObject(preset, readBacktestConfig()));
  const editorPreset = readonly && options.config
    ? stripPresetDisplayFields(options.config)
    : getSerializablePreset(preset);
  presetParamEditor.value = JSON.stringify(editorPreset, null, 2);
  presetParamEditor.disabled = readonly;
  if (savePresetParamButton) {
    savePresetParamButton.classList.toggle("hidden", readonly);
    savePresetParamButton.disabled = readonly;
  }
  // Any read-only param view (查看参数, wherever it was opened from — admin lists, ranking
  // snapshots, public presets you can't edit) gets "另存为模型" as its save path instead of
  // just having no save option at all, since 保存参数 above only ever updates an owned,
  // editable preset in place.
  if (saveAsNewPresetButton) {
    saveAsNewPresetButton.classList.toggle("hidden", !readonly);
  }
  presetParamViewerSaveSource = readonly ? {
    config: editorPreset,
    targetSymbol: (preset.meta && preset.meta.targetSymbol) || normalizeSymbolInput(codeInput.value) || "通用",
    defaultLabel: options.saveDefaultLabel || preset.label || presetName || "模型",
    originalText: (preset.meta && (preset.meta.originalText || preset.meta.modelText)) || "",
    originalModelId: presetName || (preset.meta && preset.meta.originalModelId) || "0",
    originalModelLabel: (preset.meta && preset.meta.originalModelLabel) || preset.label || "",
    originalModelNumericId: preset.meta && preset.meta.originalModelNumericId !== undefined ? preset.meta.originalModelNumericId : null,
  } : null;
  const strategyTypeForForm = preset.strategyType || "wave";
  const isBlockRules = strategyTypeForForm === "block-rules";
  const isWave = strategyTypeForForm === "wave";
  const flatTypeConfig = OPTIMIZATION_TYPE_CONFIG[strategyTypeForForm];
  const hasForm = isBlockRules || isWave || Boolean(flatTypeConfig);
  blockRuleFormReadonly = readonly;
  editingRuleFormMode = isBlockRules ? "block-rules" : isWave ? "wave" : flatTypeConfig ? "flat" : null;
  editingRuleFormStrategyType = strategyTypeForForm;
  if (blockRuleFormEditor) {
    if (isBlockRules) {
      blockRuleFormState = {
        buyBlockRules: cloneRuleBlocks(editorPreset.buyBlockRules, defaultBuyBlockRules),
        sellBlockRules: cloneRuleBlocks(editorPreset.sellBlockRules, defaultSellBlockRules),
      };
      blockRuleFormEditor.classList.remove("hidden");
      renderBlockRuleFormEditor();
    } else if (isWave) {
      blockRuleFormEditor.classList.remove("hidden");
      renderWaveRuleFormEditor({
        waveThreshold: Math.max(0.1, Number(editorPreset.waveThreshold) || 5),
        buyRules: cloneRules(editorPreset.buyRules, defaultBuyRules),
        sellRules: cloneRules(editorPreset.sellRules, defaultSellRules),
        noNewHighExitRule: {
          ...defaultNoNewHighExitRule,
          ...(editorPreset.noNewHighExitRule || {}),
          enabled: Boolean(editorPreset.noNewHighExitRule && editorPreset.noNewHighExitRule.enabled),
        },
      });
    } else if (flatTypeConfig) {
      blockRuleFormEditor.classList.remove("hidden");
      const rule = { ...flatTypeConfig.defaultRule, ...(editorPreset[flatTypeConfig.ruleKey] || {}) };
      renderFlatRuleFormEditor(strategyTypeForForm, rule);
    } else {
      blockRuleFormEditor.classList.add("hidden");
      blockRuleFormEditor.innerHTML = "";
      blockRuleFormState = null;
    }
  }
  if (blockRuleFormActions) blockRuleFormActions.classList.toggle("hidden", !hasForm || readonly);
  if (presetParamEditorHint) presetParamEditorHint.classList.toggle("hidden", !hasForm);
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
  const existingOriginalText = String(existing && existing.meta && existing.meta.originalText || "");
  const nextModelText = String(presetModelText && !presetModelText.disabled ? presetModelText.value : existing && existing.meta && existing.meta.modelText || existingOriginalText || "").slice(0, 8000);
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
      originalText: existingOriginalText || String(parsed.meta && parsed.meta.originalText || "").slice(0, 8000),
      modelText: nextModelText || String(parsed.meta && parsed.meta.modelText || "").slice(0, 8000),
      updatedAt: now,
    },
  });
  if (!nextPreset) {
    setStatus("参数内容无效，无法保存。", true);
    return;
  }

  let savedName = editingPresetName;
  if (isOwnedEditablePreset(editingPresetName)) {
    strategyPresets[editingPresetName] = nextPreset;
  } else {
    savedName = `custom_${Date.now()}`;
    const userRenamedPreset = nextPreset.label !== existingLabel;
    const copiedLabel = userRenamedPreset ? nextPreset.label : `${nextPreset.label} 本地修改`;
    strategyPresets[savedName] = {
      ...nextPreset,
      // Forking someone else's (or a public/legacy) preset must save as a genuinely new row —
      // explicitly drop the source preset's id so the server can't mistake this for an edit of
      // that original row (it also falls through safely server-side even without this, since
      // upsertPreset's ownership check on the id would reject the mismatch, but being explicit
      // here means "this is a new save" is clear at the call site, not just an emergent
      // property of the ownership guard).
      id: undefined,
      label: copiedLabel,
      meta: {
        ...nextPreset.meta,
        createdAt: now,
        updatedAt: now,
        isOwner: true,
        isPublic: false,
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
  if (/没有.{0,8}新低|未.{0,8}新低|不.{0,8}新低|没有.{0,8}新高|未.{0,8}新高|不.{0,8}新高/.test(text)) return "stagnation-reversal";
  if (/PE|pe|市盈率|估值|成交量|放量|缩量/.test(text)) return "pe-volume";
  if (/订单|单子|每笔|每单|网格/.test(text)) return "order-grid";
  if (/RSI|rsi|均线|MA|ma|ATR|atr/.test(text)) return "ma-rsi-band";
  if (/近端|最近\d*天.*高点|阶梯/.test(text)) return "local-high-ladder";
  return "wave";
}

async function requestAiModelPatch(description) {
  const response = await fetch("/api/generate-model", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description,
      symbol: normalizeSymbolInput(codeInput.value) || "通用",
      label: String(customModelLabelInput && customModelLabelInput.value || "").trim(),
    }),
  });
  const payload = await readJsonResponse(response, "AI 模型生成失败。");
  return payload.model && typeof payload.model === "object" ? payload.model : null;
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
    stagnationReversalRule: {
      ...defaultStagnationReversalRule,
      ...(config.stagnationReversalRule || {}),
    },
    buyBlockRules: cloneRuleBlocks(config.buyBlockRules, defaultBuyBlockRules),
    sellBlockRules: cloneRuleBlocks(config.sellBlockRules, defaultSellBlockRules),
    scoreRules: cloneScoreRules(config.scoreRules, defaultScoreRules),
    positionBands: clonePositionBands(config.positionBands, defaultPositionBands),
    meta,
  };
}

// aiPatch.uncoveredRequirements lists parts of the user's own description the AI could not
// confidently turn into a rule (see model-generator.js's prompt instruction on this field) —
// appended right after "AI 理解" instead of only being visible by diffing the raw JSON, since
// a silently-dropped requirement is easy to miss otherwise.
function buildAiModelText(text, aiPatch) {
  if (!aiPatch) return text;
  const parts = [text];
  if (aiPatch.reason) parts.push(`AI 理解：${aiPatch.reason}`);
  if (Array.isArray(aiPatch.uncoveredRequirements) && aiPatch.uncoveredRequirements.length > 0) {
    parts.push(`⚠ AI 未能表达的部分：${aiPatch.uncoveredRequirements.join("；")}`);
  }
  return parts.join("\n\n");
}

function createSafePresetDraft(description, aiPatch = null) {
  const text = String(description || "").trim();
  const strategyType = aiPatch && supportedStrategyTypes.includes(aiPatch.strategyType)
    ? aiPatch.strategyType
    : inferStrategyTypeFromText(text);
  const symbol = normalizeSymbolInput(codeInput.value) || "通用";
  const now = todayText();
  const creator = String(customModelCreatorInput && customModelCreatorInput.value || "user").trim().slice(0, 32) || "user";
  const label = String(customModelLabelInput && customModelLabelInput.value || "").trim()
    || String(aiPatch && aiPatch.label || "").trim().slice(0, 60)
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

  if (strategyType === "stagnation-reversal") {
    const buyDays = numberNear(text, [
      /(\d+)\s*(?:天|日).{0,16}(?:没有|未|不).{0,8}新低/,
      /(?:没有|未|不).{0,8}新低.{0,16}(\d+)\s*(?:天|日)/,
    ], defaultStagnationReversalRule.buyStalledDays);
    const sellDays = numberNear(text, [
      /(\d+)\s*(?:天|日).{0,16}(?:没有|未|不).{0,8}新高/,
      /(?:没有|未|不).{0,8}新高.{0,16}(\d+)\s*(?:天|日)/,
    ], defaultStagnationReversalRule.sellStalledDays);
    const buyTarget = numberNear(text, [/买入\s*(\d+(?:\.\d+)?)\s*%/, /建仓\s*(\d+(?:\.\d+)?)\s*%/], defaultStagnationReversalRule.buyTarget);
    const sellReduce = numberNear(text, [/卖出\s*(\d+(?:\.\d+)?)\s*%/, /平仓\s*(\d+(?:\.\d+)?)\s*%/, /减仓\s*(\d+(?:\.\d+)?)\s*%/], defaultStagnationReversalRule.sellReduce);
    config.stagnationReversalRule = readStagnationReversalRule({
      ...defaultStagnationReversalRule,
      buyLookbackDays: buyDays,
      buyStalledDays: buyDays,
      buyTarget,
      sellLookbackDays: sellDays,
      sellStalledDays: sellDays,
      sellReduce,
      ...(aiPatch && aiPatch.stagnationReversalRule || {}),
    });
  } else if (strategyType === "order-grid") {
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

  if (aiPatch && typeof aiPatch === "object") {
    if (Number.isFinite(Number(aiPatch.waveThreshold))) {
      config.waveThreshold = Math.max(0.1, Number(aiPatch.waveThreshold));
    }
    if (Array.isArray(aiPatch.buyRules) && aiPatch.buyRules.length > 0) {
      config.buyRules = cloneRules(aiPatch.buyRules, []).filter((rule) => rule.enabled !== false);
    }
    if (Array.isArray(aiPatch.sellRules) && aiPatch.sellRules.length > 0) {
      config.sellRules = cloneRules(aiPatch.sellRules, []).filter((rule) => rule.enabled !== false);
    }
    if (aiPatch.noNewHighExitRule && typeof aiPatch.noNewHighExitRule === "object") {
      config.noNewHighExitRule = {
        ...defaultNoNewHighExitRule,
        ...aiPatch.noNewHighExitRule,
        enabled: Boolean(aiPatch.noNewHighExitRule.enabled),
      };
    }
    if (aiPatch.localLadderRule && strategyType === "local-high-ladder") {
      config.localLadderRule = { ...defaultLocalLadderRule, ...aiPatch.localLadderRule };
    }
    if (aiPatch.maRsiBandRule && strategyType === "ma-rsi-band") {
      config.maRsiBandRule = { ...defaultMaRsiBandRule, ...aiPatch.maRsiBandRule };
    }
    if (aiPatch.orderGridRule && strategyType === "order-grid") {
      config.orderGridRule = { ...defaultOrderGridRule, ...aiPatch.orderGridRule };
    }
    if (aiPatch.peVolumeRule && strategyType === "pe-volume") {
      config.peVolumeRule = { ...defaultPeVolumeRule, ...aiPatch.peVolumeRule };
    }
    if (aiPatch.stagnationReversalRule && strategyType === "stagnation-reversal") {
      config.stagnationReversalRule = readStagnationReversalRule({
        ...defaultStagnationReversalRule,
        ...aiPatch.stagnationReversalRule,
      });
    }
    if (strategyType === "block-rules") {
      config.buyBlockRules = cloneRuleBlocks(aiPatch.buyBlockRules, defaultBuyBlockRules);
      config.sellBlockRules = cloneRuleBlocks(aiPatch.sellBlockRules, defaultSellBlockRules);
    }
    if (strategyType === "score-rules") {
      config.scoreRules = cloneScoreRules(aiPatch.scoreRules, defaultScoreRules);
      config.positionBands = clonePositionBands(aiPatch.positionBands, defaultPositionBands);
    }
  }

  const meta = {
    targetSymbol: symbol,
    provedPeriod: activeBacktestRangeLabel || `${startInput.value || "?"}至${endInput.value || "?"}`,
    creator,
    createdAt: now,
    updatedAt: now,
    originalText: text,
    modelText: buildAiModelText(text, aiPatch),
    originalModelId: "0",
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
  const safePreset = sanitizeStoredPreset(presetName, preset);
  if (!safePreset) {
    setStatus("模型内容无效，无法保存。", true);
    return null;
  }
  safePreset.meta.isOwner = true;
  safePreset.meta.isPublic = false;
  strategyPresets[presetName] = safePreset;
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

const DEFAULT_OPTIMIZATION_POINT_COUNT = 5;
const MAX_OPTIMIZATION_POINT_COUNT = 200;
const MAX_OPTIMIZATION_COMBINATIONS = 10000;

function computeDefaultParamRange(value, isInteger, isPercent) {
  if (isPercent) {
    return { min: 1, max: 100, pointCount: DEFAULT_OPTIMIZATION_POINT_COUNT };
  }
  const current = Number(value) || 0;
  const min = 1;
  let max = (current - min) * 3;
  if (isInteger) {
    max = Math.max(min + 1, Math.round(max));
  } else {
    max = Math.round(max * 100) / 100;
  }
  return { min, max, pointCount: DEFAULT_OPTIMIZATION_POINT_COUNT };
}

const CONDITION_FIELD_LABELS = {
  lookbackDays: "回看天数",
  slopeWindowDays: "斜率窗口天数",
  sustainedDays: "持续天数",
  value: "阈值",
  waveThreshold: "波浪确认阈值%",
};
const CONDITION_INTEGER_FIELDS = new Set(["lookbackDays", "slopeWindowDays", "sustainedDays"]);
// These indicators are inherently day-counts, so their comparison threshold (the
// "value" field) only ever makes sense as a whole number too — e.g. "未创新低天数
// >= 0.667" is meaningless, since a day count can't be a fraction of a day.
const CONDITION_DAY_COUNT_INDICATORS = new Set(["daysSinceNewHigh", "daysSinceNewLow", "daysSinceNewWaveLow", "daysSinceNewWaveHigh", "upDayCount", "downDayCount"]);
const CONDITION_PERCENT_INDICATORS = new Set(["drawdownFromHigh", "drawdownFromWaveHigh", "drawdownFromBreakoutHigh", "riseFromLow", "riseFromWaveLow", "maValue", "maSlope", "maCompare", "candleBody", "positionRatio"]);
const CONDITION_STREAK_COMPARATORS = new Set(["risingStreak", "fallingStreak"]);

// Shared by discoverBlockRuleParameters and discoverScoreRuleParameters — walking a
// condition list's numeric fields into optimization descriptors doesn't depend on what
// the enclosing rule/block does with the conditions once they're true.
function pushConditionParamDescriptors(descriptors, conditions, condLabelPrefix, pathPrefix) {
  (Array.isArray(conditions) ? conditions : []).forEach((condition, conditionIndex) => {
    const condLabel = `${condLabelPrefix}·条件${conditionIndex + 1}`;
    ["lookbackDays", "slopeWindowDays", "sustainedDays", "value", "waveThreshold"].forEach((field) => {
      const raw = condition[field];
      if (raw === null || raw === undefined || raw === "") return;
      const current = Number(raw);
      if (!Number.isFinite(current)) return;
      // risingStreak/fallingStreak repurpose "value" as a day count (see
      // blockRuleComparators comment), never a threshold — always integer, never percent.
      const isStreakDayCount = field === "value" && CONDITION_STREAK_COMPARATORS.has(condition.comparator);
      const isInteger = CONDITION_INTEGER_FIELDS.has(field) || isStreakDayCount || (field === "value" && CONDITION_DAY_COUNT_INDICATORS.has(condition.indicator));
      const isPercent = !isStreakDayCount && field === "value" && CONDITION_PERCENT_INDICATORS.has(condition.indicator);
      // Bounded range instead of the generic {1,100} percent range or the generic
      // value-scaled range — see engine.js's pushConditionParamDescriptors for the same logic.
      // daysSinceNewWaveLow/daysSinceNewWaveHigh's value is a day count, not a %, so it can't
      // use it as a ceiling either — falls back to the flat 30 ceiling unconditionally.
      const isDayCountWaveIndicator = condition.indicator === "daysSinceNewWaveLow" || condition.indicator === "daysSinceNewWaveHigh";
      const waveThresholdCeiling = !isDayCountWaveIndicator && Number(condition.value) > 0
        ? Number(condition.value)
        : 30;
      const range = field === "waveThreshold"
        ? { min: 1, max: waveThresholdCeiling, pointCount: DEFAULT_OPTIMIZATION_POINT_COUNT }
        : computeDefaultParamRange(current, isInteger, isPercent);
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

function renderOptimizationParamRanges(descriptors) {
  if (!optimizationParamRanges) return;
  if (!descriptors || descriptors.length === 0) {
    optimizationParamRanges.innerHTML = `<div class="ranking-empty">这个模型没有可调整的数值参数，将只测试当前参数。</div>`;
    return;
  }
  const header = `
    <div class="optimization-param-range-row optimization-param-range-header">
      <span></span><span>锁定</span><span>最小值</span><span>最大值</span><span>候选点数</span>
    </div>
  `;
  optimizationParamRanges.innerHTML = header + descriptors.map((descriptor, index) => {
    const inputStep = descriptor.isInteger ? "1" : "any";
    const inputMin = descriptor.isInteger ? "1" : "";
    const locked = Boolean(descriptor.locked);
    return `
    <div class="optimization-param-range-row" data-param-index="${index}">
      <label>${escapeHtml(descriptor.label)}（当前 ${descriptor.currentValue}）</label>
      <label class="optimization-param-lock"><input type="checkbox" data-role="locked" ${locked ? "checked" : ""}> 锁定</label>
      <input type="number" step="${inputStep}" min="${inputMin}" data-role="min" value="${descriptor.min}" aria-label="最小值" ${locked ? "disabled" : ""}>
      <input type="number" step="${inputStep}" min="${inputMin}" data-role="max" value="${descriptor.max}" aria-label="最大值" ${locked ? "disabled" : ""}>
      <input type="number" step="1" min="2" max="${MAX_OPTIMIZATION_POINT_COUNT}" data-role="pointCount" value="${descriptor.pointCount}" aria-label="候选点数" ${locked ? "disabled" : ""}>
    </div>
  `;
  }).join("");
}

function formatCombinationCount(n) {
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n <= 1e6) return Math.round(n).toLocaleString();
  return n.toExponential(2);
}

function refreshOptimizationCombinationSummary() {
  if (!optimizationCombinationCount || !blockRuleOptimizationState || !blockRuleOptimizationState.descriptors) return;
  const liveDescriptors = readOptimizationParamRanges(blockRuleOptimizationState.descriptors);
  const total = liveDescriptors.reduce((acc, d) => acc * Math.max(1, buildRangeValues(d).length), 1);
  optimizationCombinationCount.textContent = formatCombinationCount(total);
}

if (optimizationParamRanges) {
  optimizationParamRanges.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.dataset && target.dataset.role === "locked") {
      const row = target.closest(".optimization-param-range-row");
      if (row) {
        ["min", "max", "pointCount"].forEach((role) => {
          const input = row.querySelector(`[data-role="${role}"]`);
          if (input) input.disabled = target.checked;
        });
      }
    }
    refreshOptimizationCombinationSummary();
  });
  optimizationParamRanges.addEventListener("input", () => {
    refreshOptimizationCombinationSummary();
  });
}

if (applyUniformPointCountButton) {
  applyUniformPointCountButton.addEventListener("click", () => {
    if (!optimizationParamRanges || !optimizationUniformPointCountInput) return;
    const value = Math.min(
      MAX_OPTIMIZATION_POINT_COUNT,
      Math.max(2, Math.round(Number(optimizationUniformPointCountInput.value)) || DEFAULT_OPTIMIZATION_POINT_COUNT)
    );
    optimizationParamRanges.querySelectorAll(".optimization-param-range-row[data-param-index]").forEach((row) => {
      const lockedInput = row.querySelector('[data-role="locked"]');
      if (lockedInput && lockedInput.checked) return;
      const pointCountInput = row.querySelector('[data-role="pointCount"]');
      if (pointCountInput) pointCountInput.value = value;
    });
    refreshOptimizationCombinationSummary();
  });
}

function readOptimizationParamRanges(descriptors) {
  if (!optimizationParamRanges || !descriptors) return descriptors;
  return descriptors.map((descriptor, index) => {
    const row = optimizationParamRanges.querySelector(`[data-param-index="${index}"]`);
    if (!row) return descriptor;
    const lockedInput = row.querySelector('[data-role="locked"]');
    const locked = Boolean(lockedInput && lockedInput.checked);
    let min = Number(row.querySelector('[data-role="min"]').value);
    let max = Number(row.querySelector('[data-role="max"]').value);
    let pointCount = Number(row.querySelector('[data-role="pointCount"]').value);
    min = Number.isFinite(min) ? min : descriptor.min;
    max = Number.isFinite(max) ? max : descriptor.max;
    pointCount = Number.isFinite(pointCount) && pointCount >= 2 ? Math.round(pointCount) : descriptor.pointCount;
    if (descriptor.isInteger) {
      min = Math.max(1, Math.round(min));
      max = Math.max(min, Math.round(max));
    }
    return { ...descriptor, min, max, pointCount, locked };
  });
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

function buildOptimizationCandidates(basePreset, strategyType, paramDescriptors, maxCombinations) {
  const combinationCap = Math.max(1, Math.round(Number(maxCombinations)) || MAX_OPTIMIZATION_COMBINATIONS);
  const base = {
    ...readBacktestConfig(),
    strategyType,
  };
  const candidates = [];
  const push = (config) => candidates.push(config);
  const sourcePreset = strategyPresets[basePreset] || {};

  if (Array.isArray(paramDescriptors)) {
    const descriptors = paramDescriptors;
    const buildConfigForCombo = (combo) => buildConfigFromDescriptorCombo(base, sourcePreset, strategyType, descriptors, combo);
    if (descriptors.length === 0) {
      push(buildConfigForCombo([]));
    } else {
      const valueLists = descriptors.map((descriptor) => buildRangeValues(descriptor));
      const totalCombinations = valueLists.reduce((acc, list) => acc * Math.max(1, list.length), 1);
      if (totalCombinations <= combinationCap) {
        let combos = [[]];
        valueLists.forEach((values) => {
          const next = [];
          combos.forEach((combo) => {
            values.forEach((value) => next.push([...combo, value]));
          });
          combos = next;
        });
        combos.forEach((combo) => push(buildConfigForCombo(combo)));
      } else {
        for (let i = 0; i < combinationCap; i += 1) {
          const combo = valueLists.map((values) => values[Math.floor(Math.random() * values.length)]);
          push(buildConfigForCombo(combo));
        }
      }
    }
  } else if (strategyType === "order-grid") {
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
  } else if (strategyType === "stagnation-reversal") {
    [3, 5, 8, 10].forEach((buyStalledDays) => {
      [3, 5, 8, 10].forEach((sellStalledDays) => {
        [40, 70, 100].forEach((buyTarget) => {
          [50, 100].forEach((sellReduce) => {
            push({
              ...base,
              stagnationReversalRule: {
                ...defaultStagnationReversalRule,
                buyLookbackDays: buyStalledDays,
                buyStalledDays,
                buyTarget,
                sellLookbackDays: sellStalledDays,
                sellStalledDays,
                sellReduce,
              },
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
  // Inherit the ROOT ancestor's id (not presetName itself, unless presetName IS the root)
  // so a multi-generation chain of optimize-and-save always collapses back to one origin.
  const sourceOriginalModelId = sourcePreset.meta && sourcePreset.meta.originalModelId;
  const originalModelId = sourceOriginalModelId && sourceOriginalModelId !== "0" ? sourceOriginalModelId : presetName;
  return createPresetFromConfig(`${sourcePreset.label || getStrategyTypeLabel(config.strategyType)} 优化参数`, config, {
    targetSymbol: normalizeSymbolInput(codeInput.value) || "通用",
    provedPeriod: activeBacktestRangeLabel || `${rowsForTest[0].date}至${rowsForTest[rowsForTest.length - 1].date}`,
    creator: "auto",
    createdAt: now,
    updatedAt: now,
    originalText: sourcePreset.meta && sourcePreset.meta.originalText || "",
    modelText: sourcePreset.meta && sourcePreset.meta.modelText || sourcePreset.meta && sourcePreset.meta.originalText || "",
    originalModelId,
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
      "每次买入不是买固定金额，而是把账户总仓位调整到该规则指定的目标仓位。",
      buyRules.length > 1
        ? "同一天如果回撤幅度同时满足多条买入规则，只按其中回撤幅度最大的那一条调仓，不会把几条规则依次都执行一遍。"
        : ""
    ].filter(Boolean),
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

function describeStagnationReversalConfig(config) {
  const rule = readStagnationReversalRule(config.stagnationReversalRule || defaultStagnationReversalRule);
  return {
    title: "停滞反转模型",
    build: [
      `每天比较当日最低价和此前 ${rule.buyLookbackDays} 个交易日的最低点。`,
      `当连续 ${rule.buyStalledDays} 个交易日没有跌破这个观察低点，认为下跌停滞，目标仓位调整到 ${formatPercent(rule.buyTarget)}。`,
      "买入记录会保存触发日价格，以及用于确认未创新低的观察低点价格和日期。"
    ],
    exit: [
      `持仓后比较当日最高价和此前 ${rule.sellLookbackDays} 个交易日的最高点。`,
      `当连续 ${rule.sellStalledDays} 个交易日没有突破这个观察高点，认为上涨停滞，卖出 ${formatPercent(rule.sellReduce)}。`,
      "卖出记录会保存触发日价格，以及用于确认未创新高的观察高点价格和日期。"
    ],
  };
}

function describeGenericConfig(config) {
  const buyBlockRules = Array.isArray(config.buyBlockRules) ? config.buyBlockRules : defaultBuyBlockRules;
  const sellBlockRules = Array.isArray(config.sellBlockRules) ? config.sellBlockRules : defaultSellBlockRules;
  const buildLines = buyBlockRules
    .filter((block) => block && block.enabled !== false)
    .map((block, index) => `买入规则${index + 1}：${describeBlockConditions(block.conditions)} → ${describeBlockAction(block.action)}`);
  const exitLines = sellBlockRules
    .filter((block) => block && block.enabled !== false)
    .map((block, index) => `卖出规则${index + 1}：${describeBlockConditions(block.conditions)} → ${describeBlockAction(block.action)}`);
  return {
    title: "组合规则模型",
    build: buildLines.length ? buildLines : ["未设置买入规则。"],
    exit: exitLines.length ? exitLines : ["未设置卖出规则。"],
  };
}

function describeScoreRulesConfig(config) {
  const scoreRules = Array.isArray(config.scoreRules) ? config.scoreRules : defaultScoreRules;
  const positionBands = Array.isArray(config.positionBands) ? config.positionBands : defaultPositionBands;
  const ruleLines = scoreRules
    .filter((rule) => rule && rule.enabled !== false)
    .map((rule, index) => `规则${index + 1}：${describeBlockConditions(rule.conditions)} → +${rule.points}分`);
  const sortedBands = [...positionBands].sort((a, b) => Number(b.minScore) - Number(a.minScore));
  const bandLines = sortedBands.map((band) => `总分≥${band.minScore} → 目标仓位${formatPercent(band.targetPercent)}`);
  return {
    title: "打分模型",
    build: ruleLines.length ? ruleLines : ["未设置打分规则。"],
    exit: bandLines.length ? bandLines : ["未设置仓位档位，默认空仓。"],
  };
}

function describeOptimizationConfig(config) {
  const strategyType = config.strategyType || "wave";
  if (strategyType === "local-high-ladder") return describeLocalLadderConfig(config);
  if (strategyType === "ma-rsi-band") return describeMaRsiBandConfig(config);
  if (strategyType === "order-grid") return describeOrderGridConfig(config);
  if (strategyType === "pe-volume") return describePeVolumeConfig(config);
  if (strategyType === "stagnation-reversal") return describeStagnationReversalConfig(config);
  if (strategyType === "block-rules") return describeGenericConfig(config);
  if (strategyType === "score-rules") return describeScoreRulesConfig(config);
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

function renderPresetParamNarrativeFromPreset(preset, config) {
  if (!presetParamNarrative) return;
  if (!preset) {
    presetParamNarrative.innerHTML = "";
    return;
  }
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

function renderPresetParamNarrative(presetName) {
  const preset = strategyPresets[presetName];
  const config = preset ? createConfigFromPreset(presetName, readBacktestConfig()) : null;
  renderPresetParamNarrativeFromPreset(preset, config);
}

function createPresetFromRankingRecord(record) {
  if (!hasRankingPresetSnapshot(record)) return null;
  const configSnapshot = clonePlainObject(record.presetConfigSnapshot);
  const metaSnapshot = {
    ...(configSnapshot.meta || {}),
    ...clonePlainObject(record.presetMetaSnapshot),
    originalText: record.presetOriginalTextSnapshot || (configSnapshot.meta && configSnapshot.meta.originalText) || "",
    modelText: record.presetModelTextSnapshot || (configSnapshot.meta && configSnapshot.meta.modelText) || record.presetOriginalTextSnapshot || "",
    isOwner: true,
  };
  return sanitizeStoredPreset(record.presetName, {
    ...configSnapshot,
    label: record.presetLabel || configSnapshot.label || record.presetName,
    strategyType: record.strategyType || configSnapshot.strategyType,
    meta: metaSnapshot,
  });
}

function openRankingRecordParamSnapshot(record) {
  const snapshotPreset = createPresetFromRankingRecord(record);
  if (!snapshotPreset) {
    openPresetParamEditor(record && record.presetName);
    return;
  }
  openPresetParamEditor(record.presetName, {
    preset: snapshotPreset,
    config: record.presetConfigSnapshot,
    readonly: true,
    title: "排行参数快照",
    subtitle: "这是生成该排行成绩时使用的参数副本；当前模型之后的修改不会改变这条记录。",
  });
}

function renderSelectedModelDetail(result) {
  if (!selectedModelDetail) return;
  if (!result || !result.finalState) {
    selectedModelDetail.innerHTML = `
      <strong>选择排行榜中的模型查看详情</strong>
      <span>点击交易记录按钮后，会弹出该模型的交易记录、收益对比曲线和下单价格曲线。</span>
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
        <span>年化收益</span>
        <strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(annualizeReturnByTradingDays(state.returnRate, result.states.length))}</strong>
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
  const baseAnnualized = annualizeReturnByTradingDays(baseResult.finalState.returnRate, baseResult.states.length);
  const bestAnnualized = annualizeReturnByTradingDays(bestResult.finalState.returnRate, bestResult.states.length);
  optimizationReport.innerHTML = `
    <article>
      <span>原参数收益 / 回撤</span>
      <strong>${formatPercent(baseResult.finalState.returnRate)} / ${formatPercent(baseResult.finalState.maxDrawdown)}</strong>
      <p>年化收益 ${formatPercent(baseAnnualized)}；交易 ${baseResult.finalState.trades.length} 次；评分 ${baseResult.score.toFixed(2)}</p>
    </article>
    <article>
      <span>最佳参数收益 / 回撤</span>
      <strong>${formatPercent(bestResult.finalState.returnRate)} / ${formatPercent(bestResult.finalState.maxDrawdown)}</strong>
      <p>年化收益 ${formatPercent(bestAnnualized)}；交易 ${bestResult.finalState.trades.length} 次；评分 ${bestResult.score.toFixed(2)}</p>
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
  if (optimizationSaveNameRow) optimizationSaveNameRow.classList.remove("hidden");
  if (optimizationSaveNameInput) optimizationSaveNameInput.value = optimizationPresetDraft.label || "";
  if (optimizationDialog && !optimizationDialog.open) {
    if (typeof optimizationDialog.showModal === "function") {
      optimizationDialog.showModal();
    } else {
      optimizationDialog.setAttribute("open", "open");
    }
  }
}

let blockRuleOptimizationState = null;

function openBlockRuleOptimizationRangeEditor(presetName) {
  if (!requireSignedInForSave()) return;
  const preset = strategyPresets[presetName];
  if (!preset) return;
  const descriptors = discoverOptimizationParameters(preset);
  blockRuleOptimizationState = { presetName, descriptors };
  if (optimizationTitle) optimizationTitle.textContent = `${preset.label || getStrategyTypeLabel(preset.strategyType)} · 设置参数优化范围`;
  if (optimizationSubtitle) optimizationSubtitle.textContent = "确认或修改每个参数的测试范围，然后点击“运行优化”。";
  if (optimizationReport) optimizationReport.innerHTML = "";
  if (optimizationNarrative) optimizationNarrative.innerHTML = "";
  if (optimizationParamPreview) optimizationParamPreview.textContent = "等待运行...";
  if (saveOptimizationButton) saveOptimizationButton.disabled = true;
  if (optimizationSaveNameRow) optimizationSaveNameRow.classList.add("hidden");
  renderOptimizationParamRanges(descriptors);
  if (optimizationParamRanges) optimizationParamRanges.classList.remove("hidden");
  if (runOptimizationButton) runOptimizationButton.classList.remove("hidden");
  if (optimizationProgress) optimizationProgress.classList.add("hidden");
  if (optimizationMaxCombinationsInput) optimizationMaxCombinationsInput.value = MAX_OPTIMIZATION_COMBINATIONS;
  if (optimizationUniformPointCountInput) optimizationUniformPointCountInput.value = DEFAULT_OPTIMIZATION_POINT_COUNT;
  if (optimizationUniformPointCountRow) optimizationUniformPointCountRow.classList.toggle("hidden", descriptors.length === 0);
  if (optimizationCombinationSummary) optimizationCombinationSummary.classList.toggle("hidden", descriptors.length === 0);
  refreshOptimizationCombinationSummary();
  if (optimizationDialog && !optimizationDialog.open) {
    if (typeof optimizationDialog.showModal === "function") {
      optimizationDialog.showModal();
    } else {
      optimizationDialog.setAttribute("open", "open");
    }
  }
}

if (runOptimizationButton) {
  runOptimizationButton.addEventListener("click", () => {
    if (!blockRuleOptimizationState) return;
    const { presetName, descriptors } = blockRuleOptimizationState;
    const editedDescriptors = readOptimizationParamRanges(descriptors);
    const maxCombinations = optimizationMaxCombinationsInput
      ? Math.max(1, Math.round(Number(optimizationMaxCombinationsInput.value)) || MAX_OPTIMIZATION_COMBINATIONS)
      : MAX_OPTIMIZATION_COMBINATIONS;
    if (optimizationParamRanges) optimizationParamRanges.classList.add("hidden");
    if (optimizationUniformPointCountRow) optimizationUniformPointCountRow.classList.add("hidden");
    if (optimizationCombinationSummary) optimizationCombinationSummary.classList.add("hidden");
    runOptimizationButton.classList.add("hidden");
    blockRuleOptimizationState = null;
    optimizePresetParameters(presetName, editedDescriptors, maxCombinations);
  });
}

function setOptimizationProgress(done, total) {
  if (!optimizationProgress) return;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  if (optimizationProgressBar) optimizationProgressBar.style.width = `${percent}%`;
  if (optimizationProgressLabel) optimizationProgressLabel.textContent = `${percent}%（${done}/${total}）`;
}

function openOptimizationDialog(message) {
  if (optimizationReport) optimizationReport.innerHTML = `<div class="ranking-empty">${escapeHtml(message)}</div>`;
  if (optimizationNarrative) optimizationNarrative.innerHTML = "";
  if (optimizationParamPreview) optimizationParamPreview.textContent = "优化进行中...";
  if (saveOptimizationButton) saveOptimizationButton.disabled = true;
  if (optimizationSaveNameRow) optimizationSaveNameRow.classList.add("hidden");
  if (optimizationTitle) optimizationTitle.textContent = "参数优化中";
  if (optimizationSubtitle) optimizationSubtitle.textContent = message;
  if (optimizationProgress) optimizationProgress.classList.remove("hidden");
  setOptimizationProgress(0, 0);
  if (optimizationDialog && !optimizationDialog.open) {
    if (typeof optimizationDialog.showModal === "function") {
      optimizationDialog.showModal();
    } else {
      optimizationDialog.setAttribute("open", "open");
    }
  }
}

function optimizePresetParameters(presetName, paramDescriptors, maxCombinations) {
  if (!requireSignedInForSave()) return;
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
  const candidates = buildOptimizationCandidates(presetName, strategyType, paramDescriptors, maxCombinations);
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
  const chunkSize = 40;
  const progressUpdateIntervalMs = 150;
  let lastProgressUpdateAt = 0;

  openOptimizationDialog(`正在优化 ${preset.label}，共 ${candidates.length} 组参数。`);
  setStatus(`正在尝试 ${preset.label} 的参数组合...`);

  const runChunk = () => {
    if (runId !== activeOptimizationId) return;
    const end = Math.min(candidates.length, index + chunkSize);
    for (; index < end; index += 1) {
      const config = candidates[index];
      let states;
      try {
        states = buildParallelBacktestStates(rowsForTest, config);
      } catch (error) {
        console.error("跳过一个无法回测的候选参数组合：", error, config);
        continue;
      }
      const finalState = states[states.length - 1];
      if (!finalState) continue;
      const score = scoreBacktestState(finalState);
      const result = { config, states, finalState, score };
      if (index === 0) baseResult = result;
      if (!best || score > best.score) best = result;
    }

    const isDone = index >= candidates.length;
    const now = Date.now();
    if (isDone || now - lastProgressUpdateAt >= progressUpdateIntervalMs) {
      lastProgressUpdateAt = now;
      if (optimizationSubtitle) {
        optimizationSubtitle.textContent = `正在优化 ${preset.label}：${index}/${candidates.length}`;
      }
      setOptimizationProgress(index, candidates.length);
    }

    if (!isDone) {
      window.setTimeout(runChunk, 0);
      return;
    }

    if (optimizationProgress) optimizationProgress.classList.add("hidden");

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

async function saveOptimizationPreset() {
  if (!optimizationPresetDraft) {
    setStatus("没有可保存的优化参数。", true);
    return;
  }
  const enteredLabel = optimizationSaveNameInput ? optimizationSaveNameInput.value.trim().slice(0, 80) : "";
  if (!enteredLabel) {
    setStatus("请输入模型名称。", true);
    return;
  }
  optimizationPresetDraft.label = enteredLabel;
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

function renderModelTradesDetail(result) {
  if (!modelTradesDetail) return;
  if (!result || !result.finalState) {
    modelTradesDetail.innerHTML = "";
    return;
  }
  const html = [];
  const state = result.finalState;
  const preset = result.name !== "__current__" ? strategyPresets[result.name] : null;
  const narrative = describeOptimizationConfig(result.config);
  const presetSummary = preset
    ? summarizePresetParameters(preset)
    : summarizePresetParameters(createPresetFromConfig(result.label, result.config));
  html.push(`
    <div class="selected-model-detail-head">
      <div>
        <span>当前查看模型</span>
        <strong>${escapeHtml(result.label)}</strong>
        <small>${escapeHtml(getStrategyTypeLabel(result.strategyType))} · ${escapeHtml(presetSummary)}</small>
      </div>
      ${preset ? `<button class="selected-model-param-button" type="button" data-preset-name="${escapeHtml(result.name)}">查看参数</button>` : ""}
    </div>
    <div class="selected-model-metrics">
      <article><span>模型收益</span><strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(state.returnRate)}</strong></article>
      <article><span>年化收益</span><strong class="${state.returnRate >= 0 ? "up" : "down"}">${formatPercent(annualizeReturnByTradingDays(state.returnRate, result.states.length))}</strong></article>
      <article><span>最大回撤</span><strong>${formatPercent(state.maxDrawdown)}</strong></article>
      <article><span>全仓收益</span><strong>${formatPercent(state.buyHold.returnRate)}</strong></article>
      <article><span>超额收益</span><strong class="${state.excessReturn >= 0 ? "up" : "down"}">${formatPercent(state.excessReturn)}</strong></article>
      <article><span>交易费用</span><strong>${formatMoney(state.totalFees || 0)}</strong></article>
      <article><span>交易次数</span><strong>${state.trades.length}</strong></article>
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
  `);
  modelTradesDetail.innerHTML = html.join("");
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
  renderModelTradesDetail(result);
  renderTradeLog(withTradeModelLabel(result.finalState.trades || [], result.label), result.label);
  renderTradeDetail(null);
  drawReturnComparison(result.states);
  initModelTradesCharts(result);
  drawTradePriceChart([]);
  if (modelTradesTitle) modelTradesTitle.textContent = `${result.label} 交易记录`;
  if (modelTradesSubtitle) modelTradesSubtitle.textContent = `${activeBacktestRangeLabel || "已完成模拟"}；点击一条交易查看详情和对应价格曲线。`;
  if (resultsDialog && resultsDialog.open) closeDialog(resultsDialog);
  showDialog(modelTradesDialog);
  window.requestAnimationFrame(() => {
    drawReturnComparison(result.states);
    redrawModelTradesChart();
  });
  setStatus(`已切换到 ${result.label}：交易记录已弹出。请选择一条交易查看对应价格、参考高低点和趋势。`);
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
  drawTradePriceChartInto(tradePriceChart, tradePriceZoom, states, options);
}

function drawTradePriceChartInto(target, zoom, states, options = {}) {
  const usableStates = states.filter((state) => state && state.row);
  const rect = target.parentElement
    ? target.parentElement.getBoundingClientRect()
    : target.getBoundingClientRect();
  const viewportWidth = Math.max(720, Math.round(rect.width));
  const width = Math.round(viewportWidth * zoom);
  const height = Math.max(280, Math.round(rect.height));
  const pad = { top: 26, right: 74, bottom: 42, left: 58 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;

  target.style.width = `${width}px`;
  target.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (usableStates.length === 0) {
    target.innerHTML = `
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
  const indicatorType = options.strategyType || (indicatorModelSelect ? indicatorModelSelect.value : "wave");
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

  target.innerHTML = `
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

// 交易记录弹窗自己的一套状态——刻意跟历史模拟主向导那套(currentBlockRules等)分开，不共用
// 同一个全局变量。这里读/改的都是currentModelTradesResult.config的克隆，不是"当前活跃模型"
// 这种容易跟别的操作互相干扰的全局状态——避免重蹈"6.67显示成15"那个bug：那次的根因就是
// 全局状态在多模型对比场景下可能跟你正在看的这一个对不上。
let currentModelTradesResult = null;
// 仅当被查看的模型是block-rules类型时才有值——这个弹窗里的规则编辑器复用的行级渲染函数
// (renderBlockRuleBlock/renderBlockConditionRow/renderBlockActionRow)是block-rules专属的
// 结构（conditions+一次性action），跟"查看参数"编辑器对block-rules的支持范围一致，其它
// strategyType（wave/score-rules等）在这里不提供参数编辑，只显示原始已保存结果的曲线。
let modelTradesRuleFormState = null;

function getModelTradesRows(result) {
  const usableStates = result && result.states ? result.states.filter((state) => state && state.row) : [];
  return usableStates.map((state) => state.row);
}

// 波浪/streak覆盖层和统计文字，两条路径（编辑后的实时预览 / 未编辑的原始已保存结果）共用同一份
// 计算逻辑，只是传进来的config/rows/trades/finalState不一样——避免两边分别维护一套一样的判断。
// finalState给了才会显示收益率；options.comparisonReturnRate给了才会额外显示"已保存原始收益率"
// 用来对比。多个drawdownFromWaveHigh/daysSinceNewLow条件时固定取第一条，跟之前几轮的约定一致
// ——现在规则编辑器本身已经能直接编辑每一条条件，不再需要单独的"选择第几条"下拉框。
function drawModelTradesChartWithOverlays(config, rows, trades, finalState, options = {}) {
  if (!modelOrderPriceChart) return;
  const waveConditions = config
    ? collectWaveConditions({ buyBlockRules: config.buyBlockRules, sellBlockRules: config.sellBlockRules, scoreRules: config.scoreRules })
    : [];
  let wavePoints = [];
  if (waveConditions.length > 0) {
    const threshold = resolveConditionWaveThreshold(waveConditions[0].condition, config.waveThreshold);
    wavePoints = getWaveTurningPoints(rows, threshold);
  }
  if (modelTradesWaveLegend) modelTradesWaveLegend.classList.toggle("hidden", waveConditions.length === 0);

  const streakConditions = config
    ? collectStreakConditions({ buyBlockRules: config.buyBlockRules, sellBlockRules: config.sellBlockRules, scoreRules: config.scoreRules })
    : [];
  const downDayEntry = streakConditions.find((entry) => entry.indicator === "downDayCount");
  const lowEntry = streakConditions.find((entry) => entry.indicator === "daysSinceNewLow");
  let lowReferenceSeries = [];
  if (lowEntry) {
    const lookback = Number(lowEntry.condition.lookbackDays) > 0 ? Number(lowEntry.condition.lookbackDays) : 15;
    lowReferenceSeries = getRollingLowPriceSeries(rows, lookback);
  }
  if (modelTradesLowReferenceLegend) modelTradesLowReferenceLegend.classList.toggle("hidden", !lowEntry);

  drawModelOrderPriceChartInto(modelOrderPriceChart, rows, trades, { wavePoints, lowReferenceSeries, zoom: modelTradesChartZoom });

  if (modelTradesRuleStats) {
    const parts = [];
    if (downDayEntry) {
      const lookback = Number(downDayEntry.condition.lookbackDays) > 0 ? Number(downDayEntry.condition.lookbackDays) : 7;
      const latest = getDownDayCountSeries(rows, lookback).slice(-1)[0];
      parts.push(`最近${lookback}日内下跌天数：${latest === null || latest === undefined ? "--" : `${latest}天`}`);
    }
    if (lowEntry) {
      const lookback = Number(lowEntry.condition.lookbackDays) > 0 ? Number(lowEntry.condition.lookbackDays) : 15;
      const latestLow = getRollingLowPriceSeries(rows, lookback).slice(-1)[0];
      const latestStreak = getDaysSinceNewLowSeries(rows, lookback).slice(-1)[0];
      parts.push(
        `${lookback}日内最低价：${latestLow === null || latestLow === undefined ? "--" : formatPrice(latestLow)} · ` +
        `已连续${latestStreak === null || latestStreak === undefined ? "--" : `${latestStreak}天`}未创新低`
      );
    }
    const buyCount = trades.filter((trade) => trade.side === "buy").length;
    const sellCount = trades.filter((trade) => trade.side === "sell").length;
    let tradeSummary = `买入${buyCount}次 · 卖出${sellCount}次`;
    if (finalState) tradeSummary += ` · 收益率${finalState.returnRate.toFixed(2)}%`;
    if (finalState && options.comparisonReturnRate !== undefined) {
      tradeSummary += `（已保存模型原始收益率${options.comparisonReturnRate.toFixed(2)}%）`;
    }
    parts.push(tradeSummary);
    modelTradesRuleStats.textContent = parts.join(" ｜ ");
  }
}

// 打开/切换一条交易记录时调用一次：block-rules模型才提供参数编辑器（跟"查看参数"编辑器对
// block-rules的支持范围一致），其它strategyType（wave/score-rules等）只显示原始已保存结果，
// 没有编辑入口——那些类型的条件结构跟renderBlockRuleBlock期望的{conditions, action}形状不同。
function initModelTradesCharts(result) {
  currentModelTradesResult = result;
  const rows = getModelTradesRows(result);
  const trades = result.finalState ? withTradeModelLabel(result.finalState.trades || [], result.label) : [];
  if (result.strategyType === "block-rules" && result.config) {
    modelTradesRuleFormState = {
      buyBlockRules: cloneRuleBlocks(result.config.buyBlockRules, defaultBuyBlockRules),
      sellBlockRules: cloneRuleBlocks(result.config.sellBlockRules, defaultSellBlockRules),
    };
    if (modelTradesRuleEditorSection) modelTradesRuleEditorSection.classList.remove("hidden");
    renderModelTradesRuleEditor();
    recomputeModelTradesLivePreview();
  } else {
    modelTradesRuleFormState = null;
    if (modelTradesRuleEditorSection) modelTradesRuleEditorSection.classList.add("hidden");
    if (modelTradesRuleEditor) modelTradesRuleEditor.innerHTML = "";
    drawModelTradesChartWithOverlays(result.config, rows, trades, result.finalState);
  }
}

// resetBacktest()清空整次模拟时调用——清掉这个弹窗自己的状态、把图表画成空的占位提示，
// 跟initModelTradesCharts(result)是一对：那个是"切换到某条具体结果"，这个是"没有结果了"。
function resetModelTradesCharts() {
  currentModelTradesResult = null;
  modelTradesRuleFormState = null;
  if (modelTradesRuleEditorSection) modelTradesRuleEditorSection.classList.add("hidden");
  if (modelTradesRuleEditor) modelTradesRuleEditor.innerHTML = "";
  if (modelTradesRuleStats) modelTradesRuleStats.textContent = "";
  if (modelTradesWaveLegend) modelTradesWaveLegend.classList.add("hidden");
  if (modelTradesLowReferenceLegend) modelTradesLowReferenceLegend.classList.add("hidden");
  drawModelOrderPriceChartInto(modelOrderPriceChart, [], [], {});
}

// 仅用于对话框刚显示出来、SVG容器真实尺寸才第一次可测量时的二次重绘（跟其它图表的
// requestAnimationFrame重绘是同一个原因），不应该重置规则编辑器的状态。
function redrawModelTradesChart() {
  if (!currentModelTradesResult) return;
  if (modelTradesRuleFormState) {
    recomputeModelTradesLivePreview();
    return;
  }
  const rows = getModelTradesRows(currentModelTradesResult);
  const trades = currentModelTradesResult.finalState
    ? withTradeModelLabel(currentModelTradesResult.finalState.trades || [], currentModelTradesResult.label)
    : [];
  drawModelTradesChartWithOverlays(currentModelTradesResult.config, rows, trades, currentModelTradesResult.finalState);
}

// 每次改动规则参数触发：用同一段历史行情（result.states里的row，跟已保存结果完全一致的
// 数据）加上编辑后的buyBlockRules/sellBlockRules重新跑一次纯前端回测，只影响这个弹窗的
// 显示，不写回currentModelTradesResult.config、不联网保存——buildParallelBacktestStates是
// 纯函数（只读rows+config，不改全局状态），可以放心地在每次输入变化时重复调用。
function recomputeModelTradesLivePreview() {
  if (!currentModelTradesResult || !modelTradesRuleFormState) return;
  const baseConfig = currentModelTradesResult.config;
  if (!baseConfig) return;
  const rows = getModelTradesRows(currentModelTradesResult);
  if (rows.length === 0) return;
  const editedConfig = {
    ...baseConfig,
    buyBlockRules: modelTradesRuleFormState.buyBlockRules,
    sellBlockRules: modelTradesRuleFormState.sellBlockRules,
  };
  const liveStates = buildParallelBacktestStates(rows, editedConfig);
  const liveFinalState = liveStates[liveStates.length - 1];
  const liveTrades = liveFinalState ? withTradeModelLabel(liveFinalState.trades || [], currentModelTradesResult.label) : [];
  drawModelTradesChartWithOverlays(editedConfig, rows, liveTrades, liveFinalState, {
    comparisonReturnRate: currentModelTradesResult.finalState ? currentModelTradesResult.finalState.returnRate : undefined,
  });
}

// 跟"查看参数"编辑器(blockRuleFormState/blockRuleFormEditor)故意分开一套独立的收集/渲染/
// 事件绑定，不共用：那一套的语义是"编辑后手动点保存，写回服务器上的preset"；这里是"每次改动
// 都立刻重新回测、刷新预览"，两者对"改动之后要做什么"的反应完全不同，硬凑共用容易把两边的
// 意图搅在一起。复用的是不依赖任何全局状态、纯粹按参数返回HTML字符串的行级渲染函数
// （renderBlockRuleBlock/renderBlockConditionRow/renderBlockActionRow），没有重新发明这部分。
function collectModelTradesRuleFormState() {
  if (!modelTradesRuleEditor) return modelTradesRuleFormState;
  const collectSide = (sideKey) => {
    const blockEls = modelTradesRuleEditor.querySelectorAll(`.block-rule-block[data-side="${sideKey}"]`);
    return Array.from(blockEls).map((blockEl) => {
      const enabled = blockEl.querySelector('[data-role="enabled"]').checked;
      const rowEls = blockEl.querySelectorAll(".block-rule-condition-row");
      const conditions = Array.from(rowEls).map((rowEl) => {
        const indicator = rowEl.querySelector('[data-role="indicator"]').value;
        const comparator = rowEl.querySelector('[data-role="comparator"]').value;
        const value = Number(rowEl.querySelector('[data-role="value"]').value);
        const formulaRaw = rowEl.querySelector('[data-role="formula"]').value;
        const lookbackRaw = rowEl.querySelector('[data-role="lookbackDays"]').value;
        const slopeRaw = rowEl.querySelector('[data-role="slopeWindowDays"]').value;
        const sustainRaw = rowEl.querySelector('[data-role="sustainedDays"]').value;
        const waveThresholdRaw = rowEl.querySelector('[data-role="waveThreshold"]').value;
        return {
          indicator,
          comparator,
          value: Number.isFinite(value) ? value : 0,
          formula: indicator === "formula" ? formulaRaw.trim() : null,
          lookbackDays: indicator === "formula" || lookbackRaw === "" ? null : Math.max(1, Math.round(Number(lookbackRaw) || 1)),
          slopeWindowDays: slopeRaw === "" ? null : Math.max(1, Math.round(Number(slopeRaw) || 1)),
          sustainedDays: sustainRaw === "" ? null : Math.max(1, Math.round(Number(sustainRaw) || 1)),
          waveThreshold: (indicator !== "drawdownFromWaveHigh" && indicator !== "riseFromWaveLow" && indicator !== "daysSinceNewWaveLow" && indicator !== "daysSinceNewWaveHigh") || waveThresholdRaw === "" ? null : Math.max(1, Number(waveThresholdRaw) || 1),
        };
      });
      const actionType = blockEl.querySelector('[data-role="action-type"]').value;
      const actionValueRaw = blockEl.querySelector('[data-role="action-value"]').value;
      const action = actionType === "exitAll"
        ? { type: "exitAll", value: null }
        : { type: actionType, value: actionValueRaw === "" ? 0 : Number(actionValueRaw) };
      return { enabled, conditions, action };
    });
  };
  return {
    buyBlockRules: collectSide("buyBlockRules"),
    sellBlockRules: collectSide("sellBlockRules"),
  };
}

function renderModelTradesRuleEditor() {
  if (!modelTradesRuleEditor || !modelTradesRuleFormState) return;
  const buyBlocks = Array.isArray(modelTradesRuleFormState.buyBlockRules) ? modelTradesRuleFormState.buyBlockRules : [];
  const sellBlocks = Array.isArray(modelTradesRuleFormState.sellBlockRules) ? modelTradesRuleFormState.sellBlockRules : [];
  const buyHtml = buyBlocks.map((b, i) => renderBlockRuleBlock(b, "buyBlockRules", i)).join("") || `<div class="ranking-empty">这个模型没有买入规则块。</div>`;
  const sellHtml = sellBlocks.map((b, i) => renderBlockRuleBlock(b, "sellBlockRules", i)).join("") || `<div class="ranking-empty">这个模型没有卖出规则块。</div>`;
  modelTradesRuleEditor.innerHTML = `
    <div class="block-rule-side">
      <h4>买入规则块（块内条件“且”，块间“或”）</h4>
      <div class="block-rule-list">${buyHtml}</div>
      <button type="button" class="ghost-button model-trades-add-buy-block">+ 添加买入规则块</button>
    </div>
    <div class="block-rule-side">
      <h4>卖出规则块</h4>
      <div class="block-rule-list">${sellHtml}</div>
      <button type="button" class="ghost-button model-trades-add-sell-block">+ 添加卖出规则块</button>
    </div>
  `;
}

if (modelTradesRuleEditor) {
  modelTradesRuleEditor.addEventListener("input", () => {
    modelTradesRuleFormState = collectModelTradesRuleFormState();
    recomputeModelTradesLivePreview();
  });
  modelTradesRuleEditor.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.dataset && target.dataset.role === "indicator") {
      const row = target.closest(".block-rule-condition-row");
      const slopeInput = row && row.querySelector('[data-role="slopeWindowDays"]');
      if (slopeInput) slopeInput.disabled = target.value !== "maSlope";
      const isFormula = target.value === "formula";
      const formulaInput = row && row.querySelector('[data-role="formula"]');
      if (formulaInput) formulaInput.disabled = !isFormula;
      const lookbackInput = row && row.querySelector('[data-role="lookbackDays"]');
      if (lookbackInput) lookbackInput.disabled = isFormula;
      const waveInput = row && row.querySelector('[data-role="waveThreshold"]');
      if (waveInput) waveInput.disabled = target.value !== "drawdownFromWaveHigh" && target.value !== "riseFromWaveLow" && target.value !== "daysSinceNewWaveLow" && target.value !== "daysSinceNewWaveHigh";
    }
    if (target && target.dataset && target.dataset.role === "action-type") {
      const actionRow = target.closest(".block-rule-action-row");
      const valueInput = actionRow && actionRow.querySelector('[data-role="action-value"]');
      if (valueInput) valueInput.disabled = target.value === "exitAll";
    }
    modelTradesRuleFormState = collectModelTradesRuleFormState();
    recomputeModelTradesLivePreview();
  });
  modelTradesRuleEditor.addEventListener("click", (event) => {
    const target = event.target;
    const addCondition = target.closest(".block-rule-add-condition");
    if (addCondition) {
      const side = addCondition.dataset.side;
      const blockIndex = Number(addCondition.dataset.blockIndex);
      modelTradesRuleFormState = collectModelTradesRuleFormState();
      modelTradesRuleFormState[side][blockIndex].conditions.push(createEmptyBlockCondition());
      renderModelTradesRuleEditor();
      recomputeModelTradesLivePreview();
      return;
    }
    const removeCondition = target.closest(".block-rule-remove-condition");
    if (removeCondition) {
      const side = removeCondition.dataset.side;
      const blockIndex = Number(removeCondition.dataset.blockIndex);
      const conditionIndex = Number(removeCondition.dataset.conditionIndex);
      modelTradesRuleFormState = collectModelTradesRuleFormState();
      modelTradesRuleFormState[side][blockIndex].conditions.splice(conditionIndex, 1);
      renderModelTradesRuleEditor();
      recomputeModelTradesLivePreview();
      return;
    }
    const removeBlock = target.closest(".block-rule-remove-block");
    if (removeBlock) {
      const side = removeBlock.dataset.side;
      const blockIndex = Number(removeBlock.dataset.blockIndex);
      modelTradesRuleFormState = collectModelTradesRuleFormState();
      modelTradesRuleFormState[side].splice(blockIndex, 1);
      renderModelTradesRuleEditor();
      recomputeModelTradesLivePreview();
      return;
    }
    if (target.closest(".model-trades-add-buy-block")) {
      modelTradesRuleFormState = collectModelTradesRuleFormState();
      modelTradesRuleFormState.buyBlockRules.push(createEmptyBlockRule());
      renderModelTradesRuleEditor();
      recomputeModelTradesLivePreview();
      return;
    }
    if (target.closest(".model-trades-add-sell-block")) {
      modelTradesRuleFormState = collectModelTradesRuleFormState();
      modelTradesRuleFormState.sellBlockRules.push(createEmptyBlockRule());
      renderModelTradesRuleEditor();
      recomputeModelTradesLivePreview();
      return;
    }
  });
}

// Shared by the main "模型对比" order chart and the admin scan re-run replay: draws a
// full price line with buy/sell trade dots. `options.upToIndex` lets a caller reveal
// the line/markers progressively while keeping the axes (computed from the full `rows`)
// stable across frames, so a partial reveal doesn't rescale/jump as more data appears.
function drawModelOrderPriceChartInto(target, rows, trades, options = {}) {
  if (!target) return;
  const zoom = options.zoom || 1.35;
  const rect = target.parentElement
    ? target.parentElement.getBoundingClientRect()
    : target.getBoundingClientRect();
  const viewportWidth = Math.max(720, Math.round(rect.width));
  const width = Math.round(viewportWidth * zoom);
  const height = Math.max(280, Math.round(rect.height));
  const pad = { top: 24, right: 74, bottom: 42, left: 58 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;

  target.style.width = `${width}px`;
  target.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (rows.length === 0) {
    target.innerHTML = `
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcff"></rect>
      <text class="tick-label" x="${width / 2}" y="${height / 2}" text-anchor="middle">${escapeHtml(options.emptyMessage || "点击交易记录按钮后显示下单价格曲线")}</text>
    `;
    return;
  }

  const upToIndex = Number.isInteger(options.upToIndex) ? Math.max(0, Math.min(options.upToIndex, rows.length - 1)) : rows.length - 1;
  const visibleRows = rows.slice(0, upToIndex + 1);
  const visibleTrades = trades.filter((trade) => Number.isInteger(trade.rowIndex) && trade.rowIndex <= upToIndex);
  const wavePoints = Array.isArray(options.wavePoints) ? options.wavePoints : [];
  const visibleWavePoints = wavePoints.filter((point) => Number.isInteger(point.rowIndex) && point.rowIndex <= upToIndex);
  const lowReferenceSeries = Array.isArray(options.lowReferenceSeries) ? options.lowReferenceSeries : [];
  const priceValues = rows.flatMap((row) => [row.high, row.low, row.close]);
  trades.forEach((trade) => priceValues.push(trade.price));
  wavePoints.forEach((point) => priceValues.push(point.price));
  lowReferenceSeries.forEach((value) => {
    if (Number.isFinite(value)) priceValues.push(value);
  });
  const max = Math.max(...priceValues);
  const min = Math.min(...priceValues);
  const spread = max - min || max * 0.02 || 1;
  const yMax = max + spread * 0.12;
  const yMin = Math.max(0, min - spread * 0.12);
  const scaleY = (value) => pad.top + ((yMax - value) / (yMax - yMin)) * innerHeight;
  const xForIndex = (index) => pointX(index, rows.length, pad.left, innerWidth);
  // One column per row, spaced the same way xForIndex spaces everything else on this chart —
  // body width leaves a visible gap between candles, the hit-rect spans the full column so a
  // click anywhere near a candle (not just its thin body/wick) still resolves to that date.
  const candleStep = rows.length > 1 ? innerWidth / (rows.length - 1) : innerWidth;
  const candleBodyWidth = Math.max(1, Math.min(candleStep * 0.62, 26));
  // Exactly candleStep wide (not floored to some larger minimum) so neighboring hit-rects tile
  // edge-to-edge instead of overlapping — on a dense chart (many rows packed into a narrow
  // width) a wider floor made adjacent rects overlap, and since later-drawn (more recent date)
  // candles paint on top, a click aimed at one candle would silently resolve to its neighbor.
  const candleHitWidth = Math.max(candleStep, 1);
  const candleNodes = visibleRows
    .map((row, index) => {
      const x = xForIndex(index);
      const isUp = row.close >= row.open;
      const colorClass = isUp ? "candle-up" : "candle-down";
      const highY = scaleY(row.high);
      const lowY = scaleY(row.low);
      const openY = scaleY(row.open);
      const closeY = scaleY(row.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      const label = `${row.date} 开${formatPrice(row.open)} 高${formatPrice(row.high)} 低${formatPrice(row.low)} 收${formatPrice(row.close)}`;
      return `
        <g class="candle-group" data-role="candle" data-date="${row.date}" data-x="${x.toFixed(2)}" data-high-y="${highY.toFixed(2)}">
          <rect class="candle-hit-area" x="${(x - candleHitWidth / 2).toFixed(2)}" y="${pad.top}" width="${candleHitWidth.toFixed(2)}" height="${innerHeight}"></rect>
          <line class="candle-wick ${colorClass}" x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" y1="${highY.toFixed(2)}" y2="${lowY.toFixed(2)}"></line>
          <rect class="candle-body ${colorClass}" x="${(x - candleBodyWidth / 2).toFixed(2)}" y="${bodyTop.toFixed(2)}" width="${candleBodyWidth.toFixed(2)}" height="${bodyHeight.toFixed(2)}"></rect>
          <title>${escapeHtml(label)}</title>
        </g>
      `;
    })
    .join("");
  const ticks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) / 4) * index);
  const dateTickIndexes = Array.from(new Set([
    0,
    Math.floor((rows.length - 1) * 0.5),
    rows.length - 1,
  ]));
  const tradeNodes = visibleTrades
    .map((trade) => {
      const rowIndex = Math.max(0, Math.min(Number(trade.rowIndex) || 0, rows.length - 1));
      const x = xForIndex(rowIndex);
      const y = scaleY(trade.price);
      const color = trade.side === "buy" ? "#c2413b" : "#227a4f";
      const label = `${trade.date} ${trade.label} ${formatPrice(trade.price)}`;
      return `
        <circle cx="${x}" cy="${y}" r="5.5" fill="${color}">
          <title>${escapeHtml(label)}</title>
        </circle>
      `;
    })
    .join("");

  // options.wavePoints (from getWaveTurningPoints) draws two things on top of the same price
  // line: a dashed zigzag connecting confirmed high/low points in sequence — the part that
  // actually makes the chart read as "a wave" rather than scattered dots — and a small
  // triangle marker per point (up for a low, down for a high, matching the shape to which
  // direction just got confirmed). Reuses this function's own xForIndex/scaleY, same as the
  // trade markers just above, so wave points share the exact same coordinate system.
  const waveLinePath = visibleWavePoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${xForIndex(point.rowIndex).toFixed(2)},${scaleY(point.price).toFixed(2)}`)
    .join(" ");
  const waveMarkerNodes = visibleWavePoints
    .map((point) => {
      const x = xForIndex(point.rowIndex);
      const y = scaleY(point.price);
      const label = `${point.date} 波浪${point.type === "high" ? "高点" : "低点"} ${formatPrice(point.price)}`;
      const trianglePoints = point.type === "high"
        ? `${x},${y - 7} ${x - 6},${y + 5} ${x + 6},${y + 5}`
        : `${x},${y + 7} ${x - 6},${y - 5} ${x + 6},${y - 5}`;
      const cssClass = point.type === "high" ? "wave-high-marker" : "wave-low-marker";
      return `
        <polygon class="${cssClass}" points="${trianglePoints}">
          <title>${escapeHtml(label)}</title>
        </polygon>
      `;
    })
    .join("");

  // options.lowReferenceSeries (from getRollingLowPriceSeries, parallel to rows) draws the
  // rolling N日最低价 line daysSinceNewLow actually compares against. Early rows before the
  // lookback window fills are null, so the path is built in segments (a fresh "M" after every
  // gap) rather than one continuous "L" chain — a straight line across a null would visually
  // connect two unrelated reference values.
  let lowReferencePath = "";
  let lowReferenceDrawing = false;
  for (let index = 0; index <= upToIndex; index += 1) {
    const value = lowReferenceSeries[index];
    if (!Number.isFinite(value)) {
      lowReferenceDrawing = false;
      continue;
    }
    lowReferencePath += `${lowReferenceDrawing ? "L" : "M"}${xForIndex(index).toFixed(2)},${scaleY(value).toFixed(2)} `;
    lowReferenceDrawing = true;
  }

  target.innerHTML = `
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
    ${candleNodes}
    ${waveLinePath ? `<path class="wave-line" d="${waveLinePath}"></path>` : ""}
    ${lowReferencePath ? `<path class="low-reference-line" d="${lowReferencePath.trim()}"></path>` : ""}
    ${waveMarkerNodes}
    ${tradeNodes}
    ${dateTickIndexes
      .map((index) => {
        const x = xForIndex(index);
        return `<text class="tick-label" x="${x}" y="${height - 16}" text-anchor="middle">${rows[index].date.slice(5)}</text>`;
      })
      .join("")}
    <circle class="candle-selected-marker" r="3" cx="-999" cy="-999"></circle>
    <text class="candle-date-label" text-anchor="middle" x="-999" y="-999"></text>
  `;

  // Delegated so it survives every innerHTML redraw above (candles are new DOM nodes each time,
  // but `target` itself — the same <svg> the caller looked up — is not) without piling up one
  // more listener per redraw; see svgEl.dataset.loaded a few hundred lines up for the same
  // dataset-flag-on-an-<svg> pattern already used elsewhere in this file.
  if (!target.dataset.candleClickBound) {
    target.dataset.candleClickBound = "1";
    target.addEventListener("click", (event) => {
      const group = event.target.closest('[data-role="candle"]');
      if (!group) return;
      const label = target.querySelector(".candle-date-label");
      const marker = target.querySelector(".candle-selected-marker");
      const x = Number(group.dataset.x);
      const highY = Number(group.dataset.highY);
      // Anchored to the clicked candle itself (not a fixed corner of the full, possibly much
      // wider-than-viewport SVG) so the label always lands inside whatever part of the chart
      // is currently scrolled into view — a fixed-corner label went off-screen after zooming in
      // and scrolling away from it.
      if (marker) {
        marker.setAttribute("cx", x.toFixed(2));
        marker.setAttribute("cy", (highY - 10).toFixed(2));
      }
      if (label) {
        label.setAttribute("x", x.toFixed(2));
        label.setAttribute("y", Math.max(pad.top + 4, highY - 16).toFixed(2));
        label.textContent = `选中日期：${group.dataset.date}`;
      }
    });
  }
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

function setModelTradesChartZoom(nextZoom) {
  modelTradesChartZoom = Math.min(12, Math.max(1, nextZoom));
  redrawModelTradesChart();
}

function stopBacktestReplay() {
  if (backtestTimer) {
    clearInterval(backtestTimer);
    backtestTimer = null;
  }
  if (startBacktestButton) {
    startBacktestButton.disabled = false;
    startBacktestButton.textContent = "开始模拟";
  }
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
  resetModelTradesCharts();
  if (modelTradesDetail) modelTradesDetail.innerHTML = "";
  renderSelectedModelDetail(null);
  renderModelRanking();
  renderSimulationOverview();
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
          : config.strategyType === "stagnation-reversal"
            ? "已按停滞反转参数同步重算表现和回测交易。"
            : config.strategyType === "block-rules"
              ? "已按组合规则同步重算表现和回测交易。"
              : config.strategyType === "score-rules"
                ? "已按打分模型同步重算表现和回测交易。"
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
    renderSimulationOverview();
    openModelSelectorDialog();
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
    renderSelectedModelDetail(leadingResult);
  } else {
    renderSelectedModelDetail(null);
  }
  if (startBacktestButton) {
    startBacktestButton.disabled = false;
    startBacktestButton.textContent = "开始模拟";
  }
  const leadingText = leadingResult
    ? `当前排名第一：${leadingResult.label}，收益 ${formatPercent(leadingResult.finalState.returnRate)}，最大回撤 ${formatPercent(leadingResult.finalState.maxDrawdown)}。`
    : "";
  setStatus(`模拟完成：${activeBacktestRangeLabel}；已生成表现排行榜。${leadingText} 点击交易记录按钮查看交易和曲线。`);
  saveBacktestRunToServer(config).then((saved) => {
    if (saved && saved.runId) {
      setStatus(`模拟完成：${activeBacktestRangeLabel}；历史测试记录已保存到 Postgres。${leadingText} 点击交易记录按钮查看交易和曲线。`);
    }
  });
  setSimulationStep("results");
  renderSimulationOverview();
  window.setTimeout(openResultsDialog, 80);
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
  const isStagnationReversal = indicatorType === "stagnation-reversal";
  const waveThreshold = getWaveThreshold();
  const localLadderRule = readLocalLadderRule();
  const maRsiBandRule = readMaRsiBandRule();
  const orderGridRule = readOrderGridRule();
  const peVolumeRule = readPeVolumeRule();
  const stagnationReversalRule = getCurrentStagnationReversalRule();
  const indicatorPoints = isLocalLadder
    ? calculateLocalLadderPoints(rows, localLadderRule)
    : isMaRsiBand
      ? calculateMaRsiBandPoints(rows, maRsiBandRule)
      : isOrderGrid
        ? calculateOrderGridPoints(rows, orderGridRule)
        : isPeVolume
          ? calculatePeVolumePoints(rows, peVolumeRule)
          : isStagnationReversal
            ? calculateStagnationReversalPoints(rows, stagnationReversalRule)
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
            : isStagnationReversal
              ? (isHigh ? "卖出停滞" : "买入停滞")
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
          : isStagnationReversal
            ? `停滞反转：${stagnationReversalRule.buyStalledDays}天未创新低买入，${stagnationReversalRule.sellStalledDays}天未创新高卖出；信号 ${indicatorPoints.lows.length}/${indicatorPoints.highs.length}`
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
  rememberLoadedSymbol(code, name);
  closeDialog(dataSelectorDialog);

  drawChart(rows, summary);
  renderTable(rows);
  resetBacktest();
  renderSimulationOverview();
  if (getSelectedComparisonPresetNames().length > 0) {
    setStatus(`已更新 ${displayName}，数据源：${result.source}。正在自动模拟已选择模型...`);
    startBacktest();
  } else {
    setSimulationStep("models");
    setStatus(`已更新 ${displayName}，数据源：${result.source}。请选择一个或多个预存模型进行历史模拟。`);
    window.setTimeout(openModelSelectorDialog, 80);
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

  setLoading(true, "正在加载历史数据，请稍候...");
  setStatus("正在获取行情数据...");

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LOAD_DATA_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/klines?${params.toString()}`, { signal: controller.signal });
    const result = await readJsonResponse(response, "历史行情读取失败。");
    renderResult(result);
  } catch (error) {
    const message = error.name === "AbortError" ? "请求超时，请重试。" : (error.message || "加载失败。");
    setStatus(message, true);
  } finally {
    window.clearTimeout(timeoutId);
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
  renderSimulationOverview();
  if (modelSelectorDialog && modelSelectorDialog.open) {
    setSimulationStep(getSelectedComparisonPresetNames().length > 0 ? "data" : "models");
    return;
  }
  if (lastRows && lastRows.length > 0) {
    startBacktest();
  } else if (getSelectedComparisonPresetNames().length > 0) {
    setSimulationStep("data");
    openDataSelectorDialog();
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
  const hideButton = target ? target.closest(".model-hide-button") : null;
  if (hideButton) {
    hideOwnedPreset(hideButton.dataset.presetName, hideButton.dataset.presetLabel);
    return;
  }
  const option = target ? target.closest("[data-preset-name]") : null;
  if (!option) return;
  applyStrategyPreset(option.dataset.presetName);
});

if (openResultsDialogButton) {
  openResultsDialogButton.addEventListener("click", () => {
    openResultsDialog();
  });
}

if (closeModelSelectorButton && modelSelectorDialog) {
  closeModelSelectorButton.addEventListener("click", () => {
    closeDialog(modelSelectorDialog);
  });
}

if (doneModelSelectorButton && modelSelectorDialog) {
  doneModelSelectorButton.addEventListener("click", () => {
    closeDialog(modelSelectorDialog);
    if (getSelectedComparisonPresetNames().length > 0) {
      window.setTimeout(openDataSelectorDialog, 80);
    } else {
      setStatus("请至少选择一个预存模型进行历史模拟。");
    }
  });
}

if (dataSelectorCurrentData) {
  dataSelectorCurrentData.addEventListener("click", (event) => {
    const button = event.target && event.target.closest ? event.target.closest("#useCurrentDataButton") : null;
    if (!button || button.disabled) return;
    if (!lastRows || lastRows.length === 0) {
      setStatus(t("loadHistoryFirst"), true);
      return;
    }
    if (getSelectedComparisonPresetNames().length === 0) {
      closeDialog(dataSelectorDialog);
      openModelSelectorDialog();
      setStatus("请至少选择一个预存模型进行历史模拟。");
      return;
    }
    closeDialog(dataSelectorDialog);
    startBacktest();
  });
}

if (closeDataSelectorButton && dataSelectorDialog) {
  closeDataSelectorButton.addEventListener("click", () => {
    closeDialog(dataSelectorDialog);
  });
}

if (closeMarketDataButton && marketDataDialog) {
  closeMarketDataButton.addEventListener("click", () => {
    closeDialog(marketDataDialog);
  });
}

if (closeResultsDialogButton && resultsDialog) {
  closeResultsDialogButton.addEventListener("click", () => {
    closeDialog(resultsDialog);
  });
}

if (closeModelTradesButton && modelTradesDialog) {
  closeModelTradesButton.addEventListener("click", () => {
    closeDialog(modelTradesDialog);
  });
}

if (closeTradeDetailButton && tradeDetailDialog) {
  closeTradeDetailButton.addEventListener("click", () => {
    closeDialog(tradeDetailDialog);
  });
}

if (closeNewModelButton && newModelDialog) {
  closeNewModelButton.addEventListener("click", () => {
    closeDialog(newModelDialog);
  });
}

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
    if (stepName === "models") {
      openModelSelectorDialog();
    } else if (stepName === "data") {
      openDataSelectorDialog();
    } else {
      openResultsDialog();
    }
  });
});

if (openAuthButton) {
  openAuthButton.addEventListener("click", () => {
    openAuthDialog(currentUser ? "login" : "register");
  });
}

if (openAdminButton) {
  openAdminButton.addEventListener("click", () => {
    openAdminDialog();
  });
}

if (closeAdminButton && adminDialog) {
  closeAdminButton.addEventListener("click", () => {
    closeDialog(adminDialog);
  });
}

if (adminPresetList) {
  adminPresetList.addEventListener("click", (event) => {
    const ownerButton = event.target && event.target.closest ? event.target.closest(".admin-save-owner-button") : null;
    if (ownerButton) {
      const card = ownerButton.closest("[data-admin-preset-id]");
      const select = card ? card.querySelector(".admin-owner-select") : null;
      updateAdminPresetOwner(ownerButton.dataset.presetId, select ? select.value : "");
      return;
    }
    const renameButton = event.target && event.target.closest ? event.target.closest(".admin-rename-preset-button") : null;
    if (renameButton) {
      renameAdminPreset(renameButton.dataset.presetId, renameButton.dataset.presetLabel);
      return;
    }
    const originalButton = event.target && event.target.closest ? event.target.closest(".admin-save-original-button") : null;
    if (originalButton) {
      const card = originalButton.closest("[data-admin-preset-id]");
      const select = card ? card.querySelector(".admin-original-select") : null;
      updateAdminPresetOriginalModelId(originalButton.dataset.presetId, select ? select.value : "0");
      return;
    }
    const hiddenToggleButton = event.target && event.target.closest ? event.target.closest(".admin-toggle-hidden-button") : null;
    if (hiddenToggleButton) {
      toggleAdminPresetHidden(hiddenToggleButton.dataset.presetId, hiddenToggleButton.dataset.hidden === "1");
      return;
    }
    const button = event.target && event.target.closest ? event.target.closest(".admin-delete-preset-button") : null;
    if (!button) return;
    deleteAdminPreset(button.dataset.presetId, button.dataset.presetLabel);
  });
}

if (languageSelect) {
  languageSelect.addEventListener("change", () => {
    applyLanguage(languageSelect.value);
    renderSimulationOverview();
    setStatus(t("initialStatus"));
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

if (forgotPasswordButton) {
  forgotPasswordButton.addEventListener("click", () => {
    requestPasswordReset();
  });
}

if (rankingPresetList) {
  rankingPresetList.addEventListener("click", (event) => {
    const pageButton = event.target && event.target.closest ? event.target.closest(".ranking-page-button") : null;
    if (pageButton) {
      rankingPageByPeriod[pageButton.dataset.rankingPageKey] = Math.max(0, Number(pageButton.dataset.rankingPage) || 0);
      renderModelRanking();
      return;
    }
    const hideButton = event.target && event.target.closest ? event.target.closest(".ranking-hide-button") : null;
    if (hideButton) {
      hideRankingRecord(hideButton.dataset.rankingKey);
      return;
    }
    const renameButton = event.target && event.target.closest ? event.target.closest(".my-model-rename-button") : null;
    if (renameButton) {
      renameOwnedPreset(renameButton.dataset.presetName);
      return;
    }
    const modelHideButton = event.target && event.target.closest ? event.target.closest(".model-hide-button") : null;
    if (modelHideButton) {
      hideOwnedPreset(modelHideButton.dataset.presetName, modelHideButton.dataset.presetLabel);
      return;
    }
    const presetParamButton = event.target && event.target.closest ? event.target.closest(".preset-param-button") : null;
    if (presetParamButton) {
      openPresetParamEditor(presetParamButton.dataset.presetName);
      return;
    }
    const button = event.target && event.target.closest ? event.target.closest(".ranking-param-button") : null;
    if (!button) return;
    const record = [...rankingRecords, ...publicRankingRecords].find((item) => item.key === button.dataset.rankingKey);
    if (record) {
      openRankingRecordParamSnapshot(record);
      return;
    }
    openPresetParamEditor(button.dataset.presetName);
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
      openBlockRuleOptimizationRangeEditor(optimizeButton.dataset.presetName);
      return;
    }
    const tradesButton = target && target.closest ? target.closest(".result-trades-button") : null;
    if (tradesButton) {
      const result = comparisonResults.find((item) => item.name === tradesButton.dataset.resultName);
      if (!result) return;
      modelCompareTable.querySelectorAll("[data-result-name]").forEach((item) => {
        item.classList.toggle("selected", item.dataset.resultName === result.name);
      });
      if (result.name !== "__current__") {
        applyStrategyPreset(result.name);
      }
      renderModelResultCharts(result);
      return;
    }

    const card = target && target.closest ? target.closest("[data-result-name]") : null;
    if (!card) return;
    modelCompareTable.querySelectorAll("[data-result-name]").forEach((item) => {
      item.classList.toggle("selected", item === card);
    });
  });
}

if (showModelPerformanceButton) {
  showModelPerformanceButton.addEventListener("click", () => {
    setSimulationStep("results");
    openResultsDialog();
  });
}

if (selectedModelDetail) {
  selectedModelDetail.addEventListener("click", (event) => {
    const paramButton = event.target && event.target.closest ? event.target.closest(".selected-model-param-button") : null;
    if (!paramButton || !paramButton.dataset.presetName || paramButton.dataset.presetName === "__current__") return;
    openPresetParamEditor(paramButton.dataset.presetName);
  });
}

if (modelTradesDetail) {
  modelTradesDetail.addEventListener("click", (event) => {
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
    showDialog(tradeDetailDialog);
    window.requestAnimationFrame(() => {
      focusTradeOnChart(trade);
    });
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

if (saveAsNewPresetButton) {
  saveAsNewPresetButton.addEventListener("click", async () => {
    if (!presetParamViewerSaveSource) return;
    const source = presetParamViewerSaveSource;
    const defaultLabel = `${source.defaultLabel} 副本`.slice(0, 60);
    const label = window.prompt("输入新模型名称：", defaultLabel);
    if (label === null) return;
    const trimmed = label.trim().slice(0, 80);
    if (!trimmed) {
      setStatus("模型名称不能为空。", true);
      return;
    }
    const preset = createPresetFromConfig(trimmed, source.config, {
      targetSymbol: source.targetSymbol,
      creator: "auto",
      createdAt: todayText(),
      updatedAt: todayText(),
      originalText: source.originalText || `另存自：${source.defaultLabel}`,
      originalModelId: source.originalModelId,
      originalModelLabel: source.originalModelLabel,
      originalModelNumericId: source.originalModelNumericId,
    });
    const presetName = await saveGeneratedPreset(preset);
    if (presetName) {
      setStatus(`已另存为模型：${strategyPresets[presetName].label}。`);
      closeDialog(presetParamDialog);
    }
  });
}

if (closeOptimizationButton && optimizationDialog) {
  closeOptimizationButton.addEventListener("click", () => {
    activeOptimizationId += 1;
    optimizationPresetDraft = null;
    blockRuleOptimizationState = null;
    if (optimizationParamRanges) optimizationParamRanges.classList.add("hidden");
    if (optimizationUniformPointCountRow) optimizationUniformPointCountRow.classList.add("hidden");
    if (runOptimizationButton) runOptimizationButton.classList.add("hidden");
    if (optimizationProgress) optimizationProgress.classList.add("hidden");
    if (optimizationCombinationSummary) optimizationCombinationSummary.classList.add("hidden");
    optimizationDialog.close();
  });
}

if (saveOptimizationButton) {
  saveOptimizationButton.addEventListener("click", () => {
    saveOptimizationPreset();
  });
}

if (generateModelCodeButton) {
  generateModelCodeButton.addEventListener("click", async () => {
    if (!requireSignedInForSave()) return;
    if (!customModelPrompt || !customModelPrompt.value.trim()) {
      if (generatedModelCode) generatedModelCode.textContent = t("noModelInput");
      return;
    }
    const description = customModelPrompt.value;
    let aiPatch = null;
    let fallbackMessage = "";
    generateModelCodeButton.disabled = true;
    if (generatedModelCode) generatedModelCode.textContent = "AI 正在理解模型描述...";
    try {
      aiPatch = await requestAiModelPatch(description);
    } catch (error) {
      fallbackMessage = `AI 生成暂不可用，已使用本地安全解析：${error.message}`;
    } finally {
      syncModelAuthoringControls();
    }
    generatedPresetDraft = createSafePresetDraft(description, aiPatch);
    if (generatedModelCode) generatedModelCode.textContent = generatedPresetDraft.code;
    if (viewGeneratedModelParamsButton) viewGeneratedModelParamsButton.disabled = false;
    const uncovered = aiPatch && Array.isArray(aiPatch.uncoveredRequirements) ? aiPatch.uncoveredRequirements : [];
    if (uncovered.length > 0) {
      setStatus(`⚠ AI 有 ${uncovered.length} 处描述没能表达成规则，请检查生成结果：${uncovered.join("；")}`, true);
    } else {
      setStatus(aiPatch ? "AI 已理解模型描述，并生成安全模型预设。" : fallbackMessage);
    }
    syncModelAuthoringControls();
  });
}

if (viewGeneratedModelParamsButton) {
  viewGeneratedModelParamsButton.addEventListener("click", () => {
    openGeneratedModelParamsViewer();
  });
}

if (saveGeneratedModelButton) {
  saveGeneratedModelButton.addEventListener("click", async () => {
    if (!generatedPresetDraft) return;
    const presetName = await saveGeneratedPreset(generatedPresetDraft.preset);
    if (!presetName) return;
    generatedPresetDraft = null;
    syncModelAuthoringControls();
    setWizardPage("ranking");
    setStatus(`已保存新模型预设：${strategyPresets[presetName].label}。`);
  });
}

if (startBacktestButton) {
  startBacktestButton.addEventListener("click", () => {
    startBacktest();
  });
}

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

// This used to also silently swap in "whichever preset happens to be first" for the newly
// picked type via applyStrategyPreset — a real bug, not a feature: the user manually switching
// this dropdown to browse a different indicator overlay would silently discard whatever
// specific model they'd actually loaded via 选择模拟模型 (modelCompareOptions ->
// applyStrategyPreset, the ONLY working way to pick a specific named preset — strategyPresetSelect/
// .preset-panel is permanently `hidden` in the HTML and nothing ever un-hides it, confirmed by a
// full-codebase search) and replace it with an unrelated one of the matching type. Switching this
// dropdown should only ever change which generic indicator calculation is being PREVIEWED on the
// already-loaded raw price data — never swap the actually-selected model out from under the user.
// renderStrategyPresetOptions is still called (updates strategyPresetSelect's hidden option list/
// value) because a couple of other functions — e.g. getCurrentStagnationReversalRule — still read
// strategyPresetSelect.value as internal state, independent of this dropdown's own visible role.
indicatorModelSelect.addEventListener("change", () => {
  const strategyType = indicatorModelSelect.value;
  renderStrategyPresetOptions(strategyType);
  const message = strategyType === "local-high-ladder"
    ? "已切换到近端高点阶梯指标。"
    : strategyType === "ma-rsi-band"
      ? "已切换到 MA-RSI 波段模型。"
      : strategyType === "order-grid"
        ? "已切换到近端高点订单网格模型。"
        : strategyType === "pe-volume"
          ? "已切换到 PE-成交量指标模型。"
          : strategyType === "stagnation-reversal"
            ? "已切换到停滞反转模型。"
            : strategyType === "block-rules"
              ? "已切换到组合规则模型。"
              : strategyType === "score-rules"
                ? "已切换到打分模型。"
      : "已切换到波浪模型。";
  refreshIndicatorView(message);
});

function triggerWaveThresholdRedraw() {
  if (!lastRows || !lastSummary) return;
  drawChart(lastRows, lastSummary);
  if (hasBacktestRun) {
    recomputeBacktestWithLatestConfig();
  } else {
    setStatus(`已按 ${formatPercent(getWaveThreshold())} 波动阈值重新计算历史波浪高低点。`);
  }
}

waveThresholdInput.addEventListener("input", () => {
  if (indicatorModelSelect.value !== "wave" && !currentWaveConditionRef) return;
  if (currentWaveConditionRef) {
    // Directly mutates the condition object living inside currentBlockRules/currentScoreRules
    // (collectWaveConditions returned a reference, not a copy) — the next readBacktestConfig()/
    // backtest run picks this up automatically, no separate save step.
    currentWaveConditionRef.waveThreshold = Math.max(0.1, Number(waveThresholdInput.value) || 5);
  }
  triggerWaveThresholdRedraw();
});

if (waveConditionSelect) {
  waveConditionSelect.addEventListener("change", () => {
    const entry = currentWaveConditions[Number(waveConditionSelect.value)];
    if (!entry) return;
    currentWaveConditionRef = entry.condition;
    waveThresholdInput.value = resolveConditionWaveThreshold(currentWaveConditionRef, currentModelTopLevelWaveThreshold);
    triggerWaveThresholdRedraw();
  });
}

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

if (modelTradesZoomOutButton) {
  modelTradesZoomOutButton.addEventListener("click", () => {
    setModelTradesChartZoom(modelTradesChartZoom - 1);
  });
}

if (modelTradesZoomResetButton) {
  modelTradesZoomResetButton.addEventListener("click", () => {
    setModelTradesChartZoom(1);
  });
}

if (modelTradesZoomInButton) {
  modelTradesZoomInButton.addEventListener("click", () => {
    setModelTradesChartZoom(modelTradesChartZoom + 1);
  });
}

[initialCashInput, tradeFeeInput].forEach((input) => {
  if (!input) return;
  input.addEventListener("change", () => {
    if (lastRows && lastRows.length > 0 && getSelectedComparisonPresetNames().length > 0) {
      startBacktest();
    }
  });
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
  applyLanguage(activeLanguage);
  renderSymbolPresetOptions(codeInput.value);
  loadSymbolHistory().then(() => renderSymbolPresetOptions(codeInput.value)).catch(() => {});
  renderModelCompareOptions();
  renderModelRanking();
  setSimulationStep("models");
  hideHistoryPanels();
  applyStrategyPreset("optimized", false);
  initializeDates();
  updateBacktestWindowUi();
  renderAuthState();
  await fetchAuthSession();
  checkAutoFollowFromUrl();
  await initializeServerCustomPresets();
  initializeServerRankingRecords();
  setStatus(t("initialStatus"));
}

initializeApp();
