"use client";

import { useSyncExternalStore } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

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
 * The platform for glyphs and `aria-keyshortcuts`: `platform` when given, else the browser's. The
 * server and the hydrating render use `other`; a component mounted later (a menu row on open)
 * reads the platform at once, so it never flashes Ctrl before ⌘.
 */
export function useKbdPlatform(platform?: KbdPlatform): KbdPlatform {
  const detected = useSyncExternalStore(noSubscription, detectPlatform, serverPlatform);
  return platform ?? detected;
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

export interface KbdComboProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * Keys in order, e.g. `['Mod', 'K']`. `Mod` is ⌘ on Apple and Ctrl elsewhere; `Shift`,
   * `Alt`, `Enter`, `Escape`, `Backspace`, `Tab` and the arrows get platform glyphs.
   */
  keys: string[];
  /** Fix the platform (tests, docs). Default: detected after mount; the server renders `other`. */
  platform?: KbdPlatform;
  /** Spoken names for keys, e.g. `{ Mod: 'Steuerung' }`; the glyphs stay. */
  keyLabels?: Partial<Record<string, string>>;
}

/**
 * A shortcut such as ⌘K / Ctrl+K. Screen readers hear the key names ("Command+K"), not the
 * glyphs. The platform is resolved at display time, after mount, so server and client agree.
 */
export function KbdCombo({ keys, platform, keyLabels, className, ...props }: KbdComboProps) {
  const active = useKbdPlatform(platform);
  const parts = keys.map((key) => {
    const known = KEYS[key]?.[active];
    return { glyph: known?.[0] ?? key, spoken: keyLabels?.[key] ?? known?.[1] ?? key };
  });
  return (
    <span className={cx('uix-kbd-combo', className)} {...props}>
      <span className="uix-visually-hidden">{parts.map((p) => p.spoken).join('+')}</span>
      <span className="uix-kbd-combo__keys" aria-hidden="true">
        {parts.map((p, i) => <kbd key={`${keys[i]}-${i}`} className="uix-kbd">{p.glyph}</kbd>)}
      </span>
    </span>
  );
}
