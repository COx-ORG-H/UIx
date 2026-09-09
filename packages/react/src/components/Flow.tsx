import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export type FlowVariant = 'linear' | 'branch' | 'loop' | 'mindmap' | 'canvas';
export type FlowNodeState = 'pending' | 'active' | 'running' | 'done' | 'error';

export interface FlowProps extends HTMLAttributes<HTMLDivElement> {
  variant?: FlowVariant;
  panel?: boolean;
  children?: ReactNode;
}

/** Presentational workflow surface. Consumers provide graph geometry and connectors. */
export function Flow({ variant = 'linear', panel = false, children, className, role = 'group', ...props }: FlowProps) {
  return (
    <div
      className={cx('uix-flow', `uix-flow--${variant}`, panel && 'uix-flow--panel', className)}
      role={role}
      {...props}
    >
      {children}
    </div>
  );
}

export interface FlowNodeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  state?: FlowNodeState;
  stateLabel?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

const FLOW_STATE_LABELS: Record<FlowNodeState, string> = {
  pending: 'Pending', active: 'Active', running: 'Running', done: 'Done', error: 'Error',
};

/** Workflow node with explicit text state and optional operational metadata. */
export function FlowNode({
  title,
  state = 'pending',
  stateLabel,
  eyebrow,
  meta,
  icon,
  footer,
  wide = false,
  className,
  ...props
}: FlowNodeProps) {
  const resolvedStateLabel = stateLabel ?? FLOW_STATE_LABELS[state];
  return (
    <div className={cx('uix-node', `uix-node--${state}`, icon == null && 'uix-node--no-icon', wide && 'uix-node--wide', className)} {...props}>
      {icon != null && <span className="uix-node__icon" aria-hidden="true">{icon}</span>}
      <div className="uix-node__body">
        {eyebrow != null && <div className="uix-node__eyebrow">{eyebrow}</div>}
        <div className="uix-node__title">{title}</div>
        {meta != null && <div className="uix-node__meta">{meta}</div>}
        <div className="uix-node__status">{resolvedStateLabel}</div>
      </div>
      {footer != null && <div className="uix-node__footer">{footer}</div>}
    </div>
  );
}
