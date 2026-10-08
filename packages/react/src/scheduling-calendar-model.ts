/* SchedulingCalendar month/week geometry (HAR-1506, U2). Pure: no React, no CSS, no clock.
 * Day membership is U1's end-exclusive zoned span in one explicit display zone (PDR-0016);
 * lanes come from U1's `packLanes` in the order the consumer gives (it owns the salience
 * order and every count, FG-PLAT-2). Nothing here ranks, cuts or counts for the consumer. */
import { addCalendarDays, buildMonthGrid, packLanes, startOfMonth, zonedDateKey, zonedDaySpan } from './calendar-model.js';
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
