"use client";

import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties, FocusEvent as ReactFocusEvent, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent, ReactNode,
} from 'react';
import { cx } from '../cx.js';
import { toggleSort } from '../table-engine.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { isFilterEmpty, summarizeFilter } from '../filter-model.js';
import type { FilterField, FilterSummaryLabels, FilterValue, SummarizeFilterOptions } from '../filter-model.js';
import { useResolvedFilterLabels } from '../hooks/useResolvedFilterLabels.js';
import { useVirtualRows } from '../hooks/useVirtualRows.js';
import type { UseVirtualRowsResult } from '../hooks/useVirtualRows.js';
import { BusyRegion } from './BusyRegion.js';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
import { Chip } from './Chip.js';
import { FilterEditor } from './FilterEditor.js';
import { Menu, MenuItem } from './Menu.js';
import { Pagination } from './Pagination.js';
import type { PaginationLabels } from './Pagination.js';
import { Popover } from './Popover.js';
import { SearchBar } from './SearchBar.js';
import { Select } from './Select.js';
import { EmptyState, ErrorState, FilteredEmptyState, LoadingState } from './States.js';
import { BulkBar, RowActions, Table, TableWrap, Td, Th, Tr } from './Table.js';
import type { TableDensity } from './Table.js';
import { SavedViewMenu, ViewMenu } from './TableControls.js';
import type { SavedViewMenuProps, ViewMenuProps } from './TableControls.js';

/** Every word the workspace renders or announces. `{…}` are placeholders. */
export interface DataWorkspaceLabels {
  search: string;
  searchPlaceholder: string;
  addFilter: string;
  clearFilters: string;
  /** The saved-view trigger's name before the current view: "View: {name}". */
  savedView: string;
  view: string;
  saveView: string;
  saveViewAs: string;
  maximize: string;
  restore: string;
  selectAll: string;
  /** `{label}`: the row's id. */
  selectRow: string;
  /** `{count}` selected, in the bulk bar. */
  selected: string;
  bulkActions: string;
  /** The record-id cell's ↗ button. `{label}`. */
  open: string;
  rowActions: string;
  /** Offset footer: `{from}`, `{to}`, `{total}`. */
  range: string;
  rowsPerPage: string;
  loading: string;
  empty: string;
  emptyDetail: string;
  filteredEmpty: string;
  filteredEmptyDetail: string;
  error: string;
  retry: string;
  /** A sorted header's place among two or more sort keys (HAR-2623): `{n}`. */
  sortPriority: string;
  /** A group header's row count (HAR-2625): `{count}`. */
  groupCount: string;
  /** The same for one row. */
  groupCountOne: string;
  /** A group header's toggle while the group is open: `{name}`. */
  collapseGroup: string;
  /** The same while it is collapsed. */
  expandGroup: string;
  /** A group header's checkbox: `{name}`. */
  selectGroup: string;
}

export const DEFAULT_DATA_WORKSPACE_LABELS: DataWorkspaceLabels = {
  search: 'Search',
  searchPlaceholder: 'Search…',
  addFilter: 'Filter',
  clearFilters: 'Clear filters',
  savedView: 'View: {name}',
  view: 'View',
  saveView: 'Save changes',
  saveViewAs: 'Save as…',
  maximize: 'Maximize',
  restore: 'Restore size',
  selectAll: 'Select all rows on this page',
  selectRow: 'Select {label}',
  selected: '{count} selected',
  bulkActions: 'Bulk actions',
  open: 'Open {label}',
  rowActions: 'Actions',
  range: '{from}–{to} of {total}',
  rowsPerPage: 'Rows per page',
  loading: 'Loading',
  empty: 'Nothing here yet',
  emptyDetail: 'Records show here as soon as they exist.',
  filteredEmpty: 'Nothing matches',
  filteredEmptyDetail: 'Change the search or clear a filter.',
  error: 'The list could not be loaded',
  retry: 'Try again',
  sortPriority: 'Sort priority {n}',
  groupCount: '{count} rows',
  groupCountOne: '{count} row',
  collapseGroup: 'Collapse group {name}',
  expandGroup: 'Expand group {name}',
  selectGroup: 'Select group {name}',
};

export interface DataWorkspaceColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  /** `end` for numbers and amounts. */
  align?: 'start' | 'end';
  /** A CSS width for the column, e.g. `12rem`. */
  width?: string;
  /**
   * The column's floor, e.g. `14rem` (HAR-2624). In a fixed layout the table's own min-width is
   * the sum of its columns' floors, so a squeezed table scrolls rather than narrow them.
   */
  minWidth?: string;
  /**
   * A class on the column's header and body cells, e.g. `uix-col--truncate` (HAR-2624). A width
   * tier (`uix-col--w-md`) or `uix-col--flex` also sizes the column's `<col>` in a fixed layout.
   */
  className?: string;
  /**
   * The responsive ladder (`mobile`, HAR-2622): `low` columns go below 900 px of workspace width,
   * `mid` ones below 600 px; `high` (the default) stay.
   */
  priority?: 'high' | 'mid' | 'low';
  /** The column's name in words: a card's label under `mobile="cards"`. Default: `header` when it is a string. */
  label?: string;
}

export interface DataWorkspaceSort { columnId: string; direction: 'ascending' | 'descending' }

/** `sort` as a product passes it: one key (or none), or an ordered list of keys (HAR-2623). */
export type DataWorkspaceSortState = DataWorkspaceSort | readonly DataWorkspaceSort[] | null;

/** What `onSortChange` receives: a list when `sort` is a list, else one key or `null`. */
export type DataWorkspaceSortValue<S> = S extends readonly DataWorkspaceSort[] ? DataWorkspaceSort[] : DataWorkspaceSort | null;

/** The record-id column: the first column, the row's way into its record. */
export interface DataWorkspaceIdColumn<T> {
  header: ReactNode;
  /** The id as shown, e.g. "INC-20418". Also names the row's checkbox and ↗ button. */
  text: (row: T) => string;
  /**
   * The cell's content instead of `text` (HAR-2622): e.g. a strong title over a muted line, with
   * the search match marked. It sits inside the same button or link; `text` still names the
   * checkbox and the ↗.
   */
  render?: (row: T) => ReactNode;
  /** The id button opens a peek of the record. */
  onPeek?: (row: T) => void;
  /** The ↗ link goes to the full record. */
  href?: (row: T) => string;
  /**
   * Without `onPeek`: the whole id is the link to `href`, with the ↗ inside it, for a row whose
   * own record is the way in (HAR-2622). Off: the id is text and the ↗ is the link.
   */
  linkId?: boolean;
  /** The column's width in a fixed layout (`fixed`), e.g. `16rem`. */
  width?: string;
  /** The column's floor in a fixed layout. Default: the `md` column tier. */
  minWidth?: string;
  /**
   * The sort key the id column answers to in `sort` / `onSortChange` (HAR-2631), e.g. `title`
   * when the id shows the title. Default `'id'`. Keep it distinct from the data columns' ids.
   */
  id?: string;
  /**
   * The id header sorts like a data column (HAR-2631): a click cycles it, Shift + click (or
   * Shift + Enter / Space) adds it as a further key in a multi-sort, with its ordinal and
   * `aria-sort`. Off: the header is plain, as in 2.50.0.
   */
  sortable?: boolean;
  renderLink?: UixRenderLink;
}

/** A group of rows under one header row (HAR-2625). The product computes the groups. */
export interface DataWorkspaceGroup<T> {
  id: string;
  /** The group's value as shown, e.g. a status pill. */
  label: ReactNode;
  /** The group's name in words, for its toggle and checkbox. Default: `label` when a string, else `id`. */
  name?: string;
  rows: readonly T[];
  /** The group's total, when it holds more than the rows on this page. Default: `rows.length`. */
  count?: number;
  /** Aggregated cells in the header row, by column id (a sum, a range), each under its column. */
  aggregates?: Readonly<Record<string, ReactNode>>;
}

/** Windowing for a long unpaged list (HAR-2626), over `useVirtualRows`. */
export interface DataWorkspaceVirtualize {
  /** Window only above this many rows. Default 100. */
  threshold?: number;
  /** The first paint's row height in px; the mounted rows are measured after. Default: by density (44, 56, 68). */
  estimatedRowHeight?: number;
  /** The scrolling body's height cap in px. Default 640. */
  maxHeight?: number;
  /** Rows rendered beyond each edge. Default 8. */
  overscan?: number;
}

/**
 * The footer's pager. `labels` words the pager itself; without them it takes `UixLabelsProvider`
 * `pagination`, then English (HAR-2631).
 */
export type DataWorkspacePagination = (
  | { mode: 'offset'; page: number; pageSize: number; total: number; onPageChange: (page: number) => void; pageSizes?: readonly number[]; onPageSizeChange?: (size: number) => void }
  | { mode: 'cursor'; hasPrevious: boolean; hasNext: boolean; onFirst?: () => void; onPrevious: () => void; onNext: () => void; summary?: ReactNode; pageSize?: number; pageSizes?: readonly number[]; onPageSizeChange?: (size: number) => void }
) & { labels?: Partial<PaginationLabels> };

