// 标的数据自查页（/symbol-lookup.html）的全部逻辑。
//
// 为什么是独立页面、独立脚本：这个工具跟"模型查询"没有共享状态，之前挤在管理区的标签页里
// 反而找不到（用户直接问过"标的数据自查界面 ? where ?"）。app.js 是绑死在 index.html 的
// DOM 上的单体脚本，不能直接复用，所以这里重写一份很小的——只依赖 /stock-tags.js（UMD，
// 浏览器侧挂 window.StockTags）和 /styles.css 里已有的表格样式。
//
// 只回答"库里有没有这只票"是不够的：真正会让人卡住的是"有数据但不够用"——最常见的是训练
// 窗口第一年行数不足（实测 574 个标的里有 459 个是这种情况，多为次新股或数据源起点晚），
// 这会让上行波动门槛整年无法评估。所以结论一栏直接给出可否用于 AI 搜索，并说明卡在哪。

const lookupInput = document.querySelector("#lookupInput");
const lookupButton = document.querySelector("#lookupButton");
const lookupStatus = document.querySelector("#lookupStatus");
const lookupResult = document.querySelector("#lookupResult");
const lookupSummary = document.querySelector("#lookupSummary");
const lookupTargets = document.querySelector("#lookupTargets");
const lookupMissingOnly = document.querySelector("#lookupMissingOnly");
const lookupCopyUsable = document.querySelector("#lookupCopyUsable");
const lookupCopyMissing = document.querySelector("#lookupCopyMissing");

const MARKET_LABELS = { US: "美股", HK: "H股", 0: "深市", 1: "沪市", CN: "A股" };

// 4 年训练 + 2 年验证约需 1400 个交易日；训练首年不足 30 行则该年无法评估。
const MIN_PRICE_ROWS = 1400;
const MIN_FIRST_YEAR_ROWS = 30;

let lastPayload = null;

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function readJsonResponse(response, fallbackMessage = "服务器返回的数据不是有效 JSON。") {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(response.ok ? fallbackMessage : `${fallbackMessage}：${text.slice(0, 120)}`);
    }
  }
  if (!response.ok) {
    const error = new Error(payload.error || fallbackMessage);
    error.status = response.status;
    throw error;
  }
  return payload;
}

// 一只标的能不能拿去跑 AI 搜索。库里完全没有这只票（priceRows=0）跟"有但不够"要分开说，
// 因为处理方式不一样：前者要先抓行情，后者只能等数据攒够或换标的。
function verdictOf(row) {
  if (row.priceRows === 0) return { ok: false, missing: true, html: '<span class="down">库里没有这只票</span>' };
  if (row.priceRows < MIN_PRICE_ROWS) {
    return { ok: false, missing: false, html: `<span class="down">数据不足（仅 ${row.priceRows} 行，约需 ${MIN_PRICE_ROWS}）</span>` };
  }
  if (row.firstTrainYearRows < MIN_FIRST_YEAR_ROWS) {
    return { ok: false, missing: false, html: `<span class="down">训练首年数据不足（${row.firstTrainYearRows} 行）</span>` };
  }
  return { ok: true, missing: false, html: '<span class="up">可用于 AI 搜索</span>' };
}

function renderRows(rows) {
  return rows.map((row) => {
    const verdict = verdictOf(row);
    const pePct = row.priceRows > 0 ? Math.round((row.peRows / row.priceRows) * 100) : 0;
    const tags = (typeof StockTags !== "undefined" ? StockTags.tagsOf(row.symbol) : [])
      .map((t) => escapeHtml(StockTags.labelOf(t))).join("、") || "--";
    const range = row.firstDate ? `${escapeHtml(row.firstDate)} ~ ${escapeHtml(row.lastDate)}` : "--";
    return `<tr>
      <td><strong>${escapeHtml(row.symbol)}</strong><br><span class="field-hint">${escapeHtml(row.name || "")}</span></td>
      <td>${escapeHtml(MARKET_LABELS[row.market] || row.market || "--")}</td>
      <td>${row.priceRows}<br><span class="field-hint">${range}</span></td>
      <td>${row.firstTrainYearRows}</td>
      <td>${row.peRows > 0 ? `${pePct}%` : '<span class="field-hint">无</span>'}</td>
      <td>${row.fundamentalRows > 0 ? row.fundamentalRows : '<span class="field-hint">无</span>'}</td>
      <td>${row.models}${row.qualifiedModels > 0 ? ` <span class="up">(达标 ${row.qualifiedModels})</span>` : ""}</td>
      <td>${tags}</td>
      <td>${verdict.html}</td>
    </tr>`;
  }).join("");
}

function renderSummary(payload) {
  if (!payload.index) { lookupSummary.innerHTML = ""; return; }
  const idx = payload.index;
  const usable = payload.rows.filter((row) => verdictOf(row).ok).length;
  lookupSummary.innerHTML = `<div class="lookup-summary">
    <strong>${escapeHtml(idx.officialName)}</strong>
    <span class="field-hint">（${escapeHtml(idx.mappingId)} / ${escapeHtml(idx.code || "")} · ${escapeHtml(MARKET_LABELS[idx.market] || idx.market)} · 匹配方式：${escapeHtml(idx.matchedVia)}）</span>
    <br>成分股 ${idx.constituents} 只：库里有行情 ${idx.withData} 只，
    其中 <span class="up">${usable} 只可直接用于 AI 搜索</span>，
    缺数据 <span class="down">${idx.missing}</span> 只。
  </div>`;
}

