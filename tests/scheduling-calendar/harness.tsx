/* Live harness for SchedulingCalendar (HAR-1506, U2), bundled by build.mjs from source for
 * tests/a11y/scheduling-calendar.spec.mjs. One calendar per page, picked by `?case=`:
 *   - controlled: the consumer-owned month — 50 items on 07.10 cut to 3 chips, a day with a
 *     count and no chip, a 3-day span, and `?windows=N` overlapping windows in that week;
 *   - encodings: every band, status, marker emphasis and window pattern once, with a legend
 *     of the same swatches;
 *   - empty: no entries and an `emptyNote`;
 *   - timegrid (HAR-1509): the Week time grid — an overnight item, a 30-hour item, an all-day
 *     item, three overlapping windows, consumer counts, a now-line, and moves that are logged
 *     and never applied (`?move=0` turns moving off, `?reject=1` answers with a rejection,
 *     `?date=` picks the week, `?view=day` shows one day, `?empty=1` shows no entries,
 *     `?caps=1` fills the window strip and the top lane past their caps);
 *   - dense: 350 events in one week;
 *   - lanes: five overlapping items in one day, to watch the lane count follow the width;
 *   - agenda (HAR-1520): day groups built here, with a window note, a day whose rows are not
 *     shown, a long title and markers (`?rows=N` makes N rows over 20 days, for virtualisation);
 *   - counts: the month with `monthDensity="counts"`.
 * window.__calendar records what each callback was called with. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SchedulingCalendar } from '../../packages/react/src/index.js';
import type {
  SchedulingAgendaGroup, SchedulingBand, SchedulingCalendarEntry, SchedulingCalendarOverlay, SchedulingCalendarProps, SchedulingLegendItem,
  SchedulingMarkerEmphasis, SchedulingOverlayPattern, SchedulingStatus,
} from '../../packages/react/src/index.js';

interface Calls { entries: string[]; overlays: string[]; dates: string[]; more: string[]; moves: Array<{ id: string; start: string; end: string; adjusted: string | null }> }
declare global { interface Window { __calendar: Calls } }
const calls: Calls = (window.__calendar = { entries: [], overlays: [], dates: [], more: [], moves: [] });

const params = new URLSearchParams(location.search);
const scenario = params.get('case') ?? 'controlled';
const windowCount = Number(params.get('windows') ?? 0);

const at = (date: string, hour: number, minutes: number, id: string, extra: Partial<SchedulingCalendarEntry> = {}): SchedulingCalendarEntry => {
  const start = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
  return { id, title: `Item ${id}`, start: new Date(start).toISOString(), end: new Date(start + minutes * 60_000).toISOString(), ...extra };
};
const hold = (id: string, from: string, to: string, extra: Partial<SchedulingCalendarOverlay> = {}): SchedulingCalendarOverlay => ({
  id, label: `Window ${id}`, kindLabel: 'Hold', start: `${from}T06:00:00Z`, end: `${to}T18:00:00Z`, pattern: 'diagonal', ...extra,
});

const BANDS: SchedulingBand[] = ['none', 'low', 'medium', 'high'];
const STATUSES: SchedulingStatus[] = ['tentative', 'committed', 'live', 'done', 'dead'];
const EMPHASES: SchedulingMarkerEmphasis[] = ['refused', 'warning', 'neutral'];
const PATTERNS: SchedulingOverlayPattern[] = ['diagonal', 'cross', 'dotted', 'solid'];

const common: Pick<SchedulingCalendarProps, 'anchorDate' | 'timeZone' | 'locale' | 'onSelectEntry' | 'onSelectOverlay' | 'onSelectDate' | 'onAnchorDateChange'> = {
  anchorDate: '2026-10-07',
  timeZone: 'Europe/Berlin',
  locale: 'en-GB',
  onSelectEntry: (entry) => { calls.entries.push(entry.id); },
  onSelectOverlay: (overlay) => { calls.overlays.push(overlay.id); },
  onSelectDate: (date) => { calls.dates.push(date); },
  onAnchorDateChange: () => {},
};

function Controlled() {
  const busy = Array.from({ length: 50 }, (_, index) => at('2026-10-07', 6 + (index % 12), 30, `b${index}`));
  const legend: SchedulingLegendItem[] = [
    { id: 'high', label: 'High band', swatch: { band: 'high' } },
    { id: 'hold', label: 'Hold window', swatch: { pattern: 'diagonal' } },
  ];
  return <SchedulingCalendar
    {...common}
    entries={[{ id: 'span3', title: 'Three-day item', start: '2026-10-05T08:00:00Z', end: '2026-10-07T16:00:00Z' }]}
    maxEntriesPerDay={3}
    dayEntries={{ '2026-10-07': busy.slice(0, 3), '2026-10-14': [at('2026-10-14', 7, 60, 'c1'), at('2026-10-14', 9, 60, 'c2', { band: 'high' })] }}
    days={{
      '2026-10-07': { count: 50, overflowCount: 47, label: '50 items' },
      '2026-10-08': { count: 7, overflowCount: 7, label: '7 items, 2 need review', markers: [{ id: 'review', label: 'Needs review', emphasis: 'warning' }] },
      '2026-10-14': { count: 2, overflowCount: 0, label: '2 items' },
    }}
    overlays={Array.from({ length: windowCount }, (_, index) => hold(`w${index}`, '2026-10-05', '2026-10-09'))}
    onShowMore={(date) => { calls.more.push(date); }}
    legend={legend}
    legendCaption="Times in Europe/Berlin"
  />;
}

function Encodings() {
  const entries: SchedulingCalendarEntry[] = [
    ...BANDS.map((band, index) => at('2026-10-05', 6 + index, 30, `band-${band}`, { band })),
    ...STATUSES.map((status, index) => at('2026-10-06', 6 + index, 30, `status-${status}`, { status })),
    ...EMPHASES.map((emphasis, index) => at('2026-10-07', 6 + index, 30, `marker-${emphasis}`, { markers: [{ id: emphasis, label: `Marked ${emphasis}`, emphasis }] })),
    at('2026-10-08', 6, 30, 'high-tentative', { band: 'high', status: 'tentative' }),
    at('2026-10-08', 7, 30, 'high-done', { band: 'high', status: 'done' }),
    at('2026-10-08', 8, 30, 'medium-live', { band: 'medium', status: 'live' }),
  ];
  const overlays: SchedulingCalendarOverlay[] = [
    hold('pattern-diagonal', '2026-10-12', '2026-10-13', { pattern: 'diagonal' }),
    hold('pattern-cross', '2026-10-14', '2026-10-15', { pattern: 'cross' }),
    hold('pattern-dotted', '2026-10-19', '2026-10-20', { pattern: 'dotted' }),
    hold('pattern-solid', '2026-10-21', '2026-10-22', { pattern: 'solid' }),
    hold('global', '2026-10-26', '2026-10-28', { label: 'Quarter close', kindLabel: 'Pause', global: true }),
    hold('scoped', '2026-10-29', '2026-10-30', { label: 'Payroll lock', scopeLabel: 'Payroll services', global: false, pattern: 'cross' }),
  ];
  const legend: SchedulingLegendItem[] = [
    ...BANDS.map((band) => ({ id: `band-${band}`, label: `Band ${band}`, swatch: { band } })),
    ...STATUSES.map((status) => ({ id: `status-${status}`, label: `Status ${status}`, swatch: { status } })),
    ...PATTERNS.map((pattern) => ({ id: `pattern-${pattern}`, label: `Pattern ${pattern}`, swatch: { pattern } })),
  ];
  return <SchedulingCalendar {...common} entries={entries} overlays={overlays} legend={legend} />;
}

function Empty() {
  return <SchedulingCalendar {...common} entries={[]} emptyNote="Nothing is scheduled this month." />;
}

// Europe/Berlin wall-clock times as instants: UTC+2 between the two clock changes of 2026, else UTC+1.
const berlin = (date: string, time: string) => new Date(`${date}T${time}:00${date >= '2026-03-29' && date < '2026-10-25' ? '+02:00' : '+01:00'}`).toISOString();
const timed = (id: string, [fromDate, from]: [string, string], [toDate, to]: [string, string], title: string, extra: Partial<SchedulingCalendarEntry> = {}): SchedulingCalendarEntry => ({ id, title, start: berlin(fromDate, from), end: berlin(toDate, to), ...extra });
const proposals = {
  canMove: params.get('move') !== '0',
  onProposeMove: (id: string, proposal: { start: string; end: string; adjusted: string | null }) => {
    calls.moves.push({ id, ...proposal });
    return params.get('reject') === '1' ? Promise.reject(new Error('refused')) : undefined;
  },
};

function TimeGrid() {
  const date = params.get('date') ?? '2026-10-07';
  const view = params.get('view') === 'day' ? 'day' : 'week';
  const entries: SchedulingCalendarEntry[] = params.get('empty') === '1' ? [] : [
    timed('plain', ['2026-10-07', '09:00'], ['2026-10-07', '10:00'], 'Router firmware'),
    timed('half', ['2026-10-07', '11:00'], ['2026-10-07', '11:30'], 'Queue drain', { band: 'medium' }),
    timed('quarter', ['2026-10-07', '12:00'], ['2026-10-07', '12:15'], 'Cache flush', { markers: [{ id: 'm', label: 'Needs sign-off', emphasis: 'warning' }] }),
    timed('high', ['2026-10-07', '13:00'], ['2026-10-07', '15:00'], 'Firewall rule update', { band: 'high', status: 'tentative' }),
    timed('pinned', ['2026-10-08', '09:00'], ['2026-10-08', '10:30'], 'Audit log export', { movable: false, status: 'done' }),
    timed('evening', ['2026-10-06', '22:00'], ['2026-10-07', '00:00'], 'Index rebuild'),
    timed('night', ['2026-10-05', '23:00'], ['2026-10-06', '02:00'], 'Overnight replication check'),
    timed('long', ['2026-10-06', '08:00'], ['2026-10-07', '14:00'], 'Data centre move'),
    timed('deep', ['2026-10-08', '23:00'], ['2026-10-09', '07:00'], 'Batch processing run'),
    timed('allday', ['2026-10-09', '00:00'], ['2026-10-10', '00:00'], 'Release day', { allDay: true }),
    timed('clash-a', ['2026-10-09', '09:00'], ['2026-10-09', '11:00'], 'Kernel patch wave 1'),
    timed('clash-b', ['2026-10-09', '09:30'], ['2026-10-09', '10:30'], 'Kernel patch wave 2', { status: 'live' }),
    // The clock-change days of 2026, for ?date=2026-03-29 and ?date=2026-10-25.
    timed('spring', ['2026-03-29', '03:00'], ['2026-03-29', '04:00'], 'After the gap'),
    timed('gap', ['2026-03-28', '02:30'], ['2026-03-28', '02:45'], 'Half past two'),
    timed('autumn', ['2026-10-25', '03:00'], ['2026-10-25', '04:00'], 'After the repeat'),
    timed('late', ['2026-10-24', '22:00'], ['2026-10-24', '23:00'], 'Late item'),
    // ?caps=1 fills the top lane past its three rows.
    ...(params.get('caps') === '1' ? [
      timed('cap-a', ['2026-10-09', '00:00'], ['2026-10-10', '00:00'], 'Review day', { allDay: true }),
      timed('cap-b', ['2026-10-09', '00:00'], ['2026-10-10', '00:00'], 'Inventory day', { allDay: true }),
    ] : []),
  ];
  const overlays: SchedulingCalendarOverlay[] = params.get('empty') === '1' ? [] : [
    { id: 'global', kindLabel: 'Pause', label: 'Quarter close', start: berlin('2026-10-08', '18:00'), end: berlin('2026-10-10', '06:00'), pattern: 'diagonal', global: true },
    { id: 'scoped', kindLabel: 'Hold', label: 'Payroll lock', scopeLabel: 'Payroll services', start: berlin('2026-10-06', '00:00'), end: berlin('2026-10-08', '00:00'), pattern: 'cross', global: false },
    { id: 'third', kindLabel: 'Maintenance', label: 'Network core', scopeLabel: 'Network services', start: berlin('2026-10-07', '22:00'), end: berlin('2026-10-09', '06:00'), pattern: 'dotted' },
    // ?caps=1 adds a window that finds both lanes of the strip taken.
    ...(params.get('caps') === '1' ? [{ id: 'fourth', kindLabel: 'Hold', label: 'Storage cluster', scopeLabel: 'Storage', start: berlin('2026-10-08', '20:00'), end: berlin('2026-10-09', '04:00'), pattern: 'cross' as const }] : []),
  ];
  return <SchedulingCalendar
    {...common} {...proposals} anchorDate={date} view={view} timeGrid entries={entries} overlays={overlays}
    now={params.get('now') ?? berlin('2026-10-08', '10:30')}
    days={params.get('empty') === '1' ? undefined : {
      '2026-10-07': { count: 6, overflowCount: 2, label: 'Wednesday 7 October 2026, 6 items, 1 needs sign-off', markers: [{ id: 's', label: 'Sign-off', emphasis: 'warning' }] },
      '2026-10-09': { count: 4, overflowCount: 0, label: 'Friday 9 October 2026, 4 items' },
    }}
    onShowMore={(day) => { calls.more.push(day); }}
    emptyNote="Nothing is scheduled this week."
  />;
}

function Dense() {
  const start = Date.parse('2026-10-05T04:00:00Z');
  const entries = Array.from({ length: 350 }, (_, index): SchedulingCalendarEntry => {
    const from = start + (index % 7) * 24 * 3_600_000 + ((index * 37) % 60) * 15 * 60_000;
    return { id: `e${index}`, title: `Event ${index}`, start: new Date(from).toISOString(), end: new Date(from + (1 + (index % 4)) * 30 * 60_000).toISOString(), band: index % 11 === 0 ? 'high' : 'none' };
  });
  return <SchedulingCalendar {...common} {...proposals} view="week" timeGrid entries={entries} onShowMore={(day) => { calls.more.push(day); }} />;
}

function Lanes() {
  const entries = ['09:00', '09:10', '09:20', '09:30', '09:40'].map((from, index) => timed(`l${index}`, ['2026-10-07', from], ['2026-10-07', '12:00'], `Parallel item ${index + 1}`, index === 0 ? { markers: [{ id: 'm', label: 'Flagged', emphasis: 'refused' }] } : {}));
  // The period buttons work here, so a test can leave the week and come back.
  const [anchor, setAnchor] = useState('2026-10-07');
  return <SchedulingCalendar {...common} anchorDate={anchor} onAnchorDateChange={setAnchor} view={params.get('view') === 'day' ? 'day' : 'week'} timeGrid maxLanes={Number(params.get('max') ?? 4)} entries={entries} onShowMore={(day) => { calls.more.push(day); }} />;
}

function Agenda() {
  const many = Number(params.get('rows') ?? 0);
  const payroll: SchedulingCalendarOverlay = { id: 'payroll', kindLabel: 'Hold', label: 'Payroll lock', scopeLabel: 'Payroll services', start: berlin('2026-10-07', '00:00'), end: berlin('2026-10-08', '00:00'), pattern: 'cross' };
  const groups: SchedulingAgendaGroup[] = many > 0
    ? Array.from({ length: 20 }, (_, day) => {
      const date = `2026-10-${String(day + 1).padStart(2, '0')}`;
      const perDay = Math.ceil(many / 20);
      return { date, rows: Array.from({ length: Math.min(perDay, many - day * perDay) }, (_, index) => timed(`r${day * perDay + index}`, [date, '08:00'], [date, '09:00'], `Row ${day * perDay + index + 1}`)) };
    }).filter((group) => group.rows.length > 0)
    : [
      { date: '2026-10-07', annotations: [payroll], rows: [
        timed('a1', ['2026-10-07', '08:00'], ['2026-10-07', '09:00'], 'Router firmware', { status: 'live' }),
        timed('a2', ['2026-10-07', '10:00'], ['2026-10-07', '11:30'], 'Firewall rule update for the payment gateway cluster in the secondary data centre, second attempt after the vendor fix', { band: 'high', status: 'tentative', meta: 'Network · Payments', markers: [{ id: 'm', label: 'Needs sign-off', emphasis: 'warning' }] }),
        timed('a3', ['2026-10-07', '13:00'], ['2026-10-07', '14:00'], 'Payroll export job', { band: 'medium' }),
      ] },
      { date: '2026-10-08', rows: [], hiddenCount: 4 },
      { date: '2026-10-09', continuesCount: 2, rows: [
        timed('a4', ['2026-10-09', '09:00'], ['2026-10-09', '10:00'], 'Audit log export', { status: 'done' }),
        timed('a5', ['2026-10-09', '15:00'], ['2026-10-09', '16:00'], 'Mail relay switch', { status: 'dead', markers: [{ id: 'd', label: 'Declined', emphasis: 'refused' }] }),
      ] },
    ];
  return <SchedulingCalendar {...common} view="agenda" entries={[]} agendaGroups={groups} onShowMore={(day) => { calls.more.push(day); }} notice={<p>Showing the first 500 items in this range.</p>} />;
}

function Counts() {
  return <SchedulingCalendar
    {...common} view="month" monthDensity="counts" showHeader={false} entries={[{ id: 'span', title: 'Three days', start: '2026-10-05T08:00:00Z', end: '2026-10-07T16:00:00Z' }]}
    dayEntries={{ '2026-10-07': [timed('pick', ['2026-10-07', '08:00'], ['2026-10-07', '09:00'], 'A pick')] }}
    days={{
      '2026-10-07': { count: 12, overflowCount: 11, label: '12 items, 1 needs sign-off', markers: [{ id: 'm', label: 'Needs sign-off', emphasis: 'warning' }] },
      '2026-10-08': { count: 3, overflowCount: 0, label: '3 items' },
      '2026-10-15': { count: 128, overflowCount: 125, label: '128 items' },
    }}
    overlays={[{ id: 'w', label: 'Quarter close', kindLabel: 'Hold', start: berlin('2026-10-05', '00:00'), end: berlin('2026-10-10', '00:00'), pattern: 'diagonal', global: true }]}
    onShowMore={(day) => { calls.more.push(day); }}
  />;
}

const CASES: Record<string, () => JSX.Element> = { controlled: Controlled, encodings: Encodings, empty: Empty, timegrid: TimeGrid, dense: Dense, lanes: Lanes, agenda: Agenda, counts: Counts };
const Case = CASES[scenario] ?? Controlled;

createRoot(document.getElementById('root')!).render(<StrictMode><Case /></StrictMode>);
