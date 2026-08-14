#!/usr/bin/env python3
import json
import sys


def read_payload():
    raw = sys.stdin.read()
    if not raw:
        raise ValueError("missing payload")
    return json.loads(raw)


def clean_number(value):
    try:
        if value is None:
            return None
        if value != value:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def clean_date(value):
    if value is None:
        return ""
    text = str(value)
    if " " in text:
        text = text.split(" ", 1)[0]
    return text[:10]


def frame_to_rows(frame, mapper):
    rows = []
    for _, item in frame.iterrows():
        row = mapper(item)
        if row:
            rows.append(row)
    return rows


def fetch_valuations(ak, payload):
    code = str(payload["code"]).zfill(6)
    start = payload["start"]
    end = payload["end"]
    frame = ak.stock_a_lg_indicator(stock=code)

    def map_row(item):
        date = clean_date(item.get("trade_date"))
        if not date or date < start or date > end:
            return None
        return {
            "date": date,
            "pe": clean_number(item.get("pe")),
            "peTtm": clean_number(item.get("pe_ttm")),
            "pb": clean_number(item.get("pb")),
        }

    rows = frame_to_rows(frame, map_row)
    rows.sort(key=lambda row: row["date"])
    return {"source": "AKShare stock_a_lg_indicator", "rows": rows}


def fetch_klines(ak, payload):
    code = str(payload["code"]).zfill(6)
    start = str(payload["start"]).replace("-", "")
    end = str(payload["end"]).replace("-", "")
    frame = None
    source = "AKShare stock_zh_a_hist"

    try:
        frame = ak.stock_zh_a_hist(
            symbol=code,
            period="daily",
            start_date=start,
            end_date=end,
            adjust="qfq",
        )
    except Exception:
        frame = ak.fund_etf_hist_em(
            symbol=code,
            period="daily",
            start_date=start,
            end_date=end,
            adjust="qfq",
        )
        source = "AKShare fund_etf_hist_em"

    def map_row(item):
        date = clean_date(item.get("日期"))
        if not date:
            return None
        return {
            "date": date,
            "open": clean_number(item.get("开盘")),
            "close": clean_number(item.get("收盘")),
            "high": clean_number(item.get("最高")),
            "low": clean_number(item.get("最低")),
            "volume": clean_number(item.get("成交量")),
            "amount": clean_number(item.get("成交额")),
            "amplitude": clean_number(item.get("振幅")),
            "changePercent": clean_number(item.get("涨跌幅")),
            "change": clean_number(item.get("涨跌额")),
            "turnover": clean_number(item.get("换手率")),
        }

    rows = frame_to_rows(frame, map_row)
    rows.sort(key=lambda row: row["date"])
    return {"source": source, "name": code, "rows": rows}


def main():
    payload = read_payload()
    import akshare as ak

    mode = payload.get("mode")
    if mode == "valuations":
        result = fetch_valuations(ak, payload)
    elif mode == "klines":
        result = fetch_klines(ak, payload)
    else:
        raise ValueError(f"unsupported mode: {mode}")

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
