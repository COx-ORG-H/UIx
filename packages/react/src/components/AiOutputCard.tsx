"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import type { AiLabels } from '../ai-labels.js';
import { fillLabel } from '../fill-label.js';
import type { UixRenderLink } from '../link.js';
import { startAiGeneration } from '../ai-announcer.js';
import type { AiGeneration } from '../ai-announcer.js';
import { announcePolite } from '../announce.js';
import { useProposalReporter } from '../hooks/useProposalReporter.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { AiLabel, SourceList, useAiLabels } from './AiLabel.js';
import type { AiExplanation, AiSource } from './AiLabel.js';
import { Button } from './Button.js';
import { CopyButton } from './CopyButton.js';

/** Where an AI output stands. */
export type AiOutputStatus = 'generating' | 'done' | 'stopped' | 'error';

export interface AiOutputCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  /** The product's id for this output, for the `uix-proposal` events. Opaque, no content. */
  proposalId: string;
  /** The product's id for the kind of output (`incident.summary`). */
  type?: string;
  /** What it is: "Summary". Also names the completion announcement ("Summary ready."). */
  title: ReactNode;
  status: AiOutputStatus;
  /**
   * What it is doing, specifically (Apple HIG): "Summarising 12 work notes", never "Processing…".
   * Shown while generating and announced at the start. Default `labels.generating`.
   */
  statusText?: string;
  /**
   * The finished answer as plain text: announced once when it is complete, and what Copy copies.
   * Default: the body's text when it finished.
   */
  text?: string;
  /** The answer as it shows (text, `Markdown`). While generating, pass what has arrived so far. */
  children?: ReactNode;
  /** The records it is based on, in the footer. An empty list says "No sources". */
  sources?: readonly AiSource[];
  /** What the AI mark opens. */
  explanation?: AiExplanation;
  /** With `status="error"`: what went wrong and what to do. */
  error?: ReactNode;
  /** Stop generating. Shown while generating. */
  onStop?: () => void;
  /** Generate again. Shown once it is done, stopped or failed. */
  onRetry?: () => void;
  /** The quiet thumbs (Apple HIG: voluntary, out of the way). Shown when given. */
  onFeedback?: (rating: 'up' | 'down') => void;
  /** Controlled rating. Default: the card remembers the last press. */
  rating?: 'up' | 'down' | null;
  /** More actions for the finished answer: "Post to work notes", "Add to reply". */
  actions?: ReactNode;
  /**
   * What the shared announcer says. `all` (default): the status at the start, "Loading" about
   * every 5 s, the whole answer at the end. `final`: only the end (for secondary output such as a
   * tool-call step). `none`: nothing (the product announces).
   */
  announce?: 'all' | 'final' | 'none';
  /** Show Copy once there is text. Default `true`. */
  copyable?: boolean;
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
  renderLink?: UixRenderLink;
  labels?: Partial<AiLabels>;
}

/** A finished sentence or line: its punctuation followed by space, or by the end of what has arrived. */
const SENTENCE_END = /[.!?…:;](?=\s|$)|\n/g;

/**
 * The text to show while it streams in. Normally all of it. Under reduced motion only up to the
 * last finished sentence (or line) while `streaming`, so the text arrives in whole sentences
 * instead of moving word by word; all of it once streaming ends.
 */
export function useStreamingText(text: string, streaming: boolean): string {
  const reduced = useReducedMotion();
  if (!reduced || !streaming) return text;
  let end = 0;
  for (const match of text.matchAll(SENTENCE_END)) end = (match.index ?? 0) + match[0].length;
  return text.slice(0, end);
}

const THUMB_UP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);
const THUMB_DOWN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

/**
 * An AI answer: a summary, a draft, a reply suggestion (ServiceNow's summary card, Apple HIG). It
 * shows specific status text and Stop while generating; Retry, Copy, quiet thumbs feedback and
 * your own actions once done; and the sources in the footer. Screen readers hear the status once,
 * a shared "Loading" heartbeat about every 5 s, and the whole answer once at the end, never the
 * tokens (`startAiGeneration`). Under reduced motion there is no streaming caret; pair it with
 * `useStreamingText` so text arrives in whole sentences. Reports `shown`, `stopped`, `retried`
 * and `feedback`.
 */
