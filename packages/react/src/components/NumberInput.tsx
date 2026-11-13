"use client";

import { forwardRef } from 'react';
import { Input } from './Input.js';
import type { InputProps } from './Input.js';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'value' | 'defaultValue'> {
  /**
   * The number the field holds. `NaN` or `null` shows an empty field; leave it `undefined` for an
   * uncontrolled field.
   */
  value?: number | null;
  /**
   * Called on every change with the field's `valueAsNumber` (HAR-3100, the rule of TENSOR
   * HAR-1597): a number, or `NaN` when the field is empty or holds no number yet. Never the typed
   * text, which a form library would store as a string (digits vanished as they were typed), and
   * never `0` or `undefined` for an emptied field, which read as "zero" and "use the default".
   */
  onValueChange?: (value: number) => void;
}

/**
 * A number field (`<input type="number">`, `inputMode="decimal"` by default) whose value is a
 * number. Feed `onValueChange` back into `value`: what was typed stays in the box, an emptied field
 * is `NaN`, so a required number refuses it.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, onChange, inputMode = 'decimal', ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      step="any"
      inputMode={inputMode}
      {...(value !== undefined ? { value: value === null || Number.isNaN(value) ? '' : value } : {})}
      onChange={(event) => {
        onChange?.(event);
        onValueChange?.(event.currentTarget.valueAsNumber);
      }}
      {...props}
    />
  ),
);
NumberInput.displayName = 'NumberInput';
