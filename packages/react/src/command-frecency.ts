/* Frecency for the CommandPalette (roadmap #9): how often and how lately a person chose each
 * command, kept where the product says (the browser by default, the person's profile on the
 * server through your own adapter). Pure and server-safe; `useCommandFrecency` holds the state.
 *
 * Each command keeps one decayed count: every use adds 1, and the count halves every `halfLife`
 * (a week by default). So ten uses last month weigh about as much as two this week, and the
 * stored record stays one small entry per command (Raycast and Superhuman rank the same way). */

/** One command's use: its decayed count as of `last`, and the total number of uses. */
export interface CommandFrecencyEntry {
  /** The decayed count at `last`; it halves every half-life after that. */
  value: number;
  /** When the command was last chosen (ms since the epoch). */
  last: number;
  /** How many times it was chosen in all. */
  count: number;
}

/** Every recorded command's use, by command id. */
export type CommandFrecencyEntries = Readonly<Record<string, CommandFrecencyEntry>>;

/**
 * Where `useCommandFrecency` keeps the entries. `read` runs after mount (never on the server) and
 * may return `null` for nothing stored; `write` gets every change. `subscribe` (optional) tells the
 * hook another tab or device changed them.
 */
export interface CommandFrecencyStorage {
  /** The stored entries, or `null` for none. Called after mount and after every `subscribe` notice. */
  read: () => CommandFrecencyEntries | null;
  /** Keep `entries` (every entry, after each change). */
  write: (entries: CommandFrecencyEntries) => void;
  /** Call `onChange` when the stored entries change elsewhere; return the unsubscribe. */
  subscribe?: (onChange: () => void) => () => void;
}

/** The `localStorage` key `useCommandFrecency` uses by default. */
export const COMMAND_FRECENCY_STORAGE_KEY = 'uix-command-frecency';

/** A week: a use counts half as much seven days later. */
export const COMMAND_FRECENCY_HALF_LIFE = 7 * 24 * 60 * 60 * 1000;

/** How many commands are kept; the least used go first. */
export const COMMAND_FRECENCY_MAX_ENTRIES = 200;

const isEntry = (value: unknown): value is CommandFrecencyEntry => {
  if (!value || typeof value !== 'object') return false;
  const { value: v, last, count } = value as Record<string, unknown>;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
    && typeof last === 'number' && Number.isFinite(last)
    && typeof count === 'number' && Number.isFinite(count) && count >= 0;
};

/** `raw` as entries, dropping anything malformed (a hand-edited or older stored value). */
export function parseCommandFrecency(raw: unknown): CommandFrecencyEntries {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, CommandFrecencyEntry> = {};
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (isEntry(entry)) out[id] = { value: entry.value, last: entry.last, count: entry.count };
  }
  return out;
}

/** The decayed count of `entry` at `now`. */
export function decayedFrecency(entry: CommandFrecencyEntry | undefined, now: number, halfLife = COMMAND_FRECENCY_HALF_LIFE): number {
  if (!entry) return 0;
  const age = Math.max(0, now - entry.last);
  return entry.value * 0.5 ** (age / Math.max(1, halfLife));
}

/**
 * How much the person uses the command, 0 (never) to 1: the decayed count `v` as `v / (v + 3)`,
 * so one use this week reads 0.25, three read 0.5 and ten about 0.77. Independent of the other
 * commands, so one new favourite does not push every other command down.
 */
export function commandFrecencyScore(entry: CommandFrecencyEntry | undefined, now: number, halfLife = COMMAND_FRECENCY_HALF_LIFE): number {
  const v = decayedFrecency(entry, now, halfLife);
  return v / (v + 3);
}

/** `entries` with one more use of `id` at `now`, trimmed to the `max` most used. */
export function recordCommandUse(entries: CommandFrecencyEntries, id: string, now: number, { halfLife = COMMAND_FRECENCY_HALF_LIFE, max = COMMAND_FRECENCY_MAX_ENTRIES } = {}): CommandFrecencyEntries {
  const previous = entries[id];
  const next: Record<string, CommandFrecencyEntry> = {
    ...entries,
    [id]: { value: decayedFrecency(previous, now, halfLife) + 1, last: now, count: (previous?.count ?? 0) + 1 },
  };
  const ids = Object.keys(next);
  if (ids.length <= max) return next;
  const keep = ids
    .map((key) => ({ key, v: decayedFrecency(next[key], now, halfLife), last: next[key]!.last }))
    .sort((a, b) => b.v - a.v || b.last - a.last)
    .slice(0, Math.max(0, max));
  const trimmed: Record<string, CommandFrecencyEntry> = {};
  for (const { key } of keep) trimmed[key] = next[key]!;
  return trimmed;
}

/**
 * The default storage: `localStorage` under `key`, kept in step with other tabs. A browser that
 * blocks storage (private mode) keeps the ranking for the session only.
 */
export function localCommandFrecencyStorage(key: string = COMMAND_FRECENCY_STORAGE_KEY): CommandFrecencyStorage {
  return {
    read: () => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? parseCommandFrecency(JSON.parse(raw)) : null;
      } catch { return null; }
    },
    write: (entries) => {
      try { window.localStorage.setItem(key, JSON.stringify(entries)); } catch { /* storage blocked or full */ }
    },
    subscribe: (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) onChange(); };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}
