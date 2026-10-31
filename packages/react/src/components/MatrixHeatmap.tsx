"use client";

import { useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import { useMatrixGrid } from '../hooks/useMatrixGrid.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { MatrixFrame, matrixClass } from './MatrixParts.js';
import type { MatrixAxisItem, MatrixTone } from './MatrixParts.js';

/** A cell's named band. The name is always shown: colour is never the only cue. */
export interface MatrixBand {
  label: string;
  tone?: MatrixTone;
}

/** What one cell of a heatmap holds. */
export interface MatrixHeatmapCell {
  rowId: string;
  columnId: string;
  /** How many items sit in the cell. `0` is shown as a zero unless `hideCount` is set. */
  count?: number;
  band?: MatrixBand;
  /**
   * Show the band without its figure, for a zero the caller would rather not print. Still a cell
   * with data, drawn apart from a cell the caller left out.
   */
  hideCount?: boolean;
  /** Opens as a link rather than a button, through `renderLink`. */
  href?: string;
}

/** MatrixHeatmap's words. There are no defaults: the kit carries no language of its own here. */
export interface MatrixHeatmapLabels {
  /** Shown in a cell the caller left out of `cells`. */
  empty: string;
}

export interface MatrixHeatmapProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label' | 'aria-labelledby'> {
  /** Names the grid. Give this or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  rows: readonly MatrixAxisItem[];
  columns: readonly MatrixAxisItem[];
  /** The cells with data. A row and column left out is drawn as empty, and can still be opened. */
  cells: readonly MatrixHeatmapCell[];
  /**
   * The drill-through, for every cell without an `href`. An empty cell comes with only its `rowId`
   * and `columnId`. Without it, a cell with no `href` opens nothing and is marked `aria-disabled`.
   */
  onOpenCell?: (cell: MatrixHeatmapCell) => void;
  /** Draws a cell's `href` with the app's router link. */
  renderLink?: UixRenderLink;
  /** Names the row headers, in the corner. */
  rowAxisLabel: string;
  /** Names the column headers, in the corner. */
  columnAxisLabel?: string;
  labels: MatrixHeatmapLabels;
}

const cellKey = (rowId: string, columnId: string) => JSON.stringify([rowId, columnId]);

/**
 * How many items sit in each cell of a two-axis grid, each cell's named band, and a way to the
 * items behind it (HAR-2753). Every cell is one control. The grid is one tab stop: arrow keys
 * move between cells, Home and End along a row, Ctrl+Home and Ctrl+End to its corners, and Enter
 * opens the cell.
 *
 * Without words of its own: `labels`, the axes and the bands come from the caller. A wide grid
 * scrolls inside its own container with both headers sticky.
 */
export function MatrixHeatmap({
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, rows, columns, cells, onOpenCell, renderLink, rowAxisLabel, columnAxisLabel,
  labels, className, ...props
}: MatrixHeatmapProps) {
  const { gridRef, onCellKeyDown, onGridFocus } = useMatrixGrid(rows.length, columns.length);
  const byCell = useMemo(() => new Map(cells.map((cell) => [cellKey(cell.rowId, cell.columnId), cell])), [cells]);

  return (
    <div {...props} className={matrixClass(className, 'heatmap')}>
      <MatrixFrame
        gridRef={gridRef}
        rows={rows}
        columns={columns}
        rowAxisLabel={rowAxisLabel}
        columnAxisLabel={columnAxisLabel}
        ariaLabel={ariaLabel}
        ariaLabelledBy={ariaLabelledBy}
        readOnly
        onFocus={onGridFocus}
        renderCell={(row, column, rowIndex, columnIndex) => {
          const cell = byCell.get(cellKey(row.id, column.id));
          const figure = cell && !cell.hideCount && cell.count != null ? String(cell.count) : null;
          // a cell with neither a figure nor a band has nothing to show, whatever the caller passed
          const empty = figure == null && !cell?.band;
          const detail = empty ? labels.empty : [cell?.band?.label, figure].filter(Boolean).join(', ');
          const name = `${row.label}, ${column.label}${detail ? `: ${detail}` : ''}`;
          const opened = cell ?? { rowId: row.id, columnId: column.id };
          const control = {
            className: 'uix-matrix__tile',
            'aria-label': name,
            tabIndex: rowIndex === 0 && columnIndex === 0 ? 0 : -1,
            'data-uix-matrix-cell': '',
            'data-row': rowIndex,
            'data-column': columnIndex,
            'data-tone': cell?.band?.tone,
            'data-empty': empty || undefined,
            'aria-disabled': (cell?.href == null && !onOpenCell) || undefined,
            onKeyDown: onCellKeyDown,
            onClick: cell?.href != null ? undefined : () => onOpenCell?.(opened),
          };
          const content = (
            <>
              {figure != null && <span className="uix-matrix__count">{figure}</span>}
              <span className="uix-matrix__band">{empty ? labels.empty : cell?.band?.label}</span>
            </>
          );
          return (
            <td key={column.id} role="gridcell" className="uix-matrix__cell">
              {cell?.href != null
                ? renderUixLink(renderLink, { ...control, href: cell.href, children: content })
                : <button type="button" {...control}>{content}</button>}
            </td>
          );
        }}
      />
    </div>
  );
}
