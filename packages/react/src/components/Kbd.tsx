"use client";

import { useContext, useSyncExternalStore } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { ShortcutRegistryContext, useDisplayedShortcut } from '../shortcut-hooks.js';
import type { KeySequence } from '../shortcut-model.js';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/** One keyboard key over `.uix-kbd` (HAR-1361; TENSOR C14, MOTUS B-A16). */
export function Kbd({ className, children, ...props }: KbdProps) {
  return <kbd className={cx('uix-kbd', className)} {...props}>{children}</kbd>;
}

export type KbdPlatform = 'mac' | 'other';

/** Glyph shown and name spoken for a named key, per platform. */
const KEYS: Record<string, { mac: [string, string]; other: [string, string] }> = {
  Mod: { mac: ['⌘', 'Command'], other: ['Ctrl', 'Control'] },
  Ctrl: { mac: ['⌃', 'Control'], other: ['Ctrl', 'Control'] },
  Shift: { mac: ['⇧', 'Shift'], other: ['Shift', 'Shift'] },
  Alt: { mac: ['⌥', 'Option'], other: ['Alt', 'Alt'] },
  Enter: { mac: ['↵', 'Enter'], other: ['Enter', 'Enter'] },
  Escape: { mac: ['Esc', 'Escape'], other: ['Esc', 'Escape'] },
  Esc: { mac: ['Esc', 'Escape'], other: ['Esc', 'Escape'] },
  Delete: { mac: ['Del', 'Delete'], other: ['Del', 'Delete'] },
  Del: { mac: ['Del', 'Delete'], other: ['Del', 'Delete'] },
  Space: { mac: ['Space', 'Space'], other: ['Space', 'Space'] },
  ' ': { mac: ['Space', 'Space'], other: ['Space', 'Space'] },
  Backspace: { mac: ['⌫', 'Backspace'], other: ['Backspace', 'Backspace'] },
  Tab: { mac: ['⇥', 'Tab'], other: ['Tab', 'Tab'] },
  ArrowUp: { mac: ['↑', 'Up arrow'], other: ['↑', 'Up arrow'] },
  ArrowDown: { mac: ['↓', 'Down arrow'], other: ['↓', 'Down arrow'] },
  ArrowLeft: { mac: ['←', 'Left arrow'], other: ['←', 'Left arrow'] },
  ArrowRight: { mac: ['→', 'Right arrow'], other: ['→', 'Right arrow'] },
};

const detectPlatform = (): KbdPlatform => {
  if (typeof navigator === 'undefined') return 'other';
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform ?? navigator.platform ?? '') ? 'mac' : 'other';
};

const noSubscription = () => () => {};
const serverPlatform = (): KbdPlatform => 'other';

/**
 * The platform for glyphs and `aria-keyshortcuts`: `platform` when given, else a `ShortcutProvider`'s
 * `platform`, else the browser's. The
 * server and the hydrating render use `other`; a component mounted later (a menu row on open)
 * reads the platform at once, so it never flashes Ctrl before ⌘.
 */
export function useKbdPlatform(platform?: KbdPlatform): KbdPlatform {
  const detected = useSyncExternalStore(noSubscription, detectPlatform, serverPlatform);
  // A ShortcutProvider that fixes the platform fixes it for every hint below it too, and a change of
  // it re-renders them (the snapshot is the platform alone, so nothing else does).
  const registry = useContext(ShortcutRegistryContext);
  const fixed = useSyncExternalStore(
    registry ? registry.subscribe : noSubscription,
    () => registry?.fixedPlatform,
    () => registry?.fixedPlatform,
  );
  return platform ?? fixed ?? detected;
}

/**
 * A keyboard shortcut (HAR-2031): the keys pressed together, in `KbdCombo`'s names, e.g.
 * `['Mod', 'K']`, `['Shift', '?']` or `['A']`. `Mod` is ⌘ on Apple and Ctrl elsewhere.
 */
export type KeyShortcut = readonly string[];

/**
 * KbdCombo's key names (the table above) that `aria-keyshortcuts` spells differently: UI Events
 * key values, `Space` for the space bar and `Plus` for `+`, the separator.
 */
const ARIA_KEYS: Record<string, { mac: string; other: string }> = {
  Mod: { mac: 'Meta', other: 'Control' },
  Ctrl: { mac: 'Control', other: 'Control' },
  Esc: { mac: 'Escape', other: 'Escape' },
  Del: { mac: 'Delete', other: 'Delete' },
  ' ': { mac: 'Space', other: 'Space' },
  '+': { mac: 'Plus', other: 'Plus' },
};

