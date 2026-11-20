"use client";

import { Fragment, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties, FocusEvent as ReactFocusEvent, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent, ReactNode,
} from 'react';
import { cx } from '../cx.js';
import { COLUMN_WIDTH_MAX, COLUMN_WIDTH_MIN, COLUMN_WIDTH_SCALE, fitColumnWidth, setColumnWidth, toggleSort } from '../table-engine.js';
import type { ColumnWidths } from '../table-engine.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels, useUixLocale } from '../labels-context.js';
import { countLabel } from '../plural.js';
import type { UixCountLabel } from '../plural.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { isFilterEmpty, summarizeFilter } from '../filter-model.js';
import type { FilterField, FilterSummaryLabels, FilterValue, SummarizeFilterOptions } from '../filter-model.js';
import { useResolvedFilterLabels } from '../hooks/useResolvedFilterLabels.js';
import { useVirtualRows } from '../hooks/useVirtualRows.js';
import { announcePolite } from '../announce.js';
import {
  EMPTY_SELECTION_SCOPE, selectionQueryKey, selectionScopeCount, selectionScopeMatcher, selectAllMatching, setInSelectionScope,
} from '../selection-scope.js';
import type { SelectionScope } from '../selection-scope.js';
import { playArrival } from '../hooks/arrival.js';
import { useViewTransition } from '../hooks/useViewTransition.js';
import type { UseVirtualRowsResult } from '../hooks/useVirtualRows.js';
import { BusyRegion } from './BusyRegion.js';
import { ColumnResizer } from './ColumnResizer.js';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
import { Chip } from './Chip.js';
import { FilterEditor } from './FilterEditor.js';
import { Menu, MenuItem, MenuItemCheckbox } from './Menu.js';
import { ToolbarMore } from './ToolbarMore.js';
import { Columns3Icon, MoreHorizontalIcon } from '../icons/components.js';
import { MotionList } from './MotionList.js';
import { Pagination } from './Pagination.js';
import type { PaginationLabels } from './Pagination.js';
import { Popover } from './Popover.js';
import { SearchBar } from './SearchBar.js';
import { useShortcut } from './Shortcuts.js';
import { ACTION_PANEL_SHORTCUT_ID, useActionPanelHost, useActionPanelLabels } from './ActionPanel.js';
import type { ActionPanelAction } from '../action-panel-model.js';
import { Select } from './Select.js';
import { EmptyState, ErrorState, FilteredEmptyState, LoadingState } from './States.js';
import { BulkBar, Table, TableWrap, Td, Th, Tr } from './Table.js';
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
  /**
   * Unused since 2.69 (HAR-3090): Maximize is a checkbox item in the More menu, named by `maximize`
   * with its state in `aria-checked`. Kept so existing label sets still type-check.
   */
  restore: string;
  /**
   * The toolbar's overflow menu trigger (HAR-3090): Save as, the product's `toolbarMenu`, Maximize.
   * Unset, the trigger takes `UixLabelsProvider` `toolbar.more`, then "More".
   */
  more?: string;
  selectAll: string;
  /** `{label}`: the row's id. */
  selectRow: string;
  /** `{count}` selected, in the bulk bar. Takes the plural forms or a function of the count too. */
  selected: UixCountLabel;
  bulkActions: string;
  /**
   * Selection scope (roadmap #12). The bulk bar's count under "all matching" with no filter or
   * search: `{count}`. Every selection-scope label with a `{count}` takes the plural forms or a
   * function of the count too (the form follows `{count}`).
   */
  selectedAll: UixCountLabel;
  /** The same with a filter or search: `{count}`, `{query}` (the filter in words). */
  selectedAllMatching: UixCountLabel;
  /** The scope banner once the whole page is selected: `{count}` (the rows on the page). */
  selectionPage: UixCountLabel;
  /** The banner's button that selects every matching record: `{count}` (the matching total). */
  selectAllMatching: UixCountLabel;
  /** Every record selected, no filter or search: `{count}`. */
  selectionAll: UixCountLabel;
  /** Every matching record selected: `{count}`, `{query}`. */
  selectionAllMatching: UixCountLabel;
  /** Every record selected, some unticked since: `{count}` of `{total}`. */
  selectionExcept: UixCountLabel;
  /** Every matching record selected, some unticked since: `{count}`, `{total}`, `{query}`. */
  selectionExceptMatching: UixCountLabel;
  clearSelection: string;
  /** The filter or search changed under an "all matching" selection, which was dropped. */
  selectionCleared: string;
  /** The same with `onQueryChange: 'confirm'`: `{count}` (the old selection). */
  selectionStale: UixCountLabel;
  /** Hides the "Selection cleared" note. */
  dismiss: string;
  /** The search, in `{query}`: `{search}`. */
  querySearch: string;
  /** Between the filters (and the search) in `{query}`. */
  querySeparator: string;
  /** The shortcut sheet: X on a row. */
  shortcutToggleRow: string;
  /** Shift + X on a row. */
  shortcutSelectRange: string;
  /** Ctrl/⌘ + A in the table. */
  shortcutSelectPage: string;
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
  /**
   * A group header's row count (HAR-2625): `{count}`. Takes the plural forms
   * (`{ one, few, other }`) or a function of the count too, and then `groupCountOne` is not read.
   */
  groupCount: UixCountLabel;
  /** The same for one row, when `groupCount` is a plain string. */
  groupCountOne: string;
  /** A group header's toggle while the group is open: `{name}`. */
  collapseGroup: string;
  /** The same while it is collapsed. */
  expandGroup: string;
  /** A group header's checkbox: `{name}`. */
  selectGroup: string;
  /** A column's resize grip, a separator (`onColumnWidthsChange`): `{column}`. */
  resizeColumn: string;
  /** The grip's description: how to resize by pointer, key and click. */
  resizeHint: string;
  /** The width popover a click on the grip opens, and its field: `{column}`. */
  columnWidth: string;
  /** The unit after the width field. */
  columnWidthUnit: string;
  /** The popover's step to the next narrower stop of the column-width scale. */
  narrower: string;
  /** The popover's step to the next wider stop. */
  wider: string;
  /** Fit the column to its widest content on screen (also a double-click on the grip). */
  fitColumn: string;
  /** Back to the column's own width (its tier or `width`). */
  defaultColumnWidth: string;
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
  selectedAll: '{count} selected · all rows',
  selectedAllMatching: '{count} selected · all matching {query}',
  selectionPage: { one: '{count} row on this page is selected.', other: 'All {count} rows on this page are selected.' },
  selectAllMatching: 'Select all {count} matching',
  selectionAll: { one: '{count} row is selected.', other: 'All {count} rows are selected.' },
  selectionAllMatching: { one: '{count} row matching {query} is selected.', other: 'All {count} rows matching {query} are selected.' },
  selectionExcept: { one: '{count} of {total} rows is selected.', other: '{count} of {total} rows are selected.' },
  selectionExceptMatching: { one: '{count} of {total} rows matching {query} is selected.', other: '{count} of {total} rows matching {query} are selected.' },
  clearSelection: 'Clear selection',
  selectionCleared: 'Selection cleared: the filter changed.',
  selectionStale: {
    one: 'The filter changed, so the {count} row selected under the previous filter is not selected here.',
    other: 'The filter changed, so the {count} rows selected under the previous filter are not selected here.',
  },
  dismiss: 'Dismiss',
  querySearch: 'the search “{search}”',
  querySeparator: '; ',
  shortcutToggleRow: 'Select or deselect the row',
  shortcutSelectRange: 'Select from the last row picked to this one',
  shortcutSelectPage: 'Select every row on this page',
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
  resizeColumn: 'Resize {column}',
  resizeHint: 'Drag or use the arrow keys to resize. Click or press Enter to type a width. Double-click to fit the content.',
  columnWidth: 'Width of {column}',
  columnWidthUnit: 'px',
  narrower: 'Narrower',
  wider: 'Wider',
  fitColumn: 'Fit to content',
  defaultColumnWidth: 'Default width',
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
   * How the column's text behaves (HAR-3201): `nowrap` keeps one line and never cuts it (a date, an
   * ID, an amount; the column's width must fit it), `truncate` keeps one line and ends in an ellipsis,
   * `wrap` breaks anywhere a long word needs. Default: the table's own wrapping.
   */
  textWrap?: 'wrap' | 'nowrap' | 'truncate';
  /** At most this many lines of each body cell, then an ellipsis (HAR-3201), e.g. `2` for a description. */
  lineClamp?: number;
  /**
   * The responsive ladder (`mobile`, HAR-2622): `low` columns go below 900 px of workspace width,
   * `mid` ones below 600 px; `high` (the default) stay.
   */
  priority?: 'high' | 'mid' | 'low';
  /** The column's name in words: a card's label under `mobile="cards"`. Default: `header` when it is a string. */
  label?: string;
  /**
   * With `onColumnWidthsChange`: `false` keeps this column at its own width, without a grip.
   * Default `true`. The floor a person can narrow it to is its `minWidth` (px, rem or a
   * `var(--uix-col-*)` tier), else the title floor (340 px) for a `uix-col--flex` column and
   * the scale's first tier (92 px) for the rest.
   */
  resizable?: boolean;
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
  /** The column's floor in a fixed layout, and the narrowest a resize takes it. Default: the `md` column tier. */
  minWidth?: string;
  /** With `onColumnWidthsChange`: `false` keeps the id column at its own width, without a grip. Default `true`. */
  resizable?: boolean;
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

