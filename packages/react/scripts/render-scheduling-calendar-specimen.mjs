// Regenerates the SchedulingCalendar specimens on the docs page `examples-scheduling-calendar`
// (HAR-1506) from the BUILT package, so the styleguide shows exactly the markup the component
// renders. The page used to be hand-written HTML and had drifted from the component.
//
//   npm run build:react   (or: npm run build -w @tensor_1/react)
//   node packages/react/scripts/render-scheduling-calendar-specimen.mjs
//
// The static docs have no React runtime. The first specimen is rendered once per view; the
// docs script (guide/phase-46-9.js) shows the panel whose view button was pressed, through the
// `data-calendar-view` / `data-calendar-panel` attributes added here. Every date goes through
// an injected `formatDate` / `formatInstant` (as a product does), so the markup does not depend
// on the ICU version of the Node that renders it. packages/react/src/scheduling-calendar-specimen.test.mjs
// fails when the committed page differs from what this script renders.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SchedulingCalendar, layoutMonthSpans, schedulingGridDays, zonedDateKey, zonedTimeOfDay } from '../dist/index.js';
import { CircleXIcon, FileTextIcon, TriangleAlertIcon } from '../dist/icons.js';

const here = dirname(fileURLToPath(import.meta.url));
export const SHOWCASE_DATA = join(here, '../../tokens/docs/showcase-data.js');
const START = '<!-- scheduling-calendar-specimen:start -->';
const END = '<!-- scheduling-calendar-specimen:end -->';
/** The hand-written part this script first replaced ended where the timeline specimen begins. */
const NEXT_SPECIMEN = '<h3 data-timeline-specimen>';

const TZ = 'Europe/Berlin';
const noop = () => {};
const SUMMARY = 'A calm month in one explicit time zone: each item drawn once, counts owned by the consumer, named windows, and an agenda fallback.';

// A product date format, with no Intl: DD.MM.YYYY, English weekday and month names.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatDate = (date, part) => {
  const [year, month, day] = date.split('-');
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (part === 'weekday') return weekday.slice(0, 3);
  if (part === 'month') return `${MONTHS[Number(month) - 1]} ${year}`;
  return `${weekday} ${day}.${month}.${year}`;
};
const formatInstant = (instant) => {
  const [year, month, day] = zonedDateKey(instant, TZ).split('-');
  return `${day}.${month}.${year} ${zonedTimeOfDay(instant, TZ)}`;
};

/** A wall-clock time in Europe/Berlin as a UTC instant: UTC+2 until 25.10.2026, UTC+1 after. */
const berlin = (date, time) => new Date(`${date}T${time}:00${date < '2026-10-25' ? '+02:00' : '+01:00'}`).toISOString();
const item = (id, date, from, to, title, extra = {}) => ({ id, title, start: berlin(date, from), end: berlin(to <= from ? nextDay(date) : date, to), ...extra });
const nextDay = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const span = (id, [fromDate, from], [toDate, to], title, extra = {}) => ({ id, title, start: berlin(fromDate, from), end: berlin(toDate, to), ...extra });
const icon = (Icon) => h(Icon);
const needsSignOff = { id: 'sign-off', label: 'Needs sign-off', emphasis: 'warning', icon: icon(TriangleAlertIcon) };
const declined = { id: 'declined', label: 'Declined', emphasis: 'refused', icon: icon(CircleXIcon) };
const hasNotes = { id: 'notes', label: 'Has notes', emphasis: 'neutral', icon: icon(FileTextIcon) };

