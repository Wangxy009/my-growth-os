const STORAGE_KEY = "my-growth-os-state-v2";
const DEFAULT_SETTINGS = {
  wakeTime: "07:00",
  sleepTime: "23:30",
  confirmTime: "23:00",
  normalMinutes: 210,
  sprintMinutes: 330,
  healthPlan: { strengthDays: 3, aerobicDays: 1, climbingPerMonth: 1, focus: "肩背和臀部交替，每次只练一个部位", note: "每周保留 1 天完全休息，并根据课程和生理期调整。" },
  newsSchedule: { bulletinTime: "08:00", dailySummaryTime: "22:00", weeklySummaryDay: "日", weeklySummaryTime: "20:00" },
  newsNotifications: { enabled: false, lastBulletinDate: null, lastDigestDate: null }
};

const $ = (selector) => document.querySelector(selector);
const todayKey = () => formatDate(new Date());
const dateFromKey = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
};
const formatDateLabel = (date) => date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", weekday: "short" });

function defaultState() {
  const date = todayKey();
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    tasks: [
      { id: 1, title: "雅思词汇 100 个", goal: "雅思", estimatedMinutes: 45, actualMinutes: 0, plannedDate: date, status: "active", portable: true },
      { id: 2, title: "张宇高数基础三十讲 · 当前章节", goal: "考研数学", estimatedMinutes: 60, actualMinutes: 0, plannedDate: date, status: "active", portable: false },
      { id: 3, title: "专四听力一篇", goal: "雅思", estimatedMinutes: 30, actualMinutes: 0, plannedDate: date, status: "active", portable: true },
      { id: 4, title: "论文方向发散与文献检索", goal: "论文", estimatedMinutes: 45, actualMinutes: 0, plannedDate: date, status: "active", portable: false }
    ],
    plans: {},
    sessions: [],
    planReminderShownDate: null,
    milestones: [
      { id: 1, title: "英语一基础阶段启动", track: "北大软微金融科技", progress: 10 },
      { id: 2, title: "雅思听说读写建立训练习惯", track: "雅思", progress: 5 },
      { id: 3, title: "确定论文方向并完成初步文献表", track: "论文科研", progress: 0 },
      { id: 4, title: "完成第一个金融数据分析项目", track: "技能与作品集", progress: 0 }
    ],
    exams: [
      { id: 1, track: "北大软微金融科技", subject: "英语一", stage: "基础", progress: 5 },
      { id: 2, track: "北大软微金融科技", subject: "数学二", stage: "高数基础", progress: 8 },
      { id: 3, track: "北大软微金融科技", subject: "831 经济学综合", stage: "框架建立", progress: 0 },
      { id: 4, track: "北大经济学院金融", subject: "英语二", stage: "基础", progress: 5 },
      { id: 5, track: "北大经济学院金融", subject: "数学三", stage: "待开始", progress: 0 },
      { id: 6, track: "北大经济学院金融", subject: "431 金融学综合", stage: "框架建立", progress: 0 }
    ],
    examChapters: [], examPracticeLogs: [], examMistakes: [], examPlans: [],
    englishLogs: {}, englishPlans: [], englishMistakes: []
    ,research: { direction: "", question: "", deadline: "2027-07-01", items: [], readings: [], logs: [] }
    ,projects: [], skillLogs: [], agents: [
      { id: "lead", name: "总览统筹", scope: "拆解目标、检查冲突、生成下一步", enabled: true },
      { id: "exam", name: "考研教练", scope: "科目、刷题、错题与阶段计划", enabled: true },
      { id: "english", name: "英语教练", scope: "雅思训练、复盘与词汇", enabled: true },
      { id: "research", name: "科研助手", scope: "文献、研究设计与写作流程", enabled: true },
      { id: "skills", name: "技能与求职", scope: "Python、Excel、SQL 与作品集", enabled: true },
      { id: "health", name: "健康管家", scope: "运动、饮食与恢复记录", enabled: true },
      { id: "news", name: "新闻研究员", scope: "时政、财经和外刊收集", enabled: true }
    ], agentLogs: []
    ,resources: []
    ,applications: []
    ,knowledge: []
    ,news: []
    ,newsFeeds: []
    ,newsInbox: []
    ,newsDigests: []
    ,health: []
    ,countdowns: []
  };
}

