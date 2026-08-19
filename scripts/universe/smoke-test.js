// Sanity-checks engine.js against real production data before trusting it for a
// full universe scan: fetches one symbol's rows via the local API, runs a backtest
// for a hand-built config of every strategy type plus one preset's real optimization
// pipeline, and prints results for eyeball inspection (finite numbers, plausible
// trade counts, no thrown errors).

const http = require("http");
const engine = require("./engine.js");

const BASE_URL = process.env.AI_TRADE_BASE_URL || "http://127.0.0.1:3000";
const CODE = process.argv[2] || "600519";

function fetchJson(pathAndQuery) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathAndQuery, BASE_URL);
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
  });
}

function assertFinite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} is not finite: ${value}`);
}

async function main() {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 5);
  const data = await fetchJson(`/api/klines?code=${CODE}&start=${start.toISOString().slice(0, 10)}&end=${end}`);
  const rows = data.rows.filter((r) => Number.isFinite(r.open) && Number.isFinite(r.close) && r.close > 0);
  console.log(`symbol=${CODE} rows=${rows.length} source=${data.source}`);

  engine.setActiveLotSizeSymbol(CODE);

  // Moutai-class stocks trade near/above 1000 RMB/share; with a 100-share minimum lot
  // that's a ~100k+ RMB minimum ticket, so a small initialCash can round every buy down
  // to 0 shares and produce a spuriously "flat" backtest. Use a larger account so the
  // smoke test can actually exercise the lot-size-aware trade primitives.
  const baseConfig = { initialCash: 2000000, tradeFee: 5 };

  const presetsToTest = [
    {
      label: "wave",
      preset: {
        strategyType: "wave",
        waveThreshold: 15,
        buyRules: [{ enabled: true, drop: 5, target: 40 }, { enabled: true, drop: 10, target: 70 }, { enabled: true, drop: 15, target: 100 }],
        sellRules: [{ enabled: true, rise: 20, reduce: 50 }, { enabled: true, rise: 40, reduce: 100 }],
        noNewHighExitRule: { enabled: false },
      },
    },
    { label: "local-high-ladder", preset: { strategyType: "local-high-ladder", localLadderRule: engine.defaultLocalLadderRule } },
    { label: "ma-rsi-band", preset: { strategyType: "ma-rsi-band", maRsiBandRule: engine.defaultMaRsiBandRule } },
    { label: "order-grid", preset: { strategyType: "order-grid", orderGridRule: engine.defaultOrderGridRule } },
    { label: "pe-volume", preset: { strategyType: "pe-volume", peVolumeRule: engine.defaultPeVolumeRule } },
    { label: "stagnation-reversal", preset: { strategyType: "stagnation-reversal", stagnationReversalRule: engine.defaultStagnationReversalRule } },
    {
      label: "block-rules",
      preset: {
        strategyType: "block-rules",
        buyBlockRules: [{ enabled: true, conditions: [{ indicator: "drawdownFromHigh", lookbackDays: 60, comparator: ">", value: 15 }], action: { type: "targetPercent", value: 60 } }],
        sellBlockRules: [{ enabled: true, conditions: [{ indicator: "riseFromLow", lookbackDays: 60, comparator: ">", value: 20 }], action: { type: "reducePercent", value: 50 } }],
      },
    },
  ];

  for (const { label, preset } of presetsToTest) {
    const config = engine.buildConfigFromPresetObject(preset, baseConfig);
    const states = engine.buildBacktestStates(rows, config);
    const last = states[states.length - 1];
    assertFinite(last.returnRate, `${label} returnRate`);
    assertFinite(last.maxDrawdown, `${label} maxDrawdown`);
    console.log(`[${label}] trades=${last.trades.length} returnRate=${last.returnRate.toFixed(2)}% maxDrawdown=${last.maxDrawdown.toFixed(2)}% finalEquity=${last.equity.toFixed(0)}`);
  }

  // Full optimization pipeline smoke test on the wave preset (mirrors what the live
  // "参数优化" button does): discover parameters, build range-based candidates, score all.
  const wavePreset = presetsToTest[0].preset;
  const descriptors = engine.discoverOptimizationParameters(wavePreset);
  console.log(`\nwave optimization: discovered ${descriptors.length} tunable parameters`);
  const base = { ...baseConfig, strategyType: "wave" };
  const valueLists = descriptors.map((d) => engine.buildRangeValues(d));
  const totalCombinations = valueLists.reduce((acc, list) => acc * Math.max(1, list.length), 1);
  const combinationCap = engine.MAX_OPTIMIZATION_COMBINATIONS;
  let combos;
  if (totalCombinations <= combinationCap) {
    combos = [[]];
    valueLists.forEach((values) => {
      const next = [];
      combos.forEach((combo) => values.forEach((v) => next.push([...combo, v])));
      combos = next;
    });
  } else {
    combos = [];
    for (let i = 0; i < combinationCap; i += 1) {
      combos.push(valueLists.map((values) => values[Math.floor(Math.random() * values.length)]));
    }
  }
  console.log(`total combinations: ${totalCombinations}, tested: ${combos.length}`);
  const scored = combos.map((combo) => {
    const config = engine.buildConfigFromDescriptorCombo(base, wavePreset, "wave", descriptors, combo);
    const states = engine.buildBacktestStates(rows, config);
    const last = states[states.length - 1];
    return { config, score: engine.scoreBacktestState(last), returnRate: last.returnRate, maxDrawdown: last.maxDrawdown };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  console.log(`best candidate: score=${best.score.toFixed(2)} returnRate=${best.returnRate.toFixed(2)}% maxDrawdown=${best.maxDrawdown.toFixed(2)}%`);
  console.log("best config buyRules:", JSON.stringify(best.config.buyRules));
  console.log("best config sellRules:", JSON.stringify(best.config.sellRules));

  console.log("\nSMOKE TEST PASSED");
}

main().catch((error) => {
  console.error("SMOKE TEST FAILED:", error.stack || error.message);
  process.exit(1);
});
