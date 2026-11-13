"use client";

import { forwardRef } from 'react';
import { Input } from './Input.js';
import type { InputProps } from './Input.js';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'value' | 'defaultValue'> {
  /**
   * The number the field holds. `NaN`, `null` or `undefined` shows an empty field. Passing the prop
   * at all makes the field controlled, so a form value that starts `undefined` and becomes a number
   * never switches it; leave the prop out (or use `defaultValue`) for an uncontrolled field.
   */
  value?: number | null;
  /** The starting number of an uncontrolled field. */
  defaultValue?: number;
  /**
   * Called on every change with the field's `valueAsNumber` (HAR-3100, the rule of TENSOR
   * HAR-1597): a number, or `NaN` when the field is empty or holds no number yet. Never the typed
   * text, which a form library would store as a string (digits vanished as they were typed), and
   * never `0` or `undefined` for an emptied field, which read as "zero" and "use the default".
   */
  onValueChange?: (value: number) => void;
}

/**
 * A number field (`<input type="number">`, `inputMode="decimal"` and `step="any"` by default, so a
 * decimal is never a step mismatch) whose value is a number. Feed `onValueChange` back into `value`:
 * what was typed stays in the box, an emptied field is `NaN`, so a required number refuses it.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>((allProps, ref) => {
  const { value, onValueChange, onChange, inputMode = 'decimal', step = 'any', ...props } = allProps;
  // controlled when the prop is passed, even as undefined: a form field that starts empty stays controlled
  const controlled = Object.prototype.hasOwnProperty.call(allProps, 'value');
  return (
    <Input
      ref={ref}
      inputMode={inputMode}
      step={step}
      {...props}
      {...(controlled ? { value: value == null || Number.isNaN(value) ? '' : value } : {})}
      onChange={(event) => {
        onChange?.(event);
        onValueChange?.(event.currentTarget.valueAsNumber);
      }}
      // last, so a stray `type` in the props can never make it a text field
      type="number"
    />
  );
});
NumberInput.displayName = 'NumberInput';
