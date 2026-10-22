/* The docs specimens of the form-field batch are the React components' own markup
 * (packages/tokens/docs/form-field-specimens.js, generated). This test renders them again from the
 * BUILT dist and fails when the committed module differs, so a change to a component's markup
 * cannot leave the docs behind.
 * To update: node packages/react/scripts/render-form-field-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, formFieldSpecimenModule, renderFormFieldSpecimens } from '../scripts/render-form-field-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderFormFieldSpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(formFieldSpecimenModule(specimens), committed, 'packages/tokens/docs/form-field-specimens.js is out of date — run node packages/react/scripts/render-form-field-specimens.mjs');
});

test('the comparison can fail: a changed class is a different module', () => {
  const changed = Object.fromEntries(Object.entries(specimens).map(([route, html]) => [route, html.replace('uix-checkbox-group', 'uix-checkbox-group-x')]));
  assert.notEqual(formFieldSpecimenModule(changed), committed);
});

test('every state named in a caption is on the page', () => {
  const forms = specimens['examples-form-controls'];
  // CheckboxGroup: two fieldsets with legends, a hint on one and an announced error on the other
  assert.match(forms, /data-checkbox-group-example/);
  assert.equal((forms.match(/<fieldset id="ff-tags(-error)?" class="uix-checkbox-group"/g) ?? []).length, 2);
  assert.match(forms, /<legend class="uix-checkbox-group__legend" data-required="true">Curated tags<\/legend>/);
  assert.match(forms, /--uix-checkbox-group-columns:\s*3/);
  assert.match(forms, /<span class="uix-field__hint">Shown on the book’s public page\.<\/span>/);
  assert.match(forms, /data-invalid="true"/);
  assert.match(forms, /role="alert">Choose at least one audience\.<\/span>/);
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
