// Regenerates the SchedulingTimeline specimen on the docs page `examples-scheduling-calendar`
// (HAR-1521) from the BUILT package, so the styleguide shows exactly the markup the component
// renders. The specimen used to be pasted 2.33 markup: one band per lane, state tints and the
// resize hint.
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-scheduling-timeline-specimen.mjs
//
// The page is ONE generated line of packages/tokens/docs/showcase-data.js that the calendar
// script (render-scheduling-calendar-specimen.mjs) also writes. This script replaces only its
// own region, between the two markers below, and leaves every other byte of the file alone;
// running it twice changes nothing. The first time, with no markers yet, it took over the old
// specimen: from the `<h3 data-timeline-specimen>` heading to the end of the timeline section.
// The heading keeps that attribute: the calendar script looks for it.
//
// Every date goes through an injected `formatTick` / `formatInstant` (as a product does), so
// the markup does not depend on the ICU version of the Node that renders it.
// packages/react/src/scheduling-timeline-specimen.test.mjs fails when the committed page
// differs from what this script renders.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SchedulingTimeline, zonedDateKey, zonedTimeOfDay } from '../dist/index.js';
import { TriangleAlertIcon } from '../dist/icons.js';

const here = dirname(fileURLToPath(import.meta.url));
export const SHOWCASE_DATA = join(here, '../../tokens/docs/showcase-data.js');
export const START = '<!-- scheduling-timeline-specimen:start -->';
export const END = '<!-- scheduling-timeline-specimen:end -->';
const HEADING = '<h3 data-timeline-specimen>';
const SECTION = '<section class="uix-scheduling-timeline"';

const TZ = 'Europe/Berlin';
const noop = () => {};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A wall-clock time in Europe/Berlin as a UTC instant: UTC+2 until 25.10.2026. */
const berlin = (date, time) => new Date(`${date}T${time}:00+02:00`).toISOString();
const formatInstant = (instant) => {
  const [year, month, day] = zonedDateKey(instant, TZ).split('-');
  return `${day}.${month}.${year} ${zonedTimeOfDay(instant, TZ)}`;
};
// A day tick reads "Mon 05.10."; a sub-tick asks as an hour and reads "06".
const formatTick = (at, scale) => {
  if (scale === 'hour') return zonedTimeOfDay(at, TZ).slice(0, 2);
  const date = zonedDateKey(at, TZ);
  const [, month, day] = date.split('-');
  return `${WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]} ${day}.${month}.`;
};
// Every bar names its status: the generic channel, drawn as a line style.
const bar = (id, laneId, [fromDate, from], [toDate, to], title, extra = {}) => ({ id, laneId, title, start: berlin(fromDate, from), end: berlin(toDate, to), status: 'committed', ...extra });

const LANES = [
  { id: 'checkout', label: 'Checkout API', meta: 'Tier 1' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'core', label: 'Core switch' },
  { id: 'edge', label: 'Edge routers', meta: '12 devices' },
  { id: 'objects', label: 'Object store' },
  { id: 'vault', label: 'Backup vault' },
];

// The consumer builds the groups and owns every number on them. Storage is collapsed: one row.
const GROUPS = [
  { id: 'payments', label: 'Payments', meta: '2 services', laneIds: ['checkout', 'ledger'] },
  { id: 'network', label: 'Network', meta: '2 services', laneIds: ['core', 'edge'] },
  { id: 'storage', label: 'Storage', laneIds: ['objects', 'vault'], collapsed: true, summary: { count: 9, markers: [{ id: 'sign-off', label: '2 need sign-off', emphasis: 'warning', icon: h(TriangleAlertIcon) }] } },
];

const ITEMS = [
  // Checkout API: the first two run together, the third starts after the first ends, so two
  // sub-rows hold three bars. The marker says why two of them clash, in the words of the consumer.
  bar('t01', 'checkout', ['2026-10-05', '08:00'], ['2026-10-06', '08:00'], 'Schema update', { band: 'medium' }),
  bar('t02', 'checkout', ['2026-10-05', '20:00'], ['2026-10-07', '00:00'], 'Cache warm-up', { markers: [{ id: 'shared', label: 'Shares a database with Schema update', emphasis: 'refused' }] }),
  bar('t03', 'checkout', ['2026-10-06', '10:00'], ['2026-10-06', '20:00'], 'Queue drain'),
  bar('t04', 'checkout', ['2026-10-09', '09:00'], ['2026-10-09', '21:00'], 'Rate limit rollout', { status: 'tentative' }),
  bar('t05', 'ledger', ['2026-10-07', '09:00'], ['2026-10-08', '15:00'], 'Ledger cut-over', { band: 'high' }),
  bar('t06', 'ledger', ['2026-10-10', '06:00'], ['2026-10-10', '18:00'], 'Report rebuild', { status: 'done' }),
  bar('t07', 'core', ['2026-10-06', '06:00'], ['2026-10-07', '06:00'], 'Firmware rollout', { status: 'live' }),
  bar('t08', 'core', ['2026-10-08', '20:00'], ['2026-10-09', '08:00'], 'Routing table review'),
  bar('t09', 'edge', ['2026-10-08', '06:00'], ['2026-10-09', '00:00'], 'Cabling audit', { movable: false }),
  bar('t10', 'edge', ['2026-10-08', '12:00'], ['2026-10-09', '18:00'], 'Config backup'),
  bar('t11', 'objects', ['2026-10-06', '08:00'], ['2026-10-07', '08:00'], 'Tiering'),
  bar('t12', 'vault', ['2026-10-08', '08:00'], ['2026-10-09', '08:00'], 'Vault rotation'),
];

