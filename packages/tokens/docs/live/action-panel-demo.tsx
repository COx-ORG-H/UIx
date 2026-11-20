/* The live per-row action panel on its component page (Data display → Data workspace → "Try it:
 * row actions from the keyboard"), and the scene tests/a11y/action-panel.spec.mjs drives
 * (tests/action-panel/harness.tsx mounts it).
 *
 * A ticket queue in a real DataWorkspace with `getRowActions`: Enter on a row opens it (the primary
 * action), Ctrl+K or ⌘K opens the row's action panel (every action with its keys, searchable, the
 * destructive ones last), a second Ctrl+K or ⌘K opens the command palette, A / P / E assign,
 * re-prioritise and resolve the focused ticket (only while focus is in the rows), Archive offers
 * Undo, Delete asks first (⌘⌫ or Ctrl+Backspace on the row). ? opens the shortcut sheet with the
 * single-key switch. docs.js imports this when the page opens and calls `mount`, which returns the
 * unmount it calls when the page changes. */
import { StrictMode, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, CommandPalette, DataWorkspace, SHORTCUT_SHEET_ID, ShortcutProvider, ShortcutSheet, StatusPill, Toaster,
  createToastApi, createToastStore, useShortcuts,
} from '../../../react/src/index.js';
import type { ActionPanelAction, DataWorkspaceColumn, KbdPlatform } from '../../../react/src/index.js';

type Priority = 'P1' | 'P2' | 'P3';
type State = 'open' | 'assigned' | 'resolved';
interface Ticket { id: string; title: string; priority: Priority; state: State; archived?: boolean }

const TICKETS: Ticket[] = [
  { id: 'INC-0412', title: 'E-Mail-Ausfall im Büro Sarajevo', priority: 'P1', state: 'open' },
  { id: 'INC-0413', title: 'VPN drops every 20 minutes', priority: 'P2', state: 'assigned' },
  { id: 'INC-0414', title: 'Drucker im 2. Stock druckt leere Seiten', priority: 'P3', state: 'open' },
  { id: 'INC-0415', title: 'New starter needs a laptop by Monday', priority: 'P2', state: 'open' },
  { id: 'INC-0416', title: 'Šifra za Wi-Fi u sali za sastanke ne radi', priority: 'P3', state: 'open' },
];

const STATE_WORDS: Record<State, string> = { open: 'Open', assigned: 'Assigned to you', resolved: 'Resolved' };
const NEXT_PRIORITY: Record<Priority, Priority> = { P1: 'P2', P2: 'P3', P3: 'P1' };

const COLUMNS: DataWorkspaceColumn<Ticket>[] = [
  { id: 'title', header: 'Title', cell: (t) => t.title, className: 'uix-col--flex' },
  { id: 'priority', header: 'Priority', cell: (t) => t.priority, priority: 'mid' },
  {
    id: 'state', header: 'State',
    cell: (t) => <StatusPill tone={t.state === 'resolved' ? 'success' : t.state === 'assigned' ? 'info' : 'neutral'}>{STATE_WORDS[t.state]}</StatusPill>,
  },
];

