// 回填买单胜率（engine.buildBuyWinStats）到已有的验证快照和每日验证状态。
//
// preset_validation_snapshots / model_validation_states 只存了成交笔数，没有成交明细，所以
// 存量数据的胜率没法从库里反推，只能按各自记录的区间重新跑一遍回测再算。新产生的数据已经在
// 写入时就算好了（见 server.js 的 handlePresetRevalidateApi、run-model-validation-daily.js），
// 这个脚本只负责把历史行补上，跑完一次即可。
//
// 用法:
//   node scripts/universe/backfill-buy-win-stats.js            # 全部回填
//   node scripts/universe/backfill-buy-win-stats.js --dryRun   # 只算不写
//   node scripts/universe/backfill-buy-win-stats.js --limit=20

const { Pool } = require("pg");
const engine = require("./engine.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dryRun");
const LIMIT = Number((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || 0;

const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

function toIso(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

// daily_prices.market 存的 A 股是 "1"(沪) / "0"(深)，不是 "CN"——跟
// run-model-validation-daily.js 的同名函数保持一致，用 "CN" 会一行都查不到。
function inferDbMarket(symbol, market) {
  const normalizedMarket = String(market || "").trim().toUpperCase();
  if (normalizedMarket === "US") return "US";
  const code = String(symbol || "").trim().toUpperCase();
  if (/^\d{6}$/.test(code)) return /^[569]/.test(code) ? "1" : "0";
  return normalizedMarket === "1" || normalizedMarket === "0" ? normalizedMarket : "US";
}

// rows 缓存：同一只股票会被多条记录用到，重复加载是这个脚本最大的耗时来源。
const rowsCache = new Map();
async function cachedRows(symbol, market) {
  const key = `${symbol}::${market}`;
  if (!rowsCache.has(key)) rowsCache.set(key, await loadRowsForSymbol(pool, symbol, market));
  return rowsCache.get(key);
}

function buildConfig(config, strategyType) {
  return engine.buildConfigFromPresetObject(
    { ...(config && typeof config === "object" ? config : {}), strategyType },
    { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType }
  );
}

// 一个区间的买单胜率。endDate 传 null 表示一直算到最新一个交易日。
function winStatsForWindow(rows, baseConfig, startDate, endDate) {
  if (!startDate) return null;
  const scored = endDate
    ? engine.buildScoredBacktestStates(rows, baseConfig, startDate, endDate)
    : engine.buildScoredBacktestStates(rows, baseConfig, startDate);
  return engine.buildBuyWinStats(scored.trades);
}

async function backfillSnapshots() {
  const result = await pool.query(`
    SELECT pvs.preset_id, pvs.train_start_date, pvs.train_end_date,
           pvs.test_year1_start_date, pvs.test_year1_end_date,
           pvs.test_year2_start_date, pvs.test_year2_end_date,
           sp.config, sp.strategy_type, sp.label, sp.meta
    FROM preset_validation_snapshots pvs
    JOIN strategy_presets sp ON sp.id = pvs.preset_id
    WHERE pvs.train_buy_win_rate IS NULL
    ORDER BY pvs.updated_at DESC
    ${LIMIT ? `LIMIT ${LIMIT}` : ""}
  `);
  console.log(`[snapshots] 待回填 ${result.rows.length} 条`);
  let done = 0;
  let skipped = 0;
  for (const row of result.rows) {
    const meta = row.meta && typeof row.meta === "object" ? row.meta : {};
    const symbol = String(meta.targetSymbol || "").trim().toUpperCase();
    if (!symbol) {
      skipped += 1;
      console.log(`[skip] preset=${row.preset_id} ${row.label}: meta 里没有 targetSymbol，无法回测`);
      continue;
    }
    try {
      const market = inferDbMarket(symbol);
      const rows = await cachedRows(symbol, market);
      if (!rows.length) { skipped += 1; console.log(`[skip] ${symbol}: 没有历史数据`); continue; }
      engine.setActiveLotSizeSymbol(symbol);
      const baseConfig = buildConfig(row.config, row.strategy_type || "wave");
      const train = winStatsForWindow(rows, baseConfig, toIso(row.train_start_date), toIso(row.train_end_date));
      const year1 = winStatsForWindow(rows, baseConfig, toIso(row.test_year1_start_date), toIso(row.test_year1_end_date));
      const year2 = winStatsForWindow(rows, baseConfig, toIso(row.test_year2_start_date), toIso(row.test_year2_end_date));
      if (!train) { skipped += 1; console.log(`[skip] ${symbol}: 没有训练期起止日期`); continue; }
      if (!DRY_RUN) {
        await pool.query(`
          UPDATE preset_validation_snapshots SET
            train_buy_win_rate = $2, train_buy_closed_count = $3,
            train_buy_payoff_ratio = $4, train_buy_expectancy = $5,
            test_year1_buy_win_rate = $6, test_year1_buy_closed_count = $7,
            test_year2_buy_win_rate = $8, test_year2_buy_closed_count = $9
          WHERE preset_id = $1
        `, [
          row.preset_id,
          train.winRate, train.closedBuys, train.payoffRatio, train.expectancy,
          year1 ? year1.winRate : null, year1 ? year1.closedBuys : null,
          year2 ? year2.winRate : null, year2 ? year2.closedBuys : null,
        ]);
      }
      done += 1;
      console.log(`[ok] ${symbol} ${String(row.label).slice(0, 30)} 训练期胜率 ${train.winRate === null ? "--" : train.winRate.toFixed(1) + "%"}（${train.closedBuys} 个已平仓买单）`);
    } catch (error) {
      skipped += 1;
      console.error(`[error] preset=${row.preset_id} ${symbol}: ${error.message}`);
    }
  }
  return { done, skipped };
}

async function backfillValidationStates() {
  // model_validation_states 本身不存模型参数，只存 preset_id/scan_result_id/watch_id 三个来源
  // 引用，所以配置要按来源 JOIN 回去取——跟 run-model-validation-daily.js 自己那三个候选查询
  // 的取法保持一致（盯盘优先用创建时冻结的 frozen_config）。
  const result = await pool.query(`
    SELECT mvs.subject_type, mvs.subject_id, mvs.symbol, mvs.market,
           mvs.validation_start_date, mvs.strategy_type,
           COALESCE(wa.frozen_config, sp.config, osr.best_config) AS best_config
    FROM model_validation_states mvs
    LEFT JOIN watch_alerts wa ON wa.id = mvs.watch_id
    LEFT JOIN strategy_presets sp ON sp.id = mvs.preset_id
    LEFT JOIN optimization_scan_results osr ON osr.id = mvs.scan_result_id
    WHERE mvs.cumulative_buy_win_rate IS NULL AND mvs.validation_start_date IS NOT NULL
    ORDER BY mvs.updated_at DESC
    ${LIMIT ? `LIMIT ${LIMIT}` : ""}
  `);
  console.log(`[validation-states] 待回填 ${result.rows.length} 条`);
  let done = 0;
  let skipped = 0;
  for (const row of result.rows) {
    const symbol = String(row.symbol || "").trim().toUpperCase();
    try {
      const market = inferDbMarket(symbol, row.market);
      const rows = await cachedRows(symbol, market);
      if (!rows.length) { skipped += 1; console.log(`[skip] ${symbol}: 没有历史数据`); continue; }
      engine.setActiveLotSizeSymbol(symbol);
      const baseConfig = buildConfig(row.best_config, row.strategy_type || "wave");
      // 累计区间：固定起点一直算到最新交易日，跟 run-model-validation-daily.js 的口径一致。
      const stats = winStatsForWindow(rows, baseConfig, toIso(row.validation_start_date), null);
      if (!stats) { skipped += 1; continue; }
      if (!DRY_RUN) {
        await pool.query(`
          UPDATE model_validation_states SET
            cumulative_buy_win_rate = $3, cumulative_buy_closed_count = $4,
            cumulative_buy_payoff_ratio = $5, cumulative_buy_expectancy = $6
          WHERE subject_type = $1 AND subject_id = $2
        `, [row.subject_type, row.subject_id, stats.winRate, stats.closedBuys, stats.payoffRatio, stats.expectancy]);
      }
      done += 1;
      console.log(`[ok] ${row.subject_type}:${symbol} 累计胜率 ${stats.winRate === null ? "--" : stats.winRate.toFixed(1) + "%"}（${stats.closedBuys} 个已平仓买单）`);
    } catch (error) {
      skipped += 1;
      console.error(`[error] ${row.subject_type}:${symbol}: ${error.message}`);
    }
  }
  return { done, skipped };
}

async function main() {
  console.log(DRY_RUN ? "=== dryRun：只计算不写库 ===" : "=== 正式回填 ===");
  const a = await backfillSnapshots();
  const b = await backfillValidationStates();
  console.log(`\n完成：验证快照 ${a.done} 条（跳过 ${a.skipped}）· 每日验证状态 ${b.done} 条（跳过 ${b.skipped}）`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  try { await pool.end(); } catch (endError) { /* 已关闭 */ }
  process.exit(1);
});
