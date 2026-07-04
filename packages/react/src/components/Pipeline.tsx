import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface PipelineProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Horizontal stage pipeline over `.uix-pipeline`. Contains `PipelineStage`s. */
export function Pipeline({ className, children, ...props }: PipelineProps) {
  return (
    <div className={cx('uix-pipeline', className)} {...props}>
      {children}
    </div>
  );
}

export type PipelineStageState = 'done' | 'active' | 'ok' | 'breach';

export interface PipelineStageProps extends HTMLAttributes<HTMLDivElement> {
  /** Stage state; drives the colour (`data-state`). */
  state?: PipelineStageState;
  children?: ReactNode;
}

/** One stage over `.uix-pipeline__stage`. */
export function PipelineStage({ state, className, children, ...props }: PipelineStageProps) {
  return (
    <div className={cx('uix-pipeline__stage', className)} data-state={state} {...props}>
      {children}
    </div>
  );
}
