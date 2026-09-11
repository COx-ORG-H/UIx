import { Children, cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode, TextareaHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface ComposerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Accessible name for the child `<textarea>`; applied as its `aria-label`. */
  label?: string;
}

/**
 * Composer surface over `.uix-composer` — a single box that owns the
 * `:focus-within` accent ring. Drop a borderless `<textarea>` and a
 * `<ComposerBar>` inside; the descendant `textarea` picks up the composer's
 * padding/typography automatically, so the input never reads as a second
 * nested box.
 *
 * A placeholder is not an accessible name, so the composer labels a bare child
 * `<textarea>` with `label` (default "Add a comment"); a textarea that brings its
 * own `aria-label`/`aria-labelledby` — or an `id` (likely tied to an external
 * `<label htmlFor>`) — is left untouched (UIX-A11Y-3).
 */
export function Composer({ children, className, label = 'Add a comment', ...props }: ComposerProps) {
  return (
    <div className={cx('uix-composer', className)} {...props}>
      {Children.map(children, (child) => {
        if (!isValidElement(child) || child.type !== 'textarea') return child;
        const p = child.props as TextareaHTMLAttributes<HTMLTextAreaElement>;
        return p['aria-label'] || p['aria-labelledby'] || p.id
          ? child
          : cloneElement(child as ReactElement<TextareaHTMLAttributes<HTMLTextAreaElement>>, { 'aria-label': label });
      })}
    </div>
  );
}

export interface ComposerBarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Action footer for a `<Composer>` over `.uix-composer__bar` (top-bordered, right-aligned). */
export function ComposerBar({ children, className, ...props }: ComposerBarProps) {
  return (
    <div className={cx('uix-composer__bar', className)} {...props}>
      {children}
    </div>
  );
}
