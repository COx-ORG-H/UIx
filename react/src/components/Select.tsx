import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'md', className, ...props }, ref) => (
    <select
      ref={ref}
      className={cx('uix-select', size === 'sm' && 'uix-select--sm', className)}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
