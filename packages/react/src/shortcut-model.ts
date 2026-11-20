/* The shortcut registry's pure half (enterprise UX study, roadmap #1; spec
 * Docs/specs/2026-11-20-shortcut-registry.md): how a binding is written and read, whether a
 * keydown is that binding on this platform, which bindings are character-key shortcuts
 * (WCAG 2.1.4), which collide, whether a key press happens while typing, and the stored
 * preferences (the character-key switch and remaps). Framework-free; the registry
 * (shortcut-registry.ts) and the React layer (components/Shortcuts.tsx) share it. */
import type { KbdPlatform, KeyShortcut } from './components/Kbd.js';

/** Chords pressed one after another, e.g. `[['G'], ['I']]` (G then I). A one-chord sequence is a plain shortcut. */
export type KeySequence = readonly KeyShortcut[];

/**
 * A binding as you write it: a string (`'Mod+K'`, `'Shift+?'`, `'G I'` for G then I, `'Plus'`
 * for the + key), one chord in `KbdCombo` key names (`['Mod', 'K']`), or a sequence of chords
 * (`[['G'], ['I']]`). `Mod` is ⌘ on Apple and Ctrl elsewhere.
 */
export type ShortcutBinding = string | KeyShortcut | KeySequence;

const MODIFIERS = ['Mod', 'Ctrl', 'Alt', 'Shift'] as const;
type Modifier = typeof MODIFIERS[number];
const isModifier = (key: string): key is Modifier => (MODIFIERS as readonly string[]).includes(key);

/** Other spellings of the kit's key names, lower-cased. */
const ALIASES: Record<string, string> = {
  mod: 'Mod', cmd: 'Mod', command: 'Mod',
  ctrl: 'Ctrl', control: 'Ctrl',
  alt: 'Alt', option: 'Alt', opt: 'Alt',
  shift: 'Shift',
  esc: 'Escape', escape: 'Escape',
  space: 'Space', spacebar: 'Space', ' ': 'Space',
  plus: '+',
  del: 'Delete', delete: 'Delete',
  return: 'Enter', enter: 'Enter',
  tab: 'Tab', backspace: 'Backspace', home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown',
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
};

