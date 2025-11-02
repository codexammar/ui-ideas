import { rafThrottle } from "../utils/rafThrottle.js";
import { isMostlyVertical, mean } from "../utils/geometry.js";
import { loadState, saveState } from "../utils/storage.js";

const MAX_SAMPLES = 40;
const STRONG_THRESHOLD = 14;      // px mean Δx regarded as "strong"
const MIN_VERTICAL_TRAVEL = 40;   // px minimum total vertical travel
const ANGLE_MIN = 60;             // degrees: must be mostly vertical

export class HandednessDetector {
  constructor() {
    this.samples = [];              // [{ meanDx }]
    this.onDecide = null;
    this.decided = false;

    this.active = false;
    this.startX = 0;
    this.startY = 0;
    this.pathX = [];
    this.pathY = [];
    this.lastPointerId = null;

    const persisted = loadState();
    if (persisted?.side) {
      this.decided = true;
    }
  }

  attach() {
    if (this.decided) return;

    if (window.PointerEvent) {
      window.addEventListener("pointerdown", this.handleDown, { passive: true });
      window.addEventListener("pointermove", this.throttledMove, { passive: true });
      window.addEventListener("pointerup", this.handleUp, { passive: true });
      // IMPORTANT: pointercancel happens during scroll — finalize instead of dropping.
      window.addEventListener("pointercancel", this.handleCancel, { passive: true });
    } else {
      // Touch fallback for older/webview setups
      this.attachTouchFallback();
    }
  }

  detach() {
    window.removeEventListener("pointerdown", this.handleDown);
    window.removeEventListener("pointermove", this.throttledMove);
    window.removeEventListener("pointerup", this.handleUp);
    window.removeEventListener("pointercancel", this.handleCancel);
    window.removeEventListener("touchstart", this._tfStart);
    window.removeEventListener("touchmove", this._tfMove);
    window.removeEventListener("touchend", this._tfEnd);
    window.removeEventListener("touchcancel", this._tfCancel);
  }

  handleDown = (e) => {
    if (this.decided) return;
    if (e.pointerType === "mouse") return; // ignore desktop mouse in this PoC
    this.active = true;
    this.lastPointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.pathX = [e.clientX];
    this.pathY = [e.clientY];
  };

  throttledMove = rafThrottle((e) => {
    if (!this.active || this.decided) return;
    if (e.pointerId !== this.lastPointerId) return;
    if (this.pathX.length < MAX_SAMPLES) {
      this.pathX.push(e.clientX);
      this.pathY.push(e.clientY);
    }
  });

  handleUp = (e) => {
    if (!this.active || this.decided) { this.resetGesture(); return; }
    if (e.pointerId != null && e.pointerId !== this.lastPointerId) { this.resetGesture(); return; }
    this.finalizeCurrentGesture();
  };

  handleCancel = () => {
    if (!this.active || this.decided) { this.resetGesture(); return; }
    // Treat cancel as a normal end-of-gesture (common during scroll)
    this.finalizeCurrentGesture();
  };

  finalizeCurrentGesture() {
    this.active = false;

    const lastX = this.pathX[this.pathX.length - 1] ?? this.startX;
    const lastY = this.pathY[this.pathY.length - 1] ?? this.startY;

    const dx = lastX - this.startX;
    const dy = lastY - this.startY;

    const verticalEnough = isMostlyVertical(dx, dy, ANGLE_MIN);
    const travelEnough = Math.abs(dy) >= MIN_VERTICAL_TRAVEL;

    if (!verticalEnough || !travelEnough) {
      this.resetGesture();
      return;
    }

    const deltas = this.pathX.map(x => x - this.startX);
    const meanDx = mean(deltas);

    this.samples.push({ meanDx });

    let side = null;

    if (Math.abs(meanDx) >= STRONG_THRESHOLD || this.samples.length >= 2) {
      const combinedMean = mean(this.samples.map(s => s.meanDx));
      side = combinedMean >= 0 ? "right" : "left";
      this.decided = true;
      saveState({ side });
      if (typeof this.onDecide === "function") this.onDecide(side);
    }

    this.resetGesture();
  }

  resetGesture() {
    this.active = false;
    this.lastPointerId = null;
    this.pathX = [];
    this.pathY = [];
  }

  // Touch event fallback (older WebViews / non-PointerEvent environments)
  attachTouchFallback() {
    this._tfStart = (e) => {
      if (this.decided) return;
      const t = e.touches[0];
      this.active = true;
      this.startX = t.clientX;
      this.startY = t.clientY;
      this.pathX = [t.clientX];
      this.pathY = [t.clientY];
    };

    this._tfMove = (e) => {
      if (!this.active || this.decided) return;
      const t = e.touches[0];
      if (this.pathX.length < MAX_SAMPLES) {
        this.pathX.push(t.clientX);
        this.pathY.push(t.clientY);
      }
    };

    this._tfEnd = () => { this.finalizeCurrentGesture(); };
    this._tfCancel = () => { this.finalizeCurrentGesture(); };

    window.addEventListener("touchstart", this._tfStart, { passive: true });
    window.addEventListener("touchmove", this._tfMove, { passive: true });
    window.addEventListener("touchend", this._tfEnd, { passive: true });
    window.addEventListener("touchcancel", this._tfCancel, { passive: true });
  }
}
