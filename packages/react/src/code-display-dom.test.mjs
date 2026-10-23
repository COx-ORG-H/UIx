/* CodeDisplay (HAR-1253) in jsdom: a one-time code shown large.
 *
 * - groups: cut by groupSize (a number or a list), or taken from the code's own spaces / hyphens;
 * - a screen reader gets the code character by character, groups apart; the visible code is hidden from it;
 * - the countdown ticks once per second with no live region; "one minute left" and "expired" are each
 *   said once, only when they happen on screen; onExpire runs once; an expired code says so in text;
 * - copy uses CopyButton and is gone once the code expired;
 * - words from UixLabelsProvider `codeDisplay`, an explicit `labels` wins.
 *
 * tests/a11y/code-display.spec.mjs measures it in Chromium. Renders the BUILT dist — run
 * `npm run build` first; CI does.
 */
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, StrictMode } from 'react';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(StrictMode, null, element)));
  return { host, rerender: (next) => act(() => root.render(h(StrictMode, null, next))), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const tick = (ms) => act(() => { mock.timers.tick(ms); });

test('codeGroups and formatCountdown', () => {
  assert.deepEqual(ui.codeGroups('K7Q4PX9MW'), ['K7Q', '4PX', '9MW']);
  assert.deepEqual(ui.codeGroups('K7Q-4PX-9MW'), ['K7Q', '4PX', '9MW']);
  assert.deepEqual(ui.codeGroups('ABCD EFGH IJ'), ['ABCD', 'EFGH', 'IJ']);
  assert.deepEqual(ui.codeGroups('ABCDEFGHIJ', [4, 4, 2]), ['ABCD', 'EFGH', 'IJ']);
  assert.deepEqual(ui.codeGroups('ABCDEFGHIJ', 4), ['ABCD', 'EFGH', 'IJ']);
  assert.deepEqual(ui.codeGroups('ABCDEFG', [2]), ['AB', 'CD', 'EF', 'G']);
  assert.equal(ui.formatCountdown(600), '10:00');
  assert.equal(ui.formatCountdown(59.2), '1:00');
  assert.equal(ui.formatCountdown(0), '0:00');
  assert.equal(ui.formatCountdown(3725), '1:02:05');
});

test('the code is spelled to a screen reader and hidden from it as drawn', () => {
  const { host, unmount } = mount(h(ui.CodeDisplay, { code: 'K7Q4PX9MW', label: 'Kod za uparivanje' }));
  const root = host.firstElementChild;
  assert.equal(root.getAttribute('role'), 'group');
  assert.equal(document.getElementById(root.getAttribute('aria-labelledby')).textContent, 'Kod za uparivanje');
  const code = host.querySelector('.uix-code-display__code');
  assert.equal(code.getAttribute('aria-hidden'), 'true');
  assert.equal(code.getAttribute('translate'), 'no');
  assert.deepEqual([...code.querySelectorAll('.uix-code-display__group')].map((g) => g.textContent), ['K7Q-', '4PX-', '9MW']);
  assert.equal(host.querySelector('.uix-code-display__spoken').textContent, 'K 7 Q, 4 P X, 9 M W');
  assert.equal(root.dataset.state, 'live');
  assert.equal(host.querySelector('.uix-code-display__meta'), null, 'no countdown without expiresAt');
  assert.equal(host.querySelector('.uix-copy-button'), null, 'no copy unless asked');
  unmount();
  const spelled = mount(h(ui.CodeDisplay, { code: 'O0', label: 'Code', spell: (c) => (c === '0' ? 'zero' : c === 'O' ? 'capital O' : c) }));
  assert.equal(spelled.host.querySelector('.uix-code-display__spoken').textContent, 'capital O zero');
  spelled.unmount();
});

test('countdown: one tick a second, two announcements, onExpire once, no live countdown', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  try {
    let expiries = 0;
    const { host, unmount } = mount(h(ui.CodeDisplay, { code: 'K7Q4PX9MW', label: 'Code', expiresAt: 1_000_000 + 62_000, copyable: true, onExpire: () => { expiries += 1; } }));
    const root = host.firstElementChild;
    const meta = () => host.querySelector('.uix-code-display__meta').textContent;
    const announcement = () => root.querySelector(':scope > [role="status"]').textContent;
    assert.equal(meta(), 'Expires in 1:02');
    assert.equal(announcement(), '');
    assert.equal(root.querySelector('.uix-code-display__meta').getAttribute('aria-live'), null, 'the countdown is not a live region');
    tick(1000);
    assert.equal(meta(), 'Expires in 1:01');
    tick(1000);
    assert.equal(meta(), 'Expires in 1:00');
    assert.equal(root.dataset.state, 'soon');
    assert.equal(announcement(), '1:00 left before the code expires');
    tick(1000);
    assert.equal(meta(), 'Expires in 0:59');
    assert.equal(announcement(), '1:00 left before the code expires', 'said once, not every second');
    assert.ok(host.querySelector('.uix-copy-button'), 'copy while live');
    tick(59_000);
    assert.equal(root.dataset.state, 'expired');
    assert.equal(meta(), 'Expired. Ask for a new code.');
    assert.equal(announcement(), 'Expired. Ask for a new code.');
    assert.equal(expiries, 1);
    assert.equal(host.querySelector('.uix-copy-button'), null, 'no copy once expired');
    tick(10_000);
    assert.equal(expiries, 1, 'no more ticks after expiry');
    unmount();
  } finally {
    mock.timers.reset();
  }
});

