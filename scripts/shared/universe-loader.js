// Shared "full market universe" loader for the batch scripts that scan/validate against
// "the whole market" (选股'S run-stock-screen.js, 后台模型排行'S run-optimization-scan.js,
// 全市场验证'S run-universe-validation.js, and AI自动生成'S run-auto-generate.js default
// no-explicit-symbols mode). All four previously read scripts/universe/symbols.json directly
// and independently — a fixed ~400-entry index-constituent list — so a stock a user actually
// cares about (typed into 历史模拟, or surfaced as a 选股 match) that isn't in that fixed
// list was NEVER covered by any of these full-market batch jobs. This merges in every
// distinct code from symbol_query_history (across ALL users — these are system-wide batch
// jobs, not privacy-scoped to one user, even though 选股's own RESULTS stay private) so the
// scanned universe grows to match what users are actually following over time.

const fs = require("fs");
const path = require("path");

function loadBaseSymbolManifest() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "universe", "symbols.json"), "utf8"));
  return manifest.symbols;
}

// A CN code is always 6 digits; anything else (NET, QQQ, AMD, ...) is US — same heuristic
// already used independently in run-auto-generate.js for its --symbols= override.
function inferMarket(code) {
  return /^\d{6}$/.test(code) ? "CN" : "US";
}

async function loadExpandedUniverse(pool) {
  const base = loadBaseSymbolManifest();
  const baseCodes = new Set(base.map((entry) => String(entry.code || "").toUpperCase()));
  const historyResult = await pool.query(`
    SELECT code, MAX(description) AS description
    FROM symbol_query_history
    GROUP BY code
  `);
  const extra = [];
  for (const row of historyResult.rows) {
    const code = String(row.code || "").toUpperCase();
    if (!code || baseCodes.has(code)) continue;
    baseCodes.add(code);
    extra.push({ code, market: inferMarket(code), name: row.description || code });
  }
  return [...base, ...extra];
}

module.exports = { loadBaseSymbolManifest, inferMarket, loadExpandedUniverse };
