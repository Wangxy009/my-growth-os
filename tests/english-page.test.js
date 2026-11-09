const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "english-page.js"), "utf8");

function loadEnglishPage() {
  const elements = new Map();
  const state = { englishLogs: {}, englishPlans: [], englishMistakes: [], news: [], newsInbox: [], tasks: [], sessions: [] };
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: "", addEventListener() {}, querySelectorAll: () => [], querySelector: () => element(selector + " child"), elements: { source: { value: "" } } });
    return elements.get(selector);
  }
  const window = { GrowthOS: { load: () => structuredClone(state), save: value => value }, addEventListener() {} };
  const context = {
    window,
    GrowthOS: window.GrowthOS,
    renderSimplePage: config => config.render(),
    document: { querySelector: element, querySelectorAll: () => [] },
    localStorage: { setItem() {} },
    setTimeout() {},
    URL
  };
  vm.runInNewContext(source, context, { filename: "english-page.js" });
  return { context, elements };
}

test("English spaced review uses 1, 3, 7, and 14 day intervals", () => {
  const { context } = loadEnglishPage();
  const mistake = { status: "pending", reviewCount: 0, reviewStreak: 0 };
  context.applyEnglishMistakeReview(mistake, "mastered", "2026-01-01");
  assert.equal(mistake.nextReview, "2026-01-02");
  context.applyEnglishMistakeReview(mistake, "mastered", "2026-01-02");
  assert.equal(mistake.nextReview, "2026-01-05");
  context.applyEnglishMistakeReview(mistake, "mastered", "2026-01-05");
  assert.equal(mistake.nextReview, "2026-01-12");
  context.applyEnglishMistakeReview(mistake, "mastered", "2026-01-12");
  assert.equal(mistake.nextReview, "2026-01-26");
  context.applyEnglishMistakeReview(mistake, "mastered", "2026-01-26");
  assert.equal(mistake.status, "mastered");
});

test("English new daily log leaves actual vocabulary blank instead of claiming 100 completed", () => {
  const { elements } = loadEnglishPage();
  const html = elements.get("#englishLog").innerHTML;
  assert.match(html, /name="words" type="number" min="0" placeholder="今日目标 100 个" value=""/);
  assert.match(html, /未填写不会自动记作已完成/);
});

test("English daily logs and plans update through shared helpers", () => {
  const { context } = loadEnglishPage();
  const state = { englishLogs: {}, englishPlans: [{ id: "p1", status: "active" }], tasks: [{ id: 9, englishPlanId: "p1", status: "active" }] };
  context.saveEnglishDailyLog(state, "2026-10-13", { words: 80, listening: 1, reading: 72, writing: 1, speaking: 0, note: "地图题定位" });
  assert.equal(state.englishLogs["2026-10-13"].words, 80);
  assert.equal(state.englishLogs["2026-10-13"].reading, 72);
  assert.equal(context.toggleEnglishPlan(state, "p1"), true);
  assert.equal(state.englishPlans[0].status, "done");
  assert.equal(state.tasks[0].status, "done");
  assert.equal(context.toggleEnglishPlan(state, "missing"), false);
});

test("English plan creation creates a schedulable top-level task", () => {
  const { context } = loadEnglishPage();
  const state = { englishLogs: {}, englishPlans: [], tasks: [] };
  assert.equal(context.addEnglishPlan(state, { skill: "阅读", date: "2026-10-14", task: "完成一套阅读", target: "正确率 80%" }), true);
  assert.equal(state.englishPlans.length, 1);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].goal, "雅思");
  assert.equal(state.tasks[0].plannedDate, "2026-10-14");
  assert.equal(state.tasks[0].englishPlanId, state.englishPlans[0].id);
  assert.equal(context.addEnglishPlan(state, { skill: "阅读", date: "", task: "x", target: "y" }), false);
});
