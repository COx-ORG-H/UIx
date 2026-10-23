/* InlineEdit, the review of PR #168 (HAR-1833), in jsdom. Each test failed before its fix:
 *   1. commit="blur": Cancel clicked in Safari / macOS Firefox (a blur with no relatedTarget, the
 *      click after it) cancels; it saved the draft. A blur with no relatedTarget that really left
 *      still saves.
 *   4. an object value rebuilt on every parent render does not throw away the accepted value.
 *   5. trigger="icon": the live region stays mounted, so "Saved" is announced.
 *   6. Escape that closes an open list inside the editor does not cancel the edit.
 *   +  a save that settles after the editor was reopened does not close the new session.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'HTMLInputElement', 'HTMLTextAreaElement', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body><button id="outside">Outside</button></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLInputElement', dom.window.HTMLInputElement);
  expose('HTMLTextAreaElement', dom.window.HTMLTextAreaElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const tick = () => act(() => new Promise((r) => setTimeout(r, 5)));
const button = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent === text);

test('1: Cancel clicked where the browser blurs with no relatedTarget (Safari, macOS Firefox) does not save', async () => {
  const saved = [];
  const t = mount(h(ui.InlineEdit, { label: 'Title', value: 'Old', commit: 'blur', onSave: (v) => { saved.push(v); } }));
  act(() => t.host.querySelector('.uix-inline-edit__view').click());
  const input = t.host.querySelector('input');
  type(input, 'Typed, then cancelled');
  const cancel = button(t.host, 'Cancel');
  // what Safari does: pointerdown on the button, the field blurs with no relatedTarget, then the click
  act(() => {
    cancel.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
    input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  });
  act(() => {
    window.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true }));
    cancel.click();
  });
  await tick();
  assert.deepEqual(saved, [], 'Cancel cancelled');
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Old');

  // A blur with no relatedTarget that really left (a click on the page) still saves.
  act(() => t.host.querySelector('.uix-inline-edit__view').click());
  type(t.host.querySelector('input'), 'Kept');
  act(() => {
    t.host.querySelector('input').dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    document.getElementById('outside').focus();
  });
  await tick();
  assert.deepEqual(saved, ['Kept']);
  t.unmount();
});

test('4: an object value rebuilt on every parent render keeps the accepted value until it really changes', () => {
  function Owner() {
    const [, rerender] = useState(0);
    const [id] = useState('u1');
    return h('div', null,
      h('button', { type: 'button', className: 'rerender', onClick: () => rerender((n) => n + 1) }, 'rerender'),
      h(ui.InlineEdit, {
        label: 'Owner', value: { id, name: id === 'u1' ? 'Amra' : 'Jonas' }, renderView: (v) => v.name, equals: (a, b) => a.id === b.id,
        renderEditor: (p) => h('button', { type: 'button', className: 'pick', onClick: () => p.save({ id: 'u2', name: 'Jonas' }) }, 'pick'),
        onSave: () => {}, // the parent has not refetched yet
      }));
  }
  const t = mount(h(Owner));
  act(() => t.host.querySelector('.uix-inline-edit__view').click());
  act(() => t.host.querySelector('.pick').click());
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Jonas');
  act(() => t.host.querySelector('.rerender').click());
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Jonas', 'a new object with the same id is not a new value');
  t.unmount();
});

test('5: trigger="icon" keeps one live region mounted, so "Saved" is announced', () => {
  const t = mount(h(ui.InlineEdit, { label: 'Ticket', value: 'INC-1', trigger: 'icon', onSave: () => {} }));
  const region = t.host.querySelector('[role="status"]');
  act(() => t.host.querySelector('.uix-inline-edit__trigger').click());
  assert.equal(t.host.querySelector('[role="status"]'), region, 'the same region while editing');
  type(t.host.querySelector('input'), 'INC-2');
  act(() => t.host.querySelector('input').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
  assert.equal(t.host.querySelector('[role="status"]'), region, 'the same region after the save');
  assert.equal(region.textContent, 'Saved');
  t.unmount();
});

test('6: Escape that closes an open list inside the editor does not cancel the edit', () => {
  const t = mount(h(ui.InlineEdit, {
    label: 'Owner', value: 'Amra',
    renderEditor: (p) => h('input', { ...p.field, role: 'combobox', 'aria-expanded': 'true', value: p.value, onChange: (e) => p.onChange(e.target.value) }),
    onSave: () => {},
  }));
  act(() => t.host.querySelector('.uix-inline-edit__view').click());
  const combo = t.host.querySelector('[role="combobox"]');
  act(() => combo.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
  assert.ok(t.host.querySelector('[role="combobox"]'), 'the editor is still open');
  combo.setAttribute('aria-expanded', 'false');
  act(() => combo.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
  assert.equal(t.host.querySelector('[role="combobox"]'), null, 'with the list closed, Escape cancels');
  t.unmount();
});

test('a save that settles after the editor was reopened does not close the new session', async () => {
  let settle;
  function Field() {
    const [editing, setEditing] = useState(false);
    return h('div', null,
      h('button', { type: 'button', className: 'close-it', onClick: () => setEditing(false) }, 'close'),
      h(ui.InlineEdit, { label: 'Title', value: 'Old', editing, onEditingChange: setEditing, onSave: () => new Promise((r) => { settle = r; }) }));
  }
  const t = mount(h(Field));
  act(() => t.host.querySelector('.uix-inline-edit__view').click());
  type(t.host.querySelector('input'), 'First');
  act(() => t.host.querySelector('input').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
  // the parent closes the field while the save runs (another field opened), then it is opened again
  act(() => t.host.querySelector('.close-it').click());
  act(() => t.host.querySelector('.uix-inline-edit__view').click());
  assert.ok(t.host.querySelector('input'), 'reopened');
  await act(async () => { settle(); await Promise.resolve(); await Promise.resolve(); });
  assert.ok(t.host.querySelector('input'), 'the first save settling did not close the second session');
  t.unmount();
});
