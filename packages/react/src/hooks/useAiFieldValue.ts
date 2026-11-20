"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { emitProposalEvent } from '../ai-events.js';
import type { AiExplanation } from '../components/AiLabel.js';
import type { FieldAi } from '../components/Field.js';

export interface UseAiFieldValueOptions<T> {
  /**
   * The value the AI filled in. `undefined`: there is none (yet), and the field is a plain one.
   * Going back to `undefined` withdraws it: an untouched AI value is taken out again.
   */
  aiValue: T | undefined;
  /** The product's id for this proposal (`INC-1042:category`). A new id is a new proposal: the field takes its value again. */
  proposalId: string;
  /** The product's key for the kind of proposal (`incident.category`). */
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
  /**
   * `filled`: it holds the AI value. `edited`: a person changed it (or typed before the AI value
   * arrived): it is theirs, and "Revert to AI" offers the AI value. `none`: there is no AI value.
   */
  state: 'filled' | 'edited' | 'none';
  /** Put the AI value in. */
  revert: () => void;
  /**
   * Call when the form is saved: reports `accepted` if the saved value is the AI value (an edited
   * one was already reported as `edited`). It reads the value set last, so a save handler may set
   * or normalise the value and commit in the same event.
   */
  commit: () => void;
  /** Pass to `<Field ai={…}>`: the AI mark, the review state and "Revert to AI". */
  ai: FieldAi | undefined;
}

/**
 * The value behind an AI-filled field (Carbon for AI's variant model). The AI fills it; it shows
 * the AI mark and the "check this" review state (`Input review`). Once a person edits it, it is
 * theirs: the mark goes, and "Revert to AI" brings the AI value back.
 *
 * It never takes away what a person typed: an AI value that arrives after they changed the field
 * is offered through "Revert to AI", not written over their text. And an AI value is never left
 * looking like theirs: when the AI value is withdrawn (`aiValue` back to `undefined`) while the
 * field still holds it, the field goes back to `initialValue`.
 *
 * Reports `shown`, `edited`, `reverted` and, through `commit()`, `accepted` on the `uix-proposal`
 * event; never the value.
 */
export function useAiFieldValue<T>({
  aiValue, proposalId, type, initialValue, explanation, equals = Object.is,
}: UseAiFieldValueOptions<T>): UseAiFieldValueResult<T> {
  const [value, setRaw] = useState<T>(aiValue !== undefined ? aiValue : initialValue);
  /** The value set last, synchronously: what `commit()` compares, ahead of the re-render. */
  const current = useRef<T>(value);
  const write = (next: T) => { current.current = next; setRaw(next); };
  const base = { proposalId, kind: 'field' as const, ...(type !== undefined ? { type } : {}) };
  const baseRef = useRef(base);
  baseRef.current = base;
  const latest = useRef({ aiValue, initialValue, equals });
  latest.current = { aiValue, initialValue, equals };
  /** The proposal the field last took (or was offered) a value from, and that value. */
  const took = useRef<string | null>(aiValue !== undefined ? proposalId : null);
  const filledWith = useRef<{ value: T } | null>(aiValue !== undefined ? { value: aiValue } : null);
  /** The person changed the field themselves since it was last filled (or before any AI value). */
  const touched = useRef(false);
  const reportedEdit = useRef(false);
  const shownFor = useRef<string | null>(null);

  // a new proposal (or the first AI value arriving) fills the field, unless the person typed
  useEffect(() => {
    const { aiValue: ai, initialValue: initial, equals: same } = latest.current;
    if (ai === undefined) {
      // withdrawn: take an untouched AI value out again, keep what the person typed
      const filled = filledWith.current;
      if (filled && same(current.current, filled.value)) write(initial);
      took.current = null;
      filledWith.current = null;
      reportedEdit.current = false;
      return;
    }
    if (took.current === proposalId) return;
    took.current = proposalId;
    reportedEdit.current = false;
    if (touched.current && !same(current.current, initial)) {
      // their text stays; the AI value waits behind "Revert to AI"
      filledWith.current = null;
      return;
    }
    touched.current = false;
    filledWith.current = { value: ai };
    write(ai);
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
    write(next);
    touched.current = true;
    const ai = latest.current.aiValue;
    if (ai !== undefined && !latest.current.equals(next, ai) && !reportedEdit.current && filledWith.current) {
      reportedEdit.current = true;
      emitProposalEvent({ ...baseRef.current, action: 'edited' });
    }
  }, []);

  const revert = useCallback(() => {
    const ai = latest.current.aiValue;
    if (ai === undefined) return;
    filledWith.current = { value: ai };
    touched.current = false;
    reportedEdit.current = false;
    write(ai);
    emitProposalEvent({ ...baseRef.current, action: 'reverted' });
  }, []);

  const commit = useCallback(() => {
    const ai = latest.current.aiValue;
    if (ai !== undefined && latest.current.equals(current.current, ai)) emitProposalEvent({ ...baseRef.current, action: 'accepted' });
  }, []);

  const ai: FieldAi | undefined = state === 'none'
    ? undefined
    : { state, explanation, onRevert: revert };

  return { value, setValue, state, revert, commit, ai };
}
