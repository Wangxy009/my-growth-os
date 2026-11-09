function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function safeHttpUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; } }
function formShell(fields, submitLabel = "添加资源") { return '<form class="task-form" id="moduleForm">' + fields + '<button class="primary" type="submit">' + submitLabel + '</button></form>'; }
function renderSimplePage(config) {
  const root = document.querySelector("#moduleApp");
  root.innerHTML = '<section class="module-grid">' + config.cards.map(card => '<article class="panel"><div class="panel-head"><div><p class="eyebrow">' + card.eyebrow + '</p><h3>' + card.title + '</h3></div></div><div id="' + card.id + '"></div></article>').join("") + '</section>';
  config.render();
}

const RESOURCE_CATEGORIES = ["论文科研", "英语", "考研", "数据分析", "Agent与工具", "其他"];
const RESOURCE_USES = ["学习参考", "可复现", "可复用", "暂不确定"];

function renderSummary(state) {
  const resources = state.resources || [];
  const knownLicense = resources.filter(item => item.license && !["未知", "未确认", "不清楚"].includes(item.license.trim())).length;
  const ready = resources.filter(item => item.use === "可复用" || item.use === "可复现").length;
  const categories = [...new Set([...RESOURCE_CATEGORIES, ...resources.map(item => item.category).filter(Boolean)])];
  document.querySelector("#resourceSummary").innerHTML = '<div class="analytics-grid"><div><strong>' + resources.length + '</strong><small>收藏资源</small></div><div><strong>' + knownLicense + '/' + resources.length + '</strong><small>已核实许可证</small></div><div><strong>' + ready + '</strong><small>可复现/可复用</small></div></div><p class="muted small">准备引用或复用前，先核对仓库许可证、引用要求和依赖版本；没有许可证不代表可以自由复制。</p>';
  document.querySelector("#resourceCategories").innerHTML = categories.map(category => {
    const items = resources.filter(item => item.category === category);
    return '<div class="metric-row"><span>' + escapeHTML(category) + '</span><span class="metric-bar"><i style="width:' + (resources.length ? Math.round(items.length / resources.length * 100) : 0) + '%"></i></span><b>' + items.length + '</b></div>';
  }).join("");
}

function renderRows(state) {
  const resources = (state.resources || []).slice().reverse();
  document.querySelector("#resourceRows").innerHTML = resources.length ? resources.map(item => {
    const safeUrl = safeHttpUrl(item.url || "");
    const guidance = item.guidance || item.note || "建议先读 README、许可证与安装说明，再决定复现或复用。";
    return '<div class="record resource-record" data-id="' + item.id + '"><div><strong>' + escapeHTML(item.name || item.title || "未命名资源") + '</strong><small>' + (safeUrl ? '<a href="' + escapeHTML(safeUrl) + '" target="_blank" rel="noopener noreferrer">打开仓库 ↗</a> · ' : '') + escapeHTML(guidance) + '</small></div><span class="record-tag">' + escapeHTML(item.category || "其他") + '</span><span class="record-tag record-status">' + escapeHTML(item.use || "暂不确定") + '</span><span class="record-tag">' + escapeHTML(item.license || "许可证未知") + '</span><button class="record-delete" type="button" aria-label="删除资源">×</button></div>';
  }).join("") : '<p class="muted small">还没有资源。可以从仓库 URL、许可证和用途开始整理。</p>';
  document.querySelector("#resourceRows").querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const next = getState();
    const id = Number(event.currentTarget.closest(".record").dataset.id);
    next.resources = (next.resources || []).filter(item => item.id !== id);
    saveState(next);
    render(next);
    toast("资源已删除。");
  }));
}

function render(state = getState()) { renderSummary(state); renderRows(state); }

function githubUrlForQuery(value) {
  const url = safeHttpUrl(value);
  if (!url) return null;
  const parsed = new URL(url);
  return ["github.com", "www.github.com"].includes(parsed.hostname) ? url : null;
}

