/* The shortcut registry (enterprise UX study, roadmap #1; spec Docs/specs/2026-11-20-shortcut-registry.md):
 * the pure model (parse, match, the character-key rule, conflicts, stored preferences), then
 * ShortcutProvider / useShortcut / ShortcutScope / ShortcutSheet and the displays that read keys
 * from the registry (KbdCombo, Button, MenuItem, CommandPalette), in jsdom.
 * Focus, the real <dialog> and axe are in tests/a11y/shortcut-registry.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, memo, useState } from 'react';

let dom;
let createRoot;
let renderToString;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLElement', dom.window.HTMLElement);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('MutationObserver', dom.window.MutationObserver);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function () { this.setAttribute('open', ''); };
  proto.close = function () { this.removeAttribute('open'); };
  ({ createRoot } = await import('react-dom/client'));
  ({ renderToString } = await import('react-dom/server'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'getComputedStyle', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});
afterEach(() => { try { window.localStorage.clear(); } catch { /* none */ } });

const mounted = [];
const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  const handle = { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
  mounted.push(handle);
  return handle;
};
afterEach(() => { while (mounted.length) { const m = mounted.pop(); if (m.host.isConnected) m.unmount(); } });
/** Dispatch a keydown; returns whether a handler took it (defaultPrevented). */
const press = (key, init = {}, target = document.activeElement ?? document.body) => {
  let event;
  act(() => {
    event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    (target ?? document.body).dispatchEvent(event);
  });
  return event.defaultPrevented;
};
/** Let the registry's after-commit conflict check run. */
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 5)));

// —— the model ————————————————————————————————————————————————————————————————————————————

test('parseShortcut reads strings, chords and sequences into canonical key names', () => {
  const p = (b) => ui.parseShortcut(b);
  assert.deepEqual(p('Mod+K'), [['Mod', 'K']]);
  assert.deepEqual(p('mod+k'), [['Mod', 'K']]);
  assert.deepEqual(p('shift+cmd+p'), [['Mod', 'Shift', 'P']], 'modifiers in the order Mod, Ctrl, Alt, Shift');
  assert.deepEqual(p('G I'), [['G'], ['I']]);
  assert.deepEqual(p('?'), [['?']]);
  assert.deepEqual(p('Shift+?'), [['?']], 'on punctuation the character decides: Shift is dropped');
  assert.deepEqual(p('Shift+/'), [['/']], 'Shift+/ is the / key (write ? for the shifted character)');
  assert.deepEqual(p('Mod+Shift+K'), [['Mod', 'Shift', 'K']], 'Shift stays on a letter');
  assert.deepEqual(p('Mod++'), [['Mod', '+']], 'a + after a separator is the key');
  assert.deepEqual(p('Plus'), [['+']]);
  assert.deepEqual(p('esc'), [['Escape']]);
  assert.deepEqual(p(['Mod', 'Enter']), [['Mod', 'Enter']]);
  assert.deepEqual(p([['g'], ['i']]), [['G'], ['I']]);
  for (const bad of ['', 'Mod', 'Mod+Shift', 'A+B', 'A+', 'Mod+K+', 'G I+', 'Mod+Foo', 'F25', null, undefined, [], [[]], ['Mod', '']]) assert.equal(p(bad), null, `not a binding: ${JSON.stringify(bad)}`);
  assert.deepEqual(p('F5'), [['F5']]);
  assert.deepEqual(p('Mod+PageDown'), [['Mod', 'PageDown']]);
  assert.equal(ui.formatShortcut(p('shift+mod+k')), 'Mod+Shift+K');
  assert.equal(ui.formatShortcut(p('Mod++')), 'Mod+Plus');
  assert.equal(ui.formatShortcut(p('g i')), 'G I');
  assert.deepEqual(p(ui.formatShortcut(p('Mod++'))), [['Mod', '+']], 'the stored form reads back');
});

test('isCharacterKeyShortcut is WCAG 2.1.4: printable characters with no modifier but Shift', () => {
  for (const yes of ['A', '?', 'Shift+?', 'G I', '[', '1', 'Shift+A']) assert.equal(ui.isCharacterKeyShortcut(yes), true, yes);
  for (const no of ['Mod+K', 'Alt+A', 'Ctrl+/', 'Enter', 'Escape', 'ArrowDown', 'F1', 'Space', 'Mod+G I', 'G Mod+I']) assert.equal(ui.isCharacterKeyShortcut(no), false, no);
});

