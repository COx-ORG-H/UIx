/* HAR-1556 — InsightCard and Bullet markup: the answer is the heading, the status is a word AND an
 * icon, KPIs are a description list, the coverage note is written from numbers, every word can be
 * replaced, and every class it emits is defined. Layout (split vs stack, 375 px) is measured in
 * tests/a11y/insight-charts.spec.mjs. Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let ui;
const css = readFileSync(new URL('../../tokens/styles/components/insight-card.css', import.meta.url), 'utf8');
const defined = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]));

before(async () => {
  ui = await import('../dist/index.js');
});

const card = (props = {}) => renderToStaticMarkup(h(ui.InsightCard, {
  eyebrow: 'Delivery health',
  headline: 'Review is the bottleneck',
  sowhat: 'Cap work in Review at 8.',
  status: { tone: 'warning', label: 'Over budget' },
  kpis: [
    { value: '18.7 h', label: 'Residence', comparison: { text: '↑ 3.7 h over budget', tone: 'negative' }, target: { actual: 18.7, target: 15, ranges: [[0, 10], [10, 15], [15, 24]], max: 24 } },
    { value: 'Sep 12', label: 'Reaches 24 h' },
  ],
  coverage: { covered: 412, total: 431, note: 'items timed', partialPeriod: 'Today is partial.' },
  source: 'Pipeline events',
  updated: '14:05',
  actions: h('a', { href: '/review' }, 'Open the 10 items'),
  layout: 'split',
  aside: h('div', { id: 'scatter' }),
  ...props,
}, h('div', { id: 'panels' })));

test('the headline is a heading (level 3 by default, configurable) and the card is an article', () => {
  const html = card();
  assert.match(html, /^<article class="uix-insight" data-layout="split">/);
  assert.match(html, /<h3 class="uix-insight__headline">Review is the bottleneck<\/h3>/);
  assert.match(card({ headingLevel: 2 }), /<h2 class="uix-insight__headline">/);
});

test('the status is its label plus an icon, never colour alone', () => {
  for (const tone of ['ok', 'warning', 'critical', 'unknown']) {
    const html = card({ status: { tone, label: `Label ${tone}` } });
    const status = html.match(/<span class="uix-insight__status" data-tone="([a-z]+)">(.*?)<\/span><\/header>/);
    assert.ok(status, tone);
    assert.equal(status[1], tone);
    assert.match(status[2], /<svg[^>]*aria-hidden="true"/, `${tone} has a decorative icon`);
    assert.match(status[2], new RegExp(`<span>Label ${tone}</span>`));
  }
});

test('KPIs are a labelled description list; a target renders a bullet with its own words', () => {
  const html = card();
  assert.match(html, /<dl class="uix-insight__kpis" aria-label="Key figures">/);
  assert.match(html, /<dt class="uix-insight__kpi-label">Residence<\/dt><dd class="uix-insight__kpi-value">18\.7 h<\/dd>/);
  assert.match(html, /data-tone="negative">↑ 3\.7 h over budget<\/dd>/);
  assert.match(html, /<div class="uix-bullet" role="img" aria-label="18\.7 against a target of 15">/);
  // the bar and the target tick sit on one scale (max 24)
  assert.match(html, /uix-bullet__bar" style="width:77\.91\d*%"/);
  assert.match(html, /uix-bullet__target" style="left:62\.5%"/);
  assert.equal((html.match(/uix-bullet__range/g) ?? []).length, 3);
});

test('coverage is written from the numbers, with the partial period beside it; source, updated and the action follow', () => {
  const html = card();
  assert.match(html, /<p class="uix-insight__coverage">412 of 431 items timed \(96%\)<span class="uix-insight__partial">Today is partial\.<\/span><\/p>/);
  assert.match(html, /<span>Source: Pipeline events<\/span><span>Updated: 14:05<\/span>/);
  assert.match(html, /<div class="uix-insight__actions"><a href="\/review">Open the 10 items<\/a><\/div>/);
  assert.match(html, /<div class="uix-insight__main"><div id="panels"><\/div><\/div><div class="uix-insight__aside"><div id="scatter"><\/div><\/div>/);
});

test('every word the card writes can be replaced (German)', () => {
  const html = card({
    labels: {
      coverage: (covered, total, percent, note) => `${covered} von ${total} ${note} (${percent} %)`,
      bullet: (actual, target) => `${actual} gegenüber dem Ziel ${target}`,
      source: 'Quelle',
      updated: 'Aktualisiert',
      kpis: 'Kennzahlen',
      formatNumber: (n) => String(n).replace('.', ','),
    },
    coverage: { covered: 412, total: 431, note: 'Elemente erfasst' },
  });
  for (const text of ['412 von 431 Elemente erfasst (96 %)', 'aria-label="18,7 gegenüber dem Ziel 15"', 'Quelle: Pipeline events', 'Aktualisiert: 14:05', 'aria-label="Kennzahlen"']) {
    assert.ok(html.includes(text), text);
  }
  assert.equal(/\b(Source|Updated|Key figures|against a target)\b/.test(html), false, 'no English left');
});

test('optional parts are absent when not given; an empty card is just its headline', () => {
  const html = renderToStaticMarkup(h(ui.InsightCard, { headline: 'No data yet' }));
  assert.equal(html, '<article class="uix-insight" data-layout="stack"><header class="uix-insight__header"><div class="uix-insight__heading"><h3 class="uix-insight__headline">No data yet</h3></div></header></article>');
});

test('every class the card emits is defined in insight-card.css', () => {
  const used = new Set([...card().matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('uix-insight') || c.startsWith('uix-bullet')));
  assert.ok(used.size > 15, `checked ${used.size}`);
  assert.deepEqual([...used].filter((c) => !defined.has(c)), []);
});
