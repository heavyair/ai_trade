const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { Pool } = require("pg");
const ModelGenerator = require("./scripts/shared/model-generator.js");
const { getStockCategories } = require("./scripts/shared/stock-categories.js");
const { postJsonToResend } = require("./scripts/shared/send-email.js");
const { runAkshareBridge } = require("./scripts/shared/akshare-client.js");
const { ensureIndexCatalogTable, listIndexCatalog, resolveIndexConstituents } = require("./scripts/shared/index-catalog.js");
const { loadRowsForSymbol } = require("./scripts/shared/load-rows.js");
const { splitTrainTestWindows } = require("./scripts/shared/train-test-window.js");
const { annualizedReturnRate } = require("./scripts/shared/annualize.js");
const engine = require("./scripts/universe/engine.js");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const PRESETS_FILE = process.env.PRESETS_FILE || path.join(DATA_DIR, "custom-presets.json");
const RANKINGS_FILE = process.env.RANKINGS_FILE || path.join(DATA_DIR, "ranking-records.json");
const USERS_FILE = process.env.USERS_FILE || path.join(DATA_DIR, "users.json");
const SCAN_SESSION_STATE_FILE = process.env.SCAN_SESSION_STATE_FILE || path.join(DATA_DIR, "scan-session-state.json");
// Written by scripts/universe/run-auto-generate.js itself (see its writeProgress helper) —
// the server never runs that loop, it only spawns it, so this is how live "currently trying
// model X, attempt N/M" detail gets back to the admin panel instead of the panel only ever
// seeing coarse running/not-running state.
const AUTO_GENERATE_PROGRESS_FILE = process.env.AUTO_GENERATE_PROGRESS_FILE || path.join(DATA_DIR, "auto-generate-progress.json");
// Same convention, written by run-optimization-scan.js itself — see its writeProgress helper.
const SCAN_PROGRESS_FILE = process.env.SCAN_PROGRESS_FILE || path.join(DATA_DIR, "scan-progress.json");
// Same convention, written by search-validated-best.js itself — see its writeProgress helper.
const VALIDATED_SEARCH_PROGRESS_FILE = process.env.VALIDATED_SEARCH_PROGRESS_FILE || path.join(DATA_DIR, "validated-search-progress.json");
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const DATABASE_SSL = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
const DEEPSEEK_API_KEY = String(process.env.DEEPSEEK_API_KEY || "").trim();
const DEEPSEEK_MODEL = String(process.env.DEEPSEEK_MODEL || "deepseek-chat").trim();
const EMAIL_FROM = process.env.EMAIL_FROM || "AI Trade <noreply@lesminis.ca>";
const APP_PUBLIC_URL = String(process.env.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
const ADMIN_EMAIL = "victor.gm.liu@gmail.com";
const PUBLIC_OWNER_LABEL = "public";
const SUPPORTED_STRATEGY_TYPES = ModelGenerator.SUPPORTED_STRATEGY_TYPES;
const EMAIL_VERIFICATION_TTL_MS = Math.max(15 * 60 * 1000, Number(process.env.EMAIL_VERIFICATION_TTL_MS || 24 * 60 * 60 * 1000));
const EMAIL_RESEND_COOLDOWN_MS = Math.max(10 * 1000, Number(process.env.EMAIL_RESEND_COOLDOWN_MS || 60 * 1000));
const dbPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
});
let dbReady = null;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function userIdForEmail(email) {
  return `user_${sha256(email).slice(0, 32)}`;
}

function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

