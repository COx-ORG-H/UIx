"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Modal } from './Modal.js';
import { Popover } from './Popover.js';
import { fillLabel } from '../fill-label.js';
import { resolveAnchor } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';
import { useUixLabels } from '../labels-context.js';

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
  /**
   * Body below the description: consequences, a `<dl>` of what changes (HAR-1356; MOTUS B-A4).
   * The description, body and compensation are the dialog's `aria-describedby`.
   */
  children?: ReactNode;
  /** Why the last confirm failed. Shown in the dialog (`role="alert"`); the dialog stays open. */
  error?: ReactNode;
  /**
   * Which button has focus when the dialog opens. Default: the type-to-confirm field when
   * there is one, else Cancel for a `destructive` dialog, else the browser's first control.
   */
  initialFocus?: 'cancel' | 'confirm';
  /** A third action at the start of the footer, e.g. "Save and leave" (MOTUS C-5). */
  tertiaryLabel?: ReactNode;
  onTertiary?: () => void | Promise<void>;
  /**
   * High-risk confirmation (TENSOR C2): Confirm stays disabled until the user types exactly
   * this text, e.g. the record's name.
   */
  typeToConfirm?: string;
  /** Label of the type-to-confirm field. `{value}` is replaced by `typeToConfirm`. */
  typeToConfirmLabel?: string;
  /** How the action is undone or compensated, shown as its own labelled block (TENSOR C2). */
  compensation?: ReactNode;
  /** Heading of the compensation block. Default "How to undo this". */
  compensationLabel?: string;
}

/** Generic confirmation shell. Audit, authorization and compensation policy remain application-owned. */
export function ConfirmDialog({
  open, title, description, confirmLabel, cancelLabel, closeLabel, onConfirm, onCancel, pending, destructive,
  children, error, initialFocus, tertiaryLabel, onTertiary, typeToConfirm, typeToConfirmLabel: typeToConfirmLabelProp,
  compensation, compensationLabel: compensationLabelProp,
}: ConfirmDialogProps) {
  const uixLabels = useUixLabels();
  const typeToConfirmLabel = typeToConfirmLabelProp ?? uixLabels.confirmDialog?.typeToConfirm ?? 'Type {value} to confirm';
  const compensationLabel = compensationLabelProp ?? uixLabels.confirmDialog?.compensation ?? 'How to undo this';
  const id = useId();
  const bodyId = `${id}-body`;
  const typedId = `${id}-typed`;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const typedRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState('');
  const typedMatches = typeToConfirm == null || typed === typeToConfirm;
  const hasBody = description != null || children != null || compensation != null;

  useEffect(() => { if (open) setTyped(''); }, [open, typeToConfirm]);

  // Modal (the child) has already called showModal() by the time this effect runs.
  useEffect(() => {
    if (!open) return;
    const focus = initialFocus ?? (destructive ? 'cancel' : undefined);
    const target = typeToConfirm != null ? typedRef.current
      : focus === 'cancel' ? cancelRef.current
        : focus === 'confirm' ? confirmRef.current : null;
    target?.focus();
  }, [open, initialFocus, destructive, typeToConfirm]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      closeLabel={closeLabel}
      role="alertdialog"
      aria-describedby={hasBody ? bodyId : undefined}
      footer={(
        <>
          {tertiaryLabel != null && onTertiary && (
            <Button type="button" className="uix-confirm__tertiary" onClick={() => void onTertiary()} disabled={pending}>{tertiaryLabel}</Button>
          )}
          <Button ref={cancelRef} type="button" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
          <Button ref={confirmRef} type="button" variant={destructive ? 'danger' : 'primary'} onClick={() => { if (typedMatches) void onConfirm(); }} loading={pending} disabled={!typedMatches}>{confirmLabel}</Button>
        </>
      )}
    >
      <div className="uix-confirm">
        {hasBody && (
          <div id={bodyId} className="uix-confirm__body">
            {description != null && <div>{description}</div>}
            {children}
            {compensation != null && (
              <div className="uix-confirm__compensation">
                <strong className="uix-confirm__compensation-title">{compensationLabel}</strong>
                <div>{compensation}</div>
              </div>
            )}
          </div>
        )}
        {typeToConfirm != null && (
          <div className="uix-field">
            <label className="uix-field__label" htmlFor={typedId}>{fillLabel(typeToConfirmLabel, { value: typeToConfirm })}</label>
            <Input ref={typedRef} id={typedId} value={typed} autoComplete="off" spellCheck={false} onChange={(event) => setTyped(event.currentTarget.value)} />
          </div>
        )}
        {error != null && <div className="uix-confirm__error" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}

export interface PopconfirmProps {
  open: boolean;
  /** The control that asked for confirmation; the step is placed against it and focus returns to it. */
  anchor: RefObject<HTMLElement | null> | HTMLElement | null;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
  /** Cancel, Escape and a press outside all call this. */
  onCancel: () => void;
  pending?: boolean;
  destructive?: boolean;
  /** How the action is undone, under its own heading (TENSOR C2 "single_click" tier). */
  compensation?: ReactNode;
  compensationLabel?: string;
  placement?: Placement;
}

/**
 * An anchored, single-step confirmation for low-risk actions (HAR-1356; TENSOR C2): a small
 * `role="dialog"` on the kit `Popover`, focus on Cancel, Escape or a press outside cancels,
 * and focus returns to the anchor. Use `ConfirmDialog` when the action is hard to undo.
 */
export function Popconfirm({
  open, anchor, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, pending, destructive,
  compensation, compensationLabel: compensationLabelProp, placement = 'bottom-start',
}: PopconfirmProps) {
  const uixLabels = useUixLabels();
  const compensationLabel = compensationLabelProp ?? uixLabels.confirmDialog?.compensation ?? 'How to undo this';
  const id = useId();
  const panelId = `${id}-popconfirm`;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const hasBody = description != null || compensation != null;

  useEffect(() => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const shown = () => { try { return panel.matches(':popover-open'); } catch { return false; } };
    if (!open) {
      if (shown()) {
        const focusInside = panel.contains(document.activeElement);
        try { panel.hidePopover(); } catch { /* already closed */ }
        if (focusInside) resolveAnchor(anchor)?.focus();
      }
      return;
    }
    if (!shown()) { try { panel.showPopover(); } catch { /* unsupported */ } }
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCancelRef.current();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.contains(target) || resolveAnchor(anchor)?.contains(target)) return;
      onCancelRef.current();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, anchor, panelId]);

  return (
    <Popover
      id={panelId}
      popover="manual"
      anchor={anchor}
      placement={placement}
      role="dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={hasBody ? `${id}-body` : undefined}
      className="uix-popconfirm"
    >
      <div id={`${id}-title`} className="uix-popconfirm__title">{title}</div>
      {hasBody && (
        <div id={`${id}-body`} className="uix-popconfirm__body">
          {description != null && <div>{description}</div>}
          {compensation != null && (
            <div className="uix-confirm__compensation">
              <strong className="uix-confirm__compensation-title">{compensationLabel}</strong>
              <div>{compensation}</div>
            </div>
          )}
        </div>
      )}
      <div className="uix-popconfirm__actions">
        <Button ref={cancelRef} type="button" size="sm" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
        <Button type="button" size="sm" variant={destructive ? 'danger' : 'primary'} onClick={() => void onConfirm()} loading={pending}>{confirmLabel}</Button>
      </div>
    </Popover>
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
        <label className="uix-field__label" htmlFor={inputId}>{inputLabel}</label>
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
