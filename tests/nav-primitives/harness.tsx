/* Live harness for the navigation primitives of the overlays-and-keyboard batch, bundled by
 * build.mjs from source for tests/a11y/nav-primitives.spec.mjs. German labels, as TENSOR renders.
 *
 *   #tabs     HAR-1754  Tabs overflow="wrap" (the default) in a 240 px column and at 320 px, in all
 *                       three variants, with long and unbroken labels; a strip in a form (HAR-1764)
 *   #nav      HAR-1810  NavItem as="button" with a ref that anchors a Popover (the account row)
 *   #tree     HAR-1828  an expanded org chart: each row named by its own label; a rich row named
 *                       by `ariaLabel`
 *   #rows     HAR-1829  useVirtualRows with measureRows over a table whose rows render taller than
 *                       the estimate (kit padding and a second line)
 *
 * window.__nav.submits counts submits of the tab form.
 */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NavItem, Popover, Sidebar, Tab, TabPanel, Tabs, Tree, useVirtualRows } from '../../packages/react/src/index.js';

declare global { interface Window { __nav: { submits: number; rows?: { rowHeight: number; totalHeight: number; startIndex: number } } } }

const TABS = [
  { value: 'overview', label: 'Übersicht' },
  { value: 'worklog', label: 'Arbeitsprotokoll' },
  { value: 'cis', label: 'Verknüpfte Konfigurationselemente' },
  { value: 'reporting', label: 'Regulatorische Meldungen' },
  { value: 'audit', label: 'Prüfpfad' },
];
const UNBROKEN = 'Datenschutzfolgenabschätzungsverfahrensdokumentation';

function TabRow({ id, variant, labels = TABS, initial = 'worklog' }: { id: string; variant: 'line' | 'enclosed' | 'pill'; labels?: typeof TABS; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <Tabs id={id} variant={variant} value={value} onChange={setValue} aria-label={`Vorfall (${variant})`}>
        {labels.map((tab) => <Tab key={tab.value} value={tab.value}>{tab.label}</Tab>)}
        {labels.map((tab) => <TabPanel key={`p-${tab.value}`} value={tab.value} style={{ padding: 'var(--uix-space-3) 0', overflowWrap: 'anywhere' }}>{tab.label}: Inhalt.</TabPanel>)}
      </Tabs>
    </div>
  );
}

function TabCases() {
  const [value, setValue] = useState('edit');
  return (
    <section id="tabs">
      <h2>Tabs, die umbrechen (HAR-1754)</h2>
      <div className="col-240" id="tabs-240"><TabRow id="tabs-line-240" variant="line" /></div>
      <div className="col-320" id="tabs-320">
        <TabRow id="tabs-line" variant="line" />
        <TabRow id="tabs-enclosed" variant="enclosed" initial="overview" />
        <TabRow id="tabs-pill" variant="pill" initial="reporting" />
        <TabRow id="tabs-unbroken" variant="line" initial="long" labels={[{ value: 'long', label: UNBROKEN }, { value: 'short', label: 'Kurz' }]} />
      </div>
      <div id="tabs-wide"><TabRow id="tabs-line-wide" variant="line" /></div>
      <form id="tab-form" onSubmit={(event) => { event.preventDefault(); window.__nav.submits += 1; }}>
        <Tabs id="tabs-form" value={value} onChange={setValue} aria-label="Artikel">
          <Tab value="edit">Bearbeiten</Tab>
          <Tab value="preview">Vorschau</Tab>
          <TabPanel value="edit"><textarea aria-label="Artikeltext" defaultValue="Entwurf" /></TabPanel>
          <TabPanel value="preview"><p>Entwurf</p></TabPanel>
        </Tabs>
      </form>
    </section>
  );
}

function NavCases() {
  const account = useRef<HTMLButtonElement>(null);
  // `popoverTarget` is a valid HTML attribute but absent from React 18's DOM types.
  const opens = { popoverTarget: 'account-menu' } as Record<string, string>;
  return (
    <section id="nav">
      <h2>Navigation (HAR-1810)</h2>
      <div className="rail">
        <Sidebar aria-label="Hauptnavigation">
          <NavItem href="#inbox" active>Posteingang</NavItem>
          <NavItem href="#changes">Änderungen</NavItem>
          <NavItem as="button" id="account" ref={account} aria-haspopup="dialog" {...opens}>Ada Lovelace</NavItem>
        </Sidebar>
      </div>
      <Popover id="account-menu" anchor={account} placement="right-start" aria-label="Konto">
        <p style={{ margin: 0 }}>Angemeldet als Ada Lovelace</p>
      </Popover>
    </section>
  );
}

const ORG = [
  {
    id: 'grace', label: 'Grace Hopper',
    children: [
      { id: 'alice', label: 'Alice Lovelace' },
      { id: 'bob builder', label: 'Bob Builder', children: [{ id: 'cleo', label: 'Cleo Ruiz' }] },
    ],
  },
  {
    id: 'mira', ariaLabel: 'Mira Kovač',
    label: <span>Mira Kovač <small style={{ color: 'var(--uix-text-hushed)' }}>Leitung Netzwerk · 2 Berichte</small></span>,
    children: [{ id: 'jan', label: 'Jan Novak' }, { id: 'ana', label: 'Ana Petrović' }],
  },
];

function TreeCases() {
  return (
    <section id="tree">
      <h2>Organigramm (HAR-1828)</h2>
      <Tree nodes={ORG} defaultExpanded={new Set(['grace', 'bob builder', 'mira'])} aria-label="Organigramm" />
    </section>
  );
}

const ROWS = Array.from({ length: 5000 }, (_, i) => ({ id: i, title: `Vorfall ${i + 1}`, meta: i % 2 ? 'Netzwerkbetrieb' : 'Service Desk' }));

function RowCases() {
  // The estimate is the old fixed number; the rows render taller (padding plus a second line).
  const v = useVirtualRows(ROWS, { rowHeight: 32, measureRows: 'tbody > tr[data-row]', estimatedViewportHeight: 320 });
  window.__nav.rows = { rowHeight: v.rowHeight, totalHeight: v.totalHeight, startIndex: v.startIndex };
  return (
    <section id="rows">
      <h2>Lange Liste (HAR-1829)</h2>
      <div ref={v.containerRef} id="rows-scroller" className="uix-table-wrap" style={{ height: 320, overflow: 'auto' }} tabIndex={0} aria-label="Vorfälle">
        <table className="uix-table">
          <tbody>
            {v.padTop > 0 && <tr aria-hidden="true"><td style={{ height: v.padTop, padding: 0, border: 0 }} /></tr>}
            {v.rows.map((row) => (
              <tr key={row.id} data-row="" data-index={row.id}>
                <td><div>{row.title}</div><div style={{ color: 'var(--uix-text-hushed)' }}>{row.meta}</div></td>
              </tr>
            ))}
            {v.padBottom > 0 && <tr aria-hidden="true"><td style={{ height: v.padBottom, padding: 0, border: 0 }} /></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Harness() {
  return (
    <>
      <h1>Navigation primitives</h1>
      <TabCases />
      <NavCases />
      <TreeCases />
      <RowCases />
    </>
  );
}

window.__nav = { submits: 0 };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