function migrateState(raw) {
  if (!raw) return defaultState();
  if (raw.version === 2) {
    return {
      ...defaultState(),
      ...raw,
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}), healthPlan: { ...DEFAULT_SETTINGS.healthPlan, ...((raw.settings && raw.settings.healthPlan) || {}) }, newsSchedule: { ...DEFAULT_SETTINGS.newsSchedule, ...((raw.settings && raw.settings.newsSchedule) || {}) }, newsNotifications: { ...DEFAULT_SETTINGS.newsNotifications, ...((raw.settings && raw.settings.newsNotifications) || {}) } },
      tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
      plans: raw.plans || {},
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      planReminderShownDate: raw.planReminderShownDate || null,
      milestones: Array.isArray(raw.milestones) ? raw.milestones : defaultState().milestones,
      exams: Array.isArray(raw.exams) ? raw.exams : defaultState().exams,
      examChapters: Array.isArray(raw.examChapters) ? raw.examChapters : [],
      examPracticeLogs: Array.isArray(raw.examPracticeLogs) ? raw.examPracticeLogs : [],
      examMistakes: Array.isArray(raw.examMistakes) ? raw.examMistakes : [],
      examPlans: Array.isArray(raw.examPlans) ? raw.examPlans : [],
      englishPlans: Array.isArray(raw.englishPlans) ? raw.englishPlans : [],
      englishMistakes: Array.isArray(raw.englishMistakes) ? raw.englishMistakes : []
      ,englishLogs: raw.englishLogs || {},
      research: { ...defaultState().research, ...(raw.research || {}), items: Array.isArray(raw.research?.items) ? raw.research.items : [], readings: Array.isArray(raw.research?.readings) ? raw.research.readings : [], logs: Array.isArray(raw.research?.logs) ? raw.research.logs : [] },
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      skillLogs: Array.isArray(raw.skillLogs) ? raw.skillLogs : [],
      agents: Array.isArray(raw.agents) && raw.agents.length ? raw.agents : defaultState().agents,
      agentLogs: Array.isArray(raw.agentLogs) ? raw.agentLogs : [],
      resources: Array.isArray(raw.resources) ? raw.resources : [],
      applications: Array.isArray(raw.applications) ? raw.applications : []
      ,knowledge: Array.isArray(raw.knowledge) ? raw.knowledge : []
      ,news: Array.isArray(raw.news) ? raw.news : []
      ,newsFeeds: Array.isArray(raw.newsFeeds) ? raw.newsFeeds : []
      ,newsInbox: Array.isArray(raw.newsInbox) ? raw.newsInbox : []
      ,newsDigests: Array.isArray(raw.newsDigests) ? raw.newsDigests : []
      ,health: Array.isArray(raw.health) ? raw.health : []
      ,countdowns: Array.isArray(raw.countdowns) ? raw.countdowns : []
    };
  }
  const migrated = defaultState();
  migrated.tasks = (raw.tasks || []).map(task => ({
    id: task.id || Date.now() + Math.random(),
    title: task.title || "未命名任务",
    goal: task.goal || "其他",
    estimatedMinutes: Number(task.minutes || task.estimatedMinutes || 30),
    actualMinutes: 0,
    plannedDate: task.plannedDate || todayKey(),
    status: task.done ? "done" : "active",
    portable: task.portable !== false
  }));
  migrated.countdowns = Array.isArray(raw.countdowns) ? raw.countdowns : [];
  if (typeof raw.planConfirmed === "boolean") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = formatDate(tomorrow);
    migrated.plans[dateKey] = {
      date: dateKey,
      status: raw.planConfirmed ? "confirmed" : "candidate",
      generatedAt: new Date().toISOString(),
      rows: []
    };
  }
  return migrated;
}

const savedState = window.GrowthOS
  ? JSON.stringify(GrowthOS.load())
  : localStorage.getItem(STORAGE_KEY) || localStorage.getItem("my-growth-os-state-v1");
const state = migrateState(JSON.parse(savedState || "null"));

function persist() {
  if (window.GrowthOS) GrowthOS.save(state);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function renderClock() {
  const now = new Date();
  $("#clock").textContent = now.toLocaleString("zh-CN", {
    month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit"
  });
  const hour = now.getHours();
  $("#greeting").textContent = hour < 12
    ? "早上好，今天也向目标靠近一点。"
    : hour < 18 ? "下午好，保持节奏就很好。" : "晚上好，完成今天最重要的一步。";
  checkPlanReminder(now);
}

function checkPlanReminder(now) {
  const [hour, minute] = state.settings.confirmTime.split(":").map(Number);
  const reached = now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
  if (!reached || state.planReminderShownDate === todayKey()) return;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const plan = ensurePlan(formatDate(tomorrow));
  if (plan.status === "confirmed") return;
  state.planReminderShownDate = todayKey();
  persist();
  showToast("到每日计划确认时间了，检查一下明天的任务安排。");
}

function activeTasksForDate(dateKey) {
  return state.tasks
    .filter(task => task.status !== "done" && task.status !== "cancelled" && (!task.plannedDate || task.plannedDate <= dateKey))
    .sort((a, b) => (a.plannedDate || "").localeCompare(b.plannedDate || "") || b.estimatedMinutes - a.estimatedMinutes);
}

function buildPlan(dateKey) {
  const date = dateFromKey(dateKey);
  const courses = getScheduleForDate(date);
  const rows = courses.map(course => ({
    type: "course",
    time: course.periodLabel,
    title: course.name,
    detail: course.hardBlock ? "固定听课时间 · 不安排其他任务" : "其他课程时段 · 可安排学习",
    blocked: course.hardBlock,
    courseName: course.name,
    periods: course.periods
  }));
  let selfStudyMinutes = 0;

  const target = state.settings.normalMinutes;
  let assigned = 0;
  activeTasksForDate(dateKey).some(task => {
    if (assigned >= target) return true;
    if (assigned > 0 && assigned + task.estimatedMinutes > target) return false;
    rows.push({
      type: "task",
      time: "灵活时段",
      title: task.title,
      detail: task.goal + " · " + task.estimatedMinutes + " 分钟" + (task.portable ? " · 可在其他课程时段完成" : " · 建议安排完整空档"),
      blocked: false,
      taskId: task.id,
      minutes: task.estimatedMinutes
    });
    if (task.portable) selfStudyMinutes += task.estimatedMinutes;
    assigned += task.estimatedMinutes;
    return false;
  });

  if (!rows.length) {
    rows.push({ type: "buffer", time: "明日", title: "暂无固定课程或待办任务", detail: "可安排新任务、运动和休息", blocked: false });
  } else {
    rows.push({ type: "buffer", time: "缓冲", title: "休息与突发事件缓冲", detail: "计划只使用正常日目标的部分时间", blocked: false });
  }

  return {
    date: dateKey,
    status: "candidate",
    generatedAt: new Date().toISOString(),
    plannedMinutes: assigned,
    selfStudyMinutes,
    rows
  };
}

function ensurePlan(dateKey) {
  const existing = state.plans[dateKey];
  if (!existing || existing.status !== "confirmed" || !existing.rows?.length) {
    const previousStatus = existing?.status;
    state.plans[dateKey] = buildPlan(dateKey);
    if (previousStatus === "confirmed") state.plans[dateKey].status = "confirmed";
    persist();
  }
  return state.plans[dateKey];
}

function renderPlan() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateKey = formatDate(tomorrow);
  const plan = ensurePlan(dateKey);
  $("#timeline").innerHTML = plan.rows.map(row => {
    const cls = row.blocked ? " blocked" : "";
    return '<div class="timeline-row' + cls + '"><time>' + row.time + '</time><div><strong>' +
      row.title + '</strong><small>' + row.detail + '</small></div></div>';
  }).join("");
  $("#tomorrowMeta").textContent = formatDateLabel(tomorrow) + " · 第 " + academicWeek(tomorrow) + " 周 · 节次时间待补充";
  $("#planStatus").textContent = plan.status === "confirmed" ? "明日计划已确认" : "明日计划待确认";
  $("#planStatus").className = "status-pill " + (plan.status === "confirmed" ? "confirmed" : "pending");
  $("#planTag").textContent = plan.status === "confirmed" ? "已确认" : "候选";
}

