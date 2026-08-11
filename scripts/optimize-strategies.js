const http = require("http");

const END_DATE = "2026-08-11";
const START_DATE = "2018-08-11";
const CODE = process.argv[2] || "513100";
const INITIAL_CASH = 100000;

const PERIODS = [
  { label: "1y", start: "2025-08-11" },
  { label: "3y", start: "2023-08-11" },
  { label: "5y", start: "2021-08-11" },
  { label: "8y", start: "2018-08-11" },
];

const CURRENT_BEST = {
  "513100": {
    "1y": { returnRate: 33.67, maxDrawdown: 11.25 },
    "3y": { returnRate: 102.47, maxDrawdown: 20.74 },
    "5y": { returnRate: 163.55, maxDrawdown: 20.74 },
    "8y": { returnRate: 437.77, maxDrawdown: 27.50 },
  },
};

const RECOMMENDED_PRESETS = {
  "588000": {
    runner: runWaveStrategy,
    config: {
      type: "wave",
      waveThreshold: 20,
      buyRules: [
        { drop: 5, target: 35 },
        { drop: 10, target: 60 },
        { drop: 15, target: 100 },
      ],
      sellRules: [
        { rise: 40, reduce: 25 },
        { rise: 70, reduce: 70 },
        { rise: 80, reduce: 100 },
      ],
      trailingStops: [],
    },
  },
};

function fetchJson(path) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, "http://127.0.0.1:3000");
    const req = http.get(url, function(res) {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", function(chunk) {
        body += chunk;
      });
      res.on("end", function() {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error("HTTP " + res.statusCode + ": " + body.slice(0, 200)));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, function() {
      req.destroy(new Error("request timed out"));
    });
  });
}

function sliceRows(rows, start) {
  return rows.filter(function(row) {
    return row.date >= start && row.date <= END_DATE;
  });
}

function isValidRow(row) {
  return Number.isFinite(row.open)
    && Number.isFinite(row.close)
    && Number.isFinite(row.high)
    && Number.isFinite(row.low)
    && row.open > 0
    && row.close > 0
    && row.high > 0
    && row.low > 0;
}

function buildContexts(rows) {
  return PERIODS.map(function(period) {
    const periodRows = sliceRows(rows, period.start);
    return {
      period: period.label,
      rows: periodRows,
      hold: buildBuyHold(periodRows),
      cache: {},
    };
  });
}

function createWaveTracker(firstRow, threshold) {
  return {
    trend: "none",
    threshold: threshold,
    high: { price: firstRow.high, date: firstRow.date, version: 0 },
    low: { price: firstRow.low, date: firstRow.date, version: 0 },
    candidateHigh: { price: firstRow.high, date: firstRow.date },
    candidateLow: { price: firstRow.low, date: firstRow.date },
  };
}

function updateWaveTracker(wave, row) {
  const events = [];

  if (row.high > wave.candidateHigh.price) {
    wave.candidateHigh = { price: row.high, date: row.date };
  }

  if (row.low < wave.candidateLow.price) {
    wave.candidateLow = { price: row.low, date: row.date };
  }

  const drawdownFromCandidateHigh = ((wave.candidateHigh.price - row.low) / wave.candidateHigh.price) * 100;
  if (wave.trend !== "down" && drawdownFromCandidateHigh >= wave.threshold) {
    wave.high = {
      price: wave.candidateHigh.price,
      date: wave.candidateHigh.date,
      version: wave.high.version + 1,
    };
    wave.trend = "down";
    wave.candidateLow = { price: row.low, date: row.date };
    events.push("new-high");
  }

  const riseFromCandidateLow = ((row.high - wave.candidateLow.price) / wave.candidateLow.price) * 100;
  if (wave.trend !== "up" && riseFromCandidateLow >= wave.threshold) {
    wave.low = {
      price: wave.candidateLow.price,
      date: wave.candidateLow.date,
      version: wave.low.version + 1,
    };
    wave.trend = "up";
    wave.candidateHigh = { price: row.high, date: row.date };
    events.push("new-low");
  }

  return events;
}

