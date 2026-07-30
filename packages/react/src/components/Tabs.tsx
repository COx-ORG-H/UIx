"use client";

import { Children, createContext, isValidElement, useContext, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

interface TabsContextValue {
  value?: string;
  onChange?: (value: string) => void;
  /** id base shared by Tab/TabPanel so tab↔panel wiring needs no consumer ids (UIX-A11Y-2). */
  baseId?: string;
}

const TabsCtx = createContext<TabsContextValue>({});

export interface TabsProps {
  variant?: 'line' | 'enclosed' | 'pill';
  value?: string;
  onChange?: (value: string) => void;
  children?: ReactNode;
  className?: string;
}

export function Tabs({ variant = 'line', value, onChange, children, className }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  // A tabpanel must not live inside the tablist — hoist TabPanel children out so consumers
  // can co-locate panels with their tabs (UIX-A11Y-2). Wrapped panels (custom components)
  // should be placed after </Tabs> instead.
  const kids = Children.toArray(children);
  const panels = kids.filter((k) => isValidElement(k) && k.type === TabPanel);
  const tabs = kids.filter((k) => !(isValidElement(k) && k.type === TabPanel));

  // Roving tabindex: enforce exactly one tab stop after every render — the selected enabled
  // tab, else the first enabled tab (with no selection every Tab renders tabIndex -1, which
  // would make the tablist unreachable). DOM-enforced so a promoted fallback can't linger
  // as a second tab stop once a real selection appears (UIX-A11Y-2).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const all = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));
    const enabled = all.filter((t) => !t.matches(':disabled'));
    const active = enabled.find((t) => t.getAttribute('aria-selected') === 'true') ?? enabled[0];
    for (const t of all) t.tabIndex = t === active ? 0 : -1;
  });

  // APG automatic activation: Arrow/Home/End move focus and select the newly-focused tab
  // (via the tab's own click handler); disabled tabs are skipped by the selector.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [],
    );
    const cur = (e.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
    const idx = cur ? items.indexOf(cur) : -1;
    if (idx < 0 || items.length === 0) return;
    let next: number;
    switch (e.key) {
      case 'ArrowRight': next = (idx + 1) % items.length; break;
      case 'ArrowLeft': next = (idx - 1 + items.length) % items.length; break;
      case 'Home': next = 0; break;
      case 'End': next = items.length - 1; break;
      default: return;
    }
    e.preventDefault();
    const target = items[next];
    if (target) { target.focus(); target.click(); }
  };

  return (
    <TabsCtx.Provider value={{ value, onChange, baseId }}>
      <div
        ref={listRef}
        role="tablist"
        className={cx('uix-tabs', `uix-tabs--${variant}`, className)}
        onKeyDown={onKeyDown}
      >
        {tabs}
      </div>
      {panels}
    </TabsCtx.Provider>
  );
}

export interface TabProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  value: string;
  children?: ReactNode;
  disabled?: boolean;
}

export function Tab({ value, children, disabled, className, onClick, ...props }: TabProps) {
  const ctx = useContext(TabsCtx);
  const selected = ctx.value === value;
  return (
    <button
      role="tab"
      id={ctx.baseId ? `${ctx.baseId}-tab-${value}` : undefined}
      aria-controls={ctx.baseId ? `${ctx.baseId}-panel-${value}` : undefined}
      className={cx('uix-tab', className)}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
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

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** The owning `<Tab>`'s value — the panel renders only while that tab is selected. */
  value: string;
  children?: ReactNode;
}

/**
 * The tabpanel paired with a `<Tab>` by `value` (UIX-A11Y-2): labelled by its tab,
 * `tabIndex 0` so Tab from the tablist lands in the content, rendered only while
 * selected. Place it as a direct child of `<Tabs>` — it is hoisted out of the tablist —
 * or anywhere the Tabs context reaches.
 */
export function TabPanel({ value, children, ...props }: TabPanelProps) {
  const ctx = useContext(TabsCtx);
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={ctx.baseId ? `${ctx.baseId}-panel-${value}` : undefined}
      aria-labelledby={ctx.baseId ? `${ctx.baseId}-tab-${value}` : undefined}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}
