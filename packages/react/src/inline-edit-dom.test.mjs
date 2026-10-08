/* InlineEdit (HAR-1381; TENSOR C16 `editable-record.tsx`), in jsdom:
 *   - the value is a button whose name is the value plus "Edit {label}";
 *   - activating it swaps in an editor with the draft selected, Save and Cancel;
 *   - Enter saves, Escape cancels (and does not reach what is around it), nothing saves on blur;
 *   - a promise from onSave shows the pending state; a rejection keeps the draft and shows why;
 *   - validate refuses a draft without calling onSave; an unchanged draft just closes;
 *   - focus goes into the editor on open and back to the value afterwards;
 *   - multiline, a custom editor, read-only, and labels from UixLabelsProvider.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState, StrictMode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'HTMLInputElement', 'HTMLTextAreaElement', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
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

/** A controlled field; `save` decides what onSave does with each draft. */
function mount(props = {}, save) {
  const saved = [];
  function Field() {
    const [value, setValue] = useState(props.value ?? 'Payment API latency');
    // what a drawer around the field would hear: only Escape matters here
    return h('div', { onKeyDown: (e) => { if (e.key === 'Escape') saved.push('outer:Escape'); } },
      h(ui.InlineEdit, { label: 'Title', ...props, value, onSave: (next) => { saved.push(next); const result = save?.(next); if (result) return result.then(() => setValue(next)); setValue(next); return undefined; } }));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Field)));
  return {
    host, saved,
    view: () => host.querySelector('button.uix-inline-edit__view'),
    input: () => host.querySelector('.uix-inline-edit__editor input, .uix-inline-edit__editor textarea'),
    button: (text) => [...host.querySelectorAll('.uix-inline-edit__actions button')].find((b) => b.textContent === text),
    status: () => host.querySelector('[role="status"]').textContent,
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
const type = (el, text) => act(() => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k, init = {}) => {
  let notPrevented = true;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });
  return notPrevented;
};
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

test('the view is a button named by the value and what it edits', () => {
  const t = mount();
  const view = t.view();
  assert.equal(view.tagName, 'BUTTON');
  assert.equal(view.getAttribute('type'), 'button');
  assert.equal(view.querySelector('.uix-inline-edit__value').textContent, 'Payment API latency');
  assert.equal(view.textContent, 'Payment API latency, Edit Title', 'the visible value comes first in the name (label in name)');
  assert.equal(view.querySelector('.uix-inline-edit__icon').getAttribute('aria-hidden'), 'true');
  assert.equal(t.host.querySelector('.uix-inline-edit__editor'), null);
  t.unmount();
});

test('activating it opens an editor with the draft focused and selected; Enter saves and focus returns', () => {
  const t = mount();
  click(t.view());
  const input = t.input();
  assert.equal(input.getAttribute('aria-label'), 'Title');
  assert.equal(input.value, 'Payment API latency');
  assert.equal(document.activeElement, input);
  assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 'Payment API latency'.length], 'the text is selected, ready to be replaced');
  const group = t.host.querySelector('.uix-inline-edit__editor');
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(group.getAttribute('aria-label'), 'Edit Title');
  assert.ok(t.button('Save') && t.button('Cancel'));

  type(input, 'Payment API timeouts');
  assert.equal(key(input, 'Enter'), false, 'Enter is handled');
  assert.deepEqual(t.saved, ['Payment API timeouts']);
  assert.equal(t.host.querySelector('.uix-inline-edit__editor'), null, 'the editor closed');
  assert.equal(t.view().querySelector('.uix-inline-edit__value').textContent, 'Payment API timeouts');
  assert.equal(document.activeElement, t.view(), 'focus is back on the value');
  assert.equal(t.status(), 'Saved');
  t.unmount();
});

test('Escape cancels without saving and without reaching what is around it; so does Cancel', () => {
  const t = mount();
  click(t.view());
  type(t.input(), 'Something else');
  assert.equal(key(t.input(), 'Escape'), false);
  assert.deepEqual(t.saved, [], 'not saved, and the outer handler never saw the Escape');
  assert.equal(t.view().querySelector('.uix-inline-edit__value').textContent, 'Payment API latency');
  assert.equal(document.activeElement, t.view());

  click(t.view());
  assert.equal(t.input().value, 'Payment API latency', 'the abandoned draft is gone');
  type(t.input(), 'Again');
  click(t.button('Cancel'));
  assert.deepEqual(t.saved, []);
  assert.equal(document.activeElement, t.view());
  t.unmount();
});

