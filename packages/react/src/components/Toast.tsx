"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { prefersReducedMotion, useReducedMotion } from '../hooks/useReducedMotion.js';
import { tokenMs } from '../motion.js';
import { feedback } from '../feedback.js';
import { SWIPE_SLOP, SWIPE_VELOCITY, SWIPE_WINDOW, releaseVelocity } from '../swipe-gesture.js';
import type { SwipeSample } from '../swipe-gesture.js';
import { XIcon } from '../icons/components.js';
import { toast as defaultToast } from '../toast-store.js';
import { createPortal } from 'react-dom';
import { subscribeModalLayer, topModalDialog } from '../hooks/dialog-layer.js';
import { useShortcut } from './Shortcuts.js';
import type { ToastKind, ToastRecord, ToastStore } from '../toast-store.js';

export type ToastTone = 'success' | 'danger' | 'info' | 'warning';

/* Announcer shared by toasts inside a <Toaster> (UIX-A11Y-1): a live region inserted TOGETHER
 * with its content (the old per-toast role="status") is unreliable — many SRs only announce
 * changes to an already-mounted region. The Toaster owns a persistent polite region instead;
 * polite toasts push their text into it on mount. Null outside a Toaster → the toast falls back
 * to being its own live region, exactly as before. */
const ToasterContext = createContext<{ announce: (text: string, key?: string) => void } | null>(null);

/** The registry id of the Toaster's Ctrl/⌘+Z (undo the latest undoable toast), for hints and remaps. */
export const TOAST_UNDO_SHORTCUT_ID = 'toast.undo';

/** The words a `Toaster` and its toasts use. Translate through `UixLabelsProvider` (`toast`) or `Toaster labels`. */
export interface ToastLabels {
  /** The × of a toast. Default "Dismiss". */
  dismiss: string;
  /** Ctrl/⌘+Z in the shortcut sheet. Default "Undo the last action". */
  undoShortcut: string;
  /** Announced after Ctrl/⌘+Z undid something: `(message) => 'Undone: …'`, `message` absent when it has no text. */
  undone: (message?: string) => string;
  /** The time left on a countdown under reduced motion: `(seconds) => '8 s'`. */
  remaining: (seconds: number) => string;
  /** The count on a merged toast that has no `groupMessage`: `(count) => '×3'`. */
  count: (count: number) => string;
  /** The summary of held toasts (quiet mode, rate limit): `(count) => '3 notifications waiting'`. */
  held: (count: number) => string;
  /** The summary's action. Default "Show". */
  showHeld: string;
}

const DEFAULT_TOAST_LABELS: ToastLabels = {
  dismiss: 'Dismiss',
  undoShortcut: 'Undo the last action',
  undone: (message) => (message ? `Undone: ${message}` : 'Undone'),
  remaining: (seconds) => `${seconds} s`,
  count: (count) => `×${count}`,
  held: (count) => (count === 1 ? '1 notification waiting' : `${count} notifications waiting`),
  showHeld: 'Show',
};

/** The text of a message, when it is text. */
const textOf = (node: ReactNode): string | null => (typeof node === 'string' || typeof node === 'number' ? String(node) : null);

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/* Swipe to dismiss (HAR-2578). A horizontal drag that starts on the toast (not on its buttons)
 * follows the pointer; released past a third of the toast's width, or flung faster than
 * SWIPE_VELOCITY the way it was dragged, it flies out that way and closes. Otherwise it snaps
 * back. The close button and Escape stay the keyboard path. The constants are shared with the
 * Drawer swipe (swipe-gesture.ts). */

interface Drag { id: number; x0: number; y0: number; dx: number; samples: SwipeSample[]; active: boolean }

type PointerHandler = ((e: ReactPointerEvent<HTMLDivElement>) => void) | undefined;