export interface DataWorkspaceProps<T, S extends DataWorkspaceSortState = DataWorkspaceSort | null> extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Names the workspace region and the table. */
  label: string;
  rows: readonly T[];
  getRowId: (row: T) => string;
  /**
   * A row's name in words, where the kit names a row (its checkbox, HAR-2632) and there is no
   * `idColumn.text`: a title or a person, never a key. Without it the row id is used, which is
   * a UUID on many tables. Keep it stable (`useCallback`), as rows are memoised.
   */
  rowLabel?: (row: T) => string;
  columns: readonly DataWorkspaceColumn<T>[];
  idColumn?: DataWorkspaceIdColumn<T>;
  /**
   * The sort: one key, or an ordered list of keys (HAR-2623). With a list, Shift + click (or
   * Shift + Enter / Space) on a header adds, turns or removes that column as a further key, and
   * each sorted header shows its place once two or more keys are set.
   */
  sort?: S;
  /** Receives the same shape `sort` holds: a list for a list, else one key or `null`. */
  onSortChange?: (sort: DataWorkspaceSortValue<S>) => void;
  /**
   * List mode even while `sort` is `null` or one key, for a product whose sort state starts
   * empty. Type `sort` as a list (`[]` for none): `onSortChange` then receives a list.
   */
  multiSort?: boolean;
  /** The selected row ids. Kept by id, so a refresh or a new page keeps them. */
  selection?: ReadonlySet<string>;
  onSelectionChange?: (selection: Set<string>) => void;
  /** At most this many rows can be selected: the unchecked boxes are disabled at the cap (HAR-2622). */
  maxSelection?: number;
  /** The bulk bar's actions for the selection (a `Menu` for the overflow). */
  bulkActions?: (selectedIds: string[]) => ReactNode;
  /**
   * A row's actions (a `Menu`, quick buttons), in a column frozen at the right edge and sized to
   * them. Return `null` for a row without actions; with none on the page there is no column.
   */
  rowActions?: (row: T) => ReactNode;
  /** More props for a row, e.g. a data attribute that marks it changed (see ChangeHighlight, PR #164). */
  getRowProps?: (row: T) => HTMLAttributes<HTMLTableRowElement> & Record<`data-${string}`, string | undefined>;
  density?: TableDensity;
  /** Zebra rows (the `Table` default, on). The View menu's toggle (HAR-2624). */
  zebra?: boolean;
  /**
   * Freeze the first column without an id column; with selection the checkbox is frozen too
   * (HAR-2624). With `mobile`, nothing is frozen from the narrowest step (under 600 px).
   */
  freezeFirstColumn?: boolean;
  /**
   * `table-layout: fixed` with a `<colgroup>` from the columns' widths and tiers, and the table's
   * min-width at the sum of the columns' floors (TENSOR HAR-997), so a truncating column clips
   * instead of growing. Default: on when a column has `className` or `minWidth`. Not in cards.
   */
  fixed?: boolean;
  /**
   * The responsive ladder, from the workspace's own width (HAR-2622): `priority` drops `low`
   * columns below 900 px and `mid` ones below 600 px; `cards` turns the rows into cards below
   * 768 px (each value labelled by its column) and drops low-priority columns up to 900 px.
   */
  mobile?: 'priority' | 'cards';
  /**
   * Toolbar: the search field. Ctrl/⌘ + / focuses it from inside the workspace, or from the page
   * when nothing has focus and this is the page's first workspace. `onSubmit` (Enter), `onClear`
   * (the × or Escape) and `maxLength` go to the `SearchBar`.
   */
  search?: { value: string; onChange: (value: string) => void; label?: string; placeholder?: string; onSubmit?: (value: string) => void; onClear?: () => void; maxLength?: number };
  /**
   * Toolbar: filter chips and "+ Filter" over `FilterEditor`. A chip whose value holds ids
   * restored from a URL or saved view asks `field.resolveLabels` for their names.
   */
  filters?: {
    fields: readonly FilterField[];
    values: Readonly<Record<string, FilterValue | undefined>>;
    onChange: (fieldId: string, value: FilterValue | undefined) => void;
    /** Rows matching each filter, shown on its chip. */
    counts?: Readonly<Record<string, number>>;
    summary?: SummarizeFilterOptions;
    /**
     * Clear every filter in one change (HAR-2622), instead of one `onChange` per field: a product
     * whose state is the URL would otherwise navigate once per field from the same stale state.
     * `search: true` from "Nothing matches" while searching: clear the search too (the kit then
     * does not call `search.onChange('')`).
     */
    onClearAll?: (scope: { search: boolean }) => void;
  };
  /**
   * Toolbar: the saved-view trigger, named by the current view, opening a `SavedViewMenu`.
   * `note` sits above the list ("Saved views could not be loaded").
   */
  savedViews?: { current: ReactNode; menu: SavedViewMenuProps; note?: ReactNode };
  /** Toolbar: the View button, opening a `ViewMenu` (columns, density). */
  viewMenu?: ViewMenuProps;
  /** The view differs from its saved version: Save changes and Save as show. */
  viewChanged?: boolean;
  onSaveView?: () => void;
  onSaveViewAs?: () => void;
  /** When Save as shows: `changed` (default) with `viewChanged`; `always`, to keep any view under a name (HAR-2622). */
  saveViewAs?: 'changed' | 'always';
  /** Toolbar: a maximize toggle; Escape restores, unless an open popover or menu takes it first. */
  maximized?: boolean;
  onMaximizedChange?: (maximized: boolean) => void;
  /** Toolbar: the product's own actions at the end ("New incident"). */
  toolbarEnd?: ReactNode;
  /** Between the toolbar (and bulk bar) and the rows: notices, a "3 new — show" pill, a truncation warning. */
  beforeBody?: ReactNode;
  pagination?: DataWorkspacePagination;
  /** `loading`: the first load (skeleton rows). `error`: with `onRetry`. */
  status?: 'ready' | 'loading' | 'error';
  /** A refetch (filter, sort, page, saved view): the rows stay under `TableWrap refreshing`. */
  refreshing?: boolean;
  onRetry?: () => void;
  /** Skeleton rows on a first load. Default 6. */
  loadingRows?: number;
  /** The empty body in place of the default one (HAR-2624), e.g. an `EmptyState` with the first action. */
  empty?: ReactNode;
  /** The default empty body's action ("Add the first book"). */
  emptyAction?: ReactNode;
  /** The filtered-empty body in place of the default one. */
  filteredEmpty?: ReactNode;
  /** A further action in the default filtered-empty body, after its Clear filters. */
  filteredEmptyAction?: ReactNode;
  /** The error body in place of the default one (a problem's title, a diagnostic line, Retry). */
  error?: ReactNode;
  /**
   * A product state in place of the rows, whatever `status` says (a page past the end: "Go to the
   * first page"). The toolbar stays; the footer goes. A refetch shows it busy.
   */
  stateOverride?: ReactNode;
  /** Rows in groups under collapsible header rows, in place of `rows` (HAR-2625). Not windowed. */
  groups?: readonly DataWorkspaceGroup<T>[];
  /** The collapsed group ids. Without it the workspace keeps them itself. */
  collapsedGroups?: ReadonlySet<string>;
  /** A group was collapsed or opened: the new set of collapsed ids. */
  onCollapsedGroupsChange?: (collapsed: Set<string>) => void;
  /**
   * Window a long unpaged list (HAR-2626): only the rows in view are mounted, in a body that
   * scrolls under its sticky header. Off with `pagination`, `groups` and the cards ladder.
   */
  virtualize?: boolean | DataWorkspaceVirtualize;
  /**
   * The keyboard row model (HAR-2626): one row in the tab order, ↑ / ↓ / Home / End move between
   * rows, Enter opens the row (`onRowActivate`, else its id: the peek or the link), Space does not
   * scroll the page. Default: on with `onRowActivate`.
   */
  rowNavigation?: boolean;
  /** A row's primary action: Enter on the row, and a click on the row (not on a control in it or its cell). Turns on `rowNavigation`. */
  onRowActivate?: (row: T) => void;
  /** `false`: only Enter activates a row, not a pointer click. Default `true`. */
  activateOnClick?: boolean;
  /** The row with the tab stop, to drive it from the product's own shortcuts (j / k). Changing it focuses that row. */
  activeRowId?: string | null;
  /** The tab stop moved to another row (a key, a click, focus entering a row). */
  onActiveRowChange?: (rowId: string) => void;
  labels?: Partial<DataWorkspaceLabels>;
}

/** A layout effect in the browser, an effect on the server (no warning there). */
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const ArrowUpRight = () => (
  <svg className="uix-id-cell__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9" /></svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" /></svg>
);
const MaximizeIcon = ({ restore }: { restore: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={restore ? 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7' : 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'} />
  </svg>
);
const ChevronIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M6 4l4 4-4 4" /></svg>
);

/** The ladder's steps, in px of the workspace's width (MOTUS `record-cards` / `priority-table`). */
const LADDER_CARDS = 768;
const LADDER_LOW = 900;
const LADDER_MID = 600;
type Ladder = 'cards' | 'priority' | 'priority-mid' | null;
const ladderFor = (mobile: DataWorkspaceProps<unknown>['mobile'], width: number): Ladder => {
  if (!mobile || !(width > 0)) return null;
  if (mobile === 'cards' && width < LADDER_CARDS) return 'cards';
  if (width < LADDER_MID) return 'priority-mid';
  if (width < LADDER_LOW) return 'priority';
  return null;
};
const hiddenBy = (ladder: Ladder, priority: DataWorkspaceColumn<unknown>['priority']) =>
  (ladder === 'priority' && priority === 'low') || (ladder === 'priority-mid' && (priority === 'low' || priority === 'mid'));

