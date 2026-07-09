"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Tooltip text. */
  label: string;
  /** Preferred placement. Default `'top'`. */
  placement?: Placement;
  children?: ReactNode;
}

/**
 * Tooltip whose bubble renders in the top layer via the native Popover API, so it
 * escapes any `overflow: hidden/scroll` ancestor that would clip the old CSS-only
 * `[data-uix-tip]` tooltip (UIX-FIX-02). Positioned by the shared overlay engine
 * (flip/shift), shown on hover and keyboard focus, dismissed on blur or Escape.
 */
export function Tooltip({ label, placement = 'top', className, children, ...props }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  useAnchoredPosition(triggerRef, bubbleRef, { open, placement, offset: 6 });

  const show = () => {
    const b = bubbleRef.current;
    if (b && !b.matches(':popover-open')) { try { b.showPopover(); } catch { /* already open */ } }
    setOpen(true);
  };
  const hide = () => {
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) { try { b.hidePopover(); } catch { /* already closed */ } }
    setOpen(false);
  };

  // hide the top-layer bubble if the trigger unmounts while shown
  useEffect(() => () => {
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) { try { b.hidePopover(); } catch { /* noop */ } }
  }, []);

  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const bubbleAttr = { popover: 'manual' } as Record<string, string>;

  return (
    <span
      ref={triggerRef}
      className={cx('uix-tooltip', className)}
      aria-describedby={id}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}
      {...props}
    >
      {children}
      <span ref={bubbleRef} id={id} role="tooltip" className="uix-tooltip__bubble" {...bubbleAttr}>
        {label}
      </span>
    </span>
  );
}
