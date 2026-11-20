/* The live command palette on its component page (Navigation → Command palette → "Try it"), and the
 * scene tests/a11y/command-palette-sources.spec.mjs drives (tests/command-palette-sources/harness.tsx
 * mounts it). Roadmap #9.
 *
 * A small service desk: a fake server answers ticket and people searches after a delay (switch it
 * to slow or failing), "Assign to…" and "Set priority…" open pages, "Mark done" also answers to
 * Archive and Resolve, the screen switch boosts the commands that fit it, and the palette learns
 * what you use (useCommandFrecency, under its own localStorage key). docs.js imports this when the
 * page opens and calls `mount`, which returns the unmount it calls when the page changes. */
import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, COMMAND_PALETTE_SHORTCUT_ID, CommandPalette, Segmented, SegmentedOption, ShortcutProvider, Switch, foldForSearch, useCommandFrecency,
} from '../../../react/src/index.js';
import type { CommandPaletteItem, CommandPalettePage, CommandPaletteSource } from '../../../react/src/index.js';

const PEOPLE = ['Ana Kovač', 'Emir Hadžić', 'Lea Novak', 'Đorđe Petrović', 'Marta Schulz', 'Jonas Weber', 'Selma Begić'];
const TICKETS = [
  ['INC-0412', 'E-mail outage in the Sarajevo office'],
  ['INC-0413', 'VPN drops every 20 minutes'],
  ['INC-0414', 'Printer on the 2nd floor prints blank pages'],
  ['INC-0415', 'New starter needs a laptop by Monday'],
  ['INC-0416', 'Password reset loops back to the sign-in page'],
  ['INC-0417', 'Shared drive is read-only for the finance team'],
] as const;

/** What the demo's fake server does: how long it takes, whether it fails, and who asked. */
export interface DemoServer {
  latency: number;
  fail: boolean;
  /** Every search the palette started, with its signal (the spec reads whether it was aborted). */
  calls?: { kind: string; query: string; signal: AbortSignal }[];
}

const folded = (text: string) => foldForSearch(text).text;

/** A search that answers after `latency` ms, honours the abort signal, and fails when told to. */
function search<T>(server: DemoServer, kind: string, query: string, signal: AbortSignal, rows: readonly T[], text: (row: T) => string): Promise<T[]> {
  server.calls?.push({ kind, query, signal });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (server.fail) { reject(new Error('503 Service Unavailable')); return; }
      const q = folded(query);
      resolve(rows.filter((row) => folded(text(row)).includes(q)).slice(0, 5));
    }, server.latency);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
}

type Screen = 'queue' | 'ticket';

export interface CommandPaletteDemoProps {
  /** The fake server; the demo's own switches change `latency` and `fail` on it. */
  server?: DemoServer;
  /** Where the demo keeps what it learned. Default: its own key, so the docs never touch an app's ranking; `null` for none. */
  storageKey?: string | null;
}

