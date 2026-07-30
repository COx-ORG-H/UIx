import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  icon?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

// Bundlers substitute the literal `process.env.NODE_ENV`; the typeof guard keeps
// un-bundled browser ESM from throwing where `process` doesn't exist.
declare const process: { env: { NODE_ENV?: string } } | undefined;
let warnedIconButton = false;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon = false, loading = false, className, children, disabled, onClick, ...props }, ref) => {
    // Dev-only nudge, once per page load: an icon-only button with no children and no
    // aria-label/aria-labelledby has no accessible name (UIX-A11Y-3).
    if (
      !warnedIconButton && icon && children == null &&
      !props['aria-label'] && !props['aria-labelledby'] &&
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
    ) {
      warnedIconButton = true;
      console.warn('uix: icon-only <Button> has no accessible name — pass aria-label or aria-labelledby.');
    }
    return (
      <button
        ref={ref}
        className={cx(
          'uix-btn',
          `uix-btn--${variant}`,
          size !== 'md' && `uix-btn--${size}`,
          icon && 'uix-btn--icon',
          className,
        )}
        // Only explicit `disabled` removes native semantics; `loading` keeps the button
        // focusable and announced as busy, with a click guard instead (UIX-A11Y-3).
        disabled={disabled}
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        onClick={loading || onClick ? (e) => { if (loading) { e.preventDefault(); return; } onClick?.(e); } : undefined}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export interface ButtonGroupProps {
  children?: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return <div className={cx('uix-btn-group', className)}>{children}</div>;
}
