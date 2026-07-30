"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  multiSort, toggleSort, applyFilters, searchRows,
  serializeView, parseView, mergePinned,
  toggleId, togglePage, selectAllState,
} from '../table-engine.js';
import type {
  Row, SortKey, ColumnFilter, ViewState, SelectAllState,
} from '../table-engine.js';

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
  const [sort, setSort] = useState<SortKey[]>(() => options.initialSort ?? []);
  const [filters, setFilters] = useState<ColumnFilter[]>(() => options.initialFilters ?? []);
  const [query, setQuery] = useState<string>(() => options.initialQuery ?? '');
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [pinned, setPinned] = useState<ReadonlySet<string>>(() => new Set(options.initialPinned ?? []));

  const rows = useMemo(() => {
    const filtered = applyFilters(data, filters);
    const searched = searchRows(filtered, query, searchFields);
    const sorted = multiSort(searched, sort);
    return mergePinned(data, sorted, pinned, idField);
  }, [data, filters, query, searchFields, sort, pinned, idField]);

  const pageIds = useMemo(() => rows.map((r) => String(r[idField])), [rows, idField]);
  const selectAll = selectAllState(selected, pageIds);

  const doToggleSort = useCallback((field: string, additive = false) => {
    setSort((keys) => toggleSort(keys, field, additive));
  }, []);
  const toggleRow = useCallback((id: string) => setSelected((s) => toggleId(s, id)), []);
  const toggleAllRows = useCallback(() => setSelected((s) => togglePage(s, pageIds)), [pageIds]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const togglePin = useCallback((id: string) => setPinned((s) => toggleId(s, id)), []);

  // UIX-A11Y-2: derive the polite-region text from whichever facet changed last, skipping
  // the mount pass so nothing is announced on first render. `rows` is read from the same
  // render's memo, so the count is already the post-change value.
  const [announcement, setAnnouncement] = useState('');
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) return;
    const key = sort[0];
    setAnnouncement(key ? `Sorted by ${key.field}, ${key.dir}` : 'Sort cleared');
  }, [sort]);
  useEffect(() => {
    if (!mounted.current) return;
    setAnnouncement(`${rows.length} result${rows.length === 1 ? '' : 's'}`);
  }, [filters, query]);
  useEffect(() => {
    if (!mounted.current) return;
    setAnnouncement(`${selected.size} selected`);
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
    isSelected: (id) => selected.has(id), toggleRow, toggleAllRows, clearSelection, togglePin,
    view, viewQueryString, applyView,
  };
}
