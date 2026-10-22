"use client";

import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { JsonValue } from '../json-value.js';
import { cx } from '../cx.js';
import { StatusPill } from './StatusPill.js';
import { Button } from './Button.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';

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
  /** Adopt mode (HAR-1369): a candidate's heading when `candidateLabel` gives none. `{id}`. */
  candidate: string;
  /** Adopt mode: the compare table's caption. `{candidate}`. */
  compareCaption: string;
  field: string;
  /** Adopt mode: the column of the record as it is now. */
  currentValue: string;
  /** Adopt mode: the column of the candidate's values. */
  candidateValue: string;
  /** Adopt mode: the column of checkboxes. */
  adopt: string;
  /** Adopt mode: one checkbox's name. `{field}`, `{candidate}`. */
  adoptField: string;
  /** Adopt mode: shown instead of a checkbox when the candidate has the same value. */
  same: string;
  /** Adopt mode: the button. `{count}` fields chosen. */
  adoptSelected: string;
  /** Adopt mode: the provenance disclosure. */
  provenance: string;
  /** Adopt mode: announced after `onAdopt` resolves. `{count}`, `{candidate}`. */
  adopted: string;
  /** Adopt mode: shown when `onAdopt` rejects. */
  adoptFailed: string;
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
  candidate: 'Candidate {id}',
  compareCaption: '{candidate}: the record now and the candidate, field by field',
  field: 'Field',
  currentValue: 'Now',
  candidateValue: 'Candidate',
  adopt: 'Adopt',
  adoptField: 'Adopt {field} from {candidate}',
  same: 'Same',
  adoptSelected: 'Adopt {count} fields',
  provenance: 'Where this candidate comes from',
  adopted: '{count} fields adopted from {candidate}',
  adoptFailed: 'Could not adopt the fields. Try again.',
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
  /**
   * `decide` (default): one row per candidate, decided as a whole. `adopt` (HAR-1369, MOTUS B-A9
   * registry candidates): per candidate a table of the record now against the candidate, field
   * by field, a checkbox per field that differs, and an Adopt button that calls `onAdopt`.
   */
  fieldMode?: 'decide' | 'adopt';
  /** Adopt mode: take the chosen fields from the candidate. A promise keeps the button busy until it settles. */
  onAdopt?: (candidateId: string, fieldIds: string[]) => void | Promise<unknown>;
  /** Adopt mode: the candidate's heading, e.g. its source ("DNB", "Wikidata"). Default `labels.candidate`. */
  candidateLabel?: (candidate: MatchReviewCandidate) => ReactNode;
  /** Adopt mode: where a candidate comes from, in a disclosure under its table (source, retrieved, match reason). */
  provenance?: (candidate: MatchReviewCandidate) => ReactNode;
}

const valueText = (value: JsonValue | undefined) => value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value);

/** Generic descriptor-driven incoming-record to candidate-match decision surface. */
export function MatchReview({
  incoming, incomingLabel = 'Incoming record', fields, candidates, selectedIds,
  onSelectionChange, onDecision, onBulkDecision, loading, error, onRetry, className, labels: labelOverrides,
  fieldMode = 'decide', onAdopt, candidateLabel, provenance,
}: MatchReviewProps) {
  const labels: MatchReviewLabels = { ...DEFAULT_MATCH_REVIEW_LABELS, ...useUixLabels().matchReview, ...labelOverrides };
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

  if (fieldMode === 'adopt') {
    return (
      <section className={cx('uix-match-review', 'uix-match-review--adopt', className)} aria-label={labels.region}>
        <div className="uix-match-review__summary">
          <div><strong>{incomingLabel}</strong><span>{fillLabel(labels.pendingOf, { pending: pending.length, total: candidates.length })}</span></div>
        </div>
        {candidates.map((candidate) => (
          <AdoptCandidate
            key={candidate.id} candidate={candidate} incoming={incoming} fields={fields} labels={labels}
            heading={candidateLabel?.(candidate) ?? fillLabel(labels.candidate, { id: candidate.id })}
            provenance={provenance?.(candidate)} onAdopt={onAdopt} onDecision={onDecision} decisionLabel={decisionLabel}
          />
        ))}
      </section>
    );
  }

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

const sameValue = (a: JsonValue | undefined, b: JsonValue | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** A pending visual only for work that takes 300 ms or more, so a fast answer never flashes one. */
function useSlow(pending: boolean) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 300);
    return () => clearTimeout(timer);
  }, [pending]);
  return slow;
}

