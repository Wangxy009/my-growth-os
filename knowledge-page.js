function getState() { return window.GrowthOS ? GrowthOS.load() : {}; }
function saveState(state) { return window.GrowthOS ? GrowthOS.save(state) : localStorage.setItem("my-growth-os-state-v2", JSON.stringify(state)); }
function toast(message) { const node = document.querySelector("#toast"); if (node) { node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function formShell(fields, submitLabel = "添加知识点") { return '<form class="task-form" id="moduleForm">' + fields + '<button class="primary" type="submit">' + submitLabel + '</button></form>'; }
function renderSimplePage(config) {
  const root = document.querySelector("#moduleApp");
  root.innerHTML = '<section class="module-grid">' + config.cards.map(card => '<article class="panel"><div class="panel-head"><div><p class="eyebrow">' + card.eyebrow + '</p><h3>' + card.title + '</h3></div></div><div id="' + card.id + '"></div></article>').join("") + '</section>';
  config.render();
}
const CATEGORIES = ["金融基础", "计算机技术", "金融科技", "绿色金融", "AI+金融", "431/831衔接"];
const KNOWLEDGE_PATH = [
  { id: "time-value", category: "431/831衔接", title: "货币时间价值：为什么现金流要折现", concept: "未来现金流要按时间和风险折算到同一时点比较。单期现值 PV = FV / (1+r)；多期则按期数复利折现。", chain: "未来现金流 → 时间与风险 → 折现率 → 现值", example: "一年后收到 1,100 元，若年折现率是 5%，现值约为 1,047.62 元；不能把不同时间点的金额直接比较。", task: "若一年后收到 1,050 元、折现率为 5%，它与现在的 1,000 元哪个更有价值？写出计算或判断理由。" },
  { id: "bond-price", category: "金融基础", title: "债券价格、收益率与久期", concept: "债券价格等于票息和本金未来现金流的折现值。市场收益率上升时价格下降；久期描述价格对收益率变化的近似敏感度。", chain: "市场收益率上升 → 折现率上升 → 债券价格下降 → 久期衡量敏感度", example: "在其他条件相近时，长期债券通常比短期债券对利率变化更敏感；票息、期限和到期收益率都会影响久期。", task: "用自己的话解释：为什么长期债券通常比短期债券更怕利率上升？" },
  { id: "portfolio-risk", category: "431/831衔接", title: "组合风险：相关性为什么重要", concept: "组合方差不仅取决于单项资产波动，还取决于资产权重与协方差。低相关资产可能降低组合波动，但不保证没有损失。", chain: "资产权重 + 单项波动 + 协方差 → 组合方差 → 分散化效果", example: "两项资产各自波动较大，但收益并非总同涨同跌，组合波动可能低于简单加权平均。", task: "举一个可能低相关的资产组合，并说明相关性在压力时期可能怎样变化。" },
  { id: "credit-intermediation", category: "金融基础", title: "银行如何配置资金并管理信用风险", concept: "银行以负债吸收资金、以资产发放贷款，承担期限错配、流动性和信用风险。预期信用损失常用 PD × LGD × EAD 的框架理解。", chain: "借款人现金流 → 违约概率 PD → 损失率 LGD × 风险暴露 EAD → 预期损失", example: "小微企业收入波动较大时，授信判断要同时看还款来源、抵押/增信、暴露金额和经济周期。", task: "给一个小微企业贷款案例，分别写出违约概率、违约损失率和风险暴露各指什么。" },
  { id: "cashflow-quality", category: "431/831衔接", title: "利润不等于现金：财务报表如何互相印证", concept: "利润表反映一段期间的经营成果，现金流量表追踪现金流入流出，资产负债表展示时点存量；分析偿债能力要看现金来源和负债结构。", chain: "利润表看盈利 → 现金流量表看现金 → 资产负债表看存量与杠杆 → 交叉核验", example: "企业可能确认了收入但尚未收款，因此利润增长不一定意味着短期偿债现金同步增加。", task: "写出一个“利润上升但经营现金流下降”的可能原因，以及你还要核对哪个科目。" },
  { id: "data-grain", category: "计算机技术", title: "数据库表粒度、主键与连接", concept: "先说清一行代表什么，再选择主键、外键和连接方式。不同粒度的表直接连接可能重复放大金额。", chain: "定义一行的含义 → 找唯一键 → 检查关系基数 → 连接 → 核对行数与总额", example: "客户表是一位客户一行，交易表是一笔交易一行；客户连接多笔交易后，客户属性会重复，这是预期的多对一关系。", task: "设计客户表和交易表各自的主键，并说出连接后怎样检查是否重复计算。" },
  { id: "sql-aggregation", category: "计算机技术", title: "SQL 分组聚合：先定口径再算指标", concept: "GROUP BY 决定汇总粒度，筛选条件决定样本范围；时间窗口、去重规则和空值处理都属于指标口径。", chain: "明确分析单位 → 筛选样本 → 分组聚合 → 检查分母与边界条件", example: "月度违约率要明确按申请月还是放款月分组，并定义成熟观察窗、违约事件和未到期样本。", task: "写出计算月度客户数的口径：按什么月份、如何去重、空日期如何处理？" },
  { id: "python-cleaning", category: "计算机技术", title: "Python 数据清洗与防止信息泄漏", concept: "清洗步骤要可重复且只使用当时可获得的信息。训练/测试划分后再拟合填补、编码等变换，避免未来信息泄漏。", chain: "确定样本时点 → 划分训练/测试 → 仅在训练集拟合变换 → 验证泛化", example: "预测某月违约时，不应把该月之后才发生的催收结果作为特征，否则离线分数会虚高。", task: "列出一个信贷预测中可能发生的未来信息泄漏字段，并说明如何避免。" },
  { id: "credit-model", category: "金融科技", title: "信用评分：定义标签比选模型更重要", concept: "先定义违约事件、观察窗口、表现窗口和样本时点，再建立基线模型。类别不平衡时，准确率可能掩盖少数违约样本识别效果。", chain: "定义业务标签 → 建立时间切分 → 训练基线 → 评估排序与校准 → 评估业务成本", example: "如果 98% 客户未违约，永远预测“未违约”也会有 98% 准确率，却没有识别任何风险客户。", task: "为一个信用模型写清违约标签和观察窗口，并选一个比准确率更有用的评价指标。" },
  { id: "model-governance", category: "AI+金融", title: "模型评估：区分排序、校准与公平性", concept: "AUC 衡量排序区分能力，不代表概率准确；校准检验预测概率与实际发生率是否一致；还需监测群体差异、漂移和申诉机制。", chain: "区分能力 → 概率校准 → 群体差异 → 漂移监测 → 人工复核", example: "模型在总体上 AUC 较高，仍可能对某类客群系统性高估风险，因而需要分组评估与治理。", task: "给出一个信用模型上线后的监控指标，并说明什么变化会触发人工复核。" },
  { id: "green-risk", category: "绿色金融", title: "绿色金融：转型风险与物理风险", concept: "转型风险来自政策、技术和市场向低碳转型的变化；物理风险来自极端天气和长期气候变化。二者会经现金流、资产价值和融资成本影响金融机构。", chain: "气候冲击 → 企业经营/资产变化 → 现金流与抵押品变化 → 信用/市场风险", example: "高碳企业可能受碳成本和技术替代影响；沿海资产则可能面对洪涝等物理风险。", task: "为一个行业分别举出转型风险与物理风险，并说明可观察的数据。" },
  { id: "reproducible-project", category: "金融科技", title: "把金融分析做成可复现作品", concept: "可信分析需要问题、数据来源、字段口径、清洗代码、结果核验和结论边界相互对应；相关性描述不能冒充因果效应。", chain: "研究问题 → 合法数据 → 清洗与口径 → 分析与核验 → 结论边界 → README 复现", example: "README 写清数据日期、样本限制、运行命令和已知局限，别人才能检查你展示的结果。", task: "为一个金融数据项目写出 5 个 README 小标题，并标出哪个结论不能仅凭描述统计得出。" }
];
const KNOWLEDGE_REFERENCES = {
  "time-value": [{ label: "Investor.gov · Bonds and bond basics", url: "https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds" }],
  "bond-price": [{ label: "Investor.gov · Bonds and bond basics", url: "https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds" }],
  "portfolio-risk": [{ label: "Investor.gov · Asset allocation and diversification", url: "https://www.investor.gov/introduction-investing/investing-basics/asset-allocation" }],
  "credit-intermediation": [{ label: "BIS · Credit risk and the banking book", url: "https://www.bis.org/publ/bcbs128.htm" }],
  "cashflow-quality": [{ label: "Investor.gov · Understanding financial statements", url: "https://www.investor.gov/introduction-investing/getting-started/understanding-financial-statements" }],
  "data-grain": [{ label: "PostgreSQL · Table expressions and joins", url: "https://www.postgresql.org/docs/current/queries-table-expressions.html" }],
  "sql-aggregation": [{ label: "PostgreSQL · Aggregate functions", url: "https://www.postgresql.org/docs/current/functions-aggregate.html" }],
  "python-cleaning": [{ label: "scikit-learn · Common pitfalls", url: "https://scikit-learn.org/stable/common_pitfalls.html" }],
  "credit-model": [{ label: "Federal Reserve · Model risk management", url: "https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm" }],
  "model-governance": [{ label: "NIST · AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework" }],
  "green-risk": [{ label: "NGFS · Climate scenario analysis", url: "https://www.ngfs.net/en/guide-climate-scenario-analysis-central-banks-and-supervisors" }],
  "reproducible-project": [{ label: "The Turing Way · Reproducible research", url: "https://book.the-turing-way.org/reproducible-research/reproducible-research.html" }]
};
function lessonReferences(lessonId) { return KNOWLEDGE_REFERENCES[lessonId] || []; }
function todayKey() { const now = new Date(); return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0"); }
function knowledgePathProgress(state) { return Math.max(0, Math.min(KNOWLEDGE_PATH.length, Math.floor(Number(state.knowledgePath?.completed) || 0))); }
function currentKnowledgeLesson(state) { return KNOWLEDGE_PATH[knowledgePathProgress(state)] || null; }
function addKnowledgeTask(state, lessonId) {
  const lesson = KNOWLEDGE_PATH.find(item => item.id === lessonId);
  if (!lesson) return false;
  state.tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const taskId = "knowledge-path:" + lessonId;
  if (state.tasks.some(task => task.skillPathId === taskId && !["done", "cancelled"].includes(task.status))) return false;
  state.tasks.push({ id: Date.now() + Math.random(), title: "金融知识 · " + lesson.title, goal: "金融知识", priority: 4, estimatedMinutes: 20, actualMinutes: 0, plannedDate: null, status: "active", portable: true, skillPathId: taskId });
  return true;
}
function recordKnowledgeLesson(state, lessonId, reflection, date = todayKey()) {
  const lesson = currentKnowledgeLesson(state), answer = String(reflection || "").trim();
  if (!lesson || lesson.id !== lessonId || answer.length < 5) return false;
  state.knowledge = Array.isArray(state.knowledge) ? state.knowledge : [];
  if (state.knowledge.some(item => item.lessonId === lessonId && item.source === "knowledge-path")) return false;
  state.knowledge.push({ id: Date.now(), title: lesson.title, category: lesson.category, note: lesson.concept + " 案例：" + lesson.example, reflection: answer, status: "学习中", source: "knowledge-path", lessonId, lessonDate: date, references: lessonReferences(lessonId).map(reference => ({ label: reference.label, url: reference.url })) });
  state.knowledgePath = { ...(state.knowledgePath || {}), completed: knowledgePathProgress(state) + 1 };
  const taskId = "knowledge-path:" + lessonId;
  for (const task of state.tasks || []) if (task.skillPathId === taskId && !["done", "cancelled"].includes(task.status)) task.status = "done";
  return true;
}
function cycleKnowledgeStatus(state, id) {
  const item = (state.knowledge || []).find(row => String(row.id) === String(id));
  if (!item) return false;
  const statuses = ["待学习", "学习中", "已掌握"];
  item.status = statuses[(statuses.indexOf(item.status) + 1) % statuses.length];
  return true;
}
function deleteKnowledgeItem(state, id) {
  const items = Array.isArray(state.knowledge) ? state.knowledge : [];
  const nextItems = items.filter(item => String(item.id) !== String(id));
  const removed = nextItems.length !== items.length;
  state.knowledge = nextItems;
  return removed;
}
function renderDailyLesson(state) {
  const lesson = currentKnowledgeLesson(state), progress = knowledgePathProgress(state), box = document.querySelector("#knowledgeToday");
  if (!lesson) {
    box.innerHTML = '<p class="muted small">已完成这条 12 讲基础路径。你可以从知识库复习、标记掌握度，或添加导师/课程指定的专题。</p><div class="knowledge-path-progress"><strong>基础路径已完成</strong><span>12 / 12</span><span class="metric-bar"><i style="width:100%"></i></span></div>';
    return;
  }
  const prerequisite = progress ? KNOWLEDGE_PATH[progress - 1]?.title : "基础起点";
  const taskId = "knowledge-path:" + lesson.id, tasks = state.tasks || [], linkedTask = tasks.find(task => task.skillPathId === taskId), taskAdded = linkedTask && !["done", "cancelled"].includes(linkedTask.status), taskDone = linkedTask?.status === "done";
  const chain = lesson.chain.split(" → ").map((node, index) => (index ? '<span class="knowledge-chain-arrow">→</span>' : "") + '<span class="knowledge-chain-node">' + escapeHTML(node) + '</span>').join("");
  const references = lessonReferences(lesson.id);
  const referenceHTML = references.length ? '<div class="knowledge-references"><b>公开参考资料（通用概念）</b><small>用于核对定义和延伸阅读，不代表 431/831 指定教材或院校大纲。</small>' + references.map(reference => '<a href="' + escapeHTML(reference.url) + '" target="_blank" rel="noreferrer">' + escapeHTML(reference.label) + ' ↗</a>').join("") + '</div>' : '';
  box.innerHTML = '<p class="muted small">本地精选的连续学习路径，完成自己的简答后才推进；“已学”不等于“已掌握”。课程/讲义和老师要求仍以官方材料为准。</p><div class="knowledge-path-progress"><strong>第 ' + (progress + 1) + ' / ' + KNOWLEDGE_PATH.length + ' 讲</strong><small>前置：' + escapeHTML(prerequisite) + '</small><span class="metric-bar"><i style="width:' + Math.round(progress / KNOWLEDGE_PATH.length * 100) + '%"></i></span></div><article class="knowledge-lesson"><span class="record-tag">' + escapeHTML(lesson.category) + ' · ' + todayKey() + '</span><h4>' + escapeHTML(lesson.title) + '</h4><div class="knowledge-chain">' + chain + '</div><p><b>核心逻辑：</b>' + escapeHTML(lesson.concept) + '</p><p><b>案例：</b>' + escapeHTML(lesson.example) + '</p><p><b>思考题：</b>' + escapeHTML(lesson.task) + '</p>' + referenceHTML + '<form id="knowledgeLessonForm" class="knowledge-lesson-form"><label for="knowledgeReflection">用自己的话回答 / 记录疑问</label><textarea id="knowledgeReflection" name="reflection" required minlength="5" maxlength="1200" placeholder="先尝试作答；可以写出计算、逻辑链或仍不确定的点"></textarea><div class="module-actions"><button class="primary" type="submit">保存学习记录并继续</button><button class="ghost" id="knowledgeAddTask" type="button" ' + (taskAdded || taskDone ? "disabled" : "") + '>' + (taskDone ? "总计划任务已完成" : taskAdded ? "已加入总计划" : "加入总计划（约20分钟）") + '</button></div></form></article>';
  document.querySelector("#knowledgeLessonForm").addEventListener("submit", event => { event.preventDefault(); const next = getState(), answer = event.currentTarget.elements.reflection.value, recorded = recordKnowledgeLesson(next, lesson.id, answer, todayKey()); if (!recorded) { toast("请写至少 5 个字的理解或疑问，再保存本讲。"); return; } saveState(next); toast("学习记录已保存，下一讲已解锁。"); render(next); });
  document.querySelector("#knowledgeAddTask").addEventListener("click", () => { const next = getState(), added = addKnowledgeTask(next, lesson.id); if (added) saveState(next); toast(added ? "本讲已加入总计划。" : "本讲已在总计划中，或已完成。"); render(getState()); });
}
function renderSummary(state) {
  const items = Array.isArray(state.knowledge) ? state.knowledge : [];
  const mastered = items.filter(item => item.status === "已掌握").length;
  const bridge = items.filter(item => item.category === "431/831衔接").length;
  const pathProgress = knowledgePathProgress(state);
  document.querySelector("#knowledgeSummary").innerHTML = '<div class="analytics-grid"><div><strong>' + items.length + '</strong><small>知识点</small></div><div><strong>' + mastered + '</strong><small>已掌握</small></div><div><strong>' + bridge + '</strong><small>431/831 衔接</small></div></div><p class="muted small">连续路径 ' + pathProgress + '/' + KNOWLEDGE_PATH.length + ' 讲 · 知识库标记掌握率 ' + (items.length ? Math.round(mastered / items.length * 100) : 0) + '%。“完成课程记录”与“已掌握”分开统计。</p>';
  document.querySelector("#knowledgeCategories").innerHTML = CATEGORIES.map(category => {
    const categoryItems = items.filter(item => item.category === category);
    const done = categoryItems.filter(item => item.status === "已掌握").length;
    return '<div class="metric-row"><span>' + category + '</span><span class="metric-bar"><i style="width:' + (categoryItems.length ? Math.round(done / categoryItems.length * 100) : 0) + '%"></i></span><b>' + done + '/' + categoryItems.length + '</b></div>';
  }).join("");
}
function renderRows(state) {
  const items = Array.isArray(state.knowledge) ? state.knowledge : [];
  document.querySelector("#knowledgeRows").innerHTML = items.length ? items.slice().reverse().map(item => { const references = Array.isArray(item.references) ? item.references.filter(reference => reference && reference.url) : []; const sourceLinks = references.map(reference => '<a href="' + escapeHTML(reference.url) + '" target="_blank" rel="noreferrer">参考资料 ↗</a>').join("、"); return '<div class="record" data-id="' + escapeHTML(item.id) + '"><div><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(item.note || "未填写解释或案例") + (item.reflection ? ' · 我的理解：' + escapeHTML(item.reflection) : '') + (sourceLinks ? ' · ' + sourceLinks : '') + '</small></div><span class="record-tag">' + escapeHTML(item.category || "") + '</span><button class="ghost knowledge-status" type="button">' + escapeHTML(item.status || "待学习") + ' · 切换</button><button class="record-delete" type="button" aria-label="删除知识点">×</button></div>'; }).join("") : '<p class="muted small">还没有知识点。</p>';
  document.querySelectorAll(".knowledge-status").forEach(button => button.addEventListener("click", event => { const next = getState(), id = event.currentTarget.closest(".record").dataset.id; if (cycleKnowledgeStatus(next, id)) { saveState(next); render(next); } }));
  document.querySelector("#knowledgeRows").querySelectorAll(".record-delete").forEach(button => button.addEventListener("click", event => {
    const next = getState();
    const id = event.currentTarget.closest(".record").dataset.id;
    deleteKnowledgeItem(next, id);
    saveState(next);
    render(next);
    toast("知识点已删除。");
  }));
}
function render(state = getState()) { renderSummary(state); renderDailyLesson(state); renderRows(state); }
renderSimplePage({ cards: [{ id: "knowledgeSummary", eyebrow: "KNOWLEDGE STATUS", title: "知识库总览" }, { id: "knowledgeToday", eyebrow: "DAILY LESSON", title: "今日金融科技知识" }, { id: "knowledgeCategories", eyebrow: "CATEGORIES", title: "分类掌握度" }, { id: "knowledgeRows", eyebrow: "KNOWLEDGE BASE", title: "知识点" }, { id: "knowledgeFormBox", eyebrow: "NEW NOTE", title: "添加知识点" }], render() {
  const state = getState();
  render(state);
  document.querySelector("#knowledgeFormBox").innerHTML = formShell('<input name="title" required placeholder="例如：机器学习中的过拟合"><select name="category"><option>金融基础</option><option>计算机技术</option><option>金融科技</option><option>绿色金融</option><option>AI+金融</option><option>431/831衔接</option></select><input name="note" placeholder="一句话解释、案例或待研究问题"><select name="status"><option>待学习</option><option>学习中</option><option>已掌握</option></select>');
  const form = document.querySelector("#moduleForm");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const next = getState();
    next.knowledge = next.knowledge || [];
    next.knowledge.push({ id: Date.now(), title: form.elements.title.value.trim(), category: form.elements.category.value, note: form.elements.note.value.trim(), status: form.elements.status.value });
    saveState(next);
    form.reset();
    render(next);
    toast("知识点已添加。");
  });
}});
window.addEventListener("growth-state-change", event => render(event.detail));
