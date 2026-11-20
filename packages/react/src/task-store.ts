/**
 * The imperative background-task store behind `tasks` and `<TaskTray />` (spec:
 * Docs/specs/2026-11-20-task-tray.md). It is plain module state, like `toast()`. A mutation helper,
 * a route loader or a server-action wrapper can start a task, and a page change in a single-page
 * app does not lose it, because the store outlives every component. Every mounted `TaskTray`
 * subscribed to the store renders it.
 *
 * Work longer than about 10 s gets real progress, the current step and a way to leave it running
 * (the latency ladder): an export, a CSV import, a bulk update, a discovery run.
 */

export type TaskStatus = 'running' | 'done' | 'failed' | 'cancelled';

/**
 * What a finished task offers: open the result, download it, retry. With `href` it renders as a
 * link (`download` makes it a download link); otherwise as a button that calls `onClick`. Either
 * way the task is dismissed afterwards unless `keep` is set.
 */
export interface TaskAction {
  label: string;
  onClick?: () => void;
  href?: string;
  /** `true`, or the file name to save as. Only with `href`. */
  download?: boolean | string;
  /** Keep the task in the tray after the action ran. Default `false`: it is dismissed. */
  keep?: boolean;
}

export interface TaskProgress {
  /** The current step, in words ("Writing CSV", "Row 1,200 of 4,000"). */
  step?: string;
  /** Work done so far, 0..`max`. Leave it out (or `null`) for work with no measurable end. */
  value?: number | null;
  /** Default 100. */
  max?: number;
  /** What the bar says to a screen reader and beside the step, instead of the percentage. */
  valueText?: string;
}

export interface TaskStartOptions extends TaskProgress {
  /** Reuse an id to restart a task in place (a Retry) instead of adding a second row. */
  id?: string;
  /**
   * Called when the person presses Cancel (after `signal` aborts). Passing it shows Cancel;
   * `cancellable: false` hides Cancel even then.
   */
  onCancel?: () => void;
  /** Show Cancel. Default: `true` when `onCancel` is given. A task can always be cancelled from code. */
  cancellable?: boolean;
}

export interface TaskUpdate extends TaskProgress {
  title?: string;
}

export interface TaskResult {
  /** One line about the outcome: "4,000 rows written", "12 tickets were locked". */
  message?: string;
  action?: TaskAction;
  /** Remove the finished task after this many milliseconds. Default: it stays until dismissed. */
  dismissAfter?: number;
}

export interface TaskRecord {
  id: string;
  title: string;
  status: TaskStatus;
  step?: string;
  value?: number | null;
  max: number;
  valueText?: string;
  message?: string;
  action?: TaskAction;
  cancellable: boolean;
  /** `Date.now()` when the task started (or restarted). */
  startedAt: number;
  finishedAt?: number;
  /** Bumped on every change, and again on a restart, so a renderer can tell runs apart. */
  version: number;
  /** Bumped on a restart with the same id, so the tray announces it again. */
  run: number;
}

/** A running task, as `tasks.start` returns it. After the task has finished, every call except `dismiss` and `update` is ignored. */
export interface TaskHandle {
  readonly id: string;
  /** Aborts when the task is cancelled (from the tray or `cancel()`). Pass it to `fetch`. */
  readonly signal: AbortSignal;
  /** Change the step, the progress or the title. Allowed in any state. */
  update: (patch: TaskUpdate) => void;
  /** The work finished. */
  complete: (result?: TaskResult) => void;
  /** The work failed. Give a message that says what went wrong and, where it helps, a Retry action. */
  fail: (result?: TaskResult) => void;
  /** Stop the task: aborts `signal`, calls `onCancel`, and shows it as cancelled. */
  cancel: () => void;
  /** Take the task out of the tray. It does not stop the work: `cancel()` does. */
  dismiss: () => void;
}

export interface TaskStore {
  start: (title: string, options?: TaskStartOptions) => TaskHandle;
  update: (id: string, patch: TaskUpdate) => void;
  /** Move a running task to a final state. Ignored for a task that already finished. */
  finish: (id: string, status: Exclude<TaskStatus, 'running'>, result?: TaskResult) => void;
  /** Remove one task, or every finished task without an id. */
  dismiss: (id?: string) => void;
  get: (id: string) => TaskRecord | undefined;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly TaskRecord[];
}

