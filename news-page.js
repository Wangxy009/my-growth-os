function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function safeUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function safeFeedUrl(value) { try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch { return ""; } }
function todayKey() { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function currentTime() { return new Date().toTimeString().slice(0, 5); }
function notificationSettings(state) { return { enabled: false, lastBulletinDate: null, lastDigestDate: null, ...(state.settings?.newsNotifications || {}) }; }
function notifyNews(title, body) { if (typeof Notification === "function" && Notification.permission === "granted") new Notification(title, { body }); }
function findNewsDigest(state, date, period) {
  const digests = Array.isArray(state.newsDigests) ? state.newsDigests : [];
  for (let index = digests.length - 1; index >= 0; index -= 1) {
    if (digests[index].date === date && digests[index].period === period) return digests[index];
  }
  return null;
}
function uniqueNewsDigests(state) {
  const latestByPeriod = new Map();
  (Array.isArray(state.newsDigests) ? state.newsDigests : []).forEach((digest, index) => {
    const key = digest.date && digest.period ? digest.date + "::" + digest.period : "legacy::" + index;
    latestByPeriod.set(key, digest);
  });
  return Array.from(latestByPeriod.values()).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")));
}
function cycleNewsStatus(state, id) {
  const item = (state.news || []).find(entry => String(entry.id) === String(id));
  if (!item) return false;
  const statuses = ["待阅读", "已阅读", "已总结"];
  const index = statuses.indexOf(item.status || "待阅读");
  item.status = statuses[(index + 1 + statuses.length) % statuses.length];
  item.statusUpdatedAt = new Date().toISOString();
  return true;
}
function checkNewsReminder() {
  const state = getState();
  const schedule = state.settings?.newsSchedule || { bulletinTime: "08:00", dailySummaryTime: "22:00" };
  const notifications = notificationSettings(state);
  if (!notifications.enabled || typeof Notification !== "function" || Notification.permission !== "granted") return;
  const date = todayKey();
  let changed = false;
  if (currentTime() >= schedule.bulletinTime && notifications.lastBulletinDate !== date && (state.newsFeeds || []).length) {
    notifyNews("My Growth OS · 今日新闻播报", "已保存的新闻源可以开始读取，选择文章后手动确认保存。");
    notifications.lastBulletinDate = date;
    changed = true;
  }
  if (currentTime() >= schedule.dailySummaryTime && notifications.lastDigestDate !== date) {
    notifyNews("My Growth OS · 今日新闻总结", "请完成今日新闻的事实、影响、专业关联和下一步行动总结。");
    notifications.lastDigestDate = date;
    changed = true;
  }
  if (changed) {
    state.settings = state.settings || {};
    state.settings.newsNotifications = notifications;
    saveState(state);
  }
}
function formShell(fields, submitLabel = "添加文章") { return '<form class="task-form" id="moduleForm">' + fields + '<button class="primary" type="submit">' + submitLabel + '</button></form>'; }
function renderSimplePage(config) {
  const root = document.querySelector("#moduleApp");
  root.innerHTML = '<section class="module-grid">' + config.cards.map(card => '<article class="panel"><div class="panel-head"><div><p class="eyebrow">' + card.eyebrow + '</p><h3>' + card.title + '</h3></div></div><div id="' + card.id + '"></div></article>').join("") + '</section>';
  config.render();
}
const CATEGORIES = ["考研政治时政", "财经新闻", "经济学人", "金融科技"];
const PRESET_FEEDS = [
  { title: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "考研政治时政" },
  { title: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "财经新闻" },
  { title: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "金融科技" },
  { title: "China Daily China", url: "https://www.chinadaily.com.cn/rss/china_rss.xml", category: "考研政治时政" },
  { title: "Federal Reserve Press Releases", url: "https://www.federalreserve.gov/feeds/press_all.xml", category: "财经新闻" },
  { title: "Bank of England News", url: "https://www.bankofengland.co.uk/rss/news", category: "财经新闻" }
];
let autoRefreshStarted = false;

function fallbackAnalysis(item) {
  const category = item.category || "财经新闻";
  const summary = String(item.summary || item.note || item.title || "暂无摘要").trim();
  const studyLink = category === "考研政治时政"
    ? "提取主体、政策目标、国际影响与时间线，整理成考研政治时政素材。"
    : category === "财经新闻"
      ? "关注政策、利率、通胀、市场与产业链传导，补充金融专业案例。"
      : category === "金融科技"
        ? "留意技术、监管、数据与商业模式之间的关系，积累金融科技案例。"
        : "保留英文标题和关键词，作为外刊阅读与长难句训练素材。";
  return { summary, whyItMatters: "先核对原文事实，再判断它对政策、市场或你的学习目标意味着什么。", studyLink, nextAction: "打开来源，写下 3 个关键词和 1 个待验证问题。" };
}

function analysisFor(item) {
  return { ...fallbackAnalysis(item), ...(item.analysis || {}) };
}

function displayTime(value) {
  if (!value) return "时间未提供";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderSummary(state) {
  const news = state.news || [];
  const unread = news.filter(item => item.status === "待阅读").length;
  const summarized = news.filter(item => item.status === "已总结").length;
  const recent = news.filter(item => item.createdAt && Date.now() - new Date(item.createdAt).getTime() <= 7 * 86400000).length;
  const settings = state.settings?.newsSchedule || { bulletinTime: "08:00", dailySummaryTime: "22:00", weeklySummaryDay: "日", weeklySummaryTime: "20:00" };
  const todayDigest = findNewsDigest(state, todayKey(), "日总结");
  const weekDigest = findNewsDigest(state, todayKey(), "周总结");
  const dailyDue = currentTime() >= settings.dailySummaryTime && !todayDigest;
  document.querySelector("#newsSummary").innerHTML = '<div class="analytics-grid"><div><strong>' + news.length + '</strong><small>文章总数</small></div><div><strong>' + unread + '</strong><small>待阅读</small></div><div><strong>' + summarized + '</strong><small>已总结</small></div></div><p class="muted small">最近 7 天新增 ' + recent + ' 篇 · 播报 ' + settings.bulletinTime + ' · 日总结 ' + settings.dailySummaryTime + ' · 周总结 ' + settings.weeklySummaryDay + ' ' + settings.weeklySummaryTime + '。</p><p class="status-note">' + (dailyDue ? "今天的日总结待完成。" : todayDigest ? "今天的日总结已记录。" : "日总结将在设定时间提醒。") + (weekDigest ? " 本周总结已记录。" : "") + '</p>';
  document.querySelector("#newsCategories").innerHTML = CATEGORIES.map(category => '<div class="metric-row"><span>' + category + '</span><span class="metric-bar"><i style="width:' + (news.filter(item => item.category === category).length ? 100 : 0) + '%"></i></span><b>' + news.filter(item => item.category === category).length + '</b></div>').join("");
}

function renderLatest(state) {
  const saved = (state.news || []).map(item => ({ ...item, inbox: false }));
  const inbox = (state.newsInbox || []).map(item => ({ ...item, inbox: true, status: "待确认" }));
  const latest = saved.concat(inbox).sort((a, b) => String(b.publishedAt || b.createdAt || "").localeCompare(String(a.publishedAt || a.createdAt || ""))).slice(0, 10);
  document.querySelector("#newsLatest").innerHTML = latest.length ? latest.map(item => {
    const url = safeUrl(item.url);
    const analysis = analysisFor(item);
    return '<article class="latest-news-item"><div><span class="record-tag">' + escapeHTML(item.category || "未分类") + (item.inbox ? " · 待确认" : "") + '</span><h4>' + (url ? '<a href="' + escapeHTML(url) + '" target="_blank" rel="noreferrer">' + escapeHTML(item.title) + '</a>' : escapeHTML(item.title)) + '</h4><p>' + escapeHTML(analysis.summary) + '</p><div class="news-analysis"><span><b>为什么重要</b>' + escapeHTML(analysis.whyItMatters) + '</span><span><b>与你的学习</b>' + escapeHTML(analysis.studyLink) + '</span></div><small>' + escapeHTML(item.source || "本地阅读列表") + ' · ' + escapeHTML(displayTime(item.publishedAt || item.createdAt)) + '</small></div></article>';
  }).join("") : '<div class="latest-empty"><strong>还没有最新内容</strong><p class="muted small">启用推荐公开 RSS 源后刷新；文章会先展示在收件箱，确认后再保存。</p><button class="ghost setup-recommended-news" type="button">配置推荐新闻源</button></div>';
}

function renderBrief(state) {
  const saved = (state.news || []).map(item => ({ ...item, inbox: false }));
  const inbox = (state.newsInbox || []).map(item => ({ ...item, inbox: true }));
  const seen = new Set();
  const items = saved.concat(inbox).sort((a, b) => String(b.publishedAt || b.createdAt || b.fetchedAt || "").localeCompare(String(a.publishedAt || a.createdAt || a.fetchedAt || ""))).filter(item => {
    const key = item.url || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
  const grouped = CATEGORIES.map(category => ({ category, count: items.filter(item => item.category === category).length })).filter(item => item.count);
  document.querySelector("#newsBrief").innerHTML = items.length ? '<div class="brief-head"><strong>最新内容快照</strong><span class="status-note">按已读取条目整理 · ' + displayTime(new Date().toISOString()) + '</span></div><p class="muted small">这里是文章标题、摘要和规则式学习提示的汇总，不是 AI 新闻总结或事实核查；先看原文，再写影响与专业关联。</p><div class="brief-chips">' + (grouped.length ? grouped.map(item => '<span class="record-tag">' + escapeHTML(item.category) + ' ' + item.count + '</span>').join("") : '<span class="record-tag">待分类</span>') + '</div><div class="brief-list">' + items.slice(0, 3).map(item => { const analysis = analysisFor(item); return '<div class="brief-row"><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(analysis.nextAction) + '</small></div>'; }).join("") + '</div>' : '<div class="latest-empty"><strong>等待新闻源更新</strong><p class="muted small">保存一个 RSS 源后，这里会显示最新内容快照。</p></div>';
}

function renderSchedule(state) {
  const settings = state.settings?.newsSchedule || { bulletinTime: "08:00", dailySummaryTime: "22:00", weeklySummaryDay: "日", weeklySummaryTime: "20:00" };
  const digests = uniqueNewsDigests(state);
  const feeds = state.newsFeeds || [];
  const inbox = state.newsInbox || [];
  const latest = digests.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 5);
  const notificationState = notificationSettings(state);
  const feedStatus = state.newsFeedStatus || {};
  const feedErrors = Array.isArray(feedStatus.errors) && feedStatus.errors.length ? ' · 最近失败：' + feedStatus.errors.map(item => item.source + (item.error ? "（" + item.error + "）" : "")).join("、") : "";
  document.querySelector("#newsScheduleBox").innerHTML = '<form id="newsScheduleForm" class="form-grid"><label>每日播报时间<input name="bulletinTime" type="time" value="' + escapeHTML(settings.bulletinTime) + '"></label><label>每日总结时间<input name="dailySummaryTime" type="time" value="' + escapeHTML(settings.dailySummaryTime) + '"></label><label>周总结日<select name="weeklySummaryDay">' + ["一", "二", "三", "四", "五", "六", "日"].map(day => '<option ' + (settings.weeklySummaryDay === day ? "selected" : "") + '>' + day + '</option>').join("") + '</select></label><label>周总结时间<input name="weeklySummaryTime" type="time" value="' + escapeHTML(settings.weeklySummaryTime) + '"></label><button class="primary" type="submit">保存新闻计划</button></form><div class="module-actions schedule-actions"><button id="enableNewsNotifications" class="ghost" type="button">' + (notificationState.enabled ? "已开启浏览器提醒" : "开启浏览器提醒") + '</button><button id="refreshNewsFeeds" class="ghost" type="button">刷新已保存新闻源</button><span class="status-note">' + (typeof Notification === "function" ? (Notification.permission === "granted" ? "浏览器权限已允许" : Notification.permission === "denied" ? "浏览器权限已拒绝" : "需要授权") : "当前浏览器不支持通知") + '</span></div><p class="status-note">已保存新闻源 ' + feeds.length + ' 个 · 待确认收件箱 ' + inbox.length + ' 条' + (feedStatus.lastRefreshAt ? ' · 上次刷新 ' + escapeHTML(displayTime(feedStatus.lastRefreshAt)) : "") + escapeHTML(feedErrors) + (feeds.length ? '：' + feeds.map(source => escapeHTML(source.title || source.url)).join("、") : "") + '</p><div id="newsInbox" class="resource-query-output">' + (inbox.length ? inbox.slice().reverse().slice(0, 20).map((item, index) => '<div class="feed-item" data-inbox-id="' + escapeHTML(item.id) + '"><div><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(item.category || "") + ' · ' + escapeHTML(displayTime(item.publishedAt || item.fetchedAt)) + (item.summary ? " · " + escapeHTML(item.summary) : "") + '</small></div><button class="ghost inbox-save" type="button">保存</button></div>').join("") : '<p class="muted small">收件箱为空。刷新已保存新闻源后，文章会先进入这里等待确认。</p>') + '</div><div class="digest-list">' + (latest.length ? latest.map(item => '<div class="query-row"><strong>' + escapeHTML(item.period) + ' · ' + escapeHTML(item.date) + '</strong><small>' + escapeHTML(item.text || "无文字内容") + '</small></div>').join("") : '<p class="muted small">还没有日总结或周总结。</p>') + '</div>';
  document.querySelector("#newsScheduleForm").addEventListener("submit", event => {
    event.preventDefault();
    const next = getState();
    next.settings = next.settings || {};
    next.settings.newsSchedule = { bulletinTime: event.currentTarget.elements.bulletinTime.value || "08:00", dailySummaryTime: event.currentTarget.elements.dailySummaryTime.value || "22:00", weeklySummaryDay: event.currentTarget.elements.weeklySummaryDay.value, weeklySummaryTime: event.currentTarget.elements.weeklySummaryTime.value || "20:00" };
    saveState(next);
    render(next);
    renderSchedule(next);
    toast("新闻计划已保存。");
  });
  document.querySelector("#enableNewsNotifications").addEventListener("click", async () => {
    if (typeof Notification !== "function") { toast("当前浏览器不支持通知。"); return; }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") { toast("通知权限未开启。"); return; }
    const next = getState();
    next.settings = next.settings || {};
    next.settings.newsNotifications = { ...notificationSettings(next), enabled: true };
    saveState(next);
    render(next);
    renderSchedule(next);
    toast("浏览器提醒已开启。");
  });
  document.querySelector("#refreshNewsFeeds").addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "刷新中…";
    try {
      const response = await fetch("/api/news/refresh", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "刷新失败。");
      const next = getState();
      render(next);
      renderSchedule(next);
      toast("已刷新 " + payload.feeds + " 个新闻源，新增 " + payload.added + " 条待确认文章。");
    } catch (error) { toast(error.message || "刷新失败；请确认服务器正在运行。"); }
    finally { button.disabled = false; button.textContent = "刷新已保存新闻源"; }
  });
  document.querySelectorAll("#newsInbox .inbox-save").forEach(button => button.addEventListener("click", event => {
    const row = event.currentTarget.closest("[data-inbox-id]");
    const next = getState();
    const item = (next.newsInbox || []).find(entry => String(entry.id) === row.dataset.inboxId);
    if (!item) return;
    next.news = next.news || [];
    if (!next.news.some(entry => entry.url && item.url && entry.url === item.url)) next.news.push({ id: Date.now() + Math.random(), title: item.title, category: item.category || "财经新闻", url: safeUrl(item.url), note: item.summary || "", summary: item.summary || "", analysis: item.analysis || fallbackAnalysis(item), status: "待阅读", publishedAt: item.publishedAt, createdAt: new Date().toISOString(), source: item.source || "新闻源" });
    next.newsInbox = (next.newsInbox || []).filter(entry => String(entry.id) !== row.dataset.inboxId);
    saveState(next);
    render(next);
    renderSchedule(next);
    toast("收件箱文章已保存到阅读列表。");
  }));
}

function renderDigestForm(state, selectedDate = todayKey(), selectedPeriod = "日总结") {
  const initialDate = selectedDate;
  const initialPeriod = selectedPeriod;
  const existingDigest = findNewsDigest(state, initialDate, initialPeriod);
  document.querySelector("#newsDigestBox").innerHTML = '<form id="newsDigestForm" class="task-form"><input name="date" type="date" value="' + escapeHTML(initialDate) + '"><select name="period"><option value="日总结" ' + (initialPeriod === "日总结" ? "selected" : "") + '>日总结</option><option value="周总结" ' + (initialPeriod === "周总结" ? "selected" : "") + '>周总结</option></select><textarea name="text" rows="3" required placeholder="记录核心事实、影响、关键词、与你的考研/专业关联和下一步行动">' + escapeHTML(existingDigest?.text || "") + '</textarea><button class="primary" type="submit">' + (existingDigest ? "更新总结" : "保存总结") + '</button></form>';
  const form = document.querySelector("#newsDigestForm");
  form.addEventListener("change", event => {
    if (event.target?.name !== "date" && event.target?.name !== "period") return;
    const date = form.elements.date.value || todayKey();
    const period = form.elements.period.value;
    const matchingDigest = findNewsDigest(getState(), date, period);
    form.elements.text.value = matchingDigest?.text || "";
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.textContent = matchingDigest ? "更新总结" : "保存总结";
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const next = getState();
    next.newsDigests = next.newsDigests || [];
    const date = event.currentTarget.elements.date.value || todayKey();
    const period = event.currentTarget.elements.period.value;
    const text = event.currentTarget.elements.text.value.trim();
    if (!text) { toast("请先填写总结内容。"); return; }
    const previous = findNewsDigest(next, date, period);
    const now = new Date().toISOString();
    if (previous) {
      const keepIndex = next.newsDigests.lastIndexOf(previous);
      next.newsDigests = next.newsDigests.filter((item, index) => item.date !== date || item.period !== period || index === keepIndex);
      const savedDigest = findNewsDigest(next, date, period);
      savedDigest.text = text;
      savedDigest.updatedAt = now;
    } else {
      next.newsDigests.push({ id: Date.now(), date, period, text, createdAt: now });
    }
    saveState(next);
    render(next);
    renderSchedule(next);
    renderDigestForm(next, date, period);
    toast(previous ? "新闻总结已更新。" : "新闻总结已保存。");
  });
}

function renderRows(state) {
  const news = (state.news || []).slice().sort((a, b) => String(b.createdAt || b.id || "").localeCompare(String(a.createdAt || a.id || "")));
  document.querySelector("#newsRows").innerHTML = news.length ? news.map(item => {
    const url = safeUrl(item.url);
    return '<div class="record" data-id="' + escapeHTML(item.id) + '"><div><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(item.note || "未填写摘要") + (url ? ' · <a href="' + escapeHTML(url) + '" target="_blank" rel="noreferrer">打开来源</a>' : "") + '</small></div><span class="record-tag">' + escapeHTML(item.category || "") + '</span><button class="ghost record-status-toggle" type="button" aria-label="推进文章阅读状态">' + escapeHTML(item.status || "待阅读") + '</button><button class="record-delete" type="button" aria-label="删除文章">×</button></div>';
  }).join("") : '<p class="muted small">还没有文章。</p>';
  document.querySelector("#newsRows").querySelectorAll(".record-status-toggle").forEach(button => button.addEventListener("click", event => {
    const row = event.currentTarget.closest(".record");
    const next = getState();
    if (!cycleNewsStatus(next, row.dataset.id)) return;
    const updated = next.news.find(item => String(item.id) === row.dataset.id);
    saveState(next);
    render(next);
    toast("文章状态已更新：" + updated.status);
  }));
  document.querySelector("#newsRows").querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const next = getState();
    const id = event.currentTarget.closest(".record").dataset.id;
    next.news = (next.news || []).filter(item => String(item.id) !== id);
    saveState(next);
    render(next);
    toast("文章已删除。");
  }));
}

function renderFeedReader() {
  const box = document.querySelector("#newsFeedBox");
  box.innerHTML = '<div class="preset-feed-list"><p class="status-note">公开源预设（可单独添加，也可在页面顶部一键启用全部推荐源）：</p>' + PRESET_FEEDS.map(feed => '<button class="ghost preset-feed" type="button" data-url="' + escapeHTML(feed.url) + '" data-title="' + escapeHTML(feed.title) + '" data-category="' + escapeHTML(feed.category) + '">' + escapeHTML(feed.title) + '</button>').join("") + '</div><form id="newsFeedForm" class="form-grid"><label>RSS/Atom 地址<input name="url" type="url" required placeholder="https://example.com/feed.xml"></label><label>保存分类<select name="category">' + CATEGORIES.map(category => '<option>' + category + '</option>').join("") + '</select></label><div class="module-actions"><button class="ghost" type="submit">读取新闻源</button></div></form><p id="newsFeedStatus" class="status-note">公开源会先进入收件箱；经济学人请使用你的合法订阅 RSS 或文章链接。</p><div id="newsFeedItems" class="resource-query-output"></div>';
  const setupButton = document.querySelector("#setupRecommendedNews");
  if (setupButton) setupButton.addEventListener("click", () => setupRecommendedFeeds(setupButton));
  const form = document.querySelector("#newsFeedForm");
  const status = document.querySelector("#newsFeedStatus");
  document.querySelectorAll(".preset-feed").forEach(button => button.addEventListener("click", () => {
    const next = getState(); next.newsFeeds = next.newsFeeds || [];
    if (!next.newsFeeds.some(source => source.url === button.dataset.url)) next.newsFeeds.push({ id: Date.now() + Math.random(), url: button.dataset.url, title: button.dataset.title, category: button.dataset.category, enabled: true, createdAt: new Date().toISOString() });
    saveState(next); toast("已保存 " + button.dataset.title + "，开始读取最新内容。"); render(next); renderFeedReader(); renderSchedule(next); autoRefreshStarted = false; autoRefreshNews();
  }));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const feedUrl = safeFeedUrl(form.elements.url.value.trim());
    if (!feedUrl) { toast("请输入有效的 HTTPS RSS/Atom 地址。"); return; }
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "读取中…";
    try {
      const response = await fetch("/api/news/feed?url=" + encodeURIComponent(feedUrl));
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "读取失败。");
      const items = payload.items || [];
      document.querySelector("#newsFeedItems").innerHTML = '<div class="feed-heading"><strong>' + escapeHTML(payload.title || feedUrl) + ' · ' + items.length + ' 条</strong><button id="saveFeedBtn" class="ghost" type="button">保存新闻源</button></div>' + (items.length ? items.map((item, index) => '<div class="feed-item" data-index="' + index + '"><div><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(item.publishedAt || "未提供时间") + (item.summary ? " · " + escapeHTML(item.summary) : "") + '</small></div><button class="ghost feed-save" type="button">保存</button></div>').join("") : '<p class="muted small">新闻源没有可读取的文章。</p>');
      document.querySelector("#saveFeedBtn").addEventListener("click", () => {
        const next = getState();
        next.newsFeeds = next.newsFeeds || [];
        if (next.newsFeeds.some(source => source.url === feedUrl)) { toast("这个新闻源已经保存过了。"); return; }
        next.newsFeeds.push({ id: Date.now(), url: feedUrl, title: payload.title || feedUrl, category: form.elements.category.value, enabled: true, createdAt: new Date().toISOString() });
        saveState(next);
        document.querySelector("#saveFeedBtn").disabled = true;
        document.querySelector("#saveFeedBtn").textContent = "已保存来源";
        toast("新闻源已保存。");
      });
      document.querySelector("#newsFeedItems").querySelectorAll(".feed-save").forEach(button => button.addEventListener("click", event => {
        const item = items[Number(event.currentTarget.closest(".feed-item").dataset.index)];
        const next = getState();
        next.news = next.news || [];
        if (next.news.some(existing => existing.url && item.url && existing.url === item.url)) { toast("这篇文章已经保存过了。"); return; }
        next.news.push({ id: Date.now() + Math.random(), title: item.title, category: form.elements.category.value, url: safeUrl(item.url), note: item.summary || "", summary: item.summary || "", analysis: fallbackAnalysis({ ...item, category: form.elements.category.value }), status: "待阅读", publishedAt: item.publishedAt, createdAt: new Date().toISOString(), source: payload.title || feedUrl });
        saveState(next);
        event.currentTarget.disabled = true;
        event.currentTarget.textContent = "已保存";
        render(next);
        toast("文章已保存到阅读列表。");
      }));
      status.textContent = "读取完成 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) + " · 请逐条确认保存。";
    } catch (error) { status.textContent = error.message || "无法读取新闻源；请确认服务器正在运行。"; }
    finally { button.disabled = false; button.textContent = "读取新闻源"; }
  });
}

async function setupRecommendedFeeds(button) {
  if (!button || button.disabled) return;
  button.disabled = true;
  const previousLabel = button.textContent;
  button.textContent = "正在配置并读取…";
  try {
    const response = await fetch("/api/news/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installRecommended: true })
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error("推荐源配置需要通过本地服务器打开；请先运行 start-server.command。"); }
    if (!response.ok) throw new Error(payload.error || "推荐来源配置失败。");
    const next = getState();
    render(next);
    renderSchedule(next);
    const failed = (payload.errors || []).length;
    const result = "本次补充推荐源 " + (payload.configured || 0) + " 个（当前可读取 " + (payload.feeds || 0) + " 个），新增 " + (payload.added || 0) + " 条待确认文章。";
    toast(failed ? result + " 有 " + failed + " 个来源暂时读取失败，详情见新闻计划。" : result);
    button.textContent = "推荐源已配置 · 点击再次刷新";
  } catch (error) {
    toast(error.message || "配置失败；请通过本地服务器打开，并确认服务器正在运行。");
    button.textContent = previousLabel;
  } finally { button.disabled = false; }
}

function render(state = getState()) {
  renderSummary(state);
  renderBrief(state);
  renderLatest(state);
  renderRows(state);
  document.querySelectorAll(".setup-recommended-news").forEach(button => button.addEventListener("click", () => {
    const heroButton = document.querySelector("#setupRecommendedNews");
    if (heroButton) { heroButton.scrollIntoView({ behavior: "smooth", block: "center" }); setupRecommendedFeeds(heroButton); }
  }));
}

renderSimplePage({ cards: [{ id: "newsSummary", eyebrow: "READING STATUS", title: "阅读总览" }, { id: "newsBrief", eyebrow: "DAILY BRIEF", title: "今日内容快照" }, { id: "newsLatest", eyebrow: "LATEST CONTENT", title: "最新内容" }, { id: "newsCategories", eyebrow: "CATEGORIES", title: "内容分类" }, { id: "newsFeedBox", eyebrow: "RSS / ATOM READER", title: "新闻源连接器" }, { id: "newsScheduleBox", eyebrow: "NEWS SCHEDULE", title: "播报与总结计划" }, { id: "newsDigestBox", eyebrow: "DAILY / WEEKLY REVIEW", title: "记录新闻总结" }, { id: "newsRows", eyebrow: "READING LIST", title: "文章列表" }, { id: "newsFormBox", eyebrow: "NEW ARTICLE", title: "添加文章" }], render() {
  const state = getState();
  render(state);
  renderFeedReader();
  renderSchedule(state);
  renderDigestForm(state);
  document.querySelector("#newsFormBox").innerHTML = formShell('<input name="title" required placeholder="文章标题"><select name="category"><option>考研政治时政</option><option>财经新闻</option><option>经济学人</option><option>金融科技</option></select><input name="url" type="url" placeholder="来源链接（可选）"><input name="note" placeholder="摘要、关键词或待分析问题"><select name="status"><option>待阅读</option><option>已阅读</option><option>已总结</option></select>');
  const form = document.querySelector("#moduleForm");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const next = getState();
    next.news = next.news || [];
    next.news.push({ id: Date.now(), title: form.elements.title.value.trim(), category: form.elements.category.value, url: safeUrl(form.elements.url.value.trim()), note: form.elements.note.value.trim(), status: form.elements.status.value, createdAt: new Date().toISOString() });
    saveState(next);
    form.reset();
    render(next);
    toast("文章已添加。");
  });
}});
window.addEventListener("growth-state-change", event => render(event.detail));
checkNewsReminder();
window.setInterval(checkNewsReminder, 30000);
async function autoRefreshNews() {
  if (autoRefreshStarted || !(getState().newsFeeds || []).length) return;
  autoRefreshStarted = true;
  try {
    const response = await fetch("/api/news/refresh", { method: "POST" });
    if (response.ok) { const next = getState(); render(next); renderSchedule(next); }
  } catch {}
}
window.setTimeout(autoRefreshNews, 900);
window.setInterval(() => { autoRefreshStarted = false; autoRefreshNews(); }, 30 * 60 * 1000);
