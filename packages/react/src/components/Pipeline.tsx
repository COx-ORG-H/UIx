import { Children, cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export type PipelineStageState =
  | 'pending' | 'waiting' | 'active' | 'current' | 'running'
  | 'done' | 'complete' | 'blocked' | 'failed' | 'error';

export interface PipelineProps extends HTMLAttributes<HTMLOListElement> {
  detailed?: boolean;
  children?: ReactNode;
}

/** Ordered progress rail. Consumers own workflow meaning; UIx owns stage semantics and presentation. */
export function Pipeline({ detailed = false, children, className, tabIndex, ...props }: PipelineProps) {
  const stages = detailed
    ? Children.map(children, (child) => (
        isValidElement<PipelineStageProps>(child) && child.type === PipelineStage
          ? cloneElement(child, { detailed: child.props.detailed ?? true })
          : child
      ))
    : children;
  return (
    <ol
      className={cx('uix-pipeline', detailed && 'uix-pipeline--detailed', className)}
      tabIndex={tabIndex ?? (detailed ? 0 : undefined)}
      {...props}
    >
      {stages}
    </ol>
  );
}

export interface PipelineStageProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title'> {
  label: ReactNode;
  state?: PipelineStageState;
  stateLabel?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  marker?: ReactNode;
  detailed?: boolean;
  /** Marks the stage as the current position independently of its operational state. */
  current?: boolean;
}

const DEFAULT_STATE_LABELS: Record<PipelineStageState, string> = {
  pending: 'Pending', waiting: 'Waiting', active: 'Active', current: 'Current', running: 'Running',
  done: 'Done', complete: 'Complete', blocked: 'Blocked', failed: 'Failed', error: 'Error',
};

/** One pipeline stage. `stateLabel` keeps status explicit instead of relying on colour. */
export function PipelineStage({
  label,
  state = 'pending',
  stateLabel,
  description,
  meta,
  marker,
  detailed = false,
  current: currentProp,
  className,
  ...props
}: PipelineStageProps) {
  const current = currentProp ?? (state === 'active' || state === 'current' || state === 'running');
  const resolvedStateLabel = stateLabel ?? DEFAULT_STATE_LABELS[state];
  const showDetails = detailed || description != null || meta != null || marker != null;

  return (
    <li
      className={cx('uix-pipeline__stage', className)}
      data-state={state}
      aria-current={current ? 'step' : undefined}
      {...props}
    >
      {showDetails ? (
        <>
          <span className="uix-pipeline__marker" aria-hidden="true">{marker}</span>
          <div className="uix-pipeline__content">
            <div className="uix-pipeline__eyebrow">
              <span className="uix-pipeline__state">{resolvedStateLabel}</span>
            </div>
            <div className="uix-pipeline__title">{label}</div>
            {description != null && <div className="uix-pipeline__description">{description}</div>}
            {meta != null && <div className="uix-pipeline__meta">{meta}</div>}
          </div>
        </>
      ) : label}
    </li>
  );
}
