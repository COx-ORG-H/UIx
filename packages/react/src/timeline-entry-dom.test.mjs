/* Timeline entry text (HAR-3086): an event line, a detail line and a badge slot that the kit styles,
 * so a product never sets the colours or builds a pill by hand. The colours' contrast is pinned in
 * packages/tokens/tests/timeline-entry-contrast.test.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusPill, Timeline, TimelineItem } from '../dist/index.js';

const render = (el) => renderToStaticMarkup(el);

test('an entry with title, badge, detail and meta renders each in its kit element, in order', () => {
  const html = render(h(Timeline, null, h(TimelineItem, {
    meta: '13.11.2026 09:12',
    title: [h('strong', { key: 'a' }, 'Daniel Fischer'), ' hat den Status geändert.'],
    badge: h(StatusPill, { tone: 'neutral' }, 'Intern'),
    detail: 'Von Zugewiesen auf In Bearbeitung',
  })));
  assert.match(html, /<div class="uix-timeline__body"><div class="uix-timeline__meta">13\.11\.2026 09:12<\/div><div class="uix-timeline__head"><p class="uix-timeline__title"><strong>Daniel Fischer<\/strong> hat den Status geändert\.<\/p><span class="uix-timeline__badge"><span class="uix-pill[^"]*"[^>]*>Intern<\/span><\/span><\/div><p class="uix-timeline__detail">Von Zugewiesen auf In Bearbeitung<\/p><\/div>/);
});

test('without the new props an entry renders exactly as before: meta, then children', () => {
  const html = render(h(TimelineItem, { meta: 'gestern' }, h('p', null, 'Ein Kommentar.')));
  assert.match(html, /<div class="uix-timeline__body"><div class="uix-timeline__meta">gestern<\/div><p>Ein Kommentar\.<\/p><\/div>/);
  assert.doesNotMatch(html, /uix-timeline__(head|title|detail|badge)/);
});

test('a badge without a title still gets the head row; a detail alone gets only its line', () => {
  assert.match(render(h(TimelineItem, { badge: 'Auto' })), /<div class="uix-timeline__head"><span class="uix-timeline__badge">Auto<\/span><\/div>/);
  const detailOnly = render(h(TimelineItem, { detail: 'nur Detail' }));
  assert.match(detailOnly, /<p class="uix-timeline__detail">nur Detail<\/p>/);
  assert.doesNotMatch(detailOnly, /uix-timeline__head/);
});
