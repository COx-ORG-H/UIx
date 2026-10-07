export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  weekday: number;
}

export interface DateRangeValue {
  start?: string;
  end?: string;
}

export interface ZonedDateSpan {
  start: string;
  end: string;
}

function fromDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new TypeError(`Invalid ISO date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
}

export function addCalendarDays(value: string, amount: number): string {
  const date = fromDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

export function addCalendarMonths(value: string, amount: number): string {
  const date = fromDateKey(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return toDateKey(date);
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

/** A weekday in `Date.getUTCDay()` numbering: 0 = Sunday … 6 = Saturday. */
export type CalendarWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function buildMonthGrid(month: string, weekStartsOn: CalendarWeekday = 1): CalendarDay[] {
  const first = fromDateKey(startOfMonth(month));
  const offset = (first.getUTCDay() - weekStartsOn + 7) % 7;
  const start = addCalendarDays(toDateKey(first), -offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addCalendarDays(start, index);
    const parsed = fromDateKey(date);
    return {
      date,
      day: parsed.getUTCDate(),
      inMonth: date.slice(0, 7) === month.slice(0, 7),
      weekday: parsed.getUTCDay(),
    };
  });
}

// ---------------------------------------------------------------------------------------
// Zoned time (HAR-1504). Everything here takes an explicit IANA zone and uses only
// `Intl.DateTimeFormat`; nothing reads the process time zone or adds a fixed day length.
// ---------------------------------------------------------------------------------------

const FORMATTER_CACHE_LIMIT = 64;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * A shared `Intl.DateTimeFormat` for `locale` and `options`. Formatters are expensive to
 * build, so one instance is kept per locale and options shape (key order does not matter);
 * the cache holds up to 64 shapes and drops the oldest past that.
 */
export function cachedDateTimeFormat(locale: string | readonly string[] | undefined, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  const shape = Object.keys(options).sort().map((key) => [key, (options as Record<string, unknown>)[key]]);
  const key = JSON.stringify([locale ?? null, shape]);
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale as string | string[] | undefined, options);
    if (formatterCache.size >= FORMATTER_CACHE_LIMIT) formatterCache.delete(formatterCache.keys().next().value!);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

interface WallClock { year: number; month: number; day: number; hour: number; minute: number; second: number }

const partsFormatter = (timeZone: string) => cachedDateTimeFormat('en-US', {
  timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function toInstant(value: string | number | Date): number {
  const ms = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  if (Number.isNaN(ms)) throw new TypeError(`Invalid instant: ${String(value)}`);
  return ms;
}

/** Wall-clock parts of an instant in `timeZone` (whole seconds). */
function wallClock(ms: number, timeZone: string): WallClock {
  const wall: WallClock = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const part of partsFormatter(timeZone).formatToParts(new Date(ms))) {
    if (part.type in wall) wall[part.type as keyof WallClock] = Number(part.value);
  }
  return wall;
}

const wallKey = (wall: WallClock) => `${String(wall.year).padStart(4, '0')}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')}`;
const wallAsUtc = (wall: WallClock) => Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
const wholeSecond = (ms: number) => Math.floor(ms / 1000) * 1000;

/** The zone's UTC offset at an instant, in ms (positive east of Greenwich). */
function offsetAt(ms: number, timeZone: string): number {
  return wallAsUtc(wallClock(ms, timeZone)) - wholeSecond(ms);
}

function formatOffset(offset: number): string {
  const sign = offset < 0 ? '-' : '+';
  const minutes = Math.round(Math.abs(offset) / 60_000);
  return `${sign}${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The calendar date (`YYYY-MM-DD`) of an instant in `timeZone`. */
export function zonedDateKey(instant: string | Date, timeZone: string): string {
  return wallKey(wallClock(toInstant(instant), timeZone));
}

/** A date key that names a real calendar date (`2026-13-01` throws; the older helpers roll it over). */
function checkedDateKey(value: string): string {
  if (toDateKey(fromDateKey(value)) !== value) throw new TypeError(`Invalid ISO date: ${value}`);
  return value;
}

const DAY_START_CACHE_LIMIT = 2048;
const dayStartCache = new Map<string, number>();

/** First instant whose zoned date is `dateKey`: a binary search on instants, never offset arithmetic. */
function zonedDayStart(dateKey: string, timeZone: string): number {
  const cacheKey = `${timeZone} ${dateKey}`;
  const cached = dayStartCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const midnightUtc = fromDateKey(checkedDateKey(dateKey)).getTime();
  // Real offsets lie within about ±15 h, so ±30 h brackets any day start.
  let lo = (midnightUtc - 30 * 3_600_000) / 1000;
  let hi = (midnightUtc + 30 * 3_600_000) / 1000;
  const keyAt = (seconds: number) => wallKey(wallClock(seconds * 1000, timeZone));
  if (keyAt(lo) >= dateKey || keyAt(hi) < dateKey) throw new RangeError(`Cannot find the start of ${dateKey} in ${timeZone}`);
  // Invariant: key(lo) < dateKey <= key(hi). Zone transitions fall on whole seconds.
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (keyAt(mid) >= dateKey) hi = mid; else lo = mid;
  }
  const start = hi * 1000;
  if (dayStartCache.size >= DAY_START_CACHE_LIMIT) dayStartCache.delete(dayStartCache.keys().next().value!);
  dayStartCache.set(cacheKey, start);
  return start;
}

export interface ZonedDayBounds {
  /** The first instant of the day in the zone (local 00:00, or the first existing time after a gap). */
  start: Date;
  /** The first instant of the next day: `end` of D equals `start` of D + 1. */
  end: Date;
}

/**
 * The half-open interval `[start, end)` of a calendar day in `timeZone`. DST days are 23 or
 * 25 hours long; a day whose midnight does not exist starts at its first existing instant.
 */
export function zonedDayBounds(dateKey: string, timeZone: string): ZonedDayBounds {
  return { start: new Date(zonedDayStart(dateKey, timeZone)), end: new Date(zonedDayStart(addCalendarDays(dateKey, 1), timeZone)) };
}

export interface ZonedHourSlot {
  /** The real instant the local hour starts. */
  instant: Date;
  /** The local hour, two digits (`'00'` … `'23'`). */
  label: string;
  /**
   * The UTC offset (`'+02:00'`) when this local hour occurs twice in the day (clocks went
   * back), set on both occurrences; otherwise `null`.
   */
  offsetLabel: string | null;
}

/**
 * One entry per real hour start in the day `[start, end)` in `timeZone`: 24 on most days,
 * 23 when clocks go forward (no slot for the skipped hour) and 25 when they go back (the
 * repeated hour twice, each with an `offsetLabel`).
 */
export function zonedHourSlots(dateKey: string, timeZone: string): ZonedHourSlot[] {
  const dayStart = zonedDayStart(dateKey, timeZone);
  const dayEnd = zonedDayStart(addCalendarDays(dateKey, 1), timeZone);
  const QUARTER = 15 * 60_000;
  const slots: Array<{ at: number; hour: number }> = [];
  let at = dayStart;
  while (at < dayEnd) {
    const wall = wallClock(at, timeZone);
    if (wall.minute === 0 && wall.second === 0) {
      slots.push({ at, hour: wall.hour });
      at += 3_600_000;
    } else {
      // A transition that is not a whole hour (Lord Howe's 30 min): the next local :00 lies
      // on the quarter-hour grid from the day start.
      at = dayStart + (Math.floor((at - dayStart) / QUARTER) + 1) * QUARTER;
    }
  }
  const counts = new Map<number, number>();
  for (const slot of slots) counts.set(slot.hour, (counts.get(slot.hour) ?? 0) + 1);
  return slots.map(({ at: ms, hour }) => ({
    instant: new Date(ms),
    label: String(hour).padStart(2, '0'),
    offsetLabel: (counts.get(hour) ?? 0) > 1 ? formatOffset(offsetAt(ms, timeZone)) : null,
  }));
}

export interface ZonedDayShift {
  instant: Date;
  /** `'gap_forward'` when the target wall-clock time did not exist and moved forward past the gap. */
  adjusted: 'gap_forward' | null;
}

/**
 * Moves an instant by `days` calendar days in `timeZone`, keeping its wall-clock time
 * ("+1 day" is the same local time on the next day, whether that day has 23, 24 or 25
 * hours). A wall time that occurs twice keeps the source's offset when it can (else the
 * earlier one). A wall time that does not exist moves forward by the gap, once, and the
 * result says so (`adjusted: 'gap_forward'`).
 */
export function addZonedDays(instant: string | Date, days: number, timeZone: string): ZonedDayShift {
  if (!Number.isInteger(days)) throw new RangeError(`addZonedDays needs a whole number of days, got ${days}`);
  const ms = toInstant(instant);
  const fraction = ms - wholeSecond(ms);
  const wall = wallClock(ms, timeZone);
  const sourceOffset = wallAsUtc(wall) - wholeSecond(ms);
  const target = fromDateKey(addCalendarDays(wallKey(wall), days));
  const targetWall = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), wall.hour, wall.minute, wall.second);
  // Offsets in force a day either side of the target bracket any transition near it.
  const before = offsetAt(targetWall - 86_400_000, timeZone);
  const after = offsetAt(targetWall + 86_400_000, timeZone);
  const valid = [...new Set([sourceOffset, before, after])]
    .filter((offset) => offsetAt(targetWall - offset, timeZone) === offset)
    .sort((a, b) => b - a);
  if (valid.length) {
    const offset = valid.includes(sourceOffset) ? sourceOffset : valid[0]!;
    return { instant: new Date(targetWall - offset + fraction), adjusted: null };
  }
  // A gap: read the wall time with the offset in force before it, which lands past the gap.
  return { instant: new Date(targetWall - before + fraction), adjusted: 'gap_forward' };
}

/**
 * Calendar days `[start, end)` as date keys: `end` is the first day NOT covered.
 * Produced by `zonedDaySpan`, read by `enumerateDateKeys`.
 */
export interface ZonedDaySpan {
  start: string;
  end: string;
}

/**
 * The calendar days an instant interval `[start, end)` touches in `timeZone`, end-exclusive:
 * an entry ending exactly at local 00:00 occupies only the day before. Throws a `RangeError`
 * when `end` is not after `start`; it never swaps the ends.
 */
export function zonedDaySpan(start: string | Date, end: string | Date, timeZone: string): ZonedDaySpan {
  const from = toInstant(start);
  const to = toInstant(end);
  if (to <= from) {
    throw new RangeError(`zonedDaySpan: end (${new Date(to).toISOString()}) must be after start (${new Date(from).toISOString()}); the interval is inverted or empty`);
  }
  return { start: zonedDateKey(new Date(from), timeZone), end: addCalendarDays(zonedDateKey(new Date(to - 1), timeZone), 1) };
}

/**
 * The date keys of a `ZonedDaySpan` (`[start, end)`), at most `limit` of them (default
 * 370; `Infinity` for no limit). `truncated` is true when the span has more days than were
 * returned, so a long span is never cut silently. Throws a `RangeError` on an inverted span.
 */
export function enumerateDateKeys(span: ZonedDaySpan, options: { limit?: number } = {}): { dates: string[]; truncated: boolean } {
  const limit = options.limit ?? 370;
  if (!(limit === Infinity || (Number.isInteger(limit) && limit >= 0))) throw new RangeError(`enumerateDateKeys: limit must be a non-negative integer or Infinity, got ${limit}`);
  checkedDateKey(span.start);
  checkedDateKey(span.end);
  if (span.end < span.start) throw new RangeError(`enumerateDateKeys: end (${span.end}) is before start (${span.start}); the span is inverted`);
  const dates: string[] = [];
  let current = span.start;
  while (current < span.end && dates.length < limit) {
    dates.push(current);
    current = addCalendarDays(current, 1);
  }
  return { dates, truncated: current < span.end };
}

/**
 * Inclusive date keys of an instant interval, with inverted ends swapped.
 * @deprecated Use `zonedDaySpan`, which is end-exclusive (an entry ending at local 00:00
 * does not paint the next day) and throws on an inverted interval instead of swapping.
 * The behaviour here is unchanged in 2.x; changing it follows the contract-change process (E13).
 */
export function zonedDateSpan(start: string, end: string, timeZone: string): ZonedDateSpan {
  const startKey = zonedDateKey(start, timeZone);
  const endKey = zonedDateKey(end, timeZone);
  return startKey <= endKey ? { start: startKey, end: endKey } : { start: endKey, end: startKey };
}

/**
 * Date keys of an inclusive span, stopping silently after `limit` (370).
 * @deprecated Use `enumerateDateKeys`, which reads an end-exclusive `ZonedDaySpan` and
 * reports `truncated` instead of stopping silently. The behaviour here is unchanged in 2.x (E13).
 */
export function enumerateDateSpan(span: ZonedDateSpan, limit = 370): string[] {
  const dates: string[] = [];
  let current = span.start;
  while (current <= span.end && dates.length < limit) {
    dates.push(current);
    current = addCalendarDays(current, 1);
  }
  return dates;
}

// ---------------------------------------------------------------------------------------
// Lanes and top-N cuts. Generic: the consumer supplies the meaning and the order.
// ---------------------------------------------------------------------------------------

export interface LaneInterval {
  id: string;
  /** Half-open `[start, end)`: ISO string, epoch ms or Date. */
  start: string | number | Date;
  end: string | number | Date;
}

export interface LanePlacement {
  /** 0-based lane, or `null` when the interval did not fit in `maxLanes`. */
  lane: number | null;
  /** Index into `PackedLanes.clusters`. */
  cluster: number;
}

export interface LaneCluster {
  /** Ids of one run of transitively overlapping intervals, by start, then end, then id. */
  ids: string[];
  /** Lanes the cluster uses (≤ `maxLanes`); a renderer divides the width by this. */
  laneCount: number;
  /** Intervals of the cluster that got no lane. */
  overflow: number;
}

export interface PackedLanes {
  lanes: Record<string, LanePlacement>;
  clusters: LaneCluster[];
  /** Intervals that got no lane, over all clusters. */
  overflow: number;
}

export interface PackLanesOptions {
  /**
   * `'start'` (default): greedy first-fit by start, then end, then id, so the result does
   * not depend on input order. `'given'`: first-fit in input order, so the consumer's
   * ranking decides which intervals get a lane when there are not enough.
   */
  order?: 'start' | 'given';
}

/**
 * Assigns half-open intervals to at most `maxLanes` lanes, first-fit. Two intervals that
 * overlap never share a lane; two that only touch (`a.end === b.start`) may. Intervals
 * that do not fit get `lane: null` and count towards their cluster's `overflow`. A
 * zero-length interval occupies its start instant. Throws on `end < start` (it never
 * swaps) and on a duplicate id.
 */
export function packLanes(intervals: readonly LaneInterval[], maxLanes: number, options: PackLanesOptions = {}): PackedLanes {
  if (!(maxLanes === Infinity || (Number.isInteger(maxLanes) && maxLanes >= 0))) throw new RangeError(`packLanes: maxLanes must be a non-negative integer, got ${maxLanes}`);
  const order = options.order ?? 'start';
  if (order !== 'start' && order !== 'given') throw new TypeError(`packLanes: unknown order ${String(order)}`);
  const seen = new Set<string>();
  const items = intervals.map((interval) => {
    if (seen.has(interval.id)) throw new TypeError(`packLanes: duplicate id ${interval.id}`);
    seen.add(interval.id);
    const start = toInstant(interval.start);
    const end = toInstant(interval.end);
    if (end < start) throw new RangeError(`packLanes: interval ${interval.id} ends before it starts`);
    return { id: interval.id, start, end: end === start ? start + 1 : end };
  });
  const byStart = [...items].sort((a, b) => a.start - b.start || a.end - b.end || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const clusterOf = new Map<string, number>();
  const clusters: LaneCluster[] = [];
  let reach = -Infinity;
  for (const item of byStart) {
    if (item.start >= reach) clusters.push({ ids: [], laneCount: 0, overflow: 0 });
    reach = Math.max(reach, item.end);
    clusters[clusters.length - 1]!.ids.push(item.id);
    clusterOf.set(item.id, clusters.length - 1);
  }
  const occupied: Array<Array<{ start: number; end: number }>> = [];
  const lanes: Record<string, LanePlacement> = {};
  for (const item of order === 'start' ? byStart : items) {
    let lane: number | null = null;
    for (let index = 0; index < Math.min(maxLanes, occupied.length + 1); index++) {
      if (!(occupied[index] ?? []).some((other) => item.start < other.end && other.start < item.end)) { lane = index; break; }
    }
    const cluster = clusters[clusterOf.get(item.id)!]!;
    if (lane === null) cluster.overflow++;
    else {
      (occupied[lane] ??= []).push(item);
      cluster.laneCount = Math.max(cluster.laneCount, lane + 1);
    }
    lanes[item.id] = { lane, cluster: clusterOf.get(item.id)! };
  }
  return { lanes, clusters, overflow: clusters.reduce((sum, cluster) => sum + cluster.overflow, 0) };
}

/**
 * Sorts a copy of `items` with `compare` (stable) and cuts it after `n`. `hidden` is the
 * number of items not shown, so it is a true total only when `items` is complete; a
 * consumer that knows a larger total shows that instead.
 */
export function rankOverflow<T>(items: readonly T[], compare: (a: T, b: T) => number, n: number): { visible: T[]; hidden: number } {
  if (!(n === Infinity || (Number.isInteger(n) && n >= 0))) throw new RangeError(`rankOverflow: n must be a non-negative integer, got ${n}`);
  const sorted = [...items].sort(compare);
  const visible = sorted.slice(0, n);
  return { visible, hidden: sorted.length - visible.length };
}

export function selectRangeDate(current: DateRangeValue, date: string): DateRangeValue {
  if (!current.start || current.end) return { start: date };
  return date < current.start ? { start: date, end: current.start } : { start: current.start, end: date };
}

export function isDateInRange(date: string, value: DateRangeValue): boolean {
  return !!value.start && !!value.end && date >= value.start && date <= value.end;
}

export function isDateUnavailable(
  date: string,
  options: { min?: string; max?: string; isDisabled?: (date: string) => boolean },
): boolean {
  return (!!options.min && date < options.min)
    || (!!options.max && date > options.max)
    || !!options.isDisabled?.(date);
}