const EMPTY: readonly TaskRecord[] = [];

let counter = 0;

const clampMax = (max: number | undefined) => (typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : 100);

/** A separate set of tasks, e.g. per test or per embedded app. Most products use the default `tasks`. */
export function createTaskStore(): TaskStore {
  let records: readonly TaskRecord[] = EMPTY;
  const listeners = new Set<() => void>();
  const controllers = new Map<string, AbortController>();
  const cancelHandlers = new Map<string, () => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const emit = () => { for (const listener of listeners) listener(); };
  const set = (next: readonly TaskRecord[]) => { records = next.length ? next : EMPTY; emit(); };
  const patchOne = (id: string, fn: (r: TaskRecord) => TaskRecord) => {
    if (!records.some((r) => r.id === id)) return;
    set(records.map((r) => (r.id === id ? fn(r) : r)));
  };
  const clearTimer = (id: string) => {
    const timer = timers.get(id);
    if (timer !== undefined) { clearTimeout(timer); timers.delete(id); }
  };

  const update: TaskStore['update'] = (id, patch) => {
    patchOne(id, (r) => ({
      ...r,
      title: patch.title ?? r.title,
      step: 'step' in patch ? patch.step : r.step,
      value: 'value' in patch ? patch.value : r.value,
      max: 'max' in patch ? clampMax(patch.max) : r.max,
      valueText: 'valueText' in patch ? patch.valueText : r.valueText,
      version: r.version + 1,
    }));
  };

  const dismiss: TaskStore['dismiss'] = (id) => {
    const gone = records.filter((r) => (id === undefined ? r.status !== 'running' : r.id === id));
    if (!gone.length) return;
    for (const r of gone) {
      clearTimer(r.id);
      // a running task taken out of the tray keeps its signal: dismiss never stops the work
      if (r.status !== 'running') { controllers.delete(r.id); cancelHandlers.delete(r.id); }
    }
    const ids = new Set(gone.map((r) => r.id));
    set(records.filter((r) => !ids.has(r.id)));
  };

  const finish: TaskStore['finish'] = (id, status, result = {}) => {
    const record = records.find((r) => r.id === id);
    if (!record) {
      // a running task that was dismissed: it has no row, but cancel still stops the work, and its
      // ending releases what the store held for it
      const controller = controllers.get(id);
      const onCancel = cancelHandlers.get(id);
      controllers.delete(id);
      cancelHandlers.delete(id);
      if (status === 'cancelled') { controller?.abort(); onCancel?.(); }
      return;
    }
    if (record.status !== 'running') return;
    if (status === 'cancelled') {
      const controller = controllers.get(id);
      const onCancel = cancelHandlers.get(id);
      // the state changes first, so a work loop that reacts to the abort sees a cancelled task
      patchOne(id, (r) => ({ ...r, status, message: result.message, action: result.action, finishedAt: Date.now(), version: r.version + 1 }));
      controller?.abort();
      onCancel?.();
    } else {
      patchOne(id, (r) => ({ ...r, status, message: result.message, action: result.action, finishedAt: Date.now(), version: r.version + 1 }));
    }
    cancelHandlers.delete(id);
    const after = result.dismissAfter;
    if (typeof after === 'number' && Number.isFinite(after) && after >= 0 && typeof setTimeout === 'function') {
      clearTimer(id);
      const run = records.find((r) => r.id === id)?.run;
      timers.set(id, setTimeout(() => {
        timers.delete(id);
        // a restart with the same id in the meantime is a new run: leave it alone
        if (records.find((r) => r.id === id)?.run === run) dismiss(id);
      }, after));
    }
  };

  const start: TaskStore['start'] = (title, options = {}) => {
    let id = options.id;
    // a generated id never lands on one a caller chose (or one still held by dismissed work)
    while (id === undefined || (options.id === undefined && (records.some((r) => r.id === id) || controllers.has(id)))) id = `uix-task-${++counter}`;
    const existing = records.find((r) => r.id === id);
    if (existing?.status === 'running') {
      // restarting a running task: the old run is over
      controllers.get(id)?.abort();
    }
    clearTimer(id);
    const controller = new AbortController();
    controllers.set(id, controller);
    if (options.onCancel) cancelHandlers.set(id, options.onCancel); else cancelHandlers.delete(id);
    const record: TaskRecord = {
      id,
      title,
      status: 'running',
      step: options.step,
      value: options.value,
      max: clampMax(options.max),
      valueText: options.valueText,
      cancellable: options.cancellable ?? !!options.onCancel,
      startedAt: Date.now(),
      version: existing ? existing.version + 1 : 0,
      run: existing ? existing.run + 1 : 0,
    };
    // newest first; a restart keeps its row where it is
    set(existing ? records.map((r) => (r.id === id ? record : r)) : [record, ...records]);
    const signal = controller.signal;
    const live = () => controllers.get(id) === controller;
    return {
      id,
      signal,
      update: (patch) => { if (live()) update(id, patch); },
      complete: (result) => { if (live()) finish(id, 'done', result); },
      fail: (result) => { if (live()) finish(id, 'failed', result); },
      cancel: () => { if (live()) finish(id, 'cancelled'); },
      dismiss: () => { if (live()) dismiss(id); },
    };
  };

  return {
    start,
    update,
    finish,
    dismiss,
    get: (id) => records.find((r) => r.id === id),
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => records,
  };
}

