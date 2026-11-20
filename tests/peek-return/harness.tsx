/* The return-to-row cue (phone-OS motion study, Tier 3 item 12): a ticket queue in DataWorkspace whose
 * id cell opens a side Peek, as an ITSM agent works it. Enter on a row (or a click on its id) opens
 * the Peek; ↑ / ↓ in the Peek move to the next record; "Lösen" resolves the ticket, so its row
 * leaves the queue, and closes the Peek. `?cue=0` leaves `peekRowId` out: the queue as before.
 * window.__peek records the closes, for the spec. */
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataWorkspace } from '../../packages/react/src/components/DataWorkspace';
import { Peek } from '../../packages/react/src/components/Peek';
import { Button } from '../../packages/react/src/components/Button';

interface Ticket { id: string; title: string; caller: string; state: string }
declare global { interface Window { __peek: { closes: number } } }
window.__peek = { closes: 0 };

const TITLES = [
  'VPN-Verbindung bricht nach 10 Minuten ab', 'Drucker im 3. OG druckt nur leere Seiten', 'Kein Zugriff auf das Laufwerk Finanzen',
  'Outlook fragt ständig nach dem Kennwort', 'Neuer Laptop für Einstellung am Montag', 'Teams-Kamera wird nicht erkannt',
  'SAP-Login meldet abgelaufenes Zertifikat', 'Monitor flackert bei 144 Hz', 'Freigabe für Projektordner Kundenportal',
  'Mobiltelefon synchronisiert keine Termine', 'Softwarepaket Visio anfordern', 'Kennwort nach Urlaub gesperrt',
];
const CALLERS = ['A. Jovanović', 'M. Öztürk', 'L. Schäfer', 'K. Nowak'];
const START: Ticket[] = TITLES.map((title, i) => ({ id: `INC-${20410 + i}`, title, caller: CALLERS[i % CALLERS.length], state: i % 3 === 0 ? 'In Arbeit' : 'Neu' }));

function Harness() {
  const cue = new URLSearchParams(location.search).get('cue') !== '0';
  const [rows, setRows] = useState(START);
  const [peekId, setPeekId] = useState<string | null>(null);
  const at = peekId == null ? -1 : rows.findIndex((row) => row.id === peekId);
  const record = at >= 0 ? rows[at] : null;
  const close = () => { window.__peek.closes += 1; setPeekId(null); };
  const columns = useMemo(() => [
    { id: 'title', header: 'Titel', cell: (row: Ticket) => row.title, className: 'uix-col--flex' },
    { id: 'caller', header: 'Melder', cell: (row: Ticket) => row.caller },
    { id: 'state', header: 'Status', cell: (row: Ticket) => row.state },
  ], []);
  const idColumn = useMemo(() => ({ header: 'ID', text: (row: Ticket) => row.id, onPeek: (row: Ticket) => setPeekId(row.id) }), []);
  return <>
    <h1>Warteschlange 1st Level</h1>
    <DataWorkspace<Ticket>
      label="Warteschlange" rows={rows} getRowId={(row) => row.id} columns={columns} idColumn={idColumn}
      rowNavigation peekRowId={cue ? peekId : undefined}
    />
    <Peek
      open={record != null} onClose={close} recordId={record?.id} title={record?.title}
      hint="↑/↓ blättern · Esc schließen"
      onNavPrev={at > 0 ? () => setPeekId(rows[at - 1].id) : undefined}
      onNavNext={at >= 0 && at < rows.length - 1 ? () => setPeekId(rows[at + 1].id) : undefined}
      previousLabel="Vorheriger Datensatz" nextLabel="Nächster Datensatz" closeLabel="Vorschau schließen"
      footer={record && <Button size="sm" onClick={() => { setRows((list) => list.filter((row) => row.id !== record.id)); close(); }}>Lösen</Button>}
    >
      {record && <p>{record.caller} · {record.state}</p>}
    </Peek>
  </>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
