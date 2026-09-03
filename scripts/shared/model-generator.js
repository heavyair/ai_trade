// AI model generation + validation, shared between server.js (the interactive "生成安全模型"
// HTTP path) and scripts/universe/run-auto-generate.js (the autonomous background path).
// This used to live entirely inside server.js; it moved out here because
// normalizeGeneratedModel is the ONLY safety gate on AI output before a model can be saved
// and backtested — if the interactive and autonomous paths each had their own copy, a missed
// sync between them could let the autonomous path save something the interactive path would
// have rejected. Same reasoning as public/formula-engine.js being a shared module instead of
// a copy-pasted one.
const https = require("https");
const FormulaEngine = require("../../public/formula-engine.js");

const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
const DEEPSEEK_API_KEY = String(process.env.DEEPSEEK_API_KEY || "").trim();
const DEEPSEEK_MODEL = String(process.env.DEEPSEEK_MODEL || "deepseek-chat").trim();

const SUPPORTED_STRATEGY_TYPES = ["wave", "local-high-ladder", "ma-rsi-band", "order-grid", "pe-volume", "stagnation-reversal", "block-rules", "score-rules"];

const BLOCK_RULE_INDICATORS = [
  "drawdownFromHigh", "drawdownFromWaveHigh", "drawdownFromBreakoutHigh", "riseFromLow", "riseFromWaveLow", "maValue", "maLevel",
  "maSlope", "rsi", "atrPercent", "volumeRatio", "daysSinceNewHigh", "daysSinceNewLow", "daysSinceNewWaveLow", "daysSinceNewWaveHigh", "upDayCount", "downDayCount",
  "maCompare", "candleBody", "positionRatio", "holdingDays", "formula",
];
// risingStreak/fallingStreak check whether the indicator's own value moved the same
// direction every day for the last N days in a row (a genuine consecutive streak, not just
// "higher/lower than N days ago") — see the matching comment in public/app.js's
// blockRuleComparators for why this needed a dedicated comparator instead of reusing
// maSlope. For these two, "value" is repurposed as the day count, not a threshold.
const BLOCK_RULE_COMPARATORS = [">", ">=", "<", "<=", "==", "risingStreak", "fallingStreak"];
const BLOCK_RULE_STREAK_COMPARATORS = new Set(["risingStreak", "fallingStreak"]);
const BLOCK_RULE_ACTION_TYPES = ["targetPercent", "targetShares", "reducePercent", "exitAll"];

function postJsonOverHttps(hostname, path, headers, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request({
      method: "POST",
      hostname,
      path,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 30000,
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        let parsed = {};
        try {
          parsed = responseBody ? JSON.parse(responseBody) : {};
        } catch (parseError) {
          const error = new Error(`AI 服务返回的数据不是有效 JSON：${responseBody.slice(0, 200)}`);
          error.statusCode = 502;
          reject(error);
          return;
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(parsed);
          return;
        }

        const detail = parsed && parsed.error && (parsed.error.message || parsed.error.code)
          ? String(parsed.error.message || parsed.error.code)
          : responseBody;
        const error = new Error(`AI 服务返回 ${response.statusCode}${detail ? `：${detail.slice(0, 300)}` : ""}`);
        error.statusCode = 502;
        reject(error);
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("AI 服务请求超时。"));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function extractOpenAiText(payload) {
  if (payload && typeof payload.output_text === "string") return payload.output_text;
  const output = payload && Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") return part.text;
    }
  }
  return "";
}

function extractDeepSeekText(payload) {
  const choices = payload && Array.isArray(payload.choices) ? payload.choices : [];
  const message = choices[0] && choices[0].message;
  return message && typeof message.content === "string" ? message.content : "";
}

// temperature (optional): left unset (provider default, fairly high) for
// generateModelFromDataProfile, where attempt-to-attempt variety is the whole point of a
// multi-attempt search. generateModelFromDescription passes a low value instead — that call is
// translating an explicit user description as faithfully as possible, not exploring design
// space, so high-temperature run-to-run variance there just means the same sentence sometimes
// gets one clause silently dropped and sometimes doesn't, which is exactly the failure mode a
// literal-translation task should minimize rather than embrace.
async function requestAiJsonModel({ systemPrompt, userPrompt, schema, schemaName, temperature }) {
  if (DEEPSEEK_API_KEY) {
    const response = await postJsonOverHttps("api.deepseek.com", "/chat/completions", {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    }, {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      ...(Number.isFinite(temperature) ? { temperature } : {}),
    });
    return extractDeepSeekText(response);
  }
  if (OPENAI_API_KEY) {
    const response = await postJsonOverHttps("api.openai.com", "/v1/responses", {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    }, {
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          schema,
        },
      },
      ...(Number.isFinite(temperature) ? { temperature } : {}),
    });
    return extractOpenAiText(response);
  }
  const error = new Error("AI 服务还没有配置 API Key（OPENAI_API_KEY 或 DEEPSEEK_API_KEY）。");
  error.statusCode = 503;
  throw error;
}

