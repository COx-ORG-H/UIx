"use client";

import { useEffect, useId, useState } from 'react';
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { clampMetricValue, parseMetricValue, stepMetricValue } from '../metric-model.js';
import { Input } from './Input.js';

export interface MetricInputProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label: string;
  invalid?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  readOnly?: boolean;
  parse?: (input: string) => number | null;
  format?: (value: number | null) => string;
  className?: string;
  id?: string;
}

const defaultMetricFormat = (input: number | null) => input == null ? '' : String(input);

/** Accessible numeric recipe composed from Input and the UIx stepper controls. */
export function MetricInput({
  value, onValueChange, min, max, step = 1, unit, label, invalid, errorMessage,
  disabled, readOnly, parse = parseMetricValue, format = defaultMetricFormat,
  className, id: providedId,
}: MetricInputProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const [text, setText] = useState(() => format(value));

  useEffect(() => setText(format(value)), [value, format]);

  const commit = (input: string) => {
    const parsed = parse(input);
    if (input.trim() === '' || parsed !== null) {
      onValueChange(parsed === null ? null : clampMetricValue(parsed, min, max));
    }
  };
  const stepBy = (direction: -1 | 1) => {
    const next = stepMetricValue(value, direction, { min, max, step });
    onValueChange(next);
    setText(format(next));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      stepBy(event.key === 'ArrowUp' ? 1 : -1);
    }
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.currentTarget.value);
    commit(event.currentTarget.value);
  };
  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    const parsed = parse(event.currentTarget.value);
    setText(parsed === null && event.currentTarget.value.trim() !== '' ? format(value) : format(parsed));
  };

  return (
    <div className={cx('uix-metric-input', invalid && 'uix-metric-input--invalid', className)}>
      <label className="uix-field__label" htmlFor={id}>{label}</label>
      <div className="uix-metric-input__control">
        <Input
          id={id}
          value={text}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          inputMode="decimal"
          role="spinbutton"
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-describedby={invalid && errorMessage ? errorId : undefined}
          invalid={invalid}
          disabled={disabled}
          readOnly={readOnly}
        />
        {unit && <span className="uix-metric-input__unit" aria-hidden="true">{unit}</span>}
        <span className="uix-metric-input__steps">
          <button type="button" className="uix-metric-input__step" onClick={() => stepBy(1)} disabled={disabled || readOnly} aria-label={`Increase ${label}`}>+</button>
          <button type="button" className="uix-metric-input__step" onClick={() => stepBy(-1)} disabled={disabled || readOnly} aria-label={`Decrease ${label}`}>−</button>
        </span>
      </div>
      {unit && <span className="uix-visually-hidden">Unit: {unit}</span>}
      {invalid && errorMessage && <span id={errorId} className="uix-field__error">{errorMessage}</span>}
    </div>
  );
}
