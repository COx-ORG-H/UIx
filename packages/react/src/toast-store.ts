import type { ReactNode } from 'react';

/**
 * The imperative toast queue behind `toast()` (HAR-1363; TENSOR A2/C3, MOTUS A3/A4/C-13).
 * Plain module state, no React: mutation helpers and server-action wrappers can call
 * `toast.success(...)` from anywhere on the client; every mounted `Toaster` subscribed to
 * the store renders it. Timing (auto-dismiss, pause on hover/focus/hidden tab) belongs to the
 * `Toaster`, because it depends on what the user is looking at.
 */

export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';

export interface ToastAction {
  label: string;
  /** Runs, then the toast closes (reason `"action"`). */
  onClick: () => void;
}

/** Why a toast closed. */
export type ToastDismissReason = 'timeout' | 'close' | 'action' | 'programmatic';

export interface ToastOptions {
  /** Reuse an id to replace a toast in place instead of stacking a duplicate. */
  id?: string;
  /** A second, quieter line. */
  description?: ReactNode;
  /**
   * Milliseconds on screen while visible and not paused. `null` keeps it until dismissed.
   * Defaults: success/info/default 5 s, warning 8 s, error and loading stay.
   */
  duration?: number | null;
  action?: ToastAction;
  /** Replaces the tone glyph. */
  icon?: ReactNode;
  /** Called once when the toast closes, with the reason. */
  onDismiss?: (reason: ToastDismissReason) => void;
}

export interface ToastRecord {
  id: string;
  kind: ToastKind;
  message: ReactNode;
  description?: ReactNode;
  duration: number | null;
  action?: ToastAction;
  icon?: ReactNode;
  /** Set while the leave animation runs; the record is removed after it. */
  leaving?: boolean;
  /** Bumped on every update, so a Toaster restarts the toast's timer. */
  version: number;
  onDismiss?: (reason: ToastDismissReason) => void;
}

