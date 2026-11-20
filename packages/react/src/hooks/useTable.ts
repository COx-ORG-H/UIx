"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  multiSort, toggleSort, applyFilters, searchRows,
  serializeView, parseView, mergePinned,
  toggleId, togglePage, selectAllState,
} from '../table-engine.js';
import { useTextLocale } from './useTextLocale.js';
import type {
  Row, SortKey, ColumnFilter, ViewState, SelectAllState,
} from '../table-engine.js';
import { fillCountLabel, fillLabel } from '../fill-label.js';
import { useUixLabels, useUixLocale } from '../labels-context.js';
import type { UixCountLabel } from '../plural.js';

/**
 * The words of `useTable`'s `announcement` (`UixLabelsProvider` `table`). `{…}` are placeholders.
 */
export interface UseTableLabels {
  /** After a sort change: `{field}` (the row field) and `{dir}` (`ascending` or `descending`). */
  sorted: string;
  /** The `{dir}` of an ascending sort. */
  ascending: string;
  /** The `{dir}` of a descending sort. */
  descending: string;
  /** After the last sort key was removed. */
  sortCleared: string;
  /** After a filter or search: `{count}` rows. Plural-aware: the forms or a function of the count. */
  results: UixCountLabel;
  /** After the selection changed: `{count}` rows. Plural-aware. */
  selected: UixCountLabel;
}

export const DEFAULT_USE_TABLE_LABELS: UseTableLabels = {
  sorted: 'Sorted by {field}, {dir}',
  ascending: 'ascending',
  descending: 'descending',
  sortCleared: 'Sort cleared',
  results: { one: '{count} result', other: '{count} results' },
  selected: '{count} selected',
};

export interface UseTableOptions {
  /** row field used as the stable id (selection / pinning). Default: 'id'. */
  idField?: string;
  initialSort?: SortKey[];
  initialFilters?: ColumnFilter[];
  initialQuery?: string;
  /** restrict full-text search to these fields (default: all values). */
  searchFields?: readonly string[];
  /** ids kept present + hoisted regardless of filter/sort. */
  initialPinned?: Iterable<string>;
  /** The announcement's words. Default: `UixLabelsProvider` `table`, then English. */
  labels?: Partial<UseTableLabels>;
  /**
   * The locale text sorts and searches in (roadmap #15): `multiSort` collates with it
   * (Croatian č after c, "INC-2" before "INC-10"), search and text filters fold with it
   * ("djordje" finds "Đorđe"; Serbian Cyrillic answers to Latin). Default: the
   * `UixLabelsProvider` locale, then the runtime's.
   */
  locale?: string;
}

export interface UseTableResult<T> {
  /** derived view: filter → search → sort, then pinned rows hoisted to the top. */
  rows: T[];
  sort: SortKey[];
  filters: ColumnFilter[];
  query: string;
  selected: ReadonlySet<string>;
  pinned: ReadonlySet<string>;
  /** header select-all tri-state over the current derived rows. */
  selectAll: SelectAllState;
  /**
   * Screen-reader status text reflecting the latest change — "Sorted by {field}, {dir}",
   * "{n} results" (filter/search), "{n} selected". Pass to `<TableWrap announcement>` (UIX-A11Y-2).
   */
  announcement: string;

  /** cycle a column's sort; pass additive (⇧-click) to keep it as a secondary key. */
  toggleSort: (field: string, additive?: boolean) => void;
  setSort: (keys: SortKey[]) => void;
  setFilters: (filters: ColumnFilter[]) => void;
  setQuery: (query: string) => void;

  isSelected: (id: string) => boolean;
  toggleRow: (id: string) => void;
  /** toggle every currently-visible row from the header checkbox. */
  toggleAllRows: () => void;
  clearSelection: () => void;
  togglePin: (id: string) => void;

  /** current state as a ViewState + its linkable query string. */
  view: ViewState;
  viewQueryString: string;
  /** hydrate sort/filters/query from a saved-view query string. */
  applyView: (queryString: string) => void;
}