function normalizeGeneratedModel(value) {
  const model = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const strategyType = SUPPORTED_STRATEGY_TYPES.includes(model.strategyType)
    ? model.strategyType
    : "wave";
  const asNumber = (input, fallback = null) => {
    const number = Number(input);
    return Number.isFinite(number) ? number : fallback;
  };
  const clamp = (input, min, max, fallback) => {
    const number = asNumber(input, fallback);
    return Math.min(max, Math.max(min, number));
  };
  const cleanCondition = (condition) => {
    if (!condition || typeof condition !== "object" || Array.isArray(condition)) return null;
    if (!BLOCK_RULE_INDICATORS.includes(condition.indicator)) return null;
    if (!BLOCK_RULE_COMPARATORS.includes(condition.comparator)) return null;
    // formula conditions carry their own window sizes inside the formula string (e.g.
    // sma(close, 10)) — lookbackDays/slopeWindowDays are meaningless here and forced to
    // null below even if the AI mistakenly filled them in.
    if (condition.indicator === "formula") {
      if (typeof condition.formula !== "string" || condition.formula.length === 0
        || condition.formula.length > FormulaEngine.MAX_FORMULA_LENGTH
        || !FormulaEngine.validateFormula(condition.formula)) {
        return null;
      }
    }
    const rawValue = asNumber(condition.value, null);
    if (rawValue === null) return null;
    // For a streak comparator, value is a day count — must be a positive whole number.
    const value = BLOCK_RULE_STREAK_COMPARATORS.has(condition.comparator)
      ? Math.max(1, Math.round(rawValue))
      : rawValue;
    return {
      indicator: condition.indicator,
      formula: condition.indicator === "formula" ? condition.formula : null,
      // Upper bound 1300 covers this app's longest-standing convention (5-year windows,
      // ~1260 trading days, already used elsewhere e.g. 模型排行's 1/3/5年 periods) with a
      // little headroom — not just the ~750 trading days a 3-year lookback needs, so this
      // doesn't need to be revisited again for the next "N年新高"-style request.
      lookbackDays: condition.indicator === "formula" || condition.lookbackDays === null || condition.lookbackDays === undefined
        ? null
        : clamp(condition.lookbackDays, 1, 1300, 20),
      slopeWindowDays: condition.indicator === "formula" || condition.slopeWindowDays === null || condition.slopeWindowDays === undefined
        ? null
        : clamp(condition.slopeWindowDays, 1, 60, 1),
      comparator: condition.comparator,
      value,
      sustainedDays: condition.sustainedDays === null || condition.sustainedDays === undefined
        ? null
        : clamp(condition.sustainedDays, 1, 60, 1),
      // Per-condition wave-confirmation threshold (see engine.js's resolveConditionWaveThreshold
      // for the runtime side of this) — only meaningful for drawdownFromWaveHigh/riseFromWaveLow
      // (both run the same underlying wave tracker, just reading wave.high vs wave.low), null
      // for every other indicator. Falls back to value*2/3 when the AI didn't give a specific
      // number (or gave an unusable one), clamped to [1, value] — the ceiling is this
      // condition's own drawdown/rise target, since a wave confirmation threshold at or beyond
      // that target defeats the point (this is the fix for the earlier real bug where an
      // ungrounded 0.1 value made "wave confirmation" fire on every trivial daily wiggle).
      // daysSinceNewWaveLow ALSO runs the wave tracker (same low-side candidate the wave model
      // itself uses, not a fixed N-day window) so it needs this field too — but its own `value`
      // is a day count, not a %, so it can't be scaled from value the way the other two are;
      // falls back to a flat 5 instead (see engine.js's resolveConditionWaveThreshold).
      waveThreshold: condition.indicator === "drawdownFromWaveHigh" || condition.indicator === "riseFromWaveLow"
        ? clamp(
            Number(condition.waveThreshold) > 0 ? condition.waveThreshold : (value > 0 ? (value * 2) / 3 : 5),
            1, value > 0 ? value : 30, 5
          )
        : condition.indicator === "daysSinceNewWaveLow" || condition.indicator === "daysSinceNewWaveHigh"
        ? clamp(Number(condition.waveThreshold) > 0 ? condition.waveThreshold : 5, 1, 30, 5)
        : null,
    };
  };
  const cleanAction = (action) => {
    if (!action || typeof action !== "object" || Array.isArray(action)) return null;
    if (!BLOCK_RULE_ACTION_TYPES.includes(action.type)) return null;
    if (action.type === "exitAll") return { type: "exitAll", value: null };
    const value = asNumber(action.value, null);
    if (value === null) return null;
    if (action.type === "targetPercent") return { type: action.type, value: clamp(value, 0, 100, 0) };
    if (action.type === "reducePercent") return { type: action.type, value: clamp(value, 0, 100, 0) };
    return { type: action.type, value: clamp(value, 0, 100000000, 0) };
  };
  const cleanBlockRule = (block) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return null;
    const conditions = Array.isArray(block.conditions)
      ? block.conditions.map(cleanCondition).filter(Boolean).slice(0, 6)
      : [];
    if (conditions.length === 0) return null;
    const action = cleanAction(block.action);
    if (!action) return null;
    return {
      enabled: block.enabled !== false,
      conditions,
      action,
    };
  };
  const cleanScoreRule = (rule) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return null;
    const conditions = Array.isArray(rule.conditions)
      ? rule.conditions.map(cleanCondition).filter(Boolean).slice(0, 6)
      : [];
    if (conditions.length === 0) return null;
    const points = asNumber(rule.points, null);
    if (points === null) return null;
    return {
      enabled: rule.enabled !== false,
      conditions,
      points: Math.round(clamp(points, -1000, 1000, 0)),
    };
  };
  const cleanPositionBand = (band) => {
    if (!band || typeof band !== "object" || Array.isArray(band)) return null;
    const minScore = asNumber(band.minScore, null);
    if (minScore === null) return null;
    return {
      minScore: Math.round(clamp(minScore, -1000, 1000, 0)),
      targetPercent: clamp(band.targetPercent, 0, 100, 0),
    };
  };
  const cleanRule = (rule, kind) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return null;
    if (kind === "buy") {
      return {
        enabled: rule.enabled !== false,
        drop: clamp(rule.drop, 0.1, 80, 5),
        target: clamp(rule.target, 0, 100, 30),
      };
    }
    return {
      enabled: rule.enabled !== false,
      rise: clamp(rule.rise, 0.1, 200, 5),
      reduce: clamp(rule.reduce, 0, 100, 10),
    };
  };

  return {
    label: String(model.label || "").slice(0, 80),
    strategyType,
    confidence: clamp(model.confidence, 0, 1, 0.5),
    reason: String(model.reason || "").slice(0, 1000),
    // Requirements from the user's own description that the AI could not confidently encode
    // into any indicator/formula — surfaced to the human instead of silently dropped (see
    // buildPromptGuideLines' instruction on this field). Empty for generateModelFromDataProfile
    // callers, which have no user description to be unfaithful to in the first place.
    uncoveredRequirements: Array.isArray(model.uncoveredRequirements)
      ? model.uncoveredRequirements.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim().slice(0, 200)).slice(0, 10)
      : [],
    // Global/model-level wave-confirmation threshold — used directly by the "wave" strategy
    // type's own buy/sell logic, and as the shared fallback for any block-rules/score-rules
    // drawdownFromWaveHigh condition that doesn't set its own per-condition waveThreshold (see
    // cleanCondition above). Unlike the per-condition field, there's no sibling "value" here to
    // derive a sane ceiling from, so this just clamps into a fixed [1, 30] range and — this is
    // the actual fix — defaults to 5 (this app's own long-standing convention, see every
    // `waveThreshold || 5` fallback throughout engine.js/app.js and every built-in preset)
    // whenever the AI didn't give a usable positive number, INSTEAD OF floor-clamping a
    // near-zero value like the 0.1 seen from real generation up to 1 and calling it done — a
    // value that close to zero making it past validation defeats "wave confirmation" just as
    // much whether it lands on 0.1 or 1, so anything below a sane floor should reset to the
    // real default (5), not the bare minimum.
    waveThreshold: (() => {
      const raw = asNumber(model.waveThreshold, null);
      return raw === null || raw < 1 || raw > 30 ? 5 : raw;
    })(),
    buyRules: Array.isArray(model.buyRules) ? model.buyRules.map((rule) => cleanRule(rule, "buy")).filter(Boolean).slice(0, 8) : [],
    sellRules: Array.isArray(model.sellRules) ? model.sellRules.map((rule) => cleanRule(rule, "sell")).filter(Boolean).slice(0, 8) : [],
    noNewHighExitRule: model.noNewHighExitRule && typeof model.noNewHighExitRule === "object" ? {
      enabled: Boolean(model.noNewHighExitRule.enabled),
      lookbackDays: clamp(model.noNewHighExitRule.lookbackDays, 2, 120, 6),
      stalledDays: clamp(model.noNewHighExitRule.stalledDays, 1, 60, 5),
      reduce: clamp(model.noNewHighExitRule.reduce, 0, 100, 100),
    } : null,
    localLadderRule: model.localLadderRule && typeof model.localLadderRule === "object" ? model.localLadderRule : null,
    maRsiBandRule: model.maRsiBandRule && typeof model.maRsiBandRule === "object" ? model.maRsiBandRule : null,
    orderGridRule: model.orderGridRule && typeof model.orderGridRule === "object" ? model.orderGridRule : null,
    peVolumeRule: model.peVolumeRule && typeof model.peVolumeRule === "object" ? model.peVolumeRule : null,
    stagnationReversalRule: model.stagnationReversalRule && typeof model.stagnationReversalRule === "object" ? {
      buyLookbackDays: clamp(model.stagnationReversalRule.buyLookbackDays, 2, 120, 5),
      buyStalledDays: clamp(model.stagnationReversalRule.buyStalledDays, 1, 120, 5),
      buyTarget: clamp(model.stagnationReversalRule.buyTarget, 1, 100, 100),
      sellLookbackDays: clamp(model.stagnationReversalRule.sellLookbackDays, 2, 120, 5),
      sellStalledDays: clamp(model.stagnationReversalRule.sellStalledDays, 1, 120, 5),
      sellReduce: clamp(model.stagnationReversalRule.sellReduce, 1, 100, 100),
    } : null,
    buyBlockRules: Array.isArray(model.buyBlockRules)
      ? model.buyBlockRules.map(cleanBlockRule).filter(Boolean).slice(0, 8)
      : [],
    sellBlockRules: Array.isArray(model.sellBlockRules)
      ? model.sellBlockRules.map(cleanBlockRule).filter(Boolean).slice(0, 8)
      : [],
    scoreRules: Array.isArray(model.scoreRules)
      ? model.scoreRules.map(cleanScoreRule).filter(Boolean).slice(0, 20)
      : [],
    positionBands: Array.isArray(model.positionBands)
      ? model.positionBands.map(cleanPositionBand).filter(Boolean).slice(0, 10)
      : [],
  };
}

const blockRuleConditionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    indicator: { type: "string", enum: BLOCK_RULE_INDICATORS },
    formula: { type: ["string", "null"] },
    lookbackDays: { type: ["number", "null"] },
    slopeWindowDays: { type: ["number", "null"] },
    comparator: { type: "string", enum: BLOCK_RULE_COMPARATORS },
    value: { type: "number" },
    sustainedDays: { type: ["number", "null"] },
    waveThreshold: { type: ["number", "null"] },
  },
};

const blockRuleActionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: BLOCK_RULE_ACTION_TYPES },
    value: { type: ["number", "null"] },
  },
};

const blockRuleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    conditions: { type: "array", items: blockRuleConditionSchema },
    action: blockRuleActionSchema,
  },
};

const scoreRuleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    conditions: { type: "array", items: blockRuleConditionSchema },
    points: { type: "number" },
  },
};

const positionBandSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    minScore: { type: "number" },
    targetPercent: { type: "number" },
  },
};

function buildModelSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string" },
      strategyType: { type: "string", enum: SUPPORTED_STRATEGY_TYPES },
      confidence: { type: "number" },
      reason: { type: "string" },
      uncoveredRequirements: { type: "array", items: { type: "string" } },
      waveThreshold: { type: ["number", "null"] },
      buyRules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean" },
            drop: { type: "number" },
            target: { type: "number" },
          },
        },
      },
      sellRules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean" },
            rise: { type: "number" },
            reduce: { type: "number" },
          },
        },
      },
      noNewHighExitRule: { type: ["object", "null"] },
      localLadderRule: { type: ["object", "null"] },
      maRsiBandRule: { type: ["object", "null"] },
      orderGridRule: { type: ["object", "null"] },
      peVolumeRule: { type: ["object", "null"] },
      stagnationReversalRule: {
        type: ["object", "null"],
        additionalProperties: false,
        properties: {
          buyLookbackDays: { type: "number" },
          buyStalledDays: { type: "number" },
          buyTarget: { type: "number" },
          sellLookbackDays: { type: "number" },
          sellStalledDays: { type: "number" },
          sellReduce: { type: "number" },
        },
      },
      buyBlockRules: { type: "array", items: blockRuleSchema },
      sellBlockRules: { type: "array", items: blockRuleSchema },
      scoreRules: { type: "array", items: scoreRuleSchema },
      positionBands: { type: "array", items: positionBandSchema },
    },
    required: ["label", "strategyType", "confidence", "reason"],
  };
}

