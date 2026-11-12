/* The live 2.60 motion on the docs Motion page (Foundations → Motion → "Try it").
 *
 * Every other docs preview is HTML and CSS with a little docs script. The 2.60 motion is driven by
 * the React components themselves (the hover glide, the tooltip hand-over, the rows clearing from
 * a blur, the drawer's swipe), so this one mounts the real @tensor_1/react components, bundled from
 * source by build.mjs. Nothing here re-implements a behaviour: what moves is what consumers get.
 *
 * Built into docs/live/dist/ (not committed) by `node packages/tokens/docs/live/build.mjs`; the docs
 * site workflow builds it before assembling the site. docs.js imports it when the Motion page opens
 * and calls `mount`, which returns the unmount it calls when the page changes. */
import { StrictMode, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Checkbox, DashboardCanvas, DataWorkspace, DialogClose, Drawer, Menu, MenuItem, NavGroup, NavItem, Radio, RadioGroup, Select,
  Sidebar, SidebarSection, SubNavItem, Tooltip,
} from '../../../react/src/index.js';
import type { DashboardCanvasItem, DataWorkspaceColumn } from '../../../react/src/index.js';
import {
  AlertTriangleIcon, ArrowRightIcon, BellIcon, BookOpenIcon, CheckIcon, CopyIcon, DownloadIcon, InboxIcon, LinkIcon,
  PlusIcon, RefreshCwIcon, SearchIcon, SendIcon, SettingsIcon, StarIcon, Trash2Icon, UploadIcon, UsersIcon, XIcon,
} from '../../../react/src/icons/components.js';

const NAV = [
  { label: 'Posteingang', icon: <InboxIcon /> },
  { label: 'Störungen', icon: <AlertTriangleIcon /> },
  { label: 'Wissensdatenbank', icon: <BookOpenIcon /> },
  { label: 'Teams', icon: <UsersIcon /> },
];
const TEAMS = ['Service Desk', 'Arbeitsplatz', 'Netzwerk', 'Fachverfahren', 'Schnittstellen', 'Sicherheit', 'Rechenzentrum', 'Telefonie']
  .map((t) => ({ value: t, label: t }));
const TOOLS: [string, ReactNode][] = [
  ['Suchen', <SearchIcon key="s" />], ['Link einfügen', <LinkIcon key="l" />], ['Kopieren', <CopyIcon key="c" />],
  ['Als PDF herunterladen', <DownloadIcon key="d" />], ['Löschen', <Trash2Icon key="t" />],
];
const STEPS = ['Melder', 'Störung beschreiben', 'Prüfen und senden'];

type Ticket = { id: string; title: string; priority: number };
const QUEUE: Ticket[] = [
  { id: 'INC-0412', title: 'E-Mail-Ausfall im Büro Sarajevo', priority: 1 },
  { id: 'INC-0413', title: 'VPN trennt alle 20 Minuten', priority: 2 },
  { id: 'INC-0415', title: 'Drucker im 3. Stock blockiert', priority: 4 },
  { id: 'INC-0418', title: 'Lohnexport ohne neue Mitarbeitende', priority: 2 },
];
const NEW_TITLES = ['Citrix-Sitzungen trennen sich', 'Telefonanlage ohne Freizeichen', 'Zertifikat läuft in 3 Tagen ab', 'Teams-Kalender synchronisiert nicht'];
const QUEUE_COLUMNS: DataWorkspaceColumn<Ticket>[] = [
  { id: 'id', header: 'Nummer', cell: (t) => t.id, width: '7rem' },
  { id: 'title', header: 'Titel', cell: (t) => t.title },
  { id: 'priority', header: 'Priorität', cell: (t) => `P${t.priority}` },
];

type Widget = DashboardCanvasItem & { title: string; value: string };
const WIDGETS: Widget[] = [
  { id: 'open', col: 0, row: 0, w: 4, h: 2, title: 'Offene Störungen', value: '17' },
  { id: 'sla', col: 4, row: 0, w: 4, h: 2, title: 'SLA in Gefahr', value: '3' },
  { id: 'new', col: 8, row: 0, w: 4, h: 2, title: 'Neu heute', value: '9' },
  { id: 'mine', col: 0, row: 2, w: 6, h: 2, title: 'Mir zugewiesen', value: '5' },
  { id: 'done', col: 6, row: 2, w: 6, h: 2, title: 'Diese Woche gelöst', value: '42' },
];

function Demo({ title, hint, children }: { title: string; hint: ReactNode; children: ReactNode }) {
  return (
    <section className="uix-docs__live-demo">
      <div className="uix-docs__live-head"><strong>{title}</strong><span>{hint}</span></div>
      <div className="uix-docs__live-stage">{children}</div>
    </section>
  );
}

