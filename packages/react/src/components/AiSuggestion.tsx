"use client";

import { useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import type { AiLabels } from '../ai-labels.js';
import { fillLabel } from '../fill-label.js';
import type { UixRenderLink } from '../link.js';
import { useProposalReporter } from '../hooks/useProposalReporter.js';
import { AiLabel, useAiLabels } from './AiLabel.js';
import type { AiExplanation } from './AiLabel.js';

export interface AiSuggestionProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The product's id for this suggestion, for the `uix-proposal` events. Opaque, no content. */
  proposalId: string;
  /** The product's id for the kind of suggestion (`incident.category`), to group rates by. */
  type?: string;
  /**
   * `low` (category, labels, priority) or `medium` (assignment, a duplicate link, an internal
   * work note). There is no `high`: a consequential write is a `ProposalReview`, never a chip.
   * Default `low`.
   */
  consequence?: 'low' | 'medium';
  /** The suggested value as it shows: "Network", a person's name, a chip. */
  value: ReactNode;
  /** The value in words, for the buttons' names when `value` is not text. */
  valueText?: string;
  /** What the "AI" mark opens: why it was suggested and from what. */
  explanation?: AiExplanation;
  /** Accept: apply the value. Medium consequence: follow it with an undo toast. */
  onAccept: () => void;
  /** Dismiss: the suggestion goes away and the value stays as it was. */
  onDismiss: () => void;
  renderLink?: UixRenderLink;
  labels?: Partial<AiLabels>;
}

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const CROSS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * One suggested value with Accept and Dismiss, and the "AI" mark that opens why (Linear Triage
 * Intelligence). For the low and medium bands only. Show several side by side for alternatives
 * (N-best), which PAIR prefers to a lower number when the AI is unsure. Reports `shown`,
 * `accepted` and `dismissed` through the `uix-proposal` event; the product removes the chip (and
 * moves focus to the field it filled) after either.
 */
export function AiSuggestion({
  proposalId, type, consequence = 'low', value, valueText, explanation, onAccept, onDismiss, renderLink, labels: own, className, ...props
}: AiSuggestionProps) {
  const labels = useAiLabels(own);
  const ref = useRef<HTMLSpanElement>(null);
  const report = useProposalReporter({ proposalId, kind: 'suggestion', type, consequence }, ref);
  const text = valueText ?? (typeof value === 'string' || typeof value === 'number' ? String(value) : labels.subjectDefault);
  return (
    <span
      ref={ref}
      role="group"
      aria-label={fillLabel(labels.suggestion, { value: text })}
      className={cx('uix-ai-suggestion', className)}
      data-consequence={consequence}
      {...props}
    >
      <AiLabel explanation={explanation} subject={text} renderLink={renderLink} labels={labels} />
      <span className="uix-ai-suggestion__value">{value}</span>
      <button
        type="button"
        className="uix-btn uix-btn--ghost uix-btn--icon uix-btn--xs uix-ai-suggestion__accept"
        aria-label={fillLabel(labels.accept, { value: text })}
        onClick={() => { report('accepted'); onAccept(); }}
      >
        {CHECK}
      </button>
      <button
        type="button"
        className="uix-btn uix-btn--ghost uix-btn--icon uix-btn--xs uix-ai-suggestion__dismiss"
        aria-label={fillLabel(labels.dismiss, { value: text })}
        onClick={() => { report('dismissed'); onDismiss(); }}
      >
        {CROSS}
      </button>
    </span>
  );
}
