// Universe-wide robustness validation: takes every (preset, origin symbol) row from
// optimization_scan_results that clears the same buy-hold-ceiling / best-return-floor bar
// the admin "后台模型排行" filter already uses, and re-runs that row's best_config AS-IS
// (no further parameter search) against every OTHER symbol IN THE SAME MARKET (A股 configs
// only get tested against other A股 stocks, US configs only against other US stocks — the
// two markets differ enough in price/volume scale, lot-size rules, and volatility regime
// that cross-market results wouldn't say anything about overfitting, just about market
// mismatch) in universe/symbols.json, to see whether a config that looked great on the one
// stock it was optimized for actually generalizes — or was just overfit to that stock's
// specific history.
//
// Raw per-(candidate, target symbol) results are stored so the admin UI can freely change
// the "what counts as profitable" threshold at read time (a SQL aggregation) without ever
// needing to re-run this (expensive) batch job.
//
// Long-running (candidate count x symbol count, one simulation per pair — no parameter
// search). Meant to run detached in the background and be safely re-run/resumed: each
// (source_scan_result_id, target symbol) result is upserted, and already-validated pairs
// are skipped unless --rescan is passed.
//
// Usage: node scripts/universe/run-universe-validation.js [--buyHoldMax=50] [--bestReturnMin=100] [--minRows=250] [--rescan] [--limit=20]

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");

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
const BUY_HOLD_MAX = getArg("buyHoldMax", 50);
const BEST_RETURN_MIN = getArg("bestReturnMin", 100);
const MIN_ROWS = Math.max(30, getArg("minRows", 250));
const CANDIDATE_LIMIT = getArg("limit", 0); // debug: cap how many candidates run this pass
const RESCAN = args.includes("--rescan");
// Same resume semantics as run-optimization-scan.js's SESSION_SINCE: resuming a crashed
// --rescan run only skips pairs redone since THIS session started, not merely because a
// (possibly stale) row already exists.
const SESSION_SINCE = getArgString("sessionSince") || null;
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

