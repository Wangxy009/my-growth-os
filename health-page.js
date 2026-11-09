function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function todayKey() { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function startOfWeek(date = new Date()) { const result = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const day = result.getDay() || 7; result.setDate(result.getDate() - day + 1); return result; }
function dateKey(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function formShell(fields, submitLabel = "添加记录") { return '<form class="task-form" id="moduleForm">' + fields + '<button class="primary" type="submit">' + submitLabel + '</button></form>'; }
function renderSimplePage(config) {
  const root = document.querySelector("#moduleApp");
  root.innerHTML = '<section class="module-grid">' + config.cards.map(card => '<article class="panel"><div class="panel-head"><div><p class="eyebrow">' + card.eyebrow + '</p><h3>' + card.title + '</h3></div></div><div id="' + card.id + '"></div></article>').join("") + '</section>';
  config.render();
}

const EXERCISE_TYPES = ["无氧：肩背", "无氧：臀部", "骑行", "游泳", "攀岩"];
const DEFAULT_PLAN = { strengthDays: 3, aerobicDays: 1, climbingPerMonth: 1, focus: "肩背和臀部交替，每次只练一个部位", note: "每周保留 1 天完全休息，并根据课程和生理期调整。" };

function getPlan(state) { return { ...DEFAULT_PLAN, ...(state.settings?.healthPlan || {}) }; }
function recordsForWeek(records) {
  const first = dateKey(startOfWeek());
  const lastDate = new Date(startOfWeek());
  lastDate.setDate(lastDate.getDate() + 6);
  const last = dateKey(lastDate);
  return records.filter(item => item.date >= first && item.date <= last);
}
function addHealthRecord(state, entry) {
  const value = String(entry.value || "").trim();
  if (!value || !entry.type) return false;
  state.health = Array.isArray(state.health) ? state.health : [];
  state.health.push({ id: Date.now() + Math.random(), date: entry.date || todayKey(), type: entry.type, value, note: String(entry.note || "").trim() });
  return true;
}
function removeHealthRecord(state, id) {
  const records = Array.isArray(state.health) ? state.health : [], next = records.filter(item => String(item.id) !== String(id));
  state.health = next;
  return next.length !== records.length;
}
function exerciseCounts(records, plan = getPlan({}), now = new Date()) {
  const week = recordsForWeek(records);
  const strength = week.filter(item => ["无氧：肩背", "无氧：臀部"].includes(item.type)).length;
  const aerobic = week.filter(item => ["骑行", "游泳"].includes(item.type)).length;
  const monthPrefix = dateKey(new Date(now.getFullYear(), now.getMonth(), 1)).slice(0, 7);
  const climbing = records.filter(item => item.type === "攀岩" && String(item.date || "").startsWith(monthPrefix)).length;
  const weeklyTarget = Number(plan.strengthDays || 0) + Number(plan.aerobicDays || 0);
  const adherence = weeklyTarget ? Math.min(100, Math.round((strength + aerobic) / weeklyTarget * 100)) : 0;
  return { strength, aerobic, climbing, adherence, weeklyTarget, strengthTarget: Number(plan.strengthDays || 0), aerobicTarget: Number(plan.aerobicDays || 0), climbingTarget: Number(plan.climbingPerMonth || 0) };
}
function renderSummary(state) {
  const records = state.health || [];
  const plan = getPlan(state);
  const counts = exerciseCounts(records, plan);
  const bodyFat = records.filter(item => item.type === "体脂率").slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const period = records.filter(item => item.type === "生理期").slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const week = recordsForWeek(records), nutrition = week.filter(item => item.type === "饮食").length;
  document.querySelector("#healthSummary").innerHTML = '<div class="analytics-grid"><div><strong>' + (counts.strength + counts.aerobic) + '</strong><small>本周无氧 + 有氧</small></div><div><strong>' + counts.adherence + '%</strong><small>每周训练目标完成度</small></div><div><strong>' + nutrition + '</strong><small>本周饮食记录</small></div></div><p class="muted small">无氧 ' + counts.strength + '/' + counts.strengthTarget + ' 次 · 骑行/游泳 ' + counts.aerobic + '/' + counts.aerobicTarget + ' 次（每周）· 攀岩 ' + counts.climbing + '/' + counts.climbingTarget + ' 次（本月）。攀岩单独按月统计，不计入每周有氧目标。</p><div class="status-note">最近体脂：' + (bodyFat ? escapeHTML(bodyFat.value) + '（' + bodyFat.date + '）' : '尚未记录') + ' · 最近生理期：' + (period ? escapeHTML(period.value) + '（' + period.date + '）' : '尚未记录') + '</div>';
}

function renderPlan(state) {
  const plan = getPlan(state);
  document.querySelector("#healthPlanBox").innerHTML = '<form id="healthPlanForm" class="form-grid"><label>每周无氧次数<select name="strengthDays"><option value="3" ' + (Number(plan.strengthDays) === 3 ? "selected" : "") + '>3 次</option><option value="4" ' + (Number(plan.strengthDays) === 4 ? "selected" : "") + '>4 次</option></select></label><label>每周有氧次数<select name="aerobicDays"><option value="1" ' + (Number(plan.aerobicDays) === 1 ? "selected" : "") + '>1 次</option><option value="2" ' + (Number(plan.aerobicDays) === 2 ? "selected" : "") + '>2 次</option></select></label><label>每月攀岩次数<select name="climbingPerMonth"><option value="1" ' + (Number(plan.climbingPerMonth) === 1 ? "selected" : "") + '>1 次</option><option value="2" ' + (Number(plan.climbingPerMonth) === 2 ? "selected" : "") + '>2 次</option></select></label><label>训练安排<input name="focus" value="' + escapeHTML(plan.focus) + '" placeholder="例如：肩背和臀部交替"></label><label>调整备注<textarea name="note" rows="2" placeholder="根据课程、生理期和恢复情况调整">' + escapeHTML(plan.note) + '</textarea></label><button class="primary" type="submit">保存运动计划</button></form><p class="muted small">建议保留至少 1 天完全休息；生理期、疼痛或异常不适时优先休息并咨询专业人士。</p>';
  document.querySelector("#healthPlanForm").addEventListener("submit", event => {
    event.preventDefault();
    const next = getState();
    next.settings = next.settings || {};
    next.settings.healthPlan = { strengthDays: Number(event.currentTarget.elements.strengthDays.value), aerobicDays: Number(event.currentTarget.elements.aerobicDays.value), climbingPerMonth: Number(event.currentTarget.elements.climbingPerMonth.value), focus: event.currentTarget.elements.focus.value.trim(), note: event.currentTarget.elements.note.value.trim() };
    saveState(next);
    render(next);
    toast("运动计划已保存。");
  });
}

function renderTrends(state) {
  const records = state.health || [];
  const week = recordsForWeek(records);
  const days = Array.from({ length: 7 }, (_, index) => { const date = startOfWeek(); date.setDate(date.getDate() + index); return dateKey(date); });
  const labels = ["一", "二", "三", "四", "五", "六", "日"];
  const total = week.filter(item => EXERCISE_TYPES.includes(item.type)).length;
  const typeCounts = ["无氧：肩背", "无氧：臀部", "骑行", "游泳", "攀岩"].map(type => [type, week.filter(item => item.type === type).length]);
  document.querySelector("#healthTrends").innerHTML = '<div class="metric-row"><span>本周训练记录</span><span class="metric-bar"><i style="width:' + Math.min(100, total / 4 * 100) + '%"></i></span><b>' + total + ' 次</b></div>' + typeCounts.map(([type, count]) => '<div class="metric-row"><span>' + type + '</span><span class="metric-bar"><i style="width:' + Math.min(100, count / 4 * 100) + '%"></i></span><b>' + count + ' 次</b></div>').join("") + '<div class="status-note">按周一至周日统计；攀岩月目标见健康总览。</div>' + days.map((date, index) => { const count = week.filter(item => item.date === date && EXERCISE_TYPES.includes(item.type)).length; return '<div class="metric-row"><span>周' + labels[index] + ' · ' + date.slice(5) + '</span><span class="metric-bar"><i style="width:' + (count ? Math.min(100, count / 2 * 100) : 0) + '%"></i></span><b>' + count + ' 次</b></div>'; }).join("");
}

function renderRows(state) {
  const records = (state.health || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || Number(b.id) - Number(a.id));
  document.querySelector("#healthRows").innerHTML = records.length ? records.map(item => '<div class="record" data-id="' + item.id + '"><div><strong>' + escapeHTML(item.type) + '</strong><small>' + escapeHTML(item.value) + (item.note ? ' · ' + escapeHTML(item.note) : "") + '</small></div><span class="record-tag">' + escapeHTML(item.date || "") + '</span><span class="private-badge">本地私密</span><button class="record-delete" type="button" aria-label="删除健康记录">×</button></div>').join("") : '<p class="muted small">还没有健康记录。先记录一次训练、饮食或体脂率。</p>';
  document.querySelector("#healthRows").querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const next = getState();
    const id = event.currentTarget.closest(".record").dataset.id;
    if (removeHealthRecord(next, id)) { saveState(next); render(next); toast("健康记录已删除。"); }
  }));
}

