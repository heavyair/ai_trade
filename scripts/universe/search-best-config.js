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

function evaluateCandidateConfig(engine, rows, config) {
  const states = engine.buildBacktestStates(rows, config);
  const last = states[states.length - 1];
  if (!last) return null;
  return { config, last, score: engine.scoreBacktestState(last) };
}

// candidatesPerPair is split across these fractions (last round soaks up whatever's left
// over from rounding, so the total tested never exceeds the requested budget).
const REFINEMENT_ROUND_FRACTIONS = [0.4, 0.3, 0.3];
// How much each round shrinks a parameter's search width relative to its ORIGINAL
// min/max, re-centered on the previous round's best value each time — not a multiplicative
// shrink of the already-shrunk window, so the search doesn't collapse to a point too fast.
const REFINEMENT_SHRINK_FACTOR = 0.4;

// Re-centers one descriptor's [min, max] on centerValue, at REFINEMENT_SHRINK_FACTOR of its
// original width, clamped back inside the original bounds (so refinement can't wander
// outside the range the caller/UI originally configured for this parameter).
function narrowDescriptor(descriptor, centerValue, shrinkFactor) {
  if (descriptor.locked) return descriptor;
  const origMin = Math.min(descriptor.min, descriptor.max);
  const origMax = Math.max(descriptor.min, descriptor.max);
  const width = (origMax - origMin) * shrinkFactor;
  let newMin = centerValue - width / 2;
  let newMax = centerValue + width / 2;
  if (newMin < origMin) {
    newMax = Math.min(origMax, newMax + (origMin - newMin));
    newMin = origMin;
  }
  if (newMax > origMax) {
    newMin = Math.max(origMin, newMin - (newMax - origMax));
    newMax = origMax;
  }
  return { ...descriptor, min: newMin, max: newMax, currentValue: centerValue };
}

// preset: an object with strategyType + whatever rule/condition fields that strategy type
// needs (same shape engine.discoverOptimizationParameters/buildConfigFromDescriptorCombo
// already expect — a saved DB preset row's config, or a freshly normalizeGeneratedModel'd AI
// output, both qualify). Returns null if every candidate throws/produces no states.
//
// When the full parameter grid fits inside candidatesPerPair, this stays a plain exhaustive
// grid search (nothing to gain from refinement there — the grid already IS the optimum at its
// resolution). Otherwise, instead of spending the whole budget on one blind i.i.d. random draw
// (where trial #50 has zero relationship to how trials #1-49 scored), the budget is spent
// across a few rounds: each round samples randomly within the current search window, then the
// next round's window is re-centered (and narrowed) on the best combo found so far. This is a
// lightweight, no-dependency approximation of what a full Bayesian-optimization surrogate model
// buys you — later trials concentrate near known-good regions instead of continuing to sample
// uniformly at random everywhere — without needing a Gaussian process or acquisition function.
function searchBestConfig(engine, preset, rows, baseConfig, candidatesPerPair) {
  const descriptors = engine.discoverOptimizationParameters(preset);

  if (descriptors.length === 0) {
    const candidates = buildCandidates(engine, preset, descriptors, baseConfig, candidatesPerPair);
    const result = evaluateCandidateConfig(engine, rows, candidates[0]);
    return result ? { ...result, testedCandidates: candidates.length } : null;
  }

  const valueLists = descriptors.map((d) => engine.buildRangeValues(d));
  const totalCombinations = valueLists.reduce((acc, list) => acc * Math.max(1, list.length), 1);
  if (totalCombinations <= candidatesPerPair) {
    const candidates = buildCandidates(engine, preset, descriptors, baseConfig, candidatesPerPair);
    let best = null;
    let bestScore = -Infinity;
    let tested = 0;
    for (const config of candidates) {
      const result = evaluateCandidateConfig(engine, rows, config);
      tested += 1;
      if (result && result.score > bestScore) {
        bestScore = result.score;
        best = result;
      }
    }
    return best ? { ...best, testedCandidates: tested } : null;
  }

  let searchDescriptors = descriptors;
  let overallBest = null;
  let overallBestScore = -Infinity;
  let tested = 0;

  for (let round = 0; round < REFINEMENT_ROUND_FRACTIONS.length; round += 1) {
    const isLastRound = round === REFINEMENT_ROUND_FRACTIONS.length - 1;
    const roundBudget = isLastRound
      ? candidatesPerPair - tested
      : Math.max(1, Math.round(candidatesPerPair * REFINEMENT_ROUND_FRACTIONS[round]));
    if (roundBudget <= 0) break;

    const roundValueLists = searchDescriptors.map((d) => engine.buildRangeValues(d));
    let roundBestCombo = null;
    let roundBestScore = -Infinity;

    for (let i = 0; i < roundBudget; i += 1) {
      const combo = roundValueLists.map((values) => values[Math.floor(Math.random() * values.length)]);
      const config = engine.buildConfigFromDescriptorCombo(baseConfig, preset, preset.strategyType, descriptors, combo);
      const result = evaluateCandidateConfig(engine, rows, config);
      tested += 1;
      if (!result) continue;
      if (result.score > roundBestScore) {
        roundBestScore = result.score;
        roundBestCombo = combo;
      }
      if (result.score > overallBestScore) {
        overallBestScore = result.score;
        overallBest = result;
      }
    }

    if (!roundBestCombo) continue;
    if (!isLastRound) {
      searchDescriptors = descriptors.map((d, i) => narrowDescriptor(d, roundBestCombo[i], REFINEMENT_SHRINK_FACTOR));
    }
  }

  if (!overallBest) return null;
  return { ...overallBest, testedCandidates: tested };
}

module.exports = { searchBestConfig, buildCandidates };
