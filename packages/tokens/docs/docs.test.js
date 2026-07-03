/* Unit tests for the pure helpers in docs.js. Run: node --test docs/docs.test.js  (zero deps).
   Mirrors guide/app.test.js: node:test + node:assert/strict, imports the ESM helpers directly.
   The module's DOM block is guarded by `typeof document`, so importing it here is DOM-free. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, componentNav, renderPropsTable, esc } from './docs.js';

test('slugify: lowercases, hyphenates, trims edges', () => {
  assert.equal(slugify('Button'), 'button');
  assert.equal(slugify('Status Pill'), 'status-pill');
  assert.equal(slugify('  App  Shell  '), 'app-shell');
  assert.equal(slugify('Tabs / Nav'), 'tabs-nav');
  assert.equal(slugify('Input(v2)!'), 'input-v2');
});

test('slugify: collapses runs and strips leading/trailing separators', () => {
  assert.equal(slugify('--Foo--Bar--'), 'foo-bar');
  assert.equal(slugify('a   b'), 'a-b');
  assert.equal(slugify(''), '');
});

test('componentNav: strings → {name, slug, href, group:null}', () => {
  assert.deepEqual(componentNav(['Button', 'Status Pill']), [
    { name: 'Button', slug: 'button', href: '#button', group: null },
    { name: 'Status Pill', slug: 'status-pill', href: '#status-pill', group: null },
  ]);
});

test('componentNav: objects carry a group through', () => {
  assert.deepEqual(componentNav([{ name: 'Table', group: 'Data display' }]), [
    { name: 'Table', slug: 'table', href: '#table', group: 'Data display' },
  ]);
});

test('componentNav: empty/absent list → empty array', () => {
  assert.deepEqual(componentNav([]), []);
  assert.deepEqual(componentNav(), []);
});

test('renderPropsTable: empty → muted note, not a table', () => {
  const html = renderPropsTable([]);
  assert.match(html, /No props documented\./);
  assert.doesNotMatch(html, /<table/);
  assert.equal(renderPropsTable(), renderPropsTable([]));
});

test('renderPropsTable: builds a header + one row per prop', () => {
  const html = renderPropsTable([
    { name: 'variant', type: "'primary' | 'ghost'", default: 'primary', description: 'Visual style' },
    { name: 'disabled', type: 'boolean' },
  ]);
  assert.match(html, /<table class="uix-table">/);
  assert.match(html, /<th scope="col">Prop<\/th>/);
  assert.match(html, /variant/);
  assert.match(html, /disabled/);
  // exactly two body rows
  assert.equal((html.match(/<tr>/g) || []).length, 3); // 1 header row + 2 body rows
});

test('renderPropsTable: missing type/default render as em dash', () => {
  const html = renderPropsTable([{ name: 'onClick' }]);
  assert.match(html, /<td>—<\/td>/);
});

test('renderPropsTable: required flag renders a marker', () => {
  const html = renderPropsTable([{ name: 'id', type: 'string', required: true }]);
  assert.match(html, /uix-docs__req/);
});

test('renderPropsTable: escapes HTML in every field (no injection)', () => {
  const html = renderPropsTable([
    { name: '<x>', type: '<T>', default: '<d>', description: '<script>alert(1)</script>' },
  ]);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;x&gt;/);
  assert.match(html, /&lt;T&gt;/);
});

test('esc: escapes the five HTML-significant characters', () => {
  assert.equal(esc(`<a href="x" data='y'>&`), '&lt;a href=&quot;x&quot; data=&#39;y&#39;&gt;&amp;');
});
