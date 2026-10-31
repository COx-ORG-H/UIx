import type { CSSProperties, FocusEventHandler, ReactNode, RefObject } from 'react';
import { cx } from '../cx.js';

/** A level's or a band's colour. It always comes with words: colour is never the only cue. */
export type MatrixTone = 'neutral' | 'info' | 'success' | 'warning' | 'attention' | 'danger';

/** One row or column of a matrix. */
export interface MatrixAxisItem {
  id: string;
  /** Names the header, and the cells under it to a screen reader. */
  label: string;
  /** A second, muted line in the header. */
  description?: ReactNode;
}

interface MatrixFrameProps {
  gridRef: RefObject<HTMLTableElement>;
  rows: readonly MatrixAxisItem[];
  columns: readonly MatrixAxisItem[];
  /** Names the row headers, in the corner. */
  rowAxisLabel: string;
  /** Names the column headers, in the corner. */
  columnAxisLabel?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  readOnly: boolean;
  onFocus: FocusEventHandler<HTMLElement>;
  gridProps?: Record<string, unknown>;
  /** The cell at a row and a column, as `<td>`. */
  renderCell: (row: MatrixAxisItem, column: MatrixAxisItem, rowIndex: number, columnIndex: number) => ReactNode;
}

/**
 * The table both matrices share: a `role="grid"` table with sticky row and column headers, in
 * its own scroller so a wide grid never widens the page. The layout is fixed, so a cell does not
 * change width when its words do.
 */
export function MatrixFrame({
  gridRef, rows, columns, rowAxisLabel, columnAxisLabel, ariaLabel, ariaLabelledBy, readOnly, onFocus, gridProps, renderCell,
}: MatrixFrameProps) {
  return (
    <div className="uix-matrix__scroll">
      <table
        {...gridProps}
        ref={gridRef}
        role="grid"
        className="uix-matrix__grid"
        style={{ '--uix-matrix-columns': columns.length } as CSSProperties}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-readonly={readOnly || undefined}
        onFocus={onFocus}
      >
        <thead>
          <tr>
            <th scope="col" className="uix-matrix__corner">
              {columnAxisLabel && <span className="uix-matrix__axis uix-matrix__axis--column">{columnAxisLabel}</span>}
              <span className="uix-matrix__axis">{rowAxisLabel}</span>
            </th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="uix-matrix__column">
                {column.label}
                {column.description != null && <span className="uix-matrix__note">{column.description}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id}>
              <th scope="row" className="uix-matrix__row">
                {row.label}
                {row.description != null && <span className="uix-matrix__note">{row.description}</span>}
              </th>
              {columns.map((column, columnIndex) => renderCell(row, column, rowIndex, columnIndex))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The class of a matrix's outer element. */
export const matrixClass = (className: string | undefined, modifier?: string) =>
  cx('uix-matrix', modifier && `uix-matrix--${modifier}`, className);
