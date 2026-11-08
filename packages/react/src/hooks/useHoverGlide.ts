"use client";

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * One hover highlight that glides from row to row (the animate-ui study, 2.60): in a menu, a
 * listbox or the sidebar the pointer's row is marked by a single layer (`layerRef`, an
 * `aria-hidden` `.uix-glide` span whose parent is the list) instead of each row painting its own
 * hover. The parent must be its containing block (positioned, or a fixed popover). Pass `enabled`
 * as the list's open state when the layer mounts with it, so the hook binds once it exists. Moving the pointer down a list, the
 * mark travels with it on `--uix-ease-glide`, so the eye follows one shape instead of a flicker of
 * rows lighting up and going out.
 *
 * The layer covers the container's scroll box and is cut to the row with `clip-path: inset()`, so
 * a taller row (a two-line nav item) changes the shape without stretching its corners, and a new
 * target retargets a running glide from where it is. Nothing animates width, height or position.
 *
 * - Pointer only (mouse and pen). Touch has no hover; the keyboard keeps each row's own focus and
 *   active styles (arrow keys are the 100×-a-day path, §2.2), so a key press hides the layer.
 * - The first row the pointer enters fades in where it is; only row-to-row moves glide.
 * - Reduced motion: the global policy drops clip-path from transitions, so the mark jumps and fades.
 * - Forced colours: CSS hides the layer and the rows' own system-colour hover returns.
 * - While the layer shows, the container carries `data-uix-glide`; the component's CSS uses it to
 *   take each row's own hover background away (`[data-uix-glide] > .row:hover { background: none }`).
 */
export function useHoverGlide(
  layerRef: RefObject<HTMLElement | null>,
  itemSelector: string,
  enabled = true,
): void {
  useEffect(() => {
    const layer = layerRef.current;
    const container = layer?.parentElement;
    if (!enabled || !container || !layer) return undefined;
    let current: HTMLElement | null = null;
    let raf = 0;

    const hide = () => {
      current = null;
      cancelAnimationFrame(raf);
      layer.removeAttribute('data-shown');
      layer.removeAttribute('data-gliding');
      container.removeAttribute('data-uix-glide');
    };

    const place = (item: HTMLElement) => {
      // the layer spans the scroll box, so it scrolls with the rows it marks
      const w = container.scrollWidth;
      const h = container.scrollHeight;
      const top = offsetWithin(item, container, 'top');
      const left = offsetWithin(item, container, 'left');
      const radius = getComputedStyle(item).borderTopLeftRadius || '0px';
      layer.style.width = `${w}px`;
      layer.style.height = `${h}px`;
      layer.style.clipPath = `inset(${top}px ${Math.max(0, w - left - item.offsetWidth)}px ${Math.max(0, h - top - item.offsetHeight)}px ${left}px round ${radius})`;
    };

    const target = (event: Event): HTMLElement | null => {
      const el = (event.target as Element | null)?.closest?.(itemSelector) as HTMLElement | null;
      if (!el || !container.contains(el)) return null;
      if (el.matches(':disabled, [aria-disabled="true"]')) return null;
      return el;
    };

    const onOver = (event: PointerEvent) => {
      // touch has no hover; forced colours paint their own system hover
      if (event.pointerType === 'touch' || matchMedia?.('(forced-colors: active)').matches) return;
      const item = target(event);
      if (!item) { if (current) hide(); return; }
      if (item === current) return;
      const first = current === null;
      current = item;
      if (first) {
        // appear in place: no travel from wherever the last visit ended
        layer.removeAttribute('data-gliding');
        place(item);
        container.setAttribute('data-uix-glide', '');
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { layer.setAttribute('data-shown', ''); });
        return;
      }
      layer.setAttribute('data-gliding', '');
      place(item);
    };

    const onLeave = (event: PointerEvent) => { if (event.pointerType !== 'touch') hide(); };
    const onKey = () => { if (current) hide(); };
    const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (current) hide(); });
    resized?.observe(container);

    container.addEventListener('pointerover', onOver);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('keydown', onKey);
    return () => {
      resized?.disconnect();
      container.removeEventListener('pointerover', onOver);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('keydown', onKey);
      hide();
    };
  }, [layerRef, itemSelector, enabled]);
}

/** The item's offset from the container's padding-box edge, through any positioned wrappers between them. */
function offsetWithin(item: HTMLElement, container: HTMLElement, side: 'top' | 'left'): number {
  let total = 0;
  let el: HTMLElement | null = item;
  while (el && el !== container) {
    total += side === 'top' ? el.offsetTop : el.offsetLeft;
    const parent = el.offsetParent as HTMLElement | null;
    if (parent === container) return total;
    // an offsetParent outside the container: fall back to the boxes
    if (!parent || !container.contains(parent)) {
      const a = item.getBoundingClientRect();
      const b = container.getBoundingClientRect();
      return side === 'top' ? a.top - b.top + container.scrollTop - container.clientTop : a.left - b.left + container.scrollLeft - container.clientLeft;
    }
    el = parent;
  }
  return total;
}
