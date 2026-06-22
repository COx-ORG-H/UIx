import type { ReactNode } from 'react';
import { cx } from '../cx.js';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function Field({ label, hint, error, success, required, children, className, htmlFor }: FieldProps) {
  return (
    <div className={cx('uix-field', className)}>
      {label && (
        <label className="uix-field__label" htmlFor={htmlFor} data-required={required || undefined}>
          {label}
        </label>
      )}
      {children}
      {error && <span className="uix-field__error">{error}</span>}
      {success && !error && <span className="uix-field__success">{success}</span>}
      {hint && !error && !success && <span className="uix-field__hint">{hint}</span>}
    </div>
  );
}
