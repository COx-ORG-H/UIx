/* Motion helpers shared by the overlays (HAR-2578; docs → Foundations → Motion).
 *
 * - Keyboard-initiated surfaces get no animation (the frequency budget is "none"). The kit
 *   remembers whether the last input was a key or a pointer; an overlay that opens or closes
 *   right after a key press carries [data-uix-key-opened], which motion.css treats like
 *   [data-uix-instant].
 * - Timers that pair with a CSS transition read the same token (`--uix-dur-exit`,
 *   `--uix-delay-tooltip`, …) instead of a second number in JavaScript. */

export const KEY_OPENED = 'data-uix-key-opened';

let keyboard = false;
let watching = false;

/** Start following the input modality (idempotent; capture phase, so nothing can hide it). */
export function watchInputModality(): void {
  if (watching || typeof document === 'undefined') return;
  watching = true;
  document.addEventListener('keydown', (event) => {
    // A modifier on its own (Shift, a held ⌘) is not an action.
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) keyboard = true;
  }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; }, true);
}

/** Was the input that led here a key press? `false` before any input and on the server. */
export function keyboardInitiated(): boolean {
  return keyboard;
}

/** Mark `el` instant when the current open or close came from the keyboard; clear it otherwise. */
export function markKeyOpened(el: Element | null | undefined): void {
  if (!el) return;
  if (keyboard) el.setAttribute(KEY_OPENED, '');
  else el.removeAttribute(KEY_OPENED);
}

/** A time token (`--uix-dur-exit`) in milliseconds, read from `el` (default: the root), or `fallback`. */
export function tokenMs(name: string, fallback: number, el?: Element | null): number {
  if (typeof getComputedStyle === 'undefined' || typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(el ?? document.documentElement).getPropertyValue(name).trim();
  const m = /^(-?\d*\.?\d+)(ms|s)$/.exec(raw);
  if (!m) return fallback;
  return m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]);
}

/** A length token (`--uix-swap-blur`) in px, read from the root, or `fallback`. */
export function tokenPx(name: string, fallback: number): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^(-?\d*\.?\d+)px$/.exec(raw);
  return m ? Number(m[1]) : fallback;
}

type Ease = (t: number) => number;

/** `cubic-bezier(x1, y1, x2, y2)` as a function of progress (Newton steps, then bisection). */
function bezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const slope = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= (at(x1, x2, t) - x) / d;
    }
    if (t < 0 || t > 1 || Math.abs(at(x1, x2, t) - x) > 1e-4) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 30; i++) { if (at(x1, x2, t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    }
    return at(y1, y2, t);
  };
}

/** An easing token (`--uix-ease-out`, a `cubic-bezier()` or an evenly spaced `linear()`) as a function. */
export function tokenEase(name: string): Ease {
  const fallback = bezier(0.23, 1, 0.32, 1);
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const cb = /^cubic-bezier\(([^)]+)\)$/.exec(raw);
  if (cb) {
    const [a, b, c, d] = cb[1].split(',').map(Number);
    if ([a, b, c, d].every(Number.isFinite)) return bezier(a, b, c, d);
  }
  const lin = /^linear\(([^)]+)\)$/.exec(raw);
  if (lin) {
    const pts = lin[1].split(',').map(Number);
    if (pts.length > 1 && pts.every(Number.isFinite)) {
      return (x) => {
        if (x <= 0) return pts[0];
        if (x >= 1) return pts[pts.length - 1];
        const at = x * (pts.length - 1);
        const i = Math.floor(at);
        return pts[i] + (pts[i + 1] - pts[i]) * (at - i);
      };
    }
  }
  return fallback;
}

/**
 * A blur that clears as something arrives, or gathers as it leaves, driven frame by frame from
 * script (2.60). Opacity and movement stay in CSS; only the radius runs here. Why script: Linux
 * WebKit's renderer crashes on a CSS animation or transition of `filter` (measured: a @keyframes
 * blur on list rows crashed it on the first or second open, in the page and in a popover), while a
 * filter written each frame is safe there (40 rounds, no crash) — the way animate-ui animates its
 * blurs. The kit's CSS never animates `filter` (check-motion rejects it).
 *
 * `from` is the radius in px at the start (`leave`: at the end); `delay(i)` staggers element `i`.
 * Returns a cancel that clears the filters. Callers skip it under reduced motion and for keyboard opens.
 */
export function blurIn(
  elements: readonly HTMLElement[],
  options: { from: number; duration: number; ease: Ease; delay?: (index: number) => number; leave?: boolean },
): () => void {
  const els = elements.slice();
  if (typeof window === 'undefined' || els.length === 0 || options.from <= 0 || options.duration <= 0) return () => {};
  const { from, duration, ease, delay = () => 0, leave = false } = options;
  const paint = (el: HTMLElement, p: number) => {
    const r = leave ? from * ease(p) : from * (1 - ease(p));
    el.style.filter = r > 0.05 ? `blur(${r.toFixed(2)}px)` : '';
  };
  els.forEach((el) => paint(el, 0));
  const start = window.performance.now();
  let frame = 0;
  const tick = () => {
    const now = window.performance.now();
    let busy = false;
    els.forEach((el, i) => {
      const p = Math.min(1, Math.max(0, (now - start - delay(i)) / duration));
      if (p < 1) busy = true;
      paint(el, p);
    });
    if (busy) frame = window.requestAnimationFrame(tick);
    else if (leave) els.forEach((el) => { el.style.filter = ''; });
  };
  frame = window.requestAnimationFrame(tick);
  return () => {
    window.cancelAnimationFrame(frame);
    els.forEach((el) => { el.style.filter = ''; });
  };
}
