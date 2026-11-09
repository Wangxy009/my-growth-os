function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function safeHttpUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function dateKey(date = new Date()) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }
function dateLabel(value) { return value ? new Date(value + "T00:00:00").toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "未设置"; }
function field(label, input) { return '<label>' + label + input + '</label>'; }
const RESEARCH_STARTER_STEPS = [
  ["整理兴趣方向并预约导师交流", "把金融科技、绿色金融、数据分析、AI+金融分别写下兴趣点，向学院老师咨询可行研究方向。", "选题"],
  ["提出 2—3 个可讨论的研究问题", "每个问题明确研究对象、结果变量、可能机制和时间范围；暂不把想法当作结论。", "选题"],
  ["检索并筛选相关研究", "用中英文关键词查找综述、经典研究和近年相关论文，记录检索词与筛选理由。", "文献"],
  ["建立文献阅读矩阵", "逐篇记录研究问题、理论机制、数据、变量、识别方法、主要发现、局限和可借鉴点。", "文献"],
  ["核查数据来源与使用条件", "记录数据口径、覆盖范围、更新时间、缺失情况、许可和隐私/伦理限制。", "数据与方法"],
  ["与导师讨论研究设计", "明确比较对象、识别假设、基准模型、稳健性检验和可行的替代方案。", "研究设计"],
  ["写出变量定义与分析计划", "为每个变量写清定义、单位、预期方向、来源和处理步骤。", "研究设计"],
  ["搭建可复现的数据与代码目录", "保留原始数据出处、清洗脚本、环境说明和可重复运行的分析流程。", "数据与方法"],
  ["形成论文提纲并获得反馈", "先搭建引言、文献、理论/假设、数据方法、结果、讨论和局限的逻辑骨架。", "写作"],
  ["完成初稿并逐章核对证据", "每个结论回到数据、模型和引用核验；区分相关性、因果识别与解释边界。", "写作"],
  ["根据导师意见迭代修改", "逐条记录反馈、修改动作和仍待确认的问题，保留版本记录。", "写作"],
  ["核对目标期刊与投稿规范", "和导师确认期刊范围、作者贡献、数据政策、格式、伦理要求及投稿决定。", "投稿"]
];
function renderShell() { renderSimplePage({ cards: [
  { id: "researchSummary", eyebrow: "RESEARCH STATUS", title: "科研总览" },
  { id: "researchMeta", eyebrow: "RESEARCH BRIEF", title: "研究设置" },
  { id: "researchDiscover", eyebrow: "LITERATURE DISCOVERY", title: "发现相关文献" },
  { id: "researchItems", eyebrow: "WORKFLOW", title: "论文工作流" },
  { id: "researchReadings", eyebrow: "LITERATURE", title: "文献阅读库" },
  { id: "researchLog", eyebrow: "RESEARCH LOG", title: "研究日志" }
], render() { render(getState()); } }); }

function researchState(state) { const base = { direction: "", question: "", deadline: "2027-07-01", items: [], readings: [], logs: [] }; state.research = { ...base, ...(state.research || {}) }; state.research.items = Array.isArray(state.research.items) ? state.research.items : []; state.research.readings = Array.isArray(state.research.readings) ? state.research.readings : []; state.research.logs = Array.isArray(state.research.logs) ? state.research.logs : []; return state.research; }
function readingStatusNext(status) { return ({ "待阅读": "阅读中", "阅读中": "已读", "已读": "精读", "精读": "待阅读" })[status] || "待阅读"; }
function cycleReadingStatus(state, readingId) {
  const research = researchState(state), reading = research.readings.find(item => String(item.id) === String(readingId));
  if (!reading) return false;
  reading.status = readingStatusNext(reading.status);
  reading.statusUpdatedAt = new Date().toISOString();
  return true;
}
function addResearchLog(state, entry) {
  const research = researchState(state), content = String(entry.content || "").trim();
  if (!content) return false;
  research.logs.push({ id: Date.now() + Math.random(), date: entry.date || dateKey(), type: entry.type || "问题", content });
  return true;
}
function renderSummary(state) {
  const research = researchState(state), items = research.items, readings = research.readings, completed = items.filter(item => item.status === "已完成").length, active = items.filter(item => item.status === "进行中").length;
  const daysLeft = research.deadline ? Math.ceil((new Date(research.deadline + "T00:00:00") - new Date(dateKey() + "T00:00:00")) / 86400000) : null;
  document.querySelector("#researchSummary").innerHTML = '<div class="exam-metrics">' + '<div class="exam-metric"><strong>' + items.length + '</strong><span>工作流事项</span></div><div class="exam-metric"><strong>' + completed + '/' + items.length + '</strong><span>已完成</span></div><div class="exam-metric"><strong>' + readings.length + '</strong><span>文献记录</span></div><div class="exam-metric"><strong>' + (daysLeft === null ? "未设置" : daysLeft >= 0 ? daysLeft + " 天" : "已超期") + '</strong><span>距离目标日期</span></div><div class="exam-metric"><strong>' + active + '</strong><span>进行中</span></div></div><p class="muted small">方向：' + escapeHTML(research.direction || "尚未确定") + ' · 暂定问题：' + escapeHTML(research.question || "尚未确定") + '</p>';
}

