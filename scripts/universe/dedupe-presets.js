// Shared by run-optimization-scan.js and server.js's admin status endpoint, so both
// "which presets will actually get scanned" and "which presets does the admin UI offer
// as checkable rows" agree — a preset that dedup drops shouldn't be checkable at all,
// since checking it and clicking "重新扫描" would silently match zero presets and do
// nothing (see the bug this module was extracted to fix).
//
// No side effects on require — safe to load from server.js without triggering any scan.

// Strategy types whose config "shape" is fixed by strategyType alone (a single flat
// rule object) — for these, different saved presets are just different starting
// parameter values, and buildRangeValues() already generates a search range around
// whatever value it's given, so scanning more than one per type re-explores nearly
// the same space for several times the compute cost.
const FLAT_PARAM_TYPES = new Set(["wave", "order-grid", "ma-rsi-band", "pe-volume", "stagnation-reversal", "local-high-ladder"]);

// block-rules presets can encode genuinely different indicator/condition combinations
// (that's the point of the type), so they can't be collapsed to "one per type" the way
// flat-rule presets can. Two presets are considered the same underlying model only if
// their block structure (indicators + comparators + action types, ignoring thresholds)
// matches exactly.
function computeBlockRuleSignature(preset) {
  const summarizeBlocks = (blocks) => (Array.isArray(blocks) ? blocks : []).map((block) => ({
    conditions: (Array.isArray(block.conditions) ? block.conditions : []).map((c) => `${c.indicator}${c.comparator}`),
    actionType: block.action && block.action.type,
  }));
  return JSON.stringify({ buy: summarizeBlocks(preset.buyBlockRules), sell: summarizeBlocks(preset.sellBlockRules) });
}

// Collapses near-duplicate presets ("same model, different parameters") down to one
// representative (the most recently updated) per type/signature, so the batch scan
// spends its compute on distinct models rather than repeatedly re-optimizing what is
// effectively the same starting point.
function dedupePresetsForScan(presets) {
  const flatBestByType = new Map();
  const blockRuleBestBySignature = new Map();
  const others = [];
  const skipped = [];

  presets.forEach((preset) => {
    if (FLAT_PARAM_TYPES.has(preset.strategyType)) {
      const existing = flatBestByType.get(preset.strategyType);
      if (!existing || preset.updatedAt > existing.updatedAt) {
        if (existing) skipped.push({ preset: existing, reason: `与 ${preset.label} 同为 ${preset.strategyType} 类型，取较新的一个` });
        flatBestByType.set(preset.strategyType, preset);
      } else {
        skipped.push({ preset, reason: `与 ${existing.label} 同为 ${preset.strategyType} 类型，取较新的一个` });
      }
    } else if (preset.strategyType === "block-rules") {
      const signature = computeBlockRuleSignature(preset);
      const existing = blockRuleBestBySignature.get(signature);
      if (!existing || preset.updatedAt > existing.updatedAt) {
        if (existing) skipped.push({ preset: existing, reason: `与 ${preset.label} 规则结构相同，取较新的一个` });
        blockRuleBestBySignature.set(signature, preset);
      } else {
        skipped.push({ preset, reason: `与 ${existing.label} 规则结构相同，取较新的一个` });
      }
    } else {
      others.push(preset);
    }
  });

  const kept = [...flatBestByType.values(), ...blockRuleBestBySignature.values(), ...others];
  return { kept, skipped };
}

module.exports = { FLAT_PARAM_TYPES, computeBlockRuleSignature, dedupePresetsForScan };
