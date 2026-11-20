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

// Constructing collation options inside String#localeCompare is disproportionately
// expensive in a hot sort comparator. One collator preserves the existing numeric,
// case-insensitive ordering while reusing its locale state across every table.
const stringCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return stringCollator.compare(String(a), String(b));
}

/**
 * Stable multi-column sort. `keys` are applied in priority order (first is
 * primary). Returns a new array; the input is not mutated.
 */
export function multiSort<T extends Row>(rows: readonly T[], keys: readonly SortKey[]): T[] {
  if (!keys.length) return rows.slice();
  // Array sorting is stable in the ES2020 target, so a single copied array avoids
  // the former decorate/sort/unwrap arrays and one wrapper object per row.
  return rows.slice().sort((a, b) => {
      for (const k of keys) {
        const c = compare(a[k.field], b[k.field]);
        if (c !== 0) return k.dir === 'ascending' ? c : -c;
      }
      return 0;
    });
}

/** Cycle a header's sort state: none → ascending → descending → none. */
export function nextSortDir(current: SortDir | 'none' | undefined): SortDir | 'none' {
  if (current === 'ascending') return 'descending';
  if (current === 'descending') return 'none';
  return 'ascending';
}

/**
 * Toggle a field within a multi-sort key list. Without shift, it replaces the
 * list with just this field (cycling its direction); with shift, a new field is
 * appended as the last key, an existing key turns in place (it keeps its priority,
 * as TanStack Table and TENSOR's DataTable do; 2.50, HAR-2623) and is removed when
 * it cycles back to none.
 */
