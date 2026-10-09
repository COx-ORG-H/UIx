/* Live harness for SchedulingTimeline (HAR-1521, U5), bundled by build.mjs from source for
 * tests/a11y/scheduling-timeline.spec.mjs. One timeline per page, picked by `?case=`:
 *   - lanes (default): three groups of service lanes in Europe/Berlin, one collapsed with a
 *     consumer summary; packed bars; a window over every row and one over two lanes; sub-ticks;
 *     a notice and a column note; moves that are logged and never applied (`?reject=1` answers
 *     with a rejection, `?move=legacy` passes the older `onMoveItem` instead, `?move=0` passes
 *     none, `?resize=1` adds `onResizeItem`, `?flag=1` turns the generic stacking flag on,
 *     `?early=1` adds a window over the first day of the first lane and a long group summary);
 *   - stress: 500 lanes in 40 groups (`?height=` sets `maxHeight`; `?height=none` leaves the
 *     page to scroll; `?state=loading` mounts it loading; `window.__timelineState({ loading,
 *     error })` switches the state, as a consumer that reloads does; `?groups=0` passes 200
 *     plain lanes and none of the new layout props);
 *   - short: four short bars inside one afternoon of a week axis, titles longer than their
 *     bar, the high band with each status, a `solid` window and one sub-tick;
 *   - dense: `?lanes=N` plain lanes (default 60) with a one-hour bar every two hours (`?bars=N` of them, default 84: the week), the case
 *     whose packing depends on the width; `window.__timelineTick('3rem')` sets `tickWidth`;
 *   - hour: the hour axis over 25.10.2026, the 25-hour day;
 *   - empty: no items;
 *   - legacy: only what an existing consumer passes (`state`, `kind`, `laneId`, `onMoveItem`).
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
declare global { interface Window { __timeline: Calls; __timelineState: (state: { loading?: boolean; error?: string }) => void; __timelineTick: (width: string) => void } }
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
  // A window over the first day of the first lane: on a collapsed group it would sit under a long group label.
  const early = params.get('early') === '1';
  const overlays = early ? [...OVERLAYS, { id: 'early', kindLabel: 'Hold', label: 'Month start', start: berlin('2026-10-05', '00:00'), end: berlin('2026-10-06', '00:00'), pattern: 'cross' as const, laneIds: ['pay-api'] }] : OVERLAYS;
  const groups = [
    { id: 'payments', label: 'Payments', meta: '2 services', laneIds: ['pay-api', 'pay-ledger'], summary: early
      ? { count: 5, markers: [{ id: 'm1', label: '2 need sign-off', emphasis: 'warning' as const }, { id: 'm2', label: '1 declined by the owner', emphasis: 'refused' as const }] }
      : { count: 5 } },
    { id: 'network', label: 'Network', laneIds: ['net-core', 'net-edge'], summary: { count: 3 } },
    { id: 'storage', label: 'Storage', laneIds: ['store-object', 'store-backup'], summary: { count: 9, markers: [{ id: 'worst', label: '2 need sign-off', emphasis: 'warning' as const }] } },
  ].map((group) => ({ ...group, collapsed: closed.has(group.id) }));
  return <SchedulingTimeline
    {...common} {...moving()}
    lanes={LANES} groups={groups} items={ITEMS} overlays={overlays} range={WEEK} scale="day" subTicks={[6, 12, 18]}
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
  const [state, setState] = useState<{ loading?: boolean; error?: string }>(() => (params.get('state') === 'loading' ? { loading: true } : {}));
  window.__timelineState = setState;
  // What an existing consumer with many lanes passes: no groups, no windows, the page scrolls.
  if (params.get('groups') === '0') return <SchedulingTimeline {...common} lanes={lanes.slice(0, 200)} items={items} range={WEEK} loading={state.loading} error={state.error} onRetry={() => setState({})} />;
  return <SchedulingTimeline
    {...common} {...moving()} lanes={lanes} groups={groups} items={items} range={WEEK} flagOverlaps={false} loading={state.loading} error={state.error} onRetry={() => setState({})}
    overlays={[{ id: 'all', kindLabel: 'Hold', label: 'Quarter close', start: berlin('2026-10-10', '00:00'), end: berlin('2026-10-12', '00:00'), pattern: 'diagonal' },
      { id: 'some', kindLabel: 'Maintenance', label: 'Storage network', start: berlin('2026-10-07', '00:00'), end: berlin('2026-10-08', '12:00'), pattern: 'dotted', laneIds: ['lane-1', 'lane-2', 'lane-400', 'lane-499'] }]}
    maxHeight={height === 'none' ? undefined : height}
  />;
}

function Short() {
  const hour = (id: string, from: string, to: string, extra: Partial<SchedulingTimelineItem> = {}) => bar(id, 'pay-api', ['2026-10-06', from], ['2026-10-06', to], `Short ${id}`, extra);
  return <SchedulingTimeline
    {...common} {...moving()} lanes={LANES.slice(0, 3)} range={WEEK}
    items={[
      // One day is 7rem here, so an hour is under 5 px: each of these is drawn at the minimum width.
      hour('s1', '09:00', '10:00'), hour('s2', '11:00', '12:00'), hour('s3', '13:00', '13:30'), hour('s4', '14:00', '15:00'),
      // Titles whose first word is wider than the bar, and one that fits a word and not the next.
      bar('w1', 'pay-ledger', ['2026-10-06', '00:00'], ['2026-10-06', '08:00'], 'Firewall rule update for the gateway'),
      bar('w2', 'pay-ledger', ['2026-10-07', '00:00'], ['2026-10-07', '22:00'], 'Firewall rule update for the gateway'),
      bar('w3', 'pay-ledger', ['2026-10-08', '00:00'], ['2026-10-08', '16:00'], 'Internationalisation', { meta: 'm' }),
      bar('b1', 'net-core', ['2026-10-05', '02:00'], ['2026-10-05', '20:00'], 'High', { band: 'high' }),
      bar('b2', 'net-core', ['2026-10-06', '02:00'], ['2026-10-06', '20:00'], 'High done', { band: 'high', status: 'done' }),
      bar('b3', 'net-core', ['2026-10-07', '02:00'], ['2026-10-07', '20:00'], 'Marked', { markers: [{ id: 'm', label: 'Needs review', emphasis: 'warning' }] }),
      bar('b4', 'net-core', ['2026-10-08', '02:00'], ['2026-10-08', '20:00'], 'Plain'),
    ]}
    overlays={[
      { id: 'hatch', kindLabel: 'Hold', label: 'Quarter close', start: berlin('2026-10-10', '00:00'), end: berlin('2026-10-12', '00:00'), pattern: 'diagonal' },
      { id: 'flat', kindLabel: 'Note', label: 'Audit', start: berlin('2026-10-09', '00:00'), end: berlin('2026-10-10', '00:00'), pattern: 'solid', laneIds: ['pay-api'] },
    ]}
    subTicks={[12]}
    now={berlin('2026-10-07', '12:00')}
  />;
}

function Dense() {
  const count = Number(params.get('lanes') ?? 60);
  const lanes = Array.from({ length: count }, (_, index) => ({ id: `lane-${index}`, label: `Lane number ${index} with a long label that wraps over lines` }));
  const start = Date.parse(WEEK.start);
  const HOUR = 3_600_000;
  const items = lanes.flatMap((lane, laneIndex) => Array.from({ length: Number(params.get('bars') ?? 84) }, (_, n): SchedulingTimelineItem => ({
    id: `${laneIndex}-${n}`, laneId: lane.id, title: `J${n}`, start: new Date(start + 2 * n * HOUR).toISOString(), end: new Date(start + (2 * n + 1) * HOUR).toISOString(),
  })));
  const [tick, setTick] = useState<string | undefined>(params.get('tick') ?? undefined);
  window.__timelineTick = setTick;
  return <SchedulingTimeline {...common} lanes={lanes} items={items} range={WEEK} tickWidth={tick} />;
}

function Hour() {
  return <SchedulingTimeline
    {...common} lanes={LANES.slice(0, 2)} scale="hour"
    // 00:00 on 25.10.2026 is still UTC+2 and 00:00 on the 26th is UTC+1: 25 hours.
    range={{ start: '2026-10-24T22:00:00.000Z', end: '2026-10-25T23:00:00.000Z' }}
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

const CASES: Record<string, () => JSX.Element> = { lanes: Lanes, stress: Stress, short: Short, dense: Dense, hour: Hour, empty: Empty, legacy: Legacy };
const Case = CASES[scenario] ?? Lanes;

createRoot(document.getElementById('root')!).render(<StrictMode><Case /></StrictMode>);
