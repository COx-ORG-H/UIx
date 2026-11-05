// Regenerates packages/tokens/docs/calm-specimens.js: the docs specimens for the calm kit (2.56) —
// the glance home's pieces (Arrive, ChartCard, StatusDot, Meter target, BarList, StatusStrip,
// Sparkline, Count arrive) — from the BUILT package, so the styleguide shows exactly the markup the
// components render. The two ECharts glance charts are drawn live in their cards by guide/charts.js
// from the same option builders (guide/chart-analytic.js is bundled from src/chart-glance.ts).
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-calm-specimens.mjs
//
// packages/react/src/calm-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement as h, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/calm-specimens.js');

const caption = (text) => `<div class="uix-guide__subhead" data-calm-specimen>${text}</div>`;

/** Render every specimen. Returns `{ [route]: html }`. */
export async function renderCalmSpecimens() {
  const ui = await import(pathToFileURL(join(here, '../dist/index.js')).href);
  // React's generated ids differ between versions; the page gets stable ones.
  let nextId = 0;
  const ids = new Map();
  const stable = (html) => html.replace(/(:r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, (id) => {
    if (!ids.has(id)) { nextId += 1; ids.set(id, `calm-${nextId}`); }
    return ids.get(id);
  });
  const html = (el) => stable(renderToStaticMarkup(el));
  const specimens = {};
  const add = (route, block) => { specimens[route] = specimens[route] ? `${specimens[route]}\n${block}` : block; };

  // ── the glance home, arriving ─────────────────────────────────────────────────────────────
  const grid = (min, ...children) => h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}), 1fr))`, gap: 'var(--uix-space-4)' } }, ...children);
  const stat = (index, label, value, meta) => h(ui.ArriveItem, { index }, h(ui.Stat, { label, value, meta, size: 'compact' }));
  const home = h(ui.Arrive, { 'aria-label': 'Startseite, Überblick', role: 'region' },
    h(ui.ArriveItem, { index: 0, className: 'uix-card', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uix-space-4)', padding: 'var(--uix-space-3) var(--uix-space-5)', marginBottom: 'var(--uix-space-4)' } },
      h(ui.StatusDot, { tone: 'critical' }, 'Läuft gerade'),
      h('span', { style: { flex: '1 1 16rem', minWidth: 0, fontWeight: 600 } }, 'INC-0001 · Förderportal: Antragsübermittlung bricht für alle Antragstellenden ab'),
      h('button', { type: 'button', className: 'uix-btn uix-btn--secondary uix-btn--sm' }, 'Krisenraum öffnen')),
    grid('12rem',
      stat(1, 'Warten auf Sie', h(ui.Count, { value: 16, arrive: true }), '3 davon heute fällig'),
      stat(2, 'SLA in Gefahr', h(ui.Count, { value: 5, arrive: true }), 'nächste Frist in 1 Std. 40 Min.'),
      stat(3, 'Offener Rückstand', h(ui.Count, { value: 85, arrive: true }), h(Fragment, null, '↑ 3 ggü. Vorwoche ', h(ui.Sparkline, { values: [20, 19, 22, 22, 20, 18, 60, 75, 80, 82, 85] }))),
      h(ui.ArriveItem, { index: 4 },
        h(ui.Stat, { label: 'SLA-Einhaltung · 30 Tage', value: h(Fragment, null, h(ui.Count, { value: 42, arrive: true }), ' %'), size: 'compact', meta: h(Fragment, null,
          h(ui.Meter, { value: 42, tone: 'warning', target: 95, targetLabel: 'Ziel 95 %', label: 'SLA-Einhaltung', style: { flex: '1 1 100%', margin: 'var(--uix-space-2) 0' } }),
          h(ui.StatusDot, { tone: 'warning', size: 'sm' }, 'unter Ziel 95 %')) }))),
    h('div', { style: { height: 'var(--uix-space-4)' } }),
    grid('20rem',
      h(ui.ChartCard, { arriveIndex: 5, question: 'Wächst der Rückstand?', headline: h(ui.Count, { value: 85, arrive: true }), answer: 'offen, Prognose 140 bis 23. Nov.', note: 'Seit drei Wochen gehen mehr Störungen ein als gelöst werden. Gestrichelt: Prognose.' },
        h('div', { 'data-uix-chart': 'glance-line', role: 'img', 'aria-label': 'Offener Rückstand der letzten 12 Wochen, steigend von 20 auf 85, Prognose 140 am 23. November', style: { height: '150px' } })),
      h(ui.ChartCard, { arriveIndex: 6, question: 'Kommen wir hinterher?', headline: '+22', answer: 'mehr eröffnet als gelöst', note: h(Fragment, null, 'Letzte 7 Tage · ', h('span', { className: 'uix-legend__item', style: { '--legend-color': 'var(--uix-chart-series)' } }, h('span', { className: 'uix-legend__swatch', 'aria-hidden': 'true' }), 'eröffnet'), ' ', h('span', { className: 'uix-legend__item', style: { '--legend-color': 'var(--uix-chart-comparison)' } }, h('span', { className: 'uix-legend__swatch', 'aria-hidden': 'true' }), 'gelöst')) },
        h('div', { 'data-uix-chart': 'glance-paired', role: 'img', 'aria-label': 'Eröffnete und gelöste Störungen der letzten 7 Tage: 110 eröffnet, 88 gelöst', style: { height: '140px' } })),
      h(ui.ChartCard, { arriveIndex: 7, question: 'Wie alt ist der Rückstand?', headline: '82', answer: 'von 85 älter als 7 Tage' },
        h(ui.BarList, { 'aria-label': 'Offene Störungen nach Alter', items: [{ label: '< 1 Tag', value: 1 }, { label: '1–3 Tage', value: 0 }, { label: '3–7 Tage', value: 2 }, { label: '> 7 Tage', value: 82 }] })),
      h(ui.ChartCard, { arriveIndex: 8, question: 'Laufen die Dienste?', headline: '9', answer: 'von 12 in Betrieb' },
        h(ui.StatusStrip, { summary: '9 von 12 Diensten in Betrieb, 3 eingeschränkt', items: [
          { id: 'citrix', label: 'Citrix-Arbeitsplätze', tone: 'warning', state: 'eingeschränkt' },
          { id: 'core', label: 'Kernbank-API', tone: 'warning', state: 'eingeschränkt' },
          { id: 'sap', label: 'SAP FI/CO', tone: 'warning', state: 'eingeschränkt' },
          ...['mail', 'vpn', 'portal', 'dms', 'print', 'hr', 'crm', 'wiki', 'sso'].map((id) => ({ id, label: id, tone: 'ok' })),
        ] })),
    ));
  add('examples-data-display', [
    caption('Glance home (calm kit; React <code>Arrive</code>, <code>ArriveItem</code>, <code>ChartCard</code>, <code>Count arrive</code>, <code>Sparkline</code>, <code>Meter target</code>, <code>BarList</code>, <code>StatusStrip</code>, <code>GlanceLineChart</code>, <code>PairedBarChart</code>; <code>.uix-arrive</code>, <code>.uix-chart-card</code>) — one question per card, answered with a number before the chart. On the first paint the cards rise 8 px, 45 ms apart, numbers count up, the line traces in and the bars grow; never on a refresh or new data. Reduced motion: a 160 ms fade. Red appears once: the dot and the words of the one thing broken now.'),
    '<div class="uix-cluster" style="margin-bottom:var(--uix-space-3)"><button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-calm-replay>Replay the arrival</button><button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-neutral-toggle aria-pressed="false">Warm neutrals</button></div>',
    '<div data-calm-example>',
    html(home),
    '</div>',
  ].join('\n'));

  // ── the signal ladder, and the empty card ─────────────────────────────────────────────────
  const ladder = h('div', { className: 'uix-stack', style: { '--gap': 'var(--uix-space-3)' } },
    h('div', { className: 'uix-cluster', style: { '--gap': 'var(--uix-space-5)' } },
      h(ui.StatusDot, { tone: 'neutral' }, 'P1 (a fact, in ink)'),
      h(ui.StatusDot, { tone: 'info' }, 'Neu seit Ihrem letzten Besuch'),
      h(ui.StatusDot, { tone: 'warning' }, 'SLA in 1 Std. 40 Min.'),
      h(ui.StatusDot, { tone: 'critical' }, 'SLA seit 2 Std. überschritten'),
      h(ui.StatusDot, { tone: 'warning', quiet: true }, 'Citrix-Arbeitsplätze')),
    h('div', { className: 'uix-cluster' },
      h(ui.StatusPill, { tone: 'critical', dot: true }, 'Kritisch'),
      h(ui.StatusPill, { tone: 'danger' }, 'Verletzt'),
      h(ui.StatusPill, { tone: 'critical', treatment: 'dot' }, 'SEV-1'),
      h(ui.StatusPill, { tone: 'warning' }, 'Achtung'),
      h(ui.StatusPill, { tone: 'neutral' }, 'Neu')),
    h('div', { style: { maxWidth: '24rem' } },
      h(ui.ChartCard, { question: 'Anstehende Wartung', empty: 'Keine Wartung in den nächsten 14 Tagen.' })));
  add('examples-data-display', [
    caption('Signal ladder (React <code>StatusDot</code>, <code>.uix-status-dot</code>) — neutral is ink, info the accent, warning amber, critical red: a dot and a word, no box, and the word in the tone\'s text colour. The critical pill is now the danger tint with the danger words; a solid red fill is kept for the destructive button. Last: a glance card with nothing to show is one sentence (<code>ChartCard empty</code>).'),
    '<div data-calm-ladder>',
    html(ladder),
    '</div>',
  ].join('\n'));

  return specimens;
}

export const calmSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-calm-specimens.mjs — do not edit by hand.
 * The docs specimens for the calm kit (2.56): the markup the built React components render.
 * showcase-data.js appends each block to its route; guide/charts.js draws the two glance charts
 * live; docs.js replays the arrival and toggles the warm neutrals.
 * packages/react/src/calm-specimens.test.mjs fails when this file and the components differ. */
export const CALM_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, calmSpecimenModule(await renderCalmSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
