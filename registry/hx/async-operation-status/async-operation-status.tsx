'use client';

/* @hx registry item — ported from @itsmx/shared-ui/src/async-operation-status.tsx */

import type { ReactNode } from 'react';
import type { RFC7807Problem } from './states';
import { cn } from './utils';

/**
 * UI-PRIM-01 / addendum 5 — universal long-running-operation status
 * per Docs/design-system.md § 6 (<AsyncOperationStatus> pattern).
 *
 * Four states, one component:
 *
 *   - `queued`    — pending in the Inngest run queue.
 *   - `running`   — actively executing. Optional progress 0–1.
 *   - `complete`  — finished; consumer wires the result action
 *                   (download link, view link, etc.) into `action`.
 *   - `failed`    — RFC 7807 problem + retry button.
 *
 * Pure presentational. Inngest is the persistence layer — the consumer
 * polls (or subscribes via SSE) by `operationId` and passes the
 * resolved state in. The user can log out, come back the next day,
 * and the same `<AsyncOperationStatus operationId>` query shows the
 * final state (the operation lives in Inngest, not in this component).
 */

export type AsyncOperationState = 'queued' | 'running' | 'complete' | 'failed';

interface BaseAsyncOperationProps {
  /** Inngest run id; surfaced as the data attribute for support. */
  operationId: string;
  /** Resolver-passed operation kind label (e.g. "Generating DORA RoI"). */
  label: ReactNode;
  className?: string;
}

interface AsyncOperationQueuedProps extends BaseAsyncOperationProps {
  state: 'queued';
  /** Resolver-passed queue-position hint, e.g. "Position 3 in queue". */
  queueHint?: ReactNode;
}

interface AsyncOperationRunningProps extends BaseAsyncOperationProps {
  state: 'running';
  /** 0–1 numeric progress. When undefined the bar shows indeterminate. */
  progress?: number;
  /** Resolver-passed progress hint (e.g. "12 / 28 articles embedded"). */
  progressHint?: ReactNode;
}

interface AsyncOperationCompleteProps extends BaseAsyncOperationProps {
  state: 'complete';
  /** Slot for the result action — download link, view link, etc. */
  action?: ReactNode;
  /** Resolver-passed completion summary. */
  summary?: ReactNode;
}

interface AsyncOperationFailedProps extends BaseAsyncOperationProps {
  state: 'failed';
  /** RFC 7807 error. Same shape as <ErrorState/>. */
  problem: RFC7807Problem;
  /** Optional retry — fires a fresh Inngest run. */
  onRetry?: () => void;
  /** Resolver-passed retry label. */
  retryLabel?: ReactNode;
}

export type AsyncOperationStatusProps =
  | AsyncOperationQueuedProps
  | AsyncOperationRunningProps
  | AsyncOperationCompleteProps
  | AsyncOperationFailedProps;

const COLORS: Record<AsyncOperationState, { fg: string; bg: string }> = {
  queued: { fg: 'rgb(var(--text-hushed))', bg: 'rgb(var(--bg-hover))' },
  running: { fg: 'rgb(var(--text-primary))', bg: 'rgb(var(--bg-hover))' },
  complete: { fg: 'rgb(var(--success))', bg: 'rgb(var(--bg-hover))' },
  failed: { fg: 'rgb(var(--danger-text))', bg: 'rgb(var(--bg-hover))' },
};

const LABELS: Record<AsyncOperationState, string> = {
  queued: 'Queued',
  running: 'Running',
  complete: 'Complete',
  failed: 'Failed',
};

export function AsyncOperationStatus(props: AsyncOperationStatusProps) {
  const { state, operationId, label, className } = props;
  const colors = COLORS[state];

  return (
    <div
      className={cn('rounded-md border p-4', className)}
      style={{
        background: 'rgb(var(--surface))',
        borderColor: 'var(--border)',
      }}
      // biome-ignore lint/a11y/useSemanticElements: AsyncOperationStatus is a wrapper-styled status container; <output> is for form-derived values, not arbitrary status text. Matches the <EmptyState/> rationale in states.tsx.
      role="status"
      aria-live="polite"
      data-state={state}
      data-operation-id={operationId}
    >
      <header className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
          {label}
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[0.7rem] uppercase tracking-wider"
          style={{ color: colors.fg, background: colors.bg }}
        >
          {LABELS[state]}
        </span>
      </header>

      {state === 'queued' ? (
        <p className="mt-2 text-xs" style={{ color: 'rgb(var(--text-hushed))' }}>
          {props.queueHint ?? 'Waiting for an executor.'}
        </p>
      ) : null}

      {state === 'running' ? (
        <div className="mt-2 space-y-1">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: 'var(--border)' }}
            role="progressbar"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              typeof props.progress === 'number' ? Math.round(props.progress * 100) : undefined
            }
          >
            <div
              className={cn('h-full', props.progress === undefined ? 'w-1/3 animate-pulse' : '')}
              style={{
                background: 'rgb(var(--accent))',
                width:
                  props.progress !== undefined
                    ? `${Math.round(Math.max(0, Math.min(1, props.progress)) * 100)}%`
                    : undefined,
              }}
            />
          </div>
          {props.progressHint ? (
            <p className="text-xs" style={{ color: 'rgb(var(--text-hushed))' }}>
              {props.progressHint}
            </p>
          ) : null}
        </div>
      ) : null}

      {state === 'complete' ? (
        <div className="mt-2 space-y-2">
          {props.summary ? (
            <p className="text-xs" style={{ color: 'rgb(var(--text-hushed))' }}>
              {props.summary}
            </p>
          ) : null}
          {props.action ? <div>{props.action}</div> : null}
        </div>
      ) : null}

      {state === 'failed' ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm" style={{ color: 'rgb(var(--danger-text))' }}>
            {props.problem.title}
          </p>
          {props.problem.detail ? (
            <p className="text-xs" style={{ color: 'rgb(var(--text-hushed))' }}>
              {props.problem.detail}
            </p>
          ) : null}
          {props.onRetry ? (
            <button
              type="button"
              onClick={props.onRetry}
              className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs"
              style={{
                background: 'rgb(var(--surface))',
                color: 'rgb(var(--text-primary))',
                borderColor: 'var(--border-strong)',
              }}
            >
              {props.retryLabel ?? 'Retry'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
