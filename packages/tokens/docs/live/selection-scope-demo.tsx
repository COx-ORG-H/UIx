/* The live selection scope demo on the DataWorkspace page ("Try it: select all matching"), and the
 * scene tests/a11y/selection-scope.spec.mjs drives (tests/selection-scope/harness.tsx mounts it).
 *
 * A fake server holds 4,000 incidents and answers a query (search, Status, Assignee, a page of 25)
 * after a short delay, like a real list endpoint. Tick the header checkbox: the page is selected
 * and the banner offers "Select all N matching". Take it, and the selection becomes the query
 * itself, `{ kind: 'query', query, excludedIds, total }`, shown under the table as the bulk
 * endpoint receives it; untick a row and it joins `excludedIds`. Change the filter and the
 * selection is cleared, or (Confirm) held aside until you choose. X, Shift + X and Ctrl/⌘ + A work
 * with focus in the table, and ? lists them. docs.js imports this when the page opens and calls
 * `mount`, which returns the unmount it calls when the page changes. */
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, DataWorkspace, EMPTY_SELECTION_SCOPE, Menu, MenuItem, Segmented, SegmentedOption, ShortcutProvider, ShortcutSheet,
  StatusPill, isSelectionScopeEmpty, selectionScopeCount,
} from '../../../react/src/index.js';
import { MoreHorizontalIcon } from '../../../react/src/icons.js';
import type {
  DataWorkspaceColumn, DataWorkspaceQuery, FilterField, FilterValue, SelectionScope,
} from '../../../react/src/index.js';

type Status = 'open' | 'in-progress' | 'resolved';
interface Incident { id: string; title: string; status: Status; assignee: string; priority: 'P1' | 'P2' | 'P3' | 'P4' }

const STATUS_WORDS: Record<Status, string> = { open: 'Open', 'in-progress': 'In progress', resolved: 'Resolved' };
const TEAMS = ['Network', 'Service Desk', 'Database', 'Identity', 'Workplace'];
const SUBJECTS = ['VPN drops every 20 minutes', 'Printer on floor 2 prints blank pages', 'Disk almost full on file server',
  'Password reset loop', 'Wi-Fi slow in meeting rooms', 'Laptop for a new starter', 'Backup job failed overnight',
  'E-mail delayed by an hour', 'Certificate expires in 7 days', 'Badge reader offline at the side door'];

/** 4,000 incidents, the same on every load (a small LCG, not Math.random). */
export function makeIncidents(count = 4000): Incident[] {
  let seed = 20261120;
  const next = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = <V,>(list: readonly V[]) => list[Math.floor(next() * list.length)];
  return Array.from({ length: count }, (_, index) => {
    const roll = next();
    return {
      id: `INC-${String(10001 + index)}`,
      title: `${pick(SUBJECTS)}`,
      status: roll < 0.55 ? 'open' : roll < 0.8 ? 'in-progress' : 'resolved',
      assignee: pick(TEAMS),
      priority: pick(['P1', 'P2', 'P3', 'P4'] as const),
    };
  });
}

/** The predicate a real endpoint would run in SQL. */
const matches = (incident: Incident, query: DataWorkspaceQuery) => {
  const search = query.search.toLowerCase();
  if (search && !incident.title.toLowerCase().includes(search) && !incident.id.toLowerCase().includes(search)) return false;
  for (const [field, value] of Object.entries(query.filters)) {
    if (value.kind !== 'enum' || value.values.length === 0) continue;
    const own = field === 'status' ? incident.status : field === 'assignee' ? incident.assignee : null;
    if (own != null && !value.values.includes(own)) return false;
  }
  return true;
};

/** A list endpoint and a bulk endpoint over the incidents, each answering after `delay` ms. */
export function createFakeServer(incidents = makeIncidents(), delay = 180) {
  const data = incidents.map((incident) => ({ ...incident }));
  const wait = <V,>(value: () => V) => new Promise<V>((resolve) => { setTimeout(() => resolve(value()), delay); });
  return {
    list: (query: DataWorkspaceQuery, page: number, pageSize: number) => wait(() => {
      const found = data.filter((incident) => matches(incident, query));
      return { rows: found.slice((page - 1) * pageSize, page * pageSize), total: found.length };
    }),
    /** Applies `status` to what the scope covers; answers with how many records it changed. */
    bulk: (scope: SelectionScope<DataWorkspaceQuery>, status: Status) => wait(() => {
      const covered = scope.kind === 'ids'
        ? (() => { const ids = new Set(scope.ids); return data.filter((incident) => ids.has(incident.id)); })()
        : (() => { const excluded = new Set(scope.excludedIds); return data.filter((incident) => matches(incident, scope.query) && !excluded.has(incident.id)); })();
      for (const incident of covered) incident.status = status;
      return covered.length;
    }),
  };
}

const FIELDS: FilterField[] = [
  { id: 'status', label: 'Status', kind: 'enum', options: (Object.keys(STATUS_WORDS) as Status[]).map((value) => ({ value, label: STATUS_WORDS[value] })) },
  { id: 'assignee', label: 'Assignee', kind: 'enum', options: TEAMS.map((team) => ({ value: team, label: team })) },
];

const COLUMNS: DataWorkspaceColumn<Incident>[] = [
  { id: 'title', header: 'Title', cell: (row) => row.title, className: 'uix-col--flex' },
  { id: 'status', header: 'Status', cell: (row) => <StatusPill tone={row.status === 'resolved' ? 'success' : row.status === 'in-progress' ? 'info' : 'neutral'}>{STATUS_WORDS[row.status]}</StatusPill>, className: 'uix-col--w-sm' },
  { id: 'assignee', header: 'Assignee', cell: (row) => row.assignee, className: 'uix-col--w-sm', priority: 'mid' },
  { id: 'priority', header: 'Priority', cell: (row) => row.priority, className: 'uix-col--w-xs', priority: 'low' },
];
const ID_COLUMN = { header: 'ID', text: (row: Incident) => row.id, width: '7.5rem' };
const PAGE_SIZE = 25;

