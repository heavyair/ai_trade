// Low-level Resend transport, shared by server.js (verification/reset emails) and any
// standalone script that needs to send mail without starting server.js's HTTP listener —
// server.js is not require()-able as a module (requiring it would start a duplicate server),
// so anything that needs to send email outside a real HTTP request (like a cron-driven batch
// script) has to go through this instead. Both sides read the same RESEND_API_KEY/EMAIL_FROM
// env vars from the same container, so there's nothing to keep in sync beyond this file.
const https = require("https");

const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const EMAIL_FROM = process.env.EMAIL_FROM || "AI Trade <noreply@lesminis.ca>";

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
          const parsed = JSON.parse(responseBody);
          detail = parsed && (parsed.message || parsed.error || parsed.name)
            ? String(parsed.message || parsed.error || parsed.name)
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

module.exports = { postJsonToResend, RESEND_API_KEY, EMAIL_FROM };
