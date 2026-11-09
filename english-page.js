function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function safeUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function localDateKey(date = new Date()) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }
function dateLabel(value) { return value ? new Date(value + "T00:00:00").toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "未设置"; }
function contentDate(value) { if (!value) return "时间未提供"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }); }
const ENGLISH_REVIEW_INTERVALS_DAYS = [1, 3, 7, 14];
function shiftEnglishReviewDate(value, days) {
  const parts = String(value || localDateKey()).split("-").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return localDateKey();
  const date = new Date(parts[0], parts[1] - 1, parts[2] + days);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function applyEnglishMistakeReview(item, outcome, date = localDateKey()) {
  item.reviewCount = Math.max(0, Number(item.reviewCount) || 0) + 1;
  item.lastReviewed = date;
  if (outcome === "again") {
    item.reviewStreak = 0;
    item.status = "pending";
    item.nextReview = shiftEnglishReviewDate(date, 1);
    item.masteredAt = null;
    return item;
  }
  item.reviewStreak = Math.max(0, Number(item.reviewStreak) || 0) + 1;
  if (item.reviewStreak > ENGLISH_REVIEW_INTERVALS_DAYS.length) {
    item.status = "mastered";
    item.nextReview = "";
    item.masteredAt = date;
    return item;
  }
  item.status = "pending";
  item.nextReview = shiftEnglishReviewDate(date, ENGLISH_REVIEW_INTERVALS_DAYS[item.reviewStreak - 1]);
  return item;
}
function saveEnglishDailyLog(state, date, entry) {
  const key = date || localDateKey();
  state.englishLogs = state.englishLogs || {};
  state.englishLogs[key] = {
    words: Math.max(0, Number(entry.words) || 0), source: String(entry.source || ""),
    listening: Math.max(0, Number(entry.listening) || 0), reading: Math.min(100, Math.max(0, Number(entry.reading) || 0)),
    writing: Math.max(0, Number(entry.writing) || 0), speaking: Math.max(0, Number(entry.speaking) || 0),
    note: String(entry.note || "").trim(), target: 7
  };
  return state.englishLogs[key];
}
function toggleEnglishPlan(state, planId) {
  const plan = (state.englishPlans || []).find(item => String(item.id) === String(planId));
  if (!plan) return false;
  plan.status = plan.status === "done" ? "active" : "done";
  plan.completedAt = plan.status === "done" ? localDateKey() : null;
  for (const task of state.tasks || []) if (String(task.englishPlanId) === String(plan.id)) task.status = plan.status === "done" ? "done" : "active";
  return true;
}
function addEnglishPlan(state, entry) {
  const task = String(entry.task || "").trim(), skill = String(entry.skill || "阅读");
  if (!task || !entry.date || !String(entry.target || "").trim()) return false;
  state.englishPlans = Array.isArray(state.englishPlans) ? state.englishPlans : [];
  state.tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const id = Date.now() + Math.random();
  state.englishPlans.push({ id, sourceId: entry.sourceId || null, skill, date: entry.date, task, target: String(entry.target).trim(), status: "active", createdAt: new Date().toISOString() });
  const minutes = skill === "阅读" || skill === "写作" ? 50 : skill === "口语" ? 35 : 30;
  state.tasks.push({ id: Date.now() + Math.random(), title: "雅思 · " + task, goal: "雅思", estimatedMinutes: minutes, actualMinutes: 0, plannedDate: entry.date, status: "active", priority: 3, portable: true, englishPlanId: id });
  return true;
}
function field(label, input) { return '<label>' + label + input + '</label>'; }
function metric(label, value, detail = "") { return '<div class="exam-metric"><strong>' + value + '</strong><span>' + label + (detail ? '<small>' + detail + '</small>' : '') + '</span></div>'; }
function renderShell() { renderSimplePage({ cards: [
  { id: "englishSummary", eyebrow: "PROGRESS", title: "雅思学习反馈" },
  { id: "englishContent", eyebrow: "DAILY READING", title: "今日精读素材" },
  { id: "englishLog", eyebrow: "DAILY LOG", title: "今日训练" },
  { id: "englishPlan", eyebrow: "NEXT STEP", title: "训练计划" },
  { id: "englishReview", eyebrow: "REVIEW", title: "错题与复盘" },
  { id: "englishHistory", eyebrow: "HISTORY", title: "最近记录" }
], render() { render(getState()); } }); }

function renderSummary(state) {
  const logs = Object.values(state.englishLogs || {}), today = localDateKey();
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6); const weekKey = localDateKey(start);
  const week = Object.entries(state.englishLogs || {}).filter(([date]) => date >= weekKey).map(([, item]) => item);
  const words = week.reduce((sum, item) => sum + Number(item.words || 0), 0), listen = week.reduce((sum, item) => sum + Number(item.listening || 0), 0), read = week.filter(item => Number(item.reading || 0) > 0);
  const reading = read.length ? Math.round(read.reduce((sum, item) => sum + Number(item.reading || 0), 0) / read.length) : 0, speaking = week.reduce((sum, item) => sum + Number(item.speaking || 0), 0), writing = week.reduce((sum, item) => sum + Number(item.writing || 0), 0);
  const englishTasks = (state.tasks || []).filter(task => task.goal === "雅思"), minutes = (state.sessions || []).filter(session => englishTasks.some(task => String(task.id) === String(session.taskId))).reduce((sum, session) => sum + Number(session.minutes || 0), 0);
  document.querySelector("#englishSummary").innerHTML = '<div class="exam-metrics">' + metric("训练天数", logs.length) + metric("近 7 天词汇", words, "目标：每天 100 个") + metric("听力篇数", listen) + metric("阅读正确率", reading + "%") + metric("写作 / 口语", writing + " / " + speaking) + '</div><p class="muted small">已关联雅思学习时长：' + minutes + ' 分钟 · 目标 7.0+ · 最晚 2027 年 7 月前取得成绩。' + (state.englishLogs?.[today] ? " 今日已记录。" : " 今日尚未记录。") + '</p>';
}

