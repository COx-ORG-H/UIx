"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AriaAttributes, KeyboardEvent } from 'react';
import { addCalendarDays, addCalendarMonths, buildMonthGrid, isDateInRange, isDateUnavailable, selectRangeDate, startOfMonth } from '../calendar-model.js';
import type { CalendarWeekday, DateRangeValue } from '../calendar-model.js';
import { cx } from '../cx.js';
import { formatDateKey } from '../date-field-model.js';
import { CalendarIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import type { Placement } from '../overlay-position.js';
import { localDateKey, useFieldPopover, weekdayNames } from './DateFieldParts.js';
import { Popover } from './Popover.js';

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
  /** Field mode: what the trigger shows while no range is set. */
  placeholder: string;
  /** Field mode: the trigger's text for a start without an end; `{start}`. */
  fieldStart: string;
  /** Field mode: the trigger's text for a range; `{start}`, `{end}`. */
  fieldRange: string;
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
  placeholder: 'Choose dates',
  fieldStart: '{start} –',
  fieldRange: '{start} – {end}',
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
  /**
   * The ISO date (`YYYY-MM-DD`) that gets the today ring and `aria-current="date"`.
   * Defaults to the viewer's local date; pass it when rendering on a server (whose
   * clock and zone may differ from the viewer's), or `null` for no today marker.
   */
  today?: string | null;
  /** First column of each month, in `Date.getUTCDay()` numbering (0 = Sunday). Default 1, Monday. */
  weekStartsOn?: CalendarWeekday;
  /**
   * `'inline'` (default) draws the months in the page. `'field'` draws a form control that
   * shows the range and opens the same months in a popover (HAR-1383): for forms and filter
   * bars. It closes once the range has both ends; Escape closes it and returns focus.
   */
  mode?: 'inline' | 'field';
  /** Field mode: how the trigger writes a date. Default: the locale's numeric date. */
  formatDate?: (date: string) => string;
  /** Field mode: lands on the trigger, so a `<label htmlFor>` or `<Field>` names it. */
  id?: string;
  /** Field mode. */
  size?: 'sm' | 'md';
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  /** Field mode: where the popover opens. Default `'bottom-start'`. */
  placement?: Placement;
  /** Field mode. */
  onOpenChange?: (open: boolean) => void;
}

