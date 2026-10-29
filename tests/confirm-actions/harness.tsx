/* Live harness for what TENSOR's ConfirmAction needs from the kit confirmations (HAR-1831),
 * bundled by build.mjs from source for tests/a11y/confirm-actions.spec.mjs. German, as TENSOR.
 * window.__confirm counts what happened.
 *
 *   #reason    a destructive Popconfirm with a required reason (children + confirmDisabled)
 *   #drawer    a dirty Drawer holding a Popconfirm with a Select inside it: Escape closes the
 *              list, then the step, then the drawer asks
 *   #scroll    a Popconfirm whose anchor scrolls out of a 160 px box (closeWhenAnchorHidden)
 *   #pending   a ConfirmDialog the caller unmounts when the action settles (`{open && …}`):
 *              pending blocks Escape and ×; focus returns to the opener
 *   #typed     a ConfirmDialog with type-to-confirm, a node label and confirmProps; #typed-long the
 *              same with a long German value, for the message that wraps at 320 px
 *   #long-label a ConfirmDialog and a PromptDialog with a 35-character German confirm label, for
 *              footer buttons that wrap at 320 px (HAR-2541)
 *   #tabs-pill a pill Tabs row with one long unbroken word, in a 288 px column
 *   #undo      an undo toast with a fixed 1.5 s timer (pauseOnHover: false)
 */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, ConfirmDialog, Drawer, Field, Popconfirm, PromptDialog, Select, Textarea, Toaster, createToastApi, createToastStore,
} from '../../packages/react/src/index.js';

declare global {
  interface Window {
    __confirm: { confirmed: string[]; cancelled: string[]; committed: number; undone: number; drawerCloses: number; settle: () => void };
  }
}
const count = (list: 'confirmed' | 'cancelled', what: string) => window.__confirm[list].push(what);

function Reason() {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <section id="reason">
      <h2>Begründung (Popconfirm)</h2>
      <div><Button id="reject" ref={anchor} variant="danger" onClick={() => setOpen(true)}>Ablehnen</Button></div>
      <Popconfirm
        open={open} anchor={anchor} destructive confirmDisabled={reason.trim() === ''}
        title="Diese Änderung ablehnen?" description="Die antragstellende Person sieht Ihre Begründung."
        confirmLabel="Ablehnen" cancelLabel="Abbrechen"
        confirmProps={{ 'data-action-id': 'change.reject' }}
        onConfirm={() => { count('confirmed', `reject:${reason}`); setOpen(false); setReason(''); }}
        onCancel={() => { count('cancelled', 'reject'); setOpen(false); setReason(''); }}
      >
        <Field label="Begründung" htmlFor="reject-reason">
          <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.currentTarget.value)} placeholder="Warum wird sie abgelehnt?" />
        </Field>
      </Popconfirm>
    </section>
  );
}

const TEAMS = [{ value: 'net', label: 'Netzwerkbetrieb' }, { value: 'desk', label: 'Service Desk' }];

function InDrawer() {
  const anchor = useRef<HTMLButtonElement>(null);
  const [drawer, setDrawer] = useState(false);
  const [step, setStep] = useState(false);
  const [team, setTeam] = useState('net');
  return (
    <section id="drawer-case">
      <h2>In einer Schublade</h2>
      <div><Button id="open-drawer" onClick={() => setDrawer(true)}>Vorlage bearbeiten</Button></div>
      <Drawer id="drawer" open={drawer} dirty onClose={() => { window.__confirm.drawerCloses += 1; setDrawer(false); }} title="Vorlage bearbeiten">
        <Button id="move" ref={anchor} onClick={() => setStep(true)}>Verschieben</Button>
        <Popconfirm
          open={step} anchor={anchor} title="Vorlage verschieben?" confirmLabel="Verschieben" cancelLabel="Abbrechen"
          onConfirm={() => setStep(false)} onCancel={() => { count('cancelled', 'move'); setStep(false); }}
        >
          <Field label="Team" htmlFor="move-team"><Select id="move-team" value={team} onValueChange={(v) => setTeam(String(v))} options={TEAMS} /></Field>
        </Popconfirm>
      </Drawer>
    </section>
  );
}

function Scroll() {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  return (
    <section id="scroll">
      <h2>Anker scrollt weg</h2>
      <div id="scroll-box" style={{ height: 160, overflow: 'auto', border: '1px solid var(--uix-border)', padding: 'var(--uix-space-2)' }}>
        <Button id="unlink" ref={anchor} size="sm" onClick={() => setOpen(true)}>Verknüpfung lösen</Button>
        <div style={{ height: 800 }} />
      </div>
      <Popconfirm
        open={open} anchor={anchor} closeWhenAnchorHidden title="Verknüpfung lösen?" confirmLabel="Lösen" cancelLabel="Abbrechen"
        onConfirm={() => setOpen(false)} onCancel={() => { count('cancelled', 'unlink'); setOpen(false); setNote(''); }}
      >
        <Field label="Notiz (optional)" htmlFor="unlink-note">
          <Textarea id="unlink-note" rows={2} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
        </Field>
      </Popconfirm>
    </section>
  );
}

