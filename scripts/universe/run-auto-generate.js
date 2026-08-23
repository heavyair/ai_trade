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
// For each symbol, multiple AI attempts are made (--attemptsPerSymbol) instead of accepting
// whatever the first call produces — each attempt is told what strategyType/approach earlier
// attempts for the SAME symbol already used (see generateModelFromDataProfile's
// previousAttempts param) and is asked to try something structurally different, so the
// attempts are a genuine spread of ideas rather than re-rolls of the same one. Only the
// single best-scoring attempt that beats buy-and-hold on both return and drawdown gets saved
// per symbol — trying several ideas is about raising the chance of finding one good model,
// not about saving every idea that happens to clear the bar.
//
// Usage: node scripts/universe/run-auto-generate.js [--symbols=513100,588000] [--limit=5]
//   [--maxAttempts=20] [--attemptsPerSymbol=5] [--candidates=150] [--minRows=250]

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
const ATTEMPTS_PER_SYMBOL = Math.max(1, getArg("attemptsPerSymbol", 5));
const CANDIDATES_PER_SYMBOL = Math.max(1, getArg("candidates", 150));
const MIN_ROWS = Math.max(30, getArg("minRows", 250));
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
// Whoever triggered this run (the logged-in admin — only admins can reach the trigger
// endpoint) owns the resulting presets, same as any other saved preset in this app. Falls
// back to an ownerless/global preset only if this was invoked by hand without these args.
const OWNER_USER_ID = getArgString("ownerUserId") || null;
const OWNER_EMAIL = getArgString("ownerEmail") || "";
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;

// Live progress, polled by server.js's /api/admin/auto-generate status endpoint so the admin
// panel can show "currently trying model X, attempt N/M" instead of just "running" — same
// file-based reporting convention as server.js's own scan-session-state.json, just owned by
// this script instead of the server (the server never runs the loop itself, only spawns it).
const PROGRESS_FILE = path.join(__dirname, "..", "..", "data", "auto-generate-progress.json");
let progressState = {};
function writeProgress(patch) {
  progressState = { ...progressState, ...patch, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressState));
  } catch (error) {
    // Best-effort only — progress reporting must never take down the actual job.
  }
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

// A CN code is always 6 digits; anything else (NET, QQQ, AMD, ...) is US. Symbols coming
// from --symbols= are whatever the admin picked out of their query history (see
// scripts/shared model-generator's saveGeneratedPreset / server.js symbol_query_history) —
// that pool is much broader than the fixed batch-scan universe list in symbols.json (which
// is just CSI300/Nasdaq100-ish index constituents), so an explicitly-requested symbol must
// never be silently dropped just because it isn't ALSO a universe constituent.
function inferMarket(code) {
  return /^\d{6}$/.test(code) ? "CN" : "US";
}

