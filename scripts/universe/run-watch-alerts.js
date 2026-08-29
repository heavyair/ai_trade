// 盯盘提醒 (watch alerts) checker: run on a fixed host-cron cadence (see the crontab entry
// documented in scripts/universe/STRATEGY_SEARCH_WORKFLOW.md-style docs / deploy notes). Each
// enabled watch_alerts row is one of two modes:
//
//   - Symbol watch (index_code IS NULL): refreshes ONE symbol's data, runs ONE deterministic
//     backtest under the watch's saved model, and checks whether the most recent trading day
//     produced an actual buy/sell trade — using the exact same trigger-detection block as
//     scripts/universe/run-stock-screen.js (buildBacktestStates -> last day's trades).
//   - Index watch (index_code IS NOT NULL): re-resolves the index's CURRENT constituent list
//     live via AKShare every cycle (so index rebalances are picked up automatically, unlike a
//     frozen snapshot taken at creation time), runs the SAME per-symbol trigger-detection block
//     against every constituent, and — if any of them triggered on the same trading day — sends
//     ONE combined email listing every matching stock and its action, instead of one email per
//     stock. Simulated per-watch account tracking (account_* columns) only applies to symbol
//     watches; an index watch has no single stock's account to track.
//
// A signal already emailed for the same trade_date is not re-emailed (last_signal_date dedup,
// applies to both modes).
//
// This is a lightweight per-watch job (seconds per symbol-mode row, longer for index-mode rows
// since those scan every constituent), not a full-universe batch scan, so it deliberately does
// NOT go through server.js's isScanRunning()/activeScanProcess lock — it runs standalone via
// cron, independent of the admin batch jobs' single-slot lock.
//
// Usage: node scripts/universe/run-watch-alerts.js   (no args — processes all due watches)

