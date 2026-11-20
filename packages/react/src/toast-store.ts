import type { ReactNode } from 'react';
import { tokenMs } from './motion.js';

/**
 * The imperative toast queue behind `toast()` (HAR-1363; TENSOR A2/C3, MOTUS A3/A4/C-13).
 * Plain module state, no React: mutation helpers and server-action wrappers can call
 * `toast.success(...)` from anywhere on the client; every mounted `Toaster` subscribed to
 * the store renders it. Timing (auto-dismiss, pause on hover/focus/hidden tab) belongs to the
 * `Toaster`, because it depends on what the user is looking at.
 *
 * Undo deltas (enterprise UX study, roadmap #23; spec Docs/specs/2026-11-20-undo-deltas.md): the
 * store also owns what "undo" means (an undoable toast, a group of them, the latest one for
 * Ctrl/⌘+Z), toasts that merge by `group`, and the hold behind the rate limit and quiet mode.
 */

export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';

/**
 * `high`: always shown, even in quiet mode or over the rate limit. Default for errors, loading
 * toasts and undoable toasts (the person just acted and the undo window is theirs). `normal`:
 * everything else, which quiet mode and the rate limit may hold.
 */
export type ToastPriority = 'high' | 'normal';

export interface ToastAction {
  label: string;
  /** Runs, then the toast closes (reason `"action"`). Return `false` to keep it open. */
  onClick: () => void | boolean;
}

/**
 * Why a toast closed. `dropped`: it was never shown. Quiet mode or the rate limit held it, and
 * the person closed the "notifications waiting" summary instead of showing them.
 */
export type ToastDismissReason = 'timeout' | 'close' | 'action' | 'programmatic' | 'dropped';

export interface ToastOptions {
  /** Reuse an id to replace a toast in place instead of stacking a duplicate. */
  id?: string;
  /** A second, quieter line. */
  description?: ReactNode;
  /**
   * Milliseconds on screen while visible and not paused. `null` keeps it until dismissed.
   * Defaults: success/info/default 5 s, warning 8 s, error and loading stay; undoable
   * `--uix-hold-undo` (8 s).
   */
  duration?: number | null;
  /**
   * `false`: a fixed timer (HAR-1831). The toast closes `duration` after it appears, even while the
   * pointer or focus is on it or the tab is hidden; for an undo window that must end on time
   * (TENSOR's `useUndoableAction` commits after exactly 5 s). A toast waiting beyond the
   * Toaster's `limit` starts its timer when it appears. Default `true`: the timer pauses.
   */
  pauseOnHover?: boolean;
  action?: ToastAction;
  /** Replaces the tone glyph. */
  icon?: ReactNode;
  /** Called once when the toast closes, with the reason. */
  onDismiss?: (reason: ToastDismissReason) => void;
  /**
   * Collapse repeats: a toast whose `group` matches a toast still open merges into it instead of
   * stacking ("Resolved 3 tickets", not three toasts). The open toast takes the new message,
   * counts up, and its timer starts again, so a run of the same action keeps one toast until the
   * run stops for a whole `duration`. Every merged call's `onDismiss` runs when it closes.
   */
  group?: string;
  /**
   * The merged toast's message for `count` (2 or more) toasts, e.g. `(n) => n === 1 ? 'Resolved 1 ticket' :
   * \`Resolved ${n} tickets\`` (or a plural label through your i18n). Without it the toast shows
   * the latest message and a "×3" count.
   */
  groupMessage?: (count: number) => ReactNode;
  /**
   * A thin bar that shrinks as the time runs out (the remaining seconds as text under reduced
   * motion), paused whenever the timer is. Default `true` for undoable toasts, `false` otherwise.
   */
  countdown?: boolean;
  /** Whether quiet mode and the rate limit may hold it. See {@link ToastPriority}. */
  priority?: ToastPriority;
}