async function main() {
  let symbols;
  if (SYMBOLS_FILTER.length > 0) {
    symbols = SYMBOLS_FILTER.map((code) => ({ code, market: inferMarket(code), name: code }));
  } else {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "symbols.json"), "utf8"));
    symbols = manifest.symbols;
  }
  if (SYMBOL_LIMIT > 0) symbols = symbols.slice(0, SYMBOL_LIMIT);

  console.log(`symbols=${symbols.length} maxAttempts=${MAX_ATTEMPTS} attemptsPerSymbol=${ATTEMPTS_PER_SYMBOL} candidatesPerSymbol=${CANDIDATES_PER_SYMBOL} minRows=${MIN_ROWS}`);
  if (symbols.length === 0) {
    console.log("[warn] no symbols to process (empty --symbols list or empty universe manifest) — exiting without doing anything.");
  }

  let aiCalls = 0;
  let saved = 0;
  let rejected = 0;
  let dataSkipped = 0;
  let errored = 0;
  let budgetExhausted = false;

  writeProgress({
    status: "running",
    totalSymbols: symbols.length,
    symbolIndex: 0,
    currentSymbol: null,
    attempt: 0,
    attemptsPerSymbol: ATTEMPTS_PER_SYMBOL,
    currentStrategyType: null,
    currentReason: null,
    maxAttempts: MAX_ATTEMPTS,
    aiCalls: 0,
    saved: 0,
    rejected: 0,
  });

  let symbolIndex = 0;
  for (const symbolEntry of symbols) {
    if (budgetExhausted) break;
    symbolIndex += 1;
    writeProgress({ symbolIndex, currentSymbol: symbolEntry.code, attempt: 0, currentStrategyType: null, currentReason: null });

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
        writeProgress({ dataSkipped, currentReason: `历史数据不足（${rows.length} 行 < ${MIN_ROWS}），跳过` });
        continue;
      }

      const profile = ModelGenerator.buildSymbolDataProfile(rows);
      console.log(`[${symbolEntry.code}] profile: return=${profile.totalReturnPercent}% vol=${profile.annualizedVolatilityPercent}% maxDD=${profile.maxDrawdownPercent}%`);

      engine.setActiveLotSizeSymbol(symbolEntry.code);
      const buyHoldStates = engine.buildBuyHoldStates(rows, INITIAL_CASH, TRADE_FEE);
      const buyHold = buyHoldStates[buyHoldStates.length - 1];

      const previousAttempts = [];
      let bestQualifying = null; // { model, best } — highest-scoring attempt that beat buy-hold on both dims
      let attemptedAny = false;

      for (let attempt = 0; attempt < ATTEMPTS_PER_SYMBOL; attempt += 1) {
        if (aiCalls >= MAX_ATTEMPTS) {
          console.log(`[budget] reached --maxAttempts=${MAX_ATTEMPTS} AI calls, stopping`);
          budgetExhausted = true;
          break;
        }

        writeProgress({ attempt: attempt + 1, currentStrategyType: null, currentReason: "AI 正在分析数据、设计模型…" });
        aiCalls += 1;
        let model;
        try {
          model = await ModelGenerator.generateModelFromDataProfile(profile, symbolEntry.code, previousAttempts);
        } catch (aiError) {
          console.error(`[ai-error] ${symbolEntry.code} attempt ${attempt + 1}: ${aiError.message}`);
          errored += 1;
          writeProgress({ aiCalls, errored });
          continue;
        }
        attemptedAny = true;
        previousAttempts.push({ strategyType: model.strategyType, reason: model.reason });
        writeProgress({
          aiCalls,
          currentStrategyType: model.strategyType,
          currentReason: String(model.reason || "").slice(0, 120),
        });

        if (!modelHasRules(model)) {
          console.log(`[empty-model] ${symbolEntry.code} attempt ${attempt + 1}: AI output had no usable rules after validation (strategyType=${model.strategyType}), skipping`);
          continue;
        }

        const baseConfig = { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: model.strategyType };
        const best = searchBestConfig(engine, model, rows, baseConfig, CANDIDATES_PER_SYMBOL);
        if (!best) {
          console.log(`[no-candidate] ${symbolEntry.code} attempt ${attempt + 1}: parameter search produced no valid backtest`);
          continue;
        }

        const beatsReturn = best.last.returnRate > buyHold.returnRate;
        const beatsDrawdown = best.last.maxDrawdown < buyHold.maxDrawdown;
        console.log(`[${symbolEntry.code}] attempt ${attempt + 1}/${ATTEMPTS_PER_SYMBOL} strategyType=${model.strategyType} best=${best.last.returnRate.toFixed(1)}%/dd${best.last.maxDrawdown.toFixed(1)}% vs buyHold=${buyHold.returnRate.toFixed(1)}%/dd${buyHold.maxDrawdown.toFixed(1)}% beatsReturn=${beatsReturn} beatsDrawdown=${beatsDrawdown}`);
        writeProgress({
          currentReason: `${model.strategyType}：回测 ${best.last.returnRate.toFixed(1)}%/回撤${best.last.maxDrawdown.toFixed(1)}%，买入持有 ${buyHold.returnRate.toFixed(1)}%/回撤${buyHold.maxDrawdown.toFixed(1)}% → ${beatsReturn && beatsDrawdown ? "跑赢，候选" : "未跑赢"}`,
        });

        if (beatsReturn && beatsDrawdown && (!bestQualifying || best.score > bestQualifying.best.score)) {
          bestQualifying = { model, best };
        }
      }

      if (bestQualifying) {
        const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const name = `ai_auto_${symbolEntry.code}_${dateSlug}`;
        const label = `AI自动·${symbolEntry.code}·${dateSlug}`;
        const presetId = await ModelGenerator.saveGeneratedPreset(pool, {
          name,
          config: bestQualifying.best.config,
          label,
          targetSymbol: symbolEntry.code,
          originalText: bestQualifying.model.reason || "",
          ownerUserId: OWNER_USER_ID,
          ownerEmail: OWNER_EMAIL,
        });
        console.log(`[saved] ${symbolEntry.code}: ${presetId} (${label}, best of ${previousAttempts.length} attempts, strategyType=${bestQualifying.model.strategyType})`);
        saved += 1;
        writeProgress({ saved, currentReason: `已保存：${label}（${bestQualifying.model.strategyType}）` });
      } else if (attemptedAny) {
        console.log(`[rejected] ${symbolEntry.code}: none of ${previousAttempts.length} attempts beat buy-hold on both return and drawdown`);
        rejected += 1;
        writeProgress({ rejected, currentReason: `${previousAttempts.length} 次尝试都没有跑赢买入持有，未保存` });
      }
    } catch (error) {
      console.error(`[error] ${symbolEntry.code}: ${error.message}`);
      errored += 1;
      writeProgress({ errored });
    }
  }

  console.log(`\ndone. aiCalls=${aiCalls} saved=${saved} rejected(didn't beat buy-hold)=${rejected} skipped(insufficient data)=${dataSkipped} errored=${errored}`);
  writeProgress({
    status: "done",
    currentSymbol: null,
    currentStrategyType: null,
    currentReason: `完成：共处理 ${symbolIndex}/${symbols.length} 个标的，AI调用${aiCalls}次，保存${saved}个，未跑赢${rejected}个，数据不足跳过${dataSkipped}个，出错${errored}个。`,
  });
  await pool.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
