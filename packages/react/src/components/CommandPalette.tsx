"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, InputHTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';

/* Combobox wiring shared across the palette family (UIX-A11Y-1): the root owns the listbox id
 * and the active option id (input → aria-activedescendant), and counts mounted items so a status
 * region can announce result counts as the consumer filters. Null outside a <CommandPalette>. */
interface CmdkContextValue {
  listId: string;
  /** An active item claims aria-activedescendant; pass active=false to release it. */
  setActive: (id: string, active: boolean) => void;
  /** Register a mounted item for the results count; returns the unregister cleanup. */
  registerItem: () => () => void;
}
const CmdkContext = createContext<CmdkContextValue | null>(null);

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export interface CommandPaletteProps extends HTMLAttributes<HTMLDivElement> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  inputLabel?: string;
  /**
   * The polite result count for this palette (HAR-1647). Default: `UixLabelsProvider`
   * `commandPalette.resultsOne` / `resultsMany` (`{count}`), then "1 result" / "3 results".
   */
  resultsLabel?: (count: number) => string;
  /** Props for the search input (value/onChange/placeholder wired by the consumer). */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  children?: ReactNode;
}

/**
 * ⌘K command palette surface over `.uix-cmdk`. Presentational: mount it inside a
 * Modal/Popover and wire search + keyboard selection in the consumer. The input is
 * a combobox over the listbox of `CommandItem`s; spreads override every default, so
 * consumers already passing their own roles/labels keep working.
 *
 * ⌘K is keyboard-initiated and used many times a day, so the palette marks the dialog or
 * popover it sits in `[data-uix-instant]`: it opens and closes with no animation, without the
 * consumer knowing the attribute (or the older `data-uix-cmdk-dialog`).
 */
export function CommandPalette({ inputProps, children, inputLabel: inputLabelProp, resultsLabel, className, ...props }: CommandPaletteProps) {
  const uixLabels = useUixLabels();
  const inputLabel = inputLabelProp ?? uixLabels.commandPalette?.input ?? 'Command palette';
  const resultsOne = uixLabels.commandPalette?.resultsOne ?? '{count} result';
  const resultsMany = uixLabels.commandPalette?.resultsMany ?? '{count} results';
  const resultsText = (count: number) => resultsLabel?.(count) ?? fillLabel(count === 1 ? resultsOne : resultsMany, { count });
  // The latest formatter, so a new function identity on every render does not re-announce.
  const resultsTextRef = useRef(resultsText);
  resultsTextRef.current = resultsText;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  // Before the overlay's own open effect runs (a child's layout effect runs first), so the first
  // open is already instant. Leaves an attribute the consumer set (Modal `instant`) alone.
  useIsomorphicLayoutEffect(() => {
    const overlay = rootRef.current?.closest<HTMLElement>('dialog, [popover]');
    if (!overlay || overlay.hasAttribute('data-uix-instant')) return;
    overlay.setAttribute('data-uix-instant', '');
    return () => overlay.removeAttribute('data-uix-instant');
  }, []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [announced, setAnnounced] = useState('');

  const setActive = useCallback((id: string, active: boolean) => {
    setActiveId((cur) => (active ? id : cur === id ? null : cur));
  }, []);
  const registerItem = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);

  // debounced so a keystroke's worth of item mounts/unmounts announces once
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(resultsTextRef.current(count)), 150);
    return () => clearTimeout(t);
  }, [count]);

  const ctx = useMemo(() => ({ listId, setActive, registerItem }), [listId, setActive, registerItem]);

  return (
    <CmdkContext.Provider value={ctx}>
      <div ref={rootRef} className={cx('uix-cmdk', className)} {...props}>
        <input
          className="uix-cmdk__input"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeId ?? undefined}
          aria-label={inputLabel}
          {...inputProps}
        />
        <div className="uix-cmdk__list" role="listbox" id={listId}>{children}</div>
        <span className="uix-visually-hidden" role="status">{announced}</span>
      </div>
    </CmdkContext.Provider>
  );
}

export interface CommandGroupProps {
  label?: ReactNode;
  children?: ReactNode;
}

/** A labeled group of command items. */
export function CommandGroup({ label, children }: CommandGroupProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={label != null ? labelId : undefined}>
      {label != null && <div className="uix-cmdk__group" id={labelId}>{label}</div>}
      {children}
    </div>
  );
}

export interface CommandItemProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  /** Trailing shortcut hint (e.g. a `.uix-kbd`). */
  shortcut?: ReactNode;
  active?: boolean;
  children?: ReactNode;
}

/** A single command row over `.uix-cmdk__item`. */
export function CommandItem({ icon, shortcut, active, children, className, id, ...props }: CommandItemProps) {
  const ctx = useContext(CmdkContext);
  const autoId = useId();
  const itemId = id ?? autoId;

  useEffect(() => ctx?.registerItem(), [ctx]);
  useEffect(() => {
    if (!ctx || !active) return;
    ctx.setActive(itemId, true);
    return () => ctx.setActive(itemId, false);
  }, [ctx, itemId, active]);

  return (
    <div
      className={cx('uix-cmdk__item', className)}
      data-active={active || undefined}
      id={itemId}
      role="option"
      aria-selected={!!active}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {shortcut}
    </div>
  );
}