export interface ToastRecord {
  id: string;
  kind: ToastKind;
  message: ReactNode;
  description?: ReactNode;
  duration: number | null;
  /** `false`: the timer does not pause (see {@link ToastOptions.pauseOnHover}). */
  pauseOnHover?: boolean;
  action?: ToastAction;
  icon?: ReactNode;
  /** Set while the leave animation runs; the record is removed after it. */
  leaving?: boolean;
  /** Bumped on every update, so a Toaster restarts the toast's timer. */
  version: number;
  onDismiss?: (reason: ToastDismissReason) => void;
  /** The `group` it merges by. */
  group?: string;
  /** The merged message for a count (see {@link ToastOptions.groupMessage}); without it the Toaster shows "×3". */
  groupMessage?: (count: number) => ReactNode;
  /** How many toasts merged into this one; absent or 1 for one. */
  count?: number;
  /** Whether the Toaster draws the countdown. */
  countdown?: boolean;
  priority?: ToastPriority;
  /** An `undoable` toast with something left to undo: what Ctrl/⌘+Z reaches. */
  undoable?: boolean;
  /**
   * The summary of toasts quiet mode or the rate limit held: how many. The Toaster words it
   * (`labels.toast.held`) and its action shows them.
   */
  held?: number;
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
  /**
   * What Undo does on a toast several `group` calls merged into. `all` (default): every merged
   * action is reverted at once, newest first, and the toast closes. `each`: the newest one is
   * reverted and the toast stays with the rest (pressing Undo or Ctrl/⌘+Z again reverts the
   * next). The latest call decides.
   */
  undoGroup?: 'all' | 'each';
}

/** At most `max` normal-priority toasts appear per `per` ms; the rest are held and summarised. */
export interface ToastRateLimit {
  max: number;
  per: number;
}

export interface ToastStoreConfig {
  /** Default {@link DEFAULT_TOAST_RATE_LIMIT}; `false` turns it off. */
  rateLimit?: ToastRateLimit | false;
}

/** The result of undoing the latest undoable toast. */
export interface ToastUndoResult {
  id: string;
  /** What was undone: the toast's message, or the one merged action's under `undoGroup: 'each'`. */
  message: ReactNode;
}

export interface ToastStore {
  show: (kind: ToastKind, message: ReactNode, options?: ToastOptions) => string;
  update: (id: string, patch: Partial<Omit<ToastRecord, 'id' | 'version'>>) => void;
  dismiss: (id?: string, reason?: ToastDismissReason) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly ToastRecord[];
  /** See {@link ToastApi.undoable}. */
  undoable: (message: ReactNode, options: UndoableToastOptions) => string;
  /** See {@link ToastApi.undo}. */
  undo: (id: string) => boolean;
  /** The newest toast with something to undo, open or waiting beyond the Toaster's `limit`. */
  latestUndoable: () => ToastRecord | undefined;
  /** Undo the newest undoable toast (what Ctrl/⌘+Z does); `null` when there is none. */
  undoLatest: () => ToastUndoResult | null;
  /** See {@link ToastApi.setQuiet}. */
  setQuiet: (quiet: boolean) => void;
  isQuiet: () => boolean;
  /** The toasts held by quiet mode or the rate limit, oldest first. */
  getHeld: () => readonly ToastRecord[];
  /** Show every held toast now (they queue behind the Toaster's `limit`). */
  releaseHeld: () => void;
  /** Close every held toast unseen (reason `dropped`). */
  dropHeld: () => void;
  configure: (config: ToastStoreConfig) => void;
}

const DEFAULT_DURATION: Record<ToastKind, number | null> = {
  success: 5000, info: 5000, default: 5000, warning: 8000, error: null, loading: null,
};

/**
 * How long the leave transition gets before the record is removed when no stylesheet answers:
 * the store reads `--uix-dur-exit` (toast.css leaves on it), so the two never disagree (HAR-2578).
 */
export const TOAST_LEAVE_MS = 110;

/**
 * The undo window when no stylesheet answers: the store reads `--uix-hold-undo`. No study gives a
 * length (enterprise UX study §6). 8 s is the kit's "read and decide" toast tier, the one a
 * warning already gets: time to read one line and reach Undo or press Ctrl/⌘+Z. The timer also
 * pauses while the pointer or focus is on the toasts or the tab is hidden (WCAG 2.2.1). Pass
 * `duration` per call for another window.
 */
export const TOAST_UNDO_MS = 8000;

/**
 * At most five normal toasts in ten seconds (`createToastStore` default). Above the three a
 * Toaster shows at once, so an ordinary burst still queues as before; a storm (a major incident,
 * a bulk job reporting row by row) is held and summarised in one "notifications waiting" toast
 * instead of draining for minutes (WCAG 2.2.4). Errors, loading and undoable toasts never wait.
 */
export const DEFAULT_TOAST_RATE_LIMIT: ToastRateLimit = { max: 5, per: 10_000 };

let counter = 0;

interface UndoItem { message: ReactNode; onUndo: () => void; onCommit: () => void }
interface UndoEntry { items: UndoItem[]; each: boolean; groupMessage?: (count: number) => ReactNode }

