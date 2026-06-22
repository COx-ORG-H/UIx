import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md';
  invalid?: boolean;
  valid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', invalid, valid, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cx('uix-input', size === 'sm' && 'uix-input--sm', className)}
      aria-invalid={invalid || undefined}
      data-valid={valid || undefined}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export interface InputGroupProps {
  children: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
}

export function InputGroup({ children, leadingIcon, trailingIcon, className }: InputGroupProps) {
  return (
    <div
      className={cx(
        'uix-input-group',
        leadingIcon && 'uix-input-group--has-leading',
        trailingIcon && 'uix-input-group--has-trailing',
        className,
      )}
    >
      {leadingIcon && <span className="uix-input-group__icon">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="uix-input-group__icon uix-input-group__icon--trailing">{trailingIcon}</span>}
    </div>
  );
}
