import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface CommentsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * Comment thread container over `.uix-comments`. role="log" is an implicit polite
 * live region: comments appended after initial render are announced, the initial
 * list is not (UIX-A11Y-3). Pass `role` to override.
 */
export function Comments({ children, className, ...props }: CommentsProps) {
  return (
    <div role="log" className={cx('uix-comments', className)} {...props}>
      {children}
    </div>
  );
}

export interface CommentProps extends HTMLAttributes<HTMLDivElement> {
  /** Usually an `<Avatar />` (the grid reserves the leading column). */
  avatar?: ReactNode;
  author?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  /**
   * `person` (default) is someone's message. `system` is an event the product recorded —
   * a status change, an assignment — drawn as chrome rather than as a speech bubble, and
   * bylined with `systemLabel` instead of a person's name.
   */
  variant?: 'person' | 'system';
  /** Byline for `variant="system"` when no `author` is given. Default "System". */
  systemLabel?: string;
  /** The message this one answers, quoted above the body. Text or a link to it. */
  replyTo?: ReactNode;
  /** Label on the quote. Default "In reply to". */
  replyToLabel?: string;
}

/**
 * A single comment over `.uix-comment` (avatar column + body). `variant="system"` marks
 * product events apart from people; `replyTo` quotes the answered message. Mentions
 * inside the body use the `.uix-mention` token.
 */
export function Comment({
  avatar, author, meta, children, className, variant = 'person', systemLabel = 'System',
  replyTo, replyToLabel = 'In reply to', ...props
}: CommentProps) {
  const system = variant === 'system';
  // A system event names the system as its actor, so it is never mistaken for a person.
  const byline = author ?? (system ? systemLabel : undefined);
  return (
    <div
      className={cx('uix-comment', system && 'uix-comment--system', className)}
      data-variant={system ? 'system' : undefined}
      {...props}
    >
      {avatar ?? <span aria-hidden="true" />}
      <div className="uix-comment__body">
        {(byline != null || meta != null) && (
          <div className="uix-comment__meta">
            {byline != null && <span className="uix-comment__author">{byline}</span>}
            {byline != null && meta != null ? ' · ' : null}
            {meta}
          </div>
        )}
        {replyTo != null && (
          <blockquote className="uix-comment__reply">
            <span className="uix-comment__reply-label">{replyToLabel}</span>
            <span className="uix-comment__reply-body">{replyTo}</span>
          </blockquote>
        )}
        {children}
      </div>
    </div>
  );
}
