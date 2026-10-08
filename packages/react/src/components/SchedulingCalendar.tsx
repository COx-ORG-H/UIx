"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { addCalendarDays, addCalendarMonths, buildMonthGrid, cachedDateTimeFormat, startOfMonth, zonedDateKey, zonedTimeOfDay } from '../calendar-model.js';
import type { CalendarWeekday } from '../calendar-model.js';
import { TOP_LANE_CROSS_MIDNIGHT_MINUTES, itemDaySpan, layoutMonthSpans } from '../scheduling-calendar-model.js';
import type { MonthSpanGroup, MonthSpanInput, MonthSpanLayout, MoveProposal, PlacedMonthSpan } from '../scheduling-calendar-model.js';
import { SchedulingAgenda } from './SchedulingAgenda.js';
import { SchedulingTimeGrid } from './SchedulingTimeGrid.js';
import type { TimeGridEntryContext } from './SchedulingTimeGrid.js';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { StatusPill } from './StatusPill.js';
import { fillLabel } from '../fill-label.js';

/** `day` is one column of the time grid. `week` is the time grid when `timeGrid` is set, else seven day cells. */
export type SchedulingCalendarView = 'month' | 'week' | 'day' | 'agenda';
/**
 * @deprecated Use `band`, `status` and `markers` on the entry: they carry no product
 * vocabulary and the consumer supplies every word. The values keep working in 2.x.
 */
export type SchedulingEntryState = 'scheduled' | 'conflicted' | 'in-progress' | 'blackout-violation';
/** @deprecated Use `pattern` and `kindLabel` on the overlay. The values keep working in 2.x. */
export type SchedulingOverlayKind = 'maintenance' | 'blackout';
/**
 * The one dimension that takes a hue. `none` and `low` are untinted, `medium` gets a
 * heavier edge, and only `high` is filled. The consumer decides what a band means.
 */
export type SchedulingBand = 'none' | 'low' | 'medium' | 'high';
/**
 * The state channel, drawn without hue: `tentative` is dashed, `committed` is the plain
 * item, `live` carries a leading dot, `done` is dimmed and `dead` is struck through.
 */
export type SchedulingStatus = 'tentative' | 'committed' | 'live' | 'done' | 'dead';
export type SchedulingMarkerEmphasis = 'refused' | 'warning' | 'neutral';
/** How a window is hatched. Windows are neutral: the pattern and the visible label tell them apart. */
export type SchedulingOverlayPattern = 'diagonal' | 'cross' | 'dotted' | 'solid';
/**
 * Which date text a `formatDate` call is for (TENSOR B1/C9, HAR-1347):
 * `day` names one day (each day cell's accessible name, the week-range title);
 * `weekday` is the short column header (the date is any day of that weekday);
 * `month` is the month-view title (the date is the first of the month);
 * `column` heads one day column of the time grid (weekday and date, e.g. "Wed 07.10").
 */
export type SchedulingDatePart = 'day' | 'weekday' | 'month' | 'column';

/** A shape or icon with text. The text is always in the accessible name; a marker never relies on colour. */
export interface SchedulingMarker {
  id: string;
  /** An icon from `@tensor_1/react/icons`. Without one the marker draws a shape for its `emphasis`. */
  icon?: ReactNode;
  label: string;
  emphasis?: SchedulingMarkerEmphasis;
}

export interface SchedulingCalendarEntry {
  id: string;
  title: string;
  start: string;
  end: string;
  /** @deprecated Use `band`, `status` and `markers`. */
  state?: SchedulingEntryState;
  meta?: string;
  band?: SchedulingBand;
  status?: SchedulingStatus;
  markers?: SchedulingMarker[];
  /** The complete accessible name, built by the consumer from its own words. Replaces `labels.entry`. */
  accessibleName?: string;
  /** No time of day. In the time grid the entry is drawn in the top lane. */
  allDay?: boolean;
  /** `false` keeps this entry where it is when the grid allows moves (`canMove`). */
  movable?: boolean;
}

export interface SchedulingCalendarOverlay {
  id: string;
  /** The window's name, shown as text. */
  label: string;
  start: string;
  end: string;
  /** @deprecated Use `pattern` and `kindLabel`. */
  kind?: SchedulingOverlayKind;
  /** Defaults to `'solid'`. */
  pattern?: SchedulingOverlayPattern;
  /** What kind of window this is, in the consumer's words. Shown before the name. */
  kindLabel?: string;
  /** What the window applies to. Shown after the name. */
  scopeLabel?: string;
  /** The window applies to everything. A window that is not global never gets the global treatment. */
  global?: boolean;
  /** The complete accessible name. Replaces `labels.overlay`. */
  accessibleName?: string;
}

/** What the consumer knows about one day (`YYYY-MM-DD`). The calendar shows these numbers and never derives them. */
export interface SchedulingCalendarDay {
  /** Every item on the day, shown in the cell even when no chip fits. */
  count: number;
  /** The "+N" of the cell. 0 shows none. */
  overflowCount: number;
  /** The accessible text of the count, e.g. "7 items, 2 need review". */
  label?: string;
  markers?: SchedulingMarker[];
}

/** One day of the agenda, built by the consumer. The calendar renders the groups and their rows in the order given. */
export interface SchedulingAgendaGroup {
  /** The day the group is for (`YYYY-MM-DD`). */
  date: string;
  /** Replaces the heading text. Default: the date through `formatDate(date, 'day')`. */
  heading?: ReactNode;
  /** Windows that touch the day: one note each beside the heading, never one per row. */
  annotations?: SchedulingCalendarOverlay[];
  rows: SchedulingCalendarEntry[];
  /** Entries of the day that are not in `rows`. Shows "N not shown — open day", which calls `onShowMore`. */
  hiddenCount?: number;
  /** Entries that go on into this day and are listed under an earlier one. */
  continuesCount?: number;
}

