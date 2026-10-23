"use client";

import { forwardRef, useEffect, useId, useRef } from 'react';
import type { CSSProperties, InputHTMLAttributes, ReactNode, MutableRefObject } from 'react';
import { cx } from '../cx.js';

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="1.5,6 4.5,9 10.5,3" />
  </svg>
);

const IndeterminateIcon = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor" />
  </svg>
);

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, className, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const el = innerRef.current;
      if (el) el.indeterminate = !!indeterminate;
    }, [indeterminate]);

    return (
      <label className={cx('uix-checkbox', className)}>
        <input
          type="checkbox"
          ref={(node) => {
            (innerRef as MutableRefObject<HTMLInputElement | null>).current = node;
            if (typeof forwardedRef === 'function') forwardedRef(node);
            else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          {...props}
        />
        <span className="uix-checkbox__box">
          {indeterminate ? <IndeterminateIcon /> : <CheckIcon />}
        </span>
        {label}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export interface CheckboxGroupProps {
  children: ReactNode;
  /** The group's name, rendered as the `<legend>`: announced with each checkbox (HAR-1799). */
  label: ReactNode;
  /** Help under the boxes, tied to the group with `aria-describedby`. */
  hint?: ReactNode;
  /** Shown instead of the hint and announced (`role="alert"`). */
  error?: ReactNode;
  /** Draws the required marker after the legend. Which boxes must be ticked is your rule to check. */
  required?: boolean;
  /** Disables every checkbox in the group (a disabled `<fieldset>`). */
  disabled?: boolean;
  /**
   * The most columns the boxes form. Default 1. A column is never narrower than 10rem: on a phone,
   * or in a narrow card, the boxes fall back to fewer columns.
   */
  columns?: number;
  id?: string;
  className?: string;
}

/**
 * Checkboxes under one name (HAR-1799; MOTUS UXR-05): a `<fieldset>` whose `<legend>` names the
 * group, so a screen reader says "Tags, group" before each box, with the field's hint and error
 * slot below. The checkbox counterpart of `<RadioGroup label>`. Put `Checkbox`es inside.
 */
export function CheckboxGroup({ children, label, hint, error, required, disabled, columns = 1, id, className }: CheckboxGroupProps) {
  const uid = useId();
  const msgId = `${id ?? uid}-msg`;
  const message = error != null && error !== false ? error : hint;
  const cols = Math.max(1, Math.floor(columns));
  return (
    <fieldset
      id={id}
      className={cx('uix-checkbox-group', className)}
      disabled={disabled}
      aria-describedby={message != null && message !== false ? msgId : undefined}
      data-invalid={(error != null && error !== false) || undefined}
    >
      <legend className="uix-checkbox-group__legend" data-required={required || undefined}>{label}</legend>
      <div
        className="uix-checkbox-group__options"
        style={cols > 1 ? ({ '--uix-checkbox-group-columns': cols } as CSSProperties) : undefined}
      >
        {children}
      </div>
      <div className="uix-field__msg" id={msgId}>
        {error != null && error !== false
          ? <span className="uix-field__error" role="alert">{error}</span>
          : hint != null && hint !== false ? <span className="uix-field__hint">{hint}</span> : null}
      </div>
    </fieldset>
  );
}