function toIsoDate(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

async function dbQuery(text, params = []) {
  await ensureDbReady();
  return dbPool.query(text, params);
}

async function ensureDbReady() {
  if (!dbReady) dbReady = initializeDatabase();
  return dbReady;
}

async function initializeDatabase() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ,
      email_verification_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS strategy_presets (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      config JSONB NOT NULL,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      original_text TEXT NOT NULL DEFAULT '',
      model_text TEXT NOT NULL DEFAULT '',
      is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE strategy_presets ADD COLUMN IF NOT EXISTS original_text TEXT NOT NULL DEFAULT '';
    ALTER TABLE strategy_presets ADD COLUMN IF NOT EXISTS model_text TEXT NOT NULL DEFAULT '';
    ALTER TABLE strategy_presets ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

    -- name/label are just display text now, not identity — id (an opaque randomId("preset"),
    -- never recomputed from owner+name) is the only thing that has to stay unique. Dropped in
    -- favor of allowing legitimate repeats (e.g. two different symbols' AI search results
    -- landing on the same rounded label text).
    DROP INDEX IF EXISTS strategy_presets_user_name_idx;
    DROP INDEX IF EXISTS strategy_presets_legacy_name_idx;

    CREATE TABLE IF NOT EXISTS ranking_records (
      key TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      symbol TEXT NOT NULL,
      symbol_name TEXT NOT NULL,
      period_years INTEGER NOT NULL,
      period_label TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      preset_id TEXT,
      preset_name TEXT NOT NULL,
      preset_label TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      preset_config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      preset_meta_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      preset_original_text_snapshot TEXT NOT NULL DEFAULT '',
      preset_model_text_snapshot TEXT NOT NULL DEFAULT '',
      return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      annualized_return DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      excess_return DOUBLE PRECISION NOT NULL DEFAULT 0,
      max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      drawdown_diff DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_fees DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_fees DOUBLE PRECISION NOT NULL DEFAULT 0,
      trades INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE ranking_records ADD COLUMN IF NOT EXISTS preset_id TEXT;
    ALTER TABLE ranking_records ADD COLUMN IF NOT EXISTS preset_config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE ranking_records ADD COLUMN IF NOT EXISTS preset_meta_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE ranking_records ADD COLUMN IF NOT EXISTS preset_original_text_snapshot TEXT NOT NULL DEFAULT '';
    ALTER TABLE ranking_records ADD COLUMN IF NOT EXISTS preset_model_text_snapshot TEXT NOT NULL DEFAULT '';
    ALTER TABLE ranking_records ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

    UPDATE strategy_presets
    SET config = config - 'label' - 'meta'
    WHERE config ? 'label' OR config ? 'meta';

    UPDATE ranking_records
    SET preset_config_snapshot = preset_config_snapshot - 'label' - 'meta'
    WHERE preset_config_snapshot ? 'label' OR preset_config_snapshot ? 'meta';

    CREATE TABLE IF NOT EXISTS symbols (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      info JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(symbol, market)
    );

    -- Per-owner (logged-in user, or anonymous browser via cookie) record of which stock
    -- codes they've queried and when — deliberately separate from the symbols table (which
    -- is the shared market-data cache, not a private per-visitor history). owner_key is
    -- either "user:<userId>" or "anon:<cookieId>".
    CREATE TABLE IF NOT EXISTS symbol_query_history (
      owner_key TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (owner_key, code)
    );
    CREATE INDEX IF NOT EXISTS symbol_query_history_owner_idx ON symbol_query_history(owner_key, last_used_at DESC);

    CREATE TABLE IF NOT EXISTS daily_prices (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      trade_date DATE NOT NULL,
      open DOUBLE PRECISION NOT NULL,
      high DOUBLE PRECISION NOT NULL,
      low DOUBLE PRECISION NOT NULL,
      close DOUBLE PRECISION NOT NULL,
      volume DOUBLE PRECISION NOT NULL DEFAULT 0,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      amplitude DOUBLE PRECISION NOT NULL DEFAULT 0,
      change_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
      change_value DOUBLE PRECISION NOT NULL DEFAULT 0,
      turnover DOUBLE PRECISION NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(symbol, market, trade_date)
    );

    CREATE TABLE IF NOT EXISTS daily_valuations (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      trade_date DATE NOT NULL,
      pe DOUBLE PRECISION,
      pe_ttm DOUBLE PRECISION,
      pb DOUBLE PRECISION,
      source TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(symbol, market, trade_date)
    );

    CREATE TABLE IF NOT EXISTS data_fetch_logs (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS backtest_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      symbol TEXT NOT NULL,
      symbol_name TEXT NOT NULL DEFAULT '',
      market TEXT NOT NULL DEFAULT '',
      start_date DATE,
      end_date DATE,
      range_label TEXT NOT NULL DEFAULT '',
      initial_cash DOUBLE PRECISION NOT NULL DEFAULT 0,
      trade_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS backtest_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
      preset_name TEXT NOT NULL,
      preset_label TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 0,
      final_equity DOUBLE PRECISION NOT NULL DEFAULT 0,
      return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_return_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
      excess_return DOUBLE PRECISION NOT NULL DEFAULT 0,
      drawdown_diff DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_fees DOUBLE PRECISION NOT NULL DEFAULT 0,
      buy_hold_fees DOUBLE PRECISION NOT NULL DEFAULT 0,
      trades_count INTEGER NOT NULL DEFAULT 0,
      config JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS backtest_trades (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
      result_id TEXT REFERENCES backtest_results(id) ON DELETE CASCADE,
      preset_name TEXT NOT NULL,
      trade_index INTEGER NOT NULL,
      trade_date DATE,
      side TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      price DOUBLE PRECISION NOT NULL DEFAULT 0,
      shares DOUBLE PRECISION NOT NULL DEFAULT 0,
      position_ratio DOUBLE PRECISION NOT NULL DEFAULT 0,
      account_cash DOUBLE PRECISION NOT NULL DEFAULT 0,
      account_equity DOUBLE PRECISION NOT NULL DEFAULT 0,
      fee DOUBLE PRECISION NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      reference JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    -- No longer read by application code: batch-scan model selection now uses
    -- strategy_presets.original_model_id = '0' directly (a preset is scanned iff it's
    -- itself a root). Left in place only so this migration stays idempotent for
    -- deployments that already created it; safe to drop in a future cleanup.
    CREATE TABLE IF NOT EXISTS optimization_scan_representatives (
      model_id TEXT PRIMARY KEY REFERENCES strategy_presets(id) ON DELETE CASCADE,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE strategy_presets ADD COLUMN IF NOT EXISTS original_model_id TEXT NOT NULL DEFAULT '0';

    -- Human-friendly unique lookup number, separate from the TEXT primary key (id) that every
    -- FK/reference in the app actually points at. Nothing ever writes this column explicitly —
    -- BIGSERIAL's own sequence guarantees uniqueness on insert, and IF NOT EXISTS makes this
    -- safe to re-run on every server start without re-creating the sequence or touching existing values.
    ALTER TABLE strategy_presets ADD COLUMN IF NOT EXISTS numeric_id BIGSERIAL;

    -- One row per "选股" scan run. A single row carries both the live in-progress state
    -- (status='running', scanned_symbols/matches updated incrementally by the batch script)
    -- and the permanent historical record once done — private to owner_user_id, except the
    -- admin endpoint queries this table with no owner filter to see everyone's runs.
    CREATE TABLE IF NOT EXISTS stock_screen_runs (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      owner_email TEXT NOT NULL,
      preset_id TEXT,
      preset_label TEXT NOT NULL DEFAULT '',
      market TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      total_symbols INTEGER NOT NULL DEFAULT 0,
      scanned_symbols INTEGER NOT NULL DEFAULT 0,
      match_count INTEGER NOT NULL DEFAULT 0,
      matches JSONB NOT NULL DEFAULT '[]'::jsonb,
      preset_config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      error TEXT NOT NULL DEFAULT '',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
    ALTER TABLE stock_screen_runs ADD COLUMN IF NOT EXISTS preset_config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS stock_screen_runs_owner_idx ON stock_screen_runs(owner_user_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS stock_screen_runs_started_idx ON stock_screen_runs(started_at DESC);

    -- 盯盘提醒: one row per (owner, model, stock) watch a user configured to be checked on a
    -- recurring schedule by scripts/universe/run-watch-alerts.js (host-cron driven, see that
    -- script's header comment). Unlike stock_screen_runs (a one-shot batch scan across a whole
    -- market), this is a small persistent list of narrow, targeted watches — each row IS the
    -- config, and also carries its own last-check/last-signal state so the checker script can
    -- do its own per-row dedup without a separate log table.
    CREATE TABLE IF NOT EXISTS watch_alerts (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_email TEXT NOT NULL,
      preset_id TEXT NOT NULL REFERENCES strategy_presets(id) ON DELETE CASCADE,
      preset_label TEXT NOT NULL DEFAULT '',
      symbol TEXT NOT NULL,
      symbol_name TEXT NOT NULL DEFAULT '',
      market TEXT NOT NULL,
      frequency_minutes INTEGER NOT NULL DEFAULT 60,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_checked_at TIMESTAMPTZ,
      last_signal_date DATE,
      last_signal_action TEXT,
      last_signal_reason TEXT NOT NULL DEFAULT '',
      last_notified_at TIMESTAMPTZ,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS watch_alerts_owner_preset_symbol_idx
      ON watch_alerts(owner_user_id, preset_id, symbol, market);
    CREATE INDEX IF NOT EXISTS watch_alerts_due_idx ON watch_alerts(enabled, last_checked_at);
    CREATE INDEX IF NOT EXISTS watch_alerts_owner_idx ON watch_alerts(owner_user_id, created_at DESC);

    -- Simulated "started paper-trading the moment this watch was created" account, recomputed
    -- from scratch every check cycle by run-watch-alerts.js (engine.buildScoredBacktestStates
    -- scored from created_at) rather than incrementally maintained.
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_cash DOUBLE PRECISION;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_shares DOUBLE PRECISION;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_equity DOUBLE PRECISION;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_position_ratio DOUBLE PRECISION;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_return_rate DOUBLE PRECISION;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_annualized_return DOUBLE PRECISION;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_max_drawdown DOUBLE PRECISION;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_rows_scored INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_trades JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS account_updated_at TIMESTAMPTZ;

    -- 指数盯盘: symbol/symbol_name become optional, index_code/index_name are the index-mode
    -- counterpart — exactly one of (symbol) or (index_code) is set per row (enforced in
    -- application code, not a DB constraint, matching this table's existing lightweight style).
    -- An index-mode watch re-resolves the index's CURRENT constituent list every check cycle
    -- (see run-watch-alerts.js) instead of freezing membership at creation time, so index
    -- rebalances are picked up automatically rather than watching stale/departed constituents.
    ALTER TABLE watch_alerts ALTER COLUMN symbol DROP NOT NULL;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS index_code TEXT;
    ALTER TABLE watch_alerts ADD COLUMN IF NOT EXISTS index_name TEXT NOT NULL DEFAULT '';
    CREATE UNIQUE INDEX IF NOT EXISTS watch_alerts_owner_preset_index_idx
      ON watch_alerts(owner_user_id, preset_id, index_code) WHERE index_code IS NOT NULL;
  `);

  await ensureIndexCatalogTable(dbPool);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readRequestBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("请求内容太大。"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getRequestOrigin(req) {
  if (APP_PUBLIC_URL) return APP_PUBLIC_URL;
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers["x-forwarded-proto"] || (req.socket && req.socket.encrypted ? "https" : "http");
  return `${String(protocol).split(",")[0]}://${String(host).split(",")[0]}`.replace(/\/+$/, "");
}

// postJsonToResend moved to scripts/shared/send-email.js so scripts/universe/run-watch-alerts.js
// (a standalone cron script, can't require server.js without starting a duplicate HTTP
// listener) can send email through the same transport instead of a second copy.

// AI model generation (requestAiJsonModel/generateModelFromDescription/normalizeGeneratedModel/
// the BLOCK_RULE_* schema constants) moved to scripts/shared/model-generator.js so both this
// server and the autonomous scripts/universe/run-auto-generate.js pipeline share the exact
// same AI-output validation gate instead of risking two copies drifting apart.
const { generateModelFromDescription } = ModelGenerator;

async function sendVerificationEmail(req, userId, email, force = false) {
  if (!RESEND_API_KEY) {
    return { sent: false, emailEnabled: false };
  }

  const userResult = await dbPool.query(`
    SELECT email_verified_at, email_verification_sent_at
    FROM users
    WHERE id = $1
  `, [userId]);
  const user = userResult.rows[0];
  if (!user) {
    const error = new Error("账户不存在。");
    error.statusCode = 404;
    throw error;
  }
  if (user.email_verified_at) {
    return { sent: false, alreadyVerified: true, emailEnabled: true };
  }
  if (!force && user.email_verification_sent_at) {
    const elapsed = Date.now() - new Date(user.email_verification_sent_at).getTime();
    if (elapsed < EMAIL_RESEND_COOLDOWN_MS) {
      return { sent: false, cooldownSeconds: Math.ceil((EMAIL_RESEND_COOLDOWN_MS - elapsed) / 1000), emailEnabled: true };
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await dbPool.query(`
    INSERT INTO email_verification_tokens (token_hash, user_id, expires_at, created_at)
    VALUES ($1, $2, $3, NOW())
  `, [sha256(token), userId, expiresAt]);

  const verifyUrl = `${getRequestOrigin(req)}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const escapedUrl = escapeHtml(verifyUrl);
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>验证你的 AI Trade 账户</h2>
      <p>请点击下面的按钮完成电子邮件验证。验证后就可以保存模型、优化参数和历史回测记录。</p>
      <p><a href="${escapedUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#1f7a8c;color:#fff;text-decoration:none">验证电子邮件</a></p>
      <p>如果按钮无法打开，请复制这个链接到浏览器：</p>
      <p style="word-break:break-all">${escapedUrl}</p>
      <p>这个链接将在 24 小时后失效。</p>
      <hr style="border:none;border-top:1px solid #d9e0ea;margin:20px 0">
      <h2>Verify your AI Trade account</h2>
      <p>Click the button below to verify your email. After verification, you can save models, optimized parameters, and historical backtest records.</p>
      <p><a href="${escapedUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#1f7a8c;color:#fff;text-decoration:none">Verify email</a></p>
      <p>If the button does not open, copy this link into your browser:</p>
      <p style="word-break:break-all">${escapedUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>
  `;
  const text = [
    "验证你的 AI Trade 账户",
    "",
    "打开下面链接完成电子邮件验证。验证后就可以保存模型、优化参数和历史回测记录。",
    verifyUrl,
    "",
    "这个链接将在 24 小时后失效。",
    "",
    "Verify your AI Trade account",
    "",
    "Open the link below to verify your email. After verification, you can save models, optimized parameters, and historical backtest records.",
    verifyUrl,
    "",
    "This link expires in 24 hours.",
  ].join("\n");

  await postJsonToResend({
    from: EMAIL_FROM,
    to: [email],
    subject: "验证你的 AI Trade 账户",
    html,
    text,
  });

  await dbPool.query(`
    UPDATE users
    SET email_verification_sent_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [userId]);
  return { sent: true, emailEnabled: true };
}

async function verifyEmailToken(req, res, token) {
  const tokenHash = sha256(token);
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT email_verification_tokens.user_id, users.email
      FROM email_verification_tokens
      JOIN users ON users.id = email_verification_tokens.user_id
      WHERE email_verification_tokens.token_hash = $1
        AND email_verification_tokens.used_at IS NULL
        AND email_verification_tokens.expires_at > NOW()
      FOR UPDATE
    `, [tokenHash]);
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      sendHtml(res, 400, "<!doctype html><meta charset=\"utf-8\"><title>验证失败</title><p>验证链接无效或已过期，请回到 App 重新发送验证邮件。</p>");
      return;
    }

    const row = result.rows[0];
    await client.query("UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1", [row.user_id]);
    await client.query("UPDATE email_verification_tokens SET used_at = NOW() WHERE token_hash = $1", [tokenHash]);
    await client.query("COMMIT");

    const session = createSessionToken();
    await dbQuery(`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES ($1, $2, $3)
    `, [sha256(session.token), row.user_id, new Date(session.expiresAt)]);
    setSessionCookie(res, session.token, session.expiresAt);

    const appUrl = escapeHtml(getRequestOrigin(req));
    sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><title>验证成功</title><p>电子邮件已验证成功。</p><p><a href="${appUrl}">返回 AI Trade</a></p>`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // Ignore rollback failures after the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function sendPasswordResetEmail(req, email) {
  if (!RESEND_API_KEY) {
    return { sent: false, emailEnabled: false };
  }

  const normalizedEmail = normalizeEmail(email);
  const userResult = await dbPool.query("SELECT id, email FROM users WHERE email = $1", [normalizedEmail]);
  const user = userResult.rows[0];
  if (!user) {
    return { sent: false, emailEnabled: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await dbPool.query(`
    INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
    VALUES ($1, $2, $3, NOW())
  `, [sha256(token), user.id, expiresAt]);

  const resetUrl = `${getRequestOrigin(req)}/api/auth/reset-password?token=${encodeURIComponent(token)}`;
  const escapedUrl = escapeHtml(resetUrl);
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2>重置你的 AI Trade 密码</h2>
      <p>请点击下面的按钮设置新密码。这个链接只能使用一次。</p>
      <p><a href="${escapedUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#1f7a8c;color:#fff;text-decoration:none">重置密码</a></p>
      <p>如果按钮无法打开，请复制这个链接到浏览器：</p>
      <p style="word-break:break-all">${escapedUrl}</p>
      <p>这个链接将在 1 小时后失效。如果不是你本人操作，可以忽略这封邮件。</p>
      <hr style="border:none;border-top:1px solid #d9e0ea;margin:20px 0">
      <h2>Reset your AI Trade password</h2>
      <p>Click the button below to set a new password. This link can be used only once.</p>
      <p><a href="${escapedUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#1f7a8c;color:#fff;text-decoration:none">Reset password</a></p>
      <p>If the button does not open, copy this link into your browser:</p>
      <p style="word-break:break-all">${escapedUrl}</p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    </div>
  `;
  const text = [
    "重置你的 AI Trade 密码",
    "",
    "打开下面链接设置新密码。这个链接只能使用一次，并将在 1 小时后失效。",
    resetUrl,
    "",
    "Reset your AI Trade password",
    "",
    "Open the link below to set a new password. This link can be used only once and expires in 1 hour.",
    resetUrl,
  ].join("\n");

  await postJsonToResend({
    from: EMAIL_FROM,
    to: [normalizedEmail],
    subject: "重置你的 AI Trade 密码",
    html,
    text,
  });

  return { sent: true, emailEnabled: true };
}

function sendPasswordResetForm(req, res, token) {
  const escapedToken = escapeHtml(token);
  const appUrl = escapeHtml(getRequestOrigin(req));
  sendHtml(res, 200, `<!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>重置 AI Trade 密码</title>
        <style>
          body{font-family:Arial,sans-serif;margin:0;background:#f4fafb;color:#1f2937}
          main{max-width:440px;margin:8vh auto;padding:24px;background:#fff;border:1px solid #d4e8ee;border-radius:8px}
          label,button{display:block;width:100%;box-sizing:border-box}
          input{width:100%;box-sizing:border-box;margin-top:6px;padding:11px;border:1px solid #cfd8e3;border-radius:6px}
          button{margin-top:16px;padding:11px;border:0;border-radius:6px;background:#1f7a8c;color:#fff;font-weight:700}
          p{line-height:1.5;color:#607182}
          a{color:#1f7a8c}
        </style>
      </head>
      <body>
        <main>
          <h1>重置密码</h1>
          <p>请输入新密码，至少 8 个字符。提交后会自动登录。</p>
          <form method="post" action="/api/auth/reset-password">
            <input type="hidden" name="token" value="${escapedToken}">
            <label>新密码
              <input name="password" type="password" minlength="8" maxlength="200" autocomplete="new-password" required>
            </label>
            <button type="submit">设置新密码</button>
          </form>
          <p><a href="${appUrl}">返回 AI Trade</a></p>
        </main>
      </body>
    </html>`);
}

async function resetPasswordWithToken(req, res, token, password) {
  const tokenHash = sha256(token);
  const safePassword = sanitizePassword(password);
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(safePassword, salt);
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT password_reset_tokens.user_id, users.email
      FROM password_reset_tokens
      JOIN users ON users.id = password_reset_tokens.user_id
      WHERE password_reset_tokens.token_hash = $1
        AND password_reset_tokens.used_at IS NULL
        AND password_reset_tokens.expires_at > NOW()
      FOR UPDATE
    `, [tokenHash]);
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      sendHtml(res, 400, "<!doctype html><meta charset=\"utf-8\"><title>重置失败</title><p>重置链接无效或已过期，请回到 App 重新发送密码重置邮件。</p>");
      return;
    }

    const row = result.rows[0];
    await client.query(`
      UPDATE users
      SET salt = $1,
          password_hash = $2,
          email_verified_at = COALESCE(email_verified_at, NOW()),
          updated_at = NOW()
      WHERE id = $3
    `, [salt, passwordHash, row.user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1", [tokenHash]);
    await client.query("DELETE FROM sessions WHERE user_id = $1", [row.user_id]);
    const session = createSessionToken();
    await client.query(`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES ($1, $2, $3)
    `, [sha256(session.token), row.user_id, new Date(session.expiresAt)]);
    await client.query("COMMIT");

    setSessionCookie(res, session.token, session.expiresAt);
    const appUrl = escapeHtml(getRequestOrigin(req));
    sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><title>密码已更新</title><p>密码已更新，并已自动登录。</p><p><a href="${appUrl}">返回 AI Trade</a></p>`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // Ignore rollback failures after the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

function ensureDataDir(filePath = PRESETS_FILE) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizePresetKey(name) {
  return String(name || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function sanitizeServerPreset(name, preset) {
  if (!preset || typeof preset !== "object" || Array.isArray(preset)) return null;
  const strategyType = SUPPORTED_STRATEGY_TYPES.includes(preset.strategyType)
    ? preset.strategyType
    : "wave";
  const meta = preset.meta && typeof preset.meta === "object" && !Array.isArray(preset.meta) ? preset.meta : {};
  return {
    ...preset,
    label: String(preset.label || name).slice(0, 100),
    strategyType,
    waveThreshold: Math.max(0.1, Number(preset.waveThreshold || 5)),
    meta: {
      targetSymbol: String(meta.targetSymbol || "通用").slice(0, 32),
      provedPeriod: String(meta.provedPeriod || "服务器保存").slice(0, 60),
      creator: String(meta.creator || "user").slice(0, 80),
      createdAt: String(meta.createdAt || new Date().toISOString().slice(0, 10)).slice(0, 16),
      updatedAt: String(meta.updatedAt || new Date().toISOString().slice(0, 10)).slice(0, 16),
      originalText: String(meta.originalText || "").slice(0, 8000),
      modelText: String(meta.modelText || meta.originalText || "").slice(0, 8000),
      ownerEmail: String(meta.ownerEmail || "").slice(0, 160),
      isOwner: Boolean(meta.isOwner),
      isPublic: Boolean(meta.isPublic),
      isLegacy: Boolean(meta.isLegacy),
      // "0" means this preset is itself an origin (hand-crafted, not derived from
      // another saved model); otherwise this is the id of the ROOT ancestor preset it
      // was derived from (via 优化参数保存 or admin 另存为模型), propagated transitively
      // so a multi-generation derivation chain still collapses to a single root id.
      originalModelId: String(meta.originalModelId || "0").slice(0, 120),
      // Readable snapshot of the source's own label/numericId, captured once at 另存为 time —
      // needed because a promoted-from-AI-candidate preset's originalModelId points at an
      // optimization_scan_results row, a table that gets cleared periodically, so a live
      // lookup can't be relied on to ever resolve a friendly name later.
      originalModelLabel: String(meta.originalModelLabel || "").slice(0, 100),
      originalModelNumericId: meta.originalModelNumericId !== undefined && meta.originalModelNumericId !== null
        ? Number(meta.originalModelNumericId)
        : null,
    },
  };
}

function buildPresetConfigPayload(preset) {
  const config = { ...(preset || {}) };
  delete config.label;
  delete config.meta;
  delete config.id;
  delete config.numericId;
  return config;
}

function readCustomPresets() {
  return readPresetStore().legacyPresets;
}

function normalizePresetMap(presets) {
  if (!presets || typeof presets !== "object" || Array.isArray(presets)) return {};
  return Object.entries(presets).reduce((next, [name, preset]) => {
    const key = normalizePresetKey(name);
    const safePreset = sanitizeServerPreset(key, preset);
    if (key && safePreset) next[key] = safePreset;
    return next;
  }, {});
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    throw new Error("请输入有效电子邮件。");
  }
  return email;
}

function readPresetStore() {
  try {
    if (!fs.existsSync(PRESETS_FILE)) {
      return { version: 2, legacyPresets: {}, users: {} };
    }
    const parsed = JSON.parse(fs.readFileSync(PRESETS_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { version: 2, legacyPresets: {}, users: {} };
    }

    if (parsed.version === 2 && parsed.users && typeof parsed.users === "object") {
      const users = {};
      Object.entries(parsed.users).forEach(([email, value]) => {
        try {
          const key = normalizeEmail(email);
          users[key] = {
            presets: normalizePresetMap(value && value.presets),
          };
        } catch (error) {
          // Skip malformed migrated user keys.
        }
      });
      return {
        version: 2,
        legacyPresets: normalizePresetMap(parsed.legacyPresets),
        users,
      };
    }

    return {
      version: 2,
      legacyPresets: normalizePresetMap(parsed),
      users: {},
    };
  } catch (error) {
    return { version: 2, legacyPresets: {}, users: {} };
  }
}

function writePresetStore(store) {
  ensureDataDir(PRESETS_FILE);
  const tmpFile = `${PRESETS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify({
    version: 2,
    legacyPresets: store.legacyPresets || {},
    users: store.users || {},
  }, null, 2)}\n`, "utf8");
  fs.renameSync(tmpFile, PRESETS_FILE);
}

async function ensureImportedUser(email) {
  const normalizedEmail = normalizeEmail(email);
  const id = userIdForEmail(normalizedEmail);
  const salt = crypto.randomBytes(16).toString("hex");
  await dbPool.query(`
    INSERT INTO users (id, email, salt, password_hash, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
  `, [id, normalizedEmail, salt, hashPassword(crypto.randomBytes(16).toString("hex"), salt)]);
  return id;
}

// Identity here is the row's opaque `id` (randomId("preset") on first insert), never
// recomputed from owner+name — that's what let a rename/re-own require rewriting the primary
// key, and let two saves that happened to produce the same owner+name collide. A preset object
// carrying its own real `.id` (sanitizeStoredPreset/sanitizeServerPreset preserve it through
// every edit round-trip) means "update this exact row"; no matching row (missing id, or an id
// that doesn't belong to this owner — e.g. echoed back from a read-only view of someone else's
// preset) means "insert a new one" rather than erroring or hijacking another row.
async function upsertPreset(ownerUserId, name, preset, isLegacy = false, options = {}) {
  const key = normalizePresetKey(name);
  const safePreset = sanitizeServerPreset(key, preset);
  if (!key || !safePreset) return null;
  const configPayload = buildPresetConfigPayload(safePreset);
  const meta = safePreset.meta || {};
  const existingId = preset && typeof preset.id === "string" && preset.id ? preset.id : null;

  if (existingId) {
    const updated = await dbPool.query(`
      UPDATE strategy_presets
      SET name = $2, label = $3, strategy_type = $4, config = $5::jsonb, meta = $6::jsonb,
          original_text = COALESCE(NULLIF(strategy_presets.original_text, ''), $7),
          model_text = $8, is_legacy = $9, original_model_id = $10, updated_at = NOW()
      WHERE id = $1 AND ((owner_user_id = $11::text) OR (owner_user_id IS NULL AND $11::text IS NULL))
      RETURNING id
    `, [
      existingId, key, safePreset.label, safePreset.strategyType, JSON.stringify(configPayload),
      JSON.stringify(meta), meta.originalText || "", meta.modelText || "", Boolean(isLegacy),
      meta.originalModelId || "0", ownerUserId,
    ]);
    if (updated.rows.length > 0) return updated.rows[0].id;
    // id present but not this caller's own row — fall through to inserting a fresh one.
  }

  const newId = randomId("preset");
  await dbPool.query(`
    INSERT INTO strategy_presets (
      id, owner_user_id, name, label, strategy_type, config, meta, original_text, model_text, is_legacy, original_model_id, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, NOW(), NOW())
  `, [
    newId,
    ownerUserId,
    key,
    safePreset.label,
    safePreset.strategyType,
    JSON.stringify(configPayload),
    JSON.stringify(meta),
    meta.originalText || "",
    meta.modelText || "",
    Boolean(isLegacy),
    meta.originalModelId || "0",
  ]);
  return newId;
}

function presetRowsToMap(rows) {
  return rows.reduce((next, row) => {
    const preset = row.config && typeof row.config === "object" ? row.config : {};
    const rowMeta = row.meta && typeof row.meta === "object" ? row.meta : {};
    next[row.name] = sanitizeServerPreset(row.name, {
      ...preset,
      id: row.id,
      numericId: row.numeric_id !== null && row.numeric_id !== undefined ? Number(row.numeric_id) : null,
      label: row.label,
      strategyType: row.strategy_type,
      meta: {
        ...rowMeta,
        ...(preset.meta || {}),
        originalText: row.original_text || rowMeta.originalText || (preset.meta && preset.meta.originalText) || "",
        modelText: row.model_text || rowMeta.modelText || (preset.meta && preset.meta.modelText) || row.original_text || "",
        ownerEmail: row.owner_email || rowMeta.ownerEmail || "",
        isOwner: Boolean(row.is_owner),
        isPublic: Boolean(row.is_public),
        isLegacy: Boolean(row.is_legacy),
      },
    });
    return next;
  }, {});
}

async function readUserPresets(email) {
  const legacyResult = await dbQuery(`
    SELECT id, numeric_id, name, label, strategy_type, config, meta, original_text, model_text, is_legacy,
      $1::text AS owner_email, FALSE AS is_owner, TRUE AS is_public
    FROM strategy_presets
    WHERE owner_user_id IS NULL AND hidden_at IS NULL
    ORDER BY updated_at DESC
  `, [PUBLIC_OWNER_LABEL]);
  const userResult = await dbQuery(`
    SELECT strategy_presets.id, strategy_presets.numeric_id, strategy_presets.name, strategy_presets.label, strategy_presets.strategy_type, strategy_presets.config,
      strategy_presets.meta, strategy_presets.original_text, strategy_presets.model_text, strategy_presets.is_legacy,
      users.email AS owner_email, TRUE AS is_owner, FALSE AS is_public
    FROM strategy_presets
    JOIN users ON users.id = strategy_presets.owner_user_id
    WHERE users.email = $1 AND strategy_presets.hidden_at IS NULL
    ORDER BY strategy_presets.updated_at DESC
  `, [email]);
  const legacyPresets = presetRowsToMap(legacyResult.rows);
  const userPresets = presetRowsToMap(userResult.rows);
  return {
    legacyPresets,
    userPresets,
    presets: {
      ...legacyPresets,
      ...userPresets,
    },
  };
}

async function readVisiblePresetsForAnonymous() {
  const result = await dbQuery(`
    SELECT id, numeric_id, name, label, strategy_type, config, meta, original_text, model_text, is_legacy,
      $1::text AS owner_email, FALSE AS is_owner, TRUE AS is_public
    FROM strategy_presets
    WHERE owner_user_id IS NULL AND hidden_at IS NULL
    ORDER BY updated_at DESC
  `, [PUBLIC_OWNER_LABEL]);
  const legacyPresets = presetRowsToMap(result.rows);
  return {
    legacyPresets,
    userPresets: {},
    presets: legacyPresets,
  };
}

function readAuthStore() {
  try {
    if (!fs.existsSync(USERS_FILE)) return { version: 1, users: {}, sessions: {} };
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { version: 1, users: {}, sessions: {} };
    }
    return {
      version: 1,
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
    };
  } catch (error) {
    return { version: 1, users: {}, sessions: {} };
  }
}

function writeAuthStore(store) {
  ensureDataDir(USERS_FILE);
  const tmpFile = `${USERS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify({
    version: 1,
    users: store.users || {},
    sessions: store.sessions || {},
  }, null, 2)}\n`, "utf8");
  fs.renameSync(tmpFile, USERS_FILE);
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function sanitizePassword(value) {
  const password = String(value || "");
  if (password.length < 8) {
    throw new Error("密码至少需要 8 位。");
  }
  if (password.length > 200) {
    throw new Error("密码太长。");
  }
  return password;
}

function createSessionToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  return { token, expiresAt };
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  return header.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 0) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function setSessionCookie(res, token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  res.setHeader("Set-Cookie", `ai_trade_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "ai_trade_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

// setHeader("Set-Cookie", ...) replaces any previous Set-Cookie header on this response
// rather than appending — if a route ever needs to set more than one cookie (e.g. the
// anon-id cookie below alongside a future session-refresh), a plain setHeader call would
// silently drop the earlier one. Always go through this helper for any new cookie instead.
function appendSetCookie(res, cookieString) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookieString);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookieString]);
  } else {
    res.setHeader("Set-Cookie", [existing, cookieString]);
  }
}

// Anonymous (not-logged-in) visitors still get a private, per-browser query history —
// identified by a long-lived random id cookie, separate from the session cookie (which only
// exists once someone logs in).
function getOrCreateAnonId(req, res) {
  const cookies = parseCookies(req);
  const existing = cookies.ai_trade_anon_id;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const anonId = crypto.randomBytes(16).toString("hex");
  appendSetCookie(res, `ai_trade_anon_id=${anonId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365 * 2}`);
  return anonId;
}

// Resolves which "owner" a symbol-query-history row belongs to for this request: the logged-in
// user's account if there is one (so their history follows them across devices), otherwise a
// per-browser anonymous id (so anonymous visitors still get private history, scoped to their
// own browser). May set a cookie on `res` — must be called before the response is sent.
async function resolveSymbolHistoryOwnerKey(req, res) {
  const user = await getCurrentUser(req);
  if (user) return `user:${userIdForEmail(user.email)}`;
  return `anon:${getOrCreateAnonId(req, res)}`;
}

async function recordSymbolQuery(ownerKey, code, name) {
  const normalizedCode = String(code || "").trim().toUpperCase().slice(0, 16);
  if (!ownerKey || !normalizedCode) return;
  const description = String(name || "").trim().slice(0, 23);
  await dbQuery(`
    INSERT INTO symbol_query_history (owner_key, code, description, last_used_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (owner_key, code) DO UPDATE SET
      description = CASE WHEN EXCLUDED.description <> '' THEN EXCLUDED.description ELSE symbol_query_history.description END,
      last_used_at = NOW()
  `, [ownerKey, normalizedCode, description]);
}

async function getCurrentUser(req) {
  const token = parseCookies(req).ai_trade_session;
  if (!token) return null;
  const result = await dbQuery(`
    SELECT users.email, users.created_at, users.email_verified_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = $1
      AND sessions.expires_at > NOW()
  `, [sha256(token)]);
  if (result.rows.length === 0) {
    return null;
  }
  return {
    email: result.rows[0].email,
    createdAt: result.rows[0].created_at,
    emailVerified: !RESEND_API_KEY || Boolean(result.rows[0].email_verified_at),
    emailEnabled: Boolean(RESEND_API_KEY),
    isAdmin: isAdminEmail(result.rows[0].email),
  };
}

async function requireCurrentUser(req) {
  const user = await getCurrentUser(req);
  if (!user) {
    const error = new Error("请先注册或登录后再保存模型。");
    error.statusCode = 401;
    throw error;
  }
  return user;
}

async function requireVerifiedCurrentUser(req) {
  const user = await requireCurrentUser(req);
  if (RESEND_API_KEY && !user.emailVerified) {
    const error = new Error("请先验证电子邮件后再保存。");
    error.statusCode = 403;
    throw error;
  }
  return user;
}

async function requireAdminUser(req) {
  const user = await requireCurrentUser(req);
  if (!isAdminEmail(user.email)) {
    const error = new Error("只有管理员可以执行这个操作。");
    error.statusCode = 403;
    throw error;
  }
  return user;
}

async function handleAuthApi(req, res, action) {
  try {
    if (action === "verify" && req.method === "GET") {
      const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const token = String(requestUrl.searchParams.get("token") || "");
      if (!token) {
        sendHtml(res, 400, "<!doctype html><meta charset=\"utf-8\"><title>验证失败</title><p>验证链接缺少 token。</p>");
        return;
      }
      await verifyEmailToken(req, res, token);
      return;
    }

    if (action === "reset-password" && req.method === "GET") {
      const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const token = String(requestUrl.searchParams.get("token") || "");
      if (!token) {
        sendHtml(res, 400, "<!doctype html><meta charset=\"utf-8\"><title>重置失败</title><p>重置链接缺少 token。</p>");
        return;
      }
      sendPasswordResetForm(req, res, token);
      return;
    }

    if (action === "reset-password" && req.method === "POST") {
      const body = await readRequestBody(req);
      const form = new URLSearchParams(body);
      const token = String(form.get("token") || "");
      const password = String(form.get("password") || "");
      if (!token) {
        sendHtml(res, 400, "<!doctype html><meta charset=\"utf-8\"><title>重置失败</title><p>重置链接缺少 token。</p>");
        return;
      }
      try {
        await resetPasswordWithToken(req, res, token, password);
      } catch (error) {
        sendHtml(res, error.statusCode || 400, `<!doctype html><meta charset="utf-8"><title>重置失败</title><p>${escapeHtml(error.message || "密码重置失败。")}</p>`);
      }
      return;
    }

    if (action === "session" && req.method === "GET") {
      const user = await getCurrentUser(req);
      sendJson(res, 200, { authenticated: Boolean(user), user });
      return;
    }

    if (action === "logout" && req.method === "POST") {
      const token = parseCookies(req).ai_trade_session;
      if (token) {
        await dbQuery("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
      }
      clearSessionCookie(res);
      sendJson(res, 200, { authenticated: false });
      return;
    }

    if (action === "resend-verification" && req.method === "POST") {
      const user = await requireCurrentUser(req);
      const userId = userIdForEmail(user.email);
      const result = await sendVerificationEmail(req, userId, user.email, false);
      if (result.alreadyVerified) {
        sendJson(res, 200, { sent: false, alreadyVerified: true, message: "电子邮件已经验证。" });
        return;
      }
      if (result.cooldownSeconds) {
        sendJson(res, 429, { error: `请 ${result.cooldownSeconds} 秒后再重新发送。` });
        return;
      }
      sendJson(res, 200, { sent: result.sent, emailEnabled: result.emailEnabled });
      return;
    }

    if (action === "forgot-password" && req.method === "POST") {
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const email = normalizeEmail(payload.email);
      const result = await sendPasswordResetEmail(req, email);
      sendJson(res, 200, {
        sent: result.sent,
        emailEnabled: result.emailEnabled,
        message: result.emailEnabled
          ? "如果这个邮箱已注册，密码重置邮件会发送到该邮箱。"
          : "当前没有启用邮件发送服务，无法发送密码重置邮件。",
      });
      return;
    }

    if (!["register", "login"].includes(action) || req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};
    const email = normalizeEmail(payload.email);
    const password = sanitizePassword(payload.password);

    if (action === "register") {
      const existing = await dbQuery("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        throw new Error("这个电子邮件已经注册，请直接登录。");
      }
      const salt = crypto.randomBytes(16).toString("hex");
      await dbQuery(`
        INSERT INTO users (id, email, salt, password_hash, email_verified_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [
        userIdForEmail(email),
        email,
        salt,
        hashPassword(password, salt),
        RESEND_API_KEY ? null : new Date(),
      ]);
    } else {
      const result = await dbQuery("SELECT id, salt, password_hash, created_at, email_verified_at FROM users WHERE email = $1", [email]);
      const user = result.rows[0];
      if (!user || user.password_hash !== hashPassword(password, user.salt)) {
        throw new Error("电子邮件或密码不正确。");
      }
    }

    const session = createSessionToken();
    await dbQuery(`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      SELECT $1, id, $2
      FROM users
      WHERE email = $3
    `, [sha256(session.token), new Date(session.expiresAt), email]);
    setSessionCookie(res, session.token, session.expiresAt);
    let verificationEmail = { sent: false, emailEnabled: Boolean(RESEND_API_KEY) };
    if (action === "register") {
      try {
        verificationEmail = await sendVerificationEmail(req, userIdForEmail(email), email, true);
      } catch (error) {
        verificationEmail = {
          sent: false,
          emailEnabled: Boolean(RESEND_API_KEY),
          error: error.message || "验证邮件发送失败。",
        };
      }
    }
    const userResult = await dbQuery("SELECT created_at, email_verified_at FROM users WHERE email = $1", [email]);
    const userRow = userResult.rows[0] || {};
    sendJson(res, 200, {
      authenticated: true,
      verificationEmail,
      user: {
        email,
        createdAt: userRow.created_at || null,
        emailVerified: !RESEND_API_KEY || Boolean(userRow.email_verified_at),
        emailEnabled: Boolean(RESEND_API_KEY),
        isAdmin: isAdminEmail(email),
      },
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "账户操作失败。" });
  }
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function plainObjectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stripPresetSnapshotDisplayFields(value) {
  const snapshot = { ...plainObjectOrEmpty(value) };
  delete snapshot.label;
  delete snapshot.meta;
  return snapshot;
}

function normalizeRankingKey(value) {
  return String(value || "").replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 160);
}

function buildServerRankingKey(symbol, periodYears, presetName, startDate = "", endDate = "") {
  return `${String(symbol || "").toUpperCase()}:${periodYears}:${startDate}:${endDate}:${presetName}`;
}

function sanitizeServerRankingRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const periodYears = Number(record.periodYears);
  if (![1, 3, 5].includes(periodYears)) return null;
  const symbol = String(record.symbol || "").trim().toUpperCase().slice(0, 16);
  const presetName = normalizePresetKey(record.presetName);
  if (!symbol || !presetName) return null;
  return {
    key: normalizeRankingKey(record.key || buildServerRankingKey(symbol, periodYears, presetName, record.startDate, record.endDate)),
    symbol,
    symbolName: String(record.symbolName || symbol).slice(0, 80),
    periodYears,
    periodLabel: `${periodYears} 年`,
    startDate: String(record.startDate || "").slice(0, 16),
    endDate: String(record.endDate || "").slice(0, 16),
    presetId: String(record.presetId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 160),
    presetName,
    presetLabel: String(record.presetLabel || presetName).slice(0, 100),
    strategyType: SUPPORTED_STRATEGY_TYPES.includes(record.strategyType)
      ? record.strategyType
      : "wave",
    presetConfigSnapshot: stripPresetSnapshotDisplayFields(record.presetConfigSnapshot),
    presetMetaSnapshot: plainObjectOrEmpty(record.presetMetaSnapshot),
    presetOriginalTextSnapshot: String(record.presetOriginalTextSnapshot || "").slice(0, 8000),
    presetModelTextSnapshot: String(record.presetModelTextSnapshot || record.presetOriginalTextSnapshot || "").slice(0, 8000),
    returnRate: toFiniteNumber(record.returnRate),
    annualizedReturn: toFiniteNumber(record.annualizedReturn),
    buyHoldReturnRate: toFiniteNumber(record.buyHoldReturnRate),
    excessReturn: toFiniteNumber(record.excessReturn),
    maxDrawdown: toFiniteNumber(record.maxDrawdown),
    buyHoldMaxDrawdown: toFiniteNumber(record.buyHoldMaxDrawdown),
    drawdownDiff: toFiniteNumber(record.drawdownDiff),
    totalFees: toFiniteNumber(record.totalFees),
    buyHoldFees: toFiniteNumber(record.buyHoldFees),
    trades: Math.max(0, Math.round(toFiniteNumber(record.trades))),
    updatedAt: String(record.updatedAt || new Date().toISOString().slice(0, 10)).slice(0, 16),
  };
}

function readRankingRecords() {
  try {
    if (!fs.existsSync(RANKINGS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(RANKINGS_FILE, "utf8"));
    const records = Array.isArray(parsed) ? parsed : parsed.records;
    if (!Array.isArray(records)) return [];
    return records.map(sanitizeServerRankingRecord).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function writeRankingRecords(records) {
  ensureDataDir(RANKINGS_FILE);
  const tmpFile = `${RANKINGS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  fs.renameSync(tmpFile, RANKINGS_FILE);
}

async function upsertRankingRecord(record, ownerUserId = null) {
  const safeRecord = sanitizeServerRankingRecord(record);
  if (!safeRecord) return;
  const presetId = safeRecord.presetId || null;
  await dbPool.query(`
    INSERT INTO ranking_records (
      key, owner_user_id, symbol, symbol_name, period_years, period_label, start_date, end_date,
      preset_id, preset_name, preset_label, strategy_type, preset_config_snapshot, preset_meta_snapshot,
      preset_original_text_snapshot, preset_model_text_snapshot, return_rate, annualized_return, buy_hold_return_rate,
      excess_return, max_drawdown, buy_hold_max_drawdown, drawdown_diff, total_fees, buy_hold_fees,
      trades, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7::date, $8::date,
      $9, $10, $11, $12, $13::jsonb, $14::jsonb,
      $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, $25,
      $26, COALESCE($27::timestamptz, NOW())
    )
    ON CONFLICT (key) DO UPDATE
      SET symbol = EXCLUDED.symbol,
          symbol_name = EXCLUDED.symbol_name,
          period_years = EXCLUDED.period_years,
          period_label = EXCLUDED.period_label,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          preset_id = EXCLUDED.preset_id,
          preset_name = EXCLUDED.preset_name,
          preset_label = EXCLUDED.preset_label,
          strategy_type = EXCLUDED.strategy_type,
          preset_config_snapshot = EXCLUDED.preset_config_snapshot,
          preset_meta_snapshot = EXCLUDED.preset_meta_snapshot,
          preset_original_text_snapshot = EXCLUDED.preset_original_text_snapshot,
          preset_model_text_snapshot = EXCLUDED.preset_model_text_snapshot,
          return_rate = EXCLUDED.return_rate,
          annualized_return = EXCLUDED.annualized_return,
          buy_hold_return_rate = EXCLUDED.buy_hold_return_rate,
          excess_return = EXCLUDED.excess_return,
          max_drawdown = EXCLUDED.max_drawdown,
          buy_hold_max_drawdown = EXCLUDED.buy_hold_max_drawdown,
          drawdown_diff = EXCLUDED.drawdown_diff,
          total_fees = EXCLUDED.total_fees,
          buy_hold_fees = EXCLUDED.buy_hold_fees,
          trades = EXCLUDED.trades,
          updated_at = EXCLUDED.updated_at
  `, [
    safeRecord.key,
    ownerUserId,
    safeRecord.symbol,
    safeRecord.symbolName,
    safeRecord.periodYears,
    safeRecord.periodLabel,
    toIsoDate(safeRecord.startDate),
    toIsoDate(safeRecord.endDate),
    presetId,
    safeRecord.presetName,
    safeRecord.presetLabel,
    safeRecord.strategyType,
    JSON.stringify(safeRecord.presetConfigSnapshot),
    JSON.stringify(safeRecord.presetMetaSnapshot),
    safeRecord.presetOriginalTextSnapshot,
    safeRecord.presetModelTextSnapshot,
    safeRecord.returnRate,
    safeRecord.annualizedReturn,
    safeRecord.buyHoldReturnRate,
    safeRecord.excessReturn,
    safeRecord.maxDrawdown,
    safeRecord.buyHoldMaxDrawdown,
    safeRecord.drawdownDiff,
    safeRecord.totalFees,
    safeRecord.buyHoldFees,
    safeRecord.trades,
    safeRecord.updatedAt,
  ]);
}

function mapRankingRow(row) {
  return sanitizeServerRankingRecord({
    key: row.key,
    symbol: row.symbol,
    symbolName: row.symbol_name,
    periodYears: row.period_years,
    periodLabel: row.period_label,
    startDate: row.start_date ? new Date(row.start_date).toISOString().slice(0, 10) : "",
    endDate: row.end_date ? new Date(row.end_date).toISOString().slice(0, 10) : "",
    presetId: row.preset_id,
    presetName: row.preset_name,
    presetLabel: row.preset_label,
    strategyType: row.strategy_type,
    presetConfigSnapshot: row.preset_config_snapshot,
    presetMetaSnapshot: row.preset_meta_snapshot,
    presetOriginalTextSnapshot: row.preset_original_text_snapshot,
    presetModelTextSnapshot: row.preset_model_text_snapshot,
    returnRate: row.return_rate,
    annualizedReturn: row.annualized_return,
    buyHoldReturnRate: row.buy_hold_return_rate,
    excessReturn: row.excess_return,
    maxDrawdown: row.max_drawdown,
    buyHoldMaxDrawdown: row.buy_hold_max_drawdown,
    drawdownDiff: row.drawdown_diff,
    totalFees: row.total_fees,
    buyHoldFees: row.buy_hold_fees,
    trades: row.trades,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : "",
  });
}

async function readPublicRankingRecords() {
  const result = await dbQuery(`
    SELECT *
    FROM ranking_records
    WHERE owner_user_id IS NULL AND hidden_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 3000
  `);
  return result.rows.map(mapRankingRow).filter(Boolean);
}

async function readOwnRankingRecords(ownerUserId) {
  const result = await dbQuery(`
    SELECT *
    FROM ranking_records
    WHERE owner_user_id = $1 AND hidden_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 3000
  `, [ownerUserId]);
  return result.rows.map(mapRankingRow).filter(Boolean);
}

async function handlePresetsApi(req, res) {
  try {
    if (req.method === "GET") {
      const user = await getCurrentUser(req);
      const presets = user
        ? await readUserPresets(user.email)
        : await readVisiblePresetsForAnonymous();
      sendJson(res, 200, {
        authenticated: Boolean(user),
        user,
        presets: presets.presets,
        legacyPresets: presets.legacyPresets,
        userPresets: presets.userPresets,
      });
      return;
    }

    if (req.method === "PATCH") {
      const user = await requireVerifiedCurrentUser(req);
      const userId = userIdForEmail(user.email);
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const presetId = String(payload.id || "").trim();
      if (!presetId) {
        sendJson(res, 400, { error: "缺少模型 id。" });
        return;
      }
      const hidden = Boolean(payload.hidden);
      const result = await dbQuery(`
        UPDATE strategy_presets
        SET hidden_at = ${hidden ? "NOW()" : "NULL"}, updated_at = NOW()
        WHERE id = $1 AND owner_user_id = $2
        RETURNING id, name, label
      `, [presetId, userId]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "模型不存在，或者你不是这个模型的 owner。" });
        return;
      }
      sendJson(res, 200, { updated: result.rows[0], hidden });
      return;
    }

    if (req.method === "DELETE") {
      const user = await requireVerifiedCurrentUser(req);
      const userId = userIdForEmail(user.email);
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const presetId = String(payload.id || "").trim();
      if (!presetId) {
        sendJson(res, 400, { error: "缺少模型 id。" });
        return;
      }
      const result = await dbQuery(`
        DELETE FROM strategy_presets
        WHERE id = $1 AND owner_user_id = $2
        RETURNING id, name, label
      `, [presetId, userId]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "模型不存在，或者你不是这个模型的 owner。" });
        return;
      }
      sendJson(res, 200, { deleted: result.rows[0] });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const user = await requireVerifiedCurrentUser(req);
    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};
    const incoming = payload && payload.presets && typeof payload.presets === "object"
      ? payload.presets
      : {};
    const userId = userIdForEmail(user.email);

    for (const [name, preset] of Object.entries(incoming)) {
      await upsertPreset(userId, name, preset, false);
    }
    const presets = await readUserPresets(user.email);
    sendJson(res, 200, {
      authenticated: true,
      user,
      presets: presets.presets,
      userPresets: presets.userPresets,
      legacyPresets: presets.legacyPresets,
      saved: Object.keys(incoming).length,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "预设保存失败。" });
  }
}

async function handleGenerateModelApi(req, res) {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    await requireVerifiedCurrentUser(req);
    const body = await readRequestBody(req, 64 * 1024);
    const payload = body ? JSON.parse(body) : {};
    const description = String(payload.description || "").trim().slice(0, 8000);
    if (!description) {
      sendJson(res, 400, { error: "请先输入模型描述。" });
      return;
    }
    const symbol = String(payload.symbol || "通用").trim().slice(0, 24);
    const label = String(payload.label || "").trim().slice(0, 80);
    const model = await generateModelFromDescription(description, symbol, label);
    sendJson(res, 200, {
      model,
      modelProvider: DEEPSEEK_API_KEY ? "deepseek" : "openai",
      aiModel: DEEPSEEK_API_KEY ? DEEPSEEK_MODEL : OPENAI_MODEL,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "AI 模型生成失败。" });
  }
}

function mapAdminPresetRow(row) {
  const meta = row.meta && typeof row.meta === "object" ? row.meta : {};
  return {
    id: row.id,
    numericId: row.numeric_id !== null && row.numeric_id !== undefined ? Number(row.numeric_id) : null,
    name: row.name,
    label: row.label,
    strategyType: row.strategy_type,
    ownerEmail: row.owner_email || PUBLIC_OWNER_LABEL,
    ownerValue: row.owner_email || PUBLIC_OWNER_LABEL,
    isPublic: !row.owner_user_id,
    isLegacy: Boolean(row.is_legacy),
    originalText: row.original_text || meta.originalText || "",
    modelText: row.model_text || meta.modelText || row.original_text || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : "",
    config: row.config && typeof row.config === "object" ? row.config : {},
    meta,
    originalModelId: row.original_model_id || meta.originalModelId || "0",
    hiddenAt: row.hidden_at ? new Date(row.hidden_at).toISOString() : "",
  };
}

function mapAdminRankingRow(row) {
  return {
    key: row.key,
    ownerEmail: row.owner_email || PUBLIC_OWNER_LABEL,
    symbol: row.symbol,
    symbolName: row.symbol_name,
    periodYears: row.period_years,
    periodLabel: row.period_label,
    startDate: row.start_date ? new Date(row.start_date).toISOString().slice(0, 10) : "",
    endDate: row.end_date ? new Date(row.end_date).toISOString().slice(0, 10) : "",
    presetName: row.preset_name,
    presetLabel: row.preset_label,
    strategyType: row.strategy_type,
    // Snapshotted at the time this record was created — lets the admin view "what config
    // actually produced this result" and replay its trades, even if the live preset (if any
    // still exists under this name) has since been edited or deleted.
    presetConfigSnapshot: row.preset_config_snapshot && typeof row.preset_config_snapshot === "object" ? row.preset_config_snapshot : {},
    presetMetaSnapshot: row.preset_meta_snapshot && typeof row.preset_meta_snapshot === "object" ? row.preset_meta_snapshot : {},
    presetOriginalTextSnapshot: row.preset_original_text_snapshot || "",
    presetModelTextSnapshot: row.preset_model_text_snapshot || "",
    returnRate: Number(row.return_rate) || 0,
    annualizedReturn: Number(row.annualized_return) || 0,
    buyHoldReturnRate: Number(row.buy_hold_return_rate) || 0,
    excessReturn: Number(row.excess_return) || 0,
    maxDrawdown: Number(row.max_drawdown) || 0,
    trades: row.trades || 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : "",
  };
}

async function handleAdminPresetsApi(req, res) {
  try {
    await requireAdminUser(req);

    if (req.method === "GET") {
      const result = await dbQuery(`
        SELECT strategy_presets.*, users.email AS owner_email
        FROM strategy_presets
        LEFT JOIN users ON users.id = strategy_presets.owner_user_id
        ORDER BY strategy_presets.updated_at DESC
        LIMIT 2000
      `);
      const users = await dbQuery("SELECT email FROM users ORDER BY email ASC LIMIT 2000");
      sendJson(res, 200, {
        adminEmail: ADMIN_EMAIL,
        presets: result.rows.map(mapAdminPresetRow),
        owners: [PUBLIC_OWNER_LABEL, ...users.rows.map((row) => row.email)],
      });
      return;
    }

    if (req.method === "PATCH") {
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const id = String(payload.id || "").trim();
      if (!id) {
        sendJson(res, 400, { error: "缺少模型 ID。" });
        return;
      }

      if (payload.label !== undefined) {
        const label = String(payload.label || "").trim().slice(0, 80);
        if (!label) {
          sendJson(res, 400, { error: "模型名称不能为空。" });
          return;
        }
        const updated = await dbQuery(`
          UPDATE strategy_presets
          SET label = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id, label
        `, [label, id]);
        if (updated.rows.length === 0) {
          sendJson(res, 404, { error: "模型不存在，可能已经删除。" });
          return;
        }
        sendJson(res, 200, { updated: updated.rows[0] });
        return;
      }

      if (payload.originalModelId !== undefined) {
        const originalModelId = String(payload.originalModelId || "0").trim() || "0";
        if (originalModelId === id) {
          sendJson(res, 400, { error: "原始模型不能指向自己。" });
          return;
        }
        if (originalModelId !== "0") {
          const root = await dbQuery("SELECT id, original_model_id FROM strategy_presets WHERE id = $1", [originalModelId]);
          if (root.rows.length === 0) {
            sendJson(res, 404, { error: "指定的原始模型不存在。" });
            return;
          }
          if (String(root.rows[0].original_model_id || "0") !== "0") {
            sendJson(res, 400, { error: "原始模型必须是一个原始手工模型（不能指向另一个衍生模型）。" });
            return;
          }
        }
        const updated = await dbQuery(`
          UPDATE strategy_presets
          SET original_model_id = $1,
              meta = jsonb_set(COALESCE(meta, '{}'::jsonb), '{originalModelId}', to_jsonb($1::text)),
              updated_at = NOW()
          WHERE id = $2
          RETURNING id, original_model_id
        `, [originalModelId, id]);
        if (updated.rows.length === 0) {
          sendJson(res, 404, { error: "模型不存在，可能已经删除。" });
          return;
        }
        sendJson(res, 200, { updated: updated.rows[0] });
        return;
      }

      if (payload.hidden !== undefined) {
        const hidden = Boolean(payload.hidden);
        const updated = await dbQuery(`
          UPDATE strategy_presets
          SET hidden_at = ${hidden ? "NOW()" : "NULL"}, updated_at = NOW()
          WHERE id = $1
          RETURNING id, hidden_at
        `, [id]);
        if (updated.rows.length === 0) {
          sendJson(res, 404, { error: "模型不存在，可能已经删除。" });
          return;
        }
        sendJson(res, 200, { updated: updated.rows[0], hidden });
        return;
      }

      const owner = String(payload.owner || "").trim();
      if (!owner) {
        sendJson(res, 400, { error: "缺少 owner。" });
        return;
      }
      const ownerUserId = owner.toLowerCase() === PUBLIC_OWNER_LABEL
        ? null
        : await ensureImportedUser(owner);
      // id is opaque now — never encodes the owner — so reassigning ownership is just a plain
      // field update, no primary-key rewrite, no conflict-checking, no need to re-point
      // ranking_records (it was never referencing the id by FK anyway).
      const updated = await dbQuery(`
        UPDATE strategy_presets
        SET owner_user_id = $1, is_legacy = FALSE, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `, [ownerUserId, id]);
      if (updated.rows.length === 0) {
        sendJson(res, 404, { error: "模型不存在，可能已经删除。" });
        return;
      }
      sendJson(res, 200, { updated: updated.rows[0], owner: ownerUserId ? owner : PUBLIC_OWNER_LABEL });
      return;
    }

    if (req.method === "DELETE") {
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const id = String(payload.id || "").trim();
      if (!id) {
        sendJson(res, 400, { error: "缺少模型 ID。" });
        return;
      }
      const result = await dbQuery("DELETE FROM strategy_presets WHERE id = $1 RETURNING id, name, label", [id]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "模型不存在，可能已经删除。" });
        return;
      }
      sendJson(res, 200, { deleted: result.rows[0] });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

async function handleAdminRankingsApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const result = await dbQuery(`
      SELECT ranking_records.*, users.email AS owner_email
      FROM ranking_records
      LEFT JOIN users ON users.id = ranking_records.owner_user_id
      WHERE ranking_records.hidden_at IS NULL
      ORDER BY ranking_records.return_rate DESC
      LIMIT 3000
    `);
    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      records: result.rows.map(mapAdminRankingRow),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

function mapAdminOptimizationScanRow(row, universeIndexByCode) {
  const categories = getStockCategories(row.symbol, universeIndexByCode);
  // optimization_scan_results.market stores the data-provider's raw exchange code for CN
  // stocks ("1" Shanghai / "0" Shenzhen — see run-optimization-scan.js/run-auto-generate.js's
  // dbMarket computation) and "US" for US stocks, never "CN" — normalize to CN/US here so the
  // client filter (and anything else comparing against "CN"/"US") sees a consistent value.
  const marketLabel = row.market === "US" ? "US" : "CN";
  return {
    id: row.id,
    symbol: row.symbol,
    market: marketLabel,
    symbolName: row.symbol_name,
    isChip: categories.isChip,
    isTech: categories.isTech,
    isQqq: categories.isQqq,
    presetId: row.preset_id,
    presetNumericId: row.preset_numeric_id !== null && row.preset_numeric_id !== undefined ? Number(row.preset_numeric_id) : null,
    presetLabel: row.preset_label,
    strategyType: row.strategy_type,
    rowsTested: row.rows_tested || 0,
    baselineReturnRate: Number(row.baseline_return_rate) || 0,
    baselineMaxDrawdown: Number(row.baseline_max_drawdown) || 0,
    bestReturnRate: Number(row.best_return_rate) || 0,
    bestMaxDrawdown: Number(row.best_max_drawdown) || 0,
    bestScore: Number(row.best_score) || 0,
    bestTrades: row.best_trades || 0,
    testedCandidates: row.tested_candidates || 0,
    bestConfig: row.best_config && typeof row.best_config === "object" ? row.best_config : {},
    buyHoldReturnRate: Number(row.buy_hold_return_rate) || 0,
    buyHoldMaxDrawdown: Number(row.buy_hold_max_drawdown) || 0,
    trainAnnualizedReturn: Number(row.train_annualized_return) || 0,
    trainStartDate: row.train_start_date ? new Date(row.train_start_date).toISOString().slice(0, 10) : "",
    trainEndDate: row.train_end_date ? new Date(row.train_end_date).toISOString().slice(0, 10) : "",
    testYear1ReturnRate: Number(row.test_year1_return_rate) || 0,
    testYear1MaxDrawdown: Number(row.test_year1_max_drawdown) || 0,
    testYear1AnnualizedReturn: Number(row.test_year1_annualized_return) || 0,
    testYear1Trades: row.test_year1_trades || 0,
    testYear1RowsTested: row.test_year1_rows_tested || 0,
    testYear1StartDate: row.test_year1_start_date ? new Date(row.test_year1_start_date).toISOString().slice(0, 10) : "",
    testYear1EndDate: row.test_year1_end_date ? new Date(row.test_year1_end_date).toISOString().slice(0, 10) : "",
    testYear2ReturnRate: Number(row.test_year2_return_rate) || 0,
    testYear2MaxDrawdown: Number(row.test_year2_max_drawdown) || 0,
    testYear2AnnualizedReturn: Number(row.test_year2_annualized_return) || 0,
    testYear2Trades: row.test_year2_trades || 0,
    testYear2RowsTested: row.test_year2_rows_tested || 0,
    testYear2StartDate: row.test_year2_start_date ? new Date(row.test_year2_start_date).toISOString().slice(0, 10) : "",
    testYear2EndDate: row.test_year2_end_date ? new Date(row.test_year2_end_date).toISOString().slice(0, 10) : "",
    annualizedDiffYear1: Number(row.annualized_diff_year1) || 0,
    annualizedDiffYear2: Number(row.annualized_diff_year2) || 0,
    scannedAt: row.scanned_at ? new Date(row.scanned_at).toISOString() : "",
  };
}

async function handleAdminOptimizationScanApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const hasTable = await dbQuery(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'optimization_scan_results'
    `);
    if (hasTable.rows.length === 0) {
      sendJson(res, 200, { adminEmail: ADMIN_EMAIL, records: [] });
      return;
    }
    const result = await dbQuery(`
      SELECT osr.*, sp.numeric_id AS preset_numeric_id
      FROM optimization_scan_results osr
      LEFT JOIN strategy_presets sp ON sp.id = osr.preset_id
      ORDER BY (osr.train_start_date IS NULL) ASC, osr.annualized_diff_year2 ASC
      LIMIT 3000
    `);
    const universeIndexByCode = new Map(
      loadOptimizationUniverse().map((entry) => [String(entry.code || "").toUpperCase(), entry])
    );
    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      records: result.rows.map((row) => mapAdminOptimizationScanRow(row, universeIndexByCode)),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

const OPTIMIZATION_SCAN_MIN_ROWS = 250;

function loadOptimizationUniverse() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "scripts", "universe", "symbols.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.symbols) ? parsed.symbols : [];
  } catch (error) {
    return [];
  }
}

// Tracks the currently-running admin-triggered scan child process, if any. Deliberately
// NOT detached: if this server process is killed/redeployed, the scan child dies with it
// rather than continuing to write results against a possibly-stale codebase.
// activeScanProcess/activeScanInfo are deliberately in-memory only: they describe a child
// process this exact server instance owns, which is meaningless to persist (a redeploy's
// new instance has no such process, full stop). lastScanResult is different — its whole
// purpose is letting the admin "resume" a session across time, and a redeploy is exactly
// the situation where that matters most (it SIGKILLs the running child without ever
// reaching the child.on("exit") handler below), so it's mirrored to disk on every
// start/exit and restored at boot — see restoreScanSessionState().
function readScanSessionState() {
  try {
    if (!fs.existsSync(SCAN_SESSION_STATE_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(SCAN_SESSION_STATE_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function writeScanSessionState(state) {
  try {
    ensureDataDir(SCAN_SESSION_STATE_FILE);
    fs.writeFileSync(SCAN_SESSION_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("failed to persist scan session state:", error.message);
  }
}

// Called once at startup. If the persisted state says a job was still "running", this
// server never saw it finish — either the previous instance was killed by a redeploy
// mid-job, or it crashed outright. Either way, from the admin's perspective that's an
// interrupted session that "继续上次中断的扫描" should be able to pick back up.
function restoreScanSessionState() {
  const persisted = readScanSessionState();
  if (!persisted) return;
  if (persisted.status === "running") {
    lastScanResult = { ...persisted.result, exitCode: -1, endedAt: new Date().toISOString(), interrupted: true };
    writeScanSessionState({ status: "crashed", result: lastScanResult });
  } else if (persisted.result) {
    lastScanResult = persisted.result;
  }
}

let activeScanProcess = null;
let activeScanInfo = null;
// Set once the previous run's child process exits, so the admin UI can tell "last run
// crashed" (exitCode !== 0) from "last run finished normally" (exitCode === 0), and so a
// "resume" request can replay the exact same session (same sessionStartedAt/presetIds).
let lastScanResult = null;
restoreScanSessionState();

// Only one background batch job (optimization scan OR universe validation) is allowed to
// run at a time — both are long-running, CPU/DB-heavy, and share the same host, so letting
// them run concurrently would just make both slower without any benefit.
function isScanRunning() {
  return Boolean(activeScanProcess && activeScanInfo);
}

function launchBackgroundJob({ jobType, scriptPath, scriptArgs, sessionStartedAt, triggeredBy, extra = {} }) {
  const logPath = path.join(__dirname, "scripts", "universe", `${jobType}.log`);
  const logFd = fs.openSync(logPath, "a");
  const fullArgs = [scriptPath, ...scriptArgs];

  fs.writeSync(logFd, `\n\n=== admin-triggered ${jobType} started, session=${sessionStartedAt} by ${triggeredBy} ===\n`);

  const child = spawn(process.execPath, fullArgs, {
    cwd: __dirname,
    env: process.env,
    stdio: ["ignore", logFd, logFd],
  });
  activeScanProcess = child;
  activeScanInfo = { jobType, startedAt: sessionStartedAt, sessionStartedAt, triggeredBy, pid: child.pid, ...extra };
  writeScanSessionState({ status: "running", result: { jobType, sessionStartedAt, triggeredBy, ...extra } });

  child.on("exit", (code) => {
    fs.writeSync(logFd, `\n=== admin-triggered ${jobType} exited with code ${code} ===\n`);
    fs.closeSync(logFd);
    lastScanResult = { jobType, sessionStartedAt, triggeredBy, exitCode: code, endedAt: new Date().toISOString(), ...extra };
    writeScanSessionState({ status: code === 0 ? "completed" : "crashed", result: lastScanResult });
    activeScanProcess = null;
    activeScanInfo = null;
  });
  child.on("error", (error) => {
    console.error(`${jobType} child process error:`, error);
    lastScanResult = { jobType, sessionStartedAt, triggeredBy, exitCode: -1, endedAt: new Date().toISOString(), error: error.message, ...extra };
    writeScanSessionState({ status: "crashed", result: lastScanResult });
    activeScanProcess = null;
    activeScanInfo = null;
  });
}

function launchScanProcess({ presetIds, symbols, trainYears, testYears, sessionStartedAt, triggeredBy }) {
  // Clear any progress left over from a previous run so the panel doesn't briefly show stale
  // "currently on symbol X..." detail before the freshly-spawned process writes its first update.
  try {
    fs.unlinkSync(SCAN_PROGRESS_FILE);
  } catch (error) {
    // fine if it didn't exist yet
  }
  const scriptArgs = [
    "--rescan", "--candidates=300", "--minTrainRows=200", "--minTestRows=50",
    `--trainYears=${trainYears}`, `--testYears=${testYears}`, `--sessionSince=${sessionStartedAt}`,
  ];
  if (presetIds.length > 0) scriptArgs.push(`--presetIds=${presetIds.join(",")}`);
  if (symbols && symbols.length > 0) scriptArgs.push(`--symbols=${symbols.join(",")}`);
  launchBackgroundJob({
    jobType: "scan",
    scriptPath: path.join(__dirname, "scripts", "universe", "run-optimization-scan.js"),
    scriptArgs,
    sessionStartedAt,
    triggeredBy,
    extra: { presetIds, symbols: symbols || [], trainYears, testYears },
  });
}

function readAutoGenerateProgress() {
  try {
    return JSON.parse(fs.readFileSync(AUTO_GENERATE_PROGRESS_FILE, "utf8"));
  } catch (error) {
    return null;
  }
}

function readScanProgress() {
  try {
    return JSON.parse(fs.readFileSync(SCAN_PROGRESS_FILE, "utf8"));
  } catch (error) {
    return null;
  }
}

function launchAutoGenerateProcess({ symbols, limit, attemptsPerSymbol, maxAttempts, pointCount, trainYears, testYears, sessionStartedAt, triggeredBy, ownerUserId, ownerEmail }) {
  // Clear any progress left over from a previous run so the panel doesn't briefly show stale
  // "currently trying..." detail before the freshly-spawned process writes its first update.
  try {
    fs.unlinkSync(AUTO_GENERATE_PROGRESS_FILE);
  } catch (error) {
    // fine if it didn't exist yet
  }
  const scriptArgs = [
    `--maxAttempts=${maxAttempts}`, `--attemptsPerSymbol=${attemptsPerSymbol}`, `--pointCount=${pointCount}`,
    `--trainYears=${trainYears}`, `--testYears=${testYears}`,
  ];
  if (limit > 0) scriptArgs.push(`--limit=${limit}`);
  if (symbols.length > 0) scriptArgs.push(`--symbols=${symbols.join(",")}`);
  if (ownerUserId) scriptArgs.push(`--ownerUserId=${ownerUserId}`);
  if (ownerEmail) scriptArgs.push(`--ownerEmail=${ownerEmail}`);
  launchBackgroundJob({
    jobType: "autoGenerate",
    scriptPath: path.join(__dirname, "scripts", "universe", "run-auto-generate.js"),
    scriptArgs,
    sessionStartedAt,
    triggeredBy,
    extra: { symbols, limit, attemptsPerSymbol, maxAttempts, pointCount, trainYears, testYears },
  });
}

function readValidatedSearchProgress() {
  try {
    return JSON.parse(fs.readFileSync(VALIDATED_SEARCH_PROGRESS_FILE, "utf8"));
  } catch (error) {
    return null;
  }
}

function launchValidatedSearchProcess({ symbols, targetPercent, attemptsPerSymbol, maxAttempts, candidates, pointCount, trainYears, testYears, sessionStartedAt, triggeredBy, ownerUserId, ownerEmail }) {
  try {
    fs.unlinkSync(VALIDATED_SEARCH_PROGRESS_FILE);
  } catch (error) {
    // fine if it didn't exist yet
  }
  const scriptArgs = [
    `--symbols=${symbols.join(",")}`, `--targetPercent=${targetPercent}`, `--attemptsPerSymbol=${attemptsPerSymbol}`,
    `--maxAttempts=${maxAttempts}`, `--candidates=${candidates}`, `--pointCount=${pointCount}`,
    `--trainYears=${trainYears}`, `--testYears=${testYears}`, "--save",
  ];
  if (ownerUserId) scriptArgs.push(`--ownerUserId=${ownerUserId}`);
  if (ownerEmail) scriptArgs.push(`--ownerEmail=${ownerEmail}`);
  launchBackgroundJob({
    jobType: "validatedSearch",
    scriptPath: path.join(__dirname, "scripts", "universe", "search-validated-best.js"),
    scriptArgs,
    sessionStartedAt,
    triggeredBy,
    extra: { symbols, targetPercent, attemptsPerSymbol, maxAttempts, candidates, pointCount, trainYears, testYears },
  });
}

function launchStockScreenProcess({ runId, presetId, market, ownerUserId, sessionStartedAt, triggeredBy }) {
  const scriptArgs = [`--runId=${runId}`, `--presetId=${presetId}`, `--market=${market}`];
  if (ownerUserId) scriptArgs.push(`--ownerUserId=${ownerUserId}`);
  launchBackgroundJob({
    jobType: "stockScreen",
    scriptPath: path.join(__dirname, "scripts", "universe", "run-stock-screen.js"),
    scriptArgs,
    sessionStartedAt,
    triggeredBy,
    extra: { runId, presetId, market },
  });
}

function launchUniverseValidationProcess({ buyHoldMax, bestReturnMin, rescan, sessionStartedAt, triggeredBy }) {
  const scriptArgs = [`--buyHoldMax=${buyHoldMax}`, `--bestReturnMin=${bestReturnMin}`, `--minRows=250`, `--sessionSince=${sessionStartedAt}`];
  if (rescan) scriptArgs.push("--rescan");
  launchBackgroundJob({
    jobType: "validation",
    scriptPath: path.join(__dirname, "scripts", "universe", "run-universe-validation.js"),
    scriptArgs,
    sessionStartedAt,
    triggeredBy,
    extra: { buyHoldMax, bestReturnMin },
  });
}

async function handleAdminOptimizationScanRunApi(req, res) {
  try {
    const admin = await requireAdminUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (isScanRunning()) {
      sendJson(res, 409, { error: "已有扫描任务在运行中，请等它完成后再启动新的。", info: activeScanInfo });
      return;
    }

    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};

    let presetIds;
    let symbols;
    let sessionStartedAt;
    let trainYears;
    let testYears;
    if (payload.resume) {
      if (!lastScanResult || lastScanResult.exitCode === 0) {
        sendJson(res, 400, { error: "没有可以继续的中断扫描（上一次不是异常退出）。" });
        return;
      }
      presetIds = lastScanResult.presetIds;
      symbols = Array.isArray(lastScanResult.symbols) ? lastScanResult.symbols : [];
      sessionStartedAt = lastScanResult.sessionStartedAt;
      // Keep a resumed run consistent with the interrupted one rather than picking up
      // whatever the train/test inputs happen to say right now.
      trainYears = lastScanResult.trainYears || 4;
      testYears = lastScanResult.testYears || 2;
    } else {
      presetIds = Array.isArray(payload.presetIds)
        ? payload.presetIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      symbols = Array.isArray(payload.symbols)
        ? payload.symbols.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean)
        : [];
      sessionStartedAt = new Date().toISOString();
      trainYears = Math.max(1, Math.min(10, Math.round(Number(payload.trainYears)) || 4));
      testYears = Math.max(1, Math.min(5, Math.round(Number(payload.testYears)) || 2));

      // A fresh (non-resume) trigger means "rescan from scratch", not "pick up where
      // the last run left off" — clear old rows for the presets in scope up front so the
      // admin never sees a stale mix of this-run and previous-run results mid-scan. When
      // symbols is also scoped down, the clear must be scoped down the same way — otherwise
      // targeting just a couple of stocks would wipe out every OTHER stock's existing results
      // for those presets, even though the run itself will only repopulate the requested ones.
      const presetFilterSql = presetIds.length > 0
        ? "preset_id = ANY($1)"
        : "preset_id IN (SELECT id FROM strategy_presets WHERE original_model_id = '0' AND hidden_at IS NULL)";
      const presetFilterParams = presetIds.length > 0 ? [presetIds] : [];
      if (symbols.length > 0) {
        await dbQuery(
          `DELETE FROM optimization_scan_results WHERE ${presetFilterSql} AND symbol = ANY($${presetFilterParams.length + 1})`,
          [...presetFilterParams, symbols]
        );
      } else {
        await dbQuery(`DELETE FROM optimization_scan_results WHERE ${presetFilterSql}`, presetFilterParams);
      }

      // A fresh trigger also starts a clean slate on the pause/crash flag itself — don't
      // wait for the new child's own exit to overwrite it, since that leaves a window where
      // a leftover "上次中断" flag from a previous, now-discarded session could still be read.
      lastScanResult = null;
      writeScanSessionState({ status: "idle", result: null });
    }

    launchScanProcess({ presetIds, symbols, trainYears, testYears, sessionStartedAt, triggeredBy: admin.email });
    sendJson(res, 200, { started: true, presetIds, symbols, trainYears, testYears, sessionStartedAt, resumed: Boolean(payload.resume) });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "启动扫描失败。" });
  }
}

// Killing activeScanProcess (default SIGTERM) makes Node fire the SAME child.on("exit")
// handler that any other crash goes through, with code=null (signal-terminated), which
// launchBackgroundJob already treats as "crashed" and persists via writeScanSessionState —
// so a pause is just a deliberate crash, and the existing resume flow (lastScanResult +
// "resume" branch above) picks it back up with zero new state-tracking needed.
async function handleAdminOptimizationScanPauseApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!isScanRunning() || !activeScanInfo || activeScanInfo.jobType !== "scan") {
      sendJson(res, 400, { error: "当前没有正在运行的后台模型排行扫描，无法暂停。" });
      return;
    }
    activeScanProcess.kill();
    sendJson(res, 200, { paused: true });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "暂停扫描失败。" });
  }
}

async function handleAdminOptimizationScanStatusApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const universe = loadOptimizationUniverse();
    const totalStocks = universe.length;

    const hasTable = await dbQuery(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'optimization_scan_results'
    `);
    if (hasTable.rows.length === 0 || totalStocks === 0) {
      sendJson(res, 200, {
        adminEmail: ADMIN_EMAIL,
        totalModels: 0,
        totalStocks,
        eligibleStocks: 0,
        totalPairs: 0,
        completedPairs: 0,
        totalCandidatesTested: 0,
        stockCompletionRate: 0,
        stocksFullyTested: 0,
        perModel: [],
        scanRunning: isScanRunning(),
        scanInfo: activeScanInfo,
        lastScanResult,
        progress: readScanProgress(),
      });
      return;
    }

    // Source of truth for "which models does the scan/checkbox list cover" is
    // original_model_id = '0' — a model is scanned iff it's itself a root
    // (hand-crafted or admin-designated root), not a derived parameter variant.
    const presetsResult = await dbQuery(`
      SELECT sp.id, sp.label, sp.strategy_type
      FROM strategy_presets sp
      WHERE sp.original_model_id = '0' AND sp.hidden_at IS NULL
    `);
    const presets = presetsResult.rows.map((row) => ({ id: row.id, label: row.label, strategyType: row.strategy_type }));
    const totalModels = presets.length;

    const eligibleRowsResult = await dbQuery(`
      SELECT symbol, market FROM daily_prices
      GROUP BY symbol, market
      HAVING COUNT(*) >= $1
    `, [OPTIMIZATION_SCAN_MIN_ROWS]);
    const eligibleSet = new Set(eligibleRowsResult.rows.map((row) => `${row.symbol}:${row.market}`));
    const eligibleStocks = universe.filter((entry) => {
      const dbMarket = entry.market === "CN" ? (/^[569]/.test(entry.code) ? "1" : "0") : "US";
      return eligibleSet.has(`${entry.code}:${dbMarket}`);
    }).length;

    const totalsResult = await dbQuery(`
      SELECT COUNT(*) AS completed_pairs, COALESCE(SUM(tested_candidates), 0) AS total_candidates
      FROM optimization_scan_results
    `);
    const completedPairs = Number(totalsResult.rows[0].completed_pairs) || 0;
    const totalCandidatesTested = Number(totalsResult.rows[0].total_candidates) || 0;

    const perModelResult = await dbQuery(`
      SELECT preset_id, COUNT(DISTINCT symbol || ':' || market) AS tested_stocks
      FROM optimization_scan_results
      GROUP BY preset_id
    `);
    const testedByPreset = new Map(perModelResult.rows.map((row) => [row.preset_id, Number(row.tested_stocks) || 0]));

    const perStockResult = await dbQuery(`
      SELECT symbol, market, COUNT(DISTINCT preset_id) AS tested_models
      FROM optimization_scan_results
      GROUP BY symbol, market
    `);
    const stocksFullyTested = perStockResult.rows.filter((row) => Number(row.tested_models) >= totalModels && totalModels > 0).length;

    const perModel = presets.map((preset) => {
      const testedStocks = testedByPreset.get(preset.id) || 0;
      return {
        presetId: preset.id,
        label: preset.label,
        strategyType: preset.strategyType,
        testedStocks,
        eligibleStocks,
        rate: eligibleStocks > 0 ? testedStocks / eligibleStocks : 0,
      };
    });

    const totalPairs = totalModels * eligibleStocks;

    // completedPairs/perModel above are computed from the CURRENT row count in
    // optimization_scan_results, which is meaningless as a progress signal during a
    // --rescan of models that were already fully scanned before: a rescan UPDATES
    // existing rows in place rather than inserting new ones, so the row count (and
    // therefore the completion-rate cards) never visibly moves even while real work is
    // happening. When a scan is actively running, additionally compute how many of
    // THIS session's pairs have actually been (re)done since it started, scoped to the
    // specific models this session covers.
    let sessionProgress = null;
    if (isScanRunning() && activeScanInfo && activeScanInfo.jobType === "scan" && activeScanInfo.sessionStartedAt) {
      const sessionPresetIds = Array.isArray(activeScanInfo.presetIds) && activeScanInfo.presetIds.length > 0
        ? activeScanInfo.presetIds
        : presets.map((preset) => preset.id);
      const sessionResult = await dbQuery(`
        SELECT COUNT(*) AS session_completed
        FROM optimization_scan_results
        WHERE scanned_at >= $1 AND preset_id = ANY($2::text[])
      `, [activeScanInfo.sessionStartedAt, sessionPresetIds]);
      sessionProgress = {
        completedPairs: Number(sessionResult.rows[0].session_completed) || 0,
        totalPairs: sessionPresetIds.length * eligibleStocks,
        modelCount: sessionPresetIds.length,
      };
    }

    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      totalModels,
      totalStocks,
      eligibleStocks,
      totalPairs,
      completedPairs,
      totalCandidatesTested,
      stockCompletionRate: eligibleStocks > 0 ? stocksFullyTested / eligibleStocks : 0,
      stocksFullyTested,
      perModel,
      scanRunning: isScanRunning(),
      scanInfo: activeScanInfo,
      lastScanResult,
      sessionProgress,
      progress: readScanProgress(),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

// Shared by handleAdminAutoGenerateListApi and handleAdminValidatedSearchListApi — both read
// presets saved via ModelGenerator.saveGeneratedPreset, which always stamps meta.creator =
// 'ai-auto' regardless of which script called it. The two sources are only distinguishable by
// the preset id's name-slug: run-auto-generate.js uses `ai_auto_<symbol>_<date>`,
// search-validated-best.js uses `ai_validated_<symbol>_<date>` (see saveGeneratedPreset's
// `preset_<ownerUserId>_<normalizePresetKey(name)>` id convention) — pass exactly one of
// idLikePattern/idExcludePattern to pick a side, otherwise the two admin panels' lists overlap.
async function queryAiGeneratedPresets({ source }) {
  const hasResultsTable = await dbQuery(`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'optimization_scan_results'
  `);
  if (hasResultsTable.rows.length === 0) return [];
  const result = await dbQuery(`
    SELECT id, numeric_id, symbol, preset_label, strategy_type, best_config, model_reason,
      train_annualized_return, train_start_date, train_end_date,
      test_year1_annualized_return, test_year1_start_date, test_year1_end_date, test_year1_trades,
      test_year2_annualized_return, test_year2_start_date, test_year2_end_date, test_year2_trades,
      annualized_diff_year1, annualized_diff_year2,
      best_trades, tested_candidates, reached_target, scanned_at
    FROM optimization_scan_results
    WHERE source = $1
    ORDER BY (train_start_date IS NULL) ASC, reached_target DESC NULLS LAST,
      LEAST(test_year1_annualized_return, test_year2_annualized_return) DESC NULLS LAST, scanned_at DESC
    LIMIT 500
  `, [source]);
  return result.rows.map((row) => ({
    id: row.id,
    numericId: row.numeric_id !== null && row.numeric_id !== undefined ? Number(row.numeric_id) : null,
    label: row.preset_label,
    strategyType: row.strategy_type,
    bestConfig: row.best_config && typeof row.best_config === "object" ? row.best_config : {},
    targetSymbol: row.symbol || "",
    reason: row.model_reason || "",
    createdAt: row.scanned_at ? new Date(row.scanned_at).toISOString() : "",
    updatedAt: row.scanned_at ? new Date(row.scanned_at).toISOString() : "",
    trainAnnualizedReturn: Number(row.train_annualized_return) || 0,
    trainStartDate: row.train_start_date ? new Date(row.train_start_date).toISOString().slice(0, 10) : "",
    trainEndDate: row.train_end_date ? new Date(row.train_end_date).toISOString().slice(0, 10) : "",
    testYear1AnnualizedReturn: Number(row.test_year1_annualized_return) || 0,
    testYear1StartDate: row.test_year1_start_date ? new Date(row.test_year1_start_date).toISOString().slice(0, 10) : "",
    testYear1EndDate: row.test_year1_end_date ? new Date(row.test_year1_end_date).toISOString().slice(0, 10) : "",
    testYear1Trades: row.test_year1_trades || 0,
    testYear2AnnualizedReturn: Number(row.test_year2_annualized_return) || 0,
    testYear2StartDate: row.test_year2_start_date ? new Date(row.test_year2_start_date).toISOString().slice(0, 10) : "",
    testYear2EndDate: row.test_year2_end_date ? new Date(row.test_year2_end_date).toISOString().slice(0, 10) : "",
    testYear2Trades: row.test_year2_trades || 0,
    annualizedDiffYear1: Number(row.annualized_diff_year1) || 0,
    annualizedDiffYear2: Number(row.annualized_diff_year2) || 0,
    bestTrades: row.best_trades || 0,
    testedCandidates: row.tested_candidates || 0,
    reachedTarget: Boolean(row.reached_target),
  }));
}

// Lists presets scripts/universe/run-auto-generate.js has saved (meta.creator = "ai-auto"),
// plus the shared background-job running/last-result state (same globals the scan/validation
// panels already poll — only one batch job runs at a time regardless of type).
async function handleAdminAutoGenerateListApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const presets = await queryAiGeneratedPresets({ source: "auto-generate" });
    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      presets,
      running: isScanRunning(),
      scanInfo: activeScanInfo,
      lastScanResult,
      progress: readAutoGenerateProgress(),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

// Lists presets scripts/universe/search-validated-best.js has saved — the "继续寻找" admin
// panel. Unlike AI自动生成 (which only ever saves the single train-picked winner per symbol),
// this script now always saves the best-by-TEST attempt per symbol even if it never reached
// --targetPercent (reachedTarget: false), so the admin can see per-symbol search progress
// across repeated runs instead of losing it.
async function handleAdminValidatedSearchListApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const presets = await queryAiGeneratedPresets({ source: "validated-search" });
    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      presets,
      running: isScanRunning(),
      scanInfo: activeScanInfo,
      lastScanResult,
      progress: readValidatedSearchProgress(),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

async function handleAdminValidatedSearchRunApi(req, res) {
  try {
    const admin = await requireAdminUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (isScanRunning()) {
      sendJson(res, 409, { error: "已有后台任务在运行中，请等它完成后再启动新的。", info: activeScanInfo });
      return;
    }
    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};

    let symbols, targetPercent, attemptsPerSymbol, maxAttempts, candidates, pointCount, trainYears, testYears, sessionStartedAt;
    if (payload.resume) {
      if (!lastScanResult || lastScanResult.jobType !== "validatedSearch" || lastScanResult.exitCode === 0) {
        sendJson(res, 400, { error: "没有可以继续的中断验证搜索（上一次不是异常退出）。" });
        return;
      }
      symbols = Array.isArray(lastScanResult.symbols) ? lastScanResult.symbols : [];
      targetPercent = lastScanResult.targetPercent || 50;
      attemptsPerSymbol = lastScanResult.attemptsPerSymbol || 60;
      maxAttempts = lastScanResult.maxAttempts || 400;
      candidates = lastScanResult.candidates || 400;
      pointCount = lastScanResult.pointCount || 5;
      trainYears = lastScanResult.trainYears || 4;
      testYears = lastScanResult.testYears || 2;
      sessionStartedAt = lastScanResult.sessionStartedAt;
    } else {
      const indexMappingId = String(payload.indexMappingId || "").trim();
      if (indexMappingId) {
        // "按指数搜索": resolve the index's CURRENT constituents ONCE at trigger time (not
        // re-resolved mid-run like 指数盯盘 — a validated-search run is a one-shot batch job,
        // not a persistent recurring watch, so there's no "membership might drift during this
        // run" concern worth re-checking for). A higher cap than the manual picker's 50 — the
        // whole point of index-triggered search is scanning a much bigger set (e.g. CSI300's
        // 300 stocks) than anyone would hand-pick.
        let resolved;
        try {
          resolved = await resolveIndexConstituents(dbPool, indexMappingId);
        } catch (error) {
          sendJson(res, 400, { error: error.message || "无法获取该指数的成分股列表。" });
          return;
        }
        symbols = resolved.rows.map((row) => String(row.code || "").trim().toUpperCase()).filter(Boolean).slice(0, 350);
      } else {
        symbols = Array.isArray(payload.symbols)
          ? payload.symbols.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean).slice(0, 50)
          : [];
      }
      if (symbols.length === 0) {
        sendJson(res, 400, { error: "请至少选择一支股票，或者选一个指数（这个功能不支持全市场扫描）。" });
        return;
      }
      targetPercent = Math.max(1, Math.min(500, Math.round(Number(payload.targetPercent)) || 50));
      attemptsPerSymbol = Math.max(1, Math.min(200, Math.round(Number(payload.attemptsPerSymbol)) || 60));
      maxAttempts = Math.max(1, Math.min(2000, Math.round(Number(payload.maxAttempts)) || 400));
      candidates = Math.max(1, Math.min(2000, Math.round(Number(payload.candidates)) || 400));
      pointCount = Math.max(3, Math.min(10, Math.round(Number(payload.pointCount)) || 5));
      trainYears = Math.max(1, Math.min(10, Math.round(Number(payload.trainYears)) || 4));
      testYears = Math.max(1, Math.min(5, Math.round(Number(payload.testYears)) || 2));
      sessionStartedAt = new Date().toISOString();

      // A fresh (non-resume) trigger means "search these symbols again", not "pick up where
      // the last run left off" — clear out prior non-qualifying candidates for these symbols
      // so the admin doesn't see a stale mix of this-run and previous-run attempts. Rows that
      // already reached the target are left alone — they're validated results, not
      // in-progress search state.
      await dbQuery(
        `DELETE FROM optimization_scan_results WHERE source = 'validated-search' AND symbol = ANY($1) AND reached_target = FALSE`,
        [symbols]
      );
      lastScanResult = null;
      writeScanSessionState({ status: "idle", result: null });
    }

    // Per the standing rule established for validated/found models this session: they default
    // to the admin's own account, never left ownerless — same as NET/GOOGL/TSM earlier.
    launchValidatedSearchProcess({
      symbols, targetPercent, attemptsPerSymbol, maxAttempts, candidates, pointCount, trainYears, testYears,
      sessionStartedAt, triggeredBy: admin.email, ownerUserId: userIdForEmail(admin.email), ownerEmail: admin.email,
    });
    sendJson(res, 200, { started: true, symbols, targetPercent, attemptsPerSymbol, maxAttempts, candidates, pointCount, trainYears, testYears, sessionStartedAt, resumed: Boolean(payload.resume) });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "启动验证搜索失败。" });
  }
}

// Same "kill = pause, replay same args = resume" pattern as handleAdminOptimizationScanPauseApi
// — killing activeScanProcess makes launchBackgroundJob's own exit handler treat this exactly
// like a crash, persisting lastScanResult (with source symbols/params intact via `extra`) for
// the resume branch above to replay. No new state-tracking needed.
async function handleAdminValidatedSearchPauseApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!isScanRunning() || !activeScanInfo || activeScanInfo.jobType !== "validatedSearch") {
      sendJson(res, 400, { error: "当前没有正在运行的验证搜索，无法暂停。" });
      return;
    }
    activeScanProcess.kill();
    sendJson(res, 200, { paused: true });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "暂停验证搜索失败。" });
  }
}

async function handleAdminAutoGenerateRunApi(req, res) {
  try {
    const admin = await requireAdminUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (isScanRunning()) {
      sendJson(res, 409, { error: "已有后台任务在运行中，请等它完成后再启动新的。", info: activeScanInfo });
      return;
    }

    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};
    const symbols = Array.isArray(payload.symbols)
      ? payload.symbols.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean).slice(0, 50)
      : [];
    const limit = Math.max(0, Math.min(500, Math.round(Number(payload.limit)) || 0));
    const attemptsPerSymbol = Math.max(1, Math.min(90, Math.round(Number(payload.attemptsPerSymbol)) || 10));
    const maxAttempts = Math.max(1, Math.min(200, Math.round(Number(payload.maxAttempts)) || 20));
    const pointCount = Math.max(3, Math.min(10, Math.round(Number(payload.pointCount)) || 5));
    const trainYears = Math.max(1, Math.min(10, Math.round(Number(payload.trainYears)) || 4));
    const testYears = Math.max(1, Math.min(5, Math.round(Number(payload.testYears)) || 2));
    const sessionStartedAt = new Date().toISOString();

    launchAutoGenerateProcess({
      symbols, limit, attemptsPerSymbol, maxAttempts, pointCount, trainYears, testYears, sessionStartedAt,
      triggeredBy: admin.email,
      ownerUserId: userIdForEmail(admin.email),
      ownerEmail: admin.email,
    });
    sendJson(res, 200, { started: true, symbols, limit, attemptsPerSymbol, maxAttempts, pointCount, trainYears, testYears, sessionStartedAt });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "启动自动生成失败。" });
  }
}

function mapStockScreenRunRow(row) {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    presetId: row.preset_id,
    presetLabel: row.preset_label,
    market: row.market,
    status: row.status,
    totalSymbols: row.total_symbols,
    scannedSymbols: row.scanned_symbols,
    matchCount: row.match_count,
    matches: Array.isArray(row.matches) ? row.matches : [],
    presetConfigSnapshot: row.preset_config_snapshot && typeof row.preset_config_snapshot === "object" ? row.preset_config_snapshot : {},
    error: row.error || "",
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : "",
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : "",
  };
}

// Main-interface (non-admin) "选股" feature: any logged-in user picks a saved model + a
// market, and the server batch-scans that market's whole symbols.json universe looking for
// stocks whose most recent trading day triggered a buy/sell signal under that model. Reuses
// the SAME global isScanRunning() lock as the admin batch jobs (scan/validation/autoGenerate)
// rather than a separate lock — this app already learned the hard way that concurrent
// background batch jobs cause real problems, so every batch job shares one system-wide slot.
async function handleStockScreenRunApi(req, res) {
  try {
    const user = await requireCurrentUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (isScanRunning()) {
      sendJson(res, 409, { error: "系统正在处理其他后台任务，请稍后再试。" });
      return;
    }

    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};
    const presetId = String(payload.presetId || "").trim();
    const market = String(payload.market || "").trim().toUpperCase();
    if (!presetId) {
      sendJson(res, 400, { error: "请选择一个模型。" });
      return;
    }
    if (market !== "CN" && market !== "US") {
      sendJson(res, 400, { error: "请选择 A股 或 美股。" });
      return;
    }

    const ownerUserId = userIdForEmail(user.email);
    const presetResult = await dbQuery(`
      SELECT id, label, owner_user_id FROM strategy_presets WHERE id = $1
    `, [presetId]);
    if (presetResult.rows.length === 0) {
      sendJson(res, 404, { error: "模型不存在。" });
      return;
    }
    const presetRow = presetResult.rows[0];
    if (presetRow.owner_user_id && presetRow.owner_user_id !== ownerUserId) {
      sendJson(res, 403, { error: "无权使用该模型。" });
      return;
    }

    const runId = randomId("screen");
    const sessionStartedAt = new Date().toISOString();
    await dbQuery(`
      INSERT INTO stock_screen_runs (id, owner_user_id, owner_email, preset_id, preset_label, market, status, started_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'running', $7)
    `, [runId, ownerUserId, user.email, presetId, presetRow.label, market, sessionStartedAt]);

    launchStockScreenProcess({ runId, presetId, market, ownerUserId, sessionStartedAt, triggeredBy: user.email });
    sendJson(res, 200, { started: true, runId, presetId, market, sessionStartedAt });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "启动选股扫描失败。" });
  }
}

async function handleStockScreenApi(req, res) {
  try {
    const user = await requireCurrentUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const ownerUserId = userIdForEmail(user.email);
    const result = await dbQuery(`
      SELECT * FROM stock_screen_runs WHERE owner_user_id = $1 ORDER BY started_at DESC LIMIT 20
    `, [ownerUserId]);
    sendJson(res, 200, {
      runs: result.rows.map(mapStockScreenRunRow),
      systemBusy: isScanRunning(),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "读取选股结果失败。" });
  }
}

async function handleAdminStockScreenApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const result = await dbQuery(`
      SELECT * FROM stock_screen_runs ORDER BY started_at DESC LIMIT 100
    `);
    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      runs: result.rows.map(mapStockScreenRunRow),
      systemBusy: isScanRunning(),
      scanInfo: activeScanInfo,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

function mapWatchAlertRow(row) {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    presetId: row.preset_id,
    presetNumericId: row.preset_numeric_id !== null && row.preset_numeric_id !== undefined ? Number(row.preset_numeric_id) : null,
    // Prefer the model's CURRENT label (live-joined from strategy_presets) over the snapshot
    // taken when the watch was created — the underlying model can get re-saved with a new
    // label later (e.g. a re-run of search-validated-best.js updating its annualized-return
    // figure), and the watch list should reflect that, not a stale name frozen at creation
    // time. Falls back to the stored snapshot only if the preset itself was deleted (JOIN
    // finds nothing) so the watch doesn't show a blank name.
    presetLabel: row.preset_current_label || row.preset_label,
    // Full config/strategyType (when the JOIN resolves — absent right after a fresh POST
    // create, which doesn't go through the JOIN) lets the client build a 只读 preset view for
    // the unified "model action" popup (查看参数/查看历史交易记录/另存/重新加载模拟) without a
    // dedicated single-preset lookup endpoint.
    presetConfig: row.preset_config && typeof row.preset_config === "object" ? row.preset_config : null,
    presetStrategyType: row.preset_strategy_type || "",
    presetOwnerUserId: row.preset_owner_user_id || null,
    symbol: row.symbol,
    symbolName: row.symbol_name,
    indexCode: row.index_code || null,
    indexName: row.index_name || "",
    market: row.market,
    frequencyMinutes: row.frequency_minutes,
    enabled: row.enabled,
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at).toISOString() : "",
    lastSignalDate: row.last_signal_date ? new Date(row.last_signal_date).toISOString().slice(0, 10) : "",
    lastSignalAction: row.last_signal_action || "",
    lastSignalReason: row.last_signal_reason || "",
    lastNotifiedAt: row.last_notified_at ? new Date(row.last_notified_at).toISOString() : "",
    consecutiveFailures: row.consecutive_failures || 0,
    lastError: row.last_error || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : "",
    accountCash: row.account_cash !== null && row.account_cash !== undefined ? Number(row.account_cash) : null,
    accountShares: row.account_shares !== null && row.account_shares !== undefined ? Number(row.account_shares) : null,
    accountEquity: row.account_equity !== null && row.account_equity !== undefined ? Number(row.account_equity) : null,
    accountPositionRatio: row.account_position_ratio !== null && row.account_position_ratio !== undefined ? Number(row.account_position_ratio) : null,
    accountReturnRate: row.account_return_rate !== null && row.account_return_rate !== undefined ? Number(row.account_return_rate) : null,
    accountAnnualizedReturn: row.account_annualized_return !== null && row.account_annualized_return !== undefined ? Number(row.account_annualized_return) : null,
    accountMaxDrawdown: row.account_max_drawdown !== null && row.account_max_drawdown !== undefined ? Number(row.account_max_drawdown) : null,
    accountRowsScored: row.account_rows_scored || 0,
    accountTrades: Array.isArray(row.account_trades) ? row.account_trades : [],
    accountUpdatedAt: row.account_updated_at ? new Date(row.account_updated_at).toISOString() : "",
  };
}

const WATCH_ALERT_FREQUENCY_OPTIONS = new Set([30, 60, 240, 1440]);

// The list of indices a "指数盯盘" watch can target now lives in the index_catalog DB table
// (scripts/shared/index-catalog.js) instead of a hardcoded array here — see that file's
// header comment for why (queryable directly, single source of truth shared with
// run-watch-alerts.js's per-cycle constituent re-resolution).
async function handleWatchAlertIndexesApi(req, res) {
  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    await ensureDbReady();
    sendJson(res, 200, { indexes: await listIndexCatalog(dbPool) });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "读取指数列表失败。" });
  }
}

// "设置盯盘提醒": a user configures a persistent (model, stock, check-frequency) watch;
// scripts/universe/run-watch-alerts.js (host-cron driven, NOT this server's isScanRunning()
// batch-job lock — it's a lightweight per-watch check, not a full-universe scan) periodically
// re-checks whether that model's most recent trading day would trigger a buy/sell signal on
// that stock, flags it here, and emails the owner. This is the persistent-subscription
// counterpart to 选股's one-shot market-wide scan.
async function handleWatchAlertsApi(req, res) {
  try {
    if (req.method === "GET") {
      const user = await requireCurrentUser(req);
      const ownerUserId = userIdForEmail(user.email);
      const result = await dbQuery(`
        SELECT watch_alerts.*, sp.numeric_id AS preset_numeric_id, sp.label AS preset_current_label,
          sp.config AS preset_config, sp.strategy_type AS preset_strategy_type, sp.owner_user_id AS preset_owner_user_id
        FROM watch_alerts
        LEFT JOIN strategy_presets sp ON sp.id = watch_alerts.preset_id
        WHERE watch_alerts.owner_user_id = $1
        ORDER BY watch_alerts.created_at DESC
      `, [ownerUserId]);
      sendJson(res, 200, { watches: result.rows.map(mapWatchAlertRow) });
      return;
    }

    if (req.method === "POST") {
      const user = await requireVerifiedCurrentUser(req);
      const ownerUserId = userIdForEmail(user.email);
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};

      const presetId = String(payload.presetId || "").trim();
      const frequencyMinutes = Math.round(Number(payload.frequencyMinutes));
      const indexCode = String(payload.indexCode || "").trim();
      if (!presetId) {
        sendJson(res, 400, { error: "请选择一个模型。" });
        return;
      }
      if (!WATCH_ALERT_FREQUENCY_OPTIONS.has(frequencyMinutes)) {
        sendJson(res, 400, { error: "检查频率不合法。" });
        return;
      }

      const presetResult = await dbQuery(`
        SELECT id, label, owner_user_id FROM strategy_presets WHERE id = $1
      `, [presetId]);
      if (presetResult.rows.length === 0) {
        sendJson(res, 404, { error: "模型不存在。" });
        return;
      }
      const presetRow = presetResult.rows[0];
      if (presetRow.owner_user_id && presetRow.owner_user_id !== ownerUserId) {
        sendJson(res, 403, { error: "无权使用该模型。" });
        return;
      }

      if (indexCode) {
        // 指数盯盘: watches an entire index's constituent list instead of one symbol. The
        // payload field is still called indexCode for wire-format continuity, but the VALUE is
        // an index_catalog.mapping_id (e.g. "CSI300"), not a raw numeric index code — the
        // actual AKShare code lives in index_catalog and can change without touching watch rows.
        // scripts/universe/run-watch-alerts.js re-resolves the CURRENT membership every check
        // cycle rather than freezing it here.
        const indexMappingId = indexCode;
        let resolved;
        try {
          // Prove the index is actually resolvable right now, the same way a single-symbol
          // watch proves its stock code exists via a live kline fetch — not a cached assumption.
          resolved = await resolveIndexConstituents(dbPool, indexMappingId);
        } catch (error) {
          sendJson(res, 400, { error: error.message || "无法获取该指数的成分股列表，请稍后再试。" });
          return;
        }
        const indexEntry = resolved.entry;

        const id = randomId("watch");
        const result = await dbQuery(`
          INSERT INTO watch_alerts (id, owner_user_id, owner_email, preset_id, preset_label, index_code, index_name, market, frequency_minutes, enabled)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
          ON CONFLICT (owner_user_id, preset_id, index_code) WHERE index_code IS NOT NULL DO UPDATE SET
            preset_label = EXCLUDED.preset_label,
            index_name = EXCLUDED.index_name,
            frequency_minutes = EXCLUDED.frequency_minutes,
            enabled = TRUE,
            consecutive_failures = 0,
            last_error = '',
            updated_at = NOW()
          RETURNING *
        `, [id, ownerUserId, user.email, presetId, presetRow.label, indexMappingId, indexEntry.officialName, indexEntry.market, frequencyMinutes]);
        sendJson(res, 200, { watch: mapWatchAlertRow(result.rows[0]) });
        return;
      }

      const market = String(payload.market || "").trim().toUpperCase();
      if (market !== "CN" && market !== "US") {
        sendJson(res, 400, { error: "请选择 A股 或 美股。" });
        return;
      }
      let symbol;
      try {
        symbol = normalizeCode(payload.symbol);
      } catch (error) {
        sendJson(res, 400, { error: error.message });
        return;
      }

      // A watch can target ANY stock the user cares about, not just a known/curated list —
      // unlike the admin batch-scan symbol pickers, there's no "existing universe" to choose
      // from here. Existence is proven the same way the live app already proves it for any
      // manually-entered code: try to actually fetch recent klines. This also has the useful
      // side effect of seeding daily_prices for the symbol immediately via persistKlineData
      // inside fetchKlines, so the very next cron cycle already has data to check against.
      let symbolName = symbol;
      try {
        const end = new Date().toISOString().slice(0, 10);
        const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const klineResult = await fetchKlines({ code: symbol, start, end });
        symbolName = klineResult.name || symbol;
      } catch (error) {
        sendJson(res, 400, { error: "股票代码不存在或无法获取行情，请确认代码是否正确。" });
        return;
      }

      const id = randomId("watch");
      const result = await dbQuery(`
        INSERT INTO watch_alerts (id, owner_user_id, owner_email, preset_id, preset_label, symbol, symbol_name, market, frequency_minutes, enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
        ON CONFLICT (owner_user_id, preset_id, symbol, market) DO UPDATE SET
          preset_label = EXCLUDED.preset_label,
          symbol_name = EXCLUDED.symbol_name,
          frequency_minutes = EXCLUDED.frequency_minutes,
          enabled = TRUE,
          consecutive_failures = 0,
          last_error = '',
          updated_at = NOW()
        RETURNING *
      `, [id, ownerUserId, user.email, presetId, presetRow.label, symbol, symbolName, market, frequencyMinutes]);
      sendJson(res, 200, { watch: mapWatchAlertRow(result.rows[0]) });
      return;
    }

    if (req.method === "PATCH") {
      const user = await requireCurrentUser(req);
      const ownerUserId = userIdForEmail(user.email);
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const id = String(payload.id || "").trim();
      if (!id) {
        sendJson(res, 400, { error: "缺少盯盘提醒 id。" });
        return;
      }
      const enabled = typeof payload.enabled === "boolean" ? payload.enabled : null;
      const frequencyMinutes = payload.frequencyMinutes !== undefined
        ? Math.round(Number(payload.frequencyMinutes))
        : null;
      if (frequencyMinutes !== null && !WATCH_ALERT_FREQUENCY_OPTIONS.has(frequencyMinutes)) {
        sendJson(res, 400, { error: "检查频率不合法。" });
        return;
      }
      const result = await dbQuery(`
        UPDATE watch_alerts SET
          enabled = COALESCE($3, enabled),
          frequency_minutes = COALESCE($4, frequency_minutes),
          consecutive_failures = CASE WHEN $3 = TRUE THEN 0 ELSE consecutive_failures END,
          updated_at = NOW()
        WHERE id = $1 AND owner_user_id = $2
        RETURNING *
      `, [id, ownerUserId, enabled, frequencyMinutes]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "盯盘提醒不存在，或者你不是它的 owner。" });
        return;
      }
      sendJson(res, 200, { watch: mapWatchAlertRow(result.rows[0]) });
      return;
    }

    if (req.method === "DELETE") {
      const user = await requireCurrentUser(req);
      const ownerUserId = userIdForEmail(user.email);
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const id = String(payload.id || "").trim();
      const result = await dbQuery(`
        DELETE FROM watch_alerts WHERE id = $1 AND owner_user_id = $2 RETURNING id
      `, [id, ownerUserId]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "盯盘提醒不存在，或者你不是它的 owner。" });
        return;
      }
      sendJson(res, 200, { deleted: result.rows[0] });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "盯盘提醒操作失败。" });
  }
}

async function handleAdminWatchAlertsApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const result = await dbQuery(`
      SELECT watch_alerts.*, sp.numeric_id AS preset_numeric_id, sp.label AS preset_current_label,
          sp.config AS preset_config, sp.strategy_type AS preset_strategy_type, sp.owner_user_id AS preset_owner_user_id
      FROM watch_alerts
      LEFT JOIN strategy_presets sp ON sp.id = watch_alerts.preset_id
      ORDER BY watch_alerts.updated_at DESC
      LIMIT 500
    `);
    sendJson(res, 200, { adminEmail: ADMIN_EMAIL, watches: result.rows.map(mapWatchAlertRow) });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

// Aggregates universe_validation_results per candidate (preset_id + origin symbol/market)
// with the profit threshold applied at query time, so the admin can freely change "what
// counts as profitable" without ever re-running the (expensive) validation batch job.
async function handleUniverseValidationApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const hasTable = await dbQuery(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'universe_validation_results'
    `);
    if (hasTable.rows.length === 0) {
      sendJson(res, 200, {
        adminEmail: ADMIN_EMAIL,
        candidates: [],
        validationRunning: isScanRunning(),
        scanInfo: activeScanInfo,
        lastScanResult,
      });
      return;
    }

    const requestUrl = new URL(req.url, "http://localhost");
    const threshold = Number(requestUrl.searchParams.get("threshold"));
    const effectiveThreshold = Number.isFinite(threshold) ? threshold : 100;

    const result = await dbQuery(`
      SELECT
        uv.source_scan_result_id, uv.preset_id, uv.preset_label, uv.origin_symbol, uv.origin_market,
        osr.best_config, osr.symbol_name AS origin_symbol_name, osr.strategy_type,
        sp.numeric_id AS preset_numeric_id,
        COUNT(*) AS tested_count,
        COUNT(*) FILTER (WHERE uv.return_rate >= $1) AS passing_count,
        MIN(uv.return_rate) AS worst_return_rate,
        BOOL_AND(uv.return_rate >= $1) AS all_passed,
        MAX(uv.validated_at) AS validated_at
      FROM universe_validation_results uv
      JOIN optimization_scan_results osr ON osr.id = uv.source_scan_result_id
      LEFT JOIN strategy_presets sp ON sp.id = uv.preset_id
      GROUP BY uv.source_scan_result_id, uv.preset_id, uv.preset_label, uv.origin_symbol, uv.origin_market,
               osr.best_config, osr.symbol_name, osr.strategy_type, sp.numeric_id
      ORDER BY (COUNT(*) FILTER (WHERE uv.return_rate >= $1))::float / NULLIF(COUNT(*), 0) DESC, worst_return_rate DESC
    `, [effectiveThreshold]);

    const candidates = result.rows.map((row) => {
      const testedCount = Number(row.tested_count) || 0;
      const passingCount = Number(row.passing_count) || 0;
      return {
        sourceScanResultId: row.source_scan_result_id,
        presetId: row.preset_id,
        presetNumericId: row.preset_numeric_id !== null && row.preset_numeric_id !== undefined ? Number(row.preset_numeric_id) : null,
        presetLabel: row.preset_label,
        originSymbol: row.origin_symbol,
        originMarket: row.origin_market,
        originSymbolName: row.origin_symbol_name || "",
        strategyType: row.strategy_type || "wave",
        bestConfig: row.best_config && typeof row.best_config === "object" ? row.best_config : {},
        testedCount,
        passingCount,
        passRate: testedCount > 0 ? passingCount / testedCount : 0,
        worstReturnRate: Number(row.worst_return_rate) || 0,
        allPassed: Boolean(row.all_passed),
        validatedAt: row.validated_at ? new Date(row.validated_at).toISOString() : "",
      };
    });

    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      threshold: effectiveThreshold,
      candidates,
      validationRunning: isScanRunning(),
      scanInfo: activeScanInfo,
      lastScanResult,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "管理员操作失败。" });
  }
}

async function handleUniverseValidationRunApi(req, res) {
  try {
    const admin = await requireAdminUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (isScanRunning()) {
      sendJson(res, 409, { error: "已有后台任务在运行中，请等它完成后再启动新的。", info: activeScanInfo });
      return;
    }

    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};
    const buyHoldMax = Number.isFinite(Number(payload.buyHoldMax)) ? Number(payload.buyHoldMax) : 50;
    const bestReturnMin = Number.isFinite(Number(payload.bestReturnMin)) ? Number(payload.bestReturnMin) : 100;
    const rescan = Boolean(payload.rescan);
    const sessionStartedAt = new Date().toISOString();

    launchUniverseValidationProcess({ buyHoldMax, bestReturnMin, rescan, sessionStartedAt, triggeredBy: admin.email });
    sendJson(res, 200, { started: true, buyHoldMax, bestReturnMin, rescan, sessionStartedAt });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "启动验证失败。" });
  }
}

