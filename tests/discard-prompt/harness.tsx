/* Live harness for the discard step of a dirty Drawer or Modal (HAR-2029), bundled by build.mjs
 * from source for tests/a11y/discard-prompt.spec.mjs. window.__discard counts onClose calls per
 * dialog and lets the spec mark a save as pending.
 *   - #open-drawer: a form drawer, dirty once the name differs from its saved value; Save marks
 *     it pending until the spec calls __discard.settle(); Cancel is a DialogClose; a Select
 *     inside takes Escape first while its list is open;
 *   - #open-modal: the same form in a Modal;
 *   - inside the drawer only: #help-trigger opens an auto Popover (#help-pop), and #open-inner
 *     opens a Modal nested in the drawer's JSX (#inner, whose OK counts __discard.innerOk). */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DialogClose, Drawer, Field, Input, Modal, Popover, Select } from '../../packages/react/src/index.js';

declare global {
  interface Window { __discard: { closes: Record<'drawer' | 'modal', number>; innerOk: number; settle: () => void } }
}

const SAVED = 'Incident created';
const TEAMS = [
  { value: 'network', label: 'Network operations' },
  { value: 'service-desk', label: 'Service desk' },
];

function TemplateForm({ id, value, onChange, team, onTeam }: { id: string; value: string; onChange: (v: string) => void; team: string; onTeam: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--uix-space-4)' }}>
      <Field label="Template name" htmlFor={`${id}-name`}>
        <Input id={`${id}-name`} value={value} onChange={(e) => onChange(e.currentTarget.value)} />
      </Field>
      <Field label="Team" htmlFor={`${id}-team`}>
        <Select id={`${id}-team`} value={team} onValueChange={(v) => onTeam(String(v))} options={TEAMS} />
      </Field>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState<'drawer' | 'modal' | null>(null);
  const [name, setName] = useState(SAVED);
  const [team, setTeam] = useState('network');
  const [pending, setPending] = useState(false);
  const [inner, setInner] = useState(false);
  // `popoverTarget` is a valid HTML attribute but absent from React 18's DOM types.
  const helpTarget = { popoverTarget: 'help-pop' } as Record<string, string>;
  window.__discard.settle = () => setPending(false);
  const dirty = name !== SAVED || team !== 'network';
  const close = (key: 'drawer' | 'modal') => () => {
    window.__discard.closes[key] += 1;
    setOpen(null);
    setName(SAVED);
    setTeam('network');
  };
  const footer = (
    <>
      <Button id="save" variant="primary" loading={pending} onClick={() => setPending(true)}>Save</Button>
      <DialogClose id="cancel">Cancel</DialogClose>
    </>
  );
  return (
    <>
      <h1>Discard changes</h1>
      <p>Open a form, change it, then press Escape, the close button, Cancel or the dimmed area.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
        <Button id="open-drawer" onClick={() => setOpen('drawer')}>Edit template</Button>
        <Button id="open-modal" onClick={() => setOpen('modal')}>Edit in a dialog</Button>
      </div>

      <Drawer id="drawer" open={open === 'drawer'} onClose={close('drawer')} dirty={dirty} pending={pending} title="Edit template" footer={footer}>
        <TemplateForm id="drawer" value={name} onChange={setName} team={team} onTeam={setTeam} />
        <div style={{ display: 'flex', gap: 'var(--uix-space-2)', marginTop: 'var(--uix-space-4)' }}>
          <Button id="help-trigger" {...helpTarget}>Help</Button>
          <Button id="open-inner" onClick={() => setInner(true)}>Pick a template</Button>
        </div>
        <Popover id="help-pop">Templates fill the notification text.</Popover>
        <Modal id="inner" open={inner} onClose={() => setInner(false)} title="Pick a template"
          footer={<Button id="inner-ok" variant="primary" onClick={() => { window.__discard.innerOk += 1; setInner(false); }}>OK</Button>}>
          <p>Incident created, Incident resolved, Change approved.</p>
        </Modal>
      </Drawer>

      <Modal id="modal" open={open === 'modal'} onClose={close('modal')} dirty={dirty} pending={pending} title="Edit template" footer={footer}>
        <TemplateForm id="modal" value={name} onChange={setName} team={team} onTeam={setTeam} />
      </Modal>
    </>
  );
}

window.__discard = { closes: { drawer: 0, modal: 0 }, innerOk: 0, settle: () => {} };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
