/**
 * Pure model for `SchedulingTimeline` (HAR-1364; TENSOR C8): ticks on a time axis, where a
 * bar sits on it, which bars in a lane overlap (and so stack and are flagged), and how a
 * keyboard or pointer move snaps. Instants are ISO 8601 strings or epoch milliseconds; the
 * axis is linear in real time, and only labels depend on the time zone.
 *
 * HAR-1521: lanes are packed by `packLanes` and nothing else, and the sub-ticks, the offset of
 * a repeated hour and every other zone question go through `calendar-model.ts`. The row
 * geometry of the component is in `scheduling-timeline-rows.ts`.
 */
import { enumerateDateKeys, packLanes, zonedDaySpan, zonedHourSlots } from './calendar-model.js';
import type { ZonedHourSlot } from './calendar-model.js';

/** The unit of one tick of the axis. */
export type TimelineScale = 'hour' | 'day' | 'week' | 'month';

export interface TimelineRange {
  start: string;
  end: string;
}

export interface TimelineTick {
  /** Epoch ms of the tick. */
  at: number;
  /** Position on the axis, 0–100. */
  offset: number;
  /** A major tick starts a larger unit (a new day on an hour axis, a new month on a day axis). */
  major: boolean;
  /**
   * On an hour axis, the UTC offset (`'+02:00'`) of an hour that occurs twice that day (the
   * clocks went back), on both occurrences. Not set otherwise.
   */
  offsetLabel?: string;
}

/** A minor tick inside a day: a local hour the consumer asked for. */
export interface TimelineSubTick {
  /** Epoch ms of the tick. */
  at: number;
  /** Position on the axis, 0–100. */
  offset: number;
  /** The local hour (0–23). */
  hour: number;
  /** The local hour, two digits (`'06'`). */
  label: string;
}

export interface TimelineSpan {
  id: string;
  start: string;
  end: string;
}

export interface PlacedSpan<T extends TimelineSpan = TimelineSpan> {
  item: T;
  /** 0–100, clamped to the visible range. */
  left: number;
  width: number;
  /** Starts before / ends after the visible range (draw a cut edge). */
  clippedStart: boolean;
  clippedEnd: boolean;
  /** Sub-row inside the lane, so overlapping bars stack instead of covering each other. */
  row: number;
  /** Overlaps at least one other bar in the same lane. Always `false` with `flagOverlaps: false`. */
  conflict: boolean;
}

export interface LayoutLaneOptions {
  /** `false` keeps the stacking and flags nothing: the consumer says what clashes, with a reason. Default `true`. */
  flagOverlaps?: boolean;
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

const toMs = (value: string | number): number => {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (Number.isNaN(ms)) throw new TypeError(`Invalid instant: ${String(value)}`);
  return ms;
};

/** The default move/resize step for a scale: 15 min on an hour axis, 1 h on a day axis, 1 day otherwise. */
export const defaultTimelineStep = (scale: TimelineScale): number =>
  scale === 'hour' ? 15 * 60_000 : scale === 'day' ? HOUR : DAY;

/** Wall-clock parts of an instant in a time zone. */
function zonedParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: +get('year'), month: +get('month'), day: +get('day'), hour: +get('hour'), minute: +get('minute'), weekday: get('weekday') };
}

/**
 * Ticks for the range at the scale's unit (hour, day, week starting `weekStartsOn`, month),
 * aligned to wall-clock boundaries in `timeZone`. Bounded to 500 ticks; a month axis over a
 * year walks ~8,800 hours, so keep ranges to what fits on screen.
 */