function tasksForToday() {
  const date = todayKey();
  return state.tasks.filter(task => (task.plannedDate || date) <= date && task.status !== "cancelled");
}

function renderTasks() {
  const list = $("#taskList");
  const tasks = tasksForToday();
  list.innerHTML = tasks.length ? tasks.map(task =>
    '<div class="task ' + (task.status === "done" ? "done" : "") + '" data-id="' + task.id + '">' +
    '<button class="task-check" aria-label="完成任务"></button><div><div class="task-title">' +
    task.title + '</div><div class="task-meta">' + task.goal + ' · ' + task.status + '</div></div><span class="task-minutes">' +
    task.estimatedMinutes + ' min</span></div>'
  ).join("") : '<p class="muted small">今天还没有任务，可以点击“+ 新任务”添加。</p>';

  list.querySelectorAll(".task").forEach(row => row.addEventListener("click", () => {
    const task = state.tasks.find(item => String(item.id) === row.dataset.id);
    if (!task || task.status === "cancelled") return;
    task.status = task.status === "done" ? "active" : "done";
    task.completedAt = task.status === "done" ? new Date().toISOString() : null;
    persist();
    renderTasks();
    renderPlan();
    renderFocusTaskOptions();
    renderAnalytics();
    updateStats();
    showToast(task.status === "done" ? "任务已完成。" : "任务已恢复到进行中。");
  }));
  updateStats();
}

function todaySessionsMinutes() {
  const date = todayKey();
  return state.sessions.filter(session => session.date === date)
    .reduce((sum, session) => sum + Number(session.minutes || 0), 0);
}

function updateStats() {
  const tasks = tasksForToday();
  const done = tasks.filter(task => task.status === "done").length;
  $("#doneCount").textContent = done + " / " + tasks.length;
  $("#todayMinutes").textContent = todaySessionsMinutes() + " 分钟";
}

function getWeekStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = start.getDay() === 0 ? 7 : start.getDay();
  start.setDate(start.getDate() - weekday + 1);
  return start;
}

function renderAnalytics() {
  const start = getWeekStart(new Date());
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDate(date);
  });
  const end = dateFromKey(dates[6]);
  $("#weekRange").textContent = formatDateLabel(start) + "—" + formatDateLabel(end);
  const sessions = state.sessions.filter(session => dates.includes(session.date));
  const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0);
  const activeDays = new Set(sessions.map(session => session.date)).size;
  const weeklyTasks = state.tasks.filter(task => dates.includes(task.plannedDate));
  const completed = weeklyTasks.filter(task => task.status === "done").length;
  $("#weekTotalMinutes").textContent = totalMinutes + " 分钟";
  $("#weekActiveDays").textContent = activeDays + " 天";
  $("#weekCompletion").textContent = (weeklyTasks.length ? Math.round(completed / weeklyTasks.length * 100) : 0) + "%";

  const goalMinutes = {};
  sessions.forEach(session => {
    const task = state.tasks.find(item => String(item.id) === String(session.taskId));
    const goal = task?.goal || "未关联任务";
    goalMinutes[goal] = (goalMinutes[goal] || 0) + Number(session.minutes || 0);
  });
  const entries = Object.entries(goalMinutes).sort((a, b) => b[1] - a[1]);
  const maxMinutes = entries[0]?.[1] || 1;
  $("#goalBreakdown").innerHTML = entries.length ? entries.map(([goal, minutes]) =>
    '<div class="goal-stat"><span>' + goal + '</span><span class="bar"><i style="width:' + Math.round(minutes / maxMinutes * 100) + '%"></i></span><b>' + minutes + ' min</b></div>'
  ).join("") : '<p class="muted small">本周还没有学习时长记录。</p>';

  const delayed = state.tasks.filter(task => task.status !== "done" && task.status !== "cancelled" && task.plannedDate < todayKey());
  const completedRows = weeklyTasks.filter(task => task.status === "done").slice(0, 5);
  const delayedRows = delayed.slice(0, 5);
  const rows = completedRows.map(task => '<div class="week-task"><strong>已完成 · ' + task.title + '</strong><span>' + task.goal + '</span></div>')
    .concat(delayedRows.map(task => '<div class="week-task"><strong>待处理 · ' + task.title + '</strong><span>已延期</span></div>'));
  $("#weekTasks").innerHTML = rows.length ? rows.join("") : '<p class="muted small">本周还没有完成或延期任务。</p>';
}

