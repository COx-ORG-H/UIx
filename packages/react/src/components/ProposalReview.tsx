"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import type { AiLabels } from '../ai-labels.js';
import type { ConsequenceBand } from '../ai-events.js';
import { consequencePolicy } from '../ai-events.js';
import { fillLabel } from '../fill-label.js';
import type { UixRenderLink } from '../link.js';
import { useProposalReporter } from '../hooks/useProposalReporter.js';
import { AiLabel, useAiLabels } from './AiLabel.js';
import type { AiExplanation } from './AiLabel.js';
import { Button } from './Button.js';

/** One field the proposal changes, before and after (DiffViewer's vocabulary, two versions). */
export interface ProposalChange {
  id: string;
  /** The field, for people: "State", "Resolution code". */
  label: ReactNode;
  /** The value now. Leave it out for a field that is empty now. */
  before?: ReactNode;
  /** The value once approved. */
  after: ReactNode;
}

/**
 * Where the proposal stands. `proposed`: waiting for the person. `applying`: Approve was pressed
 * and the product is writing it. `applied`: written (Undo while the window is open). `rejected`,
 * `undone`: closed. `failed`: the write did not happen; Approve and Reject are offered again.
 */
/** A second press of Approve or Reject within this many ms is the same press (a double click). */
const PRESS_LOCK_MS = 600;

export type ProposalStatus = 'proposed' | 'applying' | 'applied' | 'rejected' | 'undone' | 'failed';

export interface ProposalReviewProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  /** The product's id for this proposal, for the `uix-proposal` events. Opaque, no content. */
  proposalId: string;
  /** The product's id for the kind of proposal (`incident.resolve`). */
  type?: string;
  /** How much approving changes (see `consequencePolicy`). `high` shows "Needs your approval"; an unknown band is treated as `high`. */
  consequence: ConsequenceBand;
  /** What will happen, as one sentence: "Resolve INC-1042 as Fixed and notify the caller". */
  title: ReactNode;
  /** More about it, when the title is not enough. */
  description?: ReactNode;
  /** Every field the action changes, before and after. */
  changes?: readonly ProposalChange[];
  /** The records it touches: "INC-1042 and 3 linked incidents". */
  affected?: ReactNode;
  /** Can it be undone once applied? Required, so every proposal says it. */
  reversible: boolean;
  /** How long it can be undone, in seconds, when the backend honours only a window. */
  undoSeconds?: number;
  /** What the AI mark opens. */
  explanation?: AiExplanation;
  /** Default `proposed`. The product moves it on as the write runs. */
  status?: ProposalStatus;
  /** Why it failed, with `status="failed"`. */
  error?: ReactNode;
  onApprove: () => void;
  onReject: () => void;
  /** Edit the proposal before approving (opens the record's form). Shown when given. */
  onEdit?: () => void;
  /** Undo an applied proposal. Shown while it is reversible and within `undoSeconds`. */
  onUndo?: () => void;
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** More review content under the changes, e.g. a `DiffViewer` of a configuration. */
  children?: ReactNode;
  renderLink?: UixRenderLink;
  labels?: Partial<AiLabels>;
}

/**
 * The approval card for an action the AI proposes (enterprise-UX study: structural approval, not
 * an "Optional" review). It states what will happen, every change before and after, what it
 * touches, whether it can be undone, and the consequence band; then Approve, Edit and Reject. It
 * never approves by itself: not on mount, not on Enter, not after a timer, and it takes no
 * `autoApply`. A `high` proposal also says "Needs your approval". Reports `shown`, `accepted`
 * (Approve), `dismissed` (Reject), `edited` and `undone`.
 */
