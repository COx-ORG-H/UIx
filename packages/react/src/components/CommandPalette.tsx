"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode, HTMLAttributes, InputHTMLAttributes } from 'react';
import { cx } from '../cx.js';

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

export interface CommandPaletteProps extends HTMLAttributes<HTMLDivElement> {
  /** Props for the search input (value/onChange/placeholder wired by the consumer). */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  children?: ReactNode;
}

/**
 * ⌘K command palette surface over `.uix-cmdk`. Presentational: mount it inside a
 * Modal/Popover and wire search + keyboard selection in the consumer. The input is
 * a combobox over the listbox of `CommandItem`s; spreads override every default, so
 * consumers already passing their own roles/labels keep working.
 */
export function CommandPalette({ inputProps, children, className, ...props }: CommandPaletteProps) {
  const listId = useId();
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
    const t = window.setTimeout(() => setAnnounced(`${count} result${count === 1 ? '' : 's'}`), 150);
    return () => clearTimeout(t);
  }, [count]);

  const ctx = useMemo(() => ({ listId, setActive, registerItem }), [listId, setActive, registerItem]);

  return (
    <CmdkContext.Provider value={ctx}>
      <div className={cx('uix-cmdk', className)} {...props}>
        <input
          className="uix-cmdk__input"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeId ?? undefined}
          aria-label="Command palette"
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
