/* The shortcut registry (enterprise UX study, roadmap #1; spec Docs/specs/2026-11-20-shortcut-registry.md):
 * every shortcut on a page, one keydown listener on the document, and the person's preferences.
 * Framework-free; components/Shortcuts.tsx is its React face. */
import type { KbdPlatform } from './components/Kbd.js';
import {
  DEFAULT_SHORTCUT_PREFERENCES, SHORTCUT_PREFERENCES_STORAGE_KEY, effectiveShortcut, findShortcutConflicts, isCharacterKeyShortcut,
  isModifierKeyEvent, isTypingTarget, matchesChord, parseShortcutPreferences,
} from './shortcut-model.js';
import type { KeySequence, ShortcutBinding, ShortcutConflict, ShortcutPreferenceValues } from './shortcut-model.js';

/** How long the next key of a sequence (G then I) may take. No source names a value; GitHub's is 1.5 s. */
export const DEFAULT_SEQUENCE_TIMEOUT_MS = 1500;

/** One shortcut, as `useShortcut` registers it. */
export interface ShortcutDefinition {
  /** The command's stable id, e.g. `ticket.assign`. Remaps, hints and the palette find it by this id. */
  id: string;
  /** The default keys; a remap in the preferences replaces them. */
  keys: ShortcutBinding;
  /** What it does, for the shortcut sheet and the palette, e.g. "Assign to me". */
  label: string;
  /** Runs on the keys (with the keydown) or from the palette (`run`, with `null`). Return `false` to leave the key to the next match or the browser. */
  handler?: (event: KeyboardEvent | null) => void | boolean;
  /** A heading inside the scope's part of the sheet, e.g. "Navigation". */
  group?: string;
  /** `false`: registered and listed nowhere, fires never. Default `true`. */
  enabled?: boolean;
  /** Fire while typing in a field or a contenteditable too. Default `false`; mostly for a chord with Mod. */
  allowInInputs?: boolean;
  /** Fire while a modal dialog outside the shortcut's scope is open (e.g. Mod+K that also closes the palette). Default `false`. */
  allowInModal?: boolean;
  /** Fire again while the key is held. Default `false`. */
  repeat?: boolean;
  /** Not in the shortcut sheet (it still fires and still shows in its hints). */
  hidden?: boolean;
  /** An extra check on each keydown; `false` leaves the key alone. */
  when?: (event: KeyboardEvent) => boolean;
}

/** Where a shortcut is active: everywhere (`null`), or while focus is inside `element()`. */
export interface ShortcutScopeRef {
  element: () => Element | null;
  /** The scope's heading in the sheet, e.g. "Ticket list". */
  label?: string;
}

interface Entry {
  token: number;
  get: () => ShortcutDefinition;
  scope: ShortcutScopeRef | null;
}

/** One part of the shortcut sheet: a scope and what is active in it. */
export interface ShortcutSheetGroup {
  /** `null` for the shortcuts that work everywhere. */
  scope: string | null;
  shortcuts: { id: string; label: string; group?: string; keys: KeySequence }[];
}

export interface ShortcutRegistryConfig {
  preferences: ShortcutPreferenceValues;
  /** Called with new preferences when `setCharacterKeys` / `setOverride` asks for them. */
  onPreferencesChange: (next: ShortcutPreferenceValues) => void;
  platform?: KbdPlatform;
  sequenceTimeout: number;
  /** New conflicts, once each. Default: a development-only `console.warn`. */
  onConflict?: (conflict: ShortcutConflict) => void;
}

export interface ShortcutRegistrySnapshot {
  version: number;
  preferences: ShortcutPreferenceValues;
  /** The chords of a sequence typed so far (G, waiting for I), else `null`. */
  pending: KeySequence | null;
}

const detectPlatform = (): KbdPlatform => {
  if (typeof navigator === 'undefined') return 'other';
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform ?? navigator.platform ?? '') ? 'mac' : 'other';
};

// Bundlers substitute the literal `process.env.NODE_ENV`; the typeof guard keeps un-bundled ESM safe.
declare const process: { env: { NODE_ENV?: string } } | undefined;
const isDev = () => typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

