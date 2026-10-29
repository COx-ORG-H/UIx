/* Live harness for DataWorkspace's adoption gaps (HAR-2622..2626; MOTUS HAR-1441, TENSOR HAR-1491),
 * bundled by build.mjs for tests/a11y/data-workspace-gaps.spec.mjs. A library catalogue. A fake
 * server answers in 300 ms (the rows on show stay meanwhile); window.__dw records what happened.
 *   - #cards: MOTUS's record-cards list: mobile="cards", the rich id cell as the record's link,
 *     search submit / clear / maxLength, filters cleared in one change, Save as always with a
 *     saved-view note, maxSelection, beforeBody, paged;
 *   - #sorting: TENSOR's list: mobile="priority", multi-column sort, freezeFirstColumn without an
 *     id column, zebra off from the View menu, column className / minWidth, the keyboard row model
 *     (onRowActivate) across a refetch and pages;
 *   - #groups: rows grouped by status, a count and the copies' sum under their column, selection;
 *   - #long: 2,000 unpaged rows windowed, the keyboard row model driven by j / k (activeRowId);
 *   - #states: the product's empty body with its first action, the filtered-empty action, an
 *     error body, a page past the end (stateOverride). */
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert, Button, CellStrong, CellSub, DataWorkspace, EmptyState, ErrorState, Highlighted, Menu, MenuItem, StatusPill,
} from '../../packages/react/src/index.js';
import type { DataWorkspaceColumn, DataWorkspaceGroup, DataWorkspaceSort, FilterField, FilterValue } from '../../packages/react/src/index.js';

declare global { interface Window { __dw: { log: string[]; activated: string[]; requests: number } } }

type Book = { id: string; title: string; author: string; genre: string; year: number; copies: number; status: 'available' | 'loaned' | 'lost' };
const STATUS = { available: 'Available', loaned: 'On loan', lost: 'Lost' } as const;
const TONE = { available: 'success', loaned: 'info', lost: 'danger' } as const;
const TITLES = ['The Hobbit', 'A Wizard of Earthsea', 'The Left Hand of Darkness', 'Der Prozess', 'Na Drini ćuprija', 'The Name of the Rose', 'Murder on the Orient Express', 'The Remains of the Day', 'Kindred', 'Gilead', 'The Master and Margarita', 'Beloved'];
const AUTHORS = ['J. R. R. Tolkien', 'Ursula K. Le Guin', 'Ursula K. Le Guin', 'Franz Kafka', 'Ivo Andrić', 'Umberto Eco', 'Agatha Christie', 'Kazuo Ishiguro', 'Octavia E. Butler', 'Marilynne Robinson', 'Mikhail Bulgakov', 'Toni Morrison'];
const GENRES = ['Fantasy', 'Fantasy', 'Science fiction', 'Literary', 'Literary', 'Crime', 'Crime', 'Literary', 'Science fiction', 'Literary', 'Literary', 'Literary'];
const book = (i: number): Book => ({
  id: `BK-${String(1000 + i)}`, title: TITLES[i % TITLES.length], author: AUTHORS[i % AUTHORS.length], genre: GENRES[i % GENRES.length],
  year: 1937 + ((i * 7) % 80), copies: 1 + (i % 5), status: (['available', 'loaned', 'available', 'lost'] as const)[i % 4],
});
const BOOKS: Book[] = Array.from({ length: 36 }, (_, i) => book(i));
const LONG: Book[] = Array.from({ length: 2000 }, (_, i) => book(i));
const FIELDS: FilterField[] = [
  { id: 'status', label: 'Status', kind: 'enum', options: Object.entries(STATUS).map(([value, label]) => ({ value, label })) },
  { id: 'genre', label: 'Genre', kind: 'enum', options: [...new Set(GENRES)].map((g) => ({ value: g, label: g })) },
];
const log = (entry: string) => window.__dw.log.push(entry);

