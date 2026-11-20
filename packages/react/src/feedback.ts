/* Semantic feedback events (experimental; phone OS study, Tier 3 item 14).
 *
 * Phones pair a commit moment with a named kind of feedback (Apple's SensoryFeedback, Samsung's
 * two quick vibrations for an error). `feedback(kind)` is the web half of that: at a moment the
 * kit already shows and/or announces (a Button result, a toast swiped away, a counter going over
 * its limit) it dispatches a `uix-feedback` DOM event that a product can listen to, and, only when
 * the product has opted in, plays a short vibration.
 *
 * Haptics are never the only channel and are off by default. They play only when all hold:
 * - `<html data-haptics="on">`: the product's own setting, which the person turned on;
 * - `navigator.vibrate` exists and the primary pointer is a touch screen (Chrome, Samsung
 *   Internet and other Chromium browsers on Android; never iOS Safari; desktop Chromium has the
 *   method but no motor to drive);
 * - the page is visible and has had a user activation (Chrome blocks vibrate without one);
 * - no listener called `preventDefault()` on the event (a native wrapper that routes the kind
 *   to the platform's haptics API, which feels better than vibrate, cancels the fallback).
 * Reduced motion does not silence them: it is about movement on screen (vestibular), haptics are
 * their own opt-in, and the phones keep separate switches for the two. */

/** The kind of commit moment, after the phones' semantic feedback types. */
export type FeedbackKind = 'success' | 'warning' | 'error' | 'selection' | 'limit';

/** The DOM event `feedback()` dispatches. It bubbles, so `document` hears every one. */
export const FEEDBACK_EVENT = 'uix-feedback';

/** The attribute on `<html>` that turns the vibration on: `data-haptics="on"`. */
export const HAPTICS_ATTRIBUTE = 'data-haptics';

/** `event.detail` of a `uix-feedback` event. */
export interface FeedbackEventDetail {
  /** Which moment it was. */
  kind: FeedbackKind;
}

/**
 * Vibration patterns in ms (on, off, on…), kept short: a tap, never a buzz. `error` is two short
 * pulses (Samsung's error pattern); `limit` is one firmer bump, like reaching a stop. Under ~10 ms
 * the cheaper Android motors may not spin up at all.
 */
export const HAPTIC_PATTERNS: Readonly<Record<FeedbackKind, readonly number[]>> = Object.freeze({
  selection: Object.freeze([10]),
  success: Object.freeze([14]),
  warning: Object.freeze([22]),
  limit: Object.freeze([28]),
  error: Object.freeze([14, 70, 14]),
});

const KINDS = Object.keys(HAPTIC_PATTERNS) as FeedbackKind[];

/**
 * Could this device vibrate? `navigator.vibrate` and a touch screen as the primary pointer: desktop
 * Chromium has the method too and answers `true` with no motor to drive (measured in Chromium 149),
 * and a touch laptop's primary pointer is its trackpad. Use it to show a haptics setting only where
 * it can work.
 */
export function hapticsSupported(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

/** Has the product turned haptics on (`<html data-haptics="on">`)? */
export function hapticsEnabled(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute(HAPTICS_ATTRIBUTE) === 'on';
}

function mayVibrate(): boolean {
  if (!hapticsEnabled() || !hapticsSupported()) return false;
  if (document.visibilityState === 'hidden') return false;
  // Chrome ignores (and logs) vibrate before the first tap; skip it rather than warn
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return activation?.hasBeenActive !== false;
}

/**
 * Report a commit moment of `kind`: dispatches `uix-feedback` on `target` (default `document`)
 * and, when the product opted in and the device can, vibrates `HAPTIC_PATTERNS[kind]`. Call it
 * only where the moment is already seen or announced. Returns whether a vibration was asked for.
 * A no-op on the server.
 */
export function feedback(kind: FeedbackKind, target?: EventTarget | null): boolean {
  if (typeof document === 'undefined' || !KINDS.includes(kind)) return false;
  const view = document.defaultView;
  const Ctor = view?.CustomEvent ?? (typeof CustomEvent === 'function' ? CustomEvent : undefined);
  let allowed = true;
  if (Ctor) {
    const event = new Ctor<FeedbackEventDetail>(FEEDBACK_EVENT, { bubbles: true, cancelable: true, detail: { kind } });
    allowed = (target ?? document).dispatchEvent(event);
  }
  if (!allowed || !mayVibrate()) return false;
  try {
    return navigator.vibrate(HAPTIC_PATTERNS[kind] as number[]) !== false;
  } catch {
    return false;
  }
}
