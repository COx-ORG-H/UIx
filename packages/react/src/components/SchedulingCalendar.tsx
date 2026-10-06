"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { addCalendarDays, addCalendarMonths, buildMonthGrid, startOfMonth, zonedDateSpan } from '../calendar-model.js';
import type { CalendarWeekday } from '../calendar-model.js';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { StatusPill } from './StatusPill.js';
import { fillLabel } from '../fill-label.js';

export type SchedulingCalendarView = 'month' | 'week' | 'agenda';
export type SchedulingEntryState = 'scheduled' | 'conflicted' | 'in-progress' | 'blackout-violation';
export type SchedulingOverlayKind = 'maintenance' | 'blackout';
/**
 * Which date text a `formatDate` call is for (TENSOR B1/C9, HAR-1347):
 * `day` names one day (each day cell's accessible name, the week-range title);
 * `weekday` is the short column header (the date is any day of that weekday);
 * `month` is the month-view title (the date is the first of the month).
 */
export type SchedulingDatePart = 'day' | 'weekday' | 'month';

export interface SchedulingCalendarEntry {
  id: string;
  title: string;
  start: string;
  end: string;
  state?: SchedulingEntryState;
  meta?: string;
}

export interface SchedulingCalendarOverlay {
  id: string;
  label: string;
  start: string;
  end: string;
  kind: SchedulingOverlayKind;
}

/**
 * Every word the calendar renders (TENSOR RX-125, UIX-12). `{timeZone}`, `{view}`,
 * `{title}`, `{state}`, `{start}`, `{end}` are placeholders.
 */
export interface SchedulingCalendarLabels {
  region: string;
  previous: string;
  next: string;
  viewGroup: string;
  viewMonth: string;
  viewWeek: string;
  viewAgenda: string;
  loading: string;
  retry: string;
  agenda: string;
  agendaEmpty: string;
  grid: string;
  entry: string;
  legend: string;
  /** The "+N more" toggle on a day with more entries than `maxEntriesPerDay`. `{count}` placeholder. */
  moreEntries: string;
  /** Accessible name of that toggle. `{count}` and `{date}` placeholders. */
  moreEntriesLabel: string;
  /** The toggle once the day is expanded in place. */
  fewerEntries: string;
  states: Record<SchedulingEntryState, string>;
}

export const DEFAULT_SCHEDULING_CALENDAR_LABELS: SchedulingCalendarLabels = {
  region: 'Scheduling calendar in {timeZone}',
  previous: 'Previous',
  next: 'Next',
  viewGroup: 'Calendar view',
  viewMonth: 'Month',
  viewWeek: 'Week',
  viewAgenda: 'Agenda',
  loading: 'Loading schedule…',
  retry: 'Try again',
  agenda: 'Schedule agenda',
  agendaEmpty: 'No scheduled entries match the current filters.',
  grid: '{view} schedule',
  entry: '{title}, {state}, {start} to {end}',
  legend: 'Schedule state legend',
  moreEntries: '+{count} more',
  moreEntriesLabel: '{count} more entries on {date}',
  fewerEntries: 'Show fewer',
  states: { scheduled: 'Scheduled', conflicted: 'Conflicted', 'in-progress': 'In progress', 'blackout-violation': 'Blackout violation' },
};

export interface SchedulingCalendarProps {
  entries: SchedulingCalendarEntry[];
  anchorDate: string;
  timeZone: string;
  view?: SchedulingCalendarView;
  onViewChange?: (view: SchedulingCalendarView) => void;
  onAnchorDateChange?: (date: string) => void;
  onSelectEntry?: (entry: SchedulingCalendarEntry) => void;
  overlays?: SchedulingCalendarOverlay[];
  filter?: (entry: SchedulingCalendarEntry) => boolean;
  renderEntry?: (entry: SchedulingCalendarEntry) => ReactNode;
  locale?: string;
  /** First column of the month and week grids: 0 = Sunday … 6 = Saturday. Defaults to 1 (Monday). */
  weekStartsOn?: CalendarWeekday;
  /**
   * Formats every calendar date the component writes (`date` is `YYYY-MM-DD`). Use it to
   * apply a product date format such as DD.MM.YYYY; defaults to `Intl` in `locale`.
   */
  formatDate?: (date: string, part: SchedulingDatePart) => string;
  /**
   * Formats an entry's start or end instant (ISO 8601) for the agenda and the entry names.
   * The component does not shift it: render it in `timeZone` yourself. Defaults to `Intl`
   * medium date + short time in `timeZone`.
   */
  formatInstant?: (instant: string) => string;
  /**
   * Show at most this many entries in a month or week day; the rest collapse behind a
   * "+N more" toggle. Unset shows every entry.
   */
  maxEntriesPerDay?: number;
  /**
   * Called by the "+N more" toggle with the day and every entry on it. When set, the
   * consumer shows them (a popover, a drawer, the day view) and the day stays collapsed;
   * otherwise the day expands in place.
   */
  onShowMore?: (date: string, entries: SchedulingCalendarEntry[]) => void;
  /**
   * A small badge beside a day's date, e.g. a collision count. Keep it short (a number or a
   * glyph): it shares a narrow column with the date and is clipped, not wrapped. It sits
   * outside the date button, so give it its own accessible text (a visually hidden word next
   * to the number). Return null for no badge.
   */
  renderDayBadge?: (date: string, entries: SchedulingCalendarEntry[]) => ReactNode;
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
};
const intlDate = (date: string, part: SchedulingDatePart, locale?: string) => new Intl.DateTimeFormat(locale, INTL_PARTS[part]).format(utcDate(date));
const EMPTY_OVERLAYS: SchedulingCalendarOverlay[] = [];

