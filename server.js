const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const PRESETS_FILE = process.env.PRESETS_FILE || path.join(DATA_DIR, "custom-presets.json");
const RANKINGS_FILE = process.env.RANKINGS_FILE || path.join(DATA_DIR, "ranking-records.json");
const USERS_FILE = process.env.USERS_FILE || path.join(DATA_DIR, "users.json");
const AKSHARE_PYTHON = process.env.AKSHARE_PYTHON || "python3";
const AKSHARE_TIMEOUT_MS = Math.max(3000, Number(process.env.AKSHARE_TIMEOUT_MS || 18000));
const AKSHARE_BRIDGE = path.join(__dirname, "scripts", "akshare_bridge.py");
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ai_trade";
const DATABASE_SSL = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const EMAIL_FROM = process.env.EMAIL_FROM || "AI Trade <noreply@lesminis.ca>";
const APP_PUBLIC_URL = String(process.env.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
const ADMIN_EMAIL = "victor.gm.liu@gmail.com";
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

    CREATE UNIQUE INDEX IF NOT EXISTS strategy_presets_user_name_idx
      ON strategy_presets(owner_user_id, name)
      WHERE owner_user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS strategy_presets_legacy_name_idx
      ON strategy_presets(name)
      WHERE owner_user_id IS NULL;

    CREATE TABLE IF NOT EXISTS ranking_records (
      key TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      symbol TEXT NOT NULL,
      symbol_name TEXT NOT NULL,
      period_years INTEGER NOT NULL,
      period_label TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      preset_name TEXT NOT NULL,
      preset_label TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS symbols (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      info JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(symbol, market)
    );

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
  `);

  await migrateJsonStateToPostgres();
}

function jsonFileExists(filePath) {
  return filePath && fs.existsSync(filePath);
}

async function migrateJsonStateToPostgres() {
  if (jsonFileExists(USERS_FILE)) {
    const authStore = readAuthStore();
    for (const [email, user] of Object.entries(authStore.users || {})) {
      try {
        const normalizedEmail = normalizeEmail(email);
        const userId = userIdForEmail(normalizedEmail);
        await dbPool.query(`
          INSERT INTO users (id, email, salt, password_hash, created_at, updated_at)
          VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()), NOW())
          ON CONFLICT (email) DO UPDATE
            SET salt = EXCLUDED.salt,
                password_hash = EXCLUDED.password_hash,
                updated_at = NOW()
        `, [
          userId,
          normalizedEmail,
          user.salt || crypto.randomBytes(16).toString("hex"),
          user.passwordHash || user.password_hash || hashPassword(crypto.randomBytes(16).toString("hex"), user.salt || "imported"),
          user.createdAt || null,
        ]);
      } catch (error) {
        console.warn(`Skipping malformed user during Postgres migration: ${email}`);
      }
    }

    for (const [token, session] of Object.entries(authStore.sessions || {})) {
      try {
        if (!session || !session.email || !session.expiresAt || session.expiresAt <= Date.now()) continue;
        const email = normalizeEmail(session.email);
        await dbPool.query(`
          INSERT INTO sessions (token_hash, user_id, expires_at)
          SELECT $1, id, $2
          FROM users
          WHERE email = $3
          ON CONFLICT (token_hash) DO UPDATE
            SET expires_at = EXCLUDED.expires_at
        `, [sha256(token), new Date(session.expiresAt), email]);
      } catch (error) {
        console.warn("Skipping malformed session during Postgres migration.");
      }
    }
  }

  if (jsonFileExists(PRESETS_FILE)) {
    const store = readPresetStore();
    for (const [name, preset] of Object.entries(store.legacyPresets || {})) {
      await upsertPreset(null, name, preset, true);
    }

    for (const [email, value] of Object.entries(store.users || {})) {
      const normalizedEmail = normalizeEmail(email);
      const userId = userIdForEmail(normalizedEmail);
      await ensureImportedUser(normalizedEmail);
      for (const [name, preset] of Object.entries(value.presets || {})) {
        await upsertPreset(userId, name, preset, false);
      }
    }
  }

  if (jsonFileExists(RANKINGS_FILE)) {
    const records = readRankingRecords();
    for (const record of records) {
      await upsertRankingRecord(record, null);
    }
  }
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

function postJsonToResend(payload) {
  if (!RESEND_API_KEY) {
    const error = new Error("邮件服务还没有配置。");
    error.statusCode = 503;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request({
      method: "POST",
      hostname: "api.resend.com",
      path: "/emails",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 12000,
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(responseBody);
          return;
        }
        let detail = "";
        try {
          const payload = JSON.parse(responseBody);
          detail = payload && (payload.message || payload.error || payload.name)
            ? String(payload.message || payload.error || payload.name)
            : "";
        } catch (parseError) {
          detail = responseBody;
        }
        const suffix = detail ? `：${detail.slice(0, 300)}` : "";
        const error = new Error(`邮件服务返回 ${response.statusCode}${suffix}`);
        error.statusCode = 502;
        reject(error);
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("邮件服务请求超时。"));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

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
  const strategyType = ["wave", "local-high-ladder", "ma-rsi-band", "order-grid", "pe-volume"].includes(preset.strategyType)
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
      isLegacy: Boolean(meta.isLegacy),
    },
  };
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

async function upsertPreset(ownerUserId, name, preset, isLegacy = false) {
  const key = normalizePresetKey(name);
  const safePreset = sanitizeServerPreset(key, preset);
  if (!key || !safePreset) return;
  await dbPool.query(`
    INSERT INTO strategy_presets (
      id, owner_user_id, name, label, strategy_type, config, meta, original_text, model_text, is_legacy, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
      SET label = EXCLUDED.label,
          strategy_type = EXCLUDED.strategy_type,
          config = EXCLUDED.config,
          meta = EXCLUDED.meta,
          original_text = COALESCE(NULLIF(strategy_presets.original_text, ''), EXCLUDED.original_text),
          model_text = EXCLUDED.model_text,
          is_legacy = EXCLUDED.is_legacy,
          updated_at = NOW()
  `, [
    ownerUserId ? `preset_${ownerUserId}_${key}` : `preset_legacy_${key}`,
    ownerUserId,
    key,
    safePreset.label,
    safePreset.strategyType,
    JSON.stringify(safePreset),
    JSON.stringify(safePreset.meta || {}),
    safePreset.meta && safePreset.meta.originalText ? safePreset.meta.originalText : "",
    safePreset.meta && safePreset.meta.modelText ? safePreset.meta.modelText : "",
    Boolean(isLegacy),
  ]);
}

function presetRowsToMap(rows) {
  return rows.reduce((next, row) => {
    const preset = row.config && typeof row.config === "object" ? row.config : {};
    const rowMeta = row.meta && typeof row.meta === "object" ? row.meta : {};
    next[row.name] = sanitizeServerPreset(row.name, {
      ...preset,
      label: row.label,
      strategyType: row.strategy_type,
      meta: {
        ...rowMeta,
        ...(preset.meta || {}),
        originalText: row.original_text || rowMeta.originalText || (preset.meta && preset.meta.originalText) || "",
        modelText: row.model_text || rowMeta.modelText || (preset.meta && preset.meta.modelText) || row.original_text || "",
        ownerEmail: row.owner_email || rowMeta.ownerEmail || "",
        isOwner: Boolean(row.is_owner),
        isLegacy: Boolean(row.is_legacy),
      },
    });
    return next;
  }, {});
}

async function readUserPresets(email) {
  const legacyResult = await dbQuery(`
    SELECT name, label, strategy_type, config, meta, original_text, model_text, is_legacy, ''::text AS owner_email, FALSE AS is_owner
    FROM strategy_presets
    WHERE owner_user_id IS NULL
    ORDER BY updated_at DESC
  `);
  const userResult = await dbQuery(`
    SELECT strategy_presets.name, strategy_presets.label, strategy_presets.strategy_type, strategy_presets.config,
      strategy_presets.meta, strategy_presets.original_text, strategy_presets.model_text, strategy_presets.is_legacy,
      users.email AS owner_email, TRUE AS is_owner
    FROM strategy_presets
    JOIN users ON users.id = strategy_presets.owner_user_id
    WHERE users.email = $1
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
    SELECT name, label, strategy_type, config, meta, original_text, model_text, is_legacy, ''::text AS owner_email, FALSE AS is_owner
    FROM strategy_presets
    WHERE owner_user_id IS NULL
    ORDER BY updated_at DESC
  `);
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
    presetName,
    presetLabel: String(record.presetLabel || presetName).slice(0, 100),
    strategyType: ["wave", "local-high-ladder", "ma-rsi-band", "order-grid", "pe-volume"].includes(record.strategyType)
      ? record.strategyType
      : "wave",
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
  await dbPool.query(`
    INSERT INTO ranking_records (
      key, owner_user_id, symbol, symbol_name, period_years, period_label, start_date, end_date,
      preset_name, preset_label, strategy_type, return_rate, annualized_return, buy_hold_return_rate,
      excess_return, max_drawdown, buy_hold_max_drawdown, drawdown_diff, total_fees, buy_hold_fees,
      trades, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7::date, $8::date,
      $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20,
      $21, COALESCE($22::timestamptz, NOW())
    )
    ON CONFLICT (key) DO UPDATE
      SET symbol = EXCLUDED.symbol,
          symbol_name = EXCLUDED.symbol_name,
          period_years = EXCLUDED.period_years,
          period_label = EXCLUDED.period_label,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          preset_name = EXCLUDED.preset_name,
          preset_label = EXCLUDED.preset_label,
          strategy_type = EXCLUDED.strategy_type,
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
    safeRecord.presetName,
    safeRecord.presetLabel,
    safeRecord.strategyType,
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
    presetName: row.preset_name,
    presetLabel: row.preset_label,
    strategyType: row.strategy_type,
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

async function readRankingRecordsFromDb(ownerUserId = null) {
  const result = await dbQuery(`
    SELECT *
    FROM ranking_records
    WHERE ($1::text IS NULL AND owner_user_id IS NULL)
       OR ($1::text IS NOT NULL AND owner_user_id = $1)
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

function mapAdminPresetRow(row) {
  const meta = row.meta && typeof row.meta === "object" ? row.meta : {};
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    strategyType: row.strategy_type,
    ownerEmail: row.owner_email || "",
    isLegacy: Boolean(row.is_legacy),
    originalText: row.original_text || meta.originalText || "",
    modelText: row.model_text || meta.modelText || row.original_text || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
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
      sendJson(res, 200, {
        adminEmail: ADMIN_EMAIL,
        presets: result.rows.map(mapAdminPresetRow),
      });
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

async function handleRankingsApi(req, res) {
  try {
    if (req.method === "GET") {
      const user = await getCurrentUser(req);
      if (!user) {
        sendJson(res, 200, { authenticated: false, records: [] });
        return;
      }
      sendJson(res, 200, {
        authenticated: true,
        user,
        records: await readRankingRecordsFromDb(userIdForEmail(user.email)),
      });
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
    for (const record of incoming) {
      await upsertRankingRecord(record, userIdForEmail(user.email));
    }
    const records = await readRankingRecordsFromDb(userIdForEmail(user.email));
    sendJson(res, 200, { authenticated: true, user, records, saved: incoming.length });
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

      if (Number.isFinite(Number(row.peTtm)) || Number.isFinite(Number(row.pe)) || Number.isFinite(Number(row.pb))) {
        await dbPool.query(`
          INSERT INTO daily_valuations (symbol, market, trade_date, pe, pe_ttm, pb, source, updated_at)
          VALUES ($1, $2, $3::date, $4, $5, $6, $7, NOW())
          ON CONFLICT (symbol, market, trade_date) DO UPDATE
            SET pe = EXCLUDED.pe,
                pe_ttm = EXCLUDED.pe_ttm,
                pb = EXCLUDED.pb,
                source = EXCLUDED.source,
                updated_at = NOW()
        `, [
          code,
          market,
          tradeDate,
          Number.isFinite(Number(row.pe)) ? Number(row.pe) : null,
          Number.isFinite(Number(row.peTtm)) ? Number(row.peTtm) : null,
          Number.isFinite(Number(row.pb)) ? Number(row.pb) : null,
          source || "",
        ]);
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

function runAkshareBridge(mode, payload) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(AKSHARE_BRIDGE)) {
      reject(new Error("AKShare bridge script not found."));
      return;
    }

    const child = execFile(
      AKSHARE_PYTHON,
      [AKSHARE_BRIDGE],
      {
        timeout: AKSHARE_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message || "AKShare 调用失败。"));
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          reject(new Error("AKShare 返回的数据不是有效 JSON。"));
        }
      }
    );

    child.stdin.end(JSON.stringify({ mode, ...payload }));
  });
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

async function handleApi(req, res, requestUrl) {
  try {
    const code = normalizeCode(requestUrl.searchParams.get("code") || "513100");
    const start = normalizeDate(requestUrl.searchParams.get("start"), "开始日期");
    const end = normalizeDate(requestUrl.searchParams.get("end"), "结束日期");

    if (new Date(start) > new Date(end)) {
      throw new Error("开始日期不能晚于结束日期。");
    }

    const result = await fetchKlines({ code, start, end });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "请求失败。" });
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

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/api/klines") {
    handleApi(req, res, requestUrl);
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

  if (requestUrl.pathname === "/api/admin/presets") {
    handleAdminPresetsApi(req, res);
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
