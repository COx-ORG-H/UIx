/**
 * Pure model for `SchedulingTimeline` (HAR-1364; TENSOR C8): ticks on a time axis, where a
 * bar sits on it, which bars in a lane overlap (and so stack and are flagged), and how a
 * keyboard or pointer move snaps. Instants are ISO 8601 strings or epoch milliseconds; the
 * axis is linear in real time, and only labels depend on the time zone.
 */

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
  /** Overlaps at least one other bar in the same lane. */
  conflict: boolean;
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
  return ticks;
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
 * Places a lane's spans: sorted by start, each in the first sub-row where it does not overlap
 * the previous bar, and flagged `conflict` when it overlaps any other span in the lane.
 */
export function layoutLane<T extends TimelineSpan>(items: readonly T[], range: TimelineRange): PlacedSpan<T>[] {
  const sorted = [...items].sort((a, b) => toMs(a.start) - toMs(b.start) || toMs(a.end) - toMs(b.end));
  const rowEnds: number[] = [];
  const placed: PlacedSpan<T>[] = [];
  for (const item of sorted) {
    const pos = placeSpan(item, range);
    if (!pos) continue;
    const s = toMs(item.start);
    let row = rowEnds.findIndex((end) => end <= s);
    if (row === -1) { row = rowEnds.length; rowEnds.push(0); }
    rowEnds[row] = Math.max(toMs(item.end), s);
    placed.push({ item, ...pos, row, conflict: false });
  }
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]!.item; const b = placed[j]!.item;
      if (toMs(b.start) >= toMs(a.end)) continue;
      if (toMs(a.start) < toMs(b.end)) { placed[i]!.conflict = true; placed[j]!.conflict = true; }
    }
  }
  return placed;
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
