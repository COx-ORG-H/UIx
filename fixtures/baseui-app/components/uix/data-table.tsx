'use client';
/* @uix registry item — ported from @itsmx/shared-ui/src/data-table.tsx */

import {
  type ColumnDef,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Updater,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { type ReactNode, useState } from 'react';
import { getListSurface } from './list-surfaces';
import type { DataTableDensity } from './types';
import { cn } from './utils';

// Back-compat: DataTableDensity used to be declared here; re-export so
// existing `import { DataTableDensity } from './data-table'` keeps working.
export type { DataTableDensity } from './types';

/**
 * Per-column override passed in `DataTableProps.columnConfig`. Origin:
 * the consumer's column-customization layer — the parent resolves the
 * column surface keys at request time and hands the merged label /
 * visibility / order down here so the table stays a pure presentational
 * component (no DB / no tRPC import).
 *
 * Any field can be omitted; defaults fall back to the ColumnDef's
 * existing `header` for label, "visible" for visible, and the original
 * declaration order for order (stable).
 */
export interface DataTableColumnOverride {
  readonly label?: string;
  readonly visible?: boolean;
  readonly order?: number;
}

/**
 * Per-density paddings — KEPT IN SYNC with apps/web/lib/hooks/use-density
 * (the consumer wraps via useDensity()). Duplicated here so the primitive
 * is self-contained for tests + the admin/public apps.
 */
const ROW_PADDING_BY_DENSITY: Record<DataTableDensity, string> = {
  compact: 'py-1.5',
  standard: 'py-3',
  comfortable: 'py-[18px]',
};

const CELL_PADDING_BY_DENSITY: Record<DataTableDensity, string> = {
  compact: 'px-3 py-1.5',
  standard: 'px-4 py-3',
  comfortable: 'px-4 py-[18px]',
};

export interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  /**
   * TBL-01 — registration contract. When a `surface_key` is supplied:
   *   - the surface MUST be registered via registerListSurface() at
   *     module load time. The DataTable verifies registration in dev
   *     (warn via console.error; production silently allows so a
   *     missing surface registration is never user-facing).
   *   - column ids are checked against the surface's declared columns
   *     (warn-only — mismatch is a contract violation that CUS-07's
   *     saved-view system will fail loudly on, but doesn't break
   *     rendering).
   *
   * Backward compat: omitting surface_key is allowed for tests + the
   * pre-TBL-01 callers; they fall back to local-only rendering with no
   * saved-view / search integration.
   */
  surface_key?: string;

  /** Density per Docs/design-system.md § Tables. Default 'standard'. */
  density?: DataTableDensity;

  /** Render override for the empty data set. */
  empty?: ReactNode;
  /** Render override for the loading skeleton. */
  loading?: boolean;
  loadingRowCount?: number;
  /** Top-level error to display in place of the table body. */
  error?: string;
  /** Accessible label for the table region (must already be resolver-passed). */
  caption?: ReactNode;
  className?: string;
  /**
   * CUS-03: tenant-resolved column overrides keyed by column id.
   * When a column id matches a key here:
   *   - `label` replaces the header
   *   - `visible: false` removes the column from the rendered set
   *   - `order` re-positions the column (ascending; ties broken by
   *     original declaration order)
   */
  columnConfig?: Record<string, DataTableColumnOverride | undefined>;

  /**
   * Click handler for a row's primary action — pressing Enter while a
   * row is focused (or clicking the row) invokes this. Acts as the
   * stable entry point so the keyboard `Enter` binding from
   * design-system.md § Tables can route through here.
   */
  onRowClick?: (row: TData) => void;

  /**
   * Phase 4c — opt-in client-side pagination. When set, TanStack's
   * getPaginationRowModel is wired up (it is NOT included otherwise —
   * the no-pagination path is behaviorally identical to pre-4c) and a
   * footer bar renders below the table inside the bordered wrapper.
   * TanStack's autoResetPageIndex default clamps the page index when
   * the data set shrinks.
   */
  pagination?: {
    /** Rows per page. Default 25. */
    pageSize?: number;
    /** When provided, a native <select> page-size picker renders in the footer. */
    pageSizeOptions?: ReadonlyArray<number>;
    /** Resolver-passed labels — defaults are English-only. */
    labels?: {
      previous?: string;
      next?: string;
      rowsPerPage?: string;
      pageOf?: (page: number, pageCount: number) => string;
    };
  };

  /**
   * Phase 4c — opt-in row selection. `true` enables every row; a
   * predicate enables per-row (receives the row's original data).
   * When enabled, an internal checkbox column (id '__uix-select') is
   * PREPENDED to the rendered column set.
   */
  enableRowSelection?: boolean | ((row: TData) => boolean);
  /** Controlled selection state (TanStack RowSelectionState — ids → true). */
  rowSelection?: RowSelectionState;
  /**
   * Fires on every selection change with the next state AND the
   * resolved selected rows. Works in both controlled (`rowSelection`
   * provided) and uncontrolled (internal state) modes.
   */
  onRowSelectionChange?: (state: RowSelectionState, selectedRows: TData[]) => void;
  /** Passthrough to TanStack — stable row ids for selection across data changes. */
  getRowId?: (row: TData, index: number) => string;
  /** Resolver-passed labels for the selection checkboxes. */
  selectionLabels?: {
    selectAll?: string;
    selectRow?: (row: TData) => string;
  };

  /**
   * Phase 4c — sticky header row. Only does something inside a
   * height-constrained scroll container (combine with `maxHeight`, or
   * constrain the wrapper from outside). Adds an OPAQUE surface
   * background to each th — sticky cells over scrolled rows need a
   * non-transparent background.
   */
  stickyHeader?: boolean;
  /** Inline max-height (any CSS length) for the vertical scroll wrapper around the table. */
  maxHeight?: string;
}