const chain = (a?: (reason: ToastDismissReason) => void, b?: (reason: ToastDismissReason) => void) => (
  a && b ? (reason: ToastDismissReason) => { a(reason); b(reason); } : a ?? b
);

/** A separate queue, e.g. per test or per embedded app. Most products use the default `toast`. */
export function createToastStore(config: ToastStoreConfig = {}): ToastStore {
  let records: readonly ToastRecord[] = [];
  let held: readonly ToastRecord[] = [];
  let quiet = false;
  let rateLimit: ToastRateLimit | false = config.rateLimit === undefined ? DEFAULT_TOAST_RATE_LIMIT : config.rateLimit;
  /** When each recent normal toast appeared, for the rate limit. */
  let recent: number[] = [];
  let summaryId: string | null = null;
  const undos = new Map<string, UndoEntry>();
  const listeners = new Set<() => void>();
  const emit = () => { for (const listener of [...listeners]) listener(); };
  const set = (next: readonly ToastRecord[]) => { records = next; emit(); };

  const open = (id: string) => records.find((r) => r.id === id && !r.leaving);

  const shouldHold = (record: ToastRecord) => {
    if (record.priority === 'high') return false;
    if (quiet) return true;
    if (!rateLimit) return false;
    const now = Date.now();
    recent = recent.filter((at) => now - at < (rateLimit as ToastRateLimit).per);
    if (recent.length >= rateLimit.max) return true;
    recent.push(now);
    return false;
  };

  /** The "N notifications waiting" toast: shown, recounted or closed to match `held`. Not while quiet. */
  const syncSummary = () => {
    if (quiet) return;
    const current = summaryId ? open(summaryId) : undefined;
    if (!held.length) {
      if (current) dismiss(current.id, 'programmatic');
      return;
    }
    if (current) {
      if (current.held !== held.length) set(records.map((r) => (r.id === current.id ? { ...r, held: held.length, version: r.version + 1 } : r)));
      return;
    }
    const id = `uix-toast-held-${++counter}`;
    summaryId = id;
    set([...records, {
      id, kind: 'info', message: null, duration: null, priority: 'high', held: held.length, version: 0,
      action: { label: 'Show', onClick: () => releaseHeld() },
      onDismiss: (reason) => {
        if (summaryId === id) summaryId = null;
        if (reason !== 'action') drop('dropped');
      },
    }]);
  };

  const drop = (reason: ToastDismissReason) => {
    if (!held.length) return;
    const out = held;
    held = [];
    for (const r of out) r.onDismiss?.(reason);
    emit();
  };

  const releaseHeld: ToastStore['releaseHeld'] = () => {
    const out = held;
    held = [];
    if (out.length) set([...records, ...out]);
    if (summaryId) dismiss(summaryId, 'action');
  };

  const build = (kind: ToastKind, message: ReactNode, options: ToastOptions, id: string): ToastRecord => ({
    id, kind, message,
    description: options.description,
    duration: options.duration === undefined ? DEFAULT_DURATION[kind] : options.duration,
    pauseOnHover: options.pauseOnHover,
    action: options.action,
    icon: options.icon,
    onDismiss: options.onDismiss,
    group: options.group,
    groupMessage: options.groupMessage,
    countdown: options.countdown,
    priority: options.priority ?? (kind === 'error' || kind === 'loading' ? 'high' : 'normal'),
    version: 0,
  });

  /** The open (or held) toast a `group` call merges into. */
  const groupTarget = (group: string, undoable: boolean) => {
    const match = (r: ToastRecord) => r.group === group && !r.leaving && !!r.undoable === undoable;
    return [...records].reverse().find(match) ?? [...held].reverse().find(match);
  };

  /** Replace one record wherever it is (on screen or held). */
  const replace = (id: string, next: (r: ToastRecord) => ToastRecord) => {
    if (held.some((r) => r.id === id)) { held = held.map((r) => (r.id === id ? next(r) : r)); emit(); return; }
    set(records.map((r) => (r.id === id ? next(r) : r)));
  };

  const add = (record: ToastRecord) => {
    const existing = records.find((r) => r.id === record.id);
    if (existing) { set(records.map((r) => (r.id === record.id ? { ...record, version: r.version + 1 } : r))); return; }
    const waiting = held.find((r) => r.id === record.id);
    if (waiting) { held = held.map((r) => (r.id === record.id ? { ...record, version: r.version + 1 } : r)); emit(); return; }
    if (shouldHold(record)) {
      held = [...held, record];
      emit();
      syncSummary();
      return;
    }
    set([...records, record]);
  };

  const show: ToastStore['show'] = (kind, message, options = {}) => {
    if (!options.id && options.group) {
      const target = groupTarget(options.group, false);
      if (target) {
        const count = (target.count ?? 1) + 1;
        const fresh = build(kind, options.groupMessage ? options.groupMessage(count) : message, options, target.id);
        replace(target.id, (r) => ({ ...fresh, count, onDismiss: chain(r.onDismiss, options.onDismiss), version: r.version + 1 }));
        return target.id;
      }
    }
    const id = options.id ?? `uix-toast-${++counter}`;
    const record = build(kind, message, options, id);
    add(record);
    return id;
  };

  const update: ToastStore['update'] = (id, patch) => {
    const patched = (r: ToastRecord): ToastRecord => {
      const kind = patch.kind ?? r.kind;
      // A kind change without an explicit duration takes the new kind's default (loading → success).
      const duration = 'duration' in patch ? patch.duration ?? null : patch.kind ? DEFAULT_DURATION[kind] : r.duration;
      return { ...r, ...patch, kind, duration, leaving: false, version: r.version + 1 };
    };
    const waiting = held.find((r) => r.id === id);
    if (waiting) {
      const next = patched(waiting);
      // a held toast that turns into an error must not wait for the person to ask for it
      if (next.kind === 'error') {
        held = held.filter((r) => r.id !== id);
        set([...records, { ...next, priority: 'high' }]);
        syncSummary();
      } else {
        held = held.map((r) => (r.id === id ? next : r));
        emit();
      }
      return;
    }
    if (!records.some((r) => r.id === id)) return;
    set(records.map((r) => (r.id === id ? patched(r) : r)));
  };

  const dismiss: ToastStore['dismiss'] = (id, reason = 'programmatic') => {
    if (id === undefined) drop(reason);
    else if (held.some((r) => r.id === id)) {
      const gone = held.find((r) => r.id === id)!;
      held = held.filter((r) => r.id !== id);
      gone.onDismiss?.(reason);
      emit();
      syncSummary();
      return;
    }
    const closing = records.filter((r) => (id === undefined || r.id === id) && !r.leaving);
    if (closing.length === 0) return;
    const ids = new Set(closing.map((r) => r.id));
    set(records.map((r) => (ids.has(r.id) ? { ...r, leaving: true } : r)));
    for (const r of closing) r.onDismiss?.(reason);
    const remove = () => set(records.filter((r) => !(ids.has(r.id) && r.leaving)));
    if (typeof setTimeout === 'function') setTimeout(remove, tokenMs('--uix-dur-exit', TOAST_LEAVE_MS)); else remove();
  };

  /** Commit whatever an undoable toast still holds (it closed without Undo). */
  const commit = (id: string) => {
    const entry = undos.get(id);
    if (!entry) return;
    undos.delete(id);
    for (const item of entry.items) item.onCommit();
  };

  /** Undo one undoable toast: everything, or its newest action under `each`. `null`: nothing to undo. */
  const undoAt = (id: string): ReactNode | null => {
    const entry = undos.get(id);
    const record = records.find((r) => r.id === id && !r.leaving);
    if (!entry || !entry.items.length || !record) return null;
    if (entry.each && entry.items.length > 1) {
      const item = entry.items.pop()!;
      item.onUndo();
      const count = entry.items.length;
      update(id, { count, message: count > 1 && entry.groupMessage ? entry.groupMessage(count) : entry.items[count - 1].message });
      return item.message;
    }
    undos.delete(id);
    for (const item of [...entry.items].reverse()) item.onUndo();
    dismiss(id, 'action');
    return record.message;
  };

  const undoable: ToastStore['undoable'] = (message, { onUndo, onCommit, undoLabel = 'Undo', undoGroup = 'all', duration, countdown = true, priority = 'high', ...options }) => {
    const item: UndoItem = { message, onUndo, onCommit };
    const windowMs = duration === undefined ? tokenMs('--uix-hold-undo', TOAST_UNDO_MS) : duration;
    if (!options.id && options.group) {
      const target = groupTarget(options.group, true);
      const entry = target && undos.get(target.id);
      if (target && entry) {
        entry.items.push(item);
        entry.each = undoGroup === 'each';
        entry.groupMessage = options.groupMessage;
        const count = entry.items.length;
        update(target.id, {
          message: options.groupMessage ? options.groupMessage(count) : message, description: options.description,
          groupMessage: options.groupMessage, count, duration: windowMs, pauseOnHover: options.pauseOnHover, countdown,
        });
        return target.id;
      }
    }
    const id = options.id ?? `uix-toast-${++counter}`;
    // An id that replaces an open undoable toast: the replaced action can no longer be undone.
    commit(id);
    undos.set(id, { items: [item], each: undoGroup === 'each', groupMessage: options.groupMessage });
    const record = build('default', message, {
      ...options, duration: windowMs, countdown, priority,
      action: { label: undoLabel, onClick: () => { undoAt(id); return false; } },
      onDismiss: () => commit(id),
    }, id);
    add({ ...record, undoable: true });
    return id;
  };

  const latestUndoable: ToastStore['latestUndoable'] = () => [...records].reverse().find((r) => r.undoable && !r.leaving && undos.has(r.id));

  const configure: ToastStore['configure'] = (next) => {
    if (next.rateLimit !== undefined) { rateLimit = next.rateLimit; recent = []; }
  };

  return {
    show, update, dismiss, undoable, configure, releaseHeld,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => records,
    undo: (id) => undoAt(id) !== null,
    latestUndoable,
    undoLatest: () => {
      const latest = latestUndoable();
      if (!latest) return null;
      const message = undoAt(latest.id);
      return message === null ? null : { id: latest.id, message };
    },
    setQuiet: (next) => {
      if (next === quiet) return;
      quiet = next;
      // "summarised later": the held toasts wait in one summary for when the person is back
      if (!quiet) syncSummary();
      emit();
    },
    isQuiet: () => quiet,
    getHeld: () => held,
    dropHeld: () => {
      drop('dropped');
      if (summaryId) dismiss(summaryId, 'action');
    },
  };
}