export function toggleSort(keys: readonly SortKey[], field: string, additive = false): SortKey[] {
  const existing = keys.find((k) => k.field === field);
  const dir = nextSortDir(existing?.dir);
  if (!additive) return dir === 'none' ? [] : [{ field, dir }];
  if (dir === 'none') return keys.filter((k) => k.field !== field);
  if (!existing) return [...keys, { field, dir }];
  return keys.map((k) => (k.field === field ? { field, dir } : k));
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

/**
 * An `enum` `FilterValue` (what `FilterEditor` and `DataWorkspace` filters hold) as the engine's
 * `ColumnFilter` for `field` (HAR-2631): `is-none-of` maps to `isNoneOf`, anything else to `isAnyOf`.
 */
export function enumColumnFilter(field: string, value: { kind: 'enum'; values: readonly string[]; operator?: 'is-any-of' | 'is-none-of' }): ColumnFilter {
  return { field, kind: 'enum', op: value.operator === 'is-none-of' ? 'isNoneOf' : 'isAnyOf', value: [...value.values] };
}

function asNum(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

/**
 * Coerce a Date | epoch-ms | ISO/date string to epoch milliseconds (NaN if
 * unparseable). Lets date filters compare by instant regardless of how the cell
 * or the filter value is represented — a plain `Number(isoString)` would be NaN.
 */
function asTime(v: unknown): number {
  if (v == null) return NaN;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s === '') return NaN;
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? Number(s) : parsed; // fall back to a bare epoch-ms string
}

/**
 * Date comparisons, kept separate from `number` because date cells (Date | ISO
 * string | epoch) must be read through `asTime`, not `asNum` (which yields NaN
 * for ISO strings and so matches zero rows). `eq` compares by exact instant —
 * for a whole-day match, use `between` across the day's bounds.
 */
function matchDate(cell: unknown, f: ColumnFilter): boolean {
  const c = asTime(cell);
  if (Number.isNaN(c)) return false;
  switch (f.op) {
    case 'eq': return c === asTime(f.value);
    case 'lt': return c < asTime(f.value);
    case 'gt': return c > asTime(f.value);
    case 'between': {
      const [lo, hi] = (f.value as Primitive[]).map(asTime);
      return c >= lo && c <= hi;
    }
    default: return true;
  }
}

export function matchFilter(row: Row, f: ColumnFilter): boolean {
  const cell = row[f.field];
  if (f.kind === 'date') return matchDate(cell, f); // date ops need instant comparison, not asNum
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
  /** Resized column widths in px, by column id (`DataWorkspace` `columnWidths`). */
  widths?: Record<string, number>;
}

/** A width a URL or saved view may hold: a positive finite number, as a whole px. */
const validWidth = (w: unknown): w is number => typeof w === 'number' && Number.isFinite(w) && w > 0;

/**
 * Filter serialization. Each filter is a `field~kind~op~value` token; tokens are
 * joined by ',' and array values by '|'. `kind` is carried explicitly (so it is
 * restored, not guessed) and each field/value is escaped so a literal ~ | , inside
 * it survives the round-trip. Array-vs-scalar is a property of the op, not of the
 * serialized text — so a single-value enum (`['open']`) no longer collapses to a
 * scalar the way a `join('|')`-with-no-separator round-trip did.
 */
const ARRAY_OPS: ReadonlySet<FilterOp> = new Set(['isAnyOf', 'isNoneOf', 'between']);

// encodeURIComponent escapes , and | but leaves ~ (our token delimiter) alone, so encode it by hand.
const escapePart = (s: string): string => encodeURIComponent(s).replace(/~/g, '%7E');
const unescapePart = (s: string): string => decodeURIComponent(s);
const scalarToStr = (v: Primitive): string => (v == null ? '' : String(v));

/** Restore a serialized scalar to its typed value, guided by the filter's kind. */
function parseScalar(s: string, kind: FilterKind): Primitive {
  switch (kind) {
    case 'number':  return Number(s);
    case 'boolean': return s === 'true';
    case 'date':    return /^-?\d+$/.test(s) ? Number(s) : s; // epoch-ms number, else the ISO/date string
    default:        return s;                                 // text, enum stay strings
  }
}

/** Infer a kind from a legacy (kind-less) token's op, so older saved-view links still restore. */
function kindFromOp(op: FilterOp): FilterKind {
  if (op === 'isAnyOf' || op === 'isNoneOf') return 'enum';
  if (op === 'is') return 'boolean';
  if (op === 'contains' || op === 'equals' || op === 'startsWith') return 'text';
  return 'number'; // eq / lt / gt / between — legacy date filters were already broken, treat as number
}

function serializeFilter(f: ColumnFilter): string {
  const value = Array.isArray(f.value)
    ? f.value.map((x) => escapePart(scalarToStr(x))).join('|')
    : escapePart(scalarToStr(f.value));
  return `${escapePart(f.field)}~${f.kind}~${f.op}~${value}`;
}

function parseFilter(tok: string): ColumnFilter | null {
  const parts = tok.split('~');
  let field: string, kind: FilterKind, op: FilterOp, raw: string;
  if (parts.length >= 4) {
    [field, kind, op, raw] = [unescapePart(parts[0]), parts[1] as FilterKind, parts[2] as FilterOp, parts[3] ?? ''];
  } else {
    // legacy `field~op~value` (no kind) — infer the kind so restored value types stay correct
    [field, op, raw] = [unescapePart(parts[0]), parts[1] as FilterOp, parts[2] ?? ''];
    kind = kindFromOp(op);
  }
  if (!field || !op) return null;
  const value: Primitive | Primitive[] = ARRAY_OPS.has(op)
    ? raw.split('|').filter((s) => s !== '').map((s) => parseScalar(unescapePart(s), kind))
    : parseScalar(unescapePart(raw), kind);
  return { field, kind, op, value };
}

/** Serialize a view to a compact, linkable query string (no leading '?'). */
export function serializeView(v: ViewState): string {
  const p = new URLSearchParams();
  if (v.sort?.length) p.set('sort', v.sort.map((s) => `${s.field}:${s.dir === 'descending' ? 'd' : 'a'}`).join(','));
  if (v.columns?.length) p.set('cols', v.columns.join(','));
  if (v.density && v.density !== 'standard') p.set('density', v.density);
  if (v.q) p.set('q', v.q);
  if (v.filters?.length) p.set('filter', v.filters.map(serializeFilter).join(','));
  // `id:px` pairs; the id is escaped so a literal , or : in it survives the round-trip
  const widths = Object.entries(v.widths ?? {}).filter(([id, w]) => id !== '' && validWidth(w));
  if (widths.length) p.set('widths', widths.map(([id, w]) => `${escapePart(id)}:${Math.round(w)}`).join(','));
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
  if (filter) {
    v.filters = filter.split(',').filter(Boolean)
      .map(parseFilter)
      .filter((f): f is ColumnFilter => f !== null);
  }
  const widths = p.get('widths');
  if (widths) {
    const out: Record<string, number> = {};
    for (const tok of widths.split(',')) {
      const at = tok.lastIndexOf(':');
      if (at <= 0) continue;
      let id: string;
      try { id = unescapePart(tok.slice(0, at)); } catch { continue; } // a hand-edited link with a broken escape
      const w = Number(tok.slice(at + 1));
      if (id && validWidth(w)) out[id] = Math.round(w);
    }
    if (Object.keys(out).length) v.widths = out;
  }
  return v;
}

/* ── virtualization: which rows to render for a given scroll position ─────────── */

export interface VirtualWindow { start: number; end: number; padTop: number; padBottom: number; total: number; }
/**
 * Compute the visible row window for a fixed row height. Renders only
 * [start, end) plus `overscan` rows on each side; padTop/padBottom are spacer
 * heights (px) so the scrollbar stays correct. Below `threshold` rows, callers
 * should skip virtualization (render all) — see shouldVirtualize.
 *
 * `scrollTop` is clamped to what a list of `count` rows can scroll to. A scroll position left
 * over from a longer list (5,000 rows filtered down to 150 while scrolled far down) then gives
 * the last rows and a spacer no taller than the list, in the same pass — not an empty window
 * under a spacer taller than everything, which the browser only corrects scroll by scroll
 * (HAR-1616).
 */
export function virtualWindow(
  scrollTop: number, viewportH: number, rowH: number, count: number, overscan = 6,
): VirtualWindow {
  if (rowH <= 0 || count <= 0) return { start: 0, end: count, padTop: 0, padBottom: 0, total: 0 };
  const top = Math.max(0, Math.min(scrollTop, count * rowH - viewportH));
  const first = Math.max(0, Math.floor(top / rowH) - overscan);
  const visible = Math.ceil(viewportH / rowH) + overscan * 2;
  const end = Math.min(count, first + visible);
  return { start: first, end, padTop: first * rowH, padBottom: (count - end) * rowH, total: count * rowH };
}

/** `count > threshold`: a list of exactly `threshold` rows is still rendered whole. */
export function shouldVirtualize(count: number, threshold = 100): boolean {
  return count > threshold;
}

/* ── column resize + reorder helpers ─────────────────────────────────────────── */

/** Clamp a dragged column width to a sane minimum (and optional maximum). */
export function clampWidth(width: number, min = 64, max = Infinity): number {
  return Math.max(min, Math.min(max, Math.round(width)));
}

/**
 * The column-width scale in px, narrowest first: the `col-w-*` tiers (xs 92, sm 112, md 132,
 * lg 176, lg-plus 208, xl 240) and the title floor `col-title-min` (340) of
 * `tokens/base/size.json`. A coarse resize step (Shift + arrow, the width popover's − / +) moves a
 * column to the next stop on it, so resized columns keep landing on the widths the kit draws.
 */
export const COLUMN_WIDTH_SCALE: readonly number[] = [92, 112, 132, 176, 208, 240, 340];
/** The narrowest a resized column gets unless it names its own floor: the scale's first tier. */
export const COLUMN_WIDTH_MIN = 92;
/** The widest a resized column gets: about the width of a long description. */
export const COLUMN_WIDTH_MAX = 960;
/** A fine resize step (an arrow key on the grip): 8 px, the spacing grid. */
export const COLUMN_WIDTH_STEP = 8;
/** Past the scale's last stop (340), a coarse step is 64 px. */
const COARSE_BEYOND_SCALE = 64;

/** Resized column widths in px, by column id: what `ViewState.widths` and a saved view hold. */
export type ColumnWidths = Readonly<Record<string, number>>;

export interface ColumnWidthBounds {
  /** Default `COLUMN_WIDTH_MIN`. */
  min?: number;
  /** Default `COLUMN_WIDTH_MAX`. */
  max?: number;
}

const boundsOf = (bounds: ColumnWidthBounds = {}) => {
  const min = Math.max(1, Math.round(bounds.min ?? COLUMN_WIDTH_MIN));
  return { min, max: Math.max(min, Math.round(bounds.max ?? COLUMN_WIDTH_MAX)) };
};

/**
 * One resize step from `width`: `direction` 1 widens, -1 narrows. A fine step is
 * `COLUMN_WIDTH_STEP` px; a coarse one goes to the next stop of `COLUMN_WIDTH_SCALE` (then every
 * 64 px past its last stop). The result is clamped to the bounds.
 */
export function stepColumnWidth(width: number, direction: 1 | -1, options: ColumnWidthBounds & { coarse?: boolean } = {}): number {
  const { min, max } = boundsOf(options);
  const from = clampWidth(width, min, max);
  if (!options.coarse) return clampWidth(from + direction * COLUMN_WIDTH_STEP, min, max);
  const last = COLUMN_WIDTH_SCALE[COLUMN_WIDTH_SCALE.length - 1];
  const stops = [...COLUMN_WIDTH_SCALE];
  for (let stop = last + COARSE_BEYOND_SCALE; stop < max; stop += COARSE_BEYOND_SCALE) stops.push(stop);
  stops.push(min, max);
  const inRange = [...new Set(stops)].filter((stop) => stop >= min && stop <= max).sort((a, b) => a - b);
  const next = direction > 0 ? inRange.find((stop) => stop > from) : [...inRange].reverse().find((stop) => stop < from);
  return next ?? from;
}

/**
 * The width a key gives a focused column-resize separator (the APG window splitter, vertical):
 * ← / → narrow and widen by a fine step, with Shift by a coarse one (`stepColumnWidth`); Alt + ← / →
 * does the same, as in grids that resize from the header; Home goes to the floor, End to the cap.
 * Right-to-left (`rtl`) mirrors the arrows. Any other key: `null`.
 */
export function columnWidthForKey(
  width: number,
  event: { key: string; shiftKey?: boolean },
  options: ColumnWidthBounds & { rtl?: boolean } = {},
): number | null {
  const { min, max } = boundsOf(options);
  const flip = options.rtl ? -1 : 1;
  switch (event.key) {
    case 'ArrowRight': return stepColumnWidth(width, (1 * flip) as 1 | -1, { min, max, coarse: event.shiftKey });
    case 'ArrowLeft': return stepColumnWidth(width, (-1 * flip) as 1 | -1, { min, max, coarse: event.shiftKey });
    case 'Home': return min;
    case 'End': return max;
    default: return null;
  }
}

/** The width that fits a column's widest content (header and cells, each with its padding), within the bounds. */
export function fitColumnWidth(contentWidths: readonly number[], bounds: ColumnWidthBounds = {}): number {
  const { min, max } = boundsOf(bounds);
  const widest = contentWidths.reduce((acc, w) => (Number.isFinite(w) && w > acc ? w : acc), 0);
  return clampWidth(Math.ceil(widest), min, max);
}

/** `widths` with column `id` set to `width`, or without it for `null` (back to its default). A new object. */
export function setColumnWidth(widths: ColumnWidths | undefined, id: string, width: number | null): Record<string, number> {
  const next: Record<string, number> = { ...widths };
  if (width == null || !Number.isFinite(width) || width <= 0) delete next[id];
  else next[id] = Math.round(width);
  return next;
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
  let on = 0;
  for (const id of pageIds) if (selected.has(id)) on += 1;
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
