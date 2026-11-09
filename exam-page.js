function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function localDateKey(date = new Date()) { const year = date.getFullYear(), month = String(date.getMonth() + 1).padStart(2, "0"), day = String(date.getDate()).padStart(2, "0"); return year + "-" + month + "-" + day; }
function today() { return localDateKey(); }
function dateLabel(value) { if (!value) return "未设置"; return new Date(value + "T00:00:00").toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }); }
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14];
function shiftReviewDate(value, days) {
  const parts = String(value || today()).split("-").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return today();
  return localDateKey(new Date(parts[0], parts[1] - 1, parts[2] + days));
}
function reviewDueLabel(item, date = today()) {
  if (!item.nextReview) return "今日待复习";
  const start = new Date(date + "T00:00:00"), due = new Date(item.nextReview + "T00:00:00");
  const days = Math.ceil((due - start) / 86400000);
  if (!Number.isFinite(days)) return "复习日期待修正";
  if (days < 0) return "逾期 " + Math.abs(days) + " 天";
  if (days === 0) return "今日待复习";
  return days + " 天后复习";
}
function applyMistakeReview(item, outcome, date = today()) {
  item.reviewCount = Math.max(0, Number(item.reviewCount) || 0) + 1;
  item.lastReviewed = date;
  if (outcome === "again") {
    item.reviewStreak = 0;
    item.status = "pending";
    item.nextReview = shiftReviewDate(date, 1);
    item.masteredAt = null;
    return item;
  }
  item.reviewStreak = Math.max(0, Number(item.reviewStreak) || 0) + 1;
  if (item.reviewStreak > REVIEW_INTERVALS_DAYS.length) {
    item.status = "mastered";
    item.nextReview = "";
    item.masteredAt = date;
    return item;
  }
  item.status = "pending";
  item.nextReview = shiftReviewDate(date, REVIEW_INTERVALS_DAYS[item.reviewStreak - 1]);
  return item;
}
function subjectFor(state, id) { return (state.exams || []).find(item => String(item.id) === String(id)); }
function subjectOptions(exams) { return exams.length ? exams.map(item => '<option value="' + item.id + '">' + escapeHTML(item.track + " · " + item.subject) + '</option>').join("") : '<option value="">请先添加科目</option>'; }
function selectSubject(exams) { return '<select name="examId" required>' + subjectOptions(exams) + '</select>'; }
function formField(label, input) { return '<label>' + label + input + '</label>'; }
function metric(label, value, detail = "") { return '<div class="exam-metric"><strong>' + value + '</strong><span>' + label + (detail ? '<small>' + detail + '</small>' : '') + '</span></div>'; }

function renderShell() {
  renderSimplePage({ cards: [
    { id: "examSummary", eyebrow: "PROGRESS", title: "考研学习反馈" },
    { id: "examTracks", eyebrow: "TRACKS", title: "两条路线" },
    { id: "examSubjectBox", eyebrow: "SUBJECTS", title: "科目与章节" },
    { id: "examPracticeBox", eyebrow: "PRACTICE", title: "刷题记录" },
    { id: "examMistakeBox", eyebrow: "REVIEW", title: "错题复习" },
    { id: "examPlanBox", eyebrow: "STAGES", title: "阶段计划" }
  ], render() { render(getState()); } });
}

function renderSummary(state) {
  const exams = state.exams || [], logs = state.examPracticeLogs || [], mistakes = state.examMistakes || [];
  const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - 6);
  const weekKey = localDateKey(weekStart), recent = logs.filter(item => String(item.date || "") >= weekKey);
  const questions = recent.reduce((sum, item) => sum + Number(item.questions || 0), 0), correct = recent.reduce((sum, item) => sum + Number(item.correct || 0), 0), minutes = recent.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const activeMistakes = mistakes.filter(item => item.status !== "mastered"), dueMistakes = activeMistakes.filter(item => !item.nextReview || item.nextReview <= today()).length, avg = exams.length ? Math.round(exams.reduce((sum, item) => sum + Number(item.progress || 0), 0) / exams.length) : 0;
  const examTasks = (state.tasks || []).filter(task => String(task.goal || "").startsWith("考研"));
  document.querySelector("#examSummary").innerHTML = '<div class="exam-metrics">' + metric("科目", exams.length) + metric("平均进度", avg + "%") + metric("近 7 天刷题", questions, correct + "/" + questions + " · " + (questions ? Math.round(correct / questions * 100) : 0) + "%") + metric("刷题用时", minutes + " 分钟") + metric("今日/逾期错题", dueMistakes, "待复习共 " + activeMistakes.length + " 道") + '</div><p class="muted small">考研任务完成：' + examTasks.filter(task => task.status === "done").length + " / " + examTasks.length + "。错题掌握后按间隔复习，仍不会则次日再练。" + '</p>';
}