const warnConflict = (conflict: ShortcutConflict) => {
  if (!isDev()) return;
  const where = typeof conflict.scope === 'string' ? ` in "${conflict.scope}"` : conflict.scope ? ' in one scope' : '';
  // eslint-disable-next-line no-console
  console.warn(`[UIx shortcuts] "${conflict.ids[0]}" (${conflict.keys[0]}) and "${conflict.ids[1]}" (${conflict.keys[1]}) ${conflict.kind === 'same' ? 'use the same keys' : 'overlap: one starts the other'}${where} on ${conflict.platform === 'mac' ? 'macOS' : 'Windows and Linux'}. Only one can fire.`);
};

const MENU = '[role="menu"], [role="menubar"], [role="listbox"], [role="tree"]';

const isModal = (dialog: Element) => {
  try { return dialog.matches(':modal'); } catch { return true; }
};
const topModal = (doc: Document): Element | null => {
  const open = Array.from(doc.querySelectorAll('dialog[open]')).filter(isModal);
  return open[open.length - 1] ?? null;
};

const eventTarget = (event: KeyboardEvent): Element | null => {
  const first = typeof event.composedPath === 'function' ? event.composedPath()[0] : null;
  const node = (first ?? event.target) as Node | null;
  return node && node.nodeType === 1 ? node as Element : (node?.parentElement ?? null);
};

/** How deep an element sits, to order scopes innermost first. */
const depth = (el: Element) => { let d = 0; for (let n: Node | null = el; n; n = n.parentNode) d += 1; return d; };

/**
 * The registry: what is registered, what the person chose, the one keydown listener. Create one
 * per document with `createShortcutRegistry`, or let `useShortcut` use the document's default one.
 */
export class ShortcutRegistry {
  private entries: Entry[] = [];
  private nextToken = 1;
  private listeners = new Set<() => void>();
  private snapshot: ShortcutRegistrySnapshot;
  private config: ShortcutRegistryConfig;
  private pendingState: { step: number; tokens: Set<number>; timer: ReturnType<typeof setTimeout> } | null = null;
  private reported = new Set<string>();
  private conflictCheck: ReturnType<typeof setTimeout> | null = null;
  private detach: (() => void) | null = null;
  /** Preferences asked for and not yet handed back through `configure`: two changes in one tick build on each other. */
  private requested: ShortcutPreferenceValues | null = null;

  constructor(config: Partial<ShortcutRegistryConfig> = {}) {
    this.config = {
      preferences: DEFAULT_SHORTCUT_PREFERENCES, onPreferencesChange: () => {}, sequenceTimeout: DEFAULT_SEQUENCE_TIMEOUT_MS, ...config,
    };
    this.snapshot = { version: 0, preferences: this.config.preferences, pending: null };
  }

  /** Change the configuration (the provider does on every render). Notifies when the preferences changed. */
  configure(config: Partial<ShortcutRegistryConfig>) {
    const before = this.config.preferences;
    this.config = { ...this.config, ...config };
    if (config.preferences) this.requested = null;
    if (config.preferences && config.preferences !== before) this.changed();
  }

  get platform(): KbdPlatform { return this.config.platform ?? detectPlatform(); }
  /** The platform the provider fixed (tests, docs), else `undefined` (detected). */
  get fixedPlatform(): KbdPlatform | undefined { return this.config.platform; }
  get preferences(): ShortcutPreferenceValues { return this.config.preferences; }

  // —— subscription (useSyncExternalStore)
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = () => this.snapshot;

  private changed(pending: KeySequence | null = this.snapshot.pending) {
    this.snapshot = { version: this.snapshot.version + 1, preferences: this.config.preferences, pending };
    for (const listener of [...this.listeners]) listener();
    this.scheduleConflictCheck();
  }

  // —— registration
  /** Register a shortcut; returns the cleanup. `get` is read on every key press, so the latest handler runs. */
  register(get: () => ShortcutDefinition, scope: ShortcutScopeRef | null = null): () => void {
    const entry: Entry = { token: this.nextToken++, get, scope };
    this.entries.push(entry);
    this.changed();
    return () => {
      const at = this.entries.indexOf(entry);
      if (at < 0) return;
      this.entries.splice(at, 1);
      this.changed();
    };
  }

