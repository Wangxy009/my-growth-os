// Shared browser runtime for standalone module pages.
// It guarantees that any module can be opened first and still sees the same state shape as the dashboard.
(function () {
  const STORAGE_KEY = "my-growth-os-state-v2";
  const PENDING_WRITE_KEY = "my-growth-os-pending-write-v1";
  const SERVER_SEEN_KEY = "my-growth-os-server-seen-v1";
  let syncInFlight = null;
  let writeSequence = 0;
  // Date-only values use the user's local calendar; UTC slices can shift an
  // early-morning local date back to the previous day.
  function localDateKey(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  const today = localDateKey();

  function defaultState() {
    return {
      version: 2,
      settings: { wakeTime: "07:00", sleepTime: "23:30", confirmTime: "23:00", normalMinutes: 210, sprintMinutes: 330, healthPlan: { strengthDays: 3, aerobicDays: 1, climbingPerMonth: 1, focus: "肩背和臀部交替，每次只练一个部位", note: "每周保留 1 天完全休息，并根据课程和生理期调整。" }, newsSchedule: { bulletinTime: "08:00", dailySummaryTime: "22:00", weeklySummaryDay: "日", weeklySummaryTime: "20:00" }, newsNotifications: { enabled: false, lastBulletinDate: null, lastDigestDate: null } },
      tasks: [
        { id: 1, title: "雅思词汇 100 个", goal: "雅思", priority: 2, estimatedMinutes: 45, actualMinutes: 0, plannedDate: today, status: "active", portable: true },
        { id: 2, title: "张宇高数基础三十讲 · 当前章节", goal: "考研数学", priority: 1, estimatedMinutes: 60, actualMinutes: 0, plannedDate: today, status: "active", portable: false },
        { id: 3, title: "专四听力一篇", goal: "雅思", priority: 2, estimatedMinutes: 30, actualMinutes: 0, plannedDate: today, status: "active", portable: true },
        { id: 4, title: "论文方向发散与文献检索", goal: "论文", priority: 3, estimatedMinutes: 45, actualMinutes: 0, plannedDate: today, status: "active", portable: false }
      ], plans: {}, sessions: [], reflections: {}, planReminderShownDate: null,
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
      englishLogs: {}, englishPlans: [], englishMistakes: [],
      research: { direction: "", question: "", deadline: "2027-07-01", items: [], readings: [], logs: [] },
      projects: [], skillLogs: [], agents: [
        { id: "lead", name: "总览统筹", scope: "拆解目标、检查冲突、生成下一步", enabled: true },
        { id: "exam", name: "考研教练", scope: "科目、刷题、错题与阶段计划", enabled: true },
        { id: "english", name: "英语教练", scope: "雅思训练、复盘与词汇", enabled: true },
        { id: "research", name: "科研助手", scope: "文献、研究设计与写作流程", enabled: true },
        { id: "skills", name: "技能与求职", scope: "Python、Excel、SQL 与作品集", enabled: true },
        { id: "health", name: "健康管家", scope: "运动、饮食与恢复记录", enabled: true },
        { id: "news", name: "新闻研究员", scope: "时政、财经和外刊收集", enabled: true }
      ], agentLogs: [], resources: [], applications: [], knowledge: [], news: [], newsFeeds: [], newsInbox: [], newsDigests: [], health: [], countdowns: [],
      lastUpdatedAt: null
    };
  }

  function mergeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    const next = { ...base, ...raw, version: 2 };
    next.settings = { ...base.settings, ...(raw.settings || {}) };
    next.settings.healthPlan = { ...base.settings.healthPlan, ...((raw.settings && raw.settings.healthPlan) || {}) };
    next.settings.newsSchedule = { ...base.settings.newsSchedule, ...((raw.settings && raw.settings.newsSchedule) || {}) };
    next.settings.newsNotifications = { ...base.settings.newsNotifications, ...((raw.settings && raw.settings.newsNotifications) || {}) };
    ["tasks", "sessions", "milestones", "exams", "examChapters", "examPracticeLogs", "examMistakes", "examPlans", "englishPlans", "englishMistakes", "projects", "skillLogs", "agents", "agentLogs", "resources", "applications", "knowledge", "news", "newsFeeds", "newsInbox", "newsDigests", "health", "countdowns"].forEach(key => {
      next[key] = Array.isArray(raw[key]) ? raw[key] : base[key];
    });
    next.plans = raw.plans && typeof raw.plans === "object" ? raw.plans : {};
    next.englishLogs = raw.englishLogs && typeof raw.englishLogs === "object" ? raw.englishLogs : {};
    next.reflections = raw.reflections && typeof raw.reflections === "object" ? raw.reflections : {};
    next.research = { ...base.research, ...(raw.research || {}) };
    next.research.items = Array.isArray(next.research.items) ? next.research.items : [];
    next.research.readings = Array.isArray(next.research.readings) ? next.research.readings : [];
    next.research.logs = Array.isArray(next.research.logs) ? next.research.logs : [];
    return next;
  }

  function isHttpApp() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function readPendingWrite() {
    try { return JSON.parse(localStorage.getItem(PENDING_WRITE_KEY) || "null"); } catch { return null; }
  }

  function syncStatus(status, error = "") {
    const detail = { status, pending: Boolean(readPendingWrite()), error };
    window.dispatchEvent(new CustomEvent("growth-sync-status", { detail }));
    return detail;
  }

  function syncSnapshot() {
    if (!isHttpApp()) return { status: "local", pending: false, error: "" };
    const pending = readPendingWrite();
    if (pending) return { status: "pending", pending: true, error: "" };
    return { status: localStorage.getItem(SERVER_SEEN_KEY) === "1" ? "synced" : "local", pending: false, error: "" };
  }

  async function flushPendingWrites() {
    if (!isHttpApp()) return { ok: true, pending: false };
    if (syncInFlight) return syncInFlight;

    const sendLatest = async () => {
      while (true) {
        const queued = readPendingWrite();
        if (!queued || !queued.state) {
          localStorage.setItem(SERVER_SEEN_KEY, "1");
          syncStatus("synced");
          return { ok: true, pending: false };
        }
        syncStatus("syncing");
        try {
          const response = await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: queued.state }),
            keepalive: true
          });
          if (!response.ok) throw new Error("本机服务器暂时无法保存数据（HTTP " + response.status + "）。");
          const latest = readPendingWrite();
          if (latest && latest.id === queued.id) {
            localStorage.removeItem(PENDING_WRITE_KEY);
            localStorage.setItem(SERVER_SEEN_KEY, "1");
            syncStatus("synced");
            return { ok: true, pending: false };
          }
          // A newer local edit arrived while this request was in flight. Send it
          // next so an older request cannot be the final server write.
        } catch (error) {
          const message = error && error.message ? error.message : "无法连接本机服务器；数据已保存在此浏览器，稍后会自动重试。";
          syncStatus("pending", message);
          return { ok: false, pending: true, error: message };
        }
      }
    };

    const locks = window.navigator && window.navigator.locks;
    syncInFlight = (locks && typeof locks.request === "function"
      ? locks.request("my-growth-os-state-sync", sendLatest)
      : sendLatest()).catch(error => {
        const message = error && error.message ? error.message : "无法连接本机服务器；数据已保存在此浏览器，稍后会自动重试。";
        syncStatus("pending", message);
        return { ok: false, pending: true, error: message };
      }).finally(() => { syncInFlight = null; });
    return syncInFlight;
  }

  function load() {
    let raw = null;
    let serverChecked = false;
    let serverHadState = false;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("my-growth-os-state-v1") || "null"); } catch {}
    const pending = readPendingWrite();
    // A locally queued edit wins until its server write succeeds. Otherwise a
    // reload during a network outage could replace the edit with an older copy.
    try {
      if (isHttpApp() && !pending) {
        const request = new XMLHttpRequest();
        request.open("GET", "/api/state", false);
        request.send();
        if (request.status >= 200 && request.status < 300) {
          serverChecked = true;
          localStorage.setItem(SERVER_SEEN_KEY, "1");
          const payload = JSON.parse(request.responseText || "{}");
          if (payload.state) { raw = payload.state; serverHadState = true; }
        }
      }
    } catch {}
    const state = mergeState(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (pending) flushPendingWrites();
    else if (serverChecked && !serverHadState) save(state);
    else if (!raw && !isHttpApp()) save(state);
    syncStatus(pending ? "pending" : syncSnapshot().status);
    return state;
  }

  function save(state) {
    const next = mergeState(state);
    next.lastUpdatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (isHttpApp()) {
      const id = Date.now().toString(36) + "-" + (++writeSequence).toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(PENDING_WRITE_KEY, JSON.stringify({ id, state: next }));
      syncStatus("pending");
      flushPendingWrites();
    } else syncStatus("local");
    window.dispatchEvent(new CustomEvent("growth-state-change", { detail: next }));
    return next;
  }

  function adoptServerState(state) {
    const next = mergeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.removeItem(PENDING_WRITE_KEY);
    if (isHttpApp()) localStorage.setItem(SERVER_SEEN_KEY, "1");
    syncStatus(isHttpApp() ? "synced" : "local");
    window.dispatchEvent(new CustomEvent("growth-state-change", { detail: next }));
    return next;
  }

  window.GrowthOS = { STORAGE_KEY, today, localDateKey, defaultState, mergeState, load, save, adoptServerState, flushPendingWrites, syncSnapshot };
  // Keep a module tab current when another tab edits the shared local store.
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try { window.dispatchEvent(new CustomEvent("growth-state-change", { detail: JSON.parse(event.newValue) })); } catch {}
    }
    if (event.key === PENDING_WRITE_KEY || event.key === SERVER_SEEN_KEY) syncStatus(syncSnapshot().status);
  });
  window.addEventListener("online", () => flushPendingWrites());
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flushPendingWrites();
  });
  if (typeof window.setInterval === "function") window.setInterval(() => {
    if (readPendingWrite()) flushPendingWrites();
  }, 15000);
})();
