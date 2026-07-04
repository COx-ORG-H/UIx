import type { ReactNode, HTMLAttributes } from 'react';
import { Children, Fragment } from 'react';
import { cx } from '../cx.js';

export interface StepsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Step / wizard track over `.uix-steps`. Inserts a `.uix-step__connector` between each `Step`;
 *  the connector after a `done` step is coloured by the CSS adjacent-sibling rule. */
export function Steps({ className, children, ...props }: StepsProps) {
  const items = Children.toArray(children); // toArray drops null/undefined/boolean children
  return (
    <div className={cx('uix-steps', className)} {...props}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="uix-step__connector" aria-hidden="true" />}
          {child}
        </Fragment>
      ))}
    </div>
  );
}

export type StepState = 'active' | 'done';

export interface StepProps extends HTMLAttributes<HTMLDivElement> {
  /** Marker glyph or number shown in the circle. */
  marker?: ReactNode;
  /** Visual state; drives the marker + following connector styling. */
  state?: StepState;
  children?: ReactNode;
}

/** One step: a `.uix-step__marker` circle + an optional `.uix-step__label` over `.uix-step`. */
export function Step({ marker, state, className, children, ...props }: StepProps) {
  return (
    <div className={cx('uix-step', className)} data-state={state} {...props}>
      <span className="uix-step__marker">{marker}</span>
      {children != null && <span className="uix-step__label">{children}</span>}
    </div>
  );
}
