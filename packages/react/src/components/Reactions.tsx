import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface ReactionsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Emoji-reaction bar over `.uix-reactions`. Contains `Reaction` pills. */
export function Reactions({ className, children, ...props }: ReactionsProps) {
  return (
    <div className={cx('uix-reactions', className)} {...props}>
      {children}
    </div>
  );
}

export interface ReactionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The emoji (or any leading glyph). */
  emoji?: ReactNode;
  /** The tally shown in `.uix-reaction__count`. */
  count?: ReactNode;
  /** Highlight as the current user's reaction (`data-mine`). */
  mine?: boolean;
  children?: ReactNode;
}

/** One reaction pill over `.uix-reaction` (a real `<button>` — toggling is consumer state). */
export function Reaction({ emoji, count, mine, className, children, type, ...props }: ReactionProps) {
  return (
    <button type={type ?? 'button'} className={cx('uix-reaction', className)} data-mine={mine || undefined} {...props}>
      {emoji != null && <span aria-hidden="true">{emoji}</span>}
      {count != null && <span className="uix-reaction__count">{count}</span>}
      {children}
    </button>
  );
}
