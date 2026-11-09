const moduleDefinitions = [
  { id: "dashboard", label: "总览", href: "index.html" },
  { id: "planner", label: "计划与课表", href: "planner.html" },
  { id: "exam", label: "考研", href: "exam.html" },
  { id: "english", label: "雅思英语", href: "english.html" },
  { id: "research", label: "论文科研", href: "research.html" },
  { id: "skills", label: "技能与作品集", href: "skills.html" },
  { id: "agents", label: "Agent 工作区", href: "agents.html" },
  { id: "applications", label: "申请追踪", href: "applications.html" },
  { id: "knowledge", label: "金融科技知识", href: "knowledge.html" },
  { id: "news", label: "新闻与外刊", href: "news.html" },
  { id: "health", label: "健康", href: "health.html" },
  { id: "resources", label: "GitHub 资源", href: "resources.html" }
];

function renderModuleNav(activeId) {
  const nav = document.querySelector("#moduleNav");
  if (!nav) return;
  nav.innerHTML = moduleDefinitions.map(item => '<a class="' + (item.id === activeId ? "active" : "") + '" href="' + item.href + '">' + item.label + '</a>').join("");
}

function renderModuleShell(activeId) {
  renderModuleNav(activeId);
  const title = document.querySelector("#moduleTitle");
  const definition = moduleDefinitions.find(item => item.id === activeId);
  if (title && definition) title.textContent = definition.label;
}

window.moduleDefinitions = moduleDefinitions;
window.renderModuleShell = renderModuleShell;
