/* InlineEdit for TENSOR's record fields (HAR-1833; TENSOR HAR-1490 `EditableRecord`), in jsdom.
 * One test per gap of the issue:
 *   1. any value type: an option object, compared by `equals`, shown by `renderView`;
 *   2. commit on blur and on change; `save(next)` saves the value just chosen, not a stale draft;
 *   3. `renderError(error, { retry, cancel })` and `onStateChange`;
 *   4. controllable `editing` (one field open at a time) and `draft` (dirty reporting);
 *   5. after a save the accepted value shows until the parent's `value` changes;
 *   6. `trigger="icon"`: a pencil button named only "Edit {label}";
 *   7. `readOnlyReason`, wired by aria-describedby.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k) => act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
/** Focus leaves the editor for `to` (a focusout whose relatedTarget is outside). */
const leave = (from, to) => act(() => {
  from.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: to }));
  to.focus();
});
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

const PEOPLE = [{ id: 'u1', name: 'Amra Kovač' }, { id: 'u2', name: 'Jonas Weber' }, { id: 'u3', name: 'Lejla Hadžić' }];
/** A select over option objects: what TENSOR's EntityPicker field does. */
const personEditor = (p) => h('select', {
  ...p.field,
  value: p.value?.id ?? '',
  onChange: (e) => p.onChange(PEOPLE.find((x) => x.id === e.target.value) ?? null),
}, h('option', { value: '' }, '—'), PEOPLE.map((x) => h('option', { key: x.id, value: x.id }, x.name)));
const choose = (select, id) => act(() => { select.value = id; select.dispatchEvent(new window.Event('change', { bubbles: true })); });

