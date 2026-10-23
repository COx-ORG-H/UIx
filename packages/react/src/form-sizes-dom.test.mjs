/* Input, Select and Textarea take size="lg" (HAR-1812), the 44 px public size Button already has.
 * The heights themselves are measured in a browser: tests/a11y/form-fields.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ui from '../dist/index.js';

const css = (name) => readFileSync(new URL(`../../tokens/styles/components/${name}.css`, import.meta.url), 'utf8');
const classOf = (html, tag) => new RegExp(`<${tag}[^>]*class="([^"]*)"`).exec(html)?.[1] ?? '';

test('Input: sm, md (no modifier) and lg', () => {
  assert.equal(classOf(renderToStaticMarkup(h(ui.Input, { size: 'sm' })), 'input'), 'uix-input uix-input--sm');
  assert.equal(classOf(renderToStaticMarkup(h(ui.Input, {})), 'input'), 'uix-input');
  assert.equal(classOf(renderToStaticMarkup(h(ui.Input, { size: 'lg', className: 'x' })), 'input'), 'uix-input uix-input--lg x');
});

test('Select: the trigger carries the size', () => {
  assert.match(classOf(renderToStaticMarkup(h(ui.Select, { size: 'lg', options: [{ value: 'a', label: 'A' }] })), 'button'), /^uix-select uix-select--lg$/);
  assert.match(classOf(renderToStaticMarkup(h(ui.Select, { size: 'sm', options: [{ value: 'a', label: 'A' }] })), 'button'), /^uix-select uix-select--sm$/);
  assert.match(classOf(renderToStaticMarkup(h(ui.Select, { options: [{ value: 'a', label: 'A' }] })), 'button'), /^uix-select$/);
});

test('Textarea: lg, and md by default', () => {
  assert.equal(classOf(renderToStaticMarkup(h(ui.Textarea, { size: 'lg' })), 'textarea'), 'uix-textarea uix-textarea--lg');
  assert.equal(classOf(renderToStaticMarkup(h(ui.Textarea, {})), 'textarea'), 'uix-textarea');
});

test('the lg rules are 44 px, as .uix-btn--lg is, and InputGroup clears its icons at lg', () => {
  assert.match(css('button'), /\.uix-btn--lg \{ height: 44px;/);
  assert.match(css('input'), /\.uix-input--lg \{ height: 44px;/);
  assert.match(css('select'), /\.uix-select--lg \{ height: 44px;/);
  assert.match(css('input'), /\.uix-input-group--has-leading > \.uix-input--lg \{ padding-left: 44px; \}/);
  assert.match(css('input'), /\.uix-input-group--has-trailing > \.uix-input--lg \{ padding-right: 44px; \}/);
  // the textarea's own floor (84 px) already clears 44 px; lg must not lower it
  assert.match(css('textarea'), /\.uix-textarea \{[^}]*min-height: 84px/);
  assert.doesNotMatch(/\.uix-textarea--lg \{[^}]*\}/.exec(css('textarea'))[0], /min-height|height:/);
});
