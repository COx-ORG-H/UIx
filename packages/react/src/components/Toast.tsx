"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, MouseEvent as ReactMouseEvent } from 'react';
import { cx } from '../cx.js';

export type ToastTone = 'success' | 'danger' | 'info';

/* Announcer shared by toasts inside a <Toaster> (UIX-A11Y-1): a live region inserted TOGETHER
 * with its content (the old per-toast role="status") is unreliable — many SRs only announce
 * changes to an already-mounted region. The Toaster owns a persistent polite region instead;
 * polite toasts push their text into it on mount. Null outside a Toaster → the toast falls back
 * to being its own live region, exactly as before. */
const ToasterContext = createContext<{ announce: (text: string) => void } | null>(null);

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  message?: ReactNode;
  tone?: ToastTone;
  icon?: ReactNode;
  onClose?: () => void;
  leaving?: boolean;
}

export function Toast({ title, message, tone, icon, onClose, leaving, className, ...props }: ToastProps) {
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

  const ownLiveRegion = assertive || !toaster;
  return (
    <div
      className={cx('uix-toast', tone && `uix-toast--${tone}`, className)}
      data-leaving={leaving || undefined}
      role={ownLiveRegion ? (assertive ? 'alert' : 'status') : undefined}
      aria-live={ownLiveRegion ? (assertive ? 'assertive' : 'polite') : undefined}
      {...props}
    >
      {icon && <div className="uix-toast__icon" aria-hidden="true">{icon}</div>}
      <div className="uix-toast__body" ref={bodyRef}>
        {title && <div className="uix-toast__title">{title}</div>}
        {message && <div className="uix-toast__msg">{message}</div>}
      </div>
      {onClose && (
        <button className="uix-toast__close" onClick={handleClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export interface ToasterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Toaster({ children, className, ...props }: ToasterProps) {
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

  return (
    <ToasterContext.Provider value={ctx}>
      <div className={cx('uix-toaster', className)} role="region" aria-label="Notifications" {...props}>
        <span className="uix-visually-hidden" role="status" aria-live="polite">{announced}</span>
        {children}
      </div>
    </ToasterContext.Provider>
  );
}
