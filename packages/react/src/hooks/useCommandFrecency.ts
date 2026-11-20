"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMMAND_FRECENCY_HALF_LIFE, COMMAND_FRECENCY_MAX_ENTRIES, COMMAND_FRECENCY_STORAGE_KEY, commandFrecencyScore,
  localCommandFrecencyStorage, recordCommandUse,
} from '../command-frecency.js';
import type { CommandFrecencyEntries, CommandFrecencyStorage } from '../command-frecency.js';

/** Where `useCommandFrecency` keeps the use, and how fast it fades. */
export interface UseCommandFrecencyOptions {
  /**
   * Where the use is kept: your own adapter (the person's profile on the server), `null` for this
   * page only. Read once after mount; to switch adapters (another person signs in), remount the
   * hook with a `key`. Default: `localStorage` under `storageKey`.
   */
  storage?: CommandFrecencyStorage | null;
  /** The `localStorage` key of the default storage. Default `COMMAND_FRECENCY_STORAGE_KEY`. */
  storageKey?: string;
  /** A use counts half as much after this many milliseconds. Default a week. */
  halfLife?: number;
  /** How many commands are kept. Default 200. */
  max?: number;
}

/** What `useCommandFrecency` returns; pass it whole to `CommandPalette` `frecency`. */
export interface CommandFrecency {
  /** 0 (never used) to 1 (used all the time, lately). */
  score: (id: string) => number;
  /** One more use of `id`, now. The palette calls it for every command chosen through it. */
  record: (id: string) => void;
  /** Forget `id` ("reset ranking"), or every command. */
  reset: (id?: string) => void;
  /** The `items` used lately, last used first: a palette's `recent`. Default limit 5. */
  recent: <T extends { id: string }>(items: readonly T[], limit?: number) => T[];
  /** Every recorded command's use. */
  entries: CommandFrecencyEntries;
}

const EMPTY: CommandFrecencyEntries = {};

/**
 * How often and how lately the person chose each command (roadmap #9), for `CommandPalette`
 * `frecency`: frequent and recent commands rank higher, and `recent(items)` fills the palette's
 * recent list. Kept in `localStorage` by default; pass `storage` to keep it with the person on the
 * server. The server and the first render see no use; the stored use arrives after mount.
 *
 * ```tsx
 * const frecency = useCommandFrecency();
 * <CommandPalette items={items} frecency={frecency} recent={frecency.recent(items)} … />
 * ```
 */
export function useCommandFrecency({
  storage: storageOption, storageKey = COMMAND_FRECENCY_STORAGE_KEY, halfLife = COMMAND_FRECENCY_HALF_LIFE, max = COMMAND_FRECENCY_MAX_ENTRIES,
}: UseCommandFrecencyOptions = {}): CommandFrecency {
  const [entries, setEntries] = useState<CommandFrecencyEntries>(EMPTY);
  const latest = useRef(entries);
  latest.current = entries;
  const custom = storageOption !== undefined;
  const storageRef = useRef<CommandFrecencyStorage | null>(null);
  // The default storage follows `storageKey`; a custom adapter is read through the ref, so a new
  // object on every render does not read (and re-render) again.
  storageRef.current = custom ? storageOption ?? null : typeof window === 'undefined' ? null : defaultStorage(storageKey);

  useEffect(() => {
    const storage = storageRef.current;
    if (!storage) return undefined;
    const read = () => {
      try { setEntries(storage.read() ?? EMPTY); } catch { /* an adapter that throws keeps what we have */ }
    };
    read();
    return storage.subscribe?.(read);
  }, [custom, storageKey]);

  const commit = useCallback((next: CommandFrecencyEntries) => {
    latest.current = next;
    setEntries(next);
    try { storageRef.current?.write(next); } catch { /* the ranking still works for this page */ }
  }, []);

  const record = useCallback((id: string) => commit(recordCommandUse(latest.current, id, Date.now(), { halfLife, max })), [commit, halfLife, max]);
  const reset = useCallback((id?: string) => {
    if (id === undefined) { commit(EMPTY); return; }
    if (!(id in latest.current)) return;
    const next = { ...latest.current };
    delete next[id];
    commit(next);
  }, [commit]);

  return useMemo<CommandFrecency>(() => ({
    entries,
    record,
    reset,
    score: (id) => commandFrecencyScore(entries[id], Date.now(), halfLife),
    recent: (items, limit = 5) => items
      .filter((item) => entries[item.id] !== undefined)
      .sort((a, b) => entries[b.id]!.last - entries[a.id]!.last)
      .slice(0, Math.max(0, limit)),
  }), [entries, record, reset, halfLife]);
}

/** One default adapter per key, so the hook's ref compares equal across renders. */
const defaults = new Map<string, CommandFrecencyStorage>();
function defaultStorage(key: string): CommandFrecencyStorage {
  let storage = defaults.get(key);
  if (!storage) { storage = localCommandFrecencyStorage(key); defaults.set(key, storage); }
  return storage;
}