function Pending() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  window.__confirm.settle = () => { setPending(false); setOpen(false); };
  return (
    <section id="pending">
      <h2>Wird ausgeführt</h2>
      <div><Button id="open-confirm" variant="danger" onClick={() => setOpen(true)}>CI löschen</Button></div>
      {open && (
        <ConfirmDialog
          open title="srv-ledger-01 löschen?" description="Das Konfigurationselement und seine Beziehungen werden entfernt."
          confirmLabel="Löschen" cancelLabel="Abbrechen" destructive pending={pending}
          onConfirm={() => { count('confirmed', 'delete'); setPending(true); }}
          onCancel={() => { count('cancelled', 'delete'); setOpen(false); }}
        />
      )}
    </section>
  );
}

function TypedLong() {
  const [open, setOpen] = useState(false);
  return (
    <section id="typed-long">
      <h2>Langer Wert</h2>
      <div><Button id="open-typed-long" variant="danger" onClick={() => setOpen(true)}>Gruppe löschen</Button></div>
      <ConfirmDialog
        open={open} title="Gruppe löschen?" confirmLabel="Löschen" cancelLabel="Abbrechen" destructive
        typeToConfirm="Netzwerkbetrieb-Rechenzentrum-Frankfurt-Zweite-Ebene"
        typeToConfirmLabel="Zum Bestätigen {value} eingeben"
        typeToConfirmMismatch="Das stimmt nicht mit {value} überein. Bitte prüfen Sie Groß- und Kleinschreibung."
        onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)}
      />
    </section>
  );
}

function LongLabel() {
  const [confirm, setConfirm] = useState(false);
  const [prompt, setPrompt] = useState(false);
  return (
    <section id="long-label">
      <h2>Lange Beschriftung</h2>
      <div>
        <Button id="open-long-confirm" onClick={() => setConfirm(true)}>Herabstufen</Button>
        <Button id="open-long-prompt" onClick={() => setPrompt(true)}>Begründen</Button>
      </div>
      <ConfirmDialog
        open={confirm} title="Einstufung ändern?" description="Die Meldepflicht nach DORA entfällt für diesen Vorfall."
        confirmLabel="Auf nicht schwerwiegend herabstufen" cancelLabel="Abbrechen"
        tertiaryLabel="Später entscheiden" onTertiary={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)} onCancel={() => setConfirm(false)}
      />
      <PromptDialog
        open={prompt} title="Begründung" inputLabel="Warum?"
        submitLabel="Geänderte Kriterien speichern und melden" cancelLabel="Abbrechen"
        onSubmit={() => setPrompt(false)} onCancel={() => setPrompt(false)}
      />
    </section>
  );
}

function Typed() {
  const [open, setOpen] = useState(false);
  return (
    <section id="typed">
      <h2>Zum Bestätigen tippen</h2>
      <div><Button id="open-typed" variant="danger" onClick={() => setOpen(true)}>Dienst löschen</Button></div>
      <ConfirmDialog
        open={open} title="Dienst löschen?" confirmLabel="Löschen" cancelLabel="Abbrechen" destructive
        typeToConfirm="ledger-prod" typeToConfirmPlaceholder="ledger-prod" typeToConfirmMismatch="Das stimmt nicht mit {value} überein."
        typeToConfirmLabel={<>Zum Bestätigen <code>ledger-prod</code> eingeben</>}
        confirmProps={{ 'data-action-id': 'service.delete' }}
        onConfirm={() => { count('confirmed', 'service'); setOpen(false); }}
        onCancel={() => setOpen(false)}
      />
    </section>
  );
}

const undoToast = createToastApi(createToastStore());

function Undo() {
  return (
    <section id="undo">
      <h2>Rückgängig</h2>
      <div>
        <Button id="close-ticket" onClick={() => undoToast.undoable('Ticket geschlossen', {
          duration: 1500, pauseOnHover: false, undoLabel: 'Rückgängig',
          onUndo: () => { window.__confirm.undone += 1; },
          onCommit: () => { window.__confirm.committed += 1; },
        })}
        >Ticket schließen</Button>
      </div>
      <Toaster store={undoToast.store} />
    </section>
  );
}

function Harness() {
  return (
    <>
      <h1>Bestätigungen</h1>
      <Reason />
      <InDrawer />
      <Scroll />
      <Pending />
      <Typed />
      <TypedLong />
      <LongLabel />
      <Undo />
    </>
  );
}

window.__confirm = { confirmed: [], cancelled: [], committed: 0, undone: 0, drawerCloses: 0, settle: () => {} };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
