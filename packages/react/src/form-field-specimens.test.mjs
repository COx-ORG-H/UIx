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
  // PasswordInput (revealed: a text input, the toggle pressed) and OtpInput (one input, cells, an error)
  assert.match(forms, /data-sign-in-example/);
  assert.match(forms, /<input[^>]*id="ff-password"[^>]*type="text"/);
  assert.match(forms, /class="uix-input-group__action" aria-label="Show password" aria-pressed="true"/);
  assert.match(forms, /class="uix-input uix-input--lg"[^>]*id="ff-password-lg"|id="ff-password-lg"[^>]*class="uix-input uix-input--lg"/);
  assert.equal((forms.match(/class="uix-otp__input"/g) ?? []).length, 2);
  assert.equal((forms.match(/class="uix-otp__cell"/g) ?? []).length, 14);
  assert.match(forms, /autoComplete="one-time-code"|autocomplete="one-time-code"/);
  assert.match(forms, /role="alert">That code was already used\.<\/span>/);
  // TimePicker: 24 h German, 12 h en-US, a refused draft with its reason; DateTimePicker's time is one
  assert.match(forms, /data-time-picker-example/);
  assert.match(forms, /id="ff-opens"[^>]*value="09:30"/);
  assert.match(forms, /id="ff-quiet"[^>]*value="10:00\sPM"/);
  assert.match(forms, /id="ff-closes"[^>]*value="19:30"[^>]*aria-invalid="true"|id="ff-closes"[^>]*aria-invalid="true"[^>]*value="19:30"/);
  assert.match(forms, /role="alert">Choose 18:00 or earlier\.<\/span>/);
  assert.match(forms, /class="uix-date-time-picker"[\s\S]*uix-time-picker__input[^>]*value="14:30"/);
  assert.doesNotMatch(forms, /type="time"/);
  // FilterPopover date: a DatePicker showing the German date, no native date input
  const data = specimens['examples-data-display'];
  assert.match(data, /data-filter-date-example/);
  assert.match(data, /class="uix-filter-popover uix-popover"/);
  assert.match(data, /uix-date-picker__input"[^>]*value="22\.11\.2026"/);
  assert.doesNotMatch(data, /<input[^>]*type="date"/);
  assert.match(data, /aria-label="Datum ändern, Sonntag, 22. November 2026"/);
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
