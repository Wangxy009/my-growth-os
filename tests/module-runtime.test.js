const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("shared module state initializes and preserves countdown records", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "module-runtime.js"), "utf8");
  const window = { location: { protocol: "file:" }, addEventListener() {} };
  const context = { window, localStorage: { getItem: () => null, setItem() {} }, CustomEvent: class CustomEvent {} };
  vm.runInNewContext(source, context, { filename: "module-runtime.js" });
  const runtime = window.GrowthOS;
  assert.deepEqual(Array.from(runtime.defaultState().countdowns), []);
  const record = { id: "milestone-1", title: "雅思报名截止", category: "雅思", date: "2027-06-01", done: false };
  const restored = runtime.mergeState({ version: 2, countdowns: [record] });
  assert.deepEqual(JSON.parse(JSON.stringify(restored.countdowns)), [record]);
  assert.deepEqual(Array.from(runtime.mergeState({ version: 2 }).countdowns), []);
});

test("shared runtime exposes local calendar dates for default tasks", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "module-runtime.js"), "utf8");
  const window = { location: { protocol: "file:" }, addEventListener() {} };
  const context = { window, localStorage: { getItem: () => null, setItem() {} }, CustomEvent: class CustomEvent {} };
  vm.runInNewContext(source, context, { filename: "module-runtime.js" });
  const runtime = window.GrowthOS;
  const lateEvening = new Date(2026, 9, 13, 23, 30);
  assert.equal(runtime.localDateKey(lateEvening), "2026-10-13");
  assert.equal(runtime.defaultState().tasks[0].plannedDate, runtime.today);
});

test("failed HTTP saves stay queued and a reload keeps the local edit", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "module-runtime.js"), "utf8");
  const values = new Map();
  const events = [];
  const window = {
    location: { protocol: "http:" },
    addEventListener() {},
    dispatchEvent: event => events.push(event),
    setInterval() {}
  };
  const context = {
    window,
    document: {},
    localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    XMLHttpRequest: class XMLHttpRequest { open() {} send() { this.status = 200; this.responseText = JSON.stringify({ state: null }); } },
    fetch: async () => { throw new Error("offline"); }
  };
  vm.runInNewContext(source, context, { filename: "module-runtime.js" });
  const runtime = window.GrowthOS;
  const state = runtime.defaultState();
  state.tasks[0].title = "离线编辑保留";
  runtime.save(state);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(values.get("my-growth-os-pending-write-v1"));
  const reloaded = runtime.load();
  assert.equal(reloaded.tasks[0].title, "离线编辑保留");
  assert.ok(events.some(event => event.type === "growth-sync-status" && event.detail.status === "pending"));
});
