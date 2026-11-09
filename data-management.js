(function () {
  const exportButton = document.querySelector("#exportStateBackup");
  const importInput = document.querySelector("#importStateBackup");
  const status = document.querySelector("#dataManagementStatus");
  if (!exportButton || !importInput || !status || !window.GrowthOS) return;

  const FORMAT = "my-growth-os-backup";
  const MAX_FILE_BYTES = 12 * 1024 * 1024;
  const dateStamp = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  function downloadState(state, suffix = "backup") {
    const envelope = { format: FORMAT, formatVersion: 1, exportedAt: new Date().toISOString(), state };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "my-growth-os-" + suffix + "-" + dateStamp() + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function validateBackup(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.format !== FORMAT) {
      throw new Error("这不是 My Growth OS 导出的备份文件。");
    }
    if (payload.formatVersion !== 1 || !payload.state || typeof payload.state !== "object" || Array.isArray(payload.state)) {
      throw new Error("备份格式或数据结构不受支持。");
    }
    if (![1, 2].includes(Number(payload.state.version || 1))) {
      throw new Error("这个备份版本暂不支持恢复。");
    }
    return GrowthOS.mergeState(payload.state);
  }

  function recordCount(state) {
    return ["tasks", "sessions", "milestones", "exams", "englishPlans", "projects", "skillLogs", "resources", "applications", "knowledge", "news", "newsInbox", "health", "countdowns"]
      .reduce((total, key) => total + (Array.isArray(state[key]) ? state[key].length : 0), 0);
  }

  exportButton.addEventListener("click", () => {
    try {
      const state = GrowthOS.load();
      downloadState(state);
      status.textContent = "备份已生成。请妥善保管此 JSON 文件；它包含所有模块数据和健康记录。";
    } catch (error) {
      status.textContent = error.message || "无法生成备份，请稍后重试。";
    }
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    let serverSaved = false;
    let restored = null;
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error("备份文件超过 12 MB 限制。");
      restored = validateBackup(JSON.parse(await file.text()));
      const current = GrowthOS.load();
      const proceed = window.confirm("将用备份中的 " + recordCount(restored) + " 条记录覆盖当前全部模块数据（当前 " + recordCount(current) + " 条）。继续前会自动下载当前快照。确定恢复吗？");
      if (!proceed) return;

      if ((window.location.protocol === "http:" || window.location.protocol === "https:") && typeof GrowthOS.flushPendingWrites === "function") {
        const sync = await GrowthOS.flushPendingWrites();
        if (!sync.ok) throw new Error("当前有未同步的记录。先连接本机服务器并完成同步，再恢复备份；当前数据未被替换。");
      }

      downloadState(current, "before-restore");
      restored.lastUpdatedAt = new Date().toISOString();
      if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        const response = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: restored }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "本机服务器未能保存恢复的数据。");
        serverSaved = true;
      }
      if (typeof GrowthOS.adoptServerState === "function") GrowthOS.adoptServerState(restored);
      else {
        localStorage.setItem(GrowthOS.STORAGE_KEY, JSON.stringify(restored));
        window.dispatchEvent(new CustomEvent("growth-state-change", { detail: restored }));
      }
      status.textContent = "恢复完成：" + recordCount(restored) + " 条记录已载入。恢复前快照也已下载。";
    } catch (error) {
      if (serverSaved) {
        window.dispatchEvent(new CustomEvent("growth-state-change", { detail: restored }));
        status.textContent = "数据已恢复到本机服务器，但浏览器缓存同步失败；刷新页面后会从本机服务器重新载入。";
      } else {
        status.textContent = error instanceof SyntaxError ? "备份文件不是有效 JSON。" : error.message || "恢复失败；当前数据未被替换。";
      }
    } finally {
      importInput.value = "";
    }
  });
})();
