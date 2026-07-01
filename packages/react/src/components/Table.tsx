import type {
  ReactNode, TableHTMLAttributes, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, ButtonHTMLAttributes,
} from 'react';
import { cx } from '../cx.js';
import { highlightSegments } from '../table-engine.js';

export interface TableWrapProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function TableWrap({ children, className, ...props }: TableWrapProps) {
  return (
    <div className={cx('uix-table-wrap', className)} {...props}>
      {children}
    </div>
  );
}

export type TableDensity = 'compact' | 'standard' | 'comfortable';
export type SortDirection = 'ascending' | 'descending' | 'none';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  density?: TableDensity;
  zebra?: boolean;
  pinnedCol?: boolean;
  /** table-layout: fixed — required for reliable column widths + primary-column truncation */
  fixed?: boolean;
  rowPeek?: boolean;
  v2?: boolean;
}

export function Table({
  density = 'standard',
  zebra = true,
  pinnedCol,
  fixed,
  rowPeek,
  v2,
  className,
  children,
  ...props
}: TableProps) {
  return (
    <table
      className={cx(
        'uix-table',
        !zebra && 'uix-table--no-zebra',
        pinnedCol && 'uix-table--pinned-col',
        fixed && 'uix-table--fixed',
        className,
      )}
      data-density={density !== 'standard' ? density : undefined}
      data-uix-rowpeek={rowPeek || undefined}
      data-uix-table-v2={v2 || undefined}
      {...props}
    >
      {children}
    </table>
  );
}

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDirection;
  /** 1-based ordinal shown when this column is a secondary key in a multi-sort */
  sortOrder?: number;
  onSort?: () => void;
}

export function Th({ sortable, sortDirection, sortOrder, onSort, className, children, onClick, ...props }: ThProps) {
  return (
    <th
      className={className}
      data-sort={sortable || undefined}
      data-sort-order={sortOrder != null && sortOrder > 0 ? sortOrder : undefined}
      aria-sort={sortDirection && sortDirection !== 'none' ? sortDirection : undefined}
      onClick={sortable ? onSort ?? onClick : onClick}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  pinned?: boolean;
}

export function Td({ pinned, className, children, ...props }: TdProps) {
  return (
    <td className={className} data-pinned={pinned || undefined} {...props}>
      {children}
    </td>
  );
}

export interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  pinned?: boolean;
}

export function Tr({ selected, pinned, className, children, ...props }: TrProps) {
  return (
    <tr
      className={className}
      aria-selected={selected || undefined}
      data-pinned={pinned || undefined}
      {...props}
    >
      {children}
    </tr>
  );
}

/* ── selection & bulk actions ─────────────────────────────────────────────────── */

export interface BulkBarProps extends HTMLAttributes<HTMLDivElement> {
  /** number of selected rows, rendered as "N selected" */
  count?: number;
  children?: ReactNode;
}

/** Contextual action bar shown above the table when ≥1 row is selected. */
export function BulkBar({ count, children, className, ...props }: BulkBarProps) {
  return (
    <div className={cx('uix-bulkbar', className)} role="toolbar" aria-label="Bulk actions" {...props}>
      {count != null && <span className="uix-bulkbar__count">{count} selected</span>}
      <span className="uix-bulkbar__spacer" />
      {children}
    </div>
  );
}

/* ── row actions ──────────────────────────────────────────────────────────────── */

export interface RowActionsProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
}

/** Trailing cell that holds the row's hover actions (kebab, quick actions). */
export function RowActions({ children, className, ...props }: RowActionsProps) {
  return (
    <td className={cx('uix-table__actions', className)} {...props}>
      {children}
    </td>
  );
}

export interface RowActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

/** A single hover-revealed row action button (icon inside). */
export function RowAction({ children, className, type = 'button', ...props }: RowActionProps) {
  return (
    <button type={type} className={cx('uix-rowact', className)} {...props}>
      {children}
    </button>
  );
}

/* ── expandable inline row ────────────────────────────────────────────────────── */

export interface ExpandToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  expanded?: boolean;
}

/** Chevron button that expands/collapses an inline detail row. */
export function ExpandToggle({ expanded, className, type = 'button', ...props }: ExpandToggleProps) {
  return (
    <button
      type={type}
      className={cx('uix-table__expand', className)}
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse row' : 'Expand row'}
      {...props}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 4l4 4-4 4" />
      </svg>
    </button>
  );
}

/* ── cell content vocabulary ──────────────────────────────────────────────────── */

/** Emphasised primary cell text. */
export function CellStrong({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('uix-cell-strong', className)} {...props}>{children}</span>;
}

/** Secondary line under a primary cell value (muted, meta size). */
export function CellSub({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('uix-cell-sub', className)} {...props}>{children}</span>;
}

/* ── search highlight ─────────────────────────────────────────────────────────── */

export interface MarkProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/** A search-match highlight span. */
export function Mark({ children, className, ...props }: MarkProps) {
  return <mark className={cx('uix-mark', className)} {...props}>{children}</mark>;
}

export interface HighlightedProps {
  text: string;
  query: string;
}

/** Render `text` with case-insensitive matches of `query` wrapped in <mark>. */
export function Highlighted({ text, query }: HighlightedProps) {
  return (
    <>
      {highlightSegments(text, query).map((seg, i) =>
        seg.match ? <mark key={i} className="uix-mark">{seg.text}</mark> : <span key={i}>{seg.text}</span>,
      )}
    </>
  );
}
