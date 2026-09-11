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
  /** Group name; when set the group renders as fieldset/legend so it's announced with each radio. */
  label?: ReactNode;
}

export function RadioGroup({ children, className, label }: RadioGroupProps) {
  // fieldset/legend gives the radios a programmatic group name (UIX-A11Y-3); without a
  // label the plain div stays, so existing callers see no DOM change.
  if (label == null) return <div className={cx('uix-radio-group', className)}>{children}</div>;
  return (
    <fieldset className={cx('uix-radio-group', className)}>
      <legend className="uix-radio-group__legend">{label}</legend>
      {children}
    </fieldset>
  );
}
