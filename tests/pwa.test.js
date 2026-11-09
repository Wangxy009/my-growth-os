const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");

test("service worker caches only the public shell and falls back offline", async () => {
  const handlers = {};
  const records = new Map();
  const cache = {
    added: [],
    async addAll(urls) { this.added.push(...urls); },
    async put(request, response) { records.set(new URL(request.url).pathname, response); },
    async match(request) { return records.get(new URL(request.url).pathname); }
  };
  const context = {
    self: {
      location: { origin: "http://127.0.0.1:4173" },
      addEventListener: (type, listener) => { handlers[type] = listener; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} }
    },
    caches: {
      open: async () => cache,
      keys: async () => ["my-growth-os-shell-old"],
      delete: async () => true,
      match: request => cache.match(request)
    },
    URL, Request, Response,
    fetch: async () => { throw new Error("offline"); },
    Promise
  };
  vm.runInNewContext(source, context, { filename: "service-worker.js" });
  let installPromise;
  handlers.install({ waitUntil: promise => { installPromise = promise; } });
  await installPromise;
  assert.ok(cache.added.includes("/index.html"));
  assert.ok(cache.added.includes("/icons/icon-512.png"));
  assert.ok(!cache.added.some(asset => asset.startsWith("/api/")));

  let responsePromise;
  handlers.fetch({ request: new Request("http://127.0.0.1:4173/index.html"), respondWith: promise => { responsePromise = promise; } });
  records.set("/index.html", new Response("cached"));
  const response = await responsePromise;
  assert.equal(await response.text(), "cached");

  let apiHandled = false;
  handlers.fetch({ request: new Request("http://127.0.0.1:4173/api/state"), respondWith: () => { apiHandled = true; } });
  assert.equal(apiHandled, false);
});
