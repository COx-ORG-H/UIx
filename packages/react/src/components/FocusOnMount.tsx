"use client";

import { createElement, useEffect, useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

/**
 * A heading (or any element) that takes focus once, when it mounts — so a page that replaces
 * a form with its outcome (SuccessState) reads the outcome first. `tabIndex={-1}`: focusable
 * by script, not a tab stop. The client half of server-renderable states.
 */
export function FocusOnMount({ as, enabled = true, children, ...props }: { as: keyof HTMLElementTagNameMap; enabled?: boolean; children?: ReactNode } & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (enabled) ref.current?.focus({ preventScroll: false });
  }, [enabled]);
  return createElement(as, { ...props, ref, tabIndex: -1 }, children);
}
