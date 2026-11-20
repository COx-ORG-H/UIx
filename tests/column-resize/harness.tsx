/* Live harness for DataWorkspace column resize (roadmap #11), bundled by build.mjs from source for
 * tests/a11y/column-resize.spec.mjs.
 *   - #queue: an id column, a uix-col--flex title that takes the slack, tiered columns, selection.
 *     Its widths live in the URL (`?widths=…`, table-engine serializeView / parseView) and are
 *     written only when a resize ends, so a reload restores them. Every commit is counted in
 *     window.__commits, so a test can tell one commit per gesture from one per pointer move.
 *   - #noflex: no column takes the slack, so the first resize holds the others at their widths.
 *   - #frozen: freezeFirstColumn in a narrow box that scrolls sideways.
 *   - #cards: mobile="cards" in a 600 px box: the cards step, with no grips. */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataWorkspace, parseView, serializeView } from '../../packages/react/src/index.js';
import type { DataWorkspaceColumn, DataWorkspaceSort } from '../../packages/react/src/index.js';

interface Ticket { id: string; title: string; status: string; assignee: string; priority: number; updated: string }

const ROWS: Ticket[] = [
  { id: 'INC-4821', title: 'Disk pressure on db-03', status: 'Open', assignee: 'M. Okafor', priority: 1, updated: '12.10.2026' },
  { id: 'INC-4822', title: 'DNS flap in eu-west after the resolver change of the weekend', status: 'In progress', assignee: 'R. Lindqvist', priority: 2, updated: '12.10.2026' },
  { id: 'INC-4823', title: 'Certificate expiry on api-gw', status: 'Waiting for approval', assignee: 'S. Haddad', priority: 3, updated: '12.10.2026' },
  { id: 'INC-4824', title: 'Backup window overran on vault-01', status: 'Open', assignee: 'Bartholomew Featherstonehaugh', priority: 2, updated: '13.10.2026' },
  { id: 'INC-4825', title: 'Payroll export timing out', status: 'Resolved', assignee: 'O. Diallo', priority: 4, updated: '13.10.2026' },
];

declare global { interface Window { __commits: Record<string, number> } }
window.__commits = {};
const count = (id: string) => { window.__commits[id] = (window.__commits[id] ?? 0) + 1; };

const tiered = (flexTitle: boolean): DataWorkspaceColumn<Ticket>[] => [
  { id: 'title', header: 'Title', cell: (r) => r.title, className: flexTitle ? 'uix-col--flex uix-col--truncate' : 'uix-col--w-xl uix-col--truncate' },
  { id: 'status', header: 'Status', cell: (r) => r.status, className: 'uix-col--w-md uix-col--truncate' },
  { id: 'assignee', header: 'Assignee', cell: (r) => r.assignee, className: 'uix-col--truncate', width: '176px', minWidth: '112px' },
  { id: 'priority', header: 'Priority', cell: (r) => `P${r.priority}`, className: 'uix-col--w-xs', align: 'end', sortable: true },
  { id: 'updated', header: 'Updated', cell: (r) => r.updated, className: 'uix-col--w-sm', resizable: false },
];

function Queue() {
  const [widths, setWidths] = useState(() => parseView(location.search).widths ?? {});
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<DataWorkspaceSort | null>(null);
  const columns = useMemo(() => tiered(true), []);
  return (
    <section id="queue" style={{ width: 1100 }}>
      <h2>Queue (widths in the URL)</h2>
      <DataWorkspace<Ticket>
        label="Incidents" rows={ROWS} getRowId={(r) => r.id} columns={columns}
        idColumn={{ header: 'ID', text: (r) => r.id }}
        selection={selection} onSelectionChange={setSelection}
        sort={sort} onSortChange={setSort}
        columnWidths={widths}
        onColumnWidthsChange={(next) => {
          count('queue');
          setWidths(next);
          const qs = serializeView({ widths: next });
          history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
        }}
      />
      <output id="queue-url">{serializeView({ widths })}</output>
    </section>
  );
}

function NoFlex() {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const columns = useMemo(() => tiered(false), []);
  return (
    <section id="noflex" style={{ width: 1100 }}>
      <h2>No flex column</h2>
      <DataWorkspace<Ticket>
        label="Incidents without a flex column" rows={ROWS} getRowId={(r) => r.id} columns={columns}
        columnWidths={widths} onColumnWidthsChange={(next) => { count('noflex'); setWidths(next); }}
      />
      <output id="noflex-widths">{JSON.stringify(widths)}</output>
    </section>
  );
}

function Frozen() {
  const columns = useMemo(() => tiered(true), []);
  return (
    <section id="frozen" style={{ width: 560 }}>
      <h2>Frozen first column</h2>
      <DataWorkspace<Ticket>
        label="Incidents, first column frozen" rows={ROWS} getRowId={(r) => r.id} columns={columns} freezeFirstColumn
        onColumnWidthsChange={() => count('frozen')}
      />
    </section>
  );
}

function Cards() {
  const columns = useMemo(() => tiered(true), []);
  return (
    <section id="cards" style={{ width: 600 }}>
      <h2>Cards</h2>
      <DataWorkspace<Ticket>
        label="Incidents as cards" rows={ROWS} getRowId={(r) => r.id} columns={columns} mobile="cards"
        idColumn={{ header: 'ID', text: (r) => r.id }} onColumnWidthsChange={() => count('cards')}
      />
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Queue />
    <NoFlex />
    <Frozen />
    <Cards />
  </StrictMode>,
);
