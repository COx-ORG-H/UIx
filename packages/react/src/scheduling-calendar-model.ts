/* SchedulingCalendar month/week geometry (HAR-1506, U2). Pure: no React, no CSS, no clock.
 * Day membership is U1's end-exclusive zoned span in one explicit display zone (PDR-0016);
 * lanes come from U1's `packLanes` in the order the consumer gives (it owns the salience
 * order and every count, FG-PLAT-2). Nothing here ranks, cuts or counts for the consumer. */
import { addCalendarDays, addZonedDays, buildMonthGrid, packLanes, startOfMonth, zonedDateKey, zonedDayBounds, zonedDaySpan } from './calendar-model.js';
import type { CalendarWeekday, ZonedDaySpan } from './calendar-model.js';

/** Which lane group a span is drawn in: windows sit above multi-day items, and neither takes a chip slot. */
export type MonthSpanGroup = 'window' | 'item';

export interface MonthSpanInput {
  id: string;
  /** Half-open `[start, end)` instants (ISO 8601, epoch ms or Date). */
  start: string | number | Date;
  end: string | number | Date;
  /** Defaults to `'item'`. */
  group?: MonthSpanGroup;
}

export interface PlacedMonthSpan {
  id: string;
  group: MonthSpanGroup;
  /** 0-based week row of the grid `days` the layout was computed for. */
  weekRow: number;
  /** 0-based lane inside its group. */
  lane: number;
  /** First and last column (0–6, inclusive) the span covers in this row. */
  startCol: number;
  endCol: number;
  /** The span started in an earlier row (or before the grid). */
  continuesBefore: boolean;
  /** The span goes on in a later row (or past the grid). */
  continuesAfter: boolean;
}

export interface MonthSpanLayout {
  /** One entry per span per week row it got a lane in. Render exactly these; never re-pack. */
  placed: PlacedMonthSpan[];
  /** Per week row, the ids that got no lane, in input order. */
  hiddenByRow: Record<number, string[]>;
  /** Per week row with a hidden span, the first day (`YYYY-MM-DD`) a hidden span covers. */
  firstHiddenDayByRow: Record<number, string>;
}

export interface LayoutMonthSpansOptions {
  /** The display zone that decides which days a span covers. */
  timeZone: string;
  /** When set, `days[0]` must fall on this weekday (a guard against a grid built for another week start). */
  weekStartsOn?: CalendarWeekday;
  /** Lanes per group (default 2). A number applies to both groups. */
  laneCap?: number | Partial<Record<MonthSpanGroup, number>>;
}

const DEFAULT_LANE_CAP = 2;

/**
 * The calendar days an item covers in `timeZone`, end-exclusive (`end` is the first day not
 * covered): a 22:00–00:00 item covers only its start day, a 23:00 → 02:00 item two days. A
 * zero-length item covers the day of its start. Throws a `RangeError` when `end` is before
 * `start`; it never swaps them.
 */
export function itemDaySpan(start: string | number | Date, end: string | number | Date, timeZone: string): ZonedDaySpan {
  const from = new Date(start);
  const to = new Date(end);
  if (from.getTime() === to.getTime()) {
    const day = zonedDateKey(from, timeZone);
    return { start: day, end: addCalendarDays(day, 1) };
  }
  return zonedDaySpan(from, to, timeZone);
}

/**
 * The date keys a `SchedulingCalendar` grid shows, in order: six week rows for `'month'`
 * (from the week holding the 1st), one for `'week'` (the week holding `anchorDate`). Pass the
 * result to `layoutMonthSpans` so the layout and the rendered grid agree.
 */
export function schedulingGridDays(anchorDate: string, view: 'month' | 'week', weekStartsOn: CalendarWeekday = 1): string[] {
  if (view === 'month') return buildMonthGrid(startOfMonth(anchorDate), weekStartsOn).map((day) => day.date);
  const weekday = new Date(`${anchorDate}T00:00:00Z`).getUTCDay();
  const first = addCalendarDays(anchorDate, -((weekday - weekStartsOn + 7) % 7));
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(first, index));
}