interface RangeCalendarProps extends Omit<DateRangePickerProps, 'labels'> {
  words: DateRangePickerLabels;
  /** Move focus to the active day on mount (the popover just opened). */
  autoFocus?: boolean;
}
const monthLabel = (date: string, locale?: string) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const dateLabel = (date: string, locale?: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

/** The months themselves: the whole picker inline, the popover's content in field mode. */
function RangeCalendar({
  value, onChange, visibleMonth: controlledMonth, onVisibleMonthChange, months = 2,
  min, max, isDateDisabled, locale, label = 'Choose date range', invalid,
  invalidMessage = 'The selected date range is invalid.', disabled, className, words: labels, today,
  weekStartsOn = 1, autoFocus = false,
}: RangeCalendarProps) {
  const id = useId();
  // UIX-13: the weekday names follow the locale, like the month names.
  const weekdays = useMemo(() => weekdayNames(locale, weekStartsOn), [locale, weekStartsOn]);
  const [internalMonth, setInternalMonth] = useState(() => startOfMonth(controlledMonth ?? value.start ?? new Date().toISOString().slice(0, 10)));
  const visibleMonth = startOfMonth(controlledMonth ?? internalMonth);
  const [activeDate, setActiveDate] = useState(value.end ?? value.start ?? visibleMonth);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(autoFocus);
  const count = Math.max(1, Math.min(3, months));
  const calendars = useMemo(() => Array.from({ length: count }, (_, index) => {
    const month = startOfMonth(addCalendarMonths(visibleMonth, index));
    return { month, days: buildMonthGrid(month).filter((day) => day.inMonth) };
  }), [visibleMonth, count]);
  const todayDate = today === undefined ? localDateKey() : today;
  const rangeInvalid = invalid || (!!value.start && !!value.end && value.start > value.end);

  useEffect(() => {
    const first = calendars[0]?.days[0]?.date;
    const finalDays = calendars[calendars.length - 1]?.days;
    const last = finalDays?.[finalDays.length - 1]?.date;
    if (first && last && (activeDate < first || activeDate > last)) setActiveDate(first);
  }, [activeDate, calendars]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-date="${activeDate}"]`)?.focus({ preventScroll: autoFocus });
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
      const index = (weekday - weekStartsOn + 7) % 7;
      focusDate(addCalendarDays(date, event.key === 'Home' ? -index : 6 - index));
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
          {Array.from({ length: (new Date(`${month}T00:00:00Z`).getUTCDay() - weekStartsOn + 7) % 7 }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
          {days.map((day) => {
            const unavailable = disabled || isDateUnavailable(day.date, { min, max, isDisabled: isDateDisabled });
            const edge = day.date === value.start ? 'start' : day.date === value.end ? 'end' : undefined;
            return <button
              key={day.date} type="button" data-date={day.date} data-range-edge={edge}
              data-in-range={isDateInRange(day.date, value) || undefined} aria-pressed={edge != null || isDateInRange(day.date, value)}
              aria-label={`${dateLabel(day.date, locale)}${edge ? `, ${edge === 'start' ? labels.rangeStart : labels.rangeEnd}` : isDateInRange(day.date, value) ? `, ${labels.inRange}` : ''}`}
              aria-current={day.date === todayDate ? 'date' : undefined}
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

/**
 * Controlled date-range picker using the UIx calendar language: two months inline, or with
 * `mode="field"` a form control that opens them in a popover.
 */
export function DateRangePicker({ labels: labelOverrides, ...props }: DateRangePickerProps) {
  const uixLabels = useUixLabels();
  const words: DateRangePickerLabels = { ...DEFAULT_DATE_RANGE_PICKER_LABELS, ...uixLabels.dateRangePicker, ...labelOverrides };
  if (props.mode === 'field') return <DateRangeField {...props} words={words} />;
  return <RangeCalendar {...props} words={words} />;
}

function DateRangeField(props: RangeCalendarProps) {
  const {
    value, onChange, locale, label = 'Choose date range', invalid, disabled, className, words, formatDate,
    id: idProp, size = 'md', placement = 'bottom-start', onOpenChange,
    'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid,
  } = props;
  const uid = useId();
  const id = idProp ?? `${uid}-trigger`;
  const popoverId = `${uid}-months`;
  const valueId = `${uid}-value`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { open, hide, triggerProps } = useFieldPopover(popoverId, () => triggerRef.current?.focus({ preventScroll: true }), onOpenChange);
  // A `<label htmlFor>` replaces the trigger's own text as its name; the range is then its description.
  const [labelled, setLabelled] = useState(false);
  useEffect(() => { setLabelled((triggerRef.current?.labels?.length ?? 0) > 0); }, [id]);

  const format = (date: string) => formatDate?.(date) ?? formatDateKey(date, locale);
  const text = !value.start
    ? null
    : !value.end
      ? words.fieldStart.replace('{start}', format(value.start))
      : words.fieldRange.replace('{start}', format(value.start)).replace('{end}', format(value.end));
  const rangeInvalid = invalid || (!!value.start && !!value.end && value.start > value.end);
  const describedBy = [ariaDescribedBy, labelled && text ? valueId : undefined].filter(Boolean).join(' ') || undefined;

  return <div ref={anchorRef} className={cx('uix-date-range-field', className)}>
    <button
      ref={triggerRef} type="button" id={id} disabled={disabled}
      className={cx('uix-input', size === 'sm' && 'uix-input--sm', 'uix-date-range-field__trigger')}
      aria-describedby={describedBy} aria-invalid={rangeInvalid || ariaInvalid === true || ariaInvalid === 'true' || undefined}
      {...triggerProps}
    >
      <span className="uix-date-range-field__icon" aria-hidden="true"><CalendarIcon size="sm" /></span>
      <span className="uix-visually-hidden">{label}: </span>
      <span id={valueId} className={cx('uix-date-range-field__value', !text && 'uix-date-range-field__value--empty')}>{text ?? words.placeholder}</span>
    </button>
    <Popover
      id={popoverId} anchor={anchorRef} placement={placement} className="uix-date-range-field__popover"
      role="dialog" aria-label={label} capHeight closeWhenAnchorHidden
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        event.preventDefault();
        hide();
      }}
    >
      {open && <RangeCalendar
        {...props} className="uix-date-range-picker--in-popover" autoFocus
        onChange={(next) => {
          onChange(next);
          // Both ends chosen: the field has its answer.
          if (next.start && next.end) hide();
        }}
      />}
    </Popover>
  </div>;
}
