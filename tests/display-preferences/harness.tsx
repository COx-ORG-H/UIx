/* Live harness for the display preferences (HAR-1372), bundled by build.mjs from source for
 * tests/a11y/display-preferences.spec.mjs. The storage key is 'uix-harness-display' (the pre-paint
 * script in the head reads the same key):
 *   - #prefs: DisplayPreferences, uncontrolled, writing <html> attributes;
 *   - #switcher: a ThemeSwitcher in the same tab, which follows the panel;
 *   - #specimen: what the settings change: a card with hushed and muted text and a bordered input,
 *     a table row, a spinner and a moving transition (.probe-move). */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, DisplayPreferences, Input, Spinner, Table, Th, ThemeSwitcher, useReducedMotion } from '../../packages/react/src/index.js';

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

function Harness() {
  return (
    <>
      <h1>Display preferences</h1>
      <section><h2>Theme</h2><ThemeSwitcher id="switcher" storageKey={KEY} /></section>
      <section><h2>All settings</h2><DisplayPreferences id="prefs" storageKey={KEY} /></section>
      <Specimen />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
