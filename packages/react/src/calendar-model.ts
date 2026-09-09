export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  weekday: number;
}

export interface DateRangeValue {
  start?: string;
  end?: string;
}

export interface ZonedDateSpan {
  start: string;
  end: string;
}

function fromDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new TypeError(`Invalid ISO date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
}

export function addCalendarDays(value: string, amount: number): string {
  const date = fromDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

export function addCalendarMonths(value: string, amount: number): string {
  const date = fromDateKey(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return toDateKey(date);
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function buildMonthGrid(month: string, weekStartsOn: 0 | 1 = 1): CalendarDay[] {
  const first = fromDateKey(startOfMonth(month));
  const offset = (first.getUTCDay() - weekStartsOn + 7) % 7;
  const start = addCalendarDays(toDateKey(first), -offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addCalendarDays(start, index);
    const parsed = fromDateKey(date);
    return {
      date,
      day: parsed.getUTCDate(),
      inMonth: date.slice(0, 7) === month.slice(0, 7),
      weekday: parsed.getUTCDay(),
    };
  });
}

export function zonedDateKey(instant: string | Date, timeZone: string): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) throw new TypeError(`Invalid instant: ${String(instant)}`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function zonedDateSpan(start: string, end: string, timeZone: string): ZonedDateSpan {
  const startKey = zonedDateKey(start, timeZone);
  const endKey = zonedDateKey(end, timeZone);
  return startKey <= endKey ? { start: startKey, end: endKey } : { start: endKey, end: startKey };
}

export function enumerateDateSpan(span: ZonedDateSpan, limit = 370): string[] {
  const dates: string[] = [];
  let current = span.start;
  while (current <= span.end && dates.length < limit) {
    dates.push(current);
    current = addCalendarDays(current, 1);
  }
  return dates;
}

export function selectRangeDate(current: DateRangeValue, date: string): DateRangeValue {
  if (!current.start || current.end) return { start: date };
  return date < current.start ? { start: date, end: current.start } : { start: current.start, end: date };
}

export function isDateInRange(date: string, value: DateRangeValue): boolean {
  return !!value.start && !!value.end && date >= value.start && date <= value.end;
}

export function isDateUnavailable(
  date: string,
  options: { min?: string; max?: string; isDisabled?: (date: string) => boolean },
): boolean {
  return (!!options.min && date < options.min)
    || (!!options.max && date > options.max)
    || !!options.isDisabled?.(date);
}
