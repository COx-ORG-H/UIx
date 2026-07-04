import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface ViewMenuProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** View / display-settings panel over `.uix-view-menu` (drop it inside a Popover). Contains
 *  `ViewMenuGroup`s. Purely presentational — the controls inside are consumer-owned. */
export function ViewMenu({ className, children, ...props }: ViewMenuProps) {
  return (
    <div className={cx('uix-view-menu', className)} {...props}>
      {children}
    </div>
  );
}

export interface ViewMenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Section eyebrow, rendered in `.uix-view-menu__label`. */
  label?: ReactNode;
  children?: ReactNode;
}

/** One section over `.uix-view-menu__group` with an optional uppercase label. */
export function ViewMenuGroup({ label, className, children, ...props }: ViewMenuGroupProps) {
  return (
    <div className={cx('uix-view-menu__group', className)} {...props}>
      {label != null && <div className="uix-view-menu__label">{label}</div>}
      {children}
    </div>
  );
}

export interface ViewMenuRowProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** One control row over `.uix-view-menu__row` (label on the left, control on the right). */
export function ViewMenuRow({ className, children, ...props }: ViewMenuRowProps) {
  return (
    <div className={cx('uix-view-menu__row', className)} {...props}>
      {children}
    </div>
  );
}
