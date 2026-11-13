import { cloneElement, isValidElement, useId } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { cx } from '../cx.js';
import { InfoTip } from './InfoTip.js';
import { Combobox } from './Combobox.js';
import { hasHelp } from '../info-tip-model.js';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  /**
   * A value to check, not an error (HAR-1814): shown under the control in the warning colour,
   * announced politely, and marks the control `data-warning`. `error` wins over it; it wins
   * over `success` and `hint`.
   */
  warning?: string;
  success?: string;
  required?: boolean;
  /**
   * Plain-text help behind a ? button after the label (before the required marker). Blank
   * lines separate paragraphs; empty, whitespace-only or `null` renders no button. Needs `label`.
   * Keep format or validation instructions in `hint`, where they stay visible.
   */
  help?: string | null;
  /**
   * Accessible name of the ? button. Default: the `UixLabelsProvider` `infoTip.about` template
   * with the label (`"About: <label>"` without a provider).
   */
  helpLabel?: string;
  /**
   * The label element's id (HAR-3100), so a control that is not a labelable element (a rich-text
   * editor, a `role="textbox"` region) can name itself with `aria-labelledby`. A native control
   * needs none: the label's `htmlFor` names it.
   */
  labelId?: string;
  children: ReactNode;
  className?: string;
  /** Explicit label target. When a Combobox also supplies `inputId`, the two IDs must match. */
  htmlFor?: string;
}

/** Recognize a direct Combobox and React.memo wrappers without assuming anything about other controls. */
function isComboboxElement(child: ReactElement): boolean {
  let type: unknown = child.type;
  while (type !== null && typeof type === 'object' && Reflect.get(type, '$$typeof') === Symbol.for('react.memo')) {
    type = Reflect.get(type, 'type');
  }
  return type === Combobox;
}

export function Field({ label, hint, error, warning, success, required, help, helpLabel, labelId, children, className, htmlFor }: FieldProps) {
  const uid = useId();
  const msgId = `${uid}-msg`;
  const describedBy = (error || warning || success || hint) ? msgId : undefined;

  // Wire the message to the control for assistive tech: aria-describedby (so it's announced) and
  // aria-invalid on error. Done when children is a single element (the common one-control case);
  // any existing aria-describedby on the control is preserved (UIX-FIX-04).
  // Also auto-associate the label: the control gets a generated id (its own id wins) that the
  // label's htmlFor defaults to, plus aria-required when the field is required (UIX-A11Y-3).
  const isCombobox = isValidElement(children) && isComboboxElement(children);
  const controlId = isValidElement(children)
    ? (isCombobox
      ? ((children.props as Record<string, unknown>).inputId as string | undefined) ?? htmlFor ?? `${uid}-ctl`
      : ((children.props as Record<string, unknown>).id as string | undefined) ?? `${uid}-ctl`)
    : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        ...(isCombobox ? { inputId: controlId } : { id: controlId }),
        'aria-describedby': [(children.props as Record<string, unknown>)['aria-describedby'], describedBy]
          .filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : (children.props as Record<string, unknown>)['aria-invalid'],
        'aria-required': (children.props as Record<string, unknown>)['aria-required'] ?? (required || undefined),
        'data-warning': (children.props as Record<string, unknown>)['data-warning'] ?? ((warning && !error) || undefined),
      })
    : children;

  return (
    <div className={cx('uix-field', className)}>
      {/* With help, the ? button sits BESIDE the label, never inside it: a button inside a <label>
          becomes the label's activation target, so clicking the label would press the ?
          (TENSOR HAR-743). The row then draws the required marker itself, after the ?. */}
      {label && hasHelp(help) ? (
        <div className="uix-field__label-row">
          <label id={labelId} className="uix-field__label" htmlFor={htmlFor ?? controlId}>{label}</label>
          <InfoTip content={help} label={helpLabel} topic={label} />
          {required && <span className="uix-field__required" aria-hidden="true">*</span>}
        </div>
      ) : label && (
        <label id={labelId} className="uix-field__label" htmlFor={htmlFor ?? controlId} data-required={required || undefined}>
          {label}
        </label>
      )}
      {control}
      {/* Always rendered with a reserved min-height so an error appearing never shifts the layout.
          role="alert" announces the error the moment it's inserted, role="status" the success
          (polite, so it doesn't interrupt), as is a warning; error > warning > success > hint. */}
      <div className="uix-field__msg" id={msgId}>
        {error ? (
          <span className="uix-field__error" role="alert">{error}</span>
        ) : warning ? (
          <span className="uix-field__warning" role="status">{warning}</span>
        ) : success ? (
          <span className="uix-field__success" role="status">{success}</span>
        ) : hint ? (
          <span className="uix-field__hint">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
