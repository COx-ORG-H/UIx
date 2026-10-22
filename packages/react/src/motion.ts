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