function render(state = getState()) { renderSummary(state); renderPlan(state); renderTrends(state); renderRows(state); }

renderSimplePage({ cards: [{ id: "healthSummary", eyebrow: "WEEKLY HEALTH", title: "健康总览" }, { id: "healthPlanBox", eyebrow: "TRAINING PLAN", title: "运动计划" }, { id: "healthTrends", eyebrow: "WEEKLY RHYTHM", title: "本周运动节奏" }, { id: "healthRows", eyebrow: "PRIVATE LOG", title: "健康记录" }, { id: "healthFormBox", eyebrow: "NEW RECORD", title: "添加记录" }], render() {
  const state = getState();
  render(state);
  document.querySelector("#healthFormBox").innerHTML = formShell('<label>日期<input name="date" type="date" value="' + todayKey() + '"></label><label>记录类型<select name="type"><option>无氧：肩背</option><option>无氧：臀部</option><option>骑行</option><option>游泳</option><option>攀岩</option><option>饮食</option><option>体脂率</option><option>生理期</option></select></label><label>内容或数值<input name="value" required placeholder="运动分钟、体脂率、饮食或周期备注"></label><label>补充说明<input name="note" placeholder="例如：RPE、睡眠、身体感受或饮食结构"></label>');
  const form = document.querySelector("#moduleForm");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const next = getState();
    if (!addHealthRecord(next, { date: form.elements.date.value, type: form.elements.type.value, value: form.elements.value.value, note: form.elements.note.value })) { toast("请填写记录内容。"); return; }
    saveState(next);
    form.reset();
    form.elements.date.value = todayKey();
    render(next);
    toast("健康记录已添加。");
  });
}});
window.addEventListener("growth-state-change", event => render(event.detail));
