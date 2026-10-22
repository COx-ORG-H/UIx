/* A Stat that leads somewhere looks it at rest (HAR-1803): a link tile draws a trailing chevron,
 * an in-place action tile is `.uix-stat--action` (its value underlined), a plain figure tile is
 * unchanged. Measured at rest, on a touch device and in forced colours by
 * tests/a11y/stat-link.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Stat } from '../dist/index.js';

test('a link Stat carries a trailing chevron in its label row; a figure tile does not', () => {
  const link = renderToStaticMarkup(h(Stat, { label: 'Overdue', value: 4, href: '/loans?overdue' }));
  assert.match(link, /^<a href="\/loans\?overdue" class="uix-stat uix-stat--interactive uix-stat--link"><span class="uix-stat__label"><span>Overdue<\/span><span class="uix-stat__go" aria-hidden="true"><svg [^>]*class="uix-icon"[^>]*><path d="m9 18 6-6-6-6"><\/path><\/svg><\/span><\/span>/);
  const routed = renderToStaticMarkup(h(Stat, { label: 'Overdue', value: 4, href: '/x', renderLink: (p) => h('a', { ...p, 'data-router': '' }) }));
  assert.match(routed, /uix-stat__go/);
  const figure = renderToStaticMarkup(h(Stat, { label: 'Overdue', value: 4 }));
  assert.equal(figure, '<div class="uix-stat"><div class="uix-stat__label"><span>Overdue</span></div><div class="uix-stat__value">4</div></div>', 'the plain tile is unchanged');
});

test('an in-place action tile is marked uix-stat--action; popup tiles keep the down chevron', () => {
  const action = renderToStaticMarkup(h(Stat, { label: 'State', value: 'Open', onActivate() {}, haspopup: false }));
  assert.match(action, /^<button type="button" class="uix-stat uix-stat--interactive uix-stat--action"/);
  assert.doesNotMatch(action, /uix-stat__(chevron|go)/);
  const dialog = renderToStaticMarkup(h(Stat, { label: 'Priority', value: 'P1', onActivate() {} }));
  assert.match(dialog, /class="uix-stat uix-stat--interactive" aria-haspopup="dialog"/);
  assert.match(dialog, /uix-stat__chevron/);
  assert.doesNotMatch(dialog, /uix-stat__go|uix-stat--action/);
});