function useServer<Q>(query: Q, answer: (q: Q) => { rows: Book[]; total: number }) {
  const key = JSON.stringify(query);
  const [shown, setShown] = useState<{ rows: Book[]; total: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    window.__dw.requests += 1;
    setRefreshing(true);
    const t = setTimeout(() => { setShown(answer(query)); setRefreshing(false); }, 300);
    return () => clearTimeout(t);
  }, [key, tick]);
  return { shown, refreshing, refetch: () => setTick((n) => n + 1) };
}

const bookActions = (r: Book) => (
  <Menu trigger={<button type="button" className="uix-rowact" aria-label={`Actions for ${r.title}`}>⋯</button>} placement="bottom-end">
    <MenuItem onSelect={() => log(`lend:${r.id}`)}>Lend</MenuItem>
    <MenuItem onSelect={() => log(`edit:${r.id}`)}>Edit</MenuItem>
  </Menu>
);

/** MOTUS: record cards on a phone, the rich id cell as the record's own link. */
function Cards() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, FilterValue | undefined>>({});
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const { shown, refreshing } = useServer({ search, filters, page }, ({ search: q, filters: f, page: p }) => {
    let rows = BOOKS.filter((b) => !q || `${b.title} ${b.author} ${b.id}`.toLowerCase().includes(q.toLowerCase()));
    const st = f.status;
    if (st?.kind === 'enum' && st.values.length) rows = rows.filter((b) => st.values.includes(b.status));
    const ge = f.genre;
    if (ge?.kind === 'enum' && ge.values.length) rows = rows.filter((b) => ge.values.includes(b.genre));
    return { rows: rows.slice((p - 1) * 8, p * 8), total: rows.length };
  });
  const columns = useMemo<DataWorkspaceColumn<Book>[]>(() => [
    { id: 'author', header: 'Author', cell: (r) => <Highlighted text={r.author} query={search} />, priority: 'mid' },
    { id: 'genre', header: 'Genre', cell: (r) => r.genre, priority: 'low' },
    { id: 'year', header: 'Year', cell: (r) => String(r.year), align: 'end', priority: 'low' },
    { id: 'status', header: 'Status', cell: (r) => <StatusPill tone={TONE[r.status]} treatment="dot">{STATUS[r.status]}</StatusPill> },
    { id: 'copies', header: 'Copies', cell: (r) => String(r.copies), align: 'end' },
  ], [search]);
  const idColumn = useMemo(() => ({
    header: 'Book', text: (r: Book) => r.title, linkId: true, href: (r: Book) => `#/books/${r.id}`,
    render: (r: Book) => <><CellStrong><Highlighted text={r.title} query={search} /></CellStrong><CellSub tabular>{r.id}</CellSub></>,
  }), [search]);
  return (
    <DataWorkspace<Book>
      id="cards" label="Books" mobile="cards" status={shown ? 'ready' : 'loading'} refreshing={shown != null && refreshing} loadingRows={5}
      rows={shown?.rows ?? []} getRowId={(r) => r.id} columns={columns} idColumn={idColumn}
      selection={selection} onSelectionChange={setSelection} maxSelection={5}
      bulkActions={(ids) => <Button size="sm" onClick={() => log(`lend:${ids.join(',')}`)}>Lend</Button>}
      rowActions={bookActions}
      search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, onSubmit: (v) => log(`submit:${v}`), onClear: () => log('clear'), maxLength: 60, label: 'Search books' }}
      filters={{ fields: FIELDS, values: filters, onChange: (fid, v) => { setFilters((f) => ({ ...f, [fid]: v })); setPage(1); }, onClearAll: (scope) => { log(`clearAll:${scope.search}`); setFilters({}); if (scope.search) setSearch(''); setPage(1); } }}
      savedViews={{ current: 'All books', note: 'Saved views could not be loaded.', menu: { items: [{ id: 'all', label: 'All books', active: true }], onSelect: () => {} } }}
      onSaveViewAs={() => log('save-as')} saveViewAs="always"
      beforeBody={<Alert tone="info">Showing the main branch only.</Alert>}
      toolbarEnd={<Button size="sm" variant="primary">Add book</Button>}
      pagination={{ mode: 'offset', page, pageSize: 8, total: shown?.total ?? 0, onPageChange: setPage }}
    />
  );
}

