/* HAR-1607 — ToggleRow's label is the switch's label, and its description is
 * the switch's description.
 *
 * The label rendered as a plain <div> with no tie to the Switch, so clicking the
 * words did nothing, the switch was named only by the required `accessibleLabel`
 * (every caller repeated the visible text), and the description was never
 * announced with the switch.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};

/** The text a screen reader would take from the ids in `attr` on `el`. */
const textOfIds = (el, attr) =>
  (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' ');

function Controlled({ description }) {
  const [on, setOn] = useState(false);
  return h(ui.ToggleRow, { label: 'Email digests', description, checked: on, onCheckedChange: setOn });
}

test('clicking the label text flips the switch', () => {
  const { host, unmount } = mount(h(Controlled, { description: 'One email a day.' }));
  const input = host.querySelector('input[role="switch"]');
  assert.equal(input.checked, false);
  const label = [...host.querySelectorAll('label')].find((l) => l.textContent === 'Email digests');
  assert.ok(label, 'the visible label is a <label>');
  assert.equal(label.htmlFor, input.id, 'the label is tied to the switch');
  act(() => label.click());
  assert.equal(input.checked, true);
  unmount();
});

test('the switch is named by the visible label and described by the description', () => {
  const { host, unmount } = mount(h(Controlled, { description: 'One email a day.' }));
  const input = host.querySelector('input[role="switch"]');
  assert.equal(input.hasAttribute('aria-label'), false, 'no repeated text in aria-label');
  assert.deepEqual([...input.labels].map((l) => l.textContent.trim()).filter(Boolean), ['Email digests']);
  assert.equal(textOfIds(input, 'aria-describedby'), 'One email a day.');
  unmount();
});

test('no description, no aria-describedby; accessibleLabel still names a non-text label', () => {
  const { host, unmount } = mount(
    h(ui.ToggleRow, { label: h('span', { 'aria-hidden': true }, '🔔'), accessibleLabel: 'Notifications', checked: false, onCheckedChange: () => {} }),
  );
  const input = host.querySelector('input[role="switch"]');
  assert.equal(input.getAttribute('aria-label'), 'Notifications');
  assert.equal(input.hasAttribute('aria-describedby'), false);
  unmount();
});
