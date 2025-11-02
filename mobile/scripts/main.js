import { loadState } from "./utils/storage.js";
import { initRouter } from "./nav/mockRouter.js";
import { PillDock } from "./ui/pillDock.js";
import { HandednessDetector } from "./gestures/handednessDetector.js";

(function boot() {
  const dockEl = document.getElementById("pill-dock");
  const dock = new PillDock(dockEl);

  // Apply stored side immediately if present to avoid flicker.
  const state = loadState();
  if (state?.side === "right") dock.applySide("right");
  else dock.applySide("left");
  dock.ready();

  // Wire up basic routing for nav buttons
  initRouter();

  // Start passive detection if not already decided
  const detector = new HandednessDetector();
  if (!detector.decided) {
    detector.onDecide = (side) => {
      dock.applySide(side);
    };
    detector.attach();
  }
})();