test('matchesChord: Mod per platform, exact modifiers on letters, the character decides on punctuation', () => {
  const ev = (key, init = {}) => ({ key, code: init.code ?? '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...init });
  const m = (event, binding, platform = 'other') => ui.matchesChord(event, ui.parseShortcut(binding)[0], platform);
  assert.equal(m(ev('k', { ctrlKey: true }), 'Mod+K'), true);
  assert.equal(m(ev('k', { metaKey: true }), 'Mod+K'), false, 'Windows: Mod is Ctrl');
  assert.equal(m(ev('k', { metaKey: true }), 'Mod+K', 'mac'), true);
  assert.equal(m(ev('k', { ctrlKey: true }), 'Mod+K', 'mac'), false, 'Mac: Mod is ⌘');
  assert.equal(m(ev('k', { ctrlKey: true, shiftKey: true }), 'Mod+K'), false, 'an extra Shift is another shortcut');
  assert.equal(m(ev('a'), 'A'), true);
  assert.equal(m(ev('A', { shiftKey: true }), 'A'), false);
  assert.equal(m(ev('A', { shiftKey: true }), 'Shift+A'), true);
  // A Serbian Cyrillic layout types г on the G key: the physical key decides.
  assert.equal(m(ev('г', { code: 'KeyG' }), 'G'), true);
  assert.equal(m(ev('х', { code: 'KeyH' }), 'G'), false);
  // Option+A on a Mac types å.
  assert.equal(m(ev('å', { altKey: true, code: 'KeyA' }), 'Alt+A', 'mac'), true);
  // ? is Shift+/ in the US and Shift+ß in Germany: Shift is never compared on punctuation.
  assert.equal(m(ev('?', { shiftKey: true }), '?'), true);
  assert.equal(m(ev('?', { shiftKey: true }), 'Shift+?'), true);
  // [ is AltGr+8 on a German Windows keyboard (Ctrl+Alt) and Option+5 on a Mac.
  assert.equal(m(ev('[', { ctrlKey: true, altKey: true }), '['), true);
  assert.equal(m(ev('[', { altKey: true }), '[', 'mac'), true);
  assert.equal(m(ev('[', { ctrlKey: true }), '['), false, 'Ctrl+[ is not [');
  assert.equal(m(ev('[', { metaKey: true }), '[', 'mac'), false);
  assert.equal(m(ev('/', { ctrlKey: true }), 'Mod+/'), true);
  // A chord with modifiers has exactly them: AltGr (Ctrl+Alt) or ⌘⌥ typing / is not Mod+/.
  assert.equal(m(ev('/', { ctrlKey: true, altKey: true }), 'Mod+/'), false);
  assert.equal(m(ev('/', { metaKey: true, altKey: true }), 'Mod+/', 'mac'), false);
  assert.equal(m(ev('/', { ctrlKey: true, shiftKey: true }), 'Mod+/'), true, 'Shift is never compared on punctuation');
  // Option+/ types ÷ on a Mac: an Alt chord falls back to the physical key.
  assert.equal(m(ev('÷', { altKey: true, code: 'Slash' }), 'Alt+/', 'mac'), true);
  assert.equal(m(ev('/', { altKey: true, code: 'Slash' }), 'Alt+/'), true);
  assert.equal(m(ev('/', { code: 'Slash' }), 'Alt+/'), false);
  assert.equal(m(ev('Enter', { ctrlKey: true }), 'Mod+Enter'), true);
  assert.equal(m(ev(' '), 'Space'), true);
});

test('isTypingTarget: text fields, selects and contenteditable type; checkboxes and buttons do not', () => {
  const host = document.createElement('div');
  host.innerHTML = '<input id="t"><input id="c" type="checkbox"><textarea id="a"></textarea><select id="s"></select><div id="r" role="combobox"></div><button id="b">x</button><div id="e" contenteditable="true"><span id="in">x</span></div>';
  document.body.append(host);
  const $ = (id) => host.querySelector(`#${id}`);
  for (const id of ['t', 'a', 's', 'r', 'in']) assert.equal(ui.isTypingTarget($(id)), true, id);
  for (const id of ['c', 'b']) assert.equal(ui.isTypingTarget($(id)), false, id);
  assert.equal(ui.isTypingTarget(null), false);
  host.remove();
});

test('findShortcutConflicts: same keys or a prefix in one scope; one id twice, other scopes and shadowing are not', () => {
  const c = (entries, opts) => ui.findShortcutConflicts(entries, opts);
  assert.deepEqual(c([{ id: 'a', keys: 'A' }, { id: 'b', keys: 'a' }]).map((x) => [x.kind, x.ids]), [['same', ['a', 'b']]]);
  assert.deepEqual(c([{ id: 'g', keys: 'G' }, { id: 'gi', keys: 'G I' }]).map((x) => x.kind), ['prefix']);
  assert.deepEqual(c([{ id: 'help', keys: '?' }, { id: 'search', keys: 'Shift+?' }], { platform: 'other' }).map((x) => x.kind), ['same'], 'one keydown matches both');
  assert.deepEqual(c([{ id: 'a', keys: 'A' }, { id: 'a', keys: 'A' }]), [], 'one command mounted twice');
  assert.deepEqual(c([{ id: 'a', keys: 'A', scope: 'list' }, { id: 'b', keys: 'A' }]), [], 'an inner scope shadows by design');
  const modCtrl = c([{ id: 'palette', keys: 'Mod+K' }, { id: 'link', keys: 'Ctrl+K' }]);
  assert.deepEqual(modCtrl.map((x) => x.platform), ['other'], 'Mod+K and Ctrl+K collide on Windows only');
  assert.deepEqual(c([{ id: 'palette', keys: 'Mod+K' }, { id: 'link', keys: 'Ctrl+K' }], { platform: 'mac' }), []);
});

test('stored preferences: unknown values fall back, a remap that is not a binding is dropped', () => {
  assert.deepEqual(ui.parseShortcutPreferences(null), { characterKeys: 'on', overrides: {} });
  assert.deepEqual(ui.parseShortcutPreferences('nonsense{'), { characterKeys: 'on', overrides: {} });
  assert.deepEqual(
    ui.parseShortcutPreferences(JSON.stringify({ characterKeys: 'off', overrides: { a: 'alt+a', b: null, c: 'Mod+Shift', d: 4 } })),
    { characterKeys: 'off', overrides: { a: 'Alt+A', b: null } },
  );
  assert.equal(ui.parseShortcutPreferences('{"characterKeys":"maybe"}').characterKeys, 'on');
  const prefs = { characterKeys: 'off', overrides: { assign: 'Alt+A', off: null } };
  assert.deepEqual(ui.effectiveShortcut('assign', 'A', prefs), [['Alt', 'A']], 'a remap with a modifier survives the switch');
  assert.equal(ui.effectiveShortcut('next', 'J', prefs), null, 'the switch turns a character key off');
  assert.deepEqual(ui.effectiveShortcut('palette', 'Mod+K', prefs), [['Mod', 'K']]);
  assert.equal(ui.effectiveShortcut('off', 'Mod+O', prefs), null, 'a null remap turns it off');
});

// —— the provider and the hook ————————————————————————————————————————————————————————————

/** A component that binds one shortcut and counts its runs. */
function Bind({ runs, label = 'Do it', ...options }) {
  ui.useShortcut({ label, handler: () => { runs.push(options.id); }, ...options });
  return null;
}

test('a global shortcut fires anywhere but in a text field, unless allowInInputs', () => {
  const runs = [];
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(Bind, { runs, id: 'assign', keys: 'A' }),
    h(Bind, { runs, id: 'palette', keys: 'Mod+K', allowInInputs: true }),
    h('input', { id: 'field' }), h('button', { id: 'btn' }, 'b')));
  assert.equal(press('a', {}, document.body), true);
  assert.equal(press('a', {}, app.host.querySelector('#btn')), true, 'a button is not typing');
  assert.equal(press('a', {}, app.host.querySelector('#field')), false, 'typing an a is text');
  assert.equal(press('k', { ctrlKey: true }, app.host.querySelector('#field')), true);
  assert.equal(press('a', { isComposing: true }, document.body), false, 'never while an IME composes');
  assert.equal(press('a', { repeat: true }, document.body), false, 'not on key repeat');
  assert.deepEqual(runs, ['assign', 'assign', 'palette']);
});

