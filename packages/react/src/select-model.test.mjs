/* HAR-1572 — the pure Select model: flattening, APG movement, typeahead, filtering.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSelectModel, moveActive, typeahead, filterSelectItems, firstEnabled, lastEnabled, toggleValue, toValueList } from '../dist/select-model.js';

const items = [
  { value: '', label: 'Choose', hidden: true },
  { value: 'new', label: 'New' },
  { label: 'Active', options: [{ value: 'open', label: 'Open' }, { value: 'blocked', label: 'Blocked', disabled: true }, { value: 'prog', label: 'In progress' }] },
  { label: 'Archived', disabled: true, options: [{ value: 'old', label: 'Old' }] },
  { value: 'solved', label: 'Solved' },
  { value: 'spam', label: 'Spam' },
  { value: 'sla', label: 'Šla', keywords: ['breach'] },
];
const { entries, sections, all } = buildSelectModel(items);
const labels = (idx) => entries[idx]?.option.label;

test('flattening keeps order, leaves hidden options out of the list, and disables a whole group', () => {
  assert.deepEqual(entries.map((e) => e.option.label), ['New', 'Open', 'Blocked', 'In progress', 'Old', 'Solved', 'Spam', 'Šla']);
  assert.equal(all.length, 9);
  assert.deepEqual(sections.map((s) => s.label ?? null), [null, 'Active', 'Archived', null]);
  assert.deepEqual(entries.filter((e) => e.disabled).map((e) => e.option.label), ['Blocked', 'Old']);
});

test('movement skips disabled options, stops at the ends, and pages by 10', () => {
  assert.equal(labels(moveActive(entries, 1, 1)), 'In progress');
  assert.equal(labels(moveActive(entries, 3, 1)), 'Solved');
  assert.equal(labels(moveActive(entries, 7, 1)), 'Šla', 'no wrap at the end');
  assert.equal(labels(moveActive(entries, 0, -1)), 'New', 'no wrap at the start');
  assert.equal(labels(moveActive(entries, 0, 10)), 'Šla');
  assert.equal(labels(moveActive(entries, 7, -10)), 'New');
  assert.equal(labels(moveActive(entries, -1, 1)), 'New');
  assert.equal(labels(moveActive(entries, -1, -1)), 'Šla');
  assert.equal(labels(firstEnabled(entries)), 'New');
  assert.equal(labels(lastEnabled(entries)), 'Šla');
});

test('typeahead: a repeated letter cycles, a longer string stays on its match, accents fold, disabled are skipped', () => {
  assert.equal(labels(typeahead(entries, 's', 0)), 'Solved');
  assert.equal(labels(typeahead(entries, 'ss', 5)), 'Spam');
  assert.equal(labels(typeahead(entries, 'sss', 6)), 'Šla', 'Š folds to s');
  assert.equal(labels(typeahead(entries, 'ssss', 7)), 'Solved', 'cycles back to the first');
  assert.equal(labels(typeahead(entries, 'sp', 5)), 'Spam');
  assert.equal(labels(typeahead(entries, 'in', 1)), 'In progress');
  assert.equal(typeahead(entries, 'b', 0), -1, 'Blocked is disabled');
  assert.equal(typeahead(entries, 'zz', 0), -1);
});

test('filtering matches labels and keywords and keeps only groups with matches', () => {
  const out = filterSelectItems(items, 'pro');
  assert.deepEqual(out, [{ label: 'Active', options: [{ value: 'prog', label: 'In progress' }] }]);
  assert.deepEqual(filterSelectItems(items, 'breach').map((i) => i.value), ['sla']);
  assert.equal(filterSelectItems(items, '  ').length, items.length);
});

test('value helpers', () => {
  assert.deepEqual(toValueList(undefined), []);
  assert.deepEqual(toValueList(5), ['5']);
  assert.deepEqual(toValueList(['a', 2]), ['a', '2']);
  assert.deepEqual(toggleValue(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(toggleValue(['b'], 'a'), ['b', 'a']);
});
