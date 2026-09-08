interface SharedClock {
  now: number;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setInterval>;
}

const clocks = new Map<number, SharedClock>();

const getClock = (interval: number) => {
  let clock = clocks.get(interval);
  if (!clock) {
    clock = { now: Date.now(), listeners: new Set() };
    clocks.set(interval, clock);
  }
  return clock;
};

export const readRelativeClock = (interval: number) => getClock(interval).now;

export function subscribeRelativeClock(interval: number, listener: () => void) {
  if (interval <= 0 || typeof window === 'undefined') return () => {};
  const clock = getClock(interval);
  clock.listeners.add(listener);
  if (!clock.timer) {
    clock.timer = window.setInterval(() => {
      clock.now = Date.now();
      clock.listeners.forEach((notify) => notify());
    }, interval);
  }
  return () => {
    clock.listeners.delete(listener);
    if (clock.listeners.size === 0 && clock.timer) {
      window.clearInterval(clock.timer);
      clock.timer = undefined;
    }
  };
}