test('a scoped shortcut fires only with focus inside its scope; the inner scope wins', () => {
  const runs = [];
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(Bind, { runs, id: 'global-e', keys: 'E' }),
    h(ui.ShortcutScope, { label: 'Ticket list', id: 'list' },
      h(Bind, { runs, id: 'resolve', keys: 'E' }),
      h(Bind, { runs, id: 'next', keys: 'J' }),
      h('button', { id: 'row' }, 'row')),
    h('button', { id: 'outside' }, 'out')));
  const row = app.host.querySelector('#row');
  const outside = app.host.querySelector('#outside');
  press('j', {}, outside);
  press('e', {}, outside);
  press('j', {}, row);
  press('e', {}, row);
  assert.deepEqual(runs, ['global-e', 'next', 'resolve']);
});

test('a modal dialog holds the keys: only its own scope and allowInModal shortcuts fire', () => {
  const runs = [];
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(Bind, { runs, id: 'page', keys: 'P' }),
    h(Bind, { runs, id: 'palette', keys: 'Mod+K', allowInModal: true }),
    h('dialog', { id: 'dlg', open: true }, h(ui.ShortcutScope, { label: 'Reply' }, h(Bind, { runs, id: 'send', keys: 'Mod+Enter' }), h('button', { id: 'in' }, 'in')))));
  const inside = app.host.querySelector('#in');
  // jsdom opens <dialog open> without the top layer: report it as :modal, as a browser does after showModal()
  const dialog = app.host.querySelector('#dlg');
  const matches = dialog.matches.bind(dialog);
  dialog.matches = (selector) => selector === ':modal' || matches(selector);
  press('p', {}, inside);
  press('k', { ctrlKey: true }, inside);
  press('Enter', { ctrlKey: true }, inside);
  assert.deepEqual(runs, ['palette', 'send']);
});

