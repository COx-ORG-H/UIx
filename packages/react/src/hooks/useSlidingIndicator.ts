"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

interface Box { x: number; y: number; w: number; h: number }

// The last input anywhere on the page: a change that follows a key press (here, or a shortcut
// elsewhere) jumps; one that follows a pointer press slides.
let lastInput: 'keyboard' | 'pointer' = 'pointer';
let listening = false;
function trackInput() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('keydown', () => { lastInput = 'keyboard'; }, true);
  document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
}

/**
 * Moves one indicator element (`indicatorRef`, a child of `containerRef`) onto the selected
 * item (`selectedSelector`) (HAR-2589): the selected tab's underline or the lifted segment
 * slides from the old item to the new one. The box is set at once and the move is played back
 * with a transform (FLIP), so nothing animates width or position.
 *
 * - A change made from the keyboard jumps: arrow keys are the 100×-a-day path (§2.2).
 * - The first placement and any resize (the container, or an item: a web font arriving, a
 *   live count in a label) re-place it without a slide.
 * - Until the indicator is placed, the container has no `data-uix-indicator`, so the items'
 *   own selected style shows (server HTML, no JavaScript, no selection).
 * - Reduced motion: the kit's policy drops transform from transitions, so it jumps.
 */
export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLElement | null>,
  selectedSelector: string,
): void {
  const last = useRef<Box | null>(null);
  // the element itself, so a remounted container (another variant, another overflow mode) is
  // observed afresh
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  useIsomorphicLayoutEffect(() => {
    trackInput();
    const current = containerRef.current;
    if (current !== container) {
      last.current = null;
      setContainer(current);
    }
    if (!current) return;
    place(current, indicatorRef.current, selectedSelector, last, lastInput === 'pointer');
    // observe every item too: an item can change size while the container does not
    if (observer.current) for (const child of Array.from(current.children)) observer.current.observe(child);
  });

  useEffect(() => {
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => place(container, indicatorRef.current, selectedSelector, last, false));
    observer.current = ro;
    ro.observe(container);
    for (const child of Array.from(container.children)) ro.observe(child);
    return () => { ro.disconnect(); observer.current = null; };
  }, [container, indicatorRef, selectedSelector]);
}

function place(container: HTMLElement, indicator: HTMLElement | null, selector: string, last: { current: Box | null }, animate: boolean) {
  const selected = container.querySelector<HTMLElement>(selector);
  if (!indicator || !selected || selected.offsetParent !== container) {
    // no indicator or nothing to point at: hand the selection mark back to the items
    container.removeAttribute('data-uix-indicator');
    if (indicator) indicator.hidden = true;
    last.current = null;
    return;
  }
  const box: Box = { x: selected.offsetLeft, y: selected.offsetTop, w: selected.offsetWidth, h: selected.offsetHeight };
  const before = last.current;
  last.current = box;
  const showing = !indicator.hidden && container.hasAttribute('data-uix-indicator');
  if (showing && before && before.x === box.x && before.y === box.y && before.w === box.w && before.h === box.h) return;
  indicator.hidden = false;
  indicator.removeAttribute('data-moving');
  // a jump (keyboard, resize) also stops a slide still running from an earlier click
  if (!animate) indicator.getAnimations?.().forEach((a) => a.cancel());
  indicator.style.transform = '';
  indicator.style.inlineSize = `${box.w}px`;
  indicator.style.blockSize = `${box.h}px`;
  // physical: offsetLeft counts from the left edge in either writing direction
  indicator.style.left = '0';
  indicator.style.top = '0';
  indicator.style.translate = `${box.x}px ${box.y}px`;
  container.setAttribute('data-uix-indicator', '');
  if (!animate || !showing || !before || !box.w || !box.h) return;
  // FLIP: start where the old item was, then let the transition take it home
  indicator.style.transform = `translate(${before.x - box.x}px, ${before.y - box.y}px) scale(${before.w / box.w}, ${before.h / box.h})`;
  void indicator.offsetWidth;
  indicator.setAttribute('data-moving', '');
  indicator.style.transform = '';
}