// Recursively collects every numeric leaf in a (possibly nested, array-containing) config
// object into flat "path" -> value entries, e.g. buyRules[0].drop, maRsiBandRule.fastMa.
// Strategy-type-agnostic on purpose: works the same for wave's rule arrays, ma-rsi-band's
// flat rule object, block-rules' nested condition/action shape, etc. — no per-type
// awareness needed, since every candidate for a given preset_id already shares the same
// structural shape (best_config is always cloned from that one preset's own rule count).
const PARAM_STATS_EXCLUDED_FIELDS = new Set(["initialCash", "tradeFee"]);
function flattenNumericLeaves(value, prefix, out) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenNumericLeaves(item, `${prefix}[${index}]`, out));
    return;
  }
  if (typeof value === "object") {
    Object.keys(value).forEach((key) => {
      if (!prefix && PARAM_STATS_EXCLUDED_FIELDS.has(key)) return;
      flattenNumericLeaves(value[key], prefix ? `${prefix}.${key}` : key, out);
    });
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!out[prefix]) out[prefix] = [];
    out[prefix].push(value);
  }
}

function computeParamStats(values) {
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const cv = mean !== 0 ? Math.abs(stddev / mean) : null;
  return {
    sampleSize: n,
    mean,
    median,
    min: sorted[0],
    max: sorted[n - 1],
    stddev,
    cv,
  };
}