function useSwipeToDismiss(onClose: (() => void) | undefined, own: {
  onPointerDown: PointerHandler; onPointerMove: PointerHandler; onPointerUp: PointerHandler; onPointerCancel: PointerHandler;
}) {
  const drag = useRef<Drag | null>(null);
  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active || !onClose) return;
    const el = e.currentTarget;
    el.removeAttribute('data-swiping');
    const v = releaseVelocity(d.samples, e.clientX, e.timeStamp);
    const fling = Math.abs(v) > SWIPE_VELOCITY && Math.sign(v) === Math.sign(d.dx);
    if (e.type === 'pointerup' && (fling || Math.abs(d.dx) > el.offsetWidth / 3)) {
      // Out the way it was thrown; under reduced motion it stays where it was let go and fades.
      if (!prefersReducedMotion()) el.style.translate = `${Math.sign(d.dx) * (el.offsetWidth + 32)}px 0`;
      // the snap-off (experimental feedback events), while the toast is still in the document
      feedback('selection', el);
      onClose();
    } else {
      el.style.translate = '';
    }
  };
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      own.onPointerDown?.(e);
      if (!onClose || e.defaultPrevented || e.button !== 0) return;
      if ((e.target as Element).closest('button, a, input, textarea, select, [role="button"]')) return;
      drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, samples: [{ p: e.clientX, t: e.timeStamp }], active: false };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      own.onPointerMove?.(e);
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x0;
      if (!d.active) {
        if (Math.abs(dx) < SWIPE_SLOP) return;
        if (Math.abs(e.clientY - d.y0) > Math.abs(dx)) { drag.current = null; return; } // a vertical scroll
        d.active = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        e.currentTarget.setAttribute('data-swiping', '');
      }
      d.samples = [...d.samples.filter((s) => e.timeStamp - s.t <= SWIPE_WINDOW), { p: e.clientX, t: e.timeStamp }];
      d.dx = dx;
      e.currentTarget.style.translate = `${dx}px 0`;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => { own.onPointerUp?.(e); end(e); },
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => { own.onPointerCancel?.(e); end(e); },
  };
}

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  dismissLabel?: string;
  title?: ReactNode;
  message?: ReactNode;
  tone?: ToastTone;
  icon?: ReactNode;
  /** A button (or link) after the text, e.g. "Undo" or "Copy details" (HAR-1363). */
  action?: ReactNode;
  onClose?: () => void;
  leaving?: boolean;
  /** Drawn at the toast's foot: the `Toaster`'s countdown for a timed toast. */
  countdown?: ReactNode;
  /** Change it to speak the toast again inside a `Toaster` (a merged repeat: "Resolved 3 tickets"). */
  announceKey?: string | number;
}

