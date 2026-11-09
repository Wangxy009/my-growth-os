const CACHE_NAME = "my-growth-os-shell-v1";
const PUBLIC_ASSETS = [
  "/index.html", "/planner.html", "/exam.html", "/english.html", "/research.html", "/skills.html",
  "/agents.html", "/applications.html", "/knowledge.html", "/news.html", "/health.html", "/resources.html",
  "/styles.css", "/module-template.css", "/pwa.css", "/schedule.js", "/module-runtime.js", "/module-shell.js", "/modules.js",
  "/app.js", "/data-management.js", "/data-store.js", "/planner-page.js", "/exam-page.js", "/english-page.js",
  "/research-page.js", "/skills-page.js", "/agents-page.js", "/applications-page.js", "/knowledge-page.js",
  "/news-page.js", "/health-page.js", "/resources-page.js", "/pwa.js", "/manifest.webmanifest",
  "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"
];
const isPublicAsset = request => request.method === "GET" && new URL(request.url).origin === self.location.origin && PUBLIC_ASSETS.includes(new URL(request.url).pathname);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("my-growth-os-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (!isPublicAsset(request)) return;
  const cacheRequest = new Request(new URL(request.url).origin + new URL(request.url).pathname, { method: "GET" });
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) await caches.open(CACHE_NAME).then(cache => cache.put(cacheRequest, response.clone()));
      return response;
    } catch {
      return await caches.match(cacheRequest) || Response.error();
    }
  })());
});
