import type { ReactNode, HTMLAttributes, InputHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface CommandPaletteProps extends HTMLAttributes<HTMLDivElement> {
  /** Props for the search input (value/onChange/placeholder wired by the consumer). */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  children?: ReactNode;
}

/**
 * ⌘K command palette surface over `.uix-cmdk`. Presentational: mount it inside a
 * Modal/Popover and wire search + keyboard selection in the consumer.
 */
export function CommandPalette({ inputProps, children, className, ...props }: CommandPaletteProps) {
  return (
    <div className={cx('uix-cmdk', className)} {...props}>
      <input className="uix-cmdk__input" {...inputProps} />
      <div className="uix-cmdk__list">{children}</div>
    </div>
  );
}

export interface CommandGroupProps {
  label?: ReactNode;
  children?: ReactNode;
}

/** A labeled group of command items. */
export function CommandGroup({ label, children }: CommandGroupProps) {
  return (
    <>
      {label != null && <div className="uix-cmdk__group">{label}</div>}
      {children}
    </>
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
export function CommandItem({ icon, shortcut, active, children, className, ...props }: CommandItemProps) {
  return (
    <div className={cx('uix-cmdk__item', className)} data-active={active || undefined} {...props}>
      {icon}
      <span>{children}</span>
      {shortcut}
    </div>
  );
}
