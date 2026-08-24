// "选股" (stock screening) batch job: given ONE already-selected saved model (no parameter
// search, no AI) and a market (CN or US), runs a single deterministic backtest per symbol in
// that market's universe (symbols.json's fixed list, expanded with every stock any user has
// ever queried — see scripts/shared/universe-loader.js) over its trailing ~2 years of
// history, and checks whether the MOST RECENT trading day produced an actual buy/sell trade
// under that model — i.e. whether the stock currently qualifies for placing an order.
//
// Progress and final results both live in a single stock_screen_runs row (see server.js's
// initializeDatabase()), updated incrementally as symbols are processed, so polling clients
// see live progress and the finished run's history in the same place. server.js creates the
// row (status='running') before spawning this script and passes its id via --runId.
//
// Usage: node scripts/universe/run-stock-screen.js --runId=<id> --presetId=<id> --market=CN|US [--ownerUserId=<id>] [--limit=N]

const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { loadExpandedUniverse } = require("../shared/universe-loader.js");

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

const RUN_ID = getArgString("runId");
const PRESET_ID = getArgString("presetId");
const MARKET = getArgString("market").toUpperCase();
const OWNER_USER_ID = getArgString("ownerUserId") || null;
const SYMBOL_LIMIT = getArg("limit", 0);
const MIN_ROWS = 90;
const SIMULATION_WINDOW_ROWS = 504; // ~2 trading years, gives indicator lookback (up to 250 days) room to warm up
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

if (!RUN_ID || !PRESET_ID || (MARKET !== "CN" && MARKET !== "US")) {
  console.error("usage: node run-stock-screen.js --runId=<id> --presetId=<id> --market=CN|US [--limit=N]");
  process.exit(1);
}

