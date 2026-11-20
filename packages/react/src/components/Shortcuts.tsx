"use client";

import { forwardRef, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode, RefObject } from 'react';
import { ariaKeyShortcutsFor, useKbdPlatform } from './Kbd.js';
import type { KbdPlatform } from './Kbd.js';
import {
  ShortcutRegistryContext, ShortcutScopeContext, useShortcutKeys, useShortcutRegistryInstance, useShortcutSnapshot,
} from '../shortcut-hooks.js';
import {
  DEFAULT_SEQUENCE_TIMEOUT_MS, SHORTCUT_PREFERENCES_CHANGE_EVENT, ShortcutRegistry, readShortcutPreferences, writeShortcutPreferences,
} from '../shortcut-registry.js';
import type { ShortcutDefinition, ShortcutPreferencesChangeDetail, ShortcutScopeRef, ShortcutSheetGroup } from '../shortcut-registry.js';
import {
  DEFAULT_SHORTCUT_PREFERENCES, SHORTCUT_PREFERENCES_STORAGE_KEY, formatShortcut, parseShortcut,
} from '../shortcut-model.js';
import type {
  CharacterKeyPreference, KeySequence, ShortcutBinding, ShortcutConflict, ShortcutPreferenceValues,
} from '../shortcut-model.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const mergeDefaults = (defaults?: Partial<ShortcutPreferenceValues>): ShortcutPreferenceValues => ({
  characterKeys: defaults?.characterKeys ?? DEFAULT_SHORTCUT_PREFERENCES.characterKeys,
  overrides: { ...DEFAULT_SHORTCUT_PREFERENCES.overrides, ...defaults?.overrides },
});

/** A remap as stored: the binding's string form, `null` (off), or `undefined` (back to the default); `false` when it is not a binding. */
const storedOverride = (keys: ShortcutBinding | null | undefined): string | null | undefined | false => {
  if (keys === null || keys === undefined) return keys;
  const sequence = parseShortcut(keys);
  return sequence ? formatShortcut(sequence) : false;
};

export interface UseShortcutPreferencesOptions {
  /** `localStorage` key. Default `SHORTCUT_PREFERENCES_STORAGE_KEY`; `null` keeps the choices in memory only. */
  storageKey?: string | null;
  /** Your defaults for anything not stored yet, e.g. `{ characterKeys: 'off' }` for a speech-input deployment. */
  defaults?: Partial<ShortcutPreferenceValues>;
}

export interface UseShortcutPreferencesResult {
  preferences: ShortcutPreferenceValues;
  setPreferences: (next: ShortcutPreferenceValues) => void;
  /** The character-key switch (WCAG 2.1.4). */
  setCharacterKeys: (value: CharacterKeyPreference) => void;
  /** Remap a shortcut (`'Alt+A'`), turn it off (`null`) or give it back its default keys (`undefined`). Returns `false` when `keys` is not a binding. */
  setOverride: (id: string, keys: ShortcutBinding | null | undefined) => boolean;
  resetOverrides: () => void;
}

/**
 * The shortcut preferences, stored the way the display preferences are (HAR-1372): in
 * `localStorage`, kept in step with other tabs and with other users of the hook in this tab. The
 * server and the first render see `defaults`; the stored choice arrives before the first paint.
 * A `ShortcutProvider` uses it for you; use it yourself for a settings page, or to keep the
 * choices on the server per user (read them here, pass them to the provider's `preferences`).
 */
export function useShortcutPreferences({ storageKey = SHORTCUT_PREFERENCES_STORAGE_KEY, defaults: defaultOverrides }: UseShortcutPreferencesOptions = {}): UseShortcutPreferencesResult {
  const defaults = mergeDefaults(defaultOverrides);
  const defaultsKey = JSON.stringify(defaults);
  const [preferences, setState] = useState<ShortcutPreferenceValues>(defaults);
  const latest = useRef(preferences);
  latest.current = preferences;

  useIsomorphicLayoutEffect(() => {
    if (storageKey) setState(readShortcutPreferences(storageKey, JSON.parse(defaultsKey)));
  }, [storageKey, defaultsKey]);

  useEffect(() => {
    if (!storageKey) return undefined;
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) setState(readShortcutPreferences(storageKey, JSON.parse(defaultsKey))); };
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ShortcutPreferencesChangeDetail>).detail;
      if (detail?.storageKey === storageKey) setState(detail.value);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SHORTCUT_PREFERENCES_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SHORTCUT_PREFERENCES_CHANGE_EVENT, onChange);
    };
  }, [storageKey, defaultsKey]);

  const setPreferences = useCallback((next: ShortcutPreferenceValues) => {
    latest.current = next;
    setState(next);
    if (storageKey) writeShortcutPreferences(storageKey, next);
  }, [storageKey]);
  const setCharacterKeys = useCallback((value: CharacterKeyPreference) => setPreferences({ ...latest.current, characterKeys: value }), [setPreferences]);
  const setOverride = useCallback((id: string, keys: ShortcutBinding | null | undefined) => {
    const value = storedOverride(keys);
    if (value === false) return false;
    const overrides = { ...latest.current.overrides };
    if (value === undefined) delete overrides[id];
    else overrides[id] = value;
    setPreferences({ ...latest.current, overrides });
    return true;
  }, [setPreferences]);
  const resetOverrides = useCallback(() => setPreferences({ ...latest.current, overrides: {} }), [setPreferences]);
  return { preferences, setPreferences, setCharacterKeys, setOverride, resetOverrides };
}