/** Month/week/agenda calendar for UTC ranges rendered in an explicit IANA time zone. */
export function SchedulingCalendar({
  entries, anchorDate, timeZone, view: controlledView, onViewChange, onAnchorDateChange,
  onSelectEntry, overlays = EMPTY_OVERLAYS, filter, renderEntry, locale, weekStartsOn = 1, formatDate, formatInstant: formatInstantProp,
  maxEntriesPerDay, onShowMore, renderDayBadge, loading, error, onRetry, className, labels: labelOverrides,
}: SchedulingCalendarProps) {
  const uixLabels = useUixLabels();
  const labels: SchedulingCalendarLabels = {
    ...DEFAULT_SCHEDULING_CALENDAR_LABELS,
    ...uixLabels.schedulingCalendar,
    ...labelOverrides,
    states: { ...DEFAULT_SCHEDULING_CALENDAR_LABELS.states, ...uixLabels.schedulingCalendar?.states, ...labelOverrides?.states },
  };
  const stateLabel = labels.states;
  const viewLabel = { month: labels.viewMonth, week: labels.viewWeek, agenda: labels.viewAgenda } as const;
  const [internalView, setInternalView] = useState<SchedulingCalendarView>('month');
  const view = controlledView ?? internalView;
  const [activeDate, setActiveDate] = useState(anchorDate);
  const [expandedDates, setExpandedDates] = useState<ReadonlySet<string>>(() => new Set());
  const dateText = (date: string, part: SchedulingDatePart) => formatDate?.(date, part) ?? intlDate(date, part, locale);
  const gridRef = useRef<HTMLDivElement>(null);
  const visibleEntries = useMemo(() => entries.filter((entry) => filter?.(entry) ?? true), [entries, filter]);
  const entrySpans = useMemo(() => new Map(visibleEntries.map((entry) => [entry.id, zonedDateSpan(entry.start, entry.end, timeZone)])), [visibleEntries, timeZone]);
  const overlaySpans = useMemo(() => new Map(overlays.map((overlay) => [overlay.id, { start: overlay.start.slice(0, 10), end: overlay.end.slice(0, 10) }])), [overlays]);
  const monthDays = useMemo(() => buildMonthGrid(startOfMonth(anchorDate), weekStartsOn), [anchorDate, weekStartsOn]);
  const weekday = (utcDate(anchorDate).getUTCDay() - weekStartsOn + 7) % 7;
  const weekStart = addCalendarDays(anchorDate, -weekday);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index)), [weekStart]);
  const days = useMemo(() => view === 'month' ? monthDays.map((day) => day.date) : weekDays, [view, monthDays, weekDays]);

  useEffect(() => {
    if (view !== 'agenda' && !days.includes(activeDate)) setActiveDate(days[0]!);
  }, [activeDate, days, view]);

  const setView = (next: SchedulingCalendarView) => { if (controlledView === undefined) setInternalView(next); onViewChange?.(next); };
  const movePeriod = (direction: -1 | 1) => onAnchorDateChange?.(view === 'month' ? addCalendarMonths(anchorDate, direction) : addCalendarDays(anchorDate, direction * 7));
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
  const entriesFor = (date: string) => visibleEntries.filter((entry) => { const span = entrySpans.get(entry.id)!; return date >= span.start && date <= span.end; });
  const overlaysFor = (date: string) => overlays.filter((overlay) => { const span = overlaySpans.get(overlay.id)!; return date >= span.start && date <= span.end; });
  const formatInstant = (instant: string) => formatInstantProp?.(instant) ?? new Intl.DateTimeFormat(locale, { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));
  const toggleMore = (date: string, dayEntries: SchedulingCalendarEntry[]) => {
    if (onShowMore) { onShowMore(date, dayEntries); return; }
    setExpandedDates((current) => { const next = new Set(current); if (next.has(date)) next.delete(date); else next.add(date); return next; });
  };

  return <section className={cx('uix-scheduling-calendar', className)} aria-label={fillLabel(labels.region, { timeZone })}>
    <div className="uix-scheduling-calendar__header">
      <div><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => movePeriod(-1)} disabled={!onAnchorDateChange}>{labels.previous}</button><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => movePeriod(1)} disabled={!onAnchorDateChange}>{labels.next}</button></div>
      <strong>{view === 'month' ? dateText(startOfMonth(anchorDate), 'month') : `${dateText(weekStart, 'day')} – ${dateText(weekDays[weekDays.length - 1]!, 'day')}`}</strong>
      <div className="uix-segmented" role="group" aria-label={labels.viewGroup}>{(['month', 'week', 'agenda'] as const).map((option) => <button key={option} type="button" className="uix-segmented__option" aria-pressed={view === option} data-selected={view === option || undefined} onClick={() => setView(option)}>{viewLabel[option]}</button>)}</div>
    </div>
    {loading ? <div className="uix-scheduling-calendar__state" role="status">{labels.loading}</div>
      : error ? <div className="uix-scheduling-calendar__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>{labels.retry}</button>}</div>
      : view === 'agenda' ? <div className="uix-scheduling-calendar__agenda" role="region" aria-label={labels.agenda}>{visibleEntries.length === 0 ? <p>{labels.agendaEmpty}</p> : <ol>{[...visibleEntries].sort((a, b) => a.start.localeCompare(b.start)).map((entry) => { const state = entry.state ?? 'scheduled'; return <li key={entry.id}><button type="button" onClick={() => onSelectEntry?.(entry)}><span><strong>{renderEntry?.(entry) ?? entry.title}</strong><span>{formatInstant(entry.start)} – {formatInstant(entry.end)}</span>{entry.meta && <span>{entry.meta}</span>}</span><StatusPill tone={stateTone(state)}>{stateLabel[state]}</StatusPill></button></li>; })}</ol>}</div>
      : <div ref={gridRef} className={cx('uix-scheduling-calendar__grid', view === 'week' && 'uix-scheduling-calendar__grid--week')} role="group" aria-label={fillLabel(labels.grid, { view: viewLabel[view] })}>
        {days.slice(0, 7).map((date) => <div key={`weekday-${date}`} className="uix-scheduling-calendar__weekday" aria-hidden="true">{dateText(date, 'weekday')}</div>)}
        {days.map((date, index) => {
          const dayEntries = entriesFor(date);
          const dayOverlays = overlaysFor(date);
          const overflowing = maxEntriesPerDay !== undefined && dayEntries.length > maxEntriesPerDay;
          const collapsed = overflowing && (onShowMore !== undefined || !expandedDates.has(date));
          const shownEntries = collapsed ? dayEntries.slice(0, Math.max(0, maxEntriesPerDay)) : dayEntries;
          const hiddenCount = dayEntries.length - shownEntries.length;
          const badge = renderDayBadge?.(date, dayEntries);
          const dateButton = <button type="button" className="uix-scheduling-calendar__date" data-calendar-date={date} tabIndex={activeDate === date ? 0 : -1} onFocus={() => setActiveDate(date)} onKeyDown={(event) => onDayKeyDown(event, date)} aria-label={dateText(date, 'day')}>{Number(date.slice(-2))}</button>;
          return <div key={date} className="uix-scheduling-calendar__day" data-outside={view === 'month' && !monthDays[index]!.inMonth || undefined}>
            {badge == null || badge === false ? dateButton : <div className="uix-scheduling-calendar__dayhead"><span className="uix-scheduling-calendar__badge">{badge}</span>{dateButton}</div>}
            {dayOverlays.map((overlay) => <span key={overlay.id} className="uix-scheduling-calendar__overlay" data-kind={overlay.kind}>{overlay.label}</span>)}
            <div className="uix-scheduling-calendar__entries">{shownEntries.map((entry) => {
              const span = entrySpans.get(entry.id)!;
              const state = entry.state ?? 'scheduled';
              return <button key={entry.id} type="button" className="uix-scheduling-calendar__entry" data-state={state} data-range-start={date === span.start || undefined} data-range-end={date === span.end || undefined} onClick={() => onSelectEntry?.(entry)} aria-label={fillLabel(labels.entry, { title: entry.title, state: stateLabel[state], start: formatInstant(entry.start), end: formatInstant(entry.end) })}><span>{renderEntry?.(entry) ?? entry.title}</span><span className="uix-visually-hidden">{stateLabel[state]}</span></button>;
            })}
              {overflowing && <button type="button" className="uix-scheduling-calendar__more" aria-expanded={onShowMore ? undefined : !collapsed} aria-label={collapsed ? fillLabel(labels.moreEntriesLabel, { count: hiddenCount, date: dateText(date, 'day') }) : undefined} onClick={() => toggleMore(date, dayEntries)}>{collapsed ? fillLabel(labels.moreEntries, { count: hiddenCount }) : labels.fewerEntries}</button>}
            </div>
          </div>;
        })}
      </div>}
    <div className="uix-scheduling-calendar__legend" aria-label={labels.legend}>{(['scheduled', 'conflicted', 'in-progress', 'blackout-violation'] as const).map((state) => <span key={state} data-state={state}>{stateLabel[state]}</span>)}</div>
  </section>;
}
