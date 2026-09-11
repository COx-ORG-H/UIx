"use client";

import { useRef, useEffect } from 'react';

/* Page scroll lock, shared across every open dialog (Modal / Drawer / Peek). A native
 * <dialog> shown with showModal() makes the background inert but still lets it SCROLL
 * behind the overlay (UIX-FIX-03). We lock the scrolling root — `document.scrollingElement`,
 * which is <html> in standards mode, so `body { overflow: hidden }` alone would not stop it —
 * compensating for the vanishing scrollbar so the page doesn't shift, and containing overscroll
 * so it doesn't chain to the page. Reference-counted so stacked dialogs unlock only when the
 * last one closes. */
let lockCount = 0;
let saved: { el: HTMLElement; overflow: string; paddingRight: string; overscroll: string } | null = null;

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (++lockCount > 1) return; // already locked by another dialog
  const el = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
  saved = {
    el,
    overflow: el.style.overflow,
    paddingRight: el.style.paddingRight,
    overscroll: el.style.overscrollBehavior,
  };
  el.style.overflow = 'hidden';
  if (scrollbarW > 0) {
    const current = parseFloat(getComputedStyle(el).paddingRight) || 0;
    el.style.paddingRight = `${current + scrollbarW}px`; // keep layout from shifting under the removed scrollbar
  }
  el.style.overscrollBehavior = 'contain';
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || lockCount === 0) return;
  if (--lockCount > 0) return; // another dialog is still open
  if (saved) {
    saved.el.style.overflow = saved.overflow;
    saved.el.style.paddingRight = saved.paddingRight;
    saved.el.style.overscrollBehavior = saved.overscroll;
    saved = null;
  }
}

export function useDialog(open: boolean, onClose?: () => void): React.RefObject<HTMLDialogElement> {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el || !open) {
      if (el && el.open) el.close();
      return;
    }
    if (!el.open) el.showModal();
    lockBodyScroll();
    /* A native close (Esc → cancel → close, or a method="dialog" form) bypasses React state, so
     * without this listener the scroll lock leaked whenever the consumer forgot onClose
     * (UIX-A11Y-1). `locked` scopes this hook's share of the refcount so the lock is released
     * exactly once — here on a native close, or in the cleanup below (which removes the listener
     * BEFORE calling el.close(), so a hook-initiated close never double-unlocks). */
    let locked = true;
    const handleClose = () => {
      if (locked) { locked = false; unlockBodyScroll(); }
      onCloseRef.current?.();
    };
    el.addEventListener('close', handleClose);
    return () => {
      el.removeEventListener('close', handleClose);
      if (locked) { locked = false; unlockBodyScroll(); }
      if (el.open) el.close();
    };
  }, [open]);

  return ref;
}