export interface ShortcutProviderProps {
  children?: ReactNode;
  /** Controlled preferences (e.g. kept on the server per user). Pair with `onPreferencesChange`. Default: `useShortcutPreferences` under `storageKey`. */
  preferences?: ShortcutPreferenceValues;
  /** Called with new preferences when the sheet's switch or `useShortcuts()` changes them. */
  onPreferencesChange?: (next: ShortcutPreferenceValues) => void;
  /** Where uncontrolled preferences are kept. Default `SHORTCUT_PREFERENCES_STORAGE_KEY`; `null`: in memory only. */
  storageKey?: string | null;
  /** Defaults for preferences not stored yet. */
  defaultPreferences?: Partial<ShortcutPreferenceValues>;
  /** Fix the platform for `Mod` (tests, docs). Default: detected. */
  platform?: KbdPlatform;
  /** How long the next key of a sequence (G then I) may take, in ms. Default 1500. */
  sequenceTimeout?: number;
  /**
   * New conflicts (two shortcuts in one scope with the same keys, or one starting the other), once
   * each. Default: a `console.warn` in development. In a test, collect or throw:
   * `onConflict={(c) => { throw new Error(c.ids.join(' vs ')); }}`.
   */
  onConflict?: (conflict: ShortcutConflict) => void;
}

/**
 * The shortcut registry for an app (enterprise UX study, roadmap #1): one keydown listener on the
 * document, the person's preferences (the character-key switch and remaps, stored like the display
 * preferences), conflict warnings, and the source `KbdCombo`, `ShortcutHint`, `Menu`, `Tooltip`,
 * `CommandPalette` and `ShortcutSheet` read keys from. Mount it once near the root; a provider
 * inside another one uses the outer registry. Without any provider, `useShortcut` still works on
 * the document's default registry with the default storage key.
 */
export function ShortcutProvider(props: ShortcutProviderProps) {
  const parent = useContext(ShortcutRegistryContext);
  if (parent) return <>{props.children}</>;
  return <RootShortcutProvider {...props} />;
}

function RootShortcutProvider({
  children, preferences: controlledPreferences, onPreferencesChange, storageKey = SHORTCUT_PREFERENCES_STORAGE_KEY, defaultPreferences,
  platform, sequenceTimeout = DEFAULT_SEQUENCE_TIMEOUT_MS, onConflict,
}: ShortcutProviderProps) {
  const stored = useShortcutPreferences({ storageKey: controlledPreferences ? null : storageKey, defaults: defaultPreferences });
  const preferences = controlledPreferences ?? stored.preferences;
  const [registry] = useState(() => new ShortcutRegistry({ preferences, platform, sequenceTimeout }));
  const change = useRef<(next: ShortcutPreferenceValues) => void>(() => {});
  change.current = (next) => {
    if (!controlledPreferences) stored.setPreferences(next);
    onPreferencesChange?.(next);
  };
  useIsomorphicLayoutEffect(() => {
    registry.configure({ preferences, platform, sequenceTimeout, onConflict, onPreferencesChange: (next) => change.current(next) });
  });
  useEffect(() => registry.attach(document), [registry]);
  return <ShortcutRegistryContext.Provider value={registry}>{children}</ShortcutRegistryContext.Provider>;
}

export interface ShortcutScopeProps extends HTMLAttributes<HTMLDivElement> {
  /** The scope's heading in the shortcut sheet, e.g. "Ticket list" or "Reply". */
  label: string;
  children?: ReactNode;
}

/**
 * A region whose shortcuts work only while focus is inside it (a list, a panel, a dialog's body):
 * the "active only on focus" condition of WCAG 2.1.4, so its single-key verbs need no global switch
 * to comply (the switch still turns them off). Every `useShortcut` below it belongs to it. An inner
 * scope's shortcut wins over an outer one's or a global one with the same keys; the sheet lists a
 * scope's shortcuts only while focus is inside it. Renders a `div` (style it as you would).
 */
export const ShortcutScope = forwardRef<HTMLDivElement, ShortcutScopeProps>(function ShortcutScope({ label, children, ...props }, forwarded) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scope = useMemo<ShortcutScopeRef>(() => ({ element: () => ref.current, label }), [label]);
  const setRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    if (typeof forwarded === 'function') forwarded(node);
    else if (forwarded) forwarded.current = node;
  }, [forwarded]);
  return (
    <ShortcutScopeContext.Provider value={scope}>
      <div ref={setRef} data-uix-shortcut-scope="" {...props}>{children}</div>
    </ShortcutScopeContext.Provider>
  );
});