export function Toast({
  title, message, tone, icon, action, onClose, leaving, dismissLabel: dismissLabelProp, className, countdown, announceKey,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...props
}: ToastProps) {
  const uixLabels = useUixLabels();
  const dismissLabel = dismissLabelProp ?? uixLabels.toast?.dismiss ?? 'Dismiss';
  // Errors interrupt (assertive); everything else waits its turn (polite). Danger stays its own
  // role="alert" (announced reliably on insertion); polite toasts announce via the Toaster's
  // persistent region when one is present (UIX-A11Y-1), falling back to per-toast role="status".
  const assertive = tone === 'danger';
  const toaster = useContext(ToasterContext);
  const bodyRef = useRef<HTMLDivElement>(null);
  // StrictMode runs this effect twice on one instance, which spoke the toast twice ("Saved Saved").
  // A ref survives that re-run; a toast that really remounts (moved into the Toaster's portal,
  // HAR-2754) is a new instance and announces once there.
  const announcedRef = useRef<{ key: string | number | undefined } | null>(null);
  const instance = useId();

  useEffect(() => {
    if (assertive || !toaster) return;
    if (announcedRef.current && announcedRef.current.key === announceKey) return;
    const text = bodyRef.current?.textContent?.trim();
    if (!text) return;
    announcedRef.current = { key: announceKey };
    // A repeat replaces the toast's earlier words in the region instead of queueing behind them.
    toaster.announce(text, instance);
    // announce when the toast appears, and again when `announceKey` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announceKey]);

  // Dismissing the focused toast moves focus to the next toast's close button (else the
  // previous), so keyboard focus isn't dropped on <body> mid-stack (UIX-A11Y-1).
  const handleClose = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    if (document.activeElement === btn) {
      const toasterEl = btn.closest('.uix-toaster');
      if (toasterEl) {
        const closes = Array.from(toasterEl.querySelectorAll<HTMLButtonElement>('.uix-toast__close'));
        const i = closes.indexOf(btn);
        (closes[i + 1] ?? closes[i - 1])?.focus();
      }
    }
    onClose?.();
  };

  const swipe = useSwipeToDismiss(onClose, { onPointerDown, onPointerMove, onPointerUp, onPointerCancel });

  const ownLiveRegion = assertive || !toaster;
  return (
    <div
      className={cx('uix-toast', tone && `uix-toast--${tone}`, className)}
      data-leaving={leaving || undefined}
      role={ownLiveRegion ? (assertive ? 'alert' : 'status') : undefined}
      aria-live={ownLiveRegion ? (assertive ? 'assertive' : 'polite') : undefined}
      {...props}
      {...swipe}
    >
      {icon && <div className="uix-toast__icon" aria-hidden="true">{icon}</div>}
      <div className="uix-toast__body" ref={bodyRef}>
        {title && <div className="uix-toast__title">{title}</div>}
        {message && <div className="uix-toast__msg">{message}</div>}
      </div>
      {action != null && <div className="uix-toast__action-slot">{action}</div>}
      {onClose && (
        <button type="button" className="uix-toast__close" onClick={handleClose} aria-label={dismissLabel}>
          <XIcon />
        </button>
      )}
      {countdown}
    </div>
  );
}

/** Whether a toast store is in quiet mode (`toast.setQuiet`), re-rendering when it changes: for a "Do not disturb" switch. */
export function useToastQuiet(store: ToastStore = defaultToast.store): boolean {
  return useSyncExternalStore(store.subscribe, store.isQuiet, () => false);
}

export interface ToasterProps extends HTMLAttributes<HTMLDivElement> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  regionLabel?: string;
  /**
   * The queue to render (HAR-1363). Default: the store behind the exported `toast()`.
   * Children still render first, so a hand-managed `<Toast>` keeps working.
   */
  store?: ToastStore;
  /** At most this many store toasts on screen; later ones wait their turn. Default 3. */
  limit?: number;
  /** Corner of the viewport. Default `bottom-end`. */
  position?: 'bottom-end' | 'bottom-start' | 'bottom-center' | 'top-end' | 'top-start' | 'top-center';
  /**
   * Ctrl/⌘+Z undoes the newest undoable toast and announces it (`TOAST_UNDO_SHORTCUT_ID`, in the
   * registry's global scope, listed in the shortcut sheet, remappable). It never fires while typing
   * in a field or a contenteditable, where the browser's own undo applies, and leaves the key to the
   * page when nothing is waiting to be undone. Default `true`; `false` for a second Toaster.
   */
  undoShortcut?: boolean;
  /** This Toaster's words, over `UixLabelsProvider`'s `toast`. */
  labels?: Partial<ToastLabels>;
  children?: ReactNode;
}

const KIND_TONE: Record<ToastKind, ToastTone | undefined> = {
  success: 'success', error: 'danger', warning: 'warning', info: 'info', loading: 'info', default: undefined,
};

const svg = (path: ReactNode) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
/** Tone glyphs until the UIx icon set lands (HAR-996). Decorative: the text carries the meaning. */
const KIND_GLYPH: Partial<Record<ToastKind, ReactNode>> = {
  success: svg(<><circle cx="10" cy="10" r="7.25" /><path d="M6.75 10.25l2.25 2.25 4.25-4.75" /></>),
  error: svg(<><circle cx="10" cy="10" r="7.25" /><path d="M10 6.25v4.5M10 13.5v.25" /></>),
  warning: svg(<><path d="M10 3.25l7.25 13H2.75z" /><path d="M10 8.25v3.5M10 14v.25" /></>),
  info: svg(<><circle cx="10" cy="10" r="7.25" /><path d="M10 9.25v4.5M10 6.5v.25" /></>),
  loading: <span className="uix-spinner uix-toast__spinner" />,
};

/**
 * The time left on a timed toast (undo deltas, roadmap #23): a thin bar that shrinks on `transform`
 * over the toast's duration and stops whenever its timer does (`data-paused` on the toast, from the
 * same hover, focus and hidden-tab state). Under reduced motion it is the seconds left as text.
 */
