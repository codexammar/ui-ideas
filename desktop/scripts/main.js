// Desktop: slide dock to whichever edge is closer to the pointer.
// No dwell timers. Minimal hysteresis. Always set transform on side change.

const INSET = 14;        // px from edge
const HYSTERESIS = 0;    // set to 0 for undeniable switching
const dock = document.getElementById("dock");

let currentSide = "left";
let lastX = null;

// rAF throttle
function rafThrottle(fn) {
  let scheduled = false, latest;
  return (...args) => {
    latest = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; fn(...latest); });
  };
}

function width() { return window.innerWidth || 0; }
function dockWidth() { return dock.offsetWidth || 0; }

function xFor(side) {
  const w = width();
  const dw = dockWidth();
  return side === "right" ? Math.max(INSET, w - INSET - dw) : INSET;
}

function setX(px) {
  dock.style.transform = `translateY(-50%) translateX(${px}px)`;
}

function sideFrom(x) {
  const w = width();
  const center = w / 2;
  if (Math.abs(x - center) <= HYSTERESIS) return currentSide; // stick if near center
  return x < center ? "left" : "right";
}

function applySide(side) {
  if (side === currentSide) return;
  currentSide = side;
  dock.classList.add("switching");
  setX(xFor(currentSide));
  setTimeout(() => dock.classList.remove("switching"), 120);
}

const onMove = rafThrottle((e) => {
  const x = e.clientX ?? lastX;
  if (x == null) return;
  lastX = x;
  applySide(sideFrom(x));
});

const onResize = rafThrottle(() => {
  // Re-apply current side to correct for new width
  setX(xFor(currentSide));
});

function boot() {
  // Place left initially after layout paints so offsetWidth is correct
  requestAnimationFrame(() => {
    currentSide = "left";
    setX(xFor(currentSide));
  });
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
}

boot();
