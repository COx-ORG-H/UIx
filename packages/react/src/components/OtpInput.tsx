"use client";

import { forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { AriaAttributes, CSSProperties, FocusEvent, InputHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface OtpInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'size' | 'maxLength' | 'pattern' | 'inputMode'> {
  /** How many characters the code has. Default 6. */
  length?: number;
  /** Controlled value: the characters typed so far. */
  value?: string;
  defaultValue?: string;
  /** Every change, with the cleaned code (only allowed characters, at most `length`). */
  onValueChange?: (value: string) => void;
  /** Called once each time the code reaches `length` characters. */
  onComplete?: (code: string) => void;
  /** `numeric` (default): digits, with the phone's number pad. `alphanumeric`: letters and digits, upper-cased. */
  mode?: 'numeric' | 'alphanumeric';
  /** Draw a gap after every n cells (3 → "123 456"). Visual only: the value has no separator. */
  groupSize?: number;
  invalid?: boolean;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  className?: string;
  style?: CSSProperties;
}

const clean = (text: string, mode: 'numeric' | 'alphanumeric', length: number): string =>
  (mode === 'numeric' ? text.replace(/\D+/g, '') : text.replace(/[^0-9a-z]+/gi, '').toUpperCase()).slice(0, length);

/**
 * A one-time code (HAR-1376): ONE native input, so screen readers, the phone's code autofill
 * (`autoComplete="one-time-code"`) and password managers see a single field, drawn as `length`
 * cells. Pasting "123 456" or "123-456" keeps the characters; typing past the end is ignored;
 * Backspace deletes the last one. `onComplete(code)` runs when the last character arrives. Put it in
 * a `Field` for its label, hint and error (the cells turn red with `aria-invalid`). `name` submits
 * the code. `ref` is the input.
 */
export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(function OtpInput({
  length: lengthProp = 6, value: valueProp, defaultValue = '', onValueChange, onComplete, mode = 'numeric', groupSize,
  invalid, 'aria-invalid': ariaInvalid, className, style, autoComplete = 'one-time-code', onFocus, onBlur, onSelect, disabled,
  ...props
}, forwardedRef) {
  const length = Math.max(1, Math.floor(lengthProp));
  const [internal, setInternal] = useState(() => clean(defaultValue, mode, length));
  const value = valueProp !== undefined ? clean(valueProp, mode, length) : internal;
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);
  const completed = useRef<string | null>(value.length === length ? value : null);

  const update = (raw: string) => {
    const next = clean(raw, mode, length);
    if (valueProp === undefined) setInternal(next);
    if (next !== value) onValueChange?.(next);
  };

  // Once per complete code: a re-render or the same code set again does not call it twice.
  useEffect(() => {
    if (value.length === length && completed.current !== value) {
      completed.current = value;
      onComplete?.(value);
    } else if (value.length < length) {
      completed.current = null;
    }
  }, [value, length]); // eslint-disable-line react-hooks/exhaustive-deps

  // The caret lives at the end: the cells draw no caret in the middle, so none may be there. A
  // selection of the whole code stays (Ctrl+A, a double-click), so a wrong code can be typed over.
  const toEnd = () => {
    const input = inputRef.current;
    if (!input) return;
    const all = input.value.length > 0 && input.selectionStart === 0 && input.selectionEnd === input.value.length;
    if (!all && (input.selectionStart !== input.value.length || input.selectionEnd !== input.value.length)) {
      try { input.setSelectionRange(input.value.length, input.value.length); } catch { /* not focused */ }
    }
  };

  const isInvalid = !!invalid || ariaInvalid === true || ariaInvalid === 'true';
  const active = focused ? Math.min(value.length, length - 1) : -1;
  const group = groupSize && groupSize > 0 && groupSize < length ? Math.floor(groupSize) : 0;

  return (
    <div
      className={cx('uix-otp', className)}
      style={{ '--uix-otp-cells': length, '--uix-otp-seps': group ? Math.ceil(length / group) - 1 : 0, ...style } as CSSProperties}
    >
      <input
        {...props}
        ref={inputRef}
        className="uix-otp__input"
        type="text"
        inputMode={mode === 'numeric' ? 'numeric' : 'text'}
        autoComplete={autoComplete}
        autoCapitalize={mode === 'alphanumeric' ? 'characters' : 'off'}
        autoCorrect="off"
        spellCheck={false}
        pattern={mode === 'numeric' ? `[0-9]{${length}}` : `[0-9A-Za-z]{${length}}`}
        maxLength={length}
        value={value}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => update(event.target.value)}
        // A paste longer than the cells (a code with a dash or spaces) would be cut by maxLength
        // before it is cleaned: clean the whole clipboard text instead.
        onPaste={(event) => {
          const text = event.clipboardData?.getData('text');
          if (!text) return;
          event.preventDefault();
          update(clean(text, mode, length));
        }}
        onFocus={(event: FocusEvent<HTMLInputElement>) => { setFocused(true); toEnd(); onFocus?.(event); }}
        onBlur={(event: FocusEvent<HTMLInputElement>) => { setFocused(false); onBlur?.(event); }}
        onSelect={(event) => { toEnd(); onSelect?.(event); }}
      />
      {Array.from({ length }, (_, index) => (
        <Fragment key={index}>
          {group > 0 && index > 0 && index % group === 0 && <span className="uix-otp__sep" aria-hidden="true" />}
          <span className="uix-otp__cell" aria-hidden="true" data-active={index === active || undefined}>
            {value[index] ?? ''}
          </span>
        </Fragment>
      ))}
    </div>
  );
});
OtpInput.displayName = 'OtpInput';
