/**
 * uix time-field model — pure helpers behind `TimePicker` (HAR-1835): how a locale writes a time
 * of day, how a typed time is read, and how the arrow keys step it. No DOM, no React, no runtime
 * import, so the unit test loads this file directly (time-field-model.test.mjs).
 *
 * A time is a wall-clock `HH:mm` string (what `<input type="time">` holds): 24-hour, zero-padded,
 * no seconds, no zone.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** Whether `HH:mm` names a time of day (00:00 to 23:59). */
export function isValidTimeKey(value: string | null | undefined): value is string {
  const match = value ? /^(\d{2}):(\d{2})$/.exec(value) : null;
  return !!match && Number(match[1]) < 24 && Number(match[2]) < 60;
}

/** Minutes since midnight of `HH:mm`. */
export const timeToMinutes = (value: string): number => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

/** `HH:mm` of a minute of the day (wrapped into 0 … 1439). */
export const minutesToTime = (minutes: number): string => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** Whether `locale` writes times on a 12-hour clock (en-US: yes; de, en-GB, bs: no). */
export function uses12Hour(locale?: string | readonly string[]): boolean {
  try {
    const options = new Intl.DateTimeFormat(locale as string | string[] | undefined, { hour: 'numeric' }).resolvedOptions() as { hourCycle?: string };
    const cycle = options.hourCycle;
    return cycle === 'h11' || cycle === 'h12';
  } catch {
    return false;
  }
}

const at = (value: string) => new Date(Date.UTC(2026, 0, 1, Number(value.slice(0, 2)), Number(value.slice(3, 5))));

/** A time in the locale's own shape: 14:30 in German, 2:30 PM in en-US. `hour12` overrides the locale. */
export function formatTimeKey(value: string, locale?: string | readonly string[], hour12?: boolean): string {
  if (!isValidTimeKey(value)) return value;
  const twelve = hour12 ?? uses12Hour(locale);
  try {
    return new Intl.DateTimeFormat(locale as string | string[] | undefined, {
      hour: twelve ? 'numeric' : '2-digit', minute: '2-digit', hourCycle: twelve ? 'h12' : 'h23', timeZone: 'UTC',
    }).format(at(value));
  } catch {
    return value;
  }
}

/** The locale's words for before and after noon ("AM", "PM"; "vorm.", "nachm."), lower-cased. */
function dayPeriods(locale?: string | readonly string[]): { am: string[]; pm: string[] } {
  const am = ['am', 'a.m.', 'a'];
  const pm = ['pm', 'p.m.', 'p'];
  try {
    const fmt = new Intl.DateTimeFormat(locale as string | string[] | undefined, { hour: 'numeric', hourCycle: 'h12', timeZone: 'UTC' });
    const word = (hour: number) => fmt.formatToParts(at(`${pad(hour)}:00`)).find((p) => p.type === 'dayPeriod')?.value.trim().toLowerCase();
    const a = word(1);
    const p = word(13);
    if (a && !am.includes(a)) am.unshift(a);
    if (p && !pm.includes(p)) pm.unshift(p);
  } catch { /* an unknown locale: the English words only */ }
  return { am, pm };
}

/**
 * Read a typed time. Accepts `14:30`, `14.30`, `14h30`, `1430`, `930`, `9` and, with a day period,
 * `2:30 pm`, `2pm`, `2:30 p.m.` (and the locale's own words). Without a day period the hour is
 * read on the 24-hour clock. Returns `HH:mm`, or `null` when the text is not a time.
 */
export function parseTimeInput(text: string, locale?: string | readonly string[]): string | null {
  let rest = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!rest) return null;
  let period: 'am' | 'pm' | null = null;
  const { am, pm } = dayPeriods(locale);
  const words = [...am.map((w) => [w, 'am'] as const), ...pm.map((w) => [w, 'pm'] as const)].sort((x, y) => y[0].length - x[0].length);
  for (const [word, which] of words) {
    if (rest.endsWith(word) && /[\d\s.]$/.test(rest.slice(0, -word.length) || ' ')) {
      period = which;
      rest = rest.slice(0, -word.length).trim();
      break;
    }
    if (rest.startsWith(word) && /^[\s\d]/.test(rest.slice(word.length))) {
      period = which;
      rest = rest.slice(word.length).trim();
      break;
    }
  }
  let hour: number;
  let minute: number;
  const split = /^(\d{1,2})\s*(?:[:.h]\s*(\d{1,2}))?\s*(?:h|uhr)?$/.exec(rest);
  const packed = /^(\d{3,4})$/.exec(rest);
  if (split && (split[2] === undefined || split[2].length === 2)) {
    hour = Number(split[1]);
    minute = split[2] === undefined ? 0 : Number(split[2]);
  } else if (packed) {
    hour = Number(packed[1]!.slice(0, -2));
    minute = Number(packed[1]!.slice(-2));
  } else {
    return null;
  }
  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (period === 'pm' ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return `${pad(hour)}:${pad(minute)}`;
}

/** Whether `value` is outside `min` / `max` (both `HH:mm`, inclusive). */
export function isTimeOutOfRange(value: string, min?: string, max?: string): boolean {
  return (!!min && isValidTimeKey(min) && value < min) || (!!max && isValidTimeKey(max) && value > max);
}

/**
 * The time `delta` minutes from `value`, for the arrow keys. Between `min` and `max` it stops at
 * the ends; with neither it wraps round midnight. From an empty field it starts at `min`, or 00:00.
 */
export function stepTime(value: string | null, delta: number, min?: string, max?: string): string {
  const lo = min && isValidTimeKey(min) ? timeToMinutes(min) : null;
  const hi = max && isValidTimeKey(max) ? timeToMinutes(max) : null;
  if (!value || !isValidTimeKey(value)) return minutesToTime(lo ?? 0);
  let next = timeToMinutes(value) + delta;
  if (lo === null && hi === null) return minutesToTime(next);
  if (lo !== null && next < lo) next = lo;
  if (hi !== null && next > hi) next = hi;
  return minutesToTime(Math.max(0, Math.min(1439, next)));
}

/** The times a list offers: every `step` minutes from `min` (or 00:00) to `max` (or 23:59). */
export function timeSlots(step: number, min?: string, max?: string): string[] {
  const size = Math.max(1, Math.round(step));
  const lo = min && isValidTimeKey(min) ? timeToMinutes(min) : 0;
  const hi = max && isValidTimeKey(max) ? timeToMinutes(max) : 1439;
  const out: string[] = [];
  for (let m = lo; m <= hi; m += size) out.push(minutesToTime(m));
  return out;
}
