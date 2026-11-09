const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "health-page.js"), "utf8");
function harness() {
  let state = { health: [], settings: {} };
  const elements = new Map();
  function element(selector) { if (!elements.has(selector)) elements.set(selector, { innerHTML: "", addEventListener() {}, querySelectorAll: () => [] }); return elements.get(selector); }
  const window = { GrowthOS: { load: () => structuredClone(state), save: value => { state = structuredClone(value); return state; } }, addEventListener() {} };
  const context = { window, GrowthOS: window.GrowthOS, document: { querySelector: element, querySelectorAll: () => [] }, localStorage: { setItem() {} }, setTimeout() {}, Date, Math };
  vm.runInNewContext(source, context, { filename: "health-page.js" });
  return { context, getState: () => structuredClone(state) };
}

test("health records require content and can be removed safely", () => {
  const app = harness();
  const state = app.getState();
  assert.equal(app.context.addHealthRecord(state, { date: "2026-10-13", type: "无氧：肩背", value: "45 分钟", note: "RPE 7" }), true);
  assert.equal(state.health.length, 1);
  assert.equal(app.context.addHealthRecord(state, { type: "饮食", value: " " }), false);
  assert.equal(app.context.removeHealthRecord(state, state.health[0].id), true);
  assert.equal(state.health.length, 0);
  assert.equal(app.context.removeHealthRecord(state, "missing"), false);
});

test("weekly strength and aerobic targets are separate from the monthly climbing target", () => {
  const app = harness();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = daysAgo => { const value = new Date(today); value.setDate(value.getDate() - daysAgo); return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0"); };
  const records = [
    { date: date(0), type: "无氧：肩背" },
    { date: date(1), type: "无氧：臀部" },
    { date: date(0), type: "骑行" },
    { date: date(1), type: "攀岩" }
  ];
  const counts = app.context.exerciseCounts(records, { strengthDays: 3, aerobicDays: 1, climbingPerMonth: 1 }, now);
  assert.equal(counts.strength, 2);
  assert.equal(counts.aerobic, 1);
  assert.equal(counts.climbing, 1);
  assert.equal(counts.adherence, 75);
});
