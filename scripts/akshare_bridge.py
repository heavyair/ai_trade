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


def fetch_fundamentals(ak, payload):
    # 毛利率/净资产收益率/营收增长率 — quarterly/annual financial-statement data, NOT daily
    # like PE/PB. A-share uses Sina's 财务分析指标 (already returns every disclosed period,
    # quarterly and annual mixed); US stocks only expose an ANNUAL report via AKShare's
    # 美股财务指标 endpoint (no quarterly "indicator" value is accepted there — confirmed by
    # testing 一季报/中报/三季报 against a real symbol, all rejected).
    code = str(payload["code"])
    market = str(payload.get("market") or "")
    is_us = market == "US"

    if is_us:
        frame = ak.stock_financial_us_analysis_indicator_em(symbol=code, indicator="年报")

        def map_row(item):
            date = clean_date(item.get("REPORT_DATE"))
            if not date:
                return None
            return {
                "date": date,
                "grossMargin": clean_number(item.get("GROSS_PROFIT_RATIO")),
                "roe": clean_number(item.get("ROE_AVG")),
                "revenueGrowth": clean_number(item.get("OPERATE_INCOME_YOY")),
            }

        source = "AKShare stock_financial_us_analysis_indicator_em"
    else:
        code6 = code.zfill(6)
        frame = ak.stock_financial_analysis_indicator(symbol=code6)

        def map_row(item):
            date = clean_date(item.get("日期"))
            if not date:
                return None
            return {
                "date": date,
                "grossMargin": clean_number(item.get("销售毛利率(%)")),
                "roe": clean_number(item.get("净资产收益率(%)")),
                "revenueGrowth": clean_number(item.get("主营业务收入增长率(%)")),
            }

        source = "AKShare stock_financial_analysis_indicator"

    rows = frame_to_rows(frame, map_row)
    rows.sort(key=lambda row: row["date"])
    return {"source": source, "rows": rows}


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


def fetch_index_constituents(ak, payload):
    # index_stock_cons works uniformly across indices published by different companies — 中证
    # 指数公司 (CSI, e.g. 沪深300/中证人工智能主题指数), 国证指数/深圳证券信息有限公司 (e.g.
    # 国证半导体芯片指数), and SZSE-hosted indices (e.g. 深证人工智能50指数) all resolve through
    # this one function, unlike index_stock_cons_csindex which only covers CSI-published codes.
    # Every code passed in here (scripts/shared/index-catalog.js's CATALOG_SEED) was verified
    # LIVE before being trusted — index codes are opaque and easy to mix up (e.g. 930713 "中证
    # 人工智能主题指数" vs 931071 "中证人工智能产业指数" are two different indices).
    code = str(payload["indexCode"]).strip()
    frame = ak.index_stock_cons(symbol=code)

    def map_row(item):
        stock_code = str(item.get("品种代码", "")).strip()
        stock_name = str(item.get("品种名称", "")).strip()
        if not stock_code:
            return None
        return {"code": stock_code, "name": stock_name}

    rows = frame_to_rows(frame, map_row)
    return {"source": "AKShare index_stock_cons", "indexCode": code, "rows": rows}


def main():
    payload = read_payload()
    import akshare as ak

    mode = payload.get("mode")
    if mode == "valuations":
        result = fetch_valuations(ak, payload)
    elif mode == "fundamentals":
        result = fetch_fundamentals(ak, payload)
    elif mode == "klines":
        result = fetch_klines(ak, payload)
    elif mode == "index_cons":
        result = fetch_index_constituents(ak, payload)
    else:
        raise ValueError(f"unsupported mode: {mode}")

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
