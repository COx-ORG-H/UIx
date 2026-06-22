import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className, ...props }, ref) => (
    <label className={cx('uix-switch', className)}>
      <input type="checkbox" role="switch" ref={ref} {...props} />
      <span className="uix-switch__track" />
      {label}
    </label>
  ),
);
Switch.displayName = 'Switch';