// Statistically summarizes how consistent the optimized parameters are across every
// validated candidate of one model (preset_id) — a tightly clustered parameter (low
// coefficient of variation) across many independently-optimized stocks suggests a real
// "sweet spot" for that model, not per-stock overfitting.
async function handleUniverseValidationParamStatsApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const requestUrl = new URL(req.url, "http://localhost");
    const presetId = String(requestUrl.searchParams.get("presetId") || "").trim();
    if (!presetId) {
      sendJson(res, 400, { error: "缺少 presetId。" });
      return;
    }

    const result = await dbQuery(`
      SELECT DISTINCT osr.id, osr.symbol, osr.symbol_name, osr.best_config, osr.preset_label
      FROM optimization_scan_results osr
      WHERE osr.preset_id = $1
        AND osr.id IN (SELECT DISTINCT source_scan_result_id FROM universe_validation_results)
    `, [presetId]);

    if (result.rows.length === 0) {
      sendJson(res, 200, { adminEmail: ADMIN_EMAIL, presetId, presetLabel: "", sampleCount: 0, params: [] });
      return;
    }

    const valuesByPath = {};
    result.rows.forEach((row) => {
      const config = row.best_config && typeof row.best_config === "object" ? row.best_config : {};
      flattenNumericLeaves(config, "", valuesByPath);
    });

    const params = Object.keys(valuesByPath)
      .map((path) => ({ path, ...computeParamStats(valuesByPath[path]) }))
      .sort((a, b) => {
        const cvA = a.cv === null ? Infinity : a.cv;
        const cvB = b.cv === null ? Infinity : b.cv;
        return cvA - cvB;
      });

    sendJson(res, 200, {
      adminEmail: ADMIN_EMAIL,
      presetId,
      presetLabel: result.rows[0].preset_label,
      sampleCount: result.rows.length,
      params,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "统计参数规律失败。" });
  }
}

