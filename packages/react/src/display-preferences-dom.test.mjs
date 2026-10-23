/* The display-preference contract (HAR-1372) in jsdom: the model (parse, resolve, apply), the
 * pre-paint script agreeing with the model for every stored value and system state, and the
 * hook + components (a click applies, stores, and another instance in the tab follows; controlled
 * components write nothing). Paint and CSS: tests/a11y/display-preferences.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'matchMedia', 'StorageEvent', 'CustomEvent', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const system = { dark: false, moreContrast: false };
const fakeMatchMedia = (query) => ({
  matches: (query.includes('dark') && system.dark) || (query.includes('contrast') && system.moreContrast),
  media: query, addEventListener() {}, removeEventListener() {},
});

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  window.matchMedia = fakeMatchMedia;
  for (const [name, value] of [['window', window], ['document', window.document], ['navigator', window.navigator], ['getComputedStyle', window.getComputedStyle.bind(window)],
    ['requestAnimationFrame', window.requestAnimationFrame.bind(window)], ['cancelAnimationFrame', window.cancelAnimationFrame.bind(window)], ['localStorage', window.localStorage],
    ['matchMedia', fakeMatchMedia], ['StorageEvent', window.StorageEvent], ['CustomEvent', window.CustomEvent], ['MutationObserver', window.MutationObserver], ['IS_REACT_ACT_ENVIRONMENT', true]]) expose(name, value);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const attrs = (root) => Object.fromEntries(['data-theme', 'data-contrast', 'data-text-scale', 'data-motion', 'data-density'].map((n) => [n, root.getAttribute(n)]));

test('parse: unknown, missing or broken values fall back to the defaults', () => {
  const { parseDisplayPreferences: parse, DEFAULT_DISPLAY_PREFERENCES: D } = ui;
  assert.deepEqual(parse(null), D);
  assert.deepEqual(parse('{not json'), D);
  assert.deepEqual(parse('"dark"'), D);
  assert.deepEqual(parse(JSON.stringify({ theme: 'dark', contrast: 'loud', textScale: 'xl', motion: 'reduce', density: 'tiny' })), { ...D, theme: 'dark', textScale: 'xl', motion: 'reduce' });
  assert.deepEqual(parse(null, { ...D, density: 'compact' }).density, 'compact');
});

test('resolve: system choices follow the system; md, standard and system motion write nothing', () => {
  const r = ui.resolveDisplayAttributes;
  assert.deepEqual(r(ui.DEFAULT_DISPLAY_PREFERENCES, { dark: true, moreContrast: true }), { 'data-theme': 'dark', 'data-contrast': 'more', 'data-text-scale': undefined, 'data-motion': undefined, 'data-density': undefined });
  assert.deepEqual(r({ theme: 'light', contrast: 'standard', textScale: 'sm', motion: 'reduce', density: 'comfortable' }, { dark: true, moreContrast: true }),
    { 'data-theme': 'light', 'data-contrast': undefined, 'data-text-scale': 'sm', 'data-motion': 'reduce', 'data-density': 'comfortable' });
});

test('the pre-paint script writes exactly what the model writes, for every stored value and system state', () => {
  const { DISPLAY_PREFERENCE_OPTIONS: O, displayPreferencesScript, parseDisplayPreferences, resolveDisplayAttributes, applyDisplayAttributes } = ui;
  const stores = [null, '{bad', '{}', JSON.stringify({ theme: 'nope', density: 'compact' })];
  for (const theme of O.theme) for (const contrast of O.contrast) stores.push(JSON.stringify({ theme, contrast, textScale: 'lg', motion: 'reduce', density: 'standard' }));
  for (const textScale of O.textScale) for (const density of O.density) stores.push(JSON.stringify({ textScale, density, motion: 'system' }));
  let cases = 0;
  for (const raw of stores) {
    for (const sys of [{ dark: false, moreContrast: false }, { dark: true, moreContrast: true }]) {
      const page = new JSDOM('<!doctype html><html data-text-scale="xl"><head></head></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
      page.window.matchMedia = (q) => ({ matches: (q.includes('dark') && sys.dark) || (q.includes('contrast') && sys.moreContrast) });
      if (raw != null) page.window.localStorage.setItem('k', raw);
      page.window.eval(displayPreferencesScript('k'));
      const expected = new JSDOM('<!doctype html><html data-text-scale="xl"></html>').window.document.documentElement;
      applyDisplayAttributes(expected, resolveDisplayAttributes(parseDisplayPreferences(raw), sys));
      assert.deepEqual(attrs(page.window.document.documentElement), attrs(expected), `${raw} ${JSON.stringify(sys)}`);
      cases += 1;
    }
  }
  assert.ok(cases > 30);
  // it never throws, even without storage or matchMedia
  const bare = new JSDOM('<!doctype html><html></html>', { runScripts: 'outside-only' });
  bare.window.eval(displayPreferencesScript());
  assert.equal(bare.window.document.documentElement.getAttribute('data-theme'), 'light');
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
/** The radio named `name` in the radio group named `group` (by aria-label or aria-labelledby). */
const radio = (host, group, name) => {
  const groupName = (g) => g.getAttribute('aria-label') ?? document.getElementById(g.getAttribute('aria-labelledby'))?.textContent;
  const found = [...host.querySelectorAll('[role="radiogroup"]')].find((g) => groupName(g) === group);
  return [...found.querySelectorAll('[role="radio"]')].find((r) => (r.getAttribute('aria-label') ?? r.textContent) === name);
};