function renderMilestones() {
  const list = $("#milestoneList");
  if (!state.milestones.length) {
    list.innerHTML = '<p class="muted small">还没有里程碑，先添加一个近期可完成的阶段目标。</p>';
    return;
  }
  list.innerHTML = state.milestones.map(item =>
    '<div class="milestone" data-id="' + item.id + '"><div><strong>' + item.title + '</strong><small>' + item.track + '</small></div><span class="bar"><i style="width:' + item.progress + '%"></i></span><b>' + item.progress + '%</b><button class="milestone-delete" type="button" aria-label="删除里程碑">×</button></div>'
  ).join("");
  list.querySelectorAll(".milestone-delete").forEach(button => button.addEventListener("click", event => {
    const id = Number(event.currentTarget.closest(".milestone").dataset.id);
    state.milestones = state.milestones.filter(item => item.id !== id);
    persist();
    renderMilestones();
    showToast("里程碑已删除。");
  }));
}

function setupMilestones() {
  $("#addMilestoneBtn").addEventListener("click", () => $("#milestoneForm").classList.toggle("hidden"));
  $("#cancelMilestoneBtn").addEventListener("click", () => $("#milestoneForm").classList.add("hidden"));
  $("#milestoneForm").addEventListener("submit", event => {
    event.preventDefault();
    state.milestones.push({
      id: Date.now(),
      title: $("#milestoneTitle").value.trim(),
      track: $("#milestoneTrack").value,
      progress: Math.min(100, Math.max(0, Number($("#milestoneProgress").value) || 0))
    });
    persist();
    renderMilestones();
    event.target.reset();
    $("#milestoneProgress").value = 0;
    $("#milestoneForm").classList.add("hidden");
    showToast("里程碑已添加。");
  });
}

function countdownEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function countdownDays(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = dateFromKey(todayKey());
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - today) / 86400000);
}

function countdownLabel(item) {
  if (item.done) return "已完成";
  const days = countdownDays(item.date);
  if (days === null) return "未设置日期";
  if (days < 0) return "已逾期 " + Math.abs(days) + " 天";
  if (days === 0) return "今天截止";
  return "还有 " + days + " 天";
}

function renderCountdowns() {
  const list = $("#countdownList");
  if (!list) return;
  const items = (state.countdowns || []).slice().sort((a, b) => Number(Boolean(a.done)) - Number(Boolean(b.done)) || String(a.date || "9999").localeCompare(String(b.date || "9999")));
  list.innerHTML = items.length ? items.map(item => {
    const days = countdownDays(item.date);
    const urgency = item.done ? "done" : days !== null && days < 0 ? "overdue" : days !== null && days <= 7 ? "soon" : "";
    return '<article class="countdown-item ' + urgency + '" data-id="' + countdownEscape(item.id) + '"><div class="countdown-copy"><strong>' + countdownEscape(item.title) + '</strong><small>' + countdownEscape(item.category || "其他") + ' · ' + countdownEscape(item.date || "未设置日期") + (item.note ? " · " + countdownEscape(item.note) : "") + '</small></div><span class="countdown-value">' + countdownEscape(countdownLabel(item)) + '</span><button class="ghost countdown-toggle" type="button">' + (item.done ? "恢复" : "完成") + '</button><button class="record-delete countdown-delete" type="button" aria-label="删除倒计时">×</button></article>';
  }).join("") : '<p class="muted small">还没有倒计时。添加一个重要考试、论文节点或申请截止日期。</p>';
  list.querySelectorAll(".countdown-toggle").forEach(button => button.addEventListener("click", event => {
    const id = event.currentTarget.closest(".countdown-item").dataset.id;
    const item = (state.countdowns || []).find(row => String(row.id) === id);
    if (!item) return;
    item.done = !item.done;
    item.completedAt = item.done ? new Date().toISOString() : null;
    persist();
    renderCountdowns();
  }));
  list.querySelectorAll(".countdown-delete").forEach(button => button.addEventListener("click", event => {
    const id = event.currentTarget.closest(".countdown-item").dataset.id;
    state.countdowns = (state.countdowns || []).filter(item => String(item.id) !== id);
    persist();
    renderCountdowns();
    showToast("倒计时已删除。");
  }));
}

function setupCountdowns() {
  $("#addCountdownBtn").addEventListener("click", () => $("#countdownForm").classList.toggle("hidden"));
  $("#cancelCountdownBtn").addEventListener("click", () => $("#countdownForm").classList.add("hidden"));
  $("#countdownForm").addEventListener("submit", event => {
    event.preventDefault();
    const title = $("#countdownTitle").value.trim();
    const date = $("#countdownDate").value;
    if (!title || countdownDays(date) === null) return;
    state.countdowns = state.countdowns || [];
    state.countdowns.push({ id: Date.now() + Math.random(), title, category: $("#countdownCategory").value, date, note: $("#countdownNote").value.trim(), done: false });
    persist();
    renderCountdowns();
    event.currentTarget.reset();
    $("#countdownForm").classList.add("hidden");
    showToast("重要事项倒计时已添加。");
  });
}