test('sequences: G then I fires within the timeout; a pause or another key starts over', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const runs = [];
    let pending = 'unset';
    function Pending() { pending = ui.useShortcuts().pending; return null; }
    mount(h(ui.ShortcutProvider, { storageKey: null, sequenceTimeout: 1000 },
      h(Bind, { runs, id: 'inbox', keys: 'G I' }),
      h(Bind, { runs, id: 'mine', keys: 'G M' }),
      h(Pending)));
    assert.equal(press('g', {}, document.body), true, 'the first key of a sequence is taken');
    assert.deepEqual(pending, [['G']], 'the pending chords, for a visible "G…" hint');
    press('i', {}, document.body);
    assert.deepEqual(runs, ['inbox']);
    assert.equal(pending, null);
    press('g', {}, document.body);
    act(() => mock.timers.tick(1001));
    assert.equal(pending, null, 'the wait ended');
    press('m', {}, document.body);
    assert.deepEqual(runs, ['inbox'], 'M alone is not G M');
    press('g', {}, document.body);
    press('x', {}, document.body);
    press('m', {}, document.body);
    assert.deepEqual(runs, ['inbox'], 'a wrong key ends the sequence');
    press('g', {}, document.body);
    press('Shift', { shiftKey: true }, document.body);
    press('m', {}, document.body);
    assert.deepEqual(runs, ['inbox', 'mine'], 'a modifier going down does not break it');
  } finally { mock.timers.reset(); }
});

test('the character-key switch turns off character shortcuts and their hints; modifier shortcuts and remaps stay', () => {
  const runs = [];
  let api;
  function Api() { api = ui.useShortcuts(); return null; }
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(Bind, { runs, id: 'assign', keys: 'A' }),
    h(Bind, { runs, id: 'inbox', keys: 'G I' }),
    h(Bind, { runs, id: 'palette', keys: 'Mod+K' }),
    h(ui.KbdCombo, { shortcutId: 'assign', id: 'hint', platform: 'other' }),
    h(Api)));
  assert.match(app.host.querySelector('#hint').textContent, /A/);
  act(() => api.setCharacterKeys('off'));
  assert.equal(api.preferences.characterKeys, 'off');
  press('a', {}, document.body);
  press('g', {}, document.body);
  press('i', {}, document.body);
  press('k', { ctrlKey: true }, document.body);
  assert.deepEqual(runs, ['palette']);
  assert.equal(app.host.querySelector('#hint'), null, 'the hint goes with the key');
  let accepted;
  act(() => { accepted = api.setOverride('assign', 'Alt+A'); });
  assert.equal(accepted, true);
  press('a', { altKey: true }, document.body);
  assert.deepEqual(runs, ['palette', 'assign'], 'remapped with a modifier, it works again');
  assert.match(app.host.querySelector('#hint').textContent, /Alt\+A/);
  assert.equal(api.setOverride('assign', 'Mod+'), false, 'not a binding: refused');
  act(() => { api.setOverride('assign', undefined); api.setCharacterKeys('on'); });
  press('a', {}, document.body);
  assert.deepEqual(runs, ['palette', 'assign', 'assign'], 'back to its default');
});