export function timelineTicks(range: TimelineRange, scale: TimelineScale, timeZone: string, weekStartsOn = 1): TimelineTick[] {
  const start = toMs(range.start);
  const end = toMs(range.end);
  if (end <= start) return [];
  const span = end - start;
  const ticks: TimelineTick[] = [];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Walk in quarter-hour steps on an hour axis (zones such as Asia/Kolkata put the hour at
  // :30 UTC) and hour steps otherwise, keeping the instants that start a unit in the zone.
  // Walking wall-clock parts, not adding fixed durations, keeps DST days right.
  const step = scale === 'hour' ? 15 * 60_000 : HOUR;
  let prev = zonedParts(start - step, timeZone);
  for (let at = Math.ceil(start / step) * step; at <= end && ticks.length < 500; at += step) {
    const p = zonedParts(at, timeZone);
    const newHour = p.minute === 0 && (p.hour !== prev.hour || prev.minute !== 0);
    const newDay = p.day !== prev.day && p.minute === 0;
    const newMonth = newDay && p.day === 1;
    const newWeek = newDay && weekdays.indexOf(p.weekday) === weekStartsOn;
    const isTick = scale === 'hour' ? newHour : scale === 'day' ? newDay : scale === 'week' ? newWeek : newMonth;
    if (isTick) {
      const major = scale === 'hour' ? newDay : scale === 'day' ? newWeek : scale === 'week' ? newMonth : p.month === 1;
      ticks.push({ at, offset: ((at - start) / span) * 100, major });
    }
    prev = p;
  }
  if (scale !== 'hour') return ticks;
  // An hour that occurs twice (the clocks went back) says which one it is.
  const repeated = new Map(rangeHourSlots(start, end, timeZone).flat().filter((slot) => slot.offsetLabel !== null).map((slot) => [slot.instant.getTime(), slot.offsetLabel!]));
  return repeated.size === 0 ? ticks : ticks.map((tick) => (repeated.has(tick.at) ? { ...tick, offsetLabel: repeated.get(tick.at)! } : tick));
}

/** How many days of hour slots a range may ask for: more than any axis that fits a screen. */
const SLOT_DAY_LIMIT = 400;

/** The hour slots of each local day the range touches, day by day. Empty for an inverted or empty range. */
function rangeHourSlots(start: number, end: number, timeZone: string): ZonedHourSlot[][] {
  if (!(end > start)) return [];
  const { dates } = enumerateDateKeys(zonedDaySpan(new Date(start), new Date(end), timeZone), { limit: SLOT_DAY_LIMIT });
  return dates.map((date) => zonedHourSlots(date, timeZone));
}

/**
 * Minor ticks for a day axis: one per local hour in `hours` (0–23) on every day of the range,
 * strictly inside it. The instants come from the zone, so on a day the clocks change 06:00 is
 * still local 06:00; an hour that does not exist that day has no tick, and one that occurs
 * twice is ticked at its first occurrence.
 */
export function timelineSubTicks(range: TimelineRange, hours: readonly number[], timeZone: string): TimelineSubTick[] {
  const start = toMs(range.start);
  const end = toMs(range.end);
  if (!(end > start) || hours.length === 0) return [];
  const wanted = new Set(hours);
  const span = end - start;
  return rangeHourSlots(start, end, timeZone).flatMap((day) => {
    const ticked = new Set<number>();
    return day.flatMap((slot) => {
      const hour = Number(slot.label);
      const at = slot.instant.getTime();
      if (!wanted.has(hour) || ticked.has(hour)) return [];
      ticked.add(hour);
      return at > start && at < end ? [{ at, offset: ((at - start) / span) * 100, hour, label: slot.label }] : [];
    });
  });
}

/** Position of one span on the axis, clamped to it; null when it is entirely outside. */
export function placeSpan(span: { start: string; end: string }, range: TimelineRange): Omit<PlacedSpan, 'item' | 'row' | 'conflict'> | null {
  const start = toMs(range.start);
  const end = toMs(range.end);
  const s = toMs(span.start);
  const e = Math.max(toMs(span.end), s);
  if (e < start || s > end || end <= start) return null;
  const total = end - start;
  const left = ((Math.max(s, start) - start) / total) * 100;
  const right = ((Math.min(e, end) - start) / total) * 100;
  return { left, width: Math.max(right - left, 0), clippedStart: s < start, clippedEnd: e > end };
}

/**
 * Places a lane's spans: sorted by start, each in the first sub-row where it overlaps no
 * earlier bar, and flagged `conflict` when it overlaps any other span in the lane (unless
 * `flagOverlaps` is `false`). The rows come from `packLanes`, uncapped: every bar gets one.
 * Spans equal in start and end keep the order given. A span that ends before it starts is a
 * point at its start, and a repeated id is placed each time.
 */
export function layoutLane<T extends TimelineSpan>(items: readonly T[], range: TimelineRange, options: LayoutLaneOptions = {}): PlacedSpan<T>[] {
  const flag = options.flagOverlaps !== false;
  const visible = [...items]
    .sort((a, b) => toMs(a.start) - toMs(b.start) || toMs(a.end) - toMs(b.end))
    .flatMap((item) => { const pos = placeSpan(item, range); return pos ? [{ item, pos }] : []; });
  // The packer wants unique ids and an end that is not before the start. The position in the
  // sorted list is the id, so a repeated or inverted span from a consumer cannot make it throw.
  const packed = packLanes(visible.map(({ item }, index) => ({ id: String(index), start: toMs(item.start), end: Math.max(toMs(item.end), toMs(item.start)) })), Infinity, { order: 'given' });
  return visible.map(({ item, pos }, index) => {
    const placement = packed.lanes[String(index)]!;
    // In a run of spans that overlap one another, each one overlaps at least one of the others.
    return { item, ...pos, row: placement.lane ?? 0, conflict: flag && packed.clusters[placement.cluster]!.ids.length > 1 };
  });
}

/** Rounds a millisecond offset to the nearest step. */
export const snapToStep = (ms: number, step: number): number => Math.round(ms / step) * step;

/** A span moved (both ends) or resized (end only) by `delta` ms, as ISO strings; never shorter than one step. */
export function shiftSpan(span: { start: string; end: string }, delta: number, mode: 'move' | 'resize', step: number): { start: string; end: string } {
  const s = toMs(span.start);
  const e = toMs(span.end);
  if (mode === 'move') return { start: new Date(s + delta).toISOString(), end: new Date(e + delta).toISOString() };
  return { start: new Date(s).toISOString(), end: new Date(Math.max(e + delta, s + step)).toISOString() };
}

/** Converts a horizontal pointer distance on a track of `trackWidth` px to snapped milliseconds. */
export function pixelsToMs(px: number, trackWidth: number, range: TimelineRange, step: number): number {
  if (trackWidth <= 0) return 0;
  return snapToStep((px / trackWidth) * (toMs(range.end) - toMs(range.start)), step);
}

/**
 * A move step as `proposeMove` takes it: a whole number of `DAY`s is that many calendar days
 * (the wall-clock time is kept, whatever the length of the days in between); anything else is
 * real minutes.
 */
export function timelineStepDelta(step: number): { days: number; minutes: number } {
  if (step !== 0 && step % DAY === 0) return { days: step / DAY, minutes: 0 };
  return { days: 0, minutes: step / 60_000 };
}