/**
 * The `aria-keyshortcuts` value of a shortcut on a platform (HAR-2031): `['Mod', 'K']` is
 * `Meta+K` on Apple and `Control+K` elsewhere; a single letter is upper-cased (`['a']` is `A`).
 * For a control the kit does not render.
 */
export function ariaKeyShortcuts(keys: KeyShortcut, platform: KbdPlatform): string {
  return keys.map((key) => ARIA_KEYS[key]?.[platform] ?? (key.length === 1 ? key.toUpperCase() : key)).join('+');
}

/** A `shortcut` prop that is key names rather than a node (HAR-2031). */
export const isKeyShortcut = (value: unknown): value is KeyShortcut =>
  Array.isArray(value) && value.length > 0 && value.every((key) => typeof key === 'string');

/**
 * What a screen reader should hear for a shortcut: the key names joined with "+", e.g.
 * "Control+K" or "Command+K" (HAR-2416). The same text `KbdCombo` speaks. Internal.
 */
export function spokenKeys(keys: KeyShortcut, platform: KbdPlatform, keyLabels?: Partial<Record<string, string>>): string {
  return keys.map((key) => keyLabels?.[key] ?? KEYS[key]?.[platform]?.[1] ?? key).join('+');
}

/**
 * The `aria-keyshortcuts` value of a registered binding: the chord's, or nothing for a sequence
 * (G then I), which the attribute cannot express; the visible keys and the spoken text still say
 * it. Internal.
 */
export function ariaKeyShortcutsFor(sequence: KeySequence | null | undefined, platform: KbdPlatform): string | undefined {
  return sequence && sequence.length === 1 ? ariaKeyShortcuts(sequence[0], platform) : undefined;
}

/** What a screen reader hears for a binding: "Control+K", or "G, then I" for a sequence. Internal. */
export function spokenSequence(sequence: KeySequence, platform: KbdPlatform, then: string, keyLabels?: Partial<Record<string, string>>): string {
  return sequence.map((chord) => spokenKeys(chord, platform, keyLabels)).join(`, ${then} `);
}

export interface KbdComboProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * Keys in order, e.g. `['Mod', 'K']`. `Mod` is ⌘ on Apple and Ctrl elsewhere; `Shift`,
   * `Alt`, `Enter`, `Escape`, `Backspace`, `Tab` and the arrows get platform glyphs. A sequence
   * of chords, e.g. `[['G'], ['I']]`, shows "G then I".
   */
  keys?: string[] | KeySequence;
  /**
   * Show the keys a registered shortcut has now (`useShortcut`), instead of `keys`: a remap shows
   * the new keys, and nothing renders while that command is not active (unregistered, disabled,
   * or a character key with the character-key switch off), so the hint never disagrees with the key.
   */
  shortcutId?: string;
  /** Fix the platform (tests, docs). Default: detected after mount; the server renders `other`. */
  platform?: KbdPlatform;
  /** Spoken names for keys, e.g. `{ Mod: 'Steuerung' }`; the glyphs stay. */
  keyLabels?: Partial<Record<string, string>>;
  /** The word between the chords of a sequence. Default: `UixLabelsProvider` `shortcuts.then`, then "then". */
  thenLabel?: string;
}

/**
 * A shortcut such as ⌘K / Ctrl+K, or a sequence such as G then I. Screen readers hear the key
 * names ("Command+K", "G, then I"), not the glyphs. The platform is resolved at display time,
 * after mount, so server and client agree.
 */
export function KbdCombo({ keys, shortcutId, platform, keyLabels, thenLabel, className, ...props }: KbdComboProps) {
  const active = useKbdPlatform(platform);
  const labels = useUixLabels();
  const then = thenLabel ?? labels.shortcuts?.then ?? 'then';
  const sequence = useDisplayedShortcut(keys, shortcutId);
  if (!sequence) return null;
  const caps = (chord: readonly string[], at: number) => (
    <span key={`chord-${at}`} className="uix-kbd-combo__keys" aria-hidden="true">
      {chord.map((key, i) => <kbd key={`${key}-${i}`} className="uix-kbd">{KEYS[key]?.[active]?.[0] ?? key}</kbd>)}
    </span>
  );
  return (
    <span className={cx('uix-kbd-combo', className)} {...props}>
      <span className="uix-visually-hidden">{spokenSequence(sequence, active, then, keyLabels)}</span>
      {sequence.length === 1 ? caps(sequence[0], 0) : sequence.flatMap((chord, at) => [
        ...(at > 0 ? [<span key={`then-${at}`} className="uix-kbd-combo__then" aria-hidden="true">{then}</span>] : []),
        caps(chord, at),
      ])}
    </span>
  );
}