export interface ToastPromiseMessages<T> {
  loading: ReactNode;
  success: ReactNode | ((value: T) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
}

export interface UndoableToastOptions extends Omit<ToastOptions, 'action' | 'onDismiss'> {
  /** The user pressed Undo: revert the optimistic change. `onCommit` is not called. */
  onUndo: () => void;
  /** The toast closed without Undo (timeout, ×, or a later dismiss): make the change final. */
  onCommit: () => void;
  /** Default "Undo". */
  undoLabel?: string;
}

export interface ToastStore {
  show: (kind: ToastKind, message: ReactNode, options?: ToastOptions) => string;
  update: (id: string, patch: Partial<Omit<ToastRecord, 'id' | 'version'>>) => void;
  dismiss: (id?: string, reason?: ToastDismissReason) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly ToastRecord[];
}

const DEFAULT_DURATION: Record<ToastKind, number | null> = {
  success: 5000, info: 5000, default: 5000, warning: 8000, error: null, loading: null,
};

/** How long the leave animation gets before the record is removed. */
export const TOAST_LEAVE_MS = 200;

let counter = 0;

/** A separate queue, e.g. per test or per embedded app. Most products use the default `toast`. */
export function createToastStore(): ToastStore {
  let records: readonly ToastRecord[] = [];
  const listeners = new Set<() => void>();
  const emit = () => { for (const listener of listeners) listener(); };
  const set = (next: readonly ToastRecord[]) => { records = next; emit(); };

  const show: ToastStore['show'] = (kind, message, options = {}) => {
    const id = options.id ?? `uix-toast-${++counter}`;
    const record: ToastRecord = {
      id, kind, message,
      description: options.description,
      duration: options.duration === undefined ? DEFAULT_DURATION[kind] : options.duration,
      action: options.action,
      icon: options.icon,
      onDismiss: options.onDismiss,
      version: 0,
    };
    const existing = records.find((r) => r.id === id);
    set(existing ? records.map((r) => (r.id === id ? { ...record, version: r.version + 1 } : r)) : [...records, record]);
    return id;
  };

  const update: ToastStore['update'] = (id, patch) => {
    if (!records.some((r) => r.id === id)) return;
    set(records.map((r) => {
      if (r.id !== id) return r;
      const kind = patch.kind ?? r.kind;
      // A kind change without an explicit duration takes the new kind's default (loading → success).
      const duration = 'duration' in patch ? patch.duration ?? null : patch.kind ? DEFAULT_DURATION[kind] : r.duration;
      return { ...r, ...patch, kind, duration, leaving: false, version: r.version + 1 };
    }));
  };

  const dismiss: ToastStore['dismiss'] = (id, reason = 'programmatic') => {
    const closing = records.filter((r) => (id === undefined || r.id === id) && !r.leaving);
    if (closing.length === 0) return;
    const ids = new Set(closing.map((r) => r.id));
    set(records.map((r) => (ids.has(r.id) ? { ...r, leaving: true } : r)));
    for (const r of closing) r.onDismiss?.(reason);
    const remove = () => set(records.filter((r) => !(ids.has(r.id) && r.leaving)));
    if (typeof setTimeout === 'function') setTimeout(remove, TOAST_LEAVE_MS); else remove();
  };

  return {
    show, update, dismiss,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => records,
  };
}

export interface ToastApi {
  (message: ReactNode, options?: ToastOptions): string;
  success: (message: ReactNode, options?: ToastOptions) => string;
  error: (message: ReactNode, options?: ToastOptions) => string;
  warning: (message: ReactNode, options?: ToastOptions) => string;
  info: (message: ReactNode, options?: ToastOptions) => string;
  loading: (message: ReactNode, options?: ToastOptions) => string;
  /** Close one toast, or every toast without an id. */
  dismiss: (id?: string) => void;
  /** Change a toast in place (message, kind, description, duration, action). */
  update: (id: string, patch: Partial<Omit<ToastRecord, 'id' | 'version'>>) => void;
  /** A loading toast that turns into success or error when the promise settles. Returns the promise. */
  promise: <T>(promise: Promise<T>, messages: ToastPromiseMessages<T>, options?: ToastOptions) => Promise<T>;
  /**
   * An optimistic action with an Undo button (TENSOR C2 `useUndoableAction`): `onCommit` runs
   * when the toast closes without Undo; `onUndo` runs instead when Undo is pressed.
   */
  undoable: (message: ReactNode, options: UndoableToastOptions) => string;
  /** The store this API writes to; pass it to `<Toaster store>` for a non-default queue. */
  store: ToastStore;
}

/** Binds the `toast()` API to a store. */
export function createToastApi(store: ToastStore): ToastApi {
  const api = ((message: ReactNode, options?: ToastOptions) => store.show('default', message, options)) as ToastApi;
  api.success = (message, options) => store.show('success', message, options);
  api.error = (message, options) => store.show('error', message, options);
  api.warning = (message, options) => store.show('warning', message, options);
  api.info = (message, options) => store.show('info', message, options);
  api.loading = (message, options) => store.show('loading', message, options);
  api.dismiss = (id) => store.dismiss(id, 'programmatic');
  api.update = (id, patch) => store.update(id, patch);
  api.promise = (promise, messages, options) => {
    const id = store.show('loading', messages.loading, options);
    promise.then(
      (value) => store.update(id, { kind: 'success', message: typeof messages.success === 'function' ? messages.success(value) : messages.success }),
      (error: unknown) => store.update(id, { kind: 'error', message: typeof messages.error === 'function' ? messages.error(error) : messages.error }),
    );
    return promise;
  };
  api.undoable = (message, { onUndo, onCommit, undoLabel = 'Undo', duration = 6000, ...options }) => {
    let undone = false;
    return store.show('default', message, {
      ...options,
      duration,
      action: { label: undoLabel, onClick: () => { undone = true; onUndo(); } },
      onDismiss: () => { if (!undone) onCommit(); },
    });
  };
  api.store = store;
  return api;
}

/** The default queue; a `<Toaster />` without a `store` prop renders it. */
export const toast: ToastApi = createToastApi(createToastStore());
