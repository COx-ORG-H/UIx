import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cx('uix-textarea', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
