/* Menu additions for TENSOR's preset, view-mode and add-filter pickers (HAR-1629), in jsdom:
 * MenuItemRadio / MenuItemCheckbox / MenuRadioGroup, `id` and `data-*` on every item kind,
 * and Escape / Tab on the trigger when the menu has no item to focus.
 *
 * The open-on-click, arrow, typeahead and focus-return behaviour of plain items is in
 * batch-a-dom.test.mjs (HAR-1359); placement and the height cap in a real browser are
 * tests/a11y/overlay-shift.spec.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

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
  // Native Popover API (not in jsdom).
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
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
/** Dispatch a keydown; returns false when a handler called preventDefault. */
const key = (el, k) => {
  let notPrevented = true;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
  return notPrevented;
};
const frame = () => act(() => new Promise((resolve) => setTimeout(resolve, 30)));
const menuOf = (trigger) => document.getElementById(trigger.getAttribute('aria-controls'));
const texts = (els) => [...els].map((el) => el.textContent);

test('MenuRadioGroup + MenuItemRadio: menuitemradio rows, aria-checked follows the value, the menu opens on the current choice', async () => {
  const changes = [];
  function PresetPicker() {
    const [preset, setPreset] = useState('team');
    return h(ui.Menu, { trigger: h(ui.Button, null, 'Preset') },
      h(ui.MenuItem, { onSelect() {} }, 'Manage presets'),
      h(ui.MenuSeparator),
      h(ui.MenuRadioGroup, { label: 'Dashboard preset', value: preset, onValueChange: (v) => { changes.push(v); setPreset(v); } },
        h(ui.MenuItemRadio, { value: 'mine' }, 'My queue'),
        h(ui.MenuItemRadio, { value: 'team' }, 'Team'),
        h(ui.MenuItemRadio, { value: 'all', disabled: true }, 'Everything')));
  }
  const { host, unmount } = mount(h(PresetPicker));
  const trigger = host.querySelector('button.uix-btn');
  click(trigger);
  await frame();
  const menu = menuOf(trigger);
  const radios = menu.querySelectorAll('[role="menuitemradio"]');
  assert.deepEqual(texts(radios), ['My queue', 'Team', 'Everything']);
  assert.deepEqual([...radios].map((r) => r.getAttribute('aria-checked')), ['false', 'true', 'false']);
  assert.equal(radios[2].getAttribute('aria-disabled'), 'true');
  const group = radios[0].parentElement;
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(document.getElementById(group.getAttribute('aria-labelledby')).textContent, 'Dashboard preset');
  assert.equal(document.activeElement, radios[1], 'focus starts on the checked radio item');
  assert.ok(radios[1].querySelector('.uix-menu__check svg'), 'the checked row shows a check mark');
  assert.equal(radios[0].querySelector('.uix-menu__check svg'), null, 'an unchecked row keeps the empty check column');
  assert.equal(radios[0].querySelector('.uix-menu__check').getAttribute('aria-hidden'), 'true');

  // arrows walk plain and radio items alike, skipping the disabled one
  key(document.activeElement, 'ArrowDown');
  assert.equal(document.activeElement.textContent, 'Manage presets', 'wraps past the disabled last item');
  key(document.activeElement, 'ArrowDown');
  assert.equal(document.activeElement.textContent, 'My queue');

  // a click (Enter on a button is a click) chooses and closes
  click(document.activeElement);
  await frame();
  assert.deepEqual(changes, ['mine']);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, trigger, 'focus returns to the trigger');

  // Space chooses and leaves the menu open (APG)
  click(trigger);
  await frame();
  assert.equal(document.activeElement.textContent, 'My queue', 'reopens on the new choice');
  key(document.activeElement, 'ArrowDown');
  assert.equal(key(document.activeElement, ' '), false, 'Space is handled');
  await frame();
  assert.deepEqual(changes, ['mine', 'team']);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'still open after Space');
  assert.deepEqual([...menuOf(trigger).querySelectorAll('[role="menuitemradio"]')].map((r) => r.getAttribute('aria-checked')), ['false', 'true', 'false']);

  // a disabled radio does nothing
  click(menuOf(trigger).querySelectorAll('[role="menuitemradio"]')[2]);
  assert.deepEqual(changes, ['mine', 'team']);
  unmount();
});

test('MenuItemRadio closeOnSelect={false} and a group named by aria-label', async () => {
  const picked = [];
  const { host, unmount } = mount(h(ui.Menu, { trigger: h(ui.Button, null, 'View') },
    h(ui.MenuRadioGroup, { 'aria-label': 'View mode', value: 'list', onValueChange: (v) => picked.push(v) },
      h(ui.MenuItemRadio, { value: 'list', closeOnSelect: false }, 'List'),
      h(ui.MenuItemRadio, { value: 'board', closeOnSelect: false, onSelect: () => picked.push('selected') }, 'Board'))));
  const trigger = host.querySelector('button.uix-btn');
  click(trigger);
  await frame();
  const group = menuOf(trigger).querySelector('[role="group"]');
  assert.equal(group.getAttribute('aria-label'), 'View mode');
  assert.equal(group.hasAttribute('aria-labelledby'), false);
  assert.equal(group.querySelector('.uix-menu__label'), null, 'no heading without a label');
  click(menuOf(trigger).querySelectorAll('[role="menuitemradio"]')[1]);
  await frame();
  assert.deepEqual(picked, ['board', 'selected'], 'the group changes first, then the item');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'stays open');
  unmount();
});

