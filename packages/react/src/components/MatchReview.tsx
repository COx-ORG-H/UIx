"use client";

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { JsonValue } from '../json-value.js';
import { cx } from '../cx.js';
import { StatusPill } from './StatusPill.js';
import { fillLabel } from '../fill-label.js';

export interface MatchReviewField {
  id: string;
  label: string;
  render?: (value: JsonValue | undefined, record: Record<string, JsonValue>) => ReactNode;
}

export interface MatchReviewCandidate {
  id: string;
  record: Record<string, JsonValue>;
  confidence?: number;
  status?: 'pending' | 'resolved';
  decision?: 'accepted' | 'dismissed' | 'split' | 'other';
}

export type MatchReviewAction = 'accept' | 'dismiss' | 'split' | 'pick-other';

export interface MatchBulkResult {
  succeeded: number;
  failed?: number;
}

/**
 * Every word the match review renders or announces (TENSOR RX-125, UIX-12). Plural
 * pairs are `…One` / `…Many`; `{count}`, `{pending}`, `{total}`, `{id}` are placeholders.
 */
export interface MatchReviewLabels {
  region: string;
  loading: string;
  retry: string;
  empty: string;
  emptyDetail: string;
  pendingOf: string;
  bulk: string;
  selectedCount: string;
  applying: string;
  acceptSelected: string;
  dismissSelected: string;
  caption: string;
  select: string;
  confidence: string;
  status: string;
  actions: string;
  selectCandidate: string;
  notScored: string;
  resolved: string;
  pending: string;
  decisionAccepted: string;
  decisionDismissed: string;
  decisionSplit: string;
  decisionOther: string;
  accept: string;
  dismiss: string;
  split: string;
  pickOther: string;
  acceptingOne: string;
  acceptingMany: string;
  dismissingOne: string;
  dismissingMany: string;
  acceptedOne: string;
  acceptedMany: string;
  dismissedOne: string;
  dismissedMany: string;
  failedSuffix: string;
  bulkAcceptFailed: string;
  bulkDismissFailed: string;
}

export const DEFAULT_MATCH_REVIEW_LABELS: MatchReviewLabels = {
  region: 'Match review',
  loading: 'Loading match candidates…',
  retry: 'Try again',
  empty: 'No candidate matches found.',
  emptyDetail: 'Choose another record source or continue without a match.',
  pendingOf: '{pending} pending of {total}',
  bulk: 'Bulk candidate actions',
  selectedCount: '{count} selected',
  applying: 'Applying…',
  acceptSelected: 'Accept selected',
  dismissSelected: 'Dismiss selected',
  caption: 'Candidate matches and available decisions',
  select: 'Select',
  confidence: 'Confidence',
  status: 'Status',
  actions: 'Actions',
  selectCandidate: 'Select candidate {id}',
  notScored: 'Not scored',
  resolved: 'Resolved',
  pending: 'Pending',
  decisionAccepted: 'Accepted',
  decisionDismissed: 'Dismissed',
  decisionSplit: 'Split',
  decisionOther: 'Other match',
  accept: 'Accept',
  dismiss: 'Dismiss',
  split: 'Split',
  pickOther: 'Pick other',
  acceptingOne: 'Accepting {count} candidate…',
  acceptingMany: 'Accepting {count} candidates…',
  dismissingOne: 'Dismissing {count} candidate…',
  dismissingMany: 'Dismissing {count} candidates…',
  acceptedOne: '{count} candidate accepted',
  acceptedMany: '{count} candidates accepted',
  dismissedOne: '{count} candidate dismissed',
  dismissedMany: '{count} candidates dismissed',
  failedSuffix: '; {count} failed',
  bulkAcceptFailed: 'Bulk accept failed. Try again.',
  bulkDismissFailed: 'Bulk dismiss failed. Try again.',
};

export interface MatchReviewProps {
  incoming: Record<string, JsonValue>;
  incomingLabel?: string;
  fields: MatchReviewField[];
  candidates: MatchReviewCandidate[];
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onDecision: (candidateId: string, action: MatchReviewAction) => void;
  onBulkDecision?: (candidateIds: string[], action: Extract<MatchReviewAction, 'accept' | 'dismiss'>) => void | MatchBulkResult | Promise<void | MatchBulkResult>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<MatchReviewLabels>;
}

const valueText = (value: JsonValue | undefined) => value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value);

