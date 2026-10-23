"use client";

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { prefersReducedMotion } from './useReducedMotion.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** If a slide never reports its end (a hidden tab, no stylesheet), hand the mark back anyway. */
const SLIDE_FALLBACK_MS = 1000;

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
 * Slides the selection mark from the old item to the new one when a pointer changes it
 * (HAR-2589): the selected tab's underline, the pill, the lifted segment. At rest every item
 * keeps its own selected look (server HTML, forced colours, wrapped rows: nothing to keep in
 * place); only during the slide does one indicator (`indicatorRef`, a child of `containerRef`)
 * carry the mark — the container has `data-uix-indicator` and the new item's own mark steps
 * aside — and at the end of the slide it hands the mark back and hides. The indicator is sized
 * to the new item and played back from the old one with a transform (FLIP): nothing animates
 * width or position.
 *
 * - A change from the keyboard jumps: arrow keys are the 100×-a-day path (§2.2).
 * - Reduced motion jumps.
 */
export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLElement | null>,
  selectedSelector: string,
): void {
  const last = useRef<{ el: Element; box: Box } | null>(null);
  const finish = useRef<(() => void) | null>(null);

  useEffect(() => () => finish.current?.(), []);

  useIsomorphicLayoutEffect(() => {
    trackInput();
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    const selected = container?.querySelector<HTMLElement>(selectedSelector) ?? null;
    if (!container || !selected || selected.offsetParent !== container) {
      finish.current?.();
      last.current = null;
      return;
    }
    const box: Box = { x: selected.offsetLeft, y: selected.offsetTop, w: selected.offsetWidth, h: selected.offsetHeight };
    const before = last.current;
    last.current = { el: selected, box };
    if (!before || before.el === selected) return;
    // a new selection: any slide still running ends where it is
    finish.current?.();
    if (!indicator || lastInput !== 'pointer' || prefersReducedMotion() || !box.w || !box.h) return;
    slide(container, indicator, selected, before.box, box, finish);
  });
}

function slide(container: HTMLElement, indicator: HTMLElement, target: HTMLElement, from: Box, to: Box, finish: { current: (() => void) | null }) {
  indicator.hidden = false;
  indicator.style.inlineSize = `${to.w}px`;
  indicator.style.blockSize = `${to.h}px`;
  // physical: offsetLeft counts from the left edge in either writing direction
  indicator.style.left = '0';
  indicator.style.top = '0';
  indicator.style.translate = `${to.x}px ${to.y}px`;
  indicator.style.transform = `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.w / to.w}, ${from.h / to.h})`;
  container.setAttribute('data-uix-indicator', '');
  void indicator.offsetWidth;
  indicator.setAttribute('data-moving', '');
  indicator.style.transform = '';

  let timer: ReturnType<typeof setTimeout> | undefined;
  // A layout change mid-slide (a narrower window, a text-size change) leaves the target box
  // stale, and a stale indicator can stick out past the page edge: end the slide there.
  const size = () => `${container.offsetWidth} ${container.offsetHeight} ${target.offsetWidth} ${target.offsetHeight}`;
  const startSize = size();
  const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (size() !== startSize) end(); });
  resized?.observe(container);
  resized?.observe(target);
  const end = () => {
    clearTimeout(timer);
    resized?.disconnect();
    indicator.removeEventListener('transitionend', onEnd);
    indicator.getAnimations?.().forEach((a) => a.cancel());
    indicator.removeAttribute('data-moving');
    indicator.hidden = true;
    container.removeAttribute('data-uix-indicator');
    if (finish.current === end) finish.current = null;
  };
  const onEnd = (event: TransitionEvent) => { if (event.target === indicator && event.propertyName === 'transform') end(); };
  indicator.addEventListener('transitionend', onEnd);
  timer = setTimeout(end, SLIDE_FALLBACK_MS);
  finish.current = end;
}
