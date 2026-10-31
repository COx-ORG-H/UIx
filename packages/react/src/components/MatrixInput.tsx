"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { HTMLAttributes, KeyboardEventHandler, PointerEvent as ReactPointerEvent, FocusEvent } from 'react';
import { useMatrixGrid } from '../hooks/useMatrixGrid.js';
import { MatrixFrame, matrixClass } from './MatrixParts.js';
import type { MatrixAxisItem, MatrixTone } from './MatrixParts.js';
import { Select } from './Select.js';
import type { SelectOption } from './Select.js';

/** One choice a cell offers. */
export interface MatrixOption {
  /** Not empty: an empty value is a cell with none. */
  value: string;
  /** Shown in the cell and the list: a level is always readable without its colour. */
  label: string;
  tone?: MatrixTone;
  /** A second, muted line in the list. */
  description?: string;
  /**
   * The value that says "looked at, and not rated". It is drawn apart from the levels, and apart
   * from a cell with no value at all, which shows `labels.empty`.
   */
  unrated?: boolean;
  disabled?: boolean;
}

/**
 * The choices so far: `value[rowId][columnId]`. A cell without an entry shows `labels.empty`, and
 * so does one naming an option no longer in `options`: keep retired values among the options, marked
 * `disabled`, for as long as stored data can hold them.
 */
export type MatrixValue = Readonly<Record<string, Readonly<Record<string, string | undefined>> | undefined>>;

/** What one cell changed to. */
export interface MatrixChange {
  rowId: string;
  columnId: string;
  value: string;
}

/** What is particular to one cell. */
export interface MatrixCellState {
  /** Shown under the grid while the cell has focus or the pointer. */
  help?: string;
  /** Shown in the cell. */
  error?: string;
  /** Can be reached and read, but not changed, and is drawn dimmed. */
  disabled?: boolean;
  /** Can be reached and read, but not changed. */
  readOnly?: boolean;
}

/** MatrixInput's words. There are no defaults: the kit carries no language of its own here. */
export interface MatrixInputLabels {
  /** Shown in a cell with no value. */
  empty: string;
}

export interface MatrixInputProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'children' | 'aria-label' | 'aria-labelledby'> {
  /** Names the grid. Give this or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  rows: readonly MatrixAxisItem[];
  columns: readonly MatrixAxisItem[];
  /** What each cell can hold. Keep this array stable: a new one redraws every cell. */
  options: readonly MatrixOption[];
  value: MatrixValue;
  /** Called with the whole next value, and with the one cell that changed. */
  onChange: (value: MatrixValue, change: MatrixChange) => void;
  /** Names the row headers, in the corner. */
  rowAxisLabel: string;
  /** Names the column headers, in the corner. */
  columnAxisLabel?: string;
  labels: MatrixInputLabels;
  /** Help, an error or a lock for one cell. */
  getCell?: (rowId: string, columnId: string) => MatrixCellState | undefined;
  /** Every cell can be reached and read, but none changed, and all are drawn dimmed. */
  disabled?: boolean;
  /** Every cell can be reached and read, but none changed. */
  readOnly?: boolean;
}

interface CellProps {
  rowId: string;
  columnId: string;
  rowIndex: number;
  columnIndex: number;
  name: string;
  value: string;
  options: readonly SelectOption[];
  option: MatrixOption | undefined;
  empty: string;
  help?: string;
  error?: string;
  disabled: boolean;
  readOnly: boolean;
  id: string;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onPick: (rowId: string, columnId: string, value: string) => void;
}

const Cell = memo(function Cell({
  rowId, columnId, rowIndex, columnIndex, name, value, options, option, empty, help, error, disabled, readOnly, id, onKeyDown, onPick,
}: CellProps) {
  const locked = disabled || readOnly;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;
  return (
    <td role="gridcell" className="uix-matrix__cell" aria-readonly={locked || undefined} aria-invalid={error ? true : undefined}>
      <Select
        size="sm"
        aria-label={name}
        aria-describedby={describedBy}
        aria-disabled={disabled || undefined}
        tabIndex={rowIndex === 0 && columnIndex === 0 ? 0 : -1}
        options={options}
        value={value}
        placeholder={empty}
        readOnly={locked}
        invalid={!!error}
        data-uix-matrix-cell=""
        data-row={rowIndex}
        data-column={columnIndex}
        data-tone={option?.tone}
        data-unrated={option?.unrated || undefined}
        data-locked={disabled || undefined}
        data-help={help}
        onKeyDown={onKeyDown as unknown as KeyboardEventHandler<HTMLSelectElement>}
        onValueChange={(next) => onPick(rowId, columnId, next as string)}
      />
      {help && <span id={helpId} className="uix-visually-hidden">{help}</span>}
      {error && <span id={errorId} className="uix-matrix__error">{error}</span>}
    </td>
  );
});