  /** Listen on a document (once). Returns the detach; the default registry attaches itself. */
  attach(doc: Document): () => void {
    this.detach?.();
    const onKey = (event: Event) => this.dispatch(event as KeyboardEvent);
    doc.addEventListener('keydown', onKey);
    const detach = () => { doc.removeEventListener('keydown', onKey); if (this.detach === detach) this.detach = null; this.clearPending(); };
    this.detach = detach;
    return detach;
  }

  get attached() { return this.detach != null; }
  get size() { return this.entries.length; }

  // —— what is bound
  private keysOf(entry: Entry): KeySequence | null {
    const def = entry.get();
    if (def.enabled === false) return null;
    return effectiveShortcut(def.id, def.keys, this.config.preferences);
  }

  /**
   * The keys a command answers to now, after remaps and the character-key switch, or `null` when
   * nothing registered under that id fires. With several registrations, the one whose scope holds
   * `near` (default: the focused element), else the latest.
   */
  keysFor(id: string, near?: Element | null): KeySequence | null {
    const entry = this.pick(id, near);
    return entry ? this.keysOf(entry) : null;
  }

  /** Whether a command with this id is registered and enabled (its keys may still be off). */
  has(id: string): boolean {
    return this.entries.some((entry) => { const def = entry.get(); return def.id === id && def.enabled !== false; });
  }

  private pick(id: string, near?: Element | null): Entry | null {
    const matches = this.entries.filter((entry) => { const def = entry.get(); return def.id === id && def.enabled !== false; });
    if (!matches.length) return null;
    const focus = near ?? (typeof document !== 'undefined' ? document.activeElement : null);
    const inScope = focus ? matches.filter((entry) => entry.scope?.element()?.contains(focus)) : [];
    return (inScope.length ? inScope : matches)[(inScope.length ? inScope : matches).length - 1];
  }

  /** Run a command as if its keys were pressed (the palette's modifier path). `false` when none is registered or it declined. */
  run(id: string): boolean {
    const entry = this.pick(id);
    if (!entry) return false;
    const def = entry.get();
    return def.handler ? def.handler(null) !== false : false;
  }

