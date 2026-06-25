"use client";
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface InboxProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Two-pane inbox master-detail container backed by `.uix-inbox`. Place `<InboxList>` and `<InboxDetail>` as children. */
export function Inbox({ children, className, ...props }: InboxProps) {
  return (
    <div className={cx('uix-inbox', className)} {...props}>
      {children}
    </div>
  );
}

export interface InboxListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Left-pane item list. Place `<InboxItem>` children here. */
export function InboxList({ children, className, ...props }: InboxListProps) {
  return (
    <div className={cx('uix-inbox__list', className)} role="listbox" {...props}>
      {children}
    </div>
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
  ...props
}: InboxItemProps) {
  return (
    <div
      role="option"
      aria-selected={selected ?? false}
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
