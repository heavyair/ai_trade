const http = require("http");

const CODE = process.argv[2] || "000651";
const BASE_URL = process.env.AI_TRADE_URL || "http://127.0.0.1:3108";
const INITIAL_CASH = 100000;
const TRADE_FEE = 5;
const END_DATE = "2026-08-12";
const START_DATE = "2016-08-12";
const PERIOD_YEARS = [1, 2, 3, 4, 5, 8, 10];
const TARGET_CAGR = Number(process.argv[3] || process.env.TARGET_CAGR || 15);

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.setTimeout(60000, () => {
      req.destroy(new Error("request timed out"));
    });
    req.on("error", reject);
  });
}

function shiftYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function dateString(date) {
  return date.toISOString().slice(0, 10);
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

function createContext(rows) {
  return { rows, cache: {} };
}

function getMa(context, days) {
  const key = `ma:${days}`;
  if (context.cache[key]) return context.cache[key];
  const values = new Array(context.rows.length);
  let sum = 0;
  context.rows.forEach((row, index) => {
    sum += row.close;
    if (index >= days) sum -= context.rows[index - days].close;
    values[index] = index + 1 >= days ? sum / days : null;
  });
  context.cache[key] = values;
  return values;
}

function getHigh(context, days) {
  const key = `high:${days}`;
  if (context.cache[key]) return context.cache[key];
  const values = new Array(context.rows.length);
  for (let index = 0; index < context.rows.length; index += 1) {
    const start = Math.max(0, index - days + 1);
    let best = context.rows[start].high;
    for (let i = start + 1; i <= index; i += 1) best = Math.max(best, context.rows[i].high);
    values[index] = best;
  }
  context.cache[key] = values;
  return values;
}

function getLow(context, days) {
  const key = `low:${days}`;
  if (context.cache[key]) return context.cache[key];
  const values = new Array(context.rows.length);
  for (let index = 0; index < context.rows.length; index += 1) {
    const start = Math.max(0, index - days + 1);
    let best = context.rows[start].low;
    for (let i = start + 1; i <= index; i += 1) best = Math.min(best, context.rows[i].low);
    values[index] = best;
  }
  context.cache[key] = values;
  return values;
}

function getRsi(context, days) {
  const key = `rsi:${days}`;
  if (context.cache[key]) return context.cache[key];
  const values = new Array(context.rows.length).fill(null);
  let gains = 0;
  let losses = 0;
  for (let index = 1; index < context.rows.length; index += 1) {
    const change = context.rows[index].close - context.rows[index - 1].close;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    gains += gain;
    losses += loss;
    if (index > days) {
      const oldChange = context.rows[index - days].close - context.rows[index - days - 1].close;
      gains -= Math.max(0, oldChange);
      losses -= Math.max(0, -oldChange);
    }
    if (index >= days) {
      values[index] = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
    }
  }
  context.cache[key] = values;
  return values;
}

function getAtrPercent(context, days) {
  const key = `atrp:${days}`;
  if (context.cache[key]) return context.cache[key];
  const values = new Array(context.rows.length).fill(null);
  let sum = 0;
  context.rows.forEach((row, index) => {
    const prevClose = index > 0 ? context.rows[index - 1].close : row.close;
    const tr = Math.max(row.high - row.low, Math.abs(row.high - prevClose), Math.abs(row.low - prevClose));
    sum += tr;
    if (index >= days) {
      const old = context.rows[index - days];
      const oldPrevClose = index - days > 0 ? context.rows[index - days - 1].close : old.close;
      sum -= Math.max(old.high - old.low, Math.abs(old.high - oldPrevClose), Math.abs(old.low - oldPrevClose));
    }
    values[index] = index + 1 >= days ? (sum / days / row.close) * 100 : null;
  });
  context.cache[key] = values;
  return values;
}

function tradeToTarget(account, row, targetPercent) {
  const equity = account.cash + account.shares * row.close;
  const targetShares = Math.floor((equity * targetPercent / 100) / row.close);
  const delta = targetShares - account.shares;
  if (delta === 0) return false;

  if (delta > 0) {
    const maxShares = Math.floor(Math.max(0, account.cash - TRADE_FEE) / row.close);
    const shares = Math.min(delta, maxShares);
    if (shares <= 0) return false;
    account.cash -= shares * row.close + TRADE_FEE;
    account.shares += shares;
  } else {
    const shares = Math.min(account.shares, -delta);
    if (shares <= 0) return false;
    account.cash += shares * row.close - TRADE_FEE;
    account.shares -= shares;
  }
  account.fees += TRADE_FEE;
  account.trades += 1;
  return true;
}

function evaluateTargetSeries(context, targetFn) {
  const account = { cash: INITIAL_CASH, shares: 0, trades: 0, fees: 0 };
  let peakEquity = INITIAL_CASH;
  let maxDrawdown = 0;

  context.rows.forEach((row, index) => {
    const target = Math.max(0, Math.min(100, targetFn(row, index, context, account)));
    tradeToTarget(account, row, target);
    const equity = account.cash + account.shares * row.close;
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0);
  });

  const last = context.rows[context.rows.length - 1];
  const equity = account.cash + account.shares * last.close;
  return {
    returnRate: ((equity - INITIAL_CASH) / INITIAL_CASH) * 100,
    cagr: annualize(INITIAL_CASH, equity, context.rows[0].date, last.date),
    maxDrawdown,
    trades: account.trades,
    fees: account.fees,
  };
}

