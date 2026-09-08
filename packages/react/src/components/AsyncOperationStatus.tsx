import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { Progress } from './Progress.js';
import { StatusPill } from './StatusPill.js';
import type { PillTone } from './StatusPill.js';

export type AsyncOperationState = 'queued' | 'running' | 'complete' | 'failed';

export interface AsyncOperationStatusProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  state: AsyncOperationState;
  title: ReactNode;
  statusLabel: ReactNode;
  description?: ReactNode;
  progress?: number;
  progressLabel?: string;
  action?: ReactNode;
}

const tones: Record<AsyncOperationState, PillTone> = {
  queued: 'neutral',
  running: 'info',
  complete: 'success',
  failed: 'danger',
};

export function AsyncOperationStatus({ state, title, statusLabel, description, progress, progressLabel, action, className, ...props }: AsyncOperationStatusProps) {
  return (
    <div className={cx('uix-operation', className)} role={state === 'failed' ? 'alert' : 'status'} aria-live="polite" {...props}>
      <div className="uix-operation__head"><strong>{title}</strong><StatusPill tone={tones[state]}>{statusLabel}</StatusPill></div>
      {description != null && <div className="uix-operation__description">{description}</div>}
      {progress != null && <Progress value={progress} aria-label={progressLabel} />}
      {action != null && <div className="uix-operation__action">{action}</div>}
    </div>
  );
}
