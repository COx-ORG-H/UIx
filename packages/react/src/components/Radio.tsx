import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { CheckIcon } from '../icons/components.js';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, ...props }, ref) => (
    <label className={cx('uix-radio', className)}>
      <input type="radio" ref={ref} {...props} />
      <span className="uix-radio__dot" />
      {label}
    </label>
  ),
);
Radio.displayName = 'Radio';

export interface RadioCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'title'> {
  /** The choice's name. */
  title: ReactNode;
  /** One or two lines that explain the choice. */
  description?: ReactNode;
  /** A preview, an illustration or an icon above the text (decorative: the title names the choice). */
  media?: ReactNode;
}

/**
 * A radio as a card (HAR-1373; TENSOR C17/B14): for a choice whose options need a preview or
 * a description (appearance, plan, mode). It is a native radio inside a label, so the group's
 * keyboard, form value and `required` work as for `Radio`. The selected card shows a check
 * mark and a stronger border, never colour alone. Put the cards in
 * `<RadioGroup variant="card" label="…">` and give them one `name`.
 */
export const RadioCard = forwardRef<HTMLInputElement, RadioCardProps>(
  ({ title, description, media, className, ...props }, ref) => (
    <label className={cx('uix-radio-card', className)}>
      <input type="radio" ref={ref} {...props} />
      {media != null && <span className="uix-radio-card__media" aria-hidden="true">{media}</span>}
      <span className="uix-radio-card__body">
        <span className="uix-radio-card__title">{title}</span>
        {description != null && <span className="uix-radio-card__desc">{description}</span>}
      </span>
      <span className="uix-radio-card__check" aria-hidden="true"><CheckIcon size="sm" /></span>
    </label>
  ),
);
RadioCard.displayName = 'RadioCard';

export interface RadioGroupProps {
  children: ReactNode;
  className?: string;
  /** Group name; when set the group renders as fieldset/legend so it's announced with each radio. */
  label?: ReactNode;
  /**
   * `'list'` (default): radios in a column. `'card'`: a grid of `RadioCard`s that wraps to one
   * column on a phone.
   */
  variant?: 'list' | 'card';
}

export function RadioGroup({ children, className, label, variant = 'list' }: RadioGroupProps) {
  const classes = cx('uix-radio-group', variant === 'card' && 'uix-radio-group--cards', className);
  // fieldset/legend gives the radios a programmatic group name (UIX-A11Y-3); without a
  // label the plain div stays, so existing callers see no DOM change.
  if (label == null) return <div className={classes}>{children}</div>;
  return (
    <fieldset className={classes}>
      <legend className="uix-radio-group__legend">{label}</legend>
      {children}
    </fieldset>
  );
}
