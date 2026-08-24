#!/usr/bin/env python3
# Backfills daily_valuations.pe/pe_ttm for US-market symbols. Neither of this app's
# existing US data sources has PE: Yahoo Finance's chart API (used for all US kline
# fetches) has no valuation fields, and EastMoney's PE endpoint (used for A股) returns
# empty for US tickers (confirmed live: filter=(SECURITY_CODE="AAPL") -> "返回数据为空").
# AKShare has a purpose-built US-valuation function (stock_us_valuation_baidu) but its
# backing Baidu/EastMoney endpoints failed with connection errors when tested from this
# server, so this instead computes PE ourselves from a public Hugging Face dataset
# (defeatbeta/yahoo-finance-data's stock_tailing_eps table — ticker, trailing-EPS(TTM),
# and the date that EPS figure was actually published) combined with the close prices
# this app already has stored in daily_prices.
#
# Point-in-time correctness: for each of our own daily_prices rows, this looks up the
# latest EPS record whose TRUE announcement date is <= that trading day — never uses
# an EPS figure before the market could have actually known it — then computes
# pe_ttm = close / trailing_eps. Negative/zero-EPS periods produce negative PE (kept,
# same convention as the existing A股 data — downstream code's getPeValue() already
# treats non-positive PE as "no usable signal").
#
# stock_tailing_eps's own `update_time` column is NOT a reliable announcement date —
# empirically it's an ETL "last refreshed" timestamp (many quarters going back years
# all share the same update_time, whenever the pipeline last re-scraped that row), so
# using it directly would only make years-old EPS "known" as of a recent refresh date
# and silently starve most of the backfill. The real per-quarter announcement date
# comes from the separate stock_earning_calendar table (report_date there = the actual
# earnings-release date; its fiscal_quarter_ending matches stock_tailing_eps.report_date).
#
# Usage: python3 scripts/backfill_us_pe_from_huggingface.py [--symbols=AAPL,AMZN] [--limit=N]

import argparse
import os

import duckdb
import pandas as pd
import psycopg2
import psycopg2.extras

EPS_URL = "https://huggingface.co/datasets/defeatbeta/yahoo-finance-data/resolve/main/data/stock_tailing_eps.parquet"
EARNINGS_CALENDAR_URL = "https://huggingface.co/datasets/defeatbeta/yahoo-finance-data/resolve/main/data/stock_earning_calendar.parquet"
DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/ai_trade")
# Fallback lag applied when a quarter's EPS row has no matching earnings-calendar entry
# (data gaps happen, e.g. very old or very new quarters) — companies typically report
# 30-45 days after fiscal quarter-end, so this is a conservative estimate rather than
# leaving that quarter's PE completely uncovered.
FALLBACK_ANNOUNCEMENT_LAG_DAYS = 45


def get_target_symbols(conn, explicit_symbols, limit):
    if explicit_symbols:
        return explicit_symbols
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT symbol FROM daily_prices WHERE market = 'US' ORDER BY symbol")
        symbols = [row[0] for row in cur.fetchall()]
    if limit and limit > 0:
        symbols = symbols[:limit]
    return symbols


def fetch_eps_table(symbols):
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    placeholders = ",".join(f"'{s}'" for s in symbols)
    # LEFT JOIN against the earnings calendar to recover the TRUE announcement date per
    # quarter (see file header) — coalesce to report_date + a conservative lag for the
    # (rare) quarters missing a calendar match, rather than dropping them entirely.
    # GROUP BY + MAX(known_date) both collapses any duplicate calendar matches (e.g. a
    # rescheduled earnings date leaving two calendar rows for the same quarter) down to
    # one row per (symbol, quarter), and — in that duplicate case — conservatively picks
    # the LATER candidate date, erring toward "known later than it might have been"
    # rather than risking a point-in-time look-ahead.
    query = f"""
        SELECT
          eps.symbol AS symbol,
          eps.tailing_eps AS tailing_eps,
          MAX(COALESCE(
            CAST(cal.report_date AS DATE),
            CAST(eps.report_date AS DATE) + INTERVAL '{FALLBACK_ANNOUNCEMENT_LAG_DAYS} days'
          )) AS known_date
        FROM read_parquet('{EPS_URL}') AS eps
        LEFT JOIN read_parquet('{EARNINGS_CALENDAR_URL}') AS cal
          ON cal.symbol = eps.symbol AND cal.fiscal_quarter_ending = eps.report_date
        WHERE eps.symbol IN ({placeholders}) AND eps.tailing_eps IS NOT NULL
        GROUP BY eps.symbol, eps.report_date, eps.tailing_eps
        ORDER BY eps.symbol, known_date
    """
    return con.execute(query).fetchdf()


