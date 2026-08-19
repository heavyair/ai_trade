// Batch parameter-optimization scan: for every symbol in universe/symbols.json and every
// currently-active (non-hidden) saved strategy preset, re-optimizes that preset's own
// parameters against that symbol's 5-year history (using engine.js, the same engine the
// live app uses) and records the best-found config, ranked by return rate / max drawdown,
// into the optimization_scan_results table.
//
// This is intentionally decoupled from server.js/app.js: it reads directly from the
// symbols/daily_prices/strategy_presets tables that already exist for the live app, and
// owns its own results table, so it can't affect the live site's request-handling code path.
//
// Long-running (candidate count x symbol count x preset count). Meant to run detached in
// the background and be safely re-run/resumed: each (symbol, preset) result is upserted,
// and already-scanned pairs are skipped unless --rescan is passed.
//
// Usage: node scripts/universe/run-optimization-scan.js [--candidates=300] [--minRows=250] [--rescan] [--presetIds=id1,id2]
//   --presetIds restricts the scan to specific (already-active) preset IDs, e.g. for an
//   admin-triggered "rescan just this model" run instead of the full active set.

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");

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
const CANDIDATES_PER_PAIR = Math.max(1, getArg("candidates", 300));
const MIN_ROWS = Math.max(30, getArg("minRows", 250));
const SYMBOL_LIMIT = getArg("limit", 0);
const RESCAN = args.includes("--rescan");
const PRESET_IDS_FILTER = getArgString("presetIds").split(",").map((s) => s.trim()).filter(Boolean);
// When resuming a --rescan run that crashed partway through, pass the ORIGINAL session's
// start time here so pairs already redone since then are skipped instead of redone again
// (plain --rescan with no session marker always redoes everything, since a fresh rescan
// is supposed to override every existing row regardless of age).
const SESSION_SINCE = getArgString("sessionSince") || null;
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

