"use client";

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { announcePolite, ensureAnnouncer } from '../announce.js';

export interface ChangeHighlightOptions {
  /**
   * Said through the page's polite live region when the value changes, e.g. "Status changed to
   * Resolved by A. Novak". The highlight is the signal and its place is the location; this is
   * the description for people who cannot see either (motion standard §2.5).
   */
  announce?: string;
  /** Turn the highlight off, e.g. while the person is editing the value themselves. */
  disabled?: boolean;
}

/**
 * Flash `.uix-changed` on an element when `value` changes after mount — never on the first
 * render (HAR-2585). A second change restarts the highlight. Compare by `Object.is`: pass a
 * primitive (a status, a count, an `updatedAt`), not a fresh object.
 *
 * ```tsx
 * const ref = useChangeHighlight<HTMLTableCellElement>(row.status, { announce: `Status: ${row.status}` });
 * <Td ref={ref}>{row.status}</Td>
 * ```
 *
 * The hook sets `data-uix-changed` on the element (React never renders that attribute, so a
 * re-render cannot clear it) and removes it when the animation ends.
 */
export function useChangeHighlight<T extends HTMLElement = HTMLElement>(value: unknown, { announce, disabled }: ChangeHighlightOptions = {}): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const previous = useRef(value);
  const announces = announce !== undefined;
  // A live region that appears together with its first words is often not read: make it now.
  useEffect(() => { if (announces) ensureAnnouncer(ref.current); }, [announces]);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    const el = ref.current;
    if (disabled || !el) return;
    flashChanged(el);
    if (announce) announcePolite(announce, el);
  }, [value, announce, disabled]);
  return ref;
}

// One end handler per element: a restart replaces it instead of adding another, so a busy table
// in a background tab (where animations never end) does not pile up listeners.
const handlers = new WeakMap<HTMLElement, (event: AnimationEvent) => void>();

/**
 * Flash `.uix-changed` on `el` now (restarting a highlight already running). For changes that
 * do not flow through a React value, e.g. a row a live update replaced.
 */
export function flashChanged(el: HTMLElement): void {
  if (el.hasAttribute('data-uix-changed')) {
    el.removeAttribute('data-uix-changed');
    // read layout so the browser sees the attribute go, then come back: the animation restarts
    void el.offsetWidth;
  }
  el.setAttribute('data-uix-changed', '');
  const previous = handlers.get(el);
  if (previous) el.removeEventListener('animationend', previous);
  // Only the highlight's own animations end it: a nested Count's tick must not. A highlighted
  // table row animates its cells, so the end can come from a direct child.
  const done = (event: AnimationEvent) => {
    const target = event.target as Node | null;
    if (!event.animationName.startsWith('uix-changed')) return;
    if (target !== el && target?.parentNode !== el) return;
    el.removeAttribute('data-uix-changed');
    el.removeEventListener('animationend', done);
    handlers.delete(el);
  };
  handlers.set(el, done);
  el.addEventListener('animationend', done);
}
