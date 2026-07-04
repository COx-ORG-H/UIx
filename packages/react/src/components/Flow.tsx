import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type FlowVariant = 'linear' | 'branch' | 'loop' | 'mindmap' | 'canvas';

export interface FlowProps extends HTMLAttributes<HTMLDivElement> {
  /** Layout variant (`.uix-flow--<variant>`). */
  variant?: FlowVariant;
  children?: ReactNode;
}

/** Flow / diagram container over `.uix-flow`. Presentational: it lays out `FlowChip` nodes;
 *  the edges/arrows are consumer-authored SVG (`.uix-flow__edge*`, `.uix-flow__connector`). */
export function Flow({ variant, className, children, ...props }: FlowProps) {
  return (
    <div className={cx('uix-flow', variant && `uix-flow--${variant}`, className)} {...props}>
      {children}
    </div>
  );
}

export interface FlowChipProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** One node over `.uix-flow__chip`. */
export function FlowChip({ className, children, ...props }: FlowChipProps) {
  return (
    <div className={cx('uix-flow__chip', className)} {...props}>
      {children}
    </div>
  );
}
