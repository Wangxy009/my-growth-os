const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "research-page.js"), "utf8");

function harness(initialState = { research: { items: [], readings: [], logs: [] } }) {
  let savedState = structuredClone(initialState);
  const elements = new Map();
  const boundButtons = new Map();
  const timers = [];
  function element(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, {
        innerHTML: "",
        textContent: "",
        classList: { add() {}, remove() {} },
        addEventListener(type, callback) { this.handlers ||= {}; this.handlers[type] = callback; },
        querySelectorAll() { return []; }
      });
    }
    return elements.get(selector);
  }
  const document = {
    querySelector: element,
    querySelectorAll(selector) {
      const html = element("#researchItems").innerHTML;
      const className = selector.slice(1).split(".").pop();
      const expression = new RegExp('<button class="ghost ' + className + '" data-id="([^"]+)"', "g");
      const nodes = [...html.matchAll(expression)].map(match => ({
        dataset: { id: match[1] },
        addEventListener(type, callback) { this.handlers ||= {}; this.handlers[type] = callback; }
      }));
      boundButtons.set(selector, nodes);
      return nodes;
    }
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
    document,
    renderSimplePage: config => config.render(),
    localStorage: { setItem() {} },
    setTimeout: callback => timers.push(callback),
    Date,
    Math
  };
  vm.runInNewContext(source, context, { filename: "research-page.js" });
  function click(selector, options = {}) {
    const node = element(selector);
    assert.equal(typeof node.handlers?.click, "function", selector + " click handler should exist");
    node.handlers.click({ currentTarget: node, ...options });
  }
  function buttons(selector) { return boundButtons.get(selector) || []; }
  return { context, document, element, getState: () => structuredClone(savedState), click, buttons };
}

test("optional research starter import skips duplicates and leaves dates unset", () => {
  const app = harness({ research: { items: [
    { id: 1, title: "整理兴趣方向并预约导师交流", type: "选题", status: "进行中", dueDate: "" },
    { id: 2, title: "My own research task", type: "写作", status: "待开始", dueDate: null }
  ], readings: [], logs: [] } });

  app.click("#researchStarterImport");
  let items = app.getState().research.items;
  assert.equal(items.length, 13);
  assert.equal(items.filter(item => item.title === "整理兴趣方向并预约导师交流").length, 1);
  assert.ok(items.filter(item => item.templateId).every(item => item.status === "待开始" && item.dueDate === null));
  assert.ok(items.some(item => item.title === "核对目标期刊与投稿规范" && item.type === "投稿"));

  app.click("#researchStarterImport");
  items = app.getState().research.items;
  assert.equal(items.length, 13, "re-importing must be idempotent");
});

test("research workflow status advances and can be reopened", () => {
  const app = harness({ research: { items: [{ id: 42, title: "Write a draft", type: "写作", status: "待开始", dueDate: null }], readings: [], logs: [] } });

  let advance = app.buttons(".research-advance")[0];
  advance.handlers.click({ currentTarget: advance });
  assert.equal(app.getState().research.items[0].status, "进行中");

  advance = app.buttons(".research-advance")[0];
  advance.handlers.click({ currentTarget: advance });
  assert.equal(app.getState().research.items[0].status, "已完成");

  advance = app.buttons(".research-advance")[0];
  advance.handlers.click({ currentTarget: advance });
  assert.equal(app.getState().research.items[0].status, "待开始");
});

test("research workflow escapes task text and exposes status controls", () => {
  const app = harness({ research: { items: [{ id: 7, title: "<script>unsafe</script>", type: "写作", status: "未知状态", dueDate: null }], readings: [], logs: [] } });
  const html = app.element("#researchItems").innerHTML;
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /class="ghost research-advance"/);
  assert.match(html, /待开始/);
});

test("literature status cycles and research logs reject empty content", () => {
  const app = harness({ research: { items: [], readings: [{ id: "r1", title: "Paper", status: "待阅读" }], logs: [] } });
  const state = app.getState();
  assert.equal(app.context.cycleReadingStatus(state, "r1"), true);
  assert.equal(state.research.readings[0].status, "阅读中");
  assert.equal(app.context.cycleReadingStatus(state, "r1"), true);
  assert.equal(state.research.readings[0].status, "已读");
  assert.equal(app.context.addResearchLog(state, { date: "2026-10-13", type: "方法", content: "明确基准模型和变量口径" }), true);
  assert.equal(state.research.logs.length, 1);
  assert.equal(app.context.addResearchLog(state, { content: " " }), false);
});
