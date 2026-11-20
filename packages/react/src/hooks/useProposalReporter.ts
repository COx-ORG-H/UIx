"use client";

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { emitProposalEvent } from '../ai-events.js';
import type { ConsequenceBand, ProposalAction, ProposalKind } from '../ai-events.js';

interface ReporterBase {
  proposalId: string;
  kind: ProposalKind;
  type?: string;
  consequence?: ConsequenceBand;
}

/**
 * The kit's own use of the event seam: reports `shown` once per proposal id when the surface
 * mounts, and returns `report(action)` for everything after. Events are dispatched on `ref`'s
 * element, so they bubble from where the proposal is.
 */
export function useProposalReporter(base: ReporterBase, ref: RefObject<Element | null>) {
  const latest = useRef(base);
  latest.current = base;
  const report = useCallback((action: ProposalAction, rating?: 'up' | 'down') => {
    const b = latest.current;
    emitProposalEvent({
      action, proposalId: b.proposalId, kind: b.kind,
      ...(b.type !== undefined ? { type: b.type } : {}),
      ...(b.consequence !== undefined ? { consequence: b.consequence } : {}),
      ...(rating ? { rating } : {}),
    }, ref.current?.isConnected ? ref.current : undefined);
  }, [ref]);
  // once per id: StrictMode runs effects twice, and a re-render is not a second showing
  const shownFor = useRef<string | null>(null);
  useEffect(() => {
    if (shownFor.current === base.proposalId) return;
    shownFor.current = base.proposalId;
    report('shown');
  }, [base.proposalId, report]);
  return report;
}
