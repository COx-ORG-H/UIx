import type { ReactNode, CSSProperties } from 'react';
import { cx } from '../cx.js';
import { useDialog } from '../hooks/useDialog.js';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Modal({ open, onClose, title, children, footer, className, style }: ModalProps) {
  const ref = useDialog(open);

  return (
    <dialog ref={ref} className={cx('uix-dialog', className)} style={style} onClose={onClose}>
      {(title != null || onClose) && (
        <div className="uix-dialog__header">
          {title && <div className="uix-dialog__title">{title}</div>}
          {onClose && (
            <button className="uix-dialog__close" onClick={onClose} aria-label="Close dialog">
              <CloseIcon />
            </button>
          )}
        </div>
      )}
      {children != null && <div className="uix-dialog__body">{children}</div>}
      {footer != null && <div className="uix-dialog__footer">{footer}</div>}
    </dialog>
  );
}
