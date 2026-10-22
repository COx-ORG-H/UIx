import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /**
   * `lg`: the public-page size beside `Input size="lg"` and `Button size="lg"` (HAR-1812): larger
   * text and padding, never shorter than 44 px. It still grows with `rows` and the resize handle.
   */
  size?: 'md' | 'lg';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, size = 'md', className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cx('uix-textarea', size === 'lg' && 'uix-textarea--lg', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