/** The row heights of the three densities (`--uix-row-h*`), for the first windowed paint. */
const ROW_HEIGHT: Record<TableDensity, number> = { compact: 44, standard: 56, comfortable: 68 };
/** What a click on a row leaves alone: it belongs to the control. */
const CONTROLS = 'a, button, input, select, textarea, label, summary, dialog, [role="button"], [role="menuitem"], [contenteditable="true"], [popover], td.uix-table__selcell, td.uix-table__actions';
const RESERVED_COLS = new Set(['select', 'id', 'actions', 'expand']);
const textOf = (node: ReactNode) => (typeof node === 'string' ? node : undefined);
const columnLabel = <T,>(column: DataWorkspaceColumn<T>) => column.label ?? textOf(column.header);
/** The ladder's cell attributes: only with `mobile`, so a workspace without it renders as before. */
const ladderAttrs = <T,>(on: boolean, column: DataWorkspaceColumn<T>, body: boolean) => (on ? {
  'data-col': RESERVED_COLS.has(column.id) ? undefined : column.id,
  'data-priority': column.priority && column.priority !== 'high' ? column.priority : undefined,
  'data-label': body ? columnLabel(column) : undefined,
} : {});

/**
 * The generic presentation half of a product's data table (HAR-1388; TENSOR `data-table.tsx`,
 * MOTUS `UixDataWorkspace.tsx`; UIx ADR-0005). Composes the kit's pieces in one order: saved
 * view · Save changes / Save as (when the view changed) · filter chips and "+ Filter" ·
 * search (Ctrl/⌘ + /) · View · maximize · the product's actions; a `Table` with a record-id cell (id → peek, ↗ → record),
 * selection with Shift-click ranges, a frozen row-actions column and a `BulkBar`; an "x–y of N"
 * footer with rows per page and `Pagination` (offset or cursor); first-load, empty,
 * filtered-empty and error states, and a refetch that keeps the rows. Prop-driven: the product
 * keeps its surface registry, URL state, data fetching and permissions.
 *
 * 2.50 (HAR-2622..2626, ADR-0005 addendum): a responsive ladder (`mobile`, `column.priority`), a
 * rich id cell, multi-column sort, the product's state bodies and `beforeBody`, row groups,
 * windowing (`virtualize`) and a keyboard row model (`onRowActivate`).
 */
export function DataWorkspace<T, S extends DataWorkspaceSortState = DataWorkspaceSort | null>({
  label, rows, getRowId, rowLabel, columns, idColumn, sort, onSortChange, selection, onSelectionChange, maxSelection, bulkActions, rowActions,
  getRowProps, density, zebra, freezeFirstColumn = false, fixed, mobile, search, filters, savedViews, viewMenu, viewChanged = false,
  onSaveView, onSaveViewAs, saveViewAs = 'changed', maximized = false, onMaximizedChange, toolbarEnd, beforeBody, pagination,
  status = 'ready', refreshing = false, onRetry, loadingRows = 6, empty, emptyAction, filteredEmpty, filteredEmptyAction,
  error, stateOverride, groups, collapsedGroups, onCollapsedGroupsChange, virtualize, rowNavigation, onRowActivate,
  activateOnClick = true, activeRowId, onActiveRowChange, multiSort = false, labels: labelOverrides, className, ...props
}: DataWorkspaceProps<T, S>) {
  const labels = { ...DEFAULT_DATA_WORKSPACE_LABELS, ...useUixLabels().dataWorkspace, ...labelOverrides };
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  /** The row a Shift-click range starts from: the last row clicked without Shift. */
  const anchor = useRef<string | null>(null);

  // Ctrl/⌘ + / focuses the search: from inside this workspace, or from a page with nothing
  // focused when this is its first workspace. Another workspace or app field keeps the key.
  useEffect(() => {
    if (!search) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || !(event.ctrlKey || event.metaKey) || event.altKey || event.defaultPrevented) return;
      const root = rootRef.current;
      const target = event.target as Node | null;
      const inside = root != null && target != null && root.contains(target);
      const unfocused = target === document.body || target === document.documentElement || target === document;
      if (inside || (unfocused && root != null && document.querySelector('.uix-data-workspace') === root)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [search != null]);

  // Escape restores a maximized workspace, unless something inside used it (a popover, a field).
  useEffect(() => {
    if (!maximized || !onMaximizedChange) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // A popover (View, saved views, a filter editor) or a menu closes on this Escape by itself
      // (light dismiss, after the event): the same key must not also restore the workspace.
      const root = rootRef.current;
      const target = event.target as Element | null;
      const owner = target?.closest?.('[popover], [role="dialog"], [role="menu"], [role="listbox"], [aria-expanded="true"]');
      if (owner && root?.contains(owner) && (owner.getAttribute('aria-expanded') !== 'true' || stillExpanded(owner))) return;
      if (root && openInside(root)) return;
      onMaximizedChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized, onMaximizedChange]);

  // The responsive ladder follows the workspace's own width, not the window's: a list in a side
  // panel or beside a sidebar steps down as early as one on a phone. Measured before the first
  // paint, then on every resize; only a change of step re-renders. No layout (jsdom, a hidden
  // tab) means no step.
  const [ladder, setLadder] = useState<Ladder>(null);
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!mobile || !root) { setLadder(null); return; }
    // the content box: a maximized workspace has padding the table does not get
    const read = () => {
      const style = getComputedStyle(root);
      const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      setLadder(ladderFor(mobile, root.getBoundingClientRect().width - padding));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(root);
    return () => observer.disconnect();
  }, [mobile]);
  const cards = ladder === 'cards';

  // An empty result belongs to the query that produced it: "Nothing matches" or "Nothing here yet"
  // is decided when the rows arrive, not from the filters on screen. A cleared filter therefore
  // keeps "Nothing matches" until its own rows arrive, also when the product turns `refreshing` on
  // a render later; while a refetch runs with nothing back yet, the last settled body stays, in a
  // BusyRegion (PR #168 review). With groups, the groups are the answer.
  const filtered = (filters ? filters.fields.some((field) => !isFilterEmpty(filters.values[field.id])) : false) || (search?.value.trim() ?? '') !== '';
  const source: readonly unknown[] = groups ?? rows;
  const flat = useMemo(() => (groups ? groups.flatMap((group) => group.rows) : rows), [groups, rows]);
  const current = { source, flat, groups, filtered };
  const [settled, setSettled] = useState(current);
  if (!refreshing && source !== settled.source) setSettled(current);
  const view = flat.length > 0 ? current : refreshing || source === settled.source ? settled : current;
  const shownRows = view.flat;
  const shownGroups = view.groups;

  // Groups: the collapsed ones, kept by the product or here.
  const [ownCollapsed, setOwnCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const collapsed = collapsedGroups ?? ownCollapsed;
  const toggleGroupOpen = (groupId: string) => {
    const next = new Set(collapsed);
    if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
    if (!collapsedGroups) setOwnCollapsed(next);
    onCollapsedGroupsChange?.(next);
  };

  const ids = useMemo(() => shownRows.map(getRowId), [shownRows, getRowId]);
  /** The rows in visual order: a collapsed group's rows are not on screen, so a Shift range skips them. */
  const visibleIds = useMemo(() => {
    if (!shownGroups) return ids;
    const out: string[] = [];
    for (const group of shownGroups) if (!collapsed.has(group.id)) for (const row of group.rows) out.push(getRowId(row));
    return out;
  }, [shownGroups, collapsed, ids, getRowId]);
  const selected = selection ?? EMPTY_SET;
  const selectable = onSelectionChange != null;
  const cap = maxSelection ?? Infinity;
  const onPage = ids.filter((rowId) => selected.has(rowId)).length;
  /** Adds or removes these rows; adding stops at `maxSelection`. */
  const apply = (next: Set<string>, rowIds: readonly string[], on: boolean) => {
    for (const rowId of rowIds) {
      if (!on) next.delete(rowId);
      else if (next.has(rowId) || next.size < cap) next.add(rowId);
    }
    return next;
  };
  const toggleRow = (rowId: string, on: boolean, event: ReactMouseEvent | null) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    const from = anchor.current ? visibleIds.indexOf(anchor.current) : -1;
    const to = visibleIds.indexOf(rowId);
    if (event?.shiftKey && from >= 0 && to >= 0) {
      // Shift-click: every row between the anchor and this one, in visual order, takes this row's new state.
      apply(next, visibleIds.slice(Math.min(from, to), Math.max(from, to) + 1), on);
    } else {
      apply(next, [rowId], on);
      anchor.current = rowId;
    }
    onSelectionChange(next);
  };
  const toggleMany = (rowIds: readonly string[], on: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(apply(new Set(selected), rowIds, on));
  };
  const atCap = selected.size >= cap;

  // Each row's actions, asked once per render; the column shows only when a row on the page has some.
  const actionsByRow = useMemo(() => (rowActions ? shownRows.map((row) => rowActions(row)) : []), [shownRows, rowActions]);
  const hasActions = actionsByRow.some((node) => node != null && node !== false);

  const activeFilters = filters ? filters.fields.filter((field) => !isFilterEmpty(filters.values[field.id])) : [];
  const searching = (search?.value.trim() ?? '') !== '';
  const clearAll = () => {
    if (filters?.onClearAll) { filters.onClearAll({ search: searching }); return; }
    for (const field of activeFilters) filters?.onChange(field.id, undefined);
    if (searching) search?.onChange('');
  };

  // Sorting: one key, or (when `sort` is a list) an ordered list of keys.
  const multi = multiSort || Array.isArray(sort);
  const keys: readonly DataWorkspaceSort[] = Array.isArray(sort) ? sort as readonly DataWorkspaceSort[] : sort ? [sort as DataWorkspaceSort] : [];
  const sortFor = (column: DataWorkspaceColumn<T>) => keys.find((key) => key.columnId === column.id)?.direction ?? 'none';
  const cycleSort = (column: DataWorkspaceColumn<T>, additive: boolean) => {
    if (!onSortChange) return;
    const current = sortFor(column);
    const turned = current === 'none' ? 'ascending' : current === 'ascending' ? 'descending' : null;
    if (!multi) {
      onSortChange((turned ? { columnId: column.id, direction: turned } : null) as DataWorkspaceSortValue<S>);
      return;
    }
    // The kit's one multi-sort rule (table-engine toggleSort): Shift adds a key last, turns an
    // existing one in place (its priority stays) and removes it after descending.
    const next = toggleSort(keys.map((key) => ({ field: key.columnId, dir: key.direction })), column.id, additive)
      .map((key): DataWorkspaceSort => ({ columnId: key.field, direction: key.dir === 'descending' ? 'descending' : 'ascending' }));
    onSortChange(next as DataWorkspaceSortValue<S>);
  };

  const showSaveAs = onSaveViewAs != null && (viewChanged || saveViewAs === 'always');
  // No band when nothing would be in it (HAR-2632): a plain table on a detail or settings page
  // gets no empty toolbar landmark and no gap above it.
  const hasToolbar = savedViews != null || (viewChanged && onSaveView != null) || showSaveAs || filters != null || search != null
    || viewMenu != null || onMaximizedChange != null || (toolbarEnd != null && toolbarEnd !== false);
  const toolbar = hasToolbar && (
    <div className="uix-toolbar uix-data-workspace__toolbar" role="toolbar" aria-label={label}>
      {savedViews && (
        <PopoverButton id={`${id}-views`} label={savedViews.current} title={typeof savedViews.current === 'string' ? fillLabel(labels.savedView, { name: savedViews.current }) : undefined} variant="secondary">
          {(close) => (
            <>
              {savedViews.note != null && <div className="uix-data-workspace__views-note">{savedViews.note}</div>}
              <SavedViewMenu {...savedViews.menu} onSelect={(viewId) => { savedViews.menu.onSelect(viewId); close(); }} />
            </>
          )}
        </PopoverButton>
      )}
      {/* Save sits with the view it saves, left of the spacer: appearing as the search changes, it
          must not move the search field under the person's fingers. */}
      {/* Secondary: saving a view is not the page's primary action (that is the product's, at the end). */}
      {viewChanged && onSaveView && <Button size="sm" variant="secondary" onClick={onSaveView}>{labels.saveView}</Button>}
      {showSaveAs && <Button size="sm" variant="ghost" onClick={onSaveViewAs}>{labels.saveViewAs}</Button>}
      {filters && <FilterChips filters={filters} labels={labels} baseId={id} />}
      <span className="uix-toolbar__spacer" />
      {search && (
        <SearchBar
          className="uix-data-workspace__search" landmark={false} label={search.label ?? labels.search} placeholder={search.placeholder ?? labels.searchPlaceholder}
          value={search.value} onValueChange={search.onChange} inputRef={searchRef}
          onSubmit={search.onSubmit} onClear={search.onClear} maxLength={search.maxLength}
        />
      )}
      {viewMenu && (
        <PopoverButton id={`${id}-view`} label={labels.view} variant="ghost">
          {() => <ViewMenu {...viewMenu} />}
        </PopoverButton>
      )}
      {onMaximizedChange && (
        <Button size="sm" variant="ghost" icon aria-label={maximized ? labels.restore : labels.maximize} aria-pressed={maximized} onClick={() => onMaximizedChange(!maximized)}>
          <MaximizeIcon restore={maximized} />
        </Button>
      )}
      {toolbarEnd}
    </div>
  );

  const busy = (node: ReactNode) => <BusyRegion busy={refreshing} className="uix-data-workspace__state">{node}</BusyRegion>;
  let body: ReactNode;
  if (stateOverride != null) body = busy(stateOverride);
  else if (status === 'loading') body = <LoadingState rows={loadingRows} label={labels.loading} className="uix-data-workspace__loading" />;
  else if (status === 'error') body = error != null ? busy(error) : <ErrorState title={labels.error} action={onRetry && <Button size="sm" onClick={onRetry}>{labels.retry}</Button>} />;
  else if (shownRows.length === 0) {
    // The empty states sit in a BusyRegion too, so a refetch from one of them is busy at once.
    const clear = <Button size="sm" onClick={clearAll}>{labels.clearFilters}</Button>;
    body = busy(view.filtered
      ? filteredEmpty ?? (
        <FilteredEmptyState
          title={labels.filteredEmpty}
          action={filteredEmptyAction != null ? <div className="uix-data-workspace__state-actions">{clear}{filteredEmptyAction}</div> : clear}
        >{labels.filteredEmptyDetail}</FilteredEmptyState>
      )
      : empty ?? <EmptyState title={labels.empty} action={emptyAction}>{labels.emptyDetail}</EmptyState>);
  } else {
    body = (
      <WorkspaceGrid<T>
        label={label} rows={shownRows} ids={ids} groups={shownGroups} collapsed={collapsed} onToggleGroup={toggleGroupOpen}
        getRowId={getRowId} rowLabel={rowLabel} columns={columns} idColumn={idColumn} getRowProps={getRowProps} density={density} zebra={zebra}
        freezeFirstColumn={freezeFirstColumn} fixed={fixed ?? columns.some((column) => column.className != null || column.minWidth != null)}
        ladderOn={mobile != null} ladder={ladder} refreshing={refreshing}
        selectable={selectable} selected={selected} onPage={onPage} atCap={atCap} toggleRow={toggleRow} toggleMany={toggleMany}
        actionsByRow={actionsByRow} hasActions={hasActions} keys={keys} sortable={onSortChange != null} multi={multi} sortFor={sortFor} cycleSort={cycleSort}
        virtualize={pagination || shownGroups ? undefined : virtualize}
        rowNavigation={rowNavigation ?? onRowActivate != null} onRowActivate={onRowActivate} activateOnClick={activateOnClick}
        activeRowId={activeRowId} onActiveRowChange={onActiveRowChange} labels={labels}
      />
    );
  }

  const selectedIds = [...selected];
  return (
    <section
      ref={rootRef}
      className={cx('uix-data-workspace', maximized && 'uix-data-workspace--maximized', className)}
      aria-label={label}
      {...props}
    >
      {toolbar}
      {bulkActions && selectedIds.length > 0 && (
        <BulkBar count={selectedIds.length} label={labels.bulkActions} selectedLabel={(n) => fillLabel(labels.selected, { count: n })}>
          {bulkActions(selectedIds)}
        </BulkBar>
      )}
      {beforeBody != null && <div className="uix-data-workspace__before">{beforeBody}</div>}
      {body}
      {pagination && status === 'ready' && stateOverride == null && shownRows.length > 0 && <Footer pagination={pagination} labels={labels} rowCount={shownRows.length} />}
    </section>
  );
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

