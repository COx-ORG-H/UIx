/* Live harness for the display preferences (HAR-1372), bundled by build.mjs from source for
 * tests/a11y/display-preferences.spec.mjs. The storage key is 'uix-harness-display' (the pre-paint
 * script in the head reads the same key):
 *   - #prefs: DisplayPreferences, uncontrolled, writing <html> attributes;
 *   - #switcher: a ThemeSwitcher in the same tab, which follows the panel;
 *   - #specimen: what the settings change: a card with hushed and muted text and a bordered input,
 *     a table row, a spinner and a moving transition (.probe-move);
 *   - #layers: what reduced transparency changes: a Select whose options arrive from a blur, a
 *     Modal and a Drawer over a blurred scrim, and a progress overlay over busy content. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Card, DisplayPreferences, Drawer, Input, Modal, Select, Spinner, Table, Th, ThemeSwitcher, useReducedMotion, useReducedTransparency,
} from '../../packages/react/src/index.js';

const KEY = 'uix-harness-display';

function Specimen() {
  const reduced = useReducedMotion();
  return (
    <section id="specimen" aria-label="Specimen">
      <Card title="Ledger sync" subtitle="Hushed subtitle text">
        <p className="uix-text-meta" id="hushed">Hushed meta text</p>
        <p style={{ color: 'var(--uix-text-muted)' }} id="muted">Muted text</p>
        <label htmlFor="field">Field</label>
        <Input id="field" defaultValue="value" />
        <Table aria-label="Rows"><thead><tr><Th>Name</Th></tr></thead><tbody><tr id="row"><td>INC-1</td></tr></tbody></Table>
        <Spinner id="spinner" label="Loading" />
        <div className="probe-move" id="probe" style={{ transition: 'transform var(--uix-dur) var(--uix-ease-out), opacity var(--uix-dur) var(--uix-ease-out)' }}>moving</div>
        <output id="reduced">{reduced ? 'reduced' : 'full'}</output>
      </Card>
    </section>
  );
}

const QUEUES = ['Service desk', 'Network operations', 'Field engineering', 'Facilities', 'Payroll', 'Procurement'].map((label) => ({ value: label.toLowerCase().replace(/ /g, '-'), label }));

function Layers() {
  const clear = useReducedTransparency();
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  return (
    <section id="layers" aria-label="Layers">
      <h2>Layers</h2>
      <label htmlFor="queue">Queue</label>
      <Select id="queue" options={QUEUES} placeholder="Choose a queue" />
      <div className="uix-cluster" style={{ ['--gap' as string]: '8px' }}>
        <Button id="open-modal" variant="secondary" onClick={() => setModal(true)}>Open dialog</Button>
        <Button id="open-drawer" variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button>
      </div>
      <div id="busy" style={{ position: 'relative', padding: 'var(--uix-space-4)', border: '1px solid var(--uix-border)', borderRadius: 'var(--uix-radius-md)' }}>
        <p>INC-2048 Printer queue stalled on floor 3. Assigned to Field engineering, due today 16:00.</p>
        <div className="uix-overlay-progress" id="overlay"><Spinner label="Saving" /></div>
      </div>
      <output id="clear">{clear ? 'solid' : 'see-through'}</output>
      <Modal id="modal" open={modal} onClose={() => setModal(false)} title="Reassign INC-2048">
        <p>Move the incident to another queue. The current assignee is told.</p>
      </Modal>
      <Drawer id="drawer" open={drawer} onClose={() => setDrawer(false)} title="INC-2048">
        <p>Printer queue stalled on floor 3.</p>
      </Drawer>
    </section>
  );
}

function Harness() {
  return (
    <>
      <h1>Display preferences</h1>
      <section><h2>Theme</h2><ThemeSwitcher id="switcher" storageKey={KEY} /></section>
      <section><h2>All settings</h2><DisplayPreferences id="prefs" storageKey={KEY} /></section>
      <Specimen />
      <Layers />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
