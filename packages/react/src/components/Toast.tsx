import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type ToastTone = 'success' | 'danger' | 'info';

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  message?: ReactNode;
  tone?: ToastTone;
  icon?: ReactNode;
  onClose?: () => void;
  leaving?: boolean;
}

export function Toast({ title, message, tone, icon, onClose, leaving, className, ...props }: ToastProps) {
  // Errors interrupt (assertive); everything else waits its turn (polite). Each toast is its own
  // live region — the Toaster is NOT — so we announce once, not twice (UIX-FIX-04). role="alert"
  // and role="status" imply assertive / polite respectively; aria-live is set to match, explicitly.
  const assertive = tone === 'danger';
  return (
    <div
      className={cx('uix-toast', tone && `uix-toast--${tone}`, className)}
      data-leaving={leaving || undefined}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      {...props}
    >
      {icon && <div className="uix-toast__icon" aria-hidden="true">{icon}</div>}
      <div className="uix-toast__body">
        {title && <div className="uix-toast__title">{title}</div>}
        {message && <div className="uix-toast__msg">{message}</div>}
      </div>
      {onClose && (
        <button className="uix-toast__close" onClick={onClose} aria-label="Dismiss">
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
  // Just the positioning container — NOT a live region. Each Toast is its own live region, so a
  // live region here would nest them and double-announce (UIX-FIX-04).
  return (
    <div className={cx('uix-toaster', className)} {...props}>
      {children}
    </div>
  );
}
