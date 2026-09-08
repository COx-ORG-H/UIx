export type RelativeTimeUnit = 'second' | 'minute' | 'hour' | 'day';

export interface RelativeTimeValue {
  value: number;
  unit: RelativeTimeUnit;
}

export function parseDateValue(value: Date | number | string): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function relativeTimeValue(date: Date, now: Date): RelativeTimeValue {
  const seconds = (date.getTime() - now.getTime()) / 1000;
  const absolute = Math.abs(seconds);
  if (absolute < 60) return { value: Math.round(seconds), unit: 'second' };
  if (absolute < 3600) return { value: Math.round(seconds / 60), unit: 'minute' };
  if (absolute < 86400) return { value: Math.round(seconds / 3600), unit: 'hour' };
  return { value: Math.round(seconds / 86400), unit: 'day' };
}
