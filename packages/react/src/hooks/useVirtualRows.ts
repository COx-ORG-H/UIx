"use client";

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { shouldVirtualize, virtualWindow } from '../table-engine.js';

export interface UseVirtualRowsOptions {
  /** Fixed rendered row height in pixels. */
  rowHeight: number;
  /** Rows rendered beyond each viewport edge. Default: 6. */
  overscan?: number;
  /** Render all rows at or below this count. Default: 100. */
  threshold?: number;
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
 */
export function useVirtualRows<T>(
  rows: readonly T[],
  { rowHeight, overscan = 6, threshold = 100 }: UseVirtualRowsOptions,
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

  const enabled = viewport.height > 0 && shouldVirtualize(rows.length, threshold);
  const window = useMemo(
    () => enabled
      ? virtualWindow(viewport.scrollTop, viewport.height, rowHeight, rows.length, overscan)
      : { start: 0, end: rows.length, padTop: 0, padBottom: 0, total: rows.length * rowHeight },
    [enabled, overscan, rowHeight, rows.length, viewport.height, viewport.scrollTop],
  );
  const visibleRows = useMemo(() => rows.slice(window.start, window.end), [rows, window.start, window.end]);

  return {
    containerRef,
    rows: visibleRows,
    startIndex: window.start,
    padTop: window.padTop,
    padBottom: window.padBottom,
    totalHeight: window.total,
    virtualized: enabled,
  };
}
