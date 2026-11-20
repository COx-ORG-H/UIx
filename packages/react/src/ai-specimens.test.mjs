/* The docs specimens for the AI primitives are the React components' own markup
 * (packages/tokens/docs/ai-specimens.js, generated). Renders them again from the BUILT dist and
 * fails when the committed module differs. To update: node packages/react/scripts/render-ai-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, aiSpecimenModule, renderAiSpecimens } from '../scripts/render-ai-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8').replace(/\r\n/g, '\n');
const specimens = await renderAiSpecimens();

test('the committed AI specimens are exactly what the components render today', () => {
  const rendered = aiSpecimenModule(specimens);
  const at = [...rendered].findIndex((char, i) => char !== committed[i]);
  const where = at === -1 ? '' : ` First difference at ${at}: rendered …${rendered.slice(Math.max(0, at - 80), at + 80)}…`;
  assert.ok(rendered === committed, `packages/tokens/docs/ai-specimens.js is out of date — run node packages/react/scripts/render-ai-specimens.mjs.${where}`);
});

test('every AI primitive and both bands are on the page', () => {
  const page = specimens['examples-crm-itsm'];
  for (const piece of [
    'class="uix-ai-label-button"', 'class="uix-popover uix-ai-panel"', 'class="uix-source-list"', 'class="uix-ai-suggestion"',
    'uix-field__ai-note', 'uix-field__revert', 'data-consequence="high"', 'data-consequence="medium"', 'data-status="applied"',
    'Needs your approval', 'Cannot be undone', 'class="uix-ai-output"', 'data-status="generating"', 'class="uix-ai-actor"',
  ]) assert.ok(page.includes(piece), piece);
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  assert.ok(ids.every((id) => id.includes('docs-ai-')), 'every generated id carries the specimen prefix');
});
