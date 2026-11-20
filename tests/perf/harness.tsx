/* Harness for the performance lanes (roadmap #22), bundled in production mode by build.mjs and driven
 * by tests/perf/bench.mjs. Nothing here asserts; window.__perf gives the runner its clocks.
 *
 *   ?scene=workspace  a DataWorkspace over N tickets (default 10,000; &rows=N), windowed
 *                     (virtualize), with search, a sortable title, selection. The rows are made at
 *                     load; window.__perf.mount() renders the workspace and resolves with the time
 *                     from the render call to the first paint after the commit. Sorting and search run
 *                     in the page with the kit's own table engine (multiSort, searchRows), synchronously,
 *                     as a product without a server would.
 *   ?scene=overlays   a busy page (cards and a table) under a Modal and a Drawer (the scrim blur),
 *                     a 300-row soft-edged list (scroll-edge.css) and a TaskTray with five tasks.
 *
 * Clocks (window.__perf):
 *   arm(type)          the next `type` event (capture, on window) starts a clock that stops at the
 *                      first paint after its handlers: event.timeStamp → rAF → a message posted from
 *                      the rAF callback, which runs after that frame's paint. `armed` is its promise.
 *   events / loafs     Event Timing entries (interactionId, duration to the next paint, rounded to
 *                      8 ms, 16 ms threshold) and long-animation-frame entries, as they arrive.
 *   startFrames() / stopFramesAfter(ms)   rAF-to-rAF intervals while something animates.
 *   scrollBy(el, px, frames)              scrolls by px in equal steps, one per frame; the intervals. */
import { useLayoutEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DataWorkspace, Drawer, Modal, StatusPill, TaskTray, multiSort, searchRows, tasks } from '../../packages/react/src/index.js';
import type { DataWorkspaceColumn, DataWorkspaceSort } from '../../packages/react/src/index.js';

type Timing = { name: string; interactionId: number; startTime: number; duration: number };
type Loaf = { startTime: number; duration: number; blockingDuration: number };
declare global {
  interface Window {
    __perf: {
      ready: boolean;
      mount: () => Promise<number>;
      arm: (type: string) => void;
      armed: Promise<number> | null;
      afterNextPaint: () => Promise<number>;
      events: Timing[];
      loafs: Loaf[];
      startFrames: () => void;
      stopFramesAfter: (ms: number) => Promise<number[]>;
      scrollBy: (selector: string, px: number, frames: number) => Promise<{ intervals: number[]; total: number }>;
    };
  }
}

const q = new URLSearchParams(location.search);
const scene = q.get('scene') ?? 'workspace';

/** Resolves with performance.now() after the next frame has painted. */
function afterNextPaint() {
  return new Promise<number>((resolve) => {
    requestAnimationFrame(() => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve(performance.now());
      channel.port2.postMessage(null);
    });
  });
}

const events: Timing[] = [];
const loafs: Loaf[] = [];
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as PerformanceEventTiming[]) {
      if (e.interactionId) events.push({ name: e.name, interactionId: e.interactionId, startTime: e.startTime, duration: e.duration });
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);
} catch { /* no Event Timing: the scripted clock stands alone */ }
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as (PerformanceEntry & { blockingDuration: number })[]) {
      loafs.push({ startTime: e.startTime, duration: e.duration, blockingDuration: e.blockingDuration });
    }
  }).observe({ type: 'long-animation-frame', buffered: true });
} catch { /* no LoAF */ }

let frameLog: number[] | null = null;
function frameLoop(now: number) {
  if (!frameLog) return;
  frameLog.push(now);
  requestAnimationFrame(frameLoop);
}
const intervals = (stamps: number[]) => stamps.slice(1).map((t, i) => t - stamps[i]);

