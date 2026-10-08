import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface ProseProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * Long-form content container over `.uix-prose` (KB articles, descriptions,
 * release notes). Apply to a block of rendered HTML/markdown.
 */
export function Prose({ children, className, ...props }: ProseProps) {
  return (
    <div className={cx('uix-prose', className)} {...props}>
      {children}
    </div>
  );
}

export type NoteTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface NoteProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `'neutral'` and `undefined` are both the default look. `undefined` is spelled out in the type
   * so `tone={maybeTone}` also compiles under `exactOptionalPropertyTypes` (HAR-1614).
   */
  tone?: NoteTone | undefined;
  icon?: ReactNode;
  children?: ReactNode;
}

/** Callout / note box over `.uix-note`. */
export function Note({ tone, icon, children, className, ...props }: NoteProps) {
  return (
    <div className={cx('uix-note', tone && tone !== 'neutral' && `uix-note--${tone}`, className)} {...props}>
      {icon != null && <div className="uix-note__icon">{icon}</div>}
      <div className="uix-note__body">{children}</div>
    </div>
  );
}
