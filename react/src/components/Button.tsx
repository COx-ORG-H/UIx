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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon = false, loading = false, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cx(
        'uix-btn',
        `uix-btn--${variant}`,
        size !== 'md' && `uix-btn--${size}`,
        icon && 'uix-btn--icon',
        className,
      )}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export interface ButtonGroupProps {
  children?: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return <div className={cx('uix-btn-group', className)}>{children}</div>;
}
