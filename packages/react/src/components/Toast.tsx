"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { prefersReducedMotion } from '../hooks/useReducedMotion.js';
import { tokenMs } from '../motion.js';
import { toast as defaultToast } from '../toast-store.js';
import type { ToastKind, ToastRecord, ToastStore } from '../toast-store.js';

export type ToastTone = 'success' | 'danger' | 'info' | 'warning';

/* Announcer shared by toasts inside a <Toaster> (UIX-A11Y-1): a live region inserted TOGETHER
 * with its content (the old per-toast role="status") is unreliable — many SRs only announce
 * changes to an already-mounted region. The Toaster owns a persistent polite region instead;
 * polite toasts push their text into it on mount. Null outside a Toaster → the toast falls back
 * to being its own live region, exactly as before. */
const ToasterContext = createContext<{ announce: (text: string) => void } | null>(null);

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/* Swipe to dismiss (HAR-2578). A horizontal drag that starts on the toast (not on its buttons)
 * follows the pointer; released past a third of the toast's width, or flung faster than
 * SWIPE_VELOCITY the way it was dragged, it flies out that way and closes. Otherwise it snaps
 * back. The close button and Escape stay the keyboard path. */
const SWIPE_VELOCITY = 0.11; // px per ms
const SWIPE_SLOP = 6; // px of travel before a press becomes a drag, so a tap stays a tap
const SWIPE_WINDOW = 100; // ms of movement the release velocity is measured over

interface Drag { id: number; x0: number; y0: number; dx: number; samples: { x: number; t: number }[]; active: boolean }

/** px/ms over the last SWIPE_WINDOW before `t`; 0 when the pointer stood still that long. */
function releaseVelocity(samples: { x: number; t: number }[], x: number, t: number): number {
  const recent = samples.filter((s) => t - s.t <= SWIPE_WINDOW);
  if (recent.length === 0) return 0;
  return (x - recent[0].x) / Math.max(1, t - recent[0].t);
}
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
      drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, samples: [{ x: e.clientX, t: e.timeStamp }], active: false };
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
      d.samples = [...d.samples.filter((s) => e.timeStamp - s.t <= SWIPE_WINDOW), { x: e.clientX, t: e.timeStamp }];
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
}

export function Toast({
  title, message, tone, icon, action, onClose, leaving, dismissLabel: dismissLabelProp, className,
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

  useEffect(() => {
    if (assertive || !toaster) return;
    const text = bodyRef.current?.textContent?.trim();
    if (text) toaster.announce(text);
    // announce once, when the toast appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          ×
        </button>
      )}
    </div>
  );
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

/** Renders one store record, with the action and close wired to the store. */
function StoreToast({ record, store }: { record: ToastRecord; store: ToastStore }) {
  const action = record.action && (
    <button
      type="button"
      className="uix-toast__action"
      onClick={() => { record.action!.onClick(); store.dismiss(record.id, 'action'); }}
    >
      {record.action.label}
    </button>
  );
  return (
    <Toast
      data-toast-id={record.id}
      tone={KIND_TONE[record.kind]}
      icon={record.icon ?? KIND_GLYPH[record.kind]}
      title={record.message}
      message={record.description}
      action={action}
      leaving={record.leaving}
      aria-busy={record.kind === 'loading' || undefined}
      onClose={() => store.dismiss(record.id, 'close')}
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
}

export function Toaster({ children, regionLabel: regionLabelProp, store = defaultToast.store, limit = 3, position = 'bottom-end', className, onMouseEnter, onMouseLeave, onFocus, onBlur, onKeyDown, ...props }: ToasterProps) {
  const uixLabels = useUixLabels();
  const regionLabel = regionLabelProp ?? uixLabels.toaster?.region ?? 'Notifications';
  // Positioning container + notifications landmark. The always-mounted visually-hidden region
  // below does the polite announcing for child toasts (see ToasterContext); it is cleared after
  // ~3s so an identical follow-up toast re-announces. aria-label is overridable via props spread.
  const [announced, setAnnounced] = useState('');
  const clearTimer = useRef<number | null>(null);

  const announce = useCallback((text: string) => {
    // join with any still-visible announcement so near-simultaneous toasts aren't lost
    setAnnounced((cur) => (cur ? `${cur} ${text}` : text));
    if (clearTimer.current != null) clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setAnnounced(''), 3000);
  }, []);

  useEffect(() => () => {
    if (clearTimer.current != null) clearTimeout(clearTimer.current);
  }, []);

  const ctx = useMemo(() => ({ announce }), [announce]);

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
  useToastTimers(store, visible, hovered || focused || hidden);

  // The stack reflows with a glide (HAR-2578): when a toast arrives or leaves, the others move from
  // where they were to where they are now (FLIP), on transform, instead of jumping. --uix-ease-out
  // rather than in-out: the toast that makes room clears the arriving one early instead of
  // overlapping it for most of the glide. Positions are layout positions (the toaster's box plus offsetTop), so a toast's own
  // enter or exit transform does not count as movement.
  const regionRef = useRef<HTMLDivElement>(null);
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

  return (
    <ToasterContext.Provider value={ctx}>
      <div
        ref={regionRef}
        className={cx('uix-toaster', className)}
        role="region"
        aria-label={regionLabel}
        data-position={position === 'bottom-end' ? undefined : position}
        onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); onBlur?.(e); }}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="uix-visually-hidden" role="status" aria-live="polite">{announced}</span>
        {children}
        {/* keyed by kind too: a loading toast that turns into success/error remounts, so it is announced again */}
        {visible.map((record) => <StoreToast key={`${record.id}:${record.kind}`} record={record} store={store} />)}
      </div>
    </ToasterContext.Provider>
  );
}
