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
  return (
    <div
      className={cx('uix-toast', tone && `uix-toast--${tone}`, className)}
      data-leaving={leaving || undefined}
      role="status"
      aria-live="polite"
      {...props}
    >
      {icon && <div className="uix-toast__icon">{icon}</div>}
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
  return (
    <div className={cx('uix-toaster', className)} aria-live="polite" aria-atomic="false" {...props}>
      {children}
    </div>
  );
}