function ToastCountdown({ duration, paused, remaining, label, reduced }: {
  duration: number; paused: boolean; remaining: () => number | null; label: (seconds: number) => string; reduced: boolean;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!reduced || paused) return undefined;
    // before the Toaster's timer starts (child effects run first) the whole duration is left
    const left = remaining() ?? duration;
    if (left <= 0) return undefined;
    // wake at the next whole second, when the figure changes
    const handle = window.setTimeout(() => tick((n) => n + 1), (left % 1000) || 1000);
    return () => clearTimeout(handle);
  });
  if (reduced) {
    const seconds = Math.max(0, Math.ceil((remaining() ?? duration) / 1000));
    return <span className="uix-toast__remaining">{label(seconds)}</span>;
  }
  // the duration is data, not a motion literal: the stylesheet's animation reads it
  return <span className="uix-toast__countdown" aria-hidden="true" style={{ ['--uix-toast-countdown' as string]: `${duration}ms` }} />;
}

/** Renders one store record, with the action and close wired to the store. */
function StoreToast({ record, store, labels, paused, remaining, undoKeys }: {
  record: ToastRecord; store: ToastStore; labels: ToastLabels; paused: boolean;
  remaining: (id: string) => number | null; undoKeys?: string;
}) {
  const held = record.held != null;
  const reduced = useReducedMotion();
  const timed = record.countdown && record.duration != null && !record.leaving;
  const fixed = record.pauseOnHover === false;
  const countdown = timed ? (
    <ToastCountdown
      key={record.version}
      duration={record.duration!}
      paused={paused && !fixed}
      remaining={() => remaining(record.id)}
      label={labels.remaining}
      reduced={reduced}
    />
  ) : undefined;
  // Under reduced motion the time left is words, beside the action it is the time for ("6 s  Undo").
  const inSlot = reduced && !!record.action;
  const action = record.action && (
    <>
      {inSlot && countdown}
      <button
        type="button"
        className="uix-toast__action"
        aria-keyshortcuts={undoKeys}
        onClick={() => { if (record.action!.onClick() !== false) store.dismiss(record.id, 'action'); }}
      >
        {held ? labels.showHeld : record.action.label}
      </button>
    </>
  );
  const count = record.count ?? 1;
  const title = held ? labels.held(record.held!) : (
    count > 1 && !record.groupMessage
      ? <>{record.message} <span className="uix-toast__count">{labels.count(count)}</span></>
      : record.message
  );
  return (
    <Toast
      data-toast-id={record.id}
      data-paused={timed && paused && !fixed ? '' : undefined}
      tone={KIND_TONE[record.kind]}
      icon={record.icon ?? KIND_GLYPH[record.kind]}
      title={title}
      message={record.description}
      action={action}
      leaving={record.leaving}
      aria-busy={record.kind === 'loading' || undefined}
      announceKey={count > 1 ? count : undefined}
      onClose={() => store.dismiss(record.id, 'close')}
      countdown={inSlot ? undefined : countdown}
    />
  );
}

interface Timer { version: number; remaining: number; start: number; handle?: number }

/**
 * Runs each visible toast's timer, paused while the pointer or focus is in the toaster or
 * the tab is hidden, so a toast never closes while someone is reading or reaching for it. A
 * toast with `pauseOnHover: false` keeps a fixed timer (HAR-1831).
 */
function useToastTimers(store: ToastStore, visible: readonly ToastRecord[], paused: boolean) {
  const timers = useRef(new Map<string, Timer>());
  useEffect(() => {
    const now = Date.now();
    const map = timers.current;
    const live = new Map(visible.filter((r) => !r.leaving && r.duration != null).map((r) => [r.id, r]));
    for (const [id, timer] of map) {
      const record = live.get(id);
      if (!record || record.version !== timer.version) {
        if (timer.handle != null) clearTimeout(timer.handle);
        map.delete(id);
      }
    }
    for (const record of live.values()) {
      let timer = map.get(record.id);
      if (!timer) { timer = { version: record.version, remaining: record.duration!, start: now }; map.set(record.id, timer); }
      if (paused && record.pauseOnHover !== false) {
        if (timer.handle != null) { clearTimeout(timer.handle); timer.handle = undefined; timer.remaining -= now - timer.start; }
      } else if (timer.handle == null) {
        timer.start = now;
        const id = record.id;
        timer.handle = window.setTimeout(() => store.dismiss(id, 'timeout'), Math.max(0, timer.remaining));
      }
    }
  });
  useEffect(() => () => {
    for (const timer of timers.current.values()) if (timer.handle != null) clearTimeout(timer.handle);
    timers.current.clear();
  }, []);
  /** Milliseconds left on a toast's timer, `null` before it starts. */
  return useCallback((id: string): number | null => {
    const timer = timers.current.get(id);
    if (!timer) return null;
    return Math.max(0, timer.handle != null ? timer.remaining - (Date.now() - timer.start) : timer.remaining);
  }, []);
}

