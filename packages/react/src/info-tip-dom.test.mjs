/* InfoTip and the `help` slots on PageHeader, Card, SectionHead and Field (HAR-737) in jsdom.
 *
 * - empty / whitespace-only content renders nothing; blank lines split paragraphs;
 * - content is plain text: markup in it stays literal;
 * - the ? button is named, and the panel is its aria-describedby;
 * - in Field the ? sits OUTSIDE the <label>: a button inside a label is the label's activation
 *   target (TENSOR HAR-743), so `label.control` must stay the input;
 * - no slot puts the ? inside a heading, so a heading's name stays its title.
 *
 * Hover, focus and top-layer behaviour run in a real browser: tests/a11y/info-tip.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

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
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })));
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })));

test('empty or whitespace-only content renders nothing', () => {
  for (const content of ['', '  ', '\n\n  \n']) {
    const { host, unmount } = mount(h(ui.InfoTip, { content, label: 'About: Incidents' }));
    assert.equal(host.innerHTML, '', `content=${JSON.stringify(content)}`);
    unmount();
  }
});

test('blank lines become paragraphs; single line breaks stay inside one', () => {
  const { host, unmount } = mount(h(ui.InfoTip, { content: 'a\n\nb', label: 'About: x' }));
  const paras = [...host.querySelectorAll('.uix-info-tip__panel p')].map((p) => p.textContent);
  assert.deepEqual(paras, ['a', 'b']);
  unmount();

  const crlf = mount(h(ui.InfoTip, { content: '  one\r\nstill one\r\n \r\n\r\ntwo  ', label: 'About: x' }));
  assert.deepEqual([...crlf.host.querySelectorAll('.uix-info-tip__panel p')].map((p) => p.textContent), ['one\nstill one', 'two']);
  crlf.unmount();
});

test('content is plain text: markup renders literally', () => {
  const content = '<script>alert(1)</script> and <b>bold</b>';
  const { host, unmount } = mount(h(ui.InfoTip, { content, label: 'About: x' }));
  const panel = host.querySelector('.uix-info-tip__panel');
  assert.equal(panel.querySelector('script, b'), null, 'no element was created from the text');
  assert.equal(panel.textContent, content);
  unmount();
});

test('the ? is a named button described by its panel', () => {
  const { host, unmount } = mount(h(ui.InfoTip, { content: 'What an incident is.', label: 'About: Incidents' }));
  const button = host.querySelector('button.uix-info-tip__button');
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.getAttribute('aria-label'), 'About: Incidents');
  const panel = document.getElementById(button.getAttribute('aria-describedby'));
  assert.ok(panel, 'aria-describedby points at an element');
  assert.ok(panel.classList.contains('uix-info-tip__panel'));
  assert.equal(panel.getAttribute('role'), 'tooltip');
  assert.equal(panel.getAttribute('popover'), 'manual', 'manual: opening it never light-dismisses another popover');
  assert.equal(button.querySelector('svg').getAttribute('aria-hidden'), 'true');
  unmount();
});

test('a click opens and pins it; Esc and a press outside close it', () => {
  const { host, unmount } = mount(h(ui.InfoTip, { content: 'Help.', label: 'About: x' }));
  const tip = host.querySelector('.uix-info-tip');
  const button = tip.querySelector('button');
  const isOpen = () => tip.hasAttribute('data-open');

  act(() => button.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true })));
  click(button);
  assert.ok(isOpen(), 'click opens');
  click(button);
  assert.ok(!isOpen(), 'second click closes');

  click(button);
  key(button, 'Escape');
  assert.ok(!isOpen(), 'Esc on the button closes');

  click(button);
  act(() => document.body.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true })));
  assert.ok(!isOpen(), 'a press outside closes');

  click(button);
  act(() => tip.querySelector('.uix-info-tip__panel p').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true })));
  assert.ok(isOpen(), 'a press inside the panel keeps it open');
  unmount();
});

test('Esc on the ? does not reach an enclosing dialog', () => {
  let outer = 0;
  const { host, unmount } = mount(h('div', { onKeyDown: (e) => { if (e.key === 'Escape') outer += 1; } },
    h(ui.InfoTip, { content: 'Help.', label: 'About: x' })));
  const button = host.querySelector('button');
  click(button);
  key(button, 'Escape');
  assert.equal(outer, 0, 'the open panel consumed Esc');
  key(button, 'Escape');
  assert.equal(outer, 1, 'with the panel closed, Esc bubbles as usual');
  unmount();
});

test('Field: the ? renders outside the <label>, label.control stays the input, the marker comes after the ?', () => {
  const { host, unmount } = mount(h(ui.Field, { label: 'Impact', required: true, help: 'How many people are affected.' },
    h('input', { className: 'uix-input' })));
  const label = host.querySelector('label');
  const input = host.querySelector('input');
  assert.equal(label.querySelector('button'), null, 'the label contains no button');
  assert.equal(label.control, input, 'clicking the label focuses the input, not the ?');
  assert.equal(label.textContent, 'Impact');
  assert.ok(!label.hasAttribute('data-required'), 'no ::after marker inside the label');

  const row = host.querySelector('.uix-field__label-row');
  const order = [...row.children].map((el) => el.className);
  assert.deepEqual(order, ['uix-field__label', 'uix-info-tip', 'uix-field__required']);
  assert.equal(row.querySelector('.uix-field__required').getAttribute('aria-hidden'), 'true');
  assert.equal(input.getAttribute('aria-required'), 'true', 'required is still announced from the control');
  assert.equal(row.querySelector('button').getAttribute('aria-label'), 'About: Impact');
  unmount();
});

test('Field without help (or with blank help) keeps its label markup unchanged', () => {
  for (const help of [undefined, null, '', '   ']) {
    const { host, unmount } = mount(h(ui.Field, { label: 'Impact', required: true, help }, h('input')));
    assert.equal(host.querySelector('.uix-field__label-row'), null);
    assert.equal(host.querySelector('.uix-info-tip'), null);
    const label = host.querySelector('.uix-field > label.uix-field__label');
    assert.ok(label.hasAttribute('data-required'));
    assert.equal(label.control, host.querySelector('input'));
    unmount();
  }
});

test('PageHeader, Card and SectionHead put the ? after the title, outside the heading', () => {
  const cases = [
    [h(ui.PageHeader, { title: 'Incidents', help: 'Unplanned interruptions.\n\nTrack and restore.' }), 'h1'],
    [h(ui.Card, { title: 'Open work', titleAs: 'h2', help: 'What is waiting on you.' }, 'body'), 'h2'],
    [h(ui.SectionHead, { title: 'Latest news', help: 'Posts from the last 30 days.' }), 'h2'],
  ];
  for (const [element, tag] of cases) {
    const { host, unmount } = mount(element);
    const heading = host.querySelector(tag);
    assert.equal(heading.querySelector('button'), null, `${tag}: no button inside the heading`);
    const button = heading.nextElementSibling?.querySelector('button.uix-info-tip__button');
    assert.ok(button, `${tag}: the ? follows the heading`);
    assert.equal(button.getAttribute('aria-label'), `About: ${heading.textContent}`);
    unmount();
  }
});

test('helpLabel overrides the default name; blank help renders no row', () => {
  const { host, unmount } = mount(h(ui.PageHeader, { title: 'Störungen', help: 'Hilfe.', helpLabel: 'Info: Störungen' }));
  assert.equal(host.querySelector('.uix-info-tip__button').getAttribute('aria-label'), 'Info: Störungen');
  unmount();

  for (const element of [
    h(ui.PageHeader, { title: 'Incidents', help: '  ' }),
    h(ui.Card, { title: 'Open work', help: null }, 'body'),
    h(ui.SectionHead, { title: 'News', help: '' }),
  ]) {
    const m = mount(element);
    assert.equal(m.host.querySelector('.uix-info-tip, [class*="title-row"]'), null);
    m.unmount();
  }
});
