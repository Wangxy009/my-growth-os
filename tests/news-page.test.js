const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "news-page.js"), "utf8");

function loadNewsPage(initialState = { news: [], newsInbox: [], newsDigests: [], newsFeeds: [], settings: {} }) {
  let savedState = structuredClone(initialState);
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      innerHTML: "",
      textContent: "",
      classList: { add() {}, remove() {} },
      addEventListener() {},
      querySelectorAll() { return []; },
      querySelector() { return null; }
    });
    return elements.get(selector);
  }
  const window = {
    GrowthOS: { load: () => structuredClone(savedState), save: state => { savedState = structuredClone(state); return savedState; } },
    addEventListener() {},
    setInterval() {},
    setTimeout() {}
  };
  const context = {
    window,
    GrowthOS: window.GrowthOS,
    document: { querySelector: element, querySelectorAll: () => [] },
    localStorage: { setItem() {} },
    setTimeout() {},
    setInterval() {},
    Date,
    Math,
    URL,
    Notification: undefined,
    fetch: async () => ({ ok: false })
  };
  vm.runInNewContext(source, context, { filename: "news-page.js" });
  return { context, getState: () => structuredClone(savedState), element };
}

test("news status cycles from unread to read to summarized", () => {
  const app = loadNewsPage({ news: [{ id: "article-1", title: "A", status: "待阅读" }], newsInbox: [], newsDigests: [], newsFeeds: [], settings: {} });
  const state = app.getState();
  assert.equal(app.context.cycleNewsStatus(state, "article-1"), true);
  assert.equal(state.news[0].status, "已阅读");
  assert.equal(app.context.cycleNewsStatus(state, "article-1"), true);
  assert.equal(state.news[0].status, "已总结");
  assert.equal(app.context.cycleNewsStatus(state, "missing"), false);
});

test("same date and period resolves to the latest digest", () => {
  const app = loadNewsPage({
    news: [],
    newsInbox: [],
    newsFeeds: [],
    settings: {},
    newsDigests: [
      { id: 1, date: "2026-10-13", period: "日总结", text: "旧", createdAt: "2026-10-13T08:00:00.000Z" },
      { id: 2, date: "2026-10-13", period: "日总结", text: "新", createdAt: "2026-10-13T20:00:00.000Z" },
      { id: 3, date: "2026-10-12", period: "周总结", text: "上周", createdAt: "2026-10-12T20:00:00.000Z" }
    ]
  });
  assert.equal(app.context.findNewsDigest(app.getState(), "2026-10-13", "日总结").text, "新");
  assert.equal(app.context.uniqueNewsDigests(app.getState()).filter(item => item.date === "2026-10-13" && item.period === "日总结").length, 1);
});
