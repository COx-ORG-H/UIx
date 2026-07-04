"use client";

import type { ReactNode, CSSProperties } from 'react';
import { cx } from '../cx.js';
import { useDialog } from '../hooks/useDialog.js';

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export interface LightboxProps {
  /** Whether the lightbox is shown. Stateless — the consumer owns this. */
  open: boolean;
  onClose?: () => void;
  /** Image to display; or pass arbitrary `children` instead. */
  src?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Image lightbox over `.uix-lightbox` (a native `<dialog>`). Stateless: it mirrors `open` into
 *  the dialog via `useDialog` but owns no open/close state itself. */
export function Lightbox({ open, onClose, src, alt = '', className, style, children }: LightboxProps) {
  const ref = useDialog(open);
  return (
    <dialog ref={ref} className={cx('uix-lightbox', className)} style={style} onClose={onClose}>
      {src != null ? <img src={src} alt={alt} /> : children}
      {onClose && (
        <button
          type="button"
          className="uix-peek__close"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon />
        </button>
      )}
    </dialog>
  );
}
