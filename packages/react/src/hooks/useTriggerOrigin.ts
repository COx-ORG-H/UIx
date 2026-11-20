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
 * turns that into a `transform-origin` on the centred dialog. Only an open caused by a pointer click
 * does it: a key press keeps the dialog instant ([data-uix-key-opened]), reduced motion keeps
 * today's fade, and a dialog that does not open right on a click's heels (a timer, a socket, a
 * fetch that resolved later) opens centred. On the way out it returns toward the trigger while that
 * is still on screen, and otherwise takes today's exit. */

const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export const ORIGIN_ATTR = 'data-uix-origin';

// Follow presses from the moment a Modal is in the bundle: the press that mounts a conditionally
// rendered Modal (`{open && <Modal origin="trigger" …/>}`) comes before any of its effects run.
if (typeof document !== 'undefined') watchInputModality();

/**
 * An open this long after the click that released the press was not caused by it (a timer, a fetch
 * resolving): it opens centred. React commits a click's update before the next frame, so the open
 * a click causes lands well inside this even when the dialog is slow to render.
 */
const ACTIVATION_MS = 300;

/**
 * What a press counts as having pressed: the nearest control around its target. Not `[tabindex]`:
 * that also matches containers (an AppShell's `<main tabIndex={-1}>`, a scroll region).
 */
const TRIGGER = [
  'button', 'a[href]', 'summary', 'label', 'input', 'select', 'textarea', '[role="button"]', '[role="link"]',
  '[role="menuitem"]', '[role="menuitemradio"]', '[role="menuitemcheckbox"]', '[role="option"]', '[role="tab"]',
].join(', ');

/** Wider or taller than this share of the viewport, an element is a region, not a trigger. */
const MAX_TRIGGER_SHARE = 0.5;

/** `el`'s box while it is on screen and small enough to read as the thing pressed, else `null`. */
function triggerBox(el: Element | null): DOMRect | null {
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return null;
  if (r.width > vw * MAX_TRIGGER_SHARE || r.height > vh * MAX_TRIGGER_SHARE) return null;
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
    const caused = press?.activatedAt != null && Date.now() - press.activatedAt <= ACTIVATION_MS;
    // A press inside a dialog that has closed since (its close button, "Save and new") closed that
    // one; whatever opens next on its heels was not opened from it.
    const fromClosedDialog = !!press?.target?.closest('dialog:not([open])');
    if (!press || !caused || fromClosedDialog || keyboardInitiated() || prefersReducedMotion()) {
      centred(el);
      return undefined;
    }
    // The control around the press; a clickable row or card that is no control is pressed itself.
    const candidate = press.target?.closest(TRIGGER) ?? press.target;
    const box = triggerBox(candidate);
    // Nothing that reads as the trigger on screen (a menu item whose menu closed, a press on a whole
    // region): grow from the tap point, and leave with today's exit.
    const trigger = box ? candidate : null;
    if (box) growFrom(el, box.left + box.width / 2, box.top + box.height / 2);
    else growFrom(el, press.x, press.y);
    return () => {
      const back = triggerBox(trigger);
      if (back) growFrom(el, back.left + back.width / 2, back.top + back.height / 2);
      else centred(el);
    };
  }, [open, enabled]);
}
