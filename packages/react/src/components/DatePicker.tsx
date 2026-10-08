"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type { AriaAttributes, CSSProperties, KeyboardEvent } from 'react';
import { isDateUnavailable } from '../calendar-model.js';
import type { CalendarWeekday } from '../calendar-model.js';
import { cx } from '../cx.js';
import { datePattern, formatDateKey, isValidDateKey, joinDateTime, parseDateInput, splitDateTime, timeZoneName } from '../date-field-model.js';
import { fillLabel } from '../fill-label.js';
import { CalendarIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import type { Placement } from '../overlay-position.js';
import { fullDateLabel, localDateKey, MonthCalendar, useFieldPopover } from './DateFieldParts.js';
import { Popover } from './Popover.js';

/** Every word `DatePicker` renders or announces. */
export interface DatePickerLabels {
  /** The calendar button's name while no date is set. */
  open: string;
  /** The calendar button's name with a date set; `{date}` is the date in full. */
  openSelected: string;
  /** The calendar popover's name. */
  calendar: string;
  previousMonth: string;
  nextMonth: string;
  /** Shown when the typed text is not a date; `{pattern}` is the expected shape, e.g. `DD.MM.YYYY`. */
  invalidDate: string;
  /** Shown when the typed date is outside `min` / `max` or refused by `isUnavailable`. */
  unavailable: string;
}

export const DEFAULT_DATE_PICKER_LABELS: DatePickerLabels = {
  open: 'Choose date',
  openSelected: 'Change date, {date}',
  calendar: 'Calendar',
  previousMonth: 'Show previous month',
  nextMonth: 'Show next month',
  invalidDate: 'Enter a date as {pattern}.',
  unavailable: 'That date is not available.',
};

/** Why typed text was refused: not a date, or a date that cannot be chosen. */
export type DateInputProblem = 'format' | 'unavailable';

export interface DatePickerProps {
  /** The date as `YYYY-MM-DD`, or `null` for none. */
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** First and last selectable day (`YYYY-MM-DD`). The calendar does not go past them. */
  min?: string;
  max?: string;
  /** Days inside `min` / `max` that cannot be chosen (weekends, a freeze, days already taken). */
  isUnavailable?: (date: string) => boolean;
  /**
   * How the field writes a date. Default: the locale's numeric date (22.11.2026, 11/22/2026).
   * Pass `parseDate` with it when your format is not three numbers, so typing still works.
   */
  formatDate?: (date: string) => string;
  /** Read typed text into `YYYY-MM-DD`, or `null` when it is not a date. Default: ISO or the locale's order. */
  parseDate?: (text: string) => string | null;
  locale?: string;
  /** First column of the calendar, in `Date.getUTCDay()` numbering (0 = Sunday). Default 1, Monday. */
  weekStartsOn?: CalendarWeekday;
  /**
   * The ISO date that gets the today ring. Defaults to the viewer's local date; pass it when
   * the product works in another zone, or `null` for no today marker.
   */
  today?: string | null;
  /** Default: the locale's date shape, e.g. `DD.MM.YYYY`. */
  placeholder?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** Submits the ISO value under this name (a hidden input), whatever the field shows. */
  name?: string;
  /** Lands on the text input, so a `<label htmlFor>` or `<Field>` names it. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-required'?: AriaAttributes['aria-required'];
  /** Where the calendar opens. Default `'bottom-start'`; it flips and shifts to stay on screen. */
  placement?: Placement;
  /** Told when typed text is refused, and `null` once the field is fine again. */
  onInputProblem?: (problem: DateInputProblem | null) => void;
  onOpenChange?: (open: boolean) => void;
  /** Translatable words; English defaults in {@link DEFAULT_DATE_PICKER_LABELS}. */
  labels?: Partial<DatePickerLabels>;
  className?: string;
  style?: CSSProperties;
}

/**
 * A single date as a form field (HAR-1383): a text input that shows the formatted date and
 * accepts a typed one, and a calendar button that opens one month in a popover. The value is an
 * ISO `YYYY-MM-DD` string. Typed text is read on Enter and when focus leaves the field: ISO or
 * the locale's own order (`3.4.2026` in German, `4/3/2026` in en-US); text that is not a date,
 * or a date that cannot be chosen, marks the field invalid, says why, and leaves `value` alone.
 * ArrowDown in the field opens the calendar; Escape closes it and focus returns to the field.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker({
  value, onValueChange, min, max, isUnavailable, formatDate, parseDate, locale, weekStartsOn = 1, today,
  placeholder, size = 'md', disabled, readOnly, required, invalid, name, id: idProp,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid, 'aria-required': ariaRequired, placement = 'bottom-start',
  onInputProblem, onOpenChange, labels: labelOverrides, className, style,
}, forwardedRef) {
  const uid = useId();
  const id = idProp ?? `${uid}-input`;
  const popoverId = `${uid}-calendar`;
  const errorId = `${uid}-error`;
  const labels: DatePickerLabels = { ...DEFAULT_DATE_PICKER_LABELS, ...useUixLabels().datePicker, ...labelOverrides };
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  const format = (date: string) => formatDate?.(date) ?? formatDateKey(date, locale);
  const [text, setText] = useState(() => (value ? format(value) : ''));
  const [problem, setProblemState] = useState<DateInputProblem | null>(null);
  const setProblem = (next: DateInputProblem | null) => {
    if (next !== problem) onInputProblem?.(next);
    setProblemState(next);
  };
  // A new value (or locale) rewrites the field; a refused draft stays as typed until then.
  useEffect(() => {
    setText(value ? format(value) : '');
    setProblemState((current) => { if (current) onInputProblem?.(null); return null; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locale]);

  const { open, show, hide, triggerProps } = useFieldPopover(popoverId, () => inputRef.current?.focus({ preventScroll: true }), onOpenChange);
  const locked = !!disabled || !!readOnly;

  /** Read the typed text. Returns whether the field is now in a good state. */
  const commit = (): boolean => {
    const typed = text.trim();
    if (!typed) {
      setProblem(null);
      if (text) setText('');
      if (value !== null) onValueChange(null);
      return true;
    }
    if (value && typed === format(value)) { setProblem(null); return true; }
    const parsed = parseDate ? parseDate(typed) : parseDateInput(typed, locale);
    if (!parsed || !isValidDateKey(parsed)) { setProblem('format'); return false; }
    if (isDateUnavailable(parsed, { min, max, isDisabled: isUnavailable })) { setProblem('unavailable'); return false; }
    setProblem(null);
    setText(format(parsed));
    if (parsed !== value) onValueChange(parsed);
    return true;
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (locked) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      show();
    } else if (event.key === 'Enter' && text.trim() !== (value ? format(value) : '')) {
      // Enter reads a changed draft; an unchanged field leaves Enter to the form.
      event.preventDefault();
      commit();
    }
  };

  const choose = (date: string) => {
    setProblem(null);
    setText(format(date));
    if (date !== value) onValueChange(date);
    hide(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  const todayDate = today === undefined ? localDateKey() : today;
  const pattern = datePattern(locale);
  const describedBy = [ariaDescribedBy, problem ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  const isInvalid = !!invalid || !!problem || ariaInvalid === true || ariaInvalid === 'true';

  return <div ref={anchorRef} className={cx('uix-date-picker', size === 'sm' && 'uix-date-picker--sm', className)} style={style}>
    <div className="uix-date-picker__control">
      <input
        ref={inputRef} id={id} type="text" inputMode="numeric" autoComplete="off" spellCheck={false}
        className={cx('uix-input', size === 'sm' && 'uix-input--sm', 'uix-date-picker__input')}
        value={text} placeholder={placeholder ?? (formatDate ? undefined : pattern)}
        disabled={disabled} readOnly={readOnly} required={required}
        aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} aria-describedby={describedBy}
        aria-invalid={isInvalid || undefined} aria-required={ariaRequired}
        onChange={(event) => { setText(event.target.value); if (problem) setProblem(null); }}
        onBlur={() => { if (!locked) commit(); }}
        onKeyDown={onInputKeyDown}
      />
      <button
        type="button" className="uix-date-picker__toggle" disabled={locked}
        aria-label={value && isValidDateKey(value) ? fillLabel(labels.openSelected, { date: fullDateLabel(value, locale) }) : labels.open}
        {...triggerProps}
      ><CalendarIcon size="sm" /></button>
    </div>
    {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
    {problem && <span id={errorId} className="uix-field__error uix-date-picker__error" role="alert">
      {problem === 'format' ? fillLabel(labels.invalidDate, { pattern }) : labels.unavailable}
    </span>}
    <Popover
      id={popoverId} anchor={anchorRef} placement={placement} className="uix-date-picker__popover"
      role="dialog" aria-label={labels.calendar} closeWhenAnchorHidden
      onKeyDown={(event) => {
        // Escape belongs to the calendar: it closes it, and does not also close a drawer around the field.
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        event.preventDefault();
        hide();
      }}
    >
      {open && <MonthCalendar
        value={value} onSelect={choose} initialDate={value && isValidDateKey(value) ? value : todayDate ?? localDateKey()}
        min={min} max={max} isUnavailable={isUnavailable} locale={locale} weekStartsOn={weekStartsOn}
        today={todayDate} labels={labels} autoFocus
      />}
    </Popover>
  </div>;
});

/** The words `DateTimePicker` adds to the date field's own ({@link DatePickerLabels}). */
export interface DateTimePickerLabels extends DatePickerLabels {
  /** Name of the date input when the picker has its own `aria-label`. */
  date: string;
  /** Name of the time input. */
  time: string;
  /** Name of the time input inside a labelled field; `{label}` is the field's label. */
  timeOf: string;
  /** Read after the time; `{zone}` is the zone shown beside it. */
  timeZone: string;
}

export const DEFAULT_DATE_TIME_PICKER_LABELS: DateTimePickerLabels = {
  ...DEFAULT_DATE_PICKER_LABELS,
  date: 'Date',
  time: 'Time',
  timeOf: '{label}, time',
  timeZone: 'Time zone: {zone}',
};

export interface DateTimePickerProps extends Omit<DatePickerProps, 'value' | 'onValueChange' | 'labels' | 'min' | 'max'> {
  /** A wall-clock date and time, `YYYY-MM-DDTHH:mm` (what `datetime-local` holds), or `null`. */
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** First and last selectable day; a date-time is read by its date. */
  min?: string;
  max?: string;
  /**
   * The IANA zone the wall clock is in (`Europe/Vienna`). Its short name on the chosen day is
   * shown beside the time. Without it the viewer's own zone is shown. The value itself carries
   * no zone: turning it into an instant is the product's job.
   */
  timeZone?: string;
  /** Text shown instead of the zone's short name ("Vienna time", "UTC+2"); `null` shows none. */
  timeZoneLabel?: string | null;
  /** Minutes between time steps. Default 1. */
  minuteStep?: number;
  /** The time a date gets when it is chosen before any time. Default `'00:00'`. */
  defaultTime?: string;
  labels?: Partial<DateTimePickerLabels>;
}

/**
 * A date and a time as one field (HAR-1383): the {@link DatePicker} and a time input, with the
 * time zone the pair is in shown beside them. The value is `YYYY-MM-DDTHH:mm`, the shape
 * `datetime-local` uses, so it replaces that input without changing what a form submits.
 * Clearing the date clears the value; a time alone is not a value.
 */
export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(function DateTimePicker({
  value, onValueChange, timeZone, timeZoneLabel, minuteStep = 1, defaultTime = '00:00', min, max, name, id: idProp,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy,
  labels: labelOverrides, locale, size = 'md', disabled, readOnly, required, className, style, ...dateProps
}, forwardedRef) {
  const uid = useId();
  const id = idProp ?? `${uid}-date`;
  const zoneId = `${uid}-zone`;
  const labels: DateTimePickerLabels = { ...DEFAULT_DATE_TIME_PICKER_LABELS, ...useUixLabels().dateTimePicker, ...labelOverrides };
  const { date, time } = splitDateTime(value);
  const dateRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => dateRef.current as HTMLInputElement);
  // A time typed before any date waits here; it joins the date once one is chosen.
  const [pendingTime, setPendingTime] = useState('');
  const shownTime = date ? time : pendingTime;

  // Inside a labelled field the label names the date input; the time input borrows its text.
  const [fieldLabel, setFieldLabel] = useState('');
  // Without `timeZone` the viewer's own zone is shown: read after mount, a server's zone would differ.
  const [viewerZone, setViewerZone] = useState<string | null>(null);
  const grouped = !!ariaLabel || !!ariaLabelledBy;
  useEffect(() => {
    if (!grouped) setFieldLabel(dateRef.current?.labels?.[0]?.textContent?.trim() ?? '');
    if (!timeZone) {
      try { setViewerZone(new Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { /* no Intl zone */ }
    }
  }, [grouped, timeZone]);

  const zone = timeZone ?? viewerZone;
  const zoneText = timeZoneLabel === null ? null : timeZoneLabel ?? (zone ? timeZoneName(zone, date, locale) : null);
  const timeName = grouped ? labels.time : fieldLabel ? fillLabel(labels.timeOf, { label: fieldLabel }) : labels.time;
  const step = Math.max(1, Math.round(minuteStep)) * 60;

  return <div
    className={cx('uix-date-time-picker', size === 'sm' && 'uix-date-time-picker--sm', className)} style={style}
    role="group" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}
  >
    <DatePicker
      {...dateProps} ref={dateRef} id={id} value={date} locale={locale} size={size}
      min={min?.slice(0, 10)} max={max?.slice(0, 10)} disabled={disabled} readOnly={readOnly} required={required}
      aria-label={grouped ? labels.date : undefined} aria-describedby={ariaDescribedBy} labels={labels}
      onValueChange={(next) => {
        if (!next) { setPendingTime(''); onValueChange(null); return; }
        onValueChange(joinDateTime(next, shownTime, defaultTime));
      }}
    />
    <input
      type="time" className={cx('uix-input', size === 'sm' && 'uix-input--sm', 'uix-date-time-picker__time')}
      value={shownTime} step={step} disabled={disabled} readOnly={readOnly} required={required && !!date}
      aria-label={timeName} aria-describedby={zoneText ? zoneId : undefined}
      onChange={(event) => {
        const next = event.target.value;
        if (date) onValueChange(joinDateTime(date, next, defaultTime));
        else setPendingTime(next);
      }}
    />
    {zoneText && <span className="uix-date-time-picker__zone">
      <span aria-hidden="true">{zoneText}</span>
      <span id={zoneId} className="uix-visually-hidden">{fillLabel(labels.timeZone, { zone: zoneText })}</span>
    </span>}
    {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
  </div>;
});
