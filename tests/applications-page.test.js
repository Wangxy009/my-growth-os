const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "applications-page.js"), "utf8");

function harness(initialState = { applications: [], projects: [] }) {
  let savedState = structuredClone(initialState);
  const handlers = {};
  const elements = {
    "#moduleApp": { innerHTML: "" },
    "#applicationSummary": { innerHTML: "" },
    "#applicationTracks": { innerHTML: "" },
    "#applicationRows": { innerHTML: "", querySelectorAll: () => [] },
    "#applicationFormBox": { innerHTML: "" },
    "#moduleForm": { addEventListener: (type, callback) => { handlers.form = callback; } },
    "#toast": { textContent: "", classList: { add() {}, remove() {} } }
  };
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
    document: {
      querySelector: selector => elements[selector] || null,
      querySelectorAll: () => []
    },
    localStorage: { setItem() {} },
    setTimeout() {}
  };
  vm.runInNewContext(source, context, { filename: "applications-page.js" });
  return { context, getState: () => structuredClone(savedState), handlers };
}

test("adds the selected route checklist without invented deadlines and skips duplicates", () => {
  const app = harness();
  app.context.addTrackChecklist("实习");
  const first = app.getState().applications;
  assert.equal(first.length, 5);
  assert.ok(first.every(item => item.track === "实习" && item.status === "关注中" && item.deadline === ""));
  assert.ok(first.every(item => item.source === "route-checklist"));
  app.context.addTrackChecklist("实习");
  assert.equal(app.getState().applications.length, 5);
  app.context.addTrackChecklist("留学");
  assert.equal(app.getState().applications.filter(item => item.track === "留学").length, 5);
});

test("application edit form escapes saved text and offers editable deadline and status", () => {
  const app = harness();
  const html = app.context.editForm({ id: 1, name: "<script>alert(1)</script>", track: "实习", status: "关注中", note: "<b>note</b>" }, { projects: [] });
  assert.doesNotMatch(html, /<script>|<b>note<\/b>/);
  assert.match(html, /name="deadline" type="date"/);
  assert.match(html, /name="status"/);
  assert.match(html, /保存修改/);
});

test("application status and follow-up helpers preserve progress", () => {
  const app = harness({ applications: [{ id: "a1", name: "实习岗位", track: "实习", status: "关注中" }], projects: [] });
  const state = app.getState();
  assert.equal(app.context.advanceApplication(state, "a1"), true);
  assert.equal(state.applications[0].status, "准备材料");
  assert.equal(app.context.addApplicationFollowUp(state, "a1", { date: "2026-10-13", content: "完成简历初稿", nextAction: "补充项目结果图" }), true);
  assert.equal(state.applications[0].followUps.length, 1);
  assert.equal(state.applications[0].note, "补充项目结果图");
  assert.equal(app.context.addApplicationFollowUp(state, "a1", { content: " " }), false);
  assert.equal(app.context.advanceApplication(state, "missing"), false);
});