export interface SchedulingLegendItem {
  id: string;
  label: string;
  swatch: { band?: SchedulingBand; status?: SchedulingStatus; pattern?: SchedulingOverlayPattern; icon?: ReactNode };
}

/**
 * Every word the calendar renders (TENSOR RX-125, UIX-12). `{timeZone}`, `{view}`,
 * `{title}`, `{state}`, `{start}`, `{end}` are placeholders.
 */
export interface SchedulingCalendarLabels {
  region: string;
  /** @deprecated Use `previousMonth` and `previousWeek`. Still used when those are not set. */
  previous: string;
  /** @deprecated Use `nextMonth` and `nextWeek`. Still used when those are not set. */
  next: string;
  previousMonth?: string;
  nextMonth?: string;
  /** Also names the agenda's step, which moves by a week. */
  previousWeek?: string;
  nextWeek?: string;
  previousDay?: string;
  nextDay?: string;
  viewGroup: string;
  viewMonth: string;
  viewWeek: string;
  viewDay?: string;
  viewAgenda: string;
  loading: string;
  retry: string;
  agenda: string;
  agendaEmpty: string;
  grid: string;
  /** An entry's accessible name unless it sets `accessibleName`. Its marker labels are appended. */
  entry: string;
  /** A window's accessible name unless it sets `accessibleName`. `{title}` is its kind, name and scope. */
  overlay?: string;
  legend: string;
  /** The "+N more" toggle on a day with more entries than `maxEntriesPerDay`. `{count}` placeholder. */
  moreEntries: string;
  /** Accessible name of that toggle. `{count}` and `{date}` placeholders. */
  moreEntriesLabel: string;
  /** The toggle once the day is expanded in place. */
  fewerEntries: string;
  /** The "+N" at the end of a week row whose spans did not all get a lane. `{count}` placeholder. */
  moreSpans?: string;
  /** Accessible name of that control. `{count}` and `{date}` (the first day with a hidden span). */
  moreSpansLabel?: string;
  /** The accessible text of a day's count when `days[date].label` is not given. `{count}` placeholder. */
  dayCount?: string;
  states: Record<SchedulingEntryState, string>;
  /** The words for `status`, used in the default accessible name and the agenda. */
  statuses?: Partial<Record<SchedulingStatus, string>>;
  /** The header of the hour axis: it names the display zone. `{timeZone}` placeholder. */
  timeZone?: string;
  /** Names the strip of windows above the time grid. */
  windows?: string;
  /** "+N windows" when the strip has more windows than lanes. `{count}` placeholder. */
  moreWindows?: string;
  /** Accessible name of that control. `{count}` and `{date}` (the first day with a hidden window). */
  moreWindowsLabel?: string;
  /** Names the lane above the hours that holds all-day and long entries. */
  topLane?: string;
  /** The cue on the second-day part of an entry that crosses midnight. `{time}` is its start. */
  continuesFrom?: string;
  /** Under an agenda day whose rows are not all listed. `{count}` placeholder. */
  hiddenInDay?: string;
  /** Under an agenda day that entries from an earlier day run into. `{count}` placeholder. */
  continuesInDay?: string;
  /** Read after an item's name when it can be moved. */
  moveHint?: string;
  /** Announced for a pending move. `{start}` and `{end}` placeholders. */
  moveProposed?: string;
  /** Announced when a pending move is dropped. */
  moveCancelled?: string;
  /** Announced when the time asked for does not exist that day. `{time}` is the time used instead. */
  gapForward?: string;
}

export const DEFAULT_SCHEDULING_CALENDAR_LABELS: SchedulingCalendarLabels = {
  region: 'Scheduling calendar in {timeZone}',
  previous: 'Previous',
  next: 'Next',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousWeek: 'Previous week',
  nextWeek: 'Next week',
  previousDay: 'Previous day',
  nextDay: 'Next day',
  viewGroup: 'Calendar view',
  viewMonth: 'Month',
  viewWeek: 'Week',
  viewDay: 'Day',
  viewAgenda: 'Agenda',
  loading: 'Loading schedule…',
  retry: 'Try again',
  agenda: 'Schedule agenda',
  agendaEmpty: 'No scheduled entries match the current filters.',
  grid: '{view} schedule',
  entry: '{title}, {state}, {start} to {end}',
  overlay: '{title}, {start} to {end}',
  legend: 'Schedule state legend',
  moreEntries: '+{count} more',
  moreEntriesLabel: '{count} more entries on {date}',
  fewerEntries: 'Show fewer',
  moreSpans: '+{count}',
  moreSpansLabel: '{count} more spanning this week, from {date}',
  dayCount: '{count} entries',
  states: { scheduled: 'Scheduled', conflicted: 'Conflicted', 'in-progress': 'In progress', 'blackout-violation': 'Blackout violation' },
  statuses: { tentative: 'Tentative', committed: 'Scheduled', live: 'In progress', done: 'Done', dead: 'Cancelled' },
  timeZone: '{timeZone}',
  windows: 'Windows',
  moreWindows: '+{count} windows',
  moreWindowsLabel: '{count} more windows, from {date}',
  topLane: 'All-day and longer entries',
  continuesFrom: 'from {time}',
  hiddenInDay: '{count} not shown — open day',
  continuesInDay: 'Continues: {count} listed under an earlier day',
  moveHint: 'Hold Shift and press an arrow key to move it. Enter confirms, Escape cancels.',
  moveProposed: 'Move to {start} – {end}. Enter confirms, Escape cancels.',
  moveCancelled: 'Move cancelled.',
  gapForward: 'That time does not exist on this day. Moved forward to {time}.',
};

