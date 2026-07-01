/**
 * uix table engine — framework-agnostic, dependency-free logic for data grids.
 *
 * Pure functions only (no DOM, no React), so the same core drives the React
 * wrappers, the vanilla styleguide, and any consumer. Everything here is
 * deterministic and unit-tested (see table-engine.test.mjs). The React layer
 * (useTable / Table subcomponents) composes these; products may also call them
 * directly. Presentation stays in table.css via the --uix-* contract.
 */

export type SortDir = 'ascending' | 'descending';
export interface SortKey {
  /** row field to sort on */
  field: string;
  dir: SortDir;
}

export type Primitive = string | number | boolean | null | undefined;
export type Row = Record<string, unknown>;

/* ── sorting ─────────────────────────────────────────────────────────────────── */

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Stable multi-column sort. `keys` are applied in priority order (first is
 * primary). Returns a new array; the input is not mutated.
 */
export function multiSort<T extends Row>(rows: readonly T[], keys: readonly SortKey[]): T[] {
  if (!keys.length) return rows.slice();
  return rows
    .map((row, i) => ({ row, i }))
    .sort((x, y) => {
      for (const k of keys) {
        const c = compare(x.row[k.field], y.row[k.field]);
        if (c !== 0) return k.dir === 'ascending' ? c : -c;
      }
      return x.i - y.i; // stable
    })
    .map((w) => w.row);
}

/** Cycle a header's sort state: none → ascending → descending → none. */
export function nextSortDir(current: SortDir | 'none' | undefined): SortDir | 'none' {
  if (current === 'ascending') return 'descending';
  if (current === 'descending') return 'none';
  return 'ascending';
}

/**
 * Toggle a field within a multi-sort key list. Without shift, it replaces the
 * list with just this field (cycling its direction); with shift, it adds/updates
 * the field as a secondary key (removing it when it cycles back to none).
 */
export function toggleSort(keys: readonly SortKey[], field: string, additive = false): SortKey[] {
  const existing = keys.find((k) => k.field === field);
  const dir = nextSortDir(existing?.dir);
  if (!additive) return dir === 'none' ? [] : [{ field, dir }];
  const rest = keys.filter((k) => k.field !== field);
  return dir === 'none' ? rest : [...rest, { field, dir }];
}

/* ── typed filters ───────────────────────────────────────────────────────────── */

export type FilterKind = 'enum' | 'text' | 'number' | 'date' | 'boolean';
export type FilterOp =
  | 'isAnyOf' | 'isNoneOf'          // enum
  | 'contains' | 'equals' | 'startsWith' // text
  | 'eq' | 'lt' | 'gt' | 'between'  // number / date
  | 'is';                            // boolean
export interface ColumnFilter {
  field: string;
  kind: FilterKind;
  op: FilterOp;
  /** value(s): a scalar, an array (enum / between), or [min,max] for between */
  value: Primitive | Primitive[];
}