function accountSnapshot(account, row, initialCash, peakEquity) {
  const equity = account.cash + account.shares * row.close;
  const nextPeak = Math.max(peakEquity, equity);
  const drawdown = nextPeak > 0 ? ((nextPeak - equity) / nextPeak) * 100 : 0;
  return {
    equity: equity,
    peakEquity: nextPeak,
    drawdown: drawdown,
    returnRate: initialCash > 0 ? ((equity - initialCash) / initialCash) * 100 : 0,
    positionRatio: equity > 0 ? ((account.shares * row.close) / equity) * 100 : 0,
  };
}

function buyToTarget(account, row, targetPercent) {
  const equity = account.cash + account.shares * row.close;
  const targetValue = equity * targetPercent / 100;
  const currentValue = account.shares * row.close;
  const buyValue = Math.min(account.cash, targetValue - currentValue);
  const shares = Math.floor(buyValue / row.close);
  if (shares <= 0) return false;
  account.cash -= shares * row.close;
  account.shares += shares;
  return true;
}

function sellByReduction(account, row, reducePercent) {
  const equity = account.cash + account.shares * row.close;
  const currentValue = account.shares * row.close;
  const currentRatio = equity > 0 ? currentValue / equity * 100 : 0;
  const targetRatio = Math.max(0, currentRatio - reducePercent);
  const targetValue = equity * targetRatio / 100;
  const sellValue = Math.max(0, currentValue - targetValue);
  const shares = Math.min(account.shares, Math.floor(sellValue / row.close));
  if (shares <= 0) return false;
  account.cash += shares * row.close;
  account.shares -= shares;
  return true;
}

function buildBuyHold(rows) {
  const firstPrice = rows[0].close;
  const shares = Math.floor(INITIAL_CASH / firstPrice);
  const cash = INITIAL_CASH - shares * firstPrice;
  let peakEquity = INITIAL_CASH;
  let maxDrawdown = 0;
  let finalReturn = 0;

  rows.forEach(function(row) {
    const equity = cash + shares * row.close;
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, peakEquity > 0 ? (peakEquity - equity) / peakEquity * 100 : 0);
    finalReturn = (equity - INITIAL_CASH) / INITIAL_CASH * 100;
  });

  return { returnRate: finalReturn, maxDrawdown: maxDrawdown };
}

function runWaveStrategy(rows, config) {
  const account = { cash: INITIAL_CASH, shares: 0 };
  const wave = createWaveTracker(rows[0], config.waveThreshold);
  const triggeredBuys = {};
  const triggeredSells = {};
  const triggeredTrails = {};
  let lastBuy = null;
  let positionHighClose = 0;
  let peakEquity = INITIAL_CASH;
  let maxDrawdown = 0;
  let trades = 0;

  rows.forEach(function(row, index) {
    const events = updateWaveTracker(wave, row);
    if (events.indexOf("new-high") !== -1) {
      Object.keys(triggeredBuys).forEach(function(key) { delete triggeredBuys[key]; });
    }

    const drawdown = wave.high.price > 0 ? (wave.high.price - row.close) / wave.high.price * 100 : 0;
    config.buyRules.forEach(function(rule) {
      const key = wave.high.version + ":" + rule.drop + ":" + rule.target;
      if (drawdown >= rule.drop && !triggeredBuys[key]) {
        if (buyToTarget(account, row, rule.target)) {
          lastBuy = { price: row.close, index: index };
          positionHighClose = Math.max(positionHighClose, row.close);
          Object.keys(triggeredSells).forEach(function(sellKey) { delete triggeredSells[sellKey]; });
          Object.keys(triggeredTrails).forEach(function(trailKey) { delete triggeredTrails[trailKey]; });
          trades += 1;
        }
        triggeredBuys[key] = true;
      }
    });

    if (lastBuy && account.shares > 0) {
      positionHighClose = Math.max(positionHighClose, row.close);
      const rise = lastBuy.price > 0 ? (row.close - lastBuy.price) / lastBuy.price * 100 : 0;
      config.sellRules.forEach(function(rule) {
        const key = lastBuy.index + ":" + lastBuy.price + ":" + rule.rise + ":" + rule.reduce;
        if (rise >= rule.rise && !triggeredSells[key]) {
          if (sellByReduction(account, row, rule.reduce)) trades += 1;
          triggeredSells[key] = true;
        }
      });

      if (config.trailingStops) {
        const trailDrawdown = positionHighClose > 0 ? (positionHighClose - row.close) / positionHighClose * 100 : 0;
        config.trailingStops.forEach(function(rule) {
          const key = lastBuy.index + ":" + positionHighClose + ":" + rule.drop + ":" + rule.reduce;
          if (trailDrawdown >= rule.drop && !triggeredTrails[key]) {
            if (sellByReduction(account, row, rule.reduce)) trades += 1;
            triggeredTrails[key] = true;
          }
        });
      }
    } else if (account.shares <= 0) {
      positionHighClose = 0;
    }

    const snapshot = accountSnapshot(account, row, INITIAL_CASH, peakEquity);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
  });

  const last = accountSnapshot(account, rows[rows.length - 1], INITIAL_CASH, peakEquity);
  return { returnRate: last.returnRate, maxDrawdown: maxDrawdown, trades: trades };
}

