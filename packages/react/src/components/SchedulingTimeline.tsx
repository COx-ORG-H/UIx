"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { cachedDateTimeFormat, zonedDayBounds, zonedTimeOfDay } from '../calendar-model.js';
import { proposeMove } from '../scheduling-calendar-model.js';
import type { MoveProposal } from '../scheduling-calendar-model.js';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { usePrinting } from '../hooks/usePrinting.js';
import { defaultTimelineStep, layoutLane, pixelsToMs, placeSpan, shiftSpan, timelineRepeatedHourOffset, timelineStepDelta, timelineSubTicks, timelineTicks } from '../scheduling-timeline-model.js';
import type { PlacedSpan, TimelineRange, TimelineScale } from '../scheduling-timeline-model.js';
import { timelineRowExtents, timelineRuns, timelineWindow } from '../scheduling-timeline-rows.js';
import type { TimelineExtent } from '../scheduling-timeline-rows.js';
import type { SchedulingBand, SchedulingEntryState, SchedulingMarker, SchedulingOverlayPattern, SchedulingStatus } from './SchedulingCalendar.js';

export interface SchedulingTimelineLane {
  id: string;
  label: ReactNode;
  /** A quieter second line under the lane name (an owner, a count). */
  meta?: ReactNode;
}

/** A collapsible block of lanes. The consumer builds the groups and owns every number on them. */
export interface SchedulingTimelineGroup {
  id: string;
  label: ReactNode;
  /** A quieter text beside the group name. */
  meta?: ReactNode;
  /** The lanes of the group, in the order to draw them. A lane named by two groups is drawn in the first. */
  laneIds: string[];
  /**
   * A collapsed group is one row. With `onToggleGroup` the consumer owns this value; without
   * it, it is where the group starts and the timeline opens and closes the group itself.
   */
  collapsed?: boolean;
  /** Shown on the one row of a collapsed group. The timeline derives neither the count nor a marker. */
  summary?: { count: number; markers?: SchedulingMarker[] };
}

export interface SchedulingTimelineItem {
  id: string;
  laneId: string;
  title: string;
  /** ISO 8601 instants. */
  start: string;
  end: string;
  /** @deprecated Use `band`, `status` and `markers`. The values keep working in 2.x; a bar is no longer tinted by them. */
  state?: SchedulingEntryState;
  meta?: string;
  /** `false` keeps this bar fixed even when a move or resize callback is set. */
  movable?: boolean;
  /** The one dimension that takes a hue: only `high` is filled. */
  band?: SchedulingBand;
  /** Drawn as a line style, never as a hue. */
  status?: SchedulingStatus;
  /** Shapes or icons with text. The text is in the accessible name. */
  markers?: SchedulingMarker[];
  /** The complete accessible name, built by the consumer from its own words. Replaces `labels.item`. */
  accessibleName?: string;
}

/** @deprecated Use `pattern` and `kindLabel` on the overlay. The values keep working in 2.x. */
export type SchedulingTimelineOverlayKind = 'freeze' | 'maintenance' | 'blackout';

export interface SchedulingTimelineOverlay {
  id: string;
  /** The name of the window, shown as text. */
  label: string;
  start: string;
  end: string;
  /** @deprecated Use `pattern` and `kindLabel`. */
  kind?: SchedulingTimelineOverlayKind;
  /** Only this lane. For several lanes use `laneIds`. */
  laneId?: string;
  /** Only these lanes; every lane when neither this nor `laneId` is set. The window is still one element. */
  laneIds?: string[];
  /** How the window is hatched. Windows are neutral: the pattern and the visible words tell them apart. */
  pattern?: SchedulingOverlayPattern;
  /** What kind of window this is, in the words of the consumer. Shown before the name. */
  kindLabel?: string;
  /** What the window applies to. Shown after the name. */
  scopeLabel?: string;
  /** The complete accessible name. Replaces `labels.overlay`. */
  accessibleName?: string;
}

export interface SchedulingTimelineMarker {
  id: string;
  label: string;
  /** ISO 8601 instant. */
  at: string;
  /** Only this lane. For several lanes use `laneIds`. */
  laneId?: string;
  /** Only these lanes; every lane when neither this nor `laneId` is set. */
  laneIds?: string[];
}

export interface SchedulingTimelineLabels {
  region: string;
  lanes: string;
  /** The accessible name of a bar unless it sets `accessibleName`. `{title}`, `{state}`, `{start}`, `{end}`, `{conflict}`. Its marker labels are appended. */
  item: string;
  /** Read after a bar that shares time with another bar of its lane, while `flagOverlaps` is on. */
  conflict: string;
  /** The hint of a timeline that has both `onMoveItem` and `onResizeItem` (the older sentence). */
  moveHint: string;
  /** Announced after a move. `{title}`, `{start}`, `{end}`. */
  moved: string;
  /** Announced after a resize. `{title}`, `{end}`. */
  resized: string;
  loading: string;
  retry: string;
  empty: string;
  /** Heading of the screen-reader list of windows and markers. */
  windows: string;
  now: string;
  /** @deprecated The words of `item.state`. Use `status` on the item, named by `statuses`. */
  states: Record<SchedulingEntryState, string>;
  /** @deprecated The words of `overlay.kind`. Use `kindLabel` on the overlay. */
  overlays: Record<SchedulingTimelineOverlayKind, string>;
  /** The words for `status`, used in the default accessible name. */
  statuses?: Partial<Record<SchedulingStatus, string>>;
  /** The accessible name of a window that can be selected. `{title}` is its kind, name and scope. */
  overlay?: string;
  /** The hint of a bar that `onMoveItem` moves, one step a key press. */
  moveKeysHint?: string;
  /** The hint of a bar whose end `onResizeItem` moves. */
  resizeHint?: string;
  /** The hint of a bar that `onProposeMove` moves. */
  proposeHint?: string;
  /** Announced for a pending move. `{start}` and `{end}` placeholders. */
  moveProposed?: string;
  /** Announced when a pending move is dropped. */
  moveCancelled?: string;
  /** Announced when the time asked for does not exist that day. `{time}` is the time used instead. */
  gapForward?: string;
  /** The count on the row of a collapsed group. `{count}` is the number the consumer gave; the wording, plural forms included, is this label. */
  groupSummary?: string;
  /** Announced when a move was handed to `onProposeMove`. `{start}` and `{end}` placeholders. */
  moveSent?: string;
}

export const DEFAULT_SCHEDULING_TIMELINE_LABELS: SchedulingTimelineLabels = {
  region: 'Schedule timeline in {timeZone}',
  lanes: 'Lanes',
  item: '{title}, {state}, {start} to {end}{conflict}',
  conflict: ', overlaps another entry',
  moveHint: 'Shift and an arrow key moves it; Alt, Shift and an arrow key changes when it ends.',
  moved: 'Moved {title} to {start} – {end}',
  resized: '{title} now ends {end}',
  loading: 'Loading schedule…',
  retry: 'Try again',
  empty: 'Nothing is scheduled in this range.',
  windows: 'Windows and markers in this range',
  now: 'Now',
  states: { scheduled: 'Scheduled', conflicted: 'Conflicted', 'in-progress': 'In progress', 'blackout-violation': 'Blackout violation' },
  overlays: { 'freeze': 'Change freeze', maintenance: 'Maintenance window', 'blackout': 'Blackout' },
  statuses: { tentative: 'Tentative', committed: 'Scheduled', live: 'In progress', done: 'Done', dead: 'Cancelled' },
  overlay: '{title}, {start} to {end}',
  moveKeysHint: 'Shift and an arrow key moves it.',
  resizeHint: 'Alt, Shift and an arrow key moves its end.',
  proposeHint: 'Hold Shift and press an arrow key to move it. Enter confirms, Escape cancels.',
  moveProposed: 'Move to {start} – {end}. Enter confirms, Escape cancels.',
  moveCancelled: 'Move cancelled.',
  gapForward: 'That time does not exist on this day. Moved forward to {time}.',
  groupSummary: 'Items: {count}',
  moveSent: 'Requested a move to {start} – {end}.',
};