def compute_pe_rows(conn, symbol, eps_df):
    symbol_eps = eps_df[eps_df["symbol"] == symbol].copy()
    if symbol_eps.empty:
        return []
    # duckdb's fetchdf() and psycopg2-via-pandas can land on different datetime64
    # resolutions (e.g. [us] vs [ns]) depending on pandas/pyarrow versions — merge_asof
    # requires an exact dtype match, so normalize both sides explicitly.
    symbol_eps["known_date"] = pd.to_datetime(symbol_eps["known_date"]).astype("datetime64[ns]")
    symbol_eps = symbol_eps.sort_values("known_date")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT trade_date, close FROM daily_prices WHERE symbol = %s AND market = 'US' ORDER BY trade_date",
            (symbol,),
        )
        price_rows = cur.fetchall()
    if not price_rows:
        return []

    prices = pd.DataFrame(price_rows, columns=["trade_date", "close"])
    prices["trade_date"] = pd.to_datetime(prices["trade_date"]).astype("datetime64[ns]")

    merged = pd.merge_asof(
        prices.sort_values("trade_date"),
        symbol_eps.sort_values("known_date"),
        left_on="trade_date",
        right_on="known_date",
        direction="backward",
    )

    rows = []
    for _, row in merged.iterrows():
        eps = row.get("tailing_eps")
        close = row.get("close")
        if pd.isna(eps) or eps == 0 or pd.isna(close):
            continue
        pe_ttm = float(close) / float(eps)
        rows.append((symbol, "US", row["trade_date"].date(), pe_ttm, pe_ttm))
    return rows


def upsert_valuations(conn, rows):
    if not rows:
        return 0
    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO daily_valuations (symbol, market, trade_date, pe, pe_ttm, source, updated_at)
            VALUES %s
            ON CONFLICT (symbol, market, trade_date) DO UPDATE SET
              pe = EXCLUDED.pe,
              pe_ttm = EXCLUDED.pe_ttm,
              source = EXCLUDED.source,
              updated_at = NOW()
            """,
            [(r[0], r[1], r[2], r[3], r[4], "huggingface-defeatbeta") for r in rows],
            template="(%s, %s, %s, %s, %s, %s, NOW())",
        )
    conn.commit()
    return len(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbols", default="")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    explicit_symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]

    conn = psycopg2.connect(DATABASE_URL)
    try:
        symbols = get_target_symbols(conn, explicit_symbols, args.limit)
        print(f"target symbols: {len(symbols)}")
        if not symbols:
            return

        eps_df = fetch_eps_table(symbols)
        found_symbols = set(eps_df["symbol"].unique()) if not eps_df.empty else set()
        print(f"fetched {len(eps_df)} EPS rows from Hugging Face covering {len(found_symbols)}/{len(symbols)} requested symbols")

        total_written = 0
        no_eps = []
        for symbol in symbols:
            rows = compute_pe_rows(conn, symbol, eps_df)
            if not rows:
                no_eps.append(symbol)
                continue
            written = upsert_valuations(conn, rows)
            total_written += written
            print(f"[{symbol}] wrote {written} pe rows")

        print(f"\ndone. symbols={len(symbols)} wrote={total_written} rows, no-eps-found={len(no_eps)}")
        if no_eps:
            print("no EPS data found for:", ", ".join(no_eps))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
