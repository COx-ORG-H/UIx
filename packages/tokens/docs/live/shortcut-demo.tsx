/* The live shortcut registry on its component page (Navigation → Shortcut sheet → "Try it"), and the
 * scene tests/a11y/shortcut-registry.spec.mjs drives (tests/shortcut-registry/harness.tsx mounts it).
 *
 * A small ticket queue: G then I and G then M switch the view, J / K move through the list and A /
 * E assign and resolve the focused ticket (only while focus is in the list: a ShortcutScope), Ctrl+K
 * or ⌘K opens the command palette, ? opens the shortcut sheet with the character-key switch. Every
 * hint (the buttons, the menu, the palette, the sheet) reads its keys from the registry, so the
 * "Assign with Alt+A" remap shows everywhere at once. docs.js imports this when the page opens and
 * calls `mount`, which returns the unmount it calls when the page changes. */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, COMMAND_PALETTE_SHORTCUT_ID, CommandPalette, KbdCombo, List, ListItem, Menu, MenuItem, SHORTCUT_SHEET_ID, ShortcutProvider,
  ShortcutScope, ShortcutSheet, StatusPill, Switch, useShortcut, useShortcuts,
} from '../../../react/src/index.js';
import { MoreHorizontalIcon } from '../../../react/src/icons.js';
import type { KbdPlatform } from '../../../react/src/index.js';

interface Ticket { id: string; title: string; mine: boolean; state: 'open' | 'assigned' | 'resolved' }

const TICKETS: Ticket[] = [
  { id: 'INC-0412', title: 'E-Mail-Ausfall im Büro Sarajevo', mine: true, state: 'open' },
  { id: 'INC-0413', title: 'VPN drops every 20 minutes', mine: false, state: 'open' },
  { id: 'INC-0414', title: 'Drucker im 2. Stock druckt leere Seiten', mine: true, state: 'open' },
  { id: 'INC-0415', title: 'New starter needs a laptop by Monday', mine: false, state: 'open' },
];

const STATE_WORDS: Record<Ticket['state'], string> = { open: 'Open', assigned: 'Assigned to you', resolved: 'Resolved' };

function TicketList({ tickets, onChange, onSay }: { tickets: Ticket[]; onChange: (id: string, state: Ticket['state']) => void; onSay: (text: string) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(tickets[0]?.id ?? null);
  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-ticket]') ?? []);
  const move = (by: number) => {
    const all = rows();
    const at = all.findIndex((row) => row.dataset.ticket === active);
    all[Math.min(all.length - 1, Math.max(0, at + by))]?.focus();
  };
  const act = (state: Ticket['state']) => {
    if (!active) return;
    onChange(active, state);
    onSay(`${active}: ${STATE_WORDS[state]}`);
  };
  useShortcut({ id: 'demo.next', keys: 'J', label: 'Next ticket', repeat: true, handler: () => move(1) });
  useShortcut({ id: 'demo.previous', keys: 'K', label: 'Previous ticket', repeat: true, handler: () => move(-1) });
  useShortcut({ id: 'demo.assign', keys: 'A', label: 'Assign to me', group: 'Ticket', handler: () => act('assigned') });
  useShortcut({ id: 'demo.resolve', keys: 'E', label: 'Resolve', group: 'Ticket', handler: () => act('resolved') });
  return (
    <div ref={listRef}>
    <List roving aria-label="Tickets">
      {tickets.map((ticket) => (
        <ListItem
          key={ticket.id}
          data-ticket={ticket.id}
          title={ticket.title}
          meta={ticket.id}
          onFocus={() => setActive(ticket.id)}
          trail={(
            <>
              <StatusPill tone={ticket.state === 'resolved' ? 'success' : ticket.state === 'assigned' ? 'info' : 'neutral'}>{STATE_WORDS[ticket.state]}</StatusPill>
              <Menu trigger={<Button size="sm" variant="ghost" icon aria-label={`Actions for ${ticket.id}`}><MoreHorizontalIcon size="sm" aria-hidden="true" /></Button>}>
                <MenuItem shortcutId="demo.assign" onSelect={() => { setActive(ticket.id); onChange(ticket.id, 'assigned'); onSay(`${ticket.id}: ${STATE_WORDS.assigned}`); }}>Assign to me</MenuItem>
                <MenuItem shortcutId="demo.resolve" onSelect={() => { setActive(ticket.id); onChange(ticket.id, 'resolved'); onSay(`${ticket.id}: ${STATE_WORDS.resolved}`); }}>Resolve</MenuItem>
              </Menu>
            </>
          )}
        />
      ))}
    </List>
    </div>
  );
}