export interface SchedulingCalendarProps {
  /**
   * The entries. Without `dayEntries` the calendar places each on its day in the order
   * given; with `dayEntries` only the entries that cover more than one day are read from
   * here (they are drawn as spans).
   */
  entries: SchedulingCalendarEntry[];
  anchorDate: string;
  timeZone: string;
  view?: SchedulingCalendarView;
  onViewChange?: (view: SchedulingCalendarView) => void;
  onAnchorDateChange?: (date: string) => void;
  /** Called by a click or Enter on a chip, a span or an agenda row. */
  onSelectEntry?: (entry: SchedulingCalendarEntry) => void;
  overlays?: SchedulingCalendarOverlay[];
  /** Called by a click or Enter on a window span. */
  onSelectOverlay?: (overlay: SchedulingCalendarOverlay) => void;
  filter?: (entry: SchedulingCalendarEntry) => boolean;
  /**
   * Replaces a chip's content. The default is the start time in `timeZone` (24 h) and the title.
   * In the time grid the second argument says how many text lines fit in the item (0: show the
   * markers only); elsewhere it is not passed.
   */
  renderEntry?: (entry: SchedulingCalendarEntry, context?: TimeGridEntryContext) => ReactNode;
  locale?: string;
  /** First column of the month and week grids: 0 = Sunday … 6 = Saturday. Defaults to 1 (Monday). */
  weekStartsOn?: CalendarWeekday;
  /**
   * Formats every calendar date the component writes (`date` is `YYYY-MM-DD`). Use it to
   * apply a product date format such as DD.MM.YYYY; defaults to `Intl` in `locale`.
   */
  formatDate?: (date: string, part: SchedulingDatePart) => string;
  /**
   * Formats a start or end instant (ISO 8601) for the agenda and the accessible names.
   * The component does not shift it: render it in `timeZone` yourself. Defaults to the
   * `day` date text followed by the 24-hour time in `timeZone`.
   */
  formatInstant?: (instant: string) => string;
  /**
   * How many chips a day shows. Without `dayEntries` the rest collapse behind "+N more";
   * with `dayEntries` it only sizes the cell (the consumer already cut the list, and a longer
   * list makes the cells taller, never clipped). Unset shows every entry where the cells
   * grow, and sizes a fixed cell for three chips.
   */
  maxEntriesPerDay?: number;
  /**
   * Called by a day's "+N more" and by a week row's "+N" with the day (and, without
   * `dayEntries`, every entry on it). When set, the consumer shows them (a popover, a
   * drawer, the day view) and the day stays collapsed. Required with `days` or `dayEntries`:
   * a controlled day never expands in place.
   */
  onShowMore?: (date: string, entries: SchedulingCalendarEntry[]) => void;
  /**
   * A small badge beside a day's date, e.g. a collision count. Keep it short (a number or a
   * glyph): it shares a narrow column with the date and is clipped, not wrapped. It sits
   * outside the date button, so give it its own accessible text (a visually hidden word next
   * to the number). Return null for no badge.
   */
  renderDayBadge?: (date: string, entries: SchedulingCalendarEntry[]) => ReactNode;
  /**
   * Consumer-owned numbers per day (`YYYY-MM-DD`). When set, each listed day shows its
   * `count` and markers even with no chip, and its "+N" is `overflowCount`, never a number
   * derived from the entries given. Without `dayEntries` the chips are still this day's
   * `entries`, cut to `maxEntriesPerDay`; the day never expands in place.
   */
  days?: Record<string, SchedulingCalendarDay>;
  /**
   * The single-day chips of each day, already ranked and cut by the consumer. When set, the
   * calendar renders exactly these in the order given: it does not place, rank, cut or count.
   */
  dayEntries?: Record<string, SchedulingCalendarEntry[]>;
  /**
   * The result of `layoutMonthSpans` for this grid. When set, the calendar draws exactly
   * these spans and never packs lanes itself. Compute it with `schedulingGridDays`.
   */
  spanLayout?: MonthSpanLayout;
  /**
   * Lanes kept for windows above the chips. Windows never take a chip slot. Default 2 where
   * the cells have a fixed height; where they grow with their content every window gets a lane.
   */
  windowLaneCap?: number;
  /** Lanes kept for entries that cover more than one day. Default as for `windowLaneCap`. */
  spanLaneCap?: number;
  /** When set, the legend is exactly these items (an empty list draws no legend). Unset keeps the built-in state legend. */
  legend?: SchedulingLegendItem[];
  /** A line under the legend, e.g. the display zone. */
  legendCaption?: ReactNode;
  /** `false` hides the previous/next buttons, the title and the view switch (the page has its own toolbar). */
  showHeader?: boolean;
  /** Shown above the grid, e.g. "Showing the first 2,000 items". */
  notice?: ReactNode;
  /** Shown inside the grid, below the day cells, when there is nothing to show. */
  emptyNote?: ReactNode;
  /** Called by a click or Enter on a day number. */
  onSelectDate?: (date: string) => void;
  /**
   * The agenda as day groups built by the consumer: which entry is listed under which day,
   * in which order, and how many are left out. When set, `view="agenda"` renders exactly
   * these, each day under a heading, and never sorts, groups or counts. Unset keeps the flat
   * list sorted by start.
   */
  agendaGroups?: SchedulingAgendaGroup[];
  /** The heading level of an agenda day. Default 3. */
  agendaHeadingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Above this many agenda rows only the rows near the viewport are mounted. Default 200. */
  virtualizeAbove?: number;
  /**
   * `'counts'` draws each month cell with the consumer's `days[date].count` and markers
   * only: no chips and no entry bars, and narrower columns, for a narrow screen. Windows keep
   * their bar and name. Default `'full'`.
   */
  monthDensity?: 'full' | 'counts';
  /**
   * Draws `view="week"` as a time grid: seven day columns on an hour axis. `view="day"` is
   * always a time grid. Default `false`: the week stays seven day cells.
   */
  timeGrid?: boolean;
  /** An instant (ISO 8601). The time grid draws one line at it, in the column of its day. The component keeps no clock. */
  now?: string;
  /**
   * Lets the user ask for a move in the time grid (drag, or Shift and an arrow key, then
   * Enter). Without it, or without `onProposeMove`, items have no move affordance at all.
   */
  canMove?: boolean;
  /** Minutes a move snaps to. Default 15. */
  step?: number;
  /**
   * Called once per finished gesture with the window the user asks for. The calendar never
   * moves the item: it draws entries where the props say, so an entry whose props do not
   * change is back where it was. Return a promise to keep the outline until it settles.
   */
  onProposeMove?: (id: string, proposal: MoveProposal) => void | Promise<unknown>;
  /** An entry running more than this many minutes past its first local midnight goes to the top lane. Default 360. */
  topLaneCrossMidnightMinutes?: number;
  /** Rows of the top lane of the time grid. Default 3. */
  topLaneCap?: number;
  /** Lanes side by side in one day column of the time grid, at most. Fewer are used when the column is narrow. Default 4. */
  maxLanes?: number;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<SchedulingCalendarLabels>;
}