function evaluateLeveragedTargetSeries(context, targetFn, maxTarget) {
  const account = { cash: INITIAL_CASH, shares: 0, trades: 0, fees: 0 };
  let peakEquity = INITIAL_CASH;
  let maxDrawdown = 0;
  let ruined = false;

  context.rows.forEach((row, index) => {
    if (ruined) return;
    const target = Math.max(0, Math.min(maxTarget, targetFn(row, index, context, account)));
    tradeToTargetLongShort(account, row, target);
    const equity = account.cash + account.shares * row.close;
    if (equity <= 0) {
      ruined = true;
      maxDrawdown = 100;
      return;
    }
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0);
  });

  const last = context.rows[context.rows.length - 1];
  const equity = account.cash + account.shares * last.close;
  return {
    returnRate: ruined ? -100 : ((equity - INITIAL_CASH) / INITIAL_CASH) * 100,
    cagr: ruined ? -100 : annualize(INITIAL_CASH, equity, context.rows[0].date, last.date),
    maxDrawdown,
    trades: account.trades,
    fees: account.fees,
  };
}

function tradeToTargetLongShort(account, row, targetPercent) {
  const equity = account.cash + account.shares * row.close;
  if (equity <= 0) return false;
  const targetSharesRaw = (equity * targetPercent / 100) / row.close;
  const targetShares = targetSharesRaw >= 0 ? Math.floor(targetSharesRaw) : Math.ceil(targetSharesRaw);
  const delta = targetShares - account.shares;
  if (delta === 0) return false;

  if (delta > 0) {
    account.cash -= delta * row.close + TRADE_FEE;
    account.shares += delta;
  } else {
    const shares = -delta;
    account.cash += shares * row.close - TRADE_FEE;
    account.shares -= shares;
  }
  account.fees += TRADE_FEE;
  account.trades += 1;
  return true;
}

function evaluateLongShortTargetSeries(context, targetFn) {
  const account = { cash: INITIAL_CASH, shares: 0, trades: 0, fees: 0 };
  let peakEquity = INITIAL_CASH;
  let maxDrawdown = 0;
  let ruined = false;

  context.rows.forEach((row, index) => {
    if (ruined) return;
    const target = Math.max(-100, Math.min(100, targetFn(row, index, context, account)));
    tradeToTargetLongShort(account, row, target);
    const equity = account.cash + account.shares * row.close;
    if (equity <= 0) {
      ruined = true;
      maxDrawdown = 100;
      return;
    }
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0);
  });

  const last = context.rows[context.rows.length - 1];
  const equity = account.cash + account.shares * last.close;
  return {
    returnRate: ruined ? -100 : ((equity - INITIAL_CASH) / INITIAL_CASH) * 100,
    cagr: ruined ? -100 : annualize(INITIAL_CASH, equity, context.rows[0].date, last.date),
    maxDrawdown,
    trades: account.trades,
    fees: account.fees,
  };
}

function buildBuyHold(context) {
  return evaluateTargetSeries(context, () => 100);
}