function Queue() {
  const api = useShortcuts();
  const [view, setView] = useState<'inbox' | 'mine'>('inbox');
  const [tickets, setTickets] = useState(TICKETS);
  const [said, setSaid] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  useShortcut({ id: 'demo.inbox', keys: 'G I', label: 'Go to the inbox', group: 'Navigation', handler: () => { setView('inbox'); setSaid('Inbox'); } });
  useShortcut({ id: 'demo.mine', keys: 'G M', label: 'Go to my tickets', group: 'Navigation', handler: () => { setView('mine'); setSaid('My tickets'); } });
  const shown = view === 'inbox' ? tickets : tickets.filter((ticket) => ticket.mine);
  const change = (id: string, state: Ticket['state']) => setTickets((all) => all.map((ticket) => (ticket.id === id ? { ...ticket, state } : ticket)));
  const remapped = api.preferences.overrides['demo.assign'] != null;
  const pending = api.pending;
  return (
    <div className="uix-stack" data-shortcut-demo="">
      <div className="uix-cluster">
        <Button id="demo-sheet" shortcutId={SHORTCUT_SHEET_ID} onClick={() => api.run(SHORTCUT_SHEET_ID)}>Keyboard shortcuts</Button>
        <Button id="demo-palette" shortcutId={COMMAND_PALETTE_SHORTCUT_ID} onClick={() => setPaletteOpen(true)}>Commands</Button>
      </div>
      <h3 id="demo-view">{view === 'inbox' ? 'Inbox' : 'My tickets'}</h3>
      <ShortcutScope label="Ticket list">
        <TicketList tickets={shown} onChange={change} onSay={setSaid} />
      </ShortcutScope>
      <p role="status" id="demo-status">
        {pending ? <>Pressed <KbdCombo keys={pending} />, waiting for the next key…</> : said}
      </p>
      <Switch
        id="demo-remap"
        label="Assign with Alt+A instead of A"
        checked={remapped}
        onChange={(event) => api.setOverride('demo.assign', event.currentTarget.checked ? 'Alt+A' : undefined)}
      />
      <ShortcutSheet />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        shortcut="Mod+K"
        query={query}
        onQueryChange={setQuery}
        placeholder="Type a command"
        items={[
          { id: 'assign', label: 'Assign to me', group: 'Ticket', shortcutId: 'demo.assign' },
          { id: 'resolve', label: 'Resolve', group: 'Ticket', shortcutId: 'demo.resolve' },
          { id: 'inbox', label: 'Go to the inbox', group: 'Navigation', shortcutId: 'demo.inbox' },
          { id: 'mine', label: 'Go to my tickets', group: 'Navigation', shortcutId: 'demo.mine' },
          { id: 'sheet', label: 'Show keyboard shortcuts', group: 'Help', shortcutId: SHORTCUT_SHEET_ID },
        ]}
      />
    </div>
  );
}

export interface ShortcutDemoProps {
  platform?: KbdPlatform;
  /** Default: its own key, so the docs never change an app's stored choices. */
  storageKey?: string | null;
}

export function ShortcutDemo({ platform, storageKey = 'uix-docs-shortcut-demo' }: ShortcutDemoProps) {
  return (
    <ShortcutProvider storageKey={storageKey} platform={platform}>
      <Queue />
    </ShortcutProvider>
  );
}

export function mount(host: HTMLElement): () => void {
  const root = createRoot(host);
  root.render(<StrictMode><ShortcutDemo /></StrictMode>);
  return () => root.unmount();
}
