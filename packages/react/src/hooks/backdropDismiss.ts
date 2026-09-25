import type { MouseEvent as ReactMouseEvent, MouseEventHandler } from 'react';

/* Light-dismiss for a native modal <dialog> (Peek, Drawer). showModal() closes on Escape and the
 * close button, but NOT on a ::backdrop click. A backdrop click targets the <dialog> element
 * itself with coordinates outside its box; a click on a child (or on the dialog's own padding,
 * inside the box) keeps it open. A zero-size rect — the click that lands while the dialog is
 * mid-close — never counts, so it can't re-trigger onClose (TENSOR HAR-547). */
export function isBackdropClick(e: ReactMouseEvent<HTMLDialogElement>): boolean {
  if (e.target !== e.currentTarget) return false;
  const r = e.currentTarget.getBoundingClientRect();
  if (r.width === 0) return false;
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

/** The dialog's onClick: runs the consumer's own onClick first, then closes on a backdrop click. */
export function backdropDismiss(
  onClose: (() => void) | undefined,
  onClick?: MouseEventHandler<HTMLDialogElement>,
  enabled = true,
): MouseEventHandler<HTMLDialogElement> {
  return (e) => {
    onClick?.(e);
    if (enabled && onClose && isBackdropClick(e)) onClose();
  };
}
