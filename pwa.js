(function () {
  const panel = document.createElement("div");
  panel.className = "pwa-tools";
  panel.innerHTML = '<span class="pwa-sync-status" role="status" aria-live="polite"></span><button class="pwa-install" type="button" hidden>安装到设备</button><span class="pwa-update-note" hidden>应用有更新，重新打开页面即可使用。</span>';
  document.body.appendChild(panel);
  const status = panel.querySelector(".pwa-sync-status");
  const installButton = panel.querySelector(".pwa-install");
  const updateNote = panel.querySelector(".pwa-update-note");
  const labels = {
    local: "仅保存在此浏览器",
    synced: "已保存到本机",
    syncing: "正在同步到本机…",
    pending: "本地已保存 · 等待本机同步"
  };
  function renderSync(detail) {
    const state = detail || (window.GrowthOS && window.GrowthOS.syncSnapshot ? window.GrowthOS.syncSnapshot() : { status: "local" });
    status.textContent = labels[state.status] || labels.local;
    status.title = state.error || "数据保存在此设备的浏览器和本机服务中，不会自动同步到云端。";
    status.classList.toggle("is-pending", state.status === "pending");
  }
  renderSync();
  window.addEventListener("growth-sync-status", event => renderSync(event.detail));
  window.addEventListener("growth-pwa-update", () => { updateNote.hidden = false; });

  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => { installButton.hidden = true; });

  if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) return;
  navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).then(registration => {
    if (registration.waiting) window.dispatchEvent(new CustomEvent("growth-pwa-update"));
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) window.dispatchEvent(new CustomEvent("growth-pwa-update"));
      });
    });
  }).catch(() => {});
})();
