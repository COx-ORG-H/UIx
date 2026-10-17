/* Keyboard shortcuts on Button, Tooltip and Menu rows (HAR-2031) in jsdom.
 *
 * - ariaKeyShortcuts: Mod is Meta on Apple and Control elsewhere; letters upper-cased; Del, Esc,
 *   Space and Option spelled as UI Events key values;
 * - Button `shortcut`: aria-keyshortcuts on the button for the platform; the hint renders inside
 *   the button (no wrapper, no sibling), aria-hidden, with the keys and an icon button's name; a
 *   click on the hint does not activate the button; no hint without `shortcut`;
 * - Tooltip `shortcut`: the keys in the bubble after the text; aria-keyshortcuts on the trigger;
 * - Menu rows: key names render KbdCombo and set aria-keyshortcuts; a node renders as given.
 *
 * tests/a11y/shortcut.spec.mjs runs the hover, focus and geometry in Chromium. Renders the BUILT
 * dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
let platform = 'Win32';

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  // The platform is read after mount (KbdCombo, ShortcutHint); a test switches it between mounts.
  expose('navigator', { userAgent: dom.window.navigator.userAgent, language: 'en-US', get platform() { return platform; } });
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const el = dom.window.HTMLElement.prototype;
  el.showPopover = function showPopover() { this.setAttribute('data-open', ''); };
  el.hidePopover = function hidePopover() { this.removeAttribute('data-open'); };
  const matches = dom.window.Element.prototype.matches;
  dom.window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? this.hasAttribute('data-open') : matches.call(this, selector);
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};

test('ariaKeyShortcuts spells keys as aria-keyshortcuts wants them, per platform', () => {
  assert.equal(ui.ariaKeyShortcuts(['Mod', 'K'], 'other'), 'Control+K');
  assert.equal(ui.ariaKeyShortcuts(['Mod', 'K'], 'mac'), 'Meta+K');
  assert.equal(ui.ariaKeyShortcuts(['a'], 'other'), 'A');
  assert.equal(ui.ariaKeyShortcuts(['Shift', '?'], 'other'), 'Shift+?');
  assert.equal(ui.ariaKeyShortcuts(['Ctrl', 'Alt', 'Del'], 'mac'), 'Control+Alt+Delete');
  assert.equal(ui.ariaKeyShortcuts(['Option', ' '], 'mac'), 'Alt+Space');
  assert.equal(ui.ariaKeyShortcuts(['Esc'], 'other'), 'Escape');
});

test('Button shortcut: aria-keyshortcuts per platform, the hint inside the button, aria-hidden', () => {
  platform = 'Win32';
  const win = mount(h(ui.Button, { shortcut: ['Mod', 'Enter'] }, 'Save'));
  const button = win.host.querySelector('button');
  assert.equal(win.host.children.length, 1, 'no wrapper and no sibling');
  assert.equal(button.getAttribute('aria-keyshortcuts'), 'Control+Enter');
  const hint = button.lastElementChild;
  assert.ok(hint.classList.contains('uix-tooltip__bubble'));
  assert.equal(hint.getAttribute('aria-hidden'), 'true');
  assert.equal(hint.getAttribute('popover'), 'manual');
  assert.deepEqual([...hint.querySelectorAll('kbd')].map((k) => k.textContent), ['Ctrl', 'Enter']);
  win.unmount();

  platform = 'MacIntel';
  const mac = mount(h(ui.Button, { icon: true, 'aria-label': 'Search', shortcut: ['Mod', 'K'] }, h('svg')));
  const macButton = mac.host.querySelector('button');
  assert.equal(macButton.getAttribute('aria-keyshortcuts'), 'Meta+K');
  assert.match(macButton.lastElementChild.textContent, /^Search/, 'an icon button\'s name leads the hint');
  assert.ok(macButton.lastElementChild.textContent.includes('⌘'));
  mac.unmount();
  platform = 'Win32';
});

test('Button shortcut: hover and focus show the hint, Escape hides it; a click on it is not a click on the button', () => {
  let clicks = 0;
  const { host, unmount } = mount(h(ui.Button, { shortcut: ['A'], onClick: () => { clicks += 1; } }, 'Assign'));
  const button = host.querySelector('button');
  const hint = button.querySelector('.uix-tooltip__bubble');
  act(() => { button.dispatchEvent(new window.MouseEvent('mouseenter')); });
  assert.ok(hint.hasAttribute('data-open'));
  act(() => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.ok(!hint.hasAttribute('data-open'));
  act(() => { button.dispatchEvent(new window.FocusEvent('focus')); });
  assert.ok(hint.hasAttribute('data-open'));
  act(() => { hint.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
  assert.equal(clicks, 0);
  act(() => { button.click(); });
  assert.equal(clicks, 1);
  unmount();
});

test('Button without shortcut renders exactly as before (server markup has no hint)', () => {
  assert.equal(renderToStaticMarkup(h(ui.Button, null, 'Save')), '<button class="uix-btn uix-btn--secondary">Save</button>');
  assert.equal(renderToStaticMarkup(h(ui.Button, { shortcut: [] }, 'Save')), '<button class="uix-btn uix-btn--secondary">Save</button>');
});

test('Tooltip shortcut: the keys after the text, aria-keyshortcuts on the trigger', () => {
  const { host, unmount } = mount(h(ui.Tooltip, { label: 'Keyboard shortcuts', shortcut: ['Shift', '?'] }, h('a', { href: '#k' }, 'Shortcuts')));
  const link = host.querySelector('a');
  const bubble = host.querySelector('[role="tooltip"]');
  assert.equal(link.getAttribute('aria-keyshortcuts'), 'Shift+?');
  assert.equal(link.getAttribute('aria-describedby'), bubble.id);
  assert.ok(bubble.textContent.startsWith('Keyboard shortcuts'));
  assert.deepEqual([...bubble.querySelectorAll('.uix-tooltip__shortcut kbd')].map((k) => k.textContent), ['Shift', '?']);
  unmount();
  const plain = mount(h(ui.Tooltip, { label: 'Plain' }, h('button', null, 'x')));
  assert.equal(plain.host.querySelector('button').hasAttribute('aria-keyshortcuts'), false);
  assert.equal(plain.host.querySelector('.uix-tooltip__shortcut'), null);
  plain.unmount();
});

test('Menu rows: key names render KbdCombo with aria-keyshortcuts; a node renders as given', () => {
  const { host, unmount } = mount(h('div', { role: 'menu' },
    h(ui.MenuItem, { shortcut: ['Mod', 'D'] }, 'Duplicate'),
    h(ui.MenuItem, { shortcut: ['A'], href: '#assign' }, 'Assign'),
    h(ui.MenuItemCheckbox, { checked: false, shortcut: ['Shift', 'W'] }, 'Watch'),
    h(ui.MenuItem, { shortcut: h('kbd', { className: 'uix-kbd' }, 'Del') }, 'Delete')));
  const rows = [...host.querySelectorAll('[role^="menuitem"]')];
  assert.deepEqual(rows.map((r) => r.getAttribute('aria-keyshortcuts')), ['Control+D', 'A', 'Shift+W', null]);
  assert.ok(rows[0].querySelector('.uix-menu__shortcut .uix-kbd-combo'));
  assert.equal(rows[3].querySelector('.uix-menu__shortcut').innerHTML, '<kbd class="uix-kbd">Del</kbd>');
  unmount();
});
