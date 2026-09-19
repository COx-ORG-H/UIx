/* TENSOR RX-125 (UIX-04 / UIX-12) — no component renders an English literal a consumer
 * cannot translate. Every accessible name and visible word comes from a prop with its
 * English default declared once (a DEFAULT_*_LABELS object or a destructuring default).
 * The rule and its heuristics live in scripts/literal-a11y-text.mjs; on master there were
 * 95 such literals across 20 components.
 *
 * Also renders a few converted components with German labels, so a label prop that is
 * declared but never used fails here too.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { collect } from '../scripts/literal-a11y-text.mjs';
import {
  BuilderCanvas, BulkBar, DiffViewer, Drawer, MatchReview, Pagination, Toaster,
} from '../dist/index.js';

test('no component renders an untranslatable English literal', () => {
  const hits = collect();
  process.stdout.write(`literal-a11y-text: ${hits.length} literals\n`);
  assert.deepEqual(hits.map((h) => `${h.file}:${h.line} ${h.kind} "${h.text}"`), []);
});

test('converted components render the labels they are given', () => {
  const html = [
    renderToStaticMarkup(h(Pagination, { page: 2, pageCount: 5, onChange: () => {}, labels: { region: 'Seitennavigation', previous: 'Vorherige Seite', next: 'Nächste Seite' } })),
    renderToStaticMarkup(h(BulkBar, { count: 3, label: 'Sammelaktionen', selectedLabel: (n) => `${n} ausgewählt` })),
    renderToStaticMarkup(h(Toaster, { regionLabel: 'Benachrichtigungen' })),
    renderToStaticMarkup(h(BuilderCanvas, { items: [], onItemsChange: () => {}, palette: [], labels: { region: 'Baukasten', paletteEmpty: 'Keine Elementtypen.' } })),
    renderToStaticMarkup(h(DiffViewer, { entries: [], labels: { noDifferences: 'Keine Unterschiede' } })),
    renderToStaticMarkup(h(MatchReview, { incoming: {}, fields: [], candidates: [], onDecision: () => {}, labels: { empty: 'Keine Kandidaten gefunden.' } })),
  ].join('\n');
  for (const word of ['Seitennavigation', 'Vorherige Seite', 'Nächste Seite', 'Sammelaktionen', '3 ausgewählt', 'Benachrichtigungen', 'Baukasten', 'Keine Elementtypen.', 'Keine Unterschiede', 'Keine Kandidaten gefunden.']) {
    assert.ok(html.includes(word), `renders "${word}"`);
  }
  for (const english of ['Previous page', 'Bulk actions', 'Builder canvas', 'No differences']) {
    assert.ok(!html.includes(english), `no English "${english}" once translated`);
  }
  assert.ok(Drawer);
});