function runWaveTrendGuardStrategy(context, config) {
  const rows = context.rows;
  const maSeries = getMovingAverageSeries(context, config.maDays);
  const account = { cash: INITIAL_CASH, shares: 0 };
  const wave = createWaveTracker(rows[0], config.waveThreshold);
  const triggeredBuys = {};
  const triggeredSells = {};
  let lastBuy = null;
  let peakEquity = INITIAL_CASH;
  let maxDrawdown = 0;
  let trades = 0;

  rows.forEach(function(row, index) {
    const events = updateWaveTracker(wave, row);
    if (events.indexOf("new-high") !== -1) {
      Object.keys(triggeredBuys).forEach(function(key) { delete triggeredBuys[key]; });
    }

    const ma = maSeries[index];
    let targetCap = config.noMaCap;
    if (ma) {
      if (row.close < ma * (1 - config.bearCut / 100)) {
        targetCap = config.bearCap;
      } else if (row.close >= ma * (1 + config.recover / 100)) {
        targetCap = config.bullCap;
      } else {
        targetCap = config.neutralCap;
      }
    }

    const equity = account.cash + account.shares * row.close;
    const currentRatio = equity > 0 ? account.shares * row.close / equity * 100 : 0;
    if (currentRatio > targetCap + config.rebalanceBand) {
      if (sellByReduction(account, row, currentRatio - targetCap)) {
        trades += 1;
        Object.keys(triggeredSells).forEach(function(sellKey) { delete triggeredSells[sellKey]; });
      }
    }

    const drawdown = wave.high.price > 0 ? (wave.high.price - row.close) / wave.high.price * 100 : 0;
    config.buyRules.forEach(function(rule) {
      const target = Math.min(rule.target, targetCap);
      const key = wave.high.version + ":" + rule.drop + ":" + target + ":" + targetCap;
      if (target > currentRatio && drawdown >= rule.drop && !triggeredBuys[key]) {
        if (buyToTarget(account, row, target)) {
          lastBuy = { price: row.close, index: index };
          Object.keys(triggeredSells).forEach(function(sellKey) { delete triggeredSells[sellKey]; });
          trades += 1;
        }
        triggeredBuys[key] = true;
      }
    });

    if (lastBuy && account.shares > 0) {
      const rise = lastBuy.price > 0 ? (row.close - lastBuy.price) / lastBuy.price * 100 : 0;
      config.sellRules.forEach(function(rule) {
        const key = lastBuy.index + ":" + lastBuy.price + ":" + rule.rise + ":" + rule.reduce;
        if (rise >= rule.rise && !triggeredSells[key]) {
          if (sellByReduction(account, row, rule.reduce)) trades += 1;
          triggeredSells[key] = true;
        }
      });
    }

    const snapshot = accountSnapshot(account, row, INITIAL_CASH, peakEquity);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
  });

  const last = accountSnapshot(account, rows[rows.length - 1], INITIAL_CASH, peakEquity);
  return { returnRate: last.returnRate, maxDrawdown: maxDrawdown, trades: trades };
}