interface WorkspaceGridProps<T> {
  label: string;
  rows: readonly T[];
  ids: readonly string[];
  groups?: readonly DataWorkspaceGroup<T>[];
  collapsed: ReadonlySet<string>;
  onToggleGroup: (groupId: string) => void;
  getRowId: (row: T) => string;
  rowLabel?: (row: T) => string;
  columns: readonly DataWorkspaceColumn<T>[];
  idColumn?: DataWorkspaceIdColumn<T>;
  getRowProps?: DataWorkspaceProps<T>['getRowProps'];
  density?: TableDensity;
  zebra?: boolean;
  freezeFirstColumn: boolean;
  fixed: boolean;
  ladderOn: boolean;
  ladder: Ladder;
  refreshing: boolean;
  selectable: boolean;
  selected: ReadonlySet<string>;
  onPage: number;
  atCap: boolean;
  toggleRow: (rowId: string, on: boolean, event: ReactMouseEvent | null) => void;
  toggleMany: (rowIds: readonly string[], on: boolean) => void;
  actionsByRow: readonly ReactNode[];
  hasActions: boolean;
  keys: readonly DataWorkspaceSort[];
  sortable: boolean;
  multi: boolean;
  sortFor: (column: DataWorkspaceColumn<T>) => DataWorkspaceSort['direction'] | 'none';
  cycleSort: (column: DataWorkspaceColumn<T>, additive: boolean) => void;
  virtualize?: boolean | DataWorkspaceVirtualize;
  rowNavigation: boolean;
  onRowActivate?: (row: T) => void;
  activateOnClick: boolean;
  activeRowId?: string | null;
  onActiveRowChange?: (rowId: string) => void;
  labels: DataWorkspaceLabels;
}

/** The handlers every row shares: one object for the table's life, so a memoised row is not re-rendered by them. */
interface RowHandlers {
  toggle: (rowId: string, on: boolean, event: ReactMouseEvent) => void;
  key: (rowId: string, event: ReactKeyboardEvent<HTMLTableRowElement>) => void;
  click: (rowId: string, event: ReactMouseEvent<HTMLTableRowElement>) => void;
  focus: (rowId: string) => void;
  blur: (rowId: string, event: ReactFocusEvent<HTMLTableRowElement>) => void;
}

/**
 * The table: header, rows (flat, grouped or windowed) and the keyboard row model. A component of
 * its own so the windowing hook mounts with the scrolling wrap it observes; without `virtualize`
 * the hook does not run at all (no scroll listener, no observer). The cards step does not change
 * which component renders, so crossing it keeps the rows, their focus and the scroll.
 */
