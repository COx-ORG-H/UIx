import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/** Keyboard-shortcut chip over `.uix-kbd` (renders a semantic `<kbd>`). */
export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd className={cx('uix-kbd', className)} {...props}>
      {children}
    </kbd>
  );
}