export interface SchedulingTimelineProps {
  lanes: SchedulingTimelineLane[];
  items: SchedulingTimelineItem[];
  /** The visible window (ISO 8601 instants). */
  range: TimelineRange;
  /** Tick unit of the axis. Default `day`. */
  scale?: TimelineScale;
  /** IANA zone for tick boundaries and every printed time. */
  timeZone: string;
  locale?: string;
  /**
   * Collapsible blocks of lanes, in the order given. Lanes that no group names are drawn after
   * the groups. Unset keeps the flat list of lanes.
   */
  groups?: SchedulingTimelineGroup[];
  /** Called by a group head. When set, the consumer flips `collapsed`; nothing opens until the props say so. */
  onToggleGroup?: (id: string) => void;
  overlays?: SchedulingTimelineOverlay[];
  /** Makes each window a button. Called by a click or Enter on it. */
  onSelectOverlay?: (overlay: SchedulingTimelineOverlay) => void;
  markers?: SchedulingTimelineMarker[];
  /** Draws a "now" line at this instant (pass the current time; the component keeps no clock). */
  now?: string;
  /** First day of a week tick (0 = Sunday). Default 1. */
  weekStartsOn?: number;
  /** Width of one tick, as a CSS length. Defaults: hour 3.5rem, day 7rem, week 6rem, month 8rem. */
  tickWidth?: string;
  /** Move/resize granularity in ms. Defaults: 15 min (hour), 1 h (day), 1 day (week, month). */
  step?: number;
  /** Local hours (0–23) that get a minor tick inside each day of a `day` axis, e.g. `[6, 12, 18]`. */
  subTicks?: number[];
  /** Tick label. Default: `Intl` in `locale` and `timeZone`. A sub-tick asks with the scale `'hour'`. */
  formatTick?: (at: Date, scale: TimelineScale) => string;
  /** Start/end text in names and announcements. Default: `Intl` medium date + short time in `timeZone`. */
  formatInstant?: (instant: string) => string;
  /** Bar content. Default: the title. The text is cut at a word, never in one. */
  renderItem?: (item: SchedulingTimelineItem) => ReactNode;
  onSelectItem?: (item: SchedulingTimelineItem) => void;
  /**
   * Makes bars draggable and keyboard-movable, one call for every key press and every drop.
   * Receives the snapped new start and end. Not called for moves while `onProposeMove` is set.
   */
  onMoveItem?: (id: string, next: { start: string; end: string }) => void;
  /**
   * Lets the user ask for a move: a drag, or Shift and an arrow key to build a pending move and
   * Enter to send it (Escape drops it). Called once per finished gesture. The timeline never
   * moves the bar: it draws items where the props say, so an item whose props do not change is
   * back where it was. Return a promise to keep the outline until it settles.
   */
  onProposeMove?: (id: string, proposal: MoveProposal) => void | Promise<unknown>;
  /** Lets Alt+Shift and an arrow key move the end of a bar. Without it there is no resize of any kind. */
  onResizeItem?: (id: string, next: { start: string; end: string }) => void;
  /**
   * `false` keeps the stacking of bars that share time and drops the hatch and the words for
   * it: the consumer says what clashes, with a reason, through `markers`. Default `true`.
   */
  flagOverlaps?: boolean;
  /**
   * Above this many rows only the rows near the viewport are mounted. The rows counted are
   * the ones passed: `lanes` plus `groups`, whatever is collapsed and however the bars pack, so
   * the answer does not move with the width. Default 150; `Infinity` mounts everything. It says
   * when windowing starts, not how much is mounted: that is what the viewport shows, plus overscan.
   */
  virtualizeAbove?: number;
  /** A CSS length. The lanes then scroll inside the timeline under the axis. Unset: the page scrolls. */
  maxHeight?: string;
  /** Shown above the axis, e.g. "Showing 500 of 1,240 items". */
  notice?: ReactNode;
  /** A note under the axis on the column of a day (`YYYY-MM-DD` in `timeZone`), e.g. a count the consumer knows. */
  columnNotes?: Record<string, ReactNode>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: Partial<SchedulingTimelineLabels>;
  className?: string;
}

const TICK_WIDTH: Record<TimelineScale, string> = { hour: '3.5rem', day: '7rem', week: '6rem', month: '8rem' };
const TICK_FORMAT: Record<TimelineScale, Intl.DateTimeFormatOptions> = {
  hour: { hour: '2-digit', minute: '2-digit' },
  day: { weekday: 'short', day: 'numeric' },
  week: { day: 'numeric', month: 'short' },
  month: { month: 'short', year: 'numeric' },
};
const EMPTY_ITEMS: SchedulingTimelineItem[] = [];
const EMPTY_OVERLAYS: SchedulingTimelineOverlay[] = [];
const EMPTY_MARKERS: SchedulingTimelineMarker[] = [];
/** Pointer travel (px) before a press becomes a drag in the proposal model. Below it the press is a click. */
const DRAG_THRESHOLD = 4;
/** Row units in px until the stylesheet has been measured (1rem = 16px), and where there is no layout. */
const DEFAULT_UNITS = { row: 36, pad: 16, head: 40 };
/** The viewport height assumed until the scroller has been measured, and where there is no layout. */
const ESTIMATED_VIEWPORT = 720;
/** Sub-rows mounted beyond each edge of the viewport. */
const OVERSCAN_ROWS = 4;
/** The narrowest a bar is drawn, in px, where the stylesheet cannot be measured (`--timeline-bar-min`, 1.5rem). */
const BAR_MIN_FALLBACK = 1.5 * 16;
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

type Item = SchedulingTimelineItem;
type ResolvedLabels = Required<SchedulingTimelineLabels> & { statuses: Record<SchedulingStatus, string> };
interface LaneRow { kind: 'lane'; key: string; lane: SchedulingTimelineLane; laneIndex: number; groupIndex?: number; placed: PlacedSpan<Item>[]; keys: string[]; subRows: number }
/** `stands`: the lanes a collapsed group hides. Its one row stands for them: a window over one of them is drawn on a strip under its head. */
interface HeadRow { kind: 'head'; key: string; group: SchedulingTimelineGroup; groupIndex: number; collapsed: boolean; stands: ReadonlySet<string> }
/** One stretch of the body a window is painted on, top and bottom in row units, and the row it belongs to. */
interface Stretch { row: number; from: TimelineExtent; to: TimelineExtent }
const sameExtent = (a: TimelineExtent, b: TimelineExtent) => a.subRows === b.subRows && a.lanes === b.lanes && a.heads === b.heads;
type Row = LaneRow | HeadRow;
/** The older drag: followed on the bar itself, committed on release. */
interface StepDrag { id: string; x: number; width: number; delta: number; moved: boolean }
interface MoveDelta { days: number; minutes: number }
/** A proposed move on screen: pending from the keyboard, following the pointer, or sent and waiting for the consumer. */
/** Where a window or marker is drawn: over every row, clipped to the rows of some lanes, or inside its one lane. */
interface Scope { scope: 'all' | 'lanes' | 'lane'; clip?: string; labelTops: string[] }
/** A window drawn inside its one lane: its words start at the top of that lane. */
const IN_LANE: Scope = { scope: 'lane', labelTops: ['0%'] };
interface Ghost { id: string; delta: MoveDelta; source: 'keys' | 'pointer' | 'sent'; proposal: MoveProposal }

const vars = (values: Record<string, number | string | undefined>): CSSProperties => values as CSSProperties;
/** A height in the three row units of the stylesheet. */
const extentCss = (extent: TimelineExtent) => `calc(${extent.subRows} * var(--timeline-bar-row) + ${extent.lanes} * var(--timeline-lane-pad) + ${extent.heads} * var(--timeline-head))`;
const between = (from: TimelineExtent, to: TimelineExtent): TimelineExtent => ({ subRows: to.subRows - from.subRows, lanes: to.lanes - from.lanes, heads: to.heads - from.heads });
/** A React key for each entry: its id, and a suffix from the second use of an id on (a repeated id is still drawn). */
function uniqueKeys(ids: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return ids.map((id) => {
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    return count === 0 ? id : `${id}#${count}`;
  });
}
const lanesOf = (target: { laneId?: string; laneIds?: string[] }): ReadonlySet<string> | null =>
  target.laneIds !== undefined ? new Set(target.laneIds) : target.laneId ? new Set([target.laneId]) : null;

