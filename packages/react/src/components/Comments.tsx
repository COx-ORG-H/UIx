"use client";

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { LockIcon, MailIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import { DEFAULT_COMMENT_LABELS } from '../comment-labels.js';
import type { CommentLabels } from '../comment-labels.js';

/** Only the words that are set: `{ send: undefined }` keeps the word below it. */
function definedWords(words: Partial<CommentLabels> | undefined): Partial<CommentLabels> {
  if (!words) return {};
  return Object.fromEntries(Object.entries(words).filter(([, value]) => value != null)) as Partial<CommentLabels>;
}

/** The comment words in effect here: the defaults, then `UixLabelsProvider` `comments`, then `own`. */
export function useCommentLabels(own?: Partial<CommentLabels>): CommentLabels {
  const provided = useUixLabels().comments;
  return useMemo(() => ({ ...DEFAULT_COMMENT_LABELS, ...definedWords(provided), ...definedWords(own) }), [provided, own]);
}

/**
 * Set by `CommentThread` around each reply's content from the reply's `unread` and `own`, so a
 * `Comment` there needs neither flag again and the chip and the fold can never disagree.
 * @internal
 */
export const CommentReplyContext = createContext<{ readonly unread?: boolean; readonly own?: boolean }>({});

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

export interface CommentAudience {
  kind: 'internal' | 'external';
  /**
   * The visible badge text, e.g. "Intern" or "An Sophie Wagner · per E-Mail". Default: the
   * `comments` labels' `internal` or `external`. Name the person on an outside message. A node
   * lets a product tag the name it carries (a redaction or capture marker) without losing it.
   */
  label?: ReactNode;
}

export function CommentAudienceIcon({ kind }: Pick<CommentAudience, 'kind'>) {
  const Icon = kind === 'internal' ? LockIcon : MailIcon;
  return <Icon size={14} aria-hidden />;
}

export interface CommentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Usually an `<Avatar />` (the grid reserves the leading column). `false` drops the
   * column, for a comment that sits on a rail which already marks each row (a timeline).
   */
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
  /** Byline for `variant="system"` when no `author` is given. Default: the `comments` labels' `system`. */
  systemLabel?: string;
  /** The message this one answers, quoted above the body. Text or a link to it. */
  replyTo?: ReactNode;
  /** Label on the quote. Default: the `comments` labels' `replyTo`. */
  replyToLabel?: string;
  /**
   * Who can see the message: a lock badge and a hairline outline for internal, an envelope
   * badge and a filled bubble for outside. Never on a system entry.
   */
  audience?: CommentAudience;
  /**
   * The viewer has not seen this entry yet: shows the `comments` labels' `new` chip. Inside a
   * `CommentThread` reply it defaults to the reply's `unread`.
   */
  isNew?: boolean;
  /**
   * The viewer wrote this entry. It never shows the new chip, whatever `isNew` or `unreadLabel`
   * say. Inside a `CommentThread` reply it defaults to the reply's `own`.
   */
  own?: boolean;
  /** A caller-supplied marker text for a new entry. Prefer `isNew`, which takes the label from the provider. */
  unreadLabel?: string;
  /** Files of the message: `<ul className="uix-file-rows">` of `FileRow as="li"`. */
  attachments?: ReactNode;
  /** Message actions (an `ActionPanel` trigger, reply) and `CommentReaction` chips. */
  actions?: ReactNode;
  labels?: Partial<CommentLabels>;
}

/**
 * A single comment over `.uix-comment` (avatar column + body). `variant="system"` marks
 * product events apart from people; `replyTo` quotes the answered message. Mentions
 * inside the body use the `.uix-mention` token.
 */
export function Comment({
  avatar, author, meta, children, className, variant = 'person', systemLabel,
  replyTo, replyToLabel, audience, isNew, own, unreadLabel, attachments, actions, labels: labelsProp, ...props
}: CommentProps) {
  const labels = useCommentLabels(labelsProp);
  const reply = useContext(CommentReplyContext);
  const ownEntry = own ?? reply.own ?? false;
  const fresh = isNew ?? reply.unread ?? false;
  const system = variant === 'system';
  // A system event names the system as its actor, so it is never mistaken for a person.
  const byline = author ?? (system ? systemLabel ?? labels.system : undefined);
  const bare = avatar === false;
  const messageAudience = system ? undefined : audience;
  const audienceLabel = messageAudience
    ? messageAudience.label ?? (messageAudience.kind === 'internal' ? labels.internal : labels.external)
    : undefined;
  // The viewer's own entry is never new to them.
  const newLabel = ownEntry ? undefined : unreadLabel || (fresh ? labels.new : undefined);
  return (
    <div
      className={cx('uix-comment', system && 'uix-comment--system', bare && 'uix-comment--bare', messageAudience && 'uix-comment--audience', className)}
      data-variant={system ? 'system' : undefined}
      data-audience={messageAudience?.kind}
      data-new={newLabel ? '' : undefined}
      {...props}
    >
      {bare ? null : (avatar ?? <span aria-hidden="true" />)}
      <div className="uix-comment__body">
        {(byline != null || meta != null || messageAudience != null || newLabel != null) && (
          <div className="uix-comment__meta">
            {messageAudience != null && (
              <span className="uix-comment__audience" data-audience={messageAudience.kind}>
                <CommentAudienceIcon kind={messageAudience.kind} />{audienceLabel}
              </span>
            )}
            {byline != null && <span className="uix-comment__author">{byline}</span>}
            {byline != null && meta != null ? ' · ' : null}
            {meta}
            {newLabel && <span className="uix-comment__unread">{newLabel}</span>}
          </div>
        )}
        {replyTo != null && (
          <blockquote className="uix-comment__reply">
            <span className="uix-comment__reply-label">{replyToLabel ?? labels.replyTo}</span>
            <span className="uix-comment__reply-body">{replyTo}</span>
          </blockquote>
        )}
        {children}
        {attachments != null && <div className="uix-comment__files">{attachments}</div>}
        {actions != null && <div className="uix-comment__actions">{actions}</div>}
      </div>
    </div>
  );
}
