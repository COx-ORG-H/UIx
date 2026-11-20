"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { shouldVirtualize, virtualWindow } from '../table-engine.js';
import { stickyInsets } from '../sticky-layers.js';

export interface UseVirtualRowsOptions {
  /**
   * Rendered row height in pixels. With `measureRows` it is the estimate for the first paint,
   * until the mounted rows have been measured.
   */
  rowHeight: number;
  /**
   * A selector for the mounted data rows inside the container, e.g. `'tbody > tr[data-row]'`
   * (HAR-1829). With it the hook sizes its spacers and window from the rows' real pitch (their
   * mean `offsetHeight`) instead of trusting `rowHeight`, which only has to be close: a row's
   * height comes from CSS and content (kit padding, a second line, density), and a wrong number
   * gives a short scrollbar and a window that drifts away from the rows on screen. It measures
   * when windowing starts, when `rowHeight` changes (a density switch) and when the container
   * resizes, never while scrolling, so the spacers do not move under the reader. Spacer rows
   * must not match it.
   */
  measureRows?: string;
  /** Rows rendered beyond each viewport edge. Default: 6. */
  overscan?: number;
  /**
   * Render all rows at or below this count: rows are windowed only when
   * `rows.length > threshold` (so exactly `threshold` rows are still rendered whole).
   * Default: 100.
   */
  threshold?: number;
  /**
   * Viewport height in pixels to assume until the scroll element has been measured, and
   * whenever it measures 0 (first render, a hidden tab, a test without layout). With it, a
   * 5,000-row table mounts with one window of rows; without it every row is rendered until
   * the first measurement, as before (HAR-1616).
   */
  estimatedViewportHeight?: number;
  /** `false` renders every row with no spacers, whatever the count. Default: `true`. */
  enabled?: boolean;
}

export interface ScrollToIndexOptions {
  /**
   * Where the row lands: `nearest` (default) scrolls the least that shows it, or not at all when it
   * is in view; `start`, `center` and `end` place it in the clear part of the scroller.
   */
  align?: 'nearest' | 'start' | 'center' | 'end';
}

export interface UseVirtualRowsResult<T> {
  /** Attach to the scrolling TableWrap. */
  containerRef: RefObject<HTMLDivElement>;
  rows: readonly T[];
  startIndex: number;
  padTop: number;
  padBottom: number;
  totalHeight: number;
  virtualized: boolean;
  /**
   * The row height in use: the measured pitch with `measureRows`, else the `rowHeight` option.
   */
  rowHeight: number;
  /**
   * Scrolls the container so row `index` is in view, mounted or not, clear of what covers the
   * container (WCAG 2.2 SC 2.4.11): its `scroll-padding` (a `TableWrap` pads for its sticky header)
   * and the fixed layers registered with `useStickyLayer` (the Toaster, the TaskTray) where they
   * reach over it. With `measureRows` the rows' offset in the container (a header above them) is
   * measured; without it row 0 starts at the container's top. Focus the row once it is rendered.
   */
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
}

/**
 * Owns scroll/resize observation and exposes the small visible row window.
 * Consumers render padTop/padBottom spacer rows inside their existing tbody.
 * When the row count shrinks under a large scroll position the window is clamped to the new
 * count in the same render, so `padTop` never exceeds the list (HAR-1616).
 */
