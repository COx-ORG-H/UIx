'use client';

/* @uix registry item — hand-rolled toast store + renderer (no sonner dep) */

import { X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from './utils';

/**
 * Imperative `toast()` + declarative `<Toaster/>` sharing a module-level
 * store via `useSyncExternalStore`. Vendoring flat-copies exactly one
 * toast.tsx into the consumer app, so there is exactly one module instance —
 * `toast()` calls anywhere reach the mounted `<Toaster/>` with no provider.
 * SSR-safe: the server snapshot is a stable empty-array constant, so the
 * Toaster prerenders as an empty live region without store access.
 *
 * Undo wiring (the `action` slot): `useUndoableAction` from
 * ./confirm-action defaults `delayMs` to 5000, and `durationMs` here
 * defaults to 5000 to match — the toast disappears exactly when the
 * pending commit fires. The two components are NOT hard-coupled (no
 * import either way); the consumer composes them:
 *
 *   const undoable = useUndoableAction({ onCommit: commitMutation });
 *   const remove = () => {
 *     undoable.fire();
 *     toast({
 *       title: 'Item removed',
 *       durationMs: 5000,
 *       action: { label: 'Undo', onClick: () => undoable.undo() },
 *     });
 *   };
 *
 * Timers PAUSE while the pointer or keyboard focus is anywhere inside the
 * stack and resume (with remaining time preserved) on leave. Re-toasting
 * with the same `id` updates the card in place and resets its clock.
 */

export type ToastVariant = 'default' | 'success' | 'info' | 'warning' | 'danger';

export interface ToastAction {
  label: ReactNode;
  onClick: () => void;
}

export interface ToastOptions {
  /** Stable id → update-in-place (and timer reset). Auto-generated when omitted. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Default 'default'. */
  variant?: ToastVariant;
  /** Auto-dismiss window. `null` = sticky. Default 5000 (= useUndoableAction delayMs). */
  durationMs?: number | null;
  /** Action button slot (the Undo slot). Clicking it also dismisses the toast. */
  action?: ToastAction;
  /** Fires when the toast leaves the stack (timer, X, action click, or programmatic). */
  onDismiss?: () => void;
}

interface ToastRecord {
  id: string;
  title: ReactNode;
  description: ReactNode | undefined;
  variant: ToastVariant;
  durationMs: number | null;
  action: ToastAction | undefined;
  onDismiss: (() => void) | undefined;
}

// -- module-level store --------------------------------------------------

const EMPTY: readonly ToastRecord[] = [];
let toasts: readonly ToastRecord[] = EMPTY;
const listeners = new Set<() => void>();
let seq = 0;

const emit = (): void => {
  for (const l of listeners) l();
};
const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = (): readonly ToastRecord[] => toasts;
const getServerSnapshot = (): readonly ToastRecord[] => EMPTY;

function dismissById(id?: string): void {
  const removed = id === undefined ? toasts : toasts.filter((t) => t.id === id);
  if (removed.length === 0) return;
  toasts = id === undefined ? EMPTY : toasts.filter((t) => t.id !== id);
  emit();
  for (const t of removed) t.onDismiss?.();
}

export function toast(opts: ToastOptions): string {
  seq += 1;
  const id = opts.id ?? 'uix-toast-' + String(seq);
  const record: ToastRecord = {
    id,
    title: opts.title,
    description: opts.description,
    variant: opts.variant ?? 'default',
    durationMs: opts.durationMs === undefined ? 5_000 : opts.durationMs,
    action: opts.action,
    onDismiss: opts.onDismiss,
  };
  const at = toasts.findIndex((t) => t.id === id);
  toasts = at === -1 ? [...toasts, record] : toasts.map((t, i) => (i === at ? record : t));
  emit();
  return id;
}

/** Dismiss one toast by id, or all toasts when called without one. */
toast.dismiss = (id?: string): void => dismissById(id);

// -- Toaster ---------------------------------------------------------------

export type ToasterPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface ToasterProps {
  /** Default 'bottom-right'. */
  position?: ToasterPosition;
  /** Max simultaneously shown; oldest are evicted first. Default 3. */
  max?: number;
  /** aria-label for the region landmark. Default 'Notifications'. */
  regionLabel?: string;
  /** aria-label for each per-toast close button. Default 'Dismiss notification'. */
  dismissLabel?: string;
  className?: string;
}

const POSITION_CLS: Record<ToasterPosition, string> = {
  'bottom-right': 'fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2',
  'bottom-left': 'fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2',
  'top-right': 'fixed top-4 right-4 z-50 flex flex-col items-end gap-2',
  'top-left': 'fixed top-4 left-4 z-50 flex flex-col items-start gap-2',
};

const VARIANT_ACCENT: Record<ToastVariant, string> = {
  default: 'var(--uix-border-strong)',
  success: 'var(--uix-success)',
  info: 'var(--uix-info)',
  warning: 'var(--uix-warning)',
  danger: 'var(--uix-danger)',
};

// status (polite) for informational variants; alert (assertive) for the
// two variants that demand attention.
const VARIANT_ROLE: Record<ToastVariant, 'status' | 'alert'> = {
  default: 'status',
  success: 'status',
  info: 'status',
  warning: 'alert',
  danger: 'alert',
};

export function Toaster({
  position = 'bottom-right',
  max = 3,
  regionLabel = 'Notifications',
  dismissLabel = 'Dismiss notification',
  className,
}: ToasterProps): ReactElement | null {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [paused, setPaused] = useState(false);

  // FIFO eviction: when the stack exceeds `max`, dismiss the oldest from the
  // store (their onDismiss fires). The render below also slices defensively
  // so an over-limit frame never flashes a fourth card.
  useEffect(() => {
    if (items.length <= max) return;
    for (const t of items.slice(0, items.length - max)) dismissById(t.id);
  }, [items, max]);

  return (
    <div
      role="region"
      aria-label={regionLabel}
      className={cn(POSITION_CLS[position], className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        // resume only when focus leaves the whole stack (focus-within).
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      {items.slice(-max).map((t) => (
        <ToastItem key={t.id} record={t} paused={paused} dismissLabel={dismissLabel} />
      ))}
    </div>
  );
}

// -- single toast card -----------------------------------------------------

function ToastItem({
  record,
  paused,
  dismissLabel,
}: {
  record: ToastRecord;
  paused: boolean;
  dismissLabel: string;
}) {
  // enter transition: mount → next frame flips `entered` (no focus stealing).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // pausable auto-dismiss timer; remaining time survives pause/resume cycles.
  const ownerRef = useRef<ToastRecord>(record);
  const remainingRef = useRef<number | null>(record.durationMs);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ownerRef.current !== record) {
      // update-in-place (same id re-toasted): restart from the new duration.
      ownerRef.current = record;
      remainingRef.current = record.durationMs;
    }
    if (record.durationMs === null || paused) return undefined;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(
      () => {
        timerRef.current = null;
        startedAtRef.current = null;
        dismissById(record.id);
      },
      Math.max(0, remainingRef.current ?? 0),
    );
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (startedAtRef.current !== null && remainingRef.current !== null) {
        remainingRef.current = Math.max(
          0,
          remainingRef.current - (Date.now() - startedAtRef.current),
        );
        startedAtRef.current = null;
      }
    };
  }, [record, paused]);

  return (
    <div
      role={VARIANT_ROLE[record.variant]}
      className="flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3 border p-3"
      style={{
        background: 'var(--uix-surface-2)',
        borderColor: 'var(--uix-border)',
        borderLeftWidth: 3,
        borderLeftColor: VARIANT_ACCENT[record.variant],
        borderRadius: 'var(--uix-radius-md)',
        boxShadow: 'var(--uix-shadow-popover)',
        color: 'var(--uix-text)',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(8px)',
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--uix-dur)',
        transitionTimingFunction: 'var(--uix-ease-out)',
      }}
      data-variant={record.variant}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{record.title}</div>
        {record.description !== undefined ? (
          <div className="mt-1 text-sm" style={{ color: 'var(--uix-text-hushed)' }}>
            {record.description}
          </div>
        ) : null}
        {record.action ? (
          <button
            type="button"
            className="mt-2 text-xs font-medium underline decoration-dotted underline-offset-4"
            style={{ color: 'var(--uix-link)' }}
            onClick={() => {
              record.action?.onClick();
              dismissById(record.id);
            }}
          >
            {record.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={dismissLabel}
        className="-m-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
        style={{ color: 'var(--uix-text-hushed)' }}
        onClick={() => dismissById(record.id)}
      >
        <X size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
