/* The docs specimens for the app-shell, colour-policy and polish batch are the React components'
 * own markup (packages/tokens/docs/shell-specimens.js, generated). This test renders them again
 * from the BUILT dist and fails when the committed module differs, so a change to a component's
 * markup cannot leave the docs behind.
 * To update: node packages/react/scripts/render-shell-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, shellSpecimenModule, renderShellSpecimens } from '../scripts/render-shell-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderShellSpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(shellSpecimenModule(specimens), committed, 'packages/tokens/docs/shell-specimens.js is out of date — run node packages/react/scripts/render-shell-specimens.mjs');
});

test('the comparison can fail: a changed class is a different module', () => {
  const changed = Object.fromEntries(Object.entries(specimens).map(([route, html]) => [route, html.replace('uix-inset', 'uix-inset-x')]));
  assert.notEqual(shellSpecimenModule(changed), committed);
});

test('Inset (HAR-1818): two wells in a card body, the first a named group, the second sm', () => {
  const data = specimens['examples-data-display'];
  assert.match(data, /data-card-inset-example/);
  assert.match(data, /<div class="uix-card__body">.*<div class="uix-inset" role="group" aria-label="Header preview">/s);
  assert.match(data, /<div class="uix-inset uix-inset--sm"><code>/);
});

test('no React-generated id reaches the page', () => {
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