function getMovingAverageSeries(context, days) {
  const key = "ma:" + days;
  if (context.cache[key]) return context.cache[key];
  const rows = context.rows;
  const values = new Array(rows.length);
  let sum = 0;
  rows.forEach(function(row, index) {
    sum += row.close;
    if (index >= days) sum -= rows[index - days].close;
    values[index] = index + 1 >= days ? sum / days : null;
  });
  context.cache[key] = values;
  return values;
}

function getHighestCloseSeries(context, days) {
  const key = "high:" + days;
  if (context.cache[key]) return context.cache[key];
  const rows = context.rows;
  const values = new Array(rows.length);
  for (let index = 0; index < rows.length; index += 1) {
    const start = Math.max(0, index - days + 1);
    let high = rows[start].close;
    for (let i = start + 1; i <= index; i += 1) {
      high = Math.max(high, rows[i].close);
    }
    values[index] = high;
  }
  context.cache[key] = values;
  return values;
}

function runTrendPullbackStrategy(context, config) {
  const rows = context.rows;
  const fastSeries = getMovingAverageSeries(context, config.fastMa);
  const slowSeries = getMovingAverageSeries(context, config.slowMa);
  const highSeries = getHighestCloseSeries(context, config.highLookback);
  const account = { cash: INITIAL_CASH, shares: 0 };
  let peakEquity = INITIAL_CASH;
  let maxDrawdown = 0;
  let trades = 0;
  let lastTarget = 0;

  rows.forEach(function(row, index) {
    const maFast = fastSeries[index];
    const maSlow = slowSeries[index];
    const rollingHigh = highSeries[index];
    const pullback = rollingHigh > 0 ? (rollingHigh - row.close) / rollingHigh * 100 : 0;
    let target = config.baseTarget;

    if (maSlow && row.close >= maSlow) {
      target = config.upTarget;
    } else if (maFast && row.close >= maFast) {
      target = config.midTarget;
    } else {
      target = config.downTarget;
    }

    config.buyRules.forEach(function(rule) {
      if (pullback >= rule.drop) target = Math.max(target, rule.target);
    });

    if (maSlow && row.close < maSlow * (1 - config.bearCut / 100)) {
      target = Math.min(target, config.bearTarget);
    }

    if (maFast && row.close > maFast * (1 + config.overheat / 100) && pullback < config.pullbackKeep) {
      target = Math.min(target, config.hotTarget);
    }

    if (Math.abs(target - lastTarget) >= config.rebalanceBand) {
      const beforeShares = account.shares;
      if (target > lastTarget) {
        buyToTarget(account, row, target);
      } else {
        const equity = account.cash + account.shares * row.close;
        const currentRatio = equity > 0 ? account.shares * row.close / equity * 100 : 0;
        sellByReduction(account, row, currentRatio - target);
      }
      if (account.shares !== beforeShares) trades += 1;
      lastTarget = target;
    }

    const snapshot = accountSnapshot(account, row, INITIAL_CASH, peakEquity);
    peakEquity = snapshot.peakEquity;
    maxDrawdown = Math.max(maxDrawdown, snapshot.drawdown);
  });

  const last = accountSnapshot(account, rows[rows.length - 1], INITIAL_CASH, peakEquity);
  return { returnRate: last.returnRate, maxDrawdown: maxDrawdown, trades: trades };
}

