"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { announcePolite } from '../announce.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { relativeTimeValue } from '../relative-time-model.js';
import { waitForSlaChange } from '../sla-clock.js';
import { parseSlaTime, slaDurationParts, slaLevelRank, slaStatus } from '../sla-model.js';
import type { SlaInput, SlaState, SlaStatus, SlaTime } from '../sla-model.js';

/**
 * The timer's words. Every entry has an English default; translate through `labels` or
 * `UixLabelsProvider` (`slaTimer`). `{time}` is a duration, a relative time or a date and time
 * written by `Intl` in the timer's `locale`; `{label}`, `{text}` and `{reason}` are as named.
 */
export interface SlaTimerLabels {
  /** A running clock in a record header, and its spoken text: `Due in {time}`. */
  dueIn: string;
  /** With a relative or absolute time: `Due {time}` ("Due in 2 hours", "Due 20 Nov, 15:30"). */
  due: string;
  /** A breach in a record header, and its spoken text: `Breached {time} ago`. */
  breachedAgo: string;
  /** A breach with a relative or absolute time: `Breached {time}`. */
  breached: string;
  /** A breach in a table cell, and a clock that stopped late: `{time} over`. */
  over: string;
  /** A paused clock in a table cell. */
  paused: string;
  /** A paused clock in a record header, and its spoken text: `Paused, {time} left`. */
  pausedLeft: string;
  /** A clock that stopped in time. */
  met: string;
  /** No valid deadline: said in place of the dash. */
  none: string;
  /** Under a minute, short: `< 1 min`. */
  lessThanMinute: string;
  /** Under a minute, spoken: `less than a minute`. */
  lessThanMinuteLong: string;
  /** The absolute deadline, on hover, under the header and in the spoken text: `Deadline {time}`. */
  deadline: string;
  /** The SLA's name before its spoken text: `{label}: {text}`. */
  labelled: string;
  /** The state as a word in the spoken text ("Due in 2 hours 14 minutes, warning"). */
  states: Record<Exclude<SlaState, 'none'>, string>;
}

export const DEFAULT_SLA_TIMER_LABELS: SlaTimerLabels = {
  dueIn: 'Due in {time}',
  due: 'Due {time}',
  breachedAgo: 'Breached {time} ago',
  breached: 'Breached {time}',
  over: '{time} over',
  paused: 'Paused',
  pausedLeft: 'Paused, {time} left',
  met: 'Met',
  none: 'No due date',
  lessThanMinute: '< 1 min',
  lessThanMinuteLong: 'less than a minute',
  deadline: 'Deadline {time}',
  labelled: '{label}: {text}',
  states: { 'on-track': 'on track', notice: 'approaching', warning: 'warning', urgent: 'urgent', breached: 'breached', paused: 'paused', met: 'met' },
};

export interface SlaTimerProps extends SlaInput, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The SLA's name ("Resolution", "First response"): the header's eyebrow and the start of the spoken text. */
  label?: string;
  /** Why the clock waits ("Waiting for the requester"), with `paused`. */
  pausedReason?: string;
  /** The current instant, for tests and server renders; the timer then never ticks on its own. */
  now?: SlaTime;
  /**
   * How the time reads: `compact` ("2 h 14 min", the default), `relative` ("in 2 hours", `Intl.RelativeTimeFormat`)
   * or `absolute` ("20 Nov 2026, 15:30"). The absolute deadline is always on hover and in the spoken text.
   */
  format?: 'compact' | 'relative' | 'absolute';
  /** `cell` (the default): one line for a queue column. `header`: the record header's eyebrow, line and deadline. */
  variant?: 'cell' | 'header';
  /** The locale of the numbers, units and dates. Default: the date fields' (`UixLabelsProvider` `dateFormat.locale`), else the browser's. */
  locale?: string;
  /** The time zone of the absolute deadline, e.g. `Europe/Sarajevo`. Default: the browser's. */
  timeZone?: string;
  /**
   * Say it once, politely, when the clock crosses into a worse level (a threshold, the breach) while it is on
   * screen; never on mount, never for a change of props. Off by default: a queue of timers must not talk.
   * Turn it on for the one timer of the record that is open.
   */
  announce?: boolean;
  labels?: Partial<SlaTimerLabels>;
}

// Intl.ListFormat is ES2021; the kit's lib is ES2020, so it is typed here and feature-tested
interface ListFormatter { format(list: readonly string[]): string }
type ListFormatCtor = new (locale?: string, options?: { type: 'unit'; style: 'narrow' }) => ListFormatter;
const ListFormat = (Intl as unknown as { ListFormat?: ListFormatCtor }).ListFormat;

