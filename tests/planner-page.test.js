const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scheduleSource = fs.readFileSync(path.join(__dirname, "..", "schedule.js"), "utf8");
const plannerSource = fs.readFileSync(path.join(__dirname, "..", "planner-page.js"), "utf8");

function loadPlanner() {
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: "", textContent: "", addEventListener() {}, querySelectorAll: () => [], parentElement: { appendChild() {} } });
    return elements.get(selector);
  }
  const state = { settings: { normalMinutes: 210 }, tasks: [], plans: {} };
  const window = { GrowthOS: { load: () => structuredClone(state), save: value => value }, addEventListener() {} };
  const context = {
    window,
    GrowthOS: window.GrowthOS,
    document: { querySelector: element, createElement: () => ({}) },
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout() {}
  };
  vm.runInNewContext(scheduleSource, context, { filename: "schedule.js" });
  vm.runInNewContext(plannerSource, context, { filename: "planner-page.js" });
  return context;
}

test("planner uses local calendar dates, not UTC date slices", () => {
  const planner = loadPlanner();
  assert.equal(planner.dateKey(new Date(2026, 0, 1, 0, 30)), "2026-01-01");
  assert.equal(planner.dateKey(new Date(2026, 11, 31, 23, 30)), "2026-12-31");
});

test("candidate study blocks never exceed the normal-day target and split oversized tasks", () => {
  const planner = loadPlanner();
  const state = {
    settings: { normalMinutes: 210 },
    tasks: [
      { id: 1, title: "数学长任务", goal: "考研数学", estimatedMinutes: 300, priority: 1, status: "active", portable: false },
      { id: 2, title: "英语词汇", goal: "雅思", estimatedMinutes: 45, priority: 2, status: "active", portable: true }
    ]
  };
  const plan = planner.buildCandidatePlan(state, new Date(2026, 9, 14));
  assert.equal(plan.plannedMinutes, 210);
  assert.equal(plan.taskIds.length, 1);
  const mathRow = plan.rows.find(row => row.taskId === 1);
  assert.equal(mathRow.minutes, 210);
  assert.match(mathRow.detail, /210\/300 分钟/);
});

test("candidate signature refreshes when a task portability rule changes", () => {
  const planner = loadPlanner();
  const state = { tasks: [{ id: 1, title: "词汇", goal: "雅思", estimatedMinutes: 20, status: "active", portable: true }] };
  const before = planner.candidateSignature(state, "2026-10-14");
  state.tasks[0].portable = false;
  assert.notEqual(planner.candidateSignature(state, "2026-10-14"), before);
});

test("tomorrow candidate tasks can be excluded and resized without exceeding the daily target", () => {
  const planner = loadPlanner();
  const state = {
    settings: { normalMinutes: 210 },
    tasks: [
      { id: "math", title: "数学", goal: "考研数学", estimatedMinutes: 120, priority: 1, status: "active" },
      { id: "english", title: "英语", goal: "雅思", estimatedMinutes: 90, priority: 2, status: "active" }
    ]
  };
  const plan = planner.buildCandidatePlan(state, new Date(2026, 9, 14));
  assert.equal(plan.plannedMinutes, 210);
  assert.equal(planner.setPlanTaskSelection(plan, "english", { included: false }, 210), true);
  assert.equal(plan.plannedMinutes, 120);
  assert.equal(plan.taskIds.length, 1);
  assert.equal(planner.setPlanTaskSelection(plan, "math", { minutes: 75 }, 210), true);
  assert.equal(plan.plannedMinutes, 75);
  assert.equal(plan.rows.find(row => row.taskId === "math").minutes, 75);
  assert.equal(planner.setPlanTaskSelection(plan, "english", { included: true }, 210), true);
  assert.equal(plan.plannedMinutes, 165);
  assert.equal(planner.setPlanTaskSelection(plan, "missing", { included: true }, 210), false);
  plan.status = "confirmed";
  assert.equal(planner.setPlanTaskSelection(plan, "math", { minutes: 50 }, 210), false);
});
