// Shared AKShare Python-bridge caller — extracted from server.js so standalone cron scripts
// (like run-watch-alerts.js, which isn't require()-able from server.js) can invoke the exact
// same scripts/akshare_bridge.py process the live app uses, instead of duplicating this
// spawn/stdin/stdout plumbing a second time.
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const AKSHARE_PYTHON = process.env.AKSHARE_PYTHON || "python3";
const AKSHARE_TIMEOUT_MS = Math.max(3000, Number(process.env.AKSHARE_TIMEOUT_MS || 18000));
const AKSHARE_BRIDGE = path.join(__dirname, "..", "akshare_bridge.py");

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

module.exports = { runAkshareBridge };
