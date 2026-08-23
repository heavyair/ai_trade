// Autonomous "AI looks at a symbol's own price history, proposes a timing model, the model
// gets parameter-optimized, and if the best-found config beats buy-and-hold on BOTH return
// rate and max drawdown, it gets saved as a real preset" pipeline.
//
// This is deliberately NOT the same as generateModelFromDescription (server.js's interactive
// "生成安全模型" — a human-typed description, no data). Here the AI never sees a human
// description at all; it only sees buildSymbolDataProfile's statistical digest of the
// symbol's actual history (see scripts/shared/model-generator.js), and is asked to design
// something suited to what that data looks like.
//
// Same conventions as the other scripts/universe/*.js batch jobs: standalone Pool, own
// DATABASE_URL env resolution, per-symbol try/catch so one bad symbol doesn't kill the run.
// The one thing that's NEW here versus those scripts: generateModelFromDataProfile costs
// real API money per call, and (unlike server.js's interactive endpoint) there is currently
// no rate limiting on it anywhere — so --maxAttempts is a hard stop on AI call count,
// independent of how many symbols are left to process.
//
// Usage: node scripts/universe/run-auto-generate.js [--symbols=513100,588000] [--limit=5]
//   [--maxAttempts=20] [--candidates=150] [--minRows=250]

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { searchBestConfig } = require("./search-best-config.js");
const ModelGenerator = require("../shared/model-generator.js");

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
const SYMBOL_LIMIT = Math.max(0, getArg("limit", 0));
const MAX_ATTEMPTS = Math.max(1, getArg("maxAttempts", 20));
const CANDIDATES_PER_SYMBOL = Math.max(1, getArg("candidates", 150));
const MIN_ROWS = Math.max(30, getArg("minRows", 250));
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

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

// The AI can still hand back a syntactically-valid-but-empty skeleton (e.g. every condition
// it proposed got filtered out by normalizeGeneratedModel for using a disallowed field) —
// this catches that before wasting a parameter search on a model with nothing to optimize.
function modelHasRules(model) {
  if (model.strategyType === "block-rules") return model.buyBlockRules.length > 0 || model.sellBlockRules.length > 0;
  if (model.strategyType === "score-rules") return model.scoreRules.length > 0 && model.positionBands.length > 0;
  if (model.strategyType === "wave") return model.buyRules.length > 0 || model.sellRules.length > 0;
  const ruleKeyByType = {
    "local-high-ladder": "localLadderRule",
    "ma-rsi-band": "maRsiBandRule",
    "order-grid": "orderGridRule",
    "pe-volume": "peVolumeRule",
    "stagnation-reversal": "stagnationReversalRule",
  };
  const key = ruleKeyByType[model.strategyType];
  return key ? Boolean(model[key]) : true;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "symbols.json"), "utf8"));
  let symbols = manifest.symbols;
  if (SYMBOLS_FILTER.length > 0) {
    const filterSet = new Set(SYMBOLS_FILTER);
    symbols = symbols.filter((s) => filterSet.has(s.code));
  }
  if (SYMBOL_LIMIT > 0) symbols = symbols.slice(0, SYMBOL_LIMIT);

  console.log(`symbols=${symbols.length} maxAttempts=${MAX_ATTEMPTS} candidatesPerSymbol=${CANDIDATES_PER_SYMBOL} minRows=${MIN_ROWS}`);

  let aiCalls = 0;
  let saved = 0;
  let rejected = 0;
  let dataSkipped = 0;
  let errored = 0;

  for (const symbolEntry of symbols) {
    if (aiCalls >= MAX_ATTEMPTS) {
      console.log(`[budget] reached --maxAttempts=${MAX_ATTEMPTS} AI calls, stopping (${symbols.length - symbols.indexOf(symbolEntry)} symbols not attempted)`);
      break;
    }

    const dbMarket = symbolEntry.market === "CN"
      ? (/^[569]/.test(symbolEntry.code) ? "1" : "0")
      : "US";

    try {
      const freshness = await ensureFreshData(pool, symbolEntry.code, dbMarket);
      if (freshness.refreshed) {
        console.log(`[refresh] ${symbolEntry.code} history was stale (last stored: ${freshness.lastDate || "none"}), refreshed before generating`);
      }
      const rows = await loadRows(symbolEntry.code, dbMarket);
      if (rows.length < MIN_ROWS) {
        console.log(`[skip-data] ${symbolEntry.code} only has ${rows.length} rows (< ${MIN_ROWS})`);
        dataSkipped += 1;
        continue;
      }

      const profile = ModelGenerator.buildSymbolDataProfile(rows);
      console.log(`[${symbolEntry.code}] profile: return=${profile.totalReturnPercent}% vol=${profile.annualizedVolatilityPercent}% maxDD=${profile.maxDrawdownPercent}%`);

      aiCalls += 1;
      let model;
      try {
        model = await ModelGenerator.generateModelFromDataProfile(profile, symbolEntry.code);
      } catch (aiError) {
        console.error(`[ai-error] ${symbolEntry.code}: ${aiError.message}`);
        errored += 1;
        continue;
      }

      if (!modelHasRules(model)) {
        console.log(`[empty-model] ${symbolEntry.code}: AI output had no usable rules after validation (strategyType=${model.strategyType}), skipping`);
        rejected += 1;
        continue;
      }

      engine.setActiveLotSizeSymbol(symbolEntry.code);
      const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: model.strategyType };
      const best = searchBestConfig(engine, model, rows, baseConfig, CANDIDATES_PER_SYMBOL);
      if (!best) {
        console.log(`[no-candidate] ${symbolEntry.code}: parameter search produced no valid backtest`);
        rejected += 1;
        continue;
      }

      const buyHoldStates = engine.buildBuyHoldStates(rows, INITIAL_CASH, TRADE_FEE);
      const buyHold = buyHoldStates[buyHoldStates.length - 1];

      const beatsReturn = best.last.returnRate > buyHold.returnRate;
      const beatsDrawdown = best.last.maxDrawdown < buyHold.maxDrawdown;
      console.log(`[${symbolEntry.code}] strategyType=${model.strategyType} best=${best.last.returnRate.toFixed(1)}%/dd${best.last.maxDrawdown.toFixed(1)}% vs buyHold=${buyHold.returnRate.toFixed(1)}%/dd${buyHold.maxDrawdown.toFixed(1)}% beatsReturn=${beatsReturn} beatsDrawdown=${beatsDrawdown}`);

      if (!beatsReturn || !beatsDrawdown) {
        rejected += 1;
        continue;
      }

      const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const name = `ai_auto_${symbolEntry.code}_${dateSlug}`;
      const label = `AI自动·${symbolEntry.code}·${dateSlug}`;
      const presetId = await ModelGenerator.saveGeneratedPreset(pool, {
        name,
        config: best.config,
        label,
        targetSymbol: symbolEntry.code,
        originalText: model.reason || "",
      });
      console.log(`[saved] ${symbolEntry.code}: ${presetId} (${label})`);
      saved += 1;
    } catch (error) {
      console.error(`[error] ${symbolEntry.code}: ${error.message}`);
      errored += 1;
    }
  }

  console.log(`\ndone. aiCalls=${aiCalls} saved=${saved} rejected(didn't beat buy-hold)=${rejected} skipped(insufficient data)=${dataSkipped} errored=${errored}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
