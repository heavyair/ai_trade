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
// The TRADING STRATEGY itself (frozen_strategy_type/frozen_config/frozen_label) is a snapshot
// taken once at watch creation and never re-read from strategy_presets afterward, for both
// modes — editing/re-optimizing the source preset later has zero effect on an already-running
// watch. Model validity is maintained by run-model-validation-daily.js in
// model_validation_states using a fixed-start cumulative validation window; this 15-minute
// watcher only mirrors that status onto compatibility fields and never auto-disables a watch
// because a rolling window happened to weaken.
//
// This is a lightweight per-watch job (seconds per symbol-mode row, longer for index-mode rows
// since those scan every constituent), not a full-universe batch scan, so it deliberately does
// NOT go through server.js's isScanRunning()/activeScanProcess lock — it runs standalone via
// cron, independent of the admin batch jobs' single-slot lock.
//
// Usage: node scripts/universe/run-watch-alerts.js   (no args — processes all due watches)

const crypto = require("crypto");
const { Pool } = require("pg");
const engine = require("./engine.js");
const { ensureFreshData } = require("./ensure-fresh-data.js");
const { postJsonToResend, EMAIL_FROM } = require("../shared/send-email.js");
const { annualizedReturnRate } = require("../shared/annualize.js");
const { annualizedUpsideDeviation } = require("../shared/volatility.js");
const { resolveIndexConstituents } = require("../shared/index-catalog.js");
const { ensureModelValidationStateTable } = require("../shared/model-validation-state.js");

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const APP_PUBLIC_URL = String(process.env.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "") || "http://localhost:3000";
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
           dv.pe, dv.pe_ttm, dv.pb,
           sf.gross_margin, sf.roe, sf.revenue_growth
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
    LEFT JOIN LATERAL (
      -- Same forward-fill idea, but financial-statement data lands quarterly (A-share) or only
      -- annually (US, via AKShare) rather than daily, so the lookback has to be wide enough to
      -- span a full US annual gap plus filing delay — 400 days covers that with margin.
      SELECT gross_margin, roe, revenue_growth
      FROM stock_fundamentals
      WHERE symbol = dp.symbol AND market = dp.market
        AND report_date <= dp.trade_date AND report_date >= dp.trade_date - INTERVAL '400 days'
      ORDER BY report_date DESC
      LIMIT 1
    ) sf ON TRUE
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
      grossMargin: row.gross_margin !== null ? Number(row.gross_margin) : undefined,
      roe: row.roe !== null ? Number(row.roe) : undefined,
      revenueGrowth: row.revenue_growth !== null ? Number(row.revenue_growth) : undefined,
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close) && row.close > 0
      && Number.isFinite(row.high) && Number.isFinite(row.low));
}

