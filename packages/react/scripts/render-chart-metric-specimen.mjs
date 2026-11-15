// HAR-2854: reproducible specimen from the actual built public root entry.
import { readFileSync, writeFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card, ChartMetric } from '../dist/index.js';

const target = new URL('../../tokens/docs/showcase-data.js', import.meta.url);
const start = '<!-- chart-metric-root:start -->';
const end = '<!-- chart-metric-root:end -->';
const metrics = [
  { id: 'default', value: '1.234,5', label: 'Vorgänge pro Arbeitsstunde', delta: '+8 %', deltaTone: 'negative' },
  { id: 'start', value: 0, label: 'Offene Vorgänge mit überschrittener Bearbeitungszeit', delta: '−12 %', deltaTone: 'positive', align: 'start' },
  { id: 'end', value: '42', label: 'Abgeschlossene Vorgänge', delta: '0 %', deltaTone: 'neutral', align: 'end' },
];
const cards = metrics.map(({ id, ...props }) => renderToStaticMarkup(h(Card, { title: id === 'default' ? 'Standard im Diagrammkopf' : `Ausrichtung: ${id}` }, h(ChartMetric, { ...props, 'data-metric-specimen': id })))).join('');
const section = `${start}<h3>Engine-free dashboard metrics</h3><p>Import ChartMetric from @tensor_1/react. The same component remains available through the chart entries. Start/end follow writing direction; omit alignment for the existing responsive chart-header default. Delta sentiment is independent of numerical direction.</p><div data-chart-metric-root style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:var(--uix-space-4)">${cards}</div>${end}`;
const source = readFileSync(target, 'utf8');
const page = source.match(/"slug": "examples-insight-charts"[\s\S]*?"html": ("(?:[^"\\]|\\.)*")/);
if (!page) throw new Error('insight charts specimen not found');
const html = JSON.parse(page[1]);
const stripped = html.includes(start) ? html.slice(0, html.indexOf(start)) + html.slice(html.indexOf(end) + end.length) : html;
const closing = stripped.lastIndexOf('</section>');
if (closing < 0) throw new Error('charts section closing tag not found');
const next = `${stripped.slice(0, closing).trimEnd()}\n${section}\n${stripped.slice(closing)}`;
writeFileSync(target, source.replace(page[1], () => JSON.stringify(next)));
console.log('ChartMetric: three public root specimens rendered');