/**
 * A grid of choices: one value per row and column, filled from the keyboard alone (HAR-2752).
 * Each cell is a `Select`. The grid is one tab stop: arrow keys move between cells, Home and End
 * along a row, Ctrl+Home and Ctrl+End to its corners; Enter, Space or a typed letter opens the
 * choice, and focus comes back to the cell afterwards.
 *
 * Controlled, and without words of its own: `labels`, the axes and the options come from the
 * caller. A wide grid scrolls inside its own container with both headers sticky.
 */
export function MatrixInput({
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, rows, columns, options, value, onChange, rowAxisLabel, columnAxisLabel,
  labels, getCell, disabled = false, readOnly = false, className, ...props
}: MatrixInputProps) {
  const uid = useId();
  const { gridRef, onCellKeyDown, onGridFocus } = useMatrixGrid(rows.length, columns.length);
  const helpRef = useRef<HTMLParagraphElement>(null);

  // The latest value without a new callback, so a change redraws its own cell and no other.
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const onPick = useCallback((rowId: string, columnId: string, next: string) => {
    const current = latest.current;
    current.onChange(
      { ...current.value, [rowId]: { ...current.value[rowId], [columnId]: next } },
      { rowId, columnId, value: next },
    );
  }, []);

  const choices = useMemo<SelectOption[]>(() => options.map(({ value: v, label, description, disabled: off }) => ({
    value: v, label, ...(description ? { description } : {}), ...(off ? { disabled: true } : {}),
  })), [options]);
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);

  // The help line is written straight to the DOM: moving through the grid redraws no cell.
  const showHelp = (cell: Element | null | undefined) => {
    if (helpRef.current) helpRef.current.textContent = cell?.getAttribute('data-help') ?? '';
  };
  const cellOf = (target: EventTarget | null) => (target as Element | null)?.closest?.('[data-uix-matrix-cell]') ?? null;
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    onGridFocus(event);
    showHelp(cellOf(event.target));
  };
  const onPointerOver = (event: ReactPointerEvent<HTMLElement>) => {
    const cell = cellOf(event.target);
    if (cell && event.pointerType === 'mouse') showHelp(cell);
  };
  const onPointerLeave = () => showHelp(cellOf(document.activeElement));
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) showHelp(null);
  };
  // A cell's help can follow its value, and choosing a value does not move the focus.
  useEffect(() => {
    const focused = cellOf(document.activeElement);
    if (focused && gridRef.current?.contains(focused)) showHelp(focused);
  });

  const anyHelp = !!getCell && rows.some((row) => columns.some((column) => getCell(row.id, column.id)?.help));

  return (
    <div {...props} className={matrixClass(className, 'input')}>
      <MatrixFrame
        gridRef={gridRef}
        rows={rows}
        columns={columns}
        rowAxisLabel={rowAxisLabel}
        columnAxisLabel={columnAxisLabel}
        ariaLabel={ariaLabel}
        ariaLabelledBy={ariaLabelledBy}
        readOnly={readOnly}
        onFocus={onFocus}
        gridProps={{ onPointerOver, onPointerLeave, onBlur }}
        renderCell={(row, column, rowIndex, columnIndex) => {
          const state = getCell?.(row.id, column.id);
          const current = value[row.id]?.[column.id] ?? '';
          return (
            <Cell
              key={column.id}
              rowId={row.id}
              columnId={column.id}
              rowIndex={rowIndex}
              columnIndex={columnIndex}
              name={`${row.label}, ${column.label}`}
              value={current}
              options={choices}
              option={byValue.get(current)}
              empty={labels.empty}
              help={state?.help}
              error={state?.error}
              disabled={disabled || !!state?.disabled}
              readOnly={readOnly || !!state?.readOnly}
              id={`${uid}-${rowIndex}-${columnIndex}`}
              onKeyDown={onCellKeyDown}
              onPick={onPick}
            />
          );
        }}
      />
      {/* The cells already carry this for a screen reader, through aria-describedby. */}
      {anyHelp && <p ref={helpRef} className="uix-matrix__help" aria-hidden="true" />}
    </div>
  );
}
