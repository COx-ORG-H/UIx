/* Keyboard shortcuts on Button, ButtonLink, Tooltip and Menu rows (HAR-2031, HAR-2416) in jsdom.
 *
 * - ariaKeyShortcuts: Mod is Meta on Apple and Control elsewhere; letters upper-cased; Del, Esc,
 *   Space and Option spelled as UI Events key values;
 * - one screen-reader rule for Button and Tooltip (HAR-2416): the keys are said once, as the
 *   control's description ("Control+Enter"), after its own aria-describedby; the kit sets no
 *   aria-keyshortcuts beside it (screen readers that announce that said the key twice); an
 *   aria-keyshortcuts the consumer passes stays;
 * - Button `shortcut`: the hint renders inside the button only as an empty marker (no wrapper, no
 *   sibling), the bubble portalled and aria-hidden, with the keys and an icon button's name; a
 *   click on the hint does not activate the button; no hint without `shortcut`;
 * - ButtonLink `shortcut`: the same hint and description on a link; none while disabled;
 * - Tooltip `shortcut`: the keys in the bubble after the text, which is the trigger's description;
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
  expose('MutationObserver', dom.window.MutationObserver);
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
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
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
  assert.equal(ui.ariaKeyShortcuts(['Shift', ' '], 'mac'), 'Shift+Space');
  assert.equal(ui.ariaKeyShortcuts(['Mod', '+'], 'other'), 'Control+Plus');
  assert.equal(ui.ariaKeyShortcuts(['Esc'], 'other'), 'Escape');
});

const hint = () => document.body.querySelector(':scope > .uix-tooltip__bubble--hint');
/** The text an element's aria-describedby points at, as a screen reader gets it. */
const description = (el) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
  .map((id) => document.getElementById(id)?.textContent ?? `#${id}?`).join(' ');

test('Button shortcut: the keys are its description, per platform; only an empty marker in the button, the bubble portalled', () => {
  platform = 'Win32';
  const win = mount(h(ui.Button, { shortcut: ['Mod', 'Enter'] }, 'Save'));
  const button = win.host.querySelector('button');
  assert.equal(win.host.children.length, 1, 'no wrapper and no sibling');
  assert.equal(button.textContent, 'Save', 'the button text is unchanged');
  assert.equal(description(button), 'Control+Enter', 'screen readers hear the keys as the description');
  assert.equal(button.hasAttribute('aria-keyshortcuts'), false, 'and not a second time from aria-keyshortcuts');
  const marker = button.lastElementChild;
  assert.equal(marker.hasAttribute('hidden'), true);
  assert.equal(marker.textContent, '');
  const bubble = hint();
  assert.ok(bubble, 'the bubble is portalled to <body>');
  assert.equal(bubble.getAttribute('aria-hidden'), 'true');
  assert.equal(bubble.getAttribute('popover'), 'manual');
  assert.deepEqual([...bubble.querySelectorAll('kbd')].map((k) => k.textContent), ['Ctrl', 'Enter']);
  win.unmount();
  assert.equal(hint(), null, 'and goes with the button');
  assert.equal(document.body.querySelector(':scope > span[hidden]'), null, 'its spoken text too');

  platform = 'MacIntel';
  const mac = mount(h(ui.Button, { icon: true, 'aria-label': 'Search', shortcut: ['Mod', 'K'] }, h('svg')));
  assert.equal(description(mac.host.querySelector('button')), 'Command+K', 'only the keys: the name is already "Search"');
  assert.match(hint().textContent, /^Search/, 'an icon button\'s name leads the hint');
  assert.ok(hint().textContent.includes('⌘'));
  mac.unmount();
  platform = 'Win32';
});

