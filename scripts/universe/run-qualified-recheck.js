// 达标复查 (qualification recheck): re-scores every already-qualified model
// (optimization_scan_results.source='validated-search' AND reached_target=TRUE) against its
// validation windows, using freshly-arrived price data — the exact same methodology
// search-validated-best.js used to qualify it in the first place (see that file's header comment
// for why "both years individually clear the target" beats a blended average), just re-run later
// once more real trading days have accumulated.
//
// The windows are INCREMENTAL with a FIXED ORIGIN: they start from the model's own original
// train_start_date (frozen forever once recorded) and the last one extends through the latest
// trading day, so a recheck covers everything that has happened since the model was created and
// the span only ever grows. It deliberately does NOT use the rolling splitTrainTestWindows
// anchored on "today", which would silently slide the whole span forward and re-judge the model
// on a different stretch of history each run. Same rule the manual 重新验证 follows
// (server.js's handlePresetRevalidateApi) — only rows predating the train/test methodology
// (train_start_date IS NULL) still fall back to the rolling split, having no origin to anchor to.
//
// The outcome is written to a separate set of recheck_* columns (see optimization-results.js's
// ensureResultsTable comment) — test_year1/test_year2 are left untouched either way, so "did it
// qualify originally" and "does it score now" are both visible side by side. reached_target
// itself IS updated, but only in one direction: the moment a recheck comes back
// stillQualifies=FALSE, saveRecheckResult demotes reached_target to FALSE on that row (a model
// shown to no longer hold up shouldn't keep counting as "达标" elsewhere in the app — see that
// function's comment). A model is never deleted or auto-disabled by this — nothing is "running"
// for a not-yet-promoted candidate sitting in this table, unlike a 盯盘提醒 watch (see
// run-watch-alerts.js) which has a live position to protect; demoting reached_target is purely a
// signal so a human (and fetchPriorSuccessfulModels' few-shot sampling) stops treating it as a
// proven success.
//
// Usage: node scripts/universe/run-qualified-recheck.js [--symbols=NET,GOOGL] [--targetPercent=50] [--testYears=2]
//   (no --symbols = recheck every qualified row)

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { annualizedUpsideDeviation } = require("../shared/volatility.js");
const { splitTrainTestWindows, splitFixedStartWindows } = require("../shared/train-test-window.js");
const { ensureResultsTable, fetchQualifiedForRecheck, saveRecheckResult } = require("../shared/optimization-results.js");
const { evaluateBuySampleGate, describeBuySampleGate } = require("../shared/buy-sample-gate.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? Number(found.split("=")[1]) : fallback;
};
const getArgString = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : "";
};
// 仅作为行上没有 target_percent 时的兜底——正常情况下按每行自己存的门槛判（见 nowQualifies）。
const TARGET_PERCENT = getArg("targetPercent", 50);
// 跟 search-validated-best.js 的同名常量保持一致：复查和首次达标必须用同一把尺子。
// 样本量按"整段历史合计 + 每年不断档"判，理由见 shared/buy-sample-gate.js 的注释。
const MIN_TOTAL_CLOSED_BUYS = Math.max(0, Math.round(getArg("minTotalClosedBuys", 10)));
const MIN_CLOSED_BUYS_PER_YEAR = Math.max(0, Math.round(getArg("minClosedBuysPerYear", 2)));
const MIN_EXPECTANCY_PERCENT = getArg("minExpectancyPct", 1.5);
const MIN_PAYOFF_RATIO = getArg("minPayoffRatio", 1.2);
// Same gate and default as search-validated-best.js's UPSIDE_THRESHOLD_PERCENT — kept in sync so
// "达标"/"仍达标" means the same thing at recheck time as it did when a model first qualified.
const UPSIDE_THRESHOLD_PERCENT = Math.max(0, getArg("upsideThresholdPercent", 30));
const MIN_UPSIDE_GATE_ROWS = 30;
// Same gate and default as search-validated-best.js's DRAWDOWN_TOLERANCE_PERCENT.
const DRAWDOWN_TOLERANCE_PERCENT = Math.max(0, getArg("drawdownTolerancePercent", 5));
const TEST_YEARS = Math.max(1, Math.round(getArg("testYears", 2)));
const MIN_TEST_ROWS = Math.max(10, getArg("minTestRows", 50));
// Matches search-validated-best.js's INITIAL_CASH/TRADE_FEE — only used here for the per-year
// buy-hold drawdown gate's dedicated buildBuyHoldStates run; the actual candidate account values
// (scoredYear1/scoredYear2) already come from candidate.bestConfig, which carries its own.
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