/** Where a row's actions are shown (HAR-2634), the second argument of `rowActions`. */
export interface DataWorkspaceRowActionsContext {
  /** The ladder's step: `null` for the full table (or without `mobile`). */
  ladder: 'cards' | 'priority' | 'priority-mid' | null;
  /** The narrowest table step (`priority-mid`): render only the always-on control. Cards keep the full set, on a line of their own. */
  compact: boolean;
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

/** The query the workspace builds from its own search and filters, for `selectionScope.query`. */
export interface DataWorkspaceQuery {
  /** The search, trimmed; `''` without one. */
  search: string;
  /** The set filters by field id (the empty ones are left out). */
  filters: Record<string, FilterValue>;
}

/**
 * Selection scope (roadmap #12): the header checkbox selects the page; once it has, a banner
 * offers "Select all N matching", which turns the selection into "every record matching the
 * query, except the rows unticked since". The banner and the bulk bar say which scope applies,
 * with the count and the filter in words. A changed filter or search never carries an "all
 * matching" selection over silently: it is cleared, or (`onQueryChange: 'confirm'`) held aside
 * until the person picks the new matching set or clears it. Picks by id are kept by id, as before.
 */
export interface DataWorkspaceSelectionScope<Q = DataWorkspaceQuery> {
  /** The selection: `{ kind: 'ids', ids }` or `{ kind: 'query', query, excludedIds, total }`. */
  value: SelectionScope<Q>;
  /** Receives the next scope; send it to the bulk endpoint as it is (it is plain JSON). */
  onChange: (scope: SelectionScope<Q>) => void;
  /**
   * How many records match the query on the server. With more than the rows shown, a selected
   * page offers "Select all N matching". Default: an offset `pagination`'s `total`. Without it
   * nothing offers the step (a cursor-paged list that cannot count).
   */
  total?: number;
  /**
   * The query that selects the records, as the bulk endpoint takes it (filters and search, not
   * the sort or the page). Default: a `DataWorkspaceQuery` from `search` and `filters`. An "all
   * matching" scope belongs to the query it was made under; a different query (compared by
   * `selectionQueryKey`) is a change of filter.
   */
  query?: Q;
  /**
   * The query in words, for `{query}` in the banner and the bulk bar ("open incidents assigned
   * to Network"). Default: the filter chips' summaries and the search.
   */
  description?: ReactNode;
  /**
   * The query changed under an "all matching" selection. `clear` (default): the selection is
   * dropped and the banner says so. `confirm`: the boxes clear and the bulk bar goes, but the
   * selection is kept aside; the banner offers to select all matching the new query or to clear
   * it, and turning the filter back brings the selection back. A new pick under the new query (a
   * tick, X) starts a selection by id in its place.
   */
  onQueryChange?: 'clear' | 'confirm';
}

export interface DataWorkspaceProps<T, S extends DataWorkspaceSortState = DataWorkspaceSort | null, Q = DataWorkspaceQuery> extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
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
  /**
   * At most this many rows can be selected: the unchecked boxes are disabled at the cap (HAR-2622).
   * With `selectionScope`, "Select all N matching" is offered only for N up to the cap.
   */
  maxSelection?: number;
  /**
   * Select by scope (roadmap #12) in place of `selection` / `onSelectionChange`, which are then
   * not used: by id, or every record matching the query except some, with the scope banner, the
   * scope in the bulk bar and the X / Shift + X / Ctrl/⌘ + A keys.
   */
  selectionScope?: DataWorkspaceSelectionScope<Q>;
  /**
   * The bulk bar's actions for the selection (a `Menu` for the overflow). With `selectionScope`,
   * the second argument is the scope to send to the bulk endpoint; under "all matching" the ids
   * are only the selected rows on this page.
   */
  bulkActions?: (selectedIds: string[], scope: SelectionScope<Q>) => ReactNode;
  /**
   * The rows' own actions are disabled while the bulk bar shows (Carbon's batch mode), so a verb
   * on one row is never mistaken for a verb on the selection. They always are under "all
   * matching". Default `false`.
   */
  disableRowActionsWhileSelected?: boolean;
  /**
   * A row's actions (a `Menu`, quick buttons), in a column frozen at the right edge and sized to
   * them. Return `null` for a row without actions; with none on the page there is no column.
   * The second argument says where the row is shown (HAR-2634): at the narrowest step of the
   * ladder (`compact`, a workspace under 600 px with `mobile`), render only the always-on control,
   * the peek or a kebab; the peek or the record carries the verbs. A frozen actions cell is for
   * compact controls: word verbs (wider than a quarter of the table) unfreeze and scroll with
   * their row, at any width.
   */
  rowActions?: (row: T, context: DataWorkspaceRowActionsContext) => ReactNode;
  /**
   * Keep the actions column on an unpaged virtual list even if only off-screen rows have actions.
   * Only mounted rows and overscan call `rowActions`. A stable renderer avoids unrelated rerenders;
   * change its identity when permissions or other data used by the renderer change. Grouped,
   * paginated and card layouts retain the normal all-row check.
   */
  rowActionsColumn?: boolean;
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
   * Column widths in px, by column id (the id column by `idColumn.id`, default `'id'`): the
   * `widths` of a table-engine `ViewState`, so a URL (`serializeView`) and a saved view hold
   * them. Without it the workspace keeps the widths itself.
   */
  columnWidths?: ColumnWidths;
  /**
   * Turns on column resize (roadmap #11). Every header gets a grip: drag it; or focus it and use
   * ← / → (Shift: to the next stop of the column-width scale, Home / End: floor and cap); or click
   * it (one pointer, no drag: WCAG 2.5.7) for a width field with − / +, Fit to content and Default
   * width; double-click fits. Called once per resize, when it ends (pointer up, key up, a width
   * set in the popover), never per move: persist it into the view there. Resize uses the fixed
   * layout (`fixed`). Without a `uix-col--flex` column to take the slack, the first resize holds
   * every column at its drawn width, so only the resized one moves; those widths are all passed.
   * Not in the cards step of `mobile`.
   */
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
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
  /**
   * Toolbar: a maximize toggle; Escape restores, unless an open popover or menu takes it first.
   * Picked with the pointer, the workspace grows into the window and shrinks back to its place
   * (a view transition, `useViewTransition`); from the keyboard and under reduced motion it jumps.
   */
  maximized?: boolean;
  onMaximizedChange?: (maximized: boolean) => void;
  /**
   * Toolbar: the product's less frequent actions (group by, export, open in reports), as `Menu`
   * items (`MenuItem`, `MenuRadioGroup`, `MenuGroup`, `MenuSeparator`). They join Save as and
   * Maximize in the one "More" menu at the end of the row (HAR-3090), so search and the filters
   * lead and nothing else competes with them.
   */
  toolbarMenu?: ReactNode;
  /** Toolbar: the product's own actions at the end ("New incident"). */
  toolbarEnd?: ReactNode;
  /** Between the toolbar (and bulk bar) and the rows: notices, a "3 new — show" pill, a truncation warning. */
  beforeBody?: ReactNode;
  pagination?: DataWorkspacePagination;
  /** `loading`: the first load (skeleton rows). `error`: with `onRetry`. */
  status?: 'ready' | 'loading' | 'error';
  /** A refetch (filter, sort, page, saved view): the rows stay under `TableWrap refreshing`. */
  refreshing?: boolean;
  /**
   * Row motion (HAR-2755, list motion of the motion standard §2.5): a row that arrives (a live
   * update, the "new items" pill) rises in; a row that leaves (a bulk close, a row handled
   * elsewhere) fades out while the rows after it glide into its place, and the empty state waits
   * for the last one; a re-sort glides. A new page, filter or view that replaces most rows swaps
   * at once. Focus moves to a neighbour when its row leaves. Reduced motion keeps the fades only.
   * Not for grouped or windowed bodies, which keep plain rows. A leaving row stays in the DOM
   * (inert, `aria-hidden`) until its exit ends, so a test that counts rows right after a removal
   * sees it for up to a second. Default `false`.
   */
  rowMotion?: boolean;
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
   * scroll the page. Default: on with `onRowActivate` or `getRowActions`.
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
  /**
   * The row whose record the side `Peek` shows, or `null` while no Peek is open (experiment: the
   * return-to-row cue). Pass it to get the way back: when it turns `null`, focus goes to that row
   * (its id control without `rowNavigation`) and the row plays the arrival cue (`.uix-arrival`)
   * once, so the person sees where they are in the list. Keep it on the record the Peek shows
   * after ↑ / ↓, and the way back is to that record. A row that left the list while the Peek
   * was open (filtered out, resolved) hands focus to the row now in its place, without a cue.
   * Focus moves only when it is in the table or nowhere; nothing moves and the open stays instant.
   */
  peekRowId?: string | null;
  /**
   * The per-row action panel (enterprise UX study, roadmap #10; spec
   * `Docs/specs/2026-11-20-action-panel.md`): a row's actions, asked for when they are needed (the
   * focused row's keys, its panel, Enter, a mounted row's ⋯ button), never for every row. With focus
   * on a row, Enter runs its `primary` action (`onRowActivate`, when set, is the primary instead),
   * and Ctrl/⌘+K opens an `ActionPanel` anchored to the row: every action with the keys it has now,
   * searchable, grouped, destructive ones last and confirmed unless `undoable`. A second Ctrl/⌘+K,
   * or one with no row focused, reaches the global `CommandPalette` (first press local, through the
   * shortcut registry's scopes). Each action's `keys` work only while focus is in the rows: the `?`
   * sheet lists them under the workspace's `label`, the single-key switch and remaps apply (WCAG
   * 2.1.4). Turns on `rowNavigation`. Keep it stable (`useCallback`): the rows are memoised on it.
   */
  getRowActions?: (row: T) => readonly ActionPanelAction[] | null | undefined;
  /** With `getRowActions`: a ⋯ button in each row's actions cell opens its panel (the pointer and touch path). Default `true`. */
  actionPanelTrigger?: boolean;
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
/** More rows than this arriving and leaving at once is a new list: it swaps, it does not animate. */
const MOTION_ROW_LIMIT = 12;
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
export function DataWorkspace<T, S extends DataWorkspaceSortState = DataWorkspaceSort | null, Q = DataWorkspaceQuery>({
  label, rows, getRowId, rowLabel, columns, idColumn, sort, onSortChange, selection, onSelectionChange, maxSelection, selectionScope, bulkActions,
  disableRowActionsWhileSelected = false, rowActions, rowActionsColumn,
  getRowProps, density, zebra, freezeFirstColumn = false, fixed, columnWidths, onColumnWidthsChange, mobile, search, filters, savedViews, viewMenu, viewChanged = false,
  onSaveView, onSaveViewAs, saveViewAs = 'changed', maximized = false, onMaximizedChange, toolbarMenu, toolbarEnd, beforeBody, pagination,
  status = 'ready', refreshing = false, rowMotion = false, onRetry, loadingRows = 6, empty, emptyAction, filteredEmpty, filteredEmptyAction,
  error, stateOverride, groups, collapsedGroups, onCollapsedGroupsChange, virtualize, rowNavigation, onRowActivate,
  activateOnClick = true, activeRowId, onActiveRowChange, peekRowId, getRowActions, actionPanelTrigger = true, multiSort = false, labels: labelOverrides, className, ...props
}: DataWorkspaceProps<T, S, Q>) {
  const uixLabels = useUixLabels();
  const labels = { ...DEFAULT_DATA_WORKSPACE_LABELS, ...uixLabels.dataWorkspace, ...labelOverrides };
  const workspaceLocale = useUixLocale();
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  // Maximize is occasional, so it may travel: the workspace morphs between its place and the window.
  const morph = useViewTransition();
  const setMaximized = (next: boolean) => {
    if (!onMaximizedChange) return;
    morph(() => onMaximizedChange(next), { parts: () => [['workspace', rootRef.current]] });
  };
  /** The row a Shift-click range starts from: the last row clicked without Shift. */
  const anchor = useRef<string | null>(null);

  // Ctrl/⌘ + / focuses the search: from inside this workspace (its own fields too), or from a page
  // with nothing focused when this is its first workspace. Another workspace or app field keeps the
  // key. Registered as `uix.data-workspace.search`: listed in the shortcut sheet, remappable.
  useShortcut({
    id: 'uix.data-workspace.search', keys: 'Mod+/', enabled: search != null, scope: 'global',
    label: uixLabels.shortcuts?.focusSearch ?? 'Search this list', allowInInputs: true, allowInModal: true,
    when: (event) => {
      const root = rootRef.current;
      const target = event.target as Node | null;
      const inside = root != null && target != null && root.contains(target);
      const unfocused = target === document.body || target === document.documentElement || target === document;
      return inside || (unfocused && root != null && document.querySelector('.uix-data-workspace') === root);
    },
    handler: () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
  });

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

  // Column widths (roadmap #11): the product's (a view), else the workspace's own.
  const [ownWidths, setOwnWidths] = useState<ColumnWidths>({});
  const widths = columnWidths ?? ownWidths;
  const resizable = onColumnWidthsChange != null;
  const commitWidths = (next: Record<string, number>) => {
    if (columnWidths === undefined) setOwnWidths(next);
    onColumnWidthsChange?.(next);
  };

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

  // The last rows leave visibly too (HAR-2755): when every row goes from a settled list (a bulk
  // close, a live update; not a refetch, a new filter or a state the product sets), the table
  // stays, with no rows, until their exit has run, and only then does the empty state show.
  const [exitHold, setExitHold] = useState({ count: shownRows.length, filtered: view.filtered, refreshing, held: false });
  if (exitHold.count !== shownRows.length || exitHold.filtered !== view.filtered || exitHold.refreshing !== refreshing) {
    const held = rowMotion && shownRows.length === 0 && exitHold.count > 0 && exitHold.filtered === view.filtered
      && !exitHold.refreshing && !refreshing && !shownGroups && status === 'ready' && stateOverride == null;
    setExitHold({ count: shownRows.length, filtered: view.filtered, refreshing, held });
  }
  const holdingExit = exitHold.held && shownRows.length === 0;
  const onRowsExited = useCallback(() => setExitHold((current) => (current.held ? { ...current, held: false } : current)), []);

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
  // ── selection: by id, or (selectionScope) every record matching the query except some ──
  // An "all matching" scope belongs to the query it was made under. Under another query it is
  // stale: it selects nothing here, the bulk bar goes, and (`clear`) it is dropped or (`confirm`)
  // held aside until the person chooses. Never carried over silently (roadmap #12).
  const legacySelected = selection ?? EMPTY_SET;
  const scopeValue = selectionScope?.value;
  const queryNow = selectionScope ? selectionScope.query ?? (defaultQuery(search?.value, filters) as Q) : undefined;
  const queryKey = selectionScope ? selectionQueryKey(queryNow) : '';
  const stale = scopeValue?.kind === 'query' && selectionQueryKey(scopeValue.query) !== queryKey;
  const queryPolicy = selectionScope?.onQueryChange ?? 'clear';
  const effectiveScope: SelectionScope<Q> | null = selectionScope ? (stale ? EMPTY_SELECTION_SCOPE : scopeValue!) : null;
  /** The query an "all matching" scope was cleared under (`clear`): the banner says so there, until the next pick. */
  const [clearedUnder, setClearedUnder] = useState<string | null>(null);
  // the query moved on (and is not itself about to be cleared): the note belonged to the old one
  if (clearedUnder !== null && clearedUnder !== queryKey && !stale) setClearedUnder(null);
  const isSelected = useMemo(
    () => (effectiveScope ? selectionScopeMatcher(effectiveScope) : (rowId: string) => legacySelected.has(rowId)),
    [effectiveScope, legacySelected],
  );
  const selectable = onSelectionChange != null || selectionScope != null;
  const cap = maxSelection ?? Infinity;
  const selectedCount = effectiveScope ? selectionScopeCount(effectiveScope) : legacySelected.size;
  const onPage = ids.filter(isSelected).length;
  /** Adds or removes these rows; adding stops at `maxSelection` (by id; "all matching" chose its rows). */
  const apply = (next: Set<string>, rowIds: readonly string[], on: boolean) => {
    for (const rowId of rowIds) {
      if (!on) next.delete(rowId);
      else if (next.has(rowId) || next.size < cap) next.add(rowId);
    }
    return next;
  };
  const setRows = (rowIds: readonly string[], on: boolean) => {
    if (selectionScope) {
      // a stale scope is not built on: a pick under the new query starts a selection by id
      const base = effectiveScope ?? EMPTY_SELECTION_SCOPE;
      const next = setInSelectionScope<Q>(base, rowIds, on, cap);
      if (next !== base || stale) selectionScope.onChange(next);
      setClearedUnder(null);
      return;
    }
    if (!onSelectionChange) return;
    onSelectionChange(apply(new Set(legacySelected), rowIds, on));
  };
  /** One row, or (`range`: Shift + click, Shift + X) every row from the anchor to it, in visual order. */
  const toggleRow = (rowId: string, on: boolean, range: boolean) => {
    if (!selectable) return;
    const from = anchor.current ? visibleIds.indexOf(anchor.current) : -1;
    const to = visibleIds.indexOf(rowId);
    if (range && from >= 0 && to >= 0) {
      // every row between the anchor and this one takes this row's new state
      setRows(visibleIds.slice(Math.min(from, to), Math.max(from, to) + 1), on);
    } else {
      setRows([rowId], on);
      anchor.current = rowId;
    }
  };
  const toggleMany = (rowIds: readonly string[], on: boolean) => setRows(rowIds, on);
  const atCap = effectiveScope ? effectiveScope.kind === 'ids' && effectiveScope.ids.length >= cap : legacySelected.size >= cap;

  // Each row's actions, asked once per render; the column shows only when a row on the page has some.
  // The ladder is in the context (HAR-2634): asked again when the step changes (a resize), not per render.
  const lazyRowActions = rowActionsColumn && virtualize && !pagination && !shownGroups && ladder !== 'cards' ? rowActions : undefined;
  const actionsByRow = useMemo(() => {
    if (!rowActions || lazyRowActions) return [];
    const context: DataWorkspaceRowActionsContext = { ladder, compact: ladder === 'priority-mid' };
    return shownRows.map((row) => rowActions(row, context));
  }, [shownRows, rowActions, ladder, lazyRowActions]);
  // The action panel's ⋯ button needs the column too; each mounted row decides whether it has one.
  const panelTrigger = getRowActions != null && actionPanelTrigger;
  const hasActions = panelTrigger || !!lazyRowActions || actionsByRow.some((node) => node != null && node !== false);

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
  const hasMenu = showSaveAs || onMaximizedChange != null || (toolbarMenu != null && toolbarMenu !== false);
  const hasToolbar = savedViews != null || (viewChanged && onSaveView != null) || hasMenu || filters != null || search != null
    || viewMenu != null || (toolbarEnd != null && toolbarEnd !== false);
  // Ranked (HAR-3090, ADR-0005 addendum): the lead zone holds what a person uses on every visit,
  // search first, then the filters and the saved view with its Save; the end zone holds the quiet
  // controls: View (columns, density), one "More" menu for Save as, the product's less frequent
  // actions and Maximize, then the product's own actions.
  const hasLead = search != null || filters != null || savedViews != null || (viewChanged && onSaveView != null);
  const hasEnd = viewMenu != null || hasMenu || (toolbarEnd != null && toolbarEnd !== false);
  const toolbar = hasToolbar && (
    <div className="uix-toolbar uix-data-workspace__toolbar" role="toolbar" aria-label={label}>
      {hasLead && <div className="uix-toolbar__lead">
        {search && (
          <SearchBar
            className="uix-data-workspace__search" landmark={false} label={search.label ?? labels.search} placeholder={search.placeholder ?? labels.searchPlaceholder}
            value={search.value} onValueChange={search.onChange} inputRef={searchRef}
            onSubmit={search.onSubmit} onClear={search.onClear} maxLength={search.maxLength}
          />
        )}
        {filters && <FilterChips filters={filters} labels={labels} baseId={id} />}
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
        {/* Save sits with the view it saves, after the search: appearing as the search changes, it
            must not move the search field under the person's fingers. Secondary: saving a view is
            not the page's primary action (that is the product's, at the end). */}
        {viewChanged && onSaveView && <Button size="sm" variant="secondary" onClick={onSaveView}>{labels.saveView}</Button>}
      </div>}
      {hasEnd && <div className="uix-toolbar__end">
        {viewMenu && (
          <PopoverButton id={`${id}-view`} label={<><Columns3Icon size="sm" aria-hidden="true" />{labels.view}</>} name={labels.view} variant="ghost">
            {() => <ViewMenu {...viewMenu} />}
          </PopoverButton>
        )}
        {hasMenu && (
          <ToolbarMore label={labels.more /* unset: the provider's toolbar.more, then "More" */}>
            {showSaveAs && <MenuItem onSelect={() => onSaveViewAs?.()}>{labels.saveViewAs}</MenuItem>}
            {toolbarMenu}
            {onMaximizedChange && (
              <MenuItemCheckbox checked={maximized} onCheckedChange={setMaximized} closeOnSelect icon={<MaximizeIcon restore={maximized} />}>
                {labels.maximize}
              </MenuItemCheckbox>
            )}
          </ToolbarMore>
        )}
        {toolbarEnd}
      </div>}
    </div>
  );

  // ── the scope banner and the bulk bar (roadmap #12) ──────────────────────────────────────
  // `clear`: a stale "all matching" scope is dropped at once; the banner says why until the
  // person dismisses it, selects again or the query changes again (`clearedUnder`, above).
  useIsomorphicLayoutEffect(() => {
    if (!selectionScope || !stale || queryPolicy !== 'clear') return;
    setClearedUnder(queryKey);
    selectionScope.onChange(EMPTY_SELECTION_SCOPE);
  }, [stale, queryPolicy, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // the workspace's language (UixLabelsProvider locale): its plural forms and its digit grouping
  const numbers = useMemo(() => { try { return new Intl.NumberFormat(workspaceLocale); } catch { return new Intl.NumberFormat('en'); } }, [workspaceLocale]);
  const count = (n: number) => numbers.format(n);
  const plural = (label: UixCountLabel, n: number) => countLabel(label, n, workspaceLocale);
  const matchingTotal = selectionScope?.total ?? (pagination?.mode === 'offset' ? pagination.total : undefined);
  // not while a refetch runs: the total may still be the previous query's
  const canSelectMatching = matchingTotal != null && matchingTotal > 0 && matchingTotal <= cap && !refreshing;
  const hasQuery = selectionScope?.description != null || activeFilters.length > 0 || searching;
  const queryWords: ReactNode = selectionScope?.description
    ?? (hasQuery ? <QueryWords filters={filters} fields={activeFilters} search={search?.value.trim() ?? ''} labels={labels} /> : null);
  let banner: 'page' | 'all' | 'stale' | 'cleared' | null = null;
  if (selectionScope && status === 'ready' && stateOverride == null) {
    if (stale && queryPolicy === 'confirm') banner = 'stale';
    else if (effectiveScope?.kind === 'query' && selectedCount > 0) banner = 'all';
    else if (clearedUnder === queryKey && selectedCount === 0) banner = 'cleared';
    else if (effectiveScope?.kind === 'ids' && ids.length > 0 && onPage === ids.length && canSelectMatching && (matchingTotal ?? 0) > ids.length) banner = 'page';
  }
  /** After the banner's last action, focus goes to the header checkbox (the banner leaves). */
  const focusHeadCheckbox = () => rootRef.current?.querySelector<HTMLInputElement>('thead .uix-table__selcol input')?.focus();
  const selectMatching = { label: fillLabel(plural(labels.selectAllMatching, matchingTotal ?? 0), { count: count(matchingTotal ?? 0) }), run: () => { selectionScope?.onChange(selectAllMatching(queryNow as Q, matchingTotal ?? 0)); setClearedUnder(null); } };
  const clearScope = { label: labels.clearSelection, run: () => { selectionScope?.onChange(EMPTY_SELECTION_SCOPE); setClearedUnder(null); focusHeadCheckbox(); } };
  let bannerText: ReactNode = null;
  let bannerPrimary: BannerAction | null = null;
  let bannerSecondary: BannerAction | null = null;
  if (banner === 'page') {
    bannerText = fillNodes(plural(labels.selectionPage, onPage), { count: count(onPage) });
    bannerPrimary = selectMatching;
  } else if (banner === 'all' && effectiveScope?.kind === 'query') {
    const except = effectiveScope.excludedIds.length > 0;
    const template = except ? (hasQuery ? labels.selectionExceptMatching : labels.selectionExcept) : (hasQuery ? labels.selectionAllMatching : labels.selectionAll);
    bannerText = fillNodes(plural(template, selectedCount), { count: count(selectedCount), total: count(effectiveScope.total), query: queryWords });
    bannerPrimary = clearScope;
  } else if (banner === 'stale' && scopeValue) {
    bannerText = fillNodes(plural(labels.selectionStale, selectionScopeCount(scopeValue)), { count: count(selectionScopeCount(scopeValue)) });
    bannerPrimary = canSelectMatching ? selectMatching : clearScope;
    bannerSecondary = canSelectMatching ? clearScope : null;
  } else if (banner === 'cleared') {
    bannerText = labels.selectionCleared;
    bannerPrimary = { label: labels.dismiss, run: () => { setClearedUnder(null); focusHeadCheckbox(); } };
  }
  // The banner's words are said when they change (a polite region: the banner holds buttons, so
  // it is no live region itself); not on the first render, which only shows what was restored.
  const bannerTextRef = useRef<HTMLParagraphElement>(null);
  const saidBanner = useRef<string | null>(null);
  useEffect(() => {
    // a first load that ends shows what was restored: that is not news either
    if (saidBanner.current === null && status !== 'ready') return;
    const text = banner ? bannerTextRef.current?.textContent ?? '' : '';
    if (saidBanner.current !== null && text !== '' && text !== saidBanner.current) announcePolite(text, rootRef.current);
    saidBanner.current = text;
  });

  const showBulk = bulkActions != null && selectedCount > 0;
  const selectedIds = effectiveScope
    ? (effectiveScope.kind === 'ids' ? [...effectiveScope.ids] : ids.filter(isSelected))
    : [...legacySelected];
  const bulkCountLabel = (n: number): ReactNode => (effectiveScope?.kind === 'query'
    // the filter in words can be long: this count wraps (the bar keeps a plain count on one line)
    ? <span className="uix-data-workspace__bulk-scope">{fillNodes(plural(hasQuery ? labels.selectedAllMatching : labels.selectedAll, n), { count: count(n), query: queryWords })}</span>
    // by id the number is formatted; without selectionScope it reads as it always did
    : fillLabel(plural(labels.selected, n), { count: effectiveScope ? count(n) : n }));
  // Carbon's batch mode: a row's own verbs are off while the bulk bar acts on the selection, and
  // always under "all matching", where a row verb would read as a verb on thousands of rows.
  const rowActionsOff = effectiveScope?.kind === 'query' && selectedCount > 0 ? true : disableRowActionsWhileSelected && showBulk;

  const busy = (node: ReactNode) => <BusyRegion busy={refreshing} className="uix-data-workspace__state">{node}</BusyRegion>;
  let body: ReactNode;
  if (stateOverride != null) body = busy(stateOverride);
  else if (status === 'loading') body = <LoadingState rows={loadingRows} label={labels.loading} className="uix-data-workspace__loading" />;
  else if (status === 'error') body = error != null ? busy(error) : <ErrorState title={labels.error} action={onRetry && <Button size="sm" onClick={onRetry}>{labels.retry}</Button>} />;
  else if (shownRows.length === 0 && !holdingExit) {
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
        freezeFirstColumn={freezeFirstColumn} fixed={resizable || (fixed ?? columns.some((column) => column.className != null || column.minWidth != null))}
        resizable={resizable} widths={widths} onWidthsCommit={commitWidths}
        ladderOn={mobile != null} ladder={ladder} refreshing={refreshing} rowMotion={rowMotion}
        selectable={selectable} isSelected={isSelected} onPage={onPage} atCap={atCap} toggleRow={toggleRow} toggleMany={toggleMany}
        selectionKeys={selectionScope != null} actionsDisabled={rowActionsOff} actionsByRow={actionsByRow} lazyRowActions={lazyRowActions} hasActions={hasActions} keys={keys} sortable={onSortChange != null} multi={multi} sortFor={sortFor} cycleSort={cycleSort}
        virtualize={pagination || shownGroups ? undefined : virtualize}
        rowNavigation={rowNavigation ?? (onRowActivate != null || getRowActions != null)} onRowActivate={onRowActivate} activateOnClick={activateOnClick}
        getRowActions={getRowActions} actionPanelTrigger={panelTrigger}
        activeRowId={activeRowId} onActiveRowChange={onActiveRowChange} peekRowId={peekRowId} labels={labels} onRowsExited={onRowsExited}
      />
    );
  }

  return (
    <section
      ref={rootRef}
      className={cx('uix-data-workspace', maximized && 'uix-data-workspace--maximized', className)}
      aria-label={label}
      {...props}
    >
      {toolbar}
      {showBulk && (
        <BulkBar count={selectedCount} label={labels.bulkActions} selectedLabel={bulkCountLabel}>
          {bulkActions(selectedIds, effectiveScope ?? { kind: 'ids', ids: selectedIds })}
        </BulkBar>
      )}
      {banner && (
        <div className="uix-data-workspace__scope" data-scope={banner}>
          <p className="uix-data-workspace__scope-text" ref={bannerTextRef}>{bannerText}</p>
          {(bannerPrimary || bannerSecondary) && (
            <div className="uix-data-workspace__scope-actions">
              {/* One element for the first action in every state: "Select all N matching" becomes
                  "Clear selection" in place, so focus stays on it. */}
              {bannerPrimary && <Button key="primary" size="sm" variant="link" onClick={bannerPrimary.run}>{bannerPrimary.label}</Button>}
              {bannerSecondary && <Button key="secondary" size="sm" variant="link" onClick={bannerSecondary.run}>{bannerSecondary.label}</Button>}
            </div>
          )}
        </div>
      )}
      {beforeBody != null && <div className="uix-data-workspace__before">{beforeBody}</div>}
      {body}
      {pagination && status === 'ready' && stateOverride == null && shownRows.length > 0 && <Footer pagination={pagination} labels={labels} rowCount={shownRows.length} />}
    </section>
  );
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/** One of the scope banner's buttons. */
interface BannerAction { label: string; run: () => void }

/** The default `selectionScope.query`: the trimmed search and the set filters. */
const defaultQuery = (searchValue: string | undefined, filters: DataWorkspaceProps<unknown>['filters']): DataWorkspaceQuery => {
  const set: Record<string, FilterValue> = {};
  if (filters) for (const field of filters.fields) {
    const value = filters.values[field.id];
    if (value && !isFilterEmpty(value)) set[field.id] = value;
  }
  return { search: searchValue?.trim() ?? '', filters: set };
};

/** A label's `{placeholders}` filled with nodes (the query in words is a node: its chips' summaries). */
const fillNodes = (template: string, values: Readonly<Record<string, ReactNode>>): ReactNode => {
  const parts = template.split(/(\{\w+\})/);
  if (parts.length === 1) return template;
  return parts.map((part, index) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return key != null && Object.prototype.hasOwnProperty.call(values, key) ? <Fragment key={index}>{values[key]}</Fragment> : part;
  });
};

/** The query in words, for `{query}`: each set filter as its chip says it, then the search. */
function QueryWords({ filters, fields, search, labels }: {
  filters: DataWorkspaceProps<unknown>['filters']; fields: readonly FilterField[]; search: string; labels: DataWorkspaceLabels;
}) {
  const parts: ReactNode[] = fields.map((field) => <ChipSummary key={field.id} field={field} value={filters?.values[field.id]} options={filters?.summary} />);
  if (search !== '') parts.push(<Fragment key="search">{fillLabel(labels.querySearch, { search })}</Fragment>);
  return <>{parts.map((part, index) => <Fragment key={index}>{index > 0 && labels.querySeparator}{part}</Fragment>)}</>;
}

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
  /** Column resize is on (`onColumnWidthsChange`). */
  resizable: boolean;
  widths: ColumnWidths;
  onWidthsCommit: (widths: Record<string, number>) => void;
  ladderOn: boolean;
  ladder: Ladder;
  refreshing: boolean;
  rowMotion: boolean;
  selectable: boolean;
  isSelected: (rowId: string) => boolean;
  onPage: number;
  atCap: boolean;
  /** `range`: from the anchor to this row (Shift + click, Shift + X). */
  toggleRow: (rowId: string, on: boolean, range: boolean) => void;
  toggleMany: (rowIds: readonly string[], on: boolean) => void;
  /** X / Shift + X / Ctrl/⌘ + A select by key (with `selectionScope`; a table without it keeps its keys as they were). */
  selectionKeys: boolean;
  /** The rows' own actions are off (inert): the bulk bar acts on the selection. */
  actionsDisabled: boolean;
  actionsByRow: readonly ReactNode[];
  lazyRowActions?: (row: T, context: DataWorkspaceRowActionsContext) => ReactNode;
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
  peekRowId?: string | null;
  getRowActions?: (row: T) => readonly ActionPanelAction[] | null | undefined;
  actionPanelTrigger: boolean;
  labels: DataWorkspaceLabels;
  /** The last leaving row has gone: the workspace may now show its empty state. */
  onRowsExited?: () => void;
}

/** The handlers every row shares: one object for the table's life, so a memoised row is not re-rendered by them. */
interface RowHandlers {
  toggle: (rowId: string, on: boolean, range: boolean) => void;
  key: (rowId: string, event: ReactKeyboardEvent<HTMLTableRowElement>) => void;
  click: (rowId: string, event: ReactMouseEvent<HTMLTableRowElement>) => void;
  focus: (rowId: string) => void;
  blur: (rowId: string, event: ReactFocusEvent<HTMLTableRowElement>) => void;
  /** The row's ⋯ button: open its action panel anchored to the button. */
  openActions: (rowId: string, anchor: HTMLElement) => void;
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
    const tier = /^uix-col--w-(xs|sm|md|lg|lg-plus|xl)$/.exec(cls)?.[1];
    if (tier) return `var(--uix-col-w-${tier})`;
  }
  if (classes.includes('uix-col--flex') || classes.includes('uix-col--primary')) return 'var(--uix-col-title-min)';
  return 'var(--uix-col-w-sm)';
};
/** The column-width scale by tier name (table-engine COLUMN_WIDTH_SCALE, tokens/base/size.json). */
const TIER_PX: Readonly<Record<string, number>> = {
  'w-xs': COLUMN_WIDTH_SCALE[0], 'w-sm': COLUMN_WIDTH_SCALE[1], 'w-md': COLUMN_WIDTH_SCALE[2], 'w-lg': COLUMN_WIDTH_SCALE[3],
  'w-lg-plus': COLUMN_WIDTH_SCALE[4], 'w-xl': COLUMN_WIDTH_SCALE[5], 'title-min': COLUMN_WIDTH_SCALE[6],
};
const TITLE_MIN = TIER_PX['title-min'];
/** The id column's floor without `minWidth`: the md tier, as in the fixed layout. */
const ID_MIN = TIER_PX['w-md'];
/** A floor written as px, rem (16 px) or a `var(--uix-col-*)` tier, in px; `null` for anything else. */
const lengthPx = (length?: string): number | null => {
  const value = length?.trim();
  if (!value) return null;
  const unit = /^(\d+(?:\.\d+)?)(px|rem)$/.exec(value);
  if (unit) return Number(unit[1]) * (unit[2] === 'rem' ? 16 : 1);
  const tier = /^var\(--uix-col-(w-(?:xs|sm|md|lg|lg-plus|xl)|title-min)\)$/.exec(value);
  return tier ? TIER_PX[tier[1]] : null;
};
const EMPTY_WIDTHS: ColumnWidths = {};
const sameWidths = (a: ColumnWidths, b: ColumnWidths) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};
const paddingOf = (el: HTMLElement) => {
  if (typeof getComputedStyle !== 'function') return 0;
  const style = getComputedStyle(el);
  return (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
};
/** The width of a node's laid-out content (a text that overflows a clipped cell counts in full). */
const nodeWidth = (node: Node) => {
  if (node instanceof HTMLElement) return Math.max(node.scrollWidth || 0, typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect().width : 0);
  if (typeof document.createRange !== 'function') return 0;
  const range = document.createRange();
  range.selectNodeContents(node);
  return typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect().width : 0;
};
/** A body cell's content width plus its padding. */
const contentWidth = (td: HTMLElement) => {
  let inner = 0;
  for (const node of Array.from(td.childNodes)) inner += nodeWidth(node);
  return inner + paddingOf(td);
};
/** A header's content (its sort button or text, and the sort arrow) plus its padding, without the grip. */
const headerContentWidth = (th: HTMLElement) => {
  let inner = 0;
  for (const node of Array.from(th.childNodes)) {
    if (node instanceof HTMLElement && node.matches('.uix-table__resize, [popover], [hidden]')) continue;
    inner += nodeWidth(node);
  }
  if (th.hasAttribute('data-sort') && typeof getComputedStyle === 'function') {
    const arrow = getComputedStyle(th, '::after');
    inner += (parseFloat(arrow.width) || 0) + (parseFloat(arrow.marginInlineStart) || 0);
  }
  return inner + paddingOf(th);
};
const isFlex = (className?: string) => /(^|\s)uix-col--(flex|primary)(\s|$)/.test(className ?? '');
/** The classes of a column that size a `<col>` (a tier, the flex column). */
const colClasses = (className?: string) => className?.split(/\s+/).filter((cls) => /^uix-col--(w-(xs|sm|md|lg|lg-plus|xl)|flex|primary)$/.test(cls)).join(' ') || undefined;
/** The classes of a column's header and body cells: alignment, the product's class and its text wrapping (HAR-3201). */
const cellClasses = <T,>(column: DataWorkspaceColumn<T>) => cx(column.align === 'end' && 'uix-col--num', column.className, column.textWrap && `uix-col--${column.textWrap}`) || undefined;
/** A body cell's content, inside the clamping box when the column clamps its lines (HAR-3201). */
const clampLines = (lineClamp: number | undefined) => {
  const lines = Math.floor(lineClamp ?? 0);
  return Number.isFinite(lines) && lines >= 1 ? lines : null;
};
const cellContent = <T,>(column: DataWorkspaceColumn<T>, row: T) => {
  const lines = clampLines(column.lineClamp);
  return lines != null
    ? <span className="uix-cell-clamp" style={{ '--uix-clamp': String(lines) } as CSSProperties}>{column.cell(row)}</span>
    : column.cell(row);
};

function WorkspaceTable<T>({
  label, rows, ids, groups, collapsed, onToggleGroup, getRowId, rowLabel, columns, idColumn, getRowProps, density, zebra, freezeFirstColumn,
  fixed, resizable, widths, onWidthsCommit, ladderOn, ladder, refreshing, rowMotion, selectable, isSelected, onPage, atCap, toggleRow, toggleMany, selectionKeys, actionsDisabled, actionsByRow, lazyRowActions, hasActions, keys, sortable,
  multi, sortFor, cycleSort, rowNavigation, onRowActivate, activateOnClick, activeRowId, onActiveRowChange, peekRowId, getRowActions, actionPanelTrigger,
  labels, windowing, virtual, onRowsExited,
}: WorkspaceGridProps<T> & { windowing: DataWorkspaceVirtualize | null; virtual: UseVirtualRowsResult<T> | null }) {
  const cards = ladder === 'cards';
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();
  const locale = useUixLocale();

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

  // ── the way back from a Peek (experiment: the return-to-row cue) ─────────────────────────
  // While the Peek is open: the row it shows and its last place among the rows on screen, kept
  // after the row leaves so the row now in that place can take focus. On close (the Peek's dialog
  // has already given focus back to whatever opened it, in the same commit): focus that row and
  // play the arrival cue on it once. A row the window has not rendered yet gets the cue when it does.
  const peekOpen = useRef<{ id: string; at: number } | null>(null);
  const pendingCue = useRef<string | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (peekRowId == null) return;
    const at = navIds.indexOf(peekRowId);
    peekOpen.current = { id: peekRowId, at: at >= 0 ? at : peekOpen.current?.id === peekRowId ? peekOpen.current.at : -1 };
  }, [peekRowId, navIds]);
  useIsomorphicLayoutEffect(() => {
    if (peekRowId != null) { pendingCue.current = null; return; }
    const was = peekOpen.current;
    if (!was) return;
    peekOpen.current = null;
    const focused = document.activeElement;
    const mayTake = focused == null || focused === document.body || (wrapRef.current?.contains(focused) ?? false);
    const target = navIds.includes(was.id) ? was.id : navIds[Math.min(Math.max(was.at, 0), navIds.length - 1)];
    if (target == null) return;
    if (mayTake) {
      if (nav) focusRow(target);
      else {
        const el = rowElement(target);
        const control = el?.querySelector<HTMLElement>('.uix-id-cell__btn') ?? el?.querySelector<HTMLElement>('a[href]');
        if (el && control) { control.focus({ preventScroll: true }); reveal(el); }
      }
    }
    // The cue says "you came from here": a stand-in row only takes focus.
    if (target !== was.id) return;
    const el = rowElement(target);
    if (el) playArrival(el);
    else pendingCue.current = target;
  }, [peekRowId]); // eslint-disable-line react-hooks/exhaustive-deps
  useIsomorphicLayoutEffect(() => {
    const id = pendingCue.current;
    if (id == null) return;
    if (!ids.includes(id)) { pendingCue.current = null; return; }
    const el = rowElement(id);
    if (el) { pendingCue.current = null; playArrival(el); }
  });

  // ── the per-row action panel (roadmap #10) ───────────────────────────────────────────────
  // One panel for the whole table, opened on the focused row. Only the tab-stop row's actions are
  // asked for on render (their keys are registered, so the ? sheet lists them); any other row's
  // when its keys, its Enter or its ⋯ button need them.
  // Off while the bulk bar acts on the selection, as the inert actions cell is (disableRowActionsWhileSelected).
  const actionsOn = getRowActions != null && nav && !actionsDisabled;
  const rowOf = (el: HTMLElement): T | undefined => {
    const rowId = el.getAttribute('data-uix-row-id');
    const at = rowId == null ? -1 : ids.indexOf(rowId);
    return at >= 0 ? rows[at] : undefined;
  };
  const tabStopRow = actionsOn && tabStop != null ? rows[ids.indexOf(tabStop)] : undefined;
  const verbs = useMemo(() => (tabStopRow !== undefined ? getRowActions?.(tabStopRow) ?? null : null), [tabStopRow, getRowActions]);
  const panelLabels = useActionPanelLabels();
  const actionHost = useActionPanelHost({
    enabled: actionsOn,
    scope: wrapRef,
    scopeLabel: label,
    itemOf: (target) => {
      const tr = target?.closest?.('tbody > tr[data-uix-row-id]') as HTMLElement | null | undefined;
      return tr && !tr.hasAttribute('data-uix-exiting') && wrapRef.current?.contains(tr) ? tr : null;
    },
    actionsOf: (el) => {
      const row = rowOf(el);
      const actions = row === undefined ? null : getRowActions?.(row);
      // With onRowActivate, Enter runs that: no action is the primary one.
      return onRowActivate && actions ? actions.map((action) => (action.primary ? { ...action, primary: false } : action)) : actions;
    },
    nameOf: (el) => {
      const row = rowOf(el);
      return row === undefined ? undefined : idColumn?.text(row) ?? rowLabel?.(row) ?? el.getAttribute('data-uix-row-id') ?? undefined;
    },
    verbs,
    showPrimaryKey: onRowActivate == null,
  });

  const latest = {
    toggle: (rowId: string, on: boolean, range: boolean) => toggleRow(rowId, on, range),
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
        // Else the row's primary action (asking first when it must), from getRowActions.
        if (actionHost.runPrimary(event.currentTarget)) return;
        // Without either, Enter opens what the row already offers: its id (peek or link).
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
      // An inert actions cell (the bulk bar acts) is skipped by hit-testing, so a click on its dimmed
      // verbs lands on the row itself: it is still not a click on the row.
      if (actionsDisabled && event.target === event.currentTarget) {
        const cell = event.currentTarget.querySelector<HTMLElement>(':scope > td.uix-table__actions');
        const box = cell?.getBoundingClientRect();
        if (box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) return;
      }
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
    openActions: (rowId: string, anchor: HTMLElement) => {
      const el = rowElement(rowId);
      if (el) actionHost.open(el, anchor);
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
    openActions: (...args) => latestRef.current.openActions(...args),
  }), []);

  // ── selection keys (roadmap #12; Linear's X and Shift-range) ────────────────────────────
  // Registered in the table's own scope: listed in the ? sheet while focus is in the table, and
  // the single-key switch (WCAG 2.1.4) turns X and Shift + X off. The row is the one holding
  // focus: the row itself (`rowNavigation`) or a control in it (its checkbox, its id).
  const focusedRowId = (event: KeyboardEvent | null) => {
    const from = (event?.target ?? (typeof document !== 'undefined' ? document.activeElement : null)) as Element | null;
    const tr = from?.closest?.('tbody > tr[data-uix-row-id]');
    const rowId = tr && wrapRef.current?.contains(tr) ? tr.getAttribute('data-uix-row-id') : null;
    return rowId != null && navIds.includes(rowId) ? rowId : null;
  };
  const toggleFocused = (range: boolean) => (event: KeyboardEvent | null) => {
    const rowId = focusedRowId(event);
    if (rowId == null) return false;
    const on = !isSelected(rowId);
    // the cap: a box that is disabled cannot be ticked by key either
    if (on && atCap) return true;
    toggleRow(rowId, on, range);
    return true;
  };
  useShortcut({
    id: 'uix.data-workspace.toggle-row', keys: 'X', label: labels.shortcutToggleRow,
    scope: wrapRef, scopeLabel: label, enabled: selectable && selectionKeys, handler: toggleFocused(false),
  });
  useShortcut({
    id: 'uix.data-workspace.select-range', keys: 'Shift+X', label: labels.shortcutSelectRange,
    scope: wrapRef, scopeLabel: label, enabled: selectable && selectionKeys, handler: toggleFocused(true),
  });
  useShortcut({
    id: 'uix.data-workspace.select-page', keys: 'Mod+A', label: labels.shortcutSelectPage,
    scope: wrapRef, scopeLabel: label, enabled: selectable && selectionKeys,
    // in the table only: a field in it keeps its own select-all
    handler: () => { if (onPage < ids.length) toggleMany(ids, true); return true; },
  });

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
  // A frozen actions cell is for compact controls (a peek, a kebab): it must never cover the row
  // (HAR-2634). At any width, when the actions cell is wider than a quarter of the wrap (word
  // verbs: MOTUS's 335 px in a 312 px wrap at 360 px, and 333 px at 1280 px, where it hid the
  // Status column), the cell is unfrozen and scrolls with its row. A peek and a kebab (a 76 px
  // cell) stay frozen down to a 304 px wrap; a kebab alone (52 px) down to 208 px. In a fixed
  // layout the actions column is as wide as its widest row's actions (words, not only a ⋯).
  //
  // One ResizeObserver for the table's life watches the wrap, the table, every actions cell and
  // what is in it, so actions that change width later (verbs that load, a font swap, rows that
  // mount) are measured again; a MutationObserver re-collects those targets when rows come and go.
  // Measures are coalesced to one per frame and never run while scrolling or on a plain re-render
  // (an inline rowActions builds new nodes every render). Unfreezing changes no width, so the
  // measure cannot loop. No layout (jsdom, a hidden tab): the cell stays frozen and the fixed
  // column keeps its fallback width (jsdom's Range has no getBoundingClientRect; HAR-2632).
  const [actionsTooWide, setActionsTooWide] = useState(false);
  const [actionsWidth, setActionsWidth] = useState<number | null>(null);
  const measureActions = !cards && hasActions;
  const measureConfig = useRef({ measureActions, fixedOn, hasActions });
  measureConfig.current = { measureActions, fixedOn, hasActions };
  const measureActionsNow = useRef<() => void>(() => {});
  measureActionsNow.current = () => {
    const wrap = wrapRef.current;
    const { measureActions: on, fixedOn: fixedNow, hasActions: any } = measureConfig.current;
    if (!wrap) return;
    const cells = Array.from(wrap.querySelectorAll<HTMLElement>('tbody td.uix-table__actions'));
    if (!on) setActionsTooWide(false);
    else {
      let widest = 0;
      // the cell as drawn: its own width, or its content where that overflows a fixed column
      for (const td of cells) if (typeof td.getBoundingClientRect === 'function') widest = Math.max(widest, td.getBoundingClientRect().width, td.scrollWidth);
      if (wrap.clientWidth > 0 && widest > 0) setActionsTooWide(widest > wrap.clientWidth / 4);
    }
    if (!fixedNow || !any || typeof document.createRange !== 'function' || typeof getComputedStyle !== 'function') return;
    if (typeof document.createRange().getBoundingClientRect !== 'function') return;
    let content = 0;
    for (const td of cells) {
      const range = document.createRange();
      range.selectNodeContents(td);
      const style = getComputedStyle(td);
      content = Math.max(content, range.getBoundingClientRect().width + parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0'));
    }
    const next = content > 0 ? Math.ceil(content) : null;
    setActionsWidth((current) => (current === next ? current : next));
  };
  useIsomorphicLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let frame = 0;
    const schedule = () => {
      if (frame || typeof requestAnimationFrame !== 'function') return;
      frame = requestAnimationFrame(() => { frame = 0; measureActionsNow.current(); });
    };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    const collect = () => {
      if (!resize) return;
      resize.disconnect();
      resize.observe(wrap);
      const table = wrap.querySelector('table');
      if (table) resize.observe(table);
      for (const td of Array.from(wrap.querySelectorAll<HTMLElement>('tbody td.uix-table__actions'))) {
        resize.observe(td);
        for (const child of Array.from(td.children)) resize.observe(child);
      }
    };
    collect();
    const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => { collect(); schedule(); });
    mutation?.observe(wrap, { childList: true, subtree: true });
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
      if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    };
  }, []);
  // A new step, layout or row set is measured before the paint; a plain re-render is not (the row
  // set by its ids, as text: a getRowId written inline gives a new ids array every render).
  const rowSet = ids.join(' ');
  useIsomorphicLayoutEffect(() => { measureActionsNow.current(); }, [measureActions, fixedOn, ladder, rowSet]);
  const actionsCol = actionsWidth != null ? `${actionsWidth}px` : '5.25rem';

  // ── column resize (roadmap #11) ─────────────────────────────────────────────────────────
  // A gesture draws a draft (the widths with this column's live width) and commits once, at its
  // end. `base` is the widths the gesture started from: with no other column to take the slack,
  // every shown column at its drawn width, so the others do not jump when the table stops filling.
  const [draft, setDraft] = useState<{ base: ColumnWidths; id: string; width: number } | null>(null);
  const gestureBase = useRef<ColumnWidths | null>(null);
  const resizeOn = resizable && fixedOn;
  const sized: ColumnWidths = resizeOn ? (draft ? { ...draft.base, [draft.id]: draft.width } : widths) : EMPTY_WIDTHS;
  const idKey = idColumn ? idColumn.id ?? 'id' : null;
  const setPx = (id: string | null) => (id != null && sized[id] != null ? `${sized[id]}px` : undefined);
  /** A column that takes the table's slack (no width of its own), other than `except`. */
  const slackTaker = (of: ColumnWidths, except: string | null) =>
    (idColumn != null && idKey !== except && !idColumn.width && of[idKey!] == null)
    || shown.some((column) => column.id !== except && of[column.id] == null && (column.width ? column.width.trim().endsWith('%') : isFlex(column.className)));
  const resizeHeaders = () => Array.from(wrapRef.current?.querySelectorAll<HTMLTableCellElement>('thead th[data-uix-col-key]') ?? []);
  const beginResize = (id: string) => {
    if (gestureBase.current) return;
    const base: Record<string, number> = { ...widths };
    if (!slackTaker(widths, id)) {
      for (const th of resizeHeaders()) {
        const key = th.getAttribute('data-uix-col-key')!;
        const w = typeof th.getBoundingClientRect === 'function' ? th.getBoundingClientRect().width : 0;
        if (base[key] == null && w > 0) base[key] = Math.round(w);
      }
    }
    gestureBase.current = base;
  };
  const draftResize = (id: string, width: number | null) => {
    if (width == null) { gestureBase.current = null; setDraft(null); return; }
    setDraft({ base: gestureBase.current ?? widths, id, width });
  };
  const commitResize = (id: string, width: number | null) => {
    const base = gestureBase.current ?? widths;
    gestureBase.current = null;
    setDraft(null);
    const next = setColumnWidth(base, id, width);
    if (!sameWidths(next, widths)) onWidthsCommit(next);
  };
  /** The width that fits a column's header and the cells on screen, each with its padding. */
  const fitResize = (id: string, bounds: { min: number; max: number }) => {
    const th = resizeHeaders().find((el) => el.getAttribute('data-uix-col-key') === id);
    if (!th) return bounds.min;
    const index = th.cellIndex;
    const cells = Array.from(wrapRef.current?.querySelectorAll<HTMLTableRowElement>('tbody > tr') ?? [])
      .filter((tr) => !tr.classList.contains('uix-data-workspace__group-head') && !tr.classList.contains('uix-data-workspace__spacer'))
      .map((tr) => tr.cells[index]).filter((td): td is HTMLTableCellElement => td != null);
    return fitColumnWidth([headerContentWidth(th), ...cells.map(contentWidth)], bounds);
  };
  const resizeBounds = (minWidth: string | undefined, className: string | undefined, fallback: number) => {
    const min = Math.max(1, Math.round(lengthPx(minWidth) ?? (isFlex(className) ? TITLE_MIN : fallback)));
    return { min, max: Math.max(min, COLUMN_WIDTH_MAX) };
  };
  const resizer = (id: string, name: string, bounds: { min: number; max: number }) => (
    <ColumnResizer
      name={name} width={sized[id]} min={bounds.min} max={bounds.max} popoverId={`${baseId}-w-${id.replace(/[^\w-]/g, '_')}`}
      onBegin={() => beginResize(id)} onDraft={(w) => draftResize(id, w)} onCommit={(w) => commitResize(id, w)}
      fit={() => fitResize(id, bounds)} labels={labels}
    />
  );

  const floors = fixedOn ? [
    ...(selectable ? ['var(--uix-selcol-w)'] : []),
    ...(idColumn ? [setPx(idKey) ?? columnFloor(idColumn.width, idColumn.minWidth, undefined)] : []),
    ...shown.map((column) => setPx(column.id) ?? columnFloor(column.width, column.minWidth, column.className)),
    ...(hasActions ? [actionsCol] : []),
  ] : [];
  const sum = (parts: readonly string[]) => (parts.length === 1 ? parts[0] : `calc(${parts.join(' + ')})`);
  // Resized, with no column to take the slack: the table is as wide as its columns, so a column a
  // person narrows gets narrower, instead of the slack spreading over every column again.
  const exact = resizeOn && Object.keys(sized).length > 0 && !slackTaker(sized, null);
  const colWidths = exact ? [
    ...(selectable ? ['var(--uix-selcol-w)'] : []),
    ...(idColumn ? [setPx(idKey) ?? idColumn.width!] : []),
    ...shown.map((column) => setPx(column.id) ?? column.width ?? columnFloor(undefined, column.minWidth, column.className)),
    ...(hasActions ? [actionsCol] : []),
  ] : [];
  const tableStyle = fixedOn && floors.length
    ? { minWidth: sum(floors), ...(exact ? { width: sum(colWidths) } : {}) }
    : undefined;

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
    const rowSelected = isSelected(rowId);
    return (
      <WorkspaceRow<T>
        key={rowId} row={row} rowId={rowId} rowLabel={rowLabel} columns={columns} idColumn={idColumn} getRowProps={getRowProps}
        selectable={selectable} selected={rowSelected} selectDisabled={!rowSelected && atCap}
        hasActions={hasActions} actions={actionsByRow[index]} actionsDisabled={actionsDisabled} lazyRowActions={lazyRowActions} ladder={ladder} ladderOn={ladderOn}
        selectRowLabel={selectRowLabel} openLabel={openLabel}
        getRowActions={actionPanelTrigger ? getRowActions : undefined} panelTitle={panelLabels.title}
        marked={nav || selectionKeys || windowing != null || peekRowId !== undefined} ariaRowIndex={windowed ? index + 2 : undefined}
        nav={nav} tabStop={tabStop === rowId} handlers={handlers}
      />
    );
  };
  /** A row on its way out: as it was, but not selected, with no actions and out of the row model. */
  const renderLeavingRow = (row: T) => {
    const rowId = getRowId(row);
    return (
      <WorkspaceRow<T>
        key={rowId} row={row} rowId={rowId} rowLabel={rowLabel} columns={columns} idColumn={idColumn} getRowProps={getRowProps}
        selectable={selectable} selected={false} selectDisabled
        hasActions={hasActions} actions={null} actionsDisabled={false} ladder={ladder} ladderOn={ladderOn}
        selectRowLabel={selectRowLabel} openLabel={openLabel}
        marked={false} nav={false} tabStop={false} handlers={handlers}
      />
    );
  };
  const indexById = useMemo(() => new Map(ids.map((rowId, index) => [rowId, index])), [ids]);
  // A body whose rows are mostly replaced (a new page, filter, sort key's first answer, saved view)
  // is a new list, not a changed one: remount it so nothing enters or leaves. A few rows arriving
  // or leaving, or the same rows in a new order, animate.
  const motion = useRef<{ ids: readonly string[]; generation: number }>({ ids, generation: 0 });
  if (motion.current.ids !== ids) {
    const before = new Set(motion.current.ids);
    const kept = ids.reduce((count, rowId) => count + (before.has(rowId) ? 1 : 0), 0);
    const changed = ids.length - kept + (before.size - kept);
    const replaced = before.size > 0 && ids.length > 0 && (kept === 0 || changed > MOTION_ROW_LIMIT);
    motion.current = { ids, generation: motion.current.generation + (replaced ? 1 : 0) };
  }
  const motionGeneration = motion.current.generation;

  let tbody: ReactNode;
  if (groups) {
    let offset = 0;
    tbody = groups.map((group, groupIndex) => {
      const first = offset;
      offset += group.rows.length;
      const open = !collapsed.has(group.id);
      const name = group.name ?? textOf(group.label) ?? group.id;
      const groupIds = ids.slice(first, first + group.rows.length);
      const on = groupIds.filter(isSelected).length;
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
                <span className="uix-data-workspace__group-count" id={countId}>{fillLabel(countLabel(labels.groupCount, count, locale, labels.groupCountOne), { count })}</span>
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
    tbody = windowed || !rowMotion ? (
      <tbody>
        {virtual && start > 0 && spacer(virtual.padTop, 'pad-top')}
        {start > 0 && start % 2 === 0 && spacer(0, 'pad-zebra')}
        {mountedRows.map((row, at) => renderRow(row, start + at))}
        {virtual && virtual.padBottom > 0 && spacer(virtual.padBottom, 'pad-bottom')}
      </tbody>
    ) : (
      // Row motion (HAR-2755): a row a live update adds rises in, a row a bulk action removes fades
      // out while the rows after it glide up, a re-sort glides. A new page, filter or view that
      // replaces most rows remounts the body instead (`motionGeneration`), so it swaps at once.
      <MotionList<T>
        key={motionGeneration} as="tbody" items={rows} getKey={getRowId} onExited={onRowsExited}
        renderItem={(row, { exiting }) => {
          const index = exiting ? undefined : indexById.get(getRowId(row));
          return index === undefined ? renderLeavingRow(row) : renderRow(row, index);
        }}
      />
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
        density={density} zebra={zebra} pinnedCol={frozen} pinnedActions={hasActions && !cards && !actionsTooWide} fixed={fixedOn || undefined} style={tableStyle}
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
            {idColumn && <col style={(setPx(idKey) ?? idColumn.width) ? { width: setPx(idKey) ?? idColumn.width } : undefined} />}
            {/* A flex column (uix-col--flex) takes the slack; every other column holds its width or its floor. */}
            {shown.map((column) => {
              const width = setPx(column.id) ?? column.width ?? (isFlex(column.className) ? undefined : columnFloor(undefined, column.minWidth, column.className));
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
            {idColumn && (() => {
              const grip = resizeOn && idColumn.resizable !== false && idKey != null
                ? resizer(idKey, textOf(idColumn.header) ?? idKey, resizeBounds(idColumn.minWidth, undefined, ID_MIN))
                : undefined;
              const keyAttrs = resizeOn && idKey != null ? { 'data-uix-col-key': idKey } : {};
              // a sortable id header is a sortable data column's header (HAR-2631)
              return idColumn.sortable && idSortColumn
                ? <Th scope="col" data-col={ladderOn ? 'id' : undefined} {...keyAttrs} {...sortProps(idSortColumn, true)} resizeHandle={grip}>{idColumn.header}</Th>
                : <Th scope="col" data-col={ladderOn ? 'id' : undefined} {...keyAttrs} resizeHandle={grip}>{idColumn.header}</Th>;
            })()}
            {columns.map((column) => {
              // fixed layout: the <col> holds the width and the table the floors
              const style = !fixedOn && (column.width || column.minWidth) ? { width: column.width, minWidth: column.minWidth } : undefined;
              // a column the ladder hides has no grip, and a resize does not hold its width
              const shownNow = !hiddenBy(ladder, column.priority);
              const grip = resizeOn && shownNow && column.resizable !== false
                ? resizer(column.id, column.label ?? textOf(column.header) ?? column.id, resizeBounds(column.minWidth, column.className, COLUMN_WIDTH_MIN))
                : undefined;
              return (
                <Th
                  key={column.id} scope="col" className={cellClasses(column)} style={style}
                  {...(resizeOn && shownNow ? { 'data-uix-col-key': column.id } : {})}
                  {...sortProps(column, column.sortable === true)}
                  {...ladderAttrs(ladderOn, column, false)}
                  resizeHandle={grip}
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
      {/* Only with getRowActions: a workspace without it renders as before (no dialog in its markup). */}
      {getRowActions != null && actionHost.element}
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
  /** The actions cell is inert: the bulk bar acts on the selection. */
  actionsDisabled: boolean;
  lazyRowActions?: (row: T, context: DataWorkspaceRowActionsContext) => ReactNode;
  ladder: DataWorkspaceRowActionsContext['ladder'];
  ladderOn: boolean;
  selectRowLabel: string;
  openLabel: string;
  /** The action panel's ⋯ button, for a row with an enabled action (`getRowActions`, with `actionPanelTrigger`). */
  getRowActions?: (row: T) => readonly ActionPanelAction[] | null | undefined;
  /** The ⋯ button's name: the panel's title, "Actions for {name}". */
  panelTitle?: string;
  /** `data-uix-row-id` on the row: for the keyboard model, the windowing's measurement and the way back from a Peek. */
  marked: boolean;
  ariaRowIndex?: number;
  nav: boolean;
  tabStop: boolean;
  handlers: RowHandlers;
  /** Set by MotionList (HAR-2755): the row's key, and while it leaves, the exit marker and aria-hidden. */
  'data-uix-key'?: string;
  'data-uix-exiting'?: string;
  'aria-hidden'?: boolean;
}

/**
 * One body row. Memoised: a selection change re-renders the rows whose state changed, not every
 * row, as long as the product keeps `columns`, `idColumn`, `rowActions` and `getRowProps` stable
 * (`useMemo` / `useCallback`).
 */
function WorkspaceRowInner<T>({
  row, rowId, rowLabel, columns, idColumn, getRowProps, selectable, selected, selectDisabled, hasActions, actions, actionsDisabled, lazyRowActions, ladder, ladderOn,
  selectRowLabel, openLabel, getRowActions, panelTitle, marked, ariaRowIndex, nav, tabStop, handlers,
  'data-uix-key': motionKey, 'data-uix-exiting': motionExiting, 'aria-hidden': motionHidden,
}: WorkspaceRowProps<T>) {
  const renderedActions = useMemo(() => lazyRowActions ? lazyRowActions(row, { ladder, compact: ladder === 'priority-mid' }) : actions,
    [lazyRowActions, row, ladder, actions]);
  // the row's name: its id as shown, else the product's words for it, else (last) its key
  const text = idColumn?.text(row) ?? rowLabel?.(row) ?? rowId;
  const extra = getRowProps?.(row);
  // The ⋯ button only where the row has something to run.
  const panelTrigger = useMemo(() => getRowActions != null && (getRowActions(row) ?? []).some((action) => !action.disabled), [getRowActions, row]);
  const navProps = nav ? {
    tabIndex: tabStop ? 0 : -1,
    onKeyDown: (event: ReactKeyboardEvent<HTMLTableRowElement>) => { extra?.onKeyDown?.(event); if (!event.defaultPrevented) handlers.key(rowId, event); },
    onClick: (event: ReactMouseEvent<HTMLTableRowElement>) => { extra?.onClick?.(event); if (!event.defaultPrevented) handlers.click(rowId, event); },
    onFocus: (event: ReactFocusEvent<HTMLTableRowElement>) => { extra?.onFocus?.(event); handlers.focus(rowId); },
    onBlur: (event: ReactFocusEvent<HTMLTableRowElement>) => { extra?.onBlur?.(event); handlers.blur(rowId, event); },
  } : {};
  return (
    <Tr
      selected={selected} data-uix-row-id={marked ? rowId : undefined} aria-rowindex={ariaRowIndex} {...extra} {...navProps}
      data-uix-key={motionKey} data-uix-exiting={motionExiting} aria-hidden={motionHidden}
    >
      {selectable && (
        <td className="uix-table__selcell" data-col={ladderOn ? 'select' : undefined}>
          <Checkbox
            aria-label={fillLabel(selectRowLabel, { label: text })} checked={selected} disabled={selectDisabled}
            onClick={(event) => handlers.toggle(rowId, (event.currentTarget as HTMLInputElement).checked, event.shiftKey)}
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
        <Td key={column.id} className={cellClasses(column)} {...ladderAttrs(ladderOn, column, true)}>
          {cellContent(column, row)}
        </Td>
      ))}
      {hasActions && (
        <ActionsCell disabled={actionsDisabled} data-col={ladderOn ? 'actions' : undefined}>
          {renderedActions}
          {panelTrigger && (
            <Button
              size="sm" variant="ghost" icon className="uix-data-workspace__panel-trigger" aria-haspopup="dialog"
              aria-label={fillLabel(panelTitle ?? 'Actions for {name}', { name: text })} shortcutId={ACTION_PANEL_SHORTCUT_ID}
              onClick={(event) => handlers.openActions(rowId, event.currentTarget)}
            >
              <MoreHorizontalIcon size="sm" aria-hidden="true" />
            </Button>
          )}
        </ActionsCell>
      )}
    </Tr>
  );
}
const WorkspaceRow = memo(WorkspaceRowInner) as typeof WorkspaceRowInner;

/**
 * A row's actions cell; `disabled` makes it inert while the bulk bar acts on the selection
 * (Carbon's batch mode). `inert` is set on the element directly: React 18 drops a boolean
 * `inert` prop and React 19 reads `""` as false. Focus inside it moves to the row's checkbox
 * first, so it is not dropped on the page.
 */
function ActionsCell({ disabled, children, ...props }: { disabled: boolean; children?: ReactNode; 'data-col'?: string }) {
  const ref = useRef<HTMLTableCellElement>(null);
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!disabled) { el.removeAttribute('inert'); return; }
    if (el.contains(document.activeElement)) el.closest('tr')?.querySelector<HTMLElement>('td.uix-table__selcell input')?.focus({ preventScroll: true });
    el.setAttribute('inert', '');
  }, [disabled]);
  // RowActions' own cell (`uix-table__actions`), with a ref
  return <td ref={ref} className="uix-table__actions" data-uix-disabled={disabled ? '' : undefined} {...props}>{children}</td>;
}

/** The record-id cell: the id opens a peek and ↗ the record; or the whole id is the record's link. */
function IdCell<T>({ row, text, idColumn, openLabel }: { row: T; text: string; idColumn: DataWorkspaceIdColumn<T>; openLabel: string }) {
  const rich = idColumn.render ? <span className="uix-data-workspace__id-text">{idColumn.render(row)}</span> : null;
  // plain text in its own box, so a fixed-width id column ends it in an ellipsis
  const label = <span className="uix-data-workspace__id-label">{text}</span>;
  const arrow = idColumn.href && renderUixLink(idColumn.renderLink, {
    href: idColumn.href(row), className: 'uix-data-workspace__open', 'aria-label': fillLabel(openLabel, { label: text }),
    children: <ArrowUpRight />,
  });
  if (!idColumn.onPeek && idColumn.href && idColumn.linkId) {
    return (
      <span className="uix-data-workspace__id">
        {renderUixLink(idColumn.renderLink, {
          href: idColumn.href(row), className: 'uix-id-cell__btn uix-data-workspace__id-link',
          children: <>{rich ?? label}<ArrowUpRight /></>,
        })}
      </span>
    );
  }
  return (
    <span className="uix-data-workspace__id">
      {idColumn.onPeek
        ? <button type="button" className="uix-id-cell__btn" aria-haspopup="dialog" onClick={() => idColumn.onPeek?.(row)}>{rich ?? label}</button>
        : rich ?? <span className="uix-cell-strong uix-data-workspace__id-label">{text}</span>}
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
function PopoverButton({ id, label, name, title, variant, children }: { id: string; label: ReactNode; name?: string; title?: string; variant: 'secondary' | 'ghost'; children: (close: () => void) => ReactNode }) {
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
      <Popover id={id} anchor={anchor} role="dialog" aria-label={title ?? name ?? (typeof label === 'string' ? label : undefined)}>
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
