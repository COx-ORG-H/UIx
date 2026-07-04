/* Unit tests for the pure search helpers. Run: node --test docs/search.test.js (zero deps).
   No DOM: search.js's DOM wiring is guarded by `typeof document`, so importing here is DOM-free. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, buildIndex, scoreEntry, matchComponents } from './search.js';

const CATALOG = [
  { name: 'Button', slug: 'button', category: 'Form controls' },
  { name: 'Input', slug: 'input', category: 'Form controls' },
  { name: 'Table', slug: 'table', category: 'Data display', keywords: ['grid', 'rows'] },
  { name: 'Status Pill', slug: 'status-pill', category: 'Data display' },
];

test('norm: trims and lowercases', () => {
  assert.equal(norm('  Button '), 'button');
  assert.equal(norm(null), '');
});

test('buildIndex: normalises name/slug/category/keywords', () => {
  const idx = buildIndex(CATALOG);
  assert.equal(idx.length, 4);
  const table = idx.find((e) => e.slug === 'table');
  assert.equal(table._name, 'table');
  assert.equal(table._category, 'data display');
  assert.deepEqual(table._keywords, ['grid', 'rows']);
});

test('buildIndex: derives slug from name when absent, drops empties', () => {
  const idx = buildIndex([{ name: 'App Shell' }, {}, null]);
  assert.equal(idx.length, 1);
  assert.equal(idx[0].slug, 'app-shell');
});

test('buildIndex: tolerates non-array input', () => {
  assert.deepEqual(buildIndex(undefined), []);
  assert.deepEqual(buildIndex('nope'), []);
});

test('scoreEntry: name > category > keyword tiers', () => {
  const [button, , table] = buildIndex(CATALOG);
  assert.equal(scoreEntry(button, 'button'), 100); // exact name
  assert.equal(scoreEntry(button, 'butt'), 80); // name prefix
  assert.ok(scoreEntry(table, 'data display') === 40); // category
  assert.equal(scoreEntry(table, 'grid'), 20); // keyword
  assert.equal(scoreEntry(button, 'zzz'), 0); // no match
});

test('matchComponents: empty query returns full index in order', () => {
  const idx = buildIndex(CATALOG);
  assert.deepEqual(matchComponents(idx, '').map((e) => e.slug), ['button', 'input', 'table', 'status-pill']);
});

test('matchComponents: ranks name matches above category matches', () => {
  const idx = buildIndex(CATALOG);
  // "in" matches Input (name includes) and nothing by category; Button? no.
  const res = matchComponents(idx, 'in');
  assert.equal(res[0].slug, 'input');
});

test('matchComponents: category query surfaces the whole category', () => {
  const idx = buildIndex(CATALOG);
  const res = matchComponents(idx, 'data display').map((e) => e.slug);
  assert.deepEqual(res.sort(), ['status-pill', 'table']);
});

test('matchComponents: keyword-only hit is found but ranked last', () => {
  const idx = buildIndex(CATALOG);
  const res = matchComponents(idx, 'rows');
  assert.equal(res.length, 1);
  assert.equal(res[0].slug, 'table');
});

test('matchComponents: no matches → empty array', () => {
  const idx = buildIndex(CATALOG);
  assert.deepEqual(matchComponents(idx, 'zzz'), []);
});