async function loadDueWatches() {
  // No join against strategy_presets: every field this script needs to decide buy/sell
  // (frozen_strategy_type/frozen_config/frozen_label) was snapshotted onto the watch_alerts
  // row itself at creation time and never changes afterward — see server.js's ensureCoreTables
  // comment on those columns for why (editing the source preset used to silently change what
  // an already-running watch does, mid-position, with no notification).
  const result = await pool.query(`
    SELECT wa.*, mvs.status AS validation_status, mvs.status_reason AS validation_status_reason
    FROM watch_alerts wa
    LEFT JOIN model_validation_states mvs ON mvs.subject_type = 'watch' AND mvs.subject_id = wa.id
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

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function validateAutoTradeIntent(intent, connection) {
  const messages = [];
  if (intent.market !== "US") messages.push("自动 IBKR 下单只允许美股盯盘。");
  if (!connection) messages.push("IBKR 连接未配置。");
  if (connection && !connection.enabled) messages.push("IBKR 连接未启用。");
  if (connection && connection.trading_mode !== "paper") messages.push("自动下单只允许 paper 模式。");
  if (!(intent.quantity > 0)) messages.push("交易数量必须大于 0。");
  if (!(intent.limitPrice > 0)) messages.push("限价必须大于 0。");
  const maxOrderValue = Number(connection && connection.max_order_value) || 0;
  if (maxOrderValue > 0 && intent.estimatedNotional > maxOrderValue) {
    messages.push(`预估订单金额 ${intent.estimatedNotional.toFixed(2)} 超过单笔上限 ${maxOrderValue.toFixed(2)}。`);
  }
  return {
    status: messages.length ? "blocked" : "passed",
    message: messages.join(" "),
  };
}

async function loadBrokerConnection(ownerUserId) {
  const result = await pool.query(`
    SELECT *
    FROM broker_connections
    WHERE owner_user_id = $1 AND provider = 'ibkr-tws'
    LIMIT 1
  `, [ownerUserId]);
  return result.rows[0] || null;
}

function buildTradeBlockedEmail(watch, intent, message) {
  const symbolLabel = `${watch.symbol_name || watch.symbol}（${watch.symbol}）`;
  const actionText = intent.side === "buy" ? "买入" : "卖出";
  const subject = `IBKR 自动下单被拦截：${symbolLabel} ${actionText}`;
  const rows = [
    ["方向", actionText],
    ["数量", String(intent.quantity)],
    ["限价", String(intent.limit_price)],
    ["拦截原因", message || "风控未通过。"],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>${escapeHtml(subject)}</h2>
      <p>盯盘"${escapeHtml(watch.preset_label)} · ${escapeHtml(symbolLabel)}"触发信号，但风控检查未通过，本次没有生成下单确认邮件，也不会下单。</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <tbody>${rows.map(([k, v]) => `
          <tr><td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(v)}</td></tr>
        `).join("")}</tbody>
      </table>
    </div>
  `;
  const text = [subject, `模型：${watch.preset_label}`, `股票：${symbolLabel}`, ...rows.map(([k, v]) => `${k}：${v}`)].join("\n");
  return { subject, html, text };
}

async function notifyTradeBlocked(watch, intent, message) {
  try {
    const { subject, html, text } = buildTradeBlockedEmail(watch, intent, message);
    await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
  } catch (error) {
    console.error(`[error] failed to send trade-blocked notice for watch=${watch.id}: ${error.message}`);
  }
}

// Confirm link is valid through the end of the signal's US trading day. +1 day at 05:00 UTC
// lands at 00:00 ET during EST and ~01:00 ET during EDT — DST only ever extends the window by
// an hour, never shortens it, so there's no case where "confirm today" expires before today ends.
function tradeConfirmationExpiry(signalDateStr) {
  const [y, m, d] = signalDateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 5, 0, 0));
}