export function AiOutputCard({
  proposalId, type, title, status, statusText, text, children, sources, explanation, error, onStop, onRetry,
  onFeedback, rating: ratingProp, actions, announce = 'all', copyable = true, headingLevel = 3, renderLink,
  labels: own, className, ...props
}: AiOutputCardProps) {
  const labels = useAiLabels(own);
  const reduced = useReducedMotion();
  const id = useId();
  const titleId = `${id}-title`;
  const ref = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const report = useProposalReporter({ proposalId, kind: 'output', type }, ref);
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const [ownRating, setOwnRating] = useState<'up' | 'down' | null>(null);
  const rating = ratingProp !== undefined ? ratingProp : ownRating;
  const [bodyText, setBodyText] = useState<string>('');
  const generating = status === 'generating';
  const shownStatus = statusText?.trim() || labels.generating;

  // the shared announcer: start, heartbeat, then the whole answer once
  const generation = useRef<AiGeneration | null>(null);
  const titleText = typeof title === 'string' || typeof title === 'number' ? String(title) : '';
  const latest = useRef({ text, labels, titleText, error });
  latest.current = { text, labels, titleText, error };
  useEffect(() => {
    if (status === 'generating') {
      if (!generation.current && announce !== 'none') {
        generation.current = startAiGeneration({
          status: shownStatus, loading: labels.loading, from: ref.current, announce: announce === 'final' ? 'final' : 'all',
        });
      }
      return;
    }
    const finishedText = (latest.current.text ?? bodyRef.current?.textContent ?? '').trim();
    setBodyText(finishedText);
    const g = generation.current;
    generation.current = null;
    if (!g) return;
    const l = latest.current.labels;
    if (status === 'done') g.end(fillLabel(l.done, { title: latest.current.titleText || l.panelTitle, text: finishedText }).trim());
    else if (status === 'stopped') g.end(l.stopped);
    else {
      const why = typeof latest.current.error === 'string' ? ` ${latest.current.error}` : '';
      g.end(`${l.error}.${why}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => { generation.current?.status(shownStatus); }, [shownStatus]);
  useEffect(() => () => { generation.current?.end(); generation.current = null; }, []);

  const rate = (next: 'up' | 'down') => {
    setOwnRating(next);
    report('feedback', next);
    onFeedback?.(next);
    announcePolite(labels.thanks, ref.current);
  };

  const copyValue = (text ?? bodyText).trim();
  const finished = !generating;
  return (
    <article
      ref={ref}
      className={cx('uix-ai-output', className)}
      aria-labelledby={titleId}
      data-status={status}
      {...props}
    >
      <header className="uix-ai-output__head">
        <AiLabel explanation={explanation} subject={titleText || undefined} renderLink={renderLink} labels={own} />
        <Heading className="uix-ai-output__title" id={titleId}>{title}</Heading>
        {generating && onStop && (
          <Button variant="secondary" size="sm" className="uix-ai-output__stop" onClick={() => { report('stopped'); onStop(); }}>
            {labels.stop}
          </Button>
        )}
      </header>
      {generating && (
        <p className="uix-ai-output__status">
          {/* the ring only: the words beside it are what is said, through the shared announcer */}
          <span className="uix-spinner uix-spinner--sm" aria-hidden="true" />
          <span>{shownStatus}</span>
        </p>
      )}
      <div
        ref={bodyRef}
        className="uix-ai-output__body"
        aria-busy={generating || undefined}
        data-streaming={(generating && !reduced) || undefined}
      >
        {children}
      </div>
      {status === 'stopped' && <p className="uix-ai-output__note">{labels.stopped}</p>}
      {status === 'error' && <p className="uix-ai-output__error">{error ?? labels.error}</p>}
      {finished && (onRetry || onFeedback || actions || (copyable && copyValue)) && (
        <div className="uix-ai-output__actions">
          {actions}
          {copyable && copyValue && status !== 'error' && (
            <CopyButton value={copyValue} label={labels.copy} copiedLabel={labels.copied} failedLabel={labels.copyFailed} />
          )}
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={() => { report('retried'); onRetry(); }}>{labels.retry}</Button>
          )}
          {onFeedback && status === 'done' && (
            <span className="uix-ai-output__feedback" role="group" aria-label={labels.feedback}>
              <button
                type="button"
                className="uix-btn uix-btn--ghost uix-btn--icon uix-btn--sm"
                aria-label={labels.helpful}
                aria-pressed={rating === 'up'}
                onClick={() => rate('up')}
              >
                {THUMB_UP}
              </button>
              <button
                type="button"
                className="uix-btn uix-btn--ghost uix-btn--icon uix-btn--sm"
                aria-label={labels.notHelpful}
                aria-pressed={rating === 'down'}
                onClick={() => rate('down')}
              >
                {THUMB_DOWN}
              </button>
            </span>
          )}
        </div>
      )}
      {sources && finished && status !== 'error' && (
        <footer className="uix-ai-output__sources">
          <SourceList sources={sources} renderLink={renderLink} labels={own} />
        </footer>
      )}
    </article>
  );
}
