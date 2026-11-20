/* The live undo deltas on the Toast page (Feedback & overlays → Toast → "Try it"), and the scene
 * tests/a11y/toast-undo.spec.mjs drives (tests/toast-undo/harness.tsx mounts it). Enterprise UX
 * study, roadmap #23; spec Docs/specs/2026-11-20-undo-deltas.md.
 *
 * A small ticket queue: Resolve is undoable, and resolving several in a row merges into one toast
 * ("Resolved 3 tickets") with a countdown that pauses on hover and focus. Ctrl/⌘+Z undoes the newest
 * one (not inside the note field, where the browser's own undo applies) and the ? sheet lists it. An
 * alert storm shows the rate limit's summary; "Do not disturb" holds normal toasts until it is off.
 * docs.js imports this when the page opens and calls `mount`, which returns the unmount it calls when
 * the page changes. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Input, SHORTCUT_SHEET_ID, ShortcutProvider, ShortcutSheet, StatusPill, Switch, Toaster, createToastApi, createToastStore,
  useShortcuts, useToastQuiet,
} from '../../../react/src/index.js';
import type { KbdPlatform, ToastApi } from '../../../react/src/index.js';

interface Ticket { id: string; title: string; resolved: boolean }

const TICKETS: Ticket[] = [
  { id: 'INC-0412', title: 'E-Mail-Ausfall im Büro Sarajevo', resolved: false },
  { id: 'INC-0413', title: 'VPN drops every 20 minutes', resolved: false },
  { id: 'INC-0414', title: 'Drucker im 2. Stock druckt leere Seiten', resolved: false },
  { id: 'INC-0415', title: 'New starter needs a laptop by Monday', resolved: false },
];

function Queue({ api }: { api: ToastApi }) {
  const shortcuts = useShortcuts();
  const quiet = useToastQuiet(api.store);
  const [tickets, setTickets] = useState(TICKETS);
  const [each, setEach] = useState(false);
  const [log, setLog] = useState('Nothing committed yet.');
  const set = (id: string, resolved: boolean) => setTickets((all) => all.map((t) => (t.id === id ? { ...t, resolved } : t)));
  const resolve = (ticket: Ticket) => {
    set(ticket.id, true);
    api.undoable(`Resolved ${ticket.id}`, {
      group: 'resolve',
      groupMessage: (n) => `Resolved ${n} tickets`,
      undoGroup: each ? 'each' : 'all',
      onUndo: () => set(ticket.id, false),
      onCommit: () => setLog(`Committed: ${ticket.id} resolved.`),
    });
  };
  const alertStorm = () => {
    for (let i = 1; i <= 12; i += 1) api.info(`Monitor alert ${i}: CPU above 90 % on app-${String(i).padStart(2, '0')}`);
  };
  return (
    <div className="uix-stack" data-toast-undo-demo="">
      <ul className="uix-stack" aria-label="Tickets" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {tickets.map((ticket) => (
          <li key={ticket.id} className="uix-cluster" data-ticket={ticket.id} style={{ justifyContent: 'space-between' }}>
            <span><strong>{ticket.id}</strong> {ticket.title}</span>
            <span className="uix-cluster">
              <StatusPill tone={ticket.resolved ? 'success' : 'neutral'}>{ticket.resolved ? 'Resolved' : 'Open'}</StatusPill>
              <Button size="sm" disabled={ticket.resolved} onClick={() => resolve(ticket)} aria-label={`Resolve ${ticket.id}`}>Resolve</Button>
            </span>
          </li>
        ))}
      </ul>
      <div className="uix-cluster">
        <Button id="demo-storm" onClick={alertStorm}>Alert storm (12 toasts)</Button>
        <Button id="demo-fail" onClick={() => api.error('Sync with the CMDB failed', { description: 'Errors show even in Do not disturb.' })}>Fail a sync</Button>
        <Button id="demo-sheet" shortcutId={SHORTCUT_SHEET_ID} onClick={() => shortcuts.run(SHORTCUT_SHEET_ID)}>Keyboard shortcuts</Button>
      </div>
      <Switch id="demo-each" label="Undo resolves one at a time" checked={each} onChange={(e) => setEach(e.currentTarget.checked)} />
      <Switch id="demo-quiet" label="Do not disturb" checked={quiet} onChange={(e) => api.setQuiet(e.currentTarget.checked)} />
      <label className="uix-stack" style={{ gap: 'var(--uix-space-1)' }}>
        <span>Note (Ctrl/⌘+Z here undoes your typing, not a ticket)</span>
        <Input id="demo-note" />
      </label>
      <p id="demo-log">{log}</p>
      <ShortcutSheet />
      <Toaster store={api.store} />
    </div>
  );
}

export interface ToastUndoDemoProps {
  platform?: KbdPlatform;
  /** Default: its own key, so the docs never change an app's stored shortcut choices. */
  storageKey?: string | null;
  /** The toast queue; default one of the demo's own. */
  api?: ToastApi;
}

export function ToastUndoDemo({ platform, storageKey = 'uix-docs-toast-undo-demo', api }: ToastUndoDemoProps) {
  const [own] = useState(() => api ?? createToastApi(createToastStore()));
  return (
    <ShortcutProvider storageKey={storageKey} platform={platform}>
      <Queue api={own} />
    </ShortcutProvider>
  );
}

export function mount(host: HTMLElement): () => void {
  const root = createRoot(host);
  root.render(<StrictMode><ToastUndoDemo /></StrictMode>);
  return () => root.unmount();
}
