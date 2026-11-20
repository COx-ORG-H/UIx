/* The SLA clock as a pure function of its inputs and an instant (SlaTimer, roadmap #17).
 *
 * The server owns the clock: it knows the business calendar, the pauses and when the target was
 * breached. The kit only reads the instants it is given (`dueAt`, `startedAt`, `breachedAt`,
 * `pausedAt`, `completedAt`) and works out where the clock stands now: which threshold it has
 * crossed, how long is left, and when that next changes. No state, no timers: `SlaTimer` and a
 * product's own sort both call these with an injected `now`. */

/** An instant: a `Date`, epoch milliseconds or an ISO 8601 string. */
export type SlaTime = Date | number | string;

/**
 * A threshold's level, quietest first. `urgent` is the kit's time-pressure orange (attention),
 * not red: red is kept for the breach, the one state that is broken now (calm kit).
 */
export type SlaLevel = 'notice' | 'warning' | 'urgent';

/**
 * Where an SLA stands. `on-track` and the three levels are a running clock; `breached` is past
 * its deadline (running, paused or stopped); `paused` waits (for the requester, a supplier) with
 * its time frozen; `met` stopped in time; `none` has no valid deadline.
 */
export type SlaState = 'none' | 'on-track' | SlaLevel | 'breached' | 'paused' | 'met';

/**
 * When a level begins (Halo-style, up to three per SLA). Give exactly one of:
 * - `elapsed`: a share of the span from `startedAt` to `dueAt`, `0.75` for 75 % (needs `startedAt`);
 * - `remaining`: milliseconds before `dueAt`, e.g. `2 * 3_600_000` for two hours left;
 * - `at`: the instant itself, when the server projects the threshold through a business calendar.
 */
export type SlaThreshold =
  | { level: SlaLevel; elapsed: number; remaining?: never; at?: never }
  | { level: SlaLevel; remaining: number; elapsed?: never; at?: never }
  | { level: SlaLevel; at: SlaTime; elapsed?: never; remaining?: never };

/** Warning at 75 % of the span, urgent at 90 %, breach at 100 %. Used when `startedAt` is known. */
export const DEFAULT_SLA_THRESHOLDS: readonly SlaThreshold[] = [
  { level: 'warning', elapsed: 0.75 },
  { level: 'urgent', elapsed: 0.9 },
];

/**
 * The defaults without a `startedAt`, when no span is known: warning with two hours left (the
 * calm kit's "drifting" deadline), urgent with 30 minutes left.
 */
export const DEFAULT_SLA_REMAINING_THRESHOLDS: readonly SlaThreshold[] = [
  { level: 'warning', remaining: 2 * 3_600_000 },
  { level: 'urgent', remaining: 30 * 60_000 },
];

/** The instants an SLA clock is read from. Only `dueAt` (or `breachedAt`) is needed. */
export interface SlaInput {
  /** When the target breaches. As the server projected it, through its business calendar. */
  dueAt?: SlaTime | null;
  /** When the clock started: the base of `elapsed` thresholds. */
  startedAt?: SlaTime | null;
  /**
   * Up to three. Default: {@link DEFAULT_SLA_THRESHOLDS} with a `startedAt`,
   * {@link DEFAULT_SLA_REMAINING_THRESHOLDS} without. `[]` shows no level before the breach.
   */
  thresholds?: readonly SlaThreshold[];
  /** The clock waits (for the requester, a supplier): the time left is frozen and nothing ticks. */
  paused?: boolean;
  /** When the pause began; the frozen time left is read at this instant. Default: `now`. */
  pausedAt?: SlaTime | null;
  /**
   * When the server recorded the breach, if it did. It wins over `dueAt` (a business calendar
   * may breach before the wall clock would), and a breach is never taken back.
   */
  breachedAt?: SlaTime | null;
  /** The clock stopped (resolved, fulfilled): `met`, or `breached` when it stopped late. */
  completedAt?: SlaTime | null;
}

export interface SlaStatus {
  state: SlaState;
  /** How far the clock has run, apart from pause and completion: on track, a level or breached. */
  level: 'on-track' | SlaLevel | 'breached';
  /**
   * Milliseconds left before the deadline at the instant the clock is read (`now`, the pause or
   * the stop); negative once breached, by how long. `NaN` for `none`.
   */
  remaining: number;
  /** The deadline this status counts to: `breachedAt` when given, else `dueAt`. */
  deadline: Date | null;
  /** The clock does not run: paused or completed. */
  stopped: boolean;
  /**
   * The next instant (epoch ms) at which the state or the minute shown changes, or `null` when
   * the clock does not run. A timer waits until then, not a fixed tick.
   */
  nextChangeAt: number | null;
}