function visibleRows() {
  if (!lastPayload) return [];
  return lookupMissingOnly.checked
    ? lastPayload.rows.filter((row) => !verdictOf(row).ok)
    : lastPayload.rows;
}

function renderTable() {
  const rows = visibleRows();
  if (rows.length === 0) {
    lookupResult.innerHTML = '<div class="ranking-empty">没有符合当前筛选的标的。</div>';
    return;
  }
  lookupResult.innerHTML = `
    <table class="admin-ranking-table">
      <thead><tr>
        <th>代码 / 名称</th><th>市场</th><th>行情行数 / 区间</th><th>训练首年行数</th>
        <th>PE 覆盖</th><th>基本面</th><th>已有模型</th><th>标签</th><th>结论</th>
      </tr></thead>
      <tbody>${renderRows(rows)}</tbody>
    </table>`;
}

async function runLookup(query) {
  const text = String(query == null ? lookupInput.value : query).trim();
  if (!text) { lookupStatus.textContent = "请输入代码、名称、指数或 ETF。"; return; }
  lookupInput.value = text;
  lookupStatus.textContent = "查询中…";
  lookupResult.innerHTML = "";
  lookupSummary.innerHTML = "";
  lastPayload = null;
  try {
    const response = await fetch(`/api/admin/symbol-lookup?q=${encodeURIComponent(text)}`, { cache: "no-store" });
    const payload = await readJsonResponse(response, "查询失败。");
    if (!payload.rows || payload.rows.length === 0) {
      lookupStatus.textContent = "";
      lookupResult.innerHTML = `<div class="ranking-empty">库里没有匹配「${escapeHtml(text)}」的标的。</div>`;
      return;
    }
    lastPayload = payload;
    lookupStatus.textContent = payload.index ? `成分股 ${payload.found} 只` : `匹配 ${payload.found} 个`;
    renderSummary(payload);
    renderTable();
  } catch (error) {
    lookupStatus.textContent = "";
    // 401/403 走的是登录态问题，不是查询本身出错——直接给回主页面的入口，否则页面上只会
    // 看到一句没有出路的「只有管理员可以执行这个操作」。
    const needsLogin = error.status === 401 || error.status === 403;
    lookupResult.innerHTML = `<div class="ranking-empty">${escapeHtml(error.message || "查询失败。")}${
      needsLogin ? ' <a href="/">先到主页面登录</a>' : ""}</div>`;
  }
}

async function loadTargets() {
  try {
    const response = await fetch("/api/admin/lookup-targets", { cache: "no-store" });
    const payload = await readJsonResponse(response, "读取指数清单失败。");
    lookupTargets.innerHTML = (payload.indices || []).map((entry) => {
      const etfs = entry.etfs && entry.etfs.length > 0 ? `（ETF ${entry.etfs.join("/")}）` : "";
      const label = `${entry.shortName || entry.officialName}${etfs} · ${entry.cachedCount}只`;
      return `<button type="button" class="ghost-button" data-query="${escapeHtml(entry.mappingId)}">${escapeHtml(label)}</button>`;
    }).join("") || '<span class="field-hint">没有可用的指数。</span>';
    for (const button of lookupTargets.querySelectorAll("button[data-query]")) {
      button.addEventListener("click", () => runLookup(button.dataset.query));
    }
  } catch (error) {
    lookupTargets.innerHTML = `<span class="field-hint">${escapeHtml(error.message || "读取指数清单失败。")}</span>`;
  }
}

// 复制代码是为了接着去 AI 搜索里用——那边是按代码列表选股的，手抄 300 个代码不现实。
async function copyCodes(picker, emptyMessage) {
  if (!lastPayload) { lookupStatus.textContent = "先查询一次。"; return; }
  const codes = lastPayload.rows.filter(picker).map((row) => row.symbol);
  if (codes.length === 0) { lookupStatus.textContent = emptyMessage; return; }
  const text = codes.join(",");
  try {
    await navigator.clipboard.writeText(text);
    lookupStatus.textContent = `已复制 ${codes.length} 个代码。`;
  } catch (error) {
    // 非 https 或浏览器拒绝剪贴板权限时退回到"选中即可复制"。
    window.prompt(`共 ${codes.length} 个代码，按 Ctrl+C 复制：`, text);
  }
}

lookupButton.addEventListener("click", () => runLookup());
lookupInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); runLookup(); }
});
lookupMissingOnly.addEventListener("change", renderTable);
lookupCopyUsable.addEventListener("click", () => copyCodes((row) => verdictOf(row).ok, "当前结果里没有可用的标的。"));
lookupCopyMissing.addEventListener("click", () => copyCodes((row) => !verdictOf(row).ok, "当前结果里没有缺数据的标的。"));

// 支持 /symbol-lookup.html?q=QQQ 直接带查询进来，方便从别处链接过来。
const initialQuery = new URLSearchParams(window.location.search).get("q");
loadTargets();
if (initialQuery) runLookup(initialQuery);