test('uncontrolled: a choice applies to <html>, is stored, and the ThemeSwitcher in the tab follows', () => {
  localStorage.clear();
  const html = document.documentElement;
  const panel = mount(h(ui.DisplayPreferences, { storageKey: 'p' }));
  const switcher = mount(h(ui.ThemeSwitcher, { storageKey: 'p' }));
  assert.equal(html.getAttribute('data-theme'), 'light', 'system resolved: not dark');
  act(() => radio(panel.host, 'Theme', 'Dark').click());
  assert.equal(html.getAttribute('data-theme'), 'dark');
  assert.equal(JSON.parse(localStorage.getItem('p')).theme, 'dark');
  assert.equal(radio(switcher.host, 'Theme', 'Dark').getAttribute('aria-checked'), 'true');
  act(() => radio(panel.host, 'Text size', 'Larger').click());
  act(() => radio(panel.host, 'Contrast', 'More').click());
  act(() => radio(panel.host, 'Motion', 'Reduce').click());
  act(() => radio(panel.host, 'Density', 'Compact').click());
  assert.deepEqual(attrs(html), { 'data-theme': 'dark', 'data-contrast': 'more', 'data-text-scale': 'xl', 'data-motion': 'reduce', 'data-density': 'compact' });
  assert.equal(ui.prefersReducedMotion(), true, 'the in-app motion choice counts for useReducedMotion');
  assert.deepEqual(JSON.parse(localStorage.getItem('p')), { theme: 'dark', contrast: 'more', textScale: 'xl', motion: 'reduce', density: 'compact' });
  // switching back to md / standard removes the attributes again
  act(() => radio(panel.host, 'Text size', 'Default').click());
  act(() => radio(panel.host, 'Density', 'Standard').click());
  assert.equal(html.getAttribute('data-text-scale'), null);
  assert.equal(html.getAttribute('data-density'), null);
  // another tab wrote a choice
  localStorage.setItem('p', JSON.stringify({ theme: 'light' }));
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'p' })));
  assert.equal(html.getAttribute('data-theme'), 'light');
  assert.equal(html.getAttribute('data-motion'), null);
  panel.unmount();
  switcher.unmount();
});