function renderExams() {
  const list = $("#examList");
  const tracks = ["北大软微金融科技", "北大经济学院金融"];
  list.innerHTML = tracks.map(track => {
    const exams = state.exams.filter(item => item.track === track);
    const practice = (state.examPracticeLogs || []).filter(item => item.track === track).reduce((sum, item) => sum + Number(item.questions || 0), 0);
    const pendingMistakes = (state.examMistakes || []).filter(item => item.track === track && item.status !== "done").length;
    return '<div class="exam-group"><h4>' + track + '</h4><p class="muted small">累计刷题 ' + practice + ' 题 · 待复习错题 ' + pendingMistakes + ' 条</p>' + (exams.length ? exams.map(item =>
      '<div class="exam-subject" data-id="' + item.id + '"><strong>' + item.subject + '</strong><small>' + item.stage + '</small><span class="bar"><i style="width:' + item.progress + '%"></i></span><b>' + item.progress + '%</b><button class="exam-delete" type="button" aria-label="删除科目">×</button></div>'
    ).join("") : '<p class="muted small">暂未添加科目。</p>') + '</div>';
  }).join("");
  list.querySelectorAll(".exam-delete").forEach(button => button.addEventListener("click", event => {
    const id = Number(event.currentTarget.closest(".exam-subject").dataset.id);
    state.exams = state.exams.filter(item => item.id !== id);
    persist();
    renderExams();
    showToast("科目已删除。");
  }));
}

function setupExams() {
  $("#addExamBtn").addEventListener("click", () => $("#examForm").classList.toggle("hidden"));
  $("#cancelExamBtn").addEventListener("click", () => $("#examForm").classList.add("hidden"));
  $("#examForm").addEventListener("submit", event => {
    event.preventDefault();
    state.exams.push({
      id: Date.now(),
      track: $("#examTrack").value,
      subject: $("#examSubject").value.trim(),
      stage: $("#examStage").value.trim(),
      progress: Math.min(100, Math.max(0, Number($("#examProgress").value) || 0))
    });
    persist();
    renderExams();
    event.target.reset();
    $("#examProgress").value = 0;
    $("#examForm").classList.add("hidden");
    showToast("考研科目已添加。");
  });
}

function renderEnglish() {
  const log = state.englishLogs[todayKey()] || { words: 100, listening: 1, reading: 0, writing: 0, speaking: 0, target: 7 };
  $("#englishWords").value = log.words;
  $("#englishListening").value = log.listening;
  $("#englishReading").value = log.reading;
  $("#englishWriting").value = log.writing;
  $("#englishSpeaking").value = log.speaking;
  $("#englishTarget").value = log.target;
  const entries = Object.entries(state.englishLogs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  $("#englishHistory").innerHTML = entries.length ? entries.map(([date, item]) =>
    '<div class="english-row"><strong>' + date.slice(5) + '</strong><span>词汇 ' + item.words + '</span><span>听力 ' + item.listening + '</span><span>阅读 ' + item.reading + '%</span><span>写作 ' + item.writing + '</span><span>口语 ' + item.speaking + '</span></div>'
  ).join("") : '<p class="muted small">还没有雅思记录。</p>';
}

function setupEnglish() {
  $("#saveEnglishBtn").addEventListener("click", () => {
    state.englishLogs[todayKey()] = {
      words: Number($("#englishWords").value) || 0,
      listening: Number($("#englishListening").value) || 0,
      reading: Number($("#englishReading").value) || 0,
      writing: Number($("#englishWriting").value) || 0,
      speaking: Number($("#englishSpeaking").value) || 0,
      target: Number($("#englishTarget").value) || 7
    };
    persist();
    renderEnglish();
    showToast("今日雅思记录已保存。");
  });
}

function renderRecords(listSelector, records, emptyText, type) {
  const list = $(listSelector);
  if (!records.length) {
    list.innerHTML = '<p class="muted small">' + emptyText + '</p>';
    return;
  }
  list.innerHTML = records.map(item => {
    const middle = type === "research" ? item.type : type === "project" ? item.skill : item.category;
    const status = type === "research" ? item.status : type === "project" ? item.status : item.use;
    const link = type === "resource" && item.url ? '<a href="' + item.url + '" target="_blank" rel="noreferrer">打开</a>' : '';
    return '<div class="record" data-id="' + item.id + '"><div><strong>' + (item.title || item.name) + '</strong><small>' + (item.note || item.url || "") + '</small></div><span class="record-tag">' + middle + '</span><span class="record-tag record-status">' + status + ' ' + link + '</span><button class="record-delete" type="button" aria-label="删除">×</button></div>';
  }).join("");
  list.querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const id = Number(event.currentTarget.closest(".record").dataset.id);
    if (type === "research") state.research.items = state.research.items.filter(item => item.id !== id);
    if (type === "project") state.projects = state.projects.filter(item => item.id !== id);
    if (type === "resource") state.resources = state.resources.filter(item => item.id !== id);
    persist();
    renderModuleRecords();
    showToast("记录已删除。");
  }));
}

