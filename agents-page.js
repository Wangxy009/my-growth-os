function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function dateKey(date = new Date()) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }
const DEFAULT_AGENTS = [{ id: "lead", name: "总览统筹", scope: "拆解目标、检查冲突、生成下一步" }, { id: "exam", name: "考研教练", scope: "科目、刷题、错题与阶段计划" }, { id: "english", name: "英语教练", scope: "雅思训练、复盘与词汇" }, { id: "research", name: "科研助手", scope: "文献、研究设计与写作流程" }, { id: "skills", name: "技能与求职", scope: "Python、Excel、SQL 与作品集" }, { id: "health", name: "健康管家", scope: "运动、饮食与恢复记录" }, { id: "news", name: "新闻研究员", scope: "时政、财经和外刊收集" }];
const CHAT_PROPOSAL_TYPES = new Set(["english_log", "skill_log", "research_log"]);
let chatHistory = [];
let aiStatusChecked = false;
let aiStatusLoading = false;
function ensureAgents(state) { if (!Array.isArray(state.agents) || !state.agents.length) state.agents = DEFAULT_AGENTS.map(item => ({ ...item, enabled: true })); if (!Array.isArray(state.agentLogs)) state.agentLogs = []; return state; }
function metric(label, value) { return '<div class="exam-metric"><strong>' + value + '</strong><span>' + label + '</span></div>'; }
function renderShell() { renderSimplePage({ cards: [{ id: "agentSummary", eyebrow: "ORCHESTRATION", title: "Agent 总览" }, { id: "agentChat", eyebrow: "AI ASSISTANT", title: "学习与进度助手" }, { id: "agentRoster", eyebrow: "TEAM", title: "Agent 团队" }, { id: "agentSync", eyebrow: "NATURAL SYNC", title: "规则式进度同步" }, { id: "agentActivity", eyebrow: "ACTIVITY", title: "同步日志" }], render() { render(getState()); } }); }
function renderSummary(state) { const enabled = state.agents.filter(item => item.enabled !== false).length, today = state.agentLogs.filter(item => item.date === dateKey()).length, synced = state.agentLogs.filter(item => item.result && item.result !== "仅记录日志").length; document.querySelector("#agentSummary").innerHTML = '<div class="exam-metrics">' + metric("启用 Agent", enabled) + metric("团队人数", state.agents.length) + metric("今日同步", today) + metric("已结构化", synced) + metric("日志总数", state.agentLogs.length) + '</div><p class="muted small">总览统筹负责把各模块的新增记录汇总到同一份状态数据中；重大计划和对外提交仍由你确认。</p>'; }
function renderRoster(state) { document.querySelector("#agentRoster").innerHTML = '<div class="agent-roster">' + state.agents.map(item => '<div class="agent-card ' + (item.enabled === false ? "disabled" : "") + '"><div><strong>' + escapeHTML(item.name) + '</strong><small>' + escapeHTML(item.scope) + '</small></div><button class="ghost agent-toggle" data-id="' + escapeHTML(item.id) + '" type="button">' + (item.enabled === false ? "启用" : "停用") + '</button></div>').join("") + '</div>'; document.querySelectorAll(".agent-toggle").forEach(button => button.addEventListener("click", event => { const next = ensureAgents(getState()), item = next.agents.find(row => row.id === event.currentTarget.dataset.id); if (item) item.enabled = item.enabled === false; saveState(next); render(next); })); }
function subjectOptions(state) { return (state.exams || []).map(item => '<option value="' + item.id + '">' + escapeHTML(item.subject + " · " + item.track) + '</option>').join(""); }
function applySync(state, agentId, text, examId) {
  const clean = text.trim(), date = dateKey(), agent = state.agents.find(item => item.id === agentId), results = [];
  state.agentLogs.push({ id: Date.now(), date, agentId, content: clean, result: "仅记录日志" });
  const vocab = clean.match(/(?:雅思|英语)?.{0,4}词汇\s*(\d+)\s*个?/i);
  if (vocab) { state.englishLogs = state.englishLogs || {}; const current = state.englishLogs[date] || { words: 0, listening: 0, reading: 0, writing: 0, speaking: 0, target: 7 }; current.words = Math.max(Number(current.words || 0), Number(vocab[1])); current.source = current.source || "自然语言同步"; state.englishLogs[date] = current; results.push("雅思词汇 " + vocab[1] + " 个"); }
  const practice = clean.match(/刷题\s*(\d+)\s*题(?:.*?(?:对|正确)\s*(\d+))?/i);
  if (practice) { const subject = (state.exams || []).find(item => String(item.id) === String(examId)) || state.exams?.[0]; state.examPracticeLogs = state.examPracticeLogs || []; state.examPracticeLogs.push({ id: Date.now() + 1, date, examId: subject?.id, track: subject?.track || "", subject: subject?.subject || "", questions: Number(practice[1]), correct: Math.min(Number(practice[1]), Number(practice[2] || 0)), minutes: 0, note: "Agent 自然语言同步" }); results.push("刷题 " + practice[1] + " 题"); }
  const skill = clean.match(/(?:学习|完成)\s*(Python|Excel|SQL).*?(\d+)\s*分钟/i);
  if (skill) { state.skillLogs = state.skillLogs || []; state.skillLogs.push({ id: Date.now() + 2, date, skill: skill[1], minutes: Number(skill[2]), topic: "Agent 自然语言同步", output: clean }); results.push(skill[1] + " " + skill[2] + " 分钟"); }
  const task = clean.match(/完成任务[:：]?\s*(.+)$/i);
  if (task) { const found = (state.tasks || []).find(item => item.status !== "done" && item.title.includes(task[1].trim())); if (found) { found.status = "done"; found.completedAt = new Date().toISOString(); results.push("任务已完成：" + found.title); } }
  const log = state.agentLogs[state.agentLogs.length - 1]; log.result = results.length ? results.join("；") : "仅记录日志"; log.agentName = agent?.name || agentId; return results;
}
function renderSync(state) { const box = document.querySelector("#agentSync"); box.innerHTML = '<form id="agentSyncForm" class="module-form-grid"><label>负责 Agent<select name="agentId">' + state.agents.filter(item => item.enabled !== false).map(item => '<option value="' + item.id + '">' + escapeHTML(item.name) + '</option>').join("") + '</select></label><label>刷题科目（可选）<select name="examId"><option value="">默认第一门科目</option>' + subjectOptions(state) + '</select></label><label class="agent-message-field">进度描述<textarea name="content" rows="4" required placeholder="例如：今天完成雅思词汇100个；学习Python 60分钟；刷题20题对18题"></textarea></label><button class="primary" type="submit">同步到数据面板</button></form><p class="muted small">目前支持词汇、刷题、Python/Excel/SQL 学习时长和任务完成的本地结构化同步，其余内容会保留为 Agent 日志。</p>'; document.querySelector("#agentSyncForm").addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget, next = ensureAgents(getState()), results = applySync(next, form.elements.agentId.value, form.elements.content.value, form.elements.examId.value); saveState(next); toast(results.length ? "已同步：" + results.join("；") : "已保存为 Agent 日志。"); render(next); }); }
function aiProposalLabel(item) {
  if (item.type === "english_log") return "雅思记录" + (item.words !== undefined ? " · " + item.words + " 词" : "") + (item.listening !== undefined ? " · 听力 " + item.listening + " 篇" : "") + (item.reading !== undefined ? " · 阅读 " + item.reading + "%" : "") + (item.speaking !== undefined ? " · 口语 " + item.speaking + " 次" : "") + (item.writing !== undefined ? " · 写作 " + item.writing + " 次" : "");
  if (item.type === "skill_log") return item.skill + " · " + item.minutes + " 分钟 · " + item.topic;
  return "科研日志 · " + item.logType + " · " + item.content;
}
function sanitizeProposal(raw) {
  if (!raw || typeof raw !== "object" || !CHAT_PROPOSAL_TYPES.has(raw.type)) return null;
  const cleanText = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const finite = (value, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Math.floor(Number(value)))) : undefined;
  if (raw.type === "english_log") {
    const proposal = { type: raw.type };
    for (const key of ["words", "listening", "reading", "writing", "speaking"]) {
      if (raw[key] !== undefined) proposal[key] = finite(raw[key], 0, key === "reading" ? 100 : 1000);
    }
    proposal.note = cleanText(raw.note, 500);
    proposal.source = cleanText(raw.source, 80);
    return Object.keys(proposal).some(key => key !== "type" && proposal[key] !== undefined && proposal[key] !== "") ? proposal : null;
  }
  if (raw.type === "skill_log") {
    const skill = ["Python", "Excel", "SQL", "金融数据分析"].includes(raw.skill) ? raw.skill : "";
    const minutes = finite(raw.minutes, 1, 600), topic = cleanText(raw.topic, 200);
    return skill && minutes && topic ? { type: raw.type, skill, minutes, topic, output: cleanText(raw.output, 500) } : null;
  }
  const categories = ["问题", "方法", "数据", "写作", "与导师沟通"];
  const logType = categories.includes(raw.logType) ? raw.logType : "";
  const content = cleanText(raw.content, 1000);
  return logType && content ? { type: raw.type, logType, content } : null;
}
function parseAssistantAnswer(raw) {
  try {
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    if (start < 0 || end < start) return { reply: raw, proposals: [] };
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return { reply: typeof parsed.reply === "string" ? parsed.reply.slice(0, 8000) : raw, proposals: Array.isArray(parsed.proposals) ? parsed.proposals.map(sanitizeProposal).filter(Boolean).slice(0, 5) : [] };
  } catch { return { reply: raw, proposals: [] }; }
}
function applyAIProposal(proposal) {
  if (proposal.applied) return;
  const next = ensureAgents(getState()), today = dateKey();
  if (proposal.type === "english_log") {
    next.englishLogs = next.englishLogs || {};
    const current = next.englishLogs[today] || { words: 0, listening: 0, reading: 0, writing: 0, speaking: 0, target: 7 };
    for (const key of ["words", "listening", "reading", "writing", "speaking"]) if (proposal[key] !== undefined) current[key] = proposal[key];
    if (proposal.note) current.note = proposal.note;
    if (proposal.source) current.source = proposal.source;
    next.englishLogs[today] = current;
  } else if (proposal.type === "skill_log") {
    next.skillLogs = next.skillLogs || [];
    next.skillLogs.push({ id: Date.now(), date: today, skill: proposal.skill, minutes: proposal.minutes, topic: proposal.topic, output: proposal.output || "AI 建议，经用户确认" });
  } else if (proposal.type === "research_log") {
    const research = next.research = { direction: "", question: "", deadline: "2027-07-01", items: [], readings: [], logs: [], ...(next.research || {}) };
    research.logs = Array.isArray(research.logs) ? research.logs : [];
    research.logs.push({ id: Date.now(), date: today, type: proposal.logType, content: proposal.content });
  }
  saveState(next);
  proposal.applied = true;
  toast("已按你的确认写入数据面板。");
  render(next);
  renderChatMessages();
}
function renderChatMessages() {
  const box = document.querySelector("#agentChatMessages");
  if (!box) return;
  box.innerHTML = chatHistory.length ? chatHistory.map((entry, entryIndex) => '<article class="agent-chat-message ' + (entry.role === "user" ? "user" : "assistant") + '"><strong>' + (entry.role === "user" ? "你" : "学习助手") + '</strong><p>' + escapeHTML(entry.text) + '</p>' + (entry.proposals || []).map((proposal, proposalIndex) => '<div class="agent-proposal"><span>' + escapeHTML(aiProposalLabel(proposal)) + '</span><button class="ghost agent-proposal-apply" type="button" data-entry="' + entryIndex + '" data-proposal="' + proposalIndex + '" ' + (proposal.applied ? "disabled" : "") + '>' + (proposal.applied ? "已确认写入" : "确认写入") + '</button></div>').join("") + '</article>').join("") : '<p class="muted small">还没有对话。可以问学习安排、错题复盘、论文方法，或用自然语言汇报学习进度。</p>';
  box.querySelectorAll(".agent-proposal-apply").forEach(button => button.addEventListener("click", event => {
    const target = event.currentTarget, entry = chatHistory[Number(target.dataset.entry)], proposal = entry?.proposals?.[Number(target.dataset.proposal)];
    if (entry && proposal && !proposal.applied) applyAIProposal(proposal);
  }));
}
function renderAIChat() {
  const box = document.querySelector("#agentChat");
  box.innerHTML = '<p id="agentAIStatus" class="status-note">正在检查本地 AI 配置…</p><p class="muted small">对话暂存在此标签页，不写入活动日志；每次发送会附带最近 12 条对话。默认不附带档案中的学习数据，勾选后才会带上学习摘要。健康模块里的记录不会被读取，但你在对话里主动输入的内容会发送给配置的 AI 服务商。模型调用可能计费，请先确认服务商价格与额度。</p><label class="agent-context-consent"><input id="includeAIContext" type="checkbox">允许本次附带学习摘要（任务、英语、科研和项目概况）</label><div id="agentChatMessages" class="agent-chat-thread"></div><form id="agentChatForm" class="agent-chat-form"><textarea name="message" rows="3" maxlength="4000" required placeholder="例如：我今天做了 SQL 练习 45 分钟，帮我复盘并同步进度建议。"></textarea><div class="module-actions"><button class="primary" type="submit">发送给 AI</button><button class="ghost" id="checkAIConfig" type="button">检查配置</button></div></form><details class="agent-ai-setup"><summary>本机豆包 AI 接入说明</summary><p>打开项目文件夹里的 .env.local，填写火山方舟的 API Key 和豆包推理接入点 ID（通常以 ep- 开头）。默认接口地址已设为 https://ark.cn-beijing.volces.com/api/v3。API Key 在火山方舟控制台创建；不要把它填在网页里或发到聊天中。改完后重启本地服务器，再点“检查配置”。配置模板在项目目录的 .env.example。</p></details>';
  renderChatMessages();
  const updateStatus = payload => { const currentStatus = document.querySelector("#agentAIStatus"); if (currentStatus) currentStatus.textContent = payload.configured ? "AI 已配置 · " + payload.model : payload.error || "尚未配置 AI。按下方说明添加本机服务配置。"; };
  const checkButton = document.querySelector("#checkAIConfig");
  checkButton.addEventListener("click", () => { aiStatusChecked = false; checkAIService(); });
  document.querySelector("#agentChatForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget, message = form.elements.message.value.trim(), includeContext = document.querySelector("#includeAIContext").checked, button = form.querySelector("button[type=submit]");
    if (!message) return;
    chatHistory.push({ role: "user", text: message });
    renderChatMessages();
    form.elements.message.value = "";
    button.disabled = true;
    button.textContent = "思考中…";
    try {
      const context = includeContext ? JSON.stringify(buildLearningContext(getState())) : "";
      const history = chatHistory.slice(0, -1).slice(-12).map(item => ({ role: item.role, content: item.text }));
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, context, history }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI 请求失败。");
      const parsed = parseAssistantAnswer(result.answer || "AI 没有返回内容。");
      chatHistory.push({ role: "assistant", text: parsed.reply, proposals: parsed.proposals, model: result.model });
    } catch (error) { chatHistory.push({ role: "assistant", text: error.message || "AI 请求失败；请确认服务配置和本地服务器。", proposals: [] }); }
    finally { button.disabled = false; button.textContent = "发送给 AI"; renderChatMessages(); }
  });
  if (!aiStatusChecked && !aiStatusLoading) checkAIService(updateStatus); else if (aiStatusChecked) updateStatus(aiStatusChecked);
}
function buildLearningContext(state) {
  const today = dateKey(), tasks = (state.tasks || []).filter(item => item.status !== "done").slice(0, 12).map(item => ({ title: item.title, goal: item.goal, plannedDate: item.plannedDate, status: item.status }));
  const lastEnglish = Object.entries(state.englishLogs || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).map(([date, item]) => ({ date, words: item.words, listening: item.listening, reading: item.reading, speaking: item.speaking, writing: item.writing }));
  const research = state.research || {};
  return { date: today, activeTasks: tasks, examTracks: (state.exams || []).map(item => ({ subject: item.subject, track: item.track, stage: item.stage, progress: item.progress })), recentEnglish: lastEnglish, research: { direction: research.direction || "", question: research.question || "", deadline: research.deadline || "", unreadLiterature: (research.readings || []).filter(item => item.status !== "已读").length }, projects: (state.projects || []).slice(-8).map(item => ({ title: item.title, skill: item.skill, status: item.status, progress: item.progress, nextAction: item.nextAction })), note: "该摘要由用户单次授权发送；健康数据、个人身份信息、全文新闻和完整文献笔记均已排除。" };
}
async function checkAIService(onResult) {
  aiStatusLoading = true;
  try {
    const response = await fetch("/api/ai/status"), payload = await response.json();
    aiStatusChecked = payload;
    if (onResult) onResult(payload);
    else { const status = document.querySelector("#agentAIStatus"); if (status) status.textContent = payload.configured ? "AI 已配置 · " + payload.model : payload.error || "尚未配置 AI。按下方说明添加本机服务配置。"; }
  } catch {
    aiStatusChecked = { configured: false, error: "无法连接本地 AI 接口。请通过 http://127.0.0.1:4173 访问，并确认服务器正在运行。" };
    if (onResult) onResult(aiStatusChecked); else { const status = document.querySelector("#agentAIStatus"); if (status) status.textContent = aiStatusChecked.error; }
  } finally { aiStatusLoading = false; }
}
function renderActivity(state) { const logs = state.agentLogs.slice().reverse().slice(0, 12); document.querySelector("#agentActivity").innerHTML = logs.length ? logs.map(item => '<div class="compact-row"><span><strong>' + escapeHTML(item.agentName || item.agentId) + ' · ' + escapeHTML(item.date) + '</strong><small>' + escapeHTML(item.content) + '</small></span><b>' + escapeHTML(item.result || "仅记录日志") + '</b></div>').join("") : '<p class="muted small">还没有 Agent 活动日志。</p>'; }
function render(state = getState()) { state = ensureAgents(state); renderSummary(state); renderAIChat(); renderRoster(state); renderSync(state); renderActivity(state); }
renderShell();
window.addEventListener("growth-state-change", event => render(event.detail));
