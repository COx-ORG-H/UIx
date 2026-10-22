/* The docs specimens for the data, editing and navigation batch are the React components' own
 * markup (packages/tokens/docs/data-editing-specimens.js, generated). This test renders them again
 * from the BUILT dist and fails when the committed module differs, so a change to a component's
 * markup cannot leave the docs behind.
 * To update: node packages/react/scripts/render-data-editing-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, dataEditingSpecimenModule, renderDataEditingSpecimens } from '../scripts/render-data-editing-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderDataEditingSpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(dataEditingSpecimenModule(specimens), committed, 'packages/tokens/docs/data-editing-specimens.js is out of date — run node packages/react/scripts/render-data-editing-specimens.mjs');
});

test('the comparison can fail: a changed class is a different module', () => {
  const changed = Object.fromEntries(Object.entries(specimens).map(([route, html]) => [route, html.replace('uix-segmented', 'uix-segmented-x')]));
  assert.notEqual(dataEditingSpecimenModule(changed), committed);
});

test('every state named in a caption is on the page', () => {
  const nav = specimens['examples-navigation'];
  // language switcher: two named navs of links, one current link each, lang + hreflang
  assert.match(nav, /data-segmented-link-example/);
  assert.equal((nav.match(/<nav class="uix-segmented-nav" aria-label="/g) ?? []).length, 2);
  assert.equal((nav.match(/ aria-current="page">/g) ?? []).length, 2);
  assert.match(nav, /<a lang="de" href="#lang-de" hreflang="de" class="uix-segmented__option" aria-current="page">DE<\/a>/);
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
