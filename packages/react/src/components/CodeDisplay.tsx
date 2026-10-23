"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { CopyButton } from './CopyButton.js';

/** The words of a `CodeDisplay` (HAR-1253). */
export interface CodeDisplayLabels {
  /** The live countdown; `{time}` is `m:ss` (or `h:mm:ss`). */
  expiresIn: string;
  /** Announced once when `warnBefore` seconds are left; `{time}` is that time as `m:ss`. */
  expiresSoon: string;
  /** Shown, and announced once, when the code has expired. Text, so the state never rests on colour. */
  expired: string;
  /** The copy button's accessible name. */
  copy: string;
  /** Announced after a copy. */
  copied: string;
  /** Announced when the copy failed. */
  copyFailed: string;
}

export const DEFAULT_CODE_DISPLAY_LABELS: CodeDisplayLabels = {
  expiresIn: 'Expires in {time}',
  expiresSoon: '{time} left before the code expires',
  expired: 'Expired. Ask for a new code.',
  copy: 'Copy code',
  copied: 'Copied',
  copyFailed: 'Could not copy. Select the code instead.',
};

export interface CodeDisplayProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * The code, e.g. `"K7Q4PX9MW"` or `"K7Q-4PX-9MW"`. A code that already contains spaces or
   * hyphens is shown in those groups; otherwise it is cut into groups of `groupSize`.
   */
  code: string;
  /** The visible name above the code, e.g. "Pairing code"; it also names the group. */
  label: ReactNode;
  /** Characters per group, or the length of each group in turn (`[4, 4, 4]`). Default 3. */
  groupSize?: number | readonly number[];
  /** Drawn between groups, never read out. Default `-`. */
  separator?: string;
  /** `md` (default) for a panel; `lg` for a code read across a counter. */
  size?: 'md' | 'lg';
  /** When the code stops working (an ISO instant, epoch milliseconds or a Date): shows a countdown, then the expired state. */
  expiresAt?: string | number | Date;
  /**
   * Seconds before expiry when the countdown turns to a warning and a screen reader hears it
   * once (`labels.expiresSoon`). Default 60; 0 turns the warning off.
   */
  warnBefore?: number;
  /** Called once when the countdown reaches zero while the component is on screen. */
  onExpire?: () => void;
  /** Adds a copy button while the code is live. */
  copyable?: boolean;
  /**
   * What a screen reader says for one character. Default: the character itself, so "K7Q" is
   * read "K, 7, Q". Use it for a spelling alphabet or to tell O from 0.
   */
  spell?: (character: string) => string;
  /** The words. Default: `UixLabelsProvider` `codeDisplay`, then English. */
  labels?: Partial<CodeDisplayLabels>;
}

/** The code in its display groups. */
export function codeGroups(code: string, groupSize: number | readonly number[] = 3): string[] {
  const trimmed = code.trim();
  if (/[\s-]/.test(trimmed)) return trimmed.split(/[\s-]+/).filter(Boolean);
  const sizes = typeof groupSize === 'number' ? [groupSize] : groupSize;
  const groups: string[] = [];
  for (let i = 0, at = 0; at < trimmed.length; i += 1) {
    const size = Math.max(1, Math.floor(sizes[Math.min(i, sizes.length - 1)] ?? trimmed.length));
    groups.push(trimmed.slice(at, at + size));
    at += size;
  }
  return groups;
}

/** `m:ss`, or `h:mm:ss` from an hour up, for a number of whole seconds. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

const instant = (value: string | number | Date | undefined) => value === undefined ? undefined : new Date(value).getTime();

/**
 * A one-time code shown large (HAR-1253; SHOPx PRE-08 till pairing, the shopper's voucher):
 * monospace characters in groups, spelled character by character to a screen reader, an
 * optional countdown that ends in an expired state said in words, and an optional copy button.
 * The consumer makes the code and enforces its expiry; this only shows it.
 */
export function CodeDisplay({
  code, label, groupSize = 3, separator = '-', size = 'md', expiresAt, warnBefore = 60, onExpire, copyable = false, spell, labels: labelsProp, className, ...props
}: CodeDisplayProps) {
  const uixLabels = useUixLabels();
  const labels: CodeDisplayLabels = { ...DEFAULT_CODE_DISPLAY_LABELS, ...uixLabels.codeDisplay, ...labelsProp };
  const labelId = useId();
  const deadline = instant(expiresAt);
  const [now, setNow] = useState(() => Date.now());
  const remaining = deadline === undefined || Number.isNaN(deadline) ? undefined : deadline - now;
  const expired = remaining !== undefined && remaining <= 0;
  const warnAt = Math.max(0, warnBefore) * 1000;
  const phase = remaining === undefined ? 'live' : remaining <= 0 ? 'expired' : remaining <= warnAt ? 'soon' : 'live';
  // The countdown is never a live region (a screen reader would hear every second). Two moments
  // are said, once each, and only when they happen on screen: "one minute left" and "expired".
  const [announcement, setAnnouncement] = useState('');
  const shownPhase = useRef(phase);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  // One tick per displayed second, timed to the second boundary of the deadline.
  useEffect(() => {
    if (deadline === undefined || Number.isNaN(deadline)) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const left = deadline - current;
      if (left > 0) timer = setTimeout(tick, left % 1000 || 1000);
    };
    tick();
    return () => clearTimeout(timer);
  }, [deadline]);

  useEffect(() => {
    const before = shownPhase.current;
    shownPhase.current = phase;
    if (phase === before) return;
    if (phase === 'live') setAnnouncement('');
    else if (phase === 'soon' && before === 'live') setAnnouncement(fillLabel(labelsRef.current.expiresSoon, { time: formatCountdown(warnAt / 1000) }));
    else if (phase === 'expired') { setAnnouncement(labelsRef.current.expired); onExpireRef.current?.(); }
  }, [phase, warnAt]);

  const groups = codeGroups(code, groupSize);
  const say = spell ?? ((character: string) => character);
  const spoken = groups.map((group) => Array.from(group).map(say).join(' ')).join(', ');

  return (
    <div
      className={cx('uix-code-display', size === 'lg' && 'uix-code-display--lg', className)}
      role="group"
      aria-labelledby={labelId}
      data-state={phase}
      {...props}
    >
      <div className="uix-code-display__label" id={labelId}>{label}</div>
      <div className="uix-code-display__row">
        <span className="uix-code-display__code" aria-hidden="true" translate="no">
          {groups.map((group, index) => (
            // The separator ends its group, so a wrapped line never starts with one.
            <span key={index} className="uix-code-display__group">
              {group}
              {index < groups.length - 1 && <span className="uix-code-display__sep">{separator}</span>}
            </span>
          ))}
        </span>
        <span className="uix-code-display__spoken uix-visually-hidden">{spoken}</span>
        {copyable && !expired && (
          <CopyButton value={groups.join('')} label={labels.copy} copiedLabel={labels.copied} failedLabel={labels.copyFailed} />
        )}
      </div>
      {remaining !== undefined && (
        <div className="uix-code-display__meta" suppressHydrationWarning>
          {expired ? labels.expired : fillLabel(labels.expiresIn, { time: formatCountdown(remaining / 1000) })}
        </div>
      )}
      <span role="status" className="uix-visually-hidden">{announcement}</span>
    </div>
  );
}