// Shared by generateModelFromDescription (human-typed description) and
// generateModelFromDataProfile (autonomous, data-driven) — the strategyType/indicator/formula
// explanation and worked examples don't depend on where the "what to build" part of the
// prompt came from.
function buildPromptGuideLines(schema) {
  return [
    "只选择最匹配的 strategyType：",
    "- wave：从阶段高点回撤百分比建仓，从买入价上涨百分比卖出。",
    "- local-high-ladder：最近 N 天高点回落后阶梯加仓。",
    "- order-grid：每笔订单独立建仓/加仓/止盈。",
    "- ma-rsi-band：均线、RSI、ATR 目标仓位。",
    "- pe-volume：PE 和成交量指标。",
    "- stagnation-reversal：连续 N 天没有创新低买入；连续 N 天没有创新高卖出。",
    "顶层字段 model.waveThreshold（strategyType 为 wave 时才真正生效，用来算“阶段高点/低点”）取值范围是1~30，没有特别要求时用这个app的标准默认值5——绝对不要生成0.1、0.5这种接近0的数值，那会让“阶段高点”被任何一天的正常波动刷新，起不到过滤噪音的作用。strategyType 不是 wave 时，这个字段填5（或用户提到的具体数字）即可，实际不会被用到。",
    "- block-rules：用户的描述包含多个用“并且/同时”连接的条件、需要触发一次性动作（调仓/清仓），或者用到上面 6 种类型都表达不了的指标（例如均线斜率、N 日内涨跌天数、距低点反弹幅度、按绝对股数建仓、连续 N 天满足某条件）时，选这个类型。",
    "- score-rules：用户的描述是“打分制”——多条独立条件各自命中就加若干分（不要求互斥，同一天可以同时命中多条、分数累加），再按当天总分落在哪个区间决定目标仓位百分比（例如“A得10分，B得10分…总分满20分半仓，满30分全仓”）。出现“得X分”“加X分”“总分”“打分”这类字眼、或者列举一串各自独立打分的条件时，必须选这个类型，不要硬套 block-rules 的且/或结构（block-rules 的 action 是触发一次性动作，没法表达“多个条件独立累加分数”）。",
    "block-rules 用 buyBlockRules/sellBlockRules 两个数组表达：每个数组元素是一个“规则块”，块内的 conditions 是且（AND）的关系，多个规则块之间是或（OR）的关系——只要任意一块的全部条件都满足就触发这个块的 action。",
    "block-rules 和 score-rules 的 condition.indicator 只能是：drawdownFromHigh(过去 lookbackDays 个交易日固定滚动窗口内最高价的回撤%，只是简单的N日最高价，不代表真正的波段/趋势高点；这个窗口是每天都重新计算的，如果价格创新高后又回落，回落几天之后这个窗口的参考高点可能已经悄悄变成一个更近、更低的高点，不适合用来判断“有没有跌破当初那次突破的价位”——那种场景要用 drawdownFromBreakoutHigh)、drawdownFromWaveHigh(距离“波浪模型”实际确认的最近一次段内高点的回撤%——用户描述里说“距离最近高点”“波浪模型的高点”“上一个高点”这类不带固定天数、指真实转折点的表述时，必须用这个指标而不是 drawdownFromHigh；这个指标不需要 lookbackDays，必须设为 null)、drawdownFromBreakoutHigh(距最近一次“突破 lookbackDays 日高点”那个事件发生时的参考高点的回撤%——跟 drawdownFromHigh 的关键区别：这个参考高点只在价格真正创出 lookbackDays 日新高的那一天才会更新为“突破前的那个旧高点”，之后哪怕过了很多天、哪怕价格没有继续创新高，这个参考价位也不会被遗忘或替换，一直保持到下一次更高的突破发生为止；<=0 表示至今仍未跌破那次突破的价位，>0 表示已经跌破。适合表达“创新高后有没有回落跌破那个高点”“突破以来站稳在原高点之上”这类需要“记住突破那一刻的价位、之后持续对比”的描述，不要跟 daysSinceNewHigh<=N 之类的“最近N天创过新高”条件混淆——那个只说明创没创过新高，不管创新高之后有没有跌回去)、riseFromLow(过去 lookbackDays 个交易日固定滚动窗口内最低价的反弹%，只是简单的N日最低价，不代表真正的波段/趋势低点，跟 drawdownFromHigh 是同一类“每天重新算窗口”的算法)、riseFromWaveLow(距离“波浪模型”实际确认的最近一次段内低点的反弹%——用户描述里说“距离最近低点反弹”“波浪模型的低点”“上一个低点反弹”这类不带固定天数、指真实转折点的表述时，必须用这个指标而不是 riseFromLow；这个指标不需要 lookbackDays，必须设为 null，用法和专属的 waveThreshold 字段跟 drawdownFromWaveHigh 完全对称，只是方向相反——一个测确认高点之后回落了多少，一个测确认低点之后反弹了多少)、maValue(价格偏离均线的百分比，不是均线本身的数值)、maLevel(均线本身的数值——判断“均线连续上行/下行”“均线自己涨了/跌了”这类描述均线走势本身的说法时用这个，不要用 maValue)、maSlope(均线斜率%，跟前 slopeWindowDays 天比较的净变化，不代表这中间每天都同向变化)、maCompare(两条均线互相比较：用 lookbackDays 当快线周期、slopeWindowDays 当慢线周期，算 (快线-慢线)/慢线*100——判断“N日均线大于/高于M日均线”这类两条均线互相比较的说法时用这个，comparator 用 > 0)、candleBody((收盘价-开盘价)/开盘价*100——判断“收阳线/收阴线”时用这个，comparator 用 >0 表示收阳线、<0 表示收阴线，lookbackDays 必须设为 null，这个指标不需要回看窗口)、rsi、atrPercent、volumeRatio(量比)、daysSinceNewHigh(距最近一次创 lookbackDays 日新高多少天——用户说“N年/N日新高”“最近M天内突破”时，把这个年数/天数换算成交易日数填进 lookbackDays（1年≈252个交易日，例如“三年新高”约等于 lookbackDays=750，lookbackDays 现在最大支持到 1300，够表达到5年），comparator 用 <=、value 填“最近M天内”的M)、daysSinceNewLow(距最近一次创 lookbackDays 日新低多少天——固定滚动窗口，每天重新计算，参考低点会随窗口滑动而“遗忘”旧的低点，跟 drawdownFromHigh 是同一类算法)、daysSinceNewWaveLow(距离“波浪模型”当前这一波下跌里正在形成的低点最近一次被刷新，过去了多少天——不是固定天数窗口，而是跟 drawdownFromWaveHigh/riseFromWaveLow 共用同一套波浪追踪器：只要价格还在创新低，这个“正在形成的低点”就会跟着往下移，值维持在0附近；一旦价格连续几天没有再创比它更低的价格，这个天数就会往上涨。用户描述里说“这一波下跌里没有再创新低”“当前跌势的新低”“波浪下跌的低点N天没有再创新低”这类不带固定天数、指的是当前这一段行情里正在形成的低点（而不是某个固定N日窗口的最低价，也不是distance from已经确认反转的波浪低点）时用这个，不要跟 daysSinceNewLow（固定窗口）或 riseFromWaveLow（距已确认低点反弹%，衡量的是确认反转之后涨了多少，不是有没有创新低）混淆。这个指标不需要 lookbackDays，必须设为 null；需要专属的 waveThreshold 字段（决定这一波下跌被视为已经反转、开启下一个追踪周期的确认幅度），没有特别要求时用默认值5，不要用接近0的数值。comparator 用 >=，value 填“至少N天没创新低”的N)、daysSinceNewWaveHigh(daysSinceNewWaveLow 在高点方向的完全镜像——距离“波浪模型”当前这一波上涨里正在形成的高点最近一次被刷新，过去了多少天；只要价格还在创新高，这个“正在形成的高点”就跟着往上移，值维持在0附近，一旦连续几天没有再创比它更高的价格，天数就往上涨。用户描述里说“这一波上涨里没有再创新高”“当前涨势的新高”“波浪上涨的高点N天没有再创新高”这类不带固定天数、指当前这一段行情里正在形成的高点时用这个，不要跟 daysSinceNewHigh（固定窗口）或 drawdownFromWaveHigh（距已确认高点回撤%，衡量的是确认反转之后跌了多少，不是有没有创新高）混淆。lookbackDays 必须设为 null；同样需要专属 waveThreshold 字段，默认值5。comparator 用 >=，value 填“至少N天没创新高”的N)、upDayCount(N日内上涨天数)、downDayCount(N日内下跌天数)、positionRatio(当前仓位%)、holdingDays(持仓天数)、formula(上面所有固定指标都表达不了时用这个，见下方公式说明)。condition.sustainedDays 大于 1 表示这个条件要连续 N 天成立——用来表达“连续N天满足某条件”，也包括“累计N天”“持续N天以上”“已经N天了”这类说法，只要是在描述同一个条件维持/持续了多少天，不管用户具体用词是“连续”还是“累计”还是“持续”，都必须用 sustainedDays 表达，不能因为用词不是“连续”就当成表达不了而漏掉这个要求。",
    "sustainedDays 和 downDayCount/upDayCount 极易混淆，这是真实出过错的场景，必须特别小心区分：像“波浪高点回撤超过20%，并且下跌时间累计7天以上”这种描述，“下跌时间累计7天以上”紧跟在前一个条件（回撤超过20%）后面、用“并且”连接，说的是前一个条件这个状态本身已经维持了7天，不是一句独立的统计描述——正确写法是给 drawdownFromWaveHigh 那条 condition 加 sustainedDays: 7，绝对不能因为字面出现“下跌...天”这几个字就另外单独造一条 downDayCount 条件：downDayCount 统计的是“N日窗口内逐日收盘价比前一天低的天数”，跟“回撤超过20%这个状态持续了多久”是完全不同的两件事，前面那条 drawdownFromWaveHigh 只要没有 sustainedDays 就只检查“今天”这一天的回撤是否超标，跟需求里“已经持续7天”的意思对不上，会让实际信号跟用户需求脱节。判断方法：看这个“N天”描述前面紧跟着的是不是另一个可比较的条件（某个指标超过/低于某个阈值），如果是、且这句话在说“这个条件持续/累计/已经了N天”，就必须用 sustainedDays 挂在那个条件本身上；只有当“N天内涨跌了几天”本身就是一句独立、不依附于任何其它条件的完整描述时（例如“6天内上涨3天以上”，这句话本身就能单独判断，不是在描述别的条件持续了多久），才用 downDayCount/upDayCount。错误写法（不要这样做）：",
    JSON.stringify({
      strategyType: "block-rules",
      buyBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "drawdownFromWaveHigh", lookbackDays: null, comparator: ">", value: 20, slopeWindowDays: null, sustainedDays: null, waveThreshold: 13.33 },
          { indicator: "downDayCount", lookbackDays: 7, slopeWindowDays: null, comparator: ">=", value: 7, sustainedDays: null, waveThreshold: null },
        ],
        action: { type: "targetShares", value: 1000 },
      }],
    }),
    "正确写法——用 sustainedDays 表达“回撤超过20%这个状态已经持续7天”，不需要额外的 downDayCount 条件：",
    JSON.stringify({
      strategyType: "block-rules",
      buyBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "drawdownFromWaveHigh", lookbackDays: null, comparator: ">", value: 20, slopeWindowDays: null, sustainedDays: 7, waveThreshold: 13.33 },
        ],
        action: { type: "targetShares", value: 1000 },
      }],
    }),
    "drawdownFromWaveHigh 和 riseFromWaveLow 条件都有一个专属字段 condition.waveThreshold（不是模型全局共用的，是这一条 condition 自己的）——drawdownFromWaveHigh 是价格从候选高点回落超过这个百分比才把该高点确认锁定为“波浪高点”，riseFromWaveLow 是价格从候选低点反弹超过这个百分比才把该低点确认锁定为“波浪低点”，两者是完全对称的同一套确认机制，只是方向相反，都是用来过滤噪音、只认真正的转折点；一个模型里如果有多条这两种条件，各自可以有不同的确认阈值，不用互相牵制。默认规则：用户没有明确指定这个阈值时，取这条条件自己 value（回撤/反弹目标）的 2/3 作为 waveThreshold；取值必须大于等于1、且必须小于这条条件自己的 value——绝对不要生成接近0（比如0.1、0.5）或者大于等于 value 的数值：太小会导致“波浪高点/低点”被任何一天的正常波动噪音刷新，起不到过滤转折点的作用；大于等于 value 则会导致高点/低点要等回撤/反弹已经达到甚至超过要筛选的目标才被确认，参考价位会滞后、失真。其他所有指标不需要这个字段，必须设为 null。",
    "condition.comparator 除了 >、>=、<、<=、== 之外，还有 risingStreak 和 fallingStreak 两个特殊值：用来表达“某个指标自己连续 N 天每天都在涨/跌”（比如“10日均线连续3天每天都在涨”“RSI连续5天下降”），这跟 maSlope 只看首尾两个点净变化不一样——risingStreak/fallingStreak 会检查这 N 天里逐日都是同一个方向。用户描述里出现“连续N天都在涨/跌”“连续上行/下行”这类明确要求逐日同向的表述时，必须用 risingStreak/fallingStreak，不要用 maSlope+sustainedDays 或 maSlope+slopeWindowDays 去凑。用这两个值时，condition.value 表示天数 N（正整数），不是阈值，sustainedDays 留空即可。",
    "formula 指标——当用户描述的比较关系用上面固定指标（哪怕组合 sustainedDays/risingStreak）都拼不出来时用这个，最典型的场景是“比较两个不同字段”（比如最低价和均线比较，而不是收盘价；或者当天振幅和历史振幅比较）。用法：indicator 设为 \"formula\"，condition.formula 写一个数学表达式字符串，lookbackDays/slopeWindowDays 都设为 null（窗口天数写在公式字符串内部），comparator/value/sustainedDays 用法不变——公式算出的数字按普通指标一样跟 value 比较。formula 语法：字段 close/open/high/low/volume/pe/peTtm/pb，字段名后面可以加 [-N] 表示N个交易日前（比如 close[-1] 是昨天收盘价），不能写正数偏移量（不能看未来）；函数 sma(表达式,N)/ema(表达式,N)/stdev(表达式,N)/max(表达式,N)/min(表达式,N)/sum(表达式,N)（N 是1-250的整数窗口天数）、rsi(N)、atr(N)、abs(表达式)；支持 + - * / 和括号。formula 语法里没有且/或（and/or），如果需要同时满足多个条件，拆成同一个规则块里的多条 condition（block-rules 里块内条件本来就是且的关系）。公式字符串长度不能超过200字符。示例——“最低价跌破10日均线连续3天卖出”对应 { indicator: \"formula\", formula: \"low - sma(close, 10)\", comparator: \"<\", value: 0, sustainedDays: 3, lookbackDays: null, slopeWindowDays: null }（这跟“收盘价跌破均线”不一样，收盘价跌破用 maValue 就够了，只有明确说“最低价”这种固定指标覆盖不到的字段组合才需要 formula）。对应的完整 JSON：",
    JSON.stringify({
      strategyType: "block-rules",
      sellBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "formula", formula: "low - sma(close, 10)", lookbackDays: null, slopeWindowDays: null, comparator: "<", value: 0, sustainedDays: 3 },
        ],
        action: { type: "exitAll", value: null },
      }],
    }),
    "block-rules 示例——“距离波浪模型最近高点跌超20%且8天没创新高就买1000股；10日均线连续3天每天都在跌就清仓”对应（注意距离“最近高点”用的是 drawdownFromWaveHigh，不是 drawdownFromHigh；“连续3天每天都在跌”用的是 fallingStreak，不是 maSlope）：",
    JSON.stringify({
      strategyType: "block-rules",
      buyBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "drawdownFromWaveHigh", lookbackDays: null, comparator: ">", value: 20, slopeWindowDays: null, sustainedDays: null, waveThreshold: 6.67 },
          { indicator: "daysSinceNewHigh", lookbackDays: 20, comparator: ">=", value: 8, slopeWindowDays: null, sustainedDays: null },
        ],
        action: { type: "targetShares", value: 1000 },
      }],
      sellBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "maLevel", lookbackDays: 10, slopeWindowDays: null, comparator: "fallingStreak", value: 3, sustainedDays: null },
        ],
        action: { type: "exitAll", value: null },
      }],
    }),
    "block-rules 示例——“波浪模型距离最近高点下跌超过20%以上，并且下跌时间累计7天以上，并且最近5天内股价不再创新低，调仓到90%”对应（“下跌超过20%”和“累计7天以上”是同一个 drawdownFromWaveHigh 条件的两个属性，靠 sustainedDays: 7 表达，不要拆成两条条件；“最近5天不再创新低”说的是波浪模型当前这一波下跌里正在形成的低点，不是固定N日窗口的新低，必须用 daysSinceNewWaveLow 而不是 daysSinceNewLow）：",
    JSON.stringify({
      strategyType: "block-rules",
      buyBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "drawdownFromWaveHigh", lookbackDays: null, comparator: ">", value: 20, slopeWindowDays: null, sustainedDays: 7, waveThreshold: 13.33 },
          { indicator: "daysSinceNewWaveLow", lookbackDays: null, comparator: ">=", value: 5, slopeWindowDays: null, sustainedDays: null, waveThreshold: 5 },
        ],
        action: { type: "targetPercent", value: 90 },
      }],
    }),
    "block-rules 示例——“距离波浪模型最近低点反弹超过15%就卖出30%”对应（注意距离“最近低点”反弹用的是 riseFromWaveLow，不是 riseFromLow——riseFromLow 是固定N日滚动窗口的低点，不是波浪确认的真实转折点）：",
    JSON.stringify({
      strategyType: "block-rules",
      sellBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "riseFromWaveLow", lookbackDays: null, comparator: ">", value: 15, slopeWindowDays: null, sustainedDays: null, waveThreshold: 10 },
        ],
        action: { type: "reducePercent", value: 30 },
      }],
    }),
    "block-rules 示例——“股价在过去三天内突破三年内高点创出新高，回落没有跌破三年内的高点，市盈率30倍以下”对应（三年按252个交易日/年换算成 lookbackDays=750；daysSinceNewHigh 和 drawdownFromBreakoutHigh 要用同一个 lookbackDays，因为二者说的是同一次“三年新高”事件；市盈率用 formula 指标）：",
    JSON.stringify({
      strategyType: "block-rules",
      buyBlockRules: [{
        enabled: true,
        conditions: [
          { indicator: "daysSinceNewHigh", lookbackDays: 750, slopeWindowDays: null, comparator: "<=", value: 3, sustainedDays: null },
          { indicator: "drawdownFromBreakoutHigh", lookbackDays: 750, slopeWindowDays: null, comparator: "<=", value: 0, sustainedDays: null },
          { indicator: "formula", formula: "peTtm", lookbackDays: null, slopeWindowDays: null, comparator: "<", value: 30, sustainedDays: null },
        ],
        action: { type: "targetPercent", value: 100 },
      }],
    }),
    "score-rules 用 scoreRules/positionBands 两个数组表达：scoreRules 里每个元素是一条独立打分规则，conditions 是且（AND）关系（一条规则可以只有一个条件），命中就加 points 分；多条规则各自独立判断，不互斥，同一天可以同时命中多条、分数累加得到当天总分。positionBands 每个元素是 { minScore, targetPercent }，从高到低找第一个总分达到 minScore 的档位，把仓位调到对应 targetPercent；总分连最低档都够不到时目标仓位是 0%（清仓），所以 positionBands 一定要包含用户描述里提到的每一个分数门槛。“均线上行”若用户没说连续几天，按“今天比昨天高”理解，即 risingStreak 天数=1。",
    "score-rules 示例——“5天不创新低得10分，5日均线上行得10分，10日均线上行得10分，5日均线大于10日均线得10分，20日均线上行得10分，创15天新低收阳线得10分。得20分半仓买入，30分全仓买入”对应：",
    JSON.stringify({
      strategyType: "score-rules",
      scoreRules: [
        { enabled: true, conditions: [{ indicator: "daysSinceNewLow", lookbackDays: 20, slopeWindowDays: null, comparator: ">=", value: 5, sustainedDays: null }], points: 10 },
        { enabled: true, conditions: [{ indicator: "maLevel", lookbackDays: 5, slopeWindowDays: null, comparator: "risingStreak", value: 1, sustainedDays: null }], points: 10 },
        { enabled: true, conditions: [{ indicator: "maLevel", lookbackDays: 10, slopeWindowDays: null, comparator: "risingStreak", value: 1, sustainedDays: null }], points: 10 },
        { enabled: true, conditions: [{ indicator: "maCompare", lookbackDays: 5, slopeWindowDays: 10, comparator: ">", value: 0, sustainedDays: null }], points: 10 },
        { enabled: true, conditions: [{ indicator: "maLevel", lookbackDays: 20, slopeWindowDays: null, comparator: "risingStreak", value: 1, sustainedDays: null }], points: 10 },
        { enabled: true, conditions: [
            { indicator: "daysSinceNewLow", lookbackDays: 15, slopeWindowDays: null, comparator: "==", value: 0, sustainedDays: null },
            { indicator: "candleBody", lookbackDays: null, slopeWindowDays: null, comparator: ">", value: 0, sustainedDays: null },
          ], points: 10 },
      ],
      positionBands: [
        { minScore: 30, targetPercent: 100 },
        { minScore: 20, targetPercent: 50 },
      ],
    }),
    "不要生成 JavaScript。不要发明 App 不支持的策略类型。",
    "百分比用数字，例如 20 表示 20%。天数用交易日数量。",
    "用户描述里如果明确提到了具体天数（例如“10日均线”“20日高点”“连续5天”“累计7天以上”），生成的 lookbackDays/slopeWindowDays/sustainedDays/buyLookbackDays 等字段必须原样使用该数字，禁止替换成其它数值；只有用户没有给出具体天数时才可以自行估算合理默认值。",
    "用户的描述可能是一整段没有标点分隔、多个条件挤在一起的长句——不要因为两个条件之间没有逗号或“并且”就把它们当成一句话囫囵吞枣地处理，要逐个识别用户提到的每一个独立要求（每一个百分比、每一个天数、每一个方向判断都可能是单独一个条件），确保它们都在 conditions 里各自有一条对应，不能因为断句不清楚就丢掉其中一部分。",
    "如果用户描述里有某个要求，你无法用上面这些固定指标、也无法用 formula 公式准确表达（哪怕想办法凑近似值也不放心），不允许悄悄跳过或者随便選一个不太对的指标凑数——必须如实写进 uncoveredRequirements 数组里（每条是一句人话，说清楚是用户描述里的哪个要求没能表达），生成的规则可以不完整，但不能假装完整；如果所有要求都表达出来了，uncoveredRequirements 留空数组即可。",
    "严格按照以下 JSON Schema 输出一个 JSON 对象，不要有多余字段或说明文字：",
    JSON.stringify(schema),
  ];
}

