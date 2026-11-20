"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from '../components/Dialogs.js';
import { DEFAULT_DISCARD_LABELS } from '../components/DiscardPrompt.js';
import type { DiscardPromptLabels } from '../components/DiscardPrompt.js';
import type { SaveStatusState } from '../components/SaveStatus.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { joinList } from '../list-format.js';

/**
 * The words the leave step adds to the "Discard changes?" ones (`discardPrompt`), which give its
 * title, its buttons and the plain description.
 */
export interface LeaveGuardLabels {
  /** The description when `fields` names what is at risk; `{fields}` is the list, e.g. "Impact and Description". */
  fieldsAtRisk: string;
  /** The description while a save is still running. */
  saving: string;
  /** The description after the last save failed. */
  failed: string;
}

export const DEFAULT_LEAVE_GUARD_LABELS: LeaveGuardLabels = {
  fieldsAtRisk: 'Your changes to {fields} will be lost.',
  saving: 'Your changes are still being saved. If you leave now, they may be lost.',
  failed: 'Your last changes were not saved. If you leave now, they will be lost.',
};

export interface UseLeaveGuardOptions {
  /** There is input that is not saved. */
  dirty?: boolean;
  /**
   * The save's state, as `SaveStatus` shows it: `saving` and `failed` keep the guard on even when
   * nothing is dirty any more, `saved` and `idle` leave it to `dirty`. So an autosaved form only
   * asks while a save is running or failed, never once it is saved.
   */
  saveState?: SaveStatusState;
  /** The names of the fields with unsaved changes, for the description: "Your changes to Impact and Description will be lost." */
  fields?: readonly string[];
  /** The locale that joins `fields` ("A, B and C"). Default: the browser's. */
  locale?: string;
  /** Each word defaults to `UixLabelsProvider` `discardPrompt` / `leaveGuard`, then English. */
  labels?: Partial<DiscardPromptLabels & LeaveGuardLabels>;
}

export interface LeaveGuardApi {
  /** Whether leaving now would lose work: `dirty`, or a save `saving` or `failed`. */
  active: boolean;
  /**
   * The hook point for in-app navigation, whatever the router. Inactive: runs `proceed` at once.
   * Active: asks "Discard changes?" with focus on "Keep editing"; "Discard" runs `proceed`,
   * "Keep editing" (or Escape) runs `stay`. A second call while it asks replaces the first, whose
   * `stay` runs. If nothing is at risk any more while it asks (the save finished), `proceed` runs.
   * Returns whether it proceeded at once.
   */
  confirm: (proceed: () => void, stay?: () => void) => boolean;
  /** The step. Render it once, anywhere in the page. */
  dialog: ReactNode;
}

/**
 * Asks before a page with unsaved work is left (the UIx enterprise UX study, forms notes section 4).
 *
 * - Reload, close and links that leave the app get the browser's own "Leave site?" prompt
 *   (`beforeunload`; browsers show their own words, never the page's).
 * - In-app navigation goes through `confirm(proceed, stay)`, which every router can call: a React
 *   Router blocker (`if (blocker.state === 'blocked') leave.confirm(blocker.proceed, blocker.reset)`),
 *   or a link's click handler that prevents the click and navigates in `proceed`.
 *
 * Armed only while there is something to lose, so an autosaved form does not cry wolf.
 */
export function useLeaveGuard({ dirty = false, saveState, fields, locale, labels: labelsProp }: UseLeaveGuardOptions = {}): LeaveGuardApi {
  const uix = useUixLabels();
  const labels = { ...DEFAULT_DISCARD_LABELS, ...DEFAULT_LEAVE_GUARD_LABELS, ...uix.discardPrompt, ...uix.leaveGuard, ...labelsProp };
  const active = dirty || saveState === 'saving' || saveState === 'failed';
  const [asking, setAskingState] = useState<{ proceed: () => void; stay?: () => void } | null>(null);
  /** The attempt being asked about, at once: a second `confirm` in the same task must see it. */
  const askingRef = useRef<{ proceed: () => void; stay?: () => void } | null>(null);
  const setAsking = useCallback((next: { proceed: () => void; stay?: () => void } | null) => {
    askingRef.current = next;
    setAskingState(next);
  }, []);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older Chromium and Safari still need returnValue set to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  const confirm = useCallback((proceed: () => void, stay?: () => void) => {
    if (!activeRef.current) { proceed(); return true; }
    // A newer attempt replaces the one being asked about, which is told to stay (a router's blocker
    // resets), so no attempt is ever left waiting for an answer.
    const earlier = askingRef.current;
    setAsking({ proceed, stay });
    earlier?.stay?.();
    return false;
  }, [setAsking]);

  // Nothing left to lose (the save finished while asking): the step has no question any more.
  useEffect(() => {
    if (!active && asking) {
      const { proceed } = asking;
      setAsking(null);
      proceed();
    }
  }, [active, asking, setAsking]);

  const description = saveState === 'saving' ? labels.saving
    : saveState === 'failed' ? labels.failed
      : fields?.length ? fillLabel(labels.fieldsAtRisk, { fields: joinList(fields, locale) })
        : labels.description;

  const dialog = (
    <ConfirmDialog
      open={asking != null}
      title={labels.title}
      description={description}
      confirmLabel={labels.discard}
      cancelLabel={labels.keepEditing}
      destructive
      onConfirm={() => {
        const next = asking;
        setAsking(null);
        next?.proceed();
      }}
      onCancel={() => {
        const next = asking;
        setAsking(null);
        next?.stay?.();
      }}
    />
  );

  return { active, confirm, dialog };
}
