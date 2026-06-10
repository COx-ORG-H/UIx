'use client';
/* @uix registry item — ported from @itsmx/shared-ui/src/data-table.tsx */

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
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

  const table = useReactTable<TData>({
    data: props.data,
    columns: effectiveColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel<TData>(),
    getSortedRowModel: getSortedRowModel<TData>(),
    enableMultiSort: true,
    // TanStack's default isMultiSortEvent is (e) => e.shiftKey — exactly
    // the behavior design-system.md § Tables — Sorting specifies, so we
    // don't override.
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  const rowPad = ROW_PADDING_BY_DENSITY[density];
  const cellPad = CELL_PADDING_BY_DENSITY[density];

  return (
    <div
      className={cn('overflow-x-auto rounded', 'border border-uix-line', props.className)}
      data-surface={props.surface_key}
      data-density={density}
    >
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
                    )}
                    style={{ color: 'var(--uix-text-hushed)' }}
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
                colSpan={effectiveColumns.length}
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
                  {effectiveColumns.map((col, j) => (
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
                colSpan={effectiveColumns.length}
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
    </div>
  );
}
