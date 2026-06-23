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

export type NoteTone = 'info' | 'success' | 'warning' | 'danger';

export interface NoteProps extends HTMLAttributes<HTMLDivElement> {
  tone?: NoteTone;
  icon?: ReactNode;
  children?: ReactNode;
}

/** Callout / note box over `.uix-note`. */
export function Note({ tone, icon, children, className, ...props }: NoteProps) {
  return (
    <div className={cx('uix-note', tone && `uix-note--${tone}`, className)} {...props}>
      {icon != null && <div className="uix-note__icon">{icon}</div>}
      <div className="uix-note__body">{children}</div>
    </div>
  );
}
