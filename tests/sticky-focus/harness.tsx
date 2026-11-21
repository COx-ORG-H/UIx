/* Live harness for the sticky-layer focus offsets (WCAG 2.2 SC 2.4.11 Focus Not Obscured, technique
 * C43), bundled by build.mjs for tests/a11y/sticky-focus.spec.mjs. A long DataWorkspace with a bulk
 * bar (two rows selected), three toasts that stay, and an open TaskTray:
 *   ?scene=page     the page scrolls; 60 rows, every row's checkbox, id, open link and action in the tab order
 *   ?scene=shell    the same inside AppShell layout="viewport" (main scrolls under a top bar)
 *   ?scene=virtual  2,000 windowed rows with the keyboard row model, the scroller reaching the window's bottom
 *   &layers=0       no toasts and no task tray */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell, Button, DataWorkspace, TaskTray, Toaster, tasks, toast } from '../../packages/react/src/index.js';
import type { DataWorkspaceColumn } from '../../packages/react/src/index.js';

declare global { interface Window { __uix: { toast: typeof toast } } }
window.__uix = { toast };

const q = new URLSearchParams(location.search);
const scene = q.get('scene') ?? 'page';
const layers = q.get('layers') !== '0';

type Ticket = { id: string; title: string; assignee: string; state: string };
const TITLES = ['Printer on floor 3 is offline', 'VPN drops every hour', 'Password reset for accounting', 'Mailbox is full', 'Laptop does not boot'];
const PEOPLE = ['Amra Kovač', 'Jonas Weber', 'Lejla Hadžić', 'Max Oberhuber'];
const STATES = ['Open', 'Pending', 'Resolved'];
const make = (n: number): Ticket[] => Array.from({ length: n }, (_, i) => ({
  id: `INC-${20400 + i}`, title: TITLES[i % TITLES.length], assignee: PEOPLE[i % PEOPLE.length], state: STATES[i % STATES.length],
}));
const ROWS = make(scene === 'virtual' ? 2000 : 60);

const columns: DataWorkspaceColumn<Ticket>[] = [
  { id: 'title', header: 'Title', cell: (r) => r.title },
  { id: 'state', header: 'State', cell: (r) => r.state, width: '8rem' },
  { id: 'assignee', header: 'Assignee', cell: (r) => r.assignee },
];

function Workspace() {
  const [selection, setSelection] = useState<Set<string>>(() => new Set(['INC-20401', 'INC-20402']));
  const virtual = scene === 'virtual';
  return (
    <DataWorkspace<Ticket>
      id="tickets" label="Tickets" status="ready"
      rows={ROWS} getRowId={(r) => r.id} columns={columns}
      idColumn={{ header: 'ID', text: (r) => r.id, onPeek: () => {}, href: (r) => `#/tickets/${r.id}` }}
      selection={selection} onSelectionChange={setSelection}
      bulkActions={() => <Button size="sm">Assign to me</Button>}
      rowActions={virtual ? undefined : (r) => <button type="button" className="uix-rowact" aria-label={`Actions for ${r.id}`}>⋯</button>}
      search={{ value: '', onChange: () => {}, label: 'Search tickets' }}
      {...(virtual ? { virtualize: { maxHeight: 720 }, onRowActivate: () => {} } : {})}
    />
  );
}

function Layers() {
  if (!layers) return <Toaster />;
  return (
    <>
      <Toaster />
      <TaskTray defaultOpen />
    </>
  );
}

if (layers) {
  const noop = () => {};
  tasks.start('Export 4,000 tickets', { step: 'Writing CSV', value: 2480, max: 4000, onCancel: noop });
  tasks.start('CMDB discovery: Sarajevo DC', { step: 'Scanning 10.20.0.0/16', onCancel: noop });
  tasks.start('Import users.csv').complete({ message: '1,204 users imported', action: { label: 'Open', onClick: noop } });
  toast.info('Ticket INC-20412 was assigned to you', { duration: null });
  toast.success('Saved view “My open tickets” updated', { duration: null });
  toast.warning('3 tickets are close to their SLA', { duration: null });
}

function Harness() {
  if (scene === 'shell') {
    return (
      <AppShell
        layout="viewport"
        sidebar={<nav aria-label="Main"><ul><li><a href="#/tickets">Tickets</a></li><li><a href="#/changes">Changes</a></li></ul></nav>}
        topbar={<strong>Service desk</strong>}
      >
        <h1>Tickets</h1>
        <Workspace />
        <Layers />
      </AppShell>
    );
  }
  return (
    <>
      <h1>Tickets</h1>
      <Workspace />
      <Layers />
    </>
  );
}

const root = document.getElementById('root')!;
root.setAttribute('data-scene', scene);
createRoot(root).render(<StrictMode><Harness /></StrictMode>);
