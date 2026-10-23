/* Live harness for DataWorkspace (HAR-1388; TENSOR data-table, MOTUS UixDataWorkspace), bundled by
 * build.mjs for tests/a11y/data-workspace.spec.mjs. German labels. A fake server answers every
 * query in 600 ms (the rows on show stay meanwhile); window.__ws records requests, peeks and bulk
 * actions.
 *   - #incidents: 47 incidents, 10 per page; search, filters (Status, Priorität, Erstellt), saved
 *     views, View menu (columns, density), selection with Shift ranges, a bulk bar, row actions,
 *     the id cell (peek and ↗), maximize;
 *   - #first-load and #error: the states. */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DataWorkspace, Menu, MenuItem, StatusPill, UixLabelsProvider } from '../../packages/react/src/index.js';
import type { DataWorkspaceColumn, DataWorkspaceSort, FilterField, FilterValue } from '../../packages/react/src/index.js';

declare global { interface Window { __ws: { requests: string[]; peeks: string[]; bulk: string[] } } }

type Incident = { id: string; title: string; state: 'open' | 'pending' | 'resolved'; priority: number; assignee: string; created: string };
const STATES = { open: 'Offen', pending: 'Wartend', resolved: 'Gelöst' } as const;
const TITLES = ['Drucker im 3. OG druckt nicht', 'VPN-Verbindung bricht ab', 'Passwortrücksetzung für Buchhaltung', 'Netzwerkdrucker-Warteschlangenverwaltungsdienst hängt', 'Laptop startet nicht', 'E-Mail-Postfach voll', 'Teams-Mikrofon stumm'];
const PEOPLE = ['Amra Kovač', 'Jonas Weber', 'Lejla Hadžić-Šehović', 'Max Oberhuber'];
const ALL: Incident[] = Array.from({ length: 47 }, (_, i) => ({
  id: `INC-${20400 + i}`, title: TITLES[i % TITLES.length], state: (['open', 'pending', 'resolved'] as const)[i % 3],
  priority: (i % 4) + 1, assignee: PEOPLE[i % PEOPLE.length], created: `2026-10-${String(1 + (i % 21)).padStart(2, '0')}`,
}));
const FIELDS: FilterField[] = [
  { id: 'state', label: 'Status', kind: 'enum', options: Object.entries(STATES).map(([value, label]) => ({ value, label })) },
  { id: 'priority', label: 'Priorität', kind: 'number', operators: ['lte', 'gte', 'eq'] },
  { id: 'created', label: 'Erstellt', kind: 'date-range' },
];

function query(all: Incident[], search: string, filters: Record<string, FilterValue | undefined>, sort: DataWorkspaceSort | null) {
  let rows = all.filter((r) => !search || `${r.id} ${r.title} ${r.assignee}`.toLowerCase().includes(search.toLowerCase()));
  const st = filters.state;
  if (st?.kind === 'enum' && st.values.length) rows = rows.filter((r) => st.values.includes(r.state));
  const pr = filters.priority;
  if (pr?.kind === 'number' && pr.value != null) rows = rows.filter((r) => (pr.operator === 'lte' ? r.priority <= pr.value! : pr.operator === 'gte' ? r.priority >= pr.value! : r.priority === pr.value));
  const cr = filters.created;
  if (cr?.kind === 'date-range') rows = rows.filter((r) => (!cr.from || r.created >= cr.from) && (!cr.to || r.created <= cr.to));
  if (sort) rows = [...rows].sort((a, b) => String(a[sort.columnId as keyof Incident]).localeCompare(String(b[sort.columnId as keyof Incident]), 'de', { numeric: true }) * (sort.direction === 'ascending' ? 1 : -1));
  return rows;
}

