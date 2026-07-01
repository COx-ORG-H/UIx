"use client";

import { createContext, useContext } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

interface SegmentedContextValue {
  value?: string;
  onChange?: (value: string) => void;
}

const SegmentedCtx = createContext<SegmentedContextValue>({});

export interface SegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The currently-selected option value. */
  value?: string;
  /** Fires with the option's value when a different option is chosen. */
  onChange?: (value: string) => void;
  children?: ReactNode;
}

/**
 * Segmented single-select over `.uix-segmented` — the compact 2–3 way toggle
 * (density, audience, view mode …) that reads as one pill with a lifted active
 * segment. Selection state is shared with `<SegmentedOption>` via context, so
 * the caller only wires `value` + `onChange` once.
 */
export function Segmented({ value, onChange, children, className, ...props }: SegmentedProps) {
  return (
    <SegmentedCtx.Provider value={{ value, onChange }}>
      <div role="group" className={cx('uix-segmented', className)} {...props}>
        {children}
      </div>
    </SegmentedCtx.Provider>
  );
}

export interface SegmentedOptionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
  value: string;
  children?: ReactNode;
}

/**
 * One option in a `<Segmented>`. Active state is derived from the parent's
 * `value`; the pressed segment lifts to the surface via
 * `.uix-segmented__option[aria-pressed="true"]`.
 */
export function SegmentedOption({
  value,
  children,
  className,
  onClick,
  ...props
}: SegmentedOptionProps) {
  const ctx = useContext(SegmentedCtx);
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      className={cx('uix-segmented__option', className)}
      aria-pressed={selected}
      onClick={(e) => {
        ctx.onChange?.(value);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