window.__perf = {
  ready: false,
  mount: () => Promise.reject(new Error(`scene ${scene} has nothing to mount`)),
  armed: null,
  arm(type) {
    window.__perf.armed = new Promise((resolve) => {
      window.addEventListener(type, (event) => {
        const start = event.timeStamp;
        afterNextPaint().then((end) => resolve(end - start));
      }, { capture: true, once: true });
    });
  },
  afterNextPaint,
  events,
  loafs,
  startFrames() {
    frameLog = [];
    requestAnimationFrame(frameLoop);
  },
  async stopFramesAfter(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
    const log = frameLog ?? [];
    frameLog = null;
    return intervals(log);
  },
  scrollBy(selector, px, frames) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return Promise.reject(new Error(`no ${selector}`));
    const from = el.scrollTop;
    return new Promise((resolve) => {
      const stamps: number[] = [];
      let step = 0;
      const t0 = performance.now();
      const tick = (now: number) => {
        stamps.push(now);
        if (step === frames) {
          afterNextPaint().then((end) => resolve({ intervals: intervals(stamps), total: end - t0 }));
          return;
        }
        step += 1;
        el.scrollTop = from + (px * step) / frames;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },
};

// ── scene: workspace ────────────────────────────────────────────────────────────────────────────
type Ticket = { id: string; title: string; state: 'open' | 'pending' | 'resolved'; priority: number; assignee: string; updated: string };
const TITLES = ['Printer on floor 3 does not print', 'VPN drops every few minutes', 'Password reset for accounting', 'Print queue service hangs', 'Laptop does not boot', 'Mailbox is full', 'Teams microphone muted', 'Badge reader at gate B offline'];
const PEOPLE = ['Amra Kovač', 'Jonas Weber', 'Lejla Hadžić-Šehović', 'Max Oberhuber', 'Ana Ilić', 'Tom Berger'];
const STATES = { open: 'Open', pending: 'Pending', resolved: 'Resolved' } as const;
const ROWS = Math.max(1, Number(q.get('rows') ?? 10_000) | 0);
// A fixed, shuffled order (i·7919 mod N is a permutation for N not divisible by 7919): sorting does real work.
const ALL: Ticket[] = Array.from({ length: ROWS }, (_, i) => {
  const k = (i * 7919) % ROWS;
  return {
    id: `INC-${String(100_000 + i)}`, title: `${TITLES[k % TITLES.length]} (${k})`, state: (['open', 'pending', 'resolved'] as const)[k % 3],
    priority: (k % 4) + 1, assignee: PEOPLE[k % PEOPLE.length], updated: `2026-${String(1 + (k % 12)).padStart(2, '0')}-${String(1 + (k % 28)).padStart(2, '0')}`,
  };
});
const SEARCH_FIELDS = ['id', 'title', 'assignee'];

function Workspace({ onCommit }: { onCommit: () => void }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DataWorkspaceSort | null>(null);
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => {
    const found = search.trim() ? searchRows(ALL, search, SEARCH_FIELDS) : ALL;
    return sort ? multiSort(found, [{ field: sort.columnId, dir: sort.direction }]) : found;
  }, [search, sort]);
  const columns = useMemo<DataWorkspaceColumn<Ticket>[]>(() => [
    { id: 'title', header: 'Title', cell: (r) => r.title, sortable: true },
    { id: 'state', header: 'State', cell: (r) => <StatusPill tone={r.state === 'resolved' ? 'success' : r.state === 'pending' ? 'warning' : 'info'}>{STATES[r.state]}</StatusPill> },
    { id: 'priority', header: 'Priority', cell: (r) => `P${r.priority}`, align: 'end', width: '6rem' },
    { id: 'assignee', header: 'Assignee', cell: (r) => r.assignee, sortable: true },
    { id: 'updated', header: 'Updated', cell: (r) => r.updated },
  ], []);
  const idColumn = useMemo(() => ({ header: 'ID', id: 'id', sortable: true, text: (r: Ticket) => r.id }), []);
  useLayoutEffect(onCommit, []);
  return (
    <DataWorkspace<Ticket>
      id="bench" label="Tickets" rows={rows} getRowId={(r) => r.id} columns={columns} idColumn={idColumn}
      sort={sort} onSortChange={setSort} search={{ value: search, onChange: setSearch, label: 'Search tickets' }}
      selection={selection} onSelectionChange={setSelection} virtualize={{ maxHeight: 640 }}
    />
  );
}

// ── scene: overlays ─────────────────────────────────────────────────────────────────────────────
function Overlays() {
  const [open, setOpen] = useState<'modal' | 'drawer' | null>(null);
  const close = () => setOpen(null);
  const prose = <p>Assign the incident, set its priority and add a note for the next shift. The page behind softens under the scrim while this panel is open.</p>;
  return (
    <>
      <h1>Overlays under load</h1>
      <div className="perf-row">
        <Button id="open-modal" onClick={() => setOpen('modal')}>Open modal</Button>
        <Button id="open-drawer" onClick={() => setOpen('drawer')}>Open drawer</Button>
      </div>
      <section aria-label="A soft-edged list">
        <div className="uix-scroll-edge perf-list" id="edge-list" tabIndex={0} aria-label="Soft-edged list">
          {Array.from({ length: 300 }, (_, i) => <p key={i}>{TITLES[i % TITLES.length]} — {PEOPLE[i % PEOPLE.length]}</p>)}
        </div>
      </section>
      <section aria-label="Busy background" className="perf-cards">
        {Array.from({ length: 48 }, (_, i) => (
          <div key={i} className="uix-card" style={{ padding: 'var(--uix-space-3)' }}>
            <strong>INC-{20400 + i}</strong>
            <p>{TITLES[i % TITLES.length]}</p>
            <StatusPill tone={i % 3 === 0 ? 'success' : i % 3 === 1 ? 'warning' : 'info'}>{Object.values(STATES)[i % 3]}</StatusPill>
          </div>
        ))}
      </section>
      <Modal id="modal" open={open === 'modal'} onClose={close} title="Assign INC-20412" footer={<Button variant="primary" onClick={close}>Assign</Button>}>{prose}</Modal>
      <Drawer id="drawer" open={open === 'drawer'} onClose={close} title="Change CHG-1042" footer={<Button variant="primary" onClick={close}>Save</Button>}>{prose}{prose}</Drawer>
      <TaskTray />
    </>
  );
}

function seedTasks() {
  const noop = () => {};
  tasks.start('Export 4,000 tickets', { step: 'Writing CSV', value: 2480, max: 4000, onCancel: noop });
  tasks.start('Import 1,200 assets', { step: 'Matching CIs', onCancel: noop });
  tasks.start('Rebuild the knowledge index', { value: 40, max: 100, onCancel: noop });
  tasks.start('Bulk-close 312 resolved incidents', { value: 312, max: 312 }).complete({ message: 'Closed 312 incidents' });
  tasks.start('Send the shift report').fail({ message: 'The mail server did not answer' });
}

const root = createRoot(document.getElementById('root')!);
if (scene === 'workspace') {
  window.__perf.mount = () => new Promise<number>((resolve) => {
    const start = performance.now();
    root.render(<Workspace onCommit={() => { afterNextPaint().then((end) => resolve(end - start)); }} />);
  });
} else if (scene === 'overlays') {
  seedTasks();
  root.render(<Overlays />);
} else {
  throw new Error(`unknown scene ${scene}`);
}
window.__perf.ready = true;