async function generateModelFromDescription(description, symbol, requestedLabel) {
  const schema = buildModelSchema();
  const prompt = [
    "把用户的交易策略描述转换为 AI Trade 支持的安全模型 JSON。",
    ...buildPromptGuideLines(schema),
    `股票/标的：${symbol || "通用"}`,
    requestedLabel ? `用户指定名称：${requestedLabel}` : "",
    `用户描述：${description}`,
  ].filter(Boolean).join("\n");

  const text = await requestAiJsonModel({
    systemPrompt: "你是量化交易回测 App 的策略解析器。你只输出结构化 JSON，不能输出代码或解释性 Markdown。",
    userPrompt: prompt,
    schema,
    schemaName: "ai_trade_model",
    temperature: 0.2,
  });
  if (!text) {
    const error = new Error("AI 没有返回模型内容。");
    error.statusCode = 502;
    throw error;
  }
  return normalizeGeneratedModel(JSON.parse(text));
}

// Data-driven generation: no human description at all — the AI is handed a compact
// statistical digest of a symbol's own price history (see buildSymbolDataProfile) and asked
// to design a timing model suited to what that data actually looks like. Used by the
// autonomous scripts/universe/run-auto-generate.js pipeline.
// previousAttempts (optional): [{ strategyType, reason }, ...] from earlier
// generateModelFromDataProfile calls for THIS SAME symbol in the same run — passed back in
// so the AI is nudged toward a structurally different idea each time (different strategyType
// and/or different indicators/formula) instead of regenerating variations of the same first
// idea. The caller decides how many attempts to make and which one(s) to keep; this function
// only handles making one attempt genuinely aware of what came before it.
//
// priorSuccessfulModels (optional): [{ symbol, strategyType, reason, year1Annualized,
// year2Annualized }, ...] — OTHER symbols' models that already passed two-separate-years
// validation (see scripts/shared/optimization-results.js's fetchPriorSuccessfulModels), shown
// as few-shot "what has worked elsewhere" context. Deliberately carries only strategyType +
// the AI's own natural-language reason + performance, never the raw config/thresholds — the
// goal is nudging the AI toward IDEAS that have generalized across symbols, not letting it
// parrot exact numeric thresholds tuned for a different stock's price range and volatility.
// The caller is responsible for excluding the symbol currently being generated for (showing a
// symbol its own historical results would leak that symbol's own test-period performance into
// its next candidate) and for deciding how often to pass this at all — search-validated-best.js
// currently does it for a random ~50% of attempts, to compare against blind generation rather
// than assume few-shot examples are strictly better.
async function generateModelFromDataProfile(profile, symbol, previousAttempts = [], priorSuccessfulModels = []) {
  if (!profile) {
    const error = new Error("历史数据不足，无法生成数据画像。");
    error.statusCode = 400;
    throw error;
  }
  const schema = buildModelSchema();
  const diversityLine = previousAttempts.length > 0
    ? `这只股票这次已经尝试过 ${previousAttempts.length} 种模型思路，分别是：${previousAttempts.map((a, i) => `第${i + 1}种[${a.strategyType}]${a.reason ? `（${String(a.reason).slice(0, 60)}）` : ""}`).join("；")}。这次请换一个明显不同的思路——尽量选不同的 strategyType，或者哪怕 strategyType 相同也要换一套不同的指标/公式组合，不要重复前面已经试过的想法。`
    : null;
  const priorSuccessLine = priorSuccessfulModels.length > 0
    ? `参考信息：以下是在其他股票上经过两年独立验证期确认有效的模型思路——${priorSuccessfulModels.map((m, i) => `第${i + 1}个[${m.symbol}/${m.strategyType}]验证年化${m.year1Annualized.toFixed(1)}%/${m.year2Annualized.toFixed(1)}%${m.reason ? `，思路：${String(m.reason).slice(0, 80)}` : ""}`).join("；")}。这些只是思路参考，不是这只股票的答案——具体用哪个 strategyType、哪些指标、什么阈值，必须结合上面这只股票自己的统计特征重新设计，不要照搬其他股票的具体参数（不同股票的价格区间、波动率、趋势特征都不一样）。`
    : null;
  const prompt = [
    "下面是一只股票的历史行情特征摘要（是统计特征，不是原始逐日行情）。请分析这些特征，设计一个尽量跑赢“买入并一直持有”、且最大回撤比买入持有更小的择时模型，转换成 AI Trade 支持的安全模型 JSON。",
    ...buildPromptGuideLines(schema),
    `股票/标的：${symbol || "通用"}`,
    "历史行情特征字段说明：totalReturnPercent=区间总收益率，annualizedVolatilityPercent=年化波动率，maxDrawdownPercent=买入持有的最大回撤，priceVsMa5Percent/priceVsMa20Percent/priceVsMa60Percent=当前价相对5/20/60日均线的偏离%，recentUpDayRatioPercent=最近20日上涨天数占比，rsi14=当前RSI(14)，atrPercentAverage14=最近14日平均ATR%，daysSince60DayHigh/daysSince60DayLow=距60日内最高/最低点的天数。",
    `历史行情特征（JSON）：${JSON.stringify(profile)}`,
    diversityLine,
    priorSuccessLine,
  ].filter(Boolean).join("\n");

  const text = await requestAiJsonModel({
    systemPrompt: "你是量化交易回测 App 的策略设计器。你会看到一只股票的历史行情统计特征，据此设计一个可能有效的择时策略。你只输出结构化 JSON，不能输出代码或解释性 Markdown。",
    userPrompt: prompt,
    schema,
    schemaName: "ai_trade_model",
  });
  if (!text) {
    const error = new Error("AI 没有返回模型内容。");
    error.statusCode = 502;
    throw error;
  }
  return normalizeGeneratedModel(JSON.parse(text));
}

