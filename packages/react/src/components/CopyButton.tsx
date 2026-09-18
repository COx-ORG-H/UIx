"use client";

import { useEffect, useRef, useState } from 'react';
import { cx } from '../cx.js';
import { copyText } from '../copy-model.js';

/** How long the check icon and the "copied" announcement stay, in milliseconds. */
const CONFIRM_MS = 1500;

export interface CopyButtonProps {
  /** The text written to the clipboard. */
  value: string;
  /** Accessible name of the button, e.g. "Copy email". */
  label: string;
  /** Announced through a polite status region after a successful copy, e.g. "Copied". */
  copiedLabel: string;
  /**
   * Announced when the copy fails (no clipboard, or the write was refused), e.g.
   * "Could not copy — select the text instead". Without it a failure is silent: nothing
   * false is shown, but the person is left guessing why nothing happened.
   */
  failedLabel?: string;
  className?: string;
}

const CopyGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="14" height="14" x="8" y="8" rx="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * Icon-only ghost button that copies `value`. On success it shows a check for 1.5 s and
 * announces `copiedLabel`. On failure (no clipboard, or the write was refused) it shows no
 * check and announces `failedLabel` when one is given.
 */
export function CopyButton({ value, label, copiedLabel, failedLabel, className }: CopyButtonProps) {
  const [outcome, setOutcome] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copied = outcome === 'copied';
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const onClick = async () => {
    const ok = await copyText(value);
    if (!mounted.current) return;
    clearTimeout(timer.current);
    if (!ok && !failedLabel) { setOutcome('idle'); return; }
    setOutcome(ok ? 'copied' : 'failed');
    timer.current = setTimeout(() => setOutcome('idle'), CONFIRM_MS);
  };

  return (
    <>
      <button
        type="button"
        className={cx('uix-btn', 'uix-btn--ghost', 'uix-btn--icon', 'uix-btn--sm', 'uix-copy-button', className)}
        aria-label={label}
        data-copied={copied || undefined}
        onClick={onClick}
      >
        {copied ? <CheckGlyph /> : <CopyGlyph />}
      </button>
      <span role="status" className="uix-visually-hidden">
        {outcome === 'copied' ? copiedLabel : outcome === 'failed' ? failedLabel : ''}
      </span>
    </>
  );
}