test('preferences are stored like the display preferences, and a second provider-less reader follows', () => {
  let api;
  function Api() { api = ui.useShortcuts(); return null; }
  let prefs;
  function Reader() { prefs = ui.useShortcutPreferences().preferences; return null; }
  mount(h(ui.ShortcutProvider, null, h(Api)));
  mount(h(Reader));
  act(() => api.setCharacterKeys('off'));
  assert.deepEqual(JSON.parse(window.localStorage.getItem(ui.SHORTCUT_PREFERENCES_STORAGE_KEY)), { characterKeys: 'off', overrides: {} });
  assert.equal(prefs.characterKeys, 'off', 'the same tab hears it without reading storage back');
});

test('a controlled provider asks onPreferencesChange and keeps what it is given', () => {
  const asked = [];
  let api;
  function Api() { api = ui.useShortcuts(); return null; }
  mount(h(ui.ShortcutProvider, { preferences: { characterKeys: 'on', overrides: {} }, onPreferencesChange: (next) => asked.push(next) }, h(Api)));
  act(() => api.setCharacterKeys('off'));
  assert.deepEqual(asked, [{ characterKeys: 'off', overrides: {} }]);
  assert.equal(api.preferences.characterKeys, 'on', 'controlled: unchanged until the parent passes it');
  assert.equal(window.localStorage.getItem(ui.SHORTCUT_PREFERENCES_STORAGE_KEY), null, 'nothing stored');
});

test('conflicts: one report per pair through onConflict; the same id twice is not one', async () => {
  const conflicts = [];
  mount(h(ui.ShortcutProvider, { storageKey: null, onConflict: (c) => conflicts.push(c) },
    h(Bind, { runs: [], id: 'assign', keys: 'A' }),
    h(Bind, { runs: [], id: 'archive', keys: 'A' }),
    h(Bind, { runs: [], id: 'go', keys: 'G' }),
    h(Bind, { runs: [], id: 'inbox', keys: 'G I' }),
    h(Bind, { runs: [], id: 'twice', keys: 'T' }),
    h(Bind, { runs: [], id: 'twice', keys: 'T' })));
  await flush();
  assert.deepEqual(conflicts.map((c) => [c.kind, c.ids.slice().sort()]), [['same', ['archive', 'assign']], ['prefix', ['go', 'inbox']]]);
  await flush();
  assert.equal(conflicts.length, 2, 'reported once');
});

test('without a provider useShortcut works on the document default registry', () => {
  const runs = [];
  const app = mount(h(Bind, { runs, id: 'standalone', keys: 'Mod+J' }));
  press('j', { ctrlKey: true }, document.body);
  assert.deepEqual(runs, ['standalone']);
  app.unmount();
  press('j', { ctrlKey: true }, document.body);
  assert.deepEqual(runs, ['standalone'], 'unregistered on unmount');
});

test("an inner scope's sequence wins over a global single key that starts it", () => {
  const runs = [];
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(Bind, { runs, id: 'global-g', keys: 'G' }),
    h(ui.ShortcutScope, { label: 'List' }, h(Bind, { runs, id: 'list-gi', keys: 'G I' }), h('button', { id: 'in' }, 'in')),
    h('button', { id: 'out' }, 'out')));
  press('g', {}, app.host.querySelector('#in'));
  press('i', {}, app.host.querySelector('#in'));
  press('g', {}, app.host.querySelector('#out'));
  assert.deepEqual(runs, ['list-gi', 'global-g']);
});

test("a provider's platform change re-renders every hint, literal keys too", () => {
  let platform = 'other';
  const App = () => h(ui.ShortcutProvider, { storageKey: null, platform },
    h(Bind, { runs: [], id: 'palette', keys: 'Mod+K' }),
    h('div', { id: 'memo' }, h(Memo)));
  // memo: the hints re-render only because the registry tells them to, not because the parent did
  const Memo = memo(function Hints() {
    return h('span', null, h(ui.KbdCombo, { shortcutId: 'palette', id: 'bound' }), h(ui.KbdCombo, { keys: ['Mod', 'S'], id: 'literal' }));
  });
  const app = mount(h(App));
  const said = (id) => app.host.querySelector(`#${id} .uix-visually-hidden`).textContent;
  assert.equal(said('bound'), 'Control+K');
  assert.equal(said('literal'), 'Control+S');
  platform = 'mac';
  act(() => app.root.render(h(App)));
  assert.equal(said('bound'), 'Command+K');
  assert.equal(said('literal'), 'Command+S');
});

