/* Live harness for SchedulingTimeline (HAR-1521, U5), bundled by build.mjs from source for
 * tests/a11y/scheduling-timeline.spec.mjs. One timeline per page, picked by `?case=`:
 *   - lanes (default): three groups of service lanes in Europe/Berlin, one collapsed with a
 *     consumer summary; packed bars; a window over every row and one over two lanes; sub-ticks;
 *     a notice and a column note; moves that are logged and never applied (`?reject=1` answers
 *     with a rejection, `?move=legacy` passes the 2.32 `onMoveItem` instead, `?move=0` passes
 *     none, `?resize=1` adds `onResizeItem`, `?flag=1` turns the generic stacking flag on);
 *   - stress: 500 lanes in 40 groups (`?height=` sets `maxHeight`; `?height=none` leaves the
 *     page to scroll);
 *   - hour: the hour axis over 25.10.2026, the 25-hour day;
 *   - empty: no items;
 *   - legacy: only what a 2.32 consumer passes (`state`, `kind`, `laneId`, `onMoveItem`).
 * window.__timeline records what each callback was called with. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SchedulingTimeline, zonedTimeOfDay } from '../../packages/react/src/index.js';
import type { SchedulingTimelineItem, SchedulingTimelineOverlay, SchedulingTimelineProps } from '../../packages/react/src/index.js';

interface Calls {
  items: string[]; overlays: string[]; toggles: string[];
  proposals: Array<{ id: string; start: string; end: string; adjusted: string | null }>;
  moves: Array<{ id: string; start: string; end: string }>;
  resizes: Array<{ id: string; start: string; end: string }>;
}
declare global { interface Window { __timeline: Calls } }
const calls: Calls = (window.__timeline = { items: [], overlays: [], toggles: [], proposals: [], moves: [], resizes: [] });

const params = new URLSearchParams(location.search);
const scenario = params.get('case') ?? 'lanes';
const TZ = 'Europe/Berlin';

// Europe/Berlin wall-clock times as instants: UTC+2 between the two clock changes of 2026, else UTC+1.
const berlin = (date: string, time: string) => new Date(`${date}T${time}:00${date >= '2026-03-29' && date < '2026-10-25' ? '+02:00' : '+01:00'}`).toISOString();
const bar = (id: string, laneId: string, from: [string, string], to: [string, string], title: string, extra: Partial<SchedulingTimelineItem> = {}): SchedulingTimelineItem => ({ id, laneId, title, start: berlin(...from), end: berlin(...to), ...extra });

const common = {
  timeZone: TZ,
  locale: 'en-GB',
  onSelectItem: (item: SchedulingTimelineItem) => { calls.items.push(item.id); },
  onSelectOverlay: (overlay: SchedulingTimelineOverlay) => { calls.overlays.push(overlay.id); },
} satisfies Partial<SchedulingTimelineProps>;

const moving = (): Partial<SchedulingTimelineProps> => {
  const mode = params.get('move');
  const resize = params.get('resize') === '1' ? { onResizeItem: (id: string, next: { start: string; end: string }) => { calls.resizes.push({ id, ...next }); } } : {};
  if (mode === '0') return resize;
  if (mode === 'legacy') return { ...resize, onMoveItem: (id, next) => { calls.moves.push({ id, ...next }); } };
  return {
    ...resize,
    onProposeMove: (id, proposal) => {
      calls.proposals.push({ id, ...proposal });
      return params.get('reject') === '1' ? Promise.reject(new Error('refused')) : undefined;
    },
  };
};

const WEEK = { start: berlin('2026-10-05', '00:00'), end: berlin('2026-10-12', '00:00') };
const LANES = [
  { id: 'pay-api', label: 'Checkout API', meta: 'Tier 1' },
  { id: 'pay-ledger', label: 'Ledger' },
  { id: 'net-core', label: 'Core switch' },
  { id: 'net-edge', label: 'Edge routers', meta: '12 devices' },
  { id: 'store-object', label: 'Object store' },
  { id: 'store-backup', label: 'Backup vault' },
];
const ITEMS: SchedulingTimelineItem[] = [
  // Checkout API: a and b run together, c starts after a ends, so two sub-rows hold three bars.
  bar('a', 'pay-api', ['2026-10-05', '08:00'], ['2026-10-06', '08:00'], 'Schema update', { band: 'medium' }),
  bar('b', 'pay-api', ['2026-10-05', '20:00'], ['2026-10-07', '00:00'], 'Cache warm-up', { markers: [{ id: 'shared', label: 'Shares a database with Schema update', emphasis: 'refused' }] }),
  bar('c', 'pay-api', ['2026-10-06', '10:00'], ['2026-10-06', '18:00'], 'Queue drain'),
  bar('high', 'pay-ledger', ['2026-10-07', '09:00'], ['2026-10-08', '15:00'], 'Ledger cut-over', { band: 'high', status: 'tentative' }),
  bar('point', 'pay-ledger', ['2026-10-09', '12:00'], ['2026-10-09', '12:00'], 'Sign-off'),
  bar('d', 'net-core', ['2026-10-08', '06:00'], ['2026-10-09', '06:00'], 'Firmware rollout', { status: 'live' }),
  bar('pinned', 'net-edge', ['2026-10-09', '06:00'], ['2026-10-09', '18:00'], 'Cabling audit', { movable: false, status: 'done' }),
  bar('late', 'net-edge', ['2026-10-10', '22:00'], ['2026-10-11', '02:00'], 'Config backup'),
  bar('s1', 'store-object', ['2026-10-06', '08:00'], ['2026-10-07', '08:00'], 'Tiering'),
  bar('s2', 'store-backup', ['2026-10-08', '08:00'], ['2026-10-09', '08:00'], 'Vault rotation'),
];
const OVERLAYS: SchedulingTimelineOverlay[] = [
  { id: 'all', kindLabel: 'Hold', label: 'Quarter close', start: berlin('2026-10-10', '00:00'), end: berlin('2026-10-12', '00:00'), pattern: 'diagonal' },
  { id: 'some', kindLabel: 'Maintenance', label: 'Storage network', scopeLabel: '2 services', start: berlin('2026-10-07', '00:00'), end: berlin('2026-10-08', '12:00'), pattern: 'dotted', laneIds: ['pay-ledger', 'net-edge'] },
];

function Lanes() {
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set((params.get('collapsed') ?? 'storage').split(',').filter(Boolean)));
  const groups = [
    { id: 'payments', label: 'Payments', meta: '2 services', laneIds: ['pay-api', 'pay-ledger'], summary: { count: 5 } },
    { id: 'network', label: 'Network', laneIds: ['net-core', 'net-edge'], summary: { count: 3 } },
    { id: 'storage', label: 'Storage', laneIds: ['store-object', 'store-backup'], summary: { count: 9, markers: [{ id: 'worst', label: '2 need sign-off', emphasis: 'warning' as const }] } },
  ].map((group) => ({ ...group, collapsed: closed.has(group.id) }));
  return <SchedulingTimeline
    {...common} {...moving()}
    lanes={LANES} groups={groups} items={ITEMS} overlays={OVERLAYS} range={WEEK} scale="day" subTicks={[6, 12, 18]}
    now={berlin('2026-10-06', '14:00')}
    flagOverlaps={params.get('flag') === '1'}
    renderItem={(item) => `${zonedTimeOfDay(item.start, TZ)} ${item.title}`}
    onToggleGroup={(id) => { calls.toggles.push(id); setClosed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }}
    notice="Showing 500 of 512 items. Narrow the filters to see the rest."
    columnNotes={{ '2026-10-08': <button type="button" className="uix-btn uix-btn--link uix-btn--sm">12 not shown</button> }}
  />;
}

const STRESS_LANES = 500;
const STRESS_GROUPS = 40;
function Stress() {
  const lanes = Array.from({ length: STRESS_LANES }, (_, index) => ({ id: `lane-${index}`, label: `Service ${index}` }));
  const groups = Array.from({ length: STRESS_GROUPS }, (_, g) => ({
    id: `group-${g}`, label: `Group ${g}`,
    laneIds: lanes.filter((_, index) => Math.floor((index * STRESS_GROUPS) / STRESS_LANES) === g).map((lane) => lane.id),
  }));
  const day = (offset: number) => `2026-10-${String(5 + offset).padStart(2, '0')}`;
  const items = lanes.flatMap((lane, index): SchedulingTimelineItem[] => {
    const first = bar(`item-${index}`, lane.id, [day(index % 5), '06:00'], [day((index % 5) + 1), '06:00'], `Item ${index}`);
    return index % 7 === 0 ? [first, { ...first, id: `item-${index}-b`, title: `Item ${index} b`, start: berlin(day(index % 5), '12:00') }] : [first];
  });
  const height = params.get('height') ?? '480px';
  return <SchedulingTimeline
    {...common} {...moving()} lanes={lanes} groups={groups} items={items} range={WEEK} flagOverlaps={false}
    overlays={[{ id: 'all', kindLabel: 'Hold', label: 'Quarter close', start: berlin('2026-10-10', '00:00'), end: berlin('2026-10-12', '00:00'), pattern: 'diagonal' },
      { id: 'some', kindLabel: 'Maintenance', label: 'Storage network', start: berlin('2026-10-07', '00:00'), end: berlin('2026-10-08', '12:00'), pattern: 'dotted', laneIds: ['lane-1', 'lane-2', 'lane-400', 'lane-499'] }]}
    maxHeight={height === 'none' ? undefined : height}
  />;
}

function Hour() {
  return <SchedulingTimeline
    {...common} lanes={LANES.slice(0, 2)} scale="hour"
    range={{ start: berlin('2026-10-25', '00:00'), end: berlin('2026-10-26', '00:00') }}
    items={[bar('h1', 'pay-api', ['2026-10-25', '03:00'], ['2026-10-25', '05:00'], 'After the repeat')]}
  />;
}

function Empty() {
  return <SchedulingTimeline {...common} lanes={LANES.slice(0, 3)} items={[]} range={WEEK} subTicks={[6, 12, 18]} labels={{ empty: 'Nothing is scheduled this week.' }} />;
}

function Legacy() {
  return <SchedulingTimeline
    {...common} {...(params.get('move') === '0' ? {} : { onMoveItem: (id: string, next: { start: string; end: string }) => { calls.moves.push({ id, ...next }); } })}
    lanes={LANES.slice(0, 3)} range={WEEK} now={berlin('2026-10-06', '14:00')}
    items={[
      bar('a', 'pay-api', ['2026-10-05', '08:00'], ['2026-10-06', '08:00'], 'Schema update'),
      bar('b', 'pay-api', ['2026-10-05', '20:00'], ['2026-10-07', '00:00'], 'Cache warm-up', { state: 'conflicted' }),
      bar('c', 'pay-ledger', ['2026-10-08', '08:00'], ['2026-10-09', '00:00'], 'Ledger cut-over', { state: 'in-progress' }),
      bar('d', 'net-core', ['2026-10-10', '04:00'], ['2026-10-11', '04:00'], 'Firmware rollout', { state: 'blackout-violation' }),
    ]}
    overlays={[
      { id: 'q4', kind: 'freeze', label: 'Quarter close', start: berlin('2026-10-10', '00:00'), end: berlin('2026-10-12', '00:00') },
      { id: 'db', kind: 'maintenance', label: 'Ledger maintenance', laneId: 'pay-ledger', start: berlin('2026-10-07', '00:00'), end: berlin('2026-10-07', '06:00') },
    ]}
    markers={[{ id: 'renewal', label: 'Licence renewal', at: berlin('2026-10-09', '00:00') }]}
  />;
}

const CASES: Record<string, () => JSX.Element> = { lanes: Lanes, stress: Stress, hour: Hour, empty: Empty, legacy: Legacy };
const Case = CASES[scenario] ?? Lanes;

createRoot(document.getElementById('root')!).render(<StrictMode><Case /></StrictMode>);