function WorkspaceGrid<T>(props: WorkspaceGridProps<T>) {
  return props.virtualize ? <WindowedGrid<T> {...props} /> : <WorkspaceTable<T> {...props} windowing={null} virtual={null} />;
}

function WindowedGrid<T>(props: WorkspaceGridProps<T>) {
  const windowing: DataWorkspaceVirtualize = props.virtualize === true || !props.virtualize ? {} : props.virtualize;
  const threshold = windowing.threshold ?? 100;
  const virtual = useVirtualRows(props.rows, {
    rowHeight: windowing.estimatedRowHeight ?? ROW_HEIGHT[props.density ?? 'standard'],
    overscan: windowing.overscan ?? 8,
    // windowed at `threshold` rows or more (the hook windows above its own threshold)
    threshold: Math.max(0, threshold - 1),
    estimatedViewportHeight: windowing.maxHeight ?? 640,
    measureRows: 'tbody > tr[data-uix-row-id]',
    // cards are not windowed: a card's height is its content's
    enabled: props.rows.length >= threshold && props.ladder !== 'cards',
  });
  return <WorkspaceTable<T> {...props} windowing={windowing} virtual={virtual} />;
}

/** A column's floor in a fixed layout: its `minWidth`, its fixed `width`, its width tier, the title floor, or a small tier. */
const columnFloor = (width?: string, minWidth?: string, className?: string) => {
  if (minWidth) return minWidth;
  if (width && !width.trim().endsWith('%')) return width;
  const classes = className?.split(/\s+/) ?? [];
  for (const cls of classes) {
    const tier = /^uix-col--w-(xs|sm|md|lg|xl)$/.exec(cls)?.[1];
    if (tier) return `var(--uix-col-w-${tier})`;
  }
  if (classes.includes('uix-col--flex') || classes.includes('uix-col--primary')) return 'var(--uix-col-title-min)';
  return 'var(--uix-col-w-sm)';
};
const isFlex = (className?: string) => /(^|\s)uix-col--(flex|primary)(\s|$)/.test(className ?? '');
/** The classes of a column that size a `<col>` (a tier, the flex column). */
const colClasses = (className?: string) => className?.split(/\s+/).filter((cls) => /^uix-col--(w-(xs|sm|md|lg|xl)|flex|primary)$/.test(cls)).join(' ') || undefined;

