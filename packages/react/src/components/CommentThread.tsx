"use client";

import { useId, useState } from 'react';
import type { ButtonHTMLAttributes, FormHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { ArrowDownIcon, ArrowUpIcon } from '../icons/components.js';
import { Button } from './Button.js';
import { CommentAudienceIcon } from './Comments.js';
import { Segmented, SegmentedOption } from './Segmented.js';

export interface CommentThreadReply {
  /** Stable message ID, also used as the fragment target for unread navigation. */
  id: string;
  content: ReactNode;
  unread?: boolean;
}

export interface CommentThreadProps extends HTMLAttributes<HTMLElement> {
  root: ReactNode;
  /** Replies in chronological order. The last three and any unread reply are always visible. */
  replies: readonly CommentThreadReply[];
  /** Keep a folded reply visible while it is the active search or navigation target. */
  revealReplyId?: string;
  summary: ReactNode;
  label: string;
  showEarlierLabel: (count: number) => string;
  hideEarlierLabel: string;
  /** The consumer owns each thread's draft, its lifetime and any unsaved-changes guard. */
  composer?: ReactNode;
}

/** Display one thread. The root and composer stay put when earlier replies fold. */
export function CommentThread({
  root, replies, revealReplyId, summary, label, showEarlierLabel, hideEarlierLabel, composer, className, ...props
}: CommentThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const kept = (reply: CommentThreadReply) => reply.unread || reply.id === revealReplyId;
  const earlierCount = replies.slice(0, -3).filter((reply) => !kept(reply)).length;
  return (
    <article className={cx('uix-comment-thread', className)} {...props}>
      {root}
      {(replies.length > 0 || composer != null) && (
        <div className="uix-comment-thread__rail">
          <div className="uix-comment-thread__summary">{summary}</div>
          {earlierCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              wrap
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? hideEarlierLabel : showEarlierLabel(earlierCount)}
            </Button>
          )}
          {replies.length > 0 && (
            <ol id={listId} aria-label={label} className="uix-comment-thread__replies">
              {replies.map((reply, index) => (
                <li
                  key={reply.id}
                  id={reply.id}
                  tabIndex={-1}
                  hidden={!expanded && !kept(reply) && index < replies.length - 3}
                >
                  {reply.content}
                </li>
              ))}
            </ol>
          )}
          {composer}
        </div>
      )}
    </article>
  );
}

export interface CommentComposerAudience {
  /** Visible label of the audience option. */
  label: string;
  /** Persistent hint that names who can or cannot see the draft. */
  hint: string;
  /** The visible commit label, specific to the selected audience. */
  submitLabel: string;
}

export interface CommentComposerProps extends FormHTMLAttributes<HTMLFormElement> {
  audience?: 'internal' | 'external';
  internal: CommentComposerAudience;
  external?: CommentComposerAudience;
  audienceLabel: string;
  onAudienceChange?: (audience: 'internal' | 'external') => void;
  pending?: boolean;
  submitDisabled?: boolean;
  footerActions?: ReactNode;
  feedback?: ReactNode;
}

/** A controlled audience picker and submit surface around a consumer-owned draft field. */
export function CommentComposer({
  audience = 'internal', internal, external, audienceLabel, onAudienceChange,
  pending = false, submitDisabled = false, footerActions, feedback,
  children, className, onSubmit, 'aria-describedby': describedBy, ...props
}: CommentComposerProps) {
  const hintId = useId();
  const selected = audience === 'external' && external ? 'external' : 'internal';
  const copy = selected === 'external' && external ? external : internal;
  return (
    <form
      className={cx('uix-composer', 'uix-composer--audience', className)}
      data-audience={selected}
      aria-describedby={describedBy ? hintId + ' ' + describedBy : hintId}
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending && !submitDisabled) onSubmit?.(event);
      }}
      {...props}
    >
      <div className="uix-composer__audience">
        {external && onAudienceChange ? (
          <Segmented
            aria-label={audienceLabel}
            selection="radio"
            value={selected}
            onChange={(value) => {
              if (value === 'internal' || value === 'external') onAudienceChange(value);
            }}
          >
            <SegmentedOption value="internal" disabled={pending}>
              <CommentAudienceIcon kind="internal" />{internal.label}
            </SegmentedOption>
            <SegmentedOption value="external" disabled={pending}>
              <CommentAudienceIcon kind="external" />{external.label}
            </SegmentedOption>
          </Segmented>
        ) : (
          <span className="uix-comment__audience">
            <CommentAudienceIcon kind={selected} />{copy.label}
          </span>
        )}
        <p id={hintId} className="uix-composer__hint">{copy.hint}</p>
      </div>
      {children}
      {feedback}
      <div className="uix-composer__bar">
        {footerActions}
        <Button
          type="submit" wrap loading={pending} disabled={submitDisabled}
          variant={selected === 'external' ? 'primary' : 'secondary'}
        >
          <CommentAudienceIcon kind={selected} />{copy.submitLabel}
        </Button>
      </div>
    </form>
  );
}

export interface CommentUnreadDividerProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  progress?: string;
  previous?: { label: string; onClick: () => void };
  next?: { label: string; onClick: () => void };
}

/** A single unread marker. The optional buttons keep focus after the host jumps to a reply. */
export function CommentUnreadDivider({
  label, progress, previous, next, className, ...props
}: CommentUnreadDividerProps) {
  return (
    <div className={cx('uix-comment-unread', className)} {...props}>
      <span className="uix-comment-unread__line" role="separator" aria-label={label} />
      <span aria-hidden="true">{label}</span>
      {progress != null && <span role="status">{progress}</span>}
      {previous && (
        <Button type="button" size="sm" variant="ghost" icon aria-label={previous.label} onClick={previous.onClick}>
          <ArrowUpIcon size={14} aria-hidden />
        </Button>
      )}
      {next && (
        <Button type="button" size="sm" variant="ghost" icon aria-label={next.label} onClick={next.onClick}>
          <ArrowDownIcon size={14} aria-hidden />
        </Button>
      )}
    </div>
  );
}

export interface CommentReactionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  glyph: ReactNode;
  count: number;
  pressed: boolean;
}

export function CommentReaction({
  label, glyph, count, pressed, className, ...props
}: CommentReactionProps) {
  return (
    <Button
      type="button" size="xs" variant="secondary"
      className={cx('uix-comment-reaction', className)}
      aria-label={label} aria-pressed={pressed} {...props}
    >
      <span aria-hidden="true">{glyph}</span>
      <span aria-hidden="true">{count}</span>
    </Button>
  );
}
