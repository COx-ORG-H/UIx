/* Inset (HAR-1818): a bordered, sunken well inside a card body. The look is pinned in
 * tests/a11y/inset.spec.mjs (border, radius, background, padding, nothing nested in it that a
 * card would add). Renders the BUILT dist — run `npm run build` first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card, Inset } from '../dist/index.js';

test('Inset is one div with the well class; md and sunken add nothing', () => {
  assert.equal(renderToStaticMarkup(h(Inset, null, 'x')), '<div class="uix-inset">x</div>');
  assert.equal(renderToStaticMarkup(h(Inset, { padding: 'md', tone: 'sunken' }, 'x')), '<div class="uix-inset">x</div>');
});

test('sm padding, the surface tone, a class and attributes pass through', () => {
  assert.equal(
    renderToStaticMarkup(h(Inset, { padding: 'sm', tone: 'surface', className: 'mine', role: 'group', 'aria-label': 'Header preview' }, 'x')),
    '<div class="uix-inset uix-inset--sm uix-inset--surface mine" role="group" aria-label="Header preview">x</div>',
  );
});

test('inside a Card it sits in the body, with no card markup of its own', () => {
  const html = renderToStaticMarkup(h(Card, { title: 'Current' }, h(Inset, null, 'preview')));
  assert.match(html, /<div class="uix-card__body"><div class="uix-inset">preview<\/div><\/div>/);
  assert.equal((html.match(/uix-card"/g) ?? []).length, 1, 'one card, not two');
});