export function CommandPaletteDemo({ server: serverProp, storageKey = 'uix-docs-command-palette-frecency' }: CommandPaletteDemoProps) {
  const server = useRef<DemoServer>(serverProp ?? { latency: 450, fail: false }).current;
  const [slow, setSlow] = useState(server.latency > 1000);
  const [fail, setFail] = useState(server.fail);
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('ticket');
  const [said, setSaid] = useState('Nothing yet.');
  const frecency = useCommandFrecency(storageKey === null ? { storage: null } : { storageKey });
  const baseLatency = useRef(server.latency > 1000 ? 450 : server.latency).current;

  const items = useMemo<CommandPaletteItem[]>(() => {
    const onTicket = screen === 'ticket' ? 1 : 0;
    const onQueue = screen === 'queue' ? 1 : 0;
    const people: CommandPaletteSource = {
      id: 'people', label: 'People', minQueryLength: 1,
      load: (query, signal) => search(server, 'people', query, signal, PEOPLE, (name) => name)
        .then((rows) => rows.map((name) => ({ id: `person-${name}`, label: name, onSelect: () => setSaid(`INC-0413 assigned to ${name}.`) }))),
    };
    const assign: CommandPalettePage = {
      id: 'assign', label: 'Assign to…', placeholder: 'Search people…',
      items: [{ id: 'assign-me', label: 'Assign to me', aliases: ['Self', 'Take'], onSelect: () => setSaid('INC-0413 assigned to you.') }],
      sources: [people],
    };
    const priority: CommandPalettePage = {
      id: 'priority', label: 'Set priority…',
      items: ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'].map((label) => ({ id: `priority-${label}`, label, onSelect: () => setSaid(`INC-0413 is now ${label}.`) })),
    };
    return [
      { id: 'done', label: 'Mark done', group: 'Ticket', aliases: ['Archive', 'Resolve'], shortcut: ['E'], contextBoost: onTicket, onSelect: () => setSaid('INC-0413 marked done.') },
      { id: 'assign', label: 'Assign to…', group: 'Ticket', shortcut: ['A'], contextBoost: onTicket, page: assign },
      { id: 'priority', label: 'Set priority…', group: 'Ticket', contextBoost: onTicket, page: priority },
      { id: 'comment', label: 'Add comment', group: 'Ticket', aliases: ['Reply', 'Note'], shortcut: ['C'], contextBoost: onTicket, onSelect: () => setSaid('Comment box opened.') },
      { id: 'my-queue', label: 'Go to my queue', group: 'Go to', shortcut: ['G', 'M'], contextBoost: onQueue, onSelect: () => setScreen('queue') },
      { id: 'all', label: 'Go to all incidents', group: 'Go to', shortcut: ['G', 'I'], contextBoost: onQueue, onSelect: () => setScreen('queue') },
      { id: 'reports', label: 'Open reports', group: 'Go to', aliases: ['Dashboards', 'Analytics'], onSelect: () => setSaid('Reports opened.') },
      { id: 'theme', label: 'Change theme', group: 'Settings', aliases: ['Dark mode'], onSelect: () => setSaid('Theme menu opened.') },
      { id: 'keys', label: 'Keyboard shortcuts', group: 'Settings', aliases: ['Hotkeys'], shortcut: ['?'], onSelect: () => setSaid('Shortcut sheet opened.') },
    ];
  }, [screen, server]);

  const sources = useMemo<CommandPaletteSource[]>(() => [
    {
      id: 'tickets', label: 'Tickets', minQueryLength: 2, contextBoost: screen === 'queue' ? 1 : 0,
      load: (query, signal) => search(server, 'tickets', query, signal, TICKETS, ([id, title]) => `${id} ${title}`)
        .then((rows) => rows.map(([id, title]) => ({ id, label: `${id} ${title}`, onSelect: () => setSaid(`${id} opened.`) }))),
    },
    {
      id: 'people', label: 'People', minQueryLength: 2,
      load: (query, signal) => search(server, 'people', query, signal, PEOPLE, (name) => name)
        .then((rows) => rows.map((name) => ({ id: `profile-${name}`, label: name, description: 'Profile', onSelect: () => setSaid(`${name}'s profile opened.`) }))),
    },
  ], [screen, server]);

  return (
    <div className="uix-stack" style={{ ['--gap' as string]: 'var(--uix-space-4)' }} data-command-palette-demo="">
      <div className="uix-cluster" style={{ ['--gap' as string]: 'var(--uix-space-4)', alignItems: 'center' }}>
        <Button id="palette-launch" variant="primary" shortcutId={COMMAND_PALETTE_SHORTCUT_ID} onClick={() => setOpen(true)}>Open the palette</Button>
        <Segmented aria-label="Screen" selection="radio" value={screen} onChange={(value) => setScreen(value as Screen)}>
          <SegmentedOption value="ticket">On a ticket</SegmentedOption>
          <SegmentedOption value="queue">In the queue</SegmentedOption>
        </Segmented>
      </div>
      <div className="uix-cluster" style={{ ['--gap' as string]: 'var(--uix-space-4)', alignItems: 'center' }}>
        <Switch label="Slow server (1.5 s)" checked={slow} onChange={(event) => { const on = event.currentTarget.checked; setSlow(on); server.latency = on ? 1500 : baseLatency; }} />
        <Switch label="Server fails" checked={fail} onChange={(event) => { const on = event.currentTarget.checked; setFail(on); server.fail = on; }} />
        <Button variant="ghost" size="sm" onClick={() => { frecency.reset(); setSaid('Ranking reset.'); }}>Reset ranking</Button>
      </div>
      <p className="uix-text-meta" role="status" data-demo-said="">{said}</p>
      <CommandPalette
        id="demo-palette"
        open={open}
        onOpenChange={setOpen}
        shortcut="Mod+K"
        inputLabel="Commands"
        placeholder="Search commands, tickets and people…"
        items={items}
        sources={sources}
        frecency={frecency}
        recent={frecency.recent(items, 3)}
      />
    </div>
  );
}

export function mount(host: HTMLElement): () => void {
  const root = createRoot(host);
  root.render(<StrictMode><ShortcutProvider storageKey={null}><CommandPaletteDemo /></ShortcutProvider></StrictMode>);
  return () => root.unmount();
}
