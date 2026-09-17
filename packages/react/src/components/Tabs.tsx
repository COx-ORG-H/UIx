"use client";

import { Children, createContext, isValidElement, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  /**
   * What happens when the tabs don't fit. `'wrap'` (default) keeps today's layout.
   * `'scroll'` keeps one row that scrolls sideways, with pointer-only edge buttons
   * shown on the side that has hidden tabs. The selected tab is always scrolled into view.
   */
  overflow?: 'wrap' | 'scroll';
}

const Chevron = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Scroll offset from the inline start, positive in both writing directions. */
const inlineOffset = (el: HTMLElement, rtl: boolean) => (rtl ? -el.scrollLeft : el.scrollLeft);

export function Tabs({ variant = 'line', value, onChange, children, className, overflow = 'wrap' }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const contextValue = useMemo(() => ({ value, onChange, baseId }), [value, onChange, baseId]);
  const scroll = overflow === 'scroll';
  const [hidden, setHidden] = useState({ start: false, end: false });

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

  // overflow="scroll": track which edges hide tabs. Tabs can change width without the list
  // resizing (a label loads, a font swaps), so each tab is observed as well.
  useEffect(() => {
    const list = listRef.current;
    if (!scroll || !list) return;
    const measure = () => {
      const rtl = getComputedStyle(list).direction === 'rtl';
      const pos = inlineOffset(list, rtl);
      const max = list.scrollWidth - list.clientWidth;
      const next = { start: pos > 1, end: pos < max - 1 };
      setHidden((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    };
    measure();
    list.addEventListener('scroll', measure, { passive: true });
    if (typeof ResizeObserver === 'undefined') return () => list.removeEventListener('scroll', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const tab of Array.from(list.children)) observer.observe(tab);
    return () => {
      list.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  });

  // Keep the selected tab visible. Only the list scrolls: scrollIntoView would also move
  // the page to a tab row that sits below the fold.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!scroll || !list || !tab) return;
    const outer = list.getBoundingClientRect();
    const inner = tab.getBoundingClientRect();
    // leave room for the edge button that overlays an overflowing side
    const reserve = list.scrollWidth > list.clientWidth
      ? Number.parseFloat(getComputedStyle(list).getPropertyValue('--uix-control-h')) || 0
      : 0;
    if (inner.left < outer.left + reserve) list.scrollBy({ left: inner.left - outer.left - reserve });
    else if (inner.right > outer.right - reserve) list.scrollBy({ left: inner.right - outer.right + reserve });
  }, [scroll, value]);

  const page = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const rtl = getComputedStyle(list).direction === 'rtl';
    list.scrollBy({ left: direction * (rtl ? -1 : 1) * list.clientWidth * 0.8 });
  };

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

  const list = (
    <div
      ref={listRef}
      role="tablist"
      className={cx('uix-tabs', `uix-tabs--${variant}`, scroll && 'uix-tabs--scroll', className)}
      onKeyDown={onKeyDown}
    >
      {tabs}
    </div>
  );

  return (
    <TabsCtx.Provider value={contextValue}>
      {scroll ? (
        <div className="uix-tabs-scroller">
          {/* Pointer-only: keyboard users already move with Arrow/Home/End, and mousedown is
              cancelled so a click never parks focus on a hidden control. */}
          <button
            type="button"
            className="uix-tabs-scroller__prev"
            aria-hidden="true"
            tabIndex={-1}
            hidden={!hidden.start}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => page(-1)}
          >
            <Chevron d="m15 18-6-6 6-6" />
          </button>
          {list}
          <button
            type="button"
            className="uix-tabs-scroller__next"
            aria-hidden="true"
            tabIndex={-1}
            hidden={!hidden.end}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => page(1)}
          >
            <Chevron d="m9 18 6-6-6-6" />
          </button>
        </div>
      ) : list}
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
