export function initRouter() {
  const views = Array.from(document.querySelectorAll(".view"));
  const buttons = Array.from(document.querySelectorAll("#pill-dock .dock-btn"));

  function activate(viewName) {
    views.forEach(v => v.classList.toggle("is-active", v.dataset.view === viewName));
    buttons.forEach(b => b.classList.toggle("is-active", b.dataset.target === viewName));
    history.replaceState(null, "", `#${viewName}`);
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => activate(btn.dataset.target));
    // Placeholder for future long-press behavior:
    let pressTimer;
    btn.addEventListener("pointerdown", () => {
      pressTimer = setTimeout(() => {
        // Hook for future "press & hold" actions
        // e.g., show a context sheet
      }, 550);
    }, { passive: true });
    ["pointerup","pointercancel","pointerleave"].forEach(type => {
      btn.addEventListener(type, () => clearTimeout(pressTimer), { passive: true });
    });
  });

  // Start on hash or home
  const start = location.hash?.replace("#", "") || "home";
  activate(start);
}