async function ensureResultsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS universe_validation_results (
      id TEXT PRIMARY KEY,
      source_scan_result_id TEXT NOT NULL REFERENCES optimization_scan_results(id) ON DELETE CASCADE,
      preset_id TEXT NOT NULL,
      preset_label TEXT NOT NULL,
      origin_symbol TEXT NOT NULL,
      origin_market TEXT NOT NULL,
      target_symbol TEXT NOT NULL,
      target_market TEXT NOT NULL,
      target_symbol_name TEXT NOT NULL DEFAULT '',
      return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      trades INTEGER NOT NULL DEFAULT 0,
      validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(source_scan_result_id, target_symbol, target_market)
    );
  `);
}

async function loadCandidates() {
  const result = await pool.query(`
    SELECT id, symbol, market, preset_id, preset_label, strategy_type, best_config
    FROM optimization_scan_results
    WHERE buy_hold_return_rate <= $1 AND best_return_rate >= $2
    ORDER BY preset_id, symbol
  `, [BUY_HOLD_MAX, BEST_RETURN_MIN]);
  return result.rows.map((row) => ({
    id: row.id,
    originSymbol: row.symbol,
    originMarket: row.market,
    presetId: row.preset_id,
    presetLabel: row.preset_label,
    strategyType: row.strategy_type,
    config: row.best_config && typeof row.best_config === "object" ? row.best_config : {},
  }));
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

async function alreadyValidated(sourceScanResultId, targetSymbol, targetMarket) {
  if (!RESCAN) {
    const result = await pool.query(
      "SELECT 1 FROM universe_validation_results WHERE source_scan_result_id = $1 AND target_symbol = $2 AND target_market = $3",
      [sourceScanResultId, targetSymbol, targetMarket]
    );
    return result.rowCount > 0;
  }
  if (!SESSION_SINCE) return false;
  const result = await pool.query(
    "SELECT 1 FROM universe_validation_results WHERE source_scan_result_id = $1 AND target_symbol = $2 AND target_market = $3 AND validated_at >= $4",
    [sourceScanResultId, targetSymbol, targetMarket, SESSION_SINCE]
  );
  return result.rowCount > 0;
}

async function saveResult(row) {
  const id = `uv_${row.sourceScanResultId}_${row.targetSymbol}_${row.targetMarket}`.replace(/[^a-zA-Z0-9_]/g, "_");
  await pool.query(`
    INSERT INTO universe_validation_results (
      id, source_scan_result_id, preset_id, preset_label, origin_symbol, origin_market,
      target_symbol, target_market, target_symbol_name, return_rate, max_drawdown, trades, validated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
    ON CONFLICT (source_scan_result_id, target_symbol, target_market) DO UPDATE SET
      target_symbol_name = EXCLUDED.target_symbol_name,
      return_rate = EXCLUDED.return_rate,
      max_drawdown = EXCLUDED.max_drawdown,
      trades = EXCLUDED.trades,
      validated_at = NOW()
  `, [
    id, row.sourceScanResultId, row.presetId, row.presetLabel, row.originSymbol, row.originMarket,
    row.targetSymbol, row.targetMarket, row.targetSymbolName, row.returnRate, row.maxDrawdown, row.trades,
  ]);
}

async function main() {
  await ensureResultsTable();

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "symbols.json"), "utf8"));
  const symbols = manifest.symbols.map((entry) => ({
    ...entry,
    dbMarket: entry.market === "CN" ? (/^[569]/.test(entry.code) ? "1" : "0") : "US",
  }));

  let candidates = await loadCandidates();
  if (CANDIDATE_LIMIT > 0) candidates = candidates.slice(0, CANDIDATE_LIMIT);
  console.log(`candidates=${candidates.length} (buyHoldMax=${BUY_HOLD_MAX}, bestReturnMin=${BEST_RETURN_MIN}) universeSymbols=${symbols.length} minRows=${MIN_ROWS} rescan=${RESCAN}`);

  const rowsCache = new Map();
  let pairIndex = 0;
  let skipped = 0;
  let dataSkipped = 0;
  const totalPairs = candidates.length * symbols.length;

  // "0"/"1" are Shenzhen/Shanghai A股 — both count as the same market group; "US" is its
  // own group. Only compare within the same group (see file-header comment for why).
  const marketGroup = (dbMarket) => (dbMarket === "US" ? "US" : "CN");

  for (const candidate of candidates) {
    engine.setActiveLotSizeSymbol(candidate.originSymbol);
    const originGroup = marketGroup(candidate.originMarket);

    for (const symbolEntry of symbols) {
      if (marketGroup(symbolEntry.dbMarket) !== originGroup) continue;
      // Excluded: testing a config against the very stock it was optimized for would
      // trivially inflate its pass rate with a non-generalizing data point.
      if (symbolEntry.code === candidate.originSymbol && symbolEntry.dbMarket === candidate.originMarket) continue;

      pairIndex += 1;

      try {
        if (await alreadyValidated(candidate.id, symbolEntry.code, symbolEntry.dbMarket)) {
          skipped += 1;
          continue;
        }

        let rows = rowsCache.get(`${symbolEntry.code}:${symbolEntry.dbMarket}`);
        if (rows === undefined) {
          const freshness = await ensureFreshData(pool, symbolEntry.code, symbolEntry.dbMarket);
          if (freshness.refreshed) {
            console.log(`[refresh] ${symbolEntry.code} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before validating`);
          }
          rows = await loadRows(symbolEntry.code, symbolEntry.dbMarket);
          rowsCache.set(`${symbolEntry.code}:${symbolEntry.dbMarket}`, rows);
        }
        if (rows.length < MIN_ROWS) {
          dataSkipped += 1;
          continue;
        }

        const config = { ...candidate.config, initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: candidate.strategyType };
        const states = engine.buildBacktestStates(rows, config);
        const last = states[states.length - 1];

        await saveResult({
          sourceScanResultId: candidate.id,
          presetId: candidate.presetId,
          presetLabel: candidate.presetLabel,
          originSymbol: candidate.originSymbol,
          originMarket: candidate.originMarket,
          targetSymbol: symbolEntry.code,
          targetMarket: symbolEntry.dbMarket,
          targetSymbolName: symbolEntry.name,
          returnRate: last.returnRate,
          maxDrawdown: last.maxDrawdown,
          trades: last.trades.length,
        });

        if (pairIndex % 200 === 0 || pairIndex === totalPairs) {
          console.log(`[${pairIndex}/${totalPairs}] ${candidate.presetLabel} (from ${candidate.originSymbol}) x ${symbolEntry.code}: return=${last.returnRate.toFixed(1)}%`);
        }
      } catch (error) {
        console.error(`[error] ${candidate.presetLabel} (from ${candidate.originSymbol}) x ${symbolEntry.code}: ${error.message}`);
      }
    }
  }

  console.log(`\ndone. total pairs=${totalPairs} skipped(already validated)=${skipped} skipped(insufficient data)=${dataSkipped}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