/**
 * Derive a stable identifier for a column. Mirrors what TanStack does
 * internally so our pre-filter / pre-sort runs against the same key
 * the renderer uses. Returns '' for columns with neither id nor
 * accessorKey (rare; usually a misconfiguration in calling code).
 */
const idOf = <TData, TValue>(col: ColumnDef<TData, TValue>): string => {
  if (typeof col.id === 'string' && col.id.length > 0) return col.id;
  const accessor = (col as unknown as { accessorKey?: unknown }).accessorKey;
  if (typeof accessor === 'string') return accessor;
  return '';
};

const isDev = (): boolean => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') return true;
  return false;
};

/**
 * Universal DataTable per Docs/design-system.md § Tables (Universal
 * DataTable contract). One primitive consumed by every list view
 * across apps/web, apps/admin, apps/portal-public.
 *
 * v1 (TBL-01) ships:
 *   - registration contract (surface_key + column id checks)
 *   - density-aware row/cell padding
 *   - basic sort UI (asc/desc cycle on column header click)
 *   - columnConfig overrides from CUS-03 (label / visible / order)
 *   - empty/loading/error states wired to design tokens
 *   - row-click → onRowClick handler (keyboard Enter routes here)
 *
 * Phase 4c additions (all opt-in; omitting every new prop renders
 * identically to pre-4c):
 *   - client-side pagination (`pagination`) — getPaginationRowModel is
 *     only wired when requested; footer with prev/next, "Page X of Y",
 *     optional page-size select
 *   - row selection (`enableRowSelection`, controlled or uncontrolled)
 *     via a prepended internal checkbox column (id '__uix-select')
 *   - sticky header (`stickyHeader`) + vertical scroll cap (`maxHeight`)
 *     — sticky only does something inside a height-constrained scroll
 *     container
 *
 * Out of scope here (lands with CUS-07):
 *   - toolbar (saved-view dropdown, filter chips, search, density
 *     toggle, column-visibility menu, save/save-as)
 *   - typed filter popovers (7 kinds)
 *   - multi-column sort with Shift+click + numeric badges
 *   - virtualization > 500 rows (TanStack Virtual integration)
 *   - keyboard shortcuts (Mod+/ search focus, f / s / v / d)
 *
 * Callers that omit `surface_key` get a backward-compat rendering
 * without those extras — useful during the gradual migration of
 * existing pages.
 */
