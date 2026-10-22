"use client";

import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, FormEvent, ReactNode, RefObject } from 'react';
import { cx } from '../cx.js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Modal } from './Modal.js';
import { Textarea } from './Textarea.js';
import { Popover } from './Popover.js';
import { fillLabel } from '../fill-label.js';
import { resolveAnchor } from '../hooks/useAnchoredPosition.js';
import { isTopLayer, pushLayer } from '../overlay-stack.js';
import type { Placement } from '../overlay-position.js';
import { useUixLabels } from '../labels-context.js';

/**
 * Attributes for a dialog's confirm button (HAR-1831): `data-*` (TENSOR puts `data-action-id`
 * there), `id`, `className`, an `aria-describedby`. Its `onClick` runs first; `preventDefault()`
 * there stops the confirm. `disabled` adds to the dialog's own reasons to disable it.
 */
export type ConfirmButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & {
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
};

/** The confirm button's props: the dialog's own, after the consumer's `confirmProps`. */
const confirmButtonProps = (extra: ConfirmButtonProps | undefined, own: { disabled: boolean; onConfirm: () => void }) => {
  const { onClick, disabled, className, ...rest } = extra ?? {};
  return {
    ...rest,
    className,
    disabled: own.disabled || !!disabled,
    onClick: (event: Parameters<NonNullable<ButtonHTMLAttributes<HTMLButtonElement>['onClick']>>[0]) => {
      onClick?.(event);
      if (!event.defaultPrevented) own.onConfirm();
    },
  };
};

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  /** Accessible name of the close button. Default: `UixLabelsProvider` `modal.close`, then "Close dialog". */
  closeLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /**
   * The confirmed action is running: Confirm shows its loading state, Cancel is disabled, and
   * Escape, the × and a press on Cancel do nothing until it settles (HAR-1831), so the person
   * cannot walk away from an action that is still being carried out.
   */
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
  /**
   * Label of the type-to-confirm field. In a string, `{value}` is replaced by `typeToConfirm`;
   * pass a node for markup, e.g. the value in `<code>` (HAR-1831).
   */
  typeToConfirmLabel?: ReactNode;
  /** Placeholder of the type-to-confirm field, e.g. the value itself (HAR-1831). */
  typeToConfirmPlaceholder?: string;
  /**
   * Shown under the field (and its description) once the typed text stops matching; `{value}` is
   * replaced by `typeToConfirm` (HAR-1831). Default: `UixLabelsProvider` `confirmDialog`, then
   * "That does not match {value}."
   */
  typeToConfirmMismatch?: string;
  /** How the action is undone or compensated, shown as its own labelled block (TENSOR C2). */
  compensation?: ReactNode;
  /** Heading of the compensation block. Default "How to undo this". */
  compensationLabel?: string;
  /** Attributes for the confirm button, e.g. `{ 'data-action-id': 'ci.delete' }` (HAR-1831). */
  confirmProps?: ConfirmButtonProps;
}

/**
 * Generic confirmation shell. Audit, authorization and compensation policy remain application-owned.
 * The ref reaches the `<dialog>` (HAR-1831).
 */
