// A: current prompt; B: training-selected parent + trade diagnostics;
// C: B plus structural children sharing the same training-backtest budget.
// This experiment reads cached prices and writes local reports only.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const engine = require("./engine.js");
const generator = require("../shared/model-generator.js");
const { searchBestConfig } = require("./search-best-config.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { splitFixedStartWindows, shiftYears, toIsoDate } = require("../shared/train-test-window.js");
const { computeWindowStats } = require("../shared/backtest-window.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { annualizedUpsideDeviation } = require("../shared/volatility.js");
const { evaluateBuySampleGate, buildYearBuckets } = require("../shared/buy-sample-gate.js");
const { configFingerprint, createSeededRandom, buildTrainingFeedback, generateStructuralVariants } = require("../shared/model-evolution.js");

const DEFAULTS = { attempts: 3, candidates: 120, mutations: 3, seed: "model-evolution-v1",
  types: ["block-rules", "score-rules"], arms: ["A", "B", "C"],
  initialCash: 2000000, tradeFee: 5, minTrainRows: 200, minTestRows: 50,
  minTrainClosedBuys: 10, minTrainPayoffFloor: 0.85, minTotalClosedBuys: 10, minClosedBuysPerYear: 1,
  minExpectancyPct: 1.5, minPayoffRatio: 1.2, targetPercent: 20,
  upsideThresholdPercent: 30, drawdownTolerancePercent: 5 };
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const number = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
const median = (values) => {
  const sorted = values.map(number).filter((value) => value !== null).sort((a, b) => a - b);
  const n = sorted.length;
  return n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2 : null;
};

function parseArgs(args) {
  const options = { ...DEFAULTS, endDate: toIsoDate(new Date()), symbols: [], dryRun: false };
  for (const arg of args) {
    if (arg === "--dryRun") { options.dryRun = true; continue; }
    const match = /^--([^=]+)=(.+)$/.exec(arg);
    if (!match) throw new Error(`Unknown argument: ${arg}`);
    const [, key, value] = match;
    if (["symbols", "types", "arms"].includes(key)) options[key] = [...new Set(value.split(",").map((v) => v.trim()).filter(Boolean))];
    else if (["endDate", "seed", "output"].includes(key)) options[key] = value;
    else if (typeof DEFAULTS[key] === "number") options[key] = Number(value);
    else throw new Error(`Unknown option: ${key}`);
  }
  options.symbols = [...new Set(options.symbols.map((symbol) => symbol.toUpperCase()))];
  if (!options.symbols.length || options.symbols.some((symbol) => !/^(?:\d{6}|[A-Z][A-Z0-9.^-]{0,14})$/.test(symbol))) {
    throw new Error("Specify --symbols=NVDA,300017 (no automatic full-universe run)");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.endDate) || !Number.isFinite(Date.parse(options.endDate))
    || new Date(options.endDate).toISOString().slice(0, 10) !== options.endDate) throw new Error("Invalid --endDate (exclusive YYYY-MM-DD)");
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (typeof fallback === "number" && !Number.isFinite(options[key])) throw new Error(`Invalid --${key}`);
  }
  for (const key of ["attempts", "candidates", "mutations", "minTrainRows", "minTestRows", "minTrainClosedBuys", "minTotalClosedBuys", "minClosedBuysPerYear"]) {
    if (!Number.isSafeInteger(options[key]) || options[key] < 0) throw new Error(`--${key} must be a nonnegative integer`);
  }
  if (options.attempts < 2 || options.candidates < 4 || options.initialCash <= 0 || options.tradeFee < 0) throw new Error("Use attempts>=2, candidates>=4, initialCash>0, tradeFee>=0");
  if (!options.types.length || options.types.some((type) => !generator.SUPPORTED_STRATEGY_TYPES.includes(type))) throw new Error("Unknown strategy type");
  if (!options.arms.length || options.arms.some((arm) => !["A", "B", "C"].includes(arm))) throw new Error("--arms accepts A,B,C");
  return options;
}

