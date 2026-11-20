"use client";

import { useEffect, useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { keyboardInitiated, lastPointerPress, watchInputModality } from '../motion.js';
import { prefersReducedMotion } from './useReducedMotion.js';

/* EXPERIMENT (Tier 3 item 13 of the phone OS motion study): a Modal that grows out of the control
 * that opened it, as iOS sheets zoom out of their button and ColorOS starts from the tap point.
 * Opt-in only (`Modal origin="trigger"`); the centred rise stays the default (operator, 2.60).
 *
 * Before the dialog opens, this writes the trigger's centre in viewport px to
 * `--uix-dialog-from-x` / `--uix-dialog-from-y` and sets `[data-uix-origin="trigger"]`; modal.css
 * turns that into a `transform-origin` on the centred dialog. Only a pointer open does it: a key
 * press keeps the dialog instant ([data-uix-key-opened]), reduced motion keeps today's fade, and a
 * dialog opened with no recent press (a timer, a socket, a fetch that resolved later) opens centred.
 * On the way out it returns toward the trigger while that is still on screen, and otherwise takes
 * today's exit. */

const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export const ORIGIN_ATTR = 'data-uix-origin';

/** A press older than this did not open the dialog; it opens centred. */
const PRESS_FRESH_MS = 1000;

/** What a press counts as having pressed: the nearest control around its target. */
const TRIGGER = [
  'button', 'a[href]', 'summary', 'label', 'input', 'select', 'textarea', '[role="button"]', '[role="link"]',
  '[role="menuitem"]', '[role="menuitemradio"]', '[role="menuitemcheckbox"]', '[role="option"]', '[role="tab"]', '[tabindex]',
].join(', ');

/** `el`'s box while any of it is in the viewport, else `null` (gone, hidden or scrolled away). */
function onScreen(el: Element | null): DOMRect | null {
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return null;
  return r;
}

function growFrom(el: HTMLElement, x: number, y: number): void {
  el.style.setProperty('--uix-dialog-from-x', `${Math.round(x)}px`);
  el.style.setProperty('--uix-dialog-from-y', `${Math.round(y)}px`);
  el.setAttribute(ORIGIN_ATTR, 'trigger');
}

function centred(el: HTMLElement): void {
  el.removeAttribute(ORIGIN_ATTR);
  el.style.removeProperty('--uix-dialog-from-x');
  el.style.removeProperty('--uix-dialog-from-y');
}

/**
 * Point `ref`'s dialog at its trigger while `open` (see above). Call it BEFORE the hook that calls
 * `showModal()`: layout effects run in call order, so the origin is in place for `@starting-style`,
 * and this cleanup (the exit's origin) runs before that hook's cleanup closes the dialog.
 */
export function useTriggerOrigin(ref: RefObject<HTMLElement | null>, open: boolean, enabled: boolean): void {
  useEffect(() => { watchInputModality(); }, []);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!enabled) { centred(el); return undefined; }
    // Closed: leave the origin the cleanup below chose, so the exit can still run toward it.
    if (!open) return undefined;
    const press = lastPointerPress();
    if (keyboardInitiated() || prefersReducedMotion() || !press || Date.now() - press.at > PRESS_FRESH_MS) {
      centred(el);
      return undefined;
    }
    const trigger = press.target?.closest(TRIGGER) ?? press.target;
    const box = onScreen(trigger);
    // A trigger already gone (a menu item whose menu closed) grows the dialog from the tap point.
    if (box) growFrom(el, box.left + box.width / 2, box.top + box.height / 2);
    else growFrom(el, press.x, press.y);
    return () => {
      const back = onScreen(trigger);
      if (back) growFrom(el, back.left + back.width / 2, back.top + back.height / 2);
      else centred(el);
    };
  }, [open, enabled]);
}