export function useVirtualRows<T>(
  rows: readonly T[],
  { rowHeight: estimate, overscan = 6, threshold = 100, estimatedViewportHeight = 0, enabled = true, measureRows }: UseVirtualRowsOptions,
): UseVirtualRowsResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });
  /** The measured row pitch, with the estimate it was measured under. */
  const [measured, setMeasured] = useState<{ height: number; estimate: number } | null>(null);
  /** Measures the mounted rows (HAR-1829); kept current for the resize observer. */
  const measureRowsRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let frame = 0;
    const commitMeasurement = () => {
      const next = { scrollTop: element.scrollTop, height: element.clientHeight };
      setViewport((current) => current.scrollTop === next.scrollTop && current.height === next.height ? current : next);
    };
    const measure = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        commitMeasurement();
      });
    };
    commitMeasurement();
    element.addEventListener('scroll', measure, { passive: true });
    // A resize can change the rows' height (text rewraps); a scroll cannot, so only this re-measures them.
    const observer = new ResizeObserver(() => { measure(); measureRowsRef.current(); });
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', measure);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const height = viewport.height > 0 ? viewport.height : Math.max(0, estimatedViewportHeight);
  const virtualized = enabled && height > 0 && shouldVirtualize(rows.length, threshold);
  // A measurement belongs to the estimate it was taken under: a new estimate (a density switch)
  // uses the new number until the rows have been measured again, in the same commit.
  const rowHeight = measureRows && measured && measured.estimate === estimate ? measured.height : estimate;

  measureRowsRef.current = () => {
    const element = containerRef.current;
    if (!element || !measureRows || !virtualized) return;
    let total = 0;
    let count = 0;
    for (const row of Array.from(element.querySelectorAll<HTMLElement>(measureRows))) {
      const h = row.offsetHeight;
      if (h > 0) { total += h; count += 1; }
    }
    if (count === 0) return;
    // Hundredths: a mean of whole pixels can be fractional; finer than that only churns renders.
    const next = Math.round((total / count) * 100) / 100;
    setMeasured((current) => (current && current.estimate === estimate && current.height === next ? current : { height: next, estimate }));
  };
  // When windowing starts and when the estimate changes: the rows are laid out by now.
  useLayoutEffect(() => { measureRowsRef.current(); }, [virtualized, estimate, measureRows]);

  const window = useMemo(
    () => virtualized
      ? virtualWindow(viewport.scrollTop, height, rowHeight, rows.length, overscan)
      : { start: 0, end: rows.length, padTop: 0, padBottom: 0, total: rows.length * rowHeight },
    [virtualized, overscan, rowHeight, rows.length, height, viewport.scrollTop],
  );
  const visibleRows = useMemo(() => rows.slice(window.start, window.end), [rows, window.start, window.end]);

  const latest = useRef({ rowHeight, start: window.start, count: rows.length, measureRows });
  latest.current = { rowHeight, start: window.start, count: rows.length, measureRows };
  const scrollToIndex = useCallback((index: number, { align = 'nearest' }: ScrollToIndexOptions = {}) => {
    const element = containerRef.current;
    const { rowHeight: pitch, start, count, measureRows: selector } = latest.current;
    if (!element || count === 0 || !(pitch > 0)) return;
    const target = Math.min(count - 1, Math.max(0, Math.round(index)));
    const box = element.getBoundingClientRect();
    const boxTop = box.top + element.clientTop;
    const boxBottom = boxTop + element.clientHeight;
    // where row 0 starts in the content: the first mounted row, less the rows above it
    const first = selector ? element.querySelector<HTMLElement>(selector) : null;
    const origin = first ? first.getBoundingClientRect().top - boxTop + element.scrollTop - start * pitch : 0;
    // the clear band: inside the scroll padding and clear of the fixed layers that reach over the box
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    let padTop = parseFloat(style?.scrollPaddingTop ?? '') || 0;
    let padBottom = parseFloat(style?.scrollPaddingBottom ?? '') || 0;
    const insets = stickyInsets(element.ownerDocument);
    const viewport = element.ownerDocument.documentElement.clientHeight;
    if (insets.top > 0) padTop = Math.max(padTop, insets.top - boxTop);
    if (insets.bottom > 0) padBottom = Math.max(padBottom, boxBottom - (viewport - insets.bottom));
    const room = element.clientHeight - padTop - padBottom;
    const top = origin + target * pitch;
    const bottom = top + pitch;
    const toStart = top - padTop;
    const toEnd = bottom + padBottom - element.clientHeight;
    let next = element.scrollTop;
    if (align === 'start' || room < pitch) next = toStart;
    else if (align === 'end') next = toEnd;
    else if (align === 'center') next = toStart - (room - pitch) / 2;
    else if (toStart < next) next = toStart;
    else if (toEnd > next) next = toEnd;
    // the browser clamps to the scroll range (an unmeasured scroller reports no range at all)
    element.scrollTop = Math.max(0, next);
  }, []);

  return {
    containerRef,
    rows: visibleRows,
    startIndex: window.start,
    padTop: window.padTop,
    padBottom: window.padBottom,
    totalHeight: window.total,
    virtualized,
    rowHeight,
    scrollToIndex,
  };
}