test('a code that arrives expired says so in its text, without an announcement or onExpire', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 5_000_000 });
  try {
    let expiries = 0;
    const { host, unmount } = mount(h(ui.CodeDisplay, { code: 'ABC', label: 'Code', expiresAt: new Date(4_000_000), onExpire: () => { expiries += 1; } }));
    const root = host.firstElementChild;
    assert.equal(root.dataset.state, 'expired');
    assert.equal(host.querySelector('.uix-code-display__meta').textContent, 'Expired. Ask for a new code.');
    assert.equal(root.querySelector(':scope > [role="status"]').textContent, '');
    assert.equal(expiries, 0);
    unmount();
  } finally {
    mock.timers.reset();
  }
});

test('a new code after expiry is live again and clears the announcement', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  try {
    const { host, rerender, unmount } = mount(h(ui.CodeDisplay, { code: 'ABC', label: 'Code', expiresAt: 2000, warnBefore: 0 }));
    const root = host.firstElementChild;
    tick(2000);
    assert.equal(root.dataset.state, 'expired');
    rerender(h(ui.CodeDisplay, { code: 'DEF', label: 'Code', expiresAt: 600_000, warnBefore: 0 }));
    assert.equal(root.dataset.state, 'live');
    assert.equal(root.querySelector(':scope > [role="status"]').textContent, '');
    assert.equal(host.querySelector('.uix-code-display__meta').textContent, 'Expires in 9:58');
    unmount();
  } finally {
    mock.timers.reset();
  }
});

test('words: UixLabelsProvider codeDisplay, an explicit labels prop wins; copy is a CopyButton', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  try {
    const tree = h(ui.UixLabelsProvider, { labels: { codeDisplay: { expiresIn: 'Ističe za {time}', copy: 'Kopiraj kod' } } },
      h(ui.CodeDisplay, { code: 'ABCDEF', label: 'Kod', expiresAt: 90_000, copyable: true, labels: { copy: 'Kopiraj' } }));
    const { host, unmount } = mount(tree);
    assert.equal(host.querySelector('.uix-code-display__meta').textContent, 'Ističe za 1:30');
    assert.equal(host.querySelector('.uix-copy-button').getAttribute('aria-label'), 'Kopiraj');
    unmount();
  } finally {
    mock.timers.reset();
  }
});
