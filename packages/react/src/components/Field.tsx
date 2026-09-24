import { cloneElement, isValidElement, useId } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { cx } from '../cx.js';
import { InfoTip } from './InfoTip.js';
import { hasHelp, helpLabelFor } from '../info-tip-model.js';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  /**
   * Plain-text help behind a ? button after the label (before the required marker). Blank
   * lines separate paragraphs; empty, whitespace-only or `null` renders no button. Needs `label`.
   * Keep format or validation instructions in `hint`, where they stay visible.
   */
  help?: string | null;
  /** Accessible name of the ? button. Default `"About: <label>"`; pass a localised one. */
  helpLabel?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function Field({ label, hint, error, success, required, help, helpLabel, children, className, htmlFor }: FieldProps) {
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
      {/* With help, the ? button sits BESIDE the label, never inside it: a button inside a <label>
          becomes the label's activation target, so clicking the label would press the ?
          (TENSOR HAR-743). The row then draws the required marker itself, after the ?. */}
      {label && hasHelp(help) ? (
        <div className="uix-field__label-row">
          <label className="uix-field__label" htmlFor={htmlFor ?? controlId}>{label}</label>
          <InfoTip content={help} label={helpLabel ?? helpLabelFor(label)} />
          {required && <span className="uix-field__required" aria-hidden="true">*</span>}
        </div>
      ) : label && (
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
