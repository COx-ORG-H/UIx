"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from './Button.js';
import { Modal } from './Modal.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** The words of `SessionTimeout` (UIx enterprise UX study, roadmap #24). */
export interface SessionTimeoutLabels {
  /** The warning's title. */
  title: string;
  /** What happens when the time runs out, under the title. `{stay}` is replaced by the `stay` label. */
  description: string;
  /** The words before the countdown. */
  timeLeft: string;
  /** The primary action: renew the session (`onExtend`). Escape does the same. */
  stay: string;
  /** Sign out now (`onSignOut`). */
  signOut: string;
  /** Shown when `onExtend` failed; the warning stays open. */
  extendFailed: string;
  /** The title once the session has ended. */
  expiredTitle: string;
  /** Under the title once the session has ended, when the product keeps no drafts (no `onPersistDrafts`). */
  expiredDescription: string;
  /** While `onPersistDrafts` is still running at the end. */
  draftsSaving: string;
  /** `onPersistDrafts` finished: the work is not lost. */
  draftsKept: string;
  /** `onPersistDrafts` failed. */
  draftsFailed: string;
  /** Start a new session (`onSignIn`). */
  signIn: string;
  /** Close the "signed out" notice and look at the page. */
  close: string;
}

/** The English words of `SessionTimeout`; `UixLabelsProvider` `sessionTimeout` and `labels` override them. */
export const DEFAULT_SESSION_TIMEOUT_LABELS: SessionTimeoutLabels = {
  title: 'Your session is about to end',
  description: 'You will be signed out when the time runs out. Choose “{stay}” to keep working.',
  timeLeft: 'Time left',
  stay: 'Stay signed in',
  signOut: 'Sign out',
  extendFailed: 'Your session could not be extended. Try again.',
  expiredTitle: 'You have been signed out',
  expiredDescription: 'Your session has ended. Sign in again to carry on.',
  draftsSaving: 'Keeping your drafts…',
  draftsKept: 'Your drafts are kept. Sign in again to carry on where you left off.',
  draftsFailed: 'Your latest changes could not be kept. Copy anything you need before you leave this page.',
  signIn: 'Sign in again',
  close: 'Close',
};

/** Where the session stands: in use, warning before it ends, or ended. */
export type SessionTimeoutPhase = 'active' | 'warning' | 'expired';

/** Why `onPersistDrafts` is called: the warning opened (the session is still valid), or the session ended. */
export type SessionDraftsReason = 'warning' | 'expire';

/** The outcome of `onPersistDrafts` at the end: not asked, running, done, failed. */
export type SessionDraftsState = 'none' | 'saving' | 'kept' | 'failed';

/** An idle timeout: the session ends after `timeout` ms without activity in this tab. */
export interface SessionIdleConfig {
  /** Milliseconds without activity before the session ends. */
  timeout: number;
  /**
   * The window events that count as activity. Default: `pointerdown`, `keydown`, `wheel`,
   * `touchstart`, `scroll`. Activity while the warning shows does not count: only "Stay signed in" does.
   */
  events?: readonly string[];
}

/** The clock of a session: its end (`expiresAt` and/or `idle`), the warning time, and what to call when. */
export interface UseSessionTimeoutOptions {
  /**
   * When the session ends: the server's expiry (a `Date` or epoch ms). Pass the new one after a
   * renewal. `null` or `undefined` with no `idle` switches the timer off (signed out).
   */
  expiresAt?: Date | number | null;
  /** An idle timeout instead of (or before) a fixed expiry. The earlier of the two ends the session. */
  idle?: SessionIdleConfig;
  /** How long before the end the warning opens, in ms. Default 120 000 (2 minutes). */
  warnBefore?: number;
  /**
   * Renew the session. A returned `Date` or epoch ms is the new expiry (until `expiresAt` changes);
   * with `idle`, the idle timer restarts. A rejection keeps the warning open and says so.
   */
  onExtend?: () => void | Date | number | Promise<void | Date | number>;
  /** The warning opened. */
  onWarn?: () => void;
  /** The session ended. Runs after `onPersistDrafts('expire')` was called. */
  onExpire?: () => void;
  /**
   * Keep the person's unsaved work: called when the warning opens (`'warning'`, the session is still
   * valid, so a server save works) and when it ends (`'expire'`, before `onExpire`; save locally).
   * The "signed out" notice says whether the drafts were kept, from how the `'expire'` call settles.
   */
  onPersistDrafts?: (reason: SessionDraftsReason) => void | Promise<unknown>;
  /**
   * Stop the clock while the tab is hidden and carry on from the same time when it is shown
   * again. Only when the deadline is the product's own (an idle timeout on a kiosk, a till): a
   * server expiry runs on regardless. Default `false`: the clock keeps running.
   */
  pauseWhenHidden?: boolean;
}

