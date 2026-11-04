/* Calm kit (2.56): StatusDot, Meter target, ChartCard, BarList, StatusStrip, Sparkline, the Arrive
 * stage and Count arrive. The colours are pinned in packages/tokens/tests (status-ramp, quiet-status,
 * calm-kit) and the arrival is measured in Chromium by tests/a11y/calm-kit.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusDot, StatusPill, Meter, ChartCard, BarList, StatusStrip, Sparkline, Arrive, ArriveItem, Count } from '../dist/index.js';

const html = (el) => renderToStaticMarkup(el);

test('StatusDot: a dot and a word per tone; danger is critical; quiet and sm add their class', () => {
  assert.equal(html(h(StatusDot, { tone: 'critical' }, 'Läuft gerade')), '<span class="uix-status-dot uix-status-dot--critical">Läuft gerade</span>');
  assert.equal(html(h(StatusDot, { tone: 'danger' }, 'x')), '<span class="uix-status-dot uix-status-dot--critical">x</span>');
  assert.equal(html(h(StatusDot, {}, 'P2')), '<span class="uix-status-dot uix-status-dot--neutral">P2</span>');
  assert.equal(html(h(StatusDot, { tone: 'warning', quiet: true, size: 'sm' }, 'eingeschränkt')), '<span class="uix-status-dot uix-status-dot--warning uix-status-dot--quiet uix-status-dot--sm">eingeschränkt</span>');
});

test('StatusPill critical keeps its markup: the calm look is CSS only', () => {
  assert.equal(html(h(StatusPill, { tone: 'critical' }, 'Verletzt')), '<span class="uix-pill uix-pill--critical">Verletzt</span>');
});

test('Meter target: a clipped fill, an ink mark hidden from AT, the goal said after the value', () => {
  const out = html(h(Meter, { value: 42, tone: 'warning', target: 95, targetLabel: 'Ziel 95 %', label: 'SLA-Einhaltung' }));
  assert.match(out, /class="uix-meter uix-meter--target"/);
  assert.match(out, /style="--target:0\.95"/);
  assert.match(out, /aria-valuetext="42%, warning, Ziel 95 %"/);
  assert.match(out, /<div class="uix-meter__clip"><div class="uix-meter__fill uix-arrive__slide" style="--val:0\.42" data-tone="warning"><\/div><\/div><span class="uix-meter__target" aria-hidden="true"><\/span>/);
  // no target: the old shape, no valuetext for the default tone
  const plain = html(h(Meter, { value: 30 }));
  assert.equal(plain, '<div role="meter" aria-valuenow="30" aria-valuemin="0" aria-valuemax="100" class="uix-meter"><div class="uix-meter__fill uix-arrive__slide" style="--val:0.3"></div></div>');
  assert.match(html(h(Meter, { value: 50, target: 140 })), /aria-valuetext="50%, target 100%"/);
});

test('ChartCard: the question names the card; headline, answer, plot and note in order', () => {
  const out = html(h(ChartCard, { question: 'Wächst der Rückstand?', headline: '85', answer: 'offen', note: 'Gestrichelt: Prognose.', action: h('a', { href: '#r' }, 'Berichte') }, h('div', { id: 'plot' })));
  const id = /<section class="uix-chart-card" aria-labelledby="([^"]+)">/.exec(out)?.[1];
  assert.ok(id, out);
  assert.match(out, new RegExp(`<h3 class="uix-chart-card__question" id="${id}">Wächst der Rückstand\\?</h3>`));
  assert.match(out, /<p class="uix-chart-card__answer"><span class="uix-chart-card__headline">85<\/span><span>offen<\/span><\/p><div class="uix-chart-card__plot"><div id="plot"><\/div><\/div><div class="uix-chart-card__note">Gestrichelt: Prognose\.<\/div>/);
  assert.match(out, /<div class="uix-chart-card__action"><a href="#r">Berichte<\/a><\/div>/);
});

test('ChartCard empty is one sentence instead of the answer, the chart and the note', () => {
  const out = html(h(ChartCard, { question: 'Wartung', headline: '0', note: 'n', empty: 'Keine Wartung in den nächsten 14 Tagen.', headingLevel: 4 }, h('div', { id: 'plot' })));
  assert.match(out, /<h4 /);
  assert.match(out, /<p class="uix-chart-card__empty">Keine Wartung in den nächsten 14 Tagen\.<\/p><\/section>$/);
  assert.doesNotMatch(out, /plot|headline|note/);
});

test('ChartCard arriveIndex makes it an arrival item at that position', () => {
  assert.match(html(h(ChartCard, { question: 'q', arriveIndex: 3 })), /<section class="uix-chart-card uix-arrive__item" aria-labelledby="[^"]+" style="--uix-arrive-i:3">/);
});

test('BarList: bars share the largest value, a non-zero bar never under 2 %, every value written out', () => {
  const out = html(h(BarList, { 'aria-label': 'Alter', items: [
    { label: '< 1 Tag', value: 1 }, { label: '1–3 Tage', value: 0 }, { label: '3–7 Tage', value: 2, tone: 'warning' }, { label: '> 7 Tage', value: 82, display: '82' },
  ] }));
  const vals = [...out.matchAll(/--val:([\d.]+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(vals.map((v) => v.toFixed(3)), ['0.020', '0.000', '0.024', '1.000']);
  assert.deepEqual([...out.matchAll(/--uix-arrive-j:(\d)/g)].map((m) => m[1]), ['0', '1', '2', '3']);
  assert.match(out, /<li class="uix-bar-list__row" data-tone="warning">/);
  assert.match(out, /<span class="uix-bar-list__track" aria-hidden="true">/);
  assert.match(out, /<span class="uix-bar-list__value">82<\/span>/);
});

test('StatusStrip: one cell per service, a summary for AT, only the affected listed, critical first', () => {
  const items = [
    { id: 'a', label: 'Mail', tone: 'ok' },
    { id: 'b', label: 'Citrix', tone: 'warning', state: 'eingeschränkt' },
    { id: 'c', label: 'Kernbank', tone: 'critical', state: 'gestört' },
    { id: 'd', label: 'Druck', tone: 'unknown' },
  ];
  const out = html(h(StatusStrip, { items, summary: '1 von 4 in Betrieb' }));
  assert.match(out, /<div class="uix-status-strip__cells" role="img" aria-label="1 von 4 in Betrieb">/);
  assert.equal((out.match(/uix-status-strip__cell"/g) ?? []).length, 4);
  const names = [...out.matchAll(/uix-status-dot--(\w+) uix-status-dot--quiet uix-status-strip__name">([^<]+)</g)].map((m) => `${m[1]}:${m[2]}`);
  assert.deepEqual(names, ['critical:Kernbank', 'warning:Citrix', 'neutral:Druck']);
  assert.doesNotMatch(out, /Mail/);
  assert.doesNotMatch(html(h(StatusStrip, { items, summary: 's', listAffected: false })), /uix-status-strip__list/);
});

test('Sparkline: decoration without a label, an image with one; a traced line and an endpoint dot', () => {
  const quiet = html(h(Sparkline, { values: [20, 19, 22, 85] }));
  assert.match(quiet, /^<svg class="uix-sparkline" viewBox="0 0 86 24" width="86" height="24" aria-hidden="true" focusable="false">/);
  assert.match(quiet, /<path class="uix-sparkline__line uix-arrive__trace" d="M3\.0 [\d.]+ L/);
  assert.match(quiet, /pathLength="1"/);
  assert.match(quiet, /<circle class="uix-sparkline__end" cx="83" cy="3" r="2\.5"><\/circle>/);
  assert.match(html(h(Sparkline, { values: [1, 2], label: 'Rückstand steigt', tone: 'series' })), /class="uix-sparkline uix-sparkline--series"[^>]*role="img" aria-label="Rückstand steigt"/);
  const single = html(h(Sparkline, { values: [5] }));
  assert.doesNotMatch(single, /<path/);
  assert.match(single, /<circle/);
});

// ── the Arrive stage, in a DOM ───────────────────────────────────────────────────────────────

let dom;
let createRoot;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
let reduce = false;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('sessionStorage', dom.window.sessionStorage);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
  expose('matchMedia', (query) => ({ matches: reduce && /reduce/.test(query), media: query, addEventListener() {}, removeEventListener() {} }));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'sessionStorage', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});
afterEach(() => { mock.timers.reset(); reduce = false; document.body.replaceChildren(); });

function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return { host, render: (el) => act(async () => root.render(el)), unmount: () => act(async () => root.unmount()) };
}
const stage = (host) => host.querySelector('.uix-arrive').getAttribute('data-uix-arrive');
const card = (i) => h(ArriveItem, { index: i, key: i }, `card ${i}`);

test('Arrive plays on its first mount, then rests for good; a re-render never replays it', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { host, render } = mount();
  await render(h(Arrive, null, [card(0), card(1), card(2)]));
  assert.equal(stage(host), 'play');
  assert.match(host.querySelector('.uix-arrive__item').getAttribute('style'), /--uix-arrive-i: ?0/);
  await act(async () => mock.timers.tick(5000));
  assert.equal(stage(host), 'rest');
  await render(h(Arrive, null, [card(0), card(1), card(2), card(3)]));
  assert.equal(stage(host), 'rest');
});

test('Arrive name: the page arrives once per browser session, also across a remount', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const first = mount();
  await first.render(h(Arrive, { name: 'home-test' }, card(0)));
  assert.equal(stage(first.host), 'play');
  assert.equal(sessionStorage.getItem('uix-arrive:home-test'), '1');
  await first.unmount();
  const second = mount();
  await second.render(h(Arrive, { name: 'home-test' }, card(0)));
  assert.equal(stage(second.host), 'rest');
});

test('Arrive ready: waits while loading, plays when the data lands; disabled never plays', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { host, render } = mount();
  await render(h(Arrive, { ready: false }, card(0)));
  assert.equal(stage(host), 'wait');
  await render(h(Arrive, { ready: true }, card(0)));
  assert.equal(stage(host), 'play');
  const off = mount();
  await off.render(h(Arrive, { disabled: true }, card(0)));
  assert.equal(stage(off.host), 'rest');
});

test('Count arrive counts up from 0 during the arrival only, and lands on the value', async () => {
  const { host, render } = mount();
  await render(h(Arrive, null, h(ArriveItem, { index: 0 }, h(Count, { value: 85, arrive: true }))));
  assert.equal(host.querySelector('.uix-count').textContent, '0');
  await act(async () => new Promise((r) => setTimeout(r, 900)));
  assert.equal(host.querySelector('.uix-count').textContent, '85');
  // outside a stage (or without arrive) it simply shows the number
  const plain = mount();
  await plain.render(h(Count, { value: 85, arrive: true }));
  assert.equal(plain.host.querySelector('.uix-count').textContent, '85');
});

test('Count arrive under reduced motion: the number is simply there', async () => {
  reduce = true;
  const { host, render } = mount();
  await render(h(Arrive, null, h(Count, { value: 42, arrive: true })));
  assert.equal(host.querySelector('.uix-count').textContent, '42');
});