/** Generic descriptor-driven incoming-record to candidate-match decision surface. */
export function MatchReview({
  incoming, incomingLabel = 'Incoming record', fields, candidates, selectedIds,
  onSelectionChange, onDecision, onBulkDecision, loading, error, onRetry, className, labels: labelOverrides,
}: MatchReviewProps) {
  const labels: MatchReviewLabels = { ...DEFAULT_MATCH_REVIEW_LABELS, ...labelOverrides };
  const plural = (n: number, one: string, many: string) => fillLabel(n === 1 ? one : many, { count: n });
  const decisionLabel = { accepted: labels.decisionAccepted, dismissed: labels.decisionDismissed, split: labels.decisionSplit, other: labels.decisionOther } as const;
  const actionLabel = { accept: labels.accept, dismiss: labels.dismiss, split: labels.split, 'pick-other': labels.pickOther } as const;
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState('');
  const [bulkPending, setBulkPending] = useState(false);
  const selection = selectedIds ?? internalSelection;
  const pending = useMemo(() => candidates.filter((candidate) => candidate.status !== 'resolved'), [candidates]);

  const setSelection = (next: Set<string>) => {
    if (selectedIds === undefined) setInternalSelection(next);
    onSelectionChange?.(next);
  };
  const toggle = (id: string) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelection(next);
  };
  const runBulk = async (action: 'accept' | 'dismiss') => {
    if (!onBulkDecision || selection.size === 0 || bulkPending) return;
    const ids = [...selection];
    setBulkPending(true);
    setAnnouncement(action === 'accept'
      ? plural(ids.length, labels.acceptingOne, labels.acceptingMany)
      : plural(ids.length, labels.dismissingOne, labels.dismissingMany));
    try {
      const result = await onBulkDecision(ids, action);
      const succeeded = result?.succeeded ?? ids.length;
      const failed = result?.failed ?? 0;
      const done = action === 'accept'
        ? plural(succeeded, labels.acceptedOne, labels.acceptedMany)
        : plural(succeeded, labels.dismissedOne, labels.dismissedMany);
      setAnnouncement(`${done}${failed ? fillLabel(labels.failedSuffix, { count: failed }) : ''}.`);
      if (!failed) setSelection(new Set());
    } catch {
      setAnnouncement(action === 'accept' ? labels.bulkAcceptFailed : labels.bulkDismissFailed);
    } finally {
      setBulkPending(false);
    }
  };

  if (loading) return <div className={cx('uix-match-review uix-match-review--state', className)} role="status">{labels.loading}</div>;
  if (error) return <div className={cx('uix-match-review uix-match-review--state', className)} role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>{labels.retry}</button>}</div>;
  if (candidates.length === 0) return <div className={cx('uix-match-review uix-match-review--state', className)}><p>{labels.empty}</p><p>{labels.emptyDetail}</p></div>;

  return (
    <section className={cx('uix-match-review', className)} aria-label={labels.region}>
      <div className="uix-match-review__summary">
        <div><strong>{incomingLabel}</strong><span>{fillLabel(labels.pendingOf, { pending: pending.length, total: candidates.length })}</span></div>
        <div className="uix-match-review__incoming">
          {fields.map((field) => <span key={field.id}><b>{field.label}</b>{field.render?.(incoming[field.id], incoming) ?? valueText(incoming[field.id])}</span>)}
        </div>
      </div>
      {onBulkDecision && (
        <div className="uix-match-review__bulk" aria-label={labels.bulk}>
          <span>{fillLabel(labels.selectedCount, { count: selection.size })}</span>
          <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" disabled={selection.size === 0 || bulkPending} onClick={() => void runBulk('accept')}>{bulkPending ? labels.applying : labels.acceptSelected}</button>
          <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" disabled={selection.size === 0 || bulkPending} onClick={() => void runBulk('dismiss')}>{bulkPending ? labels.applying : labels.dismissSelected}</button>
        </div>
      )}
      <div className="uix-match-review__table-wrap">
        <table className="uix-table uix-match-review__table">
          <caption className="uix-visually-hidden">{labels.caption}</caption>
          <thead><tr>
            <th scope="col"><span className="uix-visually-hidden">{labels.select}</span></th>
            <th scope="col">{labels.confidence}</th>
            {fields.map((field) => <th scope="col" key={field.id}>{field.label}</th>)}
            <th scope="col">{labels.status}</th><th scope="col">{labels.actions}</th>
          </tr></thead>
          <tbody>{candidates.map((candidate) => {
            const resolved = candidate.status === 'resolved';
            return <tr key={candidate.id} data-status={candidate.status ?? 'pending'}>
              <td><input type="checkbox" checked={selection.has(candidate.id)} onChange={() => toggle(candidate.id)} aria-label={fillLabel(labels.selectCandidate, { id: candidate.id })} /></td>
              <td><span className="uix-match-review__confidence">{candidate.confidence == null ? labels.notScored : `${Math.round(candidate.confidence * 100)}%`}</span></td>
              {fields.map((field) => <td key={field.id}>{field.render?.(candidate.record[field.id], candidate.record) ?? valueText(candidate.record[field.id])}</td>)}
              <td><StatusPill tone={resolved ? 'success' : 'warning'}>{resolved ? (candidate.decision ? decisionLabel[candidate.decision] : labels.resolved) : labels.pending}</StatusPill></td>
              <td><div className="uix-match-review__actions">
                {(['accept', 'dismiss', 'split', 'pick-other'] as const).map((action) => <button
                  key={action} type="button" className="uix-btn uix-btn--ghost uix-btn--sm"
                  disabled={resolved} onClick={() => onDecision(candidate.id, action)}
                >{actionLabel[action]}</button>)}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="uix-visually-hidden" aria-live="polite">{announcement}</p>
    </section>
  );
}
