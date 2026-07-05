import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type SlaState = 'ok' | 'at-risk' | 'breach';

export interface SlaProps extends HTMLAttributes<HTMLSpanElement> {
  /** Breach state; drives the colour (`ok` | `at-risk` | `breach`). */
  state?: SlaState;
  /** Optional leading icon (decorative — give it `aria-hidden`). */
  icon?: ReactNode;
  children?: ReactNode;
}

/** SLA timer / breach indicator over `.uix-sla`. */
export function Sla({ state, icon, className, children, ...props }: SlaProps) {
  return (
    <span className={cx('uix-sla', className)} data-state={state} {...props}>
      {icon}
      {children}
    </span>
  );
}