/** What `useSessionTimeout` returns: where the session stands and the actions on it. */
export interface SessionTimeoutState {
  /** `active` in use, `warning` within `warnBefore` of the end, `expired` ended. */
  phase: SessionTimeoutPhase;
  /** Milliseconds left (0 once ended). Updated every second while the warning shows. */
  remaining: number;
  /** Renew the session through `onExtend`. Does nothing once the session has ended. */
  extend: () => Promise<void>;
  /** `onExtend` is running. */
  extending: boolean;
  /** The last `onExtend` failed. */
  extendFailed: boolean;
  /** How the drafts were kept at the end. */
  drafts: SessionDraftsState;
  /** Count activity now, as an activity event would (for activity the window does not see, such as an API call). */
  touch: () => void;
}

const DEFAULT_ACTIVITY_EVENTS: readonly string[] = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
/** The longest delay setTimeout keeps (about 24.8 days); longer ones fire at once. */
const MAX_DELAY = 2_147_483_647;

const toMs = (value: Date | number | null | undefined): number | null => {
  if (value == null) return null;
  const ms = typeof value === 'number' ? value : value.getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * The clock of `SessionTimeout`, for a product that draws its own warning (WCAG 2.2.1 Timing
 * Adjustable, 2.2.6 Timeouts). It reads the wall clock at every check, so a throttled background
 * tab or a laptop waking from sleep sees the right time at once.
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions): SessionTimeoutState {
  const { expiresAt, idle, warnBefore = 120_000, pauseWhenHidden = false } = options;
  const expiry = toMs(expiresAt);
  const idleTimeout = idle && Number.isFinite(idle.timeout) && idle.timeout > 0 ? idle.timeout : null;
  const events = idle?.events ?? DEFAULT_ACTIVITY_EVENTS;
  const eventsKey = events.join(' ');

  const latest = useRef(options);
  useIsomorphicLayoutEffect(() => { latest.current = options; });

  const [phase, setPhase] = useState<SessionTimeoutPhase>('active');
  const [remaining, setRemaining] = useState(0);
  const [extending, setExtending] = useState(false);
  const [extendFailed, setExtendFailed] = useState(false);
  const [drafts, setDrafts] = useState<SessionDraftsState>('none');
  /** Bumped to re-check now: an extension, the tab shown again, a new idle start. */
  const [epoch, setEpoch] = useState(0);

  const phaseRef = useRef<SessionTimeoutPhase>('active');
  const lastActivity = useRef<number | null>(null);
  /** The expiry an `onExtend` returned, until `expiresAt` changes. */
  const override = useRef<number | null>(null);
  /** Time spent paused while hidden, added to the deadline. */
  const shift = useRef(0);
  const hiddenAt = useRef<number | null>(null);
  const extendingRef = useRef(false);

  // A new expiry from the product replaces one an extension returned, and starts unpaused.
  useEffect(() => { override.current = null; shift.current = 0; }, [expiry]);

  /** The end, or null when the timer is off. */
  const deadline = useCallback((): number | null => {
    const fixed = override.current ?? expiry;
    if (idleTimeout != null && lastActivity.current == null) lastActivity.current = Date.now();
    const idleEnd = idleTimeout != null ? (lastActivity.current as number) + idleTimeout : null;
    const end = fixed != null && idleEnd != null ? Math.min(fixed, idleEnd) : fixed ?? idleEnd;
    return end == null ? null : end + shift.current;
  }, [expiry, idleTimeout]);

  // The scheduler: one timer to the warning, then one per second until the end.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const end = deadline();
      if (end == null) {
        phaseRef.current = 'active';
        setPhase('active');
        return;
      }
      if (pauseWhenHidden && hiddenAt.current != null) return;
      const left = end - Date.now();
      const was = phaseRef.current;
      if (left <= 0) {
        setRemaining(0);
        if (was === 'expired') return;
        phaseRef.current = 'expired';
        setPhase('expired');
        const persist = latest.current.onPersistDrafts;
        if (persist) {
          let result: unknown;
          try { result = persist('expire'); } catch { setDrafts('failed'); result = undefined; }
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            setDrafts('saving');
            (result as Promise<unknown>).then(() => setDrafts('kept'), () => setDrafts('failed'));
          } else setDrafts((state) => (state === 'failed' ? state : 'kept'));
        }
        latest.current.onExpire?.();
        return;
      }
      if (left <= warnBefore) {
        setRemaining(left);
        if (was !== 'warning') {
          phaseRef.current = 'warning';
          setPhase('warning');
          setDrafts('none');
          latest.current.onWarn?.();
          try { void Promise.resolve(latest.current.onPersistDrafts?.('warning')).catch(() => {}); } catch { /* the product's save threw: the warning still shows */ }
        }
        // The next whole second, so the countdown never skips one.
        const step = left % 1000 || 1000;
        timer = setTimeout(check, Math.min(step, left));
        return;
      }
      // Back in use (an extension, a new expiry, activity before the warning).
      if (was !== 'active') {
        phaseRef.current = 'active';
        setPhase('active');
        setExtendFailed(false);
        setDrafts('none');
      }
      setRemaining(left);
      timer = setTimeout(check, Math.min(left - warnBefore, MAX_DELAY));
    };
    check();
    return () => clearTimeout(timer);
  }, [deadline, warnBefore, pauseWhenHidden, epoch]);

  // A hidden tab's timers are throttled (or frozen while asleep): check again once it is shown.
  // With pauseWhenHidden the time spent hidden is added to the deadline.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (pauseWhenHidden && phaseRef.current !== 'expired') hiddenAt.current = Date.now();
        return;
      }
      if (hiddenAt.current != null) {
        shift.current += Date.now() - hiddenAt.current;
        hiddenAt.current = null;
      }
      setEpoch((n) => n + 1);
    };
    if (pauseWhenHidden && document.visibilityState === 'hidden') hiddenAt.current = Date.now();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      // Switched off while hidden: count the time so far, and run on.
      if (hiddenAt.current != null) {
        shift.current += Date.now() - hiddenAt.current;
        hiddenAt.current = null;
      }
    };
  }, [pauseWhenHidden]);

  const touch = useCallback(() => {
    if (idleTimeout == null || phaseRef.current !== 'active') return;
    lastActivity.current = Date.now();
    shift.current = 0;
  }, [idleTimeout]);

  // Activity only moves the start of the idle time; the scheduled check reads it when it fires.
  useEffect(() => {
    if (idleTimeout == null || typeof window === 'undefined') return;
    const names = eventsKey ? eventsKey.split(' ') : [];
    for (const name of names) window.addEventListener(name, touch, { capture: true, passive: true });
    return () => { for (const name of names) window.removeEventListener(name, touch, { capture: true }); };
  }, [idleTimeout, eventsKey, touch]);

  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const extend = useCallback(async () => {
    if (phaseRef.current === 'expired' || extendingRef.current) return;
    extendingRef.current = true;
    setExtending(true);
    setExtendFailed(false);
    try {
      const result = await latest.current.onExtend?.();
      if (!mounted.current) return;
      // The session may have ended while the renewal was on its way: it stays ended.
      if ((phaseRef.current as SessionTimeoutPhase) === 'expired') return;
      const next = toMs(result as Date | number | null | undefined);
      if (next != null) override.current = next;
      if (idleTimeout != null) lastActivity.current = Date.now();
      shift.current = 0;
      setEpoch((n) => n + 1);
    } catch {
      if (mounted.current) setExtendFailed(true);
    } finally {
      extendingRef.current = false;
      if (mounted.current) setExtending(false);
    }
  }, [idleTimeout]);

  return { phase, remaining, extend, extending, extendFailed, drafts, touch };
}