test('1: an object value, compared by equals and shown by renderView', () => {
  const saved = [];
  function Owner() {
    const [value, setValue] = useState({ id: 'u1', name: 'Amra Kovač' }); // a fresh object, not the same instance
    return h(ui.InlineEdit, {
      label: 'Owner', value, renderView: (v) => v?.name, isEmpty: (v) => v == null,
      equals: (a, b) => a?.id === b?.id, renderEditor: personEditor,
      onSave: (next) => { saved.push(next?.id ?? null); setValue(next); },
    });
  }
  const t = mount(h(Owner));
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Amra Kovač');
  click(t.host.querySelector('.uix-inline-edit__view'));
  click([...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Save'));
  assert.deepEqual(saved, [], 'the same person (another object) is unchanged: equals, not identity');
  click(t.host.querySelector('.uix-inline-edit__view'));
  choose(t.host.querySelector('select'), 'u2');
  click([...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Save'));
  assert.deepEqual(saved, ['u2']);
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Jonas Weber');
  click(t.host.querySelector('.uix-inline-edit__view'));
  choose(t.host.querySelector('select'), '');
  click([...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Save'));
  assert.deepEqual(saved, ['u2', null]);
  assert.equal(t.host.querySelector('.uix-inline-edit__placeholder').textContent, 'Not set', 'null is empty');
  t.unmount();
});

test('2: commit="blur" saves when focus leaves; Escape wins over the teardown blur', () => {
  const saved = [];
  const t = mount(h(ui.InlineEdit, { label: 'Title', value: 'Printer offline', commit: 'blur', onSave: (next) => { saved.push(next); } }));
  click(t.host.querySelector('.uix-inline-edit__view'));
  const input = t.host.querySelector('input');
  type(input, 'Printer offline on 3rd floor');
  // to the field's own Cancel: not leaving
  leave(input, [...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Cancel'));
  assert.deepEqual(saved, []);
  leave(document.activeElement, document.getElementById('outside'));
  assert.deepEqual(saved, ['Printer offline on 3rd floor']);
  assert.equal(t.host.querySelector('input'), null, 'closed');
  assert.notEqual(document.activeElement, t.host.querySelector('.uix-inline-edit__view'), 'a blur save leaves focus where the person went');

  click(t.host.querySelector('.uix-inline-edit__view'));
  type(t.host.querySelector('input'), 'Abandoned');
  const editorInput = t.host.querySelector('input');
  key(editorInput, 'Escape');
  act(() => editorInput.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: null })));
  assert.deepEqual(saved, ['Printer offline on 3rd floor'], 'Escape, then the blur of the removed field: nothing saved');
  t.unmount();
});

test('2: commit="change" saves the chosen value at once, with no Save button; save(next) is never stale', async () => {
  const saved = [];
  const t = mount(h(ui.InlineEdit, {
    label: 'Owner', value: PEOPLE[0], renderView: (v) => v.name, equals: (a, b) => a?.id === b?.id, commit: 'change',
    renderEditor: personEditor, onSave: (next) => { saved.push(next.id); },
  }));
  click(t.host.querySelector('.uix-inline-edit__view'));
  assert.deepEqual([...t.host.querySelectorAll('.uix-inline-edit__actions button')].map((b) => b.textContent), ['Cancel']);
  choose(t.host.querySelector('select'), 'u3');
  assert.deepEqual(saved, ['u3']);
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Lejla Hadžić');
  t.unmount();

  // The bug the issue names: onChange(next) then save() saved the old draft.
  const sent = [];
  const u = mount(h(ui.InlineEdit, {
    label: 'Priority', value: 'P3',
    renderEditor: (p) => h('button', { type: 'button', className: 'pick', onClick: () => { p.onChange('P1'); p.save('P1'); } }, 'P1'),
    onSave: (next) => { sent.push(next); },
  }));
  click(u.host.querySelector('.uix-inline-edit__view'));
  click(u.host.querySelector('.pick'));
  assert.deepEqual(sent, ['P1']);
  u.unmount();
});

test('3: renderError gets the rejection with retry and cancel; onStateChange reports every step', async () => {
  const states = [];
  let attempts = 0;
  const conflict = Object.assign(new Error('Someone else changed this.'), { code: 'conflict' });
  const t = mount(h(ui.InlineEdit, {
    label: 'Title', value: 'Old',
    onSave: () => { attempts += 1; return attempts === 1 ? Promise.reject(new Error('Network timeout')) : attempts === 2 ? Promise.reject(conflict) : Promise.resolve(); },
    onStateChange: (s) => states.push(s),
    renderError: (error, ctx) => h('span', null,
      h('span', { className: 'msg' }, ctx.message),
      error.code === 'conflict'
        ? h('button', { type: 'button', className: 'reload', onClick: ctx.cancel }, 'Reload latest')
        : h('button', { type: 'button', className: 'retry', onClick: ctx.retry }, 'Try again')),
  }));
  click(t.host.querySelector('.uix-inline-edit__view'));
  type(t.host.querySelector('input'), 'New');
  key(t.host.querySelector('input'), 'Enter');
  await settle();
  const alert = t.host.querySelector('[role="alert"]');
  assert.equal(alert.querySelector('.msg').textContent, 'Network timeout');
  assert.equal(t.host.querySelector('input').getAttribute('aria-describedby'), alert.id);
  click(t.host.querySelector('.retry'));
  await settle();
  assert.equal(attempts, 2, 'Try again sent the draft again');
  assert.ok(t.host.querySelector('.reload'), 'a conflict renders Reload latest instead');
  click(t.host.querySelector('.reload'));
  assert.equal(t.host.querySelector('input'), null, 'cancel closed the editor');
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Old');
  assert.deepEqual(states, ['editing', 'saving', 'error', 'saving', 'error', 'idle']);
  click(t.host.querySelector('.uix-inline-edit__view'));
  key(t.host.querySelector('input'), 'Enter'); // unchanged: closes, nothing sent
  click(t.host.querySelector('.uix-inline-edit__view'));
  type(t.host.querySelector('input'), 'Newer');
  key(t.host.querySelector('input'), 'Enter');
  await settle();
  assert.equal(attempts, 3);
  assert.deepEqual(states.slice(-3), ['editing', 'saving', 'saved']);
  t.unmount();
});

test('4: controlled editing keeps one field open; a controlled draft reports dirty input', () => {
  const drafts = [];
  function Record() {
    const [open, setOpen] = useState(null);
    const [title, setTitle] = useState('Printer offline');
    const [owner, setOwner] = useState('Amra');
    const [draft, setDraft] = useState();
    const field = (id, value, set) => h(ui.InlineEdit, {
      label: id, value, onSave: set,
      editing: open === id, onEditingChange: (next) => setOpen(next ? id : null),
      ...(id === 'Title' ? { draft: draft ?? value, onDraftChange: (d) => { drafts.push(d); setDraft(d); } } : {}),
    });
    return h('div', null, h('p', { className: 'dirty' }, open === 'Title' && draft !== undefined && draft !== title ? 'dirty' : 'clean'),
      field('Title', title, setTitle), field('Owner', owner, setOwner));
  }
  const t = mount(h(Record));
  const views = () => [...t.host.querySelectorAll('.uix-inline-edit__view')];
  click(views()[0]);
  assert.equal(t.host.querySelectorAll('input').length, 1);
  assert.equal(t.host.querySelector('input').getAttribute('aria-label'), 'Title');
  type(t.host.querySelector('input'), 'Printer offline again');
  assert.equal(t.host.querySelector('.dirty').textContent, 'dirty');
  assert.equal(drafts.at(-1), 'Printer offline again');
  // Opening Owner closes Title: the parent holds which one is open.
  click(views()[0]);
  assert.equal(t.host.querySelectorAll('input').length, 1);
  assert.equal(t.host.querySelector('input').getAttribute('aria-label'), 'Owner');
  assert.equal(document.activeElement, t.host.querySelector('input'), 'a field opened by its parent still gets focus');
  t.unmount();
});

test('5: the saved value shows until the parent\'s value changes; no flash of the old one', async () => {
  let resolve;
  function Late() {
    const [value, setValue] = useState('Old title');
    return h('div', null,
      h('button', { type: 'button', className: 'refetch', onClick: () => setValue('Server title') }, 'refetch'),
      h(ui.InlineEdit, { label: 'Title', value, onSave: () => new Promise((r) => { resolve = r; }) }));
  }
  const t = mount(h(Late));
  click(t.host.querySelector('.uix-inline-edit__view'));
  type(t.host.querySelector('input'), 'New title');
  key(t.host.querySelector('input'), 'Enter');
  assert.ok(t.host.querySelector('input'), 'waits for the server: still the editor');
  await act(async () => { resolve(); await Promise.resolve(); });
  await settle();
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'New title', 'the accepted value, though the parent has not refetched');
  click(t.host.querySelector('.refetch'));
  assert.equal(t.host.querySelector('.uix-inline-edit__value').textContent, 'Server title', 'a new value from the parent wins');
  t.unmount();
});

test('6: trigger="icon" names the button only "Edit {label}"; the value is plain text', () => {
  const html = renderToStaticMarkup(h(ui.InlineEdit, { label: 'Summary', value: 'Checkout requests time out', trigger: 'icon', onSave() {} }));
  assert.match(html, /^<span class="uix-inline-edit uix-inline-edit--icon-trigger"><span class="uix-inline-edit__value">Checkout requests time out<\/span><button type="button" class="uix-inline-edit__trigger" aria-label="Edit Summary">/);
  const t = mount(h(ui.InlineEdit, { label: 'Summary', value: 'Old', trigger: 'icon', onSave() {} }));
  const pencil = t.host.querySelector('.uix-inline-edit__trigger');
  click(pencil);
  type(t.host.querySelector('input'), 'New');
  key(t.host.querySelector('input'), 'Enter');
  assert.equal(document.activeElement, t.host.querySelector('.uix-inline-edit__trigger'), 'focus returns to the pencil');
  t.unmount();
});

test('7: readOnlyReason: no edit control, the reason describes the value', () => {
  const html = renderToStaticMarkup(h(ui.InlineEdit, { label: 'Source', value: 'Import', readOnlyReason: 'Set by the integration.', onSave() {}, labels: { readOnly: 'Schreibgeschützt:' } }));
  assert.doesNotMatch(html, /<button/);
  const id = html.match(/aria-describedby="([^"]+)"/)[1];
  assert.match(html, new RegExp(`<span id="${id}" class="uix-inline-edit__reason"><span class="uix-visually-hidden">Schreibgeschützt: </span>Set by the integration.</span>`));
  assert.match(html, /class="uix-inline-edit uix-inline-edit--readonly uix-inline-edit--reason"/);
});