/** TENSOR: multi-column sort, a frozen first column without an id column, zebra from the View menu, the keyboard row model. */
function Sorting() {
  const [sort, setSort] = useState<DataWorkspaceSort[]>([{ columnId: 'genre', direction: 'ascending' }, { columnId: 'year', direction: 'descending' }]);
  const [page, setPage] = useState(1);
  const [zebra, setZebra] = useState(true);
  const [freeze, setFreeze] = useState(true);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const { shown, refreshing, refetch } = useServer({ sort, page }, ({ sort: s, page: p }) => {
    const rows = [...BOOKS].sort((a, b) => {
      for (const k of s) {
        const x = a[k.columnId as keyof Book]; const y = b[k.columnId as keyof Book];
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en');
        if (c !== 0) return k.direction === 'ascending' ? c : -c;
      }
      return a.id.localeCompare(b.id);
    });
    return { rows: rows.slice((p - 1) * 10, p * 10), total: rows.length };
  });
  const columns = useMemo<DataWorkspaceColumn<Book>[]>(() => [
    { id: 'title', header: 'Title', cell: (r) => r.title, sortable: true, minWidth: '14rem', className: 'uix-col--truncate' },
    { id: 'author', header: 'Author', cell: (r) => r.author, sortable: true },
    { id: 'genre', header: 'Genre', cell: (r) => r.genre, sortable: true, priority: 'mid' },
    { id: 'year', header: 'Year', cell: (r) => String(r.year), sortable: true, align: 'end', priority: 'low' },
    { id: 'status', header: 'Status', cell: (r) => <StatusPill tone={TONE[r.status]} treatment="dot">{STATUS[r.status]}</StatusPill>, priority: 'low' },
    { id: 'copies', header: 'Copies', cell: (r) => String(r.copies), sortable: true, align: 'end' },
  ], []);
  const activate = useCallback((r: Book) => window.__dw.activated.push(r.id), []);
  return (
    <DataWorkspace<Book, DataWorkspaceSort[]>
      id="sorting" label="Catalogue" mobile="priority" status={shown ? 'ready' : 'loading'} refreshing={shown != null && refreshing}
      rows={shown?.rows ?? []} getRowId={(r) => r.id} columns={columns} freezeFirstColumn={freeze} zebra={zebra}
      sort={sort} onSortChange={(s) => { setSort(s); setPage(1); }}
      selection={selection} onSelectionChange={setSelection} rowActions={bookActions} onRowActivate={activate}
      viewMenu={{ zebra: { checked: zebra, label: 'Zebra rows', onChange: setZebra }, freeze: { checked: freeze, label: 'Freeze first column', onChange: setFreeze } }}
      toolbarEnd={<Button size="sm" variant="secondary" onClick={refetch}>Refresh</Button>}
      pagination={{ mode: 'offset', page, pageSize: 10, total: shown?.total ?? 0, onPageChange: setPage }}
    />
  );
}

/** Rows grouped by status, the copies summed under their column. */
function Groups() {
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = useMemo<DataWorkspaceGroup<Book>[]>(() => (['available', 'loaned', 'lost'] as const).map((s) => {
    const rows = BOOKS.slice(0, 18).filter((b) => b.status === s);
    return { id: s, name: STATUS[s], label: <StatusPill tone={TONE[s]} treatment="dot">{STATUS[s]}</StatusPill>, rows, aggregates: { copies: `${rows.reduce((n, b) => n + b.copies, 0)} copies` } };
  }), []);
  const columns = useMemo<DataWorkspaceColumn<Book>[]>(() => [
    { id: 'title', header: 'Title', cell: (r) => r.title },
    { id: 'author', header: 'Author', cell: (r) => r.author, priority: 'mid' },
    { id: 'year', header: 'Year', cell: (r) => String(r.year), align: 'end', priority: 'low' },
    { id: 'copies', header: 'Copies', cell: (r) => String(r.copies), align: 'end' },
  ], []);
  const idColumn = useMemo(() => ({ header: 'ID', text: (r: Book) => r.id, onPeek: (r: Book) => log(`peek:${r.id}`) }), []);
  return (
    <DataWorkspace<Book>
      id="groups" label="Books by status" mobile="cards" rows={[]} groups={groups} collapsedGroups={collapsed} onCollapsedGroupsChange={setCollapsed}
      getRowId={(r) => r.id} columns={columns} idColumn={idColumn} selection={selection} onSelectionChange={setSelection}
      bulkActions={(ids) => <Button size="sm" onClick={() => log(`bulk:${ids.length}`)}>Lend</Button>} rowActions={bookActions}
    />
  );
}

