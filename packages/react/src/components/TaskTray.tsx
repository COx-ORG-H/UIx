"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, FocusEvent as ReactFocusEvent, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { markKeyOpened, tokenMs, watchInputModality } from '../motion.js';
import { ChevronUpIcon, XIcon } from '../icons/components.js';
import { tasks as defaultTasks } from '../task-store.js';
import type { TaskRecord, TaskStatus, TaskStore } from '../task-store.js';
import { Count } from './Count.js';
import { MotionList } from './MotionList.js';
import { Progress } from './Progress.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** The tray's words. Every entry has an English default; translate through `labels` or `UixLabelsProvider` (`taskTray`). */
export interface TaskTrayLabels {
  /** The landmark's name, the panel's heading and the start of the pill's name. Default "Background tasks". */
  region: string;
  /** Default "Clear finished". */
  clearFinished: string;
  /** Default "Cancel". */
  cancel: string;
  /** The × of a finished task. Default "Dismiss". */
  dismiss: string;
  /** The word after the running count in the pill: `(n) => 'running'`. */
  running: (count: number) => string;
  /** The word after the done count: `(n) => 'done'`. */
  done: (count: number) => string;
  /** The word after the failed count: `(n) => 'failed'`. */
  failed: (count: number) => string;
  /** The word after the cancelled count: `(n) => 'cancelled'`. */
  cancelled: (count: number) => string;
  /** A finished task's state, written in its row. Defaults "Done", "Failed", "Cancelled". */
  status: Record<Exclude<TaskStatus, 'running'>, string>;
  /** Progress as a percentage, `0.62` → "62 %". Default: `Intl.NumberFormat` in the runtime's locale. */
  formatPercent: (fraction: number) => string;
  /** What the tray announces when a task starts. Default "Started: {title}". */
  announceStarted: (title: string) => string;
  /** … when it ends. Default "{status}: {title}. {message}", with `status` from the labels above. */
  announceFinished?: (status: Exclude<TaskStatus, 'running'>, title: string, message?: string) => string;
}

const percent = typeof Intl !== 'undefined' ? new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 }) : null;

const DEFAULT_LABELS: TaskTrayLabels = {
  region: 'Background tasks',
  clearFinished: 'Clear finished',
  cancel: 'Cancel',
  dismiss: 'Dismiss',
  running: () => 'running',
  done: () => 'done',
  failed: () => 'failed',
  cancelled: () => 'cancelled',
  status: { done: 'Done', failed: 'Failed', cancelled: 'Cancelled' },
  formatPercent: (f) => (percent ? percent.format(f) : `${Math.round(f * 100)}%`),
  announceStarted: (title) => `Started: ${title}`,
};

export interface TaskTrayProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The tasks to render. Default: the store behind the exported `tasks`. */
  store?: TaskStore;
  /** Where the tray sits. Default `bottom-center`, away from the Toaster's corner. */
  position?: 'bottom-center' | 'bottom-start' | 'bottom-end';
  /** Expanded, controlled. Pair with `onOpenChange`. */
  open?: boolean;
  /** Expanded on first render, uncontrolled. Default `false`. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Overrides the landmark's name (also `labels.region`). */
  regionLabel?: string;
  labels?: Partial<TaskTrayLabels>;
}

const EMPTY: readonly TaskRecord[] = [];
const getServerSnapshot = () => EMPTY;

interface Summary { running: number; done: number; failed: number; cancelled: number; fraction: number | null }

function summarize(records: readonly TaskRecord[]): Summary {
  const s: Summary = { running: 0, done: 0, failed: 0, cancelled: 0, fraction: null };
  let sum = 0;
  let measurable = true;
  for (const r of records) {
    s[r.status] += 1;
    if (r.status !== 'running') continue;
    if (r.value == null || !Number.isFinite(r.value)) measurable = false;
    else sum += fractionOf(r);
  }
  if (s.running && measurable) s.fraction = sum / s.running;
  return s;
}

/** Removed, or about to be: in a leaving row or a collapsed panel. */
const gone = (el: Element) => !el.isConnected || !!el.closest('[data-uix-exiting], [hidden]');