/**
 * Places multi-day spans as one continuous bar per week row. Spans are taken **in the order
 * given** (the consumer's salience order): in each row and group, the first spans to ask get
 * the lanes, the rest are listed in `hiddenByRow`. Windows and items pack in separate groups,
 * each capped by `laneCap`. Day membership is the end-exclusive zoned span in `timeZone`
 * (never a UTC date). `days` are the grid's date keys, a whole number of weeks.
 */
export function layoutMonthSpans(spans: readonly MonthSpanInput[], days: readonly string[], options: LayoutMonthSpansOptions): MonthSpanLayout {
  if (days.length === 0 || days.length % 7 !== 0) throw new RangeError(`layoutMonthSpans: days must be whole weeks, got ${days.length} day(s)`);
  for (let index = 1; index < days.length; index++) {
    if (days[index] !== addCalendarDays(days[index - 1]!, 1)) throw new RangeError(`layoutMonthSpans: days must be consecutive (${days[index - 1]} → ${days[index]})`);
  }
  if (options.weekStartsOn !== undefined && new Date(`${days[0]}T00:00:00Z`).getUTCDay() !== options.weekStartsOn) {
    throw new RangeError(`layoutMonthSpans: days[0] (${days[0]}) does not fall on weekday ${options.weekStartsOn}`);
  }
  const capFor = (group: MonthSpanGroup) => {
    const cap = typeof options.laneCap === 'number' ? options.laneCap : options.laneCap?.[group] ?? DEFAULT_LANE_CAP;
    if (!(cap === Infinity || (Number.isInteger(cap) && cap >= 0))) throw new RangeError(`layoutMonthSpans: laneCap for ${group} must be a non-negative integer, got ${cap}`);
    return cap;
  };
  const caps = { window: capFor('window'), item: capFor('item') };
  const rows = days.length / 7;
  const gridEnd = addCalendarDays(days[days.length - 1]!, 1);
  const seen = new Set<string>();
  const covered = spans.map((span) => {
    if (seen.has(span.id)) throw new TypeError(`layoutMonthSpans: duplicate id ${span.id}`);
    seen.add(span.id);
    return { id: span.id, group: span.group ?? 'item', days: itemDaySpan(span.start, span.end, options.timeZone) };
  });

  const placed: PlacedMonthSpan[] = [];
  const hiddenByRow: Record<number, string[]> = {};
  const firstHiddenDayByRow: Record<number, string> = {};
  for (let row = 0; row < rows; row++) {
    const rowStart = days[row * 7]!;
    const rowEnd = row + 1 < rows ? days[(row + 1) * 7]! : gridEnd;
    for (const group of ['window', 'item'] as const) {
      const inRow = covered
        .filter((span) => span.group === group && span.days.start < rowEnd && span.days.end > rowStart)
        .map((span) => {
          const from = span.days.start > rowStart ? span.days.start : rowStart;
          const to = span.days.end < rowEnd ? span.days.end : rowEnd;
          const startCol = days.indexOf(from, row * 7) - row * 7;
          const endCol = days.indexOf(addCalendarDays(to, -1), row * 7) - row * 7;
          return { span, from, startCol, endCol };
        });
      // Columns as a half-open integer interval; `packLanes` reads numbers as instants.
      const packed = packLanes(inRow.map(({ span, startCol, endCol }) => ({ id: span.id, start: startCol, end: endCol + 1 })), caps[group], { order: 'given' });
      for (const { span, from, startCol, endCol } of inRow) {
        const lane = packed.lanes[span.id]!.lane;
        if (lane === null) {
          (hiddenByRow[row] ??= []).push(span.id);
          if (firstHiddenDayByRow[row] === undefined || from < firstHiddenDayByRow[row]!) firstHiddenDayByRow[row] = from;
          continue;
        }
        placed.push({
          id: span.id, group, weekRow: row, lane, startCol, endCol,
          continuesBefore: span.days.start < rowStart,
          continuesAfter: span.days.end > rowEnd,
        });
      }
    }
  }
  return { placed, hiddenByRow, firstHiddenDayByRow };
}

// ---------------------------------------------------------------------------------------
// Week/Day time grid (HAR-1509, U3). Geometry comes from real instants: a day column is as
// long as its day (shorter or longer on a clock-change day) and an item sits at the hours
// that really elapsed since the day started. No fixed day length appears below.
// ---------------------------------------------------------------------------------------

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const instantMs = (value: string | number | Date) => new Date(value).getTime();