  /**
   * What the shortcut sheet lists: the shortcuts that would fire with focus on `target` (default:
   * the focused element), grouped by scope, everywhere first then outermost to innermost.
   * Turned off, remapped to nothing, disabled, hidden or in a scope focus is not in: left out.
   */
  active(target?: Element | null): ShortcutSheetGroup[] {
    const focus = target ?? (typeof document !== 'undefined' ? document.activeElement : null);
    const groups = new Map<Element | null, { label: string | null; items: Map<string, ShortcutSheetGroup['shortcuts'][number]> }>();
    for (const entry of this.entries) {
      const def = entry.get();
      if (def.hidden) continue;
      const keys = this.keysOf(entry);
      if (!keys) continue;
      let el: Element | null = null;
      if (entry.scope) {
        el = entry.scope.element();
        if (!el || !focus || !el.contains(focus)) continue;
      }
      let group = groups.get(el);
      if (!group) { group = { label: entry.scope?.label ?? null, items: new Map() }; groups.set(el, group); }
      if (!group.label && entry.scope?.label) group.label = entry.scope.label;
      group.items.set(def.id, { id: def.id, label: def.label, group: def.group, keys });
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a ? depth(a) : 0) - (b ? depth(b) : 0))
      .map(([el, group]) => ({ scope: el ? group.label ?? '' : null, shortcuts: [...group.items.values()] }));
  }

  /** The conflicts among what is registered now, on this platform. */
  conflicts(): ShortcutConflict[] {
    const live = this.entries.flatMap((entry) => {
      const keys = this.keysOf(entry);
      if (!keys) return [];
      const scope = entry.scope ? entry.scope.element() : null;
      if (entry.scope && !scope) return [];
      return [{ id: entry.get().id, keys, scope }];
    });
    return findShortcutConflicts(live, { platform: this.platform }).map((conflict) => {
      const label = (conflict.scope && this.entries.find((entry) => entry.scope?.element() === conflict.scope)?.scope?.label) || conflict.scope;
      return { ...conflict, scope: label };
    });
  }

  private scheduleConflictCheck() {
    if (this.conflictCheck != null || typeof setTimeout === 'undefined') return;
    // After the commit that registered them: a scope's element is attached by then.
    this.conflictCheck = setTimeout(() => {
      this.conflictCheck = null;
      const report = this.config.onConflict ?? warnConflict;
      for (const conflict of this.conflicts()) {
        const tag = `${conflict.ids.slice().sort().join('\u0000')}\u0000${conflict.kind}\u0000${String(conflict.scope)}`;
        if (this.reported.has(tag)) continue;
        this.reported.add(tag);
        report(conflict);
      }
    }, 0);
  }

  // —— preferences
  setPreferences(next: ShortcutPreferenceValues) {
    this.requested = next;
    this.config.onPreferencesChange(next);
  }
  /** The preferences a change builds on: the last one asked for in this tick, else the ones in force. */
  private get base(): ShortcutPreferenceValues { return this.requested ?? this.config.preferences; }
  setCharacterKeys(value: 'on' | 'off') { this.setPreferences({ ...this.base, characterKeys: value }); }
  /** Remap a command (`'Alt+A'`), turn its keys off (`null`) or go back to its default (`undefined`). */
  setOverride(id: string, keys: string | null | undefined) {
    const overrides = { ...this.base.overrides };
    if (keys === undefined) delete overrides[id];
    else overrides[id] = keys;
    this.setPreferences({ ...this.base, overrides });
  }
  resetOverrides() { this.setPreferences({ ...this.base, overrides: {} }); }

  // —— the key press
  private clearPending() {
    if (!this.pendingState) return;
    clearTimeout(this.pendingState.timer);
    this.pendingState = null;
    this.changed(null);
  }

  /** The shortcuts this keydown may reach, innermost scope first, the latest registration first within one. */
  private candidates(event: KeyboardEvent, target: Element | null): { entry: Entry; def: ShortcutDefinition; keys: KeySequence }[] {
    const doc = target?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
    const modal = doc ? topModal(doc) : null;
    const typing = isTypingTarget(target);
    const menu = target?.closest?.(MENU) ?? null;
    const out: { entry: Entry; def: ShortcutDefinition; keys: KeySequence; rank: number }[] = [];
    this.entries.forEach((entry, index) => {
      const def = entry.get();
      if (def.enabled === false || !def.handler) return;
      const keys = this.keysOf(entry);
      if (!keys) return;
      let scopeEl: Element | null = null;
      if (entry.scope) {
        scopeEl = entry.scope.element();
        if (!scopeEl || !target || !scopeEl.contains(target)) return;
      }
      if (event.repeat && !def.repeat) return;
      if (typing && !def.allowInInputs) return;
      if (modal && !def.allowInModal && !(scopeEl && modal.contains(scopeEl))) return;
      // An open menu or listbox types ahead with character keys: not a shortcut, unless it is the scope's own.
      if (menu && isCharacterKeyShortcut(keys) && !(scopeEl && scopeEl.contains(menu))) return;
      if (def.when && !def.when(event)) return;
      out.push({ entry, def, keys, rank: (scopeEl ? depth(scopeEl) : 0) * 1e6 + index });
    });
    return out.sort((a, b) => b.rank - a.rank);
  }

  private fire(found: { def: ShortcutDefinition }[], event: KeyboardEvent): boolean {
    for (const { def } of found) {
      if (def.handler?.(event) === false) continue;
      event.preventDefault();
      return true;
    }
    return false;
  }

  /** Handle one keydown (the attached listener calls this). Returns whether a shortcut took it. */
  dispatch(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) { this.clearPending(); return false; }
    if (isModifierKeyEvent(event)) return false;
    const target = eventTarget(event);
    const platform = this.platform;
    const all = this.candidates(event, target);

    const pending = this.pendingState;
    if (pending) {
      const step = pending.step;
      const next = all.filter(({ entry, keys }) => pending.tokens.has(entry.token) && keys.length > step && matchesChord(event, keys[step], platform));
      clearTimeout(pending.timer);
      this.pendingState = null;
      const complete = next.filter(({ keys }) => keys.length === step + 1);
      if (complete.length && this.fire(complete, event)) { this.changed(null); return true; }
      const longer = next.filter(({ keys }) => keys.length > step + 1);
      if (longer.length) { event.preventDefault(); this.startPending(longer, step + 1); return true; }
      this.changed(null);
      // Not the sequence's next key: the press counts on its own.
    }

    const first = all.filter(({ keys }) => matchesChord(event, keys[0], platform));
    if (!first.length) return false;
    const single = first.filter(({ keys }) => keys.length === 1);
    if (single.length && this.fire(single, event)) return true;
    const sequences = first.filter(({ keys }) => keys.length > 1);
    if (!sequences.length) return false;
    event.preventDefault();
    this.startPending(sequences, 1);
    return true;
  }

  private startPending(found: { entry: Entry; keys: KeySequence }[], step: number) {
    const timer = setTimeout(() => this.clearPending(), this.config.sequenceTimeout);
    this.pendingState = { step, tokens: new Set(found.map(({ entry }) => entry.token)), timer };
    this.changed(found[0].keys.slice(0, step));
  }
}

