import { rafThrottle } from "../utils/rafThrottle.js";
import { isMostlyVertical, mean, clamp } from "../utils/geometry.js";
import { loadState, saveState } from "../utils/storage.js";

// Heuristic:
// Observe normal vertical swipes (scroll-like). For each gesture, sample x relative to the start.
// Compute mean deltaX. If meanDeltaX > +THRESH -> likely right-handed. < -THRESH -> left-handed.
// Decide after one strong sample, else after two consistent samples.
// Ignore clear horizontal swipes.

const MAX_SAMPLES = 40;             // cap per gesture
const STRONG_THRESHOLD = 14;        // px mean deltaX to count as "strong"
const MIN_VERTICAL_TRAVEL = 40;     // px total vertical travel to consider a swipe
const ANGLE_MIN = 60;               // degrees: must be mostly vertical

export class HandednessDetector {
  constructor() {
    this.samples = [];              // array of { meanDx }
    this.onDecide = null;           // callback(side: 'left'|'right')
    this.decided = false;

    this.active = false;
    this.startX = 0;
    this.startY = 0;
    this.pathX = [];
    this.pathY = [];
    this.lastPointerId = null;

    // If state exists, consider ourselves decided.
    const persisted = loadState();
    if (persisted?.side) {
      this.decided = true;
    }
  }

  attach() {
    // Pointer Events to catch both touch and stylus; ignore mouse.
    window.addEventListener("pointerdown", this.handleDown, { passive: true });
    window.addEventListener("pointermove", this.throttledMove, { passive: true });
    window.addEventListener("pointerup", this.handleUp, { passive: true });
    window.addEventListener("pointercancel", this.handleCancel, { passive: true });
  }

  detach() {
    window.removeEventListener("pointerdown", this.handleDown);
    window.removeEventListener("pointermove", this.throttledMove);
    window.removeEventListener("pointerup", this.handleUp);
    window.removeEventListener("pointercancel", this.handleCancel);
  }

  handleDown = (e) => {
    if (this.decided) return;
    if (e.pointerType === "mouse") return;
    this.active = true;
    this.lastPointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.pathX = [e.clientX];
    this.pathY = [e.clientY];
  };

  throttledMove = rafThrottle((e) => {
    if (!this.active) return;
    if (this.decided) return;
    if (e.pointerId !== this.lastPointerId) return;

    // Append sample, capped
    if (this.pathX.length < MAX_SAMPLES) {
      this.pathX.push(e.clientX);
      this.pathY.push(e.clientY);
    }
  });

  handleUp = (e) => {
    if (!this.active) return;
    if (this.decided) return;
    if (e.pointerId !== this.lastPointerId) return;

    this.active = false;

    const dx = (this.pathX[this.pathX.length - 1] ?? this.startX) - this.startX;
    const dy = (this.pathY[this.pathY.length - 1] ?? this.startY) - this.startY;

    // Require vertical-ish travel and minimum distance to avoid noise
    const verticalEnough = isMostlyVertical(dx, dy, ANGLE_MIN);
    const travelEnough = Math.abs(dy) >= MIN_VERTICAL_TRAVEL;

    if (!verticalEnough || !travelEnough) {
      this.resetGesture();
      return;
    }

    const deltas = this.pathX.map(x => x - this.startX);
    const meanDx = mean(deltas);

    // Record this gesture's mean delta
    this.samples.push({ meanDx });

    // Decide rules:
    // 1) Strong single swipe: |meanDx| >= STRONG_THRESHOLD -> decide immediately.
    // 2) Otherwise wait for two swipes and use the combined mean.
    let side = null;

    if (Math.abs(meanDx) >= STRONG_THRESHOLD || this.samples.length >= 2) {
      const combinedMean = mean(this.samples.map(s => s.meanDx));
      side = combinedMean >= 0 ? "right" : "left";
      this.decided = true;

      // Persist
      saveState({ side });

      // Notify
      if (typeof this.onDecide === "function") this.onDecide(side);
    }

    // Reset per-gesture buffers
    this.resetGesture();
  };

  handleCancel = () => {
    this.resetGesture();
  };

  resetGesture() {
    this.active = false;
    this.lastPointerId = null;
    this.pathX = [];
    this.pathY = [];
  }
}