async function handleRankingsApi(req, res) {
  try {
    if (req.method === "GET") {
      const user = await getCurrentUser(req);
      const publicRecords = await readPublicRankingRecords();
      if (!user) {
        sendJson(res, 200, { authenticated: false, records: [], publicRecords });
        return;
      }
      sendJson(res, 200, {
        authenticated: true,
        user,
        records: await readOwnRankingRecords(userIdForEmail(user.email)),
        publicRecords,
      });
      return;
    }

    if (req.method === "PATCH") {
      const user = await requireVerifiedCurrentUser(req);
      const userId = userIdForEmail(user.email);
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const key = String(payload.key || "").trim();
      if (!key) {
        sendJson(res, 400, { error: "缺少排行记录 key。" });
        return;
      }
      const hidden = Boolean(payload.hidden);
      const result = await dbQuery(`
        UPDATE ranking_records
        SET hidden_at = ${hidden ? "NOW()" : "NULL"}
        WHERE key = $1 AND owner_user_id = $2
        RETURNING key
      `, [key, userId]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "排行记录不存在，或者你不是这个记录的 owner。" });
        return;
      }
      sendJson(res, 200, { updated: result.rows[0], hidden });
      return;
    }

    if (req.method === "DELETE") {
      const user = await requireVerifiedCurrentUser(req);
      const userId = userIdForEmail(user.email);
      const body = await readRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const key = String(payload.key || "").trim();
      if (!key) {
        sendJson(res, 400, { error: "缺少排行记录 key。" });
        return;
      }
      const result = await dbQuery(`
        DELETE FROM ranking_records
        WHERE key = $1 AND owner_user_id = $2
        RETURNING key
      `, [key, userId]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "排行记录不存在，或者你不是这个记录的 owner。" });
        return;
      }
      sendJson(res, 200, { deleted: result.rows[0] });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const user = await requireVerifiedCurrentUser(req);
    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};
    const incoming = Array.isArray(payload.records) ? payload.records : [];
    const savePublic = Boolean(payload.public);
    const ownerUserId = savePublic ? null : userIdForEmail(user.email);
    for (const record of incoming) {
      await upsertRankingRecord(record, ownerUserId);
    }
    const records = await readOwnRankingRecords(userIdForEmail(user.email));
    const publicRecords = await readPublicRankingRecords();
    sendJson(res, 200, { authenticated: true, user, records, publicRecords, saved: incoming.length });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "排行记录保存失败。" });
  }
}

function sanitizeBacktestPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("回测记录格式无效。");
  }
  const symbol = String(payload.symbol || "").trim().toUpperCase().slice(0, 16);
  if (!symbol) throw new Error("回测记录缺少股票代码。");
  const results = Array.isArray(payload.results) ? payload.results.slice(0, 50) : [];
  if (results.length === 0) throw new Error("回测记录缺少模型结果。");
  return {
    symbol,
    symbolName: String(payload.symbolName || symbol).slice(0, 100),
    market: String(payload.market || "").slice(0, 20),
    startDate: toIsoDate(payload.startDate),
    endDate: toIsoDate(payload.endDate),
    rangeLabel: String(payload.rangeLabel || "").slice(0, 120),
    initialCash: toFiniteNumber(payload.initialCash),
    tradeFee: toFiniteNumber(payload.tradeFee),
    config: payload.config && typeof payload.config === "object" ? payload.config : {},
    summary: payload.summary && typeof payload.summary === "object" ? payload.summary : {},
    results,
  };
}

async function handleBacktestsApi(req, res) {
  try {
    if (req.method === "GET") {
      const user = await requireCurrentUser(req);
      const result = await dbQuery(`
        SELECT id, symbol, symbol_name, market, start_date, end_date, range_label,
               initial_cash, trade_fee, summary, created_at
        FROM backtest_runs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `, [userIdForEmail(user.email)]);
      sendJson(res, 200, {
        runs: result.rows.map((row) => ({
          id: row.id,
          symbol: row.symbol,
          symbolName: row.symbol_name,
          market: row.market,
          startDate: row.start_date ? new Date(row.start_date).toISOString().slice(0, 10) : "",
          endDate: row.end_date ? new Date(row.end_date).toISOString().slice(0, 10) : "",
          rangeLabel: row.range_label,
          initialCash: row.initial_cash,
          tradeFee: row.trade_fee,
          summary: row.summary || {},
          createdAt: row.created_at,
        })),
      });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const user = await requireVerifiedCurrentUser(req);
    const body = await readRequestBody(req, 8 * 1024 * 1024);
    const payload = sanitizeBacktestPayload(body ? JSON.parse(body) : {});
    const client = await dbPool.connect();
    const runId = randomId("run");

    try {
      await client.query("BEGIN");
      await client.query(`
        INSERT INTO backtest_runs (
          id, user_id, symbol, symbol_name, market, start_date, end_date,
          range_label, initial_cash, trade_fee, config, summary, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11::jsonb, $12::jsonb, NOW())
      `, [
        runId,
        userIdForEmail(user.email),
        payload.symbol,
        payload.symbolName,
        payload.market,
        payload.startDate,
        payload.endDate,
        payload.rangeLabel,
        payload.initialCash,
        payload.tradeFee,
        JSON.stringify(payload.config),
        JSON.stringify(payload.summary),
      ]);

      for (let resultIndex = 0; resultIndex < payload.results.length; resultIndex += 1) {
        const item = payload.results[resultIndex] || {};
        const finalState = item.finalState || {};
        const buyHold = finalState.buyHold || {};
        const resultId = randomId("result");
        const trades = Array.isArray(item.trades) ? item.trades.slice(0, 2000) : [];
        await client.query(`
          INSERT INTO backtest_results (
            id, run_id, preset_name, preset_label, strategy_type, rank, final_equity,
            return_rate, max_drawdown, buy_hold_return_rate, buy_hold_max_drawdown,
            excess_return, drawdown_diff, total_fees, buy_hold_fees, trades_count, config
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
        `, [
          resultId,
          runId,
          String(item.name || "").slice(0, 80),
          String(item.label || item.name || "").slice(0, 120),
          String(item.strategyType || "wave").slice(0, 40),
          resultIndex + 1,
          toFiniteNumber(finalState.equity),
          toFiniteNumber(finalState.returnRate),
          toFiniteNumber(finalState.maxDrawdown),
          toFiniteNumber(buyHold.returnRate),
          toFiniteNumber(buyHold.maxDrawdown),
          toFiniteNumber(finalState.excessReturn),
          toFiniteNumber(finalState.drawdownDiff),
          toFiniteNumber(finalState.totalFees),
          toFiniteNumber(buyHold.totalFees),
          trades.length,
          JSON.stringify(item.config || {}),
        ]);

        for (let tradeIndex = 0; tradeIndex < trades.length; tradeIndex += 1) {
          const trade = trades[tradeIndex] || {};
          await client.query(`
            INSERT INTO backtest_trades (
              id, run_id, result_id, preset_name, trade_index, trade_date, side, label,
              price, shares, position_ratio, account_cash, account_equity, fee, reason, reference
            )
            VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
          `, [
            randomId("trade"),
            runId,
            resultId,
            String(item.name || "").slice(0, 80),
            tradeIndex,
            toIsoDate(trade.date),
            String(trade.side || "").slice(0, 20),
            String(trade.label || "").slice(0, 80),
            toFiniteNumber(trade.price),
            toFiniteNumber(trade.shares),
            toFiniteNumber(trade.positionRatio),
            toFiniteNumber(trade.accountCash),
            toFiniteNumber(trade.accountEquity),
            toFiniteNumber(trade.fee),
            String(trade.reason || "").slice(0, 1000),
            JSON.stringify(trade.reference || {}),
          ]);
        }
      }

      await client.query("COMMIT");
      sendJson(res, 200, { saved: true, runId, results: payload.results.length });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "回测记录保存失败。" });
  }
}