function renderTracks(state) {
  const exams = state.exams || [], logs = state.examPracticeLogs || [], chapters = state.examChapters || [];
  document.querySelector("#examTracks").innerHTML = ["北大软微金融科技", "北大经济学院金融"].map(track => {
    const rows = exams.filter(item => item.track === track), trackQuestions = logs.filter(item => item.track === track).reduce((sum, item) => sum + Number(item.questions || 0), 0), trackChapters = chapters.filter(item => item.track === track), progress = rows.length ? Math.round(rows.reduce((sum, item) => sum + Number(item.progress || 0), 0) / rows.length) : 0;
    return '<div class="exam-track"><div class="panel-head"><div><h4>' + track + '</h4><small>' + (track === "北大软微金融科技" ? "英语一 / 数学二 / 831" : "英语二 / 数学三 / 431") + '</small></div><b>' + progress + '%</b></div><div class="metric-bar"><i style="width:' + progress + '%"></i></div><p class="muted small">' + rows.length + ' 门科目 · ' + trackChapters.length + ' 个章节 · 累计 ' + trackQuestions + ' 题</p>' + (rows.length ? rows.map(item => '<div class="exam-subject-row"><span><strong>' + escapeHTML(item.subject) + '</strong><small>' + escapeHTML(item.stage || "未设置阶段") + '</small></span><span class="bar"><i style="width:' + Math.min(100, Number(item.progress || 0)) + '%"></i></span><b>' + Number(item.progress || 0) + '%</b></div>').join("") : '<p class="muted small">暂无科目。</p>') + '</div>';
  }).join("");
}

function renderSubjects(state) {
  const exams = state.exams || [], chapters = state.examChapters || [], box = document.querySelector("#examSubjectBox");
  box.innerHTML = '<form id="subjectForm" class="module-form-grid">' + formField("路线", '<select name="track"><option>北大软微金融科技</option><option>北大经济学院金融</option></select>') + formField("科目", '<input name="subject" required placeholder="例如：数学二">') + formField("阶段", '<input name="stage" required placeholder="基础 / 强化 / 真题">') + formField("进度 %", '<input name="progress" type="number" min="0" max="100" value="0">') + '<button class="primary" type="submit">添加科目</button></form><div class="exam-subject-list">' + (exams.length ? exams.map(item => '<div class="record" data-id="' + item.id + '"><div><strong>' + escapeHTML(item.subject) + '</strong><small>' + escapeHTML(item.track + " · " + (item.stage || "未设置阶段")) + '</small></div><span class="record-tag">' + Number(item.progress || 0) + '%</span><button class="record-delete subject-delete" type="button" aria-label="删除科目">×</button></div>').join("") : '<p class="muted small">还没有科目。</p>') + '</div><h4 class="subheading">添加章节</h4><form id="chapterForm" class="module-form-grid">' + formField("科目", selectSubject(exams)) + formField("章节 / 知识点", '<input name="title" required placeholder="例如：极限与连续">') + formField("章节进度 %", '<input name="progress" type="number" min="0" max="100" value="0">') + '<button class="ghost" type="submit">保存章节</button></form><div class="compact-list">' + (chapters.length ? chapters.slice().reverse().slice(0, 8).map(item => '<div class="compact-row"><span><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(subjectFor(state, item.examId)?.subject || item.subject || "") + '</small></span><b>' + Number(item.progress || 0) + '%</b></div>').join("") : '<p class="muted small">章节会出现在这里。</p>') + '</div>';
  const subjectForm = document.querySelector("#subjectForm");
  subjectForm.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget, next = getState(); next.exams = next.exams || []; next.exams.push({ id: Date.now(), track: form.elements.track.value, subject: form.elements.subject.value.trim(), stage: form.elements.stage.value.trim(), progress: Math.min(100, Math.max(0, Number(form.elements.progress.value) || 0)) }); saveState(next); toast("科目已添加。"); render(next); });
  document.querySelectorAll(".subject-delete").forEach(button => button.addEventListener("click", event => { const id = Number(event.currentTarget.closest(".record").dataset.id), next = getState(); next.exams = (next.exams || []).filter(item => Number(item.id) !== id); next.examChapters = (next.examChapters || []).filter(item => Number(item.examId) !== id); next.examPracticeLogs = (next.examPracticeLogs || []).filter(item => Number(item.examId) !== id); next.examMistakes = (next.examMistakes || []).filter(item => Number(item.examId) !== id); saveState(next); toast("科目及其记录已删除。"); render(next); }));
  const chapterForm = document.querySelector("#chapterForm");
  chapterForm.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget, next = getState(), subject = subjectFor(next, form.elements.examId.value); if (!subject) return; next.examChapters = next.examChapters || []; next.examChapters.push({ id: Date.now(), examId: subject.id, track: subject.track, subject: subject.subject, title: form.elements.title.value.trim(), progress: Math.min(100, Math.max(0, Number(form.elements.progress.value) || 0)), status: "active" }); saveState(next); toast("章节已保存。"); render(next); });
}