// Bundlers substitute the literal `process.env.NODE_ENV`; the typeof guard keeps
// un-bundled browser ESM from throwing where `process` doesn't exist.
declare const process: { env: { NODE_ENV?: string } } | undefined;

/** One formatter per locale and options for the page: a queue of 200 timers builds each once. */
const formatters = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  if (!formatters.has(key)) formatters.set(key, make());
  return formatters.get(key) as T;
}

function formatDuration(ms: number, locale: string | undefined, long: boolean, labels: SlaTimerLabels): string {
  if (Math.abs(ms) < 60_000) return long ? labels.lessThanMinuteLong : labels.lessThanMinute;
  const display = long ? 'long' : 'short';
  const parts = slaDurationParts(ms).map(({ unit, value }) =>
    cached(`n|${locale}|${unit}|${display}`, () => new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: display })).format(value),
  );
  if (parts.length === 1 || !ListFormat) return parts.join(' ');
  return cached(`l|${locale}`, () => new ListFormat(locale, { type: 'unit', style: 'narrow' })).format(parts);
}

function formatRelative(deadline: number, at: number, locale: string | undefined): string {
  const { value, unit } = relativeTimeValue(new Date(deadline), new Date(at));
  return cached(`r|${locale}`, () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })).format(value, unit);
}

function formatAbsolute(time: number, locale: string | undefined, timeZone: string | undefined): string {
  return cached(`d|${locale}|${timeZone}`, () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone })).format(time);
}

/** The words of one status: what the cell or header shows, its third line, the spoken text and the hover. */
function slaWords(
  status: SlaStatus,
  at: number,
  props: { variant: 'cell' | 'header'; format: 'compact' | 'relative' | 'absolute'; label?: string; pausedReason?: string; paused: boolean; completed: boolean },
  labels: SlaTimerLabels,
  locale: string | undefined,
  timeZone: string | undefined,
) {
  const { state, remaining, deadline } = status;
  if (state === 'none' || !deadline) {
    const spoken = props.label ? fillLabel(labels.labelled, { label: props.label, text: labels.none }) : labels.none;
    return { shown: '—', meta: '', spoken, hover: undefined };
  }
  const header = props.variant === 'header';
  const short = formatDuration(remaining, locale, false, labels);
  const long = formatDuration(remaining, locale, true, labels);
  const dated = fillLabel(labels.deadline, { time: formatAbsolute(deadline.getTime(), locale, timeZone) });
  const reason = props.paused && props.pausedReason ? props.pausedReason : '';
  const time = props.format === 'relative' ? formatRelative(deadline.getTime(), at, locale)
    : props.format === 'absolute' ? formatAbsolute(deadline.getTime(), locale, timeZone) : '';

  let shown: string;
  let spoken: string;
  if (state === 'met') {
    shown = labels.met;
    spoken = `${labels.met}. ${dated}`;
  } else if (state === 'breached') {
    const stoppedLate = props.completed;
    shown = props.format !== 'compact' && !stoppedLate ? fillLabel(labels.breached, { time })
      : header && !stoppedLate ? fillLabel(labels.breachedAgo, { time: short })
        : fillLabel(labels.over, { time: short });
    spoken = stoppedLate
      ? `${labels.states.breached}, ${fillLabel(labels.over, { time: long })}. ${dated}`
      : `${fillLabel(labels.breachedAgo, { time: long })}${props.paused ? `, ${labels.states.paused}` : ''}. ${dated}`;
  } else if (state === 'paused') {
    shown = header ? fillLabel(labels.pausedLeft, { time: short }) : labels.paused;
    spoken = fillLabel(labels.pausedLeft, { time: long });
  } else {
    shown = props.format !== 'compact' ? (header ? fillLabel(labels.due, { time }) : time)
      : header ? fillLabel(labels.dueIn, { time: short }) : short;
    spoken = `${fillLabel(labels.dueIn, { time: long })}, ${labels.states[state]}. ${dated}`;
  }
  if (reason) spoken = `${spoken}. ${reason}`;
  if (props.label) spoken = fillLabel(labels.labelled, { label: props.label, text: spoken });
  // a paused clock's deadline moves when it resumes: the reason stands in for it
  return { shown, meta: reason || (state === 'paused' ? '' : dated), spoken, hover: state === 'paused' ? reason || undefined : reason ? `${dated}. ${reason}` : dated };
}

const noSubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;
let warnedThresholds = false;