function WorkspaceTable<T>({
  label, rows, ids, groups, collapsed, onToggleGroup, getRowId, rowLabel, columns, idColumn, getRowProps, density, zebra, freezeFirstColumn,
  fixed, ladderOn, ladder, refreshing, selectable, selected, onPage, atCap, toggleRow, toggleMany, actionsByRow, hasActions, keys, sortable,
  multi, sortFor, cycleSort, rowNavigation, onRowActivate, activateOnClick, activeRowId, onActiveRowChange, labels, windowing, virtual,
}: WorkspaceGridProps<T> & { windowing: DataWorkspaceVirtualize | null; virtual: UseVirtualRowsResult<T> | null }) {
  const cards = ladder === 'cards';
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();

  // ── windowing (HAR-2626) ────────────────────────────────────────────────────────────────
  const maxHeight = windowing?.maxHeight ?? 640;
  const long = windowing != null && !cards && rows.length >= (windowing.threshold ?? 100);
  const containerRef = virtual?.containerRef;
  const setWrap = useCallback((node: HTMLDivElement | null) => {
    wrapRef.current = node;
    if (containerRef) (containerRef as { current: HTMLDivElement | null }).current = node;
  }, [containerRef]);
  const windowed = virtual?.virtualized ?? false;
  const start = virtual && windowed ? virtual.startIndex : 0;
  const mountedRows = virtual && windowed ? virtual.rows : rows;

  // ── the keyboard row model (HAR-2626) ───────────────────────────────────────────────────
  // `rowNavigation` turns on the roving tab stop (on by default with `onRowActivate`); a click on
  // the row activates it only with `onRowActivate`, and `activateOnClick={false}` keeps that to Enter.
  const nav = rowNavigation;
  const clickActivates = onRowActivate != null && activateOnClick;
  const [ownActive, setOwnActive] = useState<string | null>(null);
  const active = activeRowId !== undefined ? activeRowId : ownActive;
  /** The rows ↑ / ↓ walk: every row on screen in order (a collapsed group's rows are not). */
  const navIds = useMemo(() => {
    if (!groups) return ids;
    const out: string[] = [];
    for (const group of groups) if (!collapsed.has(group.id)) for (const row of group.rows) out.push(getRowId(row));
    return out;
  }, [groups, collapsed, ids, getRowId]);
  const mountedIds = useMemo(() => new Set(windowed ? ids.slice(start, start + mountedRows.length) : navIds), [windowed, ids, start, mountedRows.length, navIds]);
  /** The tab stop must be a row in the DOM: the active one, else the first mounted one. */
  const tabStop = active != null && mountedIds.has(active) ? active : navIds.find((rowId) => mountedIds.has(rowId)) ?? null;
  /** A row outside the window, scrolled to and focused once the window has rendered it. */
  const pendingFocus = useRef<string | null>(null);
  /** The row that had focus, while focus is in a row: a refetch that drops it hands focus to the tab stop. */
  const focusedRow = useRef<string | null>(null);

  const rowElement = (rowId: string) => {
    for (const el of Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('tbody > tr[data-uix-row-id]') ?? [])) {
      if (el.getAttribute('data-uix-row-id') === rowId) return el;
    }
    return null;
  };
  /** Scroll the row into view by the least amount, clear of the sticky header in a windowed body. */
  const reveal = (el: HTMLElement) => {
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const wrap = wrapRef.current;
    const head = wrap?.querySelector('thead');
    if (wrap && head && windowed) {
      const under = head.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
      if (under > 0) wrap.scrollTop -= under;
    }
  };
  const setActive = (rowId: string) => {
    if (rowId === active) return;
    if (activeRowId === undefined) setOwnActive(rowId);
    onActiveRowChange?.(rowId);
  };
  /** Moves the tab stop and focus to a row on screen; a row that is not (gone, or in a collapsed group) is left alone. */
  const focusRow = (rowId: string, { take = true } = {}) => {
    if (!navIds.includes(rowId)) return;
    setActive(rowId);
    if (!take) return;
    const el = rowElement(rowId);
    if (el) { el.focus({ preventScroll: true }); reveal(el); return; }
    // Windowed and outside the window: scroll it in, focus it after the render.
    const index = ids.indexOf(rowId);
    if (index >= 0 && wrapRef.current && virtual && windowed) {
      pendingFocus.current = rowId;
      wrapRef.current.scrollTop = index * virtual.rowHeight;
    }
  };
  useIsomorphicLayoutEffect(() => {
    if (!nav) return;
    const pending = pendingFocus.current;
    if (pending != null) {
      if (!ids.includes(pending)) { pendingFocus.current = null; return; }
      const el = rowElement(pending);
      if (el) { pendingFocus.current = null; el.focus({ preventScroll: true }); reveal(el); }
      return;
    }
    const had = focusedRow.current;
    if (had == null) return;
    const wrap = wrapRef.current;
    const focused = typeof document !== 'undefined' ? document.activeElement : null;
    const el = rowElement(had);
    // Parked on the wrap while the window had scrolled the row away: it is back, so is focus.
    if (el && wrap && focused === wrap) { el.focus({ preventScroll: true }); return; }
    if (el || !(focused == null || focused === document.body)) return;
    // Focus was on a row that is no longer in the DOM; the page would drop it on <body>.
    if (windowed && ids.includes(had) && wrap) {
      // Only scrolled out of the window: park focus on the scrolling body, the row stays active.
      wrap.focus({ preventScroll: true });
    } else if (tabStop != null) {
      // A new page or a refetch without it: the tab stop (the first row) takes focus.
      rowElement(tabStop)?.focus({ preventScroll: true });
    }
  });
  // A product that moves the active row from its own shortcut (j / k) moves focus with it, when
  // focus is in the table or nowhere; a person typing in the search keeps their field.
  const lastActiveProp = useRef(activeRowId);
  useEffect(() => {
    if (!nav || activeRowId === lastActiveProp.current) return;
    lastActiveProp.current = activeRowId;
    if (activeRowId == null) return;
    const focused = document.activeElement;
    const el = rowElement(activeRowId);
    if (el && el.contains(focused)) return;
    const mayTake = focused == null || focused === document.body || (wrapRef.current?.contains(focused) ?? false);
    focusRow(activeRowId, { take: mayTake });
  });

  const latest = {
    toggle: (rowId: string, on: boolean, event: ReactMouseEvent) => toggleRow(rowId, on, event),
    key: (rowId: string, event: ReactKeyboardEvent<HTMLTableRowElement>) => {
      // A key pressed on a control inside the row is the control's.
      if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
      const at = navIds.indexOf(rowId);
      const to = event.key === 'ArrowDown' ? at + 1 : event.key === 'ArrowUp' ? at - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? navIds.length - 1 : null;
      if (to != null) {
        event.preventDefault();
        const target = navIds[Math.max(0, Math.min(navIds.length - 1, to))];
        if (target != null) focusRow(target);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const row = rows[ids.indexOf(rowId)];
        if (onRowActivate) { if (row !== undefined) onRowActivate(row); return; }
        // Without onRowActivate, Enter opens what the row already offers: its id (peek or link).
        const el = event.currentTarget;
        (el.querySelector<HTMLElement>('.uix-id-cell__btn') ?? el.querySelector<HTMLElement>('a[href]'))?.click();
      } else if (event.key === ' ') {
        // Space on a row is not a page scroll.
        event.preventDefault();
      }
    },
    click: (rowId: string, event: ReactMouseEvent<HTMLTableRowElement>) => {
      if (!clickActivates) return;
      // A click that bubbled through React from a portal (a menu, a dialog) is not on the row.
      if (!event.currentTarget.contains(event.target as Node)) return;
      // A click on a control in the row (the checkbox and its cell, the id, an action and its
      // cell, a link) is the control's; a drag that selected text is not a click on the row.
      const control = (event.target as Element).closest?.(CONTROLS);
      if (control && control !== event.currentTarget && event.currentTarget.contains(control)) return;
      if (typeof window !== 'undefined' && (window.getSelection?.()?.toString() ?? '') !== '') return;
      const row = rows[ids.indexOf(rowId)];
      if (row !== undefined) onRowActivate?.(row);
    },
    focus: (rowId: string) => { focusedRow.current = rowId; setActive(rowId); },
    blur: (rowId: string, event: ReactFocusEvent<HTMLTableRowElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && wrapRef.current?.contains(next)) return;
      if (next) { focusedRow.current = null; return; }
      // Focus went nowhere: the row was removed (keep it, to hand focus on) or the person left the
      // page or clicked its background (forget it). Decide once the commit is done.
      const el = event.currentTarget;
      setTimeout(() => { if (el.isConnected && focusedRow.current === rowId) focusedRow.current = null; }, 0);
    },
  };
  const latestRef = useRef(latest);
  latestRef.current = latest;
  const handlers = useMemo<RowHandlers>(() => ({
    toggle: (...args) => latestRef.current.toggle(...args),
    key: (...args) => latestRef.current.key(...args),
    click: (...args) => latestRef.current.click(...args),
    focus: (...args) => latestRef.current.focus(...args),
    blur: (...args) => latestRef.current.blur(...args),
  }), []);

  // ── groups: collapsing keeps the header where it was on screen (HAR-2625) ─────────────────
  const groupAnchor = useRef<{ id: string; top: number } | null>(null);
  const toggleGroup = (groupId: string, header: HTMLElement | null) => {
    groupAnchor.current = header ? { id: groupId, top: header.getBoundingClientRect().top } : null;
    onToggleGroup(groupId);
  };
  useIsomorphicLayoutEffect(() => {
    const was = groupAnchor.current;
    if (!was) return;
    groupAnchor.current = null;
    const header = wrapRef.current?.querySelector<HTMLElement>(`tr[data-group-id="${cssEscape(was.id)}"]`);
    if (!header) return;
    const moved = header.getBoundingClientRect().top - was.top;
    if (Math.abs(moved) < 1) return;
    const wrap = wrapRef.current;
    if (wrap && wrap.scrollHeight > wrap.clientHeight + 1 && getComputedStyle(wrap).overflowY !== 'visible') wrap.scrollTop += moved;
    else window.scrollBy?.(0, moved);
  });

  // ── sorting through the headers ─────────────────────────────────────────────────────────
  /** Whether the click on a header button adds a key: Shift on the pointer, or on the Enter / Space that made the click. */
  const shiftKey = useRef(false);
  const additive = useRef(false);

  // ── layout ──────────────────────────────────────────────────────────────────────────────
  // Frozen columns stop at the narrowest step (priority-mid): on a phone-wide table the checkbox
  // and the id would take most of the wrap.
  const frozen = !cards && ladder !== 'priority-mid' && (idColumn != null || freezeFirstColumn);
  const shown = columns.filter((column) => !hiddenBy(ladder, column.priority));
  const colCount = (selectable ? 1 : 0) + (idColumn ? 1 : 0) + shown.length + (hasActions ? 1 : 0);
  const selectRowLabel = labels.selectRow;
  const openLabel = labels.open;

  // Fixed layout (HAR-2624, TENSOR HAR-997): the <colgroup> sizes the columns, so a truncating
  // column clips instead of growing, and the table never gets narrower than its columns' floors
  // (fixed layout ignores a cell's min-width): narrower than that, the wrap scrolls.
  const fixedOn = fixed && !cards;
  const [actionsWidth, setActionsWidth] = useState<number | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!fixedOn || !hasActions) return;
    // The actions column is as wide as its widest row's actions (words, not only a ⋯).
    let widest = 0;
    for (const td of Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('tbody td.uix-table__actions') ?? [])) {
      const range = document.createRange();
      range.selectNodeContents(td);
      const content = range.getBoundingClientRect().width;
      const style = getComputedStyle(td);
      widest = Math.max(widest, content + parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0'));
    }
    const next = widest > 0 ? Math.ceil(widest) : null;
    if (next !== actionsWidth) setActionsWidth(next);
  });
  const actionsCol = actionsWidth != null ? `${actionsWidth}px` : '5.25rem';
  const floors = fixedOn ? [
    ...(selectable ? ['var(--uix-selcol-w)'] : []),
    ...(idColumn ? [columnFloor(idColumn.width, idColumn.minWidth, undefined)] : []),
    ...shown.map((column) => columnFloor(column.width, column.minWidth, column.className)),
    ...(hasActions ? [actionsCol] : []),
  ] : [];
  const tableStyle = fixedOn && floors.length ? { minWidth: floors.length === 1 ? floors[0] : `calc(${floors.join(' + ')})` } : undefined;

  /** A header's sort props: the same for a data column and a sortable id column. */
  const sortProps = (column: DataWorkspaceColumn<T>, columnSortable: boolean) => {
    const order = keys.findIndex((key) => key.columnId === column.id);
    const canSort = columnSortable && sortable;
    const ordinal = keys.length > 1 && order >= 0 ? order + 1 : undefined;
    return {
      sortable: canSort, sortDirection: sortFor(column),
      sortOrder: ordinal, sortOrderLabel: ordinal != null ? fillLabel(labels.sortPriority, { n: ordinal }) : undefined,
      onSort: () => { cycleSort(column, multi && additive.current); additive.current = false; },
      ...(canSort && multi ? {
        onKeyDownCapture: (event: ReactKeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') shiftKey.current = event.shiftKey; },
        // A click made by Enter or Space has no pointer (detail 0) and may not carry Shift itself.
        onClickCapture: (event: ReactMouseEvent) => { additive.current = event.shiftKey || (event.detail === 0 && shiftKey.current); shiftKey.current = false; },
      } : {}),
    };
  };
  /** The id column as a sort key (HAR-2631): only its `id` is read. */
  const idSortColumn: DataWorkspaceColumn<T> | null = idColumn ? { id: idColumn.id ?? 'id', header: idColumn.header, cell: () => null } : null;

  const renderRow = (row: T, index: number) => {
    const rowId = ids[index];
    const isSelected = selected.has(rowId);
    return (
      <WorkspaceRow<T>
        key={rowId} row={row} rowId={rowId} rowLabel={rowLabel} columns={columns} idColumn={idColumn} getRowProps={getRowProps}
        selectable={selectable} selected={isSelected} selectDisabled={!isSelected && atCap}
        hasActions={hasActions} actions={actionsByRow[index]} ladderOn={ladderOn}
        selectRowLabel={selectRowLabel} openLabel={openLabel}
        marked={nav || windowing != null} ariaRowIndex={windowed ? index + 2 : undefined}
        nav={nav} tabStop={tabStop === rowId} handlers={handlers}
      />
    );
  };

  let tbody: ReactNode;
  if (groups) {
    let offset = 0;
    tbody = groups.map((group, groupIndex) => {
      const first = offset;
      offset += group.rows.length;
      const open = !collapsed.has(group.id);
      const name = group.name ?? textOf(group.label) ?? group.id;
      const groupIds = ids.slice(first, first + group.rows.length);
      const on = groupIds.filter((rowId) => selected.has(rowId)).length;
      const count = group.count ?? group.rows.length;
      const nameId = `${baseId}-g${groupIndex}-name`;
      const countId = `${baseId}-g${groupIndex}-count`;
      // The header's label spans up to the first column with an aggregate; each aggregate sits under its column.
      const firstAgg = shown.findIndex((column) => group.aggregates?.[column.id] != null);
      const lead = (idColumn ? 1 : 0) + (firstAgg < 0 ? shown.length + (hasActions ? 1 : 0) : firstAgg);
      const leadAgg = lead === 0 && firstAgg === 0 ? group.aggregates?.[shown[0].id] : null;
      return (
        <tbody key={group.id} className="uix-data-workspace__group" data-collapsed={open ? undefined : ''}>
          <tr className="uix-data-workspace__group-head" data-group-id={group.id}>
            {selectable && (
              <td className="uix-table__selcell" data-col={ladderOn ? 'select' : undefined}>
                <Checkbox
                  aria-label={fillLabel(labels.selectGroup, { name })} disabled={group.rows.length === 0 || (atCap && on === 0)}
                  checked={on > 0 && on === groupIds.length} indeterminate={on > 0 && on < groupIds.length}
                  onChange={() => toggleMany(groupIds, on < groupIds.length && !atCap)}
                />
              </td>
            )}
            {/* Named by the group's name and count only: the toggle's words change with its state. */}
            <th scope="rowgroup" colSpan={Math.max(1, lead)} className="uix-data-workspace__group-label" aria-labelledby={`${nameId} ${countId}`}>
              <span className="uix-data-workspace__group-title">
                <button
                  type="button" className="uix-data-workspace__group-toggle" aria-expanded={open}
                  aria-label={fillLabel(open ? labels.collapseGroup : labels.expandGroup, { name })}
                  onClick={(event) => toggleGroup(group.id, event.currentTarget.closest('tr'))}
                >
                  <ChevronIcon />
                </button>
                <span className="uix-data-workspace__group-name" id={nameId}>{group.label}</span>
                <span className="uix-data-workspace__group-count" id={countId}>{fillLabel(count === 1 ? labels.groupCountOne : labels.groupCount, { count })}</span>
                {leadAgg}
              </span>
            </th>
            {firstAgg >= 0 && shown.slice(lead === 0 ? 1 : firstAgg).map((column) => (
              <td key={column.id} className={cx('uix-data-workspace__group-agg', column.align === 'end' && 'uix-col--num', column.className)}>
                {group.aggregates?.[column.id]}
              </td>
            ))}
            {firstAgg >= 0 && hasActions && <td className="uix-table__actions" />}
          </tr>
          {open && group.rows.map((row, at) => renderRow(row, first + at))}
        </tbody>
      );
    });
  } else {
    // Spacer rows keep the scroll height of the rows outside the window. A top spacer is one or two
    // rows so the first mounted row keeps its own place in the zebra (an even count before an even
    // row), and the stripes do not flip as the window moves.
    const spacer = (height: number, key: string) => (
      <tr key={key} aria-hidden="true" className="uix-data-workspace__spacer"><td colSpan={colCount} style={{ height }} /></tr>
    );
    tbody = (
      <tbody>
        {virtual && windowed && start > 0 && spacer(virtual.padTop, 'pad-top')}
        {windowed && start > 0 && start % 2 === 0 && spacer(0, 'pad-zebra')}
        {mountedRows.map((row, at) => renderRow(row, start + at))}
        {virtual && windowed && virtual.padBottom > 0 && spacer(virtual.padBottom, 'pad-bottom')}
      </tbody>
    );
  }

  const wrapStyle = long ? { '--uix-table-max-height': `${maxHeight}px` } as CSSProperties : undefined;
  return (
    <TableWrap
      ref={setWrap} refreshing={refreshing} style={wrapStyle} tabIndex={windowing != null && nav ? -1 : undefined}
      className={cx('uix-data-workspace__table', long && 'uix-table-wrap--scroll', cards && 'uix-data-workspace__table--cards')}
    >
      {/* With selection, the checkbox and the id (or the first column) are both frozen (the id at the checkbox's width). */}
      <Table
        density={density} zebra={zebra} pinnedCol={frozen} pinnedActions={hasActions && !cards} fixed={fixedOn || undefined} style={tableStyle}
        className={cx(
          selectable && frozen && 'uix-data-workspace__grid--pin-id',
          ladder && `uix-table--${ladder}`,
          groups && zebra !== false && 'uix-data-workspace__grid--grouped',
          nav && 'uix-data-workspace__grid--rows',
          clickActivates && 'uix-data-workspace__grid--click',
        )}
        aria-label={label} aria-rowcount={windowed ? ids.length + 1 : undefined}
      >
        {fixedOn && (
          <colgroup>
            {selectable && <col style={{ width: 'var(--uix-selcol-w)' }} />}
            {idColumn && <col style={idColumn.width ? { width: idColumn.width } : undefined} />}
            {/* A flex column (uix-col--flex) takes the slack; every other column holds its width or its floor. */}
            {shown.map((column) => {
              const width = column.width ?? (isFlex(column.className) ? undefined : columnFloor(undefined, column.minWidth, column.className));
              return <col key={column.id} className={colClasses(column.className)} style={width ? { width } : undefined} />;
            })}
            {hasActions && <col style={{ width: actionsCol }} />}
          </colgroup>
        )}
        <thead>
          <tr aria-rowindex={windowed ? 1 : undefined}>
            {selectable && (
              <th className="uix-table__selcol" scope="col" data-col={ladderOn ? 'select' : undefined}>
                <Checkbox
                  aria-label={labels.selectAll} checked={onPage > 0 && onPage === ids.length} indeterminate={onPage > 0 && onPage < ids.length}
                  disabled={atCap && onPage === 0} onChange={() => toggleMany(ids, onPage < ids.length && !atCap)}
                />
              </th>
            )}
            {idColumn && (idColumn.sortable && idSortColumn
              // a sortable id header is a sortable data column's header (HAR-2631)
              ? <Th scope="col" data-col={ladderOn ? 'id' : undefined} {...sortProps(idSortColumn, true)}>{idColumn.header}</Th>
              : <Th scope="col" data-col={ladderOn ? 'id' : undefined}>{idColumn.header}</Th>)}
            {columns.map((column) => {
              // fixed layout: the <col> holds the width and the table the floors
              const style = !fixedOn && (column.width || column.minWidth) ? { width: column.width, minWidth: column.minWidth } : undefined;
              return (
                <Th
                  key={column.id} scope="col" className={cx(column.align === 'end' && 'uix-col--num', column.className) || undefined} style={style}
                  {...sortProps(column, column.sortable === true)}
                  {...ladderAttrs(ladderOn, column, false)}
                >
                  {column.header}
                </Th>
              );
            })}
            {hasActions && <th scope="col" className="uix-table__actions" data-col={ladderOn ? 'actions' : undefined}><span className="uix-visually-hidden">{labels.rowActions}</span></th>}
          </tr>
        </thead>
        {tbody}
      </Table>
    </TableWrap>
  );
}

