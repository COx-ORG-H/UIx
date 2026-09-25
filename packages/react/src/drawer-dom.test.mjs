/* Drawer and Peek close on a backdrop click (TENSOR HAR-547) in jsdom.
 *
 * A native modal <dialog> closes on Escape and its close button, never on a ::backdrop click.
 * Both components share one handler (hooks/backdropDismiss.ts): a click whose target is the
 * <dialog> itself, with coordinates outside its box, is a backdrop click.
 * - outside click → onClose once; child click or inside-the-box click → nothing;
 * - Drawer `dismissOnBackdrop={false}` → the outside click does nothing, Escape still closes;
 * - a consumer onClick still runs; a zero-size rect (mid-close) never closes.
 *
 * jsdom has no layout, so each dialog's rect is stubbed to a right-hand 420 px panel.
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
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
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window)); // useDialog's scroll lock
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
  // jsdom may lack the modal API; the behaviour under test is the click handler, not top layer.
  if (typeof proto.showModal !== 'function') proto.showModal = function () { this.setAttribute('open', ''); };
  if (typeof proto.close !== 'function') {
    proto.close = function () {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.dispatchEvent(new dom.window.Event('close'));
    };
  }
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const PANEL = { left: 604, right: 1024, top: 0, bottom: 768, width: 420, height: 768, x: 604, y: 0 };

const mount = (element, rect = PANEL) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  const dialog = host.querySelector('dialog');
  dialog.getBoundingClientRect = () => ({ ...rect, toJSON() {} });
  return { host, dialog, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const clickAt = (el, clientX, clientY) =>
  act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0, clientX, clientY })));

const counter = () => {
  const fn = () => { fn.calls += 1; };
  fn.calls = 0;
  return fn;
};

for (const [name, Component] of [['Drawer', () => ui.Drawer], ['Peek', () => ui.Peek]]) {
  test(`${name}: a click on the backdrop (outside the panel) calls onClose once`, () => {
    const onClose = counter();
    const { dialog, unmount } = mount(h(Component(), { open: true, onClose, title: 'Details' }, h('p', null, 'Body')));
    clickAt(dialog, 200, 300);
    assert.equal(onClose.calls, 1);
    unmount();
  });

  test(`${name}: clicks inside the panel keep it open`, () => {
    const onClose = counter();
    const { dialog, host, unmount } = mount(h(Component(), { open: true, onClose, title: 'Details' }, h('p', null, 'Body')));
    clickAt(host.querySelector('p'), 200, 300); // a child: target is not the dialog, whatever the coordinates
    clickAt(dialog, 800, 300); // the dialog's own box (padding/gaps), inside the rect
    assert.equal(onClose.calls, 0);
    unmount();
  });

  test(`${name}: a zero-size rect (mid-close) never closes; no onClose is a no-op`, () => {
    const onClose = counter();
    const zero = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
    const closing = mount(h(Component(), { open: true, onClose, title: 'Details' }), zero);
    clickAt(closing.dialog, 200, 300);
    assert.equal(onClose.calls, 0);
    closing.unmount();

    const bare = mount(h(Component(), { open: true, title: 'Details' }));
    assert.doesNotThrow(() => clickAt(bare.dialog, 200, 300));
    bare.unmount();
  });

  test(`${name}: a consumer onClick still runs, before the dismissal`, () => {
    const order = [];
    const { dialog, unmount } = mount(
      h(Component(), { open: true, title: 'Details', onClick: () => order.push('consumer'), onClose: () => order.push('close') }),
    );
    clickAt(dialog, 200, 300);
    assert.deepEqual(order, ['consumer', 'close']);
    unmount();
  });
}

test('Drawer dismissOnBackdrop={false}: the backdrop click does nothing; Escape and the close button still close', () => {
  const onClose = counter();
  const { dialog, unmount } = mount(h(ui.Drawer, { open: true, onClose, dismissOnBackdrop: false, title: 'Edit user' }));
  clickAt(dialog, 200, 300);
  assert.equal(onClose.calls, 0);

  // Escape: the browser fires cancel → close on the dialog; useDialog forwards `close` to onClose.
  act(() => dialog.dispatchEvent(new window.Event('close')));
  assert.equal(onClose.calls, 1);

  clickAt(dialog.querySelector('button[aria-label="Close drawer"]'), 900, 20);
  assert.equal(onClose.calls, 2);
  unmount();
});
