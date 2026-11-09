function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function safeHttpUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function dateKey(date = new Date()) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }
function field(label, input) { return '<label>' + label + input + '</label>'; }
const SKILLS = ["Python", "Excel", "SQL", "金融数据分析"];
const PROJECT_PROMPTS = [
  { id: "econ-python", skill: "Python", title: "经济学数据分析复现", source: "https://github.com/aeturrell/coding-for-economists", description: "用公开宏观或金融数据完成清洗、描述统计和一张可解释图表。", nextAction: "选一个指标，写出数据来源、时间范围和 3 个字段定义。" },
  { id: "stock-data", skill: "金融数据分析", title: "A 股公告与行情观察", source: "https://github.com/simonlin1212/a-stock-data", description: "围绕行情、公告或财务数据做一个可复现的观察面板。", nextAction: "先确定一个行业和一个研究问题，避免一开始做大而全。" },
  { id: "fin-news", skill: "Python", title: "金融新闻关键词与主题分析", source: "https://github.com/DemonDamon/FinnewsHunter", description: "从公开新闻标题中提取关键词，比较不同主题的出现频率和时间变化。", nextAction: "建立标题数据表，保留日期、来源、标题和主题字段。" },
  { id: "excel-sales", skill: "Excel", title: "交易流水透视与可视化", source: "https://github.com/lerocha/chinook-database", description: "用公开的虚构交易数据练习常用公式、分类汇总、数据透视表和收入趋势图。", nextAction: "先检查字段、日期和金额格式，再汇总月收入与客户贡献。" },
  { id: "sql-finance", skill: "SQL", title: "交易数据 SQL 分析", source: "https://github.com/lerocha/chinook-database", description: "用客户、发票和商品等关联表练习 JOIN、聚合、窗口函数和收入分析。", nextAction: "先看数据模型，写出表粒度、主键与外键，再查询月度收入。" }
];
const SKILL_PATHS = {
  Python: [
    ["读取并检查一份表格数据", "使用 pandas 读取 CSV，检查行列数、字段类型和缺失概况。", 45],
    ["清洗缺失值、重复行和字段类型", "保留清洗规则，记录每一步对样本量的影响。", 50],
    ["按业务维度做描述统计", "用 groupby、聚合和排序回答一个具体问题。", 50],
    ["制作一张可解释的数据图", "选择合适图形，标注单位、时间范围和数据来源。", 50],
    ["整理可重跑的 Notebook 与 README", "从干净环境运行一次，并说明数据获取、运行命令和限制。", 60]
  ],
  Excel: [
    ["整理原始表格与数据格式", "转换为结构化表格，检查日期、金额、空行和重复值。", 40],
    ["练习条件计算与汇总公式", "使用 IF、SUMIFS、COUNTIFS，并用小样本手工核对结果。", 45],
    ["练习查找、文本与日期处理", "用查找函数关联字段，处理文本和日期格式。", 45],
    ["制作数据透视表与图表", "按月份、类别或客户分组，核对总计后制作图表。", 50],
    ["搭建小型经营分析看板", "加入关键指标、筛选器、口径说明和异常检查。", 60]
  ],
  SQL: [
    ["掌握 SELECT、WHERE 与排序", "从单表查询开始，筛选时间、类别和金额范围。", 40],
    ["练习分组聚合与条件统计", "使用 GROUP BY、聚合函数和 CASE WHEN 计算指标。", 45],
    ["理解表粒度并完成 JOIN", "先写清主键、外键和一对多关系，再做关联并检查行数。", 50],
    ["使用 CTE 与窗口函数", "完成排名、分组内比较或滚动指标，并解释排序口径。", 60],
    ["回答一个可复核的业务问题", "保存 SQL、结果核对方法、字段口径和结论边界。", 50]
  ],
  金融数据分析: [
    ["把兴趣写成可回答的问题", "明确分析对象、指标、比较维度和结论的使用场景。", 45],
    ["选择公开数据并写数据字典", "核对来源、许可、时间范围、字段口径和样本覆盖。", 45],
    ["完成清洗与数据质量检查", "检查缺失、重复、极值、单位和时间频率。", 60],
    ["做分组/时间比较并可视化", "先给出描述性结果，避免把相关性误写成因果关系。", 60],
    ["写结论、限制与复现说明", "让读者能追溯数据、指标、代码和关键判断。", 60]
  ]
};
const PROJECT_REPRO_STEPS = [
  "明确研究/业务问题与验收口径",
  "确认公开数据来源与使用许可",
  "清洗数据、定义字段并检查质量",
  "完成分析并复核关键结果",
  "整理 README、环境与复现步骤"
];
function skillPathState(state) { state.skillPaths = state.skillPaths || {}; return state.skillPaths; }
function skillPathStepId(skill, index) { return "skill-path:" + skill + ":" + index; }
function completedSkillSteps(state, skill) { const paths = skillPathState(state), count = SKILL_PATHS[skill]?.length || 0; return Math.max(0, Math.min(count, Math.floor(Number(paths[skill]?.completed) || 0))); }
function addSkillPathTask(state, skill) {
  const steps = SKILL_PATHS[skill], index = completedSkillSteps(state, skill);
  if (!steps || index >= steps.length) return false;
  state.tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const skillPathId = skillPathStepId(skill, index);
  if (state.tasks.some(task => task.skillPathId === skillPathId && !["done", "cancelled"].includes(task.status))) return false;
  const [title, detail, minutes] = steps[index];
  state.tasks.push({ id: Date.now() + Math.random(), title: skill + " · " + title, goal: "技能", priority: 4, estimatedMinutes: minutes, actualMinutes: 0, plannedDate: null, status: "active", portable: true, skillPathId, detail });
  return true;
}
function completeSkillPathStep(state, skill) {
  const steps = SKILL_PATHS[skill], index = completedSkillSteps(state, skill);
  if (!steps || index >= steps.length) return false;
  const skillPathId = skillPathStepId(skill, index), paths = skillPathState(state);
  paths[skill] = { ...(paths[skill] || {}), completed: index + 1 };
  for (const task of state.tasks || []) if (task.skillPathId === skillPathId && !["done", "cancelled"].includes(task.status)) task.status = "done";
  return true;
}
function recordSkillLog(state, entry) {
  const minutes = Math.max(1, Number(entry.minutes) || 0), topic = String(entry.topic || "").trim();
  if (!topic || !entry.skill) return false;
  state.skillLogs = Array.isArray(state.skillLogs) ? state.skillLogs : [];
  state.skillLogs.push({ id: Date.now(), date: entry.date || dateKey(), skill: entry.skill, minutes, topic, output: String(entry.output || "").trim() });
  return true;
}
function projectWorkflow(item) {
  if (!Array.isArray(item.workflow)) return null;
  return item.workflow.map((step, index) => typeof step === "string" ? { title: step, done: false } : { title: String(step?.title || PROJECT_REPRO_STEPS[index] || "复现步骤"), done: Boolean(step?.done) });
}
function projectProgress(item) {
  const workflow = projectWorkflow(item);
  if (!workflow?.length) return Math.max(0, Math.min(100, Number(item.progress) || 0));
  const base = Math.max(0, Math.min(100, Number(item.workflowBaseProgress) || 0));
  const complete = workflow.filter(step => step.done).length;
  return Math.round(base + (100 - base) * complete / workflow.length);
}
function enableProjectWorkflow(state, projectId) {
  const project = (state.projects || []).find(item => String(item.id) === String(projectId));
  if (!project) return false;
  if (!Array.isArray(project.workflow)) {
    project.workflowBaseProgress = Math.max(0, Math.min(100, Number(project.progress) || 0));
    project.workflow = PROJECT_REPRO_STEPS.map(title => ({ title, done: false }));
  }
  return true;
}
function toggleProjectWorkflowStep(state, projectId, stepIndex) {
  const project = (state.projects || []).find(item => String(item.id) === String(projectId)), workflow = project && projectWorkflow(project);
  if (!project || !workflow || !Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= workflow.length) return false;
  workflow[stepIndex].done = !workflow[stepIndex].done;
  project.workflow = workflow;
  const complete = workflow.filter(step => step.done).length;
  project.progress = projectProgress(project);
  if (complete === workflow.length) project.status = "已完成";
  else if (complete > 0 || project.status === "已完成") project.status = "复现中";
  return true;
}
function addProjectActivity(state, projectId, entry) {
  const project = (state.projects || []).find(item => String(item.id) === String(projectId));
  const content = String(entry.content || "").trim();
  if (!project || !content) return false;
  project.activityLog = Array.isArray(project.activityLog) ? project.activityLog : [];
  project.activityLog.push({ id: Date.now() + Math.random(), date: entry.date || dateKey(), content, output: String(entry.output || "").trim(), nextAction: String(entry.nextAction || "").trim() });
  if (entry.nextAction !== undefined) project.nextAction = String(entry.nextAction || "").trim();
  return true;
}
function renderShell() { renderSimplePage({ cards: [
  { id: "skillsSummary", eyebrow: "PORTFOLIO STATUS", title: "作品集总览" },
  { id: "skillToday", eyebrow: "PROJECT STUDIO", title: "今日作品集任务" },
  { id: "skillPathRows", eyebrow: "LEARNING PATHS", title: "技能学习路径" },
  { id: "skillRows", eyebrow: "SKILL TRACK", title: "技能完成度" },
  { id: "skillLogBox", eyebrow: "LEARNING LOG", title: "技能学习记录" },
  { id: "projectRows", eyebrow: "PROJECTS", title: "项目作品集" }
], render() { render(getState()); } }); }
function renderTodayProject(state) {
  const start = new Date(2026, 0, 1), day = Math.floor((new Date().setHours(0, 0, 0, 0) - start.getTime()) / 86400000), prompt = PROJECT_PROMPTS[((day % PROJECT_PROMPTS.length) + PROJECT_PROMPTS.length) % PROJECT_PROMPTS.length];
  const existing = (state.projects || []).find(item => item.templateId === prompt.id);
  document.querySelector("#skillToday").innerHTML = '<div class="project-prompt"><div><span class="record-tag">' + escapeHTML(prompt.skill) + '</span><h4>' + escapeHTML(prompt.title) + '</h4><p>' + escapeHTML(prompt.description) + '</p><p class="muted small"><b>下一步：</b>' + escapeHTML(prompt.nextAction) + '</p><a href="' + prompt.source + '" target="_blank" rel="noreferrer">查看开源参考 ↗</a></div><button class="ghost" id="addPromptProject" type="button" ' + (existing ? "disabled" : "") + '>' + (existing ? (existing.status === "已完成" ? "模板项目已完成" : "已加入项目") : "加入作品集") + '</button></div>';
  document.querySelector("#addPromptProject").addEventListener("click", () => { const next = getState(); next.projects = next.projects || []; next.projects.push({ id: Date.now(), templateId: prompt.id, title: prompt.title, skill: prompt.skill, status: "构思", progress: 0, workflowBaseProgress: 0, workflow: PROJECT_REPRO_STEPS.map(title => ({ title, done: false })), url: "", description: prompt.description, nextAction: prompt.nextAction, referenceUrl: prompt.source }); saveState(next); toast("作品集项目已建立，复现清单也已就绪。"); render(next); });
}
function renderSummary(state) {
  const projects = state.projects || [], logs = state.skillLogs || [], completed = projects.filter(item => item.status === "已完成").length, linked = projects.filter(item => item.url).length, hours = Math.round(logs.reduce((sum, item) => sum + Number(item.minutes || 0), 0) / 60 * 10) / 10, pathTotal = Object.values(SKILL_PATHS).reduce((sum, steps) => sum + steps.length, 0), pathDone = Object.keys(SKILL_PATHS).reduce((sum, skill) => sum + completedSkillSteps(state, skill), 0);
  document.querySelector("#skillsSummary").innerHTML = '<div class="exam-metrics">' + ['<div class="exam-metric"><strong>' + projects.length + '</strong><span>项目总数</span></div>', '<div class="exam-metric"><strong>' + completed + '</strong><span>已完成项目</span></div>', '<div class="exam-metric"><strong>' + linked + '</strong><span>已有链接</span></div>', '<div class="exam-metric"><strong>' + hours + ' h</strong><span>学习投入</span></div>', '<div class="exam-metric"><strong>' + logs.length + '</strong><span>学习记录</span></div>'].join("") + '</div><p class="muted small">项目完成率 ' + (projects.length ? Math.round(completed / projects.length * 100) : 0) + '% · 技能路径 ' + pathDone + '/' + pathTotal + ' 个阶段完成。加入计划的下一步会进入总览/明日候选计划，不会一次性塞入整条路线。</p>';
}
function renderSkillPaths(state) {
  const activeTasks = state.tasks || [], box = document.querySelector("#skillPathRows");
  box.innerHTML = '<p class="muted small">每个技能只把当前下一步加入总计划；按每周约 3 天的技能学习节奏，再由 23:00 明日计划确认决定安排。完成阶段后才解锁下一步。</p>' + Object.entries(SKILL_PATHS).map(([skill, steps]) => {
    const completed = completedSkillSteps(state, skill), step = steps[completed], taskId = skillPathStepId(skill, completed), task = step && activeTasks.find(item => item.skillPathId === taskId && !["done", "cancelled"].includes(item.status)), percent = Math.round(completed / steps.length * 100);
    return '<div class="skill-path-card"><div class="skill-path-head"><span><strong>' + escapeHTML(skill) + '</strong><small>' + completed + '/' + steps.length + ' 个阶段</small></span><b>' + percent + '%</b></div><div class="metric-bar"><i style="width:' + percent + '%"></i></div>' + (step ? '<div class="skill-path-next"><strong>下一步：' + escapeHTML(step[0]) + '</strong><small>' + escapeHTML(step[1]) + ' · 约 ' + step[2] + ' 分钟</small><div class="module-actions"><button class="ghost skill-task-add" data-skill="' + escapeHTML(skill) + '" type="button" ' + (task ? 'disabled' : '') + '>' + (task ? '已加入总计划' : '加入总计划') + '</button><button class="ghost skill-step-complete" data-skill="' + escapeHTML(skill) + '" type="button">完成本阶段</button></div></div>' : '<p class="muted small">这条基础路径已完成；可以通过项目复现继续加深。</p>') + '</div>';
  }).join("");
  box.querySelectorAll(".skill-task-add").forEach(button => button.addEventListener("click", event => { const next = getState(), added = addSkillPathTask(next, event.currentTarget.dataset.skill); if (added) saveState(next); toast(added ? "下一步已加入总计划。" : "当前阶段已加入或这条路径已完成。"); render(getState()); }));
  box.querySelectorAll(".skill-step-complete").forEach(button => button.addEventListener("click", event => { const next = getState(), completed = completeSkillPathStep(next, event.currentTarget.dataset.skill); if (completed) saveState(next); toast(completed ? "阶段已完成，下一步已解锁。" : "这条路径已经完成。"); render(getState()); }));
}
function renderSkillRows(state) {
  const projects = state.projects || [], logs = state.skillLogs || [];
  document.querySelector("#skillRows").innerHTML = SKILLS.map(skill => { const items = projects.filter(item => item.skill === skill), skillLogs = logs.filter(item => item.skill === skill), progress = Math.round(completedSkillSteps(state, skill) / (SKILL_PATHS[skill]?.length || 1) * 100), minutes = skillLogs.reduce((sum, item) => sum + Number(item.minutes || 0), 0); return '<div class="metric-row"><span>' + escapeHTML(skill) + '<small class="skill-detail">' + completedSkillSteps(state, skill) + '/' + (SKILL_PATHS[skill]?.length || 0) + ' 学习阶段 · ' + items.length + ' 项目 · ' + Math.round(minutes / 60 * 10) / 10 + ' h</small></span><span class="metric-bar"><i style="width:' + progress + '%"></i></span><b>' + progress + '%</b></div>'; }).join("");
}
function renderLogBox(state) {
  const logs = (state.skillLogs || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))), box = document.querySelector("#skillLogBox");
  box.innerHTML = '<form id="skillLogForm" class="module-form-grid">' + field("日期", '<input name="date" type="date" value="' + dateKey() + '">') + field("技能", '<select name="skill">' + SKILLS.map(skill => '<option>' + skill + '</option>').join("") + '</select>') + field("用时（分钟）", '<input name="minutes" type="number" min="1" required placeholder="例如：45">') + field("学习内容", '<input name="topic" required placeholder="例如：SQL JOIN 与聚合">') + field("产出 / 下一步", '<input name="output" placeholder="笔记、代码、图表或明天继续什么">') + '<button class="primary" type="submit">记录学习</button></form><div class="compact-list">' + (logs.length ? logs.slice(0, 10).map(item => '<div class="compact-row"><span><strong>' + escapeHTML(item.date) + ' · ' + escapeHTML(item.skill) + '</strong><small>' + escapeHTML(item.topic) + ' · ' + escapeHTML(item.output || "") + '</small></span><b>' + Number(item.minutes || 0) + 'm</b></div>').join("") : '<p class="muted small">还没有学习记录。</p>') + '</div>';
  document.querySelector("#skillLogForm").addEventListener("submit", event => { event.preventDefault(); const next = getState(), form = event.currentTarget; const saved = recordSkillLog(next, { date: form.elements.date.value, skill: form.elements.skill.value, minutes: form.elements.minutes.value, topic: form.elements.topic.value, output: form.elements.output.value }); if (!saved) { toast("请填写学习内容后再保存。"); return; } saveState(next); toast("技能学习记录已保存。"); render(next); });
}
function renderProjects(state) {
  const projects = state.projects || [], box = document.querySelector("#projectRows");
  box.innerHTML = '<form id="projectForm" class="module-form-grid">' + field("项目名称", '<input name="title" required placeholder="金融数据分析 / AI+金融项目">') + field("技能方向", '<select name="skill">' + SKILLS.map(skill => '<option>' + escapeHTML(skill) + '</option>').join("") + '</select>') + field("项目状态", '<select name="status"><option>构思</option><option>学习中</option><option>复现中</option><option>已完成</option></select>') + field("GitHub / 项目链接", '<input name="url" type="url" placeholder="https://github.com/...">') + field("作品说明", '<input name="description" placeholder="问题、数据来源和方法">') + field("下一行动", '<input name="nextAction" placeholder="例如：补 README 和结果图">') + '<button class="primary" type="submit">添加项目</button></form><div class="project-list">' + (projects.length ? projects.slice().reverse().map(item => {
    const workflow = projectWorkflow(item), safeUrl = safeHttpUrl(item.url), referenceUrl = safeHttpUrl(item.referenceUrl), progress = projectProgress(item), completed = workflow ? workflow.filter(step => step.done).length : null;
    const steps = workflow ? '<div class="project-checklist">' + workflow.map((step, index) => '<button class="project-step-toggle' + (step.done ? ' is-complete' : '') + '" data-project-id="' + escapeHTML(item.id) + '" data-step-index="' + index + '" type="button" aria-pressed="' + step.done + '"><span>' + (step.done ? '✓' : '○') + '</span>' + escapeHTML(step.title) + '</button>').join("") + '</div>' : '<p class="muted small">此旧项目还没有复现清单；启用后会保留现有进度作为基线。</p><button class="ghost project-init-workflow" data-project-id="' + escapeHTML(item.id) + '" type="button">添加复现清单</button>';
    const activities = Array.isArray(item.activityLog) ? item.activityLog.slice().reverse() : [];
    const activityPanel = '<details class="project-activity"><summary>项目过程记录 · ' + activities.length + ' 条</summary>' + (activities.length ? '<div class="project-activity-list">' + activities.slice(0, 10).map(log => '<div class="project-activity-entry"><strong>' + escapeHTML(log.date || "日期未填") + ' · ' + escapeHTML(log.content) + '</strong>' + (log.output ? '<small>产出：' + escapeHTML(log.output) + '</small>' : '') + (log.nextAction ? '<small>下一步：' + escapeHTML(log.nextAction) + '</small>' : '') + '</div>').join("") + '</div>' : '<p class="muted small">记下做了什么、得到什么，以及下一步要验证什么。</p>') + '<form class="project-activity-form" data-project-id="' + escapeHTML(item.id) + '"><label>日期<input name="date" type="date" value="' + dateKey() + '"></label><label>本次推进<input name="content" required placeholder="例如：完成月份字段清洗并核对缺失值"></label><label>产出<input name="output" placeholder="代码、图表、结论或提交记录"></label><label>下一步<input name="nextAction" value="' + escapeHTML(item.nextAction || "") + '" placeholder="例如：补数据字典并检查异常值"></label><button class="ghost" type="submit">保存项目记录</button></form></details>';
    return '<article class="project-card"><div class="project-card-head"><span><strong>' + (safeUrl ? '<a href="' + escapeHTML(safeUrl) + '" target="_blank" rel="noreferrer">' + escapeHTML(item.title) + '</a>' : escapeHTML(item.title)) + '</strong><small>' + escapeHTML(item.skill || "") + ' · ' + escapeHTML(item.status || "构思") + (workflow ? ' · 清单 ' + completed + '/' + workflow.length : '') + ' · 过程记录 ' + activities.length + ' 条</small></span><b>' + progress + '%</b></div><div class="metric-bar"><i style="width:' + progress + '%"></i></div><p>' + escapeHTML(item.description || item.nextAction || "尚未填写项目说明") + (referenceUrl ? ' · <a href="' + escapeHTML(referenceUrl) + '" target="_blank" rel="noreferrer">开源参考 ↗</a>' : '') + '</p>' + steps + activityPanel + '<div class="project-card-foot"><small>' + (item.nextAction ? '下一行动：' + escapeHTML(item.nextAction) : workflow && completed < workflow.length ? '建议下一步：' + escapeHTML(workflow.find(step => !step.done)?.title || "继续复现") : "") + '</small><button class="ghost project-delete" data-id="' + escapeHTML(item.id) + '" type="button" aria-label="删除项目">删除</button></div></article>';
  }).join("") : '<p class="muted small">还没有项目，先添加一个想复现或构建的金融数据分析项目。</p>') + '</div>';
  document.querySelector("#projectForm").addEventListener("submit", event => { event.preventDefault(); const next = getState(), form = event.currentTarget; next.projects = next.projects || []; next.projects.push({ id: Date.now(), title: form.elements.title.value.trim(), skill: form.elements.skill.value, status: form.elements.status.value, progress: 0, workflowBaseProgress: 0, workflow: PROJECT_REPRO_STEPS.map(title => ({ title, done: false })), url: safeHttpUrl(form.elements.url.value.trim()), description: form.elements.description.value.trim(), nextAction: form.elements.nextAction.value.trim() }); saveState(next); toast("项目已添加，复现清单已建立。"); render(next); });
  box.querySelectorAll(".project-init-workflow").forEach(button => button.addEventListener("click", event => { const next = getState(), enabled = enableProjectWorkflow(next, event.currentTarget.dataset.projectId); if (enabled) saveState(next); toast(enabled ? "复现清单已建立，旧进度已保留为基线。" : "未找到项目。"); render(getState()); }));
  box.querySelectorAll(".project-step-toggle").forEach(button => button.addEventListener("click", event => { const next = getState(), index = Number(event.currentTarget.dataset.stepIndex), updated = toggleProjectWorkflowStep(next, event.currentTarget.dataset.projectId, index); if (updated) saveState(next); toast(updated ? "复现步骤已更新。" : "没有找到该复现步骤。"); render(getState()); }));
  box.querySelectorAll(".project-activity-form").forEach(form => form.addEventListener("submit", event => { event.preventDefault(); const currentForm = event.currentTarget, next = getState(); const added = addProjectActivity(next, currentForm.dataset.projectId, { date: currentForm.elements.date.value, content: currentForm.elements.content.value, output: currentForm.elements.output.value, nextAction: currentForm.elements.nextAction.value }); if (!added) { toast("请先写下本次推进内容。"); return; } saveState(next); toast("项目过程记录已保存，下一行动已更新。"); render(next); }));
  box.querySelectorAll(".project-delete").forEach(button => button.addEventListener("click", event => { const next = getState(); next.projects = (next.projects || []).filter(item => String(item.id) !== event.currentTarget.dataset.id); saveState(next); toast("项目已删除。"); render(next); }));
}
function render(state = getState()) { renderSummary(state); renderTodayProject(state); renderSkillPaths(state); renderSkillRows(state); renderLogBox(state); renderProjects(state); }
renderShell();
window.addEventListener("growth-state-change", event => render(event.detail));