test('a handler that returns false leaves the key to the next match and the browser', () => {
  const runs = [];
  mount(h(ui.ShortcutProvider, { storageKey: null },
    h(ui.ShortcutScope, { label: 'Editor' },
      h(Bind, { runs, id: 'local', keys: 'Mod+L', handler: () => { runs.push('local'); return false; } }),
      h('button', { id: 'focus' }, 'f')),
    h(Bind, { runs, id: 'global', keys: 'Mod+L' })));
  press('l', { ctrlKey: true }, document.querySelector('#focus'));
  assert.deepEqual(runs, ['local', 'global']);
});

// —— displays read the registry ————————————————————————————————————————————————————————————

test('Button shortcutId: the description says the registered keys; none while off', () => {
  let api;
  function Api() { api = ui.useShortcuts(); return null; }
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(Bind, { runs: [], id: 'assign', keys: 'A' }),
    h(ui.Button, { id: 'assign-btn', shortcutId: 'assign' }, 'Assign'),
    h(Api)));
  const button = app.host.querySelector('#assign-btn');
  const described = () => (button.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => document.getElementById(id)?.textContent).join(' ');
  assert.equal(described(), 'A');
  assert.equal(button.textContent, 'Assign', 'the button text is unchanged');
  act(() => api.setCharacterKeys('off'));
  assert.equal(button.getAttribute('aria-describedby'), null, 'no keys, no description');
  act(() => api.setOverride('assign', 'Mod+Shift+A'));
  assert.equal(described(), 'Control+Shift+A');
});

test('a hint for a scoped command shows its keys only where they work: inside its scope', () => {
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(ui.ShortcutScope, { label: 'Ticket list' },
      h(Bind, { runs: [], id: 'resolve', keys: 'E' }),
      h(ui.Button, { id: 'inside', shortcutId: 'resolve' }, 'Resolve')),
    h(ui.Button, { id: 'outside', shortcutId: 'resolve' }, 'Resolve'),
    h(ui.KbdCombo, { id: 'follows', shortcutId: 'resolve' })));
  const inside = app.host.querySelector('#inside');
  const outside = app.host.querySelector('#outside');
  assert.ok(inside.getAttribute('aria-describedby'), 'in the scope: described by its key');
  assert.equal(outside.getAttribute('aria-describedby'), null, 'outside: the key would do nothing, so no hint');
  assert.equal(app.host.querySelector('#follows'), null, 'a KbdCombo follows focus: nothing focused in the scope');
  act(() => inside.focus());
  assert.match(app.host.querySelector('#follows').textContent, /E/);
  act(() => outside.focus());
  assert.equal(app.host.querySelector('#follows'), null);
});

test('KbdCombo shows a sequence as "G then I" and says it as "G, then I"; the word is translatable', () => {
  const html = renderToString(h(ui.KbdCombo, { keys: [['G'], ['I']], platform: 'other' }));
  assert.match(html, /<span class="uix-visually-hidden">G, then I<\/span>/);
  assert.match(html, /<kbd class="uix-kbd">G<\/kbd><\/span><span class="uix-kbd-combo__then" aria-hidden="true">then<\/span>/);
  const de = renderToString(h(ui.UixLabelsProvider, { labels: { shortcuts: { then: 'dann' } } }, h(ui.KbdCombo, { keys: [['G'], ['I']], platform: 'other' })));
  assert.match(de, /G, dann I/);
  assert.equal(renderToString(h(ui.KbdCombo, { keys: ['Mod', 'K'], platform: 'mac' })), renderToString(h(ui.KbdCombo, { keys: ['Mod', 'K'], platform: 'mac' })));
  assert.match(renderToString(h(ui.KbdCombo, { keys: ['Mod', 'K'], platform: 'mac' })), /^<span class="uix-kbd-combo"><span class="uix-visually-hidden">Command\+K<\/span><span class="uix-kbd-combo__keys" aria-hidden="true"><kbd class="uix-kbd">⌘<\/kbd><kbd class="uix-kbd">K<\/kbd><\/span><\/span>$/, 'a chord renders as before');
  assert.equal(renderToString(h(ui.KbdCombo, { shortcutId: 'nothing-registered' })), '', 'an unregistered command shows no keys (and the server shows none)');
});

