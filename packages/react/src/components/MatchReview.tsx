"use client";

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { JsonValue } from '../json-value.js';
import { cx } from '../cx.js';
import { StatusPill } from './StatusPill.js';

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
}

const valueText = (value: JsonValue | undefined) => value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value);

/** Generic descriptor-driven incoming-record to candidate-match decision surface. */
export function MatchReview({
  incoming, incomingLabel = 'Incoming record', fields, candidates, selectedIds,
  onSelectionChange, onDecision, onBulkDecision, loading, error, onRetry, className,
}: MatchReviewProps) {
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
    setAnnouncement(`${action === 'accept' ? 'Accepting' : 'Dismissing'} ${ids.length} candidate${ids.length === 1 ? '' : 's'}…`);
    try {
      const result = await onBulkDecision(ids, action);
      const succeeded = result?.succeeded ?? ids.length;
      const failed = result?.failed ?? 0;
      setAnnouncement(`${succeeded} candidate${succeeded === 1 ? '' : 's'} ${action === 'accept' ? 'accepted' : 'dismissed'}${failed ? `; ${failed} failed` : ''}.`);
      if (!failed) setSelection(new Set());
    } catch {
      setAnnouncement(`Bulk ${action} failed. Try again.`);
    } finally {
      setBulkPending(false);
    }
  };

  if (loading) return <div className={cx('uix-match-review uix-match-review--state', className)} role="status">Loading match candidates…</div>;
  if (error) return <div className={cx('uix-match-review uix-match-review--state', className)} role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>Try again</button>}</div>;
  if (candidates.length === 0) return <div className={cx('uix-match-review uix-match-review--state', className)}><p>No candidate matches found.</p><p>Choose another record source or continue without a match.</p></div>;

  return (
    <section className={cx('uix-match-review', className)} aria-label="Match review">
      <div className="uix-match-review__summary">
        <div><strong>{incomingLabel}</strong><span>{pending.length} pending of {candidates.length}</span></div>
        <div className="uix-match-review__incoming">
          {fields.map((field) => <span key={field.id}><b>{field.label}</b>{field.render?.(incoming[field.id], incoming) ?? valueText(incoming[field.id])}</span>)}
        </div>
      </div>
      {onBulkDecision && (
        <div className="uix-match-review__bulk" aria-label="Bulk candidate actions">
          <span>{selection.size} selected</span>
          <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" disabled={selection.size === 0 || bulkPending} onClick={() => void runBulk('accept')}>{bulkPending ? 'Applying…' : 'Accept selected'}</button>
          <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" disabled={selection.size === 0 || bulkPending} onClick={() => void runBulk('dismiss')}>{bulkPending ? 'Applying…' : 'Dismiss selected'}</button>
        </div>
      )}
      <div className="uix-match-review__table-wrap">
        <table className="uix-table uix-match-review__table">
          <caption className="uix-visually-hidden">Candidate matches and available decisions</caption>
          <thead><tr>
            <th scope="col"><span className="uix-visually-hidden">Select</span></th>
            <th scope="col">Confidence</th>
            {fields.map((field) => <th scope="col" key={field.id}>{field.label}</th>)}
            <th scope="col">Status</th><th scope="col">Actions</th>
          </tr></thead>
          <tbody>{candidates.map((candidate) => {
            const resolved = candidate.status === 'resolved';
            return <tr key={candidate.id} data-status={candidate.status ?? 'pending'}>
              <td><input type="checkbox" checked={selection.has(candidate.id)} onChange={() => toggle(candidate.id)} aria-label={`Select candidate ${candidate.id}`} /></td>
              <td><span className="uix-match-review__confidence">{candidate.confidence == null ? 'Not scored' : `${Math.round(candidate.confidence * 100)}%`}</span></td>
              {fields.map((field) => <td key={field.id}>{field.render?.(candidate.record[field.id], candidate.record) ?? valueText(candidate.record[field.id])}</td>)}
              <td><StatusPill tone={resolved ? 'success' : 'warning'}>{resolved ? candidate.decision ?? 'Resolved' : 'Pending'}</StatusPill></td>
              <td><div className="uix-match-review__actions">
                {(['accept', 'dismiss', 'split', 'pick-other'] as const).map((action) => <button
                  key={action} type="button" className="uix-btn uix-btn--ghost uix-btn--sm"
                  disabled={resolved} onClick={() => onDecision(candidate.id, action)}
                >{action === 'pick-other' ? 'Pick other' : `${action[0]!.toUpperCase()}${action.slice(1)}`}</button>)}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="uix-visually-hidden" aria-live="polite">{announcement}</p>
    </section>
  );
}
