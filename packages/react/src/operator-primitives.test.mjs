/* Tabs overflow="scroll", the toned / compact / interactive Stat, and CopyButton.
 * The markup contract is checked on the built package; browser behaviour (scrolling,
 * keyboard, the clipboard announcement) is in tests/a11y/operator-primitives.spec.mjs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { copyText } from './copy-model.ts';
import { CopyButton, Stat, Tab, TabPanel, Tabs } from '../dist/index.js';

test('copyText resolves true when the clipboard accepts the value', async () => {
  const written = [];
  const ok = await copyText('ada@example.com', { writeText: async (text) => { written.push(text); } });
  assert.equal(ok, true);
  assert.deepEqual(written, ['ada@example.com']);
});

test('copyText resolves false, without throwing, when the write is refused or impossible', async () => {
  assert.equal(await copyText('x', { writeText: async () => { throw new DOMException('denied', 'NotAllowedError'); } }), false);
  assert.equal(await copyText('x', undefined), false);
  assert.equal(await copyText('x', {}), false);
});

const tabs = (props) => renderToStaticMarkup(h(Tabs, { value: 'a', onChange() {}, ...props },
  h(Tab, { value: 'a' }, 'Alpha'), h(Tab, { value: 'b' }, 'Beta'), h(TabPanel, { value: 'a' }, 'Panel A')));

test('Tabs default overflow keeps the plain tablist markup', () => {
  const html = tabs({});
  assert.ok(html.startsWith('<div role="tablist" class="uix-tabs uix-tabs--line">'));
  assert.doesNotMatch(html, /uix-tabs-scroller/);
});

test('Tabs overflow="scroll" wraps the tablist with pointer-only edge buttons', () => {
  const html = tabs({ overflow: 'scroll', variant: 'pill' });
  assert.match(html, /^<div class="uix-tabs-scroller">/);
  assert.match(html, /class="uix-tabs uix-tabs--pill uix-tabs--scroll"/);
  const edges = html.match(/<button[^>]*uix-tabs-scroller__(?:prev|next)[^>]*>/g);
  assert.equal(edges.length, 2);
  for (const edge of edges) {
    assert.match(edge, /aria-hidden="true"/);
    assert.match(edge, /tabindex="-1"/);
    assert.match(edge, /hidden=""/); // nothing overflows until measured in a browser
  }
  // the panel is still hoisted out of the tablist and the scroller
  assert.match(html, /<\/div><div role="tabpanel"[^>]*>Panel A<\/div>$/);
});

test('Stat defaults render the unchanged neutral hero tile', () => {
  const html = renderToStaticMarkup(h(Stat, { label: 'Open', value: '12' }));
  assert.equal(html, '<div class="uix-stat"><div class="uix-stat__label"><span>Open</span></div><div class="uix-stat__value">12</div></div>');
});

test('Stat tone and size add modifier classes; neutral and hero add none', () => {
  const html = renderToStaticMarkup(h(Stat, { label: 'SLA', value: '2h left', tone: 'danger', size: 'compact' }));
  assert.match(html, /^<div class="uix-stat uix-stat--danger uix-stat--compact">/);
  assert.doesNotMatch(renderToStaticMarkup(h(Stat, { label: 'x', value: 'y', tone: 'neutral', size: 'hero' })), /uix-stat--/);
});

test('interactive Stat is a dialog-opening button named "label: value, action"', () => {
  const html = renderToStaticMarkup(h(Stat, {
    label: 'Priority', value: 'P1', meta: 'Raised by the SLA policy', onActivate() {}, activateLabel: 'change', expanded: false, tone: 'warning',
  }));
  assert.match(html, /^<button type="button" class="uix-stat uix-stat--warning uix-stat--interactive" aria-haspopup="dialog" aria-expanded="false"/);
  const labelledby = html.match(/aria-labelledby="([^"]+)"/)[1].split(' ');
  assert.equal(labelledby.length, 4);
  const text = (id) => html.match(new RegExp(`id="${id}"[^>]*>([^<]*)<`))[1];
  assert.deepEqual(labelledby.map(text), ['Priority', ':', 'P1', ', change']);
  const describedby = html.match(/aria-describedby="([^"]+)"/)[1];
  assert.equal(text(describedby), 'Raised by the SLA policy');
  assert.match(html, /class="uix-stat__chevron" aria-hidden="true"/);
  // phrasing content only inside the button
  assert.doesNotMatch(html, /<div/);
});

test('interactive Stat omits aria-expanded when the prop is not given', () => {
  const html = renderToStaticMarkup(h(Stat, { label: 'Status', value: 'Open', onActivate() {} }));
  assert.doesNotMatch(html, /aria-expanded/);
  assert.doesNotMatch(html, /aria-describedby/);
});

test('Stat forwards its ref (forwardRef) for popover anchoring', () => {
  assert.equal(Stat.$$typeof, Symbol.for('react.forward_ref'));
  // rendering with a ref must not throw on the server
  renderToStaticMarkup(h(Stat, { label: 'a', value: 'b', onActivate() {}, ref: createRef() }));
});

test('CopyButton renders a named icon button and an empty polite status', () => {
  const html = renderToStaticMarkup(h(CopyButton, { value: 'x', label: 'Copy email', copiedLabel: 'Copied' }));
  assert.match(html, /^<button type="button" class="uix-btn uix-btn--ghost uix-btn--icon uix-btn--sm uix-copy-button" aria-label="Copy email">/);
  assert.match(html, /<span role="status" class="uix-visually-hidden"><\/span>$/);
  assert.doesNotMatch(html, /data-copied/);
});
