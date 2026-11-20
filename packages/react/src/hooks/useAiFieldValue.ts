"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { emitProposalEvent } from '../ai-events.js';
import type { AiExplanation } from '../components/AiLabel.js';
import type { FieldAi } from '../components/Field.js';

export interface UseAiFieldValueOptions<T> {
  /** The value the AI filled in. `undefined`: there is none (yet), and the field is a plain one. */
  aiValue: T | undefined;
  /** The product's id for this proposal (`INC-1042:category`). A new id is a new proposal: the field takes its value again. */
  proposalId: string;
  /** The product's id for the kind of proposal (`incident.category`). */
  type?: string;
  /** The value before any AI value arrived, or when there is none. */
  initialValue: T;
  /** What the AI mark opens. */
  explanation?: AiExplanation;
  /** Are two values the same? Default `Object.is`. */
  equals?: (a: T, b: T) => boolean;
}

export interface UseAiFieldValueResult<T> {
  /** The control's value. */
  value: T;
  /** Set it from the control's change handler. */
  setValue: (value: T) => void;
  /** `filled`: it holds the AI value. `edited`: a person changed it. `none`: there is no AI value. */
  state: 'filled' | 'edited' | 'none';
  /** Put the AI value back. */
  revert: () => void;
  /**
   * Call when the form is saved: reports `accepted` if the saved value is still the AI value (an
   * edited one was already reported as `edited`). Acceptance is measured where it happens: on save.
   */
  commit: () => void;
  /** Pass to `<Field ai={…}>`: the AI mark, the review state and "Revert to AI". */
  ai: FieldAi | undefined;
}

/**
 * The value behind an AI-filled field (Carbon for AI's variant model). The AI fills it; it shows
 * the AI mark and the "check this" review state (`Input review`). Once a person edits it, it is
 * theirs: the mark goes, and "Revert to AI" brings the AI value back. Reports `shown`, `edited`,
 * `reverted` and, through `commit()`, `accepted` on the `uix-proposal` event; never the value.
 */
export function useAiFieldValue<T>({
  aiValue, proposalId, type, initialValue, explanation, equals = Object.is,
}: UseAiFieldValueOptions<T>): UseAiFieldValueResult<T> {
  const [value, setRaw] = useState<T>(aiValue !== undefined ? aiValue : initialValue);
  const base = { proposalId, kind: 'field' as const, ...(type !== undefined ? { type } : {}) };
  const baseRef = useRef(base);
  baseRef.current = base;
  /** The proposal the field last took a value from. */
  const took = useRef<string | null>(aiValue !== undefined ? proposalId : null);
  const reportedEdit = useRef(false);
  const shownFor = useRef<string | null>(null);

  // a new proposal (or the first AI value arriving) fills the field
  useEffect(() => {
    if (aiValue === undefined || took.current === proposalId) return;
    took.current = proposalId;
    reportedEdit.current = false;
    setRaw(aiValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId, aiValue === undefined]);

  useEffect(() => {
    if (aiValue === undefined || shownFor.current === proposalId) return;
    shownFor.current = proposalId;
    emitProposalEvent({ ...baseRef.current, action: 'shown' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId, aiValue === undefined]);

  const state: UseAiFieldValueResult<T>['state'] = aiValue === undefined ? 'none' : equals(value, aiValue) ? 'filled' : 'edited';

  const setValue = useCallback((next: T) => {
    setRaw(next);
    if (aiValue !== undefined && !equals(next, aiValue) && !reportedEdit.current) {
      reportedEdit.current = true;
      emitProposalEvent({ ...baseRef.current, action: 'edited' });
    }
  }, [aiValue, equals]);

  const revert = useCallback(() => {
    if (aiValue === undefined) return;
    setRaw(aiValue);
    reportedEdit.current = false;
    emitProposalEvent({ ...baseRef.current, action: 'reverted' });
  }, [aiValue]);

  const commit = useCallback(() => {
    if (aiValue !== undefined && equals(value, aiValue)) emitProposalEvent({ ...baseRef.current, action: 'accepted' });
  }, [aiValue, equals, value]);

  const ai: FieldAi | undefined = state === 'none'
    ? undefined
    : { state, explanation, onRevert: revert };

  return { value, setValue, state, revert, commit, ai };
}
