import { cloneElement, isValidElement, useId } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { cx } from '../cx.js';
import { InfoTip } from './InfoTip.js';
import { Combobox } from './Combobox.js';
import { hasHelp, helpTopic } from '../info-tip-model.js';
import { FieldAiNote, FieldAiParts } from './AiLabel.js';
import type { AiExplanation } from './AiLabel.js';
import type { AiLabels } from '../ai-labels.js';

/**
 * The AI state of a field (Carbon for AI's variant model; `useAiFieldValue` builds it). `filled`:
 * the value came from AI and is not yet the person's: the "AI" mark after the label, the review
 * border of `Input warning` and "Filled in by AI. Check it." under the control. `edited`: a person
 * changed it, so it is theirs: no mark, no review state, and "Revert to AI" brings the AI value back.
 */
export interface FieldAi {
  state: 'filled' | 'edited';
  /** What the AI mark opens. */
  explanation?: AiExplanation;
  /** Restore the AI value. Without it an edited field shows no "Revert to AI". */
  onRevert?: () => void;
  labels?: Partial<AiLabels>;
}

export interface FieldProps {
  label?: string;
  hint?: string;
  /** The error under the control, announced at once (`role="alert"`). Text, or a node such as a sentence with a link. */
  error?: ReactNode;
  /**
   * How a new `error` is announced. `'assertive'` (default) interrupts (`role="alert"`). `'polite'`
   * waits for the screen reader to finish, through a hidden polite region that only ever holds the
   * error: an error found when the person left the field should not cut into what the next one reads. `'off'` announces nothing: the error
   * is still the control's description, read when it is focused, for errors a summary already
   * announced (`useFormErrors` picks these for you).
   */
  errorAnnounce?: 'assertive' | 'polite' | 'off';
  /**
   * Visually hidden text before the error, e.g. `"Error:"`, so a screen reader says it is one
   * (GOV.UK). None by default; `useFormErrors` passes the translated `errorSummary.errorPrefix`.
   */
  errorPrefix?: string;
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
  /**
   * The id of the message line (HAR-3100), which the control's `aria-describedby` points at. Default:
   * a generated one. Pass it when a product's tests or other elements need a fixed id.
   */
  messageId?: string;
  children: ReactNode;
  className?: string;
  /** Explicit label target. When a Combobox also supplies `inputId`, the two IDs must match. */
  htmlFor?: string;
  /** The value came from AI: see {@link FieldAi}. Needs `label`. */
  ai?: FieldAi;
}

/** Recognize a direct Combobox and React.memo wrappers without assuming anything about other controls. */
function isComboboxElement(child: ReactElement): boolean {
  let type: unknown = child.type;
  while (type !== null && typeof type === 'object' && Reflect.get(type, '$$typeof') === Symbol.for('react.memo')) {
    type = Reflect.get(type, 'type');
  }
  return type === Combobox;
}

export function Field({ label, hint, error, errorAnnounce = 'assertive', errorPrefix, warning, success, required, help, helpLabel, labelId, messageId, children, className, htmlFor, ai }: FieldProps) {
  const uid = useId();
  // Field stays server-renderable: the AI words are read by client parts (FieldAiParts, FieldAiNote)
  const aiFilled = ai?.state === 'filled';
  const aiNote = aiFilled ? <FieldAiNote labels={ai?.labels} /> : undefined;
  const msgId = messageId ?? `${uid}-msg`;
  const describedBy = (error || warning || aiNote || success || hint) ? msgId : undefined;

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
        'data-warning': (children.props as Record<string, unknown>)['data-warning'] ?? (((warning || aiFilled) && !error) || undefined),
      })
    : children;
  const aiParts = label && ai ? <FieldAiParts ai={ai} label={label} controlId={controlId} /> : null;

  return (
    <div className={cx('uix-field', className)}>
      {/* With help, the ? button sits BESIDE the label, never inside it: a button inside a <label>
          becomes the label's activation target, so clicking the label would press the ?
          (TENSOR HAR-743). The row then draws the required marker itself, after the ?. */}
      {label && (hasHelp(help) || aiParts) ? (
        <div className="uix-field__label-row">
          <label id={labelId} className="uix-field__label" htmlFor={htmlFor ?? controlId}>{label}</label>
          {hasHelp(help) && <InfoTip content={help} label={helpLabel} topic={helpTopic(label)} />}
          {required && <span className="uix-field__required" aria-hidden="true">*</span>}
          {aiParts}
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
          <span className="uix-field__error" role={errorAnnounce === 'assertive' ? 'alert' : undefined}>
            {errorPrefix && <span className="uix-visually-hidden">{`${errorPrefix} `}</span>}
            {error}
          </span>
        ) : warning ? (
          <span className="uix-field__warning" role="status">{warning}</span>
        ) : aiNote ? (
          <span className="uix-field__warning uix-field__ai-note" role="status">{aiNote}</span>
        ) : success ? (
          <span className="uix-field__success" role="status">{success}</span>
        ) : hint ? (
          <span className="uix-field__hint">{hint}</span>
        ) : null}
      </div>
      {/* A polite error needs a region that is already there when the error arrives (a region
          inserted together with its text is often not read). It is its own hidden region, holding
          the error only, so a hint, warning or success taking the error's place is not read out. */}
      {/* Mounted for 'off' too (empty), so a field that goes from 'off' to 'polite' with a new
          error has its region in place already. */}
      {errorAnnounce !== 'assertive' && (
        <span className="uix-visually-hidden" aria-live="polite" data-uix-field-announce="">
          {errorAnnounce === 'polite' && error ? <>{errorPrefix ? `${errorPrefix} ` : null}{error}</> : null}
        </span>
      )}
    </div>
  );
}
