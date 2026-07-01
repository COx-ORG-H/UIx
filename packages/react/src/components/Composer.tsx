import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface ComposerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * Composer surface over `.uix-composer` — a single box that owns the
 * `:focus-within` accent ring. Drop a borderless `<textarea>` and a
 * `<ComposerBar>` inside; the descendant `textarea` picks up the composer's
 * padding/typography automatically, so the input never reads as a second
 * nested box.
 */
export function Composer({ children, className, ...props }: ComposerProps) {
  return (
    <div className={cx('uix-composer', className)} {...props}>
      {children}
    </div>
  );
}

export interface ComposerBarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Action footer for a `<Composer>` over `.uix-composer__bar` (top-bordered, right-aligned). */
export function ComposerBar({ children, className, ...props }: ComposerBarProps) {
  return (
    <div className={cx('uix-composer__bar', className)} {...props}>
      {children}
    </div>
  );
}
