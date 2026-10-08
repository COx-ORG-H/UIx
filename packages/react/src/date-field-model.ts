/**
 * uix date-field model — pure helpers behind `DatePicker`, `DateTimePicker` and the field mode
 * of `DateRangePicker` (HAR-1383): how a locale orders day / month / year, how a typed date is
 * read, and how a date-time value is split and joined. No DOM, no React, no runtime import, so
 * the unit test loads this file directly (date-field-model.test.mjs).
 *
 * A date is an ISO calendar date, `YYYY-MM-DD`. A date-time is a wall-clock value,
 * `YYYY-MM-DDTHH:mm`, as `<input type="datetime-local">` holds it: no zone, no offset. Which
 * zone that wall clock is in is the product's to know and to show.
 */

export type DatePart = 'day' | 'month' | 'year';

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** Whether `YYYY-MM-DD` names a real calendar day (2026-02-30 does not). */
export function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The order in which `locale` writes a numeric date: `['day', 'month', 'year']` for de or
 * en-GB, `['month', 'day', 'year']` for en-US, `['year', 'month', 'day']` for sv or ja.
 */
export function dateOrder(locale?: string | readonly string[]): DatePart[] {
  try {
    const parts = new Intl.DateTimeFormat(locale as string | string[] | undefined, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
      .formatToParts(new Date(Date.UTC(2026, 10, 22)));
    const order = parts.map((part) => part.type).filter((type): type is DatePart => type === 'day' || type === 'month' || type === 'year');
    if (order.length === 3 && new Set(order).size === 3) return order;
  } catch { /* an unknown locale: fall through */ }
  return ['year', 'month', 'day'];
}

/** A hint for the field, e.g. `DD.MM.YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, in the locale's own shape. */
export function datePattern(locale?: string | readonly string[]): string {
  const letters: Record<DatePart, string> = { day: 'DD', month: 'MM', year: 'YYYY' };
  try {
    return new Intl.DateTimeFormat(locale as string | string[] | undefined, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
      .formatToParts(new Date(Date.UTC(2026, 10, 22)))
      .map((part) => (part.type === 'day' || part.type === 'month' || part.type === 'year' ? letters[part.type] : part.value))
      .join('');
  } catch {
    return 'YYYY-MM-DD';
  }
}

/** A numeric date in the locale's shape: 22.11.2026, 11/22/2026, 2026-11-22. */
export function formatDateKey(value: string, locale?: string | readonly string[]): string {
  if (!isValidDateKey(value)) return value;
  return new Intl.DateTimeFormat(locale as string | string[] | undefined, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}

/**
 * Read a typed date. ISO `YYYY-MM-DD` is always accepted; otherwise three numbers separated by
 * `.`, `/`, `-` or spaces are read in the locale's order (so `3.4.2026` is 3 April in German and
 * `3/4/2026` is 4 March in en-US). A two-digit year means 2000–2099. Returns the ISO date, or
 * `null` when the text is not a real date.
 */
export function parseDateInput(text: string, locale?: string | readonly string[]): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number) as [number, number, number];
    const iso = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
    return isValidDateKey(iso) ? iso : null;
  }
  const numbers = trimmed.split(/[.\/\-\s]+/).filter(Boolean);
  if (numbers.length !== 3 || numbers.some((n) => !/^\d{1,4}$/.test(n))) return null;
  const order = dateOrder(locale);
  const read: Partial<Record<DatePart, number>> = {};
  order.forEach((part, index) => { read[part] = Number(numbers[index]); });
  let year = read.year!;
  const yearText = numbers[order.indexOf('year')]!;
  if (yearText.length <= 2) year += 2000;
  else if (yearText.length !== 4) return null;
  const iso = `${pad(year, 4)}-${pad(read.month!)}-${pad(read.day!)}`;
  return isValidDateKey(iso) ? iso : null;
}

/** Split `YYYY-MM-DDTHH:mm` (seconds are dropped) into its date and time. */
export function splitDateTime(value: string | null | undefined): { date: string | null; time: string } {
  const match = value ? /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(value) : null;
  if (!match || !isValidDateKey(match[1]!)) return { date: null, time: '' };
  return { date: match[1]!, time: match[2] ?? '' };
}

/** Join a date and a time into `YYYY-MM-DDTHH:mm`; without a date there is no value. */
export function joinDateTime(date: string | null, time: string, fallbackTime = '00:00'): string | null {
  if (!date) return null;
  return `${date}T${/^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : fallbackTime}`;
}

/** The short name of `timeZone` on that day ("CEST", "GMT+2"), for the label beside a time. */
export function timeZoneName(timeZone: string, date: string | null, locale?: string | readonly string[]): string {
  try {
    const at = date && isValidDateKey(date) ? new Date(`${date}T12:00:00Z`) : new Date();
    const part = new Intl.DateTimeFormat(locale as string | string[] | undefined, { timeZone, timeZoneName: 'short' })
      .formatToParts(at).find((p) => p.type === 'timeZoneName');
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}
