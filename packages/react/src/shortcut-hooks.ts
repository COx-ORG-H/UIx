"use client";

/* The registry lookups every display component shares (KbdCombo, ShortcutHint, Menu, Tooltip,
 * CommandPalette): which registry is in force here and what keys a command has now. Kept apart from
 * components/Shortcuts.tsx so Kbd.tsx can read the registry without importing the sheet. */
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { DEFAULT_SHORTCUT_PREFERENCES } from './shortcut-model.js';
import type { KeySequence } from './shortcut-model.js';
import type { KeyShortcut } from './components/Kbd.js';
import { defaultShortcutRegistry } from './shortcut-registry.js';
import type { ShortcutRegistry, ShortcutRegistrySnapshot, ShortcutScopeRef } from './shortcut-registry.js';

/** The `ShortcutProvider`'s registry; `null` outside one. Internal. */
export const ShortcutRegistryContext = createContext<ShortcutRegistry | null>(null);
/** The nearest `ShortcutScope`; `null` outside one (global). Internal. */
export const ShortcutScopeContext = createContext<ShortcutScopeRef | null>(null);

const EMPTY: ShortcutRegistrySnapshot = { version: -1, preferences: DEFAULT_SHORTCUT_PREFERENCES, pending: null };
const noSubscription = () => () => {};
const emptySnapshot = () => EMPTY;

/** The provider's registry, else the document's default one; `null` on the server. Internal. */
export function useShortcutRegistryInstance(): ShortcutRegistry | null {
  const own = useContext(ShortcutRegistryContext);
  // Outside a provider: the document's default registry, made on first use (none on a server).
  const [fallback] = useState(() => (own || typeof document === 'undefined' ? null : defaultShortcutRegistry(document)));
  return own ?? fallback ?? (typeof document === 'undefined' ? null : defaultShortcutRegistry(document));
}

/** Re-render on every registry change. The server and the hydrating render see an empty registry. Internal. */
export function useShortcutSnapshot(registry: ShortcutRegistry | null): ShortcutRegistrySnapshot {
  return useSyncExternalStore(registry ? registry.subscribe : noSubscription, registry ? registry.getSnapshot : emptySnapshot, emptySnapshot);
}

/**
 * The keys a registered command answers to now, after the person's remaps and the character-key
 * switch: `null` when nothing under that id is registered and active (so a hint for a switched-off
 * key disappears with the key). Use it to show a command's keys in your own UI.
 */
export function useShortcutKeys(id: string | null | undefined): KeySequence | null {
  const registry = useShortcutRegistryInstance();
  const snapshot = useShortcutSnapshot(registry);
  return useMemo(() => (registry && id && snapshot.version >= 0 ? registry.keysFor(id) : null), [registry, id, snapshot]);
}

/**
 * The keys a display shows: the registry's for `shortcutId` (nothing when that command is not
 * active), else the literal `keys`. Internal.
 */
export function useDisplayedShortcut(keys: KeyShortcut | KeySequence | null | undefined, shortcutId?: string | null): KeySequence | null {
  const bound = useShortcutKeys(shortcutId);
  if (shortcutId) return bound;
  return toSequence(keys);
}

/** A chord or a sequence as a sequence; `null` for nothing. Internal. */
export function toSequence(keys: KeyShortcut | KeySequence | null | undefined): KeySequence | null {
  if (!keys || keys.length === 0) return null;
  if (keys.every((part) => typeof part === 'string')) return [keys as KeyShortcut];
  if (keys.every((part) => Array.isArray(part) && part.length > 0)) return keys as KeySequence;
  return null;
}