export function Toaster({
  children, regionLabel: regionLabelProp, store = defaultToast.store, limit = 3, position = 'bottom-end', undoShortcut = true, labels: labelsProp,
  className, onMouseEnter, onMouseLeave, onFocus, onBlur, onKeyDown, ...props
}: ToasterProps) {
  const uixLabels = useUixLabels();
  const regionLabel = regionLabelProp ?? uixLabels.toaster?.region ?? 'Notifications';
  const labels: ToastLabels = { ...DEFAULT_TOAST_LABELS, ...uixLabels.toast, ...labelsProp };
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  // Positioning container + notifications landmark. The always-mounted visually-hidden region
  // below does the polite announcing for child toasts (see ToasterContext); it is cleared after
  // ~3s so an identical follow-up toast re-announces. aria-label is overridable via props spread.
  const [announcements, setAnnouncements] = useState<readonly { key?: string; text: string }[]>([]);
  const clearTimer = useRef<number | null>(null);

  const announce = useCallback((text: string, key?: string) => {
    // join with any still-visible announcement so near-simultaneous toasts aren't lost; a keyed
    // one (a merged repeat) replaces its own earlier words instead of queueing behind them
    setAnnouncements((cur) => [...cur.filter((a) => key === undefined || a.key !== key), { key, text }]);
    if (clearTimer.current != null) clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setAnnouncements([]), 3000);
  }, []);
  const announced = announcements.map((a) => a.text).join(' ');

  useEffect(() => () => {
    if (clearTimer.current != null) clearTimeout(clearTimer.current);
  }, []);

  // Keep the translated landmark and hand-managed children in server output. The initial
  // markup moves to the portal before paint; announce only from that mounted portal so a
  // pre-existing polite toast is not spoken twice during hydration.
  const ctx = useMemo(() => ({ announce: portalHost ? announce : () => {} }), [announce, portalHost]);
  const ctxAnnounce = useRef(ctx.announce);
  ctxAnnounce.current = ctx.announce;

  const records = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const visible = useMemo(() => records.slice(-Math.max(1, limit)), [records, limit]);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === 'hidden');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  const paused = hovered || focused || hidden;
  const remaining = useToastTimers(store, visible, paused);

  // Ctrl/⌘+Z: undo the newest undoable toast (roadmap #23). Global, listed in the sheet; never while
  // typing (the registry's default), where the browser's own undo applies. With nothing to undo the
  // handler declines, so the key goes on to the page.
  const regionRef = useRef<HTMLDivElement>(null);
  const undoLatest = useShortcut({
    id: TOAST_UNDO_SHORTCUT_ID,
    keys: 'Mod+Z',
    label: labels.undoShortcut,
    scope: 'global',
    enabled: undoShortcut,
    allowInModal: true,
    handler: () => {
      const latest = store.latestUndoable();
      if (!latest) return false;
      const el = Array.from(regionRef.current?.querySelectorAll<HTMLElement>('[data-toast-id]') ?? []).find((node) => node.dataset.toastId === latest.id);
      const shown = el?.querySelector('.uix-toast__title')?.textContent?.trim();
      const result = store.undoLatest();
      if (!result) return false;
      ctxAnnounce.current(labels.undone(textOf(result.message) ?? (shown || undefined)));
      return true;
    },
  });
  const latestUndoId = useMemo(() => [...records].reverse().find((r) => r.undoable && !r.leaving)?.id, [records]);

  // The stack reflows with a glide (HAR-2578): when a toast arrives or leaves, the others move from
  // where they were to where they are now (FLIP), on transform, instead of jumping. --uix-ease-out
  // rather than in-out: the toast that makes room clears the arriving one early instead of
  // overlapping it for most of the glide. Positions are layout positions (the toaster's box plus offsetTop), so a toast's own
  // enter or exit transform does not count as movement.
  const homeRef = useRef<HTMLSpanElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // One stable portal target: moving its DOM host preserves the queue's React identity,
  // announcements and event handlers. A popover escapes the dialog's clipping/transform;
  // its host must also be INSIDE the active modal, because the rest of the page is inert.
  useIsomorphicLayoutEffect(() => {
    const host = document.createElement('div');
    host.dataset.uixToastHost = '';
    host.style.display = 'contents'; // a portal target must not add a flex/grid item to its original shell
    homeRef.current?.after(host);
    setPortalHost(host);
    return () => { host.remove(); };
  }, []);
  useIsomorphicLayoutEffect(() => {
    if (!portalHost) return;
    const sync = () => {
      const region = regionRef.current;
      if (!region) return;
      const active = document.activeElement;
      const focusedElement = region.contains(active) ? active as HTMLElement : null;
      const dialog = topModalDialog();
      if (typeof region.hidePopover === 'function' && region.matches(':popover-open')) region.hidePopover();
      if (dialog) {
        dialog.append(portalHost);
      } else {
        homeRef.current?.after(portalHost);
      }
      if (dialog && typeof region.showPopover === 'function') {
        region.setAttribute('popover', 'manual');
        region.showPopover();
      } else {
        region.removeAttribute('popover');
      }
      // A DOM move can drop focus. Never move focus into a toast that did not already hold it.
      focusedElement?.focus({ preventScroll: true });
    };
    sync();
    return subscribeModalLayer(sync);
  }, [portalHost]);
  useIsomorphicLayoutEffect(() => {
    if (focused && visible.every(record => record.leaving) && returnFocusRef.current?.isConnected) {
      returnFocusRef.current.focus({ preventScroll: true });
    }
  }, [visible, focused]);
  const tops = useRef(new Map<string, number>());
  useIsomorphicLayoutEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    const base = region.getBoundingClientRect().top;
    const next = new Map<string, number>();
    const glide = !prefersReducedMotion();
    for (const el of Array.from(region.querySelectorAll<HTMLElement>(':scope > [data-toast-id]'))) {
      const id = el.dataset.toastId!;
      const top = base + el.offsetTop;
      next.set(id, top);
      const before = tops.current.get(id);
      if (!glide || before === undefined || Math.abs(before - top) < 1 || typeof el.animate !== 'function') continue;
      el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], {
        duration: tokenMs('--uix-dur', 160, el),
        easing: getComputedStyle(el).getPropertyValue('--uix-ease-out').trim() || 'ease-out',
        composite: 'add',
      });
    }
    tops.current = next;
  });

  // Esc dismisses the store toast that holds focus (WCAG 2.2.1 / 1.4.13 dismissible).
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== 'Escape') return;
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-toast-id]')?.dataset.toastId;
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    store.dismiss(id, 'close');
  };

  const content = (
    <ToasterContext.Provider value={ctx}>
      <div
        ref={regionRef}
        className={cx('uix-toaster', className)}
        role="region"
        aria-label={regionLabel}
        data-position={position === 'bottom-end' ? undefined : position}
        onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
        onFocus={(e) => {
          if (e.relatedTarget instanceof window.HTMLElement && !e.currentTarget.contains(e.relatedTarget)) returnFocusRef.current = e.relatedTarget;
          setFocused(true); onFocus?.(e);
        }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); onBlur?.(e); }}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="uix-visually-hidden" role="status" aria-live="polite">{announced}</span>
        {children}
        {/* keyed by kind too: a loading toast that turns into success/error remounts, so it is announced again */}
        {visible.map((record) => (
          <StoreToast
            key={`${record.id}:${record.kind}`}
            record={record}
            store={store}
            labels={labels}
            paused={paused}
            remaining={remaining}
            undoKeys={record.id === latestUndoId ? undoLatest.ariaKeyShortcuts : undefined}
          />
        ))}
      </div>
    </ToasterContext.Provider>
  );
  return <><span hidden ref={homeRef} />{portalHost ? createPortal(content, portalHost) : content}</>;
}
