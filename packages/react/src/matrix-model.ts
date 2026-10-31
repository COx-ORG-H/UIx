/* The keyboard model of a two-axis grid (HAR-2752, HAR-2753), shared by MatrixInput and
 * MatrixHeatmap: where a key goes from a cell. Plain data, so it is tested without a DOM. */

export interface MatrixPosition {
  row: number;
  column: number;
}

export interface MatrixSize {
  rows: number;
  columns: number;
}

export interface MatrixStepOptions {
  /** Ctrl or Cmd is held: Home and End go to the grid's corners instead of the row's ends. */
  corner?: boolean;
  /** The grid reads right to left: ArrowLeft moves forward along the row. */
  rtl?: boolean;
}

/**
 * Where `key` goes from `from`, or `null` when it is not a grid key. The grid has edges: a move
 * past one stays where it is (and the key is still the grid's, so the page does not scroll).
 */
export function matrixStep(from: MatrixPosition, size: MatrixSize, key: string, options: MatrixStepOptions = {}): MatrixPosition | null {
  const { corner = false, rtl = false } = options;
  const lastRow = size.rows - 1;
  const lastColumn = size.columns - 1;
  const clamp = (row: number, column: number): MatrixPosition => ({
    row: Math.max(0, Math.min(lastRow, row)),
    column: Math.max(0, Math.min(lastColumn, column)),
  });
  switch (key) {
    case 'ArrowUp': return clamp(from.row - 1, from.column);
    case 'ArrowDown': return clamp(from.row + 1, from.column);
    case 'ArrowLeft': return clamp(from.row, from.column + (rtl ? 1 : -1));
    case 'ArrowRight': return clamp(from.row, from.column + (rtl ? -1 : 1));
    case 'Home': return corner ? clamp(0, 0) : clamp(from.row, 0);
    case 'End': return corner ? clamp(lastRow, lastColumn) : clamp(from.row, lastColumn);
    default: return null;
  }
}