function Incidents() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, FilterValue | undefined>>({});
  const [sort, setSort] = useState<DataWorkspaceSort | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [maximized, setMaximized] = useState(false);
  const [density, setDensity] = useState('standard');
  const [visible, setVisible] = useState<Record<string, boolean>>({ title: true, state: true, priority: true, assignee: true, created: false });
  const [view, setView] = useState('mine');
  const [shown, setShown] = useState<{ rows: Incident[]; total: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const key = JSON.stringify({ search, filters, sort, page, pageSize });
  // The server: the rows on show stay until the answer is there (no skeleton on a refetch).
  useEffect(() => {
    window.__ws.requests.push(key);
    setRefreshing(true);
    const t = setTimeout(() => {
      const found = query(ALL, search, filters, sort);
      setShown({ rows: found.slice((page - 1) * pageSize, page * pageSize), total: found.length });
      setRefreshing(false);
    }, 600);
    return () => clearTimeout(t);
  }, [key]);

  const columns: DataWorkspaceColumn<Incident>[] = useMemo(() => ([
    { id: 'title', header: 'Titel', cell: (r) => r.title, sortable: true },
    { id: 'state', header: 'Status', cell: (r) => <StatusPill tone={r.state === 'resolved' ? 'success' : r.state === 'pending' ? 'warning' : 'info'}>{STATES[r.state]}</StatusPill>, sortable: true },
    { id: 'priority', header: 'Priorität', cell: (r) => `P${r.priority}`, sortable: true, align: 'end' as const, width: '7rem' },
    { id: 'assignee', header: 'Bearbeiter', cell: (r) => r.assignee, sortable: true },
    { id: 'created', header: 'Erstellt', cell: (r) => r.created.split('-').reverse().join('.'), sortable: true },
  ] satisfies DataWorkspaceColumn<Incident>[]).filter((c) => visible[c.id]), [visible]);

  return (
    <DataWorkspace<Incident>
      id="incidents" label="Vorfälle" status={shown ? 'ready' : 'loading'} refreshing={shown != null && refreshing}
      rows={shown?.rows ?? []} getRowId={(r) => r.id} columns={columns} density={density as 'standard'}
      idColumn={{ header: 'ID', text: (r) => r.id, onPeek: (r) => window.__ws.peeks.push(r.id), href: (r) => `#/incidents/${r.id}` }}
      sort={sort} onSortChange={(s) => { setSort(s); setPage(1); }}
      selection={selection} onSelectionChange={setSelection}
      bulkActions={(ids) => (
        <>
          <Button size="sm" onClick={() => window.__ws.bulk.push(`assign:${ids.join(',')}`)}>Mir zuweisen</Button>
          <Menu trigger={<Button size="sm" variant="ghost">Mehr</Button>}>
            <MenuItem onSelect={() => window.__ws.bulk.push(`close:${ids.length}`)}>Schließen</MenuItem>
            <MenuItem tone="danger" onSelect={() => window.__ws.bulk.push(`delete:${ids.length}`)}>Löschen</MenuItem>
          </Menu>
        </>
      )}
      rowActions={(r) => (
        <Menu trigger={<button type="button" className="uix-rowact" aria-label={`Aktionen für ${r.id}`}>⋯</button>} placement="bottom-end">
          <MenuItem onSelect={() => window.__ws.bulk.push(`assign:${r.id}`)}>Mir zuweisen</MenuItem>
          <MenuItem onSelect={() => window.__ws.bulk.push(`resolve:${r.id}`)}>Lösen</MenuItem>
        </Menu>
      )}
      search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, label: 'Vorfälle durchsuchen', placeholder: 'Suchen (Strg + /)' }}
      filters={{ fields: FIELDS, values: filters, onChange: (id, v) => { setFilters((f) => ({ ...f, [id]: v })); setPage(1); }, summary: { formatDate: (d) => d.split('-').reverse().join('.') } }}
      savedViews={{
        current: view === 'mine' ? 'Meine offenen' : 'Alle Vorfälle',
        menu: { items: [{ id: 'mine', label: 'Meine offenen', active: view === 'mine' }, { id: 'all', label: 'Alle Vorfälle', active: view === 'all' }], onSelect: setView },
      }}
      viewMenu={{
        density, densityLabel: 'Dichte', onDensityChange: setDensity,
        densityOptions: [{ value: 'compact', label: 'Kompakt' }, { value: 'standard', label: 'Standard' }, { value: 'comfortable', label: 'Bequem' }],
        columnsLabel: 'Spalten', columns: ['title', 'state', 'priority', 'assignee', 'created'].map((id) => ({ id, label: { title: 'Titel', state: 'Status', priority: 'Priorität', assignee: 'Bearbeiter', created: 'Erstellt' }[id]!, visible: visible[id] })),
        onColumnVisibilityChange: (id, v) => setVisible((s) => ({ ...s, [id]: v })),
      }}
      viewChanged={search !== '' || Object.values(filters).some(Boolean)} onSaveView={() => window.__ws.bulk.push('save')} onSaveViewAs={() => window.__ws.bulk.push('save-as')}
      maximized={maximized} onMaximizedChange={setMaximized}
      toolbarEnd={<Button size="sm" variant="primary">Neuer Vorfall</Button>}
      pagination={{ mode: 'offset', page, pageSize, total: shown?.total ?? 0, onPageChange: setPage, pageSizes: [10, 25, 50], onPageSizeChange: (s) => { setPageSize(s); setPage(1); } }}
    />
  );
}

function Harness() {
  return (
    <UixLabelsProvider labels={{
      dataWorkspace: {
        search: 'Suchen', addFilter: 'Filter', clearFilters: 'Filter zurücksetzen', view: 'Ansicht', saveView: 'Änderungen speichern', saveViewAs: 'Speichern als…',
        maximize: 'Maximieren', restore: 'Verkleinern', selectAll: 'Alle Zeilen dieser Seite auswählen', selectRow: '{label} auswählen', selected: '{count} ausgewählt',
        bulkActions: 'Aktionen für die Auswahl', open: '{label} öffnen', rowActions: 'Aktionen', range: '{from}–{to} von {total}', rowsPerPage: 'Zeilen pro Seite',
        loading: 'Wird geladen', empty: 'Noch keine Vorfälle', emptyDetail: 'Neue Vorfälle erscheinen hier.', filteredEmpty: 'Keine Treffer', filteredEmptyDetail: 'Suche ändern oder einen Filter entfernen.',
        error: 'Die Liste konnte nicht geladen werden', retry: 'Erneut versuchen',
      },
      filterEditor: { apply: 'Anwenden', clear: 'Zurücksetzen', from: 'Von', to: 'Bis' },
      pagination: { previous: 'Vorherige Seite', next: 'Nächste Seite', region: 'Seiten' },
    }}>
      <h1>Vorfälle</h1>
      <Incidents />
      <section>
        <h2>Zustände</h2>
        <DataWorkspace id="first-load" label="Erstes Laden" status="loading" rows={[]} getRowId={() => ''} columns={[]} />
        <DataWorkspace id="error" label="Fehler" status="error" onRetry={() => {}} rows={[]} getRowId={() => ''} columns={[]} />
      </section>
    </UixLabelsProvider>
  );
}

window.__ws = { requests: [], peeks: [], bulk: [] };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