const stateTone = (state: SchedulingEntryState) => state === 'scheduled' ? 'info' : state === 'in-progress' ? 'success' : 'danger';
const utcDate = (date: string) => new Date(`${date}T00:00:00Z`);
const INTL_PARTS: Record<SchedulingDatePart, Intl.DateTimeFormatOptions> = {
  day: { dateStyle: 'full', timeZone: 'UTC' },
  weekday: { weekday: 'short', timeZone: 'UTC' },
  month: { month: 'long', year: 'numeric', timeZone: 'UTC' },
  column: { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' },
};
const EMPTY_OVERLAYS: SchedulingCalendarOverlay[] = [];
const EMPTY_ENTRIES: SchedulingCalendarEntry[] = [];
const DEFAULT_LANE_CAP = 2;
/** Chip rows a fixed-height cell keeps when `maxEntriesPerDay` is not given. */
const DEFAULT_CHIP_ROWS = 3;

/** The days an entry covers, end-exclusive. An entry whose end is before its start is shown on its start day. */
function coveredDays(start: string, end: string, timeZone: string) {
  try { return itemDaySpan(start, end, timeZone); } catch { return itemDaySpan(start, start, timeZone); }
}

function Marker({ marker, showLabel }: { marker: SchedulingMarker; showLabel?: boolean }) {
  const emphasis = marker.emphasis ?? 'neutral';
  return <span className="uix-scheduling-calendar__marker" data-emphasis={emphasis} data-glyph={marker.icon == null ? emphasis : undefined}>
    {marker.icon != null && <span className="uix-scheduling-calendar__marker-icon" aria-hidden="true">{marker.icon}</span>}
    <span className={showLabel ? 'uix-scheduling-calendar__marker-label' : 'uix-visually-hidden'}>{marker.label}</span>
  </span>;
}
const renderMarker = (marker: SchedulingMarker, showLabel?: boolean) => <Marker marker={marker} showLabel={showLabel} />;

/** Month/week/agenda calendar for UTC ranges rendered in an explicit IANA time zone. */
export function SchedulingCalendar({
  entries, anchorDate, timeZone, view: controlledView, onViewChange, onAnchorDateChange,
  onSelectEntry, overlays = EMPTY_OVERLAYS, onSelectOverlay, filter, renderEntry, locale, weekStartsOn = 1, formatDate, formatInstant: formatInstantProp,
  maxEntriesPerDay, onShowMore, renderDayBadge, days: dayInfo, dayEntries, spanLayout, windowLaneCap, spanLaneCap,
  legend, legendCaption, showHeader = true, notice, emptyNote, onSelectDate, agendaGroups, agendaHeadingLevel = 3, virtualizeAbove = 200, monthDensity = 'full', timeGrid = false, now, canMove = false, step = 15, onProposeMove,
  topLaneCrossMidnightMinutes = TOP_LANE_CROSS_MIDNIGHT_MINUTES, topLaneCap = 3, maxLanes = 4, loading, error, onRetry, className, labels: labelOverrides,
}: SchedulingCalendarProps) {
  const uixLabels = useUixLabels();
  const overrides = { ...uixLabels.schedulingCalendar, ...labelOverrides };
  const labels = {
    ...DEFAULT_SCHEDULING_CALENDAR_LABELS,
    ...overrides,
    states: { ...DEFAULT_SCHEDULING_CALENDAR_LABELS.states, ...uixLabels.schedulingCalendar?.states, ...labelOverrides?.states },
    statuses: { ...DEFAULT_SCHEDULING_CALENDAR_LABELS.statuses, ...uixLabels.schedulingCalendar?.statuses, ...labelOverrides?.statuses },
  } as Required<SchedulingCalendarLabels> & { statuses: Record<SchedulingStatus, string> };
  const stateLabel = labels.states;
  const viewLabel = { month: labels.viewMonth, week: labels.viewWeek, day: labels.viewDay, agenda: labels.viewAgenda } as const;
  const [internalView, setInternalView] = useState<SchedulingCalendarView>('month');
  const view = controlledView ?? internalView;
  const [activeDate, setActiveDate] = useState(anchorDate);
  const [expandedDates, setExpandedDates] = useState<ReadonlySet<string>>(() => new Set());
  const dateText = (date: string, part: SchedulingDatePart) => formatDate?.(date, part) ?? cachedDateTimeFormat(locale, INTL_PARTS[part]).format(utcDate(date));
  const formatInstant = (instant: string) => formatInstantProp?.(instant) ?? `${dateText(zonedDateKey(instant, timeZone), 'day')} ${zonedTimeOfDay(instant, timeZone)}`;
  const gridRef = useRef<HTMLDivElement>(null);
  // The consumer owns the picks (`dayEntries`), the counts (`days`), or both; the calendar only draws them.
  const picksGiven = dayEntries !== undefined;
  const controlled = picksGiven || dayInfo !== undefined;
  // Every cell keeps one height: nothing in it can grow, because the list is cut and "+N" opens elsewhere.
  const fixed = controlled || (maxEntriesPerDay !== undefined && onShowMore !== undefined);
  // A cell that grows has room for every span. A fixed one keeps two lanes per group unless told otherwise.
  const windowCap = Math.max(0, windowLaneCap ?? (fixed ? DEFAULT_LANE_CAP : Infinity));
  const spanCap = Math.max(0, spanLaneCap ?? (fixed ? DEFAULT_LANE_CAP : Infinity));
  const visibleEntries = useMemo(() => entries.filter((entry) => filter?.(entry) ?? true), [entries, filter]);
  const monthDays = useMemo(() => buildMonthGrid(startOfMonth(anchorDate), weekStartsOn), [anchorDate, weekStartsOn]);
  const weekday = (utcDate(anchorDate).getUTCDay() - weekStartsOn + 7) % 7;
  const weekStart = addCalendarDays(anchorDate, -weekday);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index)), [weekStart]);
  const days = useMemo(() => view === 'month' ? monthDays.map((day) => day.date) : view === 'day' ? [anchorDate] : weekDays, [view, monthDays, weekDays, anchorDate]);
  // The Day view is always a time grid; the Week view is one when the consumer asks.
  const timeGridView = view === 'day' || (view === 'week' && timeGrid);

  // One pass over the entries: single-day ones go to their day (in the order given), the rest are spans.
  const { singles, multiDay, coverage } = useMemo(() => {
    const byDay = new Map<string, SchedulingCalendarEntry[]>();
    const spans: Array<{ entry: SchedulingCalendarEntry; start: string; end: string }> = [];
    const every: Array<{ entry: SchedulingCalendarEntry; start: string; end: string }> = [];
    for (const entry of visibleEntries) {
      const covered = coveredDays(entry.start, entry.end, timeZone);
      every.push({ entry, ...covered });
      if (addCalendarDays(covered.start, 1) === covered.end) {
        const list = byDay.get(covered.start);
        if (list) list.push(entry); else byDay.set(covered.start, [entry]);
      } else spans.push({ entry, ...covered });
    }
    return { singles: byDay, multiDay: spans, coverage: every };
  }, [visibleEntries, timeZone]);
  // Reversed, so that the first of a repeated id is the one found: the same one the layout places.
  const entryById = useMemo(() => new Map([...multiDay].reverse().map(({ entry }) => [entry.id, entry])), [multiDay]);
  const overlayById = useMemo(() => new Map([...overlays].reverse().map((overlay) => [overlay.id, overlay])), [overlays]);
  const layout = useMemo<MonthSpanLayout>(() => {
    if (spanLayout) return spanLayout;
    if (view === 'agenda' || timeGridView) return { placed: [], hiddenByRow: {}, firstHiddenDayByRow: {} };
    const inputs: MonthSpanInput[] = [];
    // An id used twice in a group is drawn once (the first), as a repeated React key would be.
    const windowIds = new Set<string>();
    const itemIds = new Set<string>();
    for (const overlay of overlays) {
      // A window whose end is before its start has no span to draw.
      if (windowIds.has(overlay.id) || !(new Date(overlay.end).getTime() >= new Date(overlay.start).getTime())) continue;
      windowIds.add(overlay.id);
      inputs.push({ id: overlay.id, start: overlay.start, end: overlay.end, group: 'window' });
    }
    for (const { entry } of multiDay) {
      if (itemIds.has(entry.id)) continue;
      itemIds.add(entry.id);
      inputs.push({ id: entry.id, start: entry.start, end: entry.end, group: 'item' });
    }
    return layoutMonthSpans(inputs, days, { timeZone, laneCap: { window: windowCap, item: spanCap } });
  }, [spanLayout, view, timeGridView, overlays, multiDay, days, timeZone, windowCap, spanCap]);
  const placedByRow = useMemo(() => {
    const rows = new Map<number, PlacedMonthSpan[]>();
    for (const placed of layout.placed) { const row = rows.get(placed.weekRow); if (row) row.push(placed); else rows.set(placed.weekRow, [placed]); }
    return rows;
  }, [layout]);
  const lanesUsed = (row: number, group: MonthSpanGroup) => (placedByRow.get(row) ?? []).reduce((max, placed) => placed.group === group ? Math.max(max, placed.lane + 1) : max, 0);
  const lanesUsedAnywhere = (group: MonthSpanGroup) => layout.placed.reduce((max, placed) => placed.group === group ? Math.max(max, placed.lane + 1) : max, 0);

  useEffect(() => {
    if (view !== 'agenda' && !days.includes(activeDate)) setActiveDate(days[0]!);
  }, [activeDate, days, view]);

  const setView = (next: SchedulingCalendarView) => { if (controlledView === undefined) setInternalView(next); onViewChange?.(next); };
  const movePeriod = (direction: -1 | 1) => onAnchorDateChange?.(view === 'month' ? addCalendarMonths(anchorDate, direction) : addCalendarDays(anchorDate, view === 'day' ? direction : direction * 7));
  // An older `previous` / `next` override still names both views until the per-view names are set.
  const periodLabel = (direction: 'previous' | 'next') => {
    const key = `${direction}${view === 'month' ? 'Month' : view === 'day' ? 'Day' : 'Week'}` as 'previousMonth' | 'previousWeek' | 'previousDay' | 'nextMonth' | 'nextWeek' | 'nextDay';
    return overrides[key] ?? overrides[direction] ?? labels[key];
  };
  const focusDate = (date: string) => {
    setActiveDate(date);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${date}"]`)?.focus());
  };
  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (offset) { event.preventDefault(); focusDate(addCalendarDays(date, offset)); }
    else if (event.key === 'Home') { event.preventDefault(); focusDate(days[0]!); }
    else if (event.key === 'End') { event.preventDefault(); focusDate(days[days.length - 1]!); }
  };
  /** Every entry on a day, single-day or not, in the order the consumer gave them. */
  const entriesOn = (date: string) => coverage.filter((covered) => date >= covered.start && date < covered.end).map((covered) => covered.entry);
  const toggleMore = (date: string, all: SchedulingCalendarEntry[]) => {
    if (onShowMore) { onShowMore(date, all); return; }
    setExpandedDates((current) => { const next = new Set(current); if (next.has(date)) next.delete(date); else next.add(date); return next; });
  };

  const statusOf = (entry: SchedulingCalendarEntry): SchedulingStatus => entry.status ?? (entry.state === 'in-progress' ? 'live' : 'committed');
  /** The old `state` values that flagged a problem keep a marker: a shape and the state's word, not a hue. */
  const markersOf = (entry: SchedulingCalendarEntry): SchedulingMarker[] => {
    const flagged = entry.state === 'conflicted' || entry.state === 'blackout-violation';
    return flagged ? [...(entry.markers ?? []), { id: 'state', label: stateLabel[entry.state!], emphasis: 'warning' }] : entry.markers ?? [];
  };
  // An entry with neither `state` nor `status` keeps the word it always had (`states.scheduled`).
  const stateText = (entry: SchedulingCalendarEntry) => entry.state ? stateLabel[entry.state] : entry.status ? labels.statuses[entry.status] : stateLabel.scheduled;
  const entryName = (entry: SchedulingCalendarEntry) => entry.accessibleName
    ?? [fillLabel(labels.entry, { title: entry.title, state: stateText(entry), start: formatInstant(entry.start), end: formatInstant(entry.end) }), ...(entry.markers ?? []).map((marker) => marker.label)].join(', ');
  const overlayName = (overlay: SchedulingCalendarOverlay) => overlay.accessibleName
    ?? fillLabel(labels.overlay, { title: [overlay.kindLabel, overlay.label, overlay.scopeLabel].filter(Boolean).join(', '), start: formatInstant(overlay.start), end: formatInstant(overlay.end) });
  const entryProps = (entry: SchedulingCalendarEntry) => ({
    type: 'button' as const,
    'data-item-id': entry.id,
    'data-band': entry.band ?? 'none',
    'data-status': statusOf(entry),
    'data-state': entry.state,
    onClick: () => onSelectEntry?.(entry),
    'aria-label': entryName(entry),
  });
  const entryContent = (entry: SchedulingCalendarEntry, withTime = true) => {
    const markers = markersOf(entry);
    return <>
      <span className="uix-scheduling-calendar__entry-text">{renderEntry?.(entry) ?? <>{withTime && <><span className="uix-scheduling-calendar__time">{zonedTimeOfDay(entry.start, timeZone)}</span>{' '}</>}<span className="uix-scheduling-calendar__title">{entry.title}</span></>}</span>
      {markers.length > 0 && <span className="uix-scheduling-calendar__markers">{markers.map((marker) => <Marker key={marker.id} marker={marker} />)}</span>}
    </>;
  };
  const laneStyle = (placed: PlacedMonthSpan, windowLanes: number): CSSProperties => ({
    gridColumn: `${placed.startCol + 1} / ${placed.endCol + 2}`,
    ['--uix-scheduling-calendar-lane' as string]: placed.group === 'window' ? placed.lane : windowLanes + placed.lane,
  });

  const nothingToShow = visibleEntries.length === 0
    && !Object.values(dayEntries ?? {}).some((list) => list.length > 0)
    && !Object.values(dayInfo ?? {}).some((day) => day.count > 0);
  // A fixed cell holds `maxEntriesPerDay` chips; if the consumer passes a longer list, the cell holds that, so nothing is clipped.
  // The counts-only month has no chip rows at all: a cell is its head and the window lanes.
  const countsOnly = monthDensity === 'counts' && view === 'month';
  const chipRows = countsOnly ? -1 : Math.max(0, maxEntriesPerDay ?? DEFAULT_CHIP_ROWS, ...Object.values(dayEntries ?? {}).map((list) => list.length));

  const renderDay = (date: string, index: number) => {
    const info = dayInfo?.[date];
    // With `dayEntries` the chips are the consumer's picks, uncut. Without, they are this day's entries, cut to `maxEntriesPerDay`.
    const all = picksGiven ? dayEntries[date] ?? EMPTY_ENTRIES : singles.get(date) ?? EMPTY_ENTRIES;
    const overflowing = !picksGiven && maxEntriesPerDay !== undefined && all.length > maxEntriesPerDay;
    const collapsed = overflowing && (controlled || onShowMore !== undefined || !expandedDates.has(date));
    const shown = countsOnly ? EMPTY_ENTRIES : collapsed ? all.slice(0, Math.max(0, maxEntriesPerDay!)) : all;
    // A consumer count always wins; without one the number is what this cell could not show.
    const hiddenCount = info ? info.overflowCount : picksGiven ? 0 : all.length - shown.length;
    const onDay = picksGiven ? all : entriesOn(date);
    const badge = renderDayBadge?.(date, onDay);
    const hasBadge = badge != null && badge !== false;
    const dateButton = <button type="button" className="uix-scheduling-calendar__date" data-calendar-date={date} tabIndex={activeDate === date ? 0 : -1} onFocus={() => setActiveDate(date)} onKeyDown={(event) => onDayKeyDown(event, date)} onClick={onSelectDate ? () => onSelectDate(date) : undefined} aria-label={dateText(date, 'day')}>{Number(date.slice(-2))}</button>;
    const moreText = fillLabel(labels.moreEntries, { count: hiddenCount });
    const moreName = fillLabel(labels.moreEntriesLabel, { count: hiddenCount, date: dateText(date, 'day') });
    return <div key={date} className="uix-scheduling-calendar__day" data-outside={view === 'month' && !monthDays[index]!.inMonth || undefined}>
      {hasBadge || info ? <div className="uix-scheduling-calendar__dayhead">
        {hasBadge && <span className="uix-scheduling-calendar__badge">{badge}</span>}
        {info && <span className="uix-scheduling-calendar__count"><span aria-hidden="true">{info.count}</span><span className="uix-visually-hidden">{info.label ?? fillLabel(labels.dayCount, { count: info.count })}</span></span>}
        {info?.markers && info.markers.length > 0 && <span className="uix-scheduling-calendar__markers">{info.markers.map((marker) => <Marker key={marker.id} marker={marker} />)}</span>}
        {dateButton}
      </div> : dateButton}
      <div className="uix-scheduling-calendar__entries">
        {shown.map((entry) => <button key={entry.id} className="uix-scheduling-calendar__entry" {...entryProps(entry)}>{entryContent(entry)}</button>)}
        {countsOnly ? null : controlled
          ? hiddenCount > 0 && (onShowMore
            ? <button type="button" className="uix-scheduling-calendar__more" aria-label={moreName} onClick={() => onShowMore(date, onDay)}>{moreText}</button>
            : <span className="uix-scheduling-calendar__more"><span aria-hidden="true">{moreText}</span><span className="uix-visually-hidden">{moreName}</span></span>)
          : overflowing && <button type="button" className="uix-scheduling-calendar__more" aria-expanded={onShowMore ? undefined : !collapsed} aria-label={collapsed ? moreName : undefined} onClick={() => toggleMore(date, onDay)}>{collapsed ? moreText : labels.fewerEntries}</button>}
      </div>
    </div>;
  };

  const renderWeek = (row: number) => {
    const rowDays = days.slice(row * 7, row * 7 + 7);
    // The chips of a row start right under the lanes that row uses.
    const windowLanes = lanesUsed(row, 'window');
    const spanLanes = countsOnly ? 0 : lanesUsed(row, 'item');
    const hidden = layout.hiddenByRow?.[row]?.length ?? 0;
    const firstHiddenDay = layout.firstHiddenDayByRow?.[row] ?? rowDays[0]!;
    const moreText = fillLabel(labels.moreSpans, { count: hidden });
    const moreName = fillLabel(labels.moreSpansLabel, { count: hidden, date: dateText(firstHiddenDay, 'day') });
    // A row whose spans are all hidden (a cap of 0) still keeps one lane, for its "+N".
    const style = { ['--uix-scheduling-calendar-lanes' as string]: Math.max(windowLanes + spanLanes, hidden > 0 ? 1 : 0) } as CSSProperties;
    return <div key={rowDays[0]} className="uix-scheduling-calendar__week" style={style}>
      {rowDays.map((date, column) => renderDay(date, row * 7 + column))}
      {(placedByRow.get(row) ?? []).map((placed) => {
        const continues = { 'data-continues-before': placed.continuesBefore || undefined, 'data-continues-after': placed.continuesAfter || undefined };
        if (placed.group === 'window') {
          const overlay = overlayById.get(placed.id);
          if (!overlay) return null;
          return <button key={`window-${placed.id}`} type="button" className="uix-scheduling-calendar__window" data-overlay-id={overlay.id} data-pattern={overlay.pattern ?? 'solid'} data-global={overlay.global || undefined} data-kind={overlay.kind} {...continues} style={laneStyle(placed, windowLanes)} onClick={() => onSelectOverlay?.(overlay)} aria-label={overlayName(overlay)}>
            <span className="uix-scheduling-calendar__window-text">
              {overlay.kindLabel && <span className="uix-scheduling-calendar__window-kind">{overlay.kindLabel}</span>}
              <span className="uix-scheduling-calendar__window-name">{overlay.label}</span>
              {overlay.scopeLabel && <span className="uix-scheduling-calendar__window-scope">{overlay.scopeLabel}</span>}
            </span>
          </button>;
        }
        const entry = entryById.get(placed.id);
        if (!entry || countsOnly) return null;
        return <button key={`span-${placed.id}`} className="uix-scheduling-calendar__entry uix-scheduling-calendar__span" {...entryProps(entry)} {...continues} style={laneStyle(placed, windowLanes)}>{entryContent(entry, !placed.continuesBefore)}</button>;
      })}
      {hidden > 0 && (onShowMore
        ? <button type="button" className="uix-scheduling-calendar__rowmore" aria-label={moreName} onClick={() => onShowMore(firstHiddenDay, picksGiven ? dayEntries[firstHiddenDay] ?? EMPTY_ENTRIES : entriesOn(firstHiddenDay))}>{moreText}</button>
        : <span className="uix-scheduling-calendar__rowmore"><span aria-hidden="true">{moreText}</span><span className="uix-visually-hidden">{moreName}</span></span>)}
    </div>;
  };

  // A fixed cell is as tall as the head, every lane a row may use, the chip rows and the "+N" line.
  const gridStyle = fixed ? {
    ['--uix-scheduling-calendar-chips' as string]: chipRows,
    ['--uix-scheduling-calendar-lane-cap' as string]: Math.max(
      Math.max(Number.isFinite(windowCap) ? windowCap : 0, lanesUsedAnywhere('window')) + (countsOnly ? 0 : Math.max(Number.isFinite(spanCap) ? spanCap : 0, lanesUsedAnywhere('item'))),
      Object.keys(layout.hiddenByRow ?? {}).length > 0 ? 1 : 0,
    ),
  } as CSSProperties : undefined;

  return <section className={cx('uix-scheduling-calendar', className)} aria-label={fillLabel(labels.region, { timeZone })}>
    {showHeader && <div className="uix-scheduling-calendar__header">
      <div><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => movePeriod(-1)} disabled={!onAnchorDateChange}>{periodLabel('previous')}</button><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => movePeriod(1)} disabled={!onAnchorDateChange}>{periodLabel('next')}</button></div>
      <strong>{view === 'month' ? dateText(startOfMonth(anchorDate), 'month') : view === 'day' ? dateText(anchorDate, 'day') : `${dateText(weekStart, 'day')} – ${dateText(weekDays[weekDays.length - 1]!, 'day')}`}</strong>
      <div className="uix-segmented" role="group" aria-label={labels.viewGroup}>{(timeGrid || view === 'day' ? ['month', 'week', 'day', 'agenda'] as const : ['month', 'week', 'agenda'] as const).map((option) => <button key={option} type="button" className="uix-segmented__option" aria-pressed={view === option} data-selected={view === option || undefined} onClick={() => setView(option)}>{viewLabel[option]}</button>)}</div>
    </div>}
    {notice != null && notice !== false && <div className="uix-scheduling-calendar__notice">{notice}</div>}
    {loading ? <div className="uix-scheduling-calendar__state" role="status">{labels.loading}</div>
      : error ? <div className="uix-scheduling-calendar__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>{labels.retry}</button>}</div>
      : view === 'agenda' && agendaGroups ? <SchedulingAgenda
        groups={agendaGroups} timeZone={timeZone} labels={labels} headingLevel={agendaHeadingLevel} virtualizeAbove={virtualizeAbove} dateText={dateText}
        entryName={entryName} entryStatus={statusOf} entryStatusText={stateText} entryMarkers={markersOf} overlayName={overlayName}
        renderEntry={renderEntry} renderMarker={renderMarker} onSelectEntry={onSelectEntry} onSelectOverlay={onSelectOverlay} onShowMore={onShowMore}
      />
      : view === 'agenda' ? <div className="uix-scheduling-calendar__agenda" role="region" aria-label={labels.agenda}>{visibleEntries.length === 0 ? <p>{labels.agendaEmpty}</p> : <ol>{[...visibleEntries].sort((a, b) => a.start.localeCompare(b.start)).map((entry) => {
        const markers = markersOf(entry);
        return <li key={entry.id}><button type="button" data-item-id={entry.id} data-band={entry.band ?? 'none'} data-status={statusOf(entry)} data-state={entry.state} onClick={() => onSelectEntry?.(entry)}><span><strong>{renderEntry?.(entry) ?? entry.title}</strong><span>{formatInstant(entry.start)} – {formatInstant(entry.end)}</span>{entry.meta && <span>{entry.meta}</span>}</span>{markers.length > 0 && <span className="uix-scheduling-calendar__markers">{markers.map((marker) => <Marker key={marker.id} marker={marker} />)}</span>}{entry.state ? <StatusPill tone={stateTone(entry.state)}>{stateLabel[entry.state]}</StatusPill> : <span className="uix-scheduling-calendar__status">{stateText(entry)}</span>}</button></li>;
      })}</ol>}</div>
      : timeGridView ? <SchedulingTimeGrid
        view={view === 'day' ? 'day' : 'week'} days={days} timeZone={timeZone} entries={visibleEntries} overlays={overlays} dayInfo={dayInfo}
        labels={labels} gridLabel={fillLabel(labels.grid, { view: viewLabel[view] })} dateText={dateText} formatInstant={formatInstant}
        entryName={entryName} entryStatus={statusOf} entryMarkers={markersOf} overlayName={overlayName} renderEntry={renderEntry} renderMarker={renderMarker}
        onSelectEntry={onSelectEntry} onSelectOverlay={onSelectOverlay} onSelectDate={onSelectDate} onShowMore={onShowMore}
        now={now} canMove={canMove} step={step} onProposeMove={onProposeMove}
        topLaneCrossMidnightMinutes={topLaneCrossMidnightMinutes} topLaneCap={topLaneCap} windowLaneCap={windowLaneCap ?? DEFAULT_LANE_CAP} maxLanes={maxLanes}
        emptyNote={emptyNote} nothingToShow={nothingToShow}
      />
      : <div ref={gridRef} className={cx('uix-scheduling-calendar__grid', view === 'week' && 'uix-scheduling-calendar__grid--week')} data-fixed={fixed || undefined} data-density={countsOnly ? 'counts' : undefined} style={gridStyle} role="group" aria-label={fillLabel(labels.grid, { view: viewLabel[view] })}>
        {days.slice(0, 7).map((date) => <div key={`weekday-${date}`} className="uix-scheduling-calendar__weekday" aria-hidden="true">{dateText(date, 'weekday')}</div>)}
        {Array.from({ length: days.length / 7 }, (_, row) => renderWeek(row))}
        {emptyNote != null && emptyNote !== false && nothingToShow && <div className="uix-scheduling-calendar__empty">{emptyNote}</div>}
      </div>}
    {legend
      // An empty legend is no legend: the consumer has nothing on screen to explain.
      ? (legend.length > 0 || (legendCaption != null && legendCaption !== false)) && <div className="uix-scheduling-calendar__legend" role="group" aria-label={labels.legend}>
        {legend.length > 0 && <ul className="uix-scheduling-calendar__legend-list">{legend.map((item) => <li key={item.id} data-legend-id={item.id}><span className="uix-scheduling-calendar__swatch" aria-hidden="true" data-band={item.swatch.band} data-status={item.swatch.status} data-pattern={item.swatch.pattern}>{item.swatch.icon}</span>{item.label}</li>)}</ul>}
        {legendCaption != null && legendCaption !== false && <p className="uix-scheduling-calendar__legend-caption">{legendCaption}</p>}
      </div>
      : <div className="uix-scheduling-calendar__legend" role="group" aria-label={labels.legend}>
        {(['scheduled', 'conflicted', 'in-progress', 'blackout-violation'] as const).map((state) => <span key={state} data-state={state}>{stateLabel[state]}</span>)}
        {legendCaption != null && legendCaption !== false && <p className="uix-scheduling-calendar__legend-caption">{legendCaption}</p>}
      </div>}
  </section>;
}
