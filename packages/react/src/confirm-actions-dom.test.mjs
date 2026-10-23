/* What TENSOR's ConfirmAction needs from the kit's confirmations (HAR-1831), in jsdom:
 *   Popconfirm
 *   1. a body slot (`children`) and `confirmDisabled`: a required reason field gets focus;
 *   2. `role` (alertdialog when destructive) and, without a title, a name from its confirm button;
 *   3. Escape that is its own: not while a popup inside it is open, not one meant for a dialog
 *      opened above it, only the newest open step; `onEscapeKeyDown` can keep it open;
 *   4. `closeWhenAnchorHidden` reaches the Popover (the browser half is in confirm-actions.spec);
 *   ConfirmDialog
 *   5. `pending` blocks Escape (the close request), the × and Cancel; the ref reaches the dialog;
 *   6. `confirmProps` on the confirm button, a node `typeToConfirmLabel`, a placeholder, and
 *      aria-invalid once the typed text stops matching;
 *   undo toast
 *   7. `pauseOnHover: false` is a fixed timer; `toast.undo(id)` undoes from code.
 * Focus return after a caller unmounts an open ConfirmDialog needs a real browser:
 * tests/a11y/confirm-actions.spec.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useRef, useState } from 'react';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const dialog = window.HTMLDialogElement.prototype;
  dialog.showModal = function showModal() { this.setAttribute('open', ''); };
  dialog.close = function close() { this.removeAttribute('open'); };
  const el = window.HTMLElement.prototype;
  el.showPopover = function showPopover() { this.setAttribute('data-test-popover-open', ''); };
  el.hidePopover = function hidePopover() { this.removeAttribute('data-test-popover-open'); };
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? this.hasAttribute('data-test-popover-open') : matches.call(this, selector);
  };
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
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
/** A keydown on `el`; returns the event, to read defaultPrevented. */
const key = (el, k) => {
  const event = new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
};
const typeInto = (field, value) => act(() => {
  const proto = field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value);
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
});

/** A Popconfirm on a button, open; `cancels` counts onCancel. */
function mountPopconfirm(props = {}, extra = null) {
  const cancels = [];
  const confirms = [];
  function Step() {
    const anchor = useRef(null);
    const [open, setOpen] = useState(true);
    return h('div', null,
      h('button', { type: 'button', ref: anchor, id: 'delete' }, 'Delete'),
      h(ui.Popconfirm, {
        open, anchor, title: 'Delete this note?', confirmLabel: 'Delete', cancelLabel: 'Keep',
        onConfirm: () => confirms.push('confirm'), onCancel: () => { cancels.push('cancel'); setOpen(false); }, ...props,
      }),
      extra);
  }
  const view = mount(h(Step));
  return { ...view, cancels, confirms, panel: () => view.host.querySelector('.uix-popconfirm') };
}

test('Popconfirm: a body with a required reason, confirmDisabled, and focus on the field', () => {
  function Reason() {
    const anchor = useRef(null);
    const [reason, setReason] = useState('');
    return h('div', null,
      h('button', { type: 'button', ref: anchor }, 'Reject'),
      h(ui.Popconfirm, {
        open: true, anchor, title: 'Reject this change?', confirmLabel: 'Reject', cancelLabel: 'Cancel', destructive: true,
        onConfirm() {}, onCancel() {}, confirmDisabled: reason.trim() === '',
      }, h(ui.Field, { label: 'Reason', htmlFor: 'reason' }, h(ui.Textarea, { id: 'reason', value: reason, onChange: (e) => setReason(e.currentTarget.value) }))));
  }
  const view = mount(h(Reason));
  const panel = view.host.querySelector('.uix-popconfirm');
  assert.ok(panel.classList.contains('uix-popconfirm--content'), 'a step with content takes its full width');
  const field = panel.querySelector('.uix-popconfirm__content textarea');
  assert.ok(field, 'the body renders between the text and the buttons');
  assert.equal(document.activeElement, field, 'the field has focus when the step opens');
  const confirm = [...panel.querySelectorAll('button')].find((b) => b.textContent === 'Reject');
  assert.equal(confirm.disabled, true, 'Confirm waits for the reason');
  typeInto(field, 'Breaks the release');
  assert.equal(confirm.disabled, false);
  assert.ok(!panel.querySelector('.uix-popconfirm__body')?.contains(field), 'the field is not part of the description');
  view.unmount();
});

