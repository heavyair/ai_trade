// temperature A/B：生成模型时的采样温度，对产出质量和多样性到底有没有影响？
//
// 背景：generateModelFromDataProfile 一直没有设置 temperature（用服务商默认值），而
// generateModelFromDescription 明确设了 0.2。一次搜索要跑几十次尝试，靠的就是尝试之间
// 有足够差异；temperature 是个现成却没用上的杠杆。但"调高温度会更好"只是直觉，
// 跟之前标定寻优目标函数权重一样，得拿数据说话再决定改不改默认值。
//
// 实验设计：
//   - 同一批标的、同一份数据画像、同一个倾向策略类型序列，只改 temperature；
//   - 每个温度独立生成 N 个模型，全部在【训练窗口】上回测；
//   - 量三件事：
//       1) 可用率——解析失败/结构不合格/条件被丢弃/没有可用规则 的比例；
//       2) 多样性——N 个模型里有多少个互不相同的配置（按 JSON 去重）；
//       3) 质量——跑赢买入持有的比例，以及训练期每买单期望的中位数。
//
// 只跑训练窗口、不碰验证窗口：这是在比较"生成器"的好坏，不是在挑模型，验证期数据不该
// 参与任何选择过程。
//
// 用法：node scripts/universe/experiment-temperature.js --symbols=AAPL,MSFT --samples=6
//        [--temperatures=default,0.7,1.0,1.3]

