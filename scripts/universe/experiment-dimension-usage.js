// 新增的画像维度到底有没有被 AI 用起来？
//
// 背景：估值/成交量/基本面/微观结构这几组数据一直随行情行送到生成环节，但数据画像从不统计
// 它们，AI 因此从没见过一个估值数字。补进画像之后，第一个要回答的不是"效果好不好"，而是
// "它到底看了没有"——如果生成出来的模型根本不引用这些字段，讨论效果就无从谈起。
//
// 做法：对同一批标的，分别用完整画像和退回旧画像(--base)各生成 N 个模型，直接检查模型配置
// 里有没有引用 pe/peTtm/pb、volumeRatio、roe 等字段，以及 reason 里有没有提到自相关等新信息。
// 只调用生成接口、不做回测、不写库，所以很快也很便宜。
//
// 用法：node scripts/universe/experiment-dimension-usage.js --symbols=NVDA,600519 --samples=4

const { Pool } = require("pg");
const ModelGenerator = require("../shared/model-generator.js");
const { loadRowsForSymbol } = require("../shared/load-rows.js");
const { inferMarket } = require("../shared/universe-loader.js");
const { splitTrainTestWindows } = require("../shared/train-test-window.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const getArgString = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : "";
};
const SYMBOLS = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
const SAMPLES = Math.max(1, Number(getArgString("samples") || 4));

// 跟 search-validated-best.js 的 legacy 轮转表一致，保证两臂拿到相同的类型序列。
const ROTATION = [
  "block-rules", "wave", "order-grid", "block-rules", "stagnation-reversal",
  "wave", "ma-rsi-band", "block-rules", "order-grid", "local-high-ladder",
  "wave", "score-rules",
];

function inspect(model) {
  const text = JSON.stringify({
    buyBlockRules: model.buyBlockRules, sellBlockRules: model.sellBlockRules,
    scoreRules: model.scoreRules, peVolumeRule: model.peVolumeRule,
    strategyType: model.strategyType,
  });
  const formulas = [...text.matchAll(/"formula"\s*:\s*"([^"]*)"/g)].map((m) => m[1]).join(" ");
  return {
    usesValuation: /\bpe\b|\bpeTtm\b|\bpb\b/.test(formulas) || model.strategyType === "pe-volume",
    usesVolume: /"indicator"\s*:\s*"volumeRatio"/.test(text) || /\bvolume\b/.test(formulas) || model.strategyType === "pe-volume",
    usesFundamentals: /\bgrossMargin\b|\broe\b|\brevenueGrowth\b/.test(formulas),
    strategyType: model.strategyType,
    reason: String(model.reason || "").slice(0, 100),
  };
}

async function main() {
  if (SYMBOLS.length === 0) {
    console.error("usage: --symbols=NVDA,600519 [--samples=4]");
    process.exit(1);
  }
  const prepared = [];
  for (const code of SYMBOLS) {
    const market = inferMarket(code);
    const dbMarket = market === "US" ? "US" : (market === "CN_SH" ? "1" : "0");
    const allRows = await loadRowsForSymbol(pool, code, dbMarket);
    const split = splitTrainTestWindows(allRows, 4, 2);
    if (!split.trainRows || split.trainRows.length < 200) { console.log(`[skip] ${code}`); continue; }
    prepared.push({ code, trainRows: split.trainRows });
  }

  const arms = [
    ["full", {}],
    ["base", { valuation: false, volume: false, fundamentals: false, microstructure: false }],
  ];
  const summary = [];
  for (const [name, dims] of arms) {
    const stat = { arm: name, calls: 0, errors: 0, valuation: 0, volume: 0, fundamentals: 0 };
    const samples = [];
    for (const item of prepared) {
      const profile = ModelGenerator.buildSymbolDataProfile(item.trainRows, dims);
      for (let i = 0; i < SAMPLES; i += 1) {
        stat.calls += 1;
        try {
          const model = await ModelGenerator.generateModelFromDataProfile(
            profile, item.code, [], [], { suggestedStrategyType: ROTATION[i % ROTATION.length] }
          );
          const info = inspect(model);
          if (info.usesValuation) stat.valuation += 1;
          if (info.usesVolume) stat.volume += 1;
          if (info.usesFundamentals) stat.fundamentals += 1;
          samples.push({ symbol: item.code, ...info });
          process.stdout.write(info.usesValuation ? "V" : info.usesVolume ? "v" : ".");
        } catch (error) {
          stat.errors += 1;
          process.stdout.write("x");
        }
      }
    }
    process.stdout.write("\n");
    summary.push(stat);
    const used = samples.filter((s) => s.usesValuation || s.usesFundamentals);
    if (used.length) {
      console.log(`  [${name}] 用到估值/基本面的样本:`);
      used.slice(0, 5).forEach((s) => console.log(`    ${s.symbol} (${s.strategyType}) ${s.reason}`));
    }
  }

  console.log("\n============ 维度使用率 ============");
  console.table(summary.map((s) => ({
    画像: s.arm === "full" ? "完整(含新维度)" : "旧版(仅价格)",
    调用: s.calls, 失败: s.errors,
    "用到估值": `${s.valuation} (${(100 * s.valuation / Math.max(1, s.calls - s.errors)).toFixed(0)}%)`,
    "用到成交量": `${s.volume} (${(100 * s.volume / Math.max(1, s.calls - s.errors)).toFixed(0)}%)`,
    "用到基本面": `${s.fundamentals} (${(100 * s.fundamentals / Math.max(1, s.calls - s.errors)).toFixed(0)}%)`,
  })));
  await pool.end();
}

main().catch((error) => { console.error(error); process.exit(1); });
