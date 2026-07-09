import { useId, isValidElement, cloneElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
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

/** Props Field injects into its control child so the message + invalid state are wired
 *  for assistive tech without the consumer threading ids by hand. */
type ControlAria = { 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' };

/**
 * Labelled form field. The validation `error` (or `success` / `hint`) is wired to the
 * control via `aria-describedby`, an `error` sets `aria-invalid` on the control and is
 * announced (`role="alert"`), and the message line reserves its height so an error
 * appearing causes no layout shift.
 */
export function Field({ label, hint, error, success, required, children, className, htmlFor }: FieldProps) {
  const uid = useId();
  const msgId = `${uid}-msg`;
  const hasMessage = Boolean(error || success || hint);

  // Wire the control (when it's a single element) to the message + invalid state,
  // preserving any aria props the consumer already set.
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<ControlAria>, {
        'aria-invalid': error ? true : (children.props as ControlAria)['aria-invalid'],
        'aria-describedby':
          [(children.props as ControlAria)['aria-describedby'], hasMessage ? msgId : undefined]
            .filter(Boolean)
            .join(' ') || undefined,
      })
    : children;

  return (
    <div className={cx('uix-field', className)}>
      {label && (
        <label className="uix-field__label" htmlFor={htmlFor} data-required={required || undefined}>
          {label}
        </label>
      )}
      {control}
      {/* Always rendered (reserves the line height → no layout shift when a message
          appears). `role="alert"` only for an error, so a validation error is announced. */}
      <div id={msgId} className="uix-field__message" role={error ? 'alert' : undefined}>
        {error && <span className="uix-field__error">{error}</span>}
        {success && !error && <span className="uix-field__success">{success}</span>}
        {hint && !error && !success && <span className="uix-field__hint">{hint}</span>}
      </div>
    </div>
  );
}
