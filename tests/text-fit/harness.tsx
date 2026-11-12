/* Live harness for text that fits (HAR-3094, HAR-3099, HAR-3201), bundled by build.mjs from source
 * for tests/a11y/text-fit.spec.mjs. German, as the TENSOR screens that found them:
 *   - a 120 px cell holding RelativeTime, DateTime and a one-day DateTimeRange;
 *   - a DataWorkspace with a nowrap date column, a two-line clamped note and a truncating title;
 *   - a StatusPill "Wartet auf Zustimmung" in an lg-plus column. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DataWorkspace, DateTime, DateTimeRange, RelativeTime, StatusPill, Table, TableWrap, Td, Th, UixLabelsProvider } from '../../packages/react/src/index.js';

const de = { locale: 'de-DE', timeZone: 'Europe/Berlin' } as const;
const NINE = '2026-11-11T08:00:00.000Z';
const NOON = '2026-11-11T11:00:00.000Z';
const NOW = '2026-11-11T08:03:00.000Z';

const rows = [
  { id: 'CHG-1042', when: NINE, note: 'Ledger-Fix im Wartungsfenster einspielen, danach die Abstimmung mit dem Fachbereich und die Freigabe durch das CAB abwarten.', title: 'Zahlungsverkehr: Wartungsfenster für den Ledger-Fix' },
  { id: 'CHG-1043', when: NOON, note: 'Kurz.', title: 'Zertifikat erneuern' },
];

function Harness() {
  return (
    <UixLabelsProvider labels={{ dateFormat: { locale: 'de-DE' } }}>
      <h1>Text, der passt</h1>
      <section aria-label="Schmale Zelle">
        <TableWrap>
          <Table style={{ tableLayout: 'fixed', width: 'auto' }}>
            <thead><tr><Th style={{ width: 120 }}>Wann</Th><Th style={{ width: 120 }}>Zeitraum</Th></tr></thead>
            <tbody>
              <tr>
                <Td data-cell="instants">
                  <div><RelativeTime value={NINE} now={NOW} {...de} data-fit="relative" /></div>
                  <div><DateTime value={NINE} {...de} data-fit="instant" /></div>
                </Td>
                <Td data-cell="range"><DateTimeRange start={NINE} end={NOON} {...de} data-fit="range" /></Td>
              </tr>
            </tbody>
          </Table>
        </TableWrap>
      </section>
      <section aria-label="Spalten" style={{ maxWidth: 560 }}>
        <DataWorkspace
          label="Changes"
          rows={rows}
          getRowId={(r) => r.id}
          columns={[
            { id: 'when', header: 'Wann', cell: (r) => <DateTime value={r.when} {...de} />, textWrap: 'nowrap', className: 'uix-col--w-lg' },
            { id: 'note', header: 'Notiz', cell: (r) => r.note, lineClamp: 2, className: 'uix-col--w-lg' },
            { id: 'title', header: 'Titel', cell: (r) => r.title, textWrap: 'truncate', className: 'uix-col--w-md' },
          ]}
        />
      </section>
      <section aria-label="Statusspalte">
        <TableWrap>
          <Table>
            <thead><tr><Th className="uix-col--w-lg-plus">Status</Th><Th>Funktion</Th></tr></thead>
            <tbody><tr><Td className="uix-col--w-lg-plus"><StatusPill tone="warning" data-fit="pill">Wartet auf Zustimmung</StatusPill></Td><Td>Leistungs- und Verhaltenskontrolle</Td></tr></tbody>
          </Table>
        </TableWrap>
      </section>
    </UixLabelsProvider>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
