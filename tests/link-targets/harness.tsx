/* Live harness for the 24 px targets of links that stand on their own in a kit slot (HAR-3084,
 * HAR-3091, HAR-3097), bundled by build.mjs from source for tests/a11y/link-targets.spec.mjs.
 *   ?case=table — sortable headers, a cell link (.uix-cell-link), a classless cell link and plain cells;
 *   ?case=heads — eyebrow section labels, linked and unlinked, and a section link;
 *   ?case=peek  — an open Peek whose footer holds a plain link, a classed link and a link Button.
 * German, as the TENSOR screens that found them. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Peek, SectionHead, Table, TableWrap, Td, Th, Tr } from '../../packages/react/src/index.js';

const rows = [
  { id: 'CVE-2024-6387', asset: 'SRV-RZN-0107', open: 12, state: 'Offen' },
  { id: 'CVE-2023-48795', asset: 'SRV-RZN-0212', open: 4, state: 'In Bearbeitung' },
  { id: 'CVE-2024-3094', asset: 'WS-MUC-0441', open: 1, state: 'Behoben' },
];

function TableCase() {
  return (
    <section aria-label="Befunde">
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th sortable sortDirection="none" onSort={() => {}}>Befund</Th>
              <Th sortable sortDirection="none" onSort={() => {}}>Quell-Asset</Th>
              <Th sortable sortDirection="descending" onSort={() => {}}>Offene Befunde</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td><a className="uix-cell-link" href={`#${row.id}`} data-target="cell-link">{row.id}</a></Td>
                <Td><a href={`#${row.asset}`} data-target="plain-cell-link">{row.asset}</a></Td>
                <Td className="uix-col--num" data-text="plain-cell">{row.open}</Td>
                <Td data-text="plain-cell">{row.state}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}

function HeadsCase() {
  return (
    <section aria-label="Einstellungen" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--uix-space-6)' }}>
      <div data-case="unlinked">
        <SectionHead size="eyebrow" as="h3" title="Persönlich" />
        <p style={{ margin: 0 }}>Profil, Sprache und Benachrichtigungen.</p>
      </div>
      <div data-case="linked">
        <SectionHead size="eyebrow" as="h3" title="Störungen" href="#/settings/c/incidents" />
        <p style={{ margin: 0 }}>Kategorien, Prioritäten und Eskalation.</p>
      </div>
      <div data-case="section-link" style={{ gridColumn: '1 / -1' }}>
        <SectionHead title="Zuletzt angesehen" action={<a className="uix-section-link" href="#/recent">Alle anzeigen</a>} />
      </div>
    </section>
  );
}

function PeekCase() {
  return (
    <Peek
      open
      onClose={() => {}}
      title="INC-0173 · Drucker im 3. OG druckt nicht"
      closeLabel="Vorschau schließen"
      footer={(
        <>
          <a href="#/incidents/INC-0173" data-target="footer-plain">Datensatz öffnen</a>
          <a className="uix-peek__footer-link" href="#/incidents/INC-0173/history" data-target="footer-classed">Verlauf</a>
          <Button variant="link" data-target="footer-button">Link kopieren</Button>
        </>
      )}
    >
      <p>Seit heute Morgen kommen Druckaufträge an, werden aber nicht ausgegeben.</p>
    </Peek>
  );
}

function Harness() {
  const which = new URLSearchParams(location.search).get('case') ?? 'table';
  return (
    <>
      <h1>Ziele von 24 px</h1>
      {which === 'table' && <TableCase />}
      {which === 'heads' && <HeadsCase />}
      {which === 'peek' && <PeekCase />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
