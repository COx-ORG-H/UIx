/* Tabs overflow="scroll", the toned / compact / interactive Stat, and CopyButton.
 * The markup contract is checked on the built package; browser behaviour (scrolling,
 * keyboard, the clipboard announcement) is in tests/a11y/operator-primitives.spec.mjs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { copyText } from './copy-model.ts';
import { CopyButton, Stat, Tab, TabPanel, Tabs } from '../dist/index.js';
import { STAT_ROW_TILES, TENSOR_GAP_SPECIMENS, statRowTile } from '../../tokens/docs/tensor-gap-specimens.js';

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

test('a pending interactive Stat is busy and aria-disabled, never natively disabled (HAR-1753)', () => {
  const tag = (props) => renderToStaticMarkup(h(Stat, { label: 'State', value: 'Open', onActivate() {}, ...props })).match(/^<button[^>]*>/)[0];
  const pending = tag({ pending: true, expanded: false });
  assert.match(pending, /aria-busy="true"/);
  assert.match(pending, /aria-disabled="true"/);
  assert.doesNotMatch(pending, /\sdisabled[\s=>]/, 'a disabled button drops out of the tab order and loses focus');
  assert.doesNotMatch(pending, /tabindex/);
  // the rest of the button is what it was
  assert.match(pending, /^<button type="button" class="uix-stat uix-stat--interactive" aria-haspopup="dialog" aria-expanded="false"/);
  assert.doesNotMatch(tag({}), /aria-busy|aria-disabled/);
  assert.doesNotMatch(tag({ pending: false }), /aria-busy|aria-disabled/);
});

test('read-only and link Stats ignore pending, and the prop never reaches the DOM', () => {
  assert.equal(
    renderToStaticMarkup(h(Stat, { label: 'Open', value: '12', pending: true })),
    '<div class="uix-stat"><div class="uix-stat__label"><span>Open</span></div><div class="uix-stat__value">12</div></div>',
  );
  const link = renderToStaticMarkup(h(Stat, { label: 'Open', value: '12', href: '/open', pending: true }));
  assert.match(link, /^<a href="\/open" class="uix-stat uix-stat--interactive uix-stat--link">/);
  assert.doesNotMatch(link, /aria-busy|aria-disabled|pending/);
});

test('the docs stat-row specimen is the markup Stat renders: a div, three buttons, a link and a pending tile', () => {
  const block = TENSOR_GAP_SPECIMENS['examples-data-display'];
  const row = block.slice(block.indexOf('<div data-stat-row-example'));
  for (const tile of STAT_ROW_TILES) {
    const { id, action, ...props } = tile;
    const rendered = renderToStaticMarkup(h(Stat, {
      size: 'compact', ...props, ...(id ? { onActivate() {}, activateLabel: action, expanded: tile.haspopup === false ? undefined : false } : null),
    }));
    // useId's value differs by React version; the specimen names its ids
    const reactId = rendered.match(/id="([^"]+)-sep"/)?.[1];
    const expected = reactId ? rendered.replaceAll(reactId, id) : rendered;
    assert.equal(statRowTile(tile), expected, `${tile.label} tile`);
    assert.ok(row.includes(expected), `${tile.label} tile is on the page`);
  }
  assert.deepEqual(
    [...row.matchAll(/<(div|button|a) [^>]*class="uix-stat /g)].map((m) => m[1]),
    ['div', 'button', 'button', 'button', 'a', 'button'],
  );
  assert.equal((row.match(/aria-busy="true" aria-disabled="true"/g) ?? []).length, 1, 'one pending tile');
  // unequal content: no meta, a one-line meta and a meta long enough to wrap
  assert.deepEqual(STAT_ROW_TILES.map((t) => (t.meta ?? '').length > 30 ? 'long' : t.meta ? 'short' : 'none'), ['none', 'long', 'short', 'none', 'none', 'short']);
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