/** 2,000 unpaged rows, windowed; j / k move the active row (the product's own chords). */
function Long() {
  const [active, setActive] = useState<string | null>(null);
  const [rows, setRows] = useState(LONG);
  const [refreshing, setRefreshing] = useState(false);
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== 'j' && event.key !== 'k') || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      const at = active ? ids.indexOf(active) : -1;
      const next = ids[Math.max(0, Math.min(ids.length - 1, at + (event.key === 'j' ? 1 : -1)))];
      if (next) { event.preventDefault(); setActive(next); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, ids]);
  const columns = useMemo<DataWorkspaceColumn<Book>[]>(() => [
    { id: 'title', header: 'Title', cell: (r) => r.title },
    { id: 'author', header: 'Author', cell: (r) => r.author },
    { id: 'year', header: 'Year', cell: (r) => String(r.year), align: 'end' },
  ], []);
  const idColumn = useMemo(() => ({ header: 'ID', text: (r: Book) => r.id }), []);
  const activate = useCallback((r: Book) => window.__dw.activated.push(r.id), []);
  const refetch = () => { setRefreshing(true); setTimeout(() => { setRows((all) => all.map((r) => ({ ...r }))); setRefreshing(false); }, 300); };
  return (
    <DataWorkspace<Book>
      id="long" label="Every copy" rows={rows} getRowId={(r) => r.id} columns={columns} idColumn={idColumn} density="compact"
      virtualize={{ maxHeight: 480 }} refreshing={refreshing}
      onRowActivate={activate} activeRowId={active} onActiveRowChange={setActive}
      toolbarEnd={<Button size="sm" variant="secondary" onClick={refetch}>Refresh</Button>}
    />
  );
}

function States() {
  const columns: DataWorkspaceColumn<Book>[] = [{ id: 'title', header: 'Title', cell: (r) => r.title }];
  const base = { rows: [] as Book[], getRowId: (r: Book) => r.id, columns };
  return (
    <>
      <DataWorkspace<Book> {...base} id="empty" label="Wish list" emptyAction={<Button size="sm" variant="primary">Add the first book</Button>} />
      <DataWorkspace<Book>
        {...base} id="filtered-empty" label="Search results" search={{ value: 'zzz', onChange: () => {} }}
        filteredEmptyAction={<Button size="sm" variant="secondary">Suggest “zzz”</Button>}
      />
      <DataWorkspace<Book>
        {...base} id="error" label="Loans" status="error"
        error={<ErrorState title="You may not see the loans" detail={<span className="uix-cell-mono">403 · loans.read_denied</span>} action={<Button size="sm">Try again</Button>} />}
      />
      <DataWorkspace<Book>
        {...base} id="out-of-range" label="Members" search={{ value: '', onChange: () => {} }}
        stateOverride={<EmptyState title="This page is past the end of the list" action={<Button size="sm" variant="secondary">Go to the first page</Button>} />}
      />
    </>
  );
}

function Harness() {
  return (
    <>
      <h1>Library</h1>
      <section><h2>Record cards</h2><Cards /></section>
      <section><h2>Catalogue</h2><Sorting /></section>
      <section><h2>By status</h2><Groups /></section>
      <section><h2>Every copy</h2><Long /></section>
      <section id="states"><h2>States</h2><States /></section>
    </>
  );
}

window.__dw = { log: [], activated: [], requests: 0 };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
