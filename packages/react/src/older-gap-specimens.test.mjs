/* The docs specimens for the date fields, RadioCard, EntityPicker hints, Avatar presence and
 * the lazy Tree are the React components' own markup (packages/tokens/docs/older-gap-specimens.js,
 * generated). This test renders them again from the BUILT dist and fails when the committed
 * module differs, so a change to a component's markup cannot leave the docs behind.
 * To update: node packages/react/scripts/render-older-gap-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, olderGapSpecimenModule, renderOlderGapSpecimens } from '../scripts/render-older-gap-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderOlderGapSpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(olderGapSpecimenModule(specimens), committed, 'packages/tokens/docs/older-gap-specimens.js is out of date — run node packages/react/scripts/render-older-gap-specimens.mjs');
});

test('the comparison can fail: a changed class is a different module', () => {
  const changed = Object.fromEntries(Object.entries(specimens).map(([route, html]) => [route, html.replace('uix-date-picker__toggle', 'uix-date-picker__button')]));
  assert.notEqual(olderGapSpecimenModule(changed), committed);
});

test('every state named in a caption is on the page', () => {
  const forms = specimens['examples-form-controls'];
  const data = specimens['examples-data-display'];
  // date fields: a value, a refused draft with its reason, a time with its zone, a range, an open month
  assert.match(forms, /class="uix-input uix-date-picker__input"[^>]*value="18 Nov 2026"/);
  assert.match(forms, /aria-invalid="true"[^>]*value="next week"|value="next week"[^>]*aria-invalid="true"/);
  assert.match(forms, /role="alert">\s*Enter a date as D Mon YYYY\./);
  assert.match(forms, /type="time"[^>]*value="14:30"|value="14:30"[^>]*type="time"/);
  assert.match(forms, />CET</);
  assert.match(forms, /16 Nov 2026 – 27 Nov 2026/);
  assert.equal((forms.match(/data-date="2026-11-\d\d"/g) ?? []).length, 30, 'the open calendar shows November');
  assert.match(forms, /data-date="2026-11-18"[^>]*data-selected="true"|data-selected="true"[^>]*data-date="2026-11-18"/);
  assert.match(forms, /data-date="2026-11-21"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*data-date="2026-11-21"/, 'a Saturday cannot be chosen');
  // radio cards: four radios, one checked, one disabled
  assert.equal((forms.match(/class="uix-radio-card"/g) ?? []).length, 4);
  // entity picker: the idle hint and the "more match" row
  assert.match(forms, /Type at least 2 characters\./);
  assert.match(forms, /class="uix-search-suggest__note">More matches\./);
  // presence: the three drawn states beside the default one, and the standalone dot
  for (const state of ['busy', 'away', 'offline']) assert.match(data, new RegExp(`data-presence="${state}"`));
  assert.match(data, /class="uix-presence uix-presence--away"/);
  // tree: a loading row and an error row with Retry
  assert.match(data, /class="uix-tree__status">.*Loading…/);
  assert.match(data, /uix-tree__status--error">Could not load\. <span class="uix-tree__retry">Retry/);
  // nothing on the page follows this Node's ICU or React's id scheme
  for (const html of [forms, data]) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
