// Lightweight gesture math utilities focused on vertical swipe sampling.

export function angleDeg(dx, dy) {
  // Returns angle relative to x-axis in degrees [0..180] ignoring sign.
  // We only care about distinguishing vertical vs horizontal.
  const a = Math.atan2(Math.abs(dy), Math.abs(dx)); // 0..pi/2
  return a * (180 / Math.PI);
}

export function isMostlyVertical(dx, dy, minAngleDeg = 60) {
  // Vertical if angle from x-axis >= minAngleDeg (i.e., dy dominates).
  return angleDeg(dx, dy) >= minAngleDeg;
}

export function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
