// 探测 IB Gateway 能提供哪些行情/基本面数据——只读，不写库、不下单。
//
// 【实测结论：当前这个账户拿不到行情数据，不能作为数据源】
//   · 基本面比率(generic tick 258)：明确被拒，code 10358 "Fundamentals data is not allowed"
//   · 历史K线(reqHistoricalData)：港股(SEHK 700/5)和美股(SMART NVDA)全部【静默超时】，
//     20 秒内连一个事件都没有。同一条连接上基本面请求能正常返回错误码、账户查询也正常，
//     所以不是连接或库用法的问题——排查过 endDateTime 传 undefined、切换延迟行情
//     (reqMarketDataType=3)、核对 BarSizeSetting/WhatToShow 枚举值，均无变化。
//     整个会话也没有出现 2104/2106/2158 行情农场连接消息，说明行情农场压根没建立。
//   综合判断：该账户没有任何行情数据订阅（4004 是纸上账户端口，纸上账户的行情权限继承自
//   对应的真实账户），API 连接只能用于账户查询与下单。
//
// 要改变这个结论，需要在 IBKR 账户管理里订阅相应的行情服务（港股需 SEHK，美股需相应套餐），
// 订阅后重跑本脚本即可验证。在那之前港股行情继续用 Yahoo、估值继续留空。
//
// 背景：港股行情目前来自 Yahoo，估值则完全没有（唯一可达的亿牛网已停更四年，见
// backfill-hk-valuations.js 的说明）。而这套系统本来就连着 IB Gateway，IBKR 覆盖 SEHK，
// 且能提供历史K线和基本面比率——如果账户有对应的行情权限，它会是比现有拼凑来源更可靠的选择。
//
// 这个脚本要回答三件事：
//   1. 港股历史K线能不能取（需要 SEHK 行情权限）
//   2. 美股/A股(如有)历史K线能不能取，作为对照
//   3. 基本面比率（PE 等）能不能取——IBKR 用 generic tick 258 返回 fundamental ratios
//
// 权限不足时 IBKR 会返回明确的错误码（354 未订阅、10197 无权限等），脚本会原样打印，
// 不做吞错处理——这类信息正是判断"能不能用"的依据。
//
// 用法：node scripts/broker/probe-ib-data.js [--host=ib-gateway] [--port=4004]

const { IBApi, EventName, SecType } = require("@stoqey/ib");

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
};
const HOST = getArg("host", process.env.TWS_HOST || "ib-gateway");
const PORT = Number(getArg("port", process.env.TWS_PORT || 4004));
const CLIENT_ID = Number(getArg("clientId", 991));
const TIMEOUT_MS = Number(getArg("timeout", 25000));

// 探测用的合约。港股用 SEHK + HKD，美股用 SMART + USD。
const CONTRACTS = [
  { label: "港股 腾讯(700)", contract: { symbol: "700", secType: SecType.STK, exchange: "SEHK", currency: "HKD" } },
  { label: "港股 汇丰(5)", contract: { symbol: "5", secType: SecType.STK, exchange: "SEHK", currency: "HKD" } },
  { label: "美股 NVDA", contract: { symbol: "NVDA", secType: SecType.STK, exchange: "SMART", currency: "USD" } },
];

function connect() {
  const ib = new IBApi({ host: HOST, port: PORT, clientId: CLIENT_ID });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`连接 ${HOST}:${PORT} 超时`)), TIMEOUT_MS);
    ib.once(EventName.connected, () => { clearTimeout(timer); resolve(ib); });
    ib.on(EventName.error, (err, code) => {
      // 连接阶段的 2104/2106/2158 是"行情农场已连接"的提示，不是错误。
      if (code === 2104 || code === 2106 || code === 2158 || code === 2107) return;
      if (!ib.isConnected) { clearTimeout(timer); reject(new Error(`${err && err.message ? err.message : err} (code ${code})`)); }
    });
    ib.connect();
  });
}