/** One key name in the kit's spelling: `k` is `K`, `esc` is `Escape`, `cmd` is `Mod`. */
export function canonicalKey(name: string): string {
  if (name === ' ') return 'Space';
  const trimmed = name.trim();
  const alias = ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  if (trimmed.length === 1) return trimmed.toUpperCase();
  if (/^f\d{1,2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

/** The named (non-character) keys a binding may use. */
const NAMED_KEYS = new Set([
  'Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'Insert', 'Space', 'Home', 'End', 'PageUp', 'PageDown',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);
const isKeyName = (key: string) => key.length === 1 || NAMED_KEYS.has(key) || /^F([1-9]|1[0-9]|2[0-4])$/.test(key);
/** A punctuation mark or symbol: the layout decides which Shift state types it, so a binding names the character. */
const isPunctuation = (key: string) => key.length === 1 && key !== ' ' && !/^[A-Z0-9]$/.test(key);

/**
 * A chord with its modifiers first, in the order Mod, Ctrl, Alt, Shift; `null` unless it has
 * exactly one other key and that key is a character, a named key or F1–F24. On a punctuation mark
 * Shift is dropped: the character decides (`Shift+?` is `?`; for Shift+/ on a US keyboard write `?`).
 */
function normalizeChord(keys: readonly string[]): KeyShortcut | null {
  const names = keys.map((key) => (typeof key === 'string' ? canonicalKey(key) : ''));
  if (names.some((name) => !name)) return null;
  const rest = names.filter((name) => !isModifier(name));
  if (rest.length !== 1 || !isKeyName(rest[0])) return null;
  const mods = MODIFIERS.filter((mod) => names.includes(mod) && !(mod === 'Shift' && isPunctuation(rest[0])));
  return [...mods, rest[0]];
}

/**
 * Split `Mod+K` / `Mod++` / `+` into key names: a `+` right after a separator is the key itself.
 * `null` for a separator with no key after it (`A+`, `Mod+K+`), so a mistyped remap is refused.
 */
function splitChord(step: string): string[] | null {
  const parts: string[] = [];
  let rest = step;
  while (rest) {
    const at = rest.indexOf('+', 1);
    if (at < 0) { parts.push(rest); break; }
    parts.push(rest.slice(0, at));
    rest = rest.slice(at + 1);
    if (!rest) return null;
  }
  return parts;
}

/**
 * Read a binding into chords in the kit's key names, or `null` when it is not one (an empty
 * string, a chord of modifiers only, two keys in one chord).
 */
export function parseShortcut(binding: ShortcutBinding | null | undefined): KeySequence | null {
  if (binding == null) return null;
  let chords: readonly (readonly string[])[];
  if (typeof binding === 'string') {
    const steps = binding.trim().split(/\s+/).filter(Boolean).map(splitChord);
    if (steps.some((step) => step == null)) return null;
    chords = steps as string[][];
  } else if (Array.isArray(binding) && binding.length > 0 && binding.every((part) => typeof part === 'string')) {
    chords = [binding as readonly string[]];
  } else if (Array.isArray(binding) && binding.length > 0 && binding.every((part) => Array.isArray(part))) {
    chords = binding as readonly (readonly string[])[];
  } else return null;
  if (!chords.length) return null;
  const out: KeyShortcut[] = [];
  for (const chord of chords) {
    const normal = normalizeChord(chord);
    if (!normal) return null;
    out.push(normal);
  }
  return out;
}

/** A binding as a string, the form preferences store: `Mod+K`, `G I`, `Shift+Plus`. */
export function formatShortcut(sequence: KeySequence): string {
  return sequence.map((chord) => chord.map((key) => (key === '+' ? 'Plus' : key)).join('+')).join(' ');
}

/** A chord resolved for a platform, for comparing: `Mod+K` is `Meta+K` on Apple and `Ctrl+K` elsewhere. */
function resolvedChord(chord: KeyShortcut, platform: KbdPlatform): string {
  const mods = new Set<string>();
  for (const key of chord) {
    if (key === 'Mod') mods.add(platform === 'mac' ? 'Meta' : 'Ctrl');
    else if (isModifier(key)) mods.add(key);
  }
  const key = chord[chord.length - 1];
  return [...['Meta', 'Ctrl', 'Alt', 'Shift'].filter((mod) => mods.has(mod)), key].join('+');
}

const isLetter = (key: string) => /^[A-Z]$/.test(key);
const isDigit = (key: string) => /^[0-9]$/.test(key);
/** A key that types a character: one letter, digit, punctuation mark or symbol (not the space bar). */
const isPrintable = (key: string) => key.length === 1 && key !== ' ';

/**
 * Whether a binding is a character-key shortcut in the sense of WCAG 2.1.4: every chord is a
 * printable character with no modifier but Shift (`A`, `?`, `Shift+?`, `G I`). The character-key
 * switch turns these off; a modifier (`Mod`, `Ctrl`, `Alt`) or a named key (Enter, an arrow,
 * Escape, F1) makes a shortcut exempt.
 */
export function isCharacterKeyShortcut(binding: ShortcutBinding | null | undefined): boolean {
  const sequence = parseShortcut(binding);
  if (!sequence) return false;
  return sequence.every((chord) => isPrintable(chord[chord.length - 1]) && chord.every((key) => !isModifier(key) || key === 'Shift'));
}

/** The keydown's key in the kit's names (`' '` is `Space`, `a` is `A`). */
const eventKeyName = (key: string) => {
  if (key === ' ' || key === 'Spacebar') return 'Space';
  if (key === 'Esc') return 'Escape';
  if (key === 'Del') return 'Delete';
  return key.length === 1 ? key.toUpperCase() : key;
};

/** The physical key of a punctuation mark on a US layout, for an Alt chord whose character Alt changes. */
const PUNCTUATION_CODES: Record<string, string> = {
  '/': 'Slash', '\\': 'Backslash', ',': 'Comma', '.': 'Period', ';': 'Semicolon', "'": 'Quote',
  '[': 'BracketLeft', ']': 'BracketRight', '-': 'Minus', '=': 'Equal', '`': 'Backquote',
};

/** The fields of a keydown the matcher reads (a DOM `KeyboardEvent` has them all). */
export interface ShortcutKeyEvent {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * Whether a keydown is this chord on this platform.
 *
 * - A letter or digit must have exactly the chord's modifiers (`Mod` is ⌘ on Apple, Ctrl
 *   elsewhere). When the key typed is not a Latin letter (a Cyrillic, Greek or Hebrew layout, or
 *   Option+letter on a Mac), the physical key decides (`KeyG` for G), so G then I works on a
 *   Serbian Cyrillic keyboard too.
 * - A punctuation mark or symbol (`?`, `/`, `[`) is decided by the character, as the layout types
 *   it: Shift is never compared (`?` is Shift+/ on a US keyboard and Shift+ß on a German one). On
 *   its own (`?`, `[`), Ctrl+Alt (Windows AltGr) or Option may have typed it; ⌘ or a Ctrl without
 *   Alt never. With modifiers (`Mod+/`), exactly those: Ctrl+Alt+/ and ⌘⌥/ are not `Mod+/`. An Alt
 *   chord whose character Alt changes (Option+/ types ÷) falls back to the physical key.
 * - A named key (Enter, Escape, an arrow, F1) must have exactly the chord's modifiers.
 */
export function matchesChord(event: ShortcutKeyEvent, chord: KeyShortcut, platform: KbdPlatform): boolean {
  const key = chord[chord.length - 1];
  const wantMeta = platform === 'mac' && chord.includes('Mod');
  const wantCtrl = chord.includes('Ctrl') || (platform !== 'mac' && chord.includes('Mod'));
  const wantAlt = chord.includes('Alt');
  const wantShift = chord.includes('Shift');
  const typed = eventKeyName(event.key ?? '');

  if (isLetter(key) || isDigit(key)) {
    if (event.metaKey !== wantMeta || event.ctrlKey !== wantCtrl || event.altKey !== wantAlt || event.shiftKey !== wantShift) return false;
    if (typed === key) return true;
    // Not a Latin letter or a digit (another script, Option+letter, Shift+digit): the physical key.
    const latin = /^[A-Z0-9]$/.test(typed);
    if (latin) return false;
    return event.code === (isLetter(key) ? `Key${key}` : `Digit${key}`);
  }
  if (isPrintable(key)) {
    if (event.metaKey !== wantMeta) return false;
    if (!wantMeta && !wantCtrl && !wantAlt) {
      // A character shortcut: whatever typed the character counts (Shift, AltGr as Ctrl+Alt on
      // Windows, Option on a Mac), but not a Ctrl without Alt: that is a Ctrl shortcut.
      return typed === key && !(event.ctrlKey && !event.altKey);
    }
    // A chord with modifiers has exactly them: Ctrl+Alt+/ is not Ctrl+/, ⌘⌥/ is not ⌘/.
    if (event.ctrlKey !== wantCtrl || event.altKey !== wantAlt) return false;
    if (typed === key) return true;
    // Alt or Option types another character (Option+/ is ÷ on a Mac): the physical key decides.
    return wantAlt && PUNCTUATION_CODES[key] != null && event.code === PUNCTUATION_CODES[key];
  }
  return typed === key && event.metaKey === wantMeta && event.ctrlKey === wantCtrl && event.altKey === wantAlt && event.shiftKey === wantShift;
}

/** A key press that is only a modifier going down (it never starts or breaks a sequence). */
export const isModifierKeyEvent = (event: { key: string }) =>
  event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta' || event.key === 'AltGraph' || event.key === 'OS';

const TEXT_FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="searchbox"], [role="spinbutton"]';
/** Inputs a person does not type into: character keys there are free for shortcuts. */
const NOT_TYPED = new Set(['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image', 'hidden']);

/**
 * Whether a key press on this element is typing: a text input or textarea, a select, a
 * contenteditable (also a rich-text editor), or an element with a textbox, combobox, searchbox or
 * spinbutton role, or anything inside one. A checkbox, radio, button or range input is not.
 */
export function isTypingTarget(target: EventTarget | null | undefined): boolean {
  const el = target as (Element & { isContentEditable?: boolean }) | null | undefined;
  if (!el || el.nodeType !== 1 || typeof el.closest !== 'function') return false;
  if (el.isContentEditable) return true;
  const field = el.closest(TEXT_FIELD);
  if (!field) return false;
  if (field.tagName === 'INPUT') return !NOT_TYPED.has(((field as HTMLInputElement).type || 'text').toLowerCase());
  return true;
}

/** A shortcut as the conflict check sees it. `scope` is any value: equal scopes can collide. */
export interface ShortcutConflictEntry {
  id: string;
  keys: ShortcutBinding;
  scope?: unknown;
}

/** Two shortcuts in one scope that a key press cannot tell apart. */
export interface ShortcutConflict {
  /** `same`: the same keys. `prefix`: one is how the other starts (`G` and `G I`), so the longer never fires. */
  kind: 'same' | 'prefix';
  ids: [string, string];
  /** The platform it collides on: `Mod+K` and `Ctrl+K` collide on `other` only. */
  platform: KbdPlatform;
  keys: [string, string];
  scope: unknown;
}

/**
 * The conflicts in a set of shortcuts: two different ids in the same scope whose keys are the same,
 * or one a prefix of the other, on `platform` (default: either platform). The same id twice is one
 * command (two mounted instances), never a conflict; a shortcut in an inner scope that shadows an
 * outer one is by design, never a conflict. For a test of a product's shortcut map:
 *   assert.deepEqual(findShortcutConflicts(MY_SHORTCUTS), []);
 */
export function findShortcutConflicts(entries: readonly ShortcutConflictEntry[], options: { platform?: KbdPlatform } = {}): ShortcutConflict[] {
  const platforms: KbdPlatform[] = options.platform ? [options.platform] : ['other', 'mac'];
  const parsed = entries.map((entry) => ({ entry, sequence: parseShortcut(entry.keys) })).filter((p) => p.sequence);
  const found: ShortcutConflict[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      const a = parsed[i];
      const b = parsed[j];
      if (a.entry.id === b.entry.id || !Object.is(a.entry.scope, b.entry.scope)) continue;
      for (const platform of platforms) {
        const ra = a.sequence!.map((chord) => resolvedChord(chord, platform));
        const rb = b.sequence!.map((chord) => resolvedChord(chord, platform));
        const shorter = ra.length <= rb.length ? ra : rb;
        const longer = shorter === ra ? rb : ra;
        if (!shorter.every((chord, k) => chord === longer[k])) continue;
        const kind = ra.length === rb.length ? 'same' : 'prefix';
        const tag = `${a.entry.id}\u0000${b.entry.id}\u0000${kind}`;
        if (seen.has(tag)) continue;
        seen.add(tag);
        found.push({ kind, ids: [a.entry.id, b.entry.id], platform, keys: [formatShortcut(a.sequence!), formatShortcut(b.sequence!)], scope: a.entry.scope });
      }
    }
  }
  return found;
}

/** The character-key switch (WCAG 2.1.4 G217): `off` stops every shortcut made of character keys only. */
export type CharacterKeyPreference = 'on' | 'off';

/** What a person chose about shortcuts. */
export interface ShortcutPreferenceValues {
  /** Character-key shortcuts (`A`, `?`, `G I`) on or off. Default `on`. */
  characterKeys: CharacterKeyPreference;
  /**
   * Remaps by shortcut id, as `formatShortcut` strings (`'Alt+A'`); `null` turns that shortcut off.
   * An id that is not here keeps its default keys.
   */
  overrides: Readonly<Record<string, string | null>>;
}

export const DEFAULT_SHORTCUT_PREFERENCES: ShortcutPreferenceValues = { characterKeys: 'on', overrides: {} };

/** The default `localStorage` key, next to `uix-display-preferences`. */
export const SHORTCUT_PREFERENCES_STORAGE_KEY = 'uix-shortcut-preferences';

/** Read stored preferences; anything missing or unknown falls back to `defaults`, a remap that is not a binding is dropped. */
export function parseShortcutPreferences(raw: string | null | undefined, defaults: ShortcutPreferenceValues = DEFAULT_SHORTCUT_PREFERENCES): ShortcutPreferenceValues {
  let stored: unknown = {};
  try { stored = raw ? JSON.parse(raw) : {}; } catch { stored = {}; }
  const record = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
  const characterKeys = record.characterKeys === 'on' || record.characterKeys === 'off' ? record.characterKeys : defaults.characterKeys;
  const overrides: Record<string, string | null> = { ...defaults.overrides };
  const rawOverrides = record.overrides;
  if (rawOverrides && typeof rawOverrides === 'object' && !Array.isArray(rawOverrides)) {
    for (const [id, value] of Object.entries(rawOverrides as Record<string, unknown>)) {
      if (value === null) overrides[id] = null;
      else if (typeof value === 'string') {
        const sequence = parseShortcut(value);
        if (sequence) overrides[id] = formatShortcut(sequence);
      }
    }
  }
  return { characterKeys, overrides };
}

/** The keys a shortcut has after the person's choices: its remap, else its default; `null` when off. */
export function effectiveShortcut(id: string, defaultKeys: ShortcutBinding | null | undefined, preferences: ShortcutPreferenceValues): KeySequence | null {
  const remapped = Object.prototype.hasOwnProperty.call(preferences.overrides, id);
  const sequence = remapped ? parseShortcut(preferences.overrides[id]) : parseShortcut(defaultKeys);
  if (!sequence) return null;
  if (preferences.characterKeys === 'off' && isCharacterKeyShortcut(sequence)) return null;
  return sequence;
}
