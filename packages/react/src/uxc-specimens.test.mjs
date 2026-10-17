/* The docs specimens for the UX consistency audit's kit changes (HAR-2029..2032) are the React
 * components' own markup (packages/tokens/docs/uxc-specimens.js, generated). This test renders
 * them again from the BUILT dist and fails when the committed module differs, so a change to a
 * component's markup cannot leave the docs behind.
 * To update: node packages/react/scripts/render-uxc-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, uxcSpecimenModule, renderUxcSpecimens } from '../scripts/render-uxc-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderUxcSpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(uxcSpecimenModule(specimens), committed, 'packages/tokens/docs/uxc-specimens.js is out of date — run node packages/react/scripts/render-uxc-specimens.mjs');
});

test('the comparison can fail: a changed class is a different module', () => {
  const changed = Object.fromEntries(Object.entries(specimens).map(([route, html]) => [route, html.replace('uix-dl', 'uix-dl-x')]));
  assert.notEqual(uxcSpecimenModule(changed), committed);
});

test('every state named in a caption is on the page', () => {
  const overlays = specimens['examples-overlays'];
  // description list: a 320 px card and a wide one, each with the long German label
  assert.match(overlays, /data-dl-narrow-example lang="de" class="uix-card" style="width:20rem/);
  assert.match(overlays, /data-dl-wide-example/);
  assert.equal((overlays.match(/<dt>Neue Tickets pro Person und Stunde<\/dt>/g) ?? []).length, 2);
  // discard step: a dirty drawer after Escape, the step with both choices, Cancel is a DialogClose
  assert.match(overlays, /data-discard-prompt-example class="uix-drawer"/);
  assert.match(overlays, /role="alertdialog"[^>]*data-uix-discard-prompt/);
  assert.match(overlays, />Discard changes\?</);
  assert.match(overlays, />Keep editing<\/button>/);
  assert.match(overlays, /uix-btn--danger[^>]*>Discard<\/button>/);
  assert.doesNotMatch(overlays, / popover="manual"[^>]*data-uix-discard-prompt/);
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