test('MenuItem shortcutId: keys and aria-keyshortcuts from the registry; a sequence sets no aria-keyshortcuts', () => {
  function Menu() {
    return h(ui.ShortcutProvider, { storageKey: null, platform: 'mac' },
      h(Bind, { runs: [], id: 'dup', keys: 'Mod+D' }),
      h(Bind, { runs: [], id: 'inbox', keys: 'G I' }),
      h('div', { role: 'menu' },
        h(ui.MenuItem, { id: 'm1', shortcutId: 'dup' }, 'Duplicate'),
        h(ui.MenuItem, { id: 'm2', shortcutId: 'inbox' }, 'Inbox')));
  }
  const app = mount(h(Menu));
  const m1 = app.host.querySelector('#m1');
  const m2 = app.host.querySelector('#m2');
  assert.equal(m1.getAttribute('aria-keyshortcuts'), 'Meta+D', 'the provider fixed mac: the hints follow it, not the browser');
  assert.ok(m1.querySelector('.uix-kbd-combo'));
  assert.equal(m2.getAttribute('aria-keyshortcuts'), null);
  assert.match(m2.textContent, /G.*then.*I/);
});

test('CommandPalette: an item with shortcutId shows the registered keys and runs the command when chosen', async () => {
  const runs = [];
  let api;
  function Api() { api = ui.useShortcuts(); return null; }
  function App() {
    const [open, setOpen] = useState(false);
    return h(ui.ShortcutProvider, { storageKey: null },
      h(Bind, { runs, id: 'assign', keys: 'A', label: 'Assign to me' }),
      h(ui.CommandPalette, {
        open, onOpenChange: setOpen, shortcut: 'Mod+K',
        items: [{ id: 'assign', label: 'Assign to me', shortcutId: 'assign' }, { id: 'lit', label: 'Literal', shortcut: ['Mod', 'L'] }],
      }),
      h(Api));
  }
  const app = mount(h(App));
  press('k', { ctrlKey: true }, document.body);
  const dialog = app.host.querySelector('dialog');
  assert.ok(dialog.hasAttribute('open'), 'Mod+K opens it through the registry');
  const option = (id) => [...dialog.querySelectorAll('[role="option"]')].find((o) => o.id.endsWith(id));
  assert.equal(option('assign').getAttribute('aria-keyshortcuts'), 'A');
  assert.equal(option('lit').getAttribute('aria-keyshortcuts'), 'Control+L', 'literal keys still work');
  act(() => api.setCharacterKeys('off'));
  assert.equal(option('assign').getAttribute('aria-keyshortcuts'), null, 'off: no keys shown');
  assert.equal(option('assign').querySelector('.uix-kbd-combo'), null);
  act(() => option('assign').click());
  await flush();
  assert.deepEqual(runs, ['assign'], 'the palette is the modifier path to a switched-off single key');
  assert.ok(!dialog.hasAttribute('open'));
  press('k', { ctrlKey: true }, document.body);
  assert.ok(dialog.hasAttribute('open'));
  press('k', { ctrlKey: true }, dialog.querySelector('input'));
  assert.ok(!dialog.hasAttribute('open'), 'the same keys close it, from its own field');
});

// —— the sheet ————————————————————————————————————————————————————————————————————————————

test('CommandPalette shortcut without onOpenChange binds nothing: the key stays free', () => {
  mount(h(ui.ShortcutProvider, { storageKey: null },
    h(ui.CommandPalette, { open: false, shortcut: 'Mod+K', items: [{ id: 'a', label: 'A' }] })));
  assert.equal(press('k', { ctrlKey: true }, document.body), false);
});

