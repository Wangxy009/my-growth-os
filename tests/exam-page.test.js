const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "exam-page.js"), "utf8");

function loadExamPage() {
  const elements = new Map();
  const state = { exams: [], examChapters: [], examPracticeLogs: [], examMistakes: [], examPlans: [], tasks: [] };
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: "", addEventListener() {}, querySelectorAll: () => [], querySelector: () => element(selector + " child") });
    return elements.get(selector);
  }
  const window = {
    GrowthOS: { load: () => structuredClone(state), save: value => value },
    addEventListener() {}
  };
  const context = {
    window,
    GrowthOS: window.GrowthOS,
    renderSimplePage: config => config.render(),
    document: { querySelector: element, querySelectorAll: () => [] },
    localStorage: { setItem() {} },
    setTimeout() {}
  };
  vm.runInNewContext(source, context, { filename: "exam-page.js" });
  return context;
}

test("mistake review schedules 1, 3, 7, and 14 day intervals before mastery", () => {
  const app = loadExamPage();
  const mistake = { status: "pending", reviewCount: 0, reviewStreak: 0 };
  app.applyMistakeReview(mistake, "mastered", "2026-01-01");
  assert.equal(mistake.nextReview, "2026-01-02");
  app.applyMistakeReview(mistake, "mastered", "2026-01-02");
  assert.equal(mistake.nextReview, "2026-01-05");
  app.applyMistakeReview(mistake, "mastered", "2026-01-05");
  assert.equal(mistake.nextReview, "2026-01-12");
  app.applyMistakeReview(mistake, "mastered", "2026-01-12");
  assert.equal(mistake.nextReview, "2026-01-26");
  assert.equal(mistake.status, "pending");
  app.applyMistakeReview(mistake, "mastered", "2026-01-26");
  assert.equal(mistake.status, "mastered");
  assert.equal(mistake.masteredAt, "2026-01-26");
  assert.equal(mistake.reviewCount, 5);
});

test("a missed answer resets the interval streak and schedules the next day", () => {
  const app = loadExamPage();
  const mistake = { status: "pending", reviewCount: 2, reviewStreak: 2 };
  app.applyMistakeReview(mistake, "again", "2026-04-10");
  assert.equal(mistake.status, "pending");
  assert.equal(mistake.reviewStreak, 0);
  assert.equal(mistake.nextReview, "2026-04-11");
  assert.equal(mistake.reviewCount, 3);
});
