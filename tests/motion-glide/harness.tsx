/* Live harness for the 2.60 motion (the animate-ui study, rebuilt natively), bundled by build.mjs
 * from source for tests/a11y/motion-glide.spec.mjs:
 *   - #nav: a Sidebar with five rows (one current) and a group;
 *   - #toolbar: five icon buttons in one tooltip delay group (labels of different widths);
 *   - #team: a Select with eight options; #actions: a Menu;
 *   - #open-drawer: a Drawer (window.__closed counts onClose);
 *   - #icons: buttons with animated icons. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Checkbox, Drawer, Menu, MenuItem, NavGroup, NavItem, Select, Sidebar, SidebarSection, SubNavItem, Tooltip,
} from '../../packages/react/src/index.js';
import {
  ArrowRightIcon, CopyIcon, DownloadIcon, InboxIcon, LinkIcon, RefreshCwIcon, SearchIcon, SettingsIcon, Trash2Icon,
} from '../../packages/react/src/icons/components.js';

declare global { interface Window { __closed: number } }
window.__closed = 0;

const ROWS = ['Übersicht', 'Posteingang', 'Störungen', 'Wissensdatenbank', 'Teams'];
const TEAMS = ['Service Desk', 'Arbeitsplatz', 'Netzwerk', 'Fachverfahren', 'Schnittstellen', 'Sicherheit', 'Rechenzentrum', 'Telefonie']
  .map((t) => ({ value: t, label: t }));

function App() {
  const [current, setCurrent] = useState('Posteingang');
  const [team, setTeam] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <>
      <section>
        <h2>Sidebar</h2>
        <div style={{ height: 420, display: 'flex' }}>
          <Sidebar id="nav" brand="Servis">
            <SidebarSection label="Arbeit">
              {ROWS.map((r) => (
                <NavItem key={r} href={`#${r}`} icon={<InboxIcon />} active={current === r} onClick={(e) => { e.preventDefault(); setCurrent(r); }}>{r}</NavItem>
              ))}
            </SidebarSection>
            <NavGroup icon={<SettingsIcon />} label="Einstellungen" defaultExpanded={false}>
              <SubNavItem href="#a">Allgemein</SubNavItem>
              <SubNavItem href="#b">Benachrichtigungen</SubNavItem>
            </NavGroup>
          </Sidebar>
        </div>
      </section>
      <section>
        <h2>Toolbar</h2>
        <div id="toolbar" role="toolbar" aria-label="Werkzeuge" style={{ display: 'flex', gap: 4, marginTop: 48 }}>
          {[['Suchen', <SearchIcon key="s" />], ['Link einfügen', <LinkIcon key="l" />], ['Kopieren', <CopyIcon key="c" />], ['Als PDF herunterladen', <DownloadIcon key="d" />], ['Löschen', <Trash2Icon key="t" />]].map(([label, icon]) => (
            <Tooltip key={label as string} label={label as string}><Button icon variant="ghost" aria-label={label as string}>{icon}</Button></Tooltip>
          ))}
        </div>
      </section>
      <section>
        <h2>Lists</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 240 }}><Select id="team" aria-label="Team" placeholder="Team wählen" options={TEAMS} value={team} onValueChange={(v) => setTeam(String(v))} /></div>
          <Menu trigger={<Button id="actions" variant="secondary">Aktionen</Button>} label="Aktionen">
            <MenuItem>Duplizieren</MenuItem><MenuItem>Link kopieren</MenuItem><MenuItem>Exportieren</MenuItem>
          </Menu>
        </div>
        <Checkbox id="notify" label="Melder benachrichtigen" />
      </section>
      <section>
        <h2>Drawer</h2>
        <Button id="open-drawer" onClick={() => setOpen(true)}>Details öffnen</Button>
        <Drawer open={open} title="INC-0417" onClose={() => { window.__closed += 1; setOpen(false); }}><p id="drawer-text">Citrix-Sitzungen trennen sich.</p></Drawer>
      </section>
      <section id="icons">
        <h2>Icons</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button id="icon-refresh" variant="secondary"><RefreshCwIcon animate />Aktualisieren</Button>
          <Button id="icon-next" variant="secondary">Weiter<ArrowRightIcon animate /></Button>
          <Button id="icon-still" variant="secondary"><DownloadIcon />Exportieren</Button>
        </div>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