function buildTradeConfirmationEmail(watch, intent, token) {
  const symbolLabel = `${watch.symbol_name || watch.symbol}（${watch.symbol}）`;
  const actionText = intent.side === "buy" ? "买入" : "卖出";
  const subject = `请确认 IBKR 下单：${symbolLabel} ${actionText} ${intent.quantity} 股`;
  const landingUrl = (action) => `${APP_PUBLIC_URL}/?tradeConfirmId=${encodeURIComponent(intent.id)}&tradeConfirmToken=${encodeURIComponent(token)}&tradeConfirmAction=${action}`;
  const confirmUrl = landingUrl("confirm");
  const declineUrl = landingUrl("decline");
  const rows = [
    ["股票", symbolLabel],
    ["方向", actionText],
    ["数量", String(intent.quantity)],
    ["限价", String(intent.limit_price)],
    ["预估金额", intent.estimated_notional.toFixed(2)],
    ["本次盯盘分配资金", toFiniteNumber(watch.trade_capital, 0).toFixed(2)],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>${escapeHtml(subject)}</h2>
      <p>盯盘"${escapeHtml(watch.preset_label)} · ${escapeHtml(symbolLabel)}"触发了信号，Enable trade 已开启。请确认是否按下面的参数下单，链接当天有效，过期后需要等下一次信号：</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <tbody>${rows.map(([k, v]) => `
          <tr><td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(v)}</td></tr>
        `).join("")}</tbody>
      </table>
      <p>
        <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:10px 20px;margin-right:12px;background:#1f7a8c;color:#fff;text-decoration:none;border-radius:4px">确认下单</a>
        <a href="${escapeHtml(declineUrl)}" style="display:inline-block;padding:10px 20px;background:#e5ebf3;color:#1f2937;text-decoration:none;border-radius:4px">放弃</a>
      </p>
      <p>点击任一按钮都会先打开确认页面，需要在页面上再点一次才会真正提交或放弃，不会直接下单。</p>
    </div>
  `;
  const text = [
    subject,
    ...rows.map(([k, v]) => `${k}：${v}`),
    `确认下单：${confirmUrl}`,
    `放弃：${declineUrl}`,
    "点击链接会先打开确认页面，需要再点一次才会真正提交或放弃。",
  ].join("\n");
  return { subject, html, text };
}

async function notifyTradeConfirmationRequest(watch, intent, token) {
  try {
    const { subject, html, text } = buildTradeConfirmationEmail(watch, intent, token);
    await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
  } catch (error) {
    console.error(`[error] failed to send trade-confirmation request for watch=${watch.id}: ${error.message}`);
  }
}

// Sweeps trade_intents left at 'awaiting_confirmation' past their expiry (owner never clicked
// either email button) to 'expired' and emails a heads-up — otherwise a signal nobody acted on
// would sit "awaiting_confirmation" forever with no record that it was, in effect, skipped.
async function expireStaleTradeConfirmations() {
  const result = await pool.query(`
    UPDATE trade_intents SET status = 'expired', updated_at = NOW()
    WHERE status = 'awaiting_confirmation' AND confirmation_expires_at IS NOT NULL AND confirmation_expires_at < NOW()
    RETURNING *
  `);
  for (const intent of result.rows) {
    try {
      const watchResult = await pool.query(`SELECT * FROM watch_alerts WHERE id = $1`, [intent.watch_id]);
      const watch = watchResult.rows[0];
      if (!watch) continue;
      const { subject, html, text } = buildTradeBlockedEmail(watch, intent, "确认链接已过期，本次信号未下单。");
      await postJsonToResend({ from: EMAIL_FROM, to: [intent.owner_email], subject: subject.replace("被拦截", "已过期"), html, text });
    } catch (error) {
      console.error(`[error] failed to send expiry notice for intent=${intent.id}: ${error.message}`);
    }
  }
  if (result.rows.length > 0) console.log(`[watch-alerts] expired ${result.rows.length} unconfirmed trade intent(s)`);
}

async function autoSubmitPaperTrade(watch, lastTrade, signalDate) {
  if (!watch.trade_enabled) return null;
  if (watch.index_code || watch.market !== "US") return null;
  const capital = toFiniteNumber(watch.trade_capital, 0);
  if (!(capital > 0)) return null;
  const existing = await pool.query(`
    SELECT id, status FROM trade_intents
    WHERE owner_user_id = $1 AND watch_id = $2 AND source_signal_date = $3::date AND side = $4
  `, [watch.owner_user_id, watch.id, signalDate, lastTrade.side]);
  if (existing.rows.length > 0 && existing.rows[0].status !== "pending_review") {
    return { skipped: true, intentId: existing.rows[0].id };
  }
  const connection = await loadBrokerConnection(watch.owner_user_id);
  const limitPrice = toFiniteNumber(lastTrade.price, 0);
  const quantity = limitPrice > 0 ? Math.max(0, Math.floor(capital / limitPrice)) : 0;
  const estimatedNotional = quantity * limitPrice;
  const risk = validateAutoTradeIntent({
    market: watch.market,
    side: lastTrade.side,
    quantity,
    limitPrice,
    estimatedNotional,
  }, connection);
  const intentId = randomId("intent");
  const status = risk.status === "passed" ? "awaiting_confirmation" : "blocked";
  const token = risk.status === "passed" ? crypto.randomBytes(24).toString("hex") : "";
  const expiresAt = risk.status === "passed" ? tradeConfirmationExpiry(signalDate) : null;
  const insertResult = await pool.query(`
    INSERT INTO trade_intents (
      id, owner_user_id, owner_email, watch_id, preset_id, preset_label, symbol, symbol_name, market,
      side, quantity, order_type, limit_price, time_in_force, outside_rth, source_signal_date,
      reason, estimated_notional, risk_status, risk_message, broker_account_id,
      status, confirmation_token, confirmation_expires_at, trading_mode
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'LMT', $12, 'DAY', FALSE, $13::date, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    ON CONFLICT (owner_user_id, watch_id, source_signal_date, side) WHERE watch_id IS NOT NULL AND source_signal_date IS NOT NULL DO UPDATE SET
      quantity = EXCLUDED.quantity,
      limit_price = EXCLUDED.limit_price,
      reason = EXCLUDED.reason,
      estimated_notional = EXCLUDED.estimated_notional,
      risk_status = EXCLUDED.risk_status,
      risk_message = EXCLUDED.risk_message,
      broker_account_id = EXCLUDED.broker_account_id,
      status = EXCLUDED.status,
      confirmation_token = EXCLUDED.confirmation_token,
      confirmation_expires_at = EXCLUDED.confirmation_expires_at,
      trading_mode = EXCLUDED.trading_mode,
      updated_at = NOW()
    RETURNING *
  `, [
    intentId, watch.owner_user_id, watch.owner_email, watch.id, watch.preset_id, watch.preset_label,
    watch.symbol, watch.symbol_name || watch.symbol, watch.market,
    lastTrade.side, quantity, limitPrice, signalDate, lastTrade.reason || watch.last_signal_reason || "",
    estimatedNotional, risk.status, risk.message, connection ? connection.account_id : "",
    status, token, expiresAt,
    connection && connection.trading_mode ? connection.trading_mode : "paper",
  ]);
  const intent = insertResult.rows[0];
  if (risk.status !== "passed") {
    await notifyTradeBlocked(watch, intent, risk.message);
    return { ok: false, error: risk.message };
  }
  await notifyTradeConfirmationRequest(watch, intent, token);
  return { queued: true, awaitingConfirmation: true, intentId: intent.id };
}

// 关注(follow) accounts never see the frozen model's actual rules (see server.js's
// mapWatchAlertRow doc comment on why) — the per-trade "reason" text embeds exact rule
// thresholds (e.g. "总分7：规则5(+7分：3日RSI<83.4)"), so it's the one thing masked out of an
// otherwise-identical email when forFollower is set.
function tradeReasonText(t, forFollower) {
  return forFollower ? "（关注者不展示具体触发规则）" : (t.reason || t.label || "");
}

function buildAlertEmail(watch, trades, { forFollower = false } = {}) {
  const symbolLabel = `${watch.symbol_name || watch.symbol}（${watch.symbol}）`;
  const actionsText = trades.map((t) => (t.side === "buy" ? "买入" : "卖出")).join("、");
  const rows = trades.map((t) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${t.side === "buy" ? "买入" : "卖出"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(t.price)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(tradeReasonText(t, forFollower))}</td>
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
    ...trades.map((t) => `- ${t.side === "buy" ? "买入" : "卖出"} @ ${t.price}：${tradeReasonText(t, forFollower)}`),
    "",
    "这是模拟回测信号，不构成投资建议。",
  ].join("\n");
  return { html, text, subject: `盯盘提醒：${symbolLabel} 出现${actionsText}信号` };
}

// Followers get their OWN, separate send (not just added to the owner's `to:` array) so
// recipients never see each other's email addresses, and so the buy/sell signal content can be
// masked per-recipient (see tradeReasonText) without affecting the owner's copy.
async function getWatchFollowerEmails(watchId) {
  const result = await pool.query(`SELECT follower_email FROM watch_alert_followers WHERE watch_id = $1`, [watchId]);
  return result.rows.map((row) => row.follower_email);
}

async function sendAlertEmail(watch, trades) {
  const { html, text, subject } = buildAlertEmail(watch, trades);
  await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
  const followerEmails = await getWatchFollowerEmails(watch.id);
  if (followerEmails.length === 0) return;
  const followerVersion = buildAlertEmail(watch, trades, { forFollower: true });
  for (const email of followerEmails) {
    await postJsonToResend({ from: EMAIL_FROM, to: [email], subject: followerVersion.subject, html: followerVersion.html, text: followerVersion.text });
  }
}

// One combined email per index-watch check cycle listing EVERY constituent that triggered,
// with 模型/股票/操作 per row — not one email per matching stock.
function buildIndexAlertEmail(watch, matches, { forFollower = false } = {}) {
  const indexLabel = watch.index_name || watch.index_code;
  const rows = matches.map((m) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(watch.preset_label)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(`${m.name}（${m.code}）`)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${m.side === "buy" ? "买入" : "卖出"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(m.price)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5ebf3">${escapeHtml(tradeReasonText(m, forFollower))}</td>
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
    ...matches.map((m) => `- ${m.name}（${m.code}） ${m.side === "buy" ? "买入" : "卖出"} @ ${m.price}：${tradeReasonText(m, forFollower)}`),
    "",
    "这是模拟回测信号，不构成投资建议。",
  ].join("\n");
  return { html, text, subject: `指数盯盘提醒：${indexLabel} 有 ${matches.length} 只成分股出现信号` };
}

async function sendIndexAlertEmail(watch, matches) {
  const { html, text, subject } = buildIndexAlertEmail(watch, matches);
  await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
  const followerEmails = await getWatchFollowerEmails(watch.id);
  if (followerEmails.length === 0) return;
  const followerVersion = buildIndexAlertEmail(watch, matches, { forFollower: true });
  for (const email of followerEmails) {
    await postJsonToResend({ from: EMAIL_FROM, to: [email], subject: followerVersion.subject, html: followerVersion.html, text: followerVersion.text });
  }
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
  const subject = `盯盘提醒已自动暂停：${symbolLabel}`;
  await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
  // No rule-specific content in this email (it's about check FAILURES, not a signal), so
  // followers get the exact same copy — no forFollower masking needed here.
  const followerEmails = await getWatchFollowerEmails(watch.id);
  for (const email of followerEmails) {
    await postJsonToResend({ from: EMAIL_FROM, to: [email], subject, html, text });
  }
}

// ~1 trading year — matches the "one full year" validation-window convention used elsewhere
// (search-validated-best.js's testYears windows) for judging whether a model still works.
const VALIDITY_WINDOW_ROWS = 252;
// Same standard and defaults search-validated-best.js's UPSIDE_THRESHOLD_PERCENT/
// DRAWDOWN_TOLERANCE_PERCENT use when a model first qualifies (and run-qualified-recheck.js
// re-applies later) — kept in sync so "still valid" during live watching means the same thing as
// "达标" did at qualification time. This script has no CLI args (it's a plain cron job, see the
// header comment's Usage line), so these are constants rather than --flags.
const UPSIDE_THRESHOLD_PERCENT = 30;
const DRAWDOWN_TOLERANCE_PERCENT = 5;
const MIN_UPSIDE_GATE_ROWS = 30;

// Checks the watch's FROZEN strategy (see server.js's schema comment on frozen_config) against
// the most recent ~1 year of freshly-fetched data. rows is the same SIMULATION_WINDOW_ROWS
// (~2yr) slice processSymbolWatch already loaded, used here purely as indicator warmup so the
// trailing-year score isn't computed on cold indicators — same reasoning as
// buildScoredBacktestStates' own doc comment. Returns { checked: false } when
// there isn't yet a full trailing year of data (a young listing), rather than flagging invalid
// on too little evidence.
function getWatchAccountStartDate(watch) {
  return new Date(watch.created_at).toISOString().slice(0, 10);
}

function findAccountStartIndex(rows, startDateStr) {
  const index = rows.findIndex((row) => row.date >= startDateStr);
  return index < 0 ? rows.length : index;
}

// A 盯盘 paper account starts when the user creates the watch: cash=config.initialCash,
// shares=0, no historical position inherited from the model's earlier backtest. Rows before
// accountStartIndex still warm up indicators, but they cannot mutate this watch's account.
function deriveWatchAccountStats(states, accountStartIndex, initialCash) {
  if (!states || states.length === 0) return null;
  const last = states[states.length - 1];
  const baselineCash = Number(initialCash) || INITIAL_CASH;
  const returnRate = baselineCash > 0 ? ((last.equity - baselineCash) / baselineCash) * 100 : 0;
  const effectiveStartIndex = Math.min(Math.max(0, accountStartIndex), states.length);
  let peakEquity = baselineCash;
  let maxDrawdown = 0;
  for (let i = effectiveStartIndex; i < states.length; i += 1) {
    const equity = states[i].equity;
    peakEquity = Math.max(peakEquity, equity);
    const drawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return {
    returnRate,
    maxDrawdown,
    trades: last.trades || [],
    rowsScored: Math.max(0, states.length - effectiveStartIndex),
    equity: last.equity,
    cash: last.cash,
    shares: last.shares,
    positionRatio: last.positionRatio,
  };
}

function evaluateModelValidity(rows, baseConfig) {
  if (rows.length <= VALIDITY_WINDOW_ROWS) return { checked: false };
  const validityRows = rows.slice(-VALIDITY_WINDOW_ROWS);
  const validityStartDate = validityRows[0].date;
  const validityEndDate = validityRows[validityRows.length - 1].date;
  const scored = engine.buildScoredBacktestStates(rows, baseConfig, validityStartDate);
  const buyHoldStates = engine.buildBuyHoldStates(validityRows, INITIAL_CASH, TRADE_FEE);
  const buyHold = buyHoldStates[buyHoldStates.length - 1];

  // Upside-deviation gate (see scripts/shared/volatility.js): the model's annualized return over
  // this trailing year must also clear UPSIDE_THRESHOLD_PERCENT of the stock's OWN upside
  // deviation for that same year — same bar search-validated-best.js requires at qualification
  // time, not just "better than buy-hold" in absolute terms.
  const annualizedReturn = annualizedReturnRate(scored.returnRate, scored.rowsScored);
  const upsideDev = validityRows.length >= MIN_UPSIDE_GATE_ROWS ? annualizedUpsideDeviation(validityRows) : null;
  const requiredReturn = upsideDev !== null ? (UPSIDE_THRESHOLD_PERCENT / 100) * upsideDev : null;
  const passesUpsideGate = upsideDev === null || annualizedReturn === null || annualizedReturn >= requiredReturn;

  // Per-year drawdown gate, with the same proportional tolerance as search-validated-best.js's
  // DRAWDOWN_TOLERANCE_PERCENT — the model's drawdown may exceed buy-hold's own drawdown by up to
  // this percentage before counting against it, instead of requiring a strict beat.
  const allowedDrawdown = buyHold.maxDrawdown * (1 + DRAWDOWN_TOLERANCE_PERCENT / 100);
  const passesDrawdownGate = scored.maxDrawdown < allowedDrawdown;

  const isInvalid = !(passesUpsideGate && passesDrawdownGate);
  const reasonParts = [];
  if (!passesUpsideGate) {
    reasonParts.push(`年化收益 ${annualizedReturn.toFixed(1)}% 未达到当年上行标准差${upsideDev.toFixed(1)}%的${UPSIDE_THRESHOLD_PERCENT}%（需≥${requiredReturn.toFixed(1)}%）`);
  }
  if (!passesDrawdownGate) {
    reasonParts.push(`最大回撤 ${scored.maxDrawdown.toFixed(1)}% 超过买入持有回撤${buyHold.maxDrawdown.toFixed(1)}%的${(1 + DRAWDOWN_TOLERANCE_PERCENT / 100).toFixed(2)}倍（上限${allowedDrawdown.toFixed(1)}%）`);
  }
  const reason = isInvalid
    ? `最近一年（${validityStartDate} ~ ${validityEndDate}）${reasonParts.join("；")}。模型已不再达标。`
    : "";
  return { checked: true, isInvalid, reason };
}

function buildModelInvalidWarningEmail(watch, reason, scoredAccount) {
  const symbolLabel = `${watch.symbol_name || watch.symbol}（${watch.symbol}）`;
  const shares = Number(scoredAccount.shares) || 0;
  const equity = Number(scoredAccount.equity) || 0;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>模型已失效预警：${escapeHtml(symbolLabel)}（仍有持仓，盯盘继续）</h2>
      <p>你设置的盯盘"${escapeHtml(watch.preset_label)} · ${escapeHtml(symbolLabel)}"所用的模型参数是创建盯盘时冻结的，不会被后台的重新优化自动修改。这次检查发现：</p>
      <p>${escapeHtml(reason)}</p>
      <p>当前模拟持仓：${shares.toFixed(0)} 股，账户权益 ${equity.toFixed(0)}。因为还有持仓，盯盘不会自动停止，会按原模型的规则继续跟踪到这笔仓位结束（每天最多提醒一次），届时若仍然失效会自动停用。是否要提前手动平仓，请自行判断。</p>
      <hr style="border:none;border-top:1px solid #d9e0ea;margin:20px 0">
      <h2>Model no longer valid: ${escapeHtml(symbolLabel)} (position still open, watch continues)</h2>
      <p>${escapeHtml(reason)} A position is still open under this watch's frozen model, so it stays active and will keep tracking the existing position (at most one warning email per day) until it closes on the model's own exit rule — auto-disabling only once flat. This is not investment advice; whether to close early is your call.</p>
    </div>
  `;
  const text = `模型已失效预警：${symbolLabel}\n${reason}\n当前模拟持仓：${shares.toFixed(0)} 股，账户权益 ${equity.toFixed(0)}。仍有持仓，盯盘继续，直到仓位结束。`;
  return { html, text, subject: `模型已失效预警：${symbolLabel}（仍有持仓）` };
}

async function sendModelInvalidWarningEmail(watch, reason, scoredAccount) {
  const { html, text, subject } = buildModelInvalidWarningEmail(watch, reason, scoredAccount);
  await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
  // reason is aggregate performance vs buy-hold (return/drawdown numbers), not a specific rule
  // threshold, so it's the same content for followers — no masking needed.
  const followerEmails = await getWatchFollowerEmails(watch.id);
  for (const email of followerEmails) {
    await postJsonToResend({ from: EMAIL_FROM, to: [email], subject, html, text });
  }
}

function buildModelInvalidStoppedEmail(watch, reason) {
  const symbolLabel = `${watch.symbol_name || watch.symbol}（${watch.symbol}）`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>盯盘已自动停止：${escapeHtml(symbolLabel)}</h2>
      <p>${escapeHtml(reason)}</p>
      <p>当前没有模拟持仓，为避免继续用一个已经失效的模型开新仓，这个盯盘已自动停用。可以到"设置盯盘提醒"里用"重新验证"看看调整参数后是否还能用，或者换一个新模型重新建立盯盘。</p>
      <hr style="border:none;border-top:1px solid #d9e0ea;margin:20px 0">
      <h2>Watch auto-disabled: ${escapeHtml(symbolLabel)}</h2>
      <p>${escapeHtml(reason)} No position is currently open, so this watch has been auto-disabled rather than let a model that failed the current upside/drawdown gates open new positions. Re-validate with adjusted parameters, or set up a new watch with a different model.</p>
    </div>
  `;
  const text = `盯盘已自动停止：${symbolLabel}\n${reason}\n当前没有持仓，已自动停用，避免用失效模型开新仓。`;
  return { html, text, subject: `盯盘已自动停止：${symbolLabel}` };
}

async function sendModelInvalidStoppedEmail(watch, reason) {
  const { html, text, subject } = buildModelInvalidStoppedEmail(watch, reason);
  await postJsonToResend({ from: EMAIL_FROM, to: [watch.owner_email], subject, html, text });
  const followerEmails = await getWatchFollowerEmails(watch.id);
  for (const email of followerEmails) {
    await postJsonToResend({ from: EMAIL_FROM, to: [email], subject, html, text });
  }
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
      label: watch.frozen_label,
      strategyType: watch.frozen_strategy_type,
      ...(watch.frozen_config && typeof watch.frozen_config === "object" ? watch.frozen_config : {}),
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
    const rows = await loadRows(watch.symbol, dbMarket);

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
      label: watch.frozen_label,
      strategyType: watch.frozen_strategy_type,
      ...(watch.frozen_config && typeof watch.frozen_config === "object" ? watch.frozen_config : {}),
    };
    const baseConfig = engine.buildConfigFromPresetObject(preset, { initialCash: INITIAL_CASH, tradeFee: TRADE_FEE, strategyType: preset.strategyType });
    const accountStartDate = getWatchAccountStartDate(watch);
    const accountStartIndex = findAccountStartIndex(rows, accountStartDate);
    engine.setActiveLotSizeSymbol(watch.symbol);
    const states = engine.buildBacktestStates(rows, baseConfig, accountStartIndex);
    const last = states[states.length - 1];
    const lastDate = rows[rows.length - 1].date;
    const todaysTrades = last.trades.filter((trade) => trade.date === lastDate);

    const scoredAccount = deriveWatchAccountStats(states, accountStartIndex, baseConfig.initialCash);
    const accountAnnualized = annualizedReturnRate(scoredAccount.returnRate, scoredAccount.rowsScored) || 0;
    const accountParams = [
      scoredAccount.cash, scoredAccount.shares, scoredAccount.equity, scoredAccount.positionRatio,
      scoredAccount.returnRate, accountAnnualized, scoredAccount.maxDrawdown, scoredAccount.rowsScored,
      JSON.stringify(scoredAccount.trades),
    ];

    // Model validity now comes from run-model-validation-daily.js's fixed-start cumulative
    // validation state. This 15-minute watcher still maintains signal/account state, but it no
    // longer runs a trailing-window validity test or auto-disables a flat watch.
    const nowInvalid = watch.validation_status === "invalid";
    const invalidReason = nowInvalid ? (watch.validation_status_reason || "每日累计验证显示模型已失效。") : "";
    const nextInvalidSince = nowInvalid ? (watch.invalid_since || new Date()) : null;
    const invalidParams = [nowInvalid, invalidReason, nextInvalidSince, watch.last_invalid_warning_date || null];
    const shouldDisableForInvalidity = false;

    if (todaysTrades.length > 0 && lastDate !== (watch.last_signal_date ? watch.last_signal_date.toISOString().slice(0, 10) : null)) {
      await sendAlertEmail(watch, todaysTrades);
      const lastTrade = todaysTrades[todaysTrades.length - 1];
      const autoTradeResult = await autoSubmitPaperTrade(watch, lastTrade, lastDate);
      await pool.query(`
        UPDATE watch_alerts SET
          last_checked_at = NOW(), last_signal_date = $2, last_signal_action = $3,
          last_signal_reason = $4, last_notified_at = NOW(), consecutive_failures = 0,
          last_error = '', updated_at = NOW(),
          account_cash = $5, account_shares = $6, account_equity = $7, account_position_ratio = $8,
          account_return_rate = $9, account_annualized_return = $10, account_max_drawdown = $11,
          account_rows_scored = $12, account_trades = $13::jsonb, account_updated_at = NOW(),
          is_invalid = $14, invalid_reason = $15, invalid_since = $16, last_invalid_warning_date = $17,
          enabled = CASE WHEN $18 THEN FALSE ELSE enabled END
        WHERE id = $1
      `, [watch.id, lastDate, lastTrade.side, lastTrade.reason || lastTrade.label || "", ...accountParams, ...invalidParams, shouldDisableForInvalidity]);
      const autoTradeLog = autoTradeResult ? ` autoTrade=${autoTradeResult.ok ? "submitted" : autoTradeResult.skipped ? "skipped" : "failed"}` : "";
      console.log(`[alert] watch=${watch.id} ${watch.symbol} ${todaysTrades.map((t) => t.label).join(", ")} -> emailed ${watch.owner_email}${autoTradeLog}`);
    } else {
      await pool.query(`
        UPDATE watch_alerts SET
          last_checked_at = NOW(), consecutive_failures = 0, last_error = '', updated_at = NOW(),
          account_cash = $2, account_shares = $3, account_equity = $4, account_position_ratio = $5,
          account_return_rate = $6, account_annualized_return = $7, account_max_drawdown = $8,
          account_rows_scored = $9, account_trades = $10::jsonb, account_updated_at = NOW(),
          is_invalid = $11, invalid_reason = $12, invalid_since = $13, last_invalid_warning_date = $14,
          enabled = CASE WHEN $15 THEN FALSE ELSE enabled END
        WHERE id = $1
      `, [watch.id, ...accountParams, ...invalidParams, shouldDisableForInvalidity]);
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
  await pool.query("ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS trade_enabled BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS trade_capital DOUBLE PRECISION NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE trade_intents ADD COLUMN IF NOT EXISTS confirmation_token TEXT NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE trade_intents ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE trade_intents ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE trade_intents ADD COLUMN IF NOT EXISTS trading_mode TEXT NOT NULL DEFAULT 'paper'");
  await pool.query("ALTER TABLE broker_orders ADD COLUMN IF NOT EXISTS trading_mode TEXT NOT NULL DEFAULT 'paper'");
  await ensureModelValidationStateTable(pool);
  await expireStaleTradeConfirmations();
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