function Queue({ toastApi }: { toastApi: ReturnType<typeof createToastApi> }) {
  const api = useShortcuts();
  const [tickets, setTickets] = useState(TICKETS);
  const [said, setSaid] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const patch = useCallback((id: string, change: Partial<Ticket>) => setTickets((all) => all.map((t) => (t.id === id ? { ...t, ...change } : t))), []);

  const getRowActions = useCallback((ticket: Ticket): ActionPanelAction[] => [
    { id: 'demo.ticket.open', label: 'Open ticket', primary: true, onSelect: () => setSaid(`Opened ${ticket.id}`) },
    {
      id: 'demo.ticket.assign', label: 'Assign to me', group: 'Ticket', keys: 'A', disabled: ticket.state !== 'open',
      description: ticket.state !== 'open' ? `${ticket.id} is ${STATE_WORDS[ticket.state].toLowerCase()}` : undefined,
      onSelect: () => { patch(ticket.id, { state: 'assigned' }); setSaid(`${ticket.id}: assigned to you`); },
    },
    {
      id: 'demo.ticket.priority', label: 'Change priority', description: `${ticket.priority} → ${NEXT_PRIORITY[ticket.priority]}`, group: 'Ticket', keys: 'P', keywords: ['urgency'],
      onSelect: () => { patch(ticket.id, { priority: NEXT_PRIORITY[ticket.priority] }); setSaid(`${ticket.id}: priority ${NEXT_PRIORITY[ticket.priority]}`); },
    },
    {
      id: 'demo.ticket.resolve', label: 'Resolve', group: 'Ticket', keys: 'E', keywords: ['close', 'done'], disabled: ticket.state === 'resolved',
      onSelect: () => { patch(ticket.id, { state: 'resolved' }); setSaid(`${ticket.id}: resolved`); },
    },
    { id: 'demo.ticket.copy', label: 'Copy ticket number', group: 'Share', keywords: ['clipboard'], onSelect: () => setSaid(`Copied ${ticket.id}`) },
    {
      id: 'demo.ticket.archive', label: 'Archive', destructive: true, undoable: true,
      onSelect: () => {
        patch(ticket.id, { archived: true });
        setSaid(`${ticket.id}: archived`);
        toastApi.undoable(`${ticket.id} archived`, { onUndo: () => { patch(ticket.id, { archived: false }); setSaid(`${ticket.id}: back in the queue`); }, onCommit: () => {} });
      },
    },
    {
      id: 'demo.ticket.delete', label: 'Delete ticket', destructive: true, keys: 'Mod+Backspace',
      confirm: { title: `Delete ${ticket.id}?`, description: 'The ticket and its history are removed for everyone. This cannot be undone.', confirmLabel: 'Delete' },
      onSelect: () => { setTickets((all) => all.filter((t) => t.id !== ticket.id)); setSaid(`${ticket.id}: deleted`); },
    },
  ], [patch, toastApi]);

  const rows = useMemo(() => tickets.filter((t) => !t.archived), [tickets]);
  return (
    <div className="uix-stack" data-action-panel-demo="">
      <div className="uix-cluster">
        <Button id="ap-sheet" shortcutId={SHORTCUT_SHEET_ID} onClick={() => api.run(SHORTCUT_SHEET_ID)}>Keyboard shortcuts</Button>
        <Button id="ap-palette" onClick={() => setPaletteOpen(true)}>Commands</Button>
      </div>
      <DataWorkspace<Ticket>
        label="Ticket queue"
        rows={rows}
        getRowId={(t) => t.id}
        idColumn={{ header: 'Ticket', text: (t) => t.id }}
        columns={COLUMNS}
        getRowActions={getRowActions}
        mobile="priority"
      />
      <p role="status" id="ap-status">{said}</p>
      <ShortcutSheet />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        shortcut="Mod+K"
        query={query}
        onQueryChange={setQuery}
        placeholder="Type a command"
        items={[
          { id: 'assign', label: 'Assign to me', group: 'Ticket', shortcutId: 'demo.ticket.assign' },
          { id: 'resolve', label: 'Resolve', group: 'Ticket', shortcutId: 'demo.ticket.resolve' },
          { id: 'restore', label: 'Bring back every ticket', group: 'Queue', onSelect: () => { setTickets(TICKETS); setSaid('Queue reset'); } },
          { id: 'sheet', label: 'Show keyboard shortcuts', group: 'Help', shortcutId: SHORTCUT_SHEET_ID },
        ]}
      />
    </div>
  );
}

export interface ActionPanelDemoProps {
  platform?: KbdPlatform;
  /** Default: its own key, so the docs never change an app's stored choices. */
  storageKey?: string | null;
}

export function ActionPanelDemo({ platform, storageKey = 'uix-docs-action-panel-demo' }: ActionPanelDemoProps) {
  // Its own toast queue: the docs page's other demos keep theirs.
  const [store] = useState(createToastStore);
  const toastApi = useMemo(() => createToastApi(store), [store]);
  return (
    <ShortcutProvider storageKey={storageKey} platform={platform}>
      <Queue toastApi={toastApi} />
      <Toaster store={store} />
    </ShortcutProvider>
  );
}

export function mount(host: HTMLElement): () => void {
  const root = createRoot(host);
  root.render(<StrictMode><ActionPanelDemo /></StrictMode>);
  return () => root.unmount();
}