export interface SelectionScopeDemoProps {
  /** The fake server's answer delay in ms. */
  delay?: number;
  /** Start with this filter (the tests start under Status: Open). */
  initialFilters?: Record<string, FilterValue | undefined>;
}

function Incidents({ delay = 180, initialFilters = { status: { kind: 'enum', values: ['open'] } } }: SelectionScopeDemoProps) {
  const server = useMemo(() => createFakeServer(makeIncidents(), delay), [delay]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, FilterValue | undefined>>(initialFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ rows: Incident[]; total: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<SelectionScope<DataWorkspaceQuery>>(EMPTY_SELECTION_SCOPE);
  const [policy, setPolicy] = useState<'clear' | 'confirm'>('clear');
  const [said, setSaid] = useState('');
  const [reload, setReload] = useState(0);
  const request = useRef(0);

  const query = useMemo<DataWorkspaceQuery>(() => {
    const set: Record<string, FilterValue> = {};
    for (const [id, value] of Object.entries(filters)) if (value && value.kind === 'enum' && value.values.length > 0) set[id] = value;
    return { search: search.trim(), filters: set };
  }, [search, filters]);

  useEffect(() => {
    const mine = ++request.current;
    setRefreshing(true);
    void server.list(query, page, PAGE_SIZE).then((answer) => {
      if (request.current !== mine) return;
      setResult(answer);
      setRefreshing(false);
    });
  }, [server, query, page, reload]);

  const setFilter = useCallback((id: string, value: FilterValue | undefined) => { setFilters((all) => ({ ...all, [id]: value })); setPage(1); }, []);
  const runBulk = (status: Status) => {
    const words = STATUS_WORDS[status];
    void server.bulk(scope, status).then((changed) => {
      setSaid(`${words}: ${changed.toLocaleString('en')} incident${changed === 1 ? '' : 's'} changed.`);
      setScope(EMPTY_SELECTION_SCOPE);
      setReload((n) => n + 1);
    });
  };

  return (
    <div className="uix-stack" data-selection-scope-demo="">
      <div className="uix-cluster">
        <span id="demo-policy-label">When the filter changes:</span>
        <Segmented aria-labelledby="demo-policy-label" value={policy} onChange={(value) => setPolicy(value as 'clear' | 'confirm')}>
          <SegmentedOption value="clear">Clear the selection</SegmentedOption>
          <SegmentedOption value="confirm">Ask</SegmentedOption>
        </Segmented>
      </div>
      <DataWorkspace<Incident, null, DataWorkspaceQuery>
        label="Incidents"
        rows={result?.rows ?? []}
        getRowId={getId}
        columns={COLUMNS}
        idColumn={ID_COLUMN}
        status={result ? 'ready' : 'loading'}
        refreshing={refreshing && result != null}
        loadingRows={8}
        search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); } }}
        filters={{ fields: FIELDS, values: filters, onChange: setFilter, onClearAll: ({ search: andSearch }) => { setFilters({}); if (andSearch) setSearch(''); setPage(1); } }}
        pagination={{ mode: 'offset', page, pageSize: PAGE_SIZE, total: result?.total ?? 0, onPageChange: setPage }}
        selectionScope={{ value: scope, onChange: setScope, query, onQueryChange: policy }}
        disableRowActionsWhileSelected
        bulkActions={() => (
          <>
            <Button size="sm" onClick={() => runBulk('resolved')}>Resolve</Button>
            <Button size="sm" variant="secondary" onClick={() => runBulk('in-progress')}>Start work</Button>
          </>
        )}
        rowActions={rowActions}
      />
      <p role="status" id="demo-said">{said}</p>
      <section className="uix-stack" aria-labelledby="demo-scope-title">
        <h4 id="demo-scope-title">What the bulk endpoint receives</h4>
        <p className="uix-text-muted" id="demo-scope-count">
          {isSelectionScopeEmpty(scope) ? 'Nothing selected.' : `${selectionScopeCount(scope).toLocaleString('en')} incidents, ${scope.kind === 'ids' ? 'by id' : 'by query'}.`}
        </p>
        <pre className="uix-code" id="demo-scope" tabIndex={0}><code>{JSON.stringify(scope, null, 2)}</code></pre>
      </section>
      <ShortcutSheet />
    </div>
  );
}

const getId = (row: Incident) => row.id;
const rowActions = (row: Incident) => (
  <Menu trigger={<Button size="sm" variant="ghost" icon aria-label={`Actions for ${row.id}`}><MoreHorizontalIcon size="sm" aria-hidden="true" /></Button>}>
    <MenuItem onSelect={() => {}}>Open {row.id}</MenuItem>
    <MenuItem onSelect={() => {}}>Copy link</MenuItem>
  </Menu>
);

export function SelectionScopeDemo({ storageKey = 'uix-docs-selection-scope-demo', ...props }: SelectionScopeDemoProps & { storageKey?: string | null }) {
  return (
    <ShortcutProvider storageKey={storageKey}>
      <Incidents {...props} />
    </ShortcutProvider>
  );
}

export function mount(host: HTMLElement): () => void {
  const root = createRoot(host);
  root.render(<StrictMode><SelectionScopeDemo /></StrictMode>);
  return () => root.unmount();
}