async function ensureResultsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS optimization_scan_results (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      symbol_name TEXT NOT NULL DEFAULT '',
      preset_id TEXT NOT NULL,
      preset_label TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      rows_tested INTEGER NOT NULL DEFAULT 0,
      baseline_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      baseline_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      best_trades INTEGER NOT NULL DEFAULT 0,
      tested_candidates INTEGER NOT NULL DEFAULT 0,
      best_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      buy_hold_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(symbol, market, preset_id)
    );
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS buy_hold_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE optimization_scan_results ADD COLUMN IF NOT EXISTS buy_hold_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0;
  `);
}

// Source of truth for "which presets does the batch scan test" is the explicit,
// admin-curated optimization_scan_representatives table — not a heuristic guess. See
// that table's comment in server.js's schema init for why the earlier "most recently
// updated wins" heuristic was replaced.
async function loadActivePresets() {
  const result = await pool.query(`
    SELECT sp.id, sp.name, sp.label, sp.strategy_type, sp.config, sp.meta, sp.updated_at
    FROM optimization_scan_representatives r
    JOIN strategy_presets sp ON sp.id = r.model_id
    WHERE sp.hidden_at IS NULL
    ORDER BY sp.strategy_type, sp.name
  `);
  return result.rows.map((row) => ({
    id: row.id,
    label: row.label,
    strategyType: row.strategy_type,
    updatedAt: row.updated_at,
    ...row.config,
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

function buildCandidates(preset, descriptors, baseConfig) {
  const candidates = [];
  if (descriptors.length === 0) {
    candidates.push(engine.buildConfigFromDescriptorCombo(baseConfig, preset, preset.strategyType, descriptors, []));
    return candidates;
  }
  const valueLists = descriptors.map((d) => engine.buildRangeValues(d));
  const totalCombinations = valueLists.reduce((acc, list) => acc * Math.max(1, list.length), 1);
  if (totalCombinations <= CANDIDATES_PER_PAIR) {
    let combos = [[]];
    valueLists.forEach((values) => {
      const next = [];
      combos.forEach((combo) => values.forEach((v) => next.push([...combo, v])));
      combos = next;
    });
    combos.forEach((combo) => candidates.push(engine.buildConfigFromDescriptorCombo(baseConfig, preset, preset.strategyType, descriptors, combo)));
  } else {
    for (let i = 0; i < CANDIDATES_PER_PAIR; i += 1) {
      const combo = valueLists.map((values) => values[Math.floor(Math.random() * values.length)]);
      candidates.push(engine.buildConfigFromDescriptorCombo(baseConfig, preset, preset.strategyType, descriptors, combo));
    }
  }
  return candidates;
}

async function alreadyScanned(symbol, market, presetId) {
  if (!RESCAN) {
    const result = await pool.query(
      "SELECT 1 FROM optimization_scan_results WHERE symbol = $1 AND market = $2 AND preset_id = $3",
      [symbol, market, presetId]
    );
    return result.rowCount > 0;
  }
  if (!SESSION_SINCE) return false;
  // Resuming: only skip a pair if it was already redone since THIS rescan session
  // started, not merely because a (possibly stale/pre-fix) row exists from earlier.
  const result = await pool.query(
    "SELECT 1 FROM optimization_scan_results WHERE symbol = $1 AND market = $2 AND preset_id = $3 AND scanned_at >= $4",
    [symbol, market, presetId, SESSION_SINCE]
  );
  return result.rowCount > 0;
}

async function saveResult(row) {
  const id = `scan_${row.symbol}_${row.market}_${row.presetId}`.replace(/[^a-zA-Z0-9_]/g, "_");
  await pool.query(`
    INSERT INTO optimization_scan_results (
      id, symbol, market, symbol_name, preset_id, preset_label, strategy_type, rows_tested,
      baseline_return_rate, baseline_max_drawdown, best_return_rate, best_max_drawdown,
      best_score, best_trades, tested_candidates, best_config,
      buy_hold_return_rate, buy_hold_max_drawdown, scanned_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,NOW())
    ON CONFLICT (symbol, market, preset_id) DO UPDATE SET
      symbol_name = EXCLUDED.symbol_name,
      preset_label = EXCLUDED.preset_label,
      rows_tested = EXCLUDED.rows_tested,
      baseline_return_rate = EXCLUDED.baseline_return_rate,
      baseline_max_drawdown = EXCLUDED.baseline_max_drawdown,
      best_return_rate = EXCLUDED.best_return_rate,
      best_max_drawdown = EXCLUDED.best_max_drawdown,
      best_score = EXCLUDED.best_score,
      best_trades = EXCLUDED.best_trades,
      tested_candidates = EXCLUDED.tested_candidates,
      best_config = EXCLUDED.best_config,
      buy_hold_return_rate = EXCLUDED.buy_hold_return_rate,
      buy_hold_max_drawdown = EXCLUDED.buy_hold_max_drawdown,
      scanned_at = NOW()
  `, [
    id, row.symbol, row.market, row.symbolName, row.presetId, row.presetLabel, row.strategyType, row.rowsTested,
    row.baselineReturnRate, row.baselineMaxDrawdown, row.bestReturnRate, row.bestMaxDrawdown,
    row.bestScore, row.bestTrades, row.testedCandidates, JSON.stringify(row.bestConfig),
    row.buyHoldReturnRate, row.buyHoldMaxDrawdown,
  ]);
}

async function main() {
  await ensureResultsTable();

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "symbols.json"), "utf8"));
  const symbols = SYMBOL_LIMIT > 0 ? manifest.symbols.slice(0, SYMBOL_LIMIT) : manifest.symbols;
  const presetIdFilterSet = PRESET_IDS_FILTER.length > 0 ? new Set(PRESET_IDS_FILTER) : null;
  const presets = (await loadActivePresets()).filter((p) => !presetIdFilterSet || presetIdFilterSet.has(p.id));
  console.log(`symbols=${symbols.length} active presets=${presets.length} candidatesPerPair=${CANDIDATES_PER_PAIR} minRows=${MIN_ROWS} rescan=${RESCAN}${presetIdFilterSet ? ` presetFilter=${PRESET_IDS_FILTER.join(",")}` : ""}`);
  presets.forEach((p) => console.log(`  preset: ${p.label} (${p.strategyType}) id=${p.id}`));

  const rowsCache = new Map();
  const buyHoldCache = new Map();
  let pairIndex = 0;
  let skipped = 0;
  let dataSkipped = 0;
  const totalPairs = symbols.length * presets.length;

  for (const symbolEntry of symbols) {
    const dbMarket = symbolEntry.market === "CN"
      ? (/^[569]/.test(symbolEntry.code) ? "1" : "0")
      : "US";

    // A transient DB hiccup here (or anywhere per-symbol, before the per-pair try/catch
    // below even starts) would otherwise be an uncaught rejection that kills the whole
    // process — catch it, skip this one symbol, and keep going instead of crashing a
    // multi-hour run over what's usually a momentary connection blip.
    let rows;
    let buyHold;
    try {
      rows = rowsCache.get(`${symbolEntry.code}:${dbMarket}`);
      if (rows === undefined) {
        rows = await loadRows(symbolEntry.code, dbMarket);
        rowsCache.set(`${symbolEntry.code}:${dbMarket}`, rows);
      }

      if (rows.length < MIN_ROWS) {
        dataSkipped += presets.length;
        pairIndex += presets.length;
        console.log(`[skip-data] ${symbolEntry.code} only has ${rows.length} rows (< ${MIN_ROWS}), skipping all presets`);
        continue;
      }

      buyHold = buyHoldCache.get(`${symbolEntry.code}:${dbMarket}`);
      if (buyHold === undefined) {
        const buyHoldStates = engine.buildBuyHoldStates(rows, INITIAL_CASH, TRADE_FEE);
        buyHold = buyHoldStates[buyHoldStates.length - 1];
        buyHoldCache.set(`${symbolEntry.code}:${dbMarket}`, buyHold);
      }
    } catch (error) {
      console.error(`[error] loading ${symbolEntry.code}: ${error.message}`);
      pairIndex += presets.length;
      continue;
    }

    engine.setActiveLotSizeSymbol(symbolEntry.code);
    const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: "wave" };

    for (const preset of presets) {
      pairIndex += 1;

      try {
        if (await alreadyScanned(symbolEntry.code, dbMarket, preset.id)) {
          skipped += 1;
          continue;
        }

        const config0 = engine.buildConfigFromPresetObject(preset, { ...baseConfig, strategyType: preset.strategyType });
        const baselineStates = engine.buildBacktestStates(rows, config0);
        const baselineLast = baselineStates[baselineStates.length - 1];

        const descriptors = engine.discoverOptimizationParameters(preset);
        const candidates = buildCandidates(preset, descriptors, { ...baseConfig, strategyType: preset.strategyType });

        let best = null;
        let bestScore = -Infinity;
        for (const candidateConfig of candidates) {
          const states = engine.buildBacktestStates(rows, candidateConfig);
          const last = states[states.length - 1];
          const score = engine.scoreBacktestState(last);
          if (score > bestScore) {
            bestScore = score;
            best = { config: candidateConfig, last };
          }
        }

        await saveResult({
          symbol: symbolEntry.code,
          market: dbMarket,
          symbolName: symbolEntry.name,
          presetId: preset.id,
          presetLabel: preset.label,
          strategyType: preset.strategyType,
          rowsTested: rows.length,
          baselineReturnRate: baselineLast.returnRate,
          baselineMaxDrawdown: baselineLast.maxDrawdown,
          bestReturnRate: best.last.returnRate,
          bestMaxDrawdown: best.last.maxDrawdown,
          bestScore,
          bestTrades: best.last.trades.length,
          testedCandidates: candidates.length,
          bestConfig: best.config,
          buyHoldReturnRate: buyHold.returnRate,
          buyHoldMaxDrawdown: buyHold.maxDrawdown,
        });

        if (pairIndex % 20 === 0 || pairIndex === totalPairs) {
          console.log(`[${pairIndex}/${totalPairs}] ${symbolEntry.code} x ${preset.label}: baseline=${baselineLast.returnRate.toFixed(1)}% best=${best.last.returnRate.toFixed(1)}% dd=${best.last.maxDrawdown.toFixed(1)}%`);
        }
      } catch (error) {
        console.error(`[error] ${symbolEntry.code} x ${preset.label}: ${error.message}`);
      }
    }
  }

  console.log(`\ndone. total pairs=${totalPairs} skipped(already scanned)=${skipped} skipped(insufficient data)=${dataSkipped}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