function renderInspector() {
  const box = document.querySelector("#resourceInspector");
  box.innerHTML = '<form id="resourceInspectorForm" class="form-grid"><label>仓库链接<input name="url" type="url" required placeholder="https://github.com/owner/repository"></label><label>Issues 状态<select name="issueState"><option value="open">开放中</option><option value="closed">已关闭</option><option value="all">全部</option></select></label><label>文件路径<input name="path" value="README.md" placeholder="README.md 或 docs/guide.md"></label><label>分支（可选）<input name="ref" placeholder="默认分支"></label><div class="module-actions"><button class="ghost" id="queryIssuesBtn" type="button">查询 Issues</button><button class="ghost" id="readFileBtn" type="button">读取文件</button></div></form><div class="stars-sync"><form id="starsForm" class="module-actions"><input name="url" type="url" value="https://github.com/Wangxy009?tab=stars" required><button class="ghost" type="submit">读取我的 Stars</button></form><div id="starsOutput" class="resource-query-output"></div></div><div id="resourceQueryStatus" class="status-note"></div><div id="resourceIssuesOutput" class="resource-query-output"></div><div id="resourceFileOutput" class="resource-query-output"></div>';
  const form = document.querySelector("#resourceInspectorForm");
  const starsForm = document.querySelector("#starsForm");
  const status = document.querySelector("#resourceQueryStatus");
  const setBusy = (button, busy, label) => { button.disabled = busy; button.textContent = busy ? "读取中…" : label; };
  const readJson = async (endpoint, button, label) => {
    setBusy(button, true, label);
    try {
      const response = await fetch(endpoint);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "读取失败。");
      return payload;
    } finally { setBusy(button, false, label); }
  };
  form.elements.queryIssuesBtn.addEventListener("click", async () => {
    const url = githubUrlForQuery(form.elements.url.value);
    if (!url) { toast("请输入有效的 GitHub 仓库链接。"); return; }
    try {
      const payload = await readJson("/api/github/issues?url=" + encodeURIComponent(url) + "&state=" + encodeURIComponent(form.elements.issueState.value), form.elements.queryIssuesBtn, "查询 Issues");
      const issues = payload.items || [];
      document.querySelector("#resourceIssuesOutput").innerHTML = '<strong>Issues · ' + issues.length + ' 条</strong>' + (issues.length ? issues.map(item => '<div class="query-row"><a href="' + escapeHTML(item.url) + '" target="_blank" rel="noopener noreferrer">#' + item.number + ' ' + escapeHTML(item.title) + '</a><small>' + (item.isPullRequest ? "Pull Request" : "Issue") + ' · ' + escapeHTML((item.labels || []).join(", ") || "无标签") + '</small></div>').join("") : '<p class="muted small">当前筛选下没有 Issues。</p>');
      status.textContent = "Issues 查询完成 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) { status.textContent = error.message || "无法读取 Issues；请确认服务器正在运行。"; }
  });
  form.elements.readFileBtn.addEventListener("click", async () => {
    const url = githubUrlForQuery(form.elements.url.value);
    const filePath = form.elements.path.value.trim();
    if (!url || !filePath) { toast("请输入仓库链接和文件路径。"); return; }
    try {
      const query = "url=" + encodeURIComponent(url) + "&path=" + encodeURIComponent(filePath) + (form.elements.ref.value.trim() ? "&ref=" + encodeURIComponent(form.elements.ref.value.trim()) : "");
      const payload = await readJson("/api/github/file?" + query, form.elements.readFileBtn, "读取文件");
      document.querySelector("#resourceFileOutput").innerHTML = '<strong>' + escapeHTML(payload.path) + (payload.truncated ? " · 已截取前 40000 字符" : "") + '</strong><pre>' + escapeHTML(payload.content || "") + '</pre>';
      status.textContent = "文件读取完成 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) { status.textContent = error.message || "无法读取文件；请确认路径和服务器状态。"; }
  });
  starsForm.addEventListener("submit", async event => {
    event.preventDefault();
    const url = starsForm.elements.url.value.trim(), button = starsForm.querySelector("button"), output = document.querySelector("#starsOutput");
    button.disabled = true; button.textContent = "读取中…";
    try {
      const response = await fetch("/api/github/stars?url=" + encodeURIComponent(url));
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "读取失败。");
      window.starCandidates = payload.items || [];
      output.innerHTML = '<strong>' + escapeHTML(payload.username) + ' · ' + window.starCandidates.length + ' 个公开收藏</strong><div class="star-candidate-list">' + window.starCandidates.slice(0, 100).map((item, index) => '<label class="star-candidate"><input type="checkbox" value="' + index + '" checked><span><strong>' + escapeHTML(item.name) + '</strong><small>' + escapeHTML(item.description || "暂无描述") + '</small></span></label>').join("") + '</div><button class="primary" id="saveStarsBtn" type="button">保存选中的资源</button>';
      document.querySelector("#saveStarsBtn").addEventListener("click", () => {
        const next = getState(), existing = new Set((next.resources || []).map(item => item.url)), selected = [...output.querySelectorAll("input[type=checkbox]:checked")].map(input => window.starCandidates[Number(input.value)]).filter(item => item && !existing.has(item.url));
        next.resources = next.resources || [];
        selected.forEach(item => { const haystack = (item.name + " " + item.description + " " + item.topics.join(" ")).toLowerCase(); const category = /english|ielts|vocab/.test(haystack) ? "英语" : /paper|research|latex|citation/.test(haystack) ? "论文科研" : /agent|llm|chatgpt|workflow/.test(haystack) ? "Agent与工具" : /python|pandas|sql|excel|data|finance|金融/.test(haystack) ? "数据分析" : "其他"; next.resources.push({ id: Date.now() + Math.random(), name: item.name, url: item.url, category, license: item.license || "未知", use: "暂不确定", guidance: [item.description, "Stars：" + item.stars, item.topics.length ? "主题：" + item.topics.join(", ") : ""].filter(Boolean).join("\n") }); });
        saveState(next); toast("已保存 " + selected.length + " 个新资源。"); render(next);
      });
    } catch (error) { output.innerHTML = '<p class="muted small">' + escapeHTML(error.message || "无法读取 Stars；请确认服务器正在运行。") + '</p>'; }
    finally { button.disabled = false; button.textContent = "读取我的 Stars"; }
  });
}