test('nothing is saved on blur, and an unchanged draft closes without calling onSave', () => {
  const t = mount();
  click(t.view());
  type(t.input(), 'Half typed');
  act(() => t.input().blur());
  assert.deepEqual(t.saved, []);
  assert.ok(t.input(), 'the editor stays open with the draft');
  assert.equal(t.input().value, 'Half typed');
  type(t.input(), 'Payment API latency');
  click(t.button('Save'));
  assert.deepEqual(t.saved, [], 'same as the saved value: nothing to save');
  assert.equal(t.host.querySelector('.uix-inline-edit__editor'), null);
  t.unmount();
});

test('a promise from onSave: busy while it runs, then closed; a rejection keeps the draft and says why', async () => {
  let settle;
  const t = mount({}, () => new Promise((resolve, reject) => { settle = { resolve, reject }; }));
  click(t.view());
  type(t.input(), 'Draft one');
  click(t.button('Save'));
  const group = t.host.querySelector('.uix-inline-edit__editor');
  assert.equal(group.getAttribute('aria-busy'), 'true');
  assert.equal(t.input().disabled, true);
  assert.equal(t.button('Cancel').disabled, true);
  assert.equal(t.status(), 'Saving…');
  key(t.input(), 'Escape');
  assert.ok(t.input(), 'Escape does not abandon a save that is running');

  await act(async () => { settle.reject(new Error('The title is already used.')); await Promise.resolve(); await Promise.resolve(); });
  assert.equal(group.hasAttribute('aria-busy'), false);
  const error = t.host.querySelector('.uix-inline-edit__error');
  assert.equal(error.textContent, 'The title is already used.');
  assert.equal(error.getAttribute('role'), 'alert');
  assert.equal(t.input().getAttribute('aria-describedby'), error.id);
  assert.equal(t.input().getAttribute('aria-invalid'), 'true');
  assert.equal(t.input().value, 'Draft one', 'the draft is kept');
  assert.equal(t.input().disabled, false);
  assert.equal(document.activeElement, t.input(), 'focus is on the field again');

  click(t.button('Save'));
  await act(async () => { settle.resolve(); await Promise.resolve(); await Promise.resolve(); });
  await flush();
  assert.equal(t.host.querySelector('.uix-inline-edit__editor'), null);
  assert.equal(t.view().querySelector('.uix-inline-edit__value').textContent, 'Draft one');
  assert.equal(t.status(), 'Saved');
  assert.equal(document.activeElement, t.view());
  t.unmount();

  // a rejection without a message falls back to the label
  const bare = mount({}, () => Promise.reject(undefined));
  click(bare.view());
  type(bare.input(), 'x');
  click(bare.button('Save'));
  await flush();
  assert.equal(bare.host.querySelector('.uix-inline-edit__error').textContent, 'Could not save.');
  bare.unmount();
});

test('validate refuses a draft: the message shows, onSave is not called', () => {
  const t = mount({ validate: (next) => (next.trim() ? undefined : 'A title is required.') });
  click(t.view());
  type(t.input(), '   ');
  key(t.input(), 'Enter');
  assert.deepEqual(t.saved, []);
  assert.equal(t.host.querySelector('.uix-inline-edit__error').textContent, 'A title is required.');
  type(t.input(), 'Fine');
  click(t.button('Save'));
  assert.deepEqual(t.saved, ['Fine']);
  t.unmount();
});

test('multiline: a textarea where Enter adds a line and Ctrl/⌘+Enter saves', () => {
  const t = mount({ multiline: true, value: 'Line one' });
  click(t.view());
  const area = t.input();
  assert.equal(area.tagName, 'TEXTAREA');
  type(area, 'Line one\nLine two');
  assert.equal(key(area, 'Enter'), true, 'a plain Enter is the textarea\'s');
  assert.deepEqual(t.saved, []);
  key(area, 'Enter', { ctrlKey: true });
  assert.deepEqual(t.saved, ['Line one\nLine two']);
  t.unmount();
});