function annualize(startValue, endValue, startDate, endDate) {
  const years = (new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0 || startValue <= 0 || endValue <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

function sliceByYears(rows, years) {
  const lastDate = new Date(`${rows[rows.length - 1].date}T00:00:00`);
  const start = dateString(shiftYears(lastDate, -years));
  return rows.filter((row) => row.date >= start);
}

function evaluateCandidate(rows, config, runner) {
  const results = PERIOD_YEARS.map((years) => {
    const periodRows = sliceByYears(rows, years);
    const context = createContext(periodRows);
    const model = runner(context, config);
    const hold = buildBuyHold(context);
    return { years, model, hold };
  });
  const minCagr = Math.min(...results.map((result) => result.model.cagr));
  const avgCagr = results.reduce((total, result) => total + result.model.cagr, 0) / results.length;
  const avgExcess = results.reduce((total, result) => total + result.model.cagr - result.hold.cagr, 0) / results.length;
  const riskEdge = results.reduce((total, result) => total + result.hold.maxDrawdown - result.model.maxDrawdown, 0) / results.length;
  const score = avgCagr * 2 + minCagr * 4 + avgExcess + riskEdge * 0.4;
  const allCagrAboveTarget = results.every((result) => result.model.cagr >= TARGET_CAGR);
  const allBeatHold = results.every((result) => result.model.returnRate >= result.hold.returnRate);
  return { config, results, minCagr, avgCagr, avgExcess, riskEdge, score, allCagrAboveTarget, allBeatHold };
}

function remember(best, candidate, limit) {
  best.push(candidate);
  best.sort((a, b) => {
    if (a.allCagrAboveTarget !== b.allCagrAboveTarget) return a.allCagrAboveTarget ? -1 : 1;
    if (a.allBeatHold !== b.allBeatHold) return a.allBeatHold ? -1 : 1;
    return b.score - a.score;
  });
  if (best.length > limit) best.length = limit;
}

function rememberBy(best, candidate, limit, scoreFn) {
  best.push(candidate);
  best.sort((a, b) => scoreFn(b) - scoreFn(a));
  if (best.length > limit) best.length = limit;
}

function runMaBand(context, config) {
  const fast = getMa(context, config.fastMa);
  const slow = getMa(context, config.slowMa);
  const rsi = getRsi(context, config.rsiDays);
  const atr = getAtrPercent(context, config.atrDays);
  return evaluateTargetSeries(context, (row, index) => {
    const maFast = fast[index];
    const maSlow = slow[index];
    if (!maSlow || !maFast) return 0;
    let target = row.close >= maSlow * (1 + config.slowBuffer / 100) ? config.bullTarget : config.bearTarget;
    if (row.close >= maFast && maFast >= maSlow) target = Math.max(target, config.fastBullTarget);
    if (row.close < maFast * (1 - config.fastCut / 100)) target = Math.min(target, config.fastBearTarget);
    if (rsi[index] !== null && rsi[index] <= config.rsiBuy) target = Math.max(target, config.rsiTarget);
    if (rsi[index] !== null && rsi[index] >= config.rsiSell) target = Math.min(target, config.hotTarget);
    if (atr[index] !== null && atr[index] >= config.highAtr) target = Math.min(target, config.volTarget);
    return target;
  });
}

function runDonchian(context, config) {
  const high = getHigh(context, config.breakoutDays);
  const low = getLow(context, config.exitDays);
  const ma = getMa(context, config.maDays);
  let target = 0;
  let peakClose = 0;
  return evaluateTargetSeries(context, (row, index) => {
    if (index === 0) return 0;
    const prevHigh = high[index - 1];
    const prevLow = low[index - 1];
    if (ma[index] && row.close >= ma[index] * (1 + config.maBuffer / 100) && row.close >= prevHigh * (1 + config.breakBuffer / 100)) {
      target = config.target;
      peakClose = row.close;
    }
    if (target > 0) {
      peakClose = Math.max(peakClose, row.close);
      const trailDrop = peakClose > 0 ? (peakClose - row.close) / peakClose * 100 : 0;
      if (row.close <= prevLow * (1 - config.exitBuffer / 100) || trailDrop >= config.trailDrop || (ma[index] && row.close < ma[index] * (1 - config.maExit / 100))) {
        target = 0;
      }
    }
    return target;
  });
}

function runRsiReversion(context, config) {
  const ma = getMa(context, config.maDays);
  const rsi = getRsi(context, config.rsiDays);
  const low = getLow(context, config.lowDays);
  let target = 0;
  let entryPrice = 0;
  return evaluateTargetSeries(context, (row, index) => {
    if (!ma[index] || rsi[index] === null) return target;
    const dropToLow = low[index] > 0 ? (row.close - low[index]) / low[index] * 100 : 0;
    if (target === 0 && row.close >= ma[index] * (1 - config.maTolerance / 100) && rsi[index] <= config.buyRsi) {
      target = config.target;
      entryPrice = row.close;
    }
    if (target > 0) {
      const gain = entryPrice > 0 ? (row.close - entryPrice) / entryPrice * 100 : 0;
      if (rsi[index] >= config.sellRsi || gain >= config.takeProfit || gain <= -config.stopLoss || dropToLow >= config.lowBounce) {
        target = 0;
      }
    }
    return target;
  });
}

function runLeveragedRsiReversion(context, config) {
  const ma = getMa(context, config.maDays);
  const rsi = getRsi(context, config.rsiDays);
  let target = 0;
  let entryPrice = 0;
  return evaluateLeveragedTargetSeries(context, (row, index) => {
    if (!ma[index] || rsi[index] === null) return target;
    if (target === 0 && row.close >= ma[index] * (1 - config.maTolerance / 100) && rsi[index] <= config.buyRsi) {
      target = config.target;
      entryPrice = row.close;
    }
    if (target > 0) {
      const gain = entryPrice > 0 ? (row.close - entryPrice) / entryPrice * 100 : 0;
      if (rsi[index] >= config.sellRsi || gain >= config.takeProfit || gain <= -config.stopLoss) {
        target = 0;
      }
    }
    return target;
  }, config.maxTarget);
}

function runLeveragedMaBand(context, config) {
  const fast = getMa(context, config.fastMa);
  const slow = getMa(context, config.slowMa);
  const rsi = getRsi(context, config.rsiDays);
  return evaluateLeveragedTargetSeries(context, (row, index) => {
    if (!fast[index] || !slow[index] || rsi[index] === null) return 0;
    if (row.close >= slow[index] * (1 + config.slowBuffer / 100) && fast[index] >= slow[index]) {
      return rsi[index] >= config.rsiSell ? config.hotTarget : config.bullTarget;
    }
    if (rsi[index] <= config.rsiBuy && row.close >= slow[index] * (1 - config.maTolerance / 100)) {
      return config.rsiTarget;
    }
    return config.bearTarget;
  }, config.maxTarget);
}

function runLongShortMa(context, config) {
  const fast = getMa(context, config.fastMa);
  const slow = getMa(context, config.slowMa);
  const rsi = getRsi(context, config.rsiDays);
  return evaluateLongShortTargetSeries(context, (row, index) => {
    if (!fast[index] || !slow[index] || rsi[index] === null) return 0;
    const fastSlope = index >= config.slopeDays && fast[index - config.slopeDays]
      ? (fast[index] - fast[index - config.slopeDays]) / fast[index - config.slopeDays] * 100
      : 0;
    const slowSlope = index >= config.slopeDays && slow[index - config.slopeDays]
      ? (slow[index] - slow[index - config.slopeDays]) / slow[index - config.slopeDays] * 100
      : 0;
    if (row.close > slow[index] * (1 + config.longBuffer / 100) && fast[index] > slow[index] && fastSlope >= config.longSlope) {
      return rsi[index] >= config.overbought ? config.hotLongTarget : config.longTarget;
    }
    if (row.close < slow[index] * (1 - config.shortBuffer / 100) && fast[index] < slow[index] && slowSlope <= -config.shortSlope) {
      return rsi[index] <= config.oversold ? config.coolShortTarget : -config.shortTarget;
    }
    if (row.close > fast[index] && fast[index] > slow[index]) return config.neutralLongTarget;
    if (row.close < fast[index] && fast[index] < slow[index]) return -config.neutralShortTarget;
    return 0;
  });
}

function runLongShortChannel(context, config) {
  const high = getHigh(context, config.breakoutDays);
  const low = getLow(context, config.breakoutDays);
  const exitHigh = getHigh(context, config.exitDays);
  const exitLow = getLow(context, config.exitDays);
  const ma = getMa(context, config.maDays);
  let target = 0;
  let peak = 0;
  let trough = Infinity;
  return evaluateLongShortTargetSeries(context, (row, index) => {
    if (index === 0 || !ma[index]) return target;
    const prevHigh = high[index - 1];
    const prevLow = low[index - 1];
    if (row.close >= prevHigh * (1 + config.breakBuffer / 100) && row.close >= ma[index] * (1 + config.maBuffer / 100)) {
      target = config.longTarget;
      peak = row.close;
      trough = row.close;
    } else if (row.close <= prevLow * (1 - config.breakBuffer / 100) && row.close <= ma[index] * (1 - config.maBuffer / 100)) {
      target = -config.shortTarget;
      peak = row.close;
      trough = row.close;
    }

    if (target > 0) {
      peak = Math.max(peak, row.close);
      const trailDrop = peak > 0 ? (peak - row.close) / peak * 100 : 0;
      if (row.close <= exitLow[index - 1] || trailDrop >= config.trailDrop) target = 0;
    } else if (target < 0) {
      trough = Math.min(trough, row.close);
      const trailRise = trough > 0 ? (row.close - trough) / trough * 100 : 0;
      if (row.close >= exitHigh[index - 1] || trailRise >= config.trailRise) target = 0;
    }

    return target;
  });
}

function runBearShortMa(context, config) {
  const ma = getMa(context, config.maDays);
  const fast = getMa(context, config.fastMa);
  return evaluateLongShortTargetSeries(context, (row, index) => {
    if (!ma[index] || !fast[index]) return 0;
    if (row.close < ma[index] * (1 - config.shortBuffer / 100) && fast[index] < ma[index]) {
      return -config.shortTarget;
    }
    if (config.longTarget > 0 && row.close > ma[index] * (1 + config.longBuffer / 100) && fast[index] > ma[index]) {
      return config.longTarget;
    }
    return config.neutralTarget;
  });
}

function maBandCandidates(rows) {
  const best = [];
  [20, 60].forEach((fastMa) => {
    [120, 200].forEach((slowMa) => {
      if (fastMa >= slowMa) return;
      [0, 2].forEach((slowBuffer) => {
        [0, 30].forEach((bearTarget) => {
          [80, 100].forEach((bullTarget) => {
            [100].forEach((fastBullTarget) => {
              [0, 40].forEach((fastBearTarget) => {
                [3, 6].forEach((fastCut) => {
                  [25, 35].forEach((rsiBuy) => {
                    [70].forEach((rsiSell) => {
                      const config = {
                        type: "ma-rsi-band",
                        fastMa,
                        slowMa,
                        slowBuffer,
                        bearTarget,
                        bullTarget,
                        fastBullTarget,
                        fastBearTarget,
                        fastCut,
                        rsiDays: 14,
                        rsiBuy,
                        rsiTarget: 100,
                        rsiSell,
                        hotTarget: 40,
                        atrDays: 14,
                        highAtr: 7,
                        volTarget: 40,
                      };
                      remember(best, evaluateCandidate(rows, config, runMaBand), 30);
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

function donchianCandidates(rows) {
  const best = [];
  [20, 40, 60, 120].forEach((breakoutDays) => {
    [10, 30, 60].forEach((exitDays) => {
      [60, 120, 200].forEach((maDays) => {
        [0, 2].forEach((maBuffer) => {
          [0].forEach((breakBuffer) => {
            [0].forEach((exitBuffer) => {
              [8, 12, 20, 25].forEach((trailDrop) => {
                [0, 5].forEach((maExit) => {
                  [80, 100].forEach((target) => {
                    const config = { type: "donchian-trend", breakoutDays, exitDays, maDays, maBuffer, breakBuffer, exitBuffer, trailDrop, maExit, target };
                    remember(best, evaluateCandidate(rows, config, runDonchian), 30);
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

function rsiCandidates(rows) {
  const best = [];
  [60, 200].forEach((maDays) => {
    [10, 14].forEach((rsiDays) => {
      [25, 30, 35].forEach((buyRsi) => {
        [60, 70].forEach((sellRsi) => {
          [7, 10, 15].forEach((takeProfit) => {
            [8, 12, 18].forEach((stopLoss) => {
              [20, 60].forEach((lowDays) => {
                [4, 8].forEach((lowBounce) => {
                  [0, 6].forEach((maTolerance) => {
                    [80, 100].forEach((target) => {
                      const config = { type: "rsi-reversion", maDays, rsiDays, buyRsi, sellRsi, takeProfit, stopLoss, lowDays, lowBounce, maTolerance, target };
                      remember(best, evaluateCandidate(rows, config, runRsiReversion), 30);
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

function leveragedCandidates(rows) {
  const best = [];
  [120, 150, 200, 300, 400, 800, 1000].forEach((maxTarget) => {
    [60, 120].forEach((maDays) => {
      [14].forEach((rsiDays) => {
        [25, 30, 35].forEach((buyRsi) => {
          [60, 70].forEach((sellRsi) => {
            [7, 12, 18].forEach((takeProfit) => {
              [8, 12, 18].forEach((stopLoss) => {
                [0, 6].forEach((maTolerance) => {
                  const config = { type: "leveraged-rsi-reversion", maxTarget, maDays, rsiDays, buyRsi, sellRsi, takeProfit, stopLoss, maTolerance, target: maxTarget };
                  remember(best, evaluateCandidate(rows, config, runLeveragedRsiReversion), 30);
                });
              });
            });
          });
        });
      });
    });

    [20, 60].forEach((fastMa) => {
      [120, 200].forEach((slowMa) => {
        if (fastMa >= slowMa) return;
        [0, 2].forEach((slowBuffer) => {
          [0, 40].forEach((bearTarget) => {
            [120, 150, 200, maxTarget].forEach((bullTarget) => {
              if (bullTarget > maxTarget) return;
              [25, 35].forEach((rsiBuy) => {
                [70].forEach((rsiSell) => {
                  const config = {
                    type: "leveraged-ma-rsi-band",
                    maxTarget,
                    fastMa,
                    slowMa,
                    slowBuffer,
                    bearTarget,
                    bullTarget,
                    rsiDays: 14,
                    rsiBuy,
                    rsiTarget: maxTarget,
                    rsiSell,
                    hotTarget: 50,
                    maTolerance: 6,
                  };
                  remember(best, evaluateCandidate(rows, config, runLeveragedMaBand), 30);
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

function longShortMaCandidates(rows) {
  const best = [];
  [20, 60].forEach((fastMa) => {
    [120, 200].forEach((slowMa) => {
      if (fastMa >= slowMa) return;
      [10].forEach((slopeDays) => {
        [0, 1, 2].forEach((longBuffer) => {
          [0, 2].forEach((shortBuffer) => {
            [0, 1].forEach((longSlope) => {
              [0, 1].forEach((shortSlope) => {
                [100].forEach((longTarget) => {
                  [80, 100].forEach((shortTarget) => {
                    [0].forEach((neutralLongTarget) => {
                      [0].forEach((neutralShortTarget) => {
                        const config = {
                          type: "long-short-ma",
                          fastMa,
                          slowMa,
                          slopeDays,
                          longBuffer,
                          shortBuffer,
                          longSlope,
                          shortSlope,
                          longTarget,
                          shortTarget,
                          neutralLongTarget,
                          neutralShortTarget,
                          rsiDays: 14,
                          overbought: 75,
                          oversold: 25,
                          hotLongTarget: 50,
                          coolShortTarget: -50,
                        };
                        remember(best, evaluateCandidate(rows, config, runLongShortMa), 30);
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
  });
  return best;
}

function longShortChannelCandidates(rows) {
  const best = [];
  [20, 60, 90].forEach((breakoutDays) => {
    [10, 30].forEach((exitDays) => {
      [120, 200].forEach((maDays) => {
        [0, 2].forEach((breakBuffer) => {
          [0].forEach((maBuffer) => {
            [12, 20].forEach((trailDrop) => {
              [12, 20].forEach((trailRise) => {
                [100].forEach((longTarget) => {
                  [80, 100].forEach((shortTarget) => {
                    const config = { type: "long-short-channel", breakoutDays, exitDays, maDays, breakBuffer, maBuffer, trailDrop, trailRise, longTarget, shortTarget };
                    remember(best, evaluateCandidate(rows, config, runLongShortChannel), 30);
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

function bearShortMaCandidates(rows) {
  const best = [];
  [20, 45, 60].forEach((fastMa) => {
    [90, 120, 160, 200, 250].forEach((maDays) => {
      if (fastMa >= maDays) return;
      [0, 1, 2, 3, 5].forEach((shortBuffer) => {
        [0, 1, 2, 3, 5].forEach((longBuffer) => {
          [50, 80, 100].forEach((shortTarget) => {
            [0, 50, 100].forEach((longTarget) => {
              [0].forEach((neutralTarget) => {
                const config = { type: "bear-short-ma", fastMa, maDays, shortBuffer, longBuffer, shortTarget, longTarget, neutralTarget };
                remember(best, evaluateCandidate(rows, config, runBearShortMa), 30);
              });
            });
          });
        });
      });
    });
  });
  return best;
}

function printCandidate(title, candidate) {
  console.log(`\n${title}`);
  console.log(JSON.stringify(candidate.config));
  candidate.results.forEach((result) => {
    console.log(`${result.years}y model=${result.model.returnRate.toFixed(2)}% cagr=${result.model.cagr.toFixed(2)}% dd=${result.model.maxDrawdown.toFixed(2)}% hold=${result.hold.returnRate.toFixed(2)}% holdCagr=${result.hold.cagr.toFixed(2)}% holdDd=${result.hold.maxDrawdown.toFixed(2)}% trades=${result.model.trades}`);
  });
  console.log(`minCagr=${candidate.minCagr.toFixed(2)} avgCagr=${candidate.avgCagr.toFixed(2)} avgExcess=${candidate.avgExcess.toFixed(2)} riskEdge=${candidate.riskEdge.toFixed(2)} score=${candidate.score.toFixed(2)} allCagrAboveTarget=${candidate.allCagrAboveTarget} targetCagr=${TARGET_CAGR.toFixed(2)} allBeatHold=${candidate.allBeatHold}`);
}

async function main() {
  const data = await fetchJson(`/api/klines?code=${CODE}&start=${START_DATE}&end=${END_DATE}`);
  const rows = data.rows.filter(isValidRow);
  console.log(`rows=${rows.length} source=${data.source} first=${rows[0].date} last=${rows[rows.length - 1].date}`);

  const all = [];
  const bestOneYear = [];
  const bestAverageCagr = [];
  const families = [
    ["ma-rsi-band", maBandCandidates(rows)],
    ["donchian-trend", donchianCandidates(rows)],
    ["rsi-reversion", rsiCandidates(rows)],
    ["long-short-ma", longShortMaCandidates(rows)],
    ["long-short-channel", longShortChannelCandidates(rows)],
    ["bear-short-ma", bearShortMaCandidates(rows)],
    ["leveraged-long", leveragedCandidates(rows)],
  ];

  families.forEach(([, candidates]) => {
    candidates.forEach((candidate) => {
      remember(all, candidate, 40);
      rememberBy(bestOneYear, candidate, 20, (item) => item.results[0].model.cagr);
      rememberBy(bestAverageCagr, candidate, 20, (item) => item.avgCagr);
    });
  });

  all.slice(0, 12).forEach((candidate, index) => printCandidate(`candidate #${index + 1}`, candidate));
  bestOneYear.slice(0, 5).forEach((candidate, index) => printCandidate(`best 1y cagr #${index + 1}`, candidate));
  bestAverageCagr.slice(0, 5).forEach((candidate, index) => printCandidate(`best avg cagr #${index + 1}`, candidate));
  families.forEach(([name, candidates]) => {
    if (candidates[0]) printCandidate(`family best: ${name}`, candidates[0]);
  });
  const target = all.find((candidate) => candidate.allCagrAboveTarget);
  if (target) {
    printCandidate("TARGET HIT", target);
  } else {
    console.log(`\nNo candidate reached ${TARGET_CAGR.toFixed(2)}% CAGR in every tested 1/2/3/4/5/8/10 year window.`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
