/* CheckboxGroup (HAR-1799): a fieldset + legend names the boxes; hint and error are tied to the
 * group; disabled reaches every box; columns is a ceiling.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
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

const render = (props) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.CheckboxGroup, { label: 'Tags', ...props },
    h(ui.Checkbox, { name: 'tags', value: 'fiction', label: 'Fiction' }),
    h(ui.Checkbox, { name: 'tags', value: 'history', label: 'History' }))));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};

test('a fieldset whose legend is the group name, around the checkboxes', () => {
  const { host, unmount } = render({});
  const fieldset = host.querySelector('fieldset.uix-checkbox-group');
  assert.ok(fieldset);
  const legend = fieldset.firstElementChild;
  assert.equal(legend.tagName, 'LEGEND');
  assert.equal(legend.textContent, 'Tags');
  const boxes = fieldset.querySelectorAll('input[type="checkbox"]');
  assert.equal(boxes.length, 2);
  // every box is a descendant of the fieldset, so the legend names the group each one is in
  for (const box of boxes) assert.equal(box.closest('fieldset'), fieldset);
  assert.equal(fieldset.getAttribute('aria-describedby'), null, 'no message, no description');
  assert.equal(fieldset.querySelector('.uix-checkbox-group__options').getAttribute('style'), null);
  unmount();
});

test('hint describes the group; an error replaces it and is announced', () => {
  const hinted = render({ hint: 'Pick the shelves this book belongs on.' });
  let fieldset = hinted.host.querySelector('fieldset');
  const id = fieldset.getAttribute('aria-describedby');
  assert.ok(id);
  assert.equal(hinted.host.querySelector(`[id="${id}"]`).textContent, 'Pick the shelves this book belongs on.');
  assert.equal(fieldset.hasAttribute('data-invalid'), false);
  hinted.unmount();

  const failed = render({ hint: 'Pick the shelves.', error: 'Choose at least one tag.' });
  fieldset = failed.host.querySelector('fieldset');
  const msg = failed.host.querySelector(`[id="${fieldset.getAttribute('aria-describedby')}"]`);
  assert.equal(msg.textContent, 'Choose at least one tag.');
  assert.equal(msg.querySelector('[role="alert"]').textContent, 'Choose at least one tag.');
  assert.equal(fieldset.getAttribute('data-invalid'), 'true');
  failed.unmount();
});

test('required marks the legend; disabled disables the fieldset; columns sets the ceiling', () => {
  const { host, unmount } = render({ required: true, disabled: true, columns: 3, id: 'tags' });
  const fieldset = host.querySelector('fieldset');
  assert.equal(fieldset.id, 'tags');
  assert.equal(fieldset.disabled, true);
  assert.equal(fieldset.querySelector('legend').getAttribute('data-required'), 'true');
  assert.match(fieldset.querySelector('.uix-checkbox-group__options').getAttribute('style'), /--uix-checkbox-group-columns:\s*3/);
  // a disabled fieldset disables the boxes inside it for the form and the keyboard
  assert.equal(fieldset.querySelector('input').matches(':disabled'), true);
  unmount();
});
