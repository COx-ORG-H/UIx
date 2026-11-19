import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Peek } from '../../packages/react/src/components/Peek';

function Harness() {
  const variant = new URLSearchParams(location.search).get('variant') ?? 'full';
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState(58);
  const hasNav = variant === 'full' || variant === 'nav-no-hint' || variant === 'record';
  const hasHint = variant === 'full' || variant === 'hint-no-nav' || variant === 'record';
  const isRecord = variant === 'record' || variant === 'record-no-nav';
  // HAR-3089: an 80-character German title, the ID and the open action in the header
  const recordTitle = 'Kundenportal meldet nach der Anmeldung einen Fehler beim Laden der Vertragsdaten';
  return <>
    <h1>Vorschau prüfen</h1>
    <button type="button" onClick={() => setOpen(true)}>Vorschau öffnen</button>
    <output data-testid="open-state">{open ? 'offen' : 'geschlossen'}</output>
    <Peek open={open} onClose={variant === 'title-only' ? undefined : () => setOpen(false)}
      title={isRecord ? recordTitle : `INC-00${record} · Kundenportal meldet nach der Anmeldung einen Fehler`}
      recordId={isRecord ? `INC-00${record}` : undefined}
      openAction={isRecord ? { label: 'Datensatz öffnen', href: '#datensatz' } : undefined}
      hint={hasHint ? '↑/↓ blättern · Enter öffnen · Esc schließen' : undefined}
      onNavPrev={hasNav && record > 58 ? () => setRecord(value => value - 1) : undefined}
      onNavNext={hasNav && record < 59 ? () => setRecord(value => value + 1) : undefined}
      previousLabel="Vorheriger Datensatz" nextLabel="Nächster Datensatz" closeLabel="Vorschau schließen"
      footer={variant.startsWith('record') ? undefined : <a href="#datensatz">Datensatz öffnen</a>}>
      <p>Die Anmeldung wurde wiederhergestellt. Die Ursache ist im Arbeitsprotokoll dokumentiert.</p>
    </Peek>
  </>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
