"use client";

import { useLayoutEffect, useRef } from 'react';

/**
 * Measures whether a `TableWrap`'s table is wider than the wrap and writes it to the wrap as
 * `data-overflow="true" | "false"`, so frozen columns draw their dividers only where rows can
 * scroll under them (PR #168 review). A hidden child, like BusyBar, so `TableWrap` itself stays a
 * server component. Without ResizeObserver (or before it runs) there is no attribute and the
 * dividers stay, as in plain HTML.
 */
export function TableOverflowProbe() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const wrap = ref.current?.parentElement;
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const next = String(wrap.scrollWidth > wrap.clientWidth + 1);
      if (wrap.getAttribute('data-overflow') !== next) wrap.setAttribute('data-overflow', next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    const table = wrap.querySelector('table');
    if (table) observer.observe(table);
    return () => { observer.disconnect(); wrap.removeAttribute('data-overflow'); };
  }, []);
  return <span ref={ref} hidden />;
}
