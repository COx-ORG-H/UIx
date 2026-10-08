/* Segmented keyboard model and radiogroup mode (HAR-1604), in jsdom.
 *
 * TENSOR's theme switcher is a role="radiogroup" with its own roving-tabindex hook (accessibility
 * audit fix A11Y-FIX-02): one Tab stop, arrows apply the choice. The kit `Segmented` made every
 * option a tab stop and handled no key, so moving onto it lost that. Now:
 *   - the group is one tab stop: the selected option, or the first enabled one when none is;
 *   - Arrow Right/Down and Left/Up move AND select, wrapping; Home / End jump; disabled options
 *     are skipped; in a right-to-left group Left and Right swap;
 *   - `selection="radio"` renders radiogroup / radio / aria-checked instead of group / aria-pressed.
 * Tab itself is the browser's: tests/a11y/segmented.spec.mjs presses it in Chromium.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
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
  for (const name of EXPOSED) delete globalThis[name];
});

/** A controlled Segmented with `options` ([value, label, disabled?]); records every onChange. */
function mount({ initial, options = [['compact', 'Compact'], ['default', 'Default'], ['relaxed', 'Relaxed']], ...props } = {}) {
  const changes = [];
  function Control() {
    const [value, setValue] = useState(initial);
    return h(ui.Segmented, { value, onChange: (v) => { changes.push(v); setValue(v); }, 'aria-label': 'Density', ...props },
      options.map(([value_, label, disabled]) => h(ui.SegmentedOption, { key: value_, value: value_, disabled }, label)));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Control)));
  const group = host.firstElementChild;
  return {
    host, group, changes,
    options: () => [...group.querySelectorAll('button')],
    stops: () => [...group.querySelectorAll('button')].filter((b) => b.tabIndex === 0).map((b) => b.textContent),
    cleanup: () => { act(() => root.unmount()); host.remove(); },
  };
}
const press = (key, init = {}) => {
  let notPrevented = true;
  act(() => { notPrevented = document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })); });
  return notPrevented;
};
const active = () => document.activeElement.textContent;

test('one tab stop: the selected option, and the first enabled one when nothing is selected', () => {
  const chosen = mount({ initial: 'default' });
  assert.deepEqual(chosen.stops(), ['Default']);
  assert.deepEqual(chosen.options().map((o) => o.tabIndex), [-1, 0, -1]);
  chosen.cleanup();

  const none = mount({ initial: undefined });
  assert.deepEqual(none.stops(), ['Compact'], 'the group stays reachable without a selection');
  none.cleanup();

  const unknown = mount({ initial: 'gone' });
  assert.deepEqual(unknown.stops(), ['Compact'], 'a value that matches no option falls back the same way');
  unknown.cleanup();

  const firstDisabled = mount({ initial: undefined, options: [['a', 'A', true], ['b', 'B'], ['c', 'C']] });
  assert.deepEqual(firstDisabled.stops(), ['B'], 'a disabled option is never the tab stop');
  firstDisabled.cleanup();

  const selectedDisabled = mount({ initial: 'a', options: [['a', 'A', true], ['b', 'B'], ['c', 'C']] });
  assert.deepEqual(selectedDisabled.stops(), ['B']);
  selectedDisabled.cleanup();
});

test('arrow keys move and select, wrap at the ends, and the tab stop follows the selection', () => {
  const c = mount({ initial: 'compact' });
  c.options()[0].focus();
  assert.equal(press('ArrowRight'), false, 'the key is handled');
  assert.equal(active(), 'Default');
  assert.deepEqual(c.changes, ['default']);
  assert.deepEqual(c.stops(), ['Default']);
  press('ArrowDown');
  assert.equal(active(), 'Relaxed');
  press('ArrowRight');
  assert.equal(active(), 'Compact', 'wraps from the last to the first');
  press('ArrowLeft');
  assert.equal(active(), 'Relaxed', 'wraps from the first to the last');
  press('ArrowUp');
  assert.equal(active(), 'Default');
  assert.deepEqual(c.changes, ['default', 'relaxed', 'compact', 'relaxed', 'default']);
  assert.deepEqual(c.options().map((o) => o.getAttribute('aria-pressed')), ['false', 'true', 'false']);
  assert.deepEqual(c.stops(), ['Default'], 'still exactly one tab stop');
  c.cleanup();
});

test('Home and End jump; a key on the option already there does nothing', () => {
  const c = mount({ initial: 'default' });
  c.options()[1].focus();
  press('End');
  assert.equal(active(), 'Relaxed');
  press('End');
  assert.deepEqual(c.changes, ['relaxed'], 'End on the last option is not a second change');
  press('Home');
  assert.equal(active(), 'Compact');
  assert.deepEqual(c.changes, ['relaxed', 'compact']);
  c.cleanup();
});

