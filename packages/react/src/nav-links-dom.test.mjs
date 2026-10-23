/* Links rendered by the app's router (HAR-1385 Breadcrumbs `renderLink`) and the Segmented link
 * mode for language switchers (HAR-1380 `selection="link"`, `LocaleSwitcher`), in jsdom.
 * Tab order and the look of the current link are checked in Chromium:
 * tests/a11y/nav-links.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
/** A stand-in for next/link: marks its anchor so the test can tell it from a plain <a>. */
const RouterLink = (props) => h('a', { ...props, 'data-router': '' });

test('Breadcrumbs renders every link through renderLink; the current page stays text', () => {
  const calls = [];
  const html = renderToStaticMarkup(h(ui.Breadcrumbs, {
    label: 'Brotkrümel',
    items: [{ label: 'Katalog', href: '/de/katalog' }, { label: 'Autorinnen', href: '/de/autor' }, { label: 'Meša Selimović' }],
    renderLink: (props) => { calls.push(props); return h(RouterLink, props); },
  }));
  assert.deepEqual(calls.map((p) => [p.href, p.children]), [['/de/katalog', 'Katalog'], ['/de/autor', 'Autorinnen']]);
  assert.equal((html.match(/data-router=""/g) ?? []).length, 2);
  assert.match(html, /<span aria-current="page">Meša Selimović<\/span>/);
  // Without an adapter: plain anchors, as before.
  const plain = renderToStaticMarkup(h(ui.Breadcrumbs, { label: 'Breadcrumb', items: [{ label: 'Home', href: '/' }, { label: 'Record' }] }));
  assert.match(plain, /<li><a href="\/">Home<\/a><\/li>/);
});

test('Segmented selection="link" is a named nav of links; the current one has aria-current="page"', () => {
  const changes = [];
  const { host, unmount } = mount(h(ui.Segmented, { selection: 'link', value: 'bs', 'aria-label': 'Jezik', onChange: (v) => changes.push(v) },
    h(ui.SegmentedOption, { value: 'bs', href: '/bs/program', hrefLang: 'bs', lang: 'bs' }, 'Bosanski'),
    h(ui.SegmentedOption, { value: 'de', href: '/de/program', hrefLang: 'de', lang: 'de' }, 'Deutsch'),
    h(ui.SegmentedOption, { value: 'en', href: '/en/program', hrefLang: 'en', lang: 'en', type: 'button', disabled: true }, 'English')));
  const nav = host.firstElementChild;
  assert.equal(nav.tagName, 'NAV');
  assert.equal(nav.getAttribute('aria-label'), 'Jezik');
  assert.equal(nav.getAttribute('role'), null, 'not a group or radiogroup');
  const list = nav.querySelector(':scope > ul.uix-segmented');
  assert.ok(list);
  const links = [...list.querySelectorAll(':scope > li > a.uix-segmented__option')];
  assert.deepEqual(links.map((a) => [a.getAttribute('href'), a.getAttribute('hreflang'), a.lang, a.getAttribute('aria-current')]), [
    ['/bs/program', 'bs', 'bs', 'page'], ['/de/program', 'de', 'de', null], [null, 'en', 'en', null],
  ]);
  assert.equal(links[2].getAttribute('aria-disabled'), 'true', 'a disabled option is a link that goes nowhere (PR #168 review)');
  assert.equal(host.querySelector('button'), null, 'links, not buttons');
  assert.equal(links[2].hasAttribute('type') || links[2].hasAttribute('disabled'), false, 'button-only attributes are dropped');
  assert.equal(links.some((a) => a.hasAttribute('aria-pressed') || a.hasAttribute('aria-checked') || a.hasAttribute('tabindex')), false, 'no toggle state and no roving tab stop: each link is a tab stop');
  act(() => links[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
  assert.deepEqual(changes, ['de'], 'onChange still reports the choice, for a client router');
  unmount();
});

test('Segmented link mode: arrow keys do not move or select, and renderLink renders the router\'s link', () => {
  function Switcher() {
    const [value] = useState('de');
    return h(ui.Segmented, { selection: 'link', value, 'aria-label': 'Sprache', renderLink: (p) => h(RouterLink, p) },
      h(ui.SegmentedOption, { value: 'de', href: '/de' }, 'DE'),
      h(ui.SegmentedOption, { value: 'en', href: '/en' }, 'EN'));
  }
  const { host, unmount } = mount(h(Switcher));
  const links = [...host.querySelectorAll('a')];
  assert.equal(links.every((a) => a.hasAttribute('data-router')), true);
  links[0].focus();
  let notPrevented;
  act(() => { notPrevented = links[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); });
  assert.equal(notPrevented, true, 'the key is left alone');
  assert.equal(document.activeElement, links[0]);
  unmount();
});

test('LocaleSwitcher: lang and hreflang on each link, the current locale marked', () => {
  const html = renderToStaticMarkup(h(ui.LocaleSwitcher, {
    label: 'Sprache', current: 'de',
    locales: [{ code: 'bs', label: 'BS', href: '/bs' }, { code: 'de', label: 'DE', href: '/de' }, { code: 'en', label: 'EN', href: '/en' }],
  }));
  assert.match(html, /^<nav class="uix-segmented-nav" aria-label="Sprache"><ul class="uix-segmented" role="list">/);
  assert.match(html, /<a lang="de" href="\/de" hrefLang="de" class="uix-segmented__option" aria-current="page">DE<\/a>/);
  assert.equal((html.match(/aria-current/g) ?? []).length, 1);
});

test('the other selection modes are unchanged', () => {
  const html = renderToStaticMarkup(h(ui.Segmented, { value: 'a', 'aria-label': 'View' }, h(ui.SegmentedOption, { value: 'a', href: '/ignored' }, 'A')));
  // the sliding indicator (HAR-2589) is the one addition: last, hidden and decorative
  assert.match(html, /^<div role="group" class="uix-segmented" aria-label="View"><button type="button" class="uix-segmented__option" aria-pressed="true" tabindex="0">A<\/button><span class="uix-segmented__indicator" aria-hidden="true" hidden=""><\/span><\/div>$/);
});

test('review: Segmented link mode — a disabled option or one without href has no href (never "#") and reports nothing', () => {
  const changes = [];
  const html = renderToStaticMarkup(h(ui.Segmented, { selection: 'link', value: 'a', 'aria-label': 'Nav' },
    h(ui.SegmentedOption, { value: 'a', href: '/a' }, 'A'),
    h(ui.SegmentedOption, { value: 'b' }, 'B')));
  assert.doesNotMatch(html, /href="#"/);
  assert.match(html, /<a class="uix-segmented__option" aria-disabled="true">B<\/a>/);
  const { host, unmount } = mount(h(ui.Segmented, { selection: 'link', value: 'a', 'aria-label': 'Nav', onChange: (v) => changes.push(v) },
    h(ui.SegmentedOption, { value: 'a', href: '/a' }, 'A'),
    h(ui.SegmentedOption, { value: 'b', href: '/b', disabled: true }, 'B')));
  const off = [...host.querySelectorAll('a')].find((a) => a.textContent === 'B');
  assert.equal(off.hasAttribute('href'), false);
  act(() => off.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
  assert.deepEqual(changes, [], 'a disabled option does not choose');
  unmount();
});