function SidebarDemo() {
  const [current, setCurrent] = useState('Posteingang');
  return (
    <div className="uix-docs__live-sidebar">
      <Sidebar brand="Servis" aria-label="Demo-Navigation">
        <SidebarSection label="Arbeit">
          {NAV.map((n) => (
            <NavItem key={n.label} href="#motion" icon={n.icon} active={current === n.label} onClick={(e) => { e.preventDefault(); setCurrent(n.label); }}>{n.label}</NavItem>
          ))}
        </SidebarSection>
        <NavGroup icon={<SettingsIcon />} label="Einstellungen" defaultExpanded={false}>
          <SubNavItem href="#motion" onClick={(e) => e.preventDefault()}>Allgemein</SubNavItem>
          <SubNavItem href="#motion" onClick={(e) => e.preventDefault()}>Benachrichtigungen</SubNavItem>
          <SubNavItem href="#motion" onClick={(e) => e.preventDefault()}>Integrationen</SubNavItem>
        </NavGroup>
      </Sidebar>
    </div>
  );
}

function ListsDemo() {
  const [team, setTeam] = useState('');
  return (
    <div className="uix-docs__live-row">
      <div className="uix-docs__live-select"><Select aria-label="Team" placeholder="Team wählen" options={TEAMS} value={team} onValueChange={(v) => setTeam(String(v))} /></div>
      <Menu trigger={<Button variant="secondary">Aktionen</Button>} label="Aktionen">
        <MenuItem>Duplizieren</MenuItem><MenuItem>Link kopieren</MenuItem><MenuItem>Exportieren</MenuItem><MenuItem>Archivieren</MenuItem>
      </Menu>
    </div>
  );
}

function ChoiceDemo() {
  const [channel, setChannel] = useState('mail');
  return (
    <div className="uix-docs__live-row uix-docs__live-row--top">
      <div className="uix-stack uix-stack--compact">
        <Checkbox label="Melder benachrichtigen" defaultChecked={false} />
        <Checkbox label="Im Wissensartikel verlinken" defaultChecked />
      </div>
      <RadioGroup label="Kanal">
        {[['mail', 'E-Mail'], ['phone', 'Telefon'], ['portal', 'Portal']].map(([value, label]) => (
          <Radio key={value} name="docs-live-channel" value={value} label={label} checked={channel === value} onChange={() => setChannel(value)} />
        ))}
      </RadioGroup>
    </div>
  );
}

function IconsDemo() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="uix-docs__live-row uix-docs__live-row--wrap">
      <Button variant="secondary"><RefreshCwIcon animate />Aktualisieren</Button>
      <Button variant="secondary">Weiter<ArrowRightIcon animate /></Button>
      <Button variant="secondary"><DownloadIcon animate />Exportieren</Button>
      <Button variant="secondary"><UploadIcon animate />Hochladen</Button>
      <Button variant="secondary"><SendIcon animate />Senden</Button>
      <Button variant="secondary"><PlusIcon animate />Neu</Button>
      <Button variant="ghost" icon aria-label="Einstellungen"><SettingsIcon animate /></Button>
      <Button variant="ghost" icon aria-label="Benachrichtigungen"><BellIcon animate /></Button>
      <Button variant="ghost" icon aria-label="Favorit"><StarIcon animate /></Button>
      <Button variant="ghost" icon aria-label="Löschen"><Trash2Icon animate /></Button>
      <Button variant="ghost" icon aria-label="Schließen"><XIcon animate /></Button>
      <Button variant="secondary" onClick={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}>
        {copied ? <CheckIcon animate /> : <CopyIcon animate />}{copied ? 'Kopiert' : 'Kopieren'}
      </Button>
      <Button variant="secondary"><DownloadIcon />Ohne animate</Button>
    </div>
  );
}

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  return (
    <div className="uix-docs__live-row uix-docs__live-row--wrap">
      <Button onClick={() => setOpen(true)}>Details öffnen</Button>
      <Checkbox label="Mit ungespeicherter Änderung" checked={dirty} onChange={(e) => setDirty(e.currentTarget.checked)} />
      <Drawer open={open} dirty={dirty} title="INC-0417 · Citrix-Sitzungen trennen sich" onClose={() => setOpen(false)}
        footer={<DialogClose variant="secondary">Schließen</DialogClose>}>
        <p>Seit 08:10 trennen sich Citrix-Sitzungen am Standort Mostar nach etwa zehn Minuten.</p>
        <p>Auf einem Touchgerät lässt sich die Schublade zum Rand ziehen, um sie zu schließen. Mit ungespeicherter Änderung springt sie zurück und fragt zuerst.</p>
      </Drawer>
    </div>
  );
}

function StepsDemo() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const go = (next: number) => { setDir(next > step ? 'forward' : 'back'); setStep(next); };
  return (
    <div className="uix-stack uix-stack--compact">
      <div className="uix-docs__live-steps">
        <div key={step} className={`uix-docs__live-step uix-anim-step-${dir}`}>
          <span className="uix-docs__live-step-count">Schritt {step + 1} von {STEPS.length}</span>
          <strong>{STEPS[step]}</strong>
        </div>
      </div>
      <div className="uix-cluster">
        <Button variant="secondary" disabled={step === 0} onClick={() => go(step - 1)}>Zurück</Button>
        <Button disabled={step === STEPS.length - 1} onClick={() => go(step + 1)}>Weiter</Button>
      </div>
    </div>
  );
}