test('ShortcutSheet: ? opens a dialog listing what works where focus was, by scope; the switch hides character keys', () => {
  function App() {
    return h(ui.ShortcutProvider, { storageKey: null },
      h(Bind, { runs: [], id: 'palette', keys: 'Mod+K', label: 'Open the command palette' }),
      h(Bind, { runs: [], id: 'inbox', keys: 'G I', label: 'Go to inbox', group: 'Navigation' }),
      h(Bind, { runs: [], id: 'hidden', keys: 'Mod+H', label: 'Secret', hidden: true }),
      h(ui.ShortcutScope, { label: 'Ticket list' }, h(Bind, { runs: [], id: 'resolve', keys: 'E', label: 'Resolve' }), h('button', { id: 'row' }, 'row')),
      h(ui.ShortcutScope, { label: 'Reply' }, h(Bind, { runs: [], id: 'send', keys: 'Mod+Enter', label: 'Send' })),
      h('button', { id: 'outside' }, 'out'),
      h(ui.ShortcutSheet, null));
  }
  const app = mount(h(App));
  const row = app.host.querySelector('#row');
  row.focus();
  press('?', { shiftKey: true }, row);
  const dialog = app.host.querySelector('dialog.uix-shortcut-sheet');
  assert.ok(dialog?.hasAttribute('open'), '? opened the sheet');
  assert.equal(dialog.querySelector('h2').textContent, 'Keyboard shortcuts');
  const sections = [...dialog.querySelectorAll('.uix-shortcut-sheet__group')];
  assert.deepEqual(sections.map((s) => s.querySelector('h3').textContent), ['Everywhere', 'Ticket list'], 'the Reply scope is not where focus was');
  for (const s of sections) assert.equal(s.getAttribute('aria-labelledby'), s.querySelector('h3').id);
  const rows = (section) => [...section.querySelectorAll('.uix-shortcut-sheet__row')].map((r) => `${r.querySelector('dt').textContent}=${r.querySelector('dd .uix-visually-hidden').textContent}`);
  assert.deepEqual(rows(sections[0]), ['Open the command palette=Control+K', 'Show keyboard shortcuts=?', 'Go to inbox=G, then I']);
  assert.equal(sections[0].querySelector('h4').textContent, 'Navigation');
  assert.deepEqual(rows(sections[1]), ['Resolve=E']);
  const toggle = dialog.querySelector('input[role="switch"]');
  assert.equal(toggle.checked, true);
  assert.match(document.getElementById(toggle.getAttribute('aria-describedby')).textContent, /speech input/);
  act(() => toggle.click());
  const after = [...dialog.querySelectorAll('.uix-shortcut-sheet__group')];
  assert.deepEqual(rows(after[0]), ['Open the command palette=Control+K'], 'character keys are off: only what works is listed');
  assert.equal(after.length, 1, 'a scope with nothing left is not listed');
  assert.match(document.getElementById(toggle.getAttribute('aria-describedby')).textContent, /are off/);
});

test('ShortcutSheet: controlled, its own keys remappable, translated words', () => {
  let open = false;
  const asked = [];
  function App() {
    return h(ui.UixLabelsProvider, { labels: { shortcuts: { title: 'Tastenkürzel', global: 'Überall', open: 'Tastenkürzel anzeigen' } } },
      h(ui.ShortcutProvider, { storageKey: null, defaultPreferences: { overrides: { [ui.SHORTCUT_SHEET_ID]: 'Mod+/' } } },
        h(ui.ShortcutSheet, { open, onOpenChange: (next) => asked.push(next), characterKeySwitch: false })));
  }
  const app = mount(h(App));
  press('?', { shiftKey: true }, document.body);
  assert.deepEqual(asked, [], 'remapped: ? no longer opens it');
  press('/', { ctrlKey: true }, document.body);
  assert.deepEqual(asked, [true]);
  open = true;
  act(() => app.root.render(h(App)));
  const dialog = app.host.querySelector('dialog');
  assert.equal(dialog.querySelector('h2').textContent, 'Tastenkürzel');
  assert.equal(dialog.querySelector('h3').textContent, 'Überall');
  assert.match(dialog.textContent, /Tastenkürzel anzeigen/);
  assert.equal(dialog.querySelector('input[role="switch"]'), null);
});

test('the kit binds through the registry: AppShell navHotkey and DataWorkspace Mod+/ are listed and obey the switch', () => {
  let api;
  function Api() { api = ui.useShortcuts(); return null; }
  const app = mount(h(ui.ShortcutProvider, { storageKey: null },
    h(ui.AppShell, { navHotkey: '[', sidebar: h('nav', null, 'nav') }, h(Api))));
  const shell = app.host.querySelector('.uix-shell');
  press('[', {}, document.body);
  assert.equal(shell.getAttribute('data-nav'), 'rail');
  const listed = api.active(document.body).flatMap((g) => g.shortcuts.map((s) => `${s.id}:${ui.formatShortcut(s.keys)}`));
  assert.deepEqual(listed, ['uix.app-shell.nav:['], 'listed in the sheet');
  act(() => api.setCharacterKeys('off'));
  press('[', {}, document.body);
  assert.equal(shell.getAttribute('data-nav'), 'rail', 'a character key: off with the switch');
  act(() => api.setOverride('uix.app-shell.nav', 'Mod+B'));
  press('b', { ctrlKey: true }, document.body);
  assert.equal(shell.getAttribute('data-nav'), null, 'remapped to a chord, it works again');
});
