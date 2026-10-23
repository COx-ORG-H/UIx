/* Sidebar actions / search / footer, AccountMenu, and AppShell's nav hotkey, remembered tier and
 * phone nav tier (HAR-1371), in jsdom. Layout, the drawer and the menu in a real browser:
 * tests/a11y/staff-nav.spec.mjs. Renders the BUILT dist — run `npm run build` first. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('localStorage', window.localStorage);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
  const dialog = window.HTMLDialogElement.prototype;
  dialog.showModal = function showModal() { this.setAttribute('open', ''); };
  dialog.close = function close() { this.removeAttribute('open'); };
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
const key = (k, target = document.body) => act(() => { target.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });

test('Sidebar: head actions beside the brand, a search row with its shortcut, a foot', () => {
  const html = renderToStaticMarkup(h(ui.Sidebar, {
    brand: 'Biblioteka',
    actions: h('button', { type: 'button', 'aria-label': 'Mode' }),
    search: { label: 'Pretraga', shortcut: ['Mod', 'K'], onActivate() {} },
    footer: h('span', { id: 'me' }, 'me'),
  }, h(ui.NavItem, { href: '#a' }, 'A')));
  assert.match(html, /<div class="uix-sidebar__head"><div class="uix-sidebar__brand">Biblioteka<\/div><div class="uix-sidebar__actions"><button type="button" aria-label="Mode"><\/button><\/div><\/div>/);
  assert.match(html, /<button type="button" class="uix-sidebar__search" aria-keyshortcuts="Control\+K"><svg [^>]*class="uix-icon uix-sidebar__search-icon"/);
  assert.match(html, /<span class="uix-sidebar__search-label">Pretraga<\/span><span class="uix-kbd-combo uix-sidebar__search-keys" aria-hidden="true">/);
  assert.match(html, /<a class="uix-navitem" href="#a">.*<\/a><div class="uix-sidebar__foot"><span id="me">me<\/span><\/div><\/nav>$/);
  // without the new props the sidebar is what it was
  assert.equal(renderToStaticMarkup(h(ui.Sidebar, { brand: 'B' })), '<nav class="uix-sidebar"><div class="uix-sidebar__head"><div class="uix-sidebar__brand">B</div></div></nav>');
});

test('AccountMenu: the person names the trigger; initials are hidden from assistive tech', () => {
  assert.equal(ui.accountInitials('Ada Lovelace'), 'AL');
  assert.equal(ui.accountInitials('  Dževad   Hodžić '), 'DH');
  assert.equal(ui.accountInitials('Cher'), 'C');
  assert.equal(ui.accountInitials(''), '');
  const html = renderToStaticMarkup(h(ui.AccountMenu, { user: { name: 'Ada Lovelace', sub: 'ada@example.org', status: 'online' } }));
  assert.match(html, /<button type="button" class="uix-account-menu"[^>]*aria-haspopup="menu"/);
  assert.match(html, /<span class="uix-avatar uix-account-menu__avatar"><span aria-hidden="true">AL<\/span><span class="uix-avatar__status" aria-hidden="true"><\/span><span class="uix-visually-hidden">online<\/span><\/span>/);
  assert.match(html, /<span class="uix-account-menu__name">Ada Lovelace<\/span><span class="uix-account-menu__sub">ada@example.org<\/span>/);
  assert.match(renderToStaticMarkup(h(ui.AccountMenu, { user: { name: 'A', avatar: '/a.png' }, collapsed: true })), /class="uix-account-menu uix-account-menu--collapsed".*<img src="\/a.png" alt=""\/>/);
});

test('AppShell navHotkey switches full <-> rail, not while typing or with a modifier', () => {
  const changes = [];
  const shell = mount(h(ui.AppShell, { navHotkey: '[', onNavChange: (n) => changes.push(n), sidebar: h('nav', null, 'nav') }, h('input', { id: 'field' })));
  const root = shell.host.querySelector('.uix-shell');
  assert.equal(root.getAttribute('data-nav'), null);
  key('[');
  assert.equal(root.getAttribute('data-nav'), 'rail');
  key('[', shell.host.querySelector('#field'));
  assert.equal(root.getAttribute('data-nav'), 'rail', 'typing a [ in a field is not the hotkey');
  act(() => { document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: '[', ctrlKey: true, bubbles: true })); });
  assert.equal(root.getAttribute('data-nav'), 'rail', 'Ctrl+[ is not the hotkey');
  key('[');
  assert.equal(root.getAttribute('data-nav'), null);
  assert.deepEqual(changes, ['rail', 'full']);
  // a German or Bosnian "[" is AltGr+8 / AltGr+F, which Windows reports as Ctrl+Alt
  act(() => { document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: '[', ctrlKey: true, altKey: true, modifierAltGraph: true, bubbles: true })); });
  assert.equal(root.getAttribute('data-nav'), 'rail', 'AltGr+[ is the hotkey');
  shell.unmount();
});

test('AppShell navTierStorageKey restores the tier before paint and stores each change', () => {
  localStorage.setItem('t-nav', 'rail');
  const changes = [];
  const shell = mount(h(ui.AppShell, { navHotkey: '[', navTierStorageKey: 't-nav', onNavChange: (n) => changes.push(n), sidebar: h('nav', null, 'nav') }));
  const root = shell.host.querySelector('.uix-shell');
  assert.equal(root.getAttribute('data-nav'), 'rail');
  assert.equal(changes[0], 'rail', 'the remembered tier is reported, so a Sidebar can follow');
  key('[');
  assert.equal(localStorage.getItem('t-nav'), 'full');
  shell.unmount();
  localStorage.setItem('t-nav', 'nonsense');
  const again = mount(h(ui.AppShell, { navTierStorageKey: 't-nav', sidebar: h('nav', null, 'nav') }));
  assert.equal(again.host.querySelector('.uix-shell').getAttribute('data-nav'), null, 'an unknown stored value is ignored');
  again.unmount();
});

test('a controlled nav stays controlled: the hotkey only asks', () => {
  const changes = [];
  const shell = mount(h(ui.AppShell, { nav: 'full', navHotkey: '[', onNavChange: (n) => changes.push(n), sidebar: h('nav', null, 'nav') }));
  key('[');
  assert.equal(shell.host.querySelector('.uix-shell').getAttribute('data-nav'), null);
  assert.deepEqual(changes, ['rail']);
  shell.unmount();
});

test('phoneNav="drawer": a named menu button and a start drawer that mounts the sidebar only while open', () => {
  const shell = mount(h(ui.AppShell, { phoneNav: 'drawer', openNavLabel: 'Otvori navigaciju', navigationLabel: 'Navigacija', sidebar: h('nav', { id: 'side' }, h('a', { href: '#x' }, 'X')) }, 'content'));
  const root = shell.host.querySelector('.uix-shell');
  assert.equal(root.getAttribute('data-phone-nav'), 'drawer');
  const button = shell.host.querySelector('.uix-shell__phone-bar .uix-shell__nav-button');
  assert.equal(button.getAttribute('aria-label'), 'Otvori navigaciju');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(shell.host.querySelectorAll('#side').length, 1, 'closed: the sidebar is only in its column');
  act(() => button.click());
  const drawer = shell.host.querySelector('dialog.uix-drawer--start');
  assert.ok(drawer.hasAttribute('open'));
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(drawer.querySelector('h2').textContent, 'Navigacija');
  act(() => drawer.querySelector('a').click());
  assert.ok(!shell.host.querySelector('dialog').hasAttribute('open'), 'following a link closes the drawer');
  shell.unmount();
  // without phoneNav there is no button and no drawer
  const plain = renderToStaticMarkup(h(ui.AppShell, { sidebar: h('nav', null, 'n') }, 'c'));
  assert.doesNotMatch(plain, /uix-shell__nav-button|<dialog/);
});

// ── review of #165 ────────────────────────────────────────────────────────────
const press = (init, target = document.body) => act(() => { target.dispatchEvent(new window.KeyboardEvent('keydown', { key: '[', bubbles: true, cancelable: true, ...init })); });

test('the hotkey: the character decides — Option+[ on a Mac fires; Ctrl, ⌘, repeats, editables and modals do not', () => {
  const shell = mount(h(ui.AppShell, { navHotkey: '[', sidebar: h('nav', null, 'nav') }, h('div', { contentEditable: true, id: 'editor' }, 'x')));
  const root = shell.host.querySelector('.uix-shell');
  const tier = () => root.getAttribute('data-nav');
  press({ altKey: true }); // Mac German / Bosnian: [ is Option+5
  assert.equal(tier(), 'rail', 'Option+[ (altKey, no AltGraph) is the hotkey');
  press({ ctrlKey: true });
  press({ metaKey: true });
  press({ repeat: true });
  assert.equal(tier(), 'rail', 'Ctrl+[, ⌘+[ and a held key change nothing');
  const editor = shell.host.querySelector('#editor');
  Object.defineProperty(editor, 'isContentEditable', { value: true });
  press({}, editor);
  assert.equal(tier(), 'rail', 'typing [ in a contenteditable is text');
  const dialog = document.createElement('dialog');
  document.body.append(dialog);
  dialog.showModal();
  // jsdom's stubbed showModal opens without the top layer: report it as :modal, as a browser does
  const matches = dialog.matches.bind(dialog);
  dialog.matches = (selector) => selector === ':modal' || matches(selector);
  press({});
  assert.equal(tier(), 'rail', 'not under a modal dialog');
  dialog.close();
  dialog.remove();
  press({});
  assert.equal(tier(), null);
  shell.unmount();
});

test('layout="viewport" has the phone tier by default; phoneNav="none" keeps the sidebar column', () => {
  const viewport = renderToStaticMarkup(h(ui.AppShell, { layout: 'viewport', sidebar: h('nav', null, 'n') }, 'c'));
  assert.match(viewport, /data-phone-nav="drawer"/);
  assert.match(viewport, /uix-shell__nav-button/);
  const none = renderToStaticMarkup(h(ui.AppShell, { layout: 'viewport', phoneNav: 'none', sidebar: h('nav', null, 'n') }, 'c'));
  assert.doesNotMatch(none, /data-phone-nav|uix-shell__nav-button/);
  assert.doesNotMatch(renderToStaticMarkup(h(ui.AppShell, { sidebar: h('nav', null, 'n') }, 'c')), /data-phone-nav/, 'the frame keeps its column');
});

test('the phone drawer shows the sidebar full, even when the rail was chosen, and keeps it until the close ends', async () => {
  const sidebar = h(ui.Sidebar, { nav: 'rail', 'aria-label': 'Staff', footer: h(ui.AccountMenu, { collapsed: true, user: { name: 'Ada Lovelace' } }) }, h(ui.NavItem, { href: '#a' }, 'A'));
  const shell = mount(h(ui.AppShell, { phoneNav: 'drawer', sidebar }, 'content'));
  act(() => shell.host.querySelector('.uix-shell__nav-button').click());
  const drawer = shell.host.querySelector('dialog');
  const drawerNav = drawer.querySelector('.uix-sidebar');
  assert.equal(drawerNav.getAttribute('data-nav'), null);
  assert.equal(drawerNav.getAttribute('data-collapsed'), null);
  assert.doesNotMatch(drawer.querySelector('.uix-account-menu').className, /--collapsed/);
  // the grid column keeps the rail
  assert.equal(shell.host.querySelector('.uix-shell__sidebar .uix-sidebar').getAttribute('data-nav'), 'rail');
  act(() => drawer.querySelector('a').click());
  assert.ok(drawer.querySelector('.uix-sidebar'), 'still there while the drawer closes');
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  assert.equal(drawer.querySelector('.uix-sidebar'), null, 'gone once closed');
  shell.unmount();
});