test('renderEditor: a custom control gets the draft, the field wiring, save and cancel', () => {
  const seen = [];
  const t = mount({
    value: 'p2',
    label: 'Priority',
    renderView: (v) => v.toUpperCase(),
    renderEditor: (p) => {
      seen.push(Object.keys(p.field).sort().join(','));
      return h('select', { ...p.field, value: p.value, onChange: (e) => p.onChange(e.target.value) }, h('option', { value: 'p1' }, 'P1'), h('option', { value: 'p2' }, 'P2'));
    },
  });
  assert.equal(t.view().querySelector('.uix-inline-edit__value').textContent, 'P2', 'renderView formats the saved value');
  click(t.view());
  const select = t.host.querySelector('select');
  assert.equal(select.getAttribute('aria-label'), 'Priority');
  assert.equal(document.activeElement, select, 'focus goes to the custom control');
  assert.equal(seen[0], 'aria-describedby,aria-invalid,aria-label,disabled,id');
  act(() => { select.value = 'p1'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
  click(t.button('Save'));
  assert.deepEqual(t.saved, ['p1']);
  assert.equal(t.view().querySelector('.uix-inline-edit__value').textContent, 'P1');
  t.unmount();
});

test('an empty value shows the placeholder; disabled is plain text with no button', () => {
  const empty = mount({ value: '', placeholder: 'Add a description', label: 'Description' });
  assert.equal(empty.view().querySelector('.uix-inline-edit__placeholder').textContent, 'Add a description');
  assert.equal(empty.view().textContent, 'Add a description, Edit Description');
  empty.unmount();
  assert.match(renderToStaticMarkup(h(ui.InlineEdit, { value: '', label: 'Owner', onSave() {} })), /<span class="uix-inline-edit__placeholder">Not set<\/span>/);

  const html = renderToStaticMarkup(h(ui.InlineEdit, { value: 'Closed', label: 'State', onSave() {}, disabled: true }));
  assert.equal(html, '<span class="uix-inline-edit uix-inline-edit--readonly"><span class="uix-inline-edit__value">Closed</span></span>');
});

test('labels: the prop, then UixLabelsProvider inlineEdit, then English', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.UixLabelsProvider, { labels: { inlineEdit: { edit: '{label} bearbeiten', save: 'Speichern', cancel: 'Abbrechen' } } },
    h(ui.InlineEdit, { value: 'Wert', label: 'Titel', onSave() {}, labels: { cancel: 'Verwerfen' } }))));
  assert.equal(host.querySelector('button.uix-inline-edit__view').textContent, 'Wert, Titel bearbeiten');
  click(host.querySelector('button.uix-inline-edit__view'));
  assert.deepEqual([...host.querySelectorAll('.uix-inline-edit__actions button')].map((b) => b.textContent), ['Speichern', 'Verwerfen']);
  assert.equal(host.querySelector('.uix-inline-edit__editor').getAttribute('aria-label'), 'Titel bearbeiten');
  act(() => root.unmount());
  host.remove();
});

test('under StrictMode a promise from onSave still settles', async () => {
  // StrictMode runs every effect cleanup once before the real mount; a "mounted" flag that is
  // only cleared in the cleanup would then drop the result and leave the field busy for ever.
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let reject;
  act(() => root.render(h(StrictMode, null,
    h(ui.InlineEdit, { label: 'Title', value: 'Payment API latency', onSave: () => new Promise((_, no) => { reject = no; }) }))));
  click(host.querySelector('button.uix-inline-edit__view'));
  const input = () => host.querySelector('.uix-inline-edit__editor input');
  type(input(), 'Checkout latency');
  key(input(), 'Enter');
  assert.equal(input().disabled, true, 'busy while the save runs');
  await act(async () => { reject(new Error('That title is taken.')); await Promise.resolve(); });
  await flush();
  assert.equal(input().disabled, false, 'the editor is usable again');
  assert.equal(host.querySelector('[role="alert"]').textContent, 'That title is taken.');
  assert.equal(input().value, 'Checkout latency', 'the draft is kept');
  act(() => root.unmount());
  host.remove();
});
