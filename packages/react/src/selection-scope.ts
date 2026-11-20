/**
 * Selection scope (enterprise UX study, roadmap #12): what a bulk action runs on. The header
 * checkbox selects the rows on the page; selecting every record that matches the query, across
 * pages, is a separate and explicit step, and then the selection is a predicate, not a list of ids:
 * "all matching this query, except these". Both shapes are plain JSON, so a product can send the
 * scope to its bulk endpoint as it is (PatternFly bulk selection, Carbon batch actions).
 *
 * - `{ kind: 'ids', ids }`: the rows picked one by one or a page at a time.
 * - `{ kind: 'query', query, excludedIds, total }`: every record the query matched when the person
 *   chose "Select all N matching" (`total` of them), less the rows they unticked since.
 *
 * Pure and framework-free; `DataWorkspace` keeps one through `selectionScope`.
 */

/** Rows picked by id (one at a time, a range, a page). */
export interface SelectionScopeIds {
  kind: 'ids';
  ids: readonly string[];
}

/** Every record matching `query` (`total` when chosen), except `excludedIds`. */
export interface SelectionScopeQuery<Q = unknown> {
  kind: 'query';
  /** The query as the product's bulk endpoint takes it: filters, search, anything serialisable. */
  query: Q;
  /** Rows unticked after "Select all matching": the endpoint must leave them alone. */
  excludedIds: readonly string[];
  /** How many records matched when the person chose to select them all. */
  total: number;
}

/** What a bulk action runs on. Serialisable: send it to the bulk endpoint as it is. */
export type SelectionScope<Q = unknown> = SelectionScopeIds | SelectionScopeQuery<Q>;

/** Nothing selected. */
export const EMPTY_SELECTION_SCOPE: SelectionScopeIds = Object.freeze({ kind: 'ids', ids: Object.freeze([]) as readonly string[] }) as SelectionScopeIds;

/** How many records the scope covers: the ids, or the matching total less the excluded rows. */
export function selectionScopeCount(scope: SelectionScope<unknown>): number {
  if (scope.kind === 'ids') return scope.ids.length;
  return Math.max(0, scope.total - scope.excludedIds.length);
}

/** Whether the scope covers nothing (no ids, or every matching record excluded). */
export function isSelectionScopeEmpty(scope: SelectionScope<unknown>): boolean {
  return selectionScopeCount(scope) === 0;
}

/**
 * A fast membership test for one scope: build it once per render, ask it per row. A query scope
 * covers a row unless it was excluded; it cannot tell whether the row matches the query, so ask
 * only about rows the query returned.
 */
export function selectionScopeMatcher(scope: SelectionScope<unknown>): (id: string) => boolean {
  if (scope.kind === 'ids') {
    const ids = new Set(scope.ids);
    return (id) => ids.has(id);
  }
  if (scope.excludedIds.length === 0) return () => true;
  const excluded = new Set(scope.excludedIds);
  return (id) => !excluded.has(id);
}

/** Whether the scope covers this row (see `selectionScopeMatcher` for many rows). */
export function isInSelectionScope(scope: SelectionScope<unknown>, id: string): boolean {
  return scope.kind === 'ids' ? scope.ids.includes(id) : !scope.excludedIds.includes(id);
}

/**
 * Selects (`on`) or deselects these rows. An ids scope adds them in order, up to `cap` ids
 * (`maxSelection`); a query scope takes them off or puts them back on its exclusion list. A query
 * scope with every matching record excluded becomes the empty ids scope. Returns the same object
 * when nothing changed.
 */
export function setInSelectionScope<Q>(scope: SelectionScope<Q>, ids: readonly string[], on: boolean, cap = Infinity): SelectionScope<Q> {
  if (scope.kind === 'ids') {
    const next = new Set(scope.ids);
    let changed = false;
    for (const id of ids) {
      if (!on) { if (next.delete(id)) changed = true; }
      else if (!next.has(id) && next.size < cap) { next.add(id); changed = true; }
    }
    return changed ? { kind: 'ids', ids: [...next] } : scope;
  }
  const excluded = new Set(scope.excludedIds);
  let changed = false;
  for (const id of ids) {
    if (on) { if (excluded.delete(id)) changed = true; }
    else if (!excluded.has(id)) { excluded.add(id); changed = true; }
  }
  if (!changed) return scope;
  if (excluded.size >= scope.total) return EMPTY_SELECTION_SCOPE;
  return { ...scope, excludedIds: [...excluded] };
}

/** Flips one row. */
export function toggleInSelectionScope<Q>(scope: SelectionScope<Q>, id: string, cap = Infinity): SelectionScope<Q> {
  return setInSelectionScope(scope, [id], !isInSelectionScope(scope, id), cap);
}

/** "Select all N matching": every record `query` matches, `total` of them, none excluded. */
export function selectAllMatching<Q>(query: Q, total: number): SelectionScopeQuery<Q> {
  return { kind: 'query', query, excludedIds: [], total: Math.max(0, Math.floor(total)) };
}

/**
 * A stable text form of a query, to tell whether the query changed: object keys are sorted, so
 * `{ a, b }` and `{ b, a }` are the same query; `undefined` members are dropped as JSON drops them.
 */
export function selectionQueryKey(query: unknown): string {
  return JSON.stringify(sortKeys(query)) ?? '';
}

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const member = (value as Record<string, unknown>)[key];
      if (member !== undefined) out[key] = sortKeys(member);
    }
    return out;
  }
  return value;
};