function probeHistorical(ib, label, contract, reqId) {
  return new Promise((resolve) => {
    const bars = [];
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; cleanup(); resolve(result); } };
    const onBar = (id, bar) => { if (id === reqId) bars.push(bar); };
    const onEnd = (id) => { if (id === reqId) done({ ok: true, bars: bars.length, first: bars[0], last: bars[bars.length - 1] }); };
    const onErr = (err, code, id) => {
      if (id !== reqId) return;
      done({ ok: false, code, message: String(err && err.message ? err.message : err).slice(0, 160) });
    };
    const cleanup = () => {
      ib.off(EventName.historicalData, onBar);
      ib.off(EventName.historicalDataEnd, onEnd);
      ib.off(EventName.error, onErr);
      clearTimeout(timer);
    };
    const timer = setTimeout(() => done({ ok: false, code: "timeout", message: `等待 ${TIMEOUT_MS}ms 无响应` }), TIMEOUT_MS);
    ib.on(EventName.historicalData, onBar);
    ib.on(EventName.historicalDataEnd, onEnd);
    ib.on(EventName.error, onErr);
    // whatToShow=TRADES + useRTH=1：只要正常交易时段的成交价，跟现有 daily_prices 口径一致。
    // endDateTime 传 undefined 表示"到当前时刻"。第一版传空字符串时请求被静默丢弃——
    // 连错误事件都没有，而同一连接上的基本面请求能正常返回错误码，说明不是连接问题。
    ib.reqHistoricalData(reqId, contract, undefined, "1 M", "1 day", "TRADES", 1, 1, false);
  });
}

function probeFundamentalRatios(ib, label, contract, reqId) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; cleanup(); resolve(result); } };
    // generic tick 258 = Fundamental Ratios，返回一串 key=value，其中含 PE/PB 等。
    const onTickString = (id, tickType, value) => {
      if (id !== reqId) return;
      const text = String(value || "");
      if (text.includes("=")) done({ ok: true, sample: text.slice(0, 200) });
    };
    const onErr = (err, code, id) => {
      if (id !== reqId) return;
      done({ ok: false, code, message: String(err && err.message ? err.message : err).slice(0, 160) });
    };
    const cleanup = () => {
      ib.off(EventName.tickString, onTickString);
      ib.off(EventName.error, onErr);
      clearTimeout(timer);
      try { ib.cancelMktData(reqId); } catch (error) { /* 探测结束，取消失败无所谓 */ }
    };
    const timer = setTimeout(() => done({ ok: false, code: "timeout", message: "未返回基本面比率" }), TIMEOUT_MS);
    ib.on(EventName.tickString, onTickString);
    ib.on(EventName.error, onErr);
    ib.reqMktData(reqId, contract, "258", false, false);
  });
}

async function main() {
  console.log(`连接 IB Gateway ${HOST}:${PORT} (clientId=${CLIENT_ID}) …`);
  const ib = await connect();
  console.log("已连接。");
  // 把所有错误事件都打出来（含 id=-1 的全局消息）——第一版探测时历史K线是静默超时、
  // 连错误码都没有，那通常说明请求没被真正发出或事件没接上，而不是权限问题。
  ib.on(EventName.error, (err, code, id) => {
    // 2104/2106/2158 是行情农场连接状态消息，正常情况下会看到 "hmds data farm connection is OK"
    // ——历史数据请求静默无响应时，最可能的原因就是 HMDS 农场压根没连上，所以这里全部打印。
    console.log(`   [IB事件] code=${code} id=${id} ${String(err && err.message ? err.message : err).slice(0, 140)}`);
  });
  // 纸上账户通常只有延迟行情权限；不切到延迟模式时历史数据请求可能被静默丢弃。
  try {
    ib.reqMarketDataType(3);
    console.log("已切换到延迟行情模式(reqMarketDataType=3)");
  } catch (error) {
    console.log("切换延迟行情失败:", error.message);
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log("");

  let reqId = 9000;
  for (const entry of CONTRACTS) {
    reqId += 1;
    const hist = await probeHistorical(ib, entry.label, entry.contract, reqId);
    if (hist.ok) {
      console.log(`[历史K线] ${entry.label}: 取到 ${hist.bars} 根日线`);
      if (hist.first) console.log(`            首根 ${hist.first.time} 收 ${hist.first.close} 量 ${hist.first.volume}`);
      if (hist.last) console.log(`            末根 ${hist.last.time} 收 ${hist.last.close} 量 ${hist.last.volume}`);
    } else {
      console.log(`[历史K线] ${entry.label}: 失败 code=${hist.code} ${hist.message}`);
    }

    reqId += 1;
    const ratios = await probeFundamentalRatios(ib, entry.label, entry.contract, reqId);
    if (ratios.ok) {
      console.log(`[基本面]   ${entry.label}: ${ratios.sample}`);
    } else {
      console.log(`[基本面]   ${entry.label}: 失败 code=${ratios.code} ${ratios.message}`);
    }
    console.log("");
  }

  try { ib.disconnect(); } catch (error) { /* ignore */ }
  process.exit(0);
}

main().catch((error) => { console.error("探测失败:", error.message); process.exit(1); });
