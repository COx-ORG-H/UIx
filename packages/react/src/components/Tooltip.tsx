"use client";

import { useId, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useOverlayPosition } from '../hooks/useOverlayPosition.js';
import type { Side } from '../overlay-position.js';

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Tooltip text. */
  label: string;
  /** Side of the trigger to place the tip on (default 'top'); flips if it doesn't fit. */
  side?: Side;
  children?: ReactNode;
}

/**
 * Text tooltip that renders in the top layer (native Popover API) and is positioned
 * with the cross-browser `useOverlayPosition` collision math — so it stays attached
 * to its trigger and is never clipped by an `overflow: hidden/scroll` ancestor
 * (the previous CSS-`::after` tooltip was). Reveals on hover and keyboard focus;
 * wired to the trigger via `aria-describedby`. Ensure a focusable child (or pass
 * `tabIndex`) for keyboard reveal.
 */
export function Tooltip({ label, side = 'top', children, className, ...props }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useOverlayPosition(triggerRef, tipRef, { side, align: 'center', enabled: open, gap: 6 });

  const show = () => { setOpen(true); tipRef.current?.showPopover?.(); };
  const hide = () => { setOpen(false); tipRef.current?.hidePopover?.(); };

  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover: 'manual' } as Record<string, string>;

  return (
    <span
      ref={triggerRef}
      className={cx('uix-tip-anchor', className)}
      aria-describedby={open ? id : undefined}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      {...props}
    >
      {children}
      <div ref={tipRef} id={id} role="tooltip" className="uix-tooltip" {...popoverAttr}>
        {label}
      </div>
    </span>
  );
}
