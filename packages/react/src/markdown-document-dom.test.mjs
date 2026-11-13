/* Markdown as a document (HAR-3096): an article whose title is the page <h1> renders its `#` as <h2>
 * and `##` as <h3> in `.uix-prose--document`, so its sections are at least as prominent as a
 * SectionHead after the body; inline Markdown (comments, notes) keeps `#` at <h3> and `##` at <h4>.
 * The sizes in a browser: tests/a11y/markdown-document.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '../dist/markdown.js';

const ARTICLE = '# VPN trennt\n\n## Fehlerbild\n\nDie Verbindung bricht ab.\n\n### Details\n\nNach 30 Minuten.';
const render = (props) => renderToStaticMarkup(h(Markdown, props, ARTICLE));

test('inline (the default): # is <h3>, ## is <h4>, ### is <h5>, in plain .uix-prose', () => {
  const html = render({});
  assert.match(html, /^<div class="uix-prose uix-markdown" data-component="markdown">/);
  assert.match(html, /<h3>VPN trennt<\/h3>/);
  assert.match(html, /<h4>Fehlerbild<\/h4>/);
  assert.match(html, /<h5>Details<\/h5>/);
  assert.doesNotMatch(html, /uix-prose--document|<h2/);
});

test('document: # is <h2>, ## is <h3>, ### is <h4>, in .uix-prose--document', () => {
  const html = render({ variant: 'document' });
  assert.match(html, /^<div class="uix-prose uix-prose--document uix-markdown" data-component="markdown">/);
  assert.match(html, /<h2>VPN trennt<\/h2>/);
  assert.match(html, /<h3>Fehlerbild<\/h3>/);
  assert.match(html, /<h4>Details<\/h4>/);
});

test('an explicit headingOffset still wins over the variant; levels stay within h1..h6', () => {
  assert.match(render({ variant: 'document', headingOffset: 2 }), /<h3>VPN trennt<\/h3>/);
  assert.match(render({ headingOffset: 0 }), /<h1>VPN trennt<\/h1>/);
  assert.match(renderToStaticMarkup(h(Markdown, { headingOffset: 9 }, '# x')), /<h6>x<\/h6>/);
});
