import { cloneElement, forwardRef, isValidElement } from 'react';
import type { AriaAttributes, InputHTMLAttributes, ReactElement, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * `sm` 28 px, `md` 36 px (default), `lg` 44 px: the touch-target floor of a public page, the
   * same height as `Button size="lg"` (HAR-1812).
   */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  valid?: boolean;
  /**
   * "Check this": a value the reader should confirm, not an error, e.g. one an assistant filled
   * in (HAR-1814). Draws the warning border; `invalid` wins when both are set.
   */
  warning?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', invalid, valid, warning, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cx('uix-input', size !== 'md' && `uix-input--${size}`, className)}
      aria-invalid={invalid || undefined}
      data-valid={valid || undefined}
      data-warning={warning || undefined}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export interface InputGroupProps {
  children: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  /** Injected by `<Field>` when it wraps the group; forwarded onto the child control. */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-required'?: AriaAttributes['aria-required'];
}

/**
 * Icon-adorned wrapper for a child `<Input>`. The control is passed as `children`, so
 * `<Field>`'s injected `id`/`aria-*` land on this wrapper — they're forwarded onto the
 * single child element (the child's own props win) so label/message association survives
 * the extra div (UIX-A11Y-3).
 */
export function InputGroup({
  children, leadingIcon, trailingIcon, className,
  id, 'aria-describedby': describedBy, 'aria-invalid': invalid, 'aria-required': required,
}: InputGroupProps) {
  const control = isValidElement(children) && (id ?? describedBy ?? invalid ?? required) != null
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children.props as Record<string, unknown>).id ?? id,
        'aria-describedby': (children.props as Record<string, unknown>)['aria-describedby'] ?? describedBy,
        'aria-invalid': (children.props as Record<string, unknown>)['aria-invalid'] ?? invalid,
        'aria-required': (children.props as Record<string, unknown>)['aria-required'] ?? required,
      })
    : children;
  return (
    <div
      className={cx(
        'uix-input-group',
        leadingIcon && 'uix-input-group--has-leading',
        trailingIcon && 'uix-input-group--has-trailing',
        className,
      )}
    >
      {leadingIcon && <span className="uix-input-group__icon" aria-hidden="true">{leadingIcon}</span>}
      {control}
      {trailingIcon && <span className="uix-input-group__icon uix-input-group__icon--trailing" aria-hidden="true">{trailingIcon}</span>}
    </div>
  );
}