const ENTRIES = [
  item('e01', '2026-10-01', '09:00', '10:00', 'Certificate renewal'),
  item('e02', '2026-10-02', '14:00', '15:00', 'Load balancer config', { band: 'medium' }),
  item('e03', '2026-10-05', '07:30', '08:30', 'Database patch', { status: 'done' }),
  item('e04', '2026-10-06', '10:00', '11:00', 'Firewall rule update', { band: 'high', markers: [needsSignOff] }),
  item('e05', '2026-10-06', '13:00', '14:00', 'VPN gateway upgrade'),
  item('e06', '2026-10-07', '08:00', '09:00', 'Router firmware', { status: 'live' }),
  item('e07', '2026-10-07', '11:00', '12:30', 'Storage expansion', { status: 'tentative' }),
  item('e08', '2026-10-07', '15:00', '16:00', 'Payroll export job', { band: 'medium' }),
  item('e09', '2026-10-07', '18:00', '19:00', 'DNS zone cleanup'),
  item('e10', '2026-10-08', '09:00', '10:00', 'Mail relay switch', { status: 'dead' }),
  // 22:00 to midnight stays on its start day: day membership is end-exclusive.
  item('e11', '2026-10-09', '22:00', '00:00', 'Index rebuild'),
  item('e12', '2026-10-15', '10:00', '11:00', 'Backup policy update', { status: 'tentative' }),
  item('e13', '2026-10-15', '13:30', '14:30', 'Core switch reload', { band: 'high', markers: [declined] }),
  item('e14', '2026-10-16', '14:00', '15:00', 'Wiki migration', { status: 'done' }),
  item('e15', '2026-10-20', '07:00', '08:00', 'Kernel patch wave 1'),
  item('e16', '2026-10-21', '07:00', '08:00', 'Kernel patch wave 2', { markers: [hasNotes] }),
  item('e17', '2026-10-22', '13:00', '14:00', 'Proxy certificate swap', { band: 'high' }),
  item('e18', '2026-10-23', '09:00', '10:00', 'Printer fleet firmware'),
  item('e19', '2026-10-27', '10:00', '11:00', 'Archive storage tiering', { band: 'medium' }),
  item('e20', '2026-10-28', '15:00', '16:00', 'Monitoring agent rollout'),
  item('e21', '2026-10-29', '08:30', '09:30', 'Directory sync cut-over', { band: 'high', status: 'tentative' }),
  item('e22', '2026-10-30', '11:00', '12:00', 'Access review export'),
  // More than one day: drawn once per week row, never once per day.
  span('s01', ['2026-10-12', '08:00'], ['2026-10-14', '17:00'], 'Data centre move, phase 1', { band: 'medium' }),
  span('s02', ['2026-10-23', '20:00'], ['2026-10-26', '06:00'], 'Batch processing run'),
  span('s03', ['2026-10-07', '23:00'], ['2026-10-08', '02:00'], 'Overnight replication check'),
];

const OVERLAYS = [
  // Five days, one labelled span. Global: it applies to everything.
  { id: 'w1', kindLabel: 'Hold', label: 'Quarter close', start: berlin('2026-10-05', '00:00'), end: berlin('2026-10-10', '00:00'), pattern: 'diagonal', global: true },
  { id: 'w2', kindLabel: 'Maintenance', label: 'Network core', scopeLabel: 'Network services', start: berlin('2026-10-06', '22:00'), end: berlin('2026-10-08', '06:00'), pattern: 'dotted' },
  // The third window over the same week row: two lanes are kept, so the row shows "+1".
  { id: 'w3', kindLabel: 'Hold', label: 'Payroll run', scopeLabel: 'Payroll services', start: berlin('2026-10-07', '00:00'), end: berlin('2026-10-09', '00:00'), pattern: 'cross' },
  { id: 'w4', kindLabel: 'Maintenance', label: 'Storage cluster', scopeLabel: 'Storage', start: berlin('2026-10-19', '20:00'), end: berlin('2026-10-21', '04:00'), pattern: 'dotted' },
  { id: 'w5', kindLabel: 'Hold', label: 'Month end', start: berlin('2026-10-30', '00:00'), end: berlin('2026-11-03', '00:00'), pattern: 'diagonal', global: true },
];

