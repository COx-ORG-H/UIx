"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { isFilterEmpty, summarizeFilter } from '../filter-model.js';
import type { FilterField, FilterValue, SummarizeFilterOptions } from '../filter-model.js';
import { useResolvedFilterLabels } from '../hooks/useResolvedFilterLabels.js';
import { BusyRegion } from './BusyRegion.js';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
import { Chip } from './Chip.js';
import { FilterEditor } from './FilterEditor.js';
import { Menu, MenuItem } from './Menu.js';
import { Pagination } from './Pagination.js';
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
}

export interface DataWorkspaceSort { columnId: string; direction: 'ascending' | 'descending' }

/** The record-id column: the first column, the row's way into its record. */
export interface DataWorkspaceIdColumn<T> {
  header: ReactNode;
  /** The id as shown, e.g. "INC-20418". Also names the row's checkbox and ↗ button. */
  text: (row: T) => string;
  /** The id button opens a peek of the record. */
  onPeek?: (row: T) => void;
  /** The ↗ link goes to the full record. */
  href?: (row: T) => string;
  renderLink?: UixRenderLink;
}

export type DataWorkspacePagination =
  | { mode: 'offset'; page: number; pageSize: number; total: number; onPageChange: (page: number) => void; pageSizes?: readonly number[]; onPageSizeChange?: (size: number) => void }
  | { mode: 'cursor'; hasPrevious: boolean; hasNext: boolean; onFirst?: () => void; onPrevious: () => void; onNext: () => void; summary?: ReactNode; pageSize?: number; pageSizes?: readonly number[]; onPageSizeChange?: (size: number) => void };

export interface DataWorkspaceProps<T> extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Names the workspace region and the table. */
  label: string;
  rows: readonly T[];
  getRowId: (row: T) => string;
  columns: readonly DataWorkspaceColumn<T>[];
  idColumn?: DataWorkspaceIdColumn<T>;
  sort?: DataWorkspaceSort | null;
  onSortChange?: (sort: DataWorkspaceSort | null) => void;
  /** The selected row ids. Kept by id, so a refresh or a new page keeps them. */
  selection?: ReadonlySet<string>;
  onSelectionChange?: (selection: Set<string>) => void;
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
  /**
   * Toolbar: the search field. Ctrl/⌘ + / focuses it from inside the workspace, or from the page
   * when nothing has focus and this is the page's first workspace.
   */
  search?: { value: string; onChange: (value: string) => void; label?: string; placeholder?: string };
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
  };
  /** Toolbar: the saved-view trigger, named by the current view, opening a `SavedViewMenu`. */
  savedViews?: { current: ReactNode; menu: SavedViewMenuProps };
  /** Toolbar: the View button, opening a `ViewMenu` (columns, density). */
  viewMenu?: ViewMenuProps;
  /** The view differs from its saved version: Save changes and Save as show. */
  viewChanged?: boolean;
  onSaveView?: () => void;
  onSaveViewAs?: () => void;
  /** Toolbar: a maximize toggle; Escape restores, unless an open popover or menu takes it first. */
  maximized?: boolean;
  onMaximizedChange?: (maximized: boolean) => void;
  /** Toolbar: the product's own actions at the end ("New incident"). */
  toolbarEnd?: ReactNode;
  pagination?: DataWorkspacePagination;
  /** `loading`: the first load (skeleton rows). `error`: with `onRetry`. */
  status?: 'ready' | 'loading' | 'error';
  /** A refetch (filter, sort, page, saved view): the rows stay under `TableWrap refreshing`. */
  refreshing?: boolean;
  onRetry?: () => void;
  labels?: Partial<DataWorkspaceLabels>;
}

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