/** How far past its first local midnight an entry may run and still be drawn in the grid (operator decision E12). */
export const TOP_LANE_CROSS_MIDNIGHT_MINUTES = 360;

export interface TimeGridEntryInput {
  id: string;
  /** Half-open `[start, end)` instants (ISO 8601, epoch ms or Date). */
  start: string | number | Date;
  end: string | number | Date;
  /** An entry with no time of day: always drawn in the top lane. */
  allDay?: boolean;
}

/**
 * Whether an entry is drawn in the top lane of the time grid instead of in the day columns:
 * it is all-day, it is longer than one day (it ends after the same wall-clock time on the
 * next day), or it runs more than `crossMidnightMinutes` past its first local midnight. A
 * shorter midnight-crosser stays in the grid as a start segment and a continuation segment.
 */
export function placesInTopLane(entry: Pick<TimeGridEntryInput, 'start' | 'end' | 'allDay'>, timeZone: string, options: { crossMidnightMinutes?: number } = {}): boolean {
  if (entry.allDay) return true;
  const start = instantMs(entry.start);
  const end = instantMs(entry.end);
  if (!(end > start)) return false;
  if (end > addZonedDays(new Date(start), 1, timeZone).instant.getTime()) return true;
  const firstMidnight = zonedDayBounds(zonedDateKey(new Date(start), timeZone), timeZone).end.getTime();
  return end > firstMidnight + (options.crossMidnightMinutes ?? TOP_LANE_CROSS_MIDNIGHT_MINUTES) * MINUTE_MS;
}

/** Which part of an entry a grid segment is: all of it, its first day, or the rest on the next day. */
export type TimeGridPart = 'whole' | 'start' | 'continuation';

export interface TimeGridSegment {
  id: string;
  part: TimeGridPart;
  /** The segment, clipped to the day (epoch ms). */
  start: number;
  end: number;
  /** Real hours from the start of the day to the segment. Multiply by the hour height. */
  offsetHours: number;
  /** The length of the segment in real hours. */
  lengthHours: number;
  /** 0-based lane inside its overlap cluster. */
  lane: number;
  /** Lanes its cluster uses: the segment is this fraction of the column wide. */
  laneCount: number;
}

export interface TimeGridDayLayout {
  date: string;
  /** The first instant of the day (epoch ms) and its length in real hours. */
  dayStart: number;
  dayHours: number;
  /** One per entry part that got a lane, by start. */
  segments: TimeGridSegment[];
  /** Entries on this day that got no lane, by start. */
  hidden: string[];
}

/**
 * Lays one day column out: every entry that is not in the top lane and touches the day, clipped
 * to it and packed into at most `maxLanes` lanes with `packLanes`. An entry that crosses
 * midnight gives a `'start'` segment on its first day and a `'continuation'` on the next.
 */
export function layoutTimeGridDay(entries: readonly TimeGridEntryInput[], date: string, timeZone: string, options: { maxLanes?: number; crossMidnightMinutes?: number } = {}): TimeGridDayLayout {
  const bounds = zonedDayBounds(date, timeZone);
  const dayStart = bounds.start.getTime();
  const dayEnd = bounds.end.getTime();
  const parts = new Map<string, { start: number; end: number; part: TimeGridPart }>();
  for (const entry of entries) {
    const start = instantMs(entry.start);
    // A zero-length or inverted entry is drawn as an instant at its start.
    const end = Math.max(instantMs(entry.end), start);
    const touches = end > start ? start < dayEnd && end > dayStart : start >= dayStart && start < dayEnd;
    if (!touches || placesInTopLane(entry, timeZone, options)) continue;
    parts.set(entry.id, {
      start: Math.max(start, dayStart),
      end: Math.min(end, dayEnd),
      part: start < dayStart ? 'continuation' : end > dayEnd ? 'start' : 'whole',
    });
  }
  const packed = packLanes([...parts].map(([id, part]) => ({ id, start: part.start, end: part.end })), options.maxLanes ?? Infinity);
  const segments: TimeGridSegment[] = [];
  const hidden: string[] = [];
  for (const cluster of packed.clusters) {
    for (const id of cluster.ids) {
      const part = parts.get(id)!;
      const lane = packed.lanes[id]!.lane;
      if (lane === null) { hidden.push(id); continue; }
      segments.push({
        id, part: part.part, start: part.start, end: part.end,
        offsetHours: (part.start - dayStart) / HOUR_MS,
        lengthHours: (part.end - part.start) / HOUR_MS,
        lane, laneCount: Math.max(cluster.laneCount, 1),
      });
    }
  }
  return { date, dayStart, dayHours: (dayEnd - dayStart) / HOUR_MS, segments, hidden };
}