const LEVEL_RANK: Record<SlaStatus['level'], number> = { 'on-track': 0, notice: 1, warning: 2, urgent: 3, breached: 4 };
const MINUTE = 60_000;

/** A finite "last" for sorting: `Infinity - Infinity` is `NaN` in a comparator. */
export const SLA_SORT_LAST = Number.MAX_SAFE_INTEGER;

export function parseSlaTime(value: SlaTime | null | undefined): number | null {
  if (value == null || value === '') return null;
  const time = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** The instant each threshold begins, invalid ones (no start, an empty span, a bad date) left out. */
export function slaThresholdInstants(input: SlaInput): Array<{ level: SlaLevel; at: number }> {
  const due = parseSlaTime(input.dueAt);
  const start = parseSlaTime(input.startedAt);
  const thresholds = input.thresholds ?? (start != null ? DEFAULT_SLA_THRESHOLDS : DEFAULT_SLA_REMAINING_THRESHOLDS);
  const out: Array<{ level: SlaLevel; at: number }> = [];
  for (const t of thresholds) {
    if (!t || !(t.level in LEVEL_RANK)) continue;
    let at: number | null = null;
    if (typeof t.elapsed === 'number') {
      if (due != null && start != null && due > start && t.elapsed >= 0 && t.elapsed <= 1) at = start + t.elapsed * (due - start);
    } else if (typeof t.remaining === 'number') {
      if (due != null && Number.isFinite(t.remaining) && t.remaining >= 0) at = due - t.remaining;
    } else {
      at = parseSlaTime(t.at);
    }
    if (at != null && Number.isFinite(at)) out.push({ level: t.level, at });
  }
  return out;
}

/** Where the SLA stands at `now` (default: the current time). Pure: same inputs, same answer. */
export function slaStatus(input: SlaInput, now: SlaTime = Date.now()): SlaStatus {
  const current = parseSlaTime(now) ?? Date.now();
  const breach = parseSlaTime(input.breachedAt);
  const deadline = breach ?? parseSlaTime(input.dueAt);
  if (deadline == null) return { state: 'none', level: 'on-track', remaining: Number.NaN, deadline: null, stopped: true, nextChangeAt: null };

  const completed = parseSlaTime(input.completedAt);
  const paused = completed == null && input.paused === true;
  // the instant the clock is read at: where it stopped, where it paused, or now
  const at = completed ?? (paused ? parseSlaTime(input.pausedAt) ?? current : current);
  const remaining = deadline - at;

  const instants = slaThresholdInstants(input);
  let level: SlaStatus['level'] = 'on-track';
  if (remaining <= 0) level = 'breached';
  else for (const t of instants) if (t.at <= at && LEVEL_RANK[t.level] > LEVEL_RANK[level]) level = t.level;

  const stopped = completed != null || paused;
  const state: SlaState = completed != null
    ? (level === 'breached' ? 'breached' : 'met')
    : level === 'breached' ? 'breached' : paused ? 'paused' : level;

  let nextChangeAt: number | null = null;
  if (!stopped) {
    // the minute shown changes whenever the distance to the deadline crosses a whole minute
    const offset = ((deadline - current) % MINUTE + MINUTE) % MINUTE;
    nextChangeAt = current + (offset === 0 ? MINUTE : offset);
    for (const t of instants) if (t.at > current && t.at < nextChangeAt) nextChangeAt = t.at;
  }
  return { state, level, remaining, deadline: new Date(deadline), stopped, nextChangeAt };
}

/**
 * A sort key for a queue's SLA column, ascending = most urgent first: the most overdue breach,
 * then the least time left (a paused clock by its frozen time), then met and no SLA last
 * ({@link SLA_SORT_LAST}, finite). Sort by this, not by the state's name.
 */
export function slaSortValue(input: SlaInput, now: SlaTime = Date.now()): number {
  const status = slaStatus(input, now);
  if (status.state === 'none' || status.state === 'met') return SLA_SORT_LAST;
  return status.remaining;
}

/** Whole days, hours and minutes in `ms` (floored), kept to the two largest units that matter. */
export function slaDurationParts(ms: number): Array<{ unit: 'day' | 'hour' | 'minute'; value: number }> {
  const total = Math.floor(Math.abs(ms) / MINUTE);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  if (days > 0) return hours > 0 ? [{ unit: 'day', value: days }, { unit: 'hour', value: hours }] : [{ unit: 'day', value: days }];
  if (hours > 0) return minutes > 0 ? [{ unit: 'hour', value: hours }, { unit: 'minute', value: minutes }] : [{ unit: 'hour', value: hours }];
  return [{ unit: 'minute', value: minutes }];
}

/** The rank of a level, for "did it get worse": on track 0 … breached 4. */
export function slaLevelRank(level: SlaStatus['level']): number {
  return LEVEL_RANK[level];
}
