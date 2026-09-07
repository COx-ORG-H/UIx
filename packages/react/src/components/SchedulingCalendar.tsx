"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { addCalendarDays, addCalendarMonths, buildMonthGrid, startOfMonth, zonedDateSpan } from '../calendar-model.js';
import { cx } from '../cx.js';
import { StatusPill } from './StatusPill.js';

export type SchedulingCalendarView = 'month' | 'week' | 'agenda';
export type SchedulingEntryState = 'scheduled' | 'conflicted' | 'in-progress' | 'blackout-violation';
export type SchedulingOverlayKind = 'maintenance' | 'blackout';

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
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

const stateLabel: Record<SchedulingEntryState, string> = { scheduled: 'Scheduled', conflicted: 'Conflicted', 'in-progress': 'In progress', 'blackout-violation': 'Blackout violation' };
const stateTone = (state: SchedulingEntryState) => state === 'scheduled' ? 'info' : state === 'in-progress' ? 'success' : 'danger';
const dateLabel = (date: string, locale?: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const EMPTY_OVERLAYS: SchedulingCalendarOverlay[] = [];

/** Month/week/agenda calendar for UTC ranges rendered in an explicit IANA time zone. */
export function SchedulingCalendar({
  entries, anchorDate, timeZone, view: controlledView, onViewChange, onAnchorDateChange,
  onSelectEntry, overlays = EMPTY_OVERLAYS, filter, renderEntry, locale, loading, error, onRetry, className,
}: SchedulingCalendarProps) {
  const [internalView, setInternalView] = useState<SchedulingCalendarView>('month');
  const view = controlledView ?? internalView;
  const [activeDate, setActiveDate] = useState(anchorDate);
  const gridRef = useRef<HTMLDivElement>(null);
  const visibleEntries = useMemo(() => entries.filter((entry) => filter?.(entry) ?? true), [entries, filter]);
  const entrySpans = useMemo(() => new Map(visibleEntries.map((entry) => [entry.id, zonedDateSpan(entry.start, entry.end, timeZone)])), [visibleEntries, timeZone]);
  const overlaySpans = useMemo(() => new Map(overlays.map((overlay) => [overlay.id, { start: overlay.start.slice(0, 10), end: overlay.end.slice(0, 10) }])), [overlays]);
  const monthDays = useMemo(() => buildMonthGrid(startOfMonth(anchorDate)), [anchorDate]);
  const weekday = (new Date(`${anchorDate}T00:00:00Z`).getUTCDay() + 6) % 7;
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
  const formatInstant = (instant: string) => new Intl.DateTimeFormat(locale, { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));

  return <section className={cx('uix-scheduling-calendar', className)} aria-label={`Scheduling calendar in ${timeZone}`}>
    <div className="uix-scheduling-calendar__header">
      <div><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => movePeriod(-1)} disabled={!onAnchorDateChange}>Previous</button><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => movePeriod(1)} disabled={!onAnchorDateChange}>Next</button></div>
      <strong>{view === 'month' ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${anchorDate}T00:00:00Z`)) : `${dateLabel(weekStart, locale)} – ${dateLabel(weekDays[weekDays.length - 1]!, locale)}`}</strong>
      <div className="uix-segmented" role="group" aria-label="Calendar view">{(['month', 'week', 'agenda'] as const).map((option) => <button key={option} type="button" className="uix-segmented__option" aria-pressed={view === option} data-selected={view === option || undefined} onClick={() => setView(option)}>{option[0]!.toUpperCase()}{option.slice(1)}</button>)}</div>
    </div>
    {loading ? <div className="uix-scheduling-calendar__state" role="status">Loading schedule…</div>
      : error ? <div className="uix-scheduling-calendar__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>Try again</button>}</div>
      : view === 'agenda' ? <div className="uix-scheduling-calendar__agenda" role="region" aria-label="Schedule agenda">{visibleEntries.length === 0 ? <p>No scheduled entries match the current filters.</p> : <ol>{[...visibleEntries].sort((a, b) => a.start.localeCompare(b.start)).map((entry) => { const state = entry.state ?? 'scheduled'; return <li key={entry.id}><button type="button" onClick={() => onSelectEntry?.(entry)}><span><strong>{renderEntry?.(entry) ?? entry.title}</strong><span>{formatInstant(entry.start)} – {formatInstant(entry.end)}</span>{entry.meta && <span>{entry.meta}</span>}</span><StatusPill tone={stateTone(state)}>{stateLabel[state]}</StatusPill></button></li>; })}</ol>}</div>
      : <div ref={gridRef} className={cx('uix-scheduling-calendar__grid', view === 'week' && 'uix-scheduling-calendar__grid--week')} role="group" aria-label={`${view} schedule`}>
        {days.map((date, index) => {
          const dayEntries = entriesFor(date);
          const dayOverlays = overlaysFor(date);
          return <div key={date} className="uix-scheduling-calendar__day" data-outside={view === 'month' && !monthDays[index]!.inMonth || undefined}>
            <button type="button" className="uix-scheduling-calendar__date" data-calendar-date={date} tabIndex={activeDate === date ? 0 : -1} onFocus={() => setActiveDate(date)} onKeyDown={(event) => onDayKeyDown(event, date)} aria-label={dateLabel(date, locale)}>{Number(date.slice(-2))}</button>
            {dayOverlays.map((overlay) => <span key={overlay.id} className="uix-scheduling-calendar__overlay" data-kind={overlay.kind}>{overlay.label}</span>)}
            <div className="uix-scheduling-calendar__entries">{dayEntries.map((entry) => {
              const span = entrySpans.get(entry.id)!;
              const state = entry.state ?? 'scheduled';
              return <button key={entry.id} type="button" className="uix-scheduling-calendar__entry" data-state={state} data-range-start={date === span.start || undefined} data-range-end={date === span.end || undefined} onClick={() => onSelectEntry?.(entry)} aria-label={`${entry.title}, ${stateLabel[state]}, ${formatInstant(entry.start)} to ${formatInstant(entry.end)}`}><span>{renderEntry?.(entry) ?? entry.title}</span><span className="uix-visually-hidden">{stateLabel[state]}</span></button>;
            })}</div>
          </div>;
        })}
      </div>}
    <div className="uix-scheduling-calendar__legend" aria-label="Schedule state legend">{(['scheduled', 'conflicted', 'in-progress', 'blackout-violation'] as const).map((state) => <span key={state} data-state={state}>{stateLabel[state]}</span>)}</div>
  </section>;
}
