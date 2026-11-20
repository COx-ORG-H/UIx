"use client";

import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import type { AiLabels } from '../ai-labels.js';
import { useAiLabels } from './AiLabel.js';

export interface AiActorProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The AI's scoped identity, as the product names it: "Assist", "Triage agent". */
  name: string;
  /**
   * The person who approved what the AI proposed. With it the entry reads "Proposed by Assist (AI),
   * approved by Ana"; without it, "Assist (AI)": something the AI did on its own (a low-band
   * auto-apply), which the audit trail must still show as the AI's.
   */
  approvedBy?: ReactNode;
  labels?: Partial<AiLabels>;
}

const ROBOT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="4" y="6" width="16" height="13" rx="3" />
    <path d="M12 2v4M9 12h.01M15 12h.01M9.5 16h5" />
  </svg>
);

/**
 * The AI as an actor in an audit or activity entry (Halo's scoped AI identities): a robot mark,
 * the AI's name with an "AI" tag, and the human approver when there was one. Pass it as
 * `AuditLog`'s `actor`, or in a `Timeline` row. AI work is never shown under a person's name alone
 * (Apple HIG: never let AI content pass as human-authored).
 */
export function AiActor({ name, approvedBy, labels: own, className, ...props }: AiActorProps) {
  const labels = useAiLabels(own);
  const approved = approvedBy != null && approvedBy !== false;
  const actor = (
    <>
      <span className="uix-ai-actor__name">{name}</span>
      <span className="uix-ai-label">{labels.actorTag}</span>
    </>
  );
  return (
    <span className={cx('uix-ai-actor', className)} {...props}>
      <span className="uix-ai-actor__mark">{ROBOT}</span>
      {approved ? (
        <span className="uix-ai-actor__text">
          {around(labels.proposedBy, actor)}
          {', '}
          {around(labels.approvedBy, <span className="uix-ai-actor__approver">{approvedBy}</span>)}
        </span>
      ) : actor}
    </span>
  );
}

/** A template's words around `{name}`, with a node in its place, so a translation can move it. */
function around(template: string, node: ReactNode): ReactNode {
  const at = template.indexOf('{name}');
  if (at < 0) return <>{template} {node}</>;
  return <>{template.slice(0, at)}{node}{template.slice(at + '{name}'.length)}</>;
}
