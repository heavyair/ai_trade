const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("./engine.js");
const generator = require("../shared/model-generator.js");
const FormulaEngine = require("../../public/formula-engine.js");
const { searchBestConfig } = require("./search-best-config.js");
const { createSeededRandom, configFingerprint, generateStructuralVariants, formulaVariants,
  buildTrainingFeedback, buildRefinementPrompt } = require("../shared/model-evolution.js");
const { DEFAULTS, parseArgs, prepareSymbol, runExperiment, renderReport } = require("./experiment-model-evolution.js");

function model() {
  return generator.normalizeGeneratedModel({ strategyType: "block-rules", reason: "测试模型", waveThreshold: 15,
    buyBlockRules: [{ enabled: true, conditions: [
      { indicator: "formula", formula: "rsi(8)", comparator: "<", value: 45 },
      { indicator: "volumeRatio", lookbackDays: 20, comparator: ">=", value: 0.5 },
    ], action: { type: "targetPercent", value: 80 } }],
    sellBlockRules: [{ enabled: true, conditions: [{ indicator: "holdingDays", comparator: ">=", value: 8 }],
      action: { type: "exitAll", value: null } }],
  });
}

function prices() {
  const rows = [];
  for (const date = new Date("2018-01-01T12:00:00Z"); date < new Date("2025-01-01T12:00:00Z"); date.setUTCDate(date.getUTCDate() + 1)) {
    if ([0, 6].includes(date.getUTCDay())) continue;
    const i = rows.length;
    const close = 100 + i * 0.025 + Math.sin(i / 6) * 12;
    rows.push({ date: date.toISOString().slice(0, 10), close, open: close * 0.999,
      high: close * 1.01, low: close * 0.99, volume: 1000000 + (i % 17) * 5000 });
  }
  return rows;
}

test("parameter search honors tiny budgets and injectable seeds", () => {
  const fake = {
    discoverOptimizationParameters: () => [{ min: 0, max: 10, currentValue: 5 }],
    buildRangeValues: () => Array.from({ length: 100 }, (_, i) => i),
    buildConfigFromDescriptorCombo: (_, __, ___, ____, combo) => ({ x: combo[0] }),
    buildBacktestStates: (_, config) => [{ returnRate: config.x, maxDrawdown: 0, trades: [] }],
    scoreBacktestState: (last) => last.returnRate,
  };
  for (const budget of [1, 2, 3, 11]) {
    const one = searchBestConfig(fake, { strategyType: "wave" }, [], {}, budget, { random: createSeededRandom("fixed") });
    const two = searchBestConfig(fake, { strategyType: "wave" }, [], {}, budget, { random: createSeededRandom("fixed") });
    assert.equal(one.testedCandidates, budget);
    assert.deepEqual(one, two);
  }
  assert.throws(() => searchBestConfig(fake, {}, [], {}, 0), /positive integer/);
});

test("training diagnostics respect cutoff, fees, close excursions, and independent lots", () => {
  const rows = [100, 110, 90].map((close, i) => ({ date: `2020-01-0${i + 1}`, close, open: close, high: close * 2, low: close / 2, volume: 1 }));
  const trades = [{ date: rows[0].date, side: "buy", price: 100, shares: 10, fee: 1 },
    { date: rows[2].date, side: "sell", price: 90, shares: 10, fee: 1 }];
  const bounds = { startDate: "2020-01-01", endDate: "2020-01-04", parentId: "parent" };
  const feedback = buildTrainingFeedback(engine, rows, model(), { trades, returnRate: -10, maxDrawdown: 18, positionRatio: 0 }, bounds);
  assert.equal(feedback.examples[0].pnl, -102);
  assert.equal(feedback.examples[0].maxFavorableClosePct, 10);
  assert.equal(feedback.diagnostics.lossesAfterPositiveClose, 1);
  assert.equal(feedback.summary.openBuys, 0);
  assert.throws(() => buildTrainingFeedback(engine, [...rows, { ...rows[2], date: "2020-01-04" }], model(), { trades }, bounds), /outside/);
  assert.throws(() => buildTrainingFeedback(engine, rows, model(), { trades: [...trades, { ...trades[0], date: "2021-01-01" }] }, bounds), /outside/);
  const prompt = buildRefinementPrompt({ ...feedback, validation: "DO_NOT_EXPOSE" });
  assert.ok(!prompt.includes("DO_NOT_EXPOSE"));
  assert.match(prompt, /父模型与训练交易分析/);
  assert.match(prompt, /-102/);
});

