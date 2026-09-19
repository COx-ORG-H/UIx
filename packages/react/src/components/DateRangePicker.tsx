"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { addCalendarDays, addCalendarMonths, buildMonthGrid, isDateInRange, isDateUnavailable, selectRangeDate, startOfMonth } from '../calendar-model.js';
import type { DateRangeValue } from '../calendar-model.js';
import { cx } from '../cx.js';

/**
 * Every word the picker renders or announces (TENSOR RX-125, UIX-13). `{start}` and
 * `{end}` are replaced with the locale-formatted dates.
 */
export interface DateRangePickerLabels {
  previous: string;
  previousMonth: string;
  next: string;
  nextMonth: string;
  noneSelected: string;
  startSelected: string;
  rangeSelected: string;
  rangeStart: string;
  rangeEnd: string;
  inRange: string;
}

export const DEFAULT_DATE_RANGE_PICKER_LABELS: DateRangePickerLabels = {
  previous: 'Previous',
  previousMonth: 'Show previous month',
  next: 'Next',
  nextMonth: 'Show next month',
  noneSelected: 'No date range selected.',
  startSelected: 'Start date {start} selected. Choose an end date.',
  rangeSelected: '{start} to {end} selected.',
  rangeStart: 'start of selected range',
  rangeEnd: 'end of selected range',
  inRange: 'in selected range',
};

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  visibleMonth?: string;
  onVisibleMonthChange?: (month: string) => void;
  months?: number;
  min?: string;
  max?: string;
  isDateDisabled?: (date: string) => boolean;
  locale?: string;
  label?: string;
  invalid?: boolean;
  invalidMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Translatable words; English defaults in {@link DEFAULT_DATE_RANGE_PICKER_LABELS}. */
  labels?: Partial<DateRangePickerLabels>;
}