test('Popconfirm: role alertdialog when destructive; without a title it is named by its confirm button', () => {
  const plain = mountPopconfirm();
  assert.equal(plain.panel().getAttribute('role'), 'dialog');
  assert.equal(document.getElementById(plain.panel().getAttribute('aria-labelledby')).textContent, 'Delete this note?');
  assert.equal(document.activeElement.textContent, 'Keep', 'focus on Cancel without a field');
  plain.unmount();
  const destructive = mountPopconfirm({ destructive: true, title: undefined, confirmProps: { 'data-action-id': 'note.delete' } });
  const panel = destructive.panel();
  assert.equal(panel.getAttribute('role'), 'alertdialog');
  const name = document.getElementById(panel.getAttribute('aria-labelledby'));
  assert.equal(name.tagName, 'BUTTON');
  assert.equal(name.textContent, 'Delete', 'named by its confirm button');
  assert.equal(name.dataset.actionId, 'note.delete', 'confirmProps reach the confirm button');
  assert.equal(panel.querySelector('.uix-popconfirm__title'), null);
  destructive.unmount();
  const forced = mountPopconfirm({ role: 'dialog', destructive: true, labelledBy: 'confirm' });
  assert.equal(forced.panel().getAttribute('role'), 'dialog');
  assert.equal(document.getElementById(forced.panel().getAttribute('aria-labelledby')).tagName, 'BUTTON');
  forced.unmount();
});

test('Popconfirm: Escape cancels, unless a popup inside it is open; onEscapeKeyDown can keep it open', () => {
  const view = mountPopconfirm({}, null);
  const event = key(document.activeElement, 'Escape');
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(view.cancels, ['cancel']);
  view.unmount();

  // A Select's list inside the step is open: its Escape (it cancels the event), not the step's.
  function WithSelect() {
    const anchor = useRef(null);
    return h('div', null,
      h('button', { type: 'button', ref: anchor }, 'Move'),
      h(ui.Popconfirm, { open: true, anchor, title: 'Move?', confirmLabel: 'Move', cancelLabel: 'Keep', onConfirm() {}, onCancel: () => cancels.push('cancel') },
        h('button', {
          type: 'button', 'aria-expanded': 'true', 'aria-haspopup': 'listbox', id: 'team',
          onKeyDown: (e) => { if (e.key === 'Escape') e.preventDefault(); },
        }, 'Team')));
  }
  const cancels = [];
  const select = mount(h(WithSelect));
  key(select.host.querySelector('#team'), 'Escape');
  key(document.body, 'Escape');
  assert.deepEqual(cancels, [], 'an open popup inside the step takes Escape first');
  select.unmount();

  // An IME user cancelling a conversion keeps the step and the typed reason.
  const ime = mountPopconfirm();
  act(() => { document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true, cancelable: true })); });
  act(() => { document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true, cancelable: true })); });
  assert.deepEqual(ime.cancels, [], 'an Escape that ends a composition is not the step\'s');
  key(document.activeElement, 'Escape');
  assert.deepEqual(ime.cancels, ['cancel']);
  ime.unmount();

  const kept = mountPopconfirm({ onEscapeKeyDown: (e) => e.preventDefault() });
  key(document.activeElement, 'Escape');
  assert.deepEqual(kept.cancels, [], 'onEscapeKeyDown prevented it');
  assert.ok(kept.panel().hasAttribute('data-test-popover-open'));
  kept.unmount();
});

test('Popconfirm in a dirty Modal: Escape on an expanded disclosure inside the step cancels the step only', () => {
  // The step's Escape ran on a native listener on the panel, before the React handlers inside it,
  // and stepped aside for any [aria-expanded="true"] without cancelling: the Escape went on to the
  // dialog, which asked "Discard changes?" (or closed, when clean).
  const log = [];
  function Form() {
    const anchor = useRef(null);
    const [step, setStep] = useState(true);
    return h(ui.Modal, { open: true, dirty: true, onClose: () => log.push('close'), title: 'Edit' },
      h('button', { type: 'button', ref: anchor }, 'Archive'),
      h(ui.Popconfirm, { open: step, anchor, title: 'Archive?', confirmLabel: 'Archive', cancelLabel: 'Keep', onConfirm() {}, onCancel: () => { log.push('cancel'); setStep(false); } },
        h('button', { type: 'button', 'aria-expanded': 'true', 'aria-controls': 'more', id: 'details' }, 'Details'),
        h('div', { id: 'more' }, 'Two linked changes')));
  }
  const view = mount(h(Form));
  const event = key(view.host.querySelector('#details'), 'Escape');
  assert.deepEqual(log, ['cancel'], 'the step cancelled, the dialog heard nothing');
  assert.equal(event.defaultPrevented, true, 'and the browser does not close the dialog either');
  assert.equal(view.host.querySelector('[data-uix-discard-prompt][data-test-popover-open]'), null, 'no "Discard changes?" step');
  view.unmount();
});

