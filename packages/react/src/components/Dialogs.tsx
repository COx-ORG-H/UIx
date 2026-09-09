"use client";

import { useEffect, useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Modal } from './Modal.js';

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  closeLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  pending?: boolean;
  destructive?: boolean;
}

/** Generic confirmation shell. Audit, authorization and compensation policy remain application-owned. */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, closeLabel, onConfirm, onCancel, pending, destructive }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      closeLabel={closeLabel}
      role="alertdialog"
      footer={(
        <>
          <Button type="button" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
          <Button type="button" variant={destructive ? 'danger' : 'primary'} onClick={() => void onConfirm()} loading={pending}>{confirmLabel}</Button>
        </>
      )}
    >
      {description}
    </Modal>
  );
}

export interface PromptDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  inputLabel: string;
  defaultValue?: string;
  placeholder?: string;
  submitLabel: ReactNode;
  cancelLabel: ReactNode;
  closeLabel: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
  validate?: (value: string) => ReactNode | undefined;
  pending?: boolean;
}

export function PromptDialog({ open, title, description, inputLabel, defaultValue = '', placeholder, submitLabel, cancelLabel, closeLabel, onSubmit, onCancel, validate, pending }: PromptDialogProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<ReactNode>();

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(undefined);
    }
  }, [defaultValue, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const issue = validate?.(value);
    setError(issue);
    if (issue == null) void onSubmit(value);
  };

  return (
    <Modal open={open} onClose={onCancel} title={title} closeLabel={closeLabel}>
      <form className="uix-prompt" onSubmit={handleSubmit}>
        {description != null && <div>{description}</div>}
        <label className="uix-label" htmlFor={inputId}>{inputLabel}</label>
        <Input id={inputId} value={value} placeholder={placeholder} aria-describedby={error ? errorId : undefined} invalid={error != null} onChange={(event) => setValue(event.currentTarget.value)} autoFocus />
        {error != null && <div id={errorId} className="uix-field__error" role="alert">{error}</div>}
        <div className="uix-dialog__footer uix-prompt__actions">
          <Button type="button" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
          <Button type="submit" variant="primary" loading={pending}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}