export const ConfirmDialog = forwardRef<HTMLDialogElement, ConfirmDialogProps>(function ConfirmDialog({
  open, title, description, confirmLabel, cancelLabel, closeLabel, onConfirm, onCancel, pending = false, destructive,
  children, error, initialFocus, tertiaryLabel, onTertiary, typeToConfirm, typeToConfirmLabel: typeToConfirmLabelProp,
  typeToConfirmPlaceholder, typeToConfirmMismatch: mismatchProp, compensation, compensationLabel: compensationLabelProp, confirmProps,
}, ref) {
  const uixLabels = useUixLabels();
  const typeToConfirmLabel = typeToConfirmLabelProp ?? uixLabels.confirmDialog?.typeToConfirm ?? 'Type {value} to confirm';
  const compensationLabel = compensationLabelProp ?? uixLabels.confirmDialog?.compensation ?? 'How to undo this';
  const mismatch = mismatchProp ?? uixLabels.confirmDialog?.typeToConfirmMismatch ?? 'That does not match {value}.';
  const id = useId();
  const bodyId = `${id}-body`;
  const typedId = `${id}-typed`;
  const typedMsgId = `${id}-typed-msg`;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const typedRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState('');
  const typedMatches = typeToConfirm == null || typed === typeToConfirm;
  // Wrong as soon as it stops being the start of the text, not while it is still being typed.
  const typedWrong = typeToConfirm != null && typed !== '' && !typeToConfirm.startsWith(typed);
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

  const confirm = confirmButtonProps(confirmProps, {
    disabled: !typedMatches,
    onConfirm: () => { if (typedMatches && !pending) void onConfirm(); },
  });

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={onCancel}
      pending={pending}
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
          <Button ref={confirmRef} type="button" variant={destructive ? 'danger' : 'primary'} loading={pending} {...confirm}>{confirmLabel}</Button>
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
            <label className="uix-field__label" htmlFor={typedId}>
              {typeof typeToConfirmLabel === 'string' ? fillLabel(typeToConfirmLabel, { value: typeToConfirm }) : typeToConfirmLabel}
            </label>
            <Input
              ref={typedRef} id={typedId} value={typed} autoComplete="off" spellCheck={false}
              placeholder={typeToConfirmPlaceholder} invalid={typedWrong} disabled={pending}
              aria-describedby={typedWrong ? typedMsgId : undefined}
              onChange={(event) => setTyped(event.currentTarget.value)}
            />
            {/* Space reserved like Field's, so the message appearing never moves the footer. */}
            <div className="uix-field__msg" id={typedMsgId}>
              {typedWrong && <span className="uix-field__error" role="alert">{fillLabel(mismatch, { value: typeToConfirm })}</span>}
            </div>
          </div>
        )}
        {error != null && <div className="uix-confirm__error" role="alert">{error}</div>}
      </div>
    </Modal>
  );
});
ConfirmDialog.displayName = 'ConfirmDialog';

export interface PopconfirmProps {
  open: boolean;
  /** The control that asked for confirmation; the step is placed against it and focus returns to it. */
  anchor: RefObject<HTMLElement | null> | HTMLElement | null;
  /**
   * The question. Optional (HAR-1831): without it the step is named by its confirm button
   * ("Delete"), which then has to say what it does.
   */
  title?: ReactNode;
  description?: ReactNode;
  /**
   * Content between the text and the buttons, e.g. a required reason field (HAR-1831). When it
   * holds a field, that field has focus when the step opens, and the step takes its full width.
   * Pair a required field with `confirmDisabled` until it is filled.
   */
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
  /** Cancel, Escape and a press outside all call this. */
  onCancel: () => void;
  pending?: boolean;
  destructive?: boolean;
  /** Confirm cannot be pressed yet, e.g. while a required reason is empty (HAR-1831). */
  confirmDisabled?: boolean;
  /** Attributes for the confirm button, as on `ConfirmDialog` (HAR-1831). */
  confirmProps?: ConfirmButtonProps;
  /** How the action is undone, under its own heading (TENSOR C2 "single_click" tier). */
  compensation?: ReactNode;
  compensationLabel?: string;
  placement?: Placement;
  /** Default: `'alertdialog'` when `destructive`, else `'dialog'` (HAR-1831). */
  role?: 'dialog' | 'alertdialog';
  /**
   * What names the step: its `title` (default when there is one) or its confirm button
   * (default without a title) (HAR-1831).
   */
  labelledBy?: 'title' | 'confirm';
  /**
   * Called with the Escape keydown before the step cancels; `event.preventDefault()` keeps it open
   * (HAR-1831). The step only takes an Escape that is its own: not while a popup inside it is open
   * (a Select's list), not one meant for a dialog opened above it, and only the newest open step.
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /**
   * Cancel when the anchor has scrolled out of view (outside the viewport or a clipping ancestor),
   * rather than leave the step floating over unrelated content (HAR-1831). Default `false`.
   */
  closeWhenAnchorHidden?: boolean;
}

