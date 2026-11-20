/* Live harness for the from-trigger Modal experiment (Modal origin="trigger"), bundled by build.mjs
 * from source for tests/a11y/modal-origin.spec.mjs and the side-by-side recording (record.mjs).
 * `?origin=trigger` gives every Modal here origin="trigger"; without it they keep today's centred rise.
 *   - #new: a page-header button (top right) that opens #dialog;
 *   - #edit: a row's button lower on the page that opens #dialog;
 *   - #row-click: a whole clickable row (no control) inside a focusable <main tabIndex={-1}>;
 *   - #vanish: a button that is gone while #dialog is open (a menu item whose menu closed);
 *   - #soon / #later: open #dialog 400 ms / 1.5 s after the click (a fetch that resolved later);
 *   - #reopen (inside #dialog): closes it and opens it again 100 ms later ("Save and new");
 *   - #open-instant: opens #instant, a Modal with `instant`;
 *   - #label-open: a <label> whose checkbox's change opens #dialog (the label forwards a detail-0 click).
 * `?only=lazy` renders nothing but #lazy, whose Modal (#lazy-dialog) mounts only when it opens, so
 * no dialog hook has run before the first press. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DialogClose, Modal } from '../../packages/react/src/index.js';

const params = new URLSearchParams(location.search);
const origin = params.get('origin') === 'trigger' ? 'trigger' : 'center';
const ROWS = ['INC-0412 · E-Mail-Ausfall im Büro Sarajevo', 'INC-0413 · VPN trennt alle 20 Minuten', 'INC-0415 · Drucker im 3. Stock blockiert'];

function Lazy() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button id="lazy" variant="primary" onClick={() => setOpen(true)}>Neue Störung</Button>
      {open && (
        <Modal id="lazy-dialog" origin={origin} open onClose={() => setOpen(false)} title="Neue Störung">
          <p>Mounted by the click that opened it.</p>
        </Modal>
      )}
    </>
  );
}

function Harness() {
  const [open, setOpen] = useState<'dialog' | 'vanish' | 'instant' | null>(null);
  const close = () => setOpen(null);
  const later = (ms: number) => () => setTimeout(() => setOpen('dialog'), ms);
  return (
    <>
      <div className="bar">
        <h1>Störungen</h1>
        {open !== 'vanish' && <Button id="vanish" variant="ghost" onClick={() => setOpen('vanish')}>Exportieren</Button>}
        <Button id="soon" variant="secondary" onClick={later(400)}>Gleich öffnen</Button>
        <Button id="later" variant="secondary" onClick={later(1500)}>Später öffnen</Button>
        <Button id="open-instant" variant="secondary" onClick={() => setOpen('instant')}>Notiz</Button>
        <label id="label-open"><input type="checkbox" onChange={() => setOpen('dialog')} /> Mit Vorlage</label>
        <Button id="new" variant="primary" onClick={() => setOpen('dialog')}>Neue Störung</Button>
      </div>
      <div className="rows">
        {ROWS.map((title, i) => (
          <div className="row" key={title}>
            <span>{title}</span>
            <Button id={i === 1 ? 'edit' : undefined} variant="secondary" size="sm" onClick={() => setOpen('dialog')}>Bearbeiten</Button>
          </div>
        ))}
        <div id="row-click" className="row" onClick={() => setOpen('dialog')}>
          <span>INC-0418 · Lohnexport ohne neue Mitarbeitende (die ganze Zeile öffnet)</span>
        </div>
      </div>
      <Modal id="dialog" origin={origin} open={open === 'dialog' || open === 'vanish'} onClose={close} title="Neue Störung"
        footer={<>
          <DialogClose id="cancel" variant="secondary">Abbrechen</DialogClose>
          <Button id="reopen" variant="secondary" onClick={() => { close(); setTimeout(() => setOpen('dialog'), 100); }}>Anlegen und neu</Button>
          <Button variant="primary" onClick={close}>Anlegen</Button>
        </>}>
        <p>Beschreiben Sie kurz, was nicht funktioniert und seit wann. Das Team Service Desk sieht die Störung sofort.</p>
      </Modal>
      <Modal id="instant" origin={origin} instant open={open === 'instant'} onClose={close} title="Notiz">
        <p>Instant: opens and closes with no animation.</p>
      </Modal>
    </>
  );
}

const root = document.getElementById('root')!;
// The AppShell's main region is focusable (tabIndex -1): a press inside it must not grow from it.
root.tabIndex = -1;
createRoot(root).render(<StrictMode>{params.get('only') === 'lazy' ? <Lazy /> : <Harness />}</StrictMode>);