const monthLabel = (date: string, locale?: string) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const dateLabel = (date: string, locale?: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

/**
 * Monday-first short weekday names in `locale` (the grid is Monday-first). 2024-01-01 is
 * a Monday; formatting in UTC keeps each reference day on its own date. UIX-13: these
 * were English literals while the month names were already localised.
 */
const weekdayNames = (locale?: string) => {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
};

/** Controlled, two-month range picker using the UIx calendar language. */
export function DateRangePicker({
  value, onChange, visibleMonth: controlledMonth, onVisibleMonthChange, months = 2,
  min, max, isDateDisabled, locale, label = 'Choose date range', invalid,
  invalidMessage = 'The selected date range is invalid.', disabled, className, labels: labelOverrides,
}: DateRangePickerProps) {
  const id = useId();
  const labels: DateRangePickerLabels = { ...DEFAULT_DATE_RANGE_PICKER_LABELS, ...labelOverrides };
  const weekdays = useMemo(() => weekdayNames(locale), [locale]);
  const [internalMonth, setInternalMonth] = useState(() => startOfMonth(controlledMonth ?? value.start ?? new Date().toISOString().slice(0, 10)));
  const visibleMonth = startOfMonth(controlledMonth ?? internalMonth);
  const [activeDate, setActiveDate] = useState(value.end ?? value.start ?? visibleMonth);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const count = Math.max(1, Math.min(3, months));
  const calendars = useMemo(() => Array.from({ length: count }, (_, index) => {
    const month = startOfMonth(addCalendarMonths(visibleMonth, index));
    return { month, days: buildMonthGrid(month).filter((day) => day.inMonth) };
  }), [visibleMonth, count]);
  const rangeInvalid = invalid || (!!value.start && !!value.end && value.start > value.end);

  useEffect(() => {
    const first = calendars[0]?.days[0]?.date;
    const finalDays = calendars[calendars.length - 1]?.days;
    const last = finalDays?.[finalDays.length - 1]?.date;
    if (first && last && (activeDate < first || activeDate > last)) setActiveDate(first);
  }, [activeDate, calendars]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-date="${activeDate}"]`)?.focus();
    pendingFocus.current = false;
  }, [activeDate, visibleMonth]);

  const setMonth = (month: string) => {
    const next = startOfMonth(month);
    if (controlledMonth === undefined) setInternalMonth(next);
    onVisibleMonthChange?.(next);
  };
  const focusDate = (date: string) => {
    setActiveDate(date);
    if (date < calendars[0]!.month || date.slice(0, 7) > calendars[calendars.length - 1]!.month.slice(0, 7)) setMonth(startOfMonth(date));
    pendingFocus.current = true;
  };
  const choose = (date: string) => {
    if (disabled || isDateUnavailable(date, { min, max, isDisabled: isDateDisabled })) return;
    onChange(selectRangeDate(value, date));
    setActiveDate(date);
  };
  const onDateKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in offsets) { event.preventDefault(); focusDate(addCalendarDays(date, offsets[event.key]!)); return; }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const mondayIndex = (weekday + 6) % 7;
      focusDate(addCalendarDays(date, event.key === 'Home' ? -mondayIndex : 6 - mondayIndex));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault(); focusDate(addCalendarMonths(date, event.key === 'PageUp' ? -1 : 1));
    }
  };
  const announcement = !value.start
    ? labels.noneSelected
    : !value.end
      ? labels.startSelected.replace('{start}', dateLabel(value.start, locale))
      : labels.rangeSelected.replace('{start}', dateLabel(value.start, locale)).replace('{end}', dateLabel(value.end, locale));

  return <section className={cx('uix-date-range-picker', rangeInvalid && 'uix-date-range-picker--invalid', className)} aria-labelledby={`${id}-label`}>
    <div className="uix-date-range-picker__header">
      <h3 id={`${id}-label`}>{label}</h3>
      <div><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => setMonth(addCalendarMonths(visibleMonth, -1))} aria-label={labels.previousMonth}>{labels.previous}</button><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={() => setMonth(addCalendarMonths(visibleMonth, 1))} aria-label={labels.nextMonth}>{labels.next}</button></div>
    </div>
    <div ref={rootRef} className="uix-date-range-picker__months">
      {calendars.map(({ month, days }) => <div className="uix-date-range-picker__month" key={month}>
        <h4>{monthLabel(month, locale)}</h4>
        <div className="uix-date-range-picker__weekdays" aria-hidden="true">{weekdays.map((day, index) => <span key={index}>{day}</span>)}</div>
        <div className="uix-date-range-picker__grid" role="group" aria-label={monthLabel(month, locale)}>
          {Array.from({ length: (new Date(`${month}T00:00:00Z`).getUTCDay() + 6) % 7 }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
          {days.map((day) => {
            const unavailable = disabled || isDateUnavailable(day.date, { min, max, isDisabled: isDateDisabled });
            const edge = day.date === value.start ? 'start' : day.date === value.end ? 'end' : undefined;
            return <button
              key={day.date} type="button" data-date={day.date} data-range-edge={edge}
              data-in-range={isDateInRange(day.date, value) || undefined} aria-pressed={edge != null || isDateInRange(day.date, value)}
              aria-label={`${dateLabel(day.date, locale)}${edge ? `, ${edge === 'start' ? labels.rangeStart : labels.rangeEnd}` : isDateInRange(day.date, value) ? `, ${labels.inRange}` : ''}`}
              tabIndex={activeDate === day.date ? 0 : -1} disabled={unavailable}
              onFocus={() => setActiveDate(day.date)} onKeyDown={(event) => onDateKeyDown(event, day.date)} onClick={() => choose(day.date)}
            >{day.day}</button>;
          })}
        </div>
      </div>)}
    </div>
    <p className="uix-date-range-picker__selection" aria-live="polite">{announcement}</p>
    {rangeInvalid && <p className="uix-field__error" role="alert">{invalidMessage}</p>}
  </section>;
}
