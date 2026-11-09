const STORAGE_KEY = "my-growth-os-state-v2";

function readPlannerState() {
  if (window.GrowthOS) return GrowthOS.load();
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function writePlannerState(state) {
  if (window.GrowthOS) return GrowthOS.save(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function dateKey(date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function taskPriority(task) {
  if (Number.isFinite(Number(task.priority))) return Number(task.priority);
  return { "考研数学": 1, "考研": 1, "雅思": 2, "论文": 3, "技能": 4, "申请": 5 }[task.goal] || 6;
}

function candidateSignature(state, key) {
  return JSON.stringify((state.tasks || [])
    .filter(task => task.status !== "done" && task.status !== "cancelled" && (!task.plannedDate || task.plannedDate <= key))
    .map(task => [task.id, task.title, task.goal, task.estimatedMinutes, task.plannedDate, task.status, task.priority, task.portable])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

function buildCandidatePlan(state, date) {
  const key = dateKey(date);
  const courses = getScheduleForDate(date);
  const rows = courses.map(course => ({
    type: "course",
    time: course.periodLabel,
    title: course.name,
    detail: course.hardBlock ? "固定听课时间 · 不安排其他任务" : "其他课程时段 · 可安排学习",
    blocked: course.hardBlock
  }));
  const tasks = (state.tasks || [])
    .filter(task => task.status !== "done" && task.status !== "cancelled" && (!task.plannedDate || task.plannedDate <= key))
    .sort((a, b) => taskPriority(a) - taskPriority(b) || (a.plannedDate || "").localeCompare(b.plannedDate || "") || Number(b.estimatedMinutes || 0) - Number(a.estimatedMinutes || 0));
  const target = Number(state.settings?.normalMinutes) || 210;
  let assigned = 0;
  const taskIds = [];
  for (const task of tasks) {
    const estimatedMinutes = Math.max(5, Number(task.estimatedMinutes) || 30);
    const remaining = target - assigned;
    if (remaining < 5) break;
    const minutes = Math.min(estimatedMinutes, remaining);
    const splitDetail = minutes < estimatedMinutes ? " · 本次先排 " + minutes + "/" + estimatedMinutes + " 分钟，余量后续再安排" : "";
    rows.push({
      type: "task",
      time: "灵活时段",
      title: task.title,
      detail: task.goal + " · " + minutes + " 分钟 · 优先级 " + taskPriority(task) + (task.portable ? " · 可在其他课程时段完成" : " · 建议安排完整空档") + splitDetail,
      blocked: false,
      taskId: task.id,
      minutes,
      estimatedMinutes,
      goal: task.goal || "学习",
      priority: taskPriority(task),
      portable: task.portable !== false,
      included: true
    });
    assigned += minutes;
    taskIds.push(task.id);
  }
  rows.push({ type: "buffer", time: "缓冲", title: "休息与突发事件缓冲", detail: "正常日目标约 3—4 小时，不把时间排满", blocked: false });
  return { date: key, status: "candidate", generatedAt: new Date().toISOString(), sourceTaskSignature: candidateSignature(state, key), plannedMinutes: assigned, taskIds, rows };
}

function refreshPlanTaskRow(row) {
  const minutes = Math.max(0, Number(row.minutes) || 0), estimate = Math.max(5, Number(row.estimatedMinutes) || minutes || 30);
  const splitDetail = minutes > 0 && minutes < estimate ? " · 本次先排 " + minutes + "/" + estimate + " 分钟，余量后续再安排" : "";
  row.time = row.included === false ? "未安排" : "灵活时段";
  row.detail = row.included === false ? (row.goal || "学习") + " · 本次暂不安排" : (row.goal || "学习") + " · " + minutes + " 分钟 · 优先级 " + (row.priority || 6) + (row.portable ? " · 可在其他课程时段完成" : " · 建议安排完整空档") + splitDetail;
}

function setPlanTaskSelection(plan, taskId, selection, dailyTarget = 210) {
  if (!plan || plan.status === "confirmed") return false;
  const row = (plan.rows || []).find(item => item.type === "task" && String(item.taskId) === String(taskId));
  if (!row) return false;
  const otherMinutes = plan.rows.filter(item => item.type === "task" && String(item.taskId) !== String(taskId) && item.included !== false).reduce((sum, item) => sum + Math.max(0, Number(item.minutes) || 0), 0);
  if (selection.included !== undefined) {
    const include = Boolean(selection.included);
    if (include && row.included === false && otherMinutes + Number(row.minutes || 0) > dailyTarget) return false;
    row.included = include;
  }
  if (selection.minutes !== undefined && row.included !== false) {
    const available = Math.max(0, dailyTarget - otherMinutes);
    const maximum = Math.min(Math.max(5, Number(row.estimatedMinutes) || Number(row.minutes) || 30), available);
    if (maximum < 5) return false;
    const desired = Math.max(5, Math.round((Number(selection.minutes) || 5) / 5) * 5);
    row.minutes = Math.min(desired, maximum);
  }
  refreshPlanTaskRow(row);
  const taskRows = plan.rows.filter(item => item.type === "task");
  plan.taskIds = taskRows.filter(item => item.included !== false).map(item => item.taskId);
  plan.plannedMinutes = taskRows.filter(item => item.included !== false).reduce((sum, item) => sum + Math.max(0, Number(item.minutes) || 0), 0);
  return true;
}

function getPlan(state, date) {
  const key = dateKey(date);
  state.plans = state.plans || {};
  const existing = state.plans[key];
  if (!existing || (existing.status !== "confirmed" && existing.sourceTaskSignature !== candidateSignature(state, key))) state.plans[key] = buildCandidatePlan(state, date);
  return state.plans[key];
}

function renderPlanner(state = readPlannerState()) {
  const date = tomorrow();
  const key = dateKey(date);
  const previousGeneratedAt = state.plans?.[key]?.generatedAt;
  const plan = getPlan(state, date);
  const meta = document.querySelector("#tomorrowMeta");
  const timeline = document.querySelector("#timeline");
  const button = document.querySelector("#confirmPlanBtn");
  if (meta) meta.textContent = date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", weekday: "short" }) + " · 第 " + academicWeek(date) + " 周 · " + plan.plannedMinutes + " 分钟自习候选";
  if (timeline) timeline.innerHTML = plan.rows.map(row => {
    const excluded = row.type === "task" && row.included === false;
    const controls = row.type === "task" ? '<div class="plan-task-controls"><label><input class="plan-task-toggle" data-task-id="' + escapeHTML(row.taskId) + '" type="checkbox" ' + (excluded ? "" : "checked") + (plan.status === "confirmed" ? " disabled" : "") + '> 本次安排</label><label>分钟<input class="plan-task-minutes" data-task-id="' + escapeHTML(row.taskId) + '" type="number" min="5" step="5" max="' + Number(row.estimatedMinutes || row.minutes || 30) + '" value="' + Number(row.minutes || 0) + '"' + (excluded || plan.status === "confirmed" ? " disabled" : "") + '></label></div>' : "";
    return '<div class="timeline-row' + (row.blocked ? " blocked" : "") + (row.type === "task" ? " plan-task-row" : "") + (excluded ? " plan-task-excluded" : "") + '"><time>' + escapeHTML(row.time) + '</time><div><strong>' + escapeHTML(row.title) + '</strong><small>' + escapeHTML(row.detail) + '</small></div>' + controls + '</div>';
  }).join("") + '<p class="plan-edit-hint">可勾选是否安排并调整分钟数；总时长不会超过每日目标。确认后会锁定，取消确认后可再调整。</p>';
  if (button) button.textContent = plan.status === "confirmed" ? "已确认 · 取消确认" : "确认计划";
  let summary = document.querySelector("#planSummary");
  if (!summary && timeline) {
    summary = document.createElement("p");
    summary.id = "planSummary";
    summary.className = "muted small";
    timeline.parentElement.appendChild(summary);
  }
  if (summary) summary.textContent = "候选任务 " + plan.taskIds.length + " 项 · 状态：" + (plan.status === "confirmed" ? "已确认" : "待确认") + " · 每晚 23:00 可调整";
  if (timeline) {
    timeline.querySelectorAll(".plan-task-toggle").forEach(input => input.addEventListener("change", event => {
      const next = readPlannerState(), currentPlan = getPlan(next, tomorrow()), currentTarget = Number(next.settings?.normalMinutes) || 210;
      const updated = setPlanTaskSelection(currentPlan, event.currentTarget.dataset.taskId, { included: event.currentTarget.checked }, currentTarget);
      if (!updated) { renderPlanner(next); return; }
      writePlannerState(next); renderPlanner(next);
    }));
    timeline.querySelectorAll(".plan-task-minutes").forEach(input => input.addEventListener("change", event => {
      const next = readPlannerState(), currentPlan = getPlan(next, tomorrow()), currentTarget = Number(next.settings?.normalMinutes) || 210;
      const updated = setPlanTaskSelection(currentPlan, event.currentTarget.dataset.taskId, { minutes: event.currentTarget.value }, currentTarget);
      if (!updated) { renderPlanner(next); return; }
      writePlannerState(next); renderPlanner(next);
    }));
  }
  if (previousGeneratedAt !== plan.generatedAt) writePlannerState(state);
}

document.querySelector("#confirmPlanBtn").addEventListener("click", () => {
  const state = readPlannerState();
  const date = tomorrow();
  const plan = getPlan(state, date);
  plan.status = plan.status === "confirmed" ? "candidate" : "confirmed";
  plan.confirmedAt = plan.status === "confirmed" ? new Date().toISOString() : null;
  writePlannerState(state);
  renderPlanner(state);
  const toast = document.querySelector("#toast");
  if (toast) {
    toast.textContent = plan.status === "confirmed" ? "明日计划已确认。" : "计划已退回候选状态。";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }
});

renderPlanner();
window.addEventListener("growth-state-change", event => renderPlanner(event.detail));
