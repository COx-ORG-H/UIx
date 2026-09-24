/* SearchSuggest's match emphasis: which letters of a result a query marks.
 * Renders nothing — imports the BUILT dist; run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { foldForSearch, searchSegments } from '../dist/index.js';

const marked = (text, query) => searchSegments(text, query).filter((s) => s.match).map((s) => s.text);

test('the whole query is marked wherever it occurs, case-insensitively', () => {
  assert.deepEqual(marked('Time zone for the time sheet', 'time'), ['Time', 'time']);
});

test('without a whole-query hit, each word is marked where it starts a word', () => {
  // "sla pol" occurs verbatim, so it is one run; reversed, each word is marked on its own
  assert.deepEqual(marked('SLA policies', 'sla pol'), ['SLA pol']);
  assert.deepEqual(marked('SLA policies', 'pol sla'), ['SLA', 'pol']);
  // "ic" occurs inside "policies" but starts no word: nothing is marked for it
  assert.deepEqual(marked('SLA policies', 'sla ic'), ['SLA']);
});

test('diacritics and ß fold, and the ORIGINAL letters are marked', () => {
  assert.deepEqual(marked('Übersicht', 'uber'), ['Über']);
  assert.deepEqual(marked('Zeitzone ändern', 'andern'), ['ändern']);
  assert.deepEqual(marked('Straße', 'strasse'), ['Straße']);
  assert.deepEqual(marked('Straße', 'ss'), ['ß']);
});

test('each query word is marked at every word start, not only the first', () => {
  assert.deepEqual(marked('Reset password, Reset display name', 'reset name'), ['Reset', 'Reset', 'name']);
});

test('Turkish dotted capital I folds to a plain i', () => {
  assert.equal(foldForSearch('İstanbul').text, 'istanbul');
  assert.deepEqual(marked('İstanbul office', 'istanbul'), ['İstanbul']);
});

test('segments rebuild the text exactly', () => {
  for (const [text, query] of [['Zwei-Faktor-Anmeldung', 'faktor'], ['Café crème', 'creme'], ['a', ''], ['', 'x']]) {
    assert.equal(searchSegments(text, query).map((s) => s.text).join(''), text);
  }
});

test('a blank query marks nothing', () => {
  assert.deepEqual(searchSegments('Language', '   '), [{ text: 'Language', match: false }]);
});

test('folding keeps a map back to the original characters', () => {
  const folded = foldForSearch('Äß');
  assert.equal(folded.text, 'ass');
  assert.deepEqual(folded.source, [0, 1, 1]);
  assert.deepEqual(folded.sourceEnd, [1, 2, 2]);
});
