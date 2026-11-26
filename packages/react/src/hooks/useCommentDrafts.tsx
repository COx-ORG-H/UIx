"use client";

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from '../components/Dialogs.js';
import { useCommentLabels } from '../components/Comments.js';
import type { CommentLabels } from '../comment-labels.js';
import { fillCountLabel, fillLabel } from '../fill-label.js';
import { useUixLocale } from '../labels-context.js';
import { useLeaveGuard } from './useLeaveGuard.js';

export interface UseCommentDraftsOptions {
  /** Drafts to start with, by thread ID (a draft restored from the server or storage). */
  initial?: Readonly<Record<string, string>>;
  /** Each word defaults to `UixLabelsProvider` `comments`, then English. */
  labels?: Partial<CommentLabels>;
}

export interface CommentDiscardOptions {
  /** The person the reply goes to, named in the question: "Ihre Antwort an Sophie Wagner …". */
  recipient?: string;
  /**
   * Runs after the draft is thrown away (at once when it is blank). Close the composer here and
   * move focus to what opened it (the thread's reply button): the button that asked is gone.
   */
  onDiscard?: () => void;
  /** Runs when the person keeps writing. Return focus to the field here. */
  onKeep?: () => void;
}

export interface CommentDraftsApi {
  /** The thread's draft, `''` when it has none. */
  get: (threadId: string) => string;
  /** Keep the thread's draft as the person types. */
  set: (threadId: string, text: string) => void;
  /** Forget the thread's draft without asking, e.g. after it was sent. */
  clear: (threadId: string) => void;
  /** The thread holds an unsent reply (anything but white space). */
  has: (threadId: string) => boolean;
  /** The threads with an unsent reply. */
  unsent: readonly string[];
  /**
   * Asks before the thread's unsent reply is thrown away (its composer closes). A blank draft is
   * cleared at once and `onDiscard` runs. Returns whether it discarded at once. A second call
   * while it asks replaces the first, whose `onKeep` runs.
   */
  discard: (threadId: string, options?: CommentDiscardOptions) => boolean;
  /**
   * Leaving the page while any thread holds an unsent reply: the browser's own prompt on reload
   * and close, and this step for in-app navigation, as `useLeaveGuard`'s `confirm`.
   */
  confirmLeave: (proceed: () => void, stay?: () => void) => boolean;
  /** The questions. Render it once, anywhere in the page. */
  dialog: ReactNode;
}

const blank = (text: string | undefined) => !text || text.trim() === '';

/**
 * One draft per thread, kept while the person moves between threads, folds replies or switches
 * the audience, with an unsaved-changes guard: closing a thread's composer and leaving the page
 * both ask before an unsent reply is lost (TENSOR ADR-0360 point 7).
 */
export function useCommentDrafts({ initial, labels: labelsProp }: UseCommentDraftsOptions = {}): CommentDraftsApi {
  const labels = useCommentLabels(labelsProp);
  const locale = useUixLocale();
  const [drafts, setDraftsState] = useState<Readonly<Record<string, string>>>(() => ({ ...initial }));
  // The latest drafts at once, so `set(id, text)` then `discard(id)` in one handler sees the text.
  const draftsRef = useRef(drafts);
  const setDrafts = useCallback((update: (current: Readonly<Record<string, string>>) => Readonly<Record<string, string>>) => {
    const next = update(draftsRef.current);
    if (next === draftsRef.current) return;
    draftsRef.current = next;
    setDraftsState(next);
  }, []);
  const [asking, setAskingState] = useState<({ threadId: string } & CommentDiscardOptions) | null>(null);
  const askingRef = useRef(asking);
  const setAsking = useCallback((next: ({ threadId: string } & CommentDiscardOptions) | null) => {
    askingRef.current = next;
    setAskingState(next);
  }, []);

  const unsent = useMemo(() => Object.keys(drafts).filter((id) => !blank(drafts[id])), [drafts]);

  // New functions whenever a draft changes, so a memoised child given `get` or `has` re-renders.
  const get = useCallback((threadId: string) => drafts[threadId] ?? '', [drafts]);
  const has = useCallback((threadId: string) => !blank(drafts[threadId]), [drafts]);
  const set = useCallback((threadId: string, text: string) => {
    setDrafts((current) => (current[threadId] === text ? current : { ...current, [threadId]: text }));
  }, [setDrafts]);
  const clear = useCallback((threadId: string) => {
    setDrafts((current) => {
      if (!(threadId in current)) return current;
      const next = { ...current };
      delete next[threadId];
      return next;
    });
  }, [setDrafts]);

  const discard = useCallback((threadId: string, options: CommentDiscardOptions = {}) => {
    if (blank(draftsRef.current[threadId])) {
      clear(threadId);
      options.onDiscard?.();
      return true;
    }
    const earlier = askingRef.current;
    setAsking({ threadId, ...options });
    earlier?.onKeep?.();
    return false;
  }, [clear, setAsking]);

  const leave = useLeaveGuard({
    dirty: unsent.length > 0,
    labels: {
      title: labels.leaveTitle,
      description: fillCountLabel(labels.leaveDescription, { count: unsent.length }, locale),
      discard: labels.discard,
      keepEditing: labels.keepWriting,
    },
  });

  const recipient = asking?.recipient?.trim();
  const dialog = (
    <>
      {leave.dialog}
      <ConfirmDialog
        open={asking != null}
        title={labels.discardTitle}
        description={recipient ? fillLabel(labels.discardDescriptionNamed, { name: recipient }) : labels.discardDescription}
        confirmLabel={labels.discard}
        cancelLabel={labels.keepWriting}
        destructive
        onConfirm={() => {
          const next = askingRef.current;
          setAsking(null);
          if (!next) return;
          clear(next.threadId);
          next.onDiscard?.();
        }}
        onCancel={() => {
          const next = askingRef.current;
          setAsking(null);
          next?.onKeep?.();
        }}
      />
    </>
  );

  return { get, set, clear, has, unsent, discard, confirmLeave: leave.confirm, dialog };
}
