"use client";

import { useEffect, useRef } from 'react';
import { KEY_OPENED, blurIn, tokenEase, tokenMs, tokenPx } from '../motion.js';
import { prefersReducedMotion } from './useReducedMotion.js';

/**
 * The rows of a list that just opened clear from a short blur as they arrive (2.60, the
 * animate-ui study): a Select's options, a Menu's items, a sidebar group's rows. The fade and the
 * slide are CSS (`uix-row-in`, the sidebar's row transition); the blur runs per frame in script with
 * the same timing (--uix-dur-slower, --uix-ease-out, --uix-stagger-rows; the first ten step), because
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
    return blurIn(Array.from(el.querySelectorAll<HTMLElement>(rows)), {
      from: tokenPx('--uix-arrive-blur', 4),
      duration: tokenMs('--uix-dur-slower', 320),
      ease: tokenEase('--uix-ease-out'),
      delay: (i) => Math.min(i, 9) * stagger,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
