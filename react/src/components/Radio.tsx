import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, ...props }, ref) => (
    <label className={cx('uix-radio', className)}>
      <input type="radio" ref={ref} {...props} />
      <span className="uix-radio__dot" />
      {label}
    </label>
  ),
);
Radio.displayName = 'Radio';

export interface RadioGroupProps {
  children: ReactNode;
  className?: string;
}

export function RadioGroup({ children, className }: RadioGroupProps) {
  return <div className={cx('uix-radio-group', className)}>{children}</div>;
}