function prepareSymbol(symbol, rows, options) {
  const allRows = rows.filter((row) => row.date < options.endDate);
  const startDate = toIsoDate(shiftYears(new Date(`${options.endDate}T12:00:00Z`), -6));
  const split = splitFixedStartWindows(allRows, 4, 2, startDate, options.endDate);
  if (split.trainRows.length < options.minTrainRows || split.testWindows.some((win) => allRows.filter((row) => row.date >= win.startDate && row.date < win.endDate).length < options.minTestRows)) {
    throw new Error(`${symbol}: insufficient cached prices for the same 4+2 windows`);
  }
  return { symbol, allRows, ...split, profile: generator.buildSymbolDataProfile(split.trainRows), dataHash: digest(JSON.stringify(allRows)) };
}

function buyStats(trades, runtime) {
  const { closedLots, ...stats } = runtime.buildBuyWinStats(trades);
  return stats;
}

function trainingAssessment(states, item, buyHoldStates, options, runtime) {
  const last = states.at(-1);
  const buyHold = buyHoldStates.at(-1);
  const stats = buyStats(last.trades, runtime);
  const failures = [];
  if (!(last.returnRate > buyHold.returnRate)) failures.push("训练收益未超过买入持有");
  if (!(last.maxDrawdown < buyHold.maxDrawdown)) failures.push("训练回撤未小于买入持有");
  const years = buildYearBuckets(item.trainStartDate, item.trainEndDate).map((window) => {
    const yearRows = item.trainRows.filter((row) => row.date >= window.start && row.date < window.end);
    const actual = computeWindowStats(states, window.start, window.end);
    const baseline = computeWindowStats(buyHoldStates, window.start, window.end);
    const upside = yearRows.length >= 30 ? annualizedUpsideDeviation(yearRows) : null;
    const passesUpside = actual && (upside === null || actual.ann >= upside * options.upsideThresholdPercent / 100);
    const passesDrawdown = actual && (!baseline || actual.maxDrawdown < baseline.maxDrawdown * (1 + options.drawdownTolerancePercent / 100));
    if (!passesUpside) failures.push(`训练第${window.index}年收益门槛未过`);
    if (!passesDrawdown) failures.push(`训练第${window.index}年回撤门槛未过`);
    return { ...window, ...actual, upsideDeviation: upside, buyHoldMaxDrawdown: baseline?.maxDrawdown ?? null,
      passesUpside: Boolean(passesUpside), passesDrawdown: Boolean(passesDrawdown) };
  });
  const allWins = stats.closedBuys > 0 && stats.lossCount === 0;
  if (stats.closedBuys < options.minTrainClosedBuys) failures.push("训练平仓买单不足");
  if (!(allWins || (number(stats.payoffRatio) !== null && stats.payoffRatio >= options.minTrainPayoffFloor))) failures.push("训练盈亏比低于底线");
  if (!(allWins || (number(stats.payoffRatio) !== null && stats.payoffRatio >= options.minPayoffRatio)
    || (number(stats.expectancyPct) !== null && stats.expectancyPct >= options.minExpectancyPct))) failures.push("训练盈亏比及期望均未达标");
  return { passed: failures.length === 0, failures, years, stats, returnRate: last.returnRate,
    annualizedReturn: annualizedReturnRate(last.returnRate, item.trainRows.length), maxDrawdown: last.maxDrawdown };
}

function betterTrainingCandidate(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.training.passed !== b.training.passed) return b.training.passed ? b : a;
  return b.score > a.score ? b : a;
}

