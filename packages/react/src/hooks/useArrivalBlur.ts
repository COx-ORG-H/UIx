"use client";

import { useEffect, useRef } from 'react';
import { KEY_OPENED, blurIn, tokenEase, tokenMs, tokenPx } from '../motion.js';
import { prefersReducedMotion } from './useReducedMotion.js';

/**
 * The rows of a list that just opened clear from a short blur as they arrive (2.60, the
 * animate-ui study): a Select's options, a Menu's items, a sidebar group's rows. The fade and the
 * slide are CSS (`uix-row-in`, the sidebar's row transition); the blur runs per frame in script with
 * the same timing (--uix-dur-row, --uix-ease-soft, --uix-stagger-rows; the first ten step), because
 * Linux WebKit's renderer crashes on a CSS-animated `filter` (motion.ts `blurIn`).
 *
 * Pointer opens only: none when `host` carries [data-uix-key-opened] or [data-uix-instant], and none
 * under reduced motion. `skipMount`: no blur for a list that is already open on the first render.
 * @internal
 */
export function useArrivalBlur(
  host: () => HTMLElement | null,
  rows: string,
  open: boolean,
  skipMount = false,
): void {
  const mounted = useRef(false);
  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    const el = host();
    if (!open || !el || (first && skipMount) || prefersReducedMotion()) return undefined;
    if (el.hasAttribute(KEY_OPENED) || el.closest('[data-uix-instant]')) return undefined;
    const stagger = tokenMs('--uix-stagger-rows', 30);
    // only the rows a person can see, at most twelve: a long list never blurs rows scrolled out of
    // view. "In view" is inside the window, the list itself (once it has a height) and every
    // clipping ancestor (a scrolled sidebar). Each row's delay is its CSS one (--uix-row-i, set by
    // position), so a list opened scrolled to its value clears the rows it shows in step with them.
    let top = 0;
    let bottom = window.innerHeight;
    const clip = (r: DOMRect) => { top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); };
    const box = el.getBoundingClientRect();
    if (box.height >= 1) clip(box);
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (window.getComputedStyle(a).overflowY !== 'visible') clip(a.getBoundingClientRect());
    }
    // a row folded away (inside a collapsed group: visibility hidden, a zero-height panel) is not shown
    const shown: HTMLElement[] = [];
    for (const row of Array.from(el.querySelectorAll<HTMLElement>(rows))) {
      const r = row.getBoundingClientRect();
      if (r.bottom <= top || r.top >= bottom || r.height < 1) continue;
      if (window.getComputedStyle(row).visibility === 'hidden') continue;
      shown.push(row);
      if (shown.length === 12) break;
    }
    const order = shown.map((row, i) => {
      const n = parseFloat(window.getComputedStyle(row).getPropertyValue('--uix-row-i'));
      return Number.isFinite(n) ? n : Math.min(i, 9);
    });
    return blurIn(shown, {
      from: tokenPx('--uix-arrive-blur', 4),
      duration: tokenMs('--uix-dur-row', 300),
      ease: tokenEase('--uix-ease-soft'),
      delay: (i) => order[i] * stagger,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
