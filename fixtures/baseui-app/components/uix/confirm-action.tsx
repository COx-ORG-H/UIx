'use client';

/* @uix registry item — ported from @itsmx/shared-ui/src/confirm-action.tsx */

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from './utils';

/**
 * UI-PRIM-01 / addendum 5 — universal destructive-action confirmation
 * per Docs/design-system.md § 6 (<ConfirmAction> pattern). Three
 * tiers, one component:
 *
 *   - `type_to_confirm`  — irreversible: delete tenant, hard-delete
 *                          comment, archive published article, etc.
 *                          Dialog requires typing the confirmation
 *                          string (entity name OR the literal "DELETE").
 *                          Primary button stays disabled until match.
 *
 *   - `single_click`     — reversible-but-significant: soft-delete
 *                          article, revoke de-pseudonymization grant,
 *                          unassign a SEV-1 incident. One `solid danger`
 *                          button with a clear warning line above.
 *
 *   - `inline`           — low-stakes, easily undone: remove a row
 *                          filter, remove a tag. No confirmation; the
 *                          consumer fires the action immediately and
 *                          surfaces an Undo toast for 5 seconds. The
 *                          mutation is debounced 5s server-side so the
 *                          Undo cancels before the audit row writes.
 *                          This primitive ships a `useUndoableAction`
 *                          hook for the latter wiring.
 *
 * Pure presentational. No audit hook here — Hard Rule 2 audit lives in
 * the consuming command (the primitive only fires `onConfirm`).
 */

export type ConfirmActionTier = 'type_to_confirm' | 'single_click' | 'inline';

// -- type_to_confirm ---------------------------------------------------

export interface ConfirmActionTypeToConfirmProps {
  tier: 'type_to_confirm';
  /** Resolver-passed heading. */
  title: React.ReactNode;
  /** Resolver-passed body warning. */
  description: React.ReactNode;
  /**
   * Exact string the user must type. Common values: the entity name
   * (e.g. "acme-corp"), or the literal "DELETE". Case-sensitive.
   */
  challenge: string;
  /** Resolver-passed primary button label. */
  confirmLabel: React.ReactNode;
  /** Resolver-passed cancel label. */
  cancelLabel?: React.ReactNode;
  /** Resolver-passed label for the text input. */
  inputLabel?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  /** When true, the primary button shows a busy state. */
  pending?: boolean;
  className?: string;
}

export interface ConfirmActionSingleClickProps {
  tier: 'single_click';
  /** Resolver-passed warning line above the button. */
  warning: React.ReactNode;
  /** Resolver-passed button label. */
  confirmLabel: React.ReactNode;
  onConfirm: () => void;
  pending?: boolean;
  className?: string;
}

export interface ConfirmActionInlineProps {
  tier: 'inline';
  /** Resolver-passed button / link label. */
  confirmLabel: React.ReactNode;
  onConfirm: () => void;
  className?: string;
}

export type ConfirmActionProps =
  | ConfirmActionTypeToConfirmProps
  | ConfirmActionSingleClickProps
  | ConfirmActionInlineProps;

const dangerBtnCls =
  'inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium transition-colors';

export function ConfirmAction(props: ConfirmActionProps) {
  if (props.tier === 'type_to_confirm') return <TypeToConfirm {...props} />;
  if (props.tier === 'single_click') return <SingleClickConfirm {...props} />;
  return <InlineConfirm {...props} />;
}

