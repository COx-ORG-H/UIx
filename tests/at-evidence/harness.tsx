/* Assistive-technology evidence harness: the six widgets the enterprise-UX study named for manual
 * screen-reader evidence (first-five item #4), on one English page with the kit's default words.
 * Bundled by build.mjs for tests/a11y/at-evidence.spec.mjs (accessibility-tree snapshots, name /
 * role / state and live-region assertions) and opened by a human tester for the scripts in
 * Docs/a11y/scripts/. Every section is a landmark-free <section> with an h2, so a tester reaches
 * it by heading navigation (H in NVDA / JAWS, VO+Cmd+H).
 *   - #workspace: DataWorkspace, 8 incidents, sortable, selectable, row navigation, a bulk bar;
 *   - #palette: CommandPalette in place, plus #palette-launch opening it in its dialog;
 *   - #combobox / #entity: Combobox in a Field, EntityPicker with a 300 ms fake search
 *     ("zzz" finds nothing, "fail" rejects);
 *   - #date: DatePicker, Monday first, weekends unavailable, today pinned to 2026-11-18;
 *   - #diff: DiffViewer with one conflict, one change and one addition;
 *   - #toasts: a Toaster and buttons for a polite, an assertive, a promise and an undoable toast.
 * window.__at records what the widgets reported, so the automated spec can assert outcomes. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Combobox, CommandPalette, DataWorkspace, DatePicker, DiffViewer, EntityPicker, Field,
  Toaster, toast,
} from '../../packages/react/src/index.js';
import type {
  CommandPaletteItem, DataWorkspaceColumn, DataWorkspaceSort, DiffResolution, SearchSuggestOption,
} from '../../packages/react/src/index.js';

type Log = { activated: string[]; bulk: string[]; chosen: string[]; diff: Array<[string, DiffResolution]>; undone: number; committed: number };
declare global { interface Window { __at: Log } }
window.__at = { activated: [], bulk: [], chosen: [], diff: [], undone: 0, committed: 0 };

/* ── DataWorkspace ─────────────────────────────────────────────────────────── */

type Incident = { id: string; title: string; priority: number; assignee: string };
const INCIDENTS: Incident[] = [
  ['INC-1001', 'Printer on floor 3 offline', 2, 'Amra Kovač'],
  ['INC-1002', 'VPN drops every hour', 1, 'Jonas Weber'],
  ['INC-1003', 'Password reset for finance', 3, 'Lejla Hadžić'],
  ['INC-1004', 'Laptop does not boot', 2, 'Max Oberhuber'],
  ['INC-1005', 'Mailbox full', 4, 'Amra Kovač'],
  ['INC-1006', 'Teams microphone muted', 3, 'Jonas Weber'],
  ['INC-1007', 'Shared drive read-only', 1, 'Lejla Hadžić'],
  ['INC-1008', 'Badge reader at gate B', 4, 'Max Oberhuber'],
].map(([id, title, priority, assignee]) => ({ id, title, priority, assignee }) as Incident);

const COLUMNS: DataWorkspaceColumn<Incident>[] = [
  { id: 'title', header: 'Title', cell: (r) => r.title, sortable: true },
  { id: 'priority', header: 'Priority', cell: (r) => `P${r.priority}`, sortable: true, align: 'end', width: '7rem' },
  { id: 'assignee', header: 'Assignee', cell: (r) => r.assignee, sortable: true },
];

function Workspace() {
  const [sort, setSort] = useState<DataWorkspaceSort | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const rows = sort
    ? [...INCIDENTS].sort((a, b) => String(a[sort.columnId as keyof Incident]).localeCompare(String(b[sort.columnId as keyof Incident]), 'en', { numeric: true }) * (sort.direction === 'ascending' ? 1 : -1))
    : INCIDENTS;
  return (
    <DataWorkspace<Incident>
      id="workspace-table" label="Incidents" rows={rows} getRowId={(r) => r.id} columns={COLUMNS}
      idColumn={{ header: 'ID', text: (r) => r.id, href: (r) => `#/incidents/${r.id}` }}
      sort={sort} onSortChange={setSort}
      selection={selection} onSelectionChange={setSelection}
      bulkActions={(ids) => <Button size="sm" onClick={() => window.__at.bulk.push(`assign:${ids.join(',')}`)}>Assign to me</Button>}
      onRowActivate={(r) => window.__at.activated.push(r.id)}
    />
  );
}

/* ── CommandPalette ────────────────────────────────────────────────────────── */

const COMMANDS: CommandPaletteItem[] = [
  { id: 'new-incident', label: 'Create incident', group: 'Actions', keywords: ['ticket'], shortcut: ['Mod', 'I'] },
  { id: 'assign', label: 'Assign to me', group: 'Actions', shortcut: ['A'] },
  { id: 'escalate', label: 'Escalate to on-call lead', group: 'Actions' },
  { id: 'overview', label: 'Overview', group: 'Pages', description: 'Home' },
  { id: 'reports', label: 'Reports', group: 'Pages', description: 'Monthly reports and exports' },
  { id: 'archive', label: 'Archive (read-only)', group: 'Pages', disabled: true, description: 'Administrators only' },
].map((item) => ({ ...item, onSelect: () => window.__at.chosen.push(item.id) }));