/** A registry of your own (tests, an isolated widget); `ShortcutProvider` makes one for its subtree. */
export function createShortcutRegistry(config: Partial<ShortcutRegistryConfig> = {}): ShortcutRegistry {
  return new ShortcutRegistry(config);
}

/** Same-tab notice between preference writers (the `storage` event only reaches other tabs); it carries the new values. */
export const SHORTCUT_PREFERENCES_CHANGE_EVENT = 'uixshortcutpreferencechange';
export interface ShortcutPreferencesChangeDetail { storageKey: string; value: ShortcutPreferenceValues }

/** Write preferences under a key and tell the tab. Never throws (private mode, blocked storage). */
export function writeShortcutPreferences(storageKey: string, value: ShortcutPreferenceValues) {
  try { window.localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* private mode */ }
  try {
    window.dispatchEvent(new window.CustomEvent<ShortcutPreferencesChangeDetail>(SHORTCUT_PREFERENCES_CHANGE_EVENT, { detail: { storageKey, value } }));
  } catch { /* no window */ }
}

export function readShortcutPreferences(storageKey: string, defaults: ShortcutPreferenceValues = DEFAULT_SHORTCUT_PREFERENCES): ShortcutPreferenceValues {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(storageKey); } catch { /* private mode */ }
  return parseShortcutPreferences(raw, defaults);
}

const defaults = new WeakMap<Document, ShortcutRegistry>();

/**
 * The document's default registry, used by `useShortcut` and friends outside a `ShortcutProvider`:
 * created on first use, with the preferences under `SHORTCUT_PREFERENCES_STORAGE_KEY` (kept in step
 * with other tabs and with `useShortcutPreferences` in this one), listening on the document from
 * then on. Internal.
 */
export function defaultShortcutRegistry(doc: Document): ShortcutRegistry {
  const existing = defaults.get(doc);
  if (existing) return existing;
  const key = SHORTCUT_PREFERENCES_STORAGE_KEY;
  const registry = new ShortcutRegistry({ preferences: readShortcutPreferences(key) });
  registry.configure({ onPreferencesChange: (next) => { registry.configure({ preferences: next }); writeShortcutPreferences(key, next); } });
  const view = doc.defaultView;
  view?.addEventListener(SHORTCUT_PREFERENCES_CHANGE_EVENT, (event: Event) => {
    const detail = (event as CustomEvent<ShortcutPreferencesChangeDetail>).detail;
    if (detail?.storageKey === key) registry.configure({ preferences: detail.value });
  });
  view?.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === key) registry.configure({ preferences: readShortcutPreferences(key) });
  });
  registry.attach(doc);
  defaults.set(doc, registry);
  return registry;
}
