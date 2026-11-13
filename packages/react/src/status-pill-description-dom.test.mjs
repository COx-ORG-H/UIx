/* A StatusPill that explains itself (HAR-3109): with `description` it is a focus stop inside a kit
 * Tooltip (the bubble is its aria-describedby), with no button role; without it the markup is as
 * before. Hover and keyboard focus in a browser: tests/a11y/status-pill-description.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusPill } from '../dist/index.js';

test('without a description the pill renders exactly as before: no tab stop, no tooltip', () => {
  assert.equal(renderToStaticMarkup(h(StatusPill, { tone: 'warning' }, 'Frustriert')), '<span class="uix-pill uix-pill--warning">Frustriert</span>');
  assert.equal(renderToStaticMarkup(h(StatusPill, { tone: 'warning', description: '' }, 'Frustriert')), '<span class="uix-pill uix-pill--warning">Frustriert</span>', 'an empty description is none');
});

test('with a description: a focus stop in a Tooltip, the bubble its description, no button role', () => {
  const html = renderToStaticMarkup(h(StatusPill, { tone: 'warning', description: 'Aus den letzten drei Antworten geschätzt.' }, 'Frustriert'));
  const pill = /<span class="uix-pill uix-pill--warning uix-pill--described"[^>]*>/.exec(html)?.[0];
  assert.ok(pill, html);
  assert.match(pill, /tabindex="0"|tabIndex="0"/i);
  assert.doesNotMatch(pill, /role=/);
  const describedBy = /aria-describedby="([^"]+)"/.exec(pill)?.[1];
  assert.ok(describedBy, 'the pill is described by the bubble');
  assert.match(html, new RegExp(`id="${describedBy}"[^>]*role="tooltip"|role="tooltip"[^>]*id="${describedBy}"`));
  assert.match(html, /Aus den letzten drei Antworten geschätzt\./);
});

test('the product can still pass its own props and class; its tabIndex wins', () => {
  const html = renderToStaticMarkup(h(StatusPill, { description: 'x', className: 'mine', tabIndex: -1, 'data-x': '1' }, 'P'));
  assert.match(html, /class="uix-pill uix-pill--neutral uix-pill--described mine"/);
  assert.match(html, /tabindex="-1"/i);
  assert.match(html, /data-x="1"/);
});