function normalizeCode(code) {
  const value = String(code || "").trim();
  if (/^\d{6}$/.test(value)) {
    return value;
  }
  const ticker = value.toUpperCase();
  if (/^[A-Z][A-Z0-9.-]{0,15}$/.test(ticker)) {
    return ticker;
  }
  throw new Error("股票代码必须是 6 位 A 股代码，或美股 ticker，例如 NET、QQQ、AMD。");
}

function isChinaCode(code) {
  return /^\d{6}$/.test(code);
}

function normalizeDate(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error(`${fieldName} 必须是 YYYY-MM-DD 格式。`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} 不是有效日期。`);
  }
  return String(value);
}

function toEastMoneyDate(date) {
  return date.replace(/-/g, "");
}

function inferMarket(code) {
  if (/^[569]/.test(code)) return "1";
  if (/^[0123]/.test(code)) return "0";
  if (/^[48]/.test(code)) return "0";
  return "1";
}

function getMarketName(code, market) {
  if (market === "US") return "US";
  if (/^[48]/.test(code)) return "北京证券交易所";
  if (market === "1") return "上海证券交易所";
  return "深圳证券交易所";
}

function parseEastMoneyKlineRow(row) {
  const parts = row.split(",");
  return {
    date: parts[0],
    open: Number(parts[1]),
    close: Number(parts[2]),
    high: Number(parts[3]),
    low: Number(parts[4]),
    volume: Number(parts[5]),
    amount: Number(parts[6]),
    amplitude: Number(parts[7]),
    changePercent: Number(parts[8]),
    change: Number(parts[9]),
    turnover: Number(parts[10]),
    pe: null,
    peTtm: null,
    pb: null,
  };
}

function isValidKlineRow(row) {
  return Number.isFinite(row.open)
    && Number.isFinite(row.close)
    && Number.isFinite(row.high)
    && Number.isFinite(row.low)
    && row.open > 0
    && row.close > 0
    && row.high > 0
    && row.low > 0;
}

function summarize(symbol, name, rows) {
  const highest = rows.reduce((best, item) => (item.high > best.high ? item : best), rows[0]);
  const lowest = rows.reduce((best, item) => (item.low < best.low ? item : best), rows[0]);
  const latest = rows[rows.length - 1];
  const peRows = rows.filter((row) => Number.isFinite(row.peTtm) && row.peTtm > 0);
  const volumeRows = rows.filter((row) => Number.isFinite(row.volume) && row.volume > 0);

  return {
    symbol,
    name,
    count: rows.length,
    startDate: rows[0].date,
    endDate: latest.date,
    highest: {
      date: highest.date,
      price: highest.high,
      close: highest.close,
    },
    lowest: {
      date: lowest.date,
      price: lowest.low,
      close: lowest.close,
    },
    latest: {
      date: latest.date,
      close: latest.close,
      changePercent: latest.changePercent,
      volume: latest.volume,
      amount: latest.amount,
      turnover: latest.turnover,
      peTtm: latest.peTtm,
      pe: latest.pe,
      pb: latest.pb,
    },
    indicators: {
      volume: {
        available: volumeRows.length > 0,
        count: volumeRows.length,
      },
      pe: {
        available: peRows.length > 0,
        count: peRows.length,
        latest: latest.peTtm,
      },
    },
  };
}

async function persistKlineData({ code, market, name, source, info, rows }) {
  try {
    await ensureDbReady();
    await dbPool.query(`
      INSERT INTO symbols (symbol, market, name, source, info, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      ON CONFLICT (symbol, market) DO UPDATE
        SET name = EXCLUDED.name,
            source = EXCLUDED.source,
            info = EXCLUDED.info,
            updated_at = NOW()
    `, [code, market, name || code, source || "", JSON.stringify(info || {})]);

    for (const row of rows || []) {
      const tradeDate = toIsoDate(row.date);
      if (!tradeDate || !isValidKlineRow(row)) continue;
      await dbPool.query(`
        INSERT INTO daily_prices (
          symbol, market, trade_date, open, high, low, close, volume, amount,
          amplitude, change_percent, change_value, turnover, source, updated_at
        )
        VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (symbol, market, trade_date) DO UPDATE
          SET open = EXCLUDED.open,
              high = EXCLUDED.high,
              low = EXCLUDED.low,
              close = EXCLUDED.close,
              volume = EXCLUDED.volume,
              amount = EXCLUDED.amount,
              amplitude = EXCLUDED.amplitude,
              change_percent = EXCLUDED.change_percent,
              change_value = EXCLUDED.change_value,
              turnover = EXCLUDED.turnover,
              source = EXCLUDED.source,
              updated_at = NOW()
      `, [
        code,
        market,
        tradeDate,
        row.open,
        row.high,
        row.low,
        row.close,
        Number(row.volume || 0),
        Number(row.amount || 0),
        Number(row.amplitude || 0),
        Number(row.changePercent || 0),
        Number(row.change || 0),
        Number(row.turnover || 0),
        source || "",
      ]);

      // BUG FIXED HERE (was silently corrupting real PE data): `Number.isFinite(Number(x))`
      // treats a genuinely-missing `null`/`undefined` value as finite, because `Number(null)`
      // is `0` — not `NaN` — so a row with no PE at all (pe/peTtm/pb all null, e.g. every US
      // row before fetchStoredUsValuations existed, or any date the daily HuggingFace PE
      // backfill hasn't reached yet) was treated as "has valuation data" and written as a
      // literal `0`, overwriting whatever correct PE value was already stored for that date.
      // toValidNumberOrNull (used elsewhere in this file for exactly this reason) correctly
      // distinguishes "no data" (stays null) from a genuine, meaningful 0/negative PE (kept,
      // per backfill_us_pe_from_huggingface.py's own convention for negative-EPS periods).
      const validPe = toValidNumberOrNull(row.pe);
      const validPeTtm = toValidNumberOrNull(row.peTtm);
      const validPb = toValidNumberOrNull(row.pb);
      if (validPe !== null || validPeTtm !== null || validPb !== null) {
        await dbPool.query(`
          INSERT INTO daily_valuations (symbol, market, trade_date, pe, pe_ttm, pb, source, updated_at)
          VALUES ($1, $2, $3::date, $4, $5, $6, $7, NOW())
          ON CONFLICT (symbol, market, trade_date) DO UPDATE
            SET pe = EXCLUDED.pe,
                pe_ttm = EXCLUDED.pe_ttm,
                pb = EXCLUDED.pb,
                source = EXCLUDED.source,
                updated_at = NOW()
        `, [code, market, tradeDate, validPe, validPeTtm, validPb, source || ""]);
      }
    }

    await dbPool.query(`
      INSERT INTO data_fetch_logs (id, symbol, market, start_date, end_date, source, status, row_count, message)
      VALUES ($1, $2, $3, $4::date, $5::date, $6, 'ok', $7, '')
    `, [
      randomId("fetch"),
      code,
      market,
      rows && rows[0] ? rows[0].date : null,
      rows && rows.length > 0 ? rows[rows.length - 1].date : null,
      source || "",
      rows ? rows.length : 0,
    ]);
  } catch (error) {
    console.warn(`Postgres market data save skipped for ${code}: ${error.message}`);
  }
}

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "http:" ? http : https;
    const req = client.get(url, { headers }, (response) => {
      let body = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`行情服务返回 HTTP ${response.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error("行情服务返回的数据不是有效 JSON。"));
        }
      });
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error("行情服务请求超时。"));
    });
    req.on("error", reject);
  });
}

async function getJsonWithRetry(urls, headers = {}, attempts = 1) {
  const candidates = Array.isArray(urls) ? urls : [urls];
  let lastError;

  for (const url of candidates) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await getJson(url, headers);
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
        }
      }
    }
  }

  throw lastError;
}

function toValidNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseAkshareValuationRows(payload, start, end) {
  const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  return rows
    .map((item) => ({
      date: parseDateOnly(item.date || item.trade_date),
      peTtm: toValidNumberOrNull(item.peTtm !== undefined ? item.peTtm : item.pe_ttm),
      pe: toValidNumberOrNull(item.pe),
      pb: toValidNumberOrNull(item.pb),
      close: toValidNumberOrNull(item.close),
      source: "AKShare",
    }))
    .filter((item) => item.date >= start && item.date <= end)
    .filter((item) => Number.isFinite(item.peTtm) || Number.isFinite(item.pe) || Number.isFinite(item.pb))
    .sort((a, b) => itemDateCompare(a.date, b.date));
}

async function fetchAkshareValuations({ code, start, end }) {
  try {
    const payload = await runAkshareBridge("valuations", { code, start, end });
    return parseAkshareValuationRows(payload, start, end);
  } catch (error) {
    console.warn(`AKShare PE fallback skipped for ${code}: ${error.message}`);
    return [];
  }
}

function parseAkshareKlineRows(payload) {
  const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  return rows
    .map((item) => ({
      date: parseDateOnly(item.date),
      open: Number(item.open),
      close: Number(item.close),
      high: Number(item.high),
      low: Number(item.low),
      volume: Number(item.volume || 0),
      amount: Number(item.amount || 0),
      amplitude: Number(item.amplitude || 0),
      changePercent: Number(item.changePercent || 0),
      change: Number(item.change || 0),
      turnover: Number(item.turnover || 0),
      pe: null,
      peTtm: null,
      pb: null,
    }))
    .filter(isValidKlineRow);
}

async function fetchAkshareKlines({ code, market, start, end }) {
  const payload = await runAkshareBridge("klines", { code, start, end });
  const rows = parseAkshareKlineRows(payload);

  if (rows.length === 0) {
    throw new Error("AKShare 没有返回可用日线数据。");
  }

  return {
    source: "AKShare",
    name: payload.name || code,
    info: {
      code,
      name: payload.name || code,
      market,
      marketName: getMarketName(code, market),
      exchangeName: getMarketName(code, market),
      currency: "CNY",
      instrumentType: payload.instrumentType || "EQUITY/FUND",
    },
    rows,
  };
}

function buildEastMoneyUrls({ code, market, start, end }) {
  return ["https:", "http:"].map((protocol) => {
    const url = new URL(`${protocol}//push2his.eastmoney.com/api/qt/stock/kline/get`);
    url.searchParams.set("secid", `${market}.${code}`);
    url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
    url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61");
    url.searchParams.set("ut", "7eea3edcaed734bea9cbfc24409ed989");
    url.searchParams.set("klt", "101");
    url.searchParams.set("fqt", "1");
    url.searchParams.set("beg", toEastMoneyDate(start));
    url.searchParams.set("end", toEastMoneyDate(end));
    url.searchParams.set("_", String(Date.now()));
    return url;
  });
}

function buildEastMoneyValuationUrls({ code }) {
  return ["https:", "http:"].map((protocol) => {
    const url = new URL(`${protocol}//datacenter-web.eastmoney.com/api/data/v1/get`);
    url.searchParams.set("reportName", "RPT_VALUEANALYSIS_DET");
    url.searchParams.set("columns", "SECURITY_CODE,TRADE_DATE,PE_TTM,PE_LAR,PB_MRQ,CLOSE_PRICE");
    url.searchParams.set("filter", `(SECURITY_CODE="${code}")`);
    url.searchParams.set("pageNumber", "1");
    url.searchParams.set("pageSize", "6000");
    url.searchParams.set("sortTypes", "1");
    url.searchParams.set("sortColumns", "TRADE_DATE");
    url.searchParams.set("source", "WEB");
    url.searchParams.set("client", "WEB");
    url.searchParams.set("_", String(Date.now()));
    return url;
  });
}

function parseDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function parseEastMoneyValuationRows(payload, start, end) {
  const data = payload && payload.result && Array.isArray(payload.result.data)
    ? payload.result.data
    : [];
  return data
    .map((item) => ({
      date: parseDateOnly(item.TRADE_DATE),
      peTtm: Number(item.PE_TTM),
      pe: Number(item.PE_LAR),
      pb: Number(item.PB_MRQ),
      close: Number(item.CLOSE_PRICE),
    }))
    .filter((item) => item.date >= start && item.date <= end)
    .filter((item) => Number.isFinite(item.peTtm) || Number.isFinite(item.pe) || Number.isFinite(item.pb))
    .sort((a, b) => itemDateCompare(a.date, b.date));
}

function itemDateCompare(a, b) {
  return String(a).localeCompare(String(b));
}