test('Popconfirm: only the newest open step answers Escape; a dialog opened above it closes first', () => {
  const log = [];
  function Two() {
    const a = useRef(null);
    const b = useRef(null);
    const [first, setFirst] = useState(true);
    const [second, setSecond] = useState(true);
    return h('div', null,
      h('button', { type: 'button', ref: a }, 'A'), h('button', { type: 'button', ref: b }, 'B'),
      h(ui.Popconfirm, { open: first, anchor: a, title: 'First?', confirmLabel: 'Yes', cancelLabel: 'No', onConfirm() {}, onCancel: () => { log.push('first'); setFirst(false); } }),
      h(ui.Popconfirm, { open: second, anchor: b, title: 'Second?', confirmLabel: 'Yes', cancelLabel: 'No', onConfirm() {}, onCancel: () => { log.push('second'); setSecond(false); } }));
  }
  const view = mount(h(Two));
  key(document.body, 'Escape');
  assert.deepEqual(log, ['second'], 'the newest step');
  key(document.body, 'Escape');
  assert.deepEqual(log, ['second', 'first'], 'then the one below it');
  view.unmount();

  // A modal dialog opened above the step: an Escape inside it is the dialog's.
  const above = mountPopconfirm({}, h('dialog', { open: true, id: 'above' }, h('button', { type: 'button', id: 'inside' }, 'OK')));
  key(above.host.querySelector('#inside'), 'Escape');
  assert.deepEqual(above.cancels, []);
  above.unmount();
});

test('Popconfirm: a press outside cancels; inside the step or on its anchor it does not', () => {
  const view = mountPopconfirm();
  act(() => view.panel().dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })));
  act(() => view.host.querySelector('#delete').dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })));
  assert.deepEqual(view.cancels, []);
  act(() => document.body.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })));
  assert.deepEqual(view.cancels, ['cancel']);
  view.unmount();
});

const confirmProps = {
  open: true, title: 'Delete CI srv-ledger-01?', confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true,
  onConfirm() {}, onCancel() {},
};