/** `Intl.ListFormat` (ES2021), typed here: the kit's TypeScript lib stops at ES2020. */
interface ListFormatLike { format(list: readonly string[]): string }
type ListFormatCtor = new (locale: string | undefined, options: { type: 'unit'; style: 'long' }) => ListFormatLike;

const unitFormats = new Map<string, { minute: Intl.NumberFormat; second: Intl.NumberFormat; list: ListFormatLike | null }>();

/** "1 minute, 5 seconds" in the locale's words and plural forms (CLDR, through Intl). */
function spokenTime(totalSeconds: number, locale: string | undefined): string {
  const key = locale ?? '';
  let formats = unitFormats.get(key);
  if (!formats) {
    const unit = (name: string) => new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'long' });
    let list: ListFormatLike | null = null;
    const ListFormat = (Intl as unknown as { ListFormat?: ListFormatCtor }).ListFormat;
    try { list = ListFormat ? new ListFormat(locale, { type: 'unit', style: 'long' }) : null; } catch { list = null; }
    formats = { minute: unit('minute'), second: unit('second'), list };
    unitFormats.set(key, formats);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    ...(minutes > 0 ? [formats.minute.format(minutes)] : []),
    ...(seconds > 0 || minutes === 0 ? [formats.second.format(seconds)] : []),
  ];
  return formats.list ? formats.list.format(parts) : parts.join(' ');
}

