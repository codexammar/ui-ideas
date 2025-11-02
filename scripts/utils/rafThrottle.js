// requestAnimationFrame throttle to keep gesture processing light.
export function rafThrottle(fn) {
  let scheduled = false;
  let lastArgs = null;

  return function throttled(...args) {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn.apply(this, lastArgs);
    });
  };
}
