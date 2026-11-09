function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function formShell(fields, submitLabel = "添加事项") { return '<form class="task-form" id="moduleForm">' + fields + '<button class="primary" type="submit">' + submitLabel + '</button></form>'; }
function renderSimplePage(config) {
  const root = document.querySelector("#moduleApp");
  root.innerHTML = '<section class="module-grid">' + config.cards.map(card => '<article class="panel"><div class="panel-head"><div><p class="eyebrow">' + card.eyebrow + '</p><h3>' + card.title + '</h3></div></div><div id="' + card.id + '"></div></article>').join("") + '</section>';
  config.render();
}
function localDate() { const now = new Date(); return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0"); }
function daysUntil(date) { return Math.ceil((new Date(date + "T00:00:00") - new Date(localDate() + "T00:00:00")) / 86400000); }
const APPLICATION_TRACKS = [
  { name: "实习", priority: 1, steps: [
    ["明确目标岗位", "围绕金融科技、绿色金融和数据分析筛选岗位方向、工作内容与实习时段。"],
    ["准备岗位版简历", "用真实经历说明课程基础、工具能力和可验证成果；按岗位要求调整重点。"],
    ["完成一个可复现的数据作品", "保留数据出处、清洗步骤、分析代码、结果和项目说明，便于求职与复试展示。"],
    ["建立岗位投递台账", "逐项记录岗位链接、要求、截止日期、投递状态和下一步。"],
    ["面试后复盘", "整理问题、回答证据、待补知识和下一次行动。"]
  ] },
  { name: "保研", priority: 2, steps: [
    ["向学院核实推免资格与排名", "确认本校当年资格条件、排名口径、时间安排和官方通知；不要用估算替代政策。"],
    ["整理成绩与证明材料", "按学校要求核对成绩单、排名证明、英语、竞赛及其他材料。"],
    ["梳理科研与项目经历", "整理论文、课程项目、竞赛和个人贡献，保留可核验的成果证据。"],
    ["关注目标院校夏令营", "逐个核对官方项目页面、申请资格、材料清单和报名时间。"],
    ["跟进预推免与后续流程", "依据当年官方通知更新报名、考核、确认及材料状态。"]
  ] },
  { name: "留学", priority: 3, steps: [
    ["建立香港/英国/德国项目对照表", "先收集项目方向、学制、学费、先修要求和官方申请链接，再决定优先项。"],
    ["核对语言要求与考试安排", "对照目标项目官网确认接受的考试、分数与送分规则；雅思目标暂定 7.0+。"],
    ["准备学术与申请材料", "核对成绩单、个人陈述、推荐信、简历及各项目的专属要求。"],
    ["记录项目截止日期", "以学校官方页面为准，区分轮次、时区和材料提交状态。"],
    ["整理录取后的费用与签证事项", "拿到实际项目选项后，再按官方要求核实预算、签证和入学步骤。"]
  ] }
];
let editingApplicationId = null;
function renderSummary(state) {
  const applications = state.applications || [];
  const done = applications.filter(item => item.status === "已完成" || item.status === "不再申请").length;
  const active = applications.length - done;
  const dueSoon = applications.filter(item => item.deadline && daysUntil(item.deadline) >= 0 && daysUntil(item.deadline) <= 14 && item.status !== "已完成" && item.status !== "不再申请").length;
  const overdue = applications.filter(item => item.deadline && daysUntil(item.deadline) < 0 && item.status !== "已完成" && item.status !== "不再申请").length;
  document.querySelector("#applicationSummary").innerHTML = '<div class="analytics-grid"><div><strong>' + active + '</strong><small>进行中</small></div><div><strong>' + dueSoon + '</strong><small>14 天内到期</small></div><div><strong>' + done + '</strong><small>已结束</small></div></div><p class="muted small">逾期 ' + overdue + ' 项 · 申请事项按截止日期排序，保留材料和下一步备注。</p>';
  document.querySelector("#applicationTracks").innerHTML = '<p class="muted small application-track-intro">起步清单只创建事项，不会臆造截止日期；请以学院和项目官网的当年要求为准。</p>' + APPLICATION_TRACKS.map(trackInfo => {
    const track = trackInfo.name;
    const items = applications.filter(item => item.track === track);
    const finished = items.filter(item => item.status === "已完成").length;
    const percent = items.length ? Math.round(finished / items.length * 100) : 0;
    return '<article class="application-track-card"><div class="application-track-head"><div><strong>#' + trackInfo.priority + ' · ' + track + '</strong><small>' + finished + '/' + items.length + ' 项已完成</small></div><span>' + percent + '%</span></div><div class="metric-bar"><i style="width:' + percent + '%"></i></div><button class="ghost application-template" type="button" data-track="' + escapeHTML(track) + '">添加' + track + '起步清单</button></article>';
  }).join("");
  document.querySelectorAll(".application-template").forEach(button => button.addEventListener("click", event => addTrackChecklist(event.currentTarget.dataset.track)));
}

function addTrackChecklist(track) {
  const template = APPLICATION_TRACKS.find(item => item.name === track);
  if (!template) return;
  const next = getState();
  next.applications = next.applications || [];
  const existingNames = new Set(next.applications.filter(item => item.track === track).map(item => item.name));
  const missing = template.steps.filter(([name]) => !existingNames.has(name));
  if (!missing.length) { toast(track + "清单已添加，没有重复事项。"); return; }
  missing.forEach(([name, note], index) => next.applications.push({ id: Date.now() + Math.random() + index, name, track, deadline: "", status: "关注中", projectId: null, note, source: "route-checklist" }));
  saveState(next);
  render(next);
  toast("已添加 " + missing.length + " 项" + track + "起步清单；截止日期留空，需按官方信息补充。");
}
function dueText(item) {
  if (!item.deadline) return "未设置截止日期";
  if (item.status === "已完成" || item.status === "不再申请") return "结束 · " + item.deadline;
  const days = daysUntil(item.deadline);
  if (days < 0) return "已逾期 " + Math.abs(days) + " 天";
  if (days === 0) return "今天截止";
  return days + " 天后截止";
}
const APPLICATION_STATUSES = ["关注中", "准备材料", "已投递", "面试/考核", "已完成", "不再申请"];
function applicationStatusNext(status) { const flow = ["关注中", "准备材料", "已投递", "面试/考核", "已完成"], index = flow.indexOf(status); return flow[Math.min(index < 0 ? 0 : index + 1, flow.length - 1)]; }
function advanceApplication(state, id) {
  const item = (state.applications || []).find(row => String(row.id) === String(id));
  if (!item || item.status === "已完成" || item.status === "不再申请") return false;
  item.status = applicationStatusNext(item.status);
  item.statusUpdatedAt = new Date().toISOString();
  return true;
}
function addApplicationFollowUp(state, id, entry) {
  const item = (state.applications || []).find(row => String(row.id) === String(id)), content = String(entry.content || "").trim();
  if (!item || !content) return false;
  item.followUps = Array.isArray(item.followUps) ? item.followUps : [];
  item.followUps.push({ id: Date.now() + Math.random(), date: entry.date || localDate(), content, nextAction: String(entry.nextAction || "").trim() });
  if (entry.nextAction !== undefined) item.note = String(entry.nextAction || "").trim();
  return true;
}
function optionList(values, selected) { return values.map(value => '<option value="' + escapeHTML(value) + '" ' + (value === selected ? "selected" : "") + '>' + escapeHTML(value) + '</option>').join(""); }
function editForm(item, state) {
  const tracks = Array.from(new Set(APPLICATION_TRACKS.map(track => track.name).concat(item.track || [])));
  const statuses = Array.from(new Set(APPLICATION_STATUSES.concat(item.status || [])));
  const projects = (state.projects || []).map(project => '<option value="' + escapeHTML(project.id) + '" ' + (String(project.id) === String(item.projectId) ? "selected" : "") + '>' + escapeHTML(project.title) + '</option>').join("");
  return '<form class="application-edit-form module-form-grid" data-id="' + escapeHTML(item.id) + '"><label>事项名称<input name="name" required value="' + escapeHTML(item.name) + '"></label><label>路线<select name="track">' + optionList(tracks, item.track) + '</select></label><label>截止日期<input name="deadline" type="date" value="' + escapeHTML(item.deadline || "") + '"></label><label>状态<select name="status">' + optionList(statuses, item.status || "关注中") + '</select></label><label>关联作品<select name="projectId"><option value="">不关联</option>' + projects + '</select></label><label class="application-note-field">材料 / 下一步备注<textarea name="note" rows="2">' + escapeHTML(item.note || "") + '</textarea></label><div class="module-actions application-edit-actions"><button class="primary" type="submit">保存修改</button><button class="ghost application-edit-cancel" type="button">取消</button></div></form>';
}
function renderRows(state) {
  const applications = (state.applications || []).slice().sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  document.querySelector("#applicationRows").innerHTML = applications.length ? applications.map(item => {
    const finished = item.status === "已完成" || item.status === "不再申请";
    const overdue = item.deadline && daysUntil(item.deadline) < 0 && !finished;
    const project = (state.projects || []).find(row => String(row.id) === String(item.projectId));
    const followUps = Array.isArray(item.followUps) ? item.followUps.slice().reverse() : [];
    const followUpPanel = '<details class="application-followups"><summary>跟进记录 · ' + followUps.length + ' 条</summary>' + (followUps.length ? '<div class="application-followup-list">' + followUps.slice(0, 8).map(log => '<div><strong>' + escapeHTML(log.date || "日期未填") + ' · ' + escapeHTML(log.content) + '</strong>' + (log.nextAction ? '<small>下一步：' + escapeHTML(log.nextAction) + '</small>' : '') + '</div>').join("") + '</div>' : '<p class="muted small">记录投递、沟通、面试和下一步动作。</p>') + '<form class="application-followup-form" data-id="' + escapeHTML(item.id) + '"><label>日期<input name="date" type="date" value="' + localDate() + '"></label><label>本次进展<input name="content" required placeholder="例如：完成网申并收到笔试通知"></label><label>下一步<input name="nextAction" placeholder="例如：周五前完成笔试准备"></label><button class="ghost" type="submit">保存跟进</button></form></details>';
    const row = '<div class="record application-record" data-id="' + escapeHTML(item.id) + '"><div><div class="application-title-row"><strong>' + escapeHTML(item.name) + '</strong><button class="ghost application-edit" type="button">编辑</button></div><small>' + escapeHTML(item.note || "未填写材料或下一步") + (project ? ' · 作品：' + escapeHTML(project.title) : '') + '</small></div><span class="record-tag">' + escapeHTML(item.track || "") + '</span><button class="ghost application-status-toggle" type="button" aria-label="推进申请状态" ' + (finished ? "disabled" : "") + '>' + escapeHTML(item.status || "关注中") + '</button><span class="record-tag record-status ' + (overdue ? "overdue" : finished ? "done" : "") + '">' + escapeHTML(dueText(item)) + '</span><button class="record-delete" type="button" aria-label="删除申请事项">×</button></div>' + followUpPanel;
    return row + (String(item.id) === String(editingApplicationId) ? editForm(item, state) : "");
  }).join("") : '<p class="muted small">还没有申请事项，可以先记录关注的岗位、夏令营或学校项目。</p>';
  document.querySelectorAll(".application-edit").forEach(button => button.addEventListener("click", event => {
    editingApplicationId = String(event.currentTarget.closest(".application-record").dataset.id);
    render(getState());
  }));
  document.querySelectorAll(".application-status-toggle").forEach(button => button.addEventListener("click", event => { const next = getState(), id = event.currentTarget.closest(".application-record").dataset.id; if (advanceApplication(next, id)) { saveState(next); toast("申请状态已更新。"); render(next); } }));
  document.querySelectorAll(".application-followup-form").forEach(form => form.addEventListener("submit", event => { event.preventDefault(); const next = getState(), added = addApplicationFollowUp(next, form.dataset.id, { date: form.elements.date.value, content: form.elements.content.value, nextAction: form.elements.nextAction.value }); if (!added) { toast("请先填写本次进展。"); return; } saveState(next); toast("申请跟进已保存。"); render(next); }));
  document.querySelector("#applicationRows").querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const next = getState();
    const id = event.currentTarget.closest(".record").dataset.id;
    next.applications = (next.applications || []).filter(item => String(item.id) !== id);
    if (String(editingApplicationId) === id) editingApplicationId = null;
    saveState(next);
    render(next);
    toast("申请事项已删除。");
  }));
  document.querySelectorAll(".application-edit-form").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      const next = getState();
      const item = (next.applications || []).find(row => String(row.id) === form.dataset.id);
      if (!item) return;
      item.name = form.elements.name.value.trim();
      item.track = form.elements.track.value;
      item.deadline = form.elements.deadline.value;
      item.status = form.elements.status.value;
      item.projectId = form.elements.projectId.value || null;
      item.note = form.elements.note.value.trim();
      editingApplicationId = null;
      saveState(next);
      render(next);
      toast("申请事项已更新。");
    });
    form.querySelector(".application-edit-cancel").addEventListener("click", () => { editingApplicationId = null; render(getState()); });
  });
}
function render(state = getState()) { renderSummary(state); renderRows(state); }
renderSimplePage({ cards: [{ id: "applicationSummary", eyebrow: "APPLICATION STATUS", title: "申请总览" }, { id: "applicationTracks", eyebrow: "TRACKS", title: "路线完成度" }, { id: "applicationRows", eyebrow: "APPLICATIONS", title: "申请事项" }, { id: "applicationFormBox", eyebrow: "NEW APPLICATION", title: "添加事项" }], render() {
  const state = getState();
  render(state);
  const projectOptions = (state.projects || []).map(project => '<option value="' + project.id + '">' + escapeHTML(project.title) + '</option>').join("");
  document.querySelector("#applicationFormBox").innerHTML = formShell('<input name="name" required placeholder="公司、夏令营或学校项目"><select name="track"><option>实习</option><option>保研</option><option>留学</option></select><input name="deadline" type="date"><select name="status"><option>关注中</option><option>准备材料</option><option>已投递</option><option>面试/考核</option><option>已完成</option><option>不再申请</option></select><select name="projectId"><option value="">关联作品集项目（可选）</option>' + projectOptions + '</select><input name="note" placeholder="材料、要求或下一步">');
  const form = document.querySelector("#moduleForm");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const next = getState();
    next.applications = next.applications || [];
    next.applications.push({ id: Date.now(), name: form.elements.name.value.trim(), track: form.elements.track.value, deadline: form.elements.deadline.value, status: form.elements.status.value, projectId: form.elements.projectId.value || null, note: form.elements.note.value.trim() });
    saveState(next);
    form.reset();
    render(next);
    toast("申请事项已添加。");
  });
}});
window.addEventListener("growth-state-change", event => render(event.detail));
