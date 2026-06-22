import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Native popover behavior. Defaults to `"auto"` (light-dismiss). A trigger
   * wires to it via `popoverTarget={id}`. Pass `"manual"` to control open state yourself.
   */
  popover?: 'auto' | 'manual';
  children?: ReactNode;
}

/**
 * Anchored surface over `.uix-popover`, using the native Popover API.
 * Compose ITSM things like a filter popover by putting controls inside.
 */
export function Popover({ popover = 'auto', children, className, ...props }: PopoverProps) {
  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover } as Record<string, string>;
  return (
    <div className={cx('uix-popover', className)} {...popoverAttr} {...props}>
      {children}
    </div>
  );
}
