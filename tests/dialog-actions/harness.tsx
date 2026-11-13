/* Live harness for dialog actions that stay in view (the UI climb rules, HAR-3107), bundled by
 * build.mjs from source for tests/a11y/dialog-actions.spec.mjs. A Modal and a Drawer whose bodies are
 * longer than the viewport, each with its actions in the footer. ?case=modal|drawer opens one. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Drawer, Field, Input, Modal } from '../../packages/react/src/index.js';

const fields = Array.from({ length: 14 }, (_, i) => `Feld ${i + 1}`);

function Body() {
  return (
    <div style={{ display: 'grid', gap: 'var(--uix-space-3)' }}>
      <p style={{ margin: 0 }}>Bitte prüfen Sie die Angaben zum Change, bevor Sie ihn dem CAB vorlegen. Pflichtfelder sind markiert.</p>
      {fields.map((label) => <Field key={label} label={label}><Input defaultValue={`${label}: Wert`} /></Field>)}
      <p style={{ margin: 0 }} data-last>Ende der Angaben.</p>
    </div>
  );
}

function Harness() {
  const which = new URLSearchParams(location.search).get('case') ?? 'modal';
  const [open, setOpen] = useState(true);
  const footer = (
    <>
      <Button onClick={() => setOpen(false)} data-action="cancel">Abbrechen</Button>
      <Button variant="primary" onClick={() => setOpen(false)} data-action="save">Speichern und dem CAB vorlegen</Button>
    </>
  );
  return (
    <>
      <h1>Aktionen im Blick</h1>
      <Button onClick={() => setOpen(true)}>Öffnen</Button>
      {which === 'modal' && <Modal open={open} onClose={() => setOpen(false)} title="Change CHG-1042 vorlegen" closeLabel="Schließen" footer={footer}><Body /></Modal>}
      {which === 'drawer' && <Drawer open={open} onClose={() => setOpen(false)} title="Change CHG-1042 vorlegen" closeLabel="Schließen" footer={footer}><Body /></Drawer>}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