const FIELD = 'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), [contenteditable="true"]';

/**
 * An anchored, single-step confirmation for low-risk actions (HAR-1356; TENSOR C2): a small
 * dialog on the kit `Popover`, focus on Cancel (or on a field in its content), Escape or a press
 * outside cancels, and focus returns to the anchor. Use `ConfirmDialog` when the action is hard to undo.
 */
export function Popconfirm({
  open, anchor, title, description, children, confirmLabel, cancelLabel, onConfirm, onCancel, pending, destructive,
  confirmDisabled = false, confirmProps, compensation, compensationLabel: compensationLabelProp, placement = 'bottom-start',
  role, labelledBy, onEscapeKeyDown, closeWhenAnchorHidden = false,
}: PopconfirmProps) {
  const uixLabels = useUixLabels();
  const compensationLabel = compensationLabelProp ?? uixLabels.confirmDialog?.compensation ?? 'How to undo this';
  const id = useId();
  const panelId = `${id}-popconfirm`;
  const confirmId = confirmProps?.id ?? `${id}-confirm`;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ onCancel, onEscapeKeyDown });
  latest.current = { onCancel, onEscapeKeyDown };
  const hasBody = description != null || compensation != null;
  const hasTitle = title != null;
  const nameBy = labelledBy ?? (hasTitle ? 'title' : 'confirm');

  // A passive effect, after the Popover's own: it listens for `toggle` to place itself, also when
  // the step mounts open.
  useEffect(() => {
    const panel = document.getElementById(panelId);
    if (!panel) return undefined;
    const shown = () => { try { return panel.matches(':popover-open'); } catch { return false; } };
    if (!open) {
      if (shown()) {
        const focusInside = panel.contains(document.activeElement);
        try { panel.hidePopover(); } catch { /* already closed */ }
        if (focusInside) resolveAnchor(anchor)?.focus();
      }
      return undefined;
    }
    if (!shown()) { try { panel.showPopover(); } catch { /* unsupported */ } }
    (contentRef.current?.querySelector<HTMLElement>(FIELD) ?? cancelRef.current)?.focus();

    // The newest open step answers Escape; one opened from inside another closes first.
    const token = {};
    const pop = pushLayer(token);
    /** Escape is this step's unless a popup inside it, a dialog above it or a newer step takes it. */
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !isTopLayer(token)) return;
      if (panel.querySelector('[aria-expanded="true"]')) return;
      const dialog = (event.target as Element | null)?.closest?.('dialog');
      if (dialog && !dialog.contains(panel)) return;
      latest.current.onEscapeKeyDown?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      latest.current.onCancel();
    };
    // Focus in the step: on the step itself, after the controls inside had their turn (a Select
    // closing its list cancels the event first). Focus elsewhere: before anything else sees it,
    // so a Drawer or Modal around the anchor neither closes nor asks.
    const onPanelKey = (event: KeyboardEvent) => escape(event);
    const onDocumentKey = (event: KeyboardEvent) => {
      if (!panel.contains(event.target as Node)) escape(event);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.contains(target) || resolveAnchor(anchor)?.contains(target)) return;
      if (!isTopLayer(token)) return;
      latest.current.onCancel();
    };
    panel.addEventListener('keydown', onPanelKey);
    document.addEventListener('keydown', onDocumentKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      pop();
      panel.removeEventListener('keydown', onPanelKey);
      document.removeEventListener('keydown', onDocumentKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, anchor, panelId]);

  const confirm = confirmButtonProps(confirmProps, {
    disabled: confirmDisabled,
    onConfirm: () => { if (!pending) void onConfirm(); },
  });

  return (
    <Popover
      id={panelId}
      popover="manual"
      anchor={anchor}
      placement={placement}
      role={role ?? (destructive ? 'alertdialog' : 'dialog')}
      aria-labelledby={nameBy === 'title' && hasTitle ? `${id}-title` : confirmId}
      aria-describedby={hasBody ? `${id}-body` : undefined}
      className={cx('uix-popconfirm', children != null && 'uix-popconfirm--content')}
      closeWhenAnchorHidden={closeWhenAnchorHidden}
      onAnchorHidden={closeWhenAnchorHidden ? () => latest.current.onCancel() : undefined}
    >
      {hasTitle && <div id={`${id}-title`} className="uix-popconfirm__title">{title}</div>}
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
      {children != null && <div ref={contentRef} className="uix-popconfirm__content">{children}</div>}
      <div className="uix-popconfirm__actions">
        <Button ref={cancelRef} type="button" size="sm" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
        <Button type="button" size="sm" variant={destructive ? 'danger' : 'primary'} loading={pending} {...confirm} id={confirmId}>{confirmLabel}</Button>
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
  /** Accessible name of the close button. Default: `UixLabelsProvider` `modal.close`, then "Close dialog". */
  closeLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
  validate?: (value: string) => ReactNode | undefined;
  pending?: boolean;
  /**
   * Ask for a longer answer in a textarea (a reason, a note); a number sets its rows, `true`
   * is 4. Enter adds a line there, so the form is sent with the submit button or Ctrl/⌘+Enter
   * (HAR-1614).
   */
  multiline?: boolean | number;
  /**
   * The answer confirms something that cannot be taken back (a forced import): the submit
   * button is the danger button and the dialog is an `alertdialog`.
   */
  destructive?: boolean;
  /**
   * Why the last submit failed, from the server. Shown under the field (`role="alert"`) and
   * tied to it; the dialog stays open. A message from `validate` takes its place while the
   * value is invalid.
   */
  error?: ReactNode;
  /** Default: `'alertdialog'` when `destructive`, else `'dialog'`. */
  role?: 'dialog' | 'alertdialog';
}

