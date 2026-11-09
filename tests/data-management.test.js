const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "data-management.js"), "utf8");

function harness(options = {}) {
  const handlers = {};
  const downloads = [];
  const writes = [];
  const dispatched = [];
  const blobs = new Map();
  const elements = {
    "#exportStateBackup": { addEventListener: (type, callback) => { handlers.export = callback; } },
    "#importStateBackup": { files: [], value: "", addEventListener: (type, callback) => { handlers.import = callback; } },
    "#dataManagementStatus": { textContent: "" }
  };
  const state = options.state || { version: 2, tasks: [], sessions: [], health: [] };
  let blobSequence = 0;
  const window = {
    GrowthOS: {
      STORAGE_KEY: "my-growth-os-state-v2",
      load: () => structuredClone(state),
      mergeState: value => ({ version: 2, tasks: [], sessions: [], health: [], ...structuredClone(value) })
    },
    location: { protocol: options.protocol || "file:" },
    confirm: () => options.confirm !== false,
    setTimeout: () => 0,
    dispatchEvent: event => { dispatched.push(event); }
  };
  const context = {
    window,
    GrowthOS: window.GrowthOS,
    document: {
      querySelector: selector => elements[selector] || null,
      createElement: tag => {
        assert.equal(tag, "a");
        return {
          href: "",
          download: "",
          click() { downloads.push({ name: this.download, blob: blobs.get(this.href) }); },
          remove() {}
        };
      },
      body: { appendChild() {} }
    },
    localStorage: { setItem: (...args) => writes.push(args) },
    URL: {
      createObjectURL: blob => { const url = "blob:test-" + (++blobSequence); blobs.set(url, blob); return url; },
      revokeObjectURL() {}
    },
    Blob,
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    fetch: options.fetch || (async () => ({ ok: true, json: async () => ({ ok: true }) }))
  };
  vm.runInNewContext(source, context, { filename: "data-management.js" });
  return { handlers, downloads, writes, dispatched, elements };
}

test("exports a JSON backup containing all module data", async () => {
  const app = harness({ state: { version: 2, tasks: [{ id: 1 }], health: [{ type: "生理期" }] } });
  app.handlers.export();
  assert.equal(app.downloads.length, 1);
  assert.match(app.downloads[0].name, /^my-growth-os-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const backup = JSON.parse(await app.downloads[0].blob.text());
  assert.equal(backup.format, "my-growth-os-backup");
  assert.deepEqual(backup.state.health, [{ type: "生理期" }]);
});

test("restores a valid backup after confirmation and downloads a pre-restore snapshot", async () => {
  const app = harness({ state: { version: 2, tasks: [{ id: 1 }], health: [{ type: "体脂率" }] } });
  const restored = { version: 2, tasks: [{ id: 2 }], health: [{ type: "运动" }, { type: "饮食" }] };
  app.elements["#importStateBackup"].files = [{ size: 100, text: async () => JSON.stringify({ format: "my-growth-os-backup", formatVersion: 1, state: restored }) }];
  await app.handlers.import();
  assert.equal(app.downloads.length, 1);
  assert.match(app.downloads[0].name, /^my-growth-os-before-restore-/);
  const saved = JSON.parse(app.writes[0][1]);
  assert.deepEqual(saved.tasks, restored.tasks);
  assert.deepEqual(saved.health, restored.health);
  assert.equal(app.dispatched[0].type, "growth-state-change");
  assert.match(app.elements["#dataManagementStatus"].textContent, /恢复完成/);
});

test("rejects an unsupported file without changing local state", async () => {
  const app = harness();
  app.elements["#importStateBackup"].files = [{ size: 10, text: async () => JSON.stringify({ format: "other", state: { version: 2 } }) }];
  await app.handlers.import();
  assert.equal(app.writes.length, 0);
  assert.equal(app.downloads.length, 0);
  assert.equal(app.dispatched.length, 0);
  assert.match(app.elements["#dataManagementStatus"].textContent, /不是 My Growth OS/);
});

test("does not update the browser cache when the local server rejects a restore", async () => {
  const app = harness({ protocol: "http:", fetch: async () => ({ ok: false, json: async () => ({ error: "拒绝保存" }) }) });
  app.elements["#importStateBackup"].files = [{ size: 10, text: async () => JSON.stringify({ format: "my-growth-os-backup", formatVersion: 1, state: { version: 2 } }) }];
  await app.handlers.import();
  assert.equal(app.writes.length, 0);
  assert.equal(app.dispatched.length, 0);
  assert.match(app.elements["#dataManagementStatus"].textContent, /拒绝保存/);
});