interface WorkspaceRowProps<T> {
  row: T;
  rowId: string;
  rowLabel?: (row: T) => string;
  columns: readonly DataWorkspaceColumn<T>[];
  idColumn?: DataWorkspaceIdColumn<T>;
  getRowProps?: DataWorkspaceProps<T>['getRowProps'];
  selectable: boolean;
  selected: boolean;
  selectDisabled: boolean;
  hasActions: boolean;
  actions: ReactNode;
  ladderOn: boolean;
  selectRowLabel: string;
  openLabel: string;
  /** `data-uix-row-id` on the row: for the keyboard model and the windowing's measurement. */
  marked: boolean;
  ariaRowIndex?: number;
  nav: boolean;
  tabStop: boolean;
  handlers: RowHandlers;
}

/**
 * One body row. Memoised: a selection change re-renders the rows whose state changed, not every
 * row, as long as the product keeps `columns`, `idColumn`, `rowActions` and `getRowProps` stable
 * (`useMemo` / `useCallback`).
 */
function WorkspaceRowInner<T>({
  row, rowId, rowLabel, columns, idColumn, getRowProps, selectable, selected, selectDisabled, hasActions, actions, ladderOn,
  selectRowLabel, openLabel, marked, ariaRowIndex, nav, tabStop, handlers,
}: WorkspaceRowProps<T>) {
  // the row's name: its id as shown, else the product's words for it, else (last) its key
  const text = idColumn?.text(row) ?? rowLabel?.(row) ?? rowId;
  const extra = getRowProps?.(row);
  const navProps = nav ? {
    tabIndex: tabStop ? 0 : -1,
    onKeyDown: (event: ReactKeyboardEvent<HTMLTableRowElement>) => { extra?.onKeyDown?.(event); if (!event.defaultPrevented) handlers.key(rowId, event); },
    onClick: (event: ReactMouseEvent<HTMLTableRowElement>) => { extra?.onClick?.(event); if (!event.defaultPrevented) handlers.click(rowId, event); },
    onFocus: (event: ReactFocusEvent<HTMLTableRowElement>) => { extra?.onFocus?.(event); handlers.focus(rowId); },
    onBlur: (event: ReactFocusEvent<HTMLTableRowElement>) => { extra?.onBlur?.(event); handlers.blur(rowId, event); },
  } : {};
  return (
    <Tr selected={selected} data-uix-row-id={marked ? rowId : undefined} aria-rowindex={ariaRowIndex} {...extra} {...navProps}>
      {selectable && (
        <td className="uix-table__selcell" data-col={ladderOn ? 'select' : undefined}>
          <Checkbox
            aria-label={fillLabel(selectRowLabel, { label: text })} checked={selected} disabled={selectDisabled}
            onClick={(event) => handlers.toggle(rowId, (event.currentTarget as HTMLInputElement).checked, event)}
            onChange={() => {}}
          />
        </td>
      )}
      {idColumn && (
        <Td className="uix-id-cell" data-col={ladderOn ? 'id' : undefined}>
          <IdCell row={row} text={text} idColumn={idColumn} openLabel={openLabel} />
        </Td>
      )}
      {columns.map((column) => (
        <Td key={column.id} className={cx(column.align === 'end' && 'uix-col--num', column.className) || undefined} {...ladderAttrs(ladderOn, column, true)}>
          {column.cell(row)}
        </Td>
      ))}
      {hasActions && <RowActions data-col={ladderOn ? 'actions' : undefined}>{actions}</RowActions>}
    </Tr>
  );
}
const WorkspaceRow = memo(WorkspaceRowInner) as typeof WorkspaceRowInner;

