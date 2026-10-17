/* A dirty Drawer or Modal asks before it closes (HAR-2029) — the guard's rules in jsdom.
 *
 * - clean: Escape is left to the browser (not cancelled), the × and Cancel close at once;
 * - dirty: Escape is cancelled and opens the step, as do the ×, a backdrop click and a
 *   DialogClose; Keep editing closes the step and returns focus, Discard calls onClose once;
 * - pending: none of them does anything, and the × is aria-disabled;
 * - a guarded dialog the browser closed by force opens again and asks;
 * - the words come from UixLabelsProvider `discardPrompt`, an explicit prop wins;
 * - a dialog that is never dirty renders no step at all.
 *
 * jsdom has no top layer, no close watcher and no layout; tests/a11y/discard-prompt.spec.mjs
 * runs the same rules in Chromium. Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const OPEN = 'data-test-popover-open';
let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLElement', dom.window.HTMLElement);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const dialog = dom.window.HTMLDialogElement.prototype;
  dialog.showModal = function showModal() { this.setAttribute('open', ''); dialog.showModalCalls = (dialog.showModalCalls ?? 0) + 1; };
  dialog.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new dom.window.Event('close'));
  };
  const el = dom.window.HTMLElement.prototype;
  el.showPopover = function showPopover() { this.setAttribute(OPEN, ''); };
  el.hidePopover = function hidePopover() { this.removeAttribute(OPEN); };
  const matches = dom.window.Element.prototype.matches;
  dom.window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? this.hasAttribute(OPEN) : matches.call(this, selector);
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const PANEL = { left: 604, right: 1024, top: 0, bottom: 768, width: 420, height: 768, x: 604, y: 0 };

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  const dialog = host.querySelector('dialog');
  dialog.getBoundingClientRect = () => ({ ...PANEL, toJSON() {} });
  return {
    host, dialog,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
};

const counter = () => {
  const fn = () => { fn.calls += 1; };
  fn.calls = 0;
  return fn;
};
const escape = (target) => {
  const event = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(event); });
  return event;
};
const click = (target, init = {}) => act(() => { target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })); });
const step = (host) => host.querySelector('[data-uix-discard-prompt]');
const asking = (host) => !!step(host)?.hasAttribute(OPEN);
const buttonNamed = (host, name) => [...host.querySelectorAll('button')].find((b) => b.textContent === name || b.getAttribute('aria-label') === name);

for (const [name, Component, closeName] of [['Drawer', () => ui.Drawer, 'Close drawer'], ['Modal', () => ui.Modal, 'Close dialog']]) {
  const form = (props) => h(Component(), { open: true, title: 'Edit template', footer: h(ui.DialogClose, null, 'Cancel'), ...props }, h('input', { id: `${name}-field` }));

  test(`${name}: clean — Escape is left to the browser, the × and Cancel close at once, no step is rendered`, () => {
    const onClose = counter();
    const { host, dialog, unmount } = mount(form({ onClose }));
    assert.equal(step(host), null, 'a dialog that is not dirty carries no step');
    assert.equal(escape(dialog).defaultPrevented, false);
    click(buttonNamed(host, closeName));
    click(buttonNamed(host, 'Cancel'));
    assert.equal(onClose.calls, 2);
    unmount();
  });

  test(`${name}: dirty — Escape is cancelled and asks; Keep editing returns focus; Discard closes once`, () => {
    const onClose = counter();
    const { host, dialog, unmount } = mount(form({ onClose, dirty: true }));
    const field = host.querySelector('input');
    field.focus();
    assert.equal(escape(field).defaultPrevented, true, 'the keydown is cancelled, so the browser keeps the dialog open');
    assert.equal(asking(host), true);
    assert.equal(step(host).getAttribute('role'), 'alertdialog');
    assert.equal(document.activeElement, buttonNamed(host, 'Keep editing'));
    assert.equal(onClose.calls, 0);

    click(buttonNamed(host, 'Keep editing'));
    assert.equal(asking(host), false);
    assert.equal(document.activeElement, field);

    click(buttonNamed(host, closeName));
    assert.equal(asking(host), true, 'the × asks too');
    click(buttonNamed(host, 'Discard'));
    assert.equal(asking(host), false);
    assert.equal(onClose.calls, 1);
    assert.equal(dialog.hasAttribute('open'), true, 'closing is the consumer\'s move (open → false)');
    unmount();
  });

  test(`${name}: dirty — Escape inside the step keeps editing; a press elsewhere only dismisses it`, () => {
    const onClose = counter();
    const { host, unmount } = mount(form({ onClose, dirty: true }));
    click(buttonNamed(host, 'Cancel'));
    assert.equal(asking(host), true, 'DialogClose asks');
    assert.equal(escape(buttonNamed(host, 'Keep editing')).defaultPrevented, true);
    assert.equal(asking(host), false);
    assert.equal(document.activeElement, buttonNamed(host, 'Cancel'), 'focus is back on the Cancel that asked');

    click(buttonNamed(host, closeName));
    assert.equal(asking(host), true);
    click(buttonNamed(host, closeName)); // a second click on the × while it asks
    assert.equal(asking(host), false, 'the press dismissed the step');
    assert.equal(onClose.calls, 0, 'and did not also close or ask again');
    unmount();
  });

  test(`${name}: pending — Escape, the × and Cancel do nothing; the × is aria-disabled`, () => {
    const onClose = counter();
    const { host, dialog, unmount } = mount(form({ onClose, dirty: true, pending: true }));
    const close = buttonNamed(host, closeName);
    assert.equal(close.getAttribute('aria-disabled'), 'true');
    assert.equal(buttonNamed(host, 'Cancel').getAttribute('aria-disabled'), 'true');
    assert.equal(escape(dialog).defaultPrevented, true, 'Escape is still kept from the browser');
    click(close);
    click(buttonNamed(host, 'Cancel'));
    assert.equal(asking(host), false);
    assert.equal(onClose.calls, 0);
    unmount();
  });

  test(`${name}: a guarded dialog the browser closed by force opens again and asks`, () => {
    const onClose = counter();
    const { host, dialog, unmount } = mount(form({ onClose, dirty: true }));
    const before = window.HTMLDialogElement.prototype.showModalCalls;
    act(() => { dialog.close(); });
    assert.equal(dialog.hasAttribute('open'), true);
    assert.equal(window.HTMLDialogElement.prototype.showModalCalls, before + 1);
    assert.equal(asking(host), true);
    assert.equal(onClose.calls, 0);
    unmount();
  });

  test(`${name}: a cancel event (a close request that was no keydown) is cancelled while dirty`, () => {
    const onClose = counter();
    const { host, dialog, unmount } = mount(form({ onClose, dirty: true }));
    const cancel = new window.Event('cancel', { cancelable: true });
    act(() => { dialog.dispatchEvent(cancel); });
    assert.equal(cancel.defaultPrevented, true);
    assert.equal(asking(host), true);
    unmount();
  });
}

test('Drawer: dirty — a backdrop click asks; dismissOnBackdrop={false} still ignores it', () => {
  const onClose = counter();
  const drawer = mount(h(ui.Drawer, { open: true, onClose, dirty: true, title: 'Edit' }, h('input')));
  click(drawer.dialog, { clientX: 200, clientY: 300 });
  assert.equal(asking(drawer.host), true);
  assert.equal(onClose.calls, 0);
  drawer.unmount();

  const fixed = mount(h(ui.Drawer, { open: true, onClose, dirty: true, dismissOnBackdrop: false, title: 'Edit' }, h('input')));
  click(fixed.dialog, { clientX: 200, clientY: 300 });
  assert.equal(asking(fixed.host), false);
  fixed.unmount();
});

test('the step closes when the input stops being dirty or a save starts', () => {
  const props = { open: true, onClose: () => {}, title: 'Edit' };
  const { host, dialog, rerender, unmount } = mount(h(ui.Drawer, { ...props, dirty: true }, h('input')));
  escape(dialog);
  assert.equal(asking(host), true);
  rerender(h(ui.Drawer, { ...props, dirty: true, pending: true }, h('input')));
  assert.equal(asking(host), false);
  unmount();
});

test('words: UixLabelsProvider discardPrompt, an explicit discardLabels wins', () => {
  const tree = h(ui.UixLabelsProvider, { labels: { discardPrompt: { title: 'Änderungen verwerfen?', description: 'Ihre Eingaben gehen verloren.', keepEditing: 'Weiter bearbeiten', discard: 'Verwerfen' } } },
    h(ui.Modal, { open: true, onClose: () => {}, dirty: true, title: 'Vorlage', discardLabels: { discard: 'Nicht speichern' } }, h('input')));
  const { host, dialog, unmount } = mount(tree);
  escape(dialog);
  const text = step(host).textContent;
  for (const word of ['Änderungen verwerfen?', 'Ihre Eingaben gehen verloren.', 'Weiter bearbeiten', 'Nicht speichern']) assert.ok(text.includes(word), word);
  assert.ok(!text.includes('Verwerfen'), 'the explicit prop wins over the provider');
  assert.ok(!/Discard|Keep editing/.test(text));
  unmount();
});
