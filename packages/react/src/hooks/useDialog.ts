"use client";

import { useRef, useEffect, useLayoutEffect } from 'react';
import { markKeyOpened, watchInputModality } from '../motion.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

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

/**
 * `keepOpen` is asked when the browser closed the dialog on its own (Escape or a close request
 * nobody cancelled, a `method="dialog"` form). Returning `true` reopens it instead of calling
 * `onClose`: a form dialog with unsaved input or a save in flight (HAR-2029).
 *
 * The dialog opens and closes in a layout effect (HAR-1831). A dialog its caller unmounts while
 * open (`{open && <ConfirmDialog …/>}`, or a page that navigates away) is closed in the commit,
 * while it is still in the document, so the browser returns focus to the control that opened it;
 * a passive cleanup ran after the element was removed, and focus fell to `<body>`.
 */
export function useDialog(open: boolean, onClose?: () => void, keepOpen?: () => boolean): React.RefObject<HTMLDialogElement> {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const keepOpenRef = useRef(keepOpen);
  keepOpenRef.current = keepOpen;

  useEffect(() => { watchInputModality(); }, []);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    // A dialog opened or closed from the keyboard does it instantly (motion.css [data-uix-key-opened]).
    if (!el || !open) {
      if (el && el.open) { markKeyOpened(el); el.close(); }
      return;
    }
    if (!el.open) { markKeyOpened(el); el.showModal(); }
    lockBodyScroll();
    /* A native close (Esc → cancel → close, or a method="dialog" form) bypasses React state, so
     * without this listener the scroll lock leaked whenever the consumer forgot onClose
     * (UIX-A11Y-1). `locked` scopes this hook's share of the refcount so the lock is released
     * exactly once — here on a native close, or in the cleanup below (which removes the listener
     * BEFORE calling el.close(), so a hook-initiated close never double-unlocks).
     * Browsers QUEUE the `close` event, so the one fired by a cleanup's el.close() can arrive after
     * a re-run of this effect has reopened the dialog and added a new listener — every mount under
     * StrictMode, or `open` going true → false → true within a task. A close event that finds its
     * dialog open again is stale: ignore it, or it would unlock scroll and onClose a dialog that
     * just opened (TENSOR HAR-882). */
    let locked = true;
    const handleClose = () => {
      if (el.open) return;
      // Still meant to be open (a guarded form): show it again, keeping the scroll lock. If it
      // cannot be shown again, it closes after all, lock and onClose included.
      if (keepOpenRef.current?.()) {
        try { el.showModal(); return; } catch { /* disconnected: fall through */ }
      }
      if (locked) { locked = false; unlockBodyScroll(); }
      onCloseRef.current?.();
    };
    // Escape closes natively: the cancel event comes first, while the dialog is still open.
    const handleCancel = () => markKeyOpened(el);
    el.addEventListener('close', handleClose);
    el.addEventListener('cancel', handleCancel);
    return () => {
      el.removeEventListener('close', handleClose);
      el.removeEventListener('cancel', handleCancel);
      if (locked) { locked = false; unlockBodyScroll(); }
      if (el.open) el.close();
    };
  }, [open]);

  return ref;
}