const OVERLAYS = [
  // No lanes named: over every row.
  { id: 'w1', kindLabel: 'Hold', label: 'Quarter close', start: berlin('2026-10-10', '00:00'), end: berlin('2026-10-12', '00:00'), pattern: 'diagonal' },
  // Two lanes named, one in each group: one element, drawn over those two lanes only.
  { id: 'w2', kindLabel: 'Maintenance', label: 'Storage network', scopeLabel: '2 services', start: berlin('2026-10-06', '12:00'), end: berlin('2026-10-08', '06:00'), pattern: 'dotted', laneIds: ['ledger', 'edge'] },
];

/** The specimen: the heading, its text and the component, between the two markers. */
export function renderSchedulingTimelineSpecimen() {
  const markup = renderToStaticMarkup(h(SchedulingTimeline, {
    lanes: LANES, groups: GROUPS, items: ITEMS, overlays: OVERLAYS,
    range: { start: berlin('2026-10-05', '00:00'), end: berlin('2026-10-12', '00:00') },
    scale: 'day', subTicks: [6, 12, 18], timeZone: TZ, now: berlin('2026-10-06', '14:00'),
    formatTick, formatInstant,
    renderItem: (item) => `${zonedTimeOfDay(item.start, TZ)} ${item.title}`,
    // What clashes comes from the consumer, as a marker with a reason; the generic stacking flag is off.
    flagOverlaps: false,
    onSelectItem: noop, onSelectOverlay: noop, onToggleGroup: noop,
    // A move is a proposal. There is no onResizeItem, so no bar can be resized.
    onProposeMove: noop,
    notice: 'Showing 500 of 512 items in this range. Narrow the filters to see the rest.',
    columnNotes: { '2026-10-08': '12 not shown' },
  }));
  const text = 'Services in collapsible groups, in Europe/Berlin. Bars that share time stack in sub-rows, packed by the same <code>packLanes</code> the calendar uses, and read <code>HH:MM title</code> through <code>renderItem</code>, cut at a word. Storage is collapsed: one row with the count and marker the consumer passes in <code>summary</code>. Each day has minor ticks at 06, 12 and 18 (<code>subTicks</code>). A window is one neutral, patterned element with its kind, name and scope as text: “Quarter close” names no lanes and covers every row, “Storage network” names two lanes (<code>laneIds</code>) and is drawn over those two only. Only the <code>high</code> band is filled; the state is a line style and “now” is a neutral line. With <code>onProposeMove</code> a bar is dragged, or moved with Shift and an arrow key and confirmed with Enter; the timeline then hands the consumer the proposal and never moves the bar itself. Without <code>onResizeItem</code> no bar can be resized. The <code>notice</code> sits above the axis and <code>columnNotes</code> puts the consumer’s count on its day. Above 150 rows only the rows near the viewport are mounted.';
  return `${START}${HEADING}SchedulingTimeline — service lanes on a time axis</h3>\n      <p>${text}</p>\n      ${markup}${END}`;
}

/** The end of the element that opens at `from`: the index after its closing tag, nested elements of the same name counted. */
function elementEnd(html, from, tag) {
  const pattern = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  pattern.lastIndex = from;
  let depth = 0;
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }
  return -1;
}

/** `source` (showcase-data.js) with the timeline specimen replaced by `specimen`. Nothing else changes. */
export function applySchedulingTimelineSpecimen(source, specimen = renderSchedulingTimelineSpecimen()) {
  const slug = source.indexOf('"slug": "examples-scheduling-calendar"');
  if (slug === -1) throw new Error('examples-scheduling-calendar page not found');
  const from = source.indexOf('"html": ', slug) + '"html": '.length;
  const to = source.indexOf('\n', from);
  const html = JSON.parse(source.slice(from, to));
  let start;
  let end;
  if (html.includes(START)) {
    start = html.indexOf(START);
    end = html.indexOf(END, start);
    if (end === -1) throw new Error('examples-scheduling-calendar: the timeline start marker has no end marker');
    end += END.length;
  } else {
    // The pasted specimen: the marker heading, its text, and the one timeline section.
    start = html.indexOf(HEADING);
    const section = start === -1 ? -1 : html.indexOf(SECTION, start);
    end = section === -1 ? -1 : elementEnd(html, section, 'section');
  }
  if (start === -1 || end === -1 || end < start) throw new Error('examples-scheduling-calendar: the timeline specimen was not found');
  return source.slice(0, from) + JSON.stringify(html.slice(0, start) + specimen + html.slice(end)) + source.slice(to);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const specimen = renderSchedulingTimelineSpecimen();
  const before = readFileSync(SHOWCASE_DATA, 'utf8');
  const after = applySchedulingTimelineSpecimen(before, specimen);
  if (after !== before) writeFileSync(SHOWCASE_DATA, after);
  console.log(`scheduling-timeline specimen: ${specimen.length} characters${after === before ? ' (already up to date)' : ''}`);
}
