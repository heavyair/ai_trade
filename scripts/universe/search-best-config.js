// Shared by run-optimization-scan.js (re-optimizing an existing saved preset) and
// run-auto-generate.js (optimizing a freshly AI-generated model skeleton) — "given a model
// structure and a symbol's rows, discover its tunable numeric parameters and grid/random-
// search for the best-scoring combination" doesn't depend on where the model structure came
// from. Extracted out of run-optimization-scan.js instead of being copy-pasted a second time.

function buildCandidates(engine, preset, descriptors, baseConfig, candidatesPerPair) {
  const candidates = [];
  if (descriptors.length === 0) {
    candidates.push(engine.buildConfigFromDescriptorCombo(baseConfig, preset, preset.strategyType, descriptors, []));
    return candidates;
  }
  const valueLists = descriptors.map((d) => engine.buildRangeValues(d));
  const totalCombinations = valueLists.reduce((acc, list) => acc * Math.max(1, list.length), 1);
  if (totalCombinations <= candidatesPerPair) {
    let combos = [[]];
    valueLists.forEach((values) => {
      const next = [];
      combos.forEach((combo) => values.forEach((v) => next.push([...combo, v])));
      combos = next;
    });
    combos.forEach((combo) => candidates.push(engine.buildConfigFromDescriptorCombo(baseConfig, preset, preset.strategyType, descriptors, combo)));
  } else {
    for (let i = 0; i < candidatesPerPair; i += 1) {
      const combo = valueLists.map((values) => values[Math.floor(Math.random() * values.length)]);
      candidates.push(engine.buildConfigFromDescriptorCombo(baseConfig, preset, preset.strategyType, descriptors, combo));
    }
  }
  return candidates;
}

// preset: an object with strategyType + whatever rule/condition fields that strategy type
// needs (same shape engine.discoverOptimizationParameters/buildConfigFromDescriptorCombo
// already expect — a saved DB preset row's config, or a freshly normalizeGeneratedModel'd AI
// output, both qualify). Returns null if every candidate throws/produces no states.
function searchBestConfig(engine, preset, rows, baseConfig, candidatesPerPair) {
  const descriptors = engine.discoverOptimizationParameters(preset);
  const candidates = buildCandidates(engine, preset, descriptors, baseConfig, candidatesPerPair);

  let best = null;
  let bestScore = -Infinity;
  for (const candidateConfig of candidates) {
    const states = engine.buildBacktestStates(rows, candidateConfig);
    const last = states[states.length - 1];
    if (!last) continue;
    const score = engine.scoreBacktestState(last);
    if (score > bestScore) {
      bestScore = score;
      best = { config: candidateConfig, last, score };
    }
  }
  if (!best) return null;
  return { ...best, testedCandidates: candidates.length };
}

module.exports = { searchBestConfig, buildCandidates };
