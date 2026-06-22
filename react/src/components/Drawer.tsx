import type { ReactNode } from 'react';
import { cx } from '../cx.js';
import { useDialog } from '../hooks/useDialog.js';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, children, footer, className }: DrawerProps) {
  const ref = useDialog(open);

  return (
    <dialog ref={ref} className={cx('uix-drawer', className)} onClose={onClose}>
      {(title != null || onClose) && (
        <div className="uix-drawer__header">
          {title && <div style={{ fontWeight: 600, fontSize: 'var(--uix-text-h3)' }}>{title}</div>}
          {onClose && (
            <button
              style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--uix-text-muted)', cursor: 'pointer', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 'var(--uix-radius-sm)' }}
              onClick={onClose}
              aria-label="Close drawer"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}
      {children != null && <div className="uix-drawer__body">{children}</div>}
      {footer != null && <div className="uix-drawer__footer">{footer}</div>}
    </dialog>
  );
}
