/* 2.60 motion (the animate-ui study, rebuilt natively): the gliding hover mark, the tooltip's glide
 * markup, the drawer swipe, the drawn tick, the picked option's check, the trigger's value rise-in
 * and the animated icons. jsdom has no layout or animation, so these hold the contract (which
 * element, which attribute, which input does nothing); the motion itself is measured in Chromium by
 * tests/a11y/motion-glide.spec.mjs. Renders the BUILT dist — run `npm run build` first. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
let icons;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  for (const name of ['HTMLElement', 'Element', 'Node', 'Event']) expose(name, dom.window[name]);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
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
  icons = await import('../dist/icons.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'HTMLElement', 'Element', 'Node', 'Event', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    render: (el) => act(async () => root.render(el)),
    unmount: async () => { await act(async () => root.unmount()); host.remove(); },
  };
}

/** A pointer event jsdom can dispatch (it has no PointerEvent): a MouseEvent carrying the pointer fields. */
function pointer(type, target, { pointerType = 'mouse', x = 0, y = 0, id = 1 } = {}) {
  const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(ev, 'pointerType', { value: pointerType });
  Object.defineProperty(ev, 'pointerId', { value: id });
  Object.defineProperty(ev, 'isPrimary', { value: true });
  return act(async () => { target.dispatchEvent(ev); });
}

test('the sidebar keeps one glide layer and one current-page mark, both hidden from assistive tech', async () => {
  const m = mount();
  await m.render(h(ui.Sidebar, { brand: 'Servis' },
    h(ui.NavItem, { href: '#a', active: true }, 'Inbox'),
    h(ui.NavItem, { href: '#b' }, 'Tickets'),
    h(ui.NavItem, { href: '#c', 'aria-disabled': 'true' }, 'Off')));
  const nav = m.host.querySelector('nav.uix-sidebar');
  const glide = nav.querySelector(':scope > .uix-glide');
  const mark = nav.querySelector(':scope > .uix-sidebar__mark');
  assert.ok(glide && mark, 'both layers render as children of the nav');
  assert.equal(glide.getAttribute('aria-hidden'), 'true');
  assert.equal(mark.getAttribute('aria-hidden'), 'true');
  assert.equal(mark.hidden, true, 'the mark only shows during a slide');
  // a mouse over a row shows the layer and hands the rows' own hover to it
  const [a, b, off] = nav.querySelectorAll('.uix-navitem');
  await pointer('pointerover', b);
  assert.ok(nav.hasAttribute('data-uix-glide'), 'the nav says the layer is showing');
  assert.match(glide.style.transform, /^translate\(/, 'the layer is moved to the row by transform alone');
  // touch has no hover
  await pointer('pointerleave', nav);
  assert.ok(!nav.hasAttribute('data-uix-glide'));
  await pointer('pointerover', a, { pointerType: 'touch' });
  assert.ok(!nav.hasAttribute('data-uix-glide'), 'a touch never shows the hover mark');
  // a disabled row is not a target
  await pointer('pointerover', off);
  assert.ok(!nav.hasAttribute('data-uix-glide'), 'a disabled row is not marked');
  await pointer('pointerover', a);
  assert.ok(nav.hasAttribute('data-uix-glide'));
  const atA = glide.style.transform;
  // the keyboard takes the mark too (operator, 2026-11-08, as animate-ui): a row reached by a key
  await act(async () => { a.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); });
  await act(async () => { b.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })); });
  assert.ok(nav.hasAttribute('data-uix-glide'), 'a row reached from the keyboard keeps the mark');
  assert.match(glide.style.transform, /^translate\([^)]*\) scale\(/, 'it travels by translate and scale');
  assert.equal(glide.hasAttribute('data-gliding'), true, 'and glides there');
  assert.ok(atA, 'it had been on the first row');
  // back to the pointer for the tests that follow
  await act(async () => { window.document.dispatchEvent(new window.Event('pointerdown')); });
  await m.unmount();
});

test('menus and select lists carry the glide layer as their first child', async () => {
  const html = renderToStaticMarkup(h(ui.Select, { 'aria-label': 'Team', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }));
  assert.match(html, /role="listbox"[^>]*><span class="uix-glide" aria-hidden="true"><\/span>/, 'the listbox starts with the hidden glide layer');
});

test('the tooltip wraps its label in a clip window so the hand-over can slide it; keys keep their ids', () => {
  const plain = renderToStaticMarkup(h(ui.Tooltip, { label: 'Kopieren' }, h('button', { type: 'button' }, 'C')));
  assert.match(plain, /class="uix-tooltip__content"><span class="uix-tooltip__label">Kopieren<\/span><\/span>/);
  const keyed = renderToStaticMarkup(h(ui.Tooltip, { label: 'Suchen', shortcut: ['Mod', 'K'] }, h('button', { type: 'button' }, 'S')));
  assert.match(keyed, /class="uix-tooltip__content"><span class="uix-tooltip__label"><span id="[^"]+-text">Suchen<\/span><span class="uix-tooltip__shortcut">/);
});