export function ProposalReview({
  proposalId, type, consequence: consequenceProp, title, description, changes, affected, reversible, undoSeconds, explanation,
  status = 'proposed', error, onApprove, onReject, onEdit, onUndo, headingLevel = 3, children, renderLink,
  labels: own, className, ...props
}: ProposalReviewProps) {
  const labels = useAiLabels(own);
  // a missing or unknown band (an untyped string from a server) fails closed: it is shown and gated as high
  const consequence = consequencePolicy(consequenceProp).band;
  const id = useId();
  const titleId = `${id}-title`;
  const ref = useRef<HTMLElement>(null);
  const report = useProposalReporter({ proposalId, kind: 'proposal', type, consequence }, ref);
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  // A double click must not approve twice, but the card must not lock up either: a product may leave
  // the status at `proposed` (Approve opened its own confirmation, which the person cancelled). So a
  // second press within PRESS_LOCK_MS of the last one is the same press; after that, it counts.
  const lastPress = useRef(-Infinity);
  // a new proposal, or the product moving this one on, takes a press at once
  useEffect(() => { lastPress.current = -Infinity; }, [proposalId, status]);
  const decide = (fn: () => void) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastPress.current < PRESS_LOCK_MS) return;
    lastPress.current = now;
    fn();
  };

  // the undo window, from the moment it is applied
  const [undoOpen, setUndoOpen] = useState(false);
  const canUndo = !!onUndo;
  useEffect(() => {
    if (status !== 'applied' || !reversible || !canUndo) { setUndoOpen(false); return undefined; }
    setUndoOpen(true);
    if (!undoSeconds || undoSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setUndoOpen(false), undoSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [status, reversible, undoSeconds, canUndo, proposalId]);

  const band = consequence === 'high' ? labels.bandHigh : consequence === 'medium' ? labels.bandMedium : labels.bandLow;
  const reversibility = !reversible
    ? labels.notUndoable
    : undoSeconds && undoSeconds > 0 ? fillLabel(labels.undoFor, { seconds: undoSeconds }) : labels.undoable;
  const statusText = status === 'applying' ? labels.applying
    : status === 'applied' ? labels.applied
    : status === 'rejected' ? labels.rejected
    : status === 'undone' ? labels.undone
    : status === 'failed' ? labels.failed
    : '';
  const open = status === 'proposed' || status === 'applying' || status === 'failed';

  return (
    <section
      ref={ref}
      className={cx('uix-proposal', className)}
      aria-labelledby={titleId}
      data-consequence={consequence}
      data-status={status}
      {...props}
    >
      <header className="uix-proposal__head">
        <AiLabel explanation={explanation} subject={typeof title === 'string' ? title : undefined} renderLink={renderLink} labels={own} />
        <Heading className="uix-proposal__title" id={titleId}>{title}</Heading>
        <span className="uix-proposal__band" data-band={consequence}>{band}</span>
      </header>
      {consequence === 'high' && open && <p className="uix-proposal__gate">{labels.needsApproval}</p>}
      {description != null && <div className="uix-proposal__description">{description}</div>}
      {changes && changes.length > 0 && (
        <table className="uix-proposal__changes">
          <caption>{labels.changes}</caption>
          <thead>
            <tr><td /><th scope="col">{labels.before}</th><th scope="col">{labels.after}</th></tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.id}>
                <th scope="row">{change.label}</th>
                <td className="uix-proposal__before">{change.before ?? '–'}</td>
                <td className="uix-proposal__after">{change.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {affected != null && (
        <p className="uix-proposal__affected"><span className="uix-proposal__key">{labels.affected}</span> {affected}</p>
      )}
      {children}
      <p className="uix-proposal__reversible" data-reversible={reversible || undefined}>{reversibility}</p>
      {status === 'failed' && error != null && <p className="uix-proposal__error" role="alert">{error}</p>}
      <div className="uix-proposal__foot">
        <p className="uix-proposal__status" role="status">{statusText}</p>
        {open && (
          <div className="uix-proposal__actions">
            <Button
              variant="primary"
              size="sm"
              loading={status === 'applying'}
              onClick={() => decide(() => { report('accepted'); onApprove(); })}
            >
              {labels.approve}
            </Button>
            {onEdit && (
              <Button variant="secondary" size="sm" disabled={status === 'applying'} onClick={() => { report('edited'); onEdit(); }}>
                {labels.edit}
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={status === 'applying'} onClick={() => decide(() => { report('dismissed'); onReject(); })}>
              {labels.reject}
            </Button>
          </div>
        )}
        {undoOpen && onUndo && (
          <div className="uix-proposal__actions">
            <Button variant="secondary" size="sm" onClick={() => { setUndoOpen(false); report('undone'); onUndo(); }}>{labels.undo}</Button>
          </div>
        )}
      </div>
    </section>
  );
}