function scoreCandidate(results) {
  let score = 0;
  let beatsHold = true;
  let beatsCurrent = true;
  const currentBest = CURRENT_BEST[CODE];
  results.forEach(function(result) {
    score += result.model.returnRate - result.hold.returnRate;
    score += (result.hold.maxDrawdown - result.model.maxDrawdown) * 1.5;
    if (result.model.returnRate <= result.hold.returnRate || result.model.maxDrawdown >= result.hold.maxDrawdown) {
      beatsHold = false;
    }
    const current = currentBest && currentBest[result.period];
    if (current && (result.model.returnRate <= current.returnRate || result.model.maxDrawdown >= current.maxDrawdown)) {
      beatsCurrent = false;
    }
  });
  if (!currentBest) beatsCurrent = beatsHold;
  return { score: score, beatsHold: beatsHold, beatsCurrent: beatsCurrent };
}

function evaluate(contexts, runner, config) {
  const results = contexts.map(function(context) {
    const periodRows = context.rows;
    const model = config.type === "trend-pullback" || config.type === "wave-trend-guard"
      ? runner(context, config)
      : runner(periodRows, config);
    return {
      period: context.period,
      model: model,
      hold: context.hold,
    };
  });
  const scored = scoreCandidate(results);
  return {
    config: config,
    results: results,
    score: scored.score,
    beatsHold: scored.beatsHold,
    beatsCurrent: scored.beatsCurrent,
  };
}

function remember(best, candidate, limit) {
  best.push(candidate);
  best.sort(function(a, b) {
    if (a.beatsCurrent !== b.beatsCurrent) return a.beatsCurrent ? -1 : 1;
    if (a.beatsHold !== b.beatsHold) return a.beatsHold ? -1 : 1;
    return b.score - a.score;
  });
  if (best.length > limit) best.length = limit;
}

function rememberRiskFirst(best, candidate, limit) {
  const hasAllPeriodReturnEdge = candidate.results.every(function(result) {
    return result.model.returnRate >= result.hold.returnRate;
  });
  if (!hasAllPeriodReturnEdge) return;

  best.push(candidate);
  best.sort(function(a, b) {
    const riskA = a.results.reduce(function(total, result) {
      return total + (result.hold.maxDrawdown - result.model.maxDrawdown);
    }, 0);
    const riskB = b.results.reduce(function(total, result) {
      return total + (result.hold.maxDrawdown - result.model.maxDrawdown);
    }, 0);
    if (riskA !== riskB) return riskB - riskA;
    return b.score - a.score;
  });
  if (best.length > limit) best.length = limit;
}

function printCandidate(title, candidate) {
  console.log("\n" + title);
  console.log(JSON.stringify(candidate.config));
  candidate.results.forEach(function(result) {
    console.log(
      result.period +
      " model=" + result.model.returnRate.toFixed(2) + "% dd=" + result.model.maxDrawdown.toFixed(2) + "%" +
      " hold=" + result.hold.returnRate.toFixed(2) + "% dd=" + result.hold.maxDrawdown.toFixed(2) + "%" +
      " trades=" + result.model.trades
    );
  });
  console.log("score=" + candidate.score.toFixed(2) + " beatsHold=" + candidate.beatsHold + " beatsCurrent=" + candidate.beatsCurrent);
}