test('disabled options are skipped, and other keys and modified arrows are left alone', () => {
  const c = mount({ initial: 'a', options: [['a', 'A'], ['b', 'B', true], ['c', 'C']] });
  c.options()[0].focus();
  press('ArrowRight');
  assert.equal(active(), 'C', 'B is disabled');
  press('ArrowRight');
  assert.equal(active(), 'A');
  assert.deepEqual(c.changes, ['c', 'a']);

  assert.equal(press('Tab'), true, 'Tab is the browser\'s: it leaves the group');
  assert.equal(press('a'), true);
  assert.equal(press('ArrowRight', { altKey: true }), true, 'Alt+Arrow is browser history');
  assert.equal(press('ArrowRight', { ctrlKey: true }), true);
  assert.deepEqual(c.changes, ['c', 'a']);
  assert.equal(active(), 'A');
  c.cleanup();
});

test('right-to-left: Left goes forward and Right goes back; Up / Down keep their direction', () => {
  const c = mount({ initial: 'compact', dir: 'rtl', style: { direction: 'rtl' } });
  c.options()[0].focus();
  press('ArrowLeft');
  assert.equal(active(), 'Default', 'ArrowLeft is "next" in RTL');
  press('ArrowRight');
  assert.equal(active(), 'Compact');
  press('ArrowDown');
  assert.equal(active(), 'Default');
  c.cleanup();
});

test('the handled arrow does not reach a surrounding toolbar; a consumer onKeyDown runs first and can veto', () => {
  const outer = [];
  const inner = [];
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (veto) => act(() => root.render(
    h('div', { role: 'toolbar', onKeyDown: (e) => outer.push(e.key) },
      h(ui.Segmented, { value: 'a', onChange: (v) => inner.push(v), onKeyDown: (e) => { if (veto) e.preventDefault(); } },
        h(ui.SegmentedOption, { value: 'a' }, 'A'), h(ui.SegmentedOption, { value: 'b' }, 'B'))),
  ));
  render(false);
  host.querySelector('button').focus();
  press('ArrowRight');
  assert.deepEqual(inner, ['b']);
  assert.deepEqual(outer, [], 'one key, one widget');
  press('x');
  assert.deepEqual(outer, ['x'], 'keys it does not handle still bubble');

  render(true);
  host.querySelector('button').focus();
  press('ArrowRight');
  assert.deepEqual(inner, ['b'], 'a prevented keydown is left to the consumer');
  act(() => root.unmount());
  host.remove();
});

test('default mode keeps role="group" and aria-pressed; selection="radio" gives radiogroup / radio / aria-checked', () => {
  const toggle = renderToStaticMarkup(h(ui.Segmented, { value: 'b', 'aria-label': 'View' },
    h(ui.SegmentedOption, { value: 'a' }, 'A'), h(ui.SegmentedOption, { value: 'b' }, 'B')));
  assert.equal(toggle,
    '<div role="group" class="uix-segmented" aria-label="View">'
    + '<button type="button" class="uix-segmented__option" aria-pressed="false" tabindex="-1">A</button>'
    + '<button type="button" class="uix-segmented__option" aria-pressed="true" tabindex="0">B</button></div>',
    'only tabindex is new in the default rendering');

  const radio = renderToStaticMarkup(h(ui.Segmented, { value: 'dark', selection: 'radio', 'aria-labelledby': 'theme-label' },
    h(ui.SegmentedOption, { value: 'light' }, 'Light'), h(ui.SegmentedOption, { value: 'dark' }, 'Dark')));
  assert.equal(radio,
    '<div role="radiogroup" class="uix-segmented" aria-labelledby="theme-label">'
    + '<button type="button" role="radio" class="uix-segmented__option" aria-checked="false" tabindex="-1">Light</button>'
    + '<button type="button" role="radio" class="uix-segmented__option" aria-checked="true" tabindex="0">Dark</button></div>');
  assert.doesNotMatch(radio, /aria-pressed/);

  // the keyboard model is the same in radio mode
  const c = mount({ initial: 'compact', selection: 'radio' });
  assert.equal(c.group.getAttribute('role'), 'radiogroup');
  assert.equal(c.group.getAttribute('aria-label'), 'Density');
  c.options()[0].focus();
  press('ArrowRight');
  assert.deepEqual(c.options().map((o) => o.getAttribute('aria-checked')), ['false', 'true', 'false']);
  assert.deepEqual(c.stops(), ['Default']);
  c.cleanup();
});

test('a SegmentedOption outside a Segmented renders as before, with no tabindex', () => {
  assert.equal(renderToStaticMarkup(h(ui.SegmentedOption, { value: 'a' }, 'A')),
    '<button type="button" class="uix-segmented__option" aria-pressed="false">A</button>');
});
