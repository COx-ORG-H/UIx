'use client';
/* @hx registry item — ported from @itsmx/shared-ui/src/data-table-toolbar.tsx */

import { Columns3, Plus, Rows2, Rows3, Rows4, Save, Search, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import type { DataTableDensity } from './data-table';
import type { FilterValue } from './filter-popover';
import { cn } from './utils';

/**
 * CUS-07 Phase 2 — universal table toolbar primitive per
 * Docs/design-system.md § Tables — Toolbar.
 *
 * Layout (left → right):
 *   1. Saved-view dropdown   (consumer-provided slot — see <SavedViewDropdown/>)
 *   2. Filter chip row       (rendered here from `filters` map)
 *   3. Spacer
 *   4. Search input          (keyboard: Mod+/ focuses)
 *   5. Column visibility menu (consumer-provided slot — see <ColumnVisibilityMenu/>)
 *   6. Density toggle        (rendered here; 3-mode Rows4/Rows3/Rows2)
 *   7. Save / Save as        (consumer-provided slot)
 *
 * Purely presentational. The toolbar takes `filters` + handlers and
 * emits change events. Filter popovers are opened by clicking the
 * "+ Add filter" affordance or a chip — the consumer mounts the
 * <FilterPopover/> via an anchor + open-state managed here through
 * the `onAddFilter(column_id)` / `onEditFilter(column_id)` callbacks.
 *
 * Keyboard:
 *   - Mod+/   focus the search input from anywhere on the page
 *   - Esc     when search is focused, clears the query
 *   - f       open the column picker for adding a new filter
 *             (only when no editable is focused; the consumer wires
 *             this through its own keyboard-shortcut system
 *             to avoid trapping characters in inputs)
 */

export type ToolbarFilterEntry = {
  readonly column_id: string;
  /** Resolver-passed column label (for chip rendering). */
  readonly label: ReactNode;
  /** Pre-formatted value display ("New, Assigned" / "≥ 4h ago"). */
  readonly displayValue: ReactNode;
  readonly value: FilterValue;
};

export interface DataTableToolbarProps {
  /** Required so saved-views can be keyed; matches the DataTable's surface_key. */
  surface_key: string;
  /** Resolver-passed search input placeholder. */
  searchPlaceholder?: string;
  /** Current search query. */
  search: string;
  onSearchChange: (q: string) => void;
  /** Active filters keyed by column_id. */
  filters: ReadonlyArray<ToolbarFilterEntry>;
  /** Clicked when the user removes a chip. */
  onRemoveFilter: (column_id: string) => void;
  /** Clicked when the user clicks the chip body — reopens the popover. */
  onEditFilter: (column_id: string) => void;
  /** Clicked on the "+ Add filter" affordance. Consumer renders a column picker. */
  onAddFilter: () => void;
  /** Density state — controlled. */
  density: DataTableDensity;
  onDensityChange: (next: DataTableDensity) => void;
  /** Slot for the saved-view dropdown (consumer-supplied). */
  savedViewSlot?: ReactNode;
  /** Slot for the column-visibility menu (consumer-supplied). */
  columnVisibilitySlot?: ReactNode;
  /** Slot for save / save-as overflow (consumer-supplied). */
  saveSlot?: ReactNode;
  /**
   * When the current view diverges from its source, the consumer sets
   * this to true to surface a "Save changes" affordance inline.
   */
  hasUnsavedChanges?: boolean;
  /** Fires when "Save changes" is clicked. */
  onSaveChanges?: () => void;
  /** Resolver-passed labels. */
  labels?: Partial<DataTableToolbarLabels>;
  className?: string;
}

export interface DataTableToolbarLabels {
  search_placeholder: string;
  add_filter: string;
  remove_filter: string;
  density_compact: string;
  density_standard: string;
  density_comfortable: string;
  save_changes: string;
  columns_menu: string;
}

const DEFAULT_LABELS: DataTableToolbarLabels = {
  search_placeholder: 'Search…',
  add_filter: 'Add filter',
  remove_filter: 'Remove filter',
  density_compact: 'Compact',
  density_standard: 'Standard',
  density_comfortable: 'Comfortable',
  save_changes: 'Save changes',
  columns_menu: 'Columns',
};

// -- search hotkey (Mod+/) ---------------------------------------------

const isModSlashEvent = (e: KeyboardEvent): boolean => (e.metaKey || e.ctrlKey) && e.key === '/';

export function DataTableToolbar({
  surface_key,
  searchPlaceholder,
  search,
  onSearchChange,
  filters,
  onRemoveFilter,
  onEditFilter,
  onAddFilter,
  density,
  onDensityChange,
  savedViewSlot,
  columnVisibilitySlot,
  saveSlot,
  hasUnsavedChanges,
  onSaveChanges,
  labels: providedLabels,
  className,
}: DataTableToolbarProps) {
  const labels = { ...DEFAULT_LABELS, ...providedLabels };
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isModSlashEvent(e)) return;
      const target = e.target as unknown;
      // Don't trap when the user is already typing somewhere editable
      // — the binding is "focus search from elsewhere", not "swallow /".
      const el = target instanceof HTMLElement ? target : null;
      const tag = el?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' || tag === 'textarea' || el?.getAttribute('contenteditable') === 'true';
      if (isEditable && el !== searchRef.current) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 rounded-md border p-2', className)}
      style={{
        background: 'rgb(var(--surface))',
        borderColor: 'var(--border)',
      }}
      data-surface={surface_key}
      role="toolbar"
      aria-label="Table toolbar"
    >
      {/* Saved-view dropdown slot */}
      {savedViewSlot ? <div className="flex-shrink-0">{savedViewSlot}</div> : null}

      {/* Filter chips */}
      <div
        className="flex flex-wrap items-center gap-1"
        // biome-ignore lint/a11y/useSemanticElements: <fieldset> imposes form styling we don't want; ARIA role="group" with aria-label is the documented headless equivalent.
        role="group"
        aria-label="Active filters"
      >
        {filters.map((f) => (
          <span
            key={f.column_id}
            className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: 'var(--border-strong)' }}
            data-filter-column={f.column_id}
          >
            <button
              type="button"
              onClick={() => onEditFilter(f.column_id)}
              className="inline-flex items-center gap-1 truncate"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              <span className="font-medium">{f.label}:</span>
              <span style={{ color: 'rgb(var(--text-hushed))' }}>{f.displayValue}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemoveFilter(f.column_id)}
              aria-label={`${labels.remove_filter} ${f.column_id}`}
              className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center"
              style={{ color: 'rgb(var(--text-hushed))' }}
            >
              <X size={10} strokeWidth={2} />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={onAddFilter}
          className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs"
          style={{
            borderColor: 'var(--border)',
            color: 'rgb(var(--text-hushed))',
          }}
        >
          <Plus size={10} strokeWidth={2} aria-hidden="true" />
          {labels.add_filter}
        </button>
      </div>

      {/* Spacer */}
      <span className="grow" />

      {/* Search */}
      <div className="relative flex-shrink-0" style={{ width: 'min(280px, 100%)' }}>
        <Search
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
          style={{ color: 'rgb(var(--text-hushed))' }}
        />
        <input
          ref={searchRef}
          type="search"
          value={search}
          placeholder={searchPlaceholder ?? labels.search_placeholder}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && search) {
              e.preventDefault();
              onSearchChange('');
            }
          }}
          className="block h-8 w-full rounded-md border pr-2 pl-7 text-sm"
          style={{
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--text-primary))',
            borderColor: 'var(--border-strong)',
          }}
          aria-label={labels.search_placeholder}
        />
      </div>

      {/* Column visibility slot */}
      {columnVisibilitySlot ? <div className="flex-shrink-0">{columnVisibilitySlot}</div> : null}

      {/* Density toggle */}
      <fieldset
        aria-label="Row density"
        className="inline-flex flex-shrink-0 items-center rounded-md border"
        style={{ borderColor: 'var(--border-strong)' }}
        role="radiogroup"
      >
        <DensityButton
          density="compact"
          active={density === 'compact'}
          label={labels.density_compact}
          onClick={() => onDensityChange('compact')}
          icon={<Rows4 size={14} strokeWidth={1.75} aria-hidden="true" />}
        />
        <DensityButton
          density="standard"
          active={density === 'standard'}
          label={labels.density_standard}
          onClick={() => onDensityChange('standard')}
          icon={<Rows3 size={14} strokeWidth={1.75} aria-hidden="true" />}
        />
        <DensityButton
          density="comfortable"
          active={density === 'comfortable'}
          label={labels.density_comfortable}
          onClick={() => onDensityChange('comfortable')}
          icon={<Rows2 size={14} strokeWidth={1.75} aria-hidden="true" />}
        />
      </fieldset>

      {/* Save changes — inline when diverged */}
      {hasUnsavedChanges && onSaveChanges ? (
        <button
          type="button"
          onClick={onSaveChanges}
          className="inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-md px-3 text-xs"
          style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--accent-fg))' }}
        >
          <Save size={12} strokeWidth={2} aria-hidden="true" />
          {labels.save_changes}
        </button>
      ) : null}

      {/* Save / Save-as overflow slot */}
      {saveSlot ? <div className="flex-shrink-0">{saveSlot}</div> : null}
    </div>
  );
}

function DensityButton({
  density,
  active,
  label,
  onClick,
  icon,
}: {
  density: DataTableDensity;
  active: boolean;
  label: ReactNode;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      // biome-ignore lint/a11y/useSemanticElements: native <input type="radio"> would force a separate visible label / hide the icon; ARIA radio on a button preserves the icon-only visual treatment.
      role="radio"
      aria-checked={active}
      aria-label={typeof label === 'string' ? label : undefined}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center"
      style={{
        background: active ? 'rgb(var(--bg-hover))' : 'transparent',
        color: active ? 'rgb(var(--text-primary))' : 'rgb(var(--text-hushed))',
      }}
      data-density={density}
      title={typeof label === 'string' ? label : undefined}
    >
      {icon}
      <Columns3 className="hidden" aria-hidden="true" />
    </button>
  );
}