function waveCandidates(contexts) {
  const best = [];
  const waveThresholds = [12, 15, 20, 25];
  const buySets = [
    [{ drop: 5, target: 25 }, { drop: 10, target: 55 }, { drop: 15, target: 100 }],
    [{ drop: 5, target: 30 }, { drop: 10, target: 60 }, { drop: 15, target: 100 }],
    [{ drop: 6, target: 35 }, { drop: 12, target: 70 }, { drop: 18, target: 100 }],
    [{ drop: 8, target: 40 }, { drop: 14, target: 75 }, { drop: 20, target: 100 }],
    [{ drop: 10, target: 50 }, { drop: 15, target: 80 }, { drop: 22, target: 100 }],
  ];

  [25, 30, 35, 40].forEach(function(target1) {
    [55, 60, 70, 80].forEach(function(target2) {
      buySets.push([
        { drop: 5, target: target1 },
        { drop: 10, target: target2 },
        { drop: 15, target: 100 },
      ]);
    });
  });

  const sellSets = [
    [],
    [{ rise: 30, reduce: 25 }, { rise: 50, reduce: 50 }, { rise: 80, reduce: 100 }],
    [{ rise: 25, reduce: 20 }, { rise: 45, reduce: 45 }, { rise: 75, reduce: 100 }],
    [{ rise: 35, reduce: 20 }, { rise: 60, reduce: 55 }, { rise: 95, reduce: 100 }],
    [{ rise: 40, reduce: 30 }, { rise: 70, reduce: 70 }, { rise: 110, reduce: 100 }],
  ];

  [25, 30, 35, 40].forEach(function(rise1) {
    [20, 25, 30].forEach(function(reduce1) {
      [50, 70].forEach(function(rise2) {
        [45, 70].forEach(function(reduce2) {
          [80, 110].forEach(function(rise3) {
            if (rise2 <= rise1 || rise3 <= rise2) return;
            sellSets.push([
              { rise: rise1, reduce: reduce1 },
              { rise: rise2, reduce: reduce2 },
              { rise: rise3, reduce: 100 },
            ]);
          });
        });
      });
    });
  });

  const trailSets = [
    [],
    [{ drop: 18, reduce: 100 }],
  ];

  waveThresholds.forEach(function(waveThreshold) {
    buySets.forEach(function(buyRules) {
      sellSets.forEach(function(sellRules) {
        trailSets.forEach(function(trailingStops) {
          const candidate = evaluate(contexts, runWaveStrategy, {
            type: "wave",
            waveThreshold: waveThreshold,
            buyRules: buyRules,
            sellRules: sellRules,
            trailingStops: trailingStops,
          });
          remember(best, candidate, 12);
        });
      });
    });
  });
  return best;
}