export interface TaskRunOptions<T> extends Omit<TaskStartOptions, 'onCancel'> {
  /** The result line and action once `work` resolves. */
  success?: string | TaskResult | ((value: T) => string | TaskResult);
  /** The failure line and action once `work` rejects (not after a cancel). */
  error?: string | TaskResult | ((error: unknown) => string | TaskResult);
  /** Show Cancel, which aborts the handle's `signal`. Default `true`. */
  cancellable?: boolean;
  onCancel?: () => void;
}

export interface TaskApi {
  /** Start a task and get the handle that moves it on. */
  start: (title: string, options?: TaskStartOptions) => TaskHandle;
  /**
   * Run `work` as a task. It completes when the promise resolves and fails when it rejects. When it
   * rejects after a cancel (an `AbortError` from `fetch`), the task stays cancelled. Returns the
   * promise of `work`, so the caller can still await it (it rejects on failure and on cancel).
   */
  run: <T>(title: string, work: (task: TaskHandle) => Promise<T>, options?: TaskRunOptions<T>) => Promise<T>;
  /** Cancel a running task from code, as if its Cancel were pressed. */
  cancel: (id: string) => void;
  /** Take a task out of the tray (it does not stop it), or every finished task without an id. */
  dismiss: (id?: string) => void;
  /** Take every finished task out of the tray. */
  clearFinished: () => void;
  /** The store this API writes to; pass it to `<TaskTray store>` for a non-default set. */
  store: TaskStore;
}

type ResultSpec<V> = string | TaskResult | ((value: V) => string | TaskResult);

const toResult = <V>(spec: ResultSpec<V> | undefined, value: V): TaskResult => {
  const out = typeof spec === 'function' ? spec(value) : spec;
  return typeof out === 'string' ? { message: out } : out ?? {};
};

/** Binds the `tasks` API to a store. */
export function createTaskApi(store: TaskStore): TaskApi {
  function run<T>(title: string, work: (task: TaskHandle) => Promise<T>, { success, error, cancellable = true, ...options }: TaskRunOptions<T> = {}): Promise<T> {
    const task = store.start(title, { ...options, cancellable });
    let promise: Promise<T>;
    try {
      promise = Promise.resolve(work(task));
    } catch (thrown) {
      promise = Promise.reject(thrown);
    }
    // A success or error callback that throws must not leave the task running: the work did
    // succeed (or fail), so the task ends that way without the callback's line.
    const settle = <V>(spec: ResultSpec<V> | undefined, value: V): TaskResult => {
      try { return toResult(spec, value); } catch { return {}; }
    };
    promise.then(
      (value) => task.complete(settle(success, value)),
      (reason: unknown) => { if (!task.signal.aborted) task.fail(settle(error, reason)); },
    ).catch(() => {});
    return promise;
  }
  return {
    start: (title, options) => store.start(title, options),
    run,
    cancel: (id) => store.finish(id, 'cancelled'),
    dismiss: (id) => store.dismiss(id),
    clearFinished: () => store.dismiss(),
    store,
  };
}

/** The default set of tasks; a `<TaskTray />` without a `store` prop renders it. */
export const tasks: TaskApi = createTaskApi(createTaskStore());
