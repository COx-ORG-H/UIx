/* The docs specimens for the batch-5 display components are the React components' own markup
 * (packages/tokens/docs/display-specimens.js, generated). This test renders them again from the
 * BUILT dist and fails when the committed module differs, so a change to a component's markup
 * cannot leave the docs behind.
 * To update: node packages/react/scripts/render-display-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, displaySpecimenModule, renderDisplaySpecimens } from '../scripts/render-display-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderDisplaySpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(displaySpecimenModule(specimens), committed, 'packages/tokens/docs/display-specimens.js is out of date — run node packages/react/scripts/render-display-specimens.mjs');
});

test('every state named in a caption is on the page', () => {
  const data = specimens['examples-data-display'];
  // QR code: three symbols, a poster, the smallest size, a voucher at H
  assert.match(data, /data-qr-code-example/);
  assert.equal((data.match(/class="uix-qr-code"/g) ?? []).length, 3);
  assert.match(data, /width="90px"/);
  assert.match(data, /data-error-correction="H"/);
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