function renderModuleRecords() {
  $("#researchDirection").value = state.research.direction;
  $("#researchQuestion").value = state.research.question;
  $("#researchDeadline").value = state.research.deadline;
  renderRecords("#researchList", state.research.items, "还没有研究事项。", "research");
  renderRecords("#projectList", state.projects, "还没有项目，先添加一个想复现或构建的项目。", "project");
  renderRecords("#resourceList", state.resources, "还没有资源记录。", "resource");
  renderApplications();
  const skills = ["Python", "Excel", "SQL"];
  $("#skillList").innerHTML = skills.map(skill => {
    const count = state.projects.filter(item => item.skill === skill && item.status === "已完成").length;
    return '<div class="skill-card"><strong>' + skill + '</strong><small>' + count + ' 个已完成项目</small><span class="bar"><i style="width:' + Math.min(100, count * 25) + '%"></i></span></div>';
  }).join("");
  renderDashboardModules();
}

function renderApplications() {
  const list = $("#applicationList");
  const records = [...state.applications].sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  if (!records.length) {
    list.innerHTML = '<p class="muted small">还没有申请事项，可以先记录关注的岗位、夏令营或学校项目。</p>';
    return;
  }
  const today = todayKey();
  list.innerHTML = records.map(item => {
    const done = item.status === "已完成" || item.status === "不再申请";
    const overdue = item.deadline && item.deadline < today && !done;
    const dueClass = done ? "done" : overdue ? "overdue" : "";
    const dueText = item.deadline ? (overdue ? "已过期 · " : "截止 ") + item.deadline : "未设置截止日期";
    return '<div class="record" data-id="' + item.id + '"><div><strong>' + item.name + '</strong><small>' + (item.note || "") + '</small></div><span class="record-tag">' + item.track + '</span><span class="record-tag application-due ' + dueClass + '">' + item.status + '<br>' + dueText + '</span><button class="record-delete" type="button" aria-label="删除">×</button></div>';
  }).join("");
  list.querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const id = Number(event.currentTarget.closest(".record").dataset.id);
    state.applications = state.applications.filter(item => item.id !== id);
    persist();
    renderApplications();
    showToast("申请事项已删除。");
  }));
}

function renderSimpleCollection(selector, collection, emptyText, type) {
  const list = $(selector);
  if (!collection.length) {
    list.innerHTML = '<p class="muted small">' + emptyText + '</p>';
    return;
  }
  list.innerHTML = collection.slice().reverse().map(item => {
    if (type === "health") return '<div class="record"><div><strong>' + item.type + '</strong><small>' + item.value + ' · ' + (item.note || "") + '</small></div><span class="record-tag">' + item.date + '</span><span class="private-badge">本地私密</span><button class="record-delete" data-id="' + item.id + '" type="button">×</button></div>';
    const category = type === "knowledge" ? item.category : item.category;
    const status = item.status;
    const link = item.url ? '<a href="' + item.url + '" target="_blank" rel="noreferrer">打开</a>' : '';
    return '<div class="record"><div><strong>' + item.title + '</strong><small>' + (item.note || "") + '</small></div><span class="record-tag">' + category + '</span><span class="record-tag record-status">' + status + ' ' + link + '</span><button class="record-delete" data-id="' + item.id + '" type="button">×</button></div>';
  }).join("");
  list.querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const id = Number(event.currentTarget.dataset.id);
    if (type === "knowledge") state.knowledge = state.knowledge.filter(item => item.id !== id);
    if (type === "news") state.news = state.news.filter(item => item.id !== id);
    if (type === "health") state.health = state.health.filter(item => item.id !== id);
    persist();
    renderCollections();
  }));
}

function renderCollections() {
  renderSimpleCollection("#knowledgeList", state.knowledge, "还没有知识点。", "knowledge");
  renderSimpleCollection("#newsList", state.news, "还没有文章记录。", "news");
  renderSimpleCollection("#healthList", state.health, "还没有健康记录。", "health");
  renderDashboardModules();
}

function renderDashboardModules() {
  const workouts = new Set(["无氧：肩背", "无氧：臀部", "骑行", "游泳", "攀岩"]);
  const weekStart = getWeekStart(new Date());
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return formatDate(date);
  });
  const healthWeek = state.health.filter(item => weekDates.includes(item.date));
  const exerciseCount = healthWeek.filter(item => workouts.has(item.type)).length;
  const strengthCount = healthWeek.filter(item => item.type === "无氧：肩背" || item.type === "无氧：臀部").length;
  const cardioCount = healthWeek.filter(item => ["骑行", "游泳", "攀岩"].includes(item.type)).length;
  const plan = state.settings.healthPlan || { strengthDays: 3, aerobicDays: 1 };
  const targetCount = Number(plan.strengthDays || 3) + Number(plan.aerobicDays || 1);
  const adherence = targetCount ? Math.min(100, Math.round(exerciseCount / targetCount * 100)) : 0;
  const latestByType = type => state.health.filter(item => item.type === type).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const bodyFat = latestByType("体脂率");
  const period = latestByType("生理期");
  $("#dashboardHealthSummary").innerHTML = '<div><strong>' + exerciseCount + '</strong><small>本周运动</small></div><div><strong>' + adherence + '%</strong><small>运动计划完成度</small></div><div><strong>' + healthWeek.filter(item => item.type === "饮食").length + '</strong><small>本周饮食记录</small></div>';
  const healthMeta = document.createElement("p");
  healthMeta.className = "muted small";
  healthMeta.textContent = "无氧 " + strengthCount + " 次 · 有氧/攀岩 " + cardioCount + " 次 · 最近体脂 " + (bodyFat ? bodyFat.value + "（" + bodyFat.date + "）" : "未记录") + " · 最近周期 " + (period ? period.date : "未记录");
  const healthSummary = $("#dashboardHealthSummary");
  const oldMeta = healthSummary.nextElementSibling;
  if (oldMeta?.classList.contains("dashboard-health-meta")) oldMeta.remove();
  healthMeta.classList.add("dashboard-health-meta");
  healthSummary.insertAdjacentElement("afterend", healthMeta);

  const resources = state.resources || [];
  const knownLicense = resources.filter(item => item.license && !["未知", "未确认", "不清楚"].includes(item.license.trim())).length;
  const reusable = resources.filter(item => item.use === "可复用" || item.use === "可复现").length;
  $("#dashboardResourceCount").textContent = resources.length + " 项收藏";
  $("#dashboardResourceSummary").textContent = "许可证已核实 " + knownLicense + " 项 · 可复现/可复用 " + reusable + " 项";
  const latestResource = resources[resources.length - 1];
  $("#dashboardResourceMeta").textContent = latestResource ? "最近添加：" + (latestResource.name || latestResource.title || "未命名资源") : "整理学习资料、Agent、数据分析和英语资源";
  const completedProjects = (state.projects || []).filter(item => item.status === "已完成").length;
  $("#dashboardProjectMeta").textContent = "作品集项目 " + (state.projects || []).length + " 项 · 已完成 " + completedProjects + " 项";
}

