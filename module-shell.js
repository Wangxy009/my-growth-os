if (!window.GrowthOS) document.write('<script src="module-runtime.js"></script>');
function renderSimplePage(config) {
  const root = document.querySelector("#moduleApp");
  root.innerHTML = '<section class="module-grid">' + config.cards.map(card => '<article class="panel"><div class="panel-head"><div><p class="eyebrow">' + card.eyebrow + '</p><h3>' + card.title + '</h3></div></div><div id="' + card.id + '"></div></article>').join("") + '</section>';
  config.render();
}
function initModulePage(activeId) {
  renderModuleShell(activeId);
  const clock = document.querySelector("#clock");
  const renderClock = () => { if (clock) clock.textContent = new Date().toLocaleString("zh-CN", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }); };
  renderClock();
  setInterval(renderClock, 30000);
}
