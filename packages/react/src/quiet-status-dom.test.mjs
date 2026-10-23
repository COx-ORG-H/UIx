/* Quiet status defaults (HAR-1563, colour K2): StatusPill `treatment` dot / outline / soft
 * (`filled` is an alias), the `progress` tone, and Stat `trend.sentiment`. The colours are
 * pinned in packages/tokens/tests/quiet-status.test.mjs and measured in Chromium by
 * tests/a11y/quiet-status.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusPill, Stat } from '../dist/index.js';

const pill = (props, text = 'Blocked') => renderToStaticMarkup(h(StatusPill, props, text));

test('soft is the default and filled is its alias: same markup, no treatment class', () => {
  const plain = pill({ tone: 'danger' });
  assert.equal(plain, '<span class="uix-pill uix-pill--danger">Blocked</span>');
  assert.equal(pill({ tone: 'danger', treatment: 'soft' }), plain);
  assert.equal(pill({ tone: 'danger', treatment: 'filled' }), plain);
});

test('dot and outline add their class and always draw the dot, hidden from assistive tech', () => {
  for (const treatment of ['dot', 'outline']) {
    assert.equal(
      pill({ tone: 'danger', treatment }),
      `<span class="uix-pill uix-pill--danger uix-pill--${treatment}"><span class="uix-pill__dot" aria-hidden="true"></span>Blocked</span>`,
    );
    // an explicit dot={false} cannot take away the only mark of the tone
    assert.match(pill({ tone: 'info', treatment, dot: false }), /uix-pill__dot/);
  }
  assert.equal(pill({ tone: 'danger', treatment: 'dot', size: 'sm' }), '<span class="uix-pill uix-pill--danger uix-pill--dot uix-pill--sm"><span class="uix-pill__dot" aria-hidden="true"></span>Blocked</span>');
});

test('progress is a tone of its own name', () => {
  assert.equal(pill({ tone: 'progress', treatment: 'dot' }, 'In progress'), '<span class="uix-pill uix-pill--progress uix-pill--dot"><span class="uix-pill__dot" aria-hidden="true"></span>In progress</span>');
});

const trend = (t) => renderToStaticMarkup(h(Stat, { label: 'Breached SLAs', value: 7, trend: t })).match(/<span class="uix-stat__trend[^"]*"/)[0];

test('a trend without sentiment is neutral: only its direction class, whichever way it moved', () => {
  assert.equal(trend({ direction: 'up', label: '2' }), '<span class="uix-stat__trend uix-stat__trend--up"');
  assert.equal(trend({ direction: 'down', label: '2' }), '<span class="uix-stat__trend uix-stat__trend--down"');
  assert.equal(trend({ direction: 'up', label: '2', sentiment: 'neutral' }), '<span class="uix-stat__trend uix-stat__trend--up"');
});

test('sentiment colours the trend, independent of direction', () => {
  assert.equal(trend({ direction: 'up', label: '2', sentiment: 'negative' }), '<span class="uix-stat__trend uix-stat__trend--up uix-stat__trend--negative"');
  assert.equal(trend({ direction: 'down', label: '3', sentiment: 'positive' }), '<span class="uix-stat__trend uix-stat__trend--down uix-stat__trend--positive"');
  // the spoken direction is unchanged
  assert.match(renderToStaticMarkup(h(Stat, { label: 'x', value: 1, trend: { direction: 'up', label: '2', sentiment: 'negative' } })), /<span class="uix-visually-hidden">up<\/span>2/);
});
