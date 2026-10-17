/* Live harness for the discard step of a dirty Drawer or Modal (HAR-2029), bundled by build.mjs
 * from source for tests/a11y/discard-prompt.spec.mjs. window.__discard counts onClose calls per
 * dialog and lets the spec mark a save as pending.
 *   - #open-drawer: a form drawer, dirty once the name differs from its saved value; Save marks
 *     it pending until the spec calls __discard.settle(); Cancel is a DialogClose; a Select
 *     inside takes Escape first while its list is open;
 *   - #open-modal: the same form in a Modal. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DialogClose, Drawer, Field, Input, Modal, Select } from '../../packages/react/src/index.js';

declare global {
  interface Window { __discard: { closes: Record<'drawer' | 'modal', number>; settle: () => void } }
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
      </Drawer>

      <Modal id="modal" open={open === 'modal'} onClose={close('modal')} dirty={dirty} pending={pending} title="Edit template" footer={footer}>
        <TemplateForm id="modal" value={name} onChange={setName} team={team} onTeam={setTeam} />
      </Modal>
    </>
  );
}

window.__discard = { closes: { drawer: 0, modal: 0 }, settle: () => {} };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