function validateCandidate(candidate, item, options, runtime) {
  const years = item.testWindows.map((window) => {
    const rows = item.allRows.filter((row) => row.date >= window.startDate && row.date < window.endDate);
    const scored = runtime.buildScoredBacktestStates(item.allRows, candidate.config, window.startDate, window.endDate);
    const baseline = runtime.buildBuyHoldStates(rows, options.initialCash, options.tradeFee).at(-1);
    const annualizedReturn = annualizedReturnRate(scored.returnRate, scored.rowsScored);
    const upside = rows.length >= 30 ? annualizedUpsideDeviation(rows) : null;
    const stats = buyStats(scored.trades, runtime);
    const passes = number(annualizedReturn) !== null && annualizedReturn >= options.targetPercent
      && upside !== null && annualizedReturn >= upside * options.upsideThresholdPercent / 100
      && scored.maxDrawdown < baseline.maxDrawdown * (1 + options.drawdownTolerancePercent / 100)
      && stats.closedBuys > 0 && number(stats.expectancyPct) !== null && stats.expectancyPct >= options.minExpectancyPct
      && (stats.lossCount === 0 || (number(stats.payoffRatio) !== null && stats.payoffRatio >= options.minPayoffRatio));
    return { ...window, annualizedReturn, returnRate: scored.returnRate, maxDrawdown: scored.maxDrawdown,
      rowsScored: scored.rowsScored, stats, buyHoldReturnRate: baseline.returnRate, upsideDeviation: upside, passes };
  });
  const full = runtime.buildScoredBacktestStates(item.allRows, candidate.config, item.trainStartDate, options.endDate);
  const sampleGate = evaluateBuySampleGate(runtime.buildBuyWinStats(full.trades).closedLots, item.trainStartDate, options.endDate,
    { minTotal: options.minTotalClosedBuys, minPerYear: options.minClosedBuysPerYear, rows: item.allRows });
  const worst = (values) => values.some((value) => number(value) === null) ? null : Math.min(...values);
  return { years, sampleGate, qualified: candidate.training.passed && sampleGate.passes && years.every((year) => year.passes),
    worstAnnualizedReturn: worst(years.map((year) => year.annualizedReturn)),
    worstWinRate: worst(years.map((year) => year.stats.winRate)),
    worstExpectancyPct: worst(years.map((year) => year.stats.expectancyPct)),
    totalClosedBuys: years.reduce((sum, year) => sum + year.stats.closedBuys, 0),
    maxDrawdown: Math.max(...years.map((year) => year.maxDrawdown)) };
}

