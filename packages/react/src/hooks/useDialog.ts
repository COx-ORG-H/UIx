"use client";

import { useRef, useEffect } from 'react';

/* Body-scroll lock shared across all open dialogs. While any Modal/Drawer/Peek is open
 * the page behind must not scroll or scroll-chain; the scrollbar width is compensated
 * with padding so opening/closing causes no layout shift. A counter keeps the lock
 * correct when more than one dialog is open at once (lock on 0→1, restore on 1→0). */
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount++ > 0) return; // already locked by another dialog
  const body = document.body;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  body.style.overflow = 'hidden';
  if (scrollbar > 0) {
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbar}px`; // reserve the scrollbar's space
  }
}

function unlockBodyScroll(): void {
  if (typeof document === 'undefined' || lockCount === 0) return;
  if (--lockCount > 0) return; // another dialog is still open
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

export function useDialog(open: boolean): React.RefObject<HTMLDialogElement> {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
      lockBodyScroll();
      return () => {
        if (el.open) el.close();
        unlockBodyScroll();
      };
    }
    if (el.open) el.close();
    return () => {
      if (el.open) el.close();
    };
  }, [open]);

  return ref;
}
