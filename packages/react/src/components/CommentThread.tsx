"use client";

import { useId, useState } from 'react';
import type { ButtonHTMLAttributes, FormHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { ArrowDownIcon, ArrowUpIcon } from '../icons/components.js';
import { fillCountLabel, fillLabel } from '../fill-label.js';
import { useUixLocale } from '../labels-context.js';
import type { UixCountLabel } from '../plural.js';
import type { CommentLabels } from '../comment-labels.js';
import { Button } from './Button.js';
import { CommentAudienceIcon, CommentReplyContext, useCommentLabels } from './Comments.js';
import { Segmented, SegmentedOption } from './Segmented.js';

/** How many of the latest replies a thread always shows. */
const VISIBLE_REPLIES = 3;
/** The draft marker shows at most this much of the draft's first line. */
const DRAFT_PREVIEW = 120;

/** The draft's first non-blank line, cut to `DRAFT_PREVIEW` characters. */
function draftPreview(draft: string): string {
  const line = draft.split('\n').map((part) => part.trim()).find(Boolean) ?? '';
  // by code point, so an emoji at the cut is never split into a lone surrogate
  const chars = Array.from(line);
  return chars.length > DRAFT_PREVIEW ? `${chars.slice(0, DRAFT_PREVIEW - 1).join('').trimEnd()}…` : line;
}

export interface CommentThreadReply {
  /** Stable message ID, also used as the fragment target for unread navigation. */
  id: string;
  content: ReactNode;
  /**
   * The viewer has not seen this reply. A new reply is never folded away, and a `Comment` in
   * `content` shows the new chip without its own `isNew`.
   */
  unread?: boolean;
  /**
   * The viewer wrote this reply. It is never new to them: it folds like any other, and a
   * `Comment` in `content` never shows the new chip.
   */
  own?: boolean;
}

export interface CommentThreadProps extends HTMLAttributes<HTMLElement> {
  root: ReactNode;
  /** Replies in chronological order. The last three and any new reply are always visible. */
  replies: readonly CommentThreadReply[];
  /** Keep a folded reply visible while it is the active search or navigation target. */
  revealReplyId?: string;
  /** A quiet line above the replies, e.g. "2 Antworten · alle intern". */
  summary?: ReactNode;
  /** The name of the reply list. Default: the `comments` labels' `replies`. */
  label?: string;
  /** The fold button while folded; `{count}`. Default: the `comments` labels' `showEarlier`. */
  showEarlierLabel?: UixCountLabel;
  /** The fold button while unfolded. Default: the `comments` labels' `hideEarlier`. */
  hideEarlierLabel?: string;
  /**
   * This thread's reply box. It stays mounted when earlier replies fold. Keep each thread's
   * draft with `useCommentDrafts`, which also asks before an unsent reply is lost.
   */
  composer?: ReactNode;
  /**
   * The thread's unsent reply while its composer is closed: shown as a "Draft" marker with the
   * start of its first line, so nobody forgets it. Ignored while `composer` is shown.
   */
  draft?: string;
  /** Reopens the composer from the draft marker; without it the marker is plain text. */
  onResumeDraft?: () => void;
  labels?: Partial<CommentLabels>;
}

const OWN_REPLY = { unread: false, own: true } as const;
const NEW_REPLY = { unread: true, own: false } as const;
const SEEN_REPLY = { unread: false, own: false } as const;

/** Display one thread. The root and composer stay put when earlier replies fold. */
export function CommentThread({
  root, replies, revealReplyId, summary, label, showEarlierLabel, hideEarlierLabel, composer,
  draft, onResumeDraft, labels: labelsProp, className, ...props
}: CommentThreadProps) {
  const labels = useCommentLabels(labelsProp);
  const locale = useUixLocale();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const kept = (reply: CommentThreadReply) => (reply.unread === true && reply.own !== true) || reply.id === revealReplyId;
  const foldable = replies.slice(0, -VISIBLE_REPLIES);
  const earlierCount = foldable.filter((reply) => !kept(reply)).length;
  // `composer={open && <CommentComposer />}` is closed when it gives false, as well as null
  const hasComposer = composer != null && composer !== false;
  const draftText = !hasComposer && draft != null ? draftPreview(draft) : '';
  const draftLine = draftText ? (
    <>
      <span className="uix-comment-thread__draft-tag">{labels.draft}</span>
      <span className="uix-comment-thread__draft-text">{draftText}</span>
    </>
  ) : null;
  return (
    <article className={cx('uix-comment-thread', className)} {...props}>
      {root}
      {(replies.length > 0 || hasComposer || draftLine != null) && (
        <div className="uix-comment-thread__rail">
          {summary != null && <div className="uix-comment-thread__summary">{summary}</div>}
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
              {expanded
                ? hideEarlierLabel ?? labels.hideEarlier
                : fillCountLabel(showEarlierLabel ?? labels.showEarlier, { count: earlierCount }, locale)}
            </Button>
          )}
          {replies.length > 0 && (
            <ol id={listId} aria-label={label ?? labels.replies} className="uix-comment-thread__replies">
              {replies.map((reply, index) => (
                <li
                  key={reply.id}
                  id={reply.id}
                  tabIndex={-1}
                  hidden={!expanded && !kept(reply) && index < replies.length - VISIBLE_REPLIES}
                >
                  <CommentReplyContext.Provider value={reply.own === true ? OWN_REPLY : reply.unread === true ? NEW_REPLY : SEEN_REPLY}>
                    {reply.content}
                  </CommentReplyContext.Provider>
                </li>
              ))}
            </ol>
          )}
          {draftLine != null && (onResumeDraft ? (
            <button type="button" className="uix-comment-thread__draft" onClick={onResumeDraft}>{draftLine}</button>
          ) : (
            <p className="uix-comment-thread__draft">{draftLine}</p>
          ))}
          {hasComposer ? composer : null}
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
  /**
   * The chosen audience. Without `external` the thread is locked internal and the composer shows
   * and submits `internal` whatever this says: read the effective audience from the submitted
   * form (`audience` field, or `data-audience`), never from your own state alone.
   */
  audience?: 'internal' | 'external';
  /**
   * The outside person the thread is with, e.g. "Sophie Wagner". It fills the default words:
   * "Sophie Wagner sieht das nicht.", "An Sophie Wagner", "An Sophie Wagner senden".
   */
  recipient?: string;
  /** Words of the internal choice. Each defaults to the `comments` labels. */
  internal?: Partial<CommentComposerAudience>;
  /**
   * Offers the outside choice: `true` for the default words, or the words themselves. Omit it
   * for a thread that must stay internal: the kit then shows a lock label and no switch.
   */
  external?: Partial<CommentComposerAudience> | boolean;
  /** The name of the audience choice. Default: the `comments` labels' `audience`. */
  audienceLabel?: string;
  onAudienceChange?: (audience: 'internal' | 'external') => void;
  pending?: boolean;
  submitDisabled?: boolean;
  footerActions?: ReactNode;
  feedback?: ReactNode;
  labels?: Partial<CommentLabels>;
}

/**
 * A controlled audience picker and submit surface around a consumer-owned draft field. The
 * choice is always in the same order, internal first; the hint under it says who will see the
 * message; the commit button names the audience; the frame restyles with the audience.
 */
export function CommentComposer({
  audience = 'internal', recipient, internal: internalProp, external: externalProp, audienceLabel, onAudienceChange,
  pending = false, submitDisabled = false, footerActions, feedback, labels: labelsProp,
  children, className, onSubmit, 'aria-describedby': describedBy, ...props
}: CommentComposerProps) {
  const labels = useCommentLabels(labelsProp);
  const hintId = useId();
  const name = recipient?.trim() ? { name: recipient.trim() } : undefined;
  const internal: CommentComposerAudience = {
    label: internalProp?.label ?? labels.internal,
    hint: internalProp?.hint ?? (name ? fillLabel(labels.internalHintNamed, name) : labels.internalHint),
    submitLabel: internalProp?.submitLabel ?? labels.saveInternal,
  };
  const externalWords = externalProp === true ? {} : externalProp || undefined;
  const external: CommentComposerAudience | undefined = externalWords && {
    label: externalWords.label ?? (name ? fillLabel(labels.externalOption, name) : labels.external),
    hint: externalWords.hint ?? (name ? fillLabel(labels.externalHint, name) : labels.externalHintUnnamed),
    submitLabel: externalWords.submitLabel ?? (name ? fillLabel(labels.send, name) : labels.sendUnnamed),
  };
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
      {/* The audience the button names, for the submit handler: `new FormData(form).get('audience')`
          or `form.dataset.audience`. A locked thread submits `internal` whatever `audience` says. */}
      <input type="hidden" name="audience" value={selected} />
      <div className="uix-composer__audience">
        {external && onAudienceChange ? (
          <Segmented
            aria-label={audienceLabel ?? labels.audience}
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
          <span className="uix-comment__audience" data-audience={selected}>
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

export interface CommentNewNoticeProps extends HTMLAttributes<HTMLDivElement> {
  /** How many new entries the notice stands for. Nothing renders at 0. */
  count: number;
  /** The new entry `onShow` brings into view, 1-based ("2 of 3"). Default 1. */
  current?: number;
  /** Where that entry is from the notice: sets the arrow of the show button. Default `above`. */
  direction?: 'above' | 'below';
  /** Brings the current new entry into view and moves focus to it. */
  onShow: () => void;
  /**
   * Steps the current entry by one (`1` next, `-1` previous). The stepper shows only above one
   * entry; when the count drops to one while a stepper button has focus, move focus yourself.
   */
  onStep?: (step: 1 | -1) => void;
  /** Replaces the count line, e.g. "3 neue Antworten in 2 früheren Threads". */
  summary?: ReactNode;
  labels?: Partial<CommentLabels>;
}

/**
 * The one "new since your last visit" notice of a conversation: a divider, then one row with
 * the count and a show button, and a stepper only when there is more than one new entry.
 * Render it once per conversation, where the new entries begin.
 */
export function CommentNewNotice({
  count, current = 1, direction = 'above', onShow, onStep, summary, labels: labelsProp, className, ...props
}: CommentNewNoticeProps) {
  const labels = useCommentLabels(labelsProp);
  const locale = useUixLocale();
  const summaryId = useId();
  if (!(count > 0)) return null;
  const position = Number.isFinite(current) ? Math.min(Math.max(1, Math.round(current)), count) : 1;
  const Arrow = direction === 'below' ? ArrowDownIcon : ArrowUpIcon;
  return (
    <div className={cx('uix-comment-new', className)} {...props}>
      <div className="uix-comment-new__divider" role="separator" aria-label={labels.newSince}>
        <span aria-hidden="true">{labels.newSince}</span>
      </div>
      <div className="uix-comment-new__row">
        <span id={summaryId} className="uix-comment-new__summary">
          {summary ?? fillCountLabel(labels.newCount, { count }, locale)}
        </span>
        <span className="uix-comment-new__controls">
          {count > 1 && onStep && (
            <>
              <span className="uix-comment-new__step" role="status">
                {fillLabel(labels.step, { current: position, count })}
              </span>
              <Button type="button" size="sm" variant="ghost" icon aria-label={labels.previousNew} onClick={() => onStep(-1)}>
                <ArrowUpIcon size={14} aria-hidden />
              </Button>
              <Button type="button" size="sm" variant="ghost" icon aria-label={labels.nextNew} onClick={() => onStep(1)}>
                <ArrowDownIcon size={14} aria-hidden />
              </Button>
            </>
          )}
          <Button type="button" size="sm" variant="secondary" aria-describedby={summaryId} onClick={onShow}>
            {labels.show}<Arrow size={14} aria-hidden />
          </Button>
        </span>
      </div>
    </div>
  );
}

export interface CommentUnreadDividerProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  progress?: string;
  previous?: { label: string; onClick: () => void };
  next?: { label: string; onClick: () => void };
}

/**
 * A single unread marker. The optional buttons keep focus after the host jumps to a reply.
 * @deprecated Use `CommentNewNotice`: the approved notice with the count row and show button.
 */
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
  /** The accessible name with the count and who reacted, e.g. "Daumen hoch, 1, Mia Koch". */
  label: string;
  /** An icon from the kit (`<ThumbsUpIcon size={14} />`), not text. */
  glyph: ReactNode;
  count: number;
  pressed: boolean;
}

/** A reaction chip: an icon and a count, pressed while the viewer's own reaction is on it. */
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
