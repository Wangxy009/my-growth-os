const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "skills-page.js"), "utf8");

function loadSkillsPage(initialState = { tasks: [], projects: [], skillLogs: [], skillPaths: {} }) {
  let savedState = structuredClone(initialState);
  const elements = new Map();
  const boundButtons = new Map();
  function makeButtons(html, selector) {
    const className = selector.slice(1).split(".").pop();
    const expression = new RegExp('<button class="[^\"]*\\b' + className + '\\b[^\"]*"([^>]*)>([\\s\\S]*?)<\\/button>', "g");
    return [...html.matchAll(expression)].map(match => {
      const attributes = match[1], dataset = {};
      for (const attribute of attributes.matchAll(/data-([\w-]+)="([^"]*)"/g)) {
        const key = attribute[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        dataset[key] = attribute[2];
      }
      return { dataset, textContent: match[2], disabled: /\bdisabled\b/.test(attributes), addEventListener(type, callback) { this.handlers ||= {}; this.handlers[type] = callback; } };
    });
  }
  function element(selector) {
    if (!elements.has(selector)) {
      const node = {
        innerHTML: "",
        textContent: "",
        classList: { add() {}, remove() {} },
        addEventListener(type, callback) { this.handlers ||= {}; this.handlers[type] = callback; },
        querySelectorAll(query) { const buttons = makeButtons(this.innerHTML, query); boundButtons.set(selector + "::" + query, buttons); return buttons; }
      };
      elements.set(selector, node);
    }
    return elements.get(selector);
  }
  const window = {
    GrowthOS: {
      load: () => structuredClone(savedState),
      save: value => { savedState = structuredClone(value); return savedState; }
    },
    addEventListener() {}
  };
  const context = {
    window,
    GrowthOS: window.GrowthOS,
    document: { querySelector: element, querySelectorAll: query => makeButtons("", query) },
    renderSimplePage: config => config.render(),
    localStorage: { setItem() {} },
    setTimeout() {},
    Date,
    Math,
    URL
  };
  vm.runInNewContext(source, context, { filename: "skills-page.js" });
  return { context, element, getState: () => structuredClone(savedState), buttons: (boxSelector, query) => boundButtons.get(boxSelector + "::" + query) || [] };
}

test("skill path adds only the current next step to the planner and completion unlocks the next", () => {
  const app = loadSkillsPage();
  const state = app.getState();

  assert.equal(app.context.addSkillPathTask(state, "SQL"), true);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].title, "SQL · 掌握 SELECT、WHERE 与排序");
  assert.equal(state.tasks[0].goal, "技能");
  assert.equal(state.tasks[0].estimatedMinutes, 40);
  assert.equal(state.tasks[0].plannedDate, null);
  assert.equal(state.tasks[0].portable, true);
  assert.equal(app.context.addSkillPathTask(state, "SQL"), false, "must not duplicate an active stage");

  assert.equal(app.context.completeSkillPathStep(state, "SQL"), true);
  assert.equal(state.skillPaths.SQL.completed, 1);
  assert.equal(state.tasks[0].status, "done");
  assert.equal(app.context.addSkillPathTask(state, "SQL"), true);
  assert.equal(state.tasks[1].skillPathId, "skill-path:SQL:1");
});

test("skill path controls save planner tasks and completion from the page", () => {
  const app = loadSkillsPage();
  let addButton = app.buttons("#skillPathRows", ".skill-task-add").find(button => button.dataset.skill === "Excel");
  addButton.handlers.click({ currentTarget: addButton });
  assert.equal(app.getState().tasks.filter(task => task.skillPathId?.startsWith("skill-path:Excel:")).length, 1);

  let completeButton = app.buttons("#skillPathRows", ".skill-step-complete").find(button => button.dataset.skill === "Excel");
  completeButton.handlers.click({ currentTarget: completeButton });
  const state = app.getState();
  assert.equal(state.skillPaths.Excel.completed, 1);
  assert.equal(state.tasks[0].status, "done");
});