function bindRecordForm(buttonId, formId, cancelId, handler) {
  $(buttonId).addEventListener("click", () => $(formId).classList.toggle("hidden"));
  $(cancelId).addEventListener("click", () => $(formId).classList.add("hidden"));
  $(formId).addEventListener("submit", event => {
    event.preventDefault();
    handler();
    persist();
    renderModuleRecords();
    event.target.reset();
    $(formId).classList.add("hidden");
    showToast("记录已添加。");
  });
}

function setupModuleRecords() {
  ["researchDirection", "researchQuestion", "researchDeadline"].forEach(id => $("#" + id).addEventListener("change", () => {
    state.research.direction = $("#researchDirection").value;
    state.research.question = $("#researchQuestion").value;
    state.research.deadline = $("#researchDeadline").value;
    persist();
  }));
  bindRecordForm("#addResearchBtn", "#researchForm", "#cancelResearchBtn", () => state.research.items.push({ id: Date.now(), title: $("#researchItemTitle").value.trim(), type: $("#researchItemType").value, status: $("#researchItemStatus").value }));
  bindRecordForm("#addProjectBtn", "#projectForm", "#cancelProjectBtn", () => state.projects.push({ id: Date.now(), title: $("#projectTitle").value.trim(), skill: $("#projectSkill").value, url: $("#projectUrl").value.trim(), status: $("#projectStatus").value }));
  bindRecordForm("#addResourceBtn", "#resourceForm", "#cancelResourceBtn", () => state.resources.push({ id: Date.now(), name: $("#resourceName").value.trim(), url: $("#resourceUrl").value.trim(), category: $("#resourceCategory").value, license: $("#resourceLicense").value.trim(), use: $("#resourceUse").value, note: "许可证：" + ($("#resourceLicense").value.trim() || "未知") }));
  bindRecordForm("#addApplicationBtn", "#applicationForm", "#cancelApplicationBtn", () => state.applications.push({ id: Date.now(), name: $("#applicationName").value.trim(), track: $("#applicationTrack").value, deadline: $("#applicationDeadline").value, status: $("#applicationStatus").value, note: $("#applicationNote").value.trim() }));
  bindRecordForm("#addKnowledgeBtn", "#knowledgeForm", "#cancelKnowledgeBtn", () => state.knowledge.push({ id: Date.now(), title: $("#knowledgeTitle").value.trim(), category: $("#knowledgeCategory").value, note: $("#knowledgeNote").value.trim(), status: $("#knowledgeStatus").value }));
  bindRecordForm("#addNewsBtn", "#newsForm", "#cancelNewsBtn", () => state.news.push({ id: Date.now(), title: $("#newsTitle").value.trim(), category: $("#newsCategory").value, url: $("#newsUrl").value.trim(), note: $("#newsNote").value.trim(), status: $("#newsStatus").value }));
  bindRecordForm("#addHealthBtn", "#healthForm", "#cancelHealthBtn", () => state.health.push({ id: Date.now(), date: $("#healthDate").value || todayKey(), type: $("#healthType").value, value: $("#healthValue").value.trim(), note: $("#healthNote").value.trim() }));
}

function setupPlanConfirmation() {
  $("#confirmPlanBtn").addEventListener("click", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = formatDate(tomorrow);
    const plan = ensurePlan(dateKey);
    plan.status = plan.status === "confirmed" ? "candidate" : "confirmed";
    plan.confirmedAt = plan.status === "confirmed" ? new Date().toISOString() : null;
    persist();
    renderPlan();
    showToast(plan.status === "confirmed" ? "明日计划已确认，可以按这个节奏执行。" : "计划已退回候选状态。");
  });
}