test('Button shortcut: hover shows the hint, Escape hides it; a click on it is not a click on the button', () => {
  let clicks = 0;
  const { host, unmount } = mount(h(ui.Button, { shortcut: ['A'], onClick: () => { clicks += 1; } }, 'Assign'));
  const button = host.querySelector('button');
  act(() => { button.dispatchEvent(new window.MouseEvent('mouseenter')); });
  assert.ok(hint().hasAttribute('data-open'));
  act(() => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.ok(!hint().hasAttribute('data-open'));
  act(() => { hint().dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
  assert.equal(clicks, 0, 'React does not carry the portal\'s click to the button');
  act(() => { button.click(); });
  assert.equal(clicks, 1);
  unmount();
});

test('Button shortcut: its own aria-describedby comes first and follows changes; removing the shortcut removes only ours', () => {
  const both = mount(h(ui.Button, { shortcut: ['Mod', 'S'], 'aria-keyshortcuts': 'Control+S Meta+S' }, 'Save'));
  assert.equal(both.host.querySelector('button').getAttribute('aria-keyshortcuts'), 'Control+S Meta+S', 'an aria-keyshortcuts of its own stays');
  both.unmount();
  const host = document.createElement('div');
  document.body.append(host);
  const note = document.createElement('p');
  note.id = 'assign-note';
  note.textContent = 'Assigns to you.';
  document.body.append(note);
  const root = createRoot(host);
  act(() => root.render(h(ui.Button, { shortcut: ['A'], 'aria-describedby': 'assign-note' }, 'Assign')));
  const button = host.querySelector('button');
  assert.equal(description(button), 'Assigns to you. A');
  act(() => root.render(h(ui.Button, { shortcut: ['A'] }, 'Assign')));
  assert.equal(description(button), 'A', 'its own description went, the keys stay');
  act(() => root.render(h(ui.Button, { shortcut: ['A'], 'aria-describedby': 'assign-note' }, 'Assign')));
  assert.equal(description(button), 'Assigns to you. A');
  act(() => root.render(h(ui.Button, { 'aria-describedby': 'assign-note' }, 'Assign')));
  assert.equal(button.getAttribute('aria-describedby'), 'assign-note', 'without the shortcut, only its own');
  act(() => root.render(h(ui.Button, null, 'Assign')));
  assert.equal(button.hasAttribute('aria-describedby'), false);
  act(() => root.unmount());
  host.remove();
  note.remove();
});

test('ButtonLink shortcut: the same hint and description as a Button; none while disabled (HAR-2416)', () => {
  let clicks = 0;
  const link = mount(h(ui.ButtonLink, { href: '#shortcuts', shortcut: ['Shift', '?'], onClick: (e) => { e.preventDefault(); clicks += 1; } }, 'Shortcuts'));
  const a = link.host.querySelector('a');
  assert.equal(a.textContent, 'Shortcuts', 'the link text is unchanged');
  assert.equal(a.getAttribute('href'), '#shortcuts');
  assert.equal(description(a), 'Shift+?');
  assert.equal(a.hasAttribute('aria-keyshortcuts'), false);
  act(() => { a.dispatchEvent(new window.MouseEvent('mouseenter')); });
  assert.ok(hint().hasAttribute('data-open'), 'hover shows the hint');
  assert.deepEqual([...hint().querySelectorAll('kbd')].map((k) => k.textContent), ['Shift', '?']);
  act(() => { hint().dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
  assert.equal(clicks, 0, 'a click on the hint does not follow the link');
  link.unmount();
  assert.equal(hint(), null);

  const icon = mount(h(ui.ButtonLink, { href: '/new', icon: true, 'aria-label': 'New incident', shortcut: ['N'] }, h('svg')));
  assert.match(hint().textContent, /^New incident/, 'an icon link\'s name leads the hint');
  icon.unmount();
  const off = mount(h(ui.ButtonLink, { href: '/new', disabled: true, shortcut: ['N'] }, 'New'));
  assert.equal(hint(), null, 'a disabled link shows no hint');
  assert.equal(off.host.querySelector('a').hasAttribute('aria-describedby'), false);
  off.unmount();
  assert.equal(renderToStaticMarkup(h(ui.ButtonLink, { href: '/new', shortcut: ['N'] }, 'New')),
    '<a href="/new" class="uix-btn uix-btn--secondary">New<span hidden="" data-uix-shortcut-hint=""></span></a>');
  const routed = mount(h(ui.ButtonLink, { href: '/new', shortcut: ['N'], renderLink: (p) => h('a', { ...p, 'data-router': '' }) }, 'New'));
  assert.equal(description(routed.host.querySelector('a[data-router]')), 'N', 'through the consumer\'s router link too');
  routed.unmount();
});

test('Button without shortcut renders exactly as before; with one the server renders only the marker', () => {
  assert.equal(renderToStaticMarkup(h(ui.Button, null, 'Save')), '<button class="uix-btn uix-btn--secondary">Save</button>');
  assert.equal(renderToStaticMarkup(h(ui.Button, { shortcut: [] }, 'Save')), '<button class="uix-btn uix-btn--secondary">Save</button>');
  assert.equal(renderToStaticMarkup(h(ui.Button, { shortcut: ['A'] }, 'Save')), '<button class="uix-btn uix-btn--secondary">Save<span hidden="" data-uix-shortcut-hint=""></span></button>');
});

test('Tooltip around a Button with a shortcut: one bubble, the Tooltip\'s, with the keys', () => {
  const { host, unmount } = mount(h(ui.Tooltip, { label: 'Watch this record' }, h(ui.Button, { icon: true, 'aria-label': 'Watch', shortcut: ['W'] }, h('svg'))));
  const button = host.querySelector('button');
  assert.equal(description(button), 'Watch this record W', 'described once, by the Tooltip');
  assert.equal(button.hasAttribute('aria-keyshortcuts'), false);
  assert.equal(hint(), null, 'the Button\'s own hint steps aside');
  assert.deepEqual([...host.querySelectorAll('[role="tooltip"] .uix-tooltip__shortcut kbd')].map((k) => k.textContent), ['W']);
  unmount();
});

test('Tooltip shortcut: the keys after the text, said once as the trigger\'s description', () => {
  const { host, unmount } = mount(h(ui.Tooltip, { label: 'Keyboard shortcuts', shortcut: ['Shift', '?'] }, h('a', { href: '#k' }, 'Shortcuts')));
  const link = host.querySelector('a');
  const bubble = host.querySelector('[role="tooltip"]');
  assert.equal(link.hasAttribute('aria-keyshortcuts'), false, 'not a second time from aria-keyshortcuts');
  assert.equal(description(link), 'Keyboard shortcuts Shift+?', 'the text, then the spoken keys, never the glyphs');
  assert.ok(link.getAttribute('aria-describedby').split(' ').every((part) => bubble.contains(document.getElementById(part))));
  assert.ok(bubble.textContent.startsWith('Keyboard shortcuts'));
  assert.deepEqual([...bubble.querySelectorAll('.uix-tooltip__shortcut kbd')].map((k) => k.textContent), ['Shift', '?']);
  unmount();
  const plain = mount(h(ui.Tooltip, { label: 'Plain' }, h('button', null, 'x')));
  assert.equal(plain.host.querySelector('button').getAttribute('aria-describedby'), plain.host.querySelector('[role="tooltip"]').id, 'without keys, the bubble as before');
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
