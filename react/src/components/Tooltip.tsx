import type { ReactNode, HTMLAttributes } from 'react';

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Tooltip text. Rendered via the CSS `[data-uix-tip]` hover/focus tooltip. */
  label: string;
  children?: ReactNode;
}

/**
 * Thin wrapper over the CSS-only tooltip (`[data-uix-tip]`). Wraps its children
 * in a span carrying the attribute; the bubble is drawn entirely in CSS on
 * hover/focus. For keyboard reveal, ensure a focusable child or pass `tabIndex`.
 */
export function Tooltip({ label, children, ...props }: TooltipProps) {
  return (
    <span data-uix-tip={label} {...props}>
      {children}
    </span>
  );
}
