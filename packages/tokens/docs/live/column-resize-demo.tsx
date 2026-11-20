/* The live column resize on the DataWorkspace component page (Data display → Data workspace →
 * "Try it: resize columns", roadmap #11).
 *
 * Mounts the real @tensor_1/react DataWorkspace, bundled from source by build.mjs, with a queue of
 * tickets. Its widths are a table-engine ViewState: each resize ends in one onColumnWidthsChange,
 * and the demo shows the link (serializeView) that view would have, as a product would write it to
 * the URL or a saved view. docs.js imports this when the page opens and calls `mount`, which returns
 * the unmount it calls when the page changes. */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DataWorkspace, StatusPill, serializeView } from '../../../react/src/index.js';
import type { DataWorkspaceColumn, DataWorkspaceSort } from '../../../react/src/index.js';

interface Ticket { id: string; title: string; status: 'open' | 'progress' | 'waiting'; assignee: string; priority: number; updated: string }

const STATUS: Record<Ticket['status'], { label: string; tone: 'info' | 'warning' | 'neutral' }> = {
  open: { label: 'Open', tone: 'neutral' },
  progress: { label: 'In progress', tone: 'info' },
  waiting: { label: 'Waiting for approval', tone: 'warning' },
};

const ROWS: Ticket[] = [
  { id: 'INC-20418', title: 'E-mail outage for the Sarajevo office after the relay certificate rotation', status: 'progress', assignee: 'Amra Hadžić', priority: 1, updated: '20.11.2026 09:14' },
  { id: 'INC-20417', title: 'VPN disconnects every 20 minutes', status: 'open', assignee: 'Luka Marić', priority: 2, updated: '20.11.2026 08:51' },
  { id: 'INC-20415', title: 'Printer queue stuck on floor 3', status: 'waiting', assignee: 'Bartholomew Featherstonehaugh', priority: 3, updated: '19.11.2026 16:02' },
  { id: 'INC-20412', title: 'Payroll export times out', status: 'progress', assignee: 'Selma Begić', priority: 2, updated: '19.11.2026 11:37' },
  { id: 'INC-20409', title: 'SSO login loop for contractors', status: 'open', assignee: 'Ivan Kovač', priority: 1, updated: '18.11.2026 15:20' },
];

const COLUMNS: DataWorkspaceColumn<Ticket>[] = [
  { id: 'title', header: 'Title', cell: (r) => r.title, className: 'uix-col--flex uix-col--truncate', sortable: true },
  { id: 'status', header: 'Status', cell: (r) => <StatusPill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusPill>, className: 'uix-col--w-lg-plus', label: 'Status' },
  { id: 'assignee', header: 'Assignee', cell: (r) => r.assignee, className: 'uix-col--w-lg uix-col--truncate' },
  { id: 'priority', header: 'Priority', cell: (r) => `P${r.priority}`, className: 'uix-col--w-xs', align: 'end', sortable: true },
  { id: 'updated', header: 'Updated', cell: (r) => r.updated, className: 'uix-col--w-xl', textWrap: 'nowrap' },
];

function Demo() {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [commits, setCommits] = useState(0);
  const [sort, setSort] = useState<DataWorkspaceSort | null>(null);
  const link = serializeView({ widths });
  const rows = useMemo(() => {
    if (!sort) return ROWS;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    return [...ROWS].sort((a, b) => {
      const x = a[sort.columnId as keyof Ticket];
      const y = b[sort.columnId as keyof Ticket];
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [sort]);
  return (
    <div className="uix-docs__live-demo">
      <div className="uix-docs__live-stage">
        <DataWorkspace<Ticket>
          label="Incident queue" rows={rows} getRowId={(r) => r.id} columns={COLUMNS}
          idColumn={{ header: 'ID', text: (r) => r.id, width: '9rem' }}
          sort={sort} onSortChange={setSort}
          columnWidths={widths}
          onColumnWidthsChange={(next) => { setWidths(next); setCommits((n) => n + 1); }}
        />
      </div>
      <div className="uix-docs__live-head">
        <span>The view&rsquo;s link, written once per resize ({commits} so far):</span>
        <code>{link ? `?${link}` : '(default widths)'}</code>
        <div><Button size="sm" variant="secondary" disabled={!link} onClick={() => { setWidths({}); setCommits((n) => n + 1); }}>Reset widths</Button></div>
      </div>
    </div>
  );
}

export function mount(el: HTMLElement): () => void {
  const root = createRoot(el);
  root.render(<StrictMode><Demo /></StrictMode>);
  return () => root.unmount();
}
