/* @uix registry item — ported from @itsmx/shared-ui/src/list-surfaces.ts */
/**
 * TBL-01 — Universal DataTable surface registry.
 *
 * Per Docs/design-system.md § Tables (Universal DataTable contract):
 * every list view in the platform registers a `surface_key` + the
 * `text_search_fields` (which column ids the toolbar search spans) +
 * its declared columns. Three things this registry buys us:
 *
 *   1. **Single source of truth.** CUS-07's toolbar (saved views,
 *      filter popovers, search) reads this registry to know what
 *      filterable columns exist per surface — without re-importing
 *      the page module.
 *   2. **Contract verification.** A unit test iterates the registry +
 *      asserts every entry has the required shape. Adding a new
 *      list view that forgets `surface_key` is a typecheck/test
 *      failure, not a runtime ambiguity.
 *   3. **Sharable-URL stability.** Filter params serialise into the
 *      URL keyed by `surface_key` + column id, so a URL with
 *      `?surface=incident.list&filter[state]=Open` is portable across
 *      the saved-view system.
 *
 * The registry is purely client-side (this module ships in
 * @itsmx/shared-ui) — the server-side `tenant.saved_views` table
 * (data-model.md) is keyed on the same `surface_key` so writes from
 * one client + reads from another stay in sync.
 *
 * Modules register through `registerListSurface(...)` at module-load
 * time (typically from a per-module `customization.ts` alongside the
 * field labels registered for CUS-02).
 */

/** Column metadata required for a list surface. Mirrors design-system.md § Tables. */
export interface ListSurfaceColumn {
  /** Stable column id (NOT the display label). Used in URL params + saved views + customization overrides. */
  readonly id: string;
  /** Human-readable default label. CUS-02 may override; the resolver wins. */
  readonly label: string;
  /** Filter UI kind for CUS-07's typed popover. */
  readonly filter_kind?:
    | 'enum'
    | 'text'
    | 'date'
    | 'numeric'
    | 'reference'
    | 'boolean'
    | 'multi_value';
  /** Whether this column is sortable in the universal toolbar. */
  readonly sortable?: boolean;
  /** Whether the column is visible by default for a new user. */
  readonly default_visible?: boolean;
  /** Default ordinal (lower = leftmost). Ties broken by declaration order. */
  readonly default_order?: number;
  /** Optional value set for `filter_kind: 'enum'` — the allowed values for the multi-select checklist. */
  readonly enum_values?: ReadonlyArray<string>;
}

/** Full registration metadata for a list surface. */
export interface ListSurface {
  /** Stable, dot-namespaced identifier. e.g. `orders.list`, `catalog.item.list`. */
  readonly key: string;
  /** Customization-resolved label for the surface itself (used by the breadcrumb / saved-view UI). */
  readonly label: string;
  /** Lucide icon name (kept as a string to avoid an icon-library dep here). Mirrors design-system.md § per-entity icon mapping. */
  readonly icon: string;
  /** Column ids the toolbar's text search spans. Must reference columns declared here. */
  readonly text_search_fields: ReadonlyArray<string>;
  /** Declared columns. Order is the declaration order; CUS-07 + customization may reorder. */
  readonly columns: ReadonlyArray<ListSurfaceColumn>;
  /**
   * Default density for this surface. Per design-system.md § Tables —
   * agent surfaces default to `compact`, most surfaces to `standard`,
   * end-user portal to `comfortable`.
   */
  readonly default_density?: 'compact' | 'standard' | 'comfortable';
}

const REGISTRY = new Map<string, ListSurface>();

/**
 * Register a list surface. Idempotent on the surface key: re-registering
 * the same key REPLACES the prior entry (useful for hot-reload + test
 * isolation; production never re-registers).
 *
 * Validates the declaration:
 *   1. `text_search_fields` MUST reference column ids that exist.
 *   2. Every column MUST have a non-empty `id`.
 *   3. `surface_key` MUST be dot-namespaced (`<module>.<surface>` or
 *      `<module>.<entity>.<surface>`).
 *   4. If any column declares `filter_kind: 'enum'`, it MUST also
 *      declare `enum_values` (the multi-select can't render without
 *      the option set).
 *
 * Throws on contract violation — these are programmer bugs, not
 * runtime errors.
 */
export const registerListSurface = (surface: ListSurface): void => {
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,3}$/.test(surface.key)) {
    throw new Error(
      `registerListSurface: surface key "${surface.key}" must be dot-namespaced (e.g., 'orders.list', 'catalog.item.list').`,
    );
  }
  const columnIds = new Set<string>();
  for (const col of surface.columns) {
    if (!col.id || col.id.length === 0) {
      throw new Error(
        `registerListSurface(${surface.key}): every column needs a non-empty id (got "${col.id}").`,
      );
    }
    if (columnIds.has(col.id)) {
      throw new Error(`registerListSurface(${surface.key}): duplicate column id "${col.id}".`);
    }
    columnIds.add(col.id);
    if (col.filter_kind === 'enum' && (!col.enum_values || col.enum_values.length === 0)) {
      throw new Error(
        `registerListSurface(${surface.key}): column "${col.id}" has filter_kind='enum' but no enum_values.`,
      );
    }
  }
  for (const f of surface.text_search_fields) {
    if (!columnIds.has(f)) {
      throw new Error(
        `registerListSurface(${surface.key}): text_search_fields references "${f}" which is not a declared column id. Declared: [${[
          ...columnIds,
        ].join(', ')}].`,
      );
    }
  }
  REGISTRY.set(surface.key, surface);
};

export const getListSurface = (key: string): ListSurface | undefined => REGISTRY.get(key);

export const listAllSurfaces = (): ReadonlyArray<ListSurface> => [...REGISTRY.values()];

/** Test-only: clear the registry. NEVER call in app code. */
export const __resetListSurfaceRegistryForTests = (): void => {
  REGISTRY.clear();
};