const crypto = require("crypto");
const { Pool } = require("pg");
const engine = require("./engine.js");
const ModelGenerator = require("../shared/model-generator.js");
const { searchBestConfig } = require("./search-best-config.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { inferMarket } = require("../shared/universe-loader.js");
const { splitTrainTestWindows } = require("../shared/train-test-window.js");
const { annualizedReturnRate } = require("../shared/annualize.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const getArgString = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : "";
};
const SYMBOLS = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
const SAMPLES = Math.max(1, Number(getArgString("samples") || 6));
const TEMPERATURES = (getArgString("temperatures") || "default,0.7,1.0,1.3")
  .split(",").map((t) => t.trim()).filter(Boolean);

// 跟 search-validated-best.js 同一张轮转表，保证各温度拿到的类型序列完全一致——否则比较的
// 就不只是温度了。
const STRATEGY_TYPE_ROTATION = [
  "block-rules", "wave", "order-grid", "block-rules", "stagnation-reversal",
  "wave", "ma-rsi-band", "block-rules", "order-grid", "local-high-ladder",
  "wave", "score-rules",
];

const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
const TRAIN_YEARS = 4;
const TEST_YEARS = 2;

function configHash(model) {
  const stable = JSON.stringify({
    strategyType: model.strategyType,
    buyRules: model.buyRules, sellRules: model.sellRules,
    buyBlockRules: model.buyBlockRules, sellBlockRules: model.sellBlockRules,
    scoreRules: model.scoreRules, positionBands: model.positionBands,
    localLadderRule: model.localLadderRule, maRsiBandRule: model.maRsiBandRule,
    orderGridRule: model.orderGridRule, peVolumeRule: model.peVolumeRule,
    stagnationReversalRule: model.stagnationReversalRule, waveThreshold: model.waveThreshold,
  });
  return crypto.createHash("sha1").update(stable).digest("hex").slice(0, 12);
}

function modelHasRules(model) {
  if (model.strategyType === "block-rules") return model.buyBlockRules.length > 0 || model.sellBlockRules.length > 0;
  if (model.strategyType === "score-rules") return model.scoreRules.length > 0 && model.positionBands.length > 0;
  return true;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
}

async function main() {
  if (SYMBOLS.length === 0) {
    console.error("usage: --symbols=AAPL,MSFT [--samples=6] [--temperatures=default,0.7,1.0,1.3]");
    process.exit(1);
  }
  console.log(`temperatures=${TEMPERATURES.join(",")} samples=${SAMPLES} symbols=${SYMBOLS.join(",")}`);

  // 先把每个标的的行情和画像准备好，各温度共用同一份输入。
  const prepared = [];
  for (const code of SYMBOLS) {
    const market = inferMarket(code);
    const dbMarket = market === "US" ? "US" : (market === "CN_SH" ? "1" : "0");
    let allRows;
    try {
      allRows = await loadRowsForSymbol(pool, code, dbMarket);
    } catch (error) {
      console.log(`[skip] ${code}: ${error.message}`);
      continue;
    }
    const split = splitTrainTestWindows(allRows, TRAIN_YEARS, TEST_YEARS);
    if (!split.trainRows || split.trainRows.length < 200) {
      console.log(`[skip] ${code}: 训练数据不足 (${split.trainRows ? split.trainRows.length : 0} 行)`);
      continue;
    }
    const profile = ModelGenerator.buildSymbolDataProfile(split.trainRows);
    if (!profile) {
      console.log(`[skip] ${code}: 无法生成画像`);
      continue;
    }
    const buyHold = engine.buildBuyHoldStates(split.trainRows, INITIAL_CASH, TRADE_FEE);
    const buyHoldLast = buyHold[buyHold.length - 1];
    prepared.push({ code, trainRows: split.trainRows, profile, buyHoldLast });
    console.log(`[ready] ${code}: 训练 ${split.trainRows.length} 行，买入持有 ${buyHoldLast.returnRate.toFixed(1)}%/回撤${buyHoldLast.maxDrawdown.toFixed(1)}%`);
  }
  if (prepared.length === 0) {
    console.error("没有可用标的。");
    process.exit(1);
  }

  const results = [];
  for (const tempLabel of TEMPERATURES) {
    const temperature = tempLabel === "default" ? undefined : Number(tempLabel);
    const stat = {
      tempLabel, calls: 0, aiErrors: 0, dropped: 0, emptyModels: 0,
      hashes: new Set(), beatsBuyHold: 0, backtested: 0, expectancies: [], annualized: [],
    };
    for (const item of prepared) {
      const previousAttempts = [];
      for (let i = 0; i < SAMPLES; i += 1) {
        const suggestedStrategyType = STRATEGY_TYPE_ROTATION[i % STRATEGY_TYPE_ROTATION.length];
        stat.calls += 1;
        let model;
        try {
          model = await ModelGenerator.generateModelFromDataProfile(
            item.profile, item.code, previousAttempts, [],
            { suggestedStrategyType, temperature }
          );
        } catch (error) {
          stat.aiErrors += 1;
          process.stdout.write("x");
          continue;
        }
        previousAttempts.push({ strategyType: model.strategyType, reason: model.reason, outcome: null });
        if ((model.droppedSummary || []).length > 0) stat.dropped += 1;
        if (!modelHasRules(model)) {
          stat.emptyModels += 1;
          process.stdout.write("o");
          continue;
        }
        stat.hashes.add(configHash(model));
        const best = searchBestConfig(
          engine, model, item.trainRows,
          { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: model.strategyType },
          150
        );
        if (!best) { process.stdout.write("?"); continue; }
        stat.backtested += 1;
        const beats = best.last.returnRate > item.buyHoldLast.returnRate
          && best.last.maxDrawdown < item.buyHoldLast.maxDrawdown;
        if (beats) stat.beatsBuyHold += 1;
        const buyWin = engine.buildBuyWinStats(best.last.trades);
        if (buyWin.expectancyPct !== null) stat.expectancies.push(buyWin.expectancyPct);
        stat.annualized.push(annualizedReturnRate(best.last.returnRate, item.trainRows.length) || 0);
        process.stdout.write(beats ? "+" : ".");
      }
    }
    process.stdout.write("\n");
    results.push(stat);
    console.log(`[done] temperature=${tempLabel}: 调用${stat.calls} 失败${stat.aiErrors} 空模型${stat.emptyModels} 有丢弃${stat.dropped} 不同配置${stat.hashes.size} 跑赢${stat.beatsBuyHold}/${stat.backtested}`);
  }

  console.log("\n================ 结果 ================");
  console.table(results.map((r) => ({
    temperature: r.tempLabel,
    调用数: r.calls,
    "可用率%": (((r.calls - r.aiErrors - r.emptyModels) / r.calls) * 100).toFixed(1),
    "有条件被丢弃": r.dropped,
    "不同配置数": r.hashes.size,
    "多样性%": ((r.hashes.size / Math.max(1, r.backtested)) * 100).toFixed(1),
    "跑赢买入持有%": ((r.beatsBuyHold / Math.max(1, r.backtested)) * 100).toFixed(1),
    "训练期期望中位数%": median(r.expectancies).toFixed(2),
    "训练年化中位数%": median(r.annualized).toFixed(1),
  })));
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
