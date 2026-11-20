"use client";

import { useLayoutEffect, useRef } from 'react';

/** The wrap's measured sticky-header height (scroll-edge.css). */
const HEAD_PROPERTY = '--uix-sticky-head';

/**
 * Measures whether a `TableWrap`'s table is wider than the wrap and writes it to the wrap as
 * `data-overflow="true" | "false"`, so frozen columns draw their dividers only where rows can
 * scroll under them (PR #168 review). A hidden child, like BusyBar, so `TableWrap` itself stays a
 * server component. Without ResizeObserver (or before it runs) there is no attribute and the
 * dividers stay, as in plain HTML. It also writes the header's height as `--uix-sticky-head`, so
 * the wrap's scroll padding clears a header taller than `--uix-table-head-h`.
 */
export function TableOverflowProbe() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const wrap = ref.current?.parentElement;
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined;
    let head: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    const measure = () => {
      // a header can arrive after the wrap (a table that replaces its loading state)
      const found = wrap.querySelector<HTMLElement>(':scope > table > thead');
      if (found !== head) { if (head) observer?.unobserve?.(head); head = found; if (head) observer?.observe(head); }
      const next = String(wrap.scrollWidth > wrap.clientWidth + 1);
      if (wrap.getAttribute('data-overflow') !== next) wrap.setAttribute('data-overflow', next);
      // the sticky header's real height: the rows a keyboard brings into view stop below it
      // (scroll-edge.css reads it into the wrap's scroll-padding-top; WCAG 2.2 SC 2.4.11)
      const height = head ? head.offsetHeight : 0;
      const value = height > 0 ? `${height}px` : '';
      if (wrap.style.getPropertyValue(HEAD_PROPERTY) !== value) {
        if (value) wrap.style.setProperty(HEAD_PROPERTY, value); else wrap.style.removeProperty(HEAD_PROPERTY);
      }
    };
    observer = new ResizeObserver(measure);
    measure();
    observer.observe(wrap);
    const table = wrap.querySelector('table');
    if (table) observer.observe(table);
    return () => { observer?.disconnect(); wrap.removeAttribute('data-overflow'); wrap.style.removeProperty(HEAD_PROPERTY); };
  }, []);
  return <span ref={ref} hidden />;
}
