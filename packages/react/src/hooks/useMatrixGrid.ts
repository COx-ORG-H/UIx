"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { FocusEvent, KeyboardEvent, RefObject } from 'react';
import { matrixStep } from '../matrix-model.js';
import { syncRovingStop } from '../roving.js';
import type { RovingStop } from '../roving.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** Marks a grid's controls. Each also carries `data-row` and `data-column`. */
const CELL = '[data-uix-matrix-cell]';

export interface MatrixGrid {
  gridRef: RefObject<HTMLTableElement>;
  /** On each cell's control. A control with an open list (`aria-expanded`) keeps its own keys. */
  onCellKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** On the grid: the focused cell becomes the tab stop. */
  onGridFocus: (event: FocusEvent<HTMLElement>) => void;
}

/**
 * One tab stop and arrow-key movement over a grid's cells, written straight to the DOM: moving
 * through a grid of 50 Selects re-renders none of them. The stop survives a re-render, and falls
 * to the cell now in its place when its own cell has gone.
 */
export function useMatrixGrid(rows: number, columns: number): MatrixGrid {
  const gridRef = useRef<HTMLTableElement>(null);
  const stop = useRef<RovingStop>({ node: null, index: 0 });
  const size = useRef({ rows, columns });
  size.current = { rows, columns };

  const cells = () => Array.from(gridRef.current?.querySelectorAll<HTMLElement>(CELL) ?? []);

  useIsomorphicLayoutEffect(() => {
    stop.current = syncRovingStop(cells(), stop.current);
  });

  const onGridFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const cell = (event.target as Element).closest<HTMLElement>(CELL);
    if (cell) stop.current = syncRovingStop(cells(), stop.current, cell);
  }, []);

  const onCellKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const cell = event.currentTarget;
    if (cell.getAttribute('aria-expanded') === 'true') return;
    // Modified keys stay where they were: Alt+ArrowLeft is the browser's Back, and Alt+ArrowDown
    // opens a Select. Only Ctrl or Cmd with Home or End is the grid's.
    const { key, altKey, shiftKey } = event;
    const corner = event.ctrlKey || event.metaKey;
    if (altKey || shiftKey || (corner && key !== 'Home' && key !== 'End')) return;
    const to = matrixStep(
      { row: Number(cell.dataset.row), column: Number(cell.dataset.column) },
      size.current,
      key,
      { corner, rtl: getComputedStyle(cell).direction === 'rtl' },
    );
    if (!to) return;
    event.preventDefault();
    const next = gridRef.current?.querySelector<HTMLElement>(`${CELL}[data-row="${to.row}"][data-column="${to.column}"]`);
    if (!next || next === cell) return;
    // focus() alone would leave the cell under the sticky headers. The stylesheet's scroll-padding
    // clears the row headers; the column headers' height depends on their words, so it is measured.
    next.focus({ preventScroll: true });
    next.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const grid = gridRef.current;
    // A header cell: it is the cells that stick, and the <thead> itself scrolls away.
    const header = grid?.tHead?.rows[0]?.cells[0];
    const scroller = grid?.parentElement;
    if (!header || !scroller) return;
    const under = header.getBoundingClientRect().bottom - next.getBoundingClientRect().top;
    if (under > 0) scroller.scrollTop -= under;
  }, []);

  return { gridRef, onCellKeyDown, onGridFocus };
}