const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { postJsonToResend, EMAIL_FROM } = require("../shared/send-email.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { resolveIndexConstituents } = require("../shared/index-catalog.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const pool = new Pool({ connectionString: DATABASE_URL });

const MIN_ROWS = 90;
const SIMULATION_WINDOW_ROWS = 504; // ~2 trading years, matches run-stock-screen.js
const INITIAL_CASH = 2000000;
const TRADE_FEE = 5;
// After this many consecutive failed checks (real errors, NOT "insufficient data" — a young
// listing that hasn't traded 90 days yet is expected to fail for a while and isn't the user's
// fault), auto-disable the watch and email the owner so they know why alerts stopped, instead
// of silently going quiet.
const MAX_CONSECUTIVE_FAILURES = 10;

async function loadRows(symbol, dbMarket) {
  const result = await pool.query(`
    SELECT dp.trade_date, dp.open, dp.high, dp.low, dp.close, dp.volume,
           dv.pe, dv.pe_ttm, dv.pb
    FROM daily_prices dp
    LEFT JOIN LATERAL (
      -- Forward-fill: US PE only lands once a day (see backfill_us_pe_from_huggingface.py),
      -- so "today"'s price can be in daily_prices for up to ~13 hours before "today"'s PE
      -- is backfilled. Falling back to the most recent PE on or before this date (instead of
      -- an exact trade_date match) means a pe-volume-type model doesn't see a false "no PE"
      -- gap on the very latest trading day — bounded to 10 days back so a genuinely long
      -- data outage still shows up as missing rather than silently reusing a stale value.
      SELECT pe, pe_ttm, pb
      FROM daily_valuations
      WHERE symbol = dp.symbol AND market = dp.market
        AND trade_date <= dp.trade_date AND trade_date >= dp.trade_date - INTERVAL '10 days'
      ORDER BY trade_date DESC
      LIMIT 1
    ) dv ON TRUE
    WHERE dp.symbol = $1 AND dp.market = $2
    ORDER BY dp.trade_date ASC
  `, [symbol, dbMarket]);
  return result.rows
    .map((row) => ({
      date: row.trade_date.toISOString().slice(0, 10),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
      pe: row.pe !== null ? Number(row.pe) : undefined,
      peTtm: row.pe_ttm !== null ? Number(row.pe_ttm) : undefined,
      pb: row.pb !== null ? Number(row.pb) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

async function loadDueWatches() {
  const result = await pool.query(`
    SELECT wa.*, sp.label AS current_preset_label, sp.strategy_type, sp.config
    FROM watch_alerts wa
    JOIN strategy_presets sp ON sp.id = wa.preset_id
    WHERE wa.enabled = TRUE
      AND (wa.last_checked_at IS NULL
           OR NOW() - wa.last_checked_at >= (wa.frequency_minutes || ' minutes')::interval)
  `);
  return result.rows;
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAlertEmail(watch, trades) {
  const symbolLabel = `${watch.symbol_name || watch.symbol}（${watch.symbol}）`;
  const actionsText = trades.map((t) => (t.side === "buy" ? "买入" : "卖出")).join("、");
  const rows = trades.map((t) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${t.side === "buy" ? "买入" : "卖出"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(t.price)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(t.reason || t.label || "")}</td>
    </tr>
  `).join("");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>盯盘提醒：${escapeHtml(symbolLabel)} 出现${escapeHtml(actionsText)}信号</h2>
      <p>你设置的盯盘"${escapeHtml(watch.preset_label)} · ${escapeHtml(symbolLabel)}"在最近一个交易日（${escapeHtml(trades[0].date)}）触发了信号：</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <thead>
          <tr>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">方向</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">价格</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">原因</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>这是模拟回测信号，不构成投资建议，请自行判断是否下单。</p>
      <hr style="border:none;border-top:1px solid #d9e0ea;margin:20px 0">
      <h2>Watch alert: ${escapeHtml(symbolLabel)} triggered a ${escapeHtml(actionsText.toUpperCase())} signal</h2>
      <p>Your watch "${escapeHtml(watch.preset_label)} · ${escapeHtml(symbolLabel)}" triggered on the most recent trading day (${escapeHtml(trades[0].date)}). This is a simulated backtest signal, not investment advice.</p>
    </div>
  `;
  const text = [
    `盯盘提醒：${symbolLabel} 出现${actionsText}信号`,
    `模型：${watch.preset_label}`,
    `交易日：${trades[0].date}`,
    ...trades.map((t) => `- ${t.side === "buy" ? "买入" : "卖出"} @ ${t.price}：${t.reason || t.label || ""}`),
    "",
    "这是模拟回测信号，不构成投资建议。",
  ].join("\n");
  return { html, text, subject: `盯盘提醒：${symbolLabel} 出现${actionsText}信号` };
}

async function sendAlertEmail(watch, trades) {
  const { html, text, subject } = buildAlertEmail(watch, trades);
  await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
}

// One combined email per index-watch check cycle listing EVERY constituent that triggered,
// with 模型/股票/操作 per row — not one email per matching stock.
function buildIndexAlertEmail(watch, matches) {
  const indexLabel = watch.index_name || watch.index_code;
  const rows = matches.map((m) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(watch.preset_label)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(`${m.name}（${m.code}）`)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${m.side === "buy" ? "买入" : "卖出"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(m.price)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(m.reason || m.label || "")}</td>
    </tr>
  `).join("");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>指数盯盘提醒：${escapeHtml(indexLabel)} 有 ${matches.length} 只成分股出现信号</h2>
      <p>你设置的指数盯盘"${escapeHtml(watch.preset_label)} · ${escapeHtml(indexLabel)}"在最近一个交易日（${escapeHtml(matches[0].date)}）里，以下成分股触发了信号：</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <thead>
          <tr>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">模型</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">股票</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">操作</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">价格</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1f7a8c">原因</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>这是模拟回测信号，不构成投资建议，请自行判断是否下单。</p>
      <hr style="border:none;border-top:1px solid #d9e0ea;margin:20px 0">
      <h2>Index watch alert: ${escapeHtml(indexLabel)} — ${matches.length} constituent(s) triggered</h2>
      <p>Your index watch "${escapeHtml(watch.preset_label)} · ${escapeHtml(indexLabel)}" triggered on the most recent trading day (${escapeHtml(matches[0].date)}). This is a simulated backtest signal, not investment advice.</p>
    </div>
  `;
  const text = [
    `指数盯盘提醒：${indexLabel} 有 ${matches.length} 只成分股出现信号`,
    `模型：${watch.preset_label}`,
    `交易日：${matches[0].date}`,
    ...matches.map((m) => `- ${m.name}（${m.code}） ${m.side === "buy" ? "买入" : "卖出"} @ ${m.price}：${m.reason || m.label || ""}`),
    "",
    "这是模拟回测信号，不构成投资建议。",
  ].join("\n");
  return { html, text, subject: `指数盯盘提醒：${indexLabel} 有 ${matches.length} 只成分股出现信号` };
}

async function sendIndexAlertEmail(watch, matches) {
  const { html, text, subject } = buildIndexAlertEmail(watch, matches);
  await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
}

async function sendAutoDisabledEmail(watch) {
  const symbolLabel = watch.index_code
    ? (watch.index_name || watch.index_code)
    : `${watch.symbol_name || watch.symbol}（${watch.symbol}）`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>你的盯盘提醒已自动暂停</h2>
      <p>"${escapeHtml(watch.preset_label)} · ${escapeHtml(symbolLabel)}" 这个盯盘连续 ${MAX_CONSECUTIVE_FAILURES} 次检查失败（最近一次错误：${escapeHtml(watch.last_error || "")}），已自动停用，不会再继续检查或发提醒。</p>
      <p>请到"设置盯盘提醒"里检查这支股票代码或模型配置是否有问题，确认没问题后可以重新启用。</p>
      <hr style="border:none;border-top:1px solid #d9e0ea;margin:20px 0">
      <h2>Your watch alert has been auto-paused</h2>
      <p>"${escapeHtml(watch.preset_label)} · ${escapeHtml(symbolLabel)}" failed ${MAX_CONSECUTIVE_FAILURES} consecutive checks and has been disabled. Please check the symbol/model configuration and re-enable it once fixed.</p>
    </div>
  `;
  const text = `你的盯盘提醒 "${watch.preset_label} · ${symbolLabel}" 已因连续失败自动暂停，最近错误：${watch.last_error || ""}`;
  await postJsonToResend({
    from: EMAIL_FROM,
    to: [watch.owner_email],
    subject: `盯盘提醒已自动暂停：${symbolLabel}`,
    html,
    text,
  });
}

async function processWatch(watch) {
  if (watch.index_code) {
    return processIndexWatch(watch);
  }
  return processSymbolWatch(watch);
}

// Checks one index's CURRENT constituent list (re-resolved live, not frozen at watch-creation
// time) against the watch's model, and sends ONE combined email if any constituent's most
// recent trading day triggered a buy/sell trade. Mirrors run-stock-screen.js's per-symbol
// trigger-detection block (ensureFreshData -> loadRows -> buildBacktestStates -> last day's
// trades), just applied to every constituent instead of a whole market universe.
async function processIndexWatch(watch) {
  try {
    // watch.index_code stores an index_catalog.mapping_id (e.g. "CSI300"), not a raw AKShare
    // code — resolveIndexConstituents looks up the actual code/fetch strategy from there.
    const { rows: rowsList } = await resolveIndexConstituents(pool, watch.index_code);

    const preset = {
      id: watch.preset_id,
      label: watch.current_preset_label,
      strategyType: watch.strategy_type,
      ...(watch.config && typeof watch.config === "object" ? watch.config : {}),
    };
    const baseConfig = engine.buildConfigFromPresetObject(preset, { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: preset.strategyType });

    const matches = [];
    let dataSkipped = 0;
    let errored = 0;
    for (const constituent of rowsList) {
      const code = String(constituent.code || "").trim();
      if (!code) continue;
      const dbMarket = watch.market === "CN" ? (/^[569]/.test(code) ? "1" : "0") : "US";
      try {
        await ensureFreshData(pool, code, dbMarket);
        const allRows = await loadRows(code, dbMarket);
        const rows = allRows.slice(-SIMULATION_WINDOW_ROWS);
        if (rows.length < MIN_ROWS) {
          dataSkipped += 1;
          continue;
        }
        engine.setActiveLotSizeSymbol(code);
        const states = engine.buildBacktestStates(rows, baseConfig);
        const last = states[states.length - 1];
        const lastDate = rows[rows.length - 1].date;
        const todaysTrades = last.trades.filter((trade) => trade.date === lastDate);
        todaysTrades.forEach((trade) => {
          matches.push({
            code, name: constituent.name || code, date: lastDate,
            side: trade.side, price: trade.price, reason: trade.reason || "", label: trade.label || "",
          });
        });
      } catch (symbolError) {
        errored += 1;
        console.error(`[error] index-watch=${watch.id} constituent=${code}: ${symbolError.message}`);
      }
    }

    console.log(`[index-scan] watch=${watch.id} ${watch.index_code} constituents=${rowsList.length} matches=${matches.length} dataSkipped=${dataSkipped} errored=${errored}`);

    if (matches.length > 0) {
      const signalDate = matches.reduce((max, m) => (m.date > max ? m.date : max), matches[0].date);
      const previousSignalDate = watch.last_signal_date ? watch.last_signal_date.toISOString().slice(0, 10) : null;
      if (signalDate !== previousSignalDate) {
        await sendIndexAlertEmail(watch, matches.filter((m) => m.date === signalDate));
        const summary = matches.map((m) => `${m.name}(${m.side === "buy" ? "买入" : "卖出"})`).join("、");
        await pool.query(`
          UPDATE watch_alerts SET
            last_checked_at = NOW(), last_signal_date = $2, last_signal_action = 'mixed',
            last_signal_reason = $3, last_notified_at = NOW(), consecutive_failures = 0,
            last_error = '', updated_at = NOW()
          WHERE id = $1
        `, [watch.id, signalDate, summary.slice(0, 2000)]);
        console.log(`[alert] index-watch=${watch.id} ${watch.index_code} -> emailed ${watch.owner_email} (${matches.length} matches)`);
        return;
      }
    }
    await pool.query(`
      UPDATE watch_alerts SET last_checked_at = NOW(), consecutive_failures = 0, last_error = '', updated_at = NOW()
      WHERE id = $1
    `, [watch.id]);
    console.log(`[no-signal] index-watch=${watch.id} ${watch.index_code}`);
  } catch (error) {
    console.error(`[error] index-watch=${watch.id} (${watch.index_code}): ${error.message}`);
    const nextFailures = (watch.consecutive_failures || 0) + 1;
    const willDisable = nextFailures >= MAX_CONSECUTIVE_FAILURES;
    // $2 must not be reused inside CASE WHEN $2 >= $4 alongside its direct assignment above —
    // pg raises "inconsistent types deduced for parameter $2" for that combination (hit this
    // for real while testing the index-watch feature below), silently aborting the whole
    // script mid-loop since nothing catches it above main()'s top-level .catch(). Passing the
    // already-computed boolean instead of re-deriving it in SQL sidesteps the ambiguity.
    await pool.query(`
      UPDATE watch_alerts SET
        last_checked_at = NOW(), consecutive_failures = $2, last_error = $3,
        enabled = CASE WHEN $4 THEN FALSE ELSE enabled END, updated_at = NOW()
      WHERE id = $1
    `, [watch.id, nextFailures, error.message.slice(0, 500), willDisable]);
    if (willDisable) {
      try {
        await sendAutoDisabledEmail({ ...watch, last_error: error.message.slice(0, 500) });
        console.log(`[auto-disabled] index-watch=${watch.id} ${watch.index_code} -> notified ${watch.owner_email}`);
      } catch (emailError) {
        console.error(`[error] failed to send auto-disabled notice for watch=${watch.id}: ${emailError.message}`);
      }
    }
  }
}

async function processSymbolWatch(watch) {
  const dbMarket = watch.market === "CN"
    ? (/^[569]/.test(watch.symbol) ? "1" : "0")
    : "US";
  try {
    await ensureFreshData(pool, watch.symbol, dbMarket);
    const allRows = await loadRows(watch.symbol, dbMarket);
    const rows = allRows.slice(-SIMULATION_WINDOW_ROWS);

    if (rows.length < MIN_ROWS) {
      // Insufficient data (e.g. a young listing) is expected/waitable, not a real failure —
      // don't count it toward consecutive_failures / auto-disable.
      await pool.query(`
        UPDATE watch_alerts SET last_checked_at = NOW(), last_error = $2, updated_at = NOW()
        WHERE id = $1
      `, [watch.id, `历史数据不足（${rows.length} 行）`]);
      console.log(`[skip-data] watch=${watch.id} ${watch.symbol}: only ${rows.length} rows`);
      return;
    }

    const preset = {
      id: watch.preset_id,
      label: watch.current_preset_label,
      strategyType: watch.strategy_type,
      ...(watch.config && typeof watch.config === "object" ? watch.config : {}),
    };
    const baseConfig = engine.buildConfigFromPresetObject(preset, { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: preset.strategyType });
    engine.setActiveLotSizeSymbol(watch.symbol);
    const states = engine.buildBacktestStates(rows, baseConfig);
    const last = states[states.length - 1];
    const lastDate = rows[rows.length - 1].date;
    const todaysTrades = last.trades.filter((trade) => trade.date === lastDate);

    // Simulated per-watch account: "as if you'd started paper-trading this model on this
    // symbol the moment you set up the watch." Uses allRows (not the truncated SIMULATION_WINDOW
    // slice) so indicators have real warmup data ahead of watch.created_at, same reasoning as
    // buildScoredBacktestStates' own doc comment in engine.js. Re-run every cycle from scratch,
    // like everything else in this pipeline — no incremental state to keep in sync.
    const createdDateStr = new Date(watch.created_at).toISOString().slice(0, 10);
    const scoredAccount = engine.buildScoredBacktestStates(allRows, baseConfig, createdDateStr);
    const accountAnnualized = annualizedReturnRate(scoredAccount.returnRate, scoredAccount.rowsScored) || 0;
    const accountParams = [
      scoredAccount.cash, scoredAccount.shares, scoredAccount.equity, scoredAccount.positionRatio,
      scoredAccount.returnRate, accountAnnualized, scoredAccount.maxDrawdown, scoredAccount.rowsScored,
      JSON.stringify(scoredAccount.trades),
    ];

    if (todaysTrades.length > 0 && lastDate !== (watch.last_signal_date ? watch.last_signal_date.toISOString().slice(0, 10) : null)) {
      await sendAlertEmail(watch, todaysTrades);
      const lastTrade = todaysTrades[todaysTrades.length - 1];
      await pool.query(`
        UPDATE watch_alerts SET
          last_checked_at = NOW(), last_signal_date = $2, last_signal_action = $3,
          last_signal_reason = $4, last_notified_at = NOW(), consecutive_failures = 0,
          last_error = '', updated_at = NOW(),
          account_cash = $5, account_shares = $6, account_equity = $7, account_position_ratio = $8,
          account_return_rate = $9, account_annualized_return = $10, account_max_drawdown = $11,
          account_rows_scored = $12, account_trades = $13::jsonb, account_updated_at = NOW()
        WHERE id = $1
      `, [watch.id, lastDate, lastTrade.side, lastTrade.reason || lastTrade.label || "", ...accountParams]);
      console.log(`[alert] watch=${watch.id} ${watch.symbol} ${todaysTrades.map((t) => t.label).join(", ")} -> emailed ${watch.owner_email}`);
    } else {
      await pool.query(`
        UPDATE watch_alerts SET
          last_checked_at = NOW(), consecutive_failures = 0, last_error = '', updated_at = NOW(),
          account_cash = $2, account_shares = $3, account_equity = $4, account_position_ratio = $5,
          account_return_rate = $6, account_annualized_return = $7, account_max_drawdown = $8,
          account_rows_scored = $9, account_trades = $10::jsonb, account_updated_at = NOW()
        WHERE id = $1
      `, [watch.id, ...accountParams]);
      console.log(`[no-signal] watch=${watch.id} ${watch.symbol}`);
    }
  } catch (error) {
    console.error(`[error] watch=${watch.id} (${watch.symbol}): ${error.message}`);
    const nextFailures = (watch.consecutive_failures || 0) + 1;
    const willDisable = nextFailures >= MAX_CONSECUTIVE_FAILURES;
    // $2 must not be reused inside CASE WHEN $2 >= $4 alongside its direct assignment above —
    // pg raises "inconsistent types deduced for parameter $2" for that combination (hit this
    // for real while testing the index-watch feature below), silently aborting the whole
    // script mid-loop since nothing catches it above main()'s top-level .catch(). Passing the
    // already-computed boolean instead of re-deriving it in SQL sidesteps the ambiguity.
    await pool.query(`
      UPDATE watch_alerts SET
        last_checked_at = NOW(), consecutive_failures = $2, last_error = $3,
        enabled = CASE WHEN $4 THEN FALSE ELSE enabled END, updated_at = NOW()
      WHERE id = $1
    `, [watch.id, nextFailures, error.message.slice(0, 500), willDisable]);
    if (willDisable) {
      try {
        await sendAutoDisabledEmail({ ...watch, last_error: error.message.slice(0, 500) });
        console.log(`[auto-disabled] watch=${watch.id} ${watch.symbol} -> notified ${watch.owner_email}`);
      } catch (emailError) {
        console.error(`[error] failed to send auto-disabled notice for watch=${watch.id}: ${emailError.message}`);
      }
    }
  }
}

async function main() {
  const watches = await loadDueWatches();
  console.log(`[watch-alerts] ${watches.length} due watch(es)`);
  for (const watch of watches) {
    await processWatch(watch);
  }
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  try {
    await pool.end();
  } catch (endError) {
    // pool already closed or never opened — fine to ignore
  }
  process.exit(1);
});