async function fetchEastMoneyValuations({ code, start, end }) {
  try {
    const payload = await getJsonWithRetry(buildEastMoneyValuationUrls({ code }), {
      "User-Agent": "Mozilla/5.0 A-share local dashboard",
      Referer: "https://data.eastmoney.com/gzfx/",
    });
    return parseEastMoneyValuationRows(payload, start, end);
  } catch (error) {
    return [];
  }
}

function hasPeValuations(valuations) {
  return Array.isArray(valuations)
    && valuations.some((item) => Number.isFinite(item.peTtm) && item.peTtm > 0);
}

function mergeValuationSources(primaryRows, fallbackRows) {
  if (!Array.isArray(fallbackRows) || fallbackRows.length === 0) {
    return Array.isArray(primaryRows) ? primaryRows : [];
  }
  if (!Array.isArray(primaryRows) || primaryRows.length === 0) {
    return fallbackRows;
  }

  const byDate = new Map(primaryRows.map((row) => [row.date, row]));
  fallbackRows.forEach((fallback) => {
    const current = byDate.get(fallback.date);
    if (!current) {
      byDate.set(fallback.date, fallback);
      return;
    }

    byDate.set(fallback.date, {
      ...current,
      peTtm: Number.isFinite(current.peTtm) && current.peTtm > 0 ? current.peTtm : fallback.peTtm,
      pe: Number.isFinite(current.pe) && current.pe > 0 ? current.pe : fallback.pe,
      pb: Number.isFinite(current.pb) && current.pb > 0 ? current.pb : fallback.pb,
    });
  });

  return Array.from(byDate.values()).sort((a, b) => itemDateCompare(a.date, b.date));
}

function mergeValuationsIntoRows(rows, valuations) {
  if (!Array.isArray(valuations) || valuations.length === 0) {
    return rows.map((row) => ({ ...row, pe: null, peTtm: null, pb: null }));
  }

  let valuationIndex = 0;
  let latestValuation = null;
  return rows.map((row) => {
    while (valuationIndex < valuations.length && valuations[valuationIndex].date <= row.date) {
      latestValuation = valuations[valuationIndex];
      valuationIndex += 1;
    }

    return {
      ...row,
      peTtm: latestValuation && Number.isFinite(latestValuation.peTtm) ? latestValuation.peTtm : null,
      pe: latestValuation && Number.isFinite(latestValuation.pe) ? latestValuation.pe : null,
      pb: latestValuation && Number.isFinite(latestValuation.pb) ? latestValuation.pb : null,
    };
  });
}

function toYahooSymbol(code, market) {
  if (market === "US") return code;
  if (market === "1") return `${code}.SS`;
  if (/^[48]/.test(code)) return `${code}.BJ`;
  return `${code}.SZ`;
}

function toUnixSeconds(date, isEnd = false) {
  const suffix = isEnd ? "T23:59:59Z" : "T00:00:00Z";
  return Math.floor(new Date(`${date}${suffix}`).getTime() / 1000);
}

function parseYahooRows(payload) {
  const result = payload && payload.chart && payload.chart.result && payload.chart.result[0];
  if (!result || !Array.isArray(result.timestamp)) return [];

  const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
  if (!quote) return [];

  return result.timestamp
    .map((timestamp, index) => {
      const row = {
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open: Number(quote.open[index]),
        close: Number(quote.close[index]),
        high: Number(quote.high[index]),
        low: Number(quote.low[index]),
        volume: Number(quote.volume[index] || 0),
        amount: 0,
        amplitude: 0,
        changePercent: 0,
        change: 0,
        turnover: 0,
        pe: null,
        peTtm: null,
        pb: null,
      };

      if (index > 0 && Number.isFinite(row.close)) {
        const previousClose = Number(quote.close[index - 1]);
        if (Number.isFinite(previousClose) && previousClose !== 0) {
          row.change = row.close - previousClose;
          row.changePercent = (row.change / previousClose) * 100;
        }
      }

      return row;
    })
    .filter(isValidKlineRow);
}

async function fetchEastMoneyKlines({ code, market, start, end }) {
  const payload = await getJsonWithRetry(buildEastMoneyUrls({ code, market, start, end }), {
    "User-Agent": "Mozilla/5.0 A-share local dashboard",
    Referer: "https://quote.eastmoney.com/",
  });

  const data = payload && payload.data;
  if (!data || !Array.isArray(data.klines) || data.klines.length === 0) {
    throw new Error("没有查到该代码在所选时间区间内的日线数据。");
  }

  const rows = data.klines.map(parseEastMoneyKlineRow).filter(isValidKlineRow);

  if (rows.length === 0) {
    throw new Error("行情数据格式异常，无法计算最高和最低点。");
  }

  return {
    source: "EastMoney",
    name: data.name || "",
    info: {
      code,
      name: data.name || "",
      market,
      marketName: getMarketName(code, market),
      exchangeName: getMarketName(code, market),
      currency: "CNY",
      instrumentType: "EQUITY/FUND",
    },
    rows,
  };
}

async function fetchYahooKlines({ code, market, start, end }) {
  const symbol = toYahooSymbol(code, market);
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
  url.searchParams.set("period1", String(toUnixSeconds(start)));
  url.searchParams.set("period2", String(toUnixSeconds(end, true)));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "history");

  const payload = await getJsonWithRetry(url, {
    "User-Agent": "Mozilla/5.0 A-share local dashboard",
  });

  const rows = parseYahooRows(payload);
  if (rows.length === 0) {
    throw new Error("备用行情源也没有返回可用日线数据。");
  }

  const result = payload.chart.result[0];
  const meta = result.meta || {};
  return {
    source: "Yahoo Finance",
    name: meta.longName || meta.shortName || symbol,
    info: {
      code,
      symbol,
      name: meta.longName || meta.shortName || symbol,
      market,
      marketName: "US",
      exchangeName: meta.fullExchangeName || meta.exchangeName || meta.exchange || "--",
      currency: meta.currency || "--",
      instrumentType: meta.instrumentType || "--",
      timezone: meta.timezone || meta.exchangeTimezoneName || "",
    },
    rows,
  };
}

// US market has no LIVE PE-fetch source (Yahoo's chart API — the only US kline source — has
// no valuation fields, and EastMoney/AKShare's PE endpoints only cover A股). PE for US symbols
// instead gets computed once a day straight into daily_valuations by
// scripts/backfill_us_pe_from_huggingface.py (see that script's header comment for why). Read
// it back out here so interactive 历史模拟 (which fetches through this same /api/klines path)
// sees the same PE data the batch scripts (run-auto-generate.js etc., which query
// daily_valuations directly via SQL) already had all along — without this, a pe-volume-type
// model always computed target=0 for every US symbol in the browser (getPeVolumeDecision
// treats missing PE as "no usable signal"), even though the identical model backtests and
// validates correctly server-side.
async function fetchStoredUsValuations({ code, market, start, end }) {
  try {
    const result = await dbQuery(`
      SELECT trade_date, pe, pe_ttm, pb
      FROM daily_valuations
      WHERE symbol = $1 AND market = $2 AND trade_date >= $3 AND trade_date <= $4
      ORDER BY trade_date ASC
    `, [code, market, start, end]);
    return result.rows.map((row) => ({
      date: new Date(row.trade_date).toISOString().slice(0, 10),
      peTtm: toValidNumberOrNull(row.pe_ttm),
      pe: toValidNumberOrNull(row.pe),
      pb: toValidNumberOrNull(row.pb),
      source: "stored",
    }));
  } catch (error) {
    return [];
  }
}

async function fetchKlines({ code, start, end }) {
  const market = isChinaCode(code) ? inferMarket(code) : "US";
  let result;

  if (market === "US") {
    result = await fetchYahooKlines({ code, market, start, end });
  } else {
    try {
      result = await fetchEastMoneyKlines({ code, market, start, end });
    } catch (eastMoneyError) {
      try {
        result = await fetchAkshareKlines({ code, market, start, end });
      } catch (akshareError) {
        result = await fetchYahooKlines({ code, market, start, end });
      }
    }
  }

  let valuationSource = "";
  let valuations = [];
  if (market !== "US") {
    const eastMoneyValuations = await fetchEastMoneyValuations({ code, start, end });
    let akshareValuations = [];

    if (!hasPeValuations(eastMoneyValuations)) {
      akshareValuations = await fetchAkshareValuations({ code, start, end });
    }

    valuations = mergeValuationSources(eastMoneyValuations, akshareValuations);
    if (hasPeValuations(akshareValuations)) {
      valuationSource = " + AKShare PE";
    } else if (hasPeValuations(eastMoneyValuations)) {
      valuationSource = " + EastMoney PE";
    }
  } else {
    const storedUsValuations = await fetchStoredUsValuations({ code, market, start, end });
    if (hasPeValuations(storedUsValuations)) {
      valuations = storedUsValuations;
      valuationSource = " + Hugging Face PE (cached)";
    }
  }
  const rows = mergeValuationsIntoRows(result.rows, valuations);
  const source = `${result.source}${valuationSource}`;
  const info = {
    code,
    name: result.name,
    market,
    marketName: getMarketName(code, market),
    source,
    ...(result.info || {}),
  };
  await persistKlineData({
    code,
    market,
    name: result.name,
    source,
    info,
    rows,
  });

  return {
    source,
    code,
    market,
    name: result.name,
    info,
    summary: summarize({ code, market, name: result.name }, result.name, rows),
    rows,
  };
}

const REVALIDATE_MIN_TRAIN_ROWS = 200;
const REVALIDATE_MIN_TEST_ROWS = 50;

// "重新验证": takes a model's EXISTING config exactly as-is (no re-optimization/AI search —
// just a fresh backtest + two-year-separate-validation), lets the user pick a different
// train/test window and target percent, and answers synchronously — a couple of backtests,
// no AI calls, so unlike the admin batch jobs this doesn't need the spawn/background-job/
// progress-polling machinery. Available to any signed-in user (not admin-gated), matching
// the other actions already reachable from the unified model-action popup.
async function handlePresetRevalidateApi(req, res) {
  try {
    await requireCurrentUser(req);
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const body = await readRequestBody(req);
    const payload = body ? JSON.parse(body) : {};

    const symbol = normalizeCode(payload.symbol);
    const strategyType = String(payload.strategyType || "wave");
    const rawConfig = payload.config && typeof payload.config === "object" ? payload.config : {};
    const trainYears = Math.max(1, Math.min(10, Math.round(Number(payload.trainYears)) || 4));
    const testYears = Math.max(1, Math.min(5, Math.round(Number(payload.testYears)) || 2));
    const targetPercent = Math.max(1, Math.min(500, Math.round(Number(payload.targetPercent)) || 50));

    await ensureDbReady();
    const market = isChinaCode(symbol) ? inferMarket(symbol) : "US";

    // Same staleness check as scripts/universe/ensure-fresh-data.js, just in-process — server.js
    // IS the /api/klines endpoint, so there's no need to hop out over HTTP the way a standalone
    // script has to.
    const freshnessResult = await dbPool.query(
      `SELECT MAX(trade_date) AS last_date FROM daily_prices WHERE symbol = $1 AND market = $2`,
      [symbol, market]
    );
    const lastDate = freshnessResult.rows[0] && freshnessResult.rows[0].last_date
      ? new Date(freshnessResult.rows[0].last_date).toISOString().slice(0, 10)
      : null;
    const today = new Date().toISOString().slice(0, 10);
    const daysSinceLast = lastDate ? Math.round((new Date(today) - new Date(lastDate)) / 86400000) : Infinity;
    if (daysSinceLast > 4) {
      const start = lastDate
        ? new Date(new Date(lastDate).getTime() - 3 * 86400000).toISOString().slice(0, 10)
        : new Date(new Date().setFullYear(new Date().getFullYear() - (trainYears + testYears))).toISOString().slice(0, 10);
      try {
        await fetchKlines({ code: symbol, start, end: today });
      } catch (error) {
        // Best-effort — if the live fetch fails, fall through and try with whatever's already
        // stored; the data-sufficiency check below will catch a genuinely unusable symbol.
      }
    }

    const allRows = await loadRowsForSymbol(dbPool, symbol, market);
    const { trainRows, trainStartDate, trainEndDate, testWindows } = splitTrainTestWindows(allRows, trainYears, testYears);
    const testWindowRowCounts = testWindows.map(
      (window) => allRows.filter((row) => row.date >= window.startDate && row.date < window.endDate).length
    );
    if (trainRows.length < REVALIDATE_MIN_TRAIN_ROWS || testWindowRowCounts.some((count) => count < REVALIDATE_MIN_TEST_ROWS)) {
      sendJson(res, 400, {
        error: `历史数据不足，无法重新验证（训练${trainRows.length}行/验证${testWindowRowCounts.join("+")}行，至少需要训练${REVALIDATE_MIN_TRAIN_ROWS}行、每个验证年${REVALIDATE_MIN_TEST_ROWS}行）。`,
      });
      return;
    }

    const initialCash = 2000000;
    const tradeFee = 5;
    const baseConfig = engine.buildConfigFromPresetObject(
      { ...rawConfig, strategyType },
      { initialCash, tradeFee, strategyType }
    );
    engine.setActiveLotSizeSymbol(symbol);

    const trainStates = engine.buildBacktestStates(trainRows, baseConfig);
    const trainLast = trainStates[trainStates.length - 1];
    const trainAnnualizedReturn = annualizedReturnRate(trainLast.returnRate, trainRows.length) || 0;

    const scoredYear1 = engine.buildScoredBacktestStates(allRows, baseConfig, testWindows[0].startDate, testWindows[0].endDate);
    const scoredYear2 = engine.buildScoredBacktestStates(allRows, baseConfig, testWindows[1].startDate, testWindows[1].endDate);
    const testYear1AnnualizedReturn = annualizedReturnRate(scoredYear1.returnRate, scoredYear1.rowsScored) || 0;
    const testYear2AnnualizedReturn = annualizedReturnRate(scoredYear2.returnRate, scoredYear2.rowsScored) || 0;
    const reachedTarget = testYear1AnnualizedReturn >= targetPercent && testYear2AnnualizedReturn >= targetPercent;

    sendJson(res, 200, {
      symbol,
      trainYears,
      testYears,
      targetPercent,
      trainStartDate,
      trainEndDate,
      trainAnnualizedReturn,
      testYear1: {
        startDate: testWindows[0].startDate,
        endDate: testWindows[0].endDate,
        annualizedReturn: testYear1AnnualizedReturn,
        returnRate: scoredYear1.returnRate,
        maxDrawdown: scoredYear1.maxDrawdown,
        trades: scoredYear1.trades.length,
      },
      testYear2: {
        startDate: testWindows[1].startDate,
        endDate: testWindows[1].endDate,
        annualizedReturn: testYear2AnnualizedReturn,
        returnRate: scoredYear2.returnRate,
        maxDrawdown: scoredYear2.maxDrawdown,
        trades: scoredYear2.trades.length,
      },
      reachedTarget,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "重新验证失败。" });
  }
}

async function handleApi(req, res, requestUrl) {
  try {
    const code = normalizeCode(requestUrl.searchParams.get("code") || "513100");
    const start = normalizeDate(requestUrl.searchParams.get("start"), "开始日期");
    const end = normalizeDate(requestUrl.searchParams.get("end"), "结束日期");

    if (new Date(start) > new Date(end)) {
      throw new Error("开始日期不能晚于结束日期。");
    }

    const result = await fetchKlines({ code, start, end });
    // Resolve (and, for a first-time anonymous visitor, cookie-set) the owner BEFORE sending
    // the response — Set-Cookie has to go out with these response headers, not after.
    const ownerKey = await resolveSymbolHistoryOwnerKey(req, res);
    recordSymbolQuery(ownerKey, code, result.name).catch(() => {});
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "请求失败。" });
  }
}

// Private, per-owner history — only the codes THIS visitor (logged-in account, or their
// anonymous browser cookie if not logged in) has queried, most-recent first. Powers the
// history-simulation "常用代码" dropdown.
async function handleSymbolHistoryApi(req, res) {
  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const ownerKey = await resolveSymbolHistoryOwnerKey(req, res);
    const result = await dbQuery(`
      SELECT code, description, last_used_at
      FROM symbol_query_history
      WHERE owner_key = $1
      ORDER BY last_used_at DESC
      LIMIT 200
    `, [ownerKey]);
    sendJson(res, 200, {
      symbols: result.rows.map((row) => ({
        code: row.code,
        description: row.description || "",
        updatedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : "",
      })),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "读取股票代码历史失败。" });
  }
}

// Admin-only, cross-owner view — every code ANY user or anonymous visitor has queried,
// deduped by code (keeping whichever owner queried it most recently), most-recent first.
// Admin needs visibility into the full pool of codes people have looked at (to pick a
// meaningfully diverse batch for "AI自动生成"), unlike the private per-owner view above.
async function handleAdminSymbolHistoryApi(req, res) {
  try {
    await requireAdminUser(req);
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    // LIMIT was 200 — fine when this was written, but this session alone pushed total
    // distinct queried codes past 550 (index-constituent backfills, batch validated-search
    // runs across 50-symbol indices, etc.), which silently dropped older-but-still-relevant
    // codes (e.g. TSM, queried a couple days ago) out of the admin symbol picker entirely,
    // even though they're exactly the kind of already-validated symbol an admin would want to
    // re-select. Raised generously — the client already does its own substring-search
    // filtering over whatever this returns, so a bigger list just means a more complete
    // picker, not a slower one.
    const result = await dbQuery(`
      SELECT code, description, last_used_at FROM (
        SELECT code, description, last_used_at,
          ROW_NUMBER() OVER (PARTITION BY code ORDER BY last_used_at DESC) AS rn
        FROM symbol_query_history
      ) t
      WHERE rn = 1
      ORDER BY last_used_at DESC
      LIMIT 3000
    `);
    sendJson(res, 200, {
      symbols: result.rows.map((row) => ({
        code: row.code,
        description: row.description || "",
        updatedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : "",
      })),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || "读取股票代码历史失败。" });
  }
}

function serveStatic(req, res, requestUrl) {
  const requestPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decoded = decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decoded));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception (server stays up):", error);
});
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection (server stays up):", error);
});

const server = http.createServer((req, res) => {
  let requestUrl;
  try {
    requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  if (requestUrl.pathname === "/api/klines") {
    handleApi(req, res, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/symbol-history") {
    handleSymbolHistoryApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/symbol-history") {
    handleAdminSymbolHistoryApi(req, res);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/auth/")) {
    handleAuthApi(req, res, requestUrl.pathname.replace("/api/auth/", ""));
    return;
  }

  if (requestUrl.pathname === "/api/presets") {
    handlePresetsApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/generate-model") {
    handleGenerateModelApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/presets") {
    handleAdminPresetsApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/rankings") {
    handleAdminRankingsApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/optimization-scan") {
    handleAdminOptimizationScanApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/optimization-scan-status") {
    handleAdminOptimizationScanStatusApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/optimization-scan/run") {
    handleAdminOptimizationScanRunApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/optimization-scan/pause") {
    handleAdminOptimizationScanPauseApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/auto-generate") {
    handleAdminAutoGenerateListApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/auto-generate/run") {
    handleAdminAutoGenerateRunApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/validated-search") {
    handleAdminValidatedSearchListApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/validated-search/run") {
    handleAdminValidatedSearchRunApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/validated-search/pause") {
    handleAdminValidatedSearchPauseApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/universe-validation") {
    handleUniverseValidationApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/universe-validation/run") {
    handleUniverseValidationRunApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/universe-validation/param-stats") {
    handleUniverseValidationParamStatsApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/rankings") {
    handleRankingsApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/backtests") {
    handleBacktestsApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/stock-screen") {
    handleStockScreenApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/stock-screen/run") {
    handleStockScreenRunApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/stock-screen") {
    handleAdminStockScreenApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/watch-alerts") {
    handleWatchAlertsApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/watch-alert-indexes") {
    handleWatchAlertIndexesApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/presets/revalidate") {
    handlePresetRevalidateApi(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/admin/watch-alerts") {
    handleAdminWatchAlertsApi(req, res);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "接口不存在或当前版本还没有发布该接口。" });
    return;
  }

  serveStatic(req, res, requestUrl);
});

ensureDbReady()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`A-share app running at http://localhost:${PORT}`);
      console.log(`Postgres connected: ${DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@")}`);
    });
  })
  .catch((error) => {
    console.error(`Postgres initialization failed: ${error.message}`);
    process.exit(1);
  });