export function PromptDialog({
  open, title, description, inputLabel, defaultValue = '', placeholder, submitLabel, cancelLabel, closeLabel, onSubmit, onCancel,
  validate, pending, multiline = false, destructive = false, error: submitError, role,
}: PromptDialogProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [issue, setIssue] = useState<ReactNode>();
  const error = issue ?? submitError;

  // The answer field takes focus when the dialog opens. React's autoFocus only runs at mount,
  // when the dialog is still closed, and showModal() then picks the first control it finds, the
  // header's close button. Modal (the child) has already called showModal() by the time this runs.
  useEffect(() => {
    if (open) fieldRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setIssue(undefined);
    }
  }, [defaultValue, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate?.(value);
    setIssue(found);
    if (found == null) void onSubmit(value);
  };

  const field = {
    id: inputId,
    value,
    placeholder,
    'aria-describedby': error != null ? errorId : undefined,
    invalid: error != null,
    ref: fieldRef,
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      closeLabel={closeLabel}
      role={role ?? (destructive ? 'alertdialog' : 'dialog')}
      aria-describedby={description != null ? descriptionId : undefined}
    >
      <form ref={formRef} className="uix-prompt" onSubmit={handleSubmit}>
        {description != null && <div id={descriptionId}>{description}</div>}
        <label className="uix-field__label" htmlFor={inputId}>{inputLabel}</label>
        {multiline
          ? (
            <Textarea
              {...field}
              rows={typeof multiline === 'number' ? multiline : 4}
              onChange={(event) => setValue(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />
          )
          : <Input {...field} onChange={(event) => setValue(event.currentTarget.value)} />}
        {error != null && <div id={errorId} className="uix-field__error" role="alert">{error}</div>}
        <div className="uix-dialog__footer uix-prompt__actions">
          <Button type="button" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
          <Button type="submit" variant={destructive ? 'danger' : 'primary'} loading={pending}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}