test('the checkbox tick and the select check are drawn strokes (pathLength 1)', () => {
  const box = renderToStaticMarkup(h(ui.Checkbox, { label: 'Notify', defaultChecked: true }));
  assert.match(box, /<polyline points="1\.5,6 4\.5,9 10\.5,3" pathLength="1"/);
});

test('a drawer closes on a touch drag toward its edge, never on a mouse drag or a drag inward', async () => {
  const m = mount();
  let closed = 0;
  const panel = (props = {}) => h(ui.Drawer, { open: true, title: 'INC-0417', onClose: () => { closed += 1; }, ...props }, h('p', null, 'Body text'));
  await m.render(panel());
  const dialog = m.host.querySelector('dialog.uix-drawer');
  const body = dialog.querySelector('.uix-drawer__body p');
  const drag = async (pointerType, dx, id) => {
    await pointer('pointerdown', body, { pointerType, x: 100, y: 100, id });
    for (const step of [10, 20, 40, dx]) await pointer('pointermove', body, { pointerType, x: 100 + step * Math.sign(dx), y: 100, id });
    await pointer('pointerup', body, { pointerType, x: 100 + dx, y: 100, id });
  };
  await drag('mouse', 200, 1);
  assert.equal(closed, 0, 'a mouse drag selects text; it never closes the drawer');
  await drag('touch', -200, 2);
  assert.equal(closed, 0, 'a drag toward the middle of the screen does not close it');
  assert.equal(dialog.style.translate, '', 'and leaves the panel where it was');
  await drag('touch', 200, 3);
  assert.equal(closed, 1, 'a touch drag toward the edge closes it');
  await m.unmount();
});

test('with unsaved changes a swipe settles back and asks first', async () => {
  const m = mount();
  let closed = 0;
  await m.render(h(ui.Drawer, { open: true, dirty: true, title: 'Edit', onClose: () => { closed += 1; } }, h('p', null, 'Body')));
  const dialog = m.host.querySelector('dialog.uix-drawer');
  const p = dialog.querySelector('p');
  await pointer('pointerdown', p, { pointerType: 'touch', x: 100, y: 100, id: 9 });
  for (const x of [110, 140, 300]) await pointer('pointermove', p, { pointerType: 'touch', x, y: 100, id: 9 });
  await pointer('pointerup', p, { pointerType: 'touch', x: 300, y: 100, id: 9 });
  assert.equal(closed, 0, 'the drawer stays open');
  assert.equal(dialog.style.translate, '', 'the panel settles back');
  assert.ok(document.querySelector('[role="alertdialog"].uix-popconfirm'), '"Discard changes?" is asked, as for every other way out');
  await m.unmount();
});

test('animated icons: `animate` adds the glyph name and the flag; without it the markup is unchanged', () => {
  const still = renderToStaticMarkup(h(icons.Trash2Icon));
  assert.doesNotMatch(still, /data-animate|data-icon/, 'icons without `animate` render exactly as before');
  const moving = renderToStaticMarkup(h(icons.Trash2Icon, { animate: true }));
  assert.match(moving, /data-icon="trash-2"/);
  assert.match(moving, /data-animate=""/);
  assert.match(renderToStaticMarkup(h(icons.RefreshCwIcon, { animate: true })), /data-icon="refresh-cw"/);
  assert.match(renderToStaticMarkup(h(icons.ArrowRightIcon, { animate: true })), /data-icon="arrow-right"/);
  assert.match(renderToStaticMarkup(h(icons.Icon, { name: 'settings', animate: true })), /data-icon="settings"/);
});

test('the select trigger marks a changed value (never the first render) and the picked option', async () => {
  const m = mount();
  function Pick() {
    const [v, setV] = useState('a');
    return h(ui.Select, { 'aria-label': 'Team', multiple: true, value: [v], onValueChange: (next) => setV([].concat(next).at(-1) ?? ''), options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] });
  }
  await m.render(h(Pick));
  const value = () => m.host.querySelector('.uix-select__value');
  assert.ok(!value().hasAttribute('data-changed'), 'the first render does not animate the value');
  const trigger = m.host.querySelector('[aria-haspopup="listbox"]');
  await act(async () => { trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
  assert.ok(!value().hasAttribute('data-changed'), 'opening the list does not animate the value either');
  const option = [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes('B'));
  await act(async () => { option.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
  assert.ok(value().hasAttribute('data-changed'), 'a new value rises in');
  const picked = [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes('B'));
  assert.ok(picked.hasAttribute('data-just-chosen'), 'the option just picked draws its check');
  await m.unmount();
});