const fractionOf = (r: TaskRecord) => Math.max(0, Math.min(1, (r.value ?? 0) / r.max));

const CHECK = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path className="uix-task-tray__check" d="M3.5 8.5 6.5 11.5 12.5 4.75" pathLength={1} />
  </svg>
);

/** The mark before a task, and before the pill: what state the work is in, never the only signal. */
function Mark({ status, fraction }: { status: TaskStatus; fraction: number | null }) {
  if (status === 'running') {
    return fraction == null
      ? <span className="uix-task-tray__mark uix-spinner uix-spinner--sm" aria-hidden="true" />
      : <span className="uix-task-tray__mark uix-task-tray__ring" style={{ '--val': fraction } as CSSProperties} aria-hidden="true" />;
  }
  return <span className="uix-task-tray__mark" data-mark={status} aria-hidden="true">{status === 'done' ? CHECK : null}</span>;
}

function TaskRow({ record, store, labels }: { record: TaskRecord; store: TaskStore; labels: TaskTrayLabels }) {
  const titleId = useId();
  const running = record.status === 'running';
  const measurable = record.value != null && Number.isFinite(record.value);
  const fraction = running && measurable ? fractionOf(record) : null;
  const progressText = running ? record.valueText ?? (fraction != null ? labels.formatPercent(fraction) : undefined) : undefined;
  const line = running
    ? [record.step, progressText].filter(Boolean).join(' · ')
    : record.message ?? (record.status === 'cancelled' ? record.step : undefined);
  const { action } = record;
  const runAction = () => {
    action?.onClick?.();
    // after the click's default action, so a link still navigates or downloads before it goes
    if (action && !action.keep) setTimeout(() => store.dismiss(record.id), 0);
  };
  return (
    <li className="uix-task-tray__task" data-status={record.status} aria-busy={running || undefined}>
      <Mark status={record.status} fraction={fraction} />
      <div className="uix-task-tray__body">
        <p className="uix-task-tray__title" id={titleId}>{record.title}</p>
        {(line || !running) && (
          <p className="uix-task-tray__line">
            {!running && <span className="uix-task-tray__state">{labels.status[record.status as Exclude<TaskStatus, 'running'>]}</span>}
            {!running && line && <span aria-hidden="true"> · </span>}
            {!running && line && <span className="uix-visually-hidden">, </span>}
            {line}
          </p>
        )}
        {running && (
          <Progress
            className="uix-task-tray__progress"
            value={measurable ? record.value ?? 0 : 0}
            max={record.max}
            indeterminate={!measurable}
            label={record.title}
            aria-valuetext={record.valueText}
          />
        )}
      </div>
      {(running ? record.cancellable : true) && (
        <div className="uix-task-tray__actions">
          {running && record.cancellable && (
            <button type="button" className="uix-task-tray__btn" aria-describedby={titleId}
              onClick={() => store.finish(record.id, 'cancelled')}>
              {labels.cancel}
            </button>
          )}
          {!running && action && (action.href
            ? <a className="uix-task-tray__btn uix-task-tray__btn--action" href={action.href} download={action.download === true ? '' : action.download || undefined}
                aria-describedby={titleId} onClick={runAction}>{action.label}</a>
            : <button type="button" className="uix-task-tray__btn uix-task-tray__btn--action" aria-describedby={titleId} onClick={runAction}>{action.label}</button>)}
          {!running && (
            <button type="button" className="uix-task-tray__dismiss" aria-label={labels.dismiss} aria-describedby={titleId}
              onClick={() => store.dismiss(record.id)}>
              <XIcon />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Joins the pill's counts, each a ticking number and its word. */
function SummaryParts({ summary, labels }: { summary: Summary; labels: TaskTrayLabels }) {
  const parts: [number, string][] = [];
  if (summary.running) parts.push([summary.running, labels.running(summary.running)]);
  if (summary.failed) parts.push([summary.failed, labels.failed(summary.failed)]);
  if (!summary.running && summary.done) parts.push([summary.done, labels.done(summary.done)]);
  if (!summary.running && summary.cancelled) parts.push([summary.cancelled, labels.cancelled(summary.cancelled)]);
  const out: ReactNode[] = [];
  parts.forEach(([n, word], i) => {
    if (i > 0) out.push(<span key={`s${i}`} className="uix-task-tray__sep"><span aria-hidden="true"> · </span><span className="uix-visually-hidden">, </span></span>);
    out.push(<span key={word + i} className="uix-task-tray__count"><Count value={n} /> {word}</span>);
  });
  return <>{out}</>;
}

/**
 * The background-task tray (spec: Docs/specs/2026-11-20-task-tray.md). Mount it once in the app
 * shell, next to `<Toaster />`. It renders the tasks `tasks.start(...)` and `tasks.run(...)` add,
 * as a pill with the running count that opens a panel listing each task: its title, progress, the
 * current step and Cancel, then the result with its action. Finished tasks stay until dismissed.
 *
 * With no task it renders only a polite live region, which announces each start, finish, failure
 * and cancel (never the percentages). Escape collapses the panel onto the pill.
 */
export function TaskTray({
  store = defaultTasks.store, position = 'bottom-center', open: openProp, defaultOpen = false, onOpenChange,
  regionLabel, labels: labelsProp, className, onKeyDown, onFocus, onBlur, ...props
}: TaskTrayProps) {
  const kitLabels = useUixLabels();
  const labels: TaskTrayLabels = { ...DEFAULT_LABELS, ...kitLabels.taskTray, ...labelsProp };
  labels.status = { ...DEFAULT_LABELS.status, ...kitLabels.taskTray?.status, ...labelsProp?.status };
  const name = regionLabel ?? labels.region;

  const records = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = useCallback((next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  }, [openProp, onOpenChange]);

  const panelId = useId();
  const headingId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { watchInputModality(); }, []);

  // The pill leaves visibly: with the last task gone it stays for the exit (--uix-dur-exit), showing
  // what it showed last, then the landmark unmounts.
  const [shown, setShown] = useState(records.length > 0);
  const [leaving, setLeaving] = useState(false);
  const lastRecords = useRef(records);
  if (records.length) lastRecords.current = records;
  useEffect(() => {
    if (records.length) { setShown(true); setLeaving(false); return undefined; }
    if (!shown) return undefined;
    setLeaving(true);
    const timer = window.setTimeout(() => { setShown(false); setLeaving(false); }, tokenMs('--uix-dur-exit', 110));
    return () => window.clearTimeout(timer);
  }, [records.length, shown]);
  // nothing left to show: the panel closes, so the next task starts collapsed
  useEffect(() => { if (!records.length && open) setOpen(false); }, [records.length, open, setOpen]);

  // Announcements: one polite region, mounted before any task exists. Starts and endings, never
  // percentages; tasks already there when the tray mounted are not announced again.
  const [announced, setAnnounced] = useState('');
  const seen = useRef<Map<string, { status: TaskStatus; run: number }> | null>(null);
  const clearAnnouncement = useRef<number | null>(null);
  useEffect(() => {
    const previous = seen.current;
    const next = new Map(records.map((r) => [r.id, { status: r.status, run: r.run }]));
    seen.current = next;
    if (!previous) return;
    const lines: string[] = [];
    for (const r of [...records].reverse()) {
      const before = previous.get(r.id);
      if (r.status === 'running' && (!before || before.run !== r.run)) lines.push(labels.announceStarted(r.title));
      else if (r.status !== 'running' && (!before || before.status !== r.status || before.run !== r.run)) {
        lines.push(labels.announceFinished
          ? labels.announceFinished(r.status, r.title, r.message)
          : `${labels.status[r.status]}: ${r.title}.${r.message ? ` ${r.message}` : ''}`);
      }
    }
    if (!lines.length) return;
    // join with a still-shown announcement, so tasks ending together are all read
    setAnnounced((current) => [current, ...lines].filter(Boolean).join(' '));
    if (clearAnnouncement.current != null) window.clearTimeout(clearAnnouncement.current);
    clearAnnouncement.current = window.setTimeout(() => setAnnounced(''), 3000);
    // labels are read when a change happens; a new label object alone announces nothing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);
  useEffect(() => () => { if (clearAnnouncement.current != null) window.clearTimeout(clearAnnouncement.current); }, []);

  // Focus. Where it came from (to give it back when the tray goes), and the control that holds it,
  // so that when an action removes that control, focus lands in the tray instead of on <body>.
  // MotionList already moves it within the list; this catches the header and the last row.
  const returnFocus = useRef<HTMLElement | null>(null);
  const focused = useRef<HTMLElement | null>(null);
  const handleFocus = (event: ReactFocusEvent<HTMLElement>) => {
    onFocus?.(event);
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) returnFocus.current = from;
    focused.current = event.target as HTMLElement;
  };
  const handleBlur = (event: ReactFocusEvent<HTMLElement>) => {
    onBlur?.(event);
    const to = event.relatedTarget as Node | null;
    if (to && event.currentTarget.contains(to)) return;
    const el = event.target as HTMLElement;
    // A control that is still there lost focus to something else (a click on the page): forget
    // it. One that was removed, or is leaving (an inert row, a hidden panel), keeps its place, so
    // the effect below can put focus back in the tray.
    queueMicrotask(() => { if (focused.current === el && !gone(el)) focused.current = null; });
  };
  const hasTasks = records.length > 0;
  useIsomorphicLayoutEffect(() => {
    const el = focused.current;
    if (!el || !gone(el)) return;
    const active = document.activeElement;
    // focus already found a new home (MotionList moved it to the next row)
    if (active && active !== el && active !== document.body && active.isConnected && !gone(active)) return;
    focused.current = null;
    const target = hasTasks && pillRef.current?.isConnected ? pillRef.current : returnFocus.current;
    if (target?.isConnected) target.focus({ preventScroll: true });
  });

  const toggle = () => {
    markKeyOpened(panelRef.current);
    setOpen(!open);
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== 'Escape' || !open) return;
    event.preventDefault();
    event.stopPropagation();
    markKeyOpened(panelRef.current);
    setOpen(false);
    pillRef.current?.focus({ preventScroll: true });
  };

  const live = <span className="uix-visually-hidden" role="status" aria-live="polite">{announced}</span>;
  if (!shown && !records.length) return live;

  const list = records.length ? records : lastRecords.current;
  const summary = summarize(list);
  const pillStatus: TaskStatus = summary.running ? 'running' : summary.failed ? 'failed' : summary.done ? 'done' : 'cancelled';
  const finished = summary.done + summary.failed + summary.cancelled;

  return (
    <>
      {live}
      <section
        ref={regionRef}
        className={cx('uix-task-tray', className)}
        aria-label={name}
        data-position={position === 'bottom-center' ? undefined : position}
        data-open={open || undefined}
        data-leaving={leaving || undefined}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {/* the pill comes first, so Tab goes from it into the open panel; the CSS shows the panel above it */}
        <button
          ref={pillRef}
          type="button"
          className="uix-task-tray__pill"
          aria-expanded={open}
          aria-controls={panelId}
          data-status={pillStatus}
          onClick={toggle}
          tabIndex={leaving ? -1 : undefined}
        >
          <Mark status={pillStatus} fraction={summary.fraction} />
          <span className="uix-task-tray__summary">
            <span className="uix-visually-hidden">{name}: </span>
            <SummaryParts summary={summary} labels={labels} />
          </span>
          <ChevronUpIcon className="uix-task-tray__chevron" aria-hidden="true" />
        </button>
        <div ref={panelRef} id={panelId} className="uix-task-tray__panel" role="group" aria-labelledby={headingId} hidden={!open || leaving}>
          <div className="uix-task-tray__head">
            <p className="uix-task-tray__heading" id={headingId}>{name}</p>
            {finished > 0 && (
              <button type="button" className="uix-task-tray__btn" onClick={() => store.dismiss()}>{labels.clearFinished}</button>
            )}
          </div>
          <MotionList
            className="uix-task-tray__list"
            items={records}
            getKey={(r) => r.id}
            renderItem={(r) => <TaskRow record={r} store={store} labels={labels} />}
          />
        </div>
      </section>
    </>
  );
}