export interface UseShortcutOptions extends ShortcutDefinition {
  /**
   * Where it works: default the surrounding `ShortcutScope` (everywhere outside one); a ref to
   * scope it to that element (focus inside it); `'global'` for everywhere even inside a scope.
   */
  scope?: RefObject<Element | null> | 'global';
  /** The sheet heading for a `scope` ref. */
  scopeLabel?: string;
}

export interface UseShortcutResult {
  /** The keys it answers to now (after remaps and the character-key switch), `null` while off. */
  keys: KeySequence | null;
  /** For your control's `aria-keyshortcuts` (a chord; `undefined` for a sequence or while off). */
  ariaKeyShortcuts: string | undefined;
}

/**
 * Bind a shortcut while the component is mounted. The handler runs on the keys, unless focus is in
 * a text field or a contenteditable (`allowInInputs`), a modal dialog outside its scope is open
 * (`allowInModal`), an IME is composing, or a menu or listbox has focus (character keys). The
 * person's remap and the character-key switch apply; every hint that names the same `id` shows
 * the same keys. Returns the keys for your own hint.
 */
export function useShortcut(options: UseShortcutOptions): UseShortcutResult {
  const registry = useShortcutRegistryInstance();
  const contextScope = useContext(ShortcutScopeContext);
  const latest = useRef(options);
  latest.current = options;
  const { id, scope: scopeOption, scopeLabel, label, group, enabled, hidden } = options;
  const keysKey = typeof options.keys === 'string' ? options.keys : JSON.stringify(options.keys);
  const scope = useMemo<ShortcutScopeRef | null>(() => {
    if (scopeOption === 'global') return null;
    if (scopeOption) return { element: () => scopeOption.current, label: scopeLabel };
    return contextScope;
  }, [scopeOption, scopeLabel, contextScope]);
  useEffect(() => {
    if (!registry) return undefined;
    return registry.register(() => latest.current, scope);
    // The definition is read live through `latest`; these re-register so hints and the sheet update.
  }, [registry, scope, id, keysKey, label, group, enabled, hidden]);
  // The keys at the shortcut's own scope (none for a scope that is not mounted).
  const keys = useShortcutKeys(id, scope ? scope.element : undefined);
  const platform = useKbdPlatform();
  return { keys, ariaKeyShortcuts: ariaKeyShortcutsFor(keys, platform) };
}

export interface ShortcutsApi {
  preferences: ShortcutPreferenceValues;
  /** The chords of a sequence typed so far (G, waiting for I), else `null`: show it as a pending hint. */
  pending: KeySequence | null;
  setCharacterKeys: (value: CharacterKeyPreference) => void;
  /** Remap a shortcut (`'Alt+A'`), turn it off (`null`) or give it back its default (`undefined`). Returns `false` when `keys` is not a binding. */
  setOverride: (id: string, keys: ShortcutBinding | null | undefined) => boolean;
  resetOverrides: () => void;
  /** The keys a command has at `near` (default: the focused element): a scoped command has none outside its scope. */
  keysFor: (id: string, near?: Element | null) => KeySequence | null;
  /** Whether a command is registered and enabled (its keys may be off). */
  has: (id: string) => boolean;
  /** Run a command as if its keys were pressed: the modifier path for every single-key verb (palette, menu). */
  run: (id: string) => boolean;
  /** What would fire with focus on `target` (default: the focused element), grouped by scope. */
  active: (target?: Element | null) => ShortcutSheetGroup[];
  /** The conflicts registered now. */
  conflicts: () => ShortcutConflict[];
}

const SERVER_API: ShortcutsApi = {
  preferences: DEFAULT_SHORTCUT_PREFERENCES, pending: null, setCharacterKeys: () => {}, setOverride: () => false, resetOverrides: () => {},
  keysFor: () => null, has: () => false, run: () => false, active: () => [], conflicts: () => [],
};

/** The registry in force here (the provider's, else the document's default), re-rendering on every change. */
export function useShortcuts(): ShortcutsApi {
  const registry = useShortcutRegistryInstance();
  const snapshot = useShortcutSnapshot(registry);
  return useMemo<ShortcutsApi>(() => {
    if (!registry) return SERVER_API;
    return {
      preferences: snapshot.preferences,
      pending: snapshot.pending,
      setCharacterKeys: (value) => registry.setCharacterKeys(value),
      setOverride: (id, keys) => {
        const value = storedOverride(keys);
        if (value === false) return false;
        registry.setOverride(id, value);
        return true;
      },
      resetOverrides: () => registry.resetOverrides(),
      keysFor: (id, near) => registry.keysFor(id, near === undefined ? (typeof document === 'undefined' ? null : document.activeElement) : near),
      has: (id) => registry.has(id),
      run: (id) => registry.run(id),
      active: (target) => registry.active(target),
      conflicts: () => registry.conflicts(),
    };
  }, [registry, snapshot]);
}
