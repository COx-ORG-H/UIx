/* One timer for every SlaTimer on the page (roadmap #17). Each timer asks to be woken at the
 * instant its text or state next changes (`slaStatus().nextChangeAt`), not on a fixed tick: a
 * clock with two hours left wakes once a minute, one paused or met never. Wake-ups land on whole
 * seconds, so the rows of a queue that change in the same second re-render together. While the
 * tab is hidden nothing is scheduled; when it shows again every timer is woken once to catch up.
 * Module state, created on first use; no timer runs while nobody waits. */

interface Waiter {
  at: number;
  wake: () => void;
}

const waiters = new Set<Waiter>();
let timer: ReturnType<typeof setTimeout> | undefined;
let scheduledFor = Number.POSITIVE_INFINITY;
let listening = false;
/** Longer waits are re-armed: a day is far inside setTimeout's 2^31 − 1 ms ceiling. */
const MAX_WAIT = 86_400_000;

const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

function clear() {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  scheduledFor = Number.POSITIVE_INFINITY;
}

function schedule() {
  if (waiters.size === 0 || hidden()) {
    clear();
    return;
  }
  let earliest = Number.POSITIVE_INFINITY;
  for (const w of waiters) if (w.at < earliest) earliest = w.at;
  // on the whole second at or after the earliest wake: never early, at most a second late
  const target = Math.ceil(earliest / 1000) * 1000;
  if (timer !== undefined && target === scheduledFor) return;
  clear();
  scheduledFor = target;
  timer = setTimeout(fire, Math.min(Math.max(target - Date.now(), 0), MAX_WAIT));
}

function wakeAll(due: (w: Waiter) => boolean) {
  const woken: Waiter[] = [];
  for (const w of waiters) if (due(w)) woken.push(w);
  for (const w of woken) waiters.delete(w);
  for (const w of woken) w.wake();
}

function fire() {
  timer = undefined;
  scheduledFor = Number.POSITIVE_INFINITY;
  const now = Date.now();
  wakeAll((w) => w.at <= now);
  schedule();
}

function onVisibility() {
  if (hidden()) {
    clear();
    return;
  }
  wakeAll(() => true);
  schedule();
}

function listen(on: boolean) {
  if (typeof document === 'undefined' || listening === on) return;
  listening = on;
  if (on) document.addEventListener('visibilitychange', onVisibility);
  else document.removeEventListener('visibilitychange', onVisibility);
}

/**
 * Call `wake` once, at or just after `at` (epoch ms), unless the returned cancel runs first.
 * Not while the page is hidden: then `wake` runs when it shows again.
 */
export function waitForSlaChange(at: number, wake: () => void): () => void {
  if (typeof window === 'undefined' || !Number.isFinite(at)) return () => {};
  const waiter: Waiter = { at, wake };
  waiters.add(waiter);
  listen(true);
  schedule();
  return () => {
    if (!waiters.delete(waiter)) return;
    if (waiters.size === 0) {
      clear();
      listen(false);
    } else if (Math.ceil(at / 1000) * 1000 === scheduledFor) {
      schedule();
    }
  };
}
