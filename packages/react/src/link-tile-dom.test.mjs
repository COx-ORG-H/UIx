/* LinkTile (HAR-3095): one anchor per tile; the title names it and the description describes it;
 * the icon and the arrow are hidden from screen readers; a line limit clamps the description; a
 * router link renders the same anchor. The layout in a browser: tests/a11y/link-tile.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LinkTile } from '../dist/index.js';

const icon = h('svg', { viewBox: '0 0 24 24' }, h('circle', { cx: 12, cy: 12, r: 8 }));

test('one anchor: title names it, description describes it, icon and arrow aria-hidden', () => {
  const html = renderToStaticMarkup(h(LinkTile, { href: '/settings/users', icon, title: 'Benutzer', description: 'Mitglieder einladen, Rollen vergeben.' }));
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  const a = /<a [^>]*>/.exec(html)[0];
  assert.match(a, /class="uix-card uix-card--interactive uix-link-tile"/);
  assert.match(a, /href="\/settings\/users"/);
  const named = /aria-labelledby="([^"]+)"/.exec(a)[1];
  const described = /aria-describedby="([^"]+)"/.exec(a)[1];
  assert.match(html, new RegExp(`<h3 id="${named}" class="uix-link-tile__title">Benutzer</h3>`));
  assert.match(html, new RegExp(`<span id="${described}" class="uix-link-tile__description">Mitglieder einladen, Rollen vergeben\.</span>`));
  assert.match(html, /<span class="uix-link-tile__icon" aria-hidden="true"><svg/);
  assert.match(html, /<span class="uix-link-tile__arrow" aria-hidden="true"><svg[^>]*class="uix-icon uix-icon--sm"/);
  assert.match(html, /<span class="uix-card__body uix-link-tile__body">/);
});

test('without a description there is no aria-describedby; without an icon no icon box', () => {
  const html = renderToStaticMarkup(h(LinkTile, { href: '/x', title: 'Nur Titel' }));
  assert.doesNotMatch(html, /aria-describedby|uix-link-tile__description|uix-link-tile__icon/);
  assert.match(html, /uix-link-tile__arrow/);
});

test('descriptionLines clamps; a fraction rounds down, under 1 or not finite does not clamp; titleAs picks the element', () => {
  assert.match(renderToStaticMarkup(h(LinkTile, { href: '/x', title: 'T', description: 'D', descriptionLines: 2.7 })), /data-clamped="" style="--uix-link-tile-lines:2"/);
  for (const n of [0, 0.5, Infinity, Number.NaN]) {
    assert.doesNotMatch(renderToStaticMarkup(h(LinkTile, { href: '/x', title: 'T', description: 'D', descriptionLines: n })), /data-clamped/, String(n));
  }
  assert.match(renderToStaticMarkup(h(LinkTile, { href: '/x', title: 'T', titleAs: 'span' })), /<span id="[^"]+" class="uix-link-tile__title">T<\/span>/);
});

test('renderLink renders the router link with the same class, name and description', () => {
  const renderLink = ({ href, children, ...rest }) => h('a', { ...rest, href, 'data-router': '' }, children);
  const html = renderToStaticMarkup(h(LinkTile, { href: '/r', title: 'Router', description: 'd', renderLink }));
  assert.match(html, /<a [^>]*data-router=""/);
  assert.match(html, /aria-labelledby="[^"]+"/);
  assert.match(html, /class="uix-card uix-card--interactive uix-link-tile"/);
});
