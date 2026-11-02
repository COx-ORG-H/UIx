import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Drawer, Modal, Toaster, UixLabelsProvider, createToastApi, createToastStore } from '../../packages/react/src/index.js';
const toast = createToastApi(createToastStore());
function Harness() {
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const [actions, setActions] = useState(0);
  const notify = () => toast.error('Änderung nicht gespeichert', { id: 'result', duration: null,
    description: 'Bitte versuchen Sie es erneut.', action: { label: 'Erneut versuchen', onClick: () => setActions(n => n + 1) } });
  const samples = {
    de: ['Änderung nicht gespeichert. Bitte erneut versuchen.', 'Vollständige Fehlerdetails kopieren'],
    en: ['The change was not saved. Please try again.', 'Copy details'],
    bs: ['Promjena nije sačuvana. Pokušajte ponovo.', 'Kopiraj detalje'],
  } as const;
  const controls = <>
    <Button onClick={notify}>Fehler anzeigen</Button>
    <Button onClick={() => toast.loading('Wird gespeichert…', { id: 'result' })}>Speichern</Button>
    <Button onClick={() => toast.success('Änderung gespeichert', { id: 'result', duration: null })}>Erfolg anzeigen</Button>
    {Object.entries(samples).map(([language, [message, label]]) => <Button key={language} data-toast-sample={language}
      onClick={() => toast.error(message, { id: 'result', duration: null,
        action: { label, onClick: () => setActions(n => n + 1) } })}>Lesbarkeit: {language}</Button>)}
  </>;
  return <>
    <h1>Benachrichtigungen</h1><output id="actions">{actions}</output>
    <Button id="open-drawer" onClick={() => setDrawer(true)}>Datensatz bearbeiten</Button>
    <Button id="open-modal" onClick={() => setModal(true)}>Dialog öffnen</Button>
    <section id="page-controls">{controls}</section>
    <Drawer id="drawer" open={drawer} onClose={() => setDrawer(false)} title="Datensatz bearbeiten" closeLabel="Schließen">
      <input aria-label="Entwurf" defaultValue="Ungespeicherter Text" />
      {controls}<Button id="nested" onClick={() => setModal(true)}>Bestätigung öffnen</Button>
    </Drawer>
    <Modal id="modal" open={modal} onClose={() => setModal(false)} title="Änderung bestätigen" closeLabel="Schließen">
      {controls}<Button id="close-modal" onClick={() => setModal(false)}>Weiter bearbeiten</Button>
      <Button id="nested-drawer" onClick={() => setDrawer(true)}>Details öffnen</Button>
    </Modal>
    <div id="toast-flow" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--uix-space-2)' }}>
      <span id="flow-before" aria-hidden="true" />
      <Toaster store={toast.store} regionLabel="Benachrichtigungen" />
      <span id="flow-after" aria-hidden="true" />
    </div>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode>
  <UixLabelsProvider labels={{ toast: { dismiss: 'Benachrichtigung schließen' } }}><Harness /></UixLabelsProvider>
</StrictMode>);