function renderPractice(state) {
  const exams = state.exams || [], logs = (state.examPracticeLogs || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.id) - Number(a.id)), box = document.querySelector("#examPracticeBox");
  box.innerHTML = '<form id="practiceForm" class="module-form-grid">' + formField("日期", '<input name="date" type="date" value="' + today() + '" required>') + formField("科目", selectSubject(exams)) + formField("题量", '<input name="questions" type="number" min="1" required placeholder="完成多少题">') + formField("正确数", '<input name="correct" type="number" min="0" required placeholder="做对多少题">') + formField("用时（分钟）", '<input name="minutes" type="number" min="0" value="0">') + formField("备注", '<input name="note" placeholder="题型、状态或下一步">') + '<button class="primary" type="submit">记录刷题</button></form><div class="compact-list">' + (logs.length ? logs.slice(0, 10).map(item => '<div class="compact-row"><span><strong>' + dateLabel(item.date) + ' · ' + escapeHTML(item.subject || subjectFor(state, item.examId)?.subject || "") + '</strong><small>' + escapeHTML(item.note || "") + '</small></span><b>' + Number(item.correct || 0) + '/' + Number(item.questions || 0) + ' · ' + Number(item.minutes || 0) + 'm</b></div>').join("") : '<p class="muted small">还没有刷题记录。</p>') + '</div>';
  const form = document.querySelector("#practiceForm");
  form.addEventListener("submit", event => { event.preventDefault(); const next = getState(), subject = subjectFor(next, form.elements.examId.value), questions = Math.max(1, Number(form.elements.questions.value) || 0), correct = Math.min(questions, Math.max(0, Number(form.elements.correct.value) || 0)); next.examPracticeLogs = next.examPracticeLogs || []; next.examPracticeLogs.push({ id: Date.now(), date: form.elements.date.value, examId: subject?.id, track: subject?.track || "", subject: subject?.subject || "", questions, correct, minutes: Math.max(0, Number(form.elements.minutes.value) || 0), note: form.elements.note.value.trim() }); saveState(next); toast("刷题记录已保存。"); render(next); });
}