function RowsDemo() {
  const [rows, setRows] = useState(QUEUE);
  const [next, setNext] = useState(0);
  // each press flips the order (worst priority first, then best first), so every press moves rows
  const [descending, setDescending] = useState(false);
  const resort = () => {
    const dir = descending ? 1 : -1;
    setDescending(!descending);
    setRows((r) => [...r].sort((a, b) => dir * (a.priority - b.priority || a.id.localeCompare(b.id))));
  };
  const add = () => {
    setRows((r) => [{ id: `INC-${String(520 + next).padStart(4, '0')}`, title: NEW_TITLES[next % NEW_TITLES.length], priority: 2 + (next % 3) }, ...r]);
    setNext((n) => n + 1);
  };
  return (
    <div className="uix-stack uix-stack--compact">
      <div className="uix-cluster">
        <Button variant="secondary" onClick={add}>Neue Meldung</Button>
        <Button variant="secondary" disabled={rows.length < 2} onClick={() => setRows((r) => r.filter((_, i) => i !== 1))}>Zweite erledigen</Button>
        <Button variant="secondary" disabled={rows.length < 2} onClick={resort}>Umsortieren</Button>
        <Button variant="secondary" onClick={() => setRows((r) => (r.length ? [] : QUEUE))}>{rows.length ? 'Alle erledigen' : 'Zurücksetzen'}</Button>
      </div>
      <DataWorkspace<Ticket> label="Störungen" rows={rows} getRowId={(t) => t.id} columns={QUEUE_COLUMNS} rowMotion
        labels={{ empty: 'Keine offenen Störungen', emptyDetail: 'Neue Meldungen erscheinen hier, sobald sie eingehen.' }} />
    </div>
  );
}

function CanvasDemo() {
  const [items, setItems] = useState(WIDGETS);
  return (
    <DashboardCanvas<Widget>
      items={items}
      editable
      rowHeight="3rem"
      itemLabel={(w) => w.title}
      onLayoutChange={(next) => setItems(next)}
      renderItem={(w) => (
        <div className="uix-docs__live-widget"><span>{w.title}</span><strong>{w.value}</strong></div>
      )}
    />
  );
}

function Playground() {
  return (
    <div className="uix-docs__live-grid">
      <Demo title="Sidebar" hint="Move the pointer down the rows, click another page, open Einstellungen. Tab moves the highlight too.">
        <SidebarDemo />
      </Demo>
      <div className="uix-docs__live-col">
        <Demo title="Tooltip hand-over" hint="Hover one button, then slide to its neighbours: one bubble travels and swaps its label.">
          <div role="toolbar" aria-label="Werkzeuge" className="uix-docs__live-toolbar">
            {TOOLS.map(([label, icon]) => (
              <Tooltip key={label} label={label}><Button icon variant="ghost" aria-label={label}>{icon}</Button></Tooltip>
            ))}
          </div>
        </Demo>
        <Demo title="Select and Menu" hint="Open a list: it grows from the trigger, rows arrive one after another. Pick a team: its check draws, the value swaps.">
          <ListsDemo />
        </Demo>
        <Demo title="Checkbox and radio" hint="Tick a box: it fills, then the tick draws. Pick a channel: the dot springs in.">
          <ChoiceDemo />
        </Demo>
      </div>
      <Demo title="Animated icons" hint="Hover a button: its icon plays one short motion. Copy swaps to a check that draws itself. The last button has no animate.">
        <IconsDemo />
      </Demo>
      <Demo title="Floating drawer" hint="Open it: it slides in 8 px from the edges over a blurred dim. On touch, drag it to the edge to close.">
        <DrawerDemo />
      </Demo>
      <Demo title="Step entrance" hint="Weiter and Zurück: each step slides in from the way you are going.">
        <StepsDemo />
      </Demo>
      <Demo title="Rows that move (DataWorkspace rowMotion)" hint="Add a ticket: it rises in at the top. Erledigen: the row fades and the rows below glide up. Umsortieren glides every row to its new place. Alle erledigen: the empty state waits until the last rows have gone.">
        <RowsDemo />
      </Demo>
      <Demo title="Card lift (DashboardCanvas)" hint="Drag a card by its move handle: it lifts and stays solid while the dashed outline shows where it lands, then it settles. Drag the resize corner: the card only dims.">
        <CanvasDemo />
      </Demo>
    </div>
  );
}

/** Mounts the playground into `el`; returns the unmount. */
export function mount(el: HTMLElement): () => void {
  const root = createRoot(el);
  root.render(<StrictMode><Playground /></StrictMode>);
  return () => root.unmount();
}