export interface ToastApi {
  (message: ReactNode, options?: ToastOptions): string;
  success: (message: ReactNode, options?: ToastOptions) => string;
  error: (message: ReactNode, options?: ToastOptions) => string;
  warning: (message: ReactNode, options?: ToastOptions) => string;
  info: (message: ReactNode, options?: ToastOptions) => string;
  loading: (message: ReactNode, options?: ToastOptions) => string;
  /** Close one toast, or every toast without an id (held ones too). */
  dismiss: (id?: string) => void;
  /** Change a toast in place (message, kind, description, duration, action). */
  update: (id: string, patch: Partial<Omit<ToastRecord, 'id' | 'version'>>) => void;
  /** A loading toast that turns into success or error when the promise settles. Returns the promise. */
  promise: <T>(promise: Promise<T>, messages: ToastPromiseMessages<T>, options?: ToastOptions) => Promise<T>;
  /**
   * An optimistic action with an Undo button (TENSOR C2 `useUndoableAction`): `onCommit` runs
   * when the toast closes without Undo; `onUndo` runs instead when Undo (or Ctrl/⌘+Z, through the
   * Toaster) is pressed. The window is `--uix-hold-undo` (8 s) unless `duration` says otherwise;
   * a countdown shows it. Pass `pauseOnHover: false` for a commit that happens exactly `duration`
   * after the toast appears, and `group` to merge repeats (see `undoGroup`).
   */
  undoable: (message: ReactNode, options: UndoableToastOptions) => string;
  /**
   * Undo an `undoable` toast from code, as if its Undo were pressed (HAR-1831): `onUndo` runs,
   * `onCommit` does not, and the toast closes. Returns `false` when `id` is not an open undoable
   * toast (it was already undone or committed). `dismiss(id)` commits instead.
   */
  undo: (id: string) => boolean;
  /** Undo the newest undoable toast, as Ctrl/⌘+Z does in a `Toaster`. `null` when there is none. */
  undoLatest: () => ToastUndoResult | null;
  /**
   * Do not disturb, for focus work (WCAG 2.2.4): while `true`, normal toasts are held instead of
   * shown. Errors, loading and undoable toasts still show. Back to `false`, one "N notifications
   * waiting" toast offers the held ones; closing it drops them (reason `dropped`).
   */
  setQuiet: (quiet: boolean) => void;
  isQuiet: () => boolean;
  /** Change the rate limit (`{ rateLimit: false }` turns it off). */
  configure: (config: ToastStoreConfig) => void;
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
  api.undoable = (message, options) => store.undoable(message, options);
  api.undo = (id) => store.undo(id);
  api.undoLatest = () => store.undoLatest();
  api.setQuiet = (quiet) => store.setQuiet(quiet);
  api.isQuiet = () => store.isQuiet();
  api.configure = (config) => store.configure(config);
  api.store = store;
  return api;
}

/** The default queue; a `<Toaster />` without a `store` prop renders it. */
export const toast: ToastApi = createToastApi(createToastStore());