function renderDiscovery(state) {
  const box = document.querySelector("#researchDiscover");
  box.innerHTML = '<form id="researchSearchForm" class="module-actions"><input name="query" required minlength="2" maxlength="200" placeholder="例如：AI credit risk green finance" /><button class="ghost" type="submit">搜索 Crossref</button></form><p id="researchSearchStatus" class="status-note">只保存公开书目信息和 DOI 链接，不下载或复制付费全文。</p><div id="researchSearchResults" class="resource-query-output"></div>';
  const form = document.querySelector("#researchSearchForm"), status = document.querySelector("#researchSearchStatus"), output = document.querySelector("#researchSearchResults");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const query = form.elements.query.value.trim(), button = form.querySelector("button");
    button.disabled = true; button.textContent = "搜索中…";
    try {
      const response = await fetch("/api/research/search?query=" + encodeURIComponent(query));
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "文献搜索失败。");
      const items = payload.items || [];
      output.innerHTML = items.length ? items.map((item, index) => '<div class="feed-item research-result" data-index="' + index + '"><div><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML([item.authors, item.year, item.venue].filter(Boolean).join(" · ") || "书目信息不完整") + '</small></div><button class="ghost research-add" type="button">加入文献库</button></div>').join("") : '<p class="muted small">没有找到结果，可以换用英文关键词或更具体的研究主题。</p>';
      status.textContent = "找到 " + items.length + " 条结果。";
      output.querySelectorAll(".research-add").forEach(addButton => addButton.addEventListener("click", event => {
        const item = items[Number(event.currentTarget.closest("[data-index]").dataset.index)], next = getState(), current = researchState(next);
        if (!item) return;
        const duplicate = current.readings.some(reading => (item.doi && reading.doi === item.doi) || (item.url && reading.url === item.url));
        if (duplicate) { toast("这篇文献已经在阅读库中。"); return; }
        current.readings.push({ id: Date.now() + Math.random(), createdAt: dateKey(), title: item.title, meta: [item.authors, item.year, item.venue].filter(Boolean).join(" · "), doi: item.doi, url: safeHttpUrl(item.url), status: "待阅读", note: "来自 Crossref；待提炼研究问题、方法与可借鉴点。" });
        saveState(next); toast("文献已加入阅读库。"); render(next);
      }));
    } catch (error) { status.textContent = error.message || "无法查询文献；请确认服务器正在运行。"; }
    finally { button.disabled = false; button.textContent = "搜索 Crossref"; }
  });
}
function renderMeta(state) {
  const research = researchState(state), box = document.querySelector("#researchMeta");
  box.innerHTML = '<form id="researchMetaForm" class="module-form-grid">' + field("研究方向", '<input name="direction" value="' + escapeHTML(research.direction) + '" placeholder="金融科技 / 绿色金融 / AI+金融">') + field("暂定研究问题", '<input name="question" value="' + escapeHTML(research.question) + '" placeholder="先写可验证的问题，不急着下结论">') + field("目标完成日期", '<input name="deadline" type="date" value="' + escapeHTML(research.deadline) + '">') + '<button class="primary" type="submit">保存研究设置</button></form><p class="muted small">科研方向、研究结论和投稿动作由你确认；这个页面只负责把过程留痕。</p>';
  document.querySelector("#researchMetaForm").addEventListener("submit", event => { event.preventDefault(); const next = getState(); const current = researchState(next); current.direction = event.currentTarget.elements.direction.value.trim(); current.question = event.currentTarget.elements.question.value.trim(); current.deadline = event.currentTarget.elements.deadline.value; saveState(next); toast("研究设置已保存。"); render(next); });
}
function renderItems(state) {
  const research = researchState(state), stages = ["选题", "文献", "研究设计", "数据与方法", "写作", "投稿"], items = research.items;
  const box = document.querySelector("#researchItems");
  box.innerHTML = '<div class="module-actions"><div><strong>论文起步清单</strong><p class="muted small">可选导入 12 个从选题到投稿的步骤；不预设截止日期，按你和导师讨论后的节奏推进。</p></div><button id="researchStarterImport" class="ghost" type="button">导入起步清单</button></div><form id="researchItemForm" class="module-form-grid">' + field("事项", '<input name="title" required placeholder="文献、选题、数据或写作事项">') + field("阶段", '<select name="type">' + stages.map(stage => '<option>' + stage + '</option>').join("") + '</select>') + field("状态", '<select name="status"><option>待开始</option><option>进行中</option><option>已完成</option></select>') + field("截止日期", '<input name="dueDate" type="date">') + '<button class="primary" type="submit">添加科研事项</button></form><div class="compact-list">' + (items.length ? items.slice().sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).map(item => { const status = ["待开始", "进行中", "已完成"].includes(item.status) ? item.status : "待开始", nextAction = status === "待开始" ? "开始" : status === "进行中" ? "标记完成" : "重新打开"; return '<div class="compact-row"><span><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(item.type || "") + ' · ' + escapeHTML(status) + ' · 截止 ' + dateLabel(item.dueDate) + (item.note ? ' · ' + escapeHTML(item.note) : '') + '</small></span><span class="module-actions"><button class="ghost research-advance" data-id="' + escapeHTML(item.id) + '" type="button">' + nextAction + '</button><button class="ghost research-delete" data-id="' + escapeHTML(item.id) + '" type="button" aria-label="删除科研事项">×</button></span></div>'; }).join("") : '<p class="muted small">还没有科研事项。</p>') + '</div><div class="compact-list">' + stages.map(stage => { const total = items.filter(item => item.type === stage).length, done = items.filter(item => item.type === stage && item.status === "已完成").length; return '<div class="metric-row"><span>' + stage + '</span><span class="metric-bar"><i style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></i></span><b>' + done + '/' + total + '</b></div>'; }).join("") + '</div>';
  document.querySelector("#researchStarterImport").addEventListener("click", () => {
    const next = getState(), current = researchState(next);
    let added = 0;
    for (const [index, [title, note, type]] of RESEARCH_STARTER_STEPS.entries()) {
      const templateId = "research-starter-" + String(index + 1).padStart(2, "0");
      const duplicate = current.items.some(item => item.templateId === templateId || String(item.title || "").trim() === title);
      if (duplicate) continue;
      current.items.push({ id: Date.now() + Math.random(), templateId, title, note, type, status: "待开始", dueDate: null });
      added += 1;
    }
    if (added) saveState(next);
    toast(added ? "已导入 " + added + " 项论文起步事项；重复项已跳过。" : "起步清单已导入过，没有重复添加。");
    render(getState());
  });
  document.querySelector("#researchItemForm").addEventListener("submit", event => { event.preventDefault(); const next = getState(), current = researchState(next), form = event.currentTarget; current.items.push({ id: Date.now(), title: form.elements.title.value.trim(), type: form.elements.type.value, status: form.elements.status.value, dueDate: form.elements.dueDate.value || null }); saveState(next); toast("科研事项已添加。"); render(next); });
  document.querySelectorAll(".research-advance").forEach(button => button.addEventListener("click", event => { const next = getState(), current = researchState(next), item = current.items.find(candidate => String(candidate.id) === event.currentTarget.dataset.id); if (!item) return; const status = ["待开始", "进行中", "已完成"].includes(item.status) ? item.status : "待开始"; item.status = status === "待开始" ? "进行中" : status === "进行中" ? "已完成" : "待开始"; saveState(next); toast("科研事项状态已更新。" ); render(next); }));
  document.querySelectorAll(".research-delete").forEach(button => button.addEventListener("click", event => { const next = getState(), current = researchState(next); current.items = current.items.filter(item => String(item.id) !== event.currentTarget.dataset.id); saveState(next); toast("科研事项已删除。"); render(next); }));
}
function renderReadings(state) {
  const research = researchState(state), readings = research.readings.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), box = document.querySelector("#researchReadings");
  box.innerHTML = '<form id="readingForm" class="module-form-grid">' + field("文献标题", '<input name="title" required placeholder="论文或报告标题">') + field("作者 / 年份", '<input name="meta" placeholder="作者，年份">') + field("链接", '<input name="url" type="url" placeholder="https://doi.org/...">') + field("阅读状态", '<select name="status"><option>待阅读</option><option>阅读中</option><option>已读</option><option>精读</option></select>') + field("核心笔记", '<input name="note" placeholder="研究问题、方法、结论或可借鉴点">') + '<button class="primary" type="submit">保存文献</button></form><p class="muted small">点击文献状态可循环推进：待阅读 → 阅读中 → 已读 → 精读。精读前建议补充研究问题、方法、数据和局限。</p><div class="compact-list">' + (readings.length ? readings.slice(0, 12).map(item => { const url = safeHttpUrl(item.url); return '<div class="compact-row"><span><strong>' + (url ? '<a href="' + escapeHTML(url) + '" target="_blank" rel="noreferrer">' + escapeHTML(item.title) + '</a>' : escapeHTML(item.title)) + '</strong><small>' + escapeHTML(item.meta || "") + ' · ' + escapeHTML(item.note || "") + '</small></span><span class="module-actions"><button class="ghost reading-status" data-id="' + escapeHTML(item.id) + '" type="button">' + escapeHTML(item.status || "待阅读") + '</button><button class="ghost reading-delete" data-id="' + escapeHTML(item.id) + '" type="button" aria-label="删除文献">×</button></span></div>'; }).join("") : '<p class="muted small">还没有文献记录。先从老师推荐、经典综述和近年高质量论文建立清单。</p>') + '</div>';
  document.querySelector("#readingForm").addEventListener("submit", event => { event.preventDefault(); const next = getState(), current = researchState(next), form = event.currentTarget; current.readings.push({ id: Date.now(), createdAt: dateKey(), title: form.elements.title.value.trim(), meta: form.elements.meta.value.trim(), url: safeHttpUrl(form.elements.url.value.trim()), status: form.elements.status.value, note: form.elements.note.value.trim() }); saveState(next); toast("文献已保存。"); render(next); });
  document.querySelectorAll(".reading-status").forEach(button => button.addEventListener("click", event => { const next = getState(); if (cycleReadingStatus(next, event.currentTarget.dataset.id)) { saveState(next); toast("文献状态已更新。"); render(next); } }));
  document.querySelectorAll(".reading-delete").forEach(button => button.addEventListener("click", event => { const next = getState(), current = researchState(next); current.readings = current.readings.filter(item => String(item.id) !== event.currentTarget.dataset.id); saveState(next); toast("文献已删除。"); render(next); }));
}
function renderLog(state) {
  const research = researchState(state), logs = research.logs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))), box = document.querySelector("#researchLog");
  box.innerHTML = '<form id="researchLogForm" class="module-form-grid">' + field("日期", '<input name="date" type="date" value="' + dateKey() + '">') + field("日志类型", '<select name="type"><option>问题</option><option>方法</option><option>数据</option><option>写作</option><option>与导师沟通</option></select>') + field("记录", '<input name="content" required placeholder="今天推进了什么，下一步是什么">') + '<button class="primary" type="submit">记录研究日志</button></form><div class="compact-list">' + (logs.length ? logs.slice(0, 10).map(item => '<div class="compact-row"><span><strong>' + dateLabel(item.date) + ' · ' + escapeHTML(item.type) + '</strong><small>' + escapeHTML(item.content) + '</small></span></div>').join("") : '<p class="muted small">还没有研究日志。</p>') + '</div>';
  document.querySelector("#researchLogForm").addEventListener("submit", event => { event.preventDefault(); const next = getState(), form = event.currentTarget; const saved = addResearchLog(next, { date: form.elements.date.value, type: form.elements.type.value, content: form.elements.content.value }); if (!saved) { toast("请先填写研究推进内容。"); return; } saveState(next); toast("研究日志已记录。"); render(next); });
}
function render(state = getState()) { renderSummary(state); renderMeta(state); renderDiscovery(state); renderItems(state); renderReadings(state); renderLog(state); }
renderShell();
window.addEventListener("growth-state-change", event => render(event.detail));
