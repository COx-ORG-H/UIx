/* Live harness for the staff shell (HAR-1815), bundled by build.mjs from source for
 * tests/a11y/staff-shell.spec.mjs. ?view= picks the page:
 *   - shell (default): AppShell layout="viewport" with a Sidebar and a display PageHeader;
 *   - topbar: the same with a topbar, which sits at the top of the main column;
 *   - record: DetailPage variant="staff" with a compact SectionHead and tabular CellSub codes,
 *     inside the viewport shell, with long Bosnian words. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AppShell, Button, Card, CellStrong, CellSub, DetailPage, NavItem, PageHeader, SectionHead, Sidebar, Table, Th,
} from '../../packages/react/src/index.js';

const view = new URLSearchParams(location.search).get('view') ?? 'shell';
const icon = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

const nav = (
  <Sidebar brand="Biblioteka" aria-label="Navigacija osoblja">
    <NavItem href="#pregled" icon={icon('M3 12l9-9 9 9M5 10v10h14V10')} active>Pregled</NavItem>
    <NavItem href="#katalog" icon={icon('M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20')}>Katalog</NavItem>
    <NavItem href="#clanovi" icon={icon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2')}>Članovi</NavItem>
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

function Harness() {
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
