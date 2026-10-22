"use client";

import { createElement, forwardRef, useImperativeHandle } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useChangeHighlight } from '../hooks/useChangeHighlight.js';

export interface ChangeHighlightProps extends HTMLAttributes<HTMLElement> {
  /** The value shown inside. When it changes after mount the element flashes; never on the first render. */
  value: unknown;
  /** The element to render (default `span`): `td`, `tr`, `div`, `li`… A `tr` tints its cells. */
  as?: keyof HTMLElementTagNameMap;
  /**
   * `tint` (default) fades a background tint, for a row, a cell or a field; `ring` fades an
   * outline instead, for something with a colour of its own, such as a status pill.
   */
  variant?: 'tint' | 'ring';
  /** Said politely when the value changes, e.g. "Status changed to Resolved by A. Novak". */
  announce?: string;
  /** No highlight, e.g. while the person is editing this value themselves. */
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * Shows that a value changed in place (HAR-2585, motion standard §2.5): a live update, the
 * result of a transition, a rolled-back optimistic change. The element is tinted at once and
 * the tint fades; under reduced motion or forced colours it is outlined for the same time
 * instead. The flash is the signal and its place the location; pass `announce` for the
 * description. For an element you render yourself, use `useChangeHighlight`; on plain markup,
 * add `.uix-changed` (remove it, force a reflow and add it again to replay).
 */
export const ChangeHighlight = forwardRef<HTMLElement | null, ChangeHighlightProps>(function ChangeHighlight(
  { value, as = 'span', variant = 'tint', announce, disabled, className, children, ...props },
  forwarded,
) {
  const ref = useChangeHighlight<HTMLElement>(value, { announce, disabled });
  useImperativeHandle(forwarded, () => ref.current as HTMLElement, [ref]);
  return createElement(as, {
    ...props,
    ref,
    className: cx('uix-change-highlight', variant === 'ring' && 'uix-change-highlight--ring', className),
  }, children);
});
ChangeHighlight.displayName = 'ChangeHighlight';
