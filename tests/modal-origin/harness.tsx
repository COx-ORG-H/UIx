/* Live harness for the from-trigger Modal experiment (Modal origin="trigger"), bundled by build.mjs
 * from source for tests/a11y/modal-origin.spec.mjs and the side-by-side recording (record.mjs).
 * `?origin=trigger` gives every Modal here origin="trigger"; without it they keep today's centred rise.
 *   - #new: a page-header button (top right) that opens #dialog;
 *   - #edit: a row's button lower on the page that opens #dialog;
 *   - #vanish: a button that is gone while #dialog is open (a menu item whose menu closed);
 *   - #later: opens #dialog 1.5 s after the press (a fetch that resolved later);
 *   - #open-instant: opens #instant, a Modal with `instant`. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DialogClose, Modal } from '../../packages/react/src/index.js';

const origin = new URLSearchParams(location.search).get('origin') === 'trigger' ? 'trigger' : 'center';
const ROWS = ['INC-0412 · E-Mail-Ausfall im Büro Sarajevo', 'INC-0413 · VPN trennt alle 20 Minuten', 'INC-0415 · Drucker im 3. Stock blockiert'];

function Harness() {
  const [open, setOpen] = useState<'dialog' | 'vanish' | 'instant' | null>(null);
  const close = () => setOpen(null);
  return (
    <>
      <div className="bar">
        <h1>Störungen</h1>
        {open !== 'vanish' && <Button id="vanish" variant="ghost" onClick={() => setOpen('vanish')}>Exportieren</Button>}
        <Button id="later" variant="secondary" onClick={() => setTimeout(() => setOpen('dialog'), 1500)}>Später öffnen</Button>
        <Button id="open-instant" variant="secondary" onClick={() => setOpen('instant')}>Notiz</Button>
        <Button id="new" variant="primary" onClick={() => setOpen('dialog')}>Neue Störung</Button>
      </div>
      <div className="rows">
        {ROWS.map((title, i) => (
          <div className="row" key={title}>
            <span>{title}</span>
            <Button id={i === 1 ? 'edit' : undefined} variant="secondary" size="sm" onClick={() => setOpen('dialog')}>Bearbeiten</Button>
          </div>
        ))}
      </div>
      <Modal id="dialog" origin={origin} open={open === 'dialog' || open === 'vanish'} onClose={close} title="Neue Störung"
        footer={<><DialogClose id="cancel" variant="secondary">Abbrechen</DialogClose><Button variant="primary" onClick={close}>Anlegen</Button></>}>
        <p>Beschreiben Sie kurz, was nicht funktioniert und seit wann. Das Team Service Desk sieht die Störung sofort.</p>
      </Modal>
      <Modal id="instant" origin={origin} instant open={open === 'instant'} onClose={close} title="Notiz">
        <p>Instant: opens and closes with no animation.</p>
      </Modal>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
