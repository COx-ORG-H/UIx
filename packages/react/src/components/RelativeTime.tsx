"use client";

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { parseDateValue, relativeTimeValue } from '../relative-time-model.js';
import { readRelativeClock, subscribeRelativeClock } from '../relative-time-clock.js';

export interface RelativeTimeFormatContext {
  date: Date;
  now: Date;
  locale?: string | readonly string[];
  timeZone?: string;
}

export interface RelativeTimeProps extends Omit<HTMLAttributes<HTMLTimeElement>, 'children' | 'dateTime'> {
  value: Date | number | string;
  now?: Date | number;
  locale?: string | readonly string[];
  timeZone?: string;
  numeric?: Intl.RelativeTimeFormatNumeric;
  invalidLabel?: ReactNode;
  refreshInterval?: number | false;
  formatter?: (context: RelativeTimeFormatContext) => ReactNode;
}

/** Locale-aware relative time with deterministic `now` support for SSR and tests. */
export function RelativeTime({
  value,
  now,
  locale,
  timeZone,
  numeric = 'auto',
  invalidLabel = '—',
  refreshInterval = 30_000,
  formatter,
  title,
  ...props
}: RelativeTimeProps) {
  const interval = refreshInterval === false ? 0 : Math.max(0, refreshInterval);
  const fixedNow = now == null ? undefined : new Date(now).getTime();
  const subscribe = useCallback((listener: () => void) => fixedNow == null ? subscribeRelativeClock(interval, listener) : () => {}, [fixedNow, interval]);
  const getSnapshot = useCallback(() => fixedNow ?? readRelativeClock(interval), [fixedNow, interval]);
  const getServerSnapshot = useCallback(() => fixedNow ?? Date.now(), [fixedNow]);
  const clock = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const date = useMemo(() => parseDateValue(value), [value]);
  if (!date) return <time data-invalid="true" suppressHydrationWarning {...props}>{invalidLabel}</time>;

  const current = new Date(clock);
  const content = formatter
    ? formatter({ date, now: current, locale, timeZone })
    : (() => {
        const relative = relativeTimeValue(date, current);
        if (relative.unit === 'day' && Math.abs(relative.value) >= 7) {
          return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(date);
        }
        return new Intl.RelativeTimeFormat(locale, { numeric }).format(relative.value, relative.unit);
      })();
  const absolute = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date);

  return <time dateTime={date.toISOString()} title={title ?? absolute} suppressHydrationWarning {...props}>{content}</time>;
}
