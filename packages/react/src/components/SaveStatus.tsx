"use client";

import { useRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useDelayedPending } from '../hooks/useDelayedPending.js';
import { PENDING_DELAY_MS } from '../motion-timing.js';

export type SaveStatusState = 'idle' | 'saving' | 'saved' | 'failed';

/** Every visible or announced string. Pass translations; English defaults fill the gaps. */
export interface SaveStatusLabels {
  saving: string;
  saved: string;
  failed: string;
  retry: string;
}

export const DEFAULT_SAVE_STATUS_LABELS: SaveStatusLabels = {
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Could not save',
  retry: 'Try again',
};

export interface SaveStatusProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Where the save is. `idle` shows nothing but keeps the live region in place. */
  state: SaveStatusState;
  labels?: Partial<SaveStatusLabels>;
  /** Offered as a button only while `state` is `failed`. */
  onRetry?: () => void;
  /**
   * Milliseconds before "Saving…" shows (default 300; HAR-2580). Until then the previous words
   * stay, so a fast save goes straight to "Saved" without a flash; once "Saving…" shows it
   * stays at least 500 ms. `0` shows every state at once and holds none.
   */
  delay?: number;
}

/**
 * Inline save feedback over `.uix-save-status`: saving → saved → failed, with a retry.
 * For autosave and inline edits, where a toast would be too loud and silence leaves the
 * user guessing (LD-13).
 *
 * The status text sits in a polite live region that stays mounted in every state,
 * including `idle`. A region inserted together with its text announces nothing, so
 * rendering null while idle would silence the first "Saving…". The retry button sits
 * outside the region so its label is not read out on every change.
 */
export function SaveStatus({ state, labels, onRetry, delay = PENDING_DELAY_MS, className, ...props }: SaveStatusProps) {
  const text = { ...DEFAULT_SAVE_STATUS_LABELS, ...labels };
  const savingShown = useDelayedPending(state === 'saving', { delay, minVisible: delay > 0 ? undefined : 0 });
  // Through a save's quiet first 300 ms, an earlier "Saved" stays (nothing flashes); an earlier
  // "Could not save" and its retry button go at once, so the retry is not pressed twice.
  const settled = useRef<SaveStatusState>(state === 'saving' ? 'idle' : state);
  if (state !== 'saving') settled.current = state;
  const quiet: SaveStatusState = settled.current === 'saved' ? 'saved' : 'idle';
  const shown: SaveStatusState = savingShown ? 'saving' : state === 'saving' ? quiet : state;
  const message = shown === 'idle' ? '' : text[shown];
  return (
    <div className={cx('uix-save-status', className)} data-state={shown} {...props}>
      <span className="uix-save-status__icon" aria-hidden="true" />
      <span className="uix-save-status__text" role="status" aria-live="polite">{message}</span>
      {shown === 'failed' && onRetry && (
        <button type="button" className="uix-btn uix-btn--link uix-btn--sm uix-save-status__retry" onClick={onRetry}>
          {text.retry}
        </button>
      )}
    </div>
  );
}