export interface PlacedDaySpan {
  id: string;
  lane: number;
  /** First and last column (inclusive) of `days` the span covers. */
  startCol: number;
  endCol: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface DaySpanLayout {
  placed: PlacedDaySpan[];
  /** Ids that got no lane, in input order. */
  hidden: string[];
  /** The first day a hidden span covers, when there is one. */
  firstHiddenDay?: string;
}

/**
 * Places spans over one row of consecutive `days` (a week, or the single day of the Day
 * view), in the order given, in at most `laneCap` lanes. Day membership is the end-exclusive
 * zoned span. The time grid uses it for its top lane and its window strip.
 */
export function layoutDaySpans(spans: readonly MonthSpanInput[], days: readonly string[], options: { timeZone: string; laneCap?: number }): DaySpanLayout {
  if (days.length === 0) throw new RangeError('layoutDaySpans: days is empty');
  const rowStart = days[0]!;
  const rowEnd = addCalendarDays(days[days.length - 1]!, 1);
  const inRow = spans
    .map((span) => ({ id: span.id, days: itemDaySpan(span.start, span.end, options.timeZone) }))
    .filter((span) => span.days.start < rowEnd && span.days.end > rowStart)
    .map((span) => {
      const from = span.days.start > rowStart ? span.days.start : rowStart;
      const to = span.days.end < rowEnd ? span.days.end : rowEnd;
      return { span, from, startCol: days.indexOf(from), endCol: days.indexOf(addCalendarDays(to, -1)) };
    });
  const packed = packLanes(inRow.map(({ span, startCol, endCol }) => ({ id: span.id, start: startCol, end: endCol + 1 })), options.laneCap ?? Infinity, { order: 'given' });
  const layout: DaySpanLayout = { placed: [], hidden: [] };
  for (const { span, from, startCol, endCol } of inRow) {
    const lane = packed.lanes[span.id]!.lane;
    if (lane === null) {
      layout.hidden.push(span.id);
      if (layout.firstHiddenDay === undefined || from < layout.firstHiddenDay) layout.firstHiddenDay = from;
      continue;
    }
    layout.placed.push({ id: span.id, lane, startCol, endCol, continuesBefore: span.days.start < rowStart, continuesAfter: span.days.end > rowEnd });
  }
  return layout;
}

/** A move the user asks for. The component never applies it: the consumer decides. */
export interface MoveProposal {
  /** ISO 8601 instants of the proposed window. */
  start: string;
  end: string;
  /** `'gap_forward'` when the wall-clock time asked for does not exist that day and moved past the gap. */
  adjusted: 'gap_forward' | null;
}

/**
 * The window `[start, end)` moved by `minutes` of real time and then by `days` calendar days.
 * A day move keeps the wall-clock start and end (`addZonedDays`), whatever the length of the
 * days in between. Compute it from the original window every time, so that a time falling in
 * a clock-change gap moves forward once, never twice.
 */
export function proposeMove(span: { start: string | number | Date; end: string | number | Date }, delta: { days?: number; minutes?: number }, timeZone: string): MoveProposal {
  const shift = (delta.minutes ?? 0) * MINUTE_MS;
  const start = new Date(instantMs(span.start) + shift);
  const end = new Date(instantMs(span.end) + shift);
  if (!delta.days) return { start: start.toISOString(), end: end.toISOString(), adjusted: null };
  const movedStart = addZonedDays(start, delta.days, timeZone);
  const movedEnd = addZonedDays(end, delta.days, timeZone);
  return { start: movedStart.instant.toISOString(), end: movedEnd.instant.toISOString(), adjusted: movedStart.adjusted ?? movedEnd.adjusted };
}
