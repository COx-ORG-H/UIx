/* The docs specimens for the file kit (2.57) are the React components' own markup
 * (packages/tokens/docs/file-kit-specimens.js, generated). Renders them again from the BUILT dist
 * and fails when the committed module differs. To update: node packages/react/scripts/render-file-kit-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, fileKitSpecimenModule, renderFileKitSpecimens } from '../scripts/render-file-kit-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8').replace(/\r\n/g, '\n');
const specimens = await renderFileKitSpecimens();

test('the committed file kit specimens are exactly what the components render today', () => {
  const rendered = fileKitSpecimenModule(specimens);
  const at = [...rendered].findIndex((char, i) => char !== committed[i]);
  const where = at === -1 ? '' : ` First difference at ${at}: rendered …${rendered.slice(Math.max(0, at - 80), at + 80)}…`;
  assert.ok(rendered === committed, `packages/tokens/docs/file-kit-specimens.js is out of date — run node packages/react/scripts/render-file-kit-specimens.mjs.${where}`);
});

test('every kind, every state and the drop row are on the page', () => {
  const page = specimens['examples-crm-itsm'];
  for (const kind of ['img', 'doc', 'sheet', 'mail', 'code', 'log', 'archive', 'other']) assert.ok(page.includes(`data-file-kind="${kind}"`), kind);
  for (const state of ['idle', 'uploading', 'done', 'scanning', 'blocked', 'failed']) assert.ok(page.includes(`data-state="${state}"`), state);
  for (const piece of ['class="uix-file-drop"', 'uix-file-row--compact', 'uix-file-icon--lg', 'uix-file-icon--sm', 'data-file-kit-replay', 'data-file-kit-upload', 'Wird hochgeladen · 62 % · 1,5 von 2,4 MB']) {
    assert.ok(page.includes(piece), piece);
  }
});