test('controlled components only report; they write nothing to <html> or storage', () => {
  localStorage.clear();
  for (const n of ['data-theme', 'data-contrast', 'data-text-scale', 'data-motion', 'data-density']) document.documentElement.removeAttribute(n);
  const seen = [];
  const panel = mount(h(ui.DisplayPreferences, { value: ui.DEFAULT_DISPLAY_PREFERENCES, onValueChange: (v) => seen.push(v), storageKey: 'c' }));
  act(() => radio(panel.host, 'Theme', 'Dark').click());
  assert.equal(seen.at(-1).theme, 'dark');
  assert.equal(document.documentElement.getAttribute('data-theme'), null);
  assert.equal(localStorage.getItem('c'), null);
  panel.unmount();
});

test('server markup: five labelled radio groups and an icons-only switcher whose options keep their names', () => {
  const html = renderToStaticMarkup(h(ui.DisplayPreferences, { labels: { theme: 'Tema' } }));
  assert.equal((html.match(/role="radiogroup"/g) ?? []).length, 5);
  assert.match(html, /<span class="uix-display-prefs__label" id="[^"]+-theme">Tema<\/span>/);
  const icons = renderToStaticMarkup(h(ui.ThemeSwitcher, { display: 'icons', value: 'light', onValueChange() {} }));
  assert.equal((icons.match(/aria-label="(Light|Dark|System)"/g) ?? []).length, 3);
  assert.doesNotMatch(icons, /<span>(Light|Dark|System)<\/span>/);
});

// ── review of #165 ────────────────────────────────────────────────────────────
test('blocked storage (a sandboxed frame): a click still applies, and the switcher in the tab follows', () => {
  const html = document.documentElement;
  for (const n of ['data-theme', 'data-contrast', 'data-text-scale', 'data-motion', 'data-density']) html.removeAttribute(n);
  const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const original = window.localStorage;
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() {}, clear() {} };
  Object.defineProperty(window, 'localStorage', { value: blocked, configurable: true });
  expose('localStorage', blocked);
  try {
    const panel = mount(h(ui.DisplayPreferences, { storageKey: 'blocked' }));
    const switcher = mount(h(ui.ThemeSwitcher, { storageKey: 'blocked' }));
    act(() => radio(panel.host, 'Theme', 'Dark').click());
    assert.equal(html.getAttribute('data-theme'), 'dark', 'the click is not undone by a read-back of defaults');
    assert.equal(radio(switcher.host, 'Theme', 'Dark').getAttribute('aria-checked'), 'true');
    act(() => radio(panel.host, 'Text size', 'Large').click());
    assert.equal(html.getAttribute('data-theme'), 'dark', 'a second change keeps the first');
    assert.equal(html.getAttribute('data-text-scale'), 'lg');
    panel.unmount();
    switcher.unmount();
  } finally {
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
    if (real) Object.defineProperty(globalThis, 'localStorage', real);
  }
});

test('mounting where the attributes already match sets no switching frame (a dialog keeps its entrance)', () => {
  localStorage.setItem('m', JSON.stringify({ theme: 'dark' }));
  const html = document.documentElement;
  html.setAttribute('data-theme', 'dark');
  for (const n of ['data-contrast', 'data-text-scale', 'data-motion', 'data-density']) html.removeAttribute(n);
  const seen = [];
  const observer = new MutationObserver((records) => { for (const r of records) seen.push(r.attributeName); });
  observer.observe(html, { attributes: true });
  const panel = mount(h(ui.DisplayPreferences, { storageKey: 'm' }));
  const records = observer.takeRecords().map((r) => r.attributeName);
  observer.disconnect();
  assert.deepEqual([...seen, ...records].filter((n) => n === 'data-uix-switching'), []);
  // a real change still gets its switching frame
  const changes = [];
  const watch = new MutationObserver((rs) => { for (const r of rs) changes.push(r.attributeName); });
  watch.observe(html, { attributes: true });
  act(() => radio(panel.host, 'Theme', 'Light').click());
  changes.push(...watch.takeRecords().map((r) => r.attributeName));
  watch.disconnect();
  assert.ok(changes.includes('data-uix-switching'));
  panel.unmount();
});
