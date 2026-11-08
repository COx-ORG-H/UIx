"use client";

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { keyboardInitiated, watchInputModality } from '../motion.js';

/**
 * One hover highlight that glides from row to row (the animate-ui study, 2.60): in a menu, a
 * listbox or the sidebar the pointer's row is marked by a single layer (`layerRef`, an
 * `aria-hidden` `.uix-glide` span whose parent is the list) instead of each row painting its own
 * hover. The parent must be its containing block (positioned, or a fixed popover). Pass `enabled`
 * as the list's open state when the layer mounts with it, so the hook binds once it exists. Moving the pointer down a list, the
 * mark travels with it on `--uix-ease-glide`, so the eye follows one shape instead of a flicker of
 * rows lighting up and going out.
 *
 * The layer travels on `transform` alone (the Tabs indicator's way): it takes the first row's size
 * and reaches every other row by `translate` plus `scale` (animate-ui's highlight), so a taller row
 * (a two-line nav item) is reached by growing, not by a jump. It never reads or changes the list's
 * scroll size, so it cannot add overflow or a scrollbar under the pointer, and a new target retargets
 * a running glide from where it is; nothing animates width, height or position.
 *
 * - Mouse and pen, and the keyboard too (operator, 2026-11-08, as animate-ui): a row reached with the
 *   arrow keys or Tab (focus, or a listbox's `[data-active]`) takes the highlight. Touch has no hover.
 * - The first row fades in where it is; only row-to-row moves glide.
 * - Reduced motion: the global policy drops transform from transitions, so the mark jumps and fades.
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
    let base = { w: 0, h: 0 };
    watchInputModality();

    const hide = () => {
      current = null;
      window.cancelAnimationFrame(raf);
      layer.removeAttribute('data-shown');
      layer.removeAttribute('data-gliding');
      container.removeAttribute('data-uix-glide');
    };

    const place = (item: HTMLElement) => {
      // The row's box, in the list's scroll coordinates: the layer sits inside it, so it scrolls with
      // the rows and never reaches past them (no overflow, no scrollbar under the pointer).
      const top = offsetWithin(item, container, 'top');
      const left = offsetWithin(item, container, 'left');
      const sx = base.w ? item.offsetWidth / base.w : 1;
      const sy = base.h ? item.offsetHeight / base.h : 1;
      layer.style.transform = `translate(${left}px, ${top}px) scale(${sx}, ${sy})`;
    };
    /** The first row of a visit sets the layer's own size; later rows are reached by scale. */
    const settle = (item: HTMLElement) => {
      base = { w: item.offsetWidth, h: item.offsetHeight };
      layer.style.width = `${base.w}px`;
      layer.style.height = `${base.h}px`;
      layer.style.borderRadius = window.getComputedStyle(item).borderTopLeftRadius || '0px';
    };

    const target = (event: Event): HTMLElement | null => {
      const el = (event.target as Element | null)?.closest?.(itemSelector) as HTMLElement | null;
      if (!el || !container.contains(el)) return null;
      if (el.matches(':disabled, [aria-disabled="true"]')) return null;
      return el;
    };

    const forced = () => !!window.matchMedia?.('(forced-colors: active)').matches;
    const show = (item: HTMLElement) => {
      if (item === current) return;
      const first = current === null;
      current = item;
      if (first) {
        // appear in place: no travel from wherever the last visit ended
        layer.removeAttribute('data-gliding');
        settle(item);
        place(item);
        container.setAttribute('data-uix-glide', '');
        window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(() => { layer.setAttribute('data-shown', ''); });
        return;
      }
      layer.setAttribute('data-gliding', '');
      place(item);
    };

    const onOver = (event: PointerEvent) => {
      // touch has no hover; forced colours paint their own system hover
      if (event.pointerType === 'touch' || forced()) return;
      const item = target(event);
      if (!item) { if (current) hide(); return; }
      show(item);
    };
    // the keyboard: a row that takes focus from a key, or a listbox option that becomes active
    // (focus stays on a select's trigger; aria-activedescendant and [data-active] mark the row)
    const onFocus = (event: FocusEvent) => {
      if (!keyboardInitiated() || forced()) return;
      const item = target(event);
      if (item) show(item);
    };
    const active = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => {
      if (!keyboardInitiated() || forced()) return;
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (el.hasAttribute('data-active') && el.matches(itemSelector) && !el.matches(':disabled, [aria-disabled="true"]')) { show(el); return; }
      }
    });
    active?.observe(container, { subtree: true, attributes: true, attributeFilter: ['data-active'] });

    // the row the keyboard holds: the focused row, or a listbox's [data-active] option
    const keyRow = (): HTMLElement | null => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused !== container && container.contains(focused) && focused.matches(itemSelector)) return focused;
      const active = container.querySelector<HTMLElement>(`${itemSelector}[data-active]`);
      return active && container.contains(active) ? active : null;
    };
    // the pointer leaves: back to the keyboard's row when there is one, else gone
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const row = keyRow();
      if (row && !forced()) show(row); else hide();
    };
    // focus leaves the list (Tab out): a mark the keyboard put there goes with it
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && container.contains(next)) return;
      if (!container.matches(':hover')) hide();
    };
    const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (current) hide(); });
    resized?.observe(container);

    container.addEventListener('pointerover', onOver);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('focusin', onFocus);
    container.addEventListener('focusout', onFocusOut);
    return () => {
      container.removeEventListener('focusout', onFocusOut);
      resized?.disconnect();
      active?.disconnect();
      container.removeEventListener('pointerover', onOver);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('focusin', onFocus);
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