function renderMistakes(state) {
  const exams = state.exams || [], mistakes = state.examMistakes || [], active = mistakes.filter(item => item.status !== "mastered" && item.status !== "done").slice().sort((a, b) => String(a.nextReview || "0000").localeCompare(String(b.nextReview || "0000"))), mastered = mistakes.filter(item => item.status === "mastered" || item.status === "done"), box = document.querySelector("#examMistakeBox");
  const rows = active.length ? active.slice(0, 20).map(item => {
    const subject = item.subject || subjectFor(state, item.examId)?.subject || "未关联科目";
    const interval = Math.max(0, Number(item.reviewStreak) || 0);
    const note = [subject, item.reason || "未记录原因", reviewDueLabel(item), interval ? "连续掌握 " + interval + " 轮" : "首次复习"].join(" · ");
    const notDue = item.nextReview && item.nextReview > today();
    return '<div class="compact-row mistake-row" data-id="' + escapeHTML(item.id) + '"><span><strong>' + escapeHTML(item.question) + '</strong><small>' + escapeHTML(note) + (item.notes ? '<br>' + escapeHTML(item.notes) : "") + '</small></span><span class="mistake-actions"><button class="ghost mistake-again" type="button" ' + (notDue ? "disabled" : "") + '>还不会</button><button class="primary mistake-mastered" type="button" ' + (notDue ? "disabled" : "") + '>掌握了</button></span></div>';
  }).join("") : '<p class="muted small">今天没有到期错题。错题会按 1、3、7、14 天间隔复习；仍不会则次日再练。</p>';
  const masteredRows = mastered.length ? '<details class="mistake-mastered-list"><summary>已掌握 / 旧版已完成错题 ' + mastered.length + ' 道</summary><div class="compact-list">' + mastered.slice().reverse().slice(0, 20).map(item => '<div class="compact-row is-done"><span><strong>' + escapeHTML(item.question) + '</strong><small>' + escapeHTML((item.subject || subjectFor(state, item.examId)?.subject || "") + " · " + (item.masteredAt ? "掌握于 " + dateLabel(item.masteredAt) : "旧版完成记录")) + '</small></span><button class="ghost mistake-reopen" type="button" data-id="' + escapeHTML(item.id) + '">重新复习</button></div>').join("") + '</div></details>' : "";
  box.innerHTML = '<form id="mistakeForm" class="module-form-grid">' + formField("科目", selectSubject(exams)) + formField("题目 / 知识点", '<input name="question" required placeholder="例如：极限计算题 / 431 利率期限结构">') + formField("错误原因", '<input name="reason" required placeholder="概念不清 / 计算失误 / 审题">') + formField("下次复习", '<input name="nextReview" type="date" value="' + today() + '">') + formField("备注", '<input name="notes" placeholder="正确解法或提醒">') + '<button class="primary" type="submit">加入错题</button></form><p class="muted small mistake-review-guide">间隔复习：掌握后依次安排 1、3、7、14 天；选“还不会”则明天再次出现。复习队列不替代你自己的错因分析。</p><div class="compact-list">' + rows + '</div>' + masteredRows;
  const form = document.querySelector("#mistakeForm");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const next = getState(), subject = subjectFor(next, form.elements.examId.value);
    next.examMistakes = next.examMistakes || [];
    next.examMistakes.push({ id: Date.now(), createdAt: today(), examId: subject?.id, track: subject?.track || "", subject: subject?.subject || "", question: form.elements.question.value.trim(), reason: form.elements.reason.value.trim(), nextReview: form.elements.nextReview.value || today(), notes: form.elements.notes.value.trim(), reviewCount: 0, reviewStreak: 0, status: "pending" });
    saveState(next); toast("错题已加入复习队列。"); render(next);
  });
  box.querySelectorAll(".mistake-mastered, .mistake-again").forEach(button => button.addEventListener("click", event => {
    const row = event.currentTarget.closest(".mistake-row"), id = row?.dataset.id, next = getState(), item = (next.examMistakes || []).find(entry => String(entry.id) === String(id));
    if (!item) return;
    applyMistakeReview(item, event.currentTarget.classList.contains("mistake-again") ? "again" : "mastered");
    saveState(next);
    toast(item.status === "mastered" ? "已掌握：错题移入已掌握列表。" : "已更新复习安排：" + dateLabel(item.nextReview) + "再练。");
    render(next);
  }));
  box.querySelectorAll(".mistake-reopen").forEach(button => button.addEventListener("click", event => {
    const next = getState(), id = event.currentTarget.dataset.id, item = (next.examMistakes || []).find(entry => String(entry.id) === String(id));
    if (!item) return;
    item.status = "pending"; item.reviewStreak = 0; item.masteredAt = null; item.nextReview = today();
    saveState(next); toast("错题已放回今日复习队列。"); render(next);
  }));
}

function renderPlans(state) {
  const plans = (state.examPlans || []).slice().sort((a, b) => String(a.endDate || "9999").localeCompare(String(b.endDate || "9999"))), box = document.querySelector("#examPlanBox");
  box.innerHTML = '<form id="examPlanForm" class="module-form-grid">' + formField("路线", '<select name="track"><option>北大软微金融科技</option><option>北大经济学院金融</option></select>') + formField("阶段名称", '<input name="phase" required placeholder="例如：高数基础收尾">') + formField("截止日期", '<input name="endDate" type="date" required>') + formField("阶段目标", '<input name="target" required placeholder="例如：完成三十讲第 1-10 讲">') + formField("下一行动", '<input name="action" required placeholder="明天先做什么">') + '<button class="primary" type="submit">保存阶段计划</button></form><div class="compact-list">' + (plans.length ? plans.map(item => '<div class="compact-row"><span><strong>' + escapeHTML(item.phase) + '</strong><small>' + escapeHTML(item.track) + ' · 截止 ' + dateLabel(item.endDate) + ' · ' + escapeHTML(item.target) + '</small></span><b>' + escapeHTML(item.action) + '</b></div>').join("") : '<p class="muted small">还没有阶段计划。</p>') + '</div><p class="muted small">阶段计划用于明确下一步，不会自动替你决定报考路线或对外承诺。</p>';
  const form = document.querySelector("#examPlanForm");
  form.addEventListener("submit", event => { event.preventDefault(); const next = getState(); next.examPlans = next.examPlans || []; next.examPlans.push({ id: Date.now(), track: form.elements.track.value, phase: form.elements.phase.value.trim(), endDate: form.elements.endDate.value, target: form.elements.target.value.trim(), action: form.elements.action.value.trim(), status: "active" }); saveState(next); toast("阶段计划已保存。"); render(next); });
}

function render(state = getState()) { renderSummary(state); renderTracks(state); renderSubjects(state); renderPractice(state); renderMistakes(state); renderPlans(state); }
renderShell();
window.addEventListener("growth-state-change", event => render(event.detail));
