"use client";

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { shouldVirtualize, virtualWindow } from '../table-engine.js';

export interface UseVirtualRowsOptions {
  /** Fixed rendered row height in pixels. */
  rowHeight: number;
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

export interface UseVirtualRowsResult<T> {
  /** Attach to the scrolling TableWrap. */
  containerRef: RefObject<HTMLDivElement>;
  rows: readonly T[];
  startIndex: number;
  padTop: number;
  padBottom: number;
  totalHeight: number;
  virtualized: boolean;
}

/**
 * Owns scroll/resize observation and exposes the small visible row window.
 * Consumers render padTop/padBottom spacer rows inside their existing tbody.
 * When the row count shrinks under a large scroll position the window is clamped to the new
 * count in the same render, so `padTop` never exceeds the list (HAR-1616).
 */
export function useVirtualRows<T>(
  rows: readonly T[],
  { rowHeight, overscan = 6, threshold = 100, estimatedViewportHeight = 0, enabled = true }: UseVirtualRowsOptions,
): UseVirtualRowsResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });

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
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', measure);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const height = viewport.height > 0 ? viewport.height : Math.max(0, estimatedViewportHeight);
  const virtualized = enabled && height > 0 && shouldVirtualize(rows.length, threshold);
  const window = useMemo(
    () => virtualized
      ? virtualWindow(viewport.scrollTop, height, rowHeight, rows.length, overscan)
      : { start: 0, end: rows.length, padTop: 0, padBottom: 0, total: rows.length * rowHeight },
    [virtualized, overscan, rowHeight, rows.length, height, viewport.scrollTop],
  );
  const visibleRows = useMemo(() => rows.slice(window.start, window.end), [rows, window.start, window.end]);

  return {
    containerRef,
    rows: visibleRows,
    startIndex: window.start,
    padTop: window.padTop,
    padBottom: window.padBottom,
    totalHeight: window.total,
    virtualized,
  };
}