// Live progress, polled by server.js's /api/admin/qualified-recheck status — same file-based
// reporting convention as run-auto-generate.js/search-validated-best.js.
const PROGRESS_FILE = path.join(__dirname, "..", "..", "data", "qualified-recheck-progress.json");
let progressState = {};
function writeProgress(patch) {
  progressState = { ...progressState, ...patch, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressState));
  } catch (error) {
    // Best-effort only — progress reporting must never take down the actual job.
  }
}

async function loadRows(symbol, dbMarket) {
  const result = await pool.query(`
    SELECT dp.trade_date, dp.open, dp.high, dp.low, dp.close, dp.volume,
           dv.pe, dv.pe_ttm, dv.pb,
           sf.gross_margin, sf.roe, sf.revenue_growth
    FROM daily_prices dp
    LEFT JOIN LATERAL (
      SELECT pe, pe_ttm, pb
      FROM daily_valuations
      WHERE symbol = dp.symbol AND market = dp.market
        AND trade_date <= dp.trade_date AND trade_date >= dp.trade_date - INTERVAL '10 days'
      ORDER BY trade_date DESC
      LIMIT 1
    ) dv ON TRUE
    LEFT JOIN LATERAL (
      -- Same forward-fill idea, but financial-statement data lands quarterly (A-share) or only
      -- annually (US, via AKShare) rather than daily, so the lookback has to be wide enough to
      -- span a full US annual gap plus filing delay — 400 days covers that with margin.
      SELECT gross_margin, roe, revenue_growth
      FROM stock_fundamentals
      WHERE symbol = dp.symbol AND market = dp.market
        AND report_date <= dp.trade_date AND report_date >= dp.trade_date - INTERVAL '400 days'
      ORDER BY report_date DESC
      LIMIT 1
    ) sf ON TRUE
    WHERE dp.symbol = $1 AND dp.market = $2
    ORDER BY dp.trade_date ASC
  `, [symbol, dbMarket]);
  return result.rows
    .map((row) => ({
      date: row.trade_date.toISOString().slice(0, 10),
      open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.volume),
      pe: row.pe !== null ? Number(row.pe) : undefined,
      peTtm: row.pe_ttm !== null ? Number(row.pe_ttm) : undefined,
      pb: row.pb !== null ? Number(row.pb) : undefined,
      grossMargin: row.gross_margin !== null ? Number(row.gross_margin) : undefined,
      roe: row.roe !== null ? Number(row.roe) : undefined,
      revenueGrowth: row.revenue_growth !== null ? Number(row.revenue_growth) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

// How many whole years the model's original training window spanned — needed to place the
// validation windows at the right offset from the fixed origin. Derived from the stored
// train window rather than assumed, since different runs qualified models with different shapes.
function deriveTrainYears(trainStartDate, trainEndDate) {
  if (!trainStartDate || !trainEndDate) return null;
  const start = new Date(trainStartDate);
  const end = new Date(trainEndDate);
  if (!(end > start)) return null;
  const years = Math.round((end - start) / (365.25 * 86400000));
  return Math.max(1, Math.min(10, years));
}

function buildRecheckWindows(allRows, candidate) {
  const trainYears = deriveTrainYears(candidate.trainStartDate, candidate.trainEndDate);
  if (candidate.trainStartDate && trainYears) {
    // End bound is exclusive everywhere in this codebase, so pass "today" (strictly after the
    // newest stored row) to make sure the latest trading day is actually included.
    const today = new Date().toISOString().slice(0, 10);
    const { testWindows } = splitFixedStartWindows(allRows, trainYears, TEST_YEARS, candidate.trainStartDate, today);
    return { testWindows, fixedStart: true };
  }
  const { testWindows } = splitTrainTestWindows(allRows, 1, TEST_YEARS);
  return { testWindows, fixedStart: false };
}

async function main() {
  await ensureResultsTable(pool);

  const candidates = await fetchQualifiedForRecheck(pool, { symbols: SYMBOLS_FILTER });
  console.log(`targetPercent=${TARGET_PERCENT}% upsideThresholdPercent=${UPSIDE_THRESHOLD_PERCENT}% drawdownTolerancePercent=${DRAWDOWN_TOLERANCE_PERCENT}% testYears=${TEST_YEARS} candidates=${candidates.length}${SYMBOLS_FILTER.length ? ` symbols=${SYMBOLS_FILTER.join(",")}` : " (all qualified rows)"}`);

  let checked = 0;
  let stillQualifies = 0;
  let noLongerQualifies = 0;
  let skipped = 0;

  writeProgress({
    status: "running", total: candidates.length, index: 0, currentSymbol: null,
    checked: 0, stillQualifies: 0, noLongerQualifies: 0, skipped: 0, targetPercent: TARGET_PERCENT,
  });

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    writeProgress({ index: i + 1, currentSymbol: candidate.symbol });
    try {
      const freshness = await ensureFreshData(pool, candidate.symbol, candidate.market);
      if (freshness.refreshed) {
        console.log(`[refresh] ${candidate.symbol} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before rechecking`);
      }
      const allRows = await loadRows(candidate.symbol, candidate.market);
      // Windows are anchored to this model's ORIGINAL training start date, with the last one
      // extended through today — the same cumulative "fixed origin, growing end" shape the
      // manual 重新验证 uses (server.js's handlePresetRevalidateApi). A recheck never re-trains,
      // it only re-scores the already-frozen best_config, so trainYears here just positions
      // where the validation windows begin relative to that origin.
      //
      // Rows written before the train/test methodology existed have no origin to anchor to, so
      // those still fall back to the rolling split.
      const { testWindows, fixedStart } = buildRecheckWindows(allRows, candidate);
      const testWindowRowCounts = testWindows.map(
        (win) => allRows.filter((row) => row.date >= win.startDate && row.date < win.endDate).length,
      );
      if (testWindowRowCounts.some((count) => count < MIN_TEST_ROWS)) {
        console.log(`[skip-data] ${candidate.symbol} testWindowRows=${testWindowRowCounts.join("/")} (<${MIN_TEST_ROWS}?)`);
        skipped += 1;
        await saveRecheckResult(pool, {
          id: candidate.id, stillQualifies: null, year1Annualized: null, year2Annualized: null,
          targetPercent: TARGET_PERCENT, upsideThresholdPercent: UPSIDE_THRESHOLD_PERCENT,
          error: `最新数据不足以复查（验证窗口行数 ${testWindowRowCounts.join("/")}，需要至少 ${MIN_TEST_ROWS}）`,
        });
        writeProgress({ skipped });
        continue;
      }

      const scoredYear1 = engine.buildScoredBacktestStates(allRows, candidate.bestConfig, testWindows[0].startDate, testWindows[0].endDate);
      const scoredYear2 = engine.buildScoredBacktestStates(allRows, candidate.bestConfig, testWindows[1].startDate, testWindows[1].endDate);
      const year1Annualized = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
      const year2Annualized = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;

      // Same upside-deviation gate search-validated-best.js applies when a model first
      // qualifies — recomputed here from the freshly-rebuilt test windows (not the ones stored at
      // original qualification time), same as year1Annualized/year2Annualized above.
      const year1Rows = allRows.filter((row) => row.date >= testWindows[0].startDate && row.date < testWindows[0].endDate);
      const year2Rows = allRows.filter((row) => row.date >= testWindows[1].startDate && row.date < testWindows[1].endDate);
      const upsideDev1 = year1Rows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(year1Rows) : null;
      const upsideDev2 = year2Rows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(year2Rows) : null;
      const passesUpsideYear1 = upsideDev1 === null || year1Annualized >= (UPSIDE_THRESHOLD_PERCENT / 100) * upsideDev1;
      const passesUpsideYear2 = upsideDev2 === null || year2Annualized >= (UPSIDE_THRESHOLD_PERCENT / 100) * upsideDev2;

      // Per-year drawdown gate: this validation year's own max drawdown must stay smaller than
      // buy-hold's own drawdown in that SAME freshly-rebuilt window — same standard
      // search-validated-best.js applies at original qualification time.
      const buyHoldYear1 = engine.buildBuyHoldStates(year1Rows, INITIAL_CASH, TRADE_FEE);
      const buyHoldYear2 = engine.buildBuyHoldStates(year2Rows, INITIAL_CASH, TRADE_FEE);
      const buyHoldDD1 = buyHoldYear1.length > 0 ? buyHoldYear1[buyHoldYear1.length - 1].maxDrawdown : null;
      const buyHoldDD2 = buyHoldYear2.length > 0 ? buyHoldYear2[buyHoldYear2.length - 1].maxDrawdown : null;
      const passesDrawdownYear1 = buyHoldDD1 === null || scoredYear1.maxDrawdown < buyHoldDD1 * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);
      const passesDrawdownYear2 = buyHoldDD2 === null || scoredYear2.maxDrawdown < buyHoldDD2 * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);

      // 每买单指标：跟 search-validated-best.js 首次达标时同一套标准（样本数/期望/盈亏比，
      // 一律取较差的那个验证年）。复查必须和首次达标用同一把尺子，否则一个模型刚被存下来就会
      // 在当晚的复查里被判"不再达标"。
      const buyWin1 = engine.buildBuyWinStats(scoredYear1.trades);
      const buyWin2 = engine.buildBuyWinStats(scoredYear2.trades);
      // 样本量单独按【整段历史】判：从训练起点到最新交易日一次连续回测，合计够 + 每年不断档。
      // 必须是一次连续回测，分段拼接会因为每段重置账户而把跨年的买单算错（见 buy-sample-gate.js）。
      const fullSpanStart = candidate.trainStartDate || testWindows[0].startDate;
      const fullSpanEnd = testWindows[testWindows.length - 1].endDate;
      const fullSpan = engine.buildScoredBacktestStates(allRows, candidate.bestConfig, fullSpanStart, fullSpanEnd);
      const sampleGate = evaluateBuySampleGate(
        engine.buildBuyWinStats(fullSpan.trades).closedLots,
        fullSpanStart, fullSpanEnd,
        { minTotal: MIN_TOTAL_CLOSED_BUYS, minPerYear: MIN_CLOSED_BUYS_PER_YEAR }
      );
      const worstExpectancyPct = Math.min(
        buyWin1.expectancyPct === null ? -Infinity : buyWin1.expectancyPct,
        buyWin2.expectancyPct === null ? -Infinity : buyWin2.expectancyPct
      );
      // payoffRatio 为 null 且有已平仓买单 = 一笔亏损都没有，是全胜而不是"没有盈亏比"。
      const payoffOf = (stats) => (stats.payoffRatio === null ? (stats.closedBuys > 0 && stats.lossCount === 0 ? Infinity : -Infinity) : stats.payoffRatio);
      const worstPayoffRatio = Math.min(payoffOf(buyWin1), payoffOf(buyWin2));
      const passesSample = sampleGate.passes;
      const passesExpectancy = worstExpectancyPct >= MIN_EXPECTANCY_PERCENT;
      const passesPayoff = worstPayoffRatio >= MIN_PAYOFF_RATIO;

      // 年化门槛按这一行自己存的 target_percent 判，不再用脚本级常量——达标标准调整过
      // （年化门槛降到 20%，主判据换成每买单期望），用固定 50% 会误降级按新标准存下的模型。
      const rowTargetPercent = Number.isFinite(candidate.targetPercent) ? candidate.targetPercent : TARGET_PERCENT;
      const nowQualifies = year1Annualized >= rowTargetPercent && year2Annualized >= rowTargetPercent
        && passesUpsideYear1 && passesUpsideYear2 && passesDrawdownYear1 && passesDrawdownYear2
        && passesSample && passesExpectancy && passesPayoff;

      await saveRecheckResult(pool, {
        id: candidate.id, stillQualifies: nowQualifies, year1Annualized, year2Annualized,
        targetPercent: rowTargetPercent, upsideThresholdPercent: UPSIDE_THRESHOLD_PERCENT, error: "",
      });
      checked += 1;
      if (nowQualifies) stillQualifies += 1; else noLongerQualifies += 1;
      const windowLog = `${fixedStart ? "固定起点" : "滚动窗口(无原始起点)"} ${testWindows[0].startDate}~${testWindows[testWindows.length - 1].endDate}`;
      console.log(`[${candidate.symbol}] ${candidate.label}: 复查(${windowLog}) year1=${year1Annualized.toFixed(1)}%年化${passesUpsideYear1 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear1 ? "" : "(回撤未小于买入持有)"} year2=${year2Annualized.toFixed(1)}%年化${passesUpsideYear2 ? "" : "(未过上行波动门槛)"}${passesDrawdownYear2 ? "" : "(回撤未小于买入持有)"}${passesSample ? "" : `(样本不足:${describeBuySampleGate(sampleGate)}${sampleGate.passesTotal ? `,第${sampleGate.failingYears.map((y) => y.index).join("/")}年不足${MIN_CLOSED_BUYS_PER_YEAR}单` : `<${MIN_TOTAL_CLOSED_BUYS}单`})`}${passesExpectancy ? "" : `(每买单期望${worstExpectancyPct === -Infinity ? "无" : `${worstExpectancyPct.toFixed(2)}%`}<${MIN_EXPECTANCY_PERCENT}%)`}${passesPayoff ? "" : `(盈亏比${worstPayoffRatio === -Infinity ? "无" : worstPayoffRatio.toFixed(2)}<${MIN_PAYOFF_RATIO})`} 门槛${rowTargetPercent}% ${nowQualifies ? "— 仍达标" : "— 不再达标"}`);
      writeProgress({ checked, stillQualifies, noLongerQualifies });
    } catch (error) {
      console.error(`[error] ${candidate.symbol}: ${error.message}`);
      skipped += 1;
      try {
        await saveRecheckResult(pool, {
          id: candidate.id, stillQualifies: null, year1Annualized: null, year2Annualized: null,
          targetPercent: TARGET_PERCENT, upsideThresholdPercent: UPSIDE_THRESHOLD_PERCENT,
          error: `复查出错：${error.message}`.slice(0, 500),
        });
      } catch (saveError) {
        console.error(`[error] failed to record recheck error for ${candidate.symbol}: ${saveError.message}`);
      }
      writeProgress({ skipped });
    }
  }

  console.log(`\ndone. checked=${checked} stillQualifies=${stillQualifies} noLongerQualifies=${noLongerQualifies} skipped=${skipped}`);
  writeProgress({
    status: "done", currentSymbol: null,
    currentReason: `完成：共复查 ${candidates.length} 个已达标模型，仍达标 ${stillQualifies} 个，不再达标 ${noLongerQualifies} 个，跳过 ${skipped} 个。`,
  });
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
