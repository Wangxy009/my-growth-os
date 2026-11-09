const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "knowledge-page.js"), "utf8");

function harness(initialState = { knowledge: [], tasks: [], knowledgePath: { completed: 0 } }) {
  let savedState = structuredClone(initialState);
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      innerHTML: "",
      textContent: "",
      classList: { add() {}, remove() {} },
      addEventListener(type, callback) { this.handlers ||= {}; this.handlers[type] = callback; },
      querySelectorAll() { return []; }
    });
    return elements.get(selector);
  }
  const window = {
    GrowthOS: { load: () => structuredClone(savedState), save: state => { savedState = structuredClone(state); return savedState; } },
    addEventListener() {}
  };
  const context = {
    window,
    GrowthOS: window.GrowthOS,
    document: { querySelector: element, querySelectorAll: () => [] },
    localStorage: { setItem() {} },
    setTimeout() {},
    Date,
    Math
  };
  vm.runInNewContext(source, context, { filename: "knowledge-page.js" });
  return { context, element, getState: () => structuredClone(savedState) };
}

test("knowledge route is sequential and requires a short written reflection before advancing", () => {
  const app = harness();
  const state = app.getState();
  const first = app.context.currentKnowledgeLesson(state);

  assert.equal(first.id, "time-value");
  assert.equal(app.context.recordKnowledgeLesson(state, first.id, "短", "2026-10-13"), false);
  assert.equal(state.knowledgePath.completed, 0);
  assert.equal(app.context.recordKnowledgeLesson(state, first.id, "一年后1050元折现为1000元，所以两者价值相同。", "2026-10-13"), true);
  assert.equal(state.knowledgePath.completed, 1);
  assert.equal(state.knowledge[0].status, "学习中", "studying a lesson must not auto-claim mastery");
  assert.equal(state.knowledge[0].reflection, "一年后1050元折现为1000元，所以两者价值相同。");
  assert.equal(state.knowledge[0].references[0].url.startsWith("https://"), true);
  assert.equal(app.context.currentKnowledgeLesson(state).id, "bond-price");
  assert.equal(app.context.recordKnowledgeLesson(state, first.id, "重复提交这讲", "2026-10-13"), false);
});

test("a knowledge lesson can be added to the planner once and its task completes with the reflection", () => {
  const app = harness();
  const state = app.getState();
  assert.equal(app.context.addKnowledgeTask(state, "time-value"), true);
  assert.equal(app.context.addKnowledgeTask(state, "time-value"), false);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].goal, "金融知识");
  assert.equal(state.tasks[0].estimatedMinutes, 20);
  assert.equal(state.tasks[0].portable, true);

  assert.equal(app.context.recordKnowledgeLesson(state, "time-value", "先折现到同一时点再比较现金流。", "2026-10-13"), true);
  assert.equal(state.tasks[0].status, "done");
});

test("knowledge review status cycles separately from learning-path completion and deletion is safe", () => {
  const app = harness();
  const state = app.getState();
  state.knowledge.push({ id: "note-1", title: "<b>Note</b>", category: "AI+金融", status: "待学习" });

  assert.equal(app.context.cycleKnowledgeStatus(state, "note-1"), true);
  assert.equal(state.knowledge[0].status, "学习中");
  app.context.cycleKnowledgeStatus(state, "note-1");
  assert.equal(state.knowledge[0].status, "已掌握");
  assert.equal(app.context.deleteKnowledgeItem(state, "note-1"), true);
  assert.equal(state.knowledge.length, 0);
  assert.equal(app.context.deleteKnowledgeItem(state, "missing"), false);
});

test("lesson rendering escapes content and includes logic chain, case, and reflection form", () => {
  const app = harness();
  const html = app.element("#knowledgeToday").innerHTML;
  assert.match(html, /knowledge-chain/);
  assert.match(html, /案例/);
  assert.match(html, /公开参考资料/);
  assert.ok(app.context.lessonReferences("time-value")[0].url.startsWith("https://"));
  assert.match(html, /knowledgeLessonForm/);
  assert.match(html, /加入总计划/);

  const form = app.element("#knowledgeLessonForm");
  form.elements = { reflection: { value: "先折现到同一个时间点，再比较现金流。" } };
  form.handlers.submit({ preventDefault() {}, currentTarget: form });
  assert.equal(app.getState().knowledgePath.completed, 1, "submitting the page form should advance the route");
  assert.equal(app.getState().knowledge.length, 1);

  const hostileState = { knowledge: [{ id: 1, title: "<script>bad</script>", category: "AI+金融", status: "待学习" }], tasks: [], knowledgePath: { completed: 0 } };
  const hostile = harness(hostileState);
  assert.doesNotMatch(hostile.element("#knowledgeRows").innerHTML, /<script>/);
});
