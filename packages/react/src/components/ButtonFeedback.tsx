"use client";

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDelayedPending } from '../hooks/useDelayedPending.js';
import { useUixLabels } from '../labels-context.js';
import { RESULT_HOLD_MS } from '../motion-timing.js';

export type ButtonResult = 'success' | 'error';

/** The words a `Button` shows and announces for a moment after its action ends. */
export interface ButtonResultLabels {
  success: string;
  error: string;
}

export const DEFAULT_BUTTON_RESULT_LABELS: ButtonResultLabels = {
  success: 'Done',
  error: 'Failed',
};

const SuccessGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ErrorGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export interface ButtonFeedbackProps {
  loading: boolean;
  loadingDelay: number;
  result?: ButtonResult | null;
  resultLabels?: Partial<ButtonResultLabels>;
  children?: ReactNode;
}

/**
 * The client half of `Button`'s `loading` and `result` (HAR-2580, HAR-2581). `Button` itself
 * stays server-renderable; this child keeps the timers. It marks the button busy through a
 * hidden marker (`[data-uix-btn-busy]`, read by `.uix-btn:has(…)`), so the button element is
 * never re-created and keeps focus. With a `result` it also stacks the label and the result
 * words in one grid cell, so the button is always as wide as the widest of them, and
 * announces the result through a polite status region portalled to the body (inside the
 * button it would become part of the button's name).
 */
export function ButtonFeedback({ loading, loadingDelay, result, resultLabels, children }: ButtonFeedbackProps) {
  const busy = useDelayedPending(loading, { delay: loadingDelay });
  const fromProvider = useUixLabels().buttonResult;
  const text = { ...DEFAULT_BUTTON_RESULT_LABELS, ...fromProvider, ...resultLabels };

  // A result shows when it changes after mount, or when an action ends with one; never on the
  // first render. It waits until the spinner has finished its minimum time.
  const [queued, setQueued] = useState<ButtonResult | null>(null);
  const [shown, setShown] = useState<{ kind: ButtonResult; n: number } | null>(null);
  const previous = useRef({ result: result ?? null, loading });
  useEffect(() => {
    const before = previous.current;
    previous.current = { result: result ?? null, loading };
    if (loading) {
      setQueued(null);
      setShown(null);
      return;
    }
    if (result && (result !== before.result || before.loading)) setQueued(result);
  }, [result, loading]);
  useEffect(() => {
    if (!queued || busy || loading) return;
    setShown((current) => ({ kind: queued, n: (current?.n ?? 0) + 1 }));
    setQueued(null);
  }, [queued, busy, loading]);
  useEffect(() => {
    if (!shown) return undefined;
    const timer = setTimeout(() => setShown(null), RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const withResult = result !== undefined;
  useEffect(() => { if (withResult) setPortalTarget(document.body); }, [withResult]);

  const marker = <span hidden data-uix-btn-busy={busy || undefined} />;
  if (!withResult) return <>{marker}{children}</>;
  return (
    <>
      {marker}
      <span className="uix-btn__face" data-result={shown?.kind}>
        <span className="uix-btn__label">{children}</span>
        <span className="uix-btn__result" data-kind="success" aria-hidden="true"><SuccessGlyph />{text.success}</span>
        <span className="uix-btn__result" data-kind="error" aria-hidden="true"><ErrorGlyph />{text.error}</span>
      </span>
      {portalTarget && createPortal(
        <span role="status" className="uix-visually-hidden">{shown ? text[shown.kind] : ''}</span>,
        portalTarget,
      )}
    </>
  );
}
