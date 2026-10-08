"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { cx } from '../cx.js';

interface SegmentedContextValue {
  value?: string;
  onChange?: (value: string) => void;
  /** Inside a `Segmented`: options are one tab stop, in `selection` mode. */
  selection?: 'toggle' | 'radio';
}

const SegmentedCtx = createContext<SegmentedContextValue>({});

const OPTION = '.uix-segmented__option';

export interface SegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The currently-selected option value. */
  value?: string;
  /** Fires with the option's value when a different option is chosen. */
  onChange?: (value: string) => void;
  /**
   * How the choice is exposed to assistive technology (HAR-1604).
   * `'toggle'` (default): `role="group"` of buttons with `aria-pressed`, for a view or filter
   * toggle bar. `'radio'`: `role="radiogroup"` of `role="radio"` with `aria-checked`, for a
   * setting with exactly one value (theme, density, language). Name the group with
   * `aria-label` or `aria-labelledby` in either mode. The keyboard model is the same in both.
   */
  selection?: 'toggle' | 'radio';
  children?: ReactNode;
}

/**
 * Segmented single-select over `.uix-segmented` — the compact 2–3 way toggle
 * (density, audience, view mode …) that reads as one pill with a lifted active
 * segment. Selection state is shared with `<SegmentedOption>` via context, so
 * the caller only wires `value` + `onChange` once.
 *
 * Keyboard (HAR-1604): the group is ONE tab stop, on the selected option (the first enabled
 * one when nothing is selected). Arrow Right/Down and Left/Up move to the next / previous
 * enabled option and select it, wrapping at the ends; Home and End jump; Left/Right swap in
 * a right-to-left group. Before 2.32.0 every option was its own tab stop.
 */
export function Segmented({ value, onChange, selection = 'toggle', children, className, onKeyDown, ...props }: SegmentedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const contextValue = useMemo(() => ({ value, onChange, selection }), [value, onChange, selection]);

  // Roving tabindex, enforced on the DOM after every render like Tabs: exactly one tab stop —
  // the selected enabled option, else the first enabled one (with no selection every option
  // renders tabIndex -1, which would make the group unreachable).
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    const all = Array.from(group.querySelectorAll<HTMLButtonElement>(OPTION));
    const enabled = all.filter((o) => !o.disabled);
    const current = enabled.find((o) => o.getAttribute('aria-pressed') === 'true' || o.getAttribute('aria-checked') === 'true') ?? enabled[0];
    for (const o of all) o.tabIndex = o === current ? 0 : -1;
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const group = ref.current;
    const from = (event.target as HTMLElement).closest<HTMLButtonElement>(OPTION);
    if (!group || !from || !group.contains(from)) return;
    const options = Array.from(group.querySelectorAll<HTMLButtonElement>(`${OPTION}:not(:disabled)`));
    const index = options.indexOf(from);
    if (index < 0) return;
    const rtl = getComputedStyle(group).direction === 'rtl';
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = index + 1; break;
      case 'ArrowUp': next = index - 1; break;
      case 'ArrowRight': next = index + (rtl ? -1 : 1); break;
      case 'ArrowLeft': next = index + (rtl ? 1 : -1); break;
      case 'Home': next = 0; break;
      case 'End': next = options.length - 1; break;
      default: return;
    }
    event.preventDefault();
    // Ours: a surrounding toolbar or menu must not also move on the same key.
    event.stopPropagation();
    const target = options[(next + options.length) % options.length];
    if (!target || target === from) return;
    target.focus();
    target.click();
  };

  return (
    <SegmentedCtx.Provider value={contextValue}>
      <div ref={ref} role={selection === 'radio' ? 'radiogroup' : 'group'} className={cx('uix-segmented', className)} onKeyDown={handleKeyDown} {...props}>
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
 * `value`; the selected segment lifts to the surface via
 * `.uix-segmented__option[aria-pressed="true"]` (or `[aria-checked="true"]` in a
 * `selection="radio"` group).
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
  const radio = ctx.selection === 'radio';
  return (
    <button
      type="button"
      role={radio ? 'radio' : undefined}
      className={cx('uix-segmented__option', className)}
      aria-pressed={radio ? undefined : selected}
      aria-checked={radio ? selected : undefined}
      // One tab stop per group; `Segmented` moves it to the first option when none is selected.
      tabIndex={ctx.selection ? (selected ? 0 : -1) : undefined}
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