function asNum(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

export function matchFilter(row: Row, f: ColumnFilter): boolean {
  const cell = row[f.field];
  switch (f.op) {
    case 'isAnyOf':  return Array.isArray(f.value) && f.value.includes(cell as Primitive);
    case 'isNoneOf': return Array.isArray(f.value) && !f.value.includes(cell as Primitive);
    case 'contains': return String(cell ?? '').toLowerCase().includes(String(f.value ?? '').toLowerCase());
    case 'equals':   return String(cell ?? '') === String(f.value ?? '');
    case 'startsWith': return String(cell ?? '').toLowerCase().startsWith(String(f.value ?? '').toLowerCase());
    case 'eq':  return asNum(cell) === asNum(f.value);
    case 'lt':  return asNum(cell) < asNum(f.value);
    case 'gt':  return asNum(cell) > asNum(f.value);
    case 'between': {
      const [lo, hi] = (f.value as Primitive[]).map(asNum);
      return asNum(cell) >= lo && asNum(cell) <= hi;
    }
    case 'is':  return Boolean(cell) === Boolean(f.value);
    default:    return true;
  }
}

/** Keep rows that satisfy EVERY active filter (AND across columns). */
export function applyFilters<T extends Row>(rows: readonly T[], filters: readonly ColumnFilter[]): T[] {
  if (!filters.length) return rows.slice();
  return rows.filter((r) => filters.every((f) => matchFilter(r, f)));
}

/* ── full-text search + highlight ────────────────────────────────────────────── */

/** Rows where any of `fields` (default: all string/number values) contains `query`. */
export function searchRows<T extends Row>(rows: readonly T[], query: string, fields?: readonly string[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice();
  return rows.filter((r) => {
    const vals = fields ? fields.map((f) => r[f]) : Object.values(r);
    return vals.some((v) => v != null && String(v).toLowerCase().includes(q));
  });
}

export interface Segment { text: string; match: boolean; }
/** Split `text` into matched / unmatched segments for <mark> rendering (case-insensitive). */
export function highlightSegments(text: string, query: string): Segment[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const out: Segment[] = [];
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let i = 0;
  for (;;) {
    const hit = lower.indexOf(ql, i);
    if (hit === -1) { if (i < text.length) out.push({ text: text.slice(i), match: false }); break; }
    if (hit > i) out.push({ text: text.slice(i, hit), match: false });
    out.push({ text: text.slice(hit, hit + q.length), match: true });
    i = hit + q.length;
  }
  return out;
}

/* ── saved views: serialize table state to / from a URL query string ─────────── */

export interface ViewState {
  sort?: SortKey[];
  filters?: ColumnFilter[];
  columns?: string[];   // visible columns, in order
  density?: 'compact' | 'standard' | 'comfortable';
  q?: string;           // search query
}

/** Serialize a view to a compact, linkable query string (no leading '?'). */
export function serializeView(v: ViewState): string {
  const p = new URLSearchParams();
  if (v.sort?.length) p.set('sort', v.sort.map((s) => `${s.field}:${s.dir === 'descending' ? 'd' : 'a'}`).join(','));
  if (v.columns?.length) p.set('cols', v.columns.join(','));
  if (v.density && v.density !== 'standard') p.set('density', v.density);
  if (v.q) p.set('q', v.q);
  if (v.filters?.length) p.set('filter', v.filters.map((f) => `${f.field}~${f.op}~${(Array.isArray(f.value) ? f.value.join('|') : f.value ?? '')}`).join(','));
  return p.toString();
}

/** Parse a query string (with or without leading '?') back into a ViewState. */
export function parseView(qs: string): ViewState {
  const p = new URLSearchParams(qs.replace(/^\?/, ''));
  const v: ViewState = {};
  const sort = p.get('sort');
  if (sort) v.sort = sort.split(',').filter(Boolean).map((tok) => {
    const [field, d] = tok.split(':');
    return { field, dir: d === 'd' ? 'descending' : 'ascending' } as SortKey;
  });
  const cols = p.get('cols');
  if (cols) v.columns = cols.split(',').filter(Boolean);
  const density = p.get('density');
  if (density === 'compact' || density === 'comfortable' || density === 'standard') v.density = density;
  const q = p.get('q');
  if (q) v.q = q;
  const filter = p.get('filter');
  if (filter) v.filters = filter.split(',').filter(Boolean).map((tok) => {
    const [field, op, raw] = tok.split('~');
    const value: Primitive | Primitive[] = raw?.includes('|') ? raw.split('|') : raw;
    return { field, kind: 'text', op: op as FilterOp, value } as ColumnFilter;
  });
  return v;
}

/* ── virtualization: which rows to render for a given scroll position ─────────── */

export interface VirtualWindow { start: number; end: number; padTop: number; padBottom: number; total: number; }
/**
 * Compute the visible row window for a fixed row height. Renders only
 * [start, end) plus `overscan` rows on each side; padTop/padBottom are spacer
 * heights (px) so the scrollbar stays correct. Below `threshold` rows, callers
 * should skip virtualization (render all) — see shouldVirtualize.
 */
export function virtualWindow(
  scrollTop: number, viewportH: number, rowH: number, count: number, overscan = 6,
): VirtualWindow {
  if (rowH <= 0 || count <= 0) return { start: 0, end: count, padTop: 0, padBottom: 0, total: 0 };
  const first = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
  const visible = Math.ceil(viewportH / rowH) + overscan * 2;
  const end = Math.min(count, first + visible);
  return { start: first, end, padTop: first * rowH, padBottom: (count - end) * rowH, total: count * rowH };
}

export function shouldVirtualize(count: number, threshold = 100): boolean {
  return count > threshold;
}

/* ── column resize + reorder helpers ─────────────────────────────────────────── */

/** Clamp a dragged column width to a sane minimum (and optional maximum). */
export function clampWidth(width: number, min = 64, max = Infinity): number {
  return Math.max(min, Math.min(max, Math.round(width)));
}

/** Move an item from index `from` to index `to`, returning a new array. */
export function reorder<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/* ── selection helpers (page-scoped, with "select all matching") ─────────────── */

export function toggleId(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

export type SelectAllState = 'none' | 'some' | 'all';
export function selectAllState(selected: ReadonlySet<string>, pageIds: readonly string[]): SelectAllState {
  const on = pageIds.filter((id) => selected.has(id)).length;
  if (on === 0) return 'none';
  return on === pageIds.length ? 'all' : 'some';
}

/** Toggle every id on the current page on/off based on the header checkbox. */
export function togglePage(selected: ReadonlySet<string>, pageIds: readonly string[]): Set<string> {
  const next = new Set(selected);
  const all = pageIds.every((id) => next.has(id));
  for (const id of pageIds) all ? next.delete(id) : next.add(id);
  return next;
}

/** Pinned rows (kept present regardless of filter/sort) hoisted above the rest. */
export function mergePinned<T extends Row>(all: readonly T[], visible: readonly T[], pinnedIds: ReadonlySet<string>, idField = 'id'): T[] {
  if (!pinnedIds.size) return visible.slice();
  const pinned = all.filter((r) => pinnedIds.has(String(r[idField])));
  const pinnedSet = new Set(pinned.map((r) => String(r[idField])));
  const rest = visible.filter((r) => !pinnedSet.has(String(r[idField])));
  return [...pinned, ...rest];
}