/** The record-id cell: the id opens a peek and ↗ the record; or the whole id is the record's link. */
function IdCell<T>({ row, text, idColumn, openLabel }: { row: T; text: string; idColumn: DataWorkspaceIdColumn<T>; openLabel: string }) {
  const rich = idColumn.render ? <span className="uix-data-workspace__id-text">{idColumn.render(row)}</span> : null;
  const arrow = idColumn.href && renderUixLink(idColumn.renderLink, {
    href: idColumn.href(row), className: 'uix-data-workspace__open', 'aria-label': fillLabel(openLabel, { label: text }),
    children: <ArrowUpRight />,
  });
  if (!idColumn.onPeek && idColumn.href && idColumn.linkId) {
    return (
      <span className="uix-data-workspace__id">
        {renderUixLink(idColumn.renderLink, {
          href: idColumn.href(row), className: 'uix-id-cell__btn uix-data-workspace__id-link',
          children: <>{rich ?? text}<ArrowUpRight /></>,
        })}
      </span>
    );
  }
  return (
    <span className="uix-data-workspace__id">
      {idColumn.onPeek
        ? <button type="button" className="uix-id-cell__btn" aria-haspopup="dialog" onClick={() => idColumn.onPeek?.(row)}>{rich ?? text}</button>
        : rich ?? <span className="uix-cell-strong">{text}</span>}
      {arrow}
    </span>
  );
}

/** `CSS.escape` where there is one (a group id inside an attribute selector). */
const cssEscape = (value: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&'));

/** "x–y of N", rows per page, and the pager. */
function Footer({ pagination, labels, rowCount }: { pagination: DataWorkspacePagination; labels: DataWorkspaceLabels; rowCount: number }) {
  // Pagination is server-safe and reads no context, so the workspace hands it the provider's words.
  const provided = useUixLabels().pagination;
  const pagerLabels = provided || pagination.labels ? { ...provided, ...pagination.labels } : undefined;
  const sizes = pagination.pageSizes;
  const size = pagination.mode === 'offset' ? pagination.pageSize : pagination.pageSize;
  const rangeText = pagination.mode === 'offset'
    ? fillLabel(labels.range, {
      from: pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1,
      to: Math.min(pagination.total, (pagination.page - 1) * pagination.pageSize + rowCount),
      total: pagination.total,
    })
    : null;
  return (
    <div className="uix-data-workspace__footer">
      {rangeText != null && <span className="uix-data-workspace__range">{rangeText}</span>}
      {sizes && sizes.length > 1 && size != null && pagination.onPageSizeChange && (
        <label className="uix-data-workspace__size">
          <span>{labels.rowsPerPage}</span>
          <Select size="sm" value={String(size)} onValueChange={(v) => pagination.onPageSizeChange?.(Number(v))} options={sizes.map((s) => ({ value: String(s), label: String(s) }))} />
        </label>
      )}
      <span className="uix-toolbar__spacer" />
      {pagination.mode === 'offset'
        ? <Pagination mode="offset" page={pagination.page} pageCount={Math.max(1, Math.ceil(pagination.total / pagination.pageSize))} onChange={pagination.onPageChange} labels={pagerLabels} />
        : <Pagination mode="cursor" hasPrevious={pagination.hasPrevious} hasNext={pagination.hasNext} onFirst={pagination.onFirst} onPrevious={pagination.onPrevious} onNext={pagination.onNext} summary={pagination.summary} labels={pagerLabels} />}
    </div>
  );
}

/** A toolbar button that opens a popover anchored to it. */
function PopoverButton({ id, label, title, variant, children }: { id: string; label: ReactNode; title?: string; variant: 'secondary' | 'ghost'; children: (close: () => void) => ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const popover = () => document.getElementById(id);
  const close = () => { popover()?.hidePopover?.(); anchor.current?.querySelector('button')?.focus(); };
  useEffect(() => {
    const el = popover();
    if (!el) return;
    const onToggle = (event: Event) => setOpen((event as ToggleEvent).newState === 'open');
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  });
  return (
    <span ref={anchor} className="uix-data-workspace__menu">
      <Button size="sm" variant={variant} title={title} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => popover()?.togglePopover?.()}>{label}</Button>
      <Popover id={id} anchor={anchor} role="dialog" aria-label={title ?? (typeof label === 'string' ? label : undefined)}>
        {children(close)}
      </Popover>
    </span>
  );
}

/** A chip's text, with the names of ids restored from a URL or a saved view. */
function ChipSummary({ field, value, options }: { field: FilterField; value: FilterValue | undefined; options?: SummarizeFilterOptions }) {
  const resolved = useResolvedFilterLabels(field, value);
  // the words: UixLabelsProvider filterSummary, then the product's own summary labels
  const provided = useUixLabels().filterSummary;
  const merged = provided ? { ...options, labels: { ...provided, ...options?.labels, operators: { ...provided.operators, ...options?.labels?.operators } as FilterSummaryLabels['operators'] } } : options;
  return <>{summarizeFilter(resolved.field, resolved.value, merged)}</>;
}

/** An open popover, dialog or menu inside the workspace, which takes Escape before the workspace. */
function openInside(root: HTMLElement): boolean {
  try {
    if (root.querySelector(':popover-open')) return true;
  } catch { /* a browser without :popover-open */ }
  if (root.querySelector('dialog[open]')) return true;
  // A trigger still says aria-expanded="true" until its popover's toggle event arrives, after the
  // Escape that closed it: a trigger whose own popover is closed does not hold the next Escape.
  return Array.from(root.querySelectorAll('[aria-expanded="true"]')).some(stillExpanded);
}

/** An `aria-expanded="true"` that is current: not a trigger whose own popover has already closed. */
function stillExpanded(el: Element): boolean {
  const controls = el.getAttribute('aria-controls');
  const target = controls ? document.getElementById(controls) : null;
  if (!target?.hasAttribute('popover')) return true;
  try { return target.matches(':popover-open'); } catch { return true; }
}

/** Set filters as chips (summary, ×, click to edit) and "+ Filter" listing the unset ones. */
function FilterChips({ filters, labels, baseId }: { filters: NonNullable<DataWorkspaceProps<unknown>['filters']>; labels: DataWorkspaceLabels; baseId: string }) {
  const [editing, setEditing] = useState<{ field: FilterField; anchor: HTMLElement } | null>(null);
  const [draft, setDraft] = useState<FilterValue | undefined>();
  /** A filter just applied from "+ Filter": its new chip takes focus once it renders. */
  const [focusChip, setFocusChip] = useState<string | null>(null);
  const popId = `${baseId}-filter`;
  const anchors = useRef(new Map<string, HTMLElement | null>());
  const addRef = useRef<HTMLSpanElement>(null);
  const set = filters.fields.filter((f) => !isFilterEmpty(filters.values[f.id]));
  const unset = filters.fields.filter((f) => isFilterEmpty(filters.values[f.id]));
  const edit = (field: FilterField, anchor: HTMLElement | null) => {
    if (!anchor) return;
    setDraft(filters.values[field.id]);
    setEditing({ field, anchor });
  };
  // Open once the popover is anchored to the chip that asked; close returns focus there.
  useEffect(() => {
    const el = document.getElementById(popId);
    if (!el || !editing) return;
    if (!el.matches(':popover-open')) el.showPopover?.();
    const onToggle = (event: Event) => { if ((event as ToggleEvent).newState === 'closed') setEditing(null); };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, [editing, popId]);
  const finish = (value: FilterValue | undefined) => {
    if (!editing) return;
    const applied = value && !isFilterEmpty(value) ? value : undefined;
    filters.onChange(editing.field.id, applied);
    const back = anchors.current.get(editing.field.id) ?? addRef.current?.querySelector('button');
    document.getElementById(popId)?.hidePopover?.();
    (back?.querySelector?.('button') ?? back)?.focus?.();
    // From "+ Filter": the chip does not exist yet, and "+ Filter" goes when it was the last unset
    // field. Focus the new chip once it renders, so focus is not dropped on the page.
    if (applied && !anchors.current.get(editing.field.id)) setFocusChip(editing.field.id);
  };
  useEffect(() => {
    if (!focusChip) return;
    const chip = anchors.current.get(focusChip)?.querySelector('button');
    if (chip) { chip.focus(); setFocusChip(null); }
  });
  // With `onClearAll`, one change for all of them (a product whose state is the URL).
  const clearSet = () => {
    if (filters.onClearAll) filters.onClearAll({ search: false });
    else for (const f of set) filters.onChange(f.id, undefined);
  };
  return (
    <>
      {set.map((field) => (
        <span key={field.id} ref={(el) => { if (el) anchors.current.set(field.id, el); else anchors.current.delete(field.id); }} className="uix-data-workspace__chip">
          <Chip
            aria-haspopup="dialog" count={filters.counts?.[field.id]}
            onClick={() => edit(field, anchors.current.get(field.id) ?? null)}
            onRemove={() => filters.onChange(field.id, undefined)}
          >
            <ChipSummary field={field} value={filters.values[field.id]} options={filters.summary} />
          </Chip>
        </span>
      ))}
      {unset.length > 0 && (
        <span ref={addRef}>
          <Menu trigger={<Chip variant="add" icon={<PlusIcon />}>{labels.addFilter}</Chip>}>
            {unset.map((field) => <MenuItem key={field.id} onSelect={() => edit(field, addRef.current)}>{field.label}</MenuItem>)}
          </Menu>
        </span>
      )}
      {set.length > 0 && <Button size="sm" variant="link" onClick={clearSet}>{labels.clearFilters}</Button>}
      <Popover id={popId} anchor={editing?.anchor ?? null} role="dialog" aria-label={editing?.field.label}>
        {editing && (
          <FilterEditor field={editing.field} value={draft} onValueChange={setDraft} onApply={(v) => finish(v)} onClear={() => finish(undefined)} />
        )}
      </Popover>
    </>
  );
}
