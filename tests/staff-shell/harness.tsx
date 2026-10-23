/* Live harness for the staff shell (HAR-1815), bundled by build.mjs from source for
 * tests/a11y/staff-shell.spec.mjs. ?view= picks the page:
 *   - shell (default): AppShell layout="viewport" with a Sidebar and a display PageHeader;
 *   - topbar: the same with a topbar, which sits at the top of the main column;
 *   - record: DetailPage variant="staff" with a compact SectionHead and tabular CellSub codes,
 *     inside the viewport shell, with long Bosnian words;
 *   - nav / nav-topbar (HAR-1371): see NavShell. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AccountMenu, AppShell, Button, Card, CellStrong, CellSub, DetailPage, Menu, MenuItem, MenuSeparator, NavItem, PageHeader, SectionHead, Sidebar, Table, Th,
} from '../../packages/react/src/index.js';

const view = new URLSearchParams(location.search).get('view') ?? 'shell';
const icon = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

const nav = (
  <Sidebar brand="Biblioteka" aria-label="Navigacija osoblja">
    <NavItem href="#pregled" icon={icon('M3 12l9-9 9 9M5 10v10h14V10')} active>Pregled</NavItem>
    <NavItem href="#katalog" icon={icon('M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20')}>Katalog</NavItem>
    <NavItem href="#clanovi" icon={icon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01')}>Članovi</NavItem>
  </Sidebar>
);

function Overview() {
  return (
    <>
      <PageHeader id="header" size="display" eyebrow="Danas" title="Pregled podružnice" subtitle="Posudbe, rezervacije i zakašnjenja za ovu podružnicu, osvježeno prije dvije minute." actions={<Button variant="primary">Nova posudba</Button>} />
      <p>Sadržaj stranice.</p>
    </>
  );
}

function Record() {
  return (
    <DetailPage
      id="record"
      variant="staff"
      back={{ href: '#posudbe', label: 'Sve posudbe' }}
      eyebrow="Posudba"
      title="L-2026-0412"
      subtitle="Na zadnjem čitanju, rok vraćanja za tri dana."
      metrics={[{ id: 'due', label: 'Rok', value: '25.10.2026' }, { id: 'renewals', label: 'Produženja', value: '1 / 2' }, { id: 'fee', label: 'Zakasnina', value: '0,00 KM' }]}
    >
      <Card>
        <SectionHead id="section" size="compact" as="h3" title="Primjerci" />
        <Table aria-label="Primjerci">
          <thead><tr><Th>Naslov</Th><Th>Status</Th></tr></thead>
          <tbody>
            <tr><td><CellStrong>Na Drini ćuprija</CellStrong><CellSub id="code-1" tabular>INV 0041-1187</CellSub></td><td>Posuđeno</td></tr>
            <tr><td><CellStrong>Derviš i smrt</CellStrong><CellSub id="code-2" tabular>INV 0007-0310</CellSub></td><td>Posuđeno</td></tr>
          </tbody>
        </Table>
      </Card>
    </DetailPage>
  );
}

type Log = { searches: number; selected: string[]; navChanges: string[] };
declare global { interface Window { __shell: Log } }
window.__shell = { searches: 0, selected: [], navChanges: [] };

/** ?view=nav (HAR-1371): the sidebar head actions and search row, AccountMenu in the foot, the
 *  "[" hotkey with a remembered tier, and the phone drawer. ?view=nav-topbar adds a topbar. */
function NavShell({ withTopbar }: { withTopbar: boolean }) {
  const [tier, setTier] = useState<'full' | 'rail' | 'hidden'>('full');
  const rail = tier === 'rail';
  return (
    <AppShell
      id="shell"
      layout="viewport"
      navHotkey="["
      navTierStorageKey="uix-harness-nav"
      phoneNav="drawer"
      openNavLabel="Otvori navigaciju"
      navigationLabel="Navigacija"
      onNavChange={(next) => { window.__shell.navChanges.push(next); setTier(next); }}
      topbar={withTopbar ? <span id="topbar-content">Pretraga · Obavijesti</span> : undefined}
      sidebar={(
        <Sidebar
          id="sidebar"
          brand="Biblioteka"
          aria-label="Navigacija osoblja"
          nav={rail ? 'rail' : 'full'}
          actions={(
            <>
              <Button id="mode" size="sm" variant="ghost" icon aria-label="Promijeni način">{icon('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')}</Button>
              <Menu label="Alati" trigger={<Button id="more" size="sm" variant="ghost" icon aria-label="Više alata">{icon('M5 12h.01M12 12h.01M19 12h.01')}</Button>}>
                <MenuItem onSelect={() => window.__shell.selected.push('collapse')}>Skupi sve grupe</MenuItem>
              </Menu>
            </>
          )}
          search={{ label: 'Pretraga', shortcut: ['Mod', 'K'], onActivate: () => { window.__shell.searches += 1; } }}
          footer={(
            <AccountMenu
              collapsed={rail}
              labels={{ menu: 'Račun' }}
              user={{ name: 'Dževad Hodžić', sub: 'dzevad.hodzic@biblioteka-tuzla.ba', status: 'online' }}
              items={(
                <>
                  <MenuItem onSelect={() => window.__shell.selected.push('profile')}>Profil</MenuItem>
                  <MenuItem onSelect={() => window.__shell.selected.push('preferences')}>Postavke prikaza</MenuItem>
                  <MenuSeparator />
                  <MenuItem tone="danger" onSelect={() => window.__shell.selected.push('signout')}>Odjava</MenuItem>
                </>
              )}
            />
          )}
        >
          <NavItem href="#pregled" icon={icon('M3 12l9-9 9 9M5 10v10h14V10')} active>Pregled</NavItem>
          <NavItem href="#katalog" icon={icon('M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20')}>Katalog</NavItem>
          <NavItem href="#clanovi" icon={icon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01')}>Članovi</NavItem>
        </Sidebar>
      )}
    >
      <PageHeader size="display" eyebrow="Danas" title="Pregled" />
      <label htmlFor="note">Bilješka</label>
      <input id="note" className="uix-input" />
    </AppShell>
  );
}

function Harness() {
  if (view === 'nav' || view === 'nav-topbar') return <NavShell withTopbar={view === 'nav-topbar'} />;
  return (
    <AppShell
      id="shell"
      layout="viewport"
      sidebar={nav}
      topbar={view === 'topbar' ? <span id="topbar-content">Pretraga · Obavijesti</span> : undefined}
    >
      {view === 'record' ? <Record /> : <Overview />}
    </AppShell>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
