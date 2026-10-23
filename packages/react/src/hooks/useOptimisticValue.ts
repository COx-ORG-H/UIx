"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export interface OptimisticRollback<T> {
  /** The value the person asked for. */
  attempted: T;
  /** The value shown again. */
  restored: T;
  error: unknown;
}

export interface UseOptimisticValueOptions<T> {
  /** Called when a change fails and the value is put back, e.g. to show a toast that says what was restored. */
  onRollback?: (rollback: OptimisticRollback<T>) => void;
}

export interface UseOptimisticValueResult<T> {
  /** What to show: the person's change at once, the server's value otherwise. */
  value: T;
  /** Show `next` now and save it; resolves when the save settles (it never rejects). */
  set: (next: T) => Promise<void>;
  /** A save is in flight. */
  pending: boolean;
  /** The last rollback, until the next change; `null` when the last change saved. */
  rollback: OptimisticRollback<T> | null;
  /**
   * Counts rollbacks. Pass it to `ChangeHighlight value={rollbacks}` (or `useChangeHighlight`)
   * so the restored element flashes; the person's own change does not.
   */
  rollbacks: number;
}

/**
 * An optimistic value with a visible rollback (HAR-2583, motion standard §2.6). Only for
 * reversible, personal, nearly-always-successful actions: star, pin, a reaction, mark read, a
 * display preference, the order of one's own saved views. Never for anything the server can
 * refuse or an auditor reads (a state transition, an assignment, an approval, a priority):
 * those stay pessimistic, with `Button loading` and `result`.
 *
 * `set(next)` shows `next` at once and calls `commit(next)`. If the commit fails, the last
 * confirmed value comes back, `rollbacks` counts up (flash the element with it), `rollback`
 * says what happened, and `onRollback` runs so the product can say it in words. When changes
 * overlap, only the latest one's outcome counts. While nothing is pending, `value` follows
 * `serverValue` when it changes; a change that saved stays shown until then.
 *
 * ```tsx
 * const star = useOptimisticValue(view.starred, (next) => api.star(view.id, next), {
 *   onRollback: () => toast.error(t('starNotSaved')),
 * });
 * <ChangeHighlight value={star.rollbacks} variant="ring" announce={star.rollback ? t('starRestored') : undefined}>
 *   <StarButton starred={star.value} onToggle={() => star.set(!star.value)} />
 * </ChangeHighlight>
 * ```
 */
export function useOptimisticValue<T>(serverValue: T, commit: (next: T) => Promise<unknown>, { onRollback }: UseOptimisticValueOptions<T> = {}): UseOptimisticValueResult<T> {
  const [shown, setShown] = useState(serverValue);
  const [pending, setPending] = useState(false);
  const [rollback, setRollback] = useState<OptimisticRollback<T> | null>(null);
  const [rollbacks, setRollbacks] = useState(0);
  const confirmed = useRef(serverValue);
  const latest = useRef(0);
  // the newest change known to have saved: a rollback restores to it, even when a later change
  // overtook it on screen
  const confirmedId = useRef(0);
  const mounted = useRef(true);
  const commitRef = useRef(commit);
  const onRollbackRef = useRef(onRollback);
  commitRef.current = commit;
  onRollbackRef.current = onRollback;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // A new server value wins unless a change of ours is in flight. A change that saved keeps
  // showing until the server's value moves (a refetch that has not landed yet would otherwise
  // flip it back for a moment).
  const pendingRef = useRef(false);
  pendingRef.current = pending;
  const firstServer = useRef(true);
  useEffect(() => {
    if (firstServer.current) { firstServer.current = false; return; }
    confirmed.current = serverValue;
    if (!pendingRef.current) setShown(serverValue);
  }, [serverValue]);

  const set = useCallback(async (next: T) => {
    const id = ++latest.current;
    setShown(next);
    setPending(true);
    setRollback(null);
    try {
      await commitRef.current(next);
      if (id > confirmedId.current) { confirmedId.current = id; confirmed.current = next; }
      if (!mounted.current || id !== latest.current) return;
      setPending(false);
    } catch (error) {
      if (!mounted.current || id !== latest.current) return;
      const restored = confirmed.current;
      const event = { attempted: next, restored, error };
      setShown(restored);
      setPending(false);
      setRollback(event);
      setRollbacks((n) => n + 1);
      onRollbackRef.current?.(event);
    }
  }, []);

  return { value: shown, set, pending, rollback, rollbacks };
}