test('MenuItemCheckbox: menuitemcheckbox + aria-checked, toggles without closing, closeOnSelect closes', async () => {
  function Columns() {
    const [shown, setShown] = useState({ state: true, owner: false });
    return h(ui.Menu, { trigger: h(ui.Button, null, 'Columns'), label: 'Columns' },
      h(ui.MenuItemCheckbox, { checked: shown.state, onCheckedChange: (v) => setShown((s) => ({ ...s, state: v })) }, 'State'),
      h(ui.MenuItemCheckbox, { checked: shown.owner, onCheckedChange: (v) => setShown((s) => ({ ...s, owner: v })), closeOnSelect: true }, 'Owner'));
  }
  const { host, unmount } = mount(h(Columns));
  const trigger = host.querySelector('button.uix-btn');
  click(trigger);
  await frame();
  const boxes = () => [...menuOf(trigger).querySelectorAll('[role="menuitemcheckbox"]')];
  assert.equal(menuOf(trigger).getAttribute('aria-label'), 'Columns');
  assert.deepEqual(boxes().map((b) => b.getAttribute('aria-checked')), ['true', 'false']);
  assert.equal(document.activeElement, boxes()[0], 'no radio is checked: focus starts on the first item');

  click(boxes()[0]);
  await frame();
  assert.deepEqual(boxes().map((b) => b.getAttribute('aria-checked')), ['false', 'false']);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'a checkbox leaves the menu open');
  assert.equal(boxes()[0].querySelector('.uix-menu__check svg'), null);

  key(boxes()[0], ' ');
  await frame();
  assert.deepEqual(boxes().map((b) => b.getAttribute('aria-checked')), ['true', 'false']);
  assert.ok(boxes()[0].querySelector('.uix-menu__check svg'));

  click(boxes()[1]);
  await frame();
  assert.equal(trigger.getAttribute('aria-expanded'), 'false', 'closeOnSelect closes');
  assert.equal(document.activeElement, trigger);
  unmount();
});

test('every item kind forwards id and data-* to its own element, and nothing else', async () => {
  const seen = [];
  const { host, unmount } = mount(h(ui.Menu, { trigger: h(ui.Button, null, 'Actions') },
    h(ui.MenuItem, { id: 'act-assign', 'data-action-id': 'incident.assign', 'data-order': 1, onSelect() {}, title: 'not forwarded' }, 'Assign'),
    h(ui.MenuItem, { id: 'act-open', 'data-action-id': 'incident.open', href: '/incidents/7' }, 'Open'),
    h(ui.MenuItem, { 'data-action-id': 'incident.docs', href: '/docs', renderLink: (p) => { seen.push(p); return h('a', { ...p, 'data-router': '' }); } }, 'Docs'),
    h(ui.MenuItemRadio, { id: 'act-radio', 'data-action-id': 'view.list', value: 'list', checked: true }, 'List'),
    h(ui.MenuItemCheckbox, { id: 'act-box', 'data-action-id': 'col.state', checked: false }, 'State')));
  const trigger = host.querySelector('button.uix-btn');
  click(trigger);
  await frame();
  const menu = menuOf(trigger);
  const assign = menu.querySelector('#act-assign');
  assert.equal(assign.tagName, 'BUTTON');
  assert.equal(assign.getAttribute('role'), 'menuitem');
  assert.equal(assign.dataset.actionId, 'incident.assign');
  assert.equal(assign.dataset.order, '1');
  assert.equal(assign.hasAttribute('title'), false, 'only id and data-* are forwarded');
  const open = menu.querySelector('#act-open');
  assert.equal(open.tagName, 'A');
  assert.equal(open.dataset.actionId, 'incident.open');
  assert.equal(seen[0]['data-action-id'], 'incident.docs', 'renderLink receives the attributes');
  assert.equal(menu.querySelector('[data-router]').dataset.actionId, 'incident.docs');
  assert.equal(menu.querySelector('#act-radio').dataset.actionId, 'view.list');
  assert.equal(menu.querySelector('#act-radio').getAttribute('aria-checked'), 'true', 'a radio item outside a group takes checked');
  assert.equal(menu.querySelector('#act-box').dataset.actionId, 'col.state');
  assert.equal(menu.querySelector('[data-action-id="incident.assign"]'), assign, 'the hook is on the item, not on a wrapper');
  unmount();
});

test('with every item disabled focus stays on the trigger, and Escape there closes the menu', async () => {
  const outer = [];
  const { host, unmount } = mount(h('div', { onKeyDown: (e) => outer.push(e.key) },
    h(ui.Menu, { trigger: h(ui.Button, null, 'Bulk actions') },
      h(ui.MenuItem, { disabled: true }, 'Assign'),
      h(ui.MenuItem, { disabled: true }, 'Close'))));
  const trigger = host.querySelector('button.uix-btn');
  trigger.focus();
  click(trigger);
  await frame();
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement, trigger, 'nothing in the menu can take focus');
  assert.equal(key(trigger, 'Escape'), false, 'Escape is handled');
  await frame();
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(menuOf(trigger), null, 'aria-controls is gone with the menu');
  assert.equal(document.activeElement, trigger);
  assert.deepEqual(outer, [], 'the Escape that closed the menu does not also close what is around it');

  // closed: Escape is not ours, it goes on to a surrounding dialog or drawer
  assert.equal(key(trigger, 'Escape'), true);
  assert.deepEqual(outer, ['Escape']);

  // Tab from the trigger closes an open menu too, and does not trap focus
  click(trigger);
  await frame();
  assert.equal(key(trigger, 'Tab'), true, 'Tab keeps its default action');
  await frame();
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  unmount();
});

test('an empty menu closes with Escape on the trigger as well', async () => {
  const { host, unmount } = mount(h(ui.Menu, { trigger: h(ui.Button, null, 'Empty') }));
  const trigger = host.querySelector('button.uix-btn');
  trigger.focus();
  key(trigger, 'ArrowDown');
  await frame();
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  key(trigger, 'Escape');
  await frame();
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  unmount();
});