test("structural edits are deterministic, unique, normalized, and leave the parent intact", () => {
  const parent = model();
  const before = JSON.stringify(parent);
  const make = () => generateStructuralVariants(parent, { normalize: generator.normalizeGeneratedModel, random: createSeededRandom("edits"), limit: 20 });
  const variants = make();
  assert.deepEqual(variants, make());
  assert.equal(JSON.stringify(parent), before);
  assert.ok(variants.length >= 4);
  assert.equal(new Set(variants.map((v) => configFingerprint(v.model))).size, variants.length);
  assert.ok(variants.some((v) => v.operation === "change-formula"));
  assert.ok(variants.some((v) => v.operation === "remove-condition"));
  const rows = prices().slice(0, 220);
  for (const variant of variants) {
    assert.notEqual(configFingerprint(variant.model), configFingerprint(parent));
    assert.equal(variant.model.droppedSummary.length, 0);
    const config = engine.buildConfigFromPresetObject(variant.model, { initialCash: 2000000, tradeFee: 5 });
    assert.ok(Number.isFinite(engine.buildBacktestStates(rows, config).at(-1).returnRate));
  }
  assert.deepEqual(generateStructuralVariants(generator.normalizeGeneratedModel({ strategyType: "order-grid", orderGridRule: {} }),
    { normalize: generator.normalizeGeneratedModel }), []);
});

test("formula mutation handles nested windows without future offsets or invalid syntax", () => {
  const formula = "sma(close[-1] - ema(close, 20), 10) / atr(14)";
  const variants = formulaVariants(formula);
  assert.ok(variants.some((value) => value.includes("ema(close, 40)")));
  assert.ok(variants.some((value) => value.endsWith("atr(28)")));
  assert.ok(variants.every((value) => value.includes("close[-1]") && FormulaEngine.validateFormula(value)));
});

test("all arms finish training before validation; B/C receive training-only parents and C shares budget", async () => {
  const options = { ...DEFAULTS, symbols: ["TEST"], attempts: 2, candidates: 12, mutations: 3,
    types: ["block-rules"], endDate: "2025-01-01" };
  const prepared = [prepareSymbol("TEST", prices(), options)];
  const events = [];
  const prompts = [];
  const runtime = { ...engine, buildScoredBacktestStates(...args) { events.push("validation"); return engine.buildScoredBacktestStates(...args); } };
  const report = await runExperiment(prepared, options, { runtime, generate: async (profile, symbol, previous, prior, opts) => {
    events.push("generation");
    assert.equal(profile.endDate < prepared[0].trainEndDate, true);
    assert.deepEqual(prior, []);
    prompts.push(opts.refinement);
    opts.onUsage({ provider: "fixture", model: "fixture", usage: { total_tokens: 100 } });
    return model();
  } });
  assert.equal(report.status, "complete");
  assert.equal(events.slice(0, 6).every((event) => event === "generation"), true);
  assert.equal(events.slice(6).every((event) => event === "validation"), true);
  assert.equal(prompts.filter(Boolean).length, 2);
  for (const run of report.runs) {
    assert.equal(run.aiCalls, 2);
    assert.ok(run.trainingBacktests <= 24);
    assert.ok(run.summary.trainingChampionValidation);
    for (const attempt of run.attempts) {
      assert.ok(attempt.trainingBacktests <= 12);
      assert.equal(attempt.variants.reduce((sum, v) => sum + v.allowance, 0), 12);
      assert.equal(attempt.variants.reduce((sum, v) => sum + v.actualBacktests, 0), attempt.trainingBacktests);
    }
    if (run.arm === "A") assert.equal(run.attempts[1].refinement, null);
    else {
      assert.ok(run.attempts[1].refinement.config.buyBlockRules);
      assert.ok(run.attempts[1].refinement.examples.every((lot) => lot.closeDate < prepared[0].trainEndDate));
    }
  }
  assert.ok(report.runs.find((run) => run.arm === "C").attempts.every((attempt) => attempt.variants.length > 1));
  assert.match(renderReport(report), /训练冠军/);
});

test("failed provider calls consume slots without borrowing another arm's quota", async () => {
  const options = { ...DEFAULTS, symbols: ["TEST"], attempts: 2, candidates: 4, endDate: "2025-01-01" };
  const report = await runExperiment([prepareSymbol("TEST", prices(), options)], options,
    { generate: async () => { throw new Error("fixture provider failure"); } });
  for (const run of report.runs) {
    assert.equal(run.aiCalls, 2);
    assert.equal(run.errors, 2);
    assert.equal(run.trainingBacktests, 0);
    assert.equal(run.summary.trainingChampionValidation, null);
  }
});

test("CLI validates dates, budgets and explicit symbols before paid calls", () => {
  assert.throws(() => parseArgs([]), /symbols/);
  assert.throws(() => parseArgs(["--symbols=NVDA", "--attempts=NaN"]), /attempts/);
  assert.throws(() => parseArgs(["--symbols=NVDA", "--endDate=2025-02-30"]), /endDate/);
  assert.throws(() => parseArgs(["--symbols=NVDA", "--arms=A,D"]), /arms/);
  assert.equal(parseArgs(["--symbols=nvda,NVDA", "--dryRun"]).symbols.length, 1);
});