/**
 * An SLA's clock: time left (or over), its state, on a schedule (roadmap #17). The server owns the clock and
 * passes its instants; this reads them. Up to three thresholds (warning at 75 %, urgent at 90 % by default),
 * a pause with its reason, the breach the server recorded. It never pulses or loops: it re-renders when its
 * minute or state changes, not before, and not while the tab is hidden. It speaks only when asked (`announce`).
 *
 * The shape says the level as well as the colour (WCAG 1.4.1): nothing on track, a ring at `notice`, a dot at
 * `warning`, a diamond at `urgent` (the time-pressure orange), a dot with the words at a breach (the only red),
 * two bars when paused. Sort a column by `slaSortValue`, not by the state's name.
 */
export function SlaTimer({
  dueAt, startedAt, thresholds, paused = false, pausedAt, breachedAt, completedAt,
  label, pausedReason, now, format = 'compact', variant = 'cell', locale, timeZone, announce = false,
  labels: labelsProp, className, ...props
}: SlaTimerProps) {
  const kitLabels = useUixLabels();
  const labels: SlaTimerLabels = {
    ...DEFAULT_SLA_TIMER_LABELS, ...kitLabels.slaTimer, ...labelsProp,
    states: { ...DEFAULT_SLA_TIMER_LABELS.states, ...kitLabels.slaTimer?.states, ...labelsProp?.states },
  };
  const resolvedLocale = locale ?? kitLabels.dateFormat?.locale;
  const fixed = parseSlaTime(now);

  if (thresholds && thresholds.length > 3 && !warnedThresholds && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    warnedThresholds = true;
    console.warn(`SlaTimer: ${thresholds.length} thresholds; up to three read clearly (notice, warning, urgent).`);
  }

  const input: SlaInput = { dueAt, startedAt, thresholds, paused, pausedAt, breachedAt, completedAt };
  // a hydrating client renders no time first (the server's may be stale), then the real one
  const hydrating = !useSyncExternalStore(noSubscribe, isClient, isServer) && typeof window !== 'undefined';
  const [tick, setTick] = useState(0);
  const at = fixed ?? Date.now();
  const status = slaStatus(input, at);
  const next = fixed == null && !hydrating ? status.nextChangeAt : null;
  useEffect(() => {
    if (next == null) return undefined;
    return waitForSlaChange(next, () => setTick((n) => n + 1));
    // `tick`: a wake-up that changed nothing (the tab came back) still waits again
  }, [next, tick]);

  const completed = parseSlaTime(completedAt) != null;
  // paused counts only while the clock would otherwise run (not once it has stopped for good)
  const pausedNow = paused && !completed && status.state !== 'none';
  const words = slaWords(status, at, { variant, format, label, pausedReason, paused: pausedNow, completed }, labels, resolvedLocale, timeZone);

  // say a crossing into a worse level, once per level, only when the clock moved it (not new props)
  const rootRef = useRef<HTMLSpanElement>(null);
  const inputKey = [dueAt, startedAt, breachedAt, completedAt, pausedAt, paused, JSON.stringify(thresholds ?? null)].map(String).join('|');
  const seen = useRef<{ key: string; rank: number; said: Set<string> } | null>(null);
  const rank = slaLevelRank(status.level);
  const spokenNow = words.spoken;
  useEffect(() => {
    if (hydrating) return;
    const prev = seen.current;
    if (!prev || prev.key !== inputKey) {
      seen.current = { key: inputKey, rank, said: new Set() };
      return;
    }
    if (announce && rank > prev.rank && !status.stopped && !prev.said.has(status.level)) {
      prev.said.add(status.level);
      announcePolite(spokenNow, rootRef.current);
    }
    prev.rank = rank;
  }, [hydrating, inputKey, rank, announce, status.level, status.stopped, spokenNow]);

  const state = hydrating ? undefined : status.state;
  const dateTime = status.deadline && !hydrating ? status.deadline.toISOString() : undefined;
  const shown = hydrating ? '' : words.shown;
  const value = (
    <>
      <span className="uix-sla__mark" aria-hidden="true" />
      <time className="uix-sla__time" dateTime={dateTime} aria-hidden="true" suppressHydrationWarning>{shown}</time>
    </>
  );
  return (
    <span
      ref={rootRef}
      className={cx('uix-sla', variant === 'header' && 'uix-sla--header', className)}
      data-state={state}
      data-paused={!hydrating && pausedNow ? '' : undefined}
      title={hydrating ? undefined : words.hover}
      suppressHydrationWarning
      {...props}
    >
      {variant === 'header' ? (
        <>
          {label && <span className="uix-sla__label" aria-hidden="true">{label}</span>}
          <span className="uix-sla__value">{value}</span>
          {words.meta && !hydrating && <span className="uix-sla__meta" aria-hidden="true">{words.meta}</span>}
        </>
      ) : value}
      <span className="uix-visually-hidden" suppressHydrationWarning>{hydrating ? '' : words.spoken}</span>
    </span>
  );
}