function trendCandidates(contexts) {
  const best = [];
  const fastMas = [20, 45, 60];
  const slowMas = [120, 200];
  const highLookbacks = [120, 252];
  const baseTargets = [0, 20];
  const upTargets = [85, 100];
  const midTargets = [35, 65];
  const downTargets = [0, 30, 45];
  const bearTargets = [0, 30];
  const hotTargets = [50, 70];
  const buySets = [
    [{ drop: 5, target: 35 }, { drop: 10, target: 65 }, { drop: 15, target: 100 }],
    [{ drop: 8, target: 45 }, { drop: 13, target: 75 }, { drop: 20, target: 100 }],
    [{ drop: 10, target: 55 }, { drop: 18, target: 85 }, { drop: 25, target: 100 }],
  ];

  fastMas.forEach(function(fastMa) {
    slowMas.forEach(function(slowMa) {
      if (fastMa >= slowMa) return;
      highLookbacks.forEach(function(highLookback) {
        baseTargets.forEach(function(baseTarget) {
          upTargets.forEach(function(upTarget) {
            midTargets.forEach(function(midTarget) {
              downTargets.forEach(function(downTarget) {
                bearTargets.forEach(function(bearTarget) {
                  hotTargets.forEach(function(hotTarget) {
                    buySets.forEach(function(buyRules) {
                      const candidate = evaluate(contexts, runTrendPullbackStrategy, {
                        type: "trend-pullback",
                        fastMa: fastMa,
                        slowMa: slowMa,
                        highLookback: highLookback,
                        baseTarget: baseTarget,
                        upTarget: upTarget,
                        midTarget: midTarget,
                        downTarget: downTarget,
                        bearTarget: bearTarget,
                        bearCut: 3,
                        hotTarget: hotTarget,
                        overheat: 18,
                        pullbackKeep: 4,
                        rebalanceBand: 8,
                        buyRules: buyRules,
                      });
                      remember(best, candidate, 12);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  return best;
}

function waveTrendGuardCandidates(contexts) {
  const best = [];
  const buySets = [
    [{ drop: 5, target: 35 }, { drop: 10, target: 60 }, { drop: 15, target: 100 }],
    [{ drop: 5, target: 40 }, { drop: 10, target: 70 }, { drop: 15, target: 100 }],
    [{ drop: 8, target: 45 }, { drop: 13, target: 75 }, { drop: 20, target: 100 }],
  ];
  const sellSets = [
    [{ rise: 40, reduce: 30 }, { rise: 70, reduce: 70 }, { rise: 110, reduce: 100 }],
    [{ rise: 30, reduce: 25 }, { rise: 60, reduce: 55 }, { rise: 90, reduce: 100 }],
    [{ rise: 35, reduce: 20 }, { rise: 70, reduce: 50 }, { rise: 110, reduce: 100 }],
  ];

  [15, 20, 25].forEach(function(waveThreshold) {
    [80, 120, 160, 200].forEach(function(maDays) {
      [0, 3, 5, 8].forEach(function(bearCut) {
        [0, 20, 35].forEach(function(bearCap) {
          [50, 70, 100].forEach(function(neutralCap) {
            [0, 2, 5].forEach(function(recover) {
              buySets.forEach(function(buyRules) {
                sellSets.forEach(function(sellRules) {
                  const candidate = evaluate(contexts, runWaveTrendGuardStrategy, {
                    type: "wave-trend-guard",
                    waveThreshold: waveThreshold,
                    maDays: maDays,
                    bearCut: bearCut,
                    bearCap: bearCap,
                    neutralCap: neutralCap,
                    bullCap: 100,
                    noMaCap: maDays >= 160 ? 0 : 100,
                    recover: recover,
                    rebalanceBand: 8,
                    buyRules: buyRules,
                    sellRules: sellRules,
                  });
                  remember(best, candidate, 12);
                });
              });
            });
          });
        });
      });
    });
  });
  return best;
}

async function main() {
  const data = await fetchJson("/api/klines?code=" + CODE + "&start=" + START_DATE + "&end=" + END_DATE);
  const rows = data.rows.filter(isValidRow);
  console.log("rows=" + rows.length + " source=" + data.source + " first=" + rows[0].date + " last=" + rows[rows.length - 1].date);
  const contexts = buildContexts(rows);

  const best = [];
  const riskFirst = [];
  waveCandidates(contexts).forEach(function(candidate) {
    remember(best, candidate, 20);
    rememberRiskFirst(riskFirst, candidate, 12);
  });
  trendCandidates(contexts).forEach(function(candidate) {
    remember(best, candidate, 20);
    rememberRiskFirst(riskFirst, candidate, 12);
  });
  waveTrendGuardCandidates(contexts).forEach(function(candidate) {
    remember(best, candidate, 20);
    rememberRiskFirst(riskFirst, candidate, 12);
  });

  best.slice(0, 8).forEach(function(candidate, index) {
    printCandidate("candidate #" + (index + 1), candidate);
  });

  const winner = best.filter(function(candidate) {
    return candidate.beatsCurrent;
  })[0];

  if (winner) {
    printCandidate(CURRENT_BEST[CODE] ? "STRICT WINNER" : "BEST ALL-PERIOD HOLD WINNER", winner);
  } else {
    console.log("\nNo candidate beat the comparison target on every 1/3/5/8 year return and drawdown test.");
  }

  if (RECOMMENDED_PRESETS[CODE]) {
    const preset = RECOMMENDED_PRESETS[CODE];
    printCandidate("RECOMMENDED PRESET", evaluate(contexts, preset.runner, preset.config));
  }

  riskFirst.slice(0, 5).forEach(function(candidate, index) {
    printCandidate("risk-first candidate #" + (index + 1), candidate);
  });
}

main().catch(function(error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