/** "1:05": minutes and two-digit seconds. */
const clockTime = (totalSeconds: number): string =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

/** `SessionTimeout`: the clock's options, the sign-out and sign-in actions, and the words. */
export interface SessionTimeoutProps extends UseSessionTimeoutOptions {
  /** Sign out now, from the warning. */
  onSignOut?: () => void;
  /** Start a new session from the "signed out" notice. Without it the notice offers Close only. */
  onSignIn?: () => void;
  /** The words. Default: `UixLabelsProvider` `sessionTimeout`, then English. */
  labels?: Partial<SessionTimeoutLabels>;
  /** The language of the spoken time ("1 minute, 5 seconds"). Default: `UixLabelsProvider` `dateFormat.locale`, then the browser's. */
  locale?: string;
}

/**
 * Warns before a session ends, with a way to stay and with the person's work kept (WCAG 2.2.1
 * Timing Adjustable, 2.2.6 Timeouts; UIx enterprise UX study, roadmap #24).
 *
 * `warnBefore` (2 minutes) before `expiresAt`, or before the end of an `idle` timeout, an alert
 * dialog opens with a countdown, "Stay signed in" (focused, primary; Escape does the same) and
 * "Sign out". It is announced once, when it opens; the countdown is a `timer` that is not read
 * out each second, but holds the time left in words for a screen reader that reads it. When the
 * time runs out, `onPersistDrafts('expire')` and `onExpire` run and the dialog says the person
 * was signed out and whether their drafts were kept. Render it once, near the root of the app.
 */