/**
 * Compose the framework-agnostic table-engine into React state: sorting, typed
 * filtering, full-text search, page-scoped selection, pinning, and linkable saved
 * views. Presentation stays in the `<Table>` primitives + table.css; this only owns
 * the state and the derived row list. The vanilla styleguide (`guide/app.js`) runs
 * the same engine functions, so both layers behave identically.
 */
export function useTable<T extends Row>(data: readonly T[], options: UseTableOptions = {}): UseTableResult<T> {
  const { idField = 'id', searchFields } = options;
  const providerLocale = useTextLocale();
  const locale = options.locale ?? providerLocale;
  const [sort, setSort] = useState<SortKey[]>(() => options.initialSort ?? []);
  const [filters, setFilters] = useState<ColumnFilter[]>(() => options.initialFilters ?? []);
  const [query, setQuery] = useState<string>(() => options.initialQuery ?? '');
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [pinned, setPinned] = useState<ReadonlySet<string>>(() => new Set(options.initialPinned ?? []));

  // Preserve the pure engine functions' copy contracts for direct callers, but
  // avoid their no-op copies in the composed hot path. Pin changes no longer
  // repeat filtering, search, or sorting.
  const visibleRows = useMemo(() => {
    const filtered = filters.length ? applyFilters(data, filters, locale) : data;
    const searched = query.trim() ? searchRows(filtered, query, searchFields, locale) : filtered;
    return sort.length ? multiSort(searched, sort, locale) : searched;
  }, [data, filters, query, searchFields, sort, locale]);

  const rows = useMemo(
    () => pinned.size ? mergePinned(data, visibleRows, pinned, idField) : visibleRows.slice(),
    [data, visibleRows, pinned, idField],
  );

  const pageIds = useMemo(() => rows.map((r) => String(r[idField])), [rows, idField]);
  const selectAll = selectAllState(selected, pageIds);

  const doToggleSort = useCallback((field: string, additive = false) => {
    setSort((keys) => toggleSort(keys, field, additive));
  }, []);
  const toggleRow = useCallback((id: string) => setSelected((s) => toggleId(s, id)), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);
  const toggleAllRows = useCallback(() => setSelected((s) => togglePage(s, pageIds)), [pageIds]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const togglePin = useCallback((id: string) => setPinned((s) => toggleId(s, id)), []);

  // UIX-A11Y-2: derive the polite-region text from whichever facet changed last, skipping
  // the mount pass so nothing is announced on first render. `rows` is read from the same
  // render's memo, so the count is already the post-change value.
  const [announcement, setAnnouncement] = useState('');
  const mounted = useRef(false);
  const labels: UseTableLabels = { ...DEFAULT_USE_TABLE_LABELS, ...useUixLabels().table, ...options.labels };
  // the latest words, read when a facet changes; a new labels object must not re-announce
  const words = useRef({ labels, locale });
  words.current = { labels, locale };
  useEffect(() => {
    if (!mounted.current) return;
    const key = sort[0];
    const { labels: l } = words.current;
    setAnnouncement(key ? fillLabel(l.sorted, { field: key.field, dir: key.dir === 'descending' ? l.descending : l.ascending }) : l.sortCleared);
  }, [sort]);
  useEffect(() => {
    if (!mounted.current) return;
    setAnnouncement(fillCountLabel(words.current.labels.results, { count: rows.length }, words.current.locale));
  }, [filters, query]);
  useEffect(() => {
    if (!mounted.current) return;
    setAnnouncement(fillCountLabel(words.current.labels.selected, { count: selected.size }, words.current.locale));
  }, [selected]);
  useEffect(() => { mounted.current = true; }, []); // declared last → runs after the announcers

  const view: ViewState = useMemo(() => ({ sort, filters, q: query }), [sort, filters, query]);
  const viewQueryString = useMemo(() => serializeView(view), [view]);
  const applyView = useCallback((queryString: string) => {
    const v = parseView(queryString);
    setSort(v.sort ?? []);
    setFilters(v.filters ?? []);
    setQuery(v.q ?? '');
  }, []);

  return {
    rows, sort, filters, query, selected, pinned, selectAll, announcement,
    toggleSort: doToggleSort, setSort, setFilters, setQuery,
    isSelected, toggleRow, toggleAllRows, clearSelection, togglePin,
    view, viewQueryString, applyView,
  };
}