function setupTaskForm() {
  $("#addTaskBtn").addEventListener("click", () => $("#taskForm").classList.toggle("hidden"));
  $("#cancelTaskBtn").addEventListener("click", () => $("#taskForm").classList.add("hidden"));
  $("#taskForm").addEventListener("submit", event => {
    event.preventDefault();
    const title = $("#taskTitle").value.trim();
    if (!title) return;
    state.tasks.push({
      id: Date.now(),
      title,
      goal: $("#taskGoal").value,
      estimatedMinutes: Number($("#taskMinutes").value) || 30,
      actualMinutes: 0,
      plannedDate: $("#taskDate").value || todayKey(),
      status: "active",
      portable: $("#taskPortable").checked
    });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDate(tomorrow);
    if (state.plans[tomorrowKey]?.status === "candidate") {
      state.plans[tomorrowKey] = buildPlan(tomorrowKey);
    }
    persist();
    renderTasks();
    renderPlan();
    renderFocusTaskOptions();
    event.target.reset();
    $("#taskMinutes").value = 30;
    $("#taskDate").value = todayKey();
    $("#taskPortable").checked = true;
    $("#taskForm").classList.add("hidden");
    showToast("任务已加入今天的任务池。");
  });
}

function renderFocusTaskOptions() {
  const select = $("#focusTask");
  const current = select.value;
  const options = ['<option value="">不关联具体任务</option>'].concat(
    state.tasks.filter(task => task.status !== "cancelled").map(task =>
      '<option value="' + task.id + '">' + task.title + '</option>'
    )
  );
  select.innerHTML = options.join("");
  if (current && state.tasks.some(task => String(task.id) === current)) select.value = current;
}

let timerSeconds = 25 * 60;
let timerId = null;

function renderTimer() {
  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const seconds = String(timerSeconds % 60).padStart(2, "0");
  $("#timerDisplay").textContent = minutes + ":" + seconds;
}

function recordFocusSession() {
  const taskId = $("#focusTask").value || null;
  const minutes = 25;
  state.sessions.push({
    id: Date.now(),
    taskId: taskId ? Number(taskId) : null,
    date: todayKey(),
    minutes,
    startedAt: new Date(Date.now() - minutes * 60000).toISOString(),
    endedAt: new Date().toISOString(),
    source: "pomodoro"
  });
  if (taskId) {
    const task = state.tasks.find(item => String(item.id) === taskId);
    if (task) task.actualMinutes = Number(task.actualMinutes || 0) + minutes;
  }
  persist();
  updateStats();
    renderAnalytics();
  showToast("专注完成，已记录 25 分钟学习时长。");
}

function recordManualSession() {
  const minutes = Number($("#manualMinutes").value);
  if (!Number.isFinite(minutes) || minutes < 1) return;
  const taskId = $("#focusTask").value || null;
  state.sessions.push({
    id: Date.now(),
    taskId: taskId ? Number(taskId) : null,
    date: todayKey(),
    minutes,
    startedAt: new Date(Date.now() - minutes * 60000).toISOString(),
    endedAt: new Date().toISOString(),
    source: "manual"
  });
  if (taskId) {
    const task = state.tasks.find(item => String(item.id) === taskId);
    if (task) task.actualMinutes = Number(task.actualMinutes || 0) + minutes;
  }
  persist();
  updateStats();
  renderAnalytics();
  showToast("已记录 " + minutes + " 分钟学习时长。");
}

function setupReflection() {
  const reflection = state.reflections?.[todayKey()] || "";
  $("#reflectionText").value = reflection;
  $("#reflectionMeta").textContent = reflection ? "已保存本日复盘" : "复盘会保存在本机浏览器中";
  $("#saveReflectionBtn").addEventListener("click", () => {
    state.reflections = state.reflections || {};
    state.reflections[todayKey()] = $("#reflectionText").value.trim();
    persist();
    $("#reflectionMeta").textContent = "刚刚保存 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    showToast("今日复盘已保存。");
  });
}

function setupTimer() {
  $("#startTimerBtn").addEventListener("click", () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      $("#startTimerBtn").textContent = "继续";
      return;
    }
    $("#startTimerBtn").textContent = "暂停";
    timerId = window.setInterval(() => {
      timerSeconds -= 1;
      renderTimer();
      if (timerSeconds <= 0) {
        clearInterval(timerId);
        timerId = null;
        timerSeconds = 25 * 60;
        $("#startTimerBtn").textContent = "开始";
        recordFocusSession();
        renderTimer();
      }
    }, 1000);
  });
  $("#resetTimerBtn").addEventListener("click", () => {
    clearInterval(timerId);
    timerId = null;
    timerSeconds = 25 * 60;
    $("#startTimerBtn").textContent = "开始";
    renderTimer();
  });
  $("#logSessionBtn").addEventListener("click", recordManualSession);
}

renderClock();
window.setInterval(renderClock, 30000);
renderPlan();
renderTasks();
renderFocusTaskOptions();
renderTimer();
renderAnalytics();
renderMilestones();
renderCountdowns();
renderExams();
renderEnglish();
$("#taskDate").value = todayKey();
setupPlanConfirmation();
setupTaskForm();
setupTimer();
setupReflection();
setupMilestones();
setupCountdowns();
setupExams();
setupEnglish();
renderModuleRecords();
setupModuleRecords();
$("#healthDate").value = todayKey();
renderCollections();

window.addEventListener("growth-state-change", event => {
  if (!event.detail || typeof event.detail !== "object") return;
  const next = migrateState(event.detail);
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, next);
  renderPlan();
  renderTasks();
  renderFocusTaskOptions();
  renderAnalytics();
  renderMilestones();
  renderCountdowns();
  renderExams();
  renderEnglish();
  renderModuleRecords();
  renderCollections();
});

