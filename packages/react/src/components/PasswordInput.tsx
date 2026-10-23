"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import { Input, InputGroup } from './Input.js';
import type { InputProps } from './Input.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** The words `PasswordInput` renders. */
export interface PasswordInputLabels {
  /**
   * Name of the reveal toggle. It stays the same while the password shows: the toggle's pressed
   * state (`aria-pressed`) says whether it is on.
   */
  show: string;
}

export const DEFAULT_PASSWORD_INPUT_LABELS: PasswordInputLabels = { show: 'Show password' };

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** Controlled: whether the password shows as text. */
  revealed?: boolean;
  /** Uncontrolled: shown as text at first. Default `false`. */
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Each word defaults to `UixLabelsProvider` `passwordInput`, then to English. */
  labels?: Partial<PasswordInputLabels>;
  /** Class of the wrapping `InputGroup` (`className` goes on the input). */
  groupClassName?: string;
}

/**
 * A password field with a reveal toggle (HAR-1376): an `Input type="password"` and, inside its end,
 * a toggle button (`aria-pressed`) that shows the password as text and hides it again. A pointer
 * press leaves focus in the field; the keyboard reaches the toggle with Tab. The password is
 * hidden again when its form submits, so a password manager sees a password field. `autoComplete`
 * passes through (`current-password`, `new-password`); inside `Field` the label, hint and error
 * land on the input. `ref` is the input.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput({
  revealed: revealedProp, defaultRevealed = false, onRevealedChange, labels: labelOverrides, groupClassName,
  disabled, size, ...props
}, forwardedRef) {
  const labels: PasswordInputLabels = { ...DEFAULT_PASSWORD_INPUT_LABELS, ...useUixLabels().passwordInput, ...labelOverrides };
  const [internal, setInternal] = useState(defaultRevealed);
  const revealed = revealedProp ?? internal;
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const setRevealed = (next: boolean) => {
    if (revealedProp === undefined) setInternal(next);
    onRevealedChange?.(next);
  };
  const setRef = useRef(setRevealed);
  setRef.current = setRevealed;

  // Changing `type` resets the caret to the start in Chrome: the selection is kept across the toggle
  // and put back once the new type is in, so typing goes on where it was.
  const selection = useRef<{ start: number; end: number; direction: 'forward' | 'backward' | 'none' } | null>(null);
  const keepSelection = () => {
    const input = inputRef.current;
    if (!input || input.ownerDocument.activeElement !== input) { selection.current = null; return; }
    selection.current = { start: input.selectionStart ?? input.value.length, end: input.selectionEnd ?? input.value.length, direction: input.selectionDirection ?? 'none' };
  };
  useIsomorphicLayoutEffect(() => {
    const input = inputRef.current;
    const kept = selection.current;
    selection.current = null;
    if (!input || !kept || input.ownerDocument.activeElement !== input) return;
    // Chrome moves the caret to 0 when it rebuilds the field for its new type, at the next style
    // update: force that update first (reading a size), then put the selection back, all before the
    // next key can arrive. (A later restore, after a frame, would undo keys pressed meanwhile.)
    void input.offsetWidth;
    try { input.setSelectionRange(kept.start, kept.end, kept.direction); } catch { /* not a text field */ }
  }, [revealed]);

  // Hide it again before the form's data is read, so the browser offers to save a password.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return undefined;
    const onSubmit = () => { if (revealedRef.current) setRef.current(false); };
    form.addEventListener('submit', onSubmit, true);
    return () => form.removeEventListener('submit', onSubmit, true);
  }, []);

  return (
    <InputGroup
      className={groupClassName}
      trailingAction={(
        <button
          type="button"
          className="uix-input-group__action"
          aria-label={labels.show}
          aria-pressed={revealed}
          aria-controls={props.id}
          disabled={disabled}
          // A pointer press keeps the caret in the field; Enter and Space on the focused toggle work as usual.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { keepSelection(); setRevealed(!revealed); }}
        >
          {revealed ? <EyeOffIcon size="sm" /> : <EyeIcon size="sm" />}
        </button>
      )}
    >
      <Input
        {...props}
        ref={inputRef}
        size={size}
        disabled={disabled}
        type={revealed ? 'text' : 'password'}
        // a revealed password is still not something to spell-check or autocorrect
        spellCheck={false}
        autoCapitalize="none"
      />
    </InputGroup>
  );
});
PasswordInput.displayName = 'PasswordInput';
