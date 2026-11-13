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
 * without one, or when a `locale` prop is passed, the locale's numeric date. The time is the
 * locale's hours and minutes.
 *
 * A `YYYY-MM-DD` string is a calendar day, not an instant: it shows that day in every time zone,
 * and never a time. Pass `timeZone` when the page renders on the server: without it the server's
 * zone and the browser's can disagree (the markup tolerates that, as RelativeTime does).
 */

export type DateTimePrecision = 'date' | 'minute';

const NBSP = String.fromCharCode(0xa0);
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

interface Formatting {
  locale?: string | readonly string[];
  timeZone?: string;
  /** `date`: the day only. `minute` (default): the day and the time. A `YYYY-MM-DD` value is always a day. */
  precision?: DateTimePrecision;
}

/** A value read once: the instant, the zone its day is read in, and whether it is a bare calendar day. */
interface Instant { date: Date; zone: string | undefined; dayOnly: boolean }

const instantOf = (value: Date | number | string, timeZone: string | undefined): Instant | null => {
  const dayOnly = typeof value === 'string' && CALENDAR_DAY.test(value);
  const date = parseDateValue(value);
  // a bare day parses as UTC midnight, so it is read in UTC: the 11th stays the 11th west of Greenwich
  return date ? { date, zone: dayOnly ? 'UTC' : timeZone, dayOnly } : null;
};

/** The calendar day of `date` in `timeZone`, as `YYYY-MM-DD` (a four-digit year, also before 1000). */
function isoDay(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}

function useFormat({ locale }: Formatting) {
  const { dateFormat } = useUixLabels();
  const resolvedLocale = (locale ?? dateFormat?.locale) as string | string[] | undefined;
  // the provider's day format is the app's; a `locale` prop asks for that locale's own day and time
  const formatDate = locale == null ? dateFormat?.formatDate : undefined;
  const day = ({ date, zone }: Instant) => formatDate
    ? formatDate(isoDay(date, zone))
    : new Intl.DateTimeFormat(resolvedLocale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone }).format(date);
  const time = ({ date, zone }: Instant) => new Intl.DateTimeFormat(resolvedLocale, { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(date);
  return { day, time };
}

const showsDayOnly = (precision: DateTimePrecision, at: Instant) => precision === 'date' || at.dayOnly;
const machineValue = (precision: DateTimePrecision, at: Instant) => (showsDayOnly(precision, at) ? isoDay(at.date, at.zone) : at.date.toISOString());

export interface DateTimeProps extends Omit<HTMLAttributes<HTMLTimeElement>, 'children' | 'dateTime'>, Formatting {
  value: Date | number | string;
  /** Shown when `value` is not a date. Default `—`. */
  invalidLabel?: ReactNode;
}

/** An absolute date, or date and time, that never breaks inside itself (`<time class="uix-time">`). */
export function DateTime({ value, precision = 'minute', locale, timeZone, invalidLabel = '—', className, ...props }: DateTimeProps) {
  const format = useFormat({ locale });
  const at = instantOf(value, timeZone);
  if (!at) return <time className={cx('uix-time', className)} data-invalid="true" suppressHydrationWarning {...props}>{invalidLabel}</time>;
  const text = showsDayOnly(precision, at) ? format.day(at) : `${format.day(at)} ${format.time(at)}`;
  return <time className={cx('uix-time', className)} dateTime={machineValue(precision, at)} suppressHydrationWarning {...props}>{text}</time>;
}

export interface DateTimeRangeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, Formatting {
  start: Date | number | string;
  end: Date | number | string;
  /** Shown for an instant that is not a date. Default `—`. */
  invalidLabel?: ReactNode;
}

/**
 * A range, "11.11.2026 09:00 – 12:00" (`.uix-time-range`). A range within one day shows its date
 * once. Each end never breaks inside itself; the range breaks only after the dash, unless its cell
 * keeps it on one line (`.uix-col--nowrap`, `textWrap: 'nowrap'`). The ends print as given: the
 * component does not reorder a reversed range, and `end` is inclusive (an all-day range that ends
 * at the next midnight shows two days). Across a clock change an hour can repeat ("02:30 – 02:30").
 */
export function DateTimeRange({ start, end, precision = 'minute', locale, timeZone, invalidLabel = '—', className, ...props }: DateTimeRangeProps) {
  const format = useFormat({ locale });
  const from = instantOf(start, timeZone);
  const to = instantOf(end, timeZone);
  const full = (at: Instant) => (showsDayOnly(precision, at) ? format.day(at) : `${format.day(at)} ${format.time(at)}`);
  const instant = (at: Instant | null, text: (at: Instant) => string) => at
    ? <time className="uix-time" dateTime={machineValue(precision, at)} suppressHydrationWarning>{text(at)}</time>
    : <time className="uix-time" data-invalid="true">{invalidLabel}</time>;
  // one day: both ends on the same calendar day, each read in its own zone
  const sameDay = from != null && to != null && isoDay(from.date, from.zone) === isoDay(to.date, to.zone);
  const dayOnly = from != null && to != null && showsDayOnly(precision, from) && showsDayOnly(precision, to);
  if (sameDay && dayOnly) return <span className={cx('uix-time-range', className)} {...props}>{instant(from, format.day)}</span>;
  return (
    <span className={cx('uix-time-range', className)} {...props}>
      {instant(from, full)}
      {/* a no-break space before the dash, a normal one after it: the only break is after the dash */}
      <span className="uix-time-range__sep">{`${NBSP}– `}</span>
      {instant(to, sameDay && !showsDayOnly(precision, to) ? format.time : full)}
    </span>
  );
}
