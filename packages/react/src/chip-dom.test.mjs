/* Chip for TENSOR's filter, toggle and link chips (HAR-1632), in jsdom:
 *   1. the × button's name comes from UixLabelsProvider (`chip.remove`), so call sites stop
 *      passing `removeLabel`; the prop still wins and the English default is unchanged;
 *   2. a removable chip forwards its ref to the body button and takes `bodyProps`
 *      (aria-haspopup / aria-expanded / aria-controls / id), so a filter editor can be anchored
 *      to it and focus returned to it without a getElementById;
 *   3. a link chip takes `current`: aria-current="page" and the filled look.
 * The toggle / link / remove basics are in batch-a-dom.test.mjs (HAR-1360); the × geometry is
 * tests/a11y/dismiss-control.spec.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'];
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
  for (const name of EXPOSED) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const parse = (html) => new dom.window.DOMParser().parseFromString(html, 'text/html').body.firstElementChild;
const removeName = (root) => root.querySelector('.uix-chip__remove').getAttribute('aria-label');

test('the remove label: prop, then UixLabelsProvider chip.remove, then the English default', () => {
  const chip = (props) => h(ui.Chip, { onRemove() {}, ...props }, 'Status: Open');
  assert.equal(removeName(parse(renderToStaticMarkup(chip({})))), 'Remove Status: Open', 'default unchanged');

  const german = { chip: { remove: '{label} entfernen' } };
  const provided = parse(renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: german }, chip({}))));
  assert.equal(removeName(provided), 'Status: Open entfernen', 'one provider names every chip below it');

  const explicit = parse(renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: german }, chip({ removeLabel: 'Filter löschen' }))));
  assert.equal(removeName(explicit), 'Filter löschen', 'the prop still wins');

  // a chip whose text is not a string has nothing for {label}: the template is trimmed
  const rich = parse(renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { chip: { remove: 'Entfernen {label}' } } },
    h(ui.Chip, { onRemove() {} }, h('b', null, 'Open')))));
  assert.equal(removeName(rich), 'Entfernen');
});

test('a removable chip: the ref and bodyProps reach the body button, the other props stay on the wrapper', () => {
  const ref = createRef();
  const clicks = [];
  const { host, unmount } = mount(h(ui.Chip, {
    ref,
    onClick: () => clicks.push('edit'),
    onRemove: () => clicks.push('remove'),
    id: 'filter-status-chip',
    'data-filter': 'status',
    bodyProps: { id: 'filter-status', 'aria-haspopup': 'dialog', 'aria-expanded': true, 'aria-controls': 'filter-status-editor' },
  }, 'Status: Open'));
  const wrapper = host.firstElementChild;
  const body = wrapper.querySelector('.uix-chip__main');
  assert.equal(wrapper.tagName, 'SPAN');
  assert.equal(wrapper.id, 'filter-status-chip', 'the rest props are on the wrapper, as before');
  assert.equal(wrapper.dataset.filter, 'status');
  assert.equal(body.tagName, 'BUTTON');
  assert.equal(ref.current, body, 'the ref is the body button');
  assert.equal(body.id, 'filter-status');
  assert.equal(body.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(body.getAttribute('aria-expanded'), 'true');
  assert.equal(body.getAttribute('aria-controls'), 'filter-status-editor');
  assert.equal(wrapper.hasAttribute('aria-haspopup'), false, 'the popup attributes are not on the wrapper');
  assert.equal(wrapper.querySelector('.uix-chip__remove').hasAttribute('aria-haspopup'), false, 'nor on the × button');

  // anchor to it and return focus to it, with no DOM lookup
  act(() => ref.current.focus());
  assert.equal(document.activeElement, body);
  act(() => body.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  act(() => wrapper.querySelector('.uix-chip__remove').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.deepEqual(clicks, ['edit', 'remove']);
  unmount();
});

test('the ref is the chip itself on a chip without ×: button, link and plain text', () => {
  const button = createRef();
  const link = createRef();
  const text = createRef();
  const { host, unmount } = mount(h('div', null,
    h(ui.Chip, { ref: button, pressed: false, onPressedChange() {}, bodyProps: { 'aria-describedby': 'hint' } }, 'Mine'),
    h(ui.Chip, { ref: link, href: '/incidents' }, 'Incidents'),
    h(ui.Chip, { ref: text }, 'Read only')));
  const [b, a, s] = host.firstElementChild.children;
  assert.equal(button.current, b);
  assert.equal(b.tagName, 'BUTTON');
  assert.equal(b.className, 'uix-chip');
  assert.equal(b.getAttribute('aria-describedby'), 'hint', 'bodyProps also apply when the chip is its own body');
  assert.equal(link.current, a);
  assert.equal(a.tagName, 'A');
  assert.equal(text.current, s);
  assert.equal(s.tagName, 'SPAN');
  unmount();

  // a removable link chip: the ref is the link, through renderLink too
  const routed = createRef();
  const seen = [];
  const r = mount(h(ui.Chip, { ref: routed, href: '/x', onRemove() {}, renderLink: (p) => { seen.push(Object.keys(p)); return h('a', { ...p, 'data-router': '' }); } }, 'X'));
  assert.equal(routed.current, r.host.querySelector('a[data-router]'));
  assert.ok(seen[0].includes('ref'), 'renderLink is handed the ref to spread');
  r.unmount();
});

test('a link chip with current: aria-current="page" and the filled look; pressed semantics are not used', () => {
  const current = parse(renderToStaticMarkup(h(ui.Chip, { href: '/incidents', current: true }, 'Incidents')));
  assert.equal(current.tagName, 'A');
  assert.equal(current.getAttribute('aria-current'), 'page');
  assert.equal(current.hasAttribute('data-on'), true, 'data-on is what paints the selected chip');
  assert.equal(current.hasAttribute('aria-pressed'), false, 'a link is not a toggle button');

  const other = parse(renderToStaticMarkup(h(ui.Chip, { href: '/changes' }, 'Changes')));
  assert.equal(other.hasAttribute('aria-current'), false);
  assert.equal(other.hasAttribute('data-on'), false);
  assert.equal(parse(renderToStaticMarkup(h(ui.Chip, { href: '/changes', current: false }, 'Changes'))).hasAttribute('aria-current'), false);

  // through renderLink, and on a removable link chip (the wrapper carries the look)
  const seen = [];
  renderToStaticMarkup(h(ui.Chip, { href: '/a', current: true, renderLink: (p) => { seen.push(p['aria-current']); return h('a', p); } }, 'A'));
  assert.deepEqual(seen, ['page']);
  const removable = parse(renderToStaticMarkup(h(ui.Chip, { href: '/a', current: true, onRemove() {} }, 'A')));
  assert.equal(removable.hasAttribute('data-on'), true);
  assert.equal(removable.querySelector('a.uix-chip__main').getAttribute('aria-current'), 'page');

  // current is a link concept: a button chip ignores it, a disabled link chip is not a link
  const button = parse(renderToStaticMarkup(h(ui.Chip, { onClick() {}, current: true }, 'B')));
  assert.equal(button.hasAttribute('aria-current'), false);
  assert.equal(button.hasAttribute('data-on'), false);
  const disabled = parse(renderToStaticMarkup(h(ui.Chip, { href: '/a', current: true, disabled: true }, 'A')));
  assert.equal(disabled.tagName, 'BUTTON');
  assert.equal(disabled.hasAttribute('aria-current'), false);
});

test('a plain chip renders the same markup as before', () => {
  assert.equal(renderToStaticMarkup(h(ui.Chip, { pressed: true, onPressedChange() {}, count: 12 }, 'Mine')),
    '<button type="button" class="uix-chip" aria-pressed="true" data-on="true"><span class="uix-chip__label">Mine</span><span class="uix-chip__count">12</span></button>');
  assert.equal(renderToStaticMarkup(h(ui.Chip, null, 'Tag')), '<span class="uix-chip uix-chip--static"><span class="uix-chip__label">Tag</span></span>');
  assert.match(renderToStaticMarkup(h(ui.Chip, { onRemove() {} }, 'Tag')),
    /^<span class="uix-chip uix-chip--removable uix-chip--static"><span class="uix-chip__main"><span class="uix-chip__label">Tag<\/span><\/span><button type="button" class="uix-chip__remove" aria-label="Remove Tag"><svg/);
});