function TypeToConfirm({
  title,
  description,
  challenge,
  confirmLabel,
  cancelLabel = 'Cancel',
  inputLabel = 'Type the confirmation to enable the destructive button',
  onConfirm,
  onCancel,
  pending,
  className,
}: ConfirmActionTypeToConfirmProps) {
  const [value, setValue] = useState('');
  const matches = value === challenge;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Modal-dialog focus pattern per WAI-ARIA APG: focus the first interactive
  // control on mount. Replaces the `autoFocus` attribute (lint/a11y/noAutofocus).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className={cn('w-full max-w-md rounded-md border p-4', className)}
      style={{
        background: 'var(--uix-surface)',
        borderColor: 'var(--uix-border-strong)',
        color: 'var(--uix-text)',
      }}
      data-tier="type_to_confirm"
    >
      <h2 id="confirm-title" className="text-base font-medium">
        {title}
      </h2>
      <p id="confirm-desc" className="mt-1 text-sm" style={{ color: 'var(--uix-text-hushed)' }}>
        {description}
      </p>
      <label
        htmlFor={inputId}
        className="mt-4 block text-xs"
        style={{ color: 'var(--uix-text-hushed)' }}
      >
        {inputLabel}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={challenge}
        aria-invalid={value.length > 0 && !matches}
        className="mt-1 block h-9 w-full rounded-md border px-3 text-sm"
        style={{
          background: 'var(--uix-surface)',
          color: 'var(--uix-text)',
          borderColor: 'var(--uix-border-strong)',
        }}
      />
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center justify-center rounded-md border px-3.5 text-sm"
          style={{
            background: 'var(--uix-surface)',
            color: 'var(--uix-text)',
            borderColor: 'var(--uix-border-strong)',
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={!matches || pending}
          onClick={onConfirm}
          className={cn(dangerBtnCls, 'disabled:cursor-not-allowed disabled:opacity-50')}
          style={{
            background: 'var(--uix-danger)',
            color: 'var(--uix-danger-fg)',
          }}
        >
          {pending ? '…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}

function SingleClickConfirm({
  warning,
  confirmLabel,
  onConfirm,
  pending,
  className,
}: ConfirmActionSingleClickProps) {
  return (
    <div
      className={cn('inline-flex flex-col items-start gap-2', className)}
      data-tier="single_click"
    >
      <p className="text-xs" style={{ color: 'var(--uix-danger)' }}>
        {warning}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={onConfirm}
        className={cn(dangerBtnCls, 'disabled:cursor-not-allowed disabled:opacity-50')}
        style={{
          background: 'var(--uix-danger)',
          color: 'var(--uix-danger-fg)',
        }}
      >
        {pending ? '…' : confirmLabel}
      </button>
    </div>
  );
}

function InlineConfirm({ confirmLabel, onConfirm, className }: ConfirmActionInlineProps) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      className={cn(
        'inline-flex items-center gap-1 text-sm underline decoration-dotted underline-offset-4',
        className,
      )}
      style={{ color: 'var(--uix-danger)' }}
      data-tier="inline"
    >
      {confirmLabel}
    </button>
  );
}

// -- useUndoableAction -------------------------------------------------

export interface UseUndoableActionOptions {
  /** Window in ms before the action commits. Default 5000. */
  delayMs?: number;
  /** Fires after delayMs elapses without an undo() call. */
  onCommit: () => void;
}

export interface UndoableActionHandle {
  /** Whether a pending commit is currently scheduled. */
  readonly pending: boolean;
  /** Trigger the delayed commit + start the undo window. */
  fire(): void;
  /** Cancel the pending commit before delayMs elapses. */
  undo(): void;
}

/**
 * Hook for the inline-tier debounced-commit pattern. Per
 * design-system.md § 6 + addendum 5 slice note: the consumer fires
 * the action; the server-side mutation is debounced 5s; clicking Undo
 * cancels before the mutation fires so NO audit row is written. The
 * alternative (commit + revert) leaves an audit-row pair that
 * pollutes the log.
 *
 * Test surface: `pending` flips true after fire(), false after either
 * undo() or delayMs elapses + onCommit fires.
 */
export function useUndoableAction({
  delayMs = 5_000,
  onCommit,
}: UseUndoableActionOptions): UndoableActionHandle {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fire = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setPending(false);
      onCommit();
    }, delayMs);
  };

  const undo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      setPending(false);
    }
  };

  return { pending, fire, undo };
}