function ItemMarker({ marker, showLabel }: { marker: SchedulingMarker; showLabel?: boolean }) {
  const emphasis = marker.emphasis ?? 'neutral';
  return <span className="uix-scheduling-timeline__item-marker" data-emphasis={emphasis} data-glyph={marker.icon == null ? emphasis : undefined}>
    {marker.icon != null && <span className="uix-scheduling-timeline__item-marker-icon" aria-hidden="true">{marker.icon}</span>}
    <span className={showLabel ? 'uix-scheduling-timeline__item-marker-label' : 'uix-visually-hidden'}>{marker.label}</span>
  </span>;
}

/**
 * Lanes of bars on a time axis (HAR-1364, HAR-1521): schedules by service, rollout rows,
 * renewal markers. Lanes can sit in collapsible groups; bars that share time stack in sub-rows
 * packed by `packLanes`; a window is one neutral, patterned element over the lanes it names;
 * only `band="high"` takes a hue. With `onProposeMove` a move is a proposal handed to the
 * consumer (drag, or Shift and an arrow key, then Enter); `onMoveItem` still commits every
 * step; the end of a bar moves only with `onResizeItem`. Long timelines mount only the rows
 * near the viewport.
 */
export function SchedulingTimeline({
  lanes, items, range, scale = 'day', timeZone, locale, groups, onToggleGroup, overlays = EMPTY_OVERLAYS, onSelectOverlay, markers = EMPTY_MARKERS, now, weekStartsOn = 1,
  tickWidth, step: stepProp, subTicks, formatTick, formatInstant: formatInstantProp, renderItem, onSelectItem, onMoveItem, onProposeMove, onResizeItem,
  flagOverlaps = true, virtualizeAbove = 150, maxHeight, notice, columnNotes, loading, error, onRetry, labels: labelOverrides, className,
}: SchedulingTimelineProps) {
  const uixLabels = useUixLabels();
  const provided = { ...uixLabels.schedulingTimeline, ...labelOverrides };
  const labels = {
    ...DEFAULT_SCHEDULING_TIMELINE_LABELS,
    ...provided,
    states: { ...DEFAULT_SCHEDULING_TIMELINE_LABELS.states, ...uixLabels.schedulingTimeline?.states, ...labelOverrides?.states },
    overlays: { ...DEFAULT_SCHEDULING_TIMELINE_LABELS.overlays, ...uixLabels.schedulingTimeline?.overlays, ...labelOverrides?.overlays },
    statuses: { ...DEFAULT_SCHEDULING_TIMELINE_LABELS.statuses, ...uixLabels.schedulingTimeline?.statuses, ...labelOverrides?.statuses },
  } as ResolvedLabels;
  const id = useId();
  const hintId = `${id}-hint`;
  // A step that is not a positive number would turn a drag into an invalid date: the default is used.
  const step = stepProp !== undefined && Number.isFinite(stepProp) && stepProp > 0 ? stepProp : defaultTimelineStep(scale);
  const rootRef = useRef<HTMLElement>(null);
  // The scroller and the layer track are unmounted while `loading` or `error` shows: they are
  // state, not refs, so whatever listens to them follows the element that is there now.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [layerTrack, setLayerTrack] = useState<HTMLDivElement | null>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const barMinRef = useRef<HTMLSpanElement>(null);
  /** The narrowest bar as a share of the track width (0 until measured, and where there is no layout). */
  const [barShare, setBarShare] = useState(0);
  const barShareRef = useRef(0);
  /** The first row in view when the packing is about to change, and where it was: it is put back there afterwards. */
  const anchorRef = useRef<{ key: string; top: number } | null>(null);
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  /** The row that holds the focused control, when that is not the bar with the tab stop (a group toggle). */
  const [focusRowKey, setFocusRowKey] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null);
  const [stepDrag, setStepDrag] = useState<StepDrag | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [selfCollapsed, setSelfCollapsed] = useState<Readonly<Record<string, boolean>>>({});
  const [units, setUnits] = useState(DEFAULT_UNITS);
  const [view, setView] = useState({ top: 0, height: ESTIMATED_VIEWPORT });
  /** Reads the viewport of a virtual timeline now, not on the next frame: after the timeline itself moved the scroll. */
  const measureViewRef = useRef<(() => void) | null>(null);

  // Three ways to move a bar, and they do not mix: a proposal, a commit for every step, or none.
  const proposing = onProposeMove !== undefined;
  const stepping = !proposing && onMoveItem !== undefined;
  const resizing = onResizeItem !== undefined;
  const canMove = (item: Item) => (proposing || stepping) && item.movable !== false;
  const canResize = (item: Item) => resizing && item.movable !== false;
  const hint = proposing ? [labels.proposeHint, resizing ? labels.resizeHint : ''].filter(Boolean).join(' ')
    : stepping ? (resizing ? labels.moveHint : labels.moveKeysHint)
      : resizing ? labels.resizeHint : '';

  const fmtInstant = (instant: string) => {
    const custom = formatInstantProp?.(instant);
    if (custom != null) return custom;
    const text = cachedDateTimeFormat(locale, { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));
    // An hour that occurs twice that day (the clocks went back) says which one it is, as on the axis.
    const offset = timelineRepeatedHourOffset(instant, timeZone);
    return offset ? `${text} ${offset}` : text;
  };
  const fmtTick = (at: number) => formatTick?.(new Date(at), scale) ?? cachedDateTimeFormat(locale, { timeZone, ...TICK_FORMAT[scale] }).format(new Date(at));

  const ticks = useMemo(() => timelineTicks(range, scale, timeZone, weekStartsOn), [range.start, range.end, scale, timeZone, weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const minorTicks = useMemo(
    () => (scale === 'day' && subTicks && subTicks.length > 0 ? timelineSubTicks(range, subTicks, timeZone) : []),
    [range.start, range.end, scale, timeZone, subTicks], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // How wide the narrowest bar is on this track, so that bars drawn at that width are packed
  // apart. Read in a layout effect, before paint, whenever the track can have changed width
  // (a new element, `tickWidth`, the scale, the range), and again whenever it is resized.
  const tickCount = ticks.length;
  useIsomorphicLayoutEffect(() => {
    if (!layerTrack) return undefined;
    const measure = () => {
      const width = layerTrack.getBoundingClientRect().width;
      // The drawn minimum is the stylesheet's (`--timeline-bar-min`): measured, so an override is followed.
      const bar = barMinRef.current?.getBoundingClientRect().width || BAR_MIN_FALLBACK;
      const share = width > 0 ? Math.round((bar / width) * 1e5) / 1e5 : 0;
      if (share === barShareRef.current) return;
      barShareRef.current = share;
      // The rows are about to change height: remember the first one in view, to put it back where it was.
      const body = bodyRef.current;
      const edge = Math.max(0, scroller?.getBoundingClientRect().top ?? 0);
      const first = body ? Array.from(body.children).find((row) => row.hasAttribute('data-row-key') && row.getBoundingClientRect().bottom > edge + 1) : undefined;
      anchorRef.current = first ? { key: first.getAttribute('data-row-key')!, top: first.getBoundingClientRect().top } : null;
      setAnchorKey(anchorRef.current?.key ?? null);
      setBarShare(share);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(layerTrack);
    return () => observer?.disconnect();
  }, [layerTrack, scroller, tickWidth, scale, tickCount]);
  const minSpan = Math.max(0, (Date.parse(range.end) - Date.parse(range.start)) * barShare) || 0;

  const isCollapsed = (group: SchedulingTimelineGroup) => (onToggleGroup ? !!group.collapsed : selfCollapsed[group.id] ?? !!group.collapsed);
  const collapsedSignature = groups?.map((group) => (isCollapsed(group) ? '1' : '0')).join('') ?? '';
  const itemsByLane = useMemo(() => {
    const byLane = new Map<string, Item[]>();
    for (const item of items) { const list = byLane.get(item.laneId); if (list) list.push(item); else byLane.set(item.laneId, [item]); }
    return byLane;
  }, [items]);
  // The rows of the body, top to bottom: a head for each group, then its lanes unless it is collapsed.
  const rows = useMemo<Row[]>(() => {
    const laneRow = (lane: SchedulingTimelineLane, laneIndex: number, groupIndex?: number): LaneRow => {
      const placed = layoutLane(itemsByLane.get(lane.id) ?? EMPTY_ITEMS, range, { flagOverlaps, minSpan });
      return { kind: 'lane', key: `lane-${laneIndex}`, lane, laneIndex, groupIndex, placed, keys: uniqueKeys(placed.map((p) => p.item.id)), subRows: placed.reduce((max, p) => Math.max(max, p.row + 1), 1) };
    };
    if (!groups) return lanes.map((lane, laneIndex) => laneRow(lane, laneIndex));
    const indexes = new Map<string, number[]>();
    lanes.forEach((lane, laneIndex) => { const list = indexes.get(lane.id); if (list) list.push(laneIndex); else indexes.set(lane.id, [laneIndex]); });
    const used = new Set<number>();
    const list: Row[] = [];
    groups.forEach((group, groupIndex) => {
      const collapsed = collapsedSignature[groupIndex] === '1';
      const stands = new Set<string>();
      list.push({ kind: 'head', key: `group-${groupIndex}`, group, groupIndex, collapsed, stands });
      for (const laneId of group.laneIds) {
        for (const laneIndex of indexes.get(laneId) ?? []) {
          if (used.has(laneIndex)) continue;
          used.add(laneIndex);
          if (collapsed) stands.add(laneId); else list.push(laneRow(lanes[laneIndex]!, laneIndex, groupIndex));
        }
      }
    });
    // A lane no group names is still drawn, after the groups.
    lanes.forEach((lane, laneIndex) => { if (!used.has(laneIndex)) list.push(laneRow(lane, laneIndex)); });
    return list;
  }, [lanes, groups, collapsedSignature, itemsByLane, range.start, range.end, flagOverlaps, minSpan]); // eslint-disable-line react-hooks/exhaustive-deps
  const laneRows = useMemo(() => rows.filter((row): row is LaneRow => row.kind === 'lane'), [rows]);
  // Every bar on screen, in reading order, and the row each id is first found in.
  const { ordered, rowOfItem } = useMemo(() => {
    const ids: string[] = [];
    const rowOf = new Map<string, number>();
    rows.forEach((row, rowIndex) => {
      if (row.kind !== 'lane') return;
      for (const p of row.placed) { ids.push(p.item.id); if (!rowOf.has(p.item.id)) rowOf.set(p.item.id, rowIndex); }
    });
    return { ordered: ids, rowOfItem: rowOf };
  }, [rows]);
  // Nothing to show means nothing in any lane, a collapsed one included.
  const nothingToShow = useMemo(() => {
    if (ordered.length > 0) return false;
    const laneIds = new Set(lanes.map((lane) => lane.id));
    return !items.some((item) => laneIds.has(item.laneId) && placeSpan(item, range) !== null);
  }, [ordered, lanes, items, range.start, range.end]); // eslint-disable-line react-hooks/exhaustive-deps
  const focusId = activeId !== undefined && rowOfItem.has(activeId) ? activeId : ordered[0];

  // A collapsed group that a window covers (one over every lane, or over a lane it hides) gets a
  // strip under its head, one sub-row tall, for that window: there nothing lies over it.
  const strips = useMemo(() => {
    const set = new Set<number>();
    const shown = overlays.filter((overlay) => placeSpan(overlay, range) !== null).map(lanesOf);
    if (shown.length === 0) return set;
    rows.forEach((row, index) => {
      if (row.kind !== 'head' || !row.collapsed || row.stands.size === 0) return;
      if (shown.some((targets) => targets === null || [...row.stands].some((laneId) => targets.has(laneId)))) set.add(index);
    });
    return set;
  }, [rows, overlays, range.start, range.end]); // eslint-disable-line react-hooks/exhaustive-deps
  const extents = useMemo(() => timelineRowExtents(rows.map((row, index) => (row.kind === 'head' ? { kind: 'head' as const, subRows: strips.has(index) ? 1 : 0 } : { kind: 'lane' as const, subRows: row.subRows }))), [rows, strips]);
  // Virtual or not is a count of what the consumer passed. It must not follow the packing: that
  // depends on the width, and a timeline that turned virtual on a resize would change its rows.
  const windowed = lanes.length + (groups?.length ?? 0) > virtualizeAbove;
  // Paper has no scroller: while the page prints, every row and every bar is mounted (HAR-1541).
  const printing = usePrinting(windowed);
  const virtual = windowed && !printing;
  // Fixed row heights are what a clip and a virtual window are counted in. A plain timeline
  // keeps rows that grow with their label: it uses none of the props that need them. The rows
  // of a windowed timeline keep their height on paper.
  const fixed = windowed || groups !== undefined || overlays.some((overlay) => overlay.laneIds !== undefined) || markers.some((marker) => marker.laneIds !== undefined);

  // What the viewport shows of the body, in px: read on scroll and resize, only while virtual.
  // Keyed on the scroller element: after `loading` or `error` it is a new one and is bound again.
  useEffect(() => {
    if (!virtual || !scroller) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const probe = probeRef.current;
      if (probe) {
        const [row, pad, head] = Array.from(probe.children, (child) => child.getBoundingClientRect().height);
        if (row && pad && head) setUnits((current) => (current.row === row && current.pad === pad && current.head === head ? current : { row, pad, head }));
      }
      const box = scroller.getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
      const shown = Math.min(box.bottom, viewport) - Math.max(box.top, 0);
      // Inside its own scroller the timeline is scrolled by scrollTop; on a scrolling page, by how far its top is above the viewport.
      const top = scroller.scrollTop + Math.max(0, -box.top);
      const next = { top: Math.round(top), height: shown > 0 ? Math.round(shown) : ESTIMATED_VIEWPORT };
      setView((current) => (Math.abs(current.top - next.top) < 8 && current.height === next.height ? current : next));
    };
    const schedule = () => {
      if (frame) return;
      frame = -1;
      const handle = requestAnimationFrame(measure);
      // A frame that ran at once has already cleared the flag.
      if (frame === -1) frame = handle || 1;
    };
    measure();
    measureViewRef.current = measure;
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(scroller);
    return () => {
      measureViewRef.current = null;
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [virtual, scroller]);

  const px = (extent: TimelineExtent) => extent.subRows * units.row + extent.lanes * units.pad + extent.heads * units.head;
  const offsets = useMemo(() => (virtual ? extents.map(px) : []), [virtual, extents, units]); // eslint-disable-line react-hooks/exhaustive-deps
  const overscan = OVERSCAN_ROWS * units.row;
  // Two rows stay mounted wherever the window is: the one whose bar has the tab stop, and the
  // one that holds the focused control when that is something else (a group toggle). A focused
  // element that is unmounted loses focus to the page.
  const pinned = focusId === undefined ? -1 : rowOfItem.get(focusId) ?? -1;
  const focusedRow = useMemo(() => (focusRowKey === null ? -1 : rows.findIndex((row) => row.key === focusRowKey)), [rows, focusRowKey]);
  // A third, for one render: the row that was first in view when the packing changed.
  const anchorRow = useMemo(() => (anchorKey === null ? -1 : rows.findIndex((row) => row.key === anchorKey)), [rows, anchorKey]);
  // The window is what the viewport shows plus overscan: a taller viewport mounts more, never less than it shows.
  const { mounted, windowStart } = useMemo(() => {
    if (!virtual) return { mounted: rows.map((_, index) => index), windowStart: 0 };
    const window_ = timelineWindow(offsets, view.top, view.top + view.height, { overscan });
    const list: number[] = [];
    for (let index = window_.start; index < window_.end; index++) list.push(index);
    for (const index of new Set([pinned, focusedRow, anchorRow])) {
      if (index !== -1 && (index < window_.start || index >= window_.end)) list.push(index);
    }
    list.sort((a, b) => a - b);
    return { mounted: list, windowStart: window_.start };
  }, [virtual, rows, offsets, view, overscan, pinned, focusedRow, anchorRow]);

  // The packing changed (the track got another width): the rows above the viewport are taller
  // or shorter now. The row that was first in view is put back where it was, in whatever
  // scrolls the timeline, so the reader keeps their place.
  useIsomorphicLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (anchorKey === null || !anchor || anchor.key !== anchorKey) return;
    anchorRef.current = null;
    setAnchorKey(null);
    const body = bodyRef.current;
    const row = body ? Array.from(body.children).find((child) => child.getAttribute('data-row-key') === anchor.key) : undefined;
    if (!row || !scroller) return;
    const delta = row.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) < 1) return;
    const view_ = scroller.ownerDocument.defaultView;
    const scrolls = (element: Element) => { const overflow = view_?.getComputedStyle(element).overflowY; return (overflow === 'auto' || overflow === 'scroll') && element.scrollHeight > element.clientHeight + 1; };
    let holder: Element | null = scroller;
    while (holder && !scrolls(holder)) holder = holder.parentElement;
    if (holder) holder.scrollTop += delta; else view_?.scrollBy(0, delta);
    // The window of a virtual timeline follows at once: no frame is painted with the rows of the old position.
    measureViewRef.current?.();
  }, [anchorKey, barShare]); // eslint-disable-line react-hooks/exhaustive-deps
  /** In a virtual timeline a bar is mounted when its sub-row is near the viewport, or it has the tab stop. */
  const barMounted = (rowIndex: number, placed: PlacedSpan<Item>) => {
    if (!virtual || placed.item.id === focusId) return true;
    const top = offsets[rowIndex]! + placed.row * units.row;
    return top + units.row + units.pad > view.top - overscan && top < view.top + view.height + overscan;
  };

  const findBar = (itemId: string) => {
    for (const candidate of Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-timeline-item]') ?? [])) {
      if (candidate.getAttribute('data-timeline-item') === itemId) return candidate;
    }
    return null;
  };
  // Focus goes to a bar after the render that mounts it: in a virtual timeline it may not be in the DOM yet.
  const focusItem = (itemId: string | undefined) => {
    if (itemId === undefined) return;
    setActiveId(itemId);
    setFocusRequest({ id: itemId });
  };
  useEffect(() => {
    if (focusRequest) findBar(focusRequest.id)?.focus();
  }, [focusRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers on `window` outlive a render: they read the latest props through this ref.
  const itemById = useMemo(() => { const map = new Map<string, Item>(); for (const row of laneRows) for (const p of row.placed) if (!map.has(p.item.id)) map.set(p.item.id, p.item); return map; }, [laneRows]);
  const stepDelta = timelineStepDelta(step);
  /** A pointer distance is a whole number of steps: that many times what one step is, in days or in minutes. */
  const deltaFor = (ms: number): MoveDelta => { const steps = Math.round(ms / step); return { days: steps * stepDelta.days, minutes: steps * stepDelta.minutes }; };
  const live = useRef({ itemById, timeZone, range, step, onProposeMove, canMove, deltaFor, labels, fmtInstant });
  live.current = { itemById, timeZone, range, step, onProposeMove, canMove, deltaFor, labels, fmtInstant };
  const dragRef = useRef<{ id: string; pointerId: number; x: number; y: number; width: number; moved: boolean; dropped: boolean; ms: number; stop: () => void } | null>(null);
  const suppressClick = useRef(false);
  // The bar a keyboard move was sent for: when the consumer applies the move the button may be
  // rebuilt in another lane, and focus goes back to it instead of being lost.
  const refocus = useRef<string | null>(null);

  // A pending or sent move whose bar is no longer on screen is dropped.
  useEffect(() => {
    if (ghost && !itemById.has(ghost.id)) setGhost(null);
  }, [ghost, itemById]);
  useEffect(() => {
    const wanted = refocus.current;
    if (!wanted || !rootRef.current) return;
    const active = document.activeElement;
    const lost = !active || active === document.body;
    if (!lost) { if (active.getAttribute('data-item-id') !== wanted) refocus.current = null; return; }
    findBar(wanted)?.focus();
  });
  useEffect(() => () => { dragRef.current?.stop(); dragRef.current = null; }, []);
  // The consumer took `onProposeMove` away: nothing can be sent any more, so nothing stays pending.
  useEffect(() => {
    if (proposing) return;
    dragRef.current?.stop();
    dragRef.current = null;
    if (ghost) { setGhost(null); setAnnouncement(''); }
  }, [proposing]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Hands one finished gesture to the consumer. The bar itself only moves when its props do. */
  const send = (itemId: string, delta: MoveDelta) => {
    const state = live.current;
    const item = state.itemById.get(itemId);
    // Checked again here: the bar may have been pinned, or proposing turned off, while the gesture ran.
    if (!item || !state.onProposeMove || !state.canMove(item) || (delta.days === 0 && delta.minutes === 0)) { setGhost(null); return; }
    const proposal = proposeMove(item, delta, state.timeZone);
    const result = state.onProposeMove(itemId, proposal);
    // Sent, not done: the consumer decides, and the bar moves only when its props do.
    setAnnouncement(fillLabel(state.labels.moveSent, { start: state.fmtInstant(proposal.start), end: state.fmtInstant(proposal.end) }));
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      // The outline stays where the user asked until the consumer answers.
      setGhost({ id: itemId, delta, source: 'sent', proposal });
      const clear = () => setGhost((current) => (current && current.source === 'sent' && current.proposal === proposal ? null : current));
      (result as Promise<unknown>).then(clear, clear);
    } else setGhost(null);
  };

  /** `onMoveItem` and `onResizeItem`: one call for the step, from the props as they are. */
  const commit = (item: Item, delta: number, mode: 'move' | 'resize') => {
    const callback = mode === 'move' ? onMoveItem : onResizeItem;
    if (!callback || delta === 0) return;
    const next = shiftSpan(item, delta, mode, step);
    callback(item.id, next);
    setAnnouncement(mode === 'move'
      ? fillLabel(labels.moved, { title: item.title, start: fmtInstant(next.start), end: fmtInstant(next.end) })
      : fillLabel(labels.resized, { title: item.title, end: fmtInstant(next.end) }));
  };

  const onItemKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, rowIndex: number, placed: PlacedSpan<Item>[], index: number) => {
    const item = placed[index]!.item;
    const pending = ghost && ghost.id === item.id && ghost.source === 'keys' ? ghost.delta : null;
    // Sent: nothing is pending any more, and the live region says so in place of what Enter would do.
    if (event.key === 'Enter' && pending) { event.preventDefault(); refocus.current = item.id; setAnnouncement(''); send(item.id, pending); return; }
    if (event.key === 'Escape' && pending) { event.preventDefault(); event.stopPropagation(); setGhost(null); setAnnouncement(labels.moveCancelled); return; }
    const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (horizontal && event.shiftKey && event.altKey) {
      // The end of a bar moves only with onResizeItem. Without it this chord does nothing at all.
      if (canResize(item)) { event.preventDefault(); commit(item, horizontal * step, 'resize'); }
      return;
    }
    if (horizontal && event.shiftKey && proposing && canMove(item)) {
      event.preventDefault();
      const base = pending ?? { days: 0, minutes: 0 };
      const next = { days: base.days + horizontal * stepDelta.days, minutes: base.minutes + horizontal * stepDelta.minutes };
      if (next.days === 0 && next.minutes === 0) { setGhost(null); setAnnouncement(labels.moveCancelled); return; }
      const proposal = proposeMove(item, next, timeZone);
      setGhost({ id: item.id, delta: next, source: 'keys', proposal });
      const proposed = fillLabel(labels.moveProposed, { start: fmtInstant(proposal.start), end: fmtInstant(proposal.end) });
      setAnnouncement(proposal.adjusted ? `${fillLabel(labels.gapForward, { time: zonedTimeOfDay(proposal.start, timeZone) })} ${proposed}` : proposed);
      return;
    }
    if (horizontal && event.shiftKey && stepping && canMove(item)) {
      event.preventDefault();
      commit(item, horizontal * step, 'move');
      return;
    }
    if (horizontal) { event.preventDefault(); focusItem(placed[index + horizontal]?.item.id); return; }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); focusItem((event.key === 'Home' ? placed[0] : placed[placed.length - 1])?.item.id); return; }
    const vertical = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (vertical) {
      event.preventDefault();
      const start = Date.parse(item.start);
      for (let r = rowIndex + vertical; r >= 0 && r < rows.length; r += vertical) {
        const row = rows[r]!;
        if (row.kind !== 'lane' || row.placed.length === 0) continue;
        const nearest = row.placed.reduce((best, p) => (Math.abs(Date.parse(p.item.start) - start) < Math.abs(Date.parse(best.item.start) - start) ? p : best));
        focusItem(nearest.item.id);
        return;
      }
    }
  };

  // ── the older drag (`onMoveItem`): the bar follows the pointer and one call is made on release ──
  const onStepPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, item: Item) => {
    if (event.button !== 0) return;
    const track = (event.currentTarget.closest('.uix-scheduling-timeline__track') as HTMLElement | null);
    if (!track) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setStepDrag({ id: item.id, x: event.clientX, width: track.getBoundingClientRect().width, delta: 0, moved: false });
  };
  const onStepPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!stepDrag) return;
    const dx = event.clientX - stepDrag.x;
    const delta = pixelsToMs(dx, stepDrag.width, range, step);
    if (delta !== stepDrag.delta || (!stepDrag.moved && Math.abs(dx) > 3)) setStepDrag({ ...stepDrag, delta, moved: stepDrag.moved || Math.abs(dx) > 3 });
  };
  const onStepPointerUp = (item: Item) => {
    if (!stepDrag || stepDrag.id !== item.id) return;
    if (stepDrag.moved) commit(item, stepDrag.delta, 'move');
    // keep `moved` for the click that follows pointerup, then clear
    setStepDrag(stepDrag.moved ? { ...stepDrag, delta: 0 } : null);
    if (stepDrag.moved) window.setTimeout(() => setStepDrag(null), 0);
  };

  // ── the proposal drag (`onProposeMove`): an outline follows, the bar stays, one call on drop ──
  const onProposalPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, item: Item) => {
    if (event.button !== 0 || dragRef.current) return;
    const track = (event.currentTarget.closest('.uix-scheduling-timeline__track') as HTMLElement | null);
    if (!track) return;
    const finish = (drop: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.stop();
      dragRef.current = null;
      if (!drag.moved) return;
      // The click that follows a drag is not an activation, whether the drag was sent or dropped.
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      if (drop && !drag.dropped) send(drag.id, live.current.deltaFor(drag.ms)); else setGhost(null);
    };
    const onMove = (move: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || move.pointerId !== drag.pointerId) return;
      // The button was let go where this window could not see it (a menu, another window): nothing is proposed.
      if (move.buttons === 0 && move.pointerType === 'mouse') { finish(false); return; }
      if (drag.dropped) return;
      const dx = move.clientX - drag.x;
      if (!drag.moved && Math.hypot(dx, move.clientY - drag.y) < DRAG_THRESHOLD) return;
      drag.moved = true;
      const state = live.current;
      const ms = pixelsToMs(dx, drag.width, state.range, state.step);
      if (ms === drag.ms) return;
      drag.ms = ms;
      const dragged = state.itemById.get(drag.id);
      const delta = state.deltaFor(ms);
      setGhost(dragged && ms !== 0 ? { id: drag.id, delta, source: 'pointer', proposal: proposeMove(dragged, delta, state.timeZone) } : null);
    };
    const onUp = (up: PointerEvent) => { if (up.pointerId === dragRef.current?.pointerId) finish(true); };
    const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === dragRef.current?.pointerId) finish(false); };
    // Escape drops the move at once. The press is kept until the button is released, so that
    // release is still not a click on the bar.
    const onKey = (key: KeyboardEvent) => {
      const drag = dragRef.current;
      if (key.key !== 'Escape' || !drag?.moved || drag.dropped) return;
      key.preventDefault();
      key.stopPropagation();
      drag.dropped = true;
      setGhost(null);
    };
    // The pointer is followed on the window: the dragged element may re-render under it.
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    dragRef.current = {
      id: item.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, width: track.getBoundingClientRect().width, moved: false, dropped: false, ms: 0,
      stop: () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey, true);
      },
    };
  };

  const toggleGroup = (group: SchedulingTimelineGroup) => {
    if (onToggleGroup) { onToggleGroup(group.id); return; }
    setSelfCollapsed((current) => ({ ...current, [group.id]: !(current[group.id] ?? !!group.collapsed) }));
  };

  const statusOf = (item: Item): SchedulingStatus => item.status ?? (item.state === 'in-progress' ? 'live' : 'committed');
  /** The old `state` values that flagged a problem keep a marker: a shape and the word of the state, not a hue. */
  const markersOf = (item: Item): SchedulingMarker[] => {
    const flagged = item.state === 'conflicted' || item.state === 'blackout-violation';
    return flagged ? [...(item.markers ?? []), { id: 'state', label: labels.states[item.state!], emphasis: 'warning' }] : item.markers ?? [];
  };
  // A bar with neither `state` nor `status` keeps the word it always had (`states.scheduled`).
  const stateText = (item: Item) => (item.state ? labels.states[item.state] : item.status ? labels.statuses[item.status] : labels.states.scheduled);
  const itemName = (item: Item, conflict: boolean) => item.accessibleName
    ?? [fillLabel(labels.item, { title: item.title, state: stateText(item), start: fmtInstant(item.start), end: fmtInstant(item.end), conflict: conflict ? labels.conflict : '' }), ...(item.markers ?? []).map((marker) => marker.label)].join(', ');
  /** An item that uses none of the generic props is an older item and keeps its `data-state`. */
  const dataState = (item: Item) => item.state ?? (item.band === undefined && item.status === undefined && item.markers === undefined && item.accessibleName === undefined ? 'scheduled' : undefined);
  const overlayWords = (overlay: SchedulingTimelineOverlay) => [overlay.kindLabel ?? (overlay.kind ? labels.overlays[overlay.kind] : undefined), overlay.label, overlay.scopeLabel].filter(Boolean).join(', ');
  const overlayName = (overlay: SchedulingTimelineOverlay) => overlay.accessibleName
    ?? fillLabel(labels.overlay, { title: overlayWords(overlay), start: fmtInstant(overlay.start), end: fmtInstant(overlay.end) });
  /** The kinds once told apart by hue are told apart by pattern. */
  const patternOf = (overlay: SchedulingTimelineOverlay): SchedulingOverlayPattern => overlay.pattern ?? (overlay.kind === undefined || overlay.kind === 'maintenance' ? 'solid' : 'diagonal');

  const trackStyle = { minWidth: `calc(${Math.max(ticks.length - 1, 1)} * ${tickWidth ?? TICK_WIDTH[scale]})` } as CSSProperties;
  const nowPos = now ? placeSpan({ start: now, end: now }, range) : null;

  /** Where a row can carry a window: a lane over its whole height, a collapsed group on the strip under its head. */
  const stretchOf = (index: number): Stretch | null => {
    const row = rows[index]!;
    if (row.kind === 'lane') return { row: index, from: extents[index]!, to: extents[index + 1]! };
    if (!strips.has(index)) return null;
    const top = extents[index]!;
    return { row: index, from: { subRows: top.subRows, lanes: top.lanes, heads: top.heads + 1 }, to: extents[index + 1]! };
  };
  /**
   * Where the words of a window go in a run of stretches: the top of the first one. In a
   * virtual timeline, the first that starts inside the viewport, so the words are on screen
   * wherever the timeline is scrolled; none when the run is out of view.
   */
  const labelTopIn = (run: readonly Stretch[]): string[] => {
    for (const stretch of run) {
      if (!virtual) return [extentCss(stretch.from)];
      if (stretch.row < windowStart) continue;
      const top = px(stretch.from);
      if (top > view.top + view.height + overscan) return [];
      if (top >= view.top) return [extentCss(stretch.from)];
    }
    return [];
  };
  /** The clip that limits one element to the rows of the lanes it names, and where its words go. Null: nothing to draw. */
  const scopeOf = (targets: ReadonlySet<string> | null): Scope | null => {
    if (targets === null) {
      // Over every row: no clip (a group head lies over it). The words go on the first lane, or on the first strip when no lane is open.
      const all = rows.flatMap((_, index) => stretchOf(index) ?? []);
      const onLane = labelTopIn(all.filter((stretch) => rows[stretch.row]!.kind === 'lane'));
      return { scope: 'all', labelTops: onLane.length > 0 ? onLane : labelTopIn(all) };
    }
    // A collapsed group is one row that stands for its lanes: a window over one of them is drawn
    // on the strip of that row, so it stays in sight and in reach while its lanes are not.
    const covers = (row: Row) => (row.kind === 'lane' ? targets.has(row.lane.id) : row.collapsed && [...row.stands].some((laneId) => targets.has(laneId)));
    const runs: Stretch[][] = [];
    rows.forEach((row, index) => {
      const stretch = covers(row) ? stretchOf(index) : null;
      if (!stretch) return;
      const last = runs[runs.length - 1];
      // Stretches that meet are one run: one rectangle of the clip, one set of words.
      if (last && sameExtent(last[last.length - 1]!.to, stretch.from)) last.push(stretch); else runs.push([stretch]);
    });
    if (runs.length === 0) return null;
    const clip = `polygon(${runs.map((run) => { const from = extentCss(run[0]!.from); const to = extentCss(run[run.length - 1]!.to); return `0 ${from}, 100% ${from}, 100% ${to}, 0 ${to}`; }).join(', ')})`;
    // The words are written once in each run: a bar may sit on them in one run and not in the next.
    return { scope: 'lanes', clip, labelTops: runs.flatMap(labelTopIn) };
  };

  const renderOverlay = (overlay: SchedulingTimelineOverlay, key: string, scope: Scope | null) => {
    const pos = placeSpan(overlay, range);
    if (!pos || !scope) return null;
    const shared = {
      className: 'uix-scheduling-timeline__overlay',
      'data-overlay-id': overlay.id,
      'data-pattern': patternOf(overlay),
      'data-kind': overlay.kind,
      'data-scope': scope.scope,
      style: { left: `${pos.left}%`, width: `${pos.width}%`, ...vars({ '--uix-timeline-clip': scope.clip }) },
    };
    const text = scope.labelTops.map((top) => <span key={top} className="uix-scheduling-timeline__overlay-label" style={vars({ '--uix-timeline-label-top': top })}>
      {overlay.kindLabel && <span className="uix-scheduling-timeline__overlay-kind">{overlay.kindLabel}</span>}
      <span className="uix-scheduling-timeline__overlay-name">{overlay.label}</span>
      {overlay.scopeLabel && <span className="uix-scheduling-timeline__overlay-scope">{overlay.scopeLabel}</span>}
    </span>);
    return onSelectOverlay
      ? <button key={key} type="button" {...shared} aria-label={overlayName(overlay)} onClick={() => onSelectOverlay(overlay)}>{text}</button>
      : <span key={key} {...shared} aria-hidden="true">{text}</span>;
  };
  const renderMarker = (marker: SchedulingTimelineMarker, key: string, scope: Scope | null) => {
    const pos = placeSpan({ start: marker.at, end: marker.at }, range);
    if (!pos || !scope) return null;
    return <span key={key} className="uix-scheduling-timeline__marker" data-marker-id={marker.id} data-scope={scope.scope} style={{ left: `${pos.left}%`, ...vars({ '--uix-timeline-clip': scope.clip }) }} title={marker.label} aria-hidden="true" />;
  };
  const overlayKeys = uniqueKeys(overlays.map((overlay) => overlay.id));
  const markerKeys = uniqueKeys(markers.map((marker) => marker.id));
  // With fixed rows everything is drawn once over the body and clipped to its lanes. Without,
  // a window or marker for one lane is drawn in that lane, where the row can still grow.
  const inLayer = (target: { laneId?: string; laneIds?: string[] }) => fixed || lanesOf(target) === null;

  const columnNoteList = columnNotes ? Object.keys(columnNotes).flatMap((date) => {
    const node = columnNotes[date];
    if (node == null || node === false) return [];
    let pos: ReturnType<typeof placeSpan> = null;
    try { const bounds = zonedDayBounds(date, timeZone); pos = placeSpan({ start: bounds.start.toISOString(), end: bounds.end.toISOString() }, range); } catch { pos = null; }
    // A day that only touches the range at one of its ends has no column on this axis.
    return pos && pos.width > 0 ? [{ date, node, pos }] : [];
  }) : [];

  const renderItems = (row: LaneRow, rowIndex: number) => row.placed.map((p, index) => {
    if (!barMounted(rowIndex, p)) return null;
    const item = p.item;
    const dragging = stepDrag?.id === item.id && stepDrag.moved;
    const shown = dragging && stepDrag ? placeSpan(shiftSpan(item, stepDrag.delta, 'move', step), range) ?? p : p;
    const movable = canMove(item);
    const described = movable || canResize(item);
    const itemMarkers = markersOf(item);
    return (
      <li key={row.keys[index]} className="uix-scheduling-timeline__slot" style={{ left: `${shown.left}%`, width: `${shown.width}%`, ...vars({ '--uix-timeline-row': p.row }) }}>
        <button
          type="button"
          className="uix-scheduling-timeline__item"
          data-timeline-item={item.id}
          data-item-id={item.id}
          title={item.title}
          data-band={item.band ?? 'none'}
          data-status={statusOf(item)}
          data-state={dataState(item)}
          data-conflict={p.conflict || undefined}
          data-clipped-start={p.clippedStart || undefined}
          data-clipped-end={p.clippedEnd || undefined}
          data-movable={movable || undefined}
          data-dragging={dragging || undefined}
          tabIndex={focusId === item.id ? 0 : -1}
          aria-label={itemName(item, p.conflict)}
          aria-describedby={described ? hintId : undefined}
          onFocus={() => setActiveId(item.id)}
          onBlur={proposing ? () => {
            refocus.current = null;
            // Leaving the bar drops what was pending on it, and says so.
            if (ghost && ghost.id === item.id && ghost.source === 'keys') { setGhost(null); setAnnouncement(labels.moveCancelled); }
          } : undefined}
          onKeyDown={(event) => onItemKeyDown(event, rowIndex, row.placed, index)}
          onPointerDown={!movable ? undefined : proposing ? (event) => onProposalPointerDown(event, item) : (event) => onStepPointerDown(event, item)}
          onPointerMove={stepping ? onStepPointerMove : undefined}
          onPointerUp={stepping ? () => onStepPointerUp(item) : undefined}
          onPointerCancel={stepping ? () => setStepDrag(null) : undefined}
          onClick={() => {
            if (stepDrag?.moved) return;
            // With a move pending on this bar, a click (Space is one) is neither a selection nor a confirmation: Enter and Escape decide.
            if (ghost && ghost.id === item.id && ghost.source === 'keys') return;
            onSelectItem?.(item);
          }}
        >
          <span className="uix-scheduling-timeline__item-title">{renderItem?.(item) ?? item.title}</span>
          {item.meta && <span className="uix-scheduling-timeline__item-meta">{item.meta}</span>}
          {itemMarkers.length > 0 && <span className="uix-scheduling-timeline__item-markers">{itemMarkers.map((marker) => <ItemMarker key={marker.id} marker={marker} />)}</span>}
        </button>
      </li>
    );
  });

  const renderRow = (row: Row, rowIndex: number) => {
    if (row.kind === 'head') {
      const { group, collapsed } = row;
      return (
        <div key={row.key} className={cx('uix-scheduling-timeline__row', 'uix-scheduling-timeline__row--group', collapsed && 'uix-scheduling-timeline__row--summary')} data-row-key={row.key} data-group-id={group.id} data-collapsed={collapsed || undefined} data-strip={strips.has(rowIndex) || undefined}>
          <div className="uix-scheduling-timeline__group-head">
          <div className="uix-scheduling-timeline__group-label">
            <button type="button" className="uix-scheduling-timeline__group-toggle" aria-expanded={!collapsed} onClick={() => toggleGroup(group)}>
              <span className="uix-scheduling-timeline__group-chevron" aria-hidden="true" />
              <span className="uix-scheduling-timeline__group-name" id={`${id}-group-${row.groupIndex}`}>{group.label}</span>
            </button>
            {group.meta != null && <span className="uix-scheduling-timeline__group-meta">{group.meta}</span>}
            {collapsed && group.summary && <span className="uix-scheduling-timeline__group-summary">
              <span className="uix-scheduling-timeline__group-count">{fillLabel(labels.groupSummary, { count: group.summary.count })}</span>
              {group.summary.markers && group.summary.markers.length > 0 && <span className="uix-scheduling-timeline__item-markers">{group.summary.markers.map((marker) => <ItemMarker key={marker.id} marker={marker} showLabel />)}</span>}
            </span>}
          </div>
          </div>
          {strips.has(rowIndex) && <div className="uix-scheduling-timeline__group-strip" aria-hidden="true" />}
        </div>
      );
    }
    const { lane } = row;
    const laneLabelId = `${id}-lane-${row.laneIndex}`;
    const ghostPlaced = ghost ? row.placed.find((p) => p.item.id === ghost.id) : undefined;
    const ghostPos = ghost && ghostPlaced && rowOfItem.get(ghost.id) === rowIndex ? placeSpan(ghost.proposal, range) : null;
    return (
      <div key={row.key} className="uix-scheduling-timeline__row" data-row-key={row.key} data-lane-id={lane.id} style={vars({ '--uix-timeline-rows': row.subRows })}>
        <div className="uix-scheduling-timeline__lane-label" id={laneLabelId}>
          <span className="uix-scheduling-timeline__lane-name">{lane.label}</span>
          {lane.meta != null && <span className="uix-scheduling-timeline__lane-meta">{lane.meta}</span>}
        </div>
        <div className="uix-scheduling-timeline__track" style={trackStyle}>
          {overlays.map((overlay, index) => (!inLayer(overlay) && lanesOf(overlay)!.has(lane.id) ? renderOverlay(overlay, overlayKeys[index]!, IN_LANE) : null))}
          {markers.map((marker, index) => (!inLayer(marker) && lanesOf(marker)!.has(lane.id) ? renderMarker(marker, markerKeys[index]!, IN_LANE) : null))}
          <ul className="uix-scheduling-timeline__items" aria-labelledby={row.groupIndex === undefined ? laneLabelId : `${id}-group-${row.groupIndex} ${laneLabelId}`}>
            {renderItems(row, rowIndex)}
          </ul>
          {ghostPos && <span className="uix-scheduling-timeline__ghost" aria-hidden="true" data-sent={ghost?.source === 'sent' || undefined} style={{ left: `${ghostPos.left}%`, width: `${ghostPos.width}%`, ...vars({ '--uix-timeline-row': ghostPlaced!.row }) }} />}
        </div>
      </div>
    );
  };

  // Mounted rows in order, with one spacer for each stretch of rows that is not mounted.
  const body: ReactNode[] = [];
  let cursor = 0;
  const spacer = (from: number, to: number) => <div key={`spacer-${from}`} className="uix-scheduling-timeline__spacer" aria-hidden="true" style={{ height: extentCss(between(extents[from]!, extents[to]!)) }} />;
  for (const index of mounted) {
    if (index > cursor) body.push(spacer(cursor, index));
    body.push(renderRow(rows[index]!, index));
    cursor = index + 1;
  }
  if (cursor < rows.length) body.push(spacer(cursor, rows.length));

  const listed = onSelectOverlay ? EMPTY_OVERLAYS : overlays;
  return (
    <section
      ref={rootRef}
      className={cx('uix-scheduling-timeline', className)}
      aria-label={fillLabel(labels.region, { timeZone })}
      data-fixed={fixed || undefined}
      onClickCapture={(event) => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); } }}
    >
      {notice != null && notice !== false && <div className="uix-scheduling-timeline__notice">{notice}</div>}
      {loading ? <div className="uix-scheduling-timeline__state" role="status">{labels.loading}</div>
        : error ? <div className="uix-scheduling-timeline__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>{labels.retry}</button>}</div>
        : <>
          {(listed.length > 0 || markers.length > 0) && (
            <div className="uix-visually-hidden">
              <p id={`${id}-windows`}>{labels.windows}</p>
              <ul aria-labelledby={`${id}-windows`}>
                {listed.map((o, index) => <li key={overlayKeys[index]}>{o.accessibleName ?? <>{o.kindLabel === undefined && o.kind ? `${labels.overlays[o.kind]}: ${o.label}${o.scopeLabel ? `, ${o.scopeLabel}` : ''}` : overlayWords(o)}, {fmtInstant(o.start)} – {fmtInstant(o.end)}</>}</li>)}
                {markers.map((m, index) => <li key={markerKeys[index]}>{m.label}, {fmtInstant(m.at)}</li>)}
              </ul>
            </div>
          )}
          <div ref={setScroller} className="uix-scheduling-timeline__scroller" data-virtual={virtual || undefined} data-scroll-y={maxHeight !== undefined || undefined} style={maxHeight !== undefined ? { maxHeight } : undefined}>
            <div className="uix-scheduling-timeline__grid" data-sub-ticks={minorTicks.length > 0 || undefined}>
              <div className="uix-scheduling-timeline__row uix-scheduling-timeline__row--axis" aria-hidden="true">
                <div className="uix-scheduling-timeline__lane-label">{labels.lanes}</div>
                <div className="uix-scheduling-timeline__track uix-scheduling-timeline__axis" style={trackStyle}>
                  {ticks.map((tick) => (
                    <span key={tick.at} className="uix-scheduling-timeline__tick" data-major={tick.major || undefined} style={{ left: `${tick.offset}%` }}>
                      {tick.offset < 100 && <span className="uix-scheduling-timeline__tick-label">{fmtTick(tick.at)}{tick.offsetLabel && <span className="uix-scheduling-timeline__tick-offset">{tick.offsetLabel}</span>}</span>}
                    </span>
                  ))}
                  {minorTicks.map((tick) => (
                    <span key={`minor-${tick.at}`} className="uix-scheduling-timeline__tick" data-minor="true" style={{ left: `${tick.offset}%` }}>
                      <span className="uix-scheduling-timeline__tick-label">{formatTick?.(new Date(tick.at), 'hour') ?? tick.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              {columnNoteList.length > 0 && (
                <div className="uix-scheduling-timeline__row uix-scheduling-timeline__row--notes">
                  <div className="uix-scheduling-timeline__lane-label" />
                  <div className="uix-scheduling-timeline__track" style={trackStyle}>
                    {columnNoteList.map(({ date, node, pos }) => <div key={date} className="uix-scheduling-timeline__column-note" data-date={date} style={{ left: `${pos.left}%`, width: `${pos.width}%` }}>{node}</div>)}
                  </div>
                </div>
              )}
              <div
                ref={bodyRef}
                className="uix-scheduling-timeline__body"
                onFocus={(event) => setFocusRowKey((event.target as HTMLElement).closest?.('[data-row-key]')?.getAttribute('data-row-key') ?? null)}
                onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusRowKey(null); }}
              >
                <div className="uix-scheduling-timeline__layer">
                  <div className="uix-scheduling-timeline__lane-label" aria-hidden="true" />
                  <div ref={setLayerTrack} className="uix-scheduling-timeline__track" style={trackStyle}>
                    <span ref={barMinRef} className="uix-scheduling-timeline__bar-min" aria-hidden="true" />
                    {ticks.map((tick) => <span key={tick.at} className="uix-scheduling-timeline__gridline" data-major={tick.major || undefined} style={{ left: `${tick.offset}%` }} aria-hidden="true" />)}
                    {minorTicks.map((tick) => <span key={`minor-${tick.at}`} className="uix-scheduling-timeline__gridline" data-minor="true" style={{ left: `${tick.offset}%` }} aria-hidden="true" />)}
                    {overlays.map((overlay, index) => (inLayer(overlay) ? renderOverlay(overlay, overlayKeys[index]!, scopeOf(lanesOf(overlay))) : null))}
                    {markers.map((marker, index) => (inLayer(marker) ? renderMarker(marker, markerKeys[index]!, scopeOf(lanesOf(marker))) : null))}
                    {nowPos && <span className="uix-scheduling-timeline__now" style={{ left: `${nowPos.left}%` }} aria-hidden="true"><span className="uix-scheduling-timeline__now-label">{labels.now}</span></span>}
                  </div>
                </div>
                {body}
              </div>
            </div>
            {virtual && <span ref={probeRef} className="uix-scheduling-timeline__probe" aria-hidden="true"><span /><span /><span /></span>}
          </div>
          {nothingToShow && <p className="uix-scheduling-timeline__empty">{labels.empty}</p>}
        </>}
      {hint && <span id={hintId} className="uix-visually-hidden">{hint}</span>}
      <span className="uix-visually-hidden" role="status" aria-live="polite">{announcement}</span>
    </section>
  );
}
