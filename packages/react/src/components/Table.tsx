import type {
  ReactNode, TableHTMLAttributes, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, ButtonHTMLAttributes, AnchorHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';
import { cx } from '../cx.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { highlightSegments } from '../table-engine.js';
import { BusyBar } from './BusyBar.js';
import { TableOverflowProbe } from './TableOverflowProbe.js';

export interface TableWrapProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Polite live-region text for table state changes — "Sorted by …", "N results",
   * "N selected". Pass `useTable().announcement` straight through (UIX-A11Y-2).
   */
  announcement?: string;
  /**
   * The rows are being fetched again (a filter, sort, page or saved-view change; HAR-2582). The
   * current rows stay and dim under an indeterminate bar along the top, and the wrap is
   * `aria-busy`; after 300 ms, held at least 500 ms. Keep the previous rows while fetching
   * (TanStack Query `placeholderData: keepPreviousData`); skeleton rows are for a first load.
   */
  refreshing?: boolean;
  children?: ReactNode;
}

export const TableWrap = forwardRef<HTMLDivElement, TableWrapProps>(function TableWrap(
  { announcement, refreshing, children, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cx('uix-table-wrap', className)} aria-busy={refreshing || undefined} {...props}>
      {refreshing !== undefined && <BusyBar busy={refreshing} />}
      <TableOverflowProbe />
      {announcement != null && (
        <div role="status" className="uix-visually-hidden">{announcement}</div>
      )}
      {children}
    </div>
  );
});

export type TableDensity = 'compact' | 'standard' | 'comfortable';
export type SortDirection = 'ascending' | 'descending' | 'none';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /**
   * The row height. Named, the table holds it, `standard` included, whatever the page sets
   * `--uix-row-h` to (a density preference); left out, the table follows `--uix-row-h`.
   */
  density?: TableDensity;
  zebra?: boolean;
  pinnedCol?: boolean;
  /**
   * Freeze the last column at the right edge while the wrap scrolls sideways, so a trailing
   * row-actions column (peek, kebab) stays one click away. Pin the row's state with
   * `Tr selected` / `Tr pinned`: the frozen cell repaints those, not a consumer's own row class.
   */
  pinnedActions?: boolean;
  /** table-layout: fixed — required for reliable column widths + primary-column truncation */
  fixed?: boolean;
  rowPeek?: boolean;
  v2?: boolean;
}

export function Table({
  density,
  zebra = true,
  pinnedCol,
  pinnedActions,
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
        pinnedActions && 'uix-table--pinned-actions',
        fixed && 'uix-table--fixed',
        className,
      )}
      // A table that names a density holds it (HAR-2631: standard too, against a page-wide
      // --uix-row-h re-point); one that names none follows the page.
      data-density={density}
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
  /**
   * The ordinal in words for assistive tech, e.g. "Sort priority 2" (2.50, HAR-2623). The visible
   * ordinal is CSS content with empty alt text, so without this it is not announced at all.
   */
  sortOrderLabel?: string;
  onSort?: () => void;
}

export function Th({ sortable, sortDirection, sortOrder, sortOrderLabel, onSort, className, children, onClick, ...props }: ThProps) {
  const ordinal = sortOrder != null && sortOrder > 0 && sortOrderLabel
    ? <span className="uix-visually-hidden">{`, ${sortOrderLabel}`}</span>
    : null;
  return (
    <th
      className={className}
      data-sort={sortable || undefined}
      data-sort-order={sortOrder != null && sortOrder > 0 ? sortOrder : undefined}
      data-sort-labelled={(ordinal != null) || undefined}
      aria-sort={sortDirection && sortDirection !== 'none' ? sortDirection : undefined}
      // Sort clicks go through the real <button> below so keyboard users can reach them
      // (UIX-A11Y-2); generic onClick keeps its old non-sort semantics — it is dropped
      // when a sort handler owns the header, exactly as before.
      onClick={sortable && onSort ? undefined : onClick}
      {...props}
    >
      {sortable ? (
        <button type="button" className="uix-th__sortbtn" onClick={onSort}>{children}{ordinal}</button>
      ) : (
        <>{children}{ordinal}</>
      )}
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
      // aria-selected is invalid on a native table row (role=row only supports it in a
      // grid) — selection is a styling state here, so a data attribute carries it (UIX-A11Y-2).
      data-selected={selected || undefined}
      data-pinned={pinned || undefined}
      {...props}
    >
      {children}
    </tr>
  );
}

/* ── selection & bulk actions ─────────────────────────────────────────────────── */

export interface BulkBarProps extends HTMLAttributes<HTMLDivElement> {
  /** number of selected rows, rendered through `selectedLabel` */
  count?: number;
  children?: ReactNode;
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  label?: string;
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  selectedLabel?: (count: number) => ReactNode;
}

/** Contextual action bar shown above the table when ≥1 row is selected. */
export function BulkBar({ count, children, label = 'Bulk actions', selectedLabel = (n: number) => `${n} selected`, className, ...props }: BulkBarProps) {
  return (
    <div className={cx('uix-bulkbar', className)} role="toolbar" aria-label={label} {...props}>
      {count != null && <span className="uix-bulkbar__count">{selectedLabel(count)}</span>}
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
  /** A button has no `href`; pass one for the link form (`RowActionLinkProps`). */
  href?: undefined;
}

/**
 * HAR-2713: a row verb that navigates (an in-app page, a `mailto:`, a PDF in a new tab) as an
 * `<a class="uix-rowact">`, with the same hover reveal and weight as the button form. `renderLink`
 * renders it with your router; `target` and `rel` pass through.
 */
export interface RowActionLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Renders the link with your router (`ButtonLink`, `idColumn.renderLink`). Default: a plain `<a>`. */
  renderLink?: UixRenderLink;
  children?: ReactNode;
}

/** A single hover-revealed row action: a button, or a link when it has an `href` (HAR-2713). */
export function RowAction(props: RowActionProps | RowActionLinkProps) {
  if (props.href != null) {
    const { href, renderLink, className, children, ...rest } = props as RowActionLinkProps;
    return <>{renderUixLink(renderLink, { ...rest, href, className: cx('uix-rowact', className), children })}</>;
  }
  const { children, className, type = 'button', href: _href, ...rest } = props as RowActionProps;
  return (
    <button type={type} className={cx('uix-rowact', className)} {...rest}>
      {children}
    </button>
  );
}

/* ── expandable inline row ────────────────────────────────────────────────────── */

export interface ExpandToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  expandLabel?: string;
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  collapseLabel?: string;
  expanded?: boolean;
  /** id of the detail row this toggle controls → `aria-controls` (UIX-A11Y-2). */
  controls?: string;
}

/** Chevron button that expands/collapses an inline detail row. */
export function ExpandToggle({ expanded, controls, expandLabel = 'Expand row', collapseLabel = 'Collapse row', className, type = 'button', ...props }: ExpandToggleProps) {
  return (
    <button
      type={type}
      className={cx('uix-table__expand', className)}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={expanded ? collapseLabel : expandLabel}
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

export interface CellSubProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Tabular numerals (HAR-1815): for a read-back code, a reference or a time, so digits line up
   * down the column and a 1 is as wide as an 8.
   */
  tabular?: boolean;
}

/** Secondary line under a primary cell value (muted, meta size). */
export function CellSub({ tabular, children, className, ...props }: CellSubProps) {
  return <span className={cx('uix-cell-sub', tabular && 'uix-cell-sub--tabular', className)} {...props}>{children}</span>;
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
