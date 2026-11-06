/* The docs specimens for the calm kit (2.56) are the React components' own markup
 * (packages/tokens/docs/calm-specimens.js, generated). Renders them again from the BUILT dist and
 * fails when the committed module differs. To update: node packages/react/scripts/render-calm-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, calmSpecimenModule, renderCalmSpecimens } from '../scripts/render-calm-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8').replace(/\r\n/g, '\n');
const specimens = await renderCalmSpecimens();

test('the committed calm specimens are exactly what the components render today', () => {
  const rendered = calmSpecimenModule(specimens);
  const at = [...rendered].findIndex((char, i) => char !== committed[i]);
  const where = at === -1 ? '' : ` First difference at ${at}: rendered …${rendered.slice(Math.max(0, at - 80), at + 80)}…`;
  assert.ok(rendered === committed, `packages/tokens/docs/calm-specimens.js is out of date — run node packages/react/scripts/render-calm-specimens.mjs.${where}`);
});

test('every piece the captions name is on the page, and red appears only as the one critical dot', () => {
  const page = specimens['examples-data-display'];
  assert.match(page, /<div class="uix-arrive" data-uix-arrive="play"/);
  assert.equal((page.match(/class="uix-chart-card uix-arrive__item"/g) ?? []).length, 4);
  for (const piece of ['uix-sparkline', 'uix-meter--target', 'uix-bar-list', 'uix-status-strip', 'data-uix-chart="glance-line"', 'data-uix-chart="glance-paired"', 'uix-status-dot--critical', 'uix-chart-card__empty', 'data-calm-replay']) {
    assert.ok(page.includes(piece), piece);
  }
  const home = page.slice(page.indexOf('<div data-calm-example>'), page.indexOf('<div data-calm-ladder>'));
  assert.equal((home.match(/uix-status-dot--critical|uix-pill--critical|uix-pill--danger/g) ?? []).length, 1, 'one red signal on the glance home');
  // reading order: the stage's items are numbered 0..8 without a gap
  const order = [...home.matchAll(/--uix-arrive-i:(\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.deepEqual([...new Set(order)], [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});
