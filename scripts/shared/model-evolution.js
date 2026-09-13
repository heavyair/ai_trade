const crypto = require("crypto");
const FormulaEngine = require("../../public/formula-engine.js");

const RULE_FIELDS = {
  wave: ["buyRules", "sellRules", "noNewHighExitRule"],
  "block-rules": ["buyBlockRules", "sellBlockRules"],
  "score-rules": ["scoreRules", "positionBands"],
  "ma-rsi-band": ["maRsiBandRule"],
  "local-high-ladder": ["localLadderRule"],
  "order-grid": ["orderGridRule"],
  "pe-volume": ["peVolumeRule"],
  "stagnation-reversal": ["stagnationReversalRule"],
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const round = (value) => Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function compactModelConfig(config) {
  const result = { strategyType: config.strategyType, waveThreshold: config.waveThreshold };
  for (const key of RULE_FIELDS[config.strategyType] || []) {
    if (config[key] !== undefined) result[key] = config[key];
  }
  return clone(result);
}

function configFingerprint(config) {
  const sort = (value) => Array.isArray(value) ? value.map(sort)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])) : value;
  return crypto.createHash("sha256").update(JSON.stringify(sort(compactModelConfig(config)))).digest("hex").slice(0, 16);
}

function createSeededRandom(seed) {
  let state = crypto.createHash("sha256").update(String(seed)).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// All diagnostics are derived from training rows and an existing training backtest.
// Price excursions use closes, including the entry/exit close, rather than assuming an
// unknown intraday high/low sequence. Partial exits make these price-path diagnostics,
// not the actual profit of a hypothetical full-size position held until the last exit.
function buildTrainingFeedback(engine, rows, config, last, { startDate, endDate, parentId }) {
  if (!rows.length || rows.some((row) => row.date < startDate || row.date >= endDate)) {
    throw new Error("Training feedback received rows outside its training window");
  }
  if ((last.trades || []).some((trade) => trade.date < startDate || trade.date >= endDate)) {
    throw new Error("Training feedback received trades outside its training window");
  }
  const stats = engine.buildBuyWinStats(last.trades);
  const trendSeries = FormulaEngine.compileFormulaSeries(rows, "close / sma(close, 60) - 1");
  const rowIndex = new Map(rows.map((row, i) => [row.date, i]));
  const lots = stats.closedLots.map((lot) => {
    const from = rowIndex.get(lot.date);
    const to = rowIndex.get(lot.closeDate);
    if (from === undefined || to === undefined) throw new Error("Training lot has no matching price row");
    const closes = rows.slice(from, to + 1).map((row) => (row.close / lot.price - 1) * 100);
    const trend = trendSeries && trendSeries[from];
    return {
      entryDate: lot.date, closeDate: lot.closeDate, holdingDays: to - from,
      pnlPct: round(lot.pnlPct), pnl: round(lot.pnl),
      maxFavorableClosePct: round(Math.max(0, ...closes)),
      maxAdverseClosePct: round(Math.min(0, ...closes)),
      entryTrend: trend === null || trend === undefined ? "unavailable" : trend >= 0 ? "aboveMa60" : "belowMa60",
    };
  });
  const groups = Object.fromEntries(["aboveMa60", "belowMa60", "unavailable"].map((name) => {
    const group = lots.filter((lot) => lot.entryTrend === name);
    return [name, { closedBuys: group.length, winRate: group.length ? round(100 * group.filter((lot) => lot.pnl > 0).length / group.length) : null,
      expectancyPct: round(mean(group.map((lot) => lot.pnlPct))) }];
  }));
  const losses = lots.filter((lot) => lot.pnl <= 0);
  const sorted = lots.slice().sort((a, b) => a.pnlPct - b.pnlPct);
  const examples = [...sorted.slice(0, 3), ...sorted.slice(-3)].filter((lot, i, list) => list.indexOf(lot) === i);
  return {
    parentId, trainingStartDate: startDate, trainingEndDateExclusive: endDate,
    config: compactModelConfig(config),
    summary: { returnRate: round(last.returnRate), maxDrawdown: round(last.maxDrawdown),
      trades: (last.trades || []).length, closedBuys: stats.closedBuys, openBuys: stats.openBuys,
      winRate: round(stats.winRate), expectancyPct: round(stats.expectancyPct),
      payoffRatio: round(stats.payoffRatio), avgWinPct: round(stats.avgWinPct), avgLossPct: round(stats.avgLossPct),
      finalPositionRatio: round(last.positionRatio) },
    diagnostics: { losingBuys: losses.length,
      lossesAfterPositiveClose: losses.filter((lot) => lot.maxFavorableClosePct > 0).length,
      averageHoldingDays: round(mean(lots.map((lot) => lot.holdingDays))), entryTrendGroups: groups },
    examples,
  };
}

function buildRefinementPrompt(feedback) {
  const { parentId, trainingStartDate, trainingEndDateExclusive, config, summary, diagnostics, examples } = feedback;
  if (!config || !summary || !trainingStartDate || !trainingEndDateExclusive) throw new Error("Incomplete refinement feedback");
  const payload = { parentId, trainingStartDate, trainingEndDateExclusive,
    config: compactModelConfig(config), summary, diagnostics, examples: (examples || []).slice(0, 6) };
  return [
    "本轮任务是改进下面这个已经完成参数寻优的父模型。上面的策略类型建议及‘换一个思路’仅用于从零探索；本轮优先保留父模型的有效部分，不必为了不同而重新设计全部规则。",
    "下面的数据全部来自训练期。请针对一项具体失效现象提出一到两处修改：可删除无效条件、增加过滤条件、替换指标、修改公式结构，或固定入场改出场/固定出场改入场。保持其它部分尽量一致，输出完整模型 JSON，不要只输出差异。",
    "reason 中说明父模型的问题、具体修改及可检验的预期。如果证据不足以支持修改，可以保留原模型并在 reason 中说明。不要根据训练期以后的行情或记忆作判断。",
    "交易诊断口径：FIFO 完整平仓买单，包含买卖费用；未平仓买单不参与胜率，但包含在账户收益与回撤中。maxFavorableClosePct/maxAdverseClosePct 是入场到最终平仓期间收盘价格的路径，分批卖出时不等于账户实际浮盈浮亏；它们只能提出待检验的假设。少量样本或全部获胜都不能视为确定性规律。",
    `父模型与训练交易分析（JSON）：${JSON.stringify(payload)}`,
  ].join("\n");
}

function formulaVariants(formula) {
  const variants = [];
  for (const match of formula.matchAll(/\b(sma|ema|max|min)\s*\(/g)) {
    const replacement = { sma: "ema", ema: "sma", max: "min", min: "max" }[match[1]];
    variants.push(formula.slice(0, match.index) + replacement + formula.slice(match.index + match[1].length));
  }
  for (const match of formula.matchAll(/(?:,\s*|\b(?:rsi|atr)\(\s*)(\d+)\s*\)/g)) {
    const offset = match.index + match[0].lastIndexOf(match[1]);
    for (const scale of [0.5, 2]) {
      const days = Math.max(1, Math.min(250, Math.round(Number(match[1]) * scale)));
      variants.push(formula.slice(0, offset) + days + formula.slice(offset + match[1].length));
    }
  }
  return [...new Set(variants)].filter((value) => value !== formula && FormulaEngine.validateFormula(value));
}

// Each child changes one structural component; normalization uses the same gate as AI
// generation. Unsupported fixed templates report zero variants rather than disguising
// numeric parameter changes as a structural search.
function generateStructuralVariants(config, { normalize, random = Math.random, limit = 3 } = {}) {
  const base = compactModelConfig(config);
  const candidates = [];
  const seen = new Set([configFingerprint(base)]);
  const offer = (operation, path, edit) => {
    const raw = clone(base);
    edit(raw);
    const model = normalize(raw);
    if ((model.droppedSummary || []).length) return;
    const fingerprint = configFingerprint(model);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    candidates.push({ model, operation, path, fingerprint });
  };
  const gates = [
    { indicator: "maSlope", comparator: ">=", value: 0, lookbackDays: 60, slopeWindowDays: 5 },
    { indicator: "volumeRatio", comparator: ">=", value: 1, lookbackDays: 20 },
    { indicator: "atrPercent", comparator: "<=", value: 6, lookbackDays: 14 },
  ];
  const keys = config.strategyType === "block-rules" ? ["buyBlockRules", "sellBlockRules"]
    : config.strategyType === "score-rules" ? ["scoreRules"] : [];
  for (const key of keys) {
    const blocks = base[key] || [];
    blocks.forEach((block, b) => {
      if (block.enabled === false) return;
      if (blocks.filter((item) => item.enabled !== false).length > 1) {
        offer("remove-rule", `${key}[${b}]`, (child) => child[key].splice(b, 1));
      }
      const conditions = block.conditions || [];
      conditions.forEach((condition, c) => {
        const path = `${key}[${b}].conditions[${c}]`;
        if (conditions.length > 1) offer("remove-condition", path, (child) => child[key][b].conditions.splice(c, 1));
        for (const gate of gates) {
          if (gate.indicator === condition.indicator) continue;
          offer("replace-condition", path, (child) => { child[key][b].conditions[c] = clone(gate); });
        }
        if (condition.indicator === "formula") {
          for (const formula of formulaVariants(condition.formula)) {
            offer("change-formula", `${path}.formula`, (child) => { child[key][b].conditions[c].formula = formula; });
          }
        }
      });
      if (conditions.length < 6 && key !== "sellBlockRules") {
        for (const gate of gates) {
          if (conditions.some((condition) => condition.indicator === gate.indicator)) continue;
          offer("add-condition", `${key}[${b}].conditions`, (child) => child[key][b].conditions.push(clone(gate)));
        }
      }
    });
  }
  if (config.strategyType === "block-rules" && (base.sellBlockRules || []).length < 8) {
    offer("add-time-exit", "sellBlockRules", (child) => {
      child.sellBlockRules = [...(child.sellBlockRules || []), { enabled: true,
        conditions: [{ indicator: "holdingDays", comparator: ">=", value: 30 }], action: { type: "exitAll", value: null } }];
    });
  }
  if (config.strategyType === "wave") {
    for (const key of ["buyRules", "sellRules"]) {
      const rules = base[key] || [];
      if (rules.filter((rule) => rule.enabled !== false).length <= 1) continue;
      rules.forEach((rule, i) => {
        if (rule.enabled !== false) offer("remove-tier", `${key}[${i}]`, (child) => child[key].splice(i, 1));
      });
    }
  }
  if (config.strategyType === "ma-rsi-band") {
    for (const key of ["useSlowTrend", "useFastBull", "useFastCut", "useRsiBuy", "useRsiSell", "useAtr"]) {
      if (typeof base.maRsiBandRule?.[key] === "boolean") {
        offer("toggle-signal", `maRsiBandRule.${key}`, (child) => { child.maRsiBandRule[key] = !child.maRsiBandRule[key]; });
      }
    }
  }
  // Sample operation families first so numerous replacements don't crowd out deletions
  // and formula edits. Both family and within-family order use the recorded local seed.
  const families = new Map();
  for (const candidate of candidates) {
    if (!families.has(candidate.operation)) families.set(candidate.operation, []);
    families.get(candidate.operation).push(candidate);
  }
  const result = [];
  while (families.size && result.length < limit) {
    const names = [...families.keys()];
    const name = names[Math.floor(random() * names.length)];
    const family = families.get(name);
    result.push(family.splice(Math.floor(random() * family.length), 1)[0]);
    families.delete(name);
  }
  return result;
}

module.exports = { compactModelConfig, configFingerprint, createSeededRandom,
  buildTrainingFeedback, buildRefinementPrompt, formulaVariants, generateStructuralVariants };
