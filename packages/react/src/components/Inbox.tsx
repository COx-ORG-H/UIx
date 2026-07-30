"use client";
import { createContext, useContext, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';

export interface InboxProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Which pane a narrow viewport (<700px) shows: 'list' (default, matches the old
   * behaviour) or 'detail'. Consumers should render a Back control in the detail pane
   * on narrow viewports to return to the list (UIX-A11Y-2).
   */
  view?: 'list' | 'detail';
  children?: ReactNode;
}

/** Two-pane inbox master-detail container backed by `.uix-inbox`. Place `<InboxList>` and `<InboxDetail>` as children. */
export function Inbox({ view, children, className, ...props }: InboxProps) {
  return (
    <div className={cx('uix-inbox', className)} data-view={view} {...props}>
      {children}
    </div>
  );
}

// Shares the active-descendant id with the items so they can style/data-flag themselves.
const InboxListCtx = createContext<{ activeId?: string }>({});

export interface InboxListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * Left-pane item list. Place `<InboxItem>` children here. A keyboard listbox
 * (UIX-A11Y-2): the list is the single tab stop; ArrowUp/ArrowDown/Home/End move the
 * active option via `aria-activedescendant`, Enter/Space click it.
 */
export function InboxList({ children, className, ...props }: InboxListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const ctx = useMemo(() => ({ activeId }), [activeId]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const opts = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    if (opts.length === 0) return;
    const idx = opts.findIndex((el) => el.id === activeId);
    let next: number;
    switch (e.key) {
      case 'ArrowDown': next = Math.min(idx + 1, opts.length - 1); break;
      case 'ArrowUp': next = idx < 0 ? 0 : Math.max(idx - 1, 0); break;
      case 'Home': next = 0; break;
      case 'End': next = opts.length - 1; break;
      case 'Enter':
      case ' ':
        if (idx >= 0) { e.preventDefault(); opts[idx]?.click(); }
        return;
      default: return;
    }
    e.preventDefault();
    const el = opts[next];
    if (!el || !el.id) return;
    setActiveId(el.id);
    el.scrollIntoView({ block: 'nearest' });
  };

  return (
    <InboxListCtx.Provider value={ctx}>
      <div
        ref={listRef}
        className={cx('uix-inbox__list', className)}
        role="listbox"
        tabIndex={0}
        aria-label="Inbox"
        aria-activedescendant={activeId}
        onKeyDown={onKeyDown}
        {...props}
      >
        {children}
      </div>
    </InboxListCtx.Provider>
  );
}

export interface InboxItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Primary subject / title line. */
  subject?: ReactNode;
  /** Secondary preview excerpt (truncated). */
  preview?: ReactNode;
  /** Leading slot — avatar, icon, or priority indicator. */
  leading?: ReactNode;
  /** When true sets `data-unread` → bolds the subject line. */
  unread?: boolean;
  /** When true sets `aria-selected` → renders the accent left-border stripe. */
  selected?: boolean;
  children?: ReactNode;
}

/** A single inbox row with subject, preview excerpt, optional leading slot, and unread/selected states. */
export function InboxItem({
  subject,
  preview,
  leading,
  unread,
  selected,
  children,
  className,
  id,
  ...props
}: InboxItemProps) {
  // Generated id so the list can point aria-activedescendant at this row (UIX-A11Y-2).
  const autoId = useId();
  const itemId = id ?? autoId;
  const { activeId } = useContext(InboxListCtx);
  return (
    <div
      role="option"
      id={itemId}
      aria-selected={selected ?? false}
      data-active={activeId === itemId ? '' : undefined}
      className={cx('uix-inbox__item', className)}
      {...(unread ? { 'data-unread': '' } : {})}
      {...props}
    >
      {leading}
      {subject != null && <div className="uix-inbox__subject">{subject}</div>}
      {preview != null && <div className="uix-inbox__preview">{preview}</div>}
      {children}
    </div>
  );
}

export interface InboxDetailProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Right-pane detail area — renders the full content of the selected item. */
export function InboxDetail({ children, className, ...props }: InboxDetailProps) {
  return (
    <div className={cx('uix-inbox__detail', className)} {...props}>
      {children}
    </div>
  );
}