async function runExperiment(prepared, options, { runtime = engine, generate = generator.generateModelFromDataProfile,
  checkpoint = () => {}, progress = () => {} } = {}) {
  const report = { startedAt: new Date().toISOString(), status: "training", options,
    providerRandomness: "Local parameter/mutation seeds are fixed; provider responses remain stochastic and are saved.",
    budgetPolicy: "Same AI-call slots and training-backtest ceiling per arm. C shares its ceiling among structures; diagnostics count. Failures/exhausted grids may leave budget unused. Token costs are reported separately.",
    symbols: prepared.map((item) => ({ symbol: item.symbol, dataHash: item.dataHash, rows: item.allRows.length,
      trainStartDate: item.trainStartDate, trainEndDate: item.trainEndDate, testWindows: item.testWindows })), runs: [] };
  for (const item of prepared) {
    runtime.setActiveLotSizeSymbol(item.symbol);
    const buyHoldStates = runtime.buildBuyHoldStates(item.trainRows, options.initialCash, options.tradeFee);
    const runs = Object.fromEntries(options.arms.map((arm) => {
      const run = { symbol: item.symbol, arm, attempts: [], aiCalls: 0, trainingBacktests: 0,
        validationBacktests: 0, parent: null, selected: [], errors: 0 };
      report.runs.push(run);
      return [arm, run];
    }));
    for (let attemptIndex = 0; attemptIndex < options.attempts; attemptIndex += 1) {
      // Rotate API call order to avoid systematically giving one arm earlier provider calls.
      const order = options.arms.slice(attemptIndex % options.arms.length).concat(options.arms.slice(0, attemptIndex % options.arms.length));
      for (const arm of order) {
        const run = runs[arm];
        const parent = arm === "A" ? null : run.parent;
        const attempt = { index: attemptIndex + 1, parentId: parent?.id ?? null, proposedModel: null,
          trainingBacktests: 0, evaluationErrors: [], usage: [], variants: [], selectedId: null };
        run.attempts.push(attempt);
        const seed = `${options.seed}:${item.symbol}:${attemptIndex}`;
        const previous = run.attempts.slice(0, -1).filter((entry) => entry.proposedModel).map((entry) => ({
          strategyType: entry.proposedModel.strategyType, reason: entry.proposedModel.reason,
          dropped: entry.proposedModel.droppedSummary || [], outcome: entry.outcome,
        }));
        const promptOptions = { suggestedStrategyType: options.types[attemptIndex % options.types.length],
          ...(parent ? { refinement: parent.feedback } : {}), onUsage: (usage) => attempt.usage.push(usage) };
        progress(`${item.symbol} ${arm} ${attempt.index}/${options.attempts}: ${parent ? `改进 ${parent.id}` : "生成新模型"}`);
        run.aiCalls += 1;
        checkpoint(report);
        try {
          const model = await generate(item.profile, item.symbol, previous, [], promptOptions);
          attempt.proposedModel = model;
          attempt.promptHash = digest(generator.buildDataProfilePrompt(item.profile, item.symbol, previous, [], promptOptions));
          attempt.refinement = parent?.feedback ?? null;
          const proposals = [{ model, operation: "ai-proposal", path: "", fingerprint: configFingerprint(model) }];
          if (arm === "C") proposals.push(...generateStructuralVariants(model, {
            normalize: generator.normalizeGeneratedModel, random: createSeededRandom(`${seed}:structures`),
            limit: Math.min(options.mutations, Math.floor(options.candidates / 2) - 1),
          }));
          const budgetPerStructure = Math.floor(options.candidates / proposals.length);
          let selected = null;
          for (let i = 0; i < proposals.length; i += 1) {
            const proposal = proposals[i];
            const allowance = budgetPerStructure + (i < options.candidates % proposals.length ? 1 : 0);
            const variant = { operation: proposal.operation, path: proposal.path, proposedFingerprint: proposal.fingerprint,
              allowance, actualBacktests: 0, error: null };
            attempt.variants.push(variant);
            const countedEngine = { ...runtime, buildBacktestStates(rows, config) {
              if (variant.actualBacktests >= allowance) throw new Error("Training budget exhausted");
              variant.actualBacktests += 1; attempt.trainingBacktests += 1; run.trainingBacktests += 1;
              try { return runtime.buildBacktestStates(rows, config); }
              catch (error) { if (attempt.evaluationErrors.length < 5) attempt.evaluationErrors.push(error.message); return []; }
            } };
            const base = { initialCash: options.initialCash, tradeFee: options.tradeFee,
              strategyType: proposal.model.strategyType, waveThreshold: proposal.model.waveThreshold };
            const best = searchBestConfig(countedEngine, proposal.model, item.trainRows, base, allowance - 1,
              { random: createSeededRandom(`${seed}:parameters:${i}`) });
            if (!best) { variant.error = "No valid parameter candidate"; continue; }
            const states = countedEngine.buildBacktestStates(item.trainRows, best.config);
            if (!states.length) { variant.error = "Training diagnostic replay failed"; continue; }
            const training = trainingAssessment(states, item, buyHoldStates, options, runtime);
            const id = `${item.symbol}-${arm}-${attempt.index}-${i}-${configFingerprint(best.config)}`;
            const candidate = { id, parentId: parent?.id ?? null, operation: proposal.operation,
              config: best.config, score: best.score, training,
              feedback: buildTrainingFeedback(runtime, item.trainRows, best.config, states.at(-1),
                { startDate: item.trainStartDate, endDate: item.trainEndDate, parentId: id }) };
            variant.candidate = candidate;
            selected = betterTrainingCandidate(selected, candidate);
          }
          if (selected) {
            attempt.selectedId = selected.id;
            attempt.outcome = `训练收益${selected.training.returnRate.toFixed(1)}%/回撤${selected.training.maxDrawdown.toFixed(1)}%，平仓${selected.training.stats.closedBuys}单，期望${selected.training.stats.expectancyPct ?? "无"}%；${selected.training.passed ? "通过训练门槛" : selected.training.failures.join("；")}`;
            run.parent = betterTrainingCandidate(run.parent, selected);
            run.selected.push(selected);
          } else attempt.outcome = "本轮没有可回测模型";
        } catch (error) {
          run.errors += 1;
          attempt.error = error.message;
          attempt.outcome = `生成/回测失败：${error.message}`;
        }
        progress(`${item.symbol} ${arm} ${attempt.index}: ${attempt.outcome}（回测 ${attempt.trainingBacktests}/${options.candidates}）`);
        checkpoint(report);
      }
    }
  }
  // No validation is computed, printed, or fed back until all generation is finished.
  report.status = "validating";
  checkpoint(report);
  for (const run of report.runs) {
    const item = prepared.find((entry) => entry.symbol === run.symbol);
    runtime.setActiveLotSizeSymbol(item.symbol);
    const seen = new Map();
    for (const candidate of run.selected) {
      const hash = configFingerprint(candidate.config);
      if (!seen.has(hash)) {
        try {
          run.validationBacktests += 3;
          seen.set(hash, validateCandidate(candidate, item, options, runtime));
        } catch (error) { seen.set(hash, { error: error.message, qualified: false }); }
      }
      candidate.validation = seen.get(hash);
    }
    const unique = [...new Map(run.selected.map((candidate) => [configFingerprint(candidate.config), candidate])).values()];
    const usage = run.attempts.flatMap((attempt) => attempt.usage);
    const inputTokens = usage.reduce((sum, entry) => sum + (entry.usage?.prompt_tokens ?? entry.usage?.input_tokens ?? 0), 0);
    const outputTokens = usage.reduce((sum, entry) => sum + (entry.usage?.completion_tokens ?? entry.usage?.output_tokens ?? 0), 0);
    run.summary = { aiCalls: run.aiCalls, trainingBacktests: run.trainingBacktests,
      trainingBudget: options.attempts * options.candidates, validationBacktests: run.validationBacktests,
      uniqueCandidates: unique.length, trainingPassed: unique.filter((candidate) => candidate.training.passed).length,
      qualified: unique.filter((candidate) => candidate.validation.qualified).length,
      bestWorstAnnualizedReturn: number(Math.max(...unique.map((candidate) => candidate.validation.worstAnnualizedReturn ?? -Infinity))),
      medianWorstWinRate: median(unique.map((candidate) => candidate.validation.worstWinRate)),
      medianWorstExpectancyPct: median(unique.map((candidate) => candidate.validation.worstExpectancyPct)),
      trainingChampionId: run.parent?.id ?? null,
      trainingChampionValidation: run.parent?.validation ?? null,
      failedAttempts: run.attempts.filter((attempt) => !attempt.selectedId).length,
      validationErrors: unique.filter((candidate) => candidate.validation.error).length,
      inputTokens, outputTokens, responsesWithUsage: usage.filter((entry) => entry.usage).length, usage };
    checkpoint(report);
  }
  report.status = report.runs.some((run) => run.summary.failedAttempts || run.summary.validationErrors) ? "complete-with-errors" : "complete";
  report.finishedAt = new Date().toISOString();
  checkpoint(report);
  return report;
}

