/* One polite live region per page (and one per open dialog), for feedback that has no visible
 * text node of its own to announce from: a value that changed in place, a rolled-back
 * optimistic change. A live region inside a table row or a button is not possible or changes
 * the control's name, and one region per highlighted cell would flood the page. A modal
 * dialog makes everything outside it inert, so a change inside a dialog is said from a region
 * inside that dialog. Created on first use, never removed. */

const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Create the polite region `announcePolite(…, from)` will use, ahead of its first message. */
export function ensureAnnouncer(from?: Element | null): void {
  liveRegion(from);
}

function liveRegion(from?: Element | null): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const container: HTMLElement = (from?.closest('dialog') as HTMLElement | null) ?? document.body;
  let region = container.querySelector<HTMLElement>(':scope > [data-uix-announcer]');
  if (!region) {
    region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('data-uix-announcer', '');
    region.className = 'uix-visually-hidden';
    container.append(region);
  }
  return region;
}

/**
 * Say `text` through a polite live region (`[data-uix-announcer]`): the page's, or the open
 * dialog's when `from` is inside one. The region is cleared first and filled a moment later,
 * so the same words twice are spoken twice; a newer message replaces one not yet spoken.
 */
export function announcePolite(text: string, from?: Element | null): void {
  const el = liveRegion(from);
  if (!el) return;
  clearTimeout(timers.get(el));
  el.textContent = '';
  // the next task, not a microtask: screen readers need an empty region to notice the change
  timers.set(el, setTimeout(() => { el.textContent = text; }, 0));
}
