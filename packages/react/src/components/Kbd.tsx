"use client";

import { useEffect, useState } from 'react';
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
  const [detected, setDetected] = useState<KbdPlatform>('other');
  useEffect(() => { if (!platform) setDetected(detectPlatform()); }, [platform]);
  const active = platform ?? detected;
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