function renderReport(report) {
  const fmt = (v) => number(v) === null ? "—" : Number(v).toFixed(2);
  const lines = ["# 模型生成 A/B/C 对照实验", "", `状态：${report.status}。截止日期（不含）：${report.options.endDate}。`, "",
    "A：当前提示与参数搜索；B：父模型完整规则及训练交易反馈；C：B 加结构变异。三组使用相同4年训练、后2年逐年验证，沿用当前回测成交假设。", "",
    "每组 AI 调用次数及训练回测上限一致；C 的结构变异共享上限，诊断回放也计数。错误或参数空间穷尽会导致实际回测少于上限。提示词长度不同，API token 成本不保证相同，详见 JSON。", "",
    "| 标的 | 组 | AI调用 | 训练回测/上限 | 不同候选 | 训练通过 | 验证达标 | 候选最佳较差年年化% | 候选较差年胜率中位数% |", "|---|---|---:|---:|---:|---:|---:|---:|---:|"];
  for (const run of report.runs) {
    const s = run.summary;
    if (!s) continue;
    lines.push(`| ${run.symbol} | ${run.arm} | ${s.aiCalls} | ${s.trainingBacktests}/${s.trainingBudget} | ${s.uniqueCandidates} | ${s.trainingPassed} | ${s.qualified} | ${fmt(s.bestWorstAnnualizedReturn)} | ${fmt(s.medianWorstWinRate)} |`);
  }
  lines.push("", "最佳验证结果仅描述本次搜索产出；不能当成未来收益保证。另列训练阶段已选定的冠军，便于区分训练选择和事后验证挑选。小预算试跑用于确认流程，不足以确认方法优劣。", "",
    "| 标的 | 组 | 训练冠军 | 较差年年化% | 较差年胜率% | 两年平仓买单 | 较差回撤% |", "|---|---|---|---:|---:|---:|---:|");
  for (const run of report.runs) {
    const v = run.summary?.trainingChampionValidation;
    lines.push(`| ${run.symbol} | ${run.arm} | ${run.summary?.trainingChampionId || "—"} | ${fmt(v?.worstAnnualizedReturn)} | ${fmt(v?.worstWinRate)} | ${v?.totalClosedBuys ?? "—"} | ${fmt(v?.maxDrawdown)} |`);
  }
  lines.push("", "| 标的 | 组 | 失败轮次 | 验证错误 | 输入 tokens | 输出 tokens | 返回用量的请求数 |", "|---|---|---:|---:|---:|---:|---:|");
  for (const run of report.runs) {
    const s = run.summary;
    if (s) lines.push(`| ${run.symbol} | ${run.arm} | ${s.failedAttempts} | ${s.validationErrors} | ${s.inputTokens} | ${s.outputTokens} | ${s.responsesWithUsage} |`);
  }
  lines.push("", "用量只统计供应商返回的 usage；失败请求未返回用量时不代表没有计费。");
  lines.push("", "JSON 保存了数据与代码摘要、每轮 AI 输出、父模型、训练反馈、结构操作、实际预算和验证结果。没有写入生产模型池。", "");
  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) throw new Error("DATABASE_URL is required");
  if (!options.dryRun && !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) throw new Error("AI provider key is required");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    connectionTimeoutMillis: 5000, statement_timeout: 60000, options: "-c default_transaction_read_only=on" });
  let prepared;
  try {
    const readOnly = (await pool.query("SHOW transaction_read_only")).rows[0].transaction_read_only;
    if (readOnly !== "on") throw new Error("Read-only database connection required");
    prepared = [];
    for (const symbol of options.symbols) {
      const market = /^\d{6}$/.test(symbol) ? (/^[569]/.test(symbol) ? "1" : "0") : "US";
      prepared.push(prepareSymbol(symbol, await loadRowsForSymbol(pool, symbol, market), options));
    }
  } finally { await pool.end(); }
  const totalCalls = options.symbols.length * options.arms.length * options.attempts;
  console.log(`计划：${options.symbols.join(",")}；${options.arms.join("/")}；AI调用 ${totalCalls} 次；训练回测上限 ${totalCalls * options.candidates} 次。`);
  if (options.dryRun) { console.log("数据准备通过；未调用AI。"); return; }
  const output = path.resolve(options.output || path.join(__dirname, "../../reports", `model-evolution-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
  if (path.extname(output).toLowerCase() !== ".json") throw new Error("--output must end in .json");
  if (fs.existsSync(output) || fs.existsSync(output.replace(/\.json$/i, ".md"))) throw new Error("Output exists; choose a new report path");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const codeHashes = Object.fromEntries([__filename, path.join(__dirname, "engine.js"), path.join(__dirname, "search-best-config.js"),
    path.join(__dirname, "../shared/model-generator.js"), path.join(__dirname, "../shared/model-evolution.js"),
    path.join(__dirname, "../shared/backtest-window.js"), path.join(__dirname, "../../public/formula-engine.js")]
    .map((file) => [path.relative(path.join(__dirname, "../.."), file), digest(fs.readFileSync(file))]));
  const checkpoint = (report) => { report.codeHashes = codeHashes; fs.writeFileSync(output, JSON.stringify(report, null, 2)); };
  const report = await runExperiment(prepared, options, { checkpoint, progress: console.log });
  fs.writeFileSync(output.replace(/\.json$/i, ".md"), renderReport(report));
  console.log(`报告：${output}`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { DEFAULTS, parseArgs, prepareSymbol, runExperiment, renderReport, validateCandidate };