function renderReadingContent(state) {
  const isEnglish = item => /^en(?:-|$)/i.test(item.language || "") || /[a-z]/i.test(item.title || "") && !/[\u3400-\u9fff]/.test(item.title || "");
  const timestamp = item => Date.parse(item.publishedAt || item.createdAt || item.fetchedAt || "") || 0;
  const seen = new Set();
  const items = [...(state.news || []), ...(state.newsInbox || [])].filter(isEnglish).sort((a, b) => timestamp(b) - timestamp(a)).filter(item => { const key = safeUrl(item.url) || item.title; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 5);
  const box = document.querySelector("#englishContent");
  const toolLinks = '<div class="english-tool-links"><span class="muted small">可选工具</span><a href="https://github.com/1599570912/IELTS-Speaking-AI" target="_blank" rel="noreferrer">IELTS Speaking AI · MIT · 自行核对题库版权</a><a href="https://github.com/sallowayma-git/IELTS-practice" target="_blank" rel="noreferrer">IELTS Practice · GPL-3.0 · 仅限个人自托管</a></div>';
  if (!items.length) {
    box.innerHTML = '<div class="latest-empty"><strong>今天还没有英文素材</strong><p class="muted small">先在新闻页保存合法订阅的外刊或金融科技英文 RSS，文章会自动出现在这里。</p><div class="english-source-links"><a href="https://learningenglish.voanews.com/" target="_blank" rel="noreferrer">VOA Learning English</a><a href="https://www.bbc.co.uk/learningenglish" target="_blank" rel="noreferrer">BBC Learning English</a><a href="https://www.economist.com/" target="_blank" rel="noreferrer">The Economist 官方网站</a></div>' + toolLinks + '</div>';
    return;
  }
  box.innerHTML = '<p class="muted small">从新闻页同步的最新素材。建议每篇完成：摘要、5 个词、1 个长难句和 1 个专业关联。</p><div class="english-reading-list">' + items.map(item => { const url = safeUrl(item.url); const exists = (state.englishPlans || []).some(plan => plan.sourceId && String(plan.sourceId) === String(item.id) && plan.status !== "done"); return '<article class="english-reading-item" data-source-id="' + escapeHTML(item.id) + '"><div><span class="record-tag">' + escapeHTML(item.category || "英文素材") + '</span><h4>' + (url ? '<a href="' + escapeHTML(url) + '" target="_blank" rel="noreferrer">' + escapeHTML(item.title) + '</a>' : escapeHTML(item.title)) + '</h4><p>' + escapeHTML(item.summary || item.note || "打开原文后记录自己的摘要。") + '</p><small>' + escapeHTML(item.source || "新闻源") + ' · ' + escapeHTML(contentDate(item.publishedAt || item.createdAt || item.fetchedAt)) + '</small></div><button class="ghost reading-plan" type="button" data-title="' + escapeHTML(item.title) + '" data-id="' + escapeHTML(item.id) + '" ' + (exists ? "disabled" : "") + '>' + (exists ? "已加入计划" : "加入精读") + '</button></article>'; }).join("") + '</div>' + toolLinks;
  box.querySelectorAll(".reading-plan").forEach(button => button.addEventListener("click", event => {
    const next = getState();
    next.englishPlans = next.englishPlans || [];
    if (next.englishPlans.some(plan => String(plan.sourceId) === event.currentTarget.dataset.id && plan.status !== "done")) return;
    addEnglishPlan(next, { sourceId: event.currentTarget.dataset.id, skill: "阅读", date: localDateKey(), task: "精读：" + event.currentTarget.dataset.title, target: "摘要 + 5 个词 + 1 个长难句" });
    saveState(next);
    toast("已加入今日精读计划。");
    render(next);
  }));
}

function renderDailyLog(state) {
  const key = localDateKey(), current = state.englishLogs?.[key] || {}, box = document.querySelector("#englishLog");
  box.innerHTML = '<form id="englishLogForm" class="module-form-grid">' + field("词汇量", '<input name="words" type="number" min="0" placeholder="今日目标 100 个" value="' + (current.words === undefined ? "" : Number(current.words)) + '">') + field("词汇材料", '<select name="source"><option value="">未选择</option><option>雅思词典真经</option><option>考研英语红宝书</option><option>两者同步</option></select>') + field("听力篇数", '<input name="listening" type="number" min="0" value="' + Number(current.listening || 0) + '">') + field("阅读正确率 %", '<input name="reading" type="number" min="0" max="100" value="' + Number(current.reading || 0) + '">') + field("写作练习", '<input name="writing" type="number" min="0" value="' + Number(current.writing || 0) + '">') + field("口语练习", '<input name="speaking" type="number" min="0" value="' + Number(current.speaking || 0) + '">') + field("今日复盘", '<input name="note" placeholder="最薄弱的技能或明天的调整" value="' + escapeHTML(current.note || "") + '">') + '<button class="primary" type="submit">保存今日记录</button></form><p class="muted small">词汇目标是每天 100 个；此表只记实际完成量，未填写不会自动记作已完成。</p>';
  const form = document.querySelector("#englishLogForm"); if (current.source) form.elements.source.value = current.source;
  form.addEventListener("submit", event => { event.preventDefault(); const next = getState(); saveEnglishDailyLog(next, key, { words: form.elements.words.value, source: form.elements.source.value, listening: form.elements.listening.value, reading: form.elements.reading.value, writing: form.elements.writing.value, speaking: form.elements.speaking.value, note: form.elements.note.value }); saveState(next); toast("今日雅思记录已保存。"); render(next); });
}

function renderPlans(state) {
  const plans = (state.englishPlans || []).slice().sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999"))), box = document.querySelector("#englishPlan");
  box.innerHTML = '<form id="englishPlanForm" class="module-form-grid">' + field("技能", '<select name="skill"><option>词汇</option><option>听力</option><option>阅读</option><option>写作</option><option>口语</option></select>') + field("完成日期", '<input name="date" type="date" required>') + field("训练任务", '<input name="task" required placeholder="例如：完成剑雅 18 Test 1 阅读">') + field("验收标准", '<input name="target" required placeholder="例如：正确率 80%">') + '<button class="primary" type="submit">添加训练计划</button></form><div class="compact-list">' + (plans.length ? plans.map(item => '<div class="compact-row"><span><strong>' + escapeHTML(item.skill + " · " + item.task) + '</strong><small>' + dateLabel(item.date) + ' · 验收：' + escapeHTML(item.target) + '</small></span><button class="ghost plan-toggle" type="button" data-id="' + item.id + '">' + (item.status === "done" ? "恢复" : "完成") + '</button></div>').join("") : '<p class="muted small">还没有专项计划。建议按听说读写拆成可验收的小任务。</p>') + '</div>';
  const form = document.querySelector("#englishPlanForm"); form.addEventListener("submit", event => { event.preventDefault(); const next = getState(); if (!addEnglishPlan(next, { skill: form.elements.skill.value, date: form.elements.date.value, task: form.elements.task.value, target: form.elements.target.value })) { toast("请填写日期、训练任务和验收标准。"); return; } saveState(next); toast("英语训练计划已添加，并同步到总计划。"); render(next); });
  document.querySelectorAll(".plan-toggle").forEach(button => button.addEventListener("click", event => { const next = getState(); if (toggleEnglishPlan(next, event.currentTarget.dataset.id)) { saveState(next); render(next); } }));
}

function renderReview(state) {
  const mistakes = state.englishMistakes || [], active = mistakes.filter(item => item.status !== "mastered" && item.status !== "done").slice().sort((a, b) => String(a.nextReview || "0000").localeCompare(String(b.nextReview || "0000"))), mastered = mistakes.filter(item => item.status === "mastered" || item.status === "done"), box = document.querySelector("#englishReview"), today = localDateKey();
  const rows = active.length ? active.slice(0, 16).map(item => {
    const dueDate = item.nextReview || today, future = dueDate > today;
    const days = Math.ceil((new Date(dueDate + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
    const dueLabel = future ? days + " 天后复习" : days < 0 ? "逾期 " + Math.abs(days) + " 天" : "今日待复习";
    return '<div class="compact-row mistake-row" data-id="' + escapeHTML(item.id) + '"><span><strong>' + escapeHTML(item.skill + " · " + item.item) + '</strong><small>' + escapeHTML((item.reason || "未记录原因") + " · " + dueLabel + " · 连续掌握 " + (Number(item.reviewStreak) || 0) + " 轮") + '</small></span><span class="mistake-actions"><button class="ghost english-mistake-again" data-id="' + escapeHTML(item.id) + '" type="button" ' + (future ? "disabled" : "") + '>还不会</button><button class="primary english-mistake-mastered" data-id="' + escapeHTML(item.id) + '" type="button" ' + (future ? "disabled" : "") + '>掌握了</button></span></div>';
  }).join("") : '<p class="muted small">今天没有到期的英语错题。新错题会按 1、3、7、14 天间隔复习。</p>';
  const archive = mastered.length ? '<details class="mistake-mastered-list"><summary>已掌握 / 旧版已完成英语错题 ' + mastered.length + ' 项</summary><div class="compact-list">' + mastered.slice().reverse().slice(0, 16).map(item => '<div class="compact-row is-done"><span><strong>' + escapeHTML(item.skill + " · " + item.item) + '</strong><small>' + escapeHTML(item.masteredAt ? "掌握于 " + dateLabel(item.masteredAt) : "旧版完成记录") + '</small></span><button class="ghost english-mistake-reopen" data-id="' + escapeHTML(item.id) + '" type="button">重新复习</button></div>').join("") + '</div></details>' : "";
  box.innerHTML = '<form id="englishMistakeForm" class="module-form-grid">' + field("技能", '<select name="skill"><option>听力</option><option>阅读</option><option>写作</option><option>口语</option><option>词汇</option></select>') + field("问题", '<input name="item" required placeholder="例如：Section 2 地图题定位">') + field("原因", '<input name="reason" required placeholder="词义 / 逻辑 / 语法 / 表达">') + field("下次复习", '<input name="nextReview" type="date" value="' + today + '">') + '<button class="primary" type="submit">加入复习</button></form><p class="muted small mistake-review-guide">点“掌握了”进入 1、3、7、14 天间隔；“还不会”则次日重练。到期前按钮不可点。</p><div class="compact-list">' + rows + '</div>' + archive;
  const form = document.querySelector("#englishMistakeForm");
  form.addEventListener("submit", event => { event.preventDefault(); const next = getState(); next.englishMistakes = next.englishMistakes || []; next.englishMistakes.push({ id: Date.now(), skill: form.elements.skill.value, item: form.elements.item.value.trim(), reason: form.elements.reason.value.trim(), nextReview: form.elements.nextReview.value || today, reviewCount: 0, reviewStreak: 0, status: "pending" }); saveState(next); toast("英语复习项已保存。"); render(next); });
  box.querySelectorAll(".english-mistake-mastered, .english-mistake-again").forEach(button => button.addEventListener("click", event => { const next = getState(), item = (next.englishMistakes || []).find(row => String(row.id) === event.currentTarget.dataset.id); if (!item) return; applyEnglishMistakeReview(item, event.currentTarget.classList.contains("english-mistake-again") ? "again" : "mastered"); saveState(next); toast(item.status === "mastered" ? "已掌握：英语复习项已归档。" : "下次复习 " + dateLabel(item.nextReview)); render(next); }));
  box.querySelectorAll(".english-mistake-reopen").forEach(button => button.addEventListener("click", event => { const next = getState(), item = (next.englishMistakes || []).find(row => String(row.id) === event.currentTarget.dataset.id); if (!item) return; item.status = "pending"; item.reviewStreak = 0; item.masteredAt = null; item.nextReview = today; saveState(next); toast("英语复习项已放回今日队列。"); render(next); }));
}

function renderHistory(state) { const entries = Object.entries(state.englishLogs || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10); document.querySelector("#englishHistory").innerHTML = entries.length ? entries.map(([date, item]) => '<div class="record"><div><strong>' + date + '</strong><small>词汇 ' + Number(item.words || 0) + ' · ' + escapeHTML(item.source || "") + ' · 听力 ' + Number(item.listening || 0) + ' 篇</small></div><span class="record-tag">阅读 ' + Number(item.reading || 0) + '% · 写作 ' + Number(item.writing || 0) + ' · 口语 ' + Number(item.speaking || 0) + '</span></div>').join("") : '<p class="muted small">还没有记录。</p>'; }
function render(state = getState()) { renderSummary(state); renderReadingContent(state); renderDailyLog(state); renderPlans(state); renderReview(state); renderHistory(state); }
renderShell();
window.addEventListener("growth-state-change", event => render(event.detail));
