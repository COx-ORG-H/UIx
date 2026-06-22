import type { ReactNode, HTMLAttributes, CSSProperties } from 'react';
import { cx } from '../cx.js';

export interface LabelProps extends HTMLAttributes<HTMLSpanElement> {
  /** Any CSS color or a `--uix-chart-*` var; sets `--label-color`. */
  color?: string;
  dot?: boolean;
  children?: ReactNode;
}

/** Colored label / tag over `.uix-label`. */
export function Label({ color, dot, children, className, style, ...props }: LabelProps) {
  const merged = (color ? { '--label-color': color, ...style } : style) as CSSProperties;
  return (
    <span className={cx('uix-label', className)} style={merged} {...props}>
      {dot && <span className="uix-label__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