export function DataTable<TData, TValue = unknown>(
  props: DataTableProps<TData, TValue>,
): ReactNode {
  const density: DataTableDensity = props.density ?? 'standard';

  // TBL-01: warn on contract violations in dev. Production silently
  // tolerates so an unregistered surface is never a user-facing error.
  if (props.surface_key && isDev()) {
    const surface = getListSurface(props.surface_key);
    if (!surface) {
      // biome-ignore lint/suspicious/noConsole: dev-only contract warning, never reaches users
      console.error(
        `<DataTable surface_key="${props.surface_key}"> is not registered via registerListSurface(). See Docs/design-system.md § Tables (Registration contract).`,
      );
    } else {
      const declared = new Set(surface.columns.map((c) => c.id));
      for (const col of props.columns) {
        const id = idOf(col);
        if (id && !declared.has(id)) {
          // biome-ignore lint/suspicious/noConsole: dev-only contract warning
          console.error(
            `<DataTable surface_key="${props.surface_key}"> column "${id}" is not in the registered surface's columns. Declared: [${[...declared].join(', ')}].`,
          );
        }
      }
    }
  }

  // CUS-03: apply column overrides BEFORE handing to TanStack.
  const effectiveColumns: ColumnDef<TData, TValue>[] = (() => {
    if (!props.columnConfig) return props.columns;
    const annotated = props.columns.map((col, originalIndex) => ({
      col,
      cfg: props.columnConfig?.[idOf(col)],
      originalIndex,
    }));
    const visible = annotated.filter(({ cfg }) => cfg?.visible !== false);
    visible.sort((a, b) => {
      const aOrder = a.cfg?.order;
      const bOrder = b.cfg?.order;
      if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      if (aOrder !== undefined && bOrder === undefined) return -1;
      if (aOrder === undefined && bOrder !== undefined) return 1;
      return a.originalIndex - b.originalIndex;
    });
    return visible.map(({ col, cfg }) =>
      cfg?.label !== undefined ? { ...col, header: cfg.label } : col,
    );
  })();

  // Sort state — CUS-07 Phase 2 extends to multi-column via Shift+click.
  // TanStack honors the shift modifier in getToggleSortingHandler()
  // when `enableMultiSort` (default true) AND the click was Shift+click.
  // The priority badge (1, 2, ...) renders only when sorting.length > 1
  // per Docs/design-system.md § Tables — Sorting.
  const [sorting, setSorting] = useState<SortingState>([]);

  // 4c: pagination state — internal, seeded from props (default 25).
  // Only handed to TanStack when `pagination` is requested.
  const paginationProp = props.pagination;
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: paginationProp?.pageSize ?? 25,
  });

  // 4c: row selection — controlled (props.rowSelection) or uncontrolled
  // (internal state). Either way, onRowSelectionChange reports the next
  // state plus the resolved selected rows.
  const enableRowSelectionProp = props.enableRowSelection;
  const selectionEnabled =
    enableRowSelectionProp !== undefined && enableRowSelectionProp !== false;
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const rowSelectionState = props.rowSelection ?? internalRowSelection;
  const getRowIdProp = props.getRowId;
  const onRowSelectionChangeProp = props.onRowSelectionChange;
  const handleRowSelectionChange = (updater: Updater<RowSelectionState>): void => {
    const next = typeof updater === 'function' ? updater(rowSelectionState) : updater;
    if (props.rowSelection === undefined) setInternalRowSelection(next);
    if (onRowSelectionChangeProp) {
      // Resolve ids the same way TanStack does: getRowId when provided,
      // else the stringified top-level index (no subRows here).
      const idFor = getRowIdProp ?? ((_row: TData, index: number) => String(index));
      const selectedRows = props.data.filter((row, index) => next[idFor(row, index)] === true);
      onRowSelectionChangeProp(next, selectedRows);
    }
  };

  // 4c: internal selection checkbox column, PREPENDED when enabled.
  // Header checkbox covers the current page; indeterminate is set via a
  // ref callback (no React attribute exists for it). stopPropagation on
  // the cell checkbox keeps onRowClick rows from firing on toggle.
  const selectionLabels = props.selectionLabels;
  const selectionColumn: ColumnDef<TData, TValue> = {
    id: '__uix-select',
    enableSorting: false,
    header: ({ table }) => {
      const all = table.getIsAllPageRowsSelected();
      return (
        <input
          type="checkbox"
          checked={all}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !all;
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label={selectionLabels?.selectAll ?? 'Select all rows'}
          className="h-4 w-4 align-middle"
          style={{ accentColor: 'var(--uix-accent)' }}
        />
      );
    },
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
        aria-label={
          selectionLabels?.selectRow ? selectionLabels.selectRow(row.original) : 'Select row'
        }
        className="h-4 w-4 align-middle"
        style={{ accentColor: 'var(--uix-accent)' }}
      />
    ),
  };
  const tableColumns: ColumnDef<TData, TValue>[] = selectionEnabled
    ? [selectionColumn, ...effectiveColumns]
    : effectiveColumns;

  const table = useReactTable<TData>({
    data: props.data,
    columns: tableColumns,
    state: {
      sorting,
      ...(paginationProp ? { pagination: paginationState } : {}),
      ...(selectionEnabled ? { rowSelection: rowSelectionState } : {}),
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel<TData>(),
    getSortedRowModel: getSortedRowModel<TData>(),
    // 4c: the pagination row model is included ONLY when pagination is
    // requested — the no-props path keeps the exact pre-4c model chain.
    ...(paginationProp
      ? {
          getPaginationRowModel: getPaginationRowModel<TData>(),
          onPaginationChange: setPaginationState,
        }
      : {}),
    ...(selectionEnabled
      ? {
          // selectionEnabled guarantees the prop is `true` or a predicate
          // here; the predicate adapts TanStack's Row to the consumer's
          // plain-data signature.
          enableRowSelection:
            typeof enableRowSelectionProp === 'function'
              ? (row: Row<TData>) => enableRowSelectionProp(row.original)
              : true,
          onRowSelectionChange: handleRowSelectionChange,
        }
      : {}),
    ...(getRowIdProp ? { getRowId: getRowIdProp } : {}),
    enableMultiSort: true,
    // TanStack's default isMultiSortEvent is (e) => e.shiftKey — exactly
    // the behavior design-system.md § Tables — Sorting specifies, so we
    // don't override.
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  const rowPad = ROW_PADDING_BY_DENSITY[density];
  const cellPad = CELL_PADDING_BY_DENSITY[density];

  // 4c: pagination footer derivations. table.getState().pagination is
  // always present (TanStack default state), so reading it is safe even
  // when pagination isn't requested.
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageOf =
    paginationProp?.labels?.pageOf ??
    ((page: number, count: number) => `Page ${page} of ${count}`);
  const pagerBtnClass = cn(
    'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs',
    'border-uix-line-strong bg-uix-surface text-uix-text',
    'disabled:cursor-not-allowed disabled:opacity-50',
  );

  const tableEl = (
    <table className="w-full border-collapse text-sm">
        {props.caption ? (
          <caption
            className="px-4 py-2 text-left text-xs uppercase tracking-wider"
            style={{ color: 'var(--uix-text-hushed)' }}
          >
            {props.caption}
          </caption>
        ) : null}
        <thead>
          {headerGroups.map((group) => (
            <tr key={group.id} className="border-b border-uix-line">
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                const sortIndex = header.column.getSortIndex();
                const multi = sorting.length > 1 && sortIndex >= 0;
                return (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      cellPad,
                      'text-left text-xs uppercase tracking-wider font-medium',
                      canSort ? 'cursor-pointer select-none' : '',
                      props.stickyHeader ? 'sticky top-0 z-10' : '',
                    )}
                    style={
                      // 4c: sticky th needs an OPAQUE background — the
                      // default th is transparent and scrolled rows would
                      // show through it.
                      props.stickyHeader
                        ? { color: 'var(--uix-text-hushed)', background: 'var(--uix-surface)' }
                        : { color: 'var(--uix-text-hushed)' }
                    }
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    onKeyDown={
                      canSort
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              // Shift+Enter adds a secondary sort, matching the
                              // Shift+click behavior on the header.
                              header.column.toggleSorting(undefined, e.shiftKey);
                            }
                          }
                        : undefined
                    }
                    tabIndex={canSort ? 0 : undefined}
                    aria-sort={
                      sortDir === 'asc'
                        ? 'ascending'
                        : sortDir === 'desc'
                          ? 'descending'
                          : canSort
                            ? 'none'
                            : undefined
                    }
                    data-sort-index={multi ? sortIndex + 1 : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {sortDir === 'asc' ? (
                        <span aria-hidden="true">↑</span>
                      ) : sortDir === 'desc' ? (
                        <span aria-hidden="true">↓</span>
                      ) : null}
                      {multi ? (
                        <span
                          aria-label={`Sort priority ${sortIndex + 1}`}
                          className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[0.6rem] tabular-nums"
                          style={{
                            background: 'var(--uix-bg-hover)',
                            color: 'var(--uix-text-hushed)',
                          }}
                        >
                          {sortIndex + 1}
                        </span>
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {props.error ? (
            <tr>
              <td
                colSpan={tableColumns.length}
                role="alert"
                className={cn(cellPad, 'text-center text-sm')}
                style={{ color: 'var(--uix-danger)' }}
              >
                {props.error}
              </td>
            </tr>
          ) : props.loading ? (
            // Loading skeleton: rows at the current density's pitch.
            Array.from({ length: props.loadingRowCount ?? 3 }, (_, i) => `loading-row-${i}`).map(
              (rowKey) => (
                <tr key={rowKey} aria-busy="true" className="border-b border-uix-line">
                  {tableColumns.map((col, j) => (
                    <td
                      key={`${rowKey}-${(col.id as string | undefined) ?? `col-${j}`}`}
                      className={cn(cellPad)}
                    >
                      <span
                        className="block h-3 w-3/4 animate-pulse rounded"
                        style={{ background: 'var(--uix-border)' }}
                      />
                    </td>
                  ))}
                </tr>
              ),
            )
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={tableColumns.length}
                className={cn(cellPad, 'text-center text-sm')}
                style={{ color: 'var(--uix-text-hushed)' }}
              >
                {props.empty ?? 'No rows to show.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const original = row.original;
              const userOnRowClick = props.onRowClick;
              const onClick = userOnRowClick ? () => userOnRowClick(original) : undefined;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-uix-line',
                    'hover:bg-uix-hover',
                    onClick ? 'cursor-pointer' : '',
                  )}
                  onClick={onClick}
                  onKeyDown={
                    onClick
                      ? (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onClick();
                          }
                        }
                      : undefined
                  }
                  tabIndex={onClick ? 0 : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cn(cellPad, rowPad, 'align-top')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
  );

  return (
    <div
      className={cn('overflow-x-auto rounded', 'border border-uix-line', props.className)}
      data-surface={props.surface_key}
      data-density={density}
    >
      {props.maxHeight !== undefined ? (
        // 4c: vertical scroll wrapper — the height constraint stickyHeader
        // sticks inside. Inline styles by design (maxHeight is a runtime
        // value; no dynamic class names per the emission gate).
        <div style={{ maxHeight: props.maxHeight, overflowY: 'auto' }}>{tableEl}</div>
      ) : (
        tableEl
      )}

      {paginationProp ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-uix-line px-3 py-2">
          {paginationProp.pageSizeOptions ? (
            <label className="flex items-center gap-2 text-xs text-uix-hushed">
              {paginationProp.labels?.rowsPerPage ?? 'Rows per page'}
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-8 rounded-md border border-uix-line-strong bg-uix-surface px-2 text-xs tabular-nums text-uix-text"
              >
                {paginationProp.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-uix-hushed">
              {pageOf(currentPage, pageCount)}
            </span>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={pagerBtnClass}
            >
              {paginationProp.labels?.previous ?? 'Previous'}
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={pagerBtnClass}
            >
              {paginationProp.labels?.next ?? 'Next'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
