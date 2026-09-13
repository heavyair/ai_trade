// 从 IB Gateway 取一个标的的最新报价——只读，不下单、不写库。
//
// 跟 probe-ib-data.js 的区别：那个测的是【历史K线】和【基本面比率】，两者都拿不到
// （历史请求静默超时、基本面返回 code 10358 无权限）。这个只测【实时/延迟快照报价】，
// 它走的是另一条权限：很多账户没有历史数据和基本面订阅，但仍能拿到延迟报价（15 分钟）。
//
// 会按顺序尝试三种行情模式，直到拿到价格为止：
//   1 = 实时（需要付费行情订阅）
//   3 = 延迟（免费，15 分钟延迟）
//   2 = 冻结（上一个收盘快照，非交易时段也能返回）
//
// tickPrice 的 field 编号里，延迟行情用的是另一套（LAST=4 对应 DELAYED_LAST=68，
// CLOSE=9 对应 DELAYED_CLOSE=75），所以两套都要接，否则延迟模式下会看到"连上了但没有价格"。
//
// 用法：node scripts/broker/probe-ib-quote.js [--symbol=QQQ] [--host=ib-gateway] [--port=4004]

const { IBApi, EventName, SecType } = require("@stoqey/ib");

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
};
const SYMBOL = getArg("symbol", "QQQ");
const HOST = getArg("host", process.env.TWS_HOST || "ib-gateway");
const PORT = Number(getArg("port", process.env.TWS_PORT || 4004));
const CLIENT_ID = Number(getArg("clientId", 993));
const WAIT_MS = Number(getArg("wait", 12000));

// field 编号 -> 可读名称。前半是实时行情，后半是延迟行情的对应编号。
const PRICE_FIELDS = {
  1: "买价", 2: "卖价", 4: "最新价", 6: "当日最高", 7: "当日最低", 9: "昨收", 14: "今开",
  66: "延迟买价", 67: "延迟卖价", 68: "延迟最新价", 72: "延迟最高", 73: "延迟最低",
  75: "延迟昨收", 76: "延迟今开",
};

const MARKET_DATA_MODES = [
  { id: 1, label: "实时" },
  { id: 3, label: "延迟" },
  { id: 2, label: "冻结(上一收盘)" },
];

function connect() {
  const ib = new IBApi({ host: HOST, port: PORT, clientId: CLIENT_ID });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`连接 ${HOST}:${PORT} 超时`)), 20000);
    ib.once(EventName.connected, () => { clearTimeout(timer); resolve(ib); });
    ib.on(EventName.error, (err, code) => {
      if ([2104, 2106, 2107, 2158].includes(code)) return;
      if (!ib.isConnected) { clearTimeout(timer); reject(new Error(`${err && err.message ? err.message : err} (code ${code})`)); }
    });
    ib.connect();
  });
}

function requestQuote(ib, contract, reqId, modeLabel) {
  return new Promise((resolve) => {
    const prices = {};
    const notes = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      ib.off(EventName.tickPrice, onPrice);
      ib.off(EventName.tickSize, onSize);
      ib.off(EventName.error, onErr);
      clearTimeout(timer);
      try { ib.cancelMktData(reqId); } catch (error) { /* 探测结束，取消失败无所谓 */ }
      resolve({ prices, notes });
    };
    const onPrice = (id, field, value) => {
      if (id !== reqId) return;
      // IBKR 用 -1 表示"该字段无数据"，不是真的负价格。
      if (!Number.isFinite(value) || value < 0) return;
      const name = PRICE_FIELDS[field] || `字段${field}`;
      prices[name] = value;
    };
    const onSize = (id, field, value) => {
      if (id !== reqId) return;
      if (field === 8 || field === 74) prices["成交量"] = value;
    };
    const onErr = (err, code, id) => {
      if (id !== reqId) return;
      notes.push(`code=${code} ${String(err && err.message ? err.message : err).slice(0, 120)}`);
      // 10089/10197 这类是"需要订阅"的硬错误，没必要继续等。
      if ([10089, 10197, 10168, 354, 200].includes(code)) finish();
    };
    const timer = setTimeout(finish, WAIT_MS);
    ib.on(EventName.tickPrice, onPrice);
    ib.on(EventName.tickSize, onSize);
    ib.on(EventName.error, onErr);
    // snapshot=false：快照模式在没有订阅时常常直接返回空，流式反而能收到延迟/冻结价。
    ib.reqMktData(reqId, contract, "", false, false);
  });
}

async function main() {
  const contract = {
    symbol: SYMBOL.toUpperCase(),
    secType: SecType.STK,
    exchange: "SMART",
    primaryExch: "NASDAQ",
    currency: "USD",
  };
  console.log(`连接 IB Gateway ${HOST}:${PORT} (clientId=${CLIENT_ID}) …`);
  const ib = await connect();
  console.log(`已连接。查询 ${contract.symbol} (SMART/NASDAQ/USD)\n`);

  let reqId = 7700;
  for (const mode of MARKET_DATA_MODES) {
    reqId += 1;
    try { ib.reqMarketDataType(mode.id); } catch (error) { /* 部分网关不支持切换，继续试 */ }
    const { prices, notes } = await requestQuote(ib, contract, reqId, mode.label);
    const keys = Object.keys(prices);
    if (keys.length > 0) {
      console.log(`【${mode.label}行情】拿到 ${keys.length} 个字段：`);
      for (const key of keys) console.log(`   ${key}: ${prices[key]}`);
      notes.forEach((n) => console.log(`   (提示 ${n})`));
      try { ib.disconnect(); } catch (error) { /* ignore */ }
      process.exit(0);
    }
    console.log(`【${mode.label}行情】没有拿到价格${notes.length ? "：" + notes.join("；") : "（无任何事件）"}`);
  }

  console.log("\n三种行情模式都没有取到报价。");
  try { ib.disconnect(); } catch (error) { /* ignore */ }
  process.exit(1);
}

main().catch((error) => { console.error("探测失败:", error.message); process.exit(1); });