export function SessionTimeout({ onSignOut, onSignIn, labels: labelsProp, locale: localeProp, ...options }: SessionTimeoutProps) {
  const uix = useUixLabels();
  const labels: SessionTimeoutLabels = { ...DEFAULT_SESSION_TIMEOUT_LABELS, ...uix.sessionTimeout, ...labelsProp };
  const locale = localeProp ?? uix.dateFormat?.locale;
  const session = useSessionTimeout(options);
  const { phase, remaining, extend, extending, extendFailed, drafts } = session;
  const [dismissed, setDismissed] = useState(false);
  /** A failed extension the browser closed the dialog around (a close request it would not let us cancel): open it again. */
  const [attempt, setAttempt] = useState(0);
  const id = useId();
  const descId = `${id}-desc`;
  const timeId = `${id}-time`;
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  /**
   * The primary action carries the `autofocus` attribute, so `showModal()` itself puts focus there
   * every time it runs. A focus() from an effect alone lost to it in development: StrictMode re-runs
   * the new Modal's effects after this component's, and that second showModal() focused the first
   * button ("Sign out").
   */
  const setPrimary = useCallback((el: HTMLButtonElement | null) => {
    primaryRef.current = el;
    el?.setAttribute('autofocus', '');
  }, []);
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** The warning was on screen when the session ended: the notice replaces it at once, no second entrance. */
  const replaced = useRef(false);

  useEffect(() => { if (phase !== 'expired') setDismissed(false); }, [phase]);
  useEffect(() => {
    if (phase === 'warning') replaced.current = true;
    else if (phase === 'active') replaced.current = false;
  }, [phase]);
  useEffect(() => {
    if (extendFailed && dialogRef.current && !dialogRef.current.open) setAttempt((n) => n + 1);
  }, [extendFailed]);

  const open = phase === 'warning' || (phase === 'expired' && !dismissed);
  // And focus it once the dialog is shown (Modal has called showModal() by now), where showModal
  // does not honour autofocus.
  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open, phase, attempt]);

  if (!open) return null;
  const seconds = Math.ceil(remaining / 1000);

  if (phase === 'warning') {
    const stay = () => { void extend(); };
    return (
      <Modal
        key={`warning-${attempt}`}
        ref={dialogRef}
        open
        role="alertdialog"
        title={labels.title}
        aria-describedby={`${descId} ${timeId}`}
        className="uix-session-timeout"
        closeButton={false}
        // A close request the browser would not let us cancel (the Android back gesture) also means "stay".
        onClose={stay}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDialogElement>) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          stay();
        }}
        footer={(
          <>
            {onSignOut && <Button type="button" wrap onClick={() => onSignOut?.()} disabled={extending}>{labels.signOut}</Button>}
            <Button ref={setPrimary} type="button" wrap variant="primary" loading={extending} onClick={stay}>{labels.stay}</Button>
          </>
        )}
      >
        <div className="uix-confirm">
          <p id={descId}>{fillLabel(labels.description, { stay: labels.stay })}</p>
          <p id={timeId} className="uix-session-timeout__time">
            <span className="uix-session-timeout__label">{labels.timeLeft}</span>{' '}
            {/* A timer is not live: the time is said once, with the dialog, and is there to read. */}
            <span role="timer" aria-live="off" aria-atomic="true">
              <span className="uix-session-timeout__clock" aria-hidden="true">{clockTime(seconds)}</span>
              <span className="uix-visually-hidden">{spokenTime(seconds, locale)}</span>
            </span>
          </p>
          {extendFailed && <div className="uix-confirm__error" role="alert">{labels.extendFailed}</div>}
        </div>
      </Modal>
    );
  }

  const draftsText = drafts === 'saving' ? labels.draftsSaving
    : drafts === 'kept' ? labels.draftsKept
      : drafts === 'failed' ? labels.draftsFailed
        : labels.expiredDescription;
  const close = () => setDismissed(true);
  return (
    <Modal
      key="expired"
      ref={dialogRef}
      open
      role="alertdialog"
      title={labels.expiredTitle}
      aria-describedby={descId}
      className="uix-session-timeout"
      closeButton={false}
      instant={replaced.current}
      onClose={close}
      footer={(
        <>
          <Button ref={onSignIn ? undefined : setPrimary} type="button" wrap onClick={close}>{labels.close}</Button>
          {onSignIn && <Button ref={setPrimary} type="button" wrap variant="primary" onClick={() => onSignIn?.()}>{labels.signIn}</Button>}
        </>
      )}
    >
      <div className="uix-confirm">
        {/* A status: "Keeping your drafts…" turning into "kept" or "could not be kept" is said when it changes. */}
        <p id={descId} role="status">{draftsText}</p>
      </div>
    </Modal>
  );
}
SessionTimeout.displayName = 'SessionTimeout';
