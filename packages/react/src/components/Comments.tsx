import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface CommentsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Comment thread container over `.uix-comments`. */
export function Comments({ children, className, ...props }: CommentsProps) {
  return (
    <div className={cx('uix-comments', className)} {...props}>
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
}

/** A single comment over `.uix-comment` (avatar column + body). */
export function Comment({ avatar, author, meta, children, className, ...props }: CommentProps) {
  return (
    <div className={cx('uix-comment', className)} {...props}>
      {avatar ?? <span aria-hidden="true" />}
      <div className="uix-comment__body">
        {(author != null || meta != null) && (
          <div className="uix-comment__meta">
            {author != null && <span className="uix-comment__author">{author}</span>}
            {author != null && meta != null ? ' · ' : null}
            {meta}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