test('ConfirmDialog pending: the close request, the × and Cancel do nothing; the ref reaches the dialog', () => {
  const log = [];
  const ref = { current: null };
  const props = { ...confirmProps, onCancel: () => log.push('cancel'), onConfirm: () => log.push('confirm'), pending: true };
  const view = mount(h(ui.ConfirmDialog, { ...props, ref }));
  const dialog = view.host.querySelector('dialog');
  assert.equal(ref.current, dialog, 'the ref is the <dialog>');
  const close = dialog.querySelector('.uix-dialog__close');
  assert.equal(close.getAttribute('aria-disabled'), 'true', 'the × says it is unavailable');
  click(close);
  const request = new window.Event('cancel', { cancelable: true });
  act(() => { dialog.dispatchEvent(request); });
  assert.equal(request.defaultPrevented, true, 'the close request (Escape, back gesture) is refused');
  assert.equal(key(dialog, 'Escape').defaultPrevented, true);
  const cancel = [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Cancel');
  assert.equal(cancel.disabled, true);
  const confirm = [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Delete');
  assert.equal(confirm.getAttribute('aria-busy'), 'true', 'Confirm shows its loading state');
  click(confirm);
  assert.deepEqual(log, [], 'nothing cancelled, nothing confirmed twice');
  // Settled: the × cancels again.
  view.rerender(h(ui.ConfirmDialog, { ...props, pending: false, ref }));
  click(close);
  assert.deepEqual(log, ['cancel']);
  view.unmount();
  assert.equal(ref.current, null);
});

test('ConfirmDialog: confirmProps on the confirm button; a node label; placeholder; aria-invalid once the text stops matching', () => {
  const log = [];
  const view = mount(h(ui.ConfirmDialog, {
    ...confirmProps,
    onConfirm: () => log.push('confirm'),
    typeToConfirm: 'srv-ledger-01',
    typeToConfirmLabel: h('span', null, 'Type ', h('code', null, 'srv-ledger-01'), ' to delete it'),
    typeToConfirmPlaceholder: 'srv-ledger-01',
    confirmProps: { 'data-action-id': 'ci.delete', className: 'tracked', onClick: (e) => log.push(`click:${e.currentTarget.dataset.actionId}`) },
  }));
  const dialog = view.host.querySelector('dialog');
  const field = dialog.querySelector('input');
  const phoneSafe = (el) => el.getAttribute('autocapitalize') === 'none' && el.getAttribute('autocorrect') === 'off' && el.getAttribute('spellcheck') === 'false';
  assert.equal(dialog.querySelector(`label[for="${field.id}"] code`).textContent, 'srv-ledger-01', 'a node label renders as given');
  assert.equal(field.placeholder, 'srv-ledger-01');
  const confirm = dialog.querySelector('[data-action-id="ci.delete"]');
  assert.ok(confirm, 'confirmProps reach the confirm button');
  assert.ok(confirm.classList.contains('tracked') && confirm.classList.contains('uix-btn--danger'), 'its class joins the kit\'s');
  assert.equal(confirm.disabled, true);
  typeInto(field, 'srv-led');
  assert.equal(field.hasAttribute('aria-invalid'), false, 'a correct start is not an error');
  assert.equal(dialog.querySelector('.uix-confirm__typed-msg [role="alert"]') === null, true, 'no message yet');
  typeInto(field, 'srv-lex');
  assert.equal(field.getAttribute('aria-invalid'), 'true', 'a wrong character is');
  const message = document.getElementById(field.getAttribute('aria-describedby'));
  assert.equal(message.textContent, 'That does not match srv-ledger-01.', 'and it says why');
  assert.equal(message.getAttribute('role'), 'alert');
  assert.ok(phoneSafe(field), 'a phone keyboard neither capitalises nor corrects it');
  typeInto(field, 'srv-ledger-01');
  assert.equal(field.hasAttribute('aria-invalid'), false);
  click(confirm);
  assert.deepEqual(log, ['click:ci.delete', 'confirm']);
  view.unmount();

  // The consumer's onClick can stop the confirm.
  const stopped = [];
  const v2 = mount(h(ui.ConfirmDialog, { ...confirmProps, destructive: false, onConfirm: () => stopped.push('confirm'), confirmProps: { onClick: (e) => e.preventDefault() } }));
  click([...v2.host.querySelectorAll('button')].find((b) => b.textContent === 'Delete'));
  assert.deepEqual(stopped, []);
  v2.unmount();
});

// ── undo toast ───────────────────────────────────────────────────────────────

const useFakeTimers = () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const real = { set: dom.window.setTimeout, clear: dom.window.clearTimeout };
  dom.window.setTimeout = (fn, ms) => setTimeout(fn, ms);
  dom.window.clearTimeout = (id) => clearTimeout(id);
  return () => { dom.window.setTimeout = real.set; dom.window.clearTimeout = real.clear; mock.timers.reset(); };
};
const tick = (ms) => act(() => { mock.timers.tick(ms); });

test('undo toast: pauseOnHover false commits exactly `duration` after it appears, hovered or not', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const log = [];
    const view = mount(h(ui.Toaster, { store: t.store }));
    act(() => { t.undoable('Ticket closed', { duration: 5000, pauseOnHover: false, onUndo: () => log.push('undo'), onCommit: () => log.push('commit') }); });
    act(() => { t.undoable('Note pinned', { duration: 5000, onUndo() {}, onCommit: () => log.push('paused-commit') }); });
    const region = view.host.querySelector('.uix-toaster');
    act(() => region.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
    tick(4999);
    assert.deepEqual(log, []);
    tick(1);
    assert.deepEqual(log, ['commit'], 'the fixed timer ran out under the pointer; the other waits');
    act(() => region.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
    tick(5000);
    assert.deepEqual(log, ['commit', 'paused-commit']);
    view.unmount();
  } finally { restore(); }
});

test('undo toast: toast.undo(id) undoes from code, once; dismiss still commits', () => {
  const t = ui.createToastApi(ui.createToastStore());
  const log = [];
  const id = t.undoable('Ticket closed', { onUndo: () => log.push('undo'), onCommit: () => log.push('commit') });
  assert.equal(t.undo(id), true);
  assert.equal(t.undo(id), false, 'already undone');
  assert.ok(t.store.getSnapshot().find((r) => r.id === id).leaving, 'the toast closes');
  const other = t.undoable('Ticket closed', { onUndo: () => log.push('undo-2'), onCommit: () => log.push('commit-2') });
  t.dismiss(other);
  assert.equal(t.undo(other), false, 'committed: nothing to undo');
  assert.equal(t.undo('nope'), false);
  assert.deepEqual(log, ['undo', 'commit-2']);
  assert.equal(typeof ui.toast.undo, 'function', 'the default toast() has it too');
});