test("project reproducibility checklist tracks progress, completion, and reopening", () => {
  const app = loadSkillsPage();
  const state = app.getState();
  state.projects.push({ id: 9, title: "Portfolio project", status: "构思", progress: 0 });
  app.context.enableProjectWorkflow(state, 9);

  assert.equal(app.context.toggleProjectWorkflowStep(state, 9, 0), true);
  assert.equal(state.projects[0].progress, 20);
  for (let index = 1; index < 5; index += 1) app.context.toggleProjectWorkflowStep(state, 9, index);
  assert.equal(state.projects[0].progress, 100);
  assert.equal(state.projects[0].status, "已完成");

  app.context.toggleProjectWorkflowStep(state, 9, 4);
  assert.equal(state.projects[0].progress, 80);
  assert.equal(state.projects[0].status, "复现中");
});

test("enabling a checklist on a legacy project preserves existing progress and URLs reject unsafe schemes", () => {
  const app = loadSkillsPage({ tasks: [], projects: [{ id: 10, title: "Legacy", progress: 60, status: "学习中" }], skillLogs: [] });
  const state = app.getState();
  assert.equal(app.context.enableProjectWorkflow(state, "10"), true);
  assert.equal(state.projects[0].workflowBaseProgress, 60);
  assert.equal(app.context.projectProgress(state.projects[0]), 60);
  app.context.toggleProjectWorkflowStep(state, 10, 0);
  assert.equal(state.projects[0].progress, 68);
  assert.equal(app.context.safeHttpUrl("javascript:alert(1)"), "");
  assert.match(app.context.safeHttpUrl("https://example.com/path"), /^https:/);
});

test("project page can initialize and update a legacy project's reproduction checklist", () => {
  const app = loadSkillsPage({ tasks: [], projects: [{ id: 15, title: "Old project", progress: 30, status: "学习中" }], skillLogs: [] });
  let initialize = app.buttons("#projectRows", ".project-init-workflow")[0];
  initialize.handlers.click({ currentTarget: initialize });
  assert.equal(app.getState().projects[0].workflow.length, 5);
  assert.equal(app.getState().projects[0].progress, 30);

  const firstStep = app.buttons("#projectRows", ".project-step-toggle")[0];
  firstStep.handlers.click({ currentTarget: firstStep });
  assert.equal(app.getState().projects[0].workflow[0].done, true);
  assert.equal(app.getState().projects[0].progress, 44);
});

test("skill learning log keeps a concrete duration and topic", () => {
  const app = loadSkillsPage();
  const state = app.getState();
  assert.equal(app.context.recordSkillLog(state, { date: "2026-10-13", skill: "SQL", minutes: 45, topic: "JOIN 与聚合", output: "完成 3 条查询" }), true);
  assert.equal(state.skillLogs[0].date, "2026-10-13");
  assert.equal(state.skillLogs[0].skill, "SQL");
  assert.equal(state.skillLogs[0].minutes, 45);
  assert.equal(state.skillLogs[0].topic, "JOIN 与聚合");
  assert.equal(state.skillLogs[0].output, "完成 3 条查询");
  assert.equal(app.context.recordSkillLog(state, { skill: "SQL", minutes: 30, topic: "" }), false);
});

test("project activity log preserves outputs and synchronizes the next action", () => {
  const app = loadSkillsPage();
  const state = app.getState();
  state.projects.push({ id: "p-1", title: "Credit risk notebook", status: "复现中", nextAction: "补数据字典" });
  assert.equal(app.context.addProjectActivity(state, "p-1", { date: "2026-10-13", content: "检查缺失值和重复样本", output: "发现 3 个字段有缺失", nextAction: "核验样本日期口径" }), true);
  assert.equal(state.projects[0].activityLog.length, 1);
  assert.equal(state.projects[0].activityLog[0].output, "发现 3 个字段有缺失");
  assert.equal(state.projects[0].nextAction, "核验样本日期口径");
  assert.equal(app.context.addProjectActivity(state, "missing", { content: "x" }), false);
  assert.equal(app.context.addProjectActivity(state, "p-1", { content: " " }), false);
});