function round2(value) {
  return value === null || value === undefined || !Number.isFinite(value) ? null : Math.round(value * 100) / 100;
}

// Pure statistical digest of a symbol's price history — deliberately NOT the raw OHLCV rows
// (years of daily data is too much for an LLM prompt and is mostly noise); these are the
// summary characteristics an AI can actually reason from when proposing a timing model.
function buildSymbolDataProfile(rows) {
  if (!Array.isArray(rows) || rows.length < 30) return null;
  const n = rows.length;
  const first = rows[0];
  const last = rows[n - 1];
  const totalReturnPercent = first.close > 0 ? ((last.close - first.close) / first.close) * 100 : 0;

  const dailyReturns = [];
  for (let i = 1; i < n; i += 1) {
    const prevClose = rows[i - 1].close;
    dailyReturns.push(prevClose > 0 ? (rows[i].close - prevClose) / prevClose : 0);
  }
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + (b - meanReturn) * (b - meanReturn), 0) / dailyReturns.length;
  const annualizedVolatilityPercent = Math.sqrt(variance) * Math.sqrt(252) * 100;

  let peak = first.close;
  let maxDrawdownPercent = 0;
  rows.forEach((row) => {
    peak = Math.max(peak, row.close);
    const drawdown = peak > 0 ? ((peak - row.close) / peak) * 100 : 0;
    maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdown);
  });

  const smaAt = (days, index) => {
    if (index + 1 < days) return null;
    let sum = 0;
    for (let i = index - days + 1; i <= index; i += 1) sum += rows[i].close;
    return sum / days;
  };
  const maDeviation = (days) => {
    const ma = smaAt(days, n - 1);
    return ma ? ((last.close - ma) / ma) * 100 : null;
  };

  const recentWindow = Math.min(20, n - 1);
  let recentUp = 0;
  for (let i = n - recentWindow; i < n; i += 1) {
    if (rows[i].close > rows[i - 1].close) recentUp += 1;
  }
  const recentUpDayRatioPercent = recentWindow > 0 ? (recentUp / recentWindow) * 100 : null;

  const rsiDays = Math.min(14, n - 1);
  let gains = 0;
  let losses = 0;
  for (let i = n - rsiDays; i < n; i += 1) {
    const change = rows[i].close - rows[i - 1].close;
    gains += Math.max(0, change);
    losses += Math.max(0, -change);
  }
  const rsi14 = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));

  const atrDays = Math.min(14, n - 1);
  let atrSum = 0;
  for (let i = n - atrDays; i < n; i += 1) {
    const prevClose = rows[i - 1].close;
    const trueRange = Math.max(
      rows[i].high - rows[i].low,
      Math.abs(rows[i].high - prevClose),
      Math.abs(rows[i].low - prevClose)
    );
    atrSum += rows[i].close > 0 ? (trueRange / rows[i].close) * 100 : 0;
  }
  const atrPercentAverage14 = atrDays > 0 ? atrSum / atrDays : null;

  const lookback = Math.min(60, n);
  const recentSlice = rows.slice(n - lookback, n);
  let highIndex = 0;
  let lowIndex = 0;
  recentSlice.forEach((row, i) => {
    if (row.high > recentSlice[highIndex].high) highIndex = i;
    if (row.low < recentSlice[lowIndex].low) lowIndex = i;
  });

  return {
    tradingDays: n,
    startDate: first.date,
    endDate: last.date,
    totalReturnPercent: round2(totalReturnPercent),
    annualizedVolatilityPercent: round2(annualizedVolatilityPercent),
    maxDrawdownPercent: round2(maxDrawdownPercent),
    priceVsMa5Percent: round2(maDeviation(5)),
    priceVsMa20Percent: round2(maDeviation(20)),
    priceVsMa60Percent: round2(maDeviation(60)),
    recentUpDayRatioPercent: round2(recentUpDayRatioPercent),
    rsi14: round2(rsi14),
    atrPercentAverage14: round2(atrPercentAverage14),
    daysSince60DayHigh: (lookback - 1) - highIndex,
    daysSince60DayLow: (lookback - 1) - lowIndex,
  };
}

module.exports = {
  SUPPORTED_STRATEGY_TYPES,
  BLOCK_RULE_INDICATORS,
  BLOCK_RULE_COMPARATORS,
  BLOCK_RULE_STREAK_COMPARATORS,
  BLOCK_RULE_ACTION_TYPES,
  requestAiJsonModel,
  normalizeGeneratedModel,
  generateModelFromDescription,
  generateModelFromDataProfile,
  buildSymbolDataProfile,
};