/**
 * The generic presentation half of a product's data table (HAR-1388; TENSOR `data-table.tsx`,
 * MOTUS `UixDataWorkspace.tsx`; UIx ADR-0005). Composes the kit's pieces in one order: saved
 * view · Save changes / Save as (when the view changed) · filter chips and "+ Filter" ·
 * search (Ctrl/⌘ + /) · View · maximize · the product's actions; a `Table` with a record-id cell (id → peek, ↗ → record),
 * selection with Shift-click ranges, a frozen row-actions column and a `BulkBar`; an "x–y of N"
 * footer with rows per page and `Pagination` (offset or cursor); first-load, empty,
 * filtered-empty and error states, and a refetch that keeps the rows. Prop-driven: the product
 * keeps its surface registry, URL state, data fetching and permissions.
 */
export function DataWorkspace<T>({
  label, rows, getRowId, columns, idColumn, sort, onSortChange, selection, onSelectionChange, bulkActions, rowActions,
  getRowProps, density, search, filters, savedViews, viewMenu, viewChanged = false, onSaveView, onSaveViewAs,
  maximized = false, onMaximizedChange, toolbarEnd, pagination, status = 'ready', refreshing = false, onRetry,
  labels: labelOverrides, className, ...props
}: DataWorkspaceProps<T>) {
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
      if (owner && root?.contains(owner)) return;
      if (root && openInside(root)) return;
      onMaximizedChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized, onMaximizedChange]);

  // An empty result belongs to the query that produced it: "Nothing matches" or "Nothing here yet"
  // is decided when the rows arrive, not from the filters on screen. A cleared filter therefore
  // keeps "Nothing matches" until its own rows arrive, also when the product turns `refreshing` on
  // a render later; while a refetch runs with nothing back yet, the last settled body stays, in a
  // BusyRegion (PR #168 review).
  const filtered = (filters ? filters.fields.some((field) => !isFilterEmpty(filters.values[field.id])) : false) || (search?.value.trim() ?? '') !== '';
  const [settled, setSettled] = useState<{ rows: readonly T[]; filtered: boolean }>({ rows, filtered });
  if (!refreshing && rows !== settled.rows) setSettled({ rows, filtered });
  const view = rows.length > 0 ? { rows, filtered } : refreshing || rows === settled.rows ? settled : { rows, filtered };
  const shownRows = view.rows;

  const ids = useMemo(() => shownRows.map(getRowId), [shownRows, getRowId]);
  const selected = selection ?? new Set<string>();
  const selectable = onSelectionChange != null;
  const onPage = ids.filter((rowId) => selected.has(rowId)).length;
  const toggleRow = (rowId: string, on: boolean, event: ReactMouseEvent | null) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    const from = anchor.current ? ids.indexOf(anchor.current) : -1;
    const to = ids.indexOf(rowId);
    if (event?.shiftKey && from >= 0 && to >= 0) {
      // Shift-click: every row between the anchor and this one takes this row's new state.
      for (let i = Math.min(from, to); i <= Math.max(from, to); i += 1) { if (on) next.add(ids[i]); else next.delete(ids[i]); }
    } else {
      if (on) next.add(rowId); else next.delete(rowId);
      anchor.current = rowId;
    }
    onSelectionChange(next);
  };
  const toggleAll = (on: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    for (const rowId of ids) { if (on) next.add(rowId); else next.delete(rowId); }
    onSelectionChange(next);
  };

  // Each row's actions, asked once per render; the column shows only when a row on the page has some.
  const actionsByRow = useMemo(() => (rowActions ? shownRows.map((row) => rowActions(row)) : []), [shownRows, rowActions]);
  const hasActions = actionsByRow.some((node) => node != null && node !== false);

  const activeFilters = filters ? filters.fields.filter((field) => !isFilterEmpty(filters.values[field.id])) : [];
  const searching = (search?.value.trim() ?? '') !== '';
  const clearAll = () => {
    for (const field of activeFilters) filters?.onChange(field.id, undefined);
    if (searching) search?.onChange('');
  };

  const sortFor = (column: DataWorkspaceColumn<T>) => (sort?.columnId === column.id ? sort.direction : 'none');
  const cycleSort = (column: DataWorkspaceColumn<T>) => {
    const current = sortFor(column);
    onSortChange?.(current === 'none' ? { columnId: column.id, direction: 'ascending' } : current === 'ascending' ? { columnId: column.id, direction: 'descending' } : null);
  };

  const toolbar = (
    <div className="uix-toolbar uix-data-workspace__toolbar" role="toolbar" aria-label={label}>
      {savedViews && (
        <PopoverButton id={`${id}-views`} label={savedViews.current} title={typeof savedViews.current === 'string' ? fillLabel(labels.savedView, { name: savedViews.current }) : undefined} variant="secondary">
          {(close) => <SavedViewMenu {...savedViews.menu} onSelect={(viewId) => { savedViews.menu.onSelect(viewId); close(); }} />}
        </PopoverButton>
      )}
      {/* Save sits with the view it saves, left of the spacer: appearing as the search changes, it
          must not move the search field under the person's fingers. */}
      {/* Secondary: saving a view is not the page's primary action (that is the product's, at the end). */}
      {viewChanged && onSaveView && <Button size="sm" variant="secondary" onClick={onSaveView}>{labels.saveView}</Button>}
      {viewChanged && onSaveViewAs && <Button size="sm" variant="ghost" onClick={onSaveViewAs}>{labels.saveViewAs}</Button>}
      {filters && <FilterChips filters={filters} labels={labels} baseId={id} />}
      <span className="uix-toolbar__spacer" />
      {search && (
        <SearchBar
          className="uix-data-workspace__search" landmark={false} label={search.label ?? labels.search} placeholder={search.placeholder ?? labels.searchPlaceholder}
          value={search.value} onValueChange={search.onChange} inputRef={searchRef}
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

  let body: ReactNode;
  if (status === 'loading') body = <LoadingState rows={6} label={labels.loading} className="uix-data-workspace__loading" />;
  else if (status === 'error') body = <ErrorState title={labels.error} action={onRetry && <Button size="sm" onClick={onRetry}>{labels.retry}</Button>} />;
  else if (shownRows.length === 0) {
    // The empty states sit in a BusyRegion too, so a refetch from one of them is busy at once.
    body = (
      <BusyRegion busy={refreshing} className="uix-data-workspace__state">
        {view.filtered
          ? <FilteredEmptyState title={labels.filteredEmpty} action={<Button size="sm" onClick={clearAll}>{labels.clearFilters}</Button>}>{labels.filteredEmptyDetail}</FilteredEmptyState>
          : <EmptyState title={labels.empty}>{labels.emptyDetail}</EmptyState>}
      </BusyRegion>
    );
  } else {
    body = (
      <TableWrap refreshing={refreshing} className="uix-data-workspace__table">
        {/* With selection, the checkbox and the id are both frozen (the id at the checkbox's width). */}
        <Table density={density} pinnedCol={idColumn != null} pinnedActions={hasActions} className={cx(selectable && idColumn && 'uix-data-workspace__grid--pin-id')} aria-label={label}>
          <thead>
            <tr>
              {selectable && (
                <th className="uix-table__selcol" scope="col">
                  <Checkbox aria-label={labels.selectAll} checked={onPage > 0 && onPage === ids.length} indeterminate={onPage > 0 && onPage < ids.length} onChange={(event) => toggleAll(event.currentTarget.checked)} />
                </th>
              )}
              {idColumn && <Th scope="col">{idColumn.header}</Th>}
              {columns.map((column) => (
                <Th
                  key={column.id} scope="col" className={column.align === 'end' ? 'uix-col--num' : undefined} style={column.width ? { width: column.width } : undefined}
                  sortable={column.sortable && onSortChange != null} sortDirection={sortFor(column)} onSort={() => cycleSort(column)}
                >
                  {column.header}
                </Th>
              ))}
              {hasActions && <th scope="col" className="uix-table__actions"><span className="uix-visually-hidden">{labels.rowActions}</span></th>}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((row, index) => {
              const rowId = ids[index];
              const text = idColumn?.text(row) ?? rowId;
              const isSelected = selected.has(rowId);
              return (
                <Tr key={rowId} selected={isSelected} {...getRowProps?.(row)}>
                  {selectable && (
                    <td className="uix-table__selcell">
                      <Checkbox
                        aria-label={fillLabel(labels.selectRow, { label: text })} checked={isSelected}
                        onClick={(event) => toggleRow(rowId, (event.currentTarget as HTMLInputElement).checked, event)}
                        onChange={() => {}}
                      />
                    </td>
                  )}
                  {idColumn && (
                    <Td className="uix-id-cell">
                      <span className="uix-data-workspace__id">
                        {idColumn.onPeek
                          ? <button type="button" className="uix-id-cell__btn" aria-haspopup="dialog" onClick={() => idColumn.onPeek?.(row)}>{text}</button>
                          : <span className="uix-cell-strong">{text}</span>}
                        {idColumn.href && renderUixLink(idColumn.renderLink, {
                          href: idColumn.href(row), className: 'uix-data-workspace__open', 'aria-label': fillLabel(labels.open, { label: text }),
                          children: <ArrowUpRight />,
                        })}
                      </span>
                    </Td>
                  )}
                  {columns.map((column) => <Td key={column.id} className={column.align === 'end' ? 'uix-col--num' : undefined}>{column.cell(row)}</Td>)}
                  {hasActions && <RowActions>{actionsByRow[index]}</RowActions>}
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </TableWrap>
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
      {body}
      {pagination && status === 'ready' && shownRows.length > 0 && <Footer pagination={pagination} labels={labels} rowCount={shownRows.length} />}
    </section>
  );
}

/** "x–y of N", rows per page, and the pager. */
function Footer({ pagination, labels, rowCount }: { pagination: DataWorkspacePagination; labels: DataWorkspaceLabels; rowCount: number }) {
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
        ? <Pagination mode="offset" page={pagination.page} pageCount={Math.max(1, Math.ceil(pagination.total / pagination.pageSize))} onChange={pagination.onPageChange} />
        : <Pagination mode="cursor" hasPrevious={pagination.hasPrevious} hasNext={pagination.hasNext} onFirst={pagination.onFirst} onPrevious={pagination.onPrevious} onNext={pagination.onNext} summary={pagination.summary} />}
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
  return <>{summarizeFilter(resolved.field, resolved.value, options)}</>;
}

/** An open popover, dialog or menu inside the workspace, which takes Escape before the workspace. */
function openInside(root: HTMLElement): boolean {
  try {
    if (root.querySelector(':popover-open')) return true;
  } catch { /* a browser without :popover-open */ }
  return root.querySelector('dialog[open], [aria-expanded="true"]') != null;
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
          {/* The add chip's markup on a plain button: Menu's trigger needs the click event,
              which Chip's onClick does not pass on. */}
          <Menu trigger={<button type="button" className="uix-chip uix-chip--add"><span className="uix-chip__icon" aria-hidden="true"><PlusIcon /></span><span className="uix-chip__label">{labels.addFilter}</span></button>}>
            {unset.map((field) => <MenuItem key={field.id} onSelect={() => edit(field, addRef.current)}>{field.label}</MenuItem>)}
          </Menu>
        </span>
      )}
      {set.length > 0 && <Button size="sm" variant="link" onClick={() => { for (const f of set) filters.onChange(f.id, undefined); }}>{labels.clearFilters}</Button>}
      <Popover id={popId} anchor={editing?.anchor ?? null} role="dialog" aria-label={editing?.field.label}>
        {editing && (
          <FilterEditor field={editing.field} value={draft} onValueChange={setDraft} onApply={(v) => finish(v)} onClear={() => finish(undefined)} />
        )}
      </Popover>
    </>
  );
}
