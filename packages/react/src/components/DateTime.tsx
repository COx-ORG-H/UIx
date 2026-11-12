"use client";

import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { parseDateValue } from '../relative-time-model.js';

/*
 * An absolute date or time, and a range of them (HAR-3094). A date on screen is one token:
 * "11.11.2026 09:00" split over two lines reads as two values. Each instant renders as a <time>
 * with `.uix-time` (never breaks inside itself, tabular digits); a range breaks only after its dash,
 * so the end moves to the next line whole. The date part follows the app-wide date format of the
 * date fields (UixLabelsProvider `dateFormat`, HAR-2432), so a shown date matches the pickers;
 * without one, the locale's numeric date. The time is the locale's hours and minutes.
 */

export type DateTimePrecision = 'date' | 'minute';

const NBSP = String.fromCharCode(0xa0);

interface Formatting {
  locale?: string | readonly string[];
  timeZone?: string;
  /** `date`: the day only. `minute` (default): the day and the time. */
  precision?: DateTimePrecision;
}

/** The calendar day of `date` in `timeZone`, as `YYYY-MM-DD`. */
function isoDay(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function useFormat({ locale, timeZone }: Formatting) {
  const { dateFormat } = useUixLabels();
  const resolvedLocale = (locale ?? dateFormat?.locale) as string | string[] | undefined;
  const day = (date: Date) => dateFormat?.formatDate
    ? dateFormat.formatDate(isoDay(date, timeZone))
    : new Intl.DateTimeFormat(resolvedLocale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(date);
  const time = (date: Date) => new Intl.DateTimeFormat(resolvedLocale, { hour: '2-digit', minute: '2-digit', timeZone }).format(date);
  return { day, time, sameDay: (a: Date, b: Date) => isoDay(a, timeZone) === isoDay(b, timeZone) };
}

export interface DateTimeProps extends Omit<HTMLAttributes<HTMLTimeElement>, 'children' | 'dateTime'>, Formatting {
  value: Date | number | string;
  /** Shown when `value` is not a date. Default `—`. */
  invalidLabel?: ReactNode;
}

/** An absolute date, or date and time, that never breaks inside itself (`<time class="uix-time">`). */
export function DateTime({ value, precision = 'minute', locale, timeZone, invalidLabel = '—', className, ...props }: DateTimeProps) {
  const format = useFormat({ locale, timeZone });
  const date = parseDateValue(value);
  if (!date) return <time className={cx('uix-time', className)} data-invalid="true" {...props}>{invalidLabel}</time>;
  const text = precision === 'date' ? format.day(date) : `${format.day(date)} ${format.time(date)}`;
  return <time className={cx('uix-time', className)} dateTime={precision === 'date' ? isoDay(date, timeZone) : date.toISOString()} {...props}>{text}</time>;
}

export interface DateTimeRangeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, Formatting {
  start: Date | number | string;
  end: Date | number | string;
  /** Shown for an instant that is not a date. Default `—`. */
  invalidLabel?: ReactNode;
}

/**
 * A range, "11.11.2026 09:00 – 12:00" (`.uix-time-range`). A range within one day shows its date
 * once. Each end never breaks inside itself; the range breaks only after the dash.
 */
export function DateTimeRange({ start, end, precision = 'minute', locale, timeZone, invalidLabel = '—', className, ...props }: DateTimeRangeProps) {
  const format = useFormat({ locale, timeZone });
  const from = parseDateValue(start);
  const to = parseDateValue(end);
  const instant = (date: Date | null, text: (d: Date) => string) => date
    ? <time className="uix-time" dateTime={precision === 'date' ? isoDay(date, timeZone) : date.toISOString()}>{text(date)}</time>
    : <time className="uix-time" data-invalid="true">{invalidLabel}</time>;
  const full = (d: Date) => (precision === 'date' ? format.day(d) : `${format.day(d)} ${format.time(d)}`);
  const sameDay = from != null && to != null && format.sameDay(from, to);
  if (precision === 'date' && sameDay) return <span className={cx('uix-time-range', className)} {...props}>{instant(from, format.day)}</span>;
  return (
    <span className={cx('uix-time-range', className)} {...props}>
      {instant(from, full)}
      {/* a no-break space before the dash, a normal one after it: the only break is after the dash */}
      <span className="uix-time-range__sep">{`${NBSP}– `}</span>
      {instant(to, sameDay ? format.time : full)}
    </span>
  );
}