/** One candidate in adopt mode: the record now against the candidate, a checkbox per differing field. */
function AdoptCandidate({ candidate, incoming, fields, labels, heading, provenance, onAdopt, onDecision, decisionLabel }: {
  candidate: MatchReviewCandidate; incoming: Record<string, JsonValue>; fields: MatchReviewField[]; labels: MatchReviewLabels;
  heading: ReactNode; provenance: ReactNode; onAdopt?: MatchReviewProps['onAdopt']; onDecision: MatchReviewProps['onDecision'];
  decisionLabel: Record<'accepted' | 'dismissed' | 'split' | 'other', string>;
}) {
  const id = useId();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const slow = useSlow(pending);
  const resolved = candidate.status === 'resolved';
  const headingText = typeof heading === 'string' ? heading : fillLabel(labels.candidate, { id: candidate.id });
  const toggle = (fieldId: string, on: boolean) => {
    if (pending) return;
    const next = new Set(chosen);
    if (on) next.add(fieldId); else next.delete(fieldId);
    setChosen(next);
    setMessage(null);
  };
  const adopt = async () => {
    if (!onAdopt || chosen.size === 0 || pending) return;
    const fieldIds = fields.map((f) => f.id).filter((f) => chosen.has(f));
    setPending(true);
    setMessage(null);
    try {
      await onAdopt(candidate.id, fieldIds);
      setChosen(new Set());
      setMessage({ text: fillLabel(labels.adopted, { count: fieldIds.length, candidate: headingText }), failed: false });
    } catch {
      setMessage({ text: labels.adoptFailed, failed: true });
    } finally {
      setPending(false);
    }
  };
  const show = (field: MatchReviewField, record: Record<string, JsonValue>) => field.render?.(record[field.id], record) ?? valueText(record[field.id]);
  return (
    <section className="uix-match-review__candidate" aria-labelledby={`${id}-heading`} data-status={candidate.status ?? 'pending'}>
      <div className="uix-match-review__candidate-head">
        <h3 id={`${id}-heading`} className="uix-match-review__candidate-title">{heading}</h3>
        {candidate.confidence != null && <span className="uix-match-review__confidence">{`${Math.round(candidate.confidence * 100)}%`}</span>}
        {resolved && <StatusPill tone="success">{candidate.decision ? decisionLabel[candidate.decision] : labels.resolved}</StatusPill>}
      </div>
      <div className="uix-match-review__table-wrap">
        {/* Explicit roles: on a phone the rows stack as blocks (CSS), and a table whose display
            changes loses its table semantics in some browsers unless the roles are written out. */}
        <table className="uix-table uix-match-review__compare" role="table">
          <caption className="uix-visually-hidden">{fillLabel(labels.compareCaption, { candidate: headingText })}</caption>
          <thead role="rowgroup"><tr role="row">
            <th role="columnheader" scope="col">{labels.field}</th><th role="columnheader" scope="col">{labels.currentValue}</th><th role="columnheader" scope="col">{labels.candidateValue}</th><th role="columnheader" scope="col">{labels.adopt}</th>
          </tr></thead>
          <tbody role="rowgroup">{fields.map((field) => {
            const same = sameValue(incoming[field.id], candidate.record[field.id]);
            return (
              <tr role="row" key={field.id} data-differs={same ? undefined : ''} data-chosen={chosen.has(field.id) || undefined}>
                <th role="rowheader" scope="row">{field.label}</th>
                <td role="cell" data-label={labels.currentValue}>{show(field, incoming)}</td>
                <td role="cell" data-label={labels.candidateValue}>{show(field, candidate.record)}</td>
                <td role="cell">{same
                  ? <span className="uix-match-review__same">{labels.same}</span>
                  : <input
                      type="checkbox" className="uix-match-review__adopt" checked={chosen.has(field.id)} disabled={resolved}
                      aria-label={fillLabel(labels.adoptField, { field: field.label, candidate: headingText })}
                      onChange={(event) => toggle(field.id, event.currentTarget.checked)}
                    />}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {provenance != null && provenance !== false && (
        <details className="uix-match-review__provenance">
          <summary>{labels.provenance}</summary>
          <div className="uix-match-review__provenance-body">{provenance}</div>
        </details>
      )}
      {!resolved && <div className="uix-match-review__candidate-actions">
        {onAdopt && <Button size="sm" variant="primary" disabled={chosen.size === 0} loading={slow} onClick={() => void adopt()}>{fillLabel(labels.adoptSelected, { count: chosen.size })}</Button>}
        <Button size="sm" variant="ghost" onClick={() => { if (!pending) onDecision(candidate.id, 'dismiss'); }}>{labels.dismiss}</Button>
        <span className={cx('uix-match-review__result', message?.failed && 'uix-match-review__result--failed')} role="status">{message?.text}</span>
      </div>}
    </section>
  );
}
