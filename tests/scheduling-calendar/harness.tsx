/* Live harness for SchedulingCalendar (HAR-1506, U2), bundled by build.mjs from source for
 * tests/a11y/scheduling-calendar.spec.mjs. One calendar per page, picked by `?case=`:
 *   - controlled: the consumer-owned month — 50 items on 07.10 cut to 3 chips, a day with a
 *     count and no chip, a 3-day span, and `?windows=N` overlapping windows in that week;
 *   - encodings: every band, status, marker emphasis and window pattern once, with a legend
 *     of the same swatches;
 *   - empty: no entries and an `emptyNote`.
 * window.__calendar records what each callback was called with. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SchedulingCalendar } from '../../packages/react/src/index.js';
import type {
  SchedulingBand, SchedulingCalendarEntry, SchedulingCalendarOverlay, SchedulingCalendarProps, SchedulingLegendItem,
  SchedulingMarkerEmphasis, SchedulingOverlayPattern, SchedulingStatus,
} from '../../packages/react/src/index.js';

interface Calls { entries: string[]; overlays: string[]; dates: string[]; more: string[] }
declare global { interface Window { __calendar: Calls } }
const calls: Calls = (window.__calendar = { entries: [], overlays: [], dates: [], more: [] });

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

const CASES: Record<string, () => JSX.Element> = { controlled: Controlled, encodings: Encodings, empty: Empty };
const Case = CASES[scenario] ?? Controlled;

createRoot(document.getElementById('root')!).render(<StrictMode><Case /></StrictMode>);