function Palette() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="row"><Button id="palette-launch" onClick={() => setOpen(true)}>Open command palette</Button></div>
      <CommandPalette id="palette-dialog" items={COMMANDS} open={open} onOpenChange={setOpen} inputLabel="Commands" placeholder="Search commands…" />
      <div id="palette-inline"><CommandPalette items={COMMANDS} inputLabel="Commands in place" placeholder="Search commands…" /></div>
    </>
  );
}

/* ── Combobox + EntityPicker ───────────────────────────────────────────────── */

const CATEGORIES = [
  { label: 'Hardware', options: [{ value: 'laptop', label: 'Laptop' }, { value: 'printer', label: 'Printer' }, { value: 'monitor', label: 'Monitor', disabled: true }] },
  { label: 'Software', options: [{ value: 'email', label: 'Email' }, { value: 'vpn', label: 'VPN' }] },
];

const PEOPLE: SearchSuggestOption[] = [
  { id: 'u1', title: 'Amra Kovač', meta: ['IT', 'Service desk'] },
  { id: 'u2', title: 'Jonas Weber', meta: ['IT', 'Network'] },
  { id: 'u3', title: 'Lejla Hadžić', meta: ['Finance'] },
  { id: 'u4', title: 'Max Oberhuber', meta: ['Facilities'] },
];
let retryOnceFailed = false;
const searchPeople = (query: string) => new Promise<readonly SearchSuggestOption[]>((resolve, reject) => {
  setTimeout(() => {
    if (query.toLowerCase() === 'fail') reject(new Error('directory unavailable'));
    else if (query.toLowerCase() === 'retry-once' && !retryOnceFailed) { retryOnceFailed = true; reject(new Error('directory unavailable')); }
    else if (query.toLowerCase() === 'retry-once') resolve(PEOPLE.slice(0, 1));
    else resolve(PEOPLE.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())));
  }, 300);
});

function Pickers() {
  const [category, setCategory] = useState('');
  const [person, setPerson] = useState<SearchSuggestOption | null>(null);
  return (
    <>
      <section id="combobox" aria-labelledby="combobox-title">
        <h2 id="combobox-title">Combobox</h2>
        <Field label="Category" hint="Type to filter" required>
          <Combobox label="Category" emptyLabel="No matching category" options={CATEGORIES} value={category} onValueChange={setCategory} />
        </Field>
      </section>
      <section id="entity" aria-labelledby="entity-title">
        <h2 id="entity-title">EntityPicker</h2>
        <Field label="Assignee" htmlFor="entity-input">
          <EntityPicker id="entity-input" label="Assignee" value={person} onValueChange={setPerson} onSearch={searchPeople} delay={0} />
        </Field>
      </section>
    </>
  );
}

/* ── DatePicker ────────────────────────────────────────────────────────────── */

const weekend = (date: string) => { const d = new Date(`${date}T00:00:00Z`).getUTCDay(); return d === 0 || d === 6; };

function DateSection() {
  const [due, setDue] = useState<string | null>('2026-11-20');
  return (
    <Field label="Due date" hint="Weekdays only" htmlFor="date-input">
      <DatePicker id="date-input" value={due} onValueChange={setDue} locale="en-GB" today="2026-11-18" min="2026-11-01" max="2027-01-31" isUnavailable={weekend} />
    </Field>
  );
}

/* ── Toasts ────────────────────────────────────────────────────────────────── */

function Toasts() {
  return (
    <>
      <div className="row">
        <Button id="toast-polite" onClick={() => toast.success('Incident INC-1002 saved')}>Show success toast</Button>
        <Button id="toast-assertive" onClick={() => toast.error('Could not save INC-1002. Try again.', { duration: null })}>Show error toast</Button>
        <Button id="toast-promise" onClick={() => { void toast.promise(new Promise((resolve) => setTimeout(resolve, 1200)), { loading: 'Exporting 8 incidents…', success: 'Export ready', error: 'Export failed' }); }}>Start export</Button>
        <Button id="toast-undo" onClick={() => toast.undoable('INC-1005 closed', { onUndo: () => { window.__at.undone += 1; }, onCommit: () => { window.__at.committed += 1; }, duration: 10000 })}>Close INC-1005</Button>
      </div>
      <Toaster />
    </>
  );
}

function Harness() {
  return (
    <>
      <h1>Assistive-technology evidence</h1>
      <section id="workspace" aria-labelledby="workspace-title"><h2 id="workspace-title">DataWorkspace</h2><Workspace /></section>
      <section id="palette" aria-labelledby="palette-title"><h2 id="palette-title">CommandPalette</h2><Palette /></section>
      <Pickers />
      <section id="date" aria-labelledby="date-title"><h2 id="date-title">DatePicker</h2><DateSection /></section>
      <section id="diff" aria-labelledby="diff-title">
        <h2 id="diff-title">DiffViewer</h2>
        <DiffViewer
          base={{ priority: 'P3', assignee: 'Amra Kovač', tags: [] }}
          current={{ priority: 'P2', assignee: 'Amra Kovač', tags: [] }}
          incoming={{ priority: 'P1', assignee: 'Jonas Weber', tags: ['vip'] }}
          onResolutionChange={(path, resolution) => window.__at.diff.push([path, resolution])}
        />
      </section>
      <section id="toasts" aria-labelledby="toasts-title"><h2 id="toasts-title">Toasts and live regions</h2><Toasts /></section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
