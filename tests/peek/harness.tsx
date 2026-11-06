import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Peek } from '../../packages/react/src/components/Peek';

function Harness() {
  const variant = new URLSearchParams(location.search).get('variant') ?? 'full';
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState(58);
  const hasNav = variant === 'full' || variant === 'nav-no-hint';
  const hasHint = variant === 'full' || variant === 'hint-no-nav';
  return <>
    <h1>Vorschau prüfen</h1>
    <button type="button" onClick={() => setOpen(true)}>Vorschau öffnen</button>
    <output data-testid="open-state">{open ? 'offen' : 'geschlossen'}</output>
    <Peek open={open} onClose={variant === 'title-only' ? undefined : () => setOpen(false)}
      title={`INC-00${record} · Kundenportal meldet nach der Anmeldung einen Fehler`}
      hint={hasHint ? '↑/↓ blättern · Enter öffnen · Esc schließen' : undefined}
      onNavPrev={hasNav && record > 58 ? () => setRecord(value => value - 1) : undefined}
      onNavNext={hasNav && record < 59 ? () => setRecord(value => value + 1) : undefined}
      previousLabel="Vorheriger Datensatz" nextLabel="Nächster Datensatz" closeLabel="Vorschau schließen"
      footer={<a href="#datensatz">Datensatz öffnen</a>}>
      <p>Die Anmeldung wurde wiederhergestellt. Die Ursache ist im Arbeitsprotokoll dokumentiert.</p>
    </Peek>
  </>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
