// 回填港股的历史 PE 到 daily_valuations。
//
// 【当前不可用，脚本会自行拒绝执行】唯一可达的港股估值源亿牛网(eniu)已经停更：实测腾讯
// (4009 行)、汇丰(3996 行)、阿里、小米、美团的序列【全部止于 2022-07-13】，距今已四年。
// 我们的行情窗口是 2020-09 ~ 2026-09，回填的结果会是"前两年有 PE、之后完全没有"。
//
// 这比完全没有 PE 更危险：AI 可能据此设计一条估值过滤规则，它在训练期前半段正常工作，
// 2022-07 之后条件永远不触发而【静默失效】——模型看起来有效，实际早已空转，而且这种失效
// 在回测指标上不会报错，只会表现为"后期不再交易"。
//
// 所以脚本会先检查数据源的最新日期，落后行情超过 MAX_SOURCE_LAG_DAYS 就直接退出。
// 等 eniu 恢复更新、或者接入别的港股估值源之后，这个脚本可以原样启用。
// 在那之前港股的 valuation 在数据画像里是 null，提示词已明确告知 AI 不要设计依赖估值的规则。
//
// 为什么要单独跑而不是靠 /api/klines 顺带落库：港股行情已经先行抓完并入库，之后再请求
// /api/klines 会命中缓存分支直接返回库里的行，根本不会触发估值抓取。跟美股 PE 的处理方式
// 一样，用一个独立的回填脚本补齐。
//
// 数据源是亿牛网（AKShare 的 stock_hk_indicator_eniu），东方财富系接口从生产服务器全部
// 不可达——push2 返回 302、push2his 返回空响应体，AKShare 的港股估值函数底层多数走东财。
// eniu 给的是完整历史日频 PE（腾讯 4009 行，2006 年至今），但【只有 PE 没有 PB】，
// 所以 pb 会留空，数据画像里港股的 pb 是 null。
//
// 只回填库里已有行情的交易日：估值序列和行情序列的日期不完全对齐（eniu 含停牌日），
// 多出来的日期没有对应的收盘价，留着只会让覆盖率统计失真。
//
// 用法：node scripts/universe/backfill-hk-valuations.js [--symbols=0700,9988] [--limit=N]

const { Pool } = require("pg");
const { runAkshareBridge } = require("../shared/akshare-client.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const getArgString = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : "";
};
const SYMBOLS_FILTER = getArgString("symbols").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = Math.max(0, Number(getArgString("limit") || 0));

// 数据源比行情落后多少天就认为它已经停更、拒绝回填。90 天足够容忍正常的披露延迟，
// 又能拦住"停更数年"这种情况。
const MAX_SOURCE_LAG_DAYS = 90;

async function assertSourceIsFresh(sampleSymbol, priceEnd) {
  const payload = await runAkshareBridge("hk_valuations", { code: sampleSymbol, start: "1990-01-01", end: priceEnd });
  const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
  if (rows.length === 0) throw new Error(`估值源对 ${sampleSymbol} 返回空数据，终止回填。`);
  const latest = rows[rows.length - 1].date;
  const lagDays = Math.round((new Date(priceEnd) - new Date(latest)) / 86400000);
  if (lagDays > MAX_SOURCE_LAG_DAYS) {
    throw new Error(
      `估值源已停更：${sampleSymbol} 的最新 PE 日期是 ${latest}，比行情最新日 ${priceEnd} 落后 ${lagDays} 天。`
      + " 回填会造成「前期有 PE、后期没有」的断层，进而让 AI 设计出在后期静默失效的估值规则。"
      + " 已终止，详见本文件头部说明。"
    );
  }
  console.log(`估值源新鲜度检查通过：${sampleSymbol} 最新 ${latest}，落后 ${lagDays} 天`);
}

async function main() {
  const { rows: targets } = await pool.query(
    `SELECT symbol, min(trade_date)::date AS first_date, max(trade_date)::date AS last_date, count(*) AS rows
     FROM daily_prices WHERE market = 'HK'
       ${SYMBOLS_FILTER.length ? "AND symbol = ANY($1)" : ""}
     GROUP BY 1 ORDER BY 1`,
    SYMBOLS_FILTER.length ? [SYMBOLS_FILTER] : []
  );
  const list = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
  console.log(`港股标的 ${list.length} 个待回填估值`);
  if (list.length === 0) { await pool.end(); return; }
  // 先用第一个标的探一下数据源是否还在更新——停更的源宁可不回填，也不要制造断层。
  await assertSourceIsFresh(list[0].symbol, list[0].last_date.toISOString().slice(0, 10));

  let ok = 0;
  let empty = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    const start = item.first_date.toISOString().slice(0, 10);
    const end = item.last_date.toISOString().slice(0, 10);
    try {
      const payload = await runAkshareBridge("hk_valuations", { code: item.symbol, start, end });
      const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
      if (rows.length === 0) {
        empty += 1;
        console.log(`[${i + 1}/${list.length}] ${item.symbol} → 估值为空`);
        continue;
      }
      let written = 0;
      for (const row of rows) {
        const pe = Number(row.pe);
        if (!Number.isFinite(pe)) continue;
        // 只写库里确实有行情的交易日（见文件头注释）。
        const result = await pool.query(
          `INSERT INTO daily_valuations (symbol, market, trade_date, pe, pe_ttm, pb, source, updated_at)
           SELECT $1, 'HK', $2::date, $3, $4, NULL, 'AKShare eniu', NOW()
           WHERE EXISTS (SELECT 1 FROM daily_prices WHERE symbol = $1 AND market = 'HK' AND trade_date = $2::date)
           ON CONFLICT (symbol, market, trade_date) DO UPDATE
             SET pe = EXCLUDED.pe, pe_ttm = EXCLUDED.pe_ttm, source = EXCLUDED.source, updated_at = NOW()`,
          [item.symbol, row.date, pe, Number.isFinite(Number(row.peTtm)) ? Number(row.peTtm) : pe]
        );
        written += result.rowCount;
      }
      ok += 1;
      console.log(`[${i + 1}/${list.length}] ${item.symbol} → 取到 ${rows.length} 条，写入 ${written} 条`);
    } catch (error) {
      failed += 1;
      console.log(`[${i + 1}/${list.length}] ${item.symbol} 失败：${String(error.message || error).slice(0, 120)}`);
    }
  }
  console.log(`\n完成：成功 ${ok}，空 ${empty}，失败 ${failed}`);

  const { rows: cov } = await pool.query(`
    SELECT count(*) AS price_rows,
           count(dv.pe) AS pe_rows,
           round(100.0 * count(dv.pe) / nullif(count(*), 0), 1) AS coverage
    FROM daily_prices dp
    LEFT JOIN daily_valuations dv
      ON dv.symbol = dp.symbol AND dv.market = dp.market AND dv.trade_date = dp.trade_date
    WHERE dp.market = 'HK'`);
  console.log(`港股 PE 覆盖率：${cov[0].pe_rows}/${cov[0].price_rows} = ${cov[0].coverage}%`);
  await pool.end();
}

main().catch((error) => { console.error(error); process.exit(1); });