// The legend is the encodings on screen, nothing else.
const LEGEND = [
  { id: 'high', label: 'High band', swatch: { band: 'high' } },
  { id: 'medium', label: 'Medium band', swatch: { band: 'medium' } },
  { id: 'tentative', label: 'Tentative', swatch: { status: 'tentative' } },
  { id: 'live', label: 'In progress', swatch: { status: 'live' } },
  { id: 'done', label: 'Done', swatch: { status: 'done' } },
  { id: 'dead', label: 'Cancelled', swatch: { status: 'dead' } },
  { id: 'hold', label: 'Hold, everything', swatch: { pattern: 'diagonal' } },
  { id: 'scoped-hold', label: 'Hold, scoped', swatch: { pattern: 'cross' } },
  { id: 'maintenance', label: 'Maintenance', swatch: { pattern: 'dotted' } },
  { id: 'sign-off', label: 'Needs sign-off', swatch: { icon: icon(TriangleAlertIcon) } },
  { id: 'declined', label: 'Declined', swatch: { icon: icon(CircleXIcon) } },
  { id: 'notes', label: 'Has notes', swatch: { icon: icon(FileTextIcon) } },
];

const shared = { timeZone: TZ, anchorDate: '2026-10-07', formatDate, formatInstant, onShowMore: noop, onSelectEntry: noop, onSelectOverlay: noop, onSelectDate: noop, onAnchorDateChange: noop };

/** Marks each view button so the docs script can switch panels. */
const withViewHooks = (markup) => markup.replace(/(<button type="button" class="uix-segmented__option")([^>]*>)(Month|Week|Agenda)(<\/button>)/g, (_, open, rest, label, close) => `${open} data-calendar-view="${label.toLowerCase()}"${rest}${label}${close}`);

function overview() {
  const panel = (view) => withViewHooks(renderToStaticMarkup(h(SchedulingCalendar, {
    ...shared, view, entries: ENTRIES, overlays: OVERLAYS, maxEntriesPerDay: 3, legend: LEGEND,
    legendCaption: 'Times in Europe/Berlin. A hatched bar is a window; its words say which kind and what it applies to.',
  })));
  return `<div data-calendar-views>`
    + `<div data-calendar-panel="month">${panel('month')}</div>`
    + `<div data-calendar-panel="week" hidden>${panel('week')}</div>`
    + `<div data-calendar-panel="agenda" data-calendar-agenda hidden>${panel('agenda')}</div>`
    + `</div>`;
}

function controlled() {
  const patch = (index) => item(`p${index}`, '2026-10-07', `${String(6 + (index % 12)).padStart(2, '0')}:00`, `${String(7 + (index % 12)).padStart(2, '0')}:00`, `Patch wave, batch ${String(index + 1).padStart(2, '0')}`, index === 0 ? { band: 'high' } : {});
  const upgrade = span('c-span', ['2026-10-12', '09:00'], ['2026-10-14', '16:00'], 'Cluster upgrade');
  const grid = schedulingGridDays(shared.anchorDate, 'month', 1);
  // The consumer lays the spans out itself: it needs the visible ones to work out each day's "+N".
  const spanLayout = layoutMonthSpans([{ id: upgrade.id, start: upgrade.start, end: upgrade.end, group: 'item' }], grid, { timeZone: TZ, weekStartsOn: 1, laneCap: 1 });
  return renderToStaticMarkup(h(SchedulingCalendar, {
    ...shared, showHeader: false, entries: [upgrade], spanLayout, windowLaneCap: 0, spanLaneCap: 1, maxEntriesPerDay: 3,
    dayEntries: {
      '2026-10-07': [patch(0), patch(1), patch(2)],
      '2026-10-13': [item('c1', '2026-10-13', '08:00', '09:00', 'Gateway restart'), item('c2', '2026-10-13', '10:00', '11:00', 'Queue drain'), item('c3', '2026-10-13', '14:00', '15:00', 'Cache warm-up')],
      '2026-10-20': [item('c4', '2026-10-20', '09:00', '10:00', 'Report scheduler move'), item('c5', '2026-10-20', '13:00', '14:00', 'Audit log export')],
    },
    days: {
      '2026-10-07': { count: 50, overflowCount: 47, label: '50 items, 4 in the high band', markers: [{ ...needsSignOff, label: '2 need sign-off' }] },
      '2026-10-08': { count: 7, overflowCount: 7, label: '7 items' },
      // 5 items: 3 chips and the span are on screen, so one is left.
      '2026-10-13': { count: 5, overflowCount: 1, label: '5 items' },
      '2026-10-20': { count: 2, overflowCount: 0, label: '2 items' },
    },
    notice: 'Showing 2,000 of 2,340 items in this range. Narrow the filters to see the rest.',
    legend: [{ id: 'high', label: 'High band', swatch: { band: 'high' } }, { id: 'sign-off', label: 'Needs sign-off', swatch: { icon: icon(TriangleAlertIcon) } }],
    legendCaption: 'Times in Europe/Berlin.',
  }));
}

