const fs = require("fs");
const path = require("path");
const root = __dirname;
const pages = {
  exam: ["考研", "EXAM TRACKS", "管理北大软微金融科技与北大经济学院金融两条路线。", "考研科目、阶段、进度、题量和错题将在这里独立维护。", "exam-page.js"],
  english: ["雅思英语", "IELTS TRACK", "雅思 7.0+ 是当前英语主线。", "词汇、听力、阅读、写作和口语记录独立沉淀。", "english-page.js"],
  research: ["论文科研", "RESEARCH WORKSPACE", "从选题、文献到投稿，拆成可追踪的科研工作流。", "论文结论与投稿动作需要由你确认。", "research-page.js"],
  skills: ["技能与作品集", "SKILLS & PORTFOLIO", "Python、Excel、SQL 和金融数据分析项目。", "项目成果最终可以进入 GitHub 作品集。", "skills-page.js"],
  applications: ["申请追踪", "APPLICATION TRACKER", "统一管理实习、保研和留学事项。", "记录截止日期、材料、状态和下一步。", "applications-page.js"],
  knowledge: ["金融科技知识", "FINTECH KNOWLEDGE", "金融、计算机、AI 与 431/831 的知识连接。", "先记录知识点，后续再加入知识图谱和每日推送。", "knowledge-page.js"],
  news: ["新闻与外刊", "NEWS & READING", "考研时政、财经新闻和经济学人阅读。", "先保存来源和摘要，后续再接实时新闻源。", "news-page.js"],
  health: ["健康", "HEALTH LOG", "运动、饮食、体脂和生理期手动记录。", "健康信息默认本地私密保存。", "health-page.js"],
  resources: ["GitHub 资源", "GITHUB RESOURCE LIBRARY", "整理 Stars、许可证、使用说明和复用建议。", "用于学习参考、项目复现和作品集沉淀。", "resources-page.js"]
};
const [, , , description] = process.argv;
for (const [id, [title, eyebrow, heading, intro, pageScript]] of Object.entries(pages)) {
  const html = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' · My Growth OS</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="module-template.css"></head><body class="module-page"><header class="topbar"><div><span class="eyebrow">MY GROWTH OS</span><h1 id="moduleTitle">' + title + '</h1></div><span id="clock" class="muted"></span></header><main class="layout"><aside class="sidebar"><nav id="moduleNav"></nav><div class="profile-card"><span class="avatar">W</span><div><strong>Wangxy</strong><small>大三 · 2028届</small></div></div></aside><section class="content"><section class="hero"><div class="module-intro"><p class="eyebrow">' + eyebrow + '</p><h2>' + heading + '</h2><p class="muted">' + intro + '</p></div></section><div id="moduleApp"></div></section></main><div id="toast" class="toast"></div><script src="modules.js"></script><script src="module-runtime.js"></script><script src="module-shell.js"></script><script>initModulePage("' + id + '");</script><script src="' + pageScript + '"></script></body></html>\n';
  fs.writeFileSync(path.join(root, id + ".html"), html);
}