async function loadPreset(presetId) {
  const result = await pool.query(`
    SELECT id, label, strategy_type, config FROM strategy_presets WHERE id = $1
  `, [presetId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    label: row.label,
    strategyType: row.strategy_type,
    // rawConfig is stored as-is into stock_screen_runs.preset_config_snapshot so the client's
    // "查看模拟" replay uses the EXACT config that produced each match, even if the preset is
    // later edited — same reasoning as ranking_records.preset_config_snapshot elsewhere.
    rawConfig: row.config && typeof row.config === "object" ? row.config : {},
    ...row.config,
  };
}

async function loadRows(symbol, market) {
  const result = await pool.query(`
    SELECT dp.trade_date, dp.open, dp.high, dp.low, dp.close, dp.volume,
           dv.pe, dv.pe_ttm, dv.pb
    FROM daily_prices dp
    LEFT JOIN daily_valuations dv
      ON dv.symbol = dp.symbol AND dv.market = dp.market AND dv.trade_date = dp.trade_date
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

async function syncRun(patch) {
  const orNull = (value) => (value === undefined ? null : value);
  await pool.query(`
    UPDATE stock_screen_runs SET
      total_symbols = COALESCE($2, total_symbols),
      scanned_symbols = COALESCE($3, scanned_symbols),
      match_count = COALESCE($4, match_count),
      matches = COALESCE($5::jsonb, matches),
      status = COALESCE($6, status),
      error = COALESCE($7, error),
      completed_at = COALESCE($8, completed_at),
      preset_config_snapshot = COALESCE($9::jsonb, preset_config_snapshot)
    WHERE id = $1
  `, [
    RUN_ID,
    orNull(patch.totalSymbols),
    orNull(patch.scannedSymbols),
    orNull(patch.matchCount),
    patch.matches ? JSON.stringify(patch.matches) : null,
    orNull(patch.status),
    orNull(patch.error),
    orNull(patch.completedAt),
    patch.presetConfigSnapshot ? JSON.stringify(patch.presetConfigSnapshot) : null,
  ]);
}

// A matched stock is worth remembering the same way a manually-typed 历史模拟 code is —
// it's what actually made the user look twice, unlike the hundreds of scanned-but-not-matched
// stocks in the same run — so it feeds the same symbol_query_history table server.js's
// recordSymbolQuery uses, keyed the same way ("user:<id>"), which is also what
// loadExpandedUniverse reads back from for future full-market batch jobs.
async function recordMatchedSymbol(code, name) {
  if (!OWNER_USER_ID) return;
  const normalizedCode = String(code || "").trim().toUpperCase().slice(0, 16);
  if (!normalizedCode) return;
  const description = String(name || "").trim().slice(0, 23);
  try {
    await pool.query(`
      INSERT INTO symbol_query_history (owner_key, code, description, last_used_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (owner_key, code) DO UPDATE SET
        description = CASE WHEN EXCLUDED.description <> '' THEN EXCLUDED.description ELSE symbol_query_history.description END,
        last_used_at = NOW()
    `, [`user:${OWNER_USER_ID}`, normalizedCode, description]);
  } catch (error) {
    console.error(`[warn] failed to record matched symbol ${normalizedCode} into history: ${error.message}`);
  }
}

async function main() {
  const preset = await loadPreset(PRESET_ID);
  if (!preset) {
    await syncRun({ status: "crashed", error: "模型不存在或已被删除。", completedAt: new Date().toISOString() });
    await pool.end();
    return;
  }

  const universe = await loadExpandedUniverse(pool);
  let symbols = universe.filter((s) => s.market === MARKET);
  if (SYMBOL_LIMIT > 0) symbols = symbols.slice(0, SYMBOL_LIMIT);
  console.log(`[stock-screen] runId=${RUN_ID} preset=${preset.label} (${preset.strategyType}) market=${MARKET} symbols=${symbols.length}`);

  await syncRun({ totalSymbols: symbols.length, scannedSymbols: 0, matchCount: 0, matches: [], presetConfigSnapshot: preset.rawConfig });

  const baseConfig = engine.buildConfigFromPresetObject(preset, { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: preset.strategyType });
  const matches = [];
  let scanned = 0;
  let dataSkipped = 0;

  for (const symbolEntry of symbols) {
    const dbMarket = symbolEntry.market === "CN"
      ? (/^[569]/.test(symbolEntry.code) ? "1" : "0")
      : "US";

    try {
      const freshness = await ensureFreshData(pool, symbolEntry.code, dbMarket);
      if (freshness.refreshed) {
        console.log(`[refresh] ${symbolEntry.code} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before scanning`);
      }
      const allRows = await loadRows(symbolEntry.code, dbMarket);
      const rows = allRows.slice(-SIMULATION_WINDOW_ROWS);

      if (rows.length < MIN_ROWS) {
        dataSkipped += 1;
        console.log(`[skip-data] ${symbolEntry.code} only has ${rows.length} rows (< ${MIN_ROWS}), skipping`);
        continue;
      }

      engine.setActiveLotSizeSymbol(symbolEntry.code);
      const states = engine.buildBacktestStates(rows, baseConfig);
      const last = states[states.length - 1];
      const lastDate = rows[rows.length - 1].date;
      const todaysTrades = last.trades.filter((trade) => trade.date === lastDate);

      if (todaysTrades.length > 0) {
        for (const trade of todaysTrades) {
          matches.push({
            code: symbolEntry.code,
            name: symbolEntry.name,
            market: symbolEntry.market,
            action: trade.side,
            label: trade.label,
            price: trade.price,
            positionRatio: trade.positionRatio,
            reason: trade.reason || "",
            date: trade.date,
          });
        }
        console.log(`[match] ${symbolEntry.code} ${symbolEntry.name}: ${todaysTrades.map((t) => t.label).join(", ")}`);
        await recordMatchedSymbol(symbolEntry.code, symbolEntry.name);
      }
    } catch (error) {
      console.error(`[error] ${symbolEntry.code}: ${error.message}`);
    } finally {
      scanned += 1;
      await syncRun({ scannedSymbols: scanned, matchCount: matches.length, matches });
    }
  }

  await syncRun({ status: "done", completedAt: new Date().toISOString() });
  console.log(`\n[stock-screen] done. scanned=${scanned} matches=${matches.length} dataSkipped=${dataSkipped}`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  try {
    await syncRun({ status: "crashed", error: error.message || String(error), completedAt: new Date().toISOString() });
  } catch (syncError) {
    console.error("failed to record crash state:", syncError.message);
  }
  process.exit(1);
});