function empty() {
  return renderToStaticMarkup(h(SchedulingCalendar, {
    ...shared, anchorDate: '2026-11-18', view: 'week', weekStartsOn: 0, showHeader: false, entries: [],
    emptyNote: 'Nothing is scheduled this week.', legend: [],
  }));
}

const block = (title, text, markup) => `<h3>${title}</h3><p>${text}</p>${markup}`;

/** The generated part of the page, between its two markers. */
export function renderSchedulingCalendarSpecimen() {
  return START + [
    block('Month: a calm overview', 'Each item is drawn once. An item on one day is a chip that reads <code>HH:MM title</code>; an item over several days is one bar per week row. Only the <code>high</code> band is filled; <code>medium</code> has a heavier leading edge, and the state is a line style (dashed, dotted, a leading dot, dimmed), never a colour. Windows sit in their own lanes above the chips and never take a chip slot. A week row with more windows than lanes shows “+1” at its end. Every cell keeps the same height. Use the view switch for the week and the agenda.', overview()),
    block('Counts and picks owned by the consumer', 'With <code>days</code> and <code>dayEntries</code> the calendar places, ranks, cuts and counts nothing. It draws the chips it is given in the order given, shows each day’s <code>count</code> and markers even when no chip fits, and takes “+N” from <code>overflowCount</code>. The day with 50 items shows three chips and “+47 more”, which calls <code>onShowMore</code> and never expands the cell. The consumer computes the span lanes with <code>layoutMonthSpans</code> and passes the result as <code>spanLayout</code>. Here <code>showHeader</code> is off (the page has its own toolbar) and a <code>notice</code> says the list was cut.', controlled()),
    block('An empty range', 'With <code>emptyNote</code> every day cell is still drawn, and the note sits inside the grid. This week starts on Sunday (<code>weekStartsOn</code>), and the dates use the injected <code>formatDate</code>.', empty()),
  ].join('') + END;
}

/** `source` (showcase-data.js) with the calendar specimens replaced by `specimen`. */
export function applySchedulingCalendarSpecimen(source, specimen = renderSchedulingCalendarSpecimen()) {
  const slug = source.indexOf('"slug": "examples-scheduling-calendar"');
  if (slug === -1) throw new Error('examples-scheduling-calendar page not found');
  const from = source.indexOf('"html": ', slug) + '"html": '.length;
  const to = source.indexOf('\n', from);
  const html = JSON.parse(source.slice(from, to)).replace(/<p class="lead">[^<]*<\/p>/, `<p class="lead">${SUMMARY}</p>`);
  const lead = html.indexOf('</p>') + '</p>'.length;
  const start = html.includes(START) ? html.indexOf(START) : lead;
  const end = html.includes(END) ? html.indexOf(END) + END.length : html.indexOf(NEXT_SPECIMEN);
  if (start < lead || end < start) throw new Error('examples-scheduling-calendar: the specimen boundaries were not found');
  const next = `${html.slice(0, start).trimEnd()}\n      ${specimen}\n      ${html.slice(end).trimStart()}`;
  const head = source.slice(0, from).replace(/("slug": "examples-scheduling-calendar",[\s\S]*?"summary": )"(?:[^"\\]|\\.)*"/,(_, before) => `${before}${JSON.stringify(SUMMARY)}`);
  return head + JSON.stringify(next) + source.slice(to);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const specimen = renderSchedulingCalendarSpecimen();
  writeFileSync(SHOWCASE_DATA, applySchedulingCalendarSpecimen(readFileSync(SHOWCASE_DATA, 'utf8'), specimen));
  console.log(`scheduling-calendar specimens: ${specimen.length} characters`);
}