renderSimplePage({ cards: [{ id: "resourceSummary", eyebrow: "LIBRARY STATUS", title: "资源库总览" }, { id: "resourceCategories", eyebrow: "CATEGORIES", title: "分类分布" }, { id: "resourceInspector", eyebrow: "GITHUB READER", title: "仓库查询" }, { id: "resourceRows", eyebrow: "REPOSITORIES", title: "资源列表" }, { id: "resourceFormBox", eyebrow: "NEW RESOURCE", title: "添加资源" }], render() {
  const state = getState();
  render(state);
  renderInspector();
  document.querySelector("#resourceFormBox").innerHTML = formShell('<input name="name" required placeholder="仓库名，例如 user/repository"><div class="module-actions"><input name="url" type="url" required placeholder="https://github.com/owner/repository"><button class="ghost" id="inspectResourceBtn" type="button">读取仓库信息</button></div><select name="category">' + RESOURCE_CATEGORIES.map(item => '<option>' + item + '</option>').join("") + '</select><input name="license" placeholder="许可证，例如 MIT、Apache-2.0；未知可留空"><select name="use">' + RESOURCE_USES.map(item => '<option>' + item + '</option>').join("") + '</select><textarea name="guidance" rows="3" placeholder="使用说明、关键目录、运行方式或复现备注"></textarea>');
  const form = document.querySelector("#moduleForm");
  form.elements.inspectResourceBtn.addEventListener("click", async () => {
    const url = safeHttpUrl(form.elements.url.value.trim());
    if (!url || !["github.com", "www.github.com"].includes(new URL(url).hostname)) { toast("请先输入有效的 GitHub 仓库链接。"); return; }
    const button = form.elements.inspectResourceBtn;
    button.disabled = true;
    button.textContent = "读取中…";
    try {
      const response = await fetch("/api/github/repository?url=" + encodeURIComponent(url));
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "读取失败。");
      form.elements.name.value = payload.name || form.elements.name.value;
      form.elements.license.value = payload.license || "未知";
      const topics = Array.isArray(payload.topics) && payload.topics.length ? "主题：" + payload.topics.join(", ") : "暂无主题";
      form.elements.guidance.value = [payload.description, "默认分支：" + (payload.defaultBranch || "main"), "Stars：" + (payload.stars || 0), topics].filter(Boolean).join("\n");
      toast("仓库信息已读取，请确认后保存。");
    } catch (error) {
      toast(error.message || "无法读取仓库信息；请确认服务器正在运行。");
    } finally {
      button.disabled = false;
      button.textContent = "读取仓库信息";
    }
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const url = safeHttpUrl(form.elements.url.value.trim());
    if (!url) { toast("请输入有效的 HTTP 或 HTTPS 仓库链接。"); return; }
    const next = getState();
    next.resources = next.resources || [];
    next.resources.push({ id: Date.now(), name: form.elements.name.value.trim(), url, category: form.elements.category.value, license: form.elements.license.value.trim() || "未知", use: form.elements.use.value, guidance: form.elements.guidance.value.trim() });
    saveState(next);
    form.reset();
    render(next);
    toast("GitHub 资源已添加。");
  });
}});
window.addEventListener("growth-state-change", event => render(event.detail));
