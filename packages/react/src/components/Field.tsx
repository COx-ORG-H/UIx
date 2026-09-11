import { cloneElement, isValidElement, useId } from 'react';
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

export function Field({ label, hint, error, success, required, children, className, htmlFor }: FieldProps) {
  const uid = useId();
  const msgId = `${uid}-msg`;
  const describedBy = (error || success || hint) ? msgId : undefined;

  // Wire the message to the control for assistive tech: aria-describedby (so it's announced) and
  // aria-invalid on error. Done when children is a single element (the common one-control case);
  // any existing aria-describedby on the control is preserved (UIX-FIX-04).
  // Also auto-associate the label: the control gets a generated id (its own id wins) that the
  // label's htmlFor defaults to, plus aria-required when the field is required (UIX-A11Y-3).
  const controlId = isValidElement(children)
    ? (((children.props as Record<string, unknown>).id as string | undefined) ?? `${uid}-ctl`)
    : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: controlId,
        'aria-describedby': [(children.props as Record<string, unknown>)['aria-describedby'], describedBy]
          .filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : (children.props as Record<string, unknown>)['aria-invalid'],
        'aria-required': (children.props as Record<string, unknown>)['aria-required'] ?? (required || undefined),
      })
    : children;

  return (
    <div className={cx('uix-field', className)}>
      {label && (
        <label className="uix-field__label" htmlFor={htmlFor ?? controlId} data-required={required || undefined}>
          {label}
        </label>
      )}
      {control}
      {/* Always rendered with a reserved min-height so an error appearing never shifts the layout.
          role="alert" announces the error the moment it's inserted, role="status" the success
          (polite, so it doesn't interrupt); error > success > hint. */}
      <div className="uix-field__msg" id={msgId}>
        {error ? (
          <span className="uix-field__error" role="alert">{error}</span>
        ) : success ? (
          <span className="uix-field__success" role="status">{success}</span>
        ) : hint ? (
          <span className="uix-field__hint">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
