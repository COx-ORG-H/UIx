import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode, MutableRefObject } from 'react';
import { cx } from '../cx.js';

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="1.5,6 4.5,9 10.5,3" />
  </svg>
);

const IndeterminateIcon = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor" />
  </svg>
);

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, className, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const el = innerRef.current;
      if (el) el.indeterminate = !!indeterminate;
    }, [indeterminate]);

    return (
      <label className={cx('uix-checkbox', className)}>
        <input
          type="checkbox"
          ref={(node) => {
            (innerRef as MutableRefObject<HTMLInputElement | null>).current = node;
            if (typeof forwardedRef === 'function') forwardedRef(node);
            else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          {...props}
        />
        <span className="uix-checkbox__box">
          {indeterminate ? <IndeterminateIcon /> : <CheckIcon />}
        </span>
        {label}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
