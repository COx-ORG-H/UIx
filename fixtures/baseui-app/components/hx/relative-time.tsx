'use client';
/* @hx registry item — ported from @itsmx/shared-ui/src/relative-time.tsx */

import { useEffect, useState } from 'react';
import { cn } from './utils';

/**
 * UI-PRIM-01 / addendum 5 — universal relative time renderer per
 * Docs/design-system.md § 6 (Time formatting rule).
 *
 * Rendering ladder (from documented table):
 *   - < 60 seconds        →  "Just now"
 *   - < 60 minutes        →  "Nm ago"
 *   - < 24 hours          →  "Nh ago"
 *   - < 7 days, same year →  "Wed 14:32" (day name + 24h time)
 *   - ≥ 7 days, same year →  "Mar 14, 14:32"
 *   - Different year      →  "2025-11-04 14:32"
 *
 * Tooltip on every rendered time shows the full ISO timestamp with the
 * locale + timezone — disambiguates the abbreviated forms (`Wed 14:32`
 * is ambiguous about which Wednesday it is, etc.).
 *
 * Auto-refresh: every 30 seconds while ANY <RelativeTime/> is mounted,
 * a single module-level interval ticks and forces a re-render of every
 * mounted instance. Per-instance setInterval would create O(n) timers
 * on large lists (the audit log can carry 200+ rows on screen). The
 * interval is cancelled when the last instance unmounts.
 */

// -- module-level interval registry -----------------------------------

type Tick = () => void;
const TICKS = new Set<Tick>();
let INTERVAL_ID: ReturnType<typeof setInterval> | null = null;
const INTERVAL_MS = 30_000;

/**
 * Internal-only seam exposed for tests so they can assert the interval
 * count (one per session, never per-instance). Returns true while the
 * timer is running; false otherwise.
 */
export const __relativeTimeIntervalIsRunning = (): boolean => INTERVAL_ID !== null;
export const __relativeTimeSubscriberCount = (): number => TICKS.size;

const startTimerIfNeeded = (): void => {
  if (INTERVAL_ID !== null || typeof setInterval === 'undefined') return;
  INTERVAL_ID = setInterval(() => {
    for (const tick of TICKS) tick();
  }, INTERVAL_MS);
};

const stopTimerIfIdle = (): void => {
  if (INTERVAL_ID === null) return;
  if (TICKS.size > 0) return;
  clearInterval(INTERVAL_ID);
  INTERVAL_ID = null;
};

// -- public component --------------------------------------------------

export interface RelativeTimeProps {
  /** ISO 8601 string OR a millisecond epoch number OR a Date. */
  ts: string | number | Date;
  /**
   * Optional override for "now" — exposed so tests can pin the clock
   * to a deterministic moment. Production callers leave this undefined
   * and the component reads `Date.now()` at render time.
   */
  now?: number;
  /**
   * Renderer hook. Useful for non-English locales: a host app can
   * inject a translation table via React Context + a wrapper without
   * forking the primitive. Default renders English shorthand per the
   * design-system table.
   */
  formatter?: (params: FormatterInput) => string;
  /** When false, suppress the tooltip on the rendered span. Default true. */
  showTooltip?: boolean;
  className?: string;
}

export interface FormatterInput {
  readonly bucket:
    | 'just_now'
    | 'minutes_ago'
    | 'hours_ago'
    | 'day_name'
    | 'short_date'
    | 'full_date';
  readonly minutes: number;
  readonly hours: number;
  readonly date: Date;
}

const toDate = (v: string | number | Date): Date => {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return new Date(v);
};

/**
 * Default English formatter — exactly the rendering table from
 * design-system.md § 6.
 */
export const defaultFormatter = ({ bucket, minutes, hours, date }: FormatterInput): string => {
  switch (bucket) {
    case 'just_now':
      return 'Just now';
    case 'minutes_ago':
      return `${minutes}m ago`;
    case 'hours_ago':
      return `${hours}h ago`;
    case 'day_name': {
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      const time = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${day} ${time}`;
    }
    case 'short_date': {
      const md = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const time = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${md}, ${time}`;
    }
    case 'full_date': {
      const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const time = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${ymd} ${time}`;
    }
  }
};

/**
 * Decide which bucket the timestamp falls into. Pure function exposed
 * so renderers + tests can use the same logic.
 */
export const computeBucket = (
  ts: string | number | Date,
  nowMs: number = Date.now(),
): FormatterInput => {
  const date = toDate(ts);
  const deltaMs = nowMs - date.getTime();
  const seconds = Math.max(0, Math.floor(deltaMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const now = new Date(nowMs);
  const sameYear = date.getFullYear() === now.getFullYear();
  let bucket: FormatterInput['bucket'];
  if (seconds < 60) bucket = 'just_now';
  else if (minutes < 60) bucket = 'minutes_ago';
  else if (hours < 24) bucket = 'hours_ago';
  else if (days < 7 && sameYear) bucket = 'day_name';
  else if (sameYear) bucket = 'short_date';
  else bucket = 'full_date';
  return { bucket, minutes, hours, date };
};

const formatTooltip = (date: Date): string => {
  // Full ISO with the user's locale/timezone — Intl.DateTimeFormat
  // does the heavy lifting; output looks like
  // "2026-05-21T22:35:14+02:00 — Europe/Berlin".
  const iso = date.toISOString();
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  return `${iso} · ${tz}`;
};

export function RelativeTime({
  ts,
  now,
  formatter = defaultFormatter,
  showTooltip = true,
  className,
}: RelativeTimeProps) {
  // Tick state — `bumpCount` is incremented every 30s by the module
  // timer; the component re-renders to recompute the bucket.
  const [bumpCount, setBumpCount] = useState(0);

  useEffect(() => {
    const tick = () => setBumpCount((c) => c + 1);
    TICKS.add(tick);
    startTimerIfNeeded();
    return () => {
      TICKS.delete(tick);
      stopTimerIfIdle();
    };
  }, []);

  const input = computeBucket(ts, now);
  const rendered = formatter(input);
  // bumpCount is read here so React keeps the effect alive across
  // re-renders triggered by the module timer. Without this read,
  // React 19's compiler might elide the state dependency.
  void bumpCount;

  return (
    <span
      className={cn('inline-block tabular-nums', className)}
      title={showTooltip ? formatTooltip(input.date) : undefined}
      data-bucket={input.bucket}
    >
      {rendered}
    </span>
  );
}
