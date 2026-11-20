"use client";

import { forwardRef, useEffect, useId, useMemo, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { joinList } from '../list-format.js';
import { mergeRecordConflict, recordConflictChanges, recordConflictEntries } from '../conflict-model.js';
import type { RecordConflictChange } from '../conflict-model.js';
import type { DiffResolution } from '../diff-model.js';
import type { JsonValue } from '../json-value.js';
import { Alert } from './Alert.js';
import { Button } from './Button.js';
import { DiffViewer } from './DiffViewer.js';
import type { DiffSide } from './DiffViewer.js';

/** Every word of a `ConflictNotice`. `{name}`, `{time}` and `{fields}` are filled in. */
export interface ConflictNoticeLabels {
  /** The title when nobody is named. */
  title: string;
  /** The title with `changedBy`. */
  titleBy: string;
  /** The title with `changedBy` and `changedAt`. */
  titleByAt: string;
  /** That the person's input is still there. */
  kept: string;
  /** Before the list of the fields the other person changed. */
  changed: string;
  /** When both changed a field: what Reload does there, and where to choose. `{fields}` is the list. */
  overlap: string;
  /** Opens the field-by-field comparison. */
  review: string;
  /** Takes the latest saved record, with the person's other changes kept. */
  reload: string;
  /** Throws the person's changes away. */
  discard: string;
  /** Applies the choices made in the comparison. */
  apply: string;
  /** Next to a disabled Apply while a field both changed has no choice yet. */
  choosePending: string;
  /** The comparison's name. */
  region: string;
  /** The version names in the comparison. */
  base: string;
  yours: string;
  theirs: string;
  /** The comparison's buttons; `{path}` is the field's name. */
  useTheirs: string;
  keepYours: string;
  useTheirsFor: string;
  keepYoursFor: string;
}

export const DEFAULT_CONFLICT_NOTICE_LABELS: ConflictNoticeLabels = {
  title: 'Changed by someone else while you were editing',
  titleBy: '{name} changed this while you were editing',
  titleByAt: '{name} changed this at {time} while you were editing',
  kept: 'Your changes are not saved yet, and they are still here.',
  changed: 'Changed:',
  overlap: 'You both changed {fields}. Reload latest takes their version there; review the changes to keep yours.',
  review: 'Review changes',
  reload: 'Reload latest',
  discard: 'Discard my changes',
  apply: 'Apply',
  choosePending: 'Choose a version for each field you both changed.',
  region: 'Changes to review',
  base: 'When you started',
  yours: 'Yours',
  theirs: 'Latest',
  useTheirs: 'Use latest',
  keepYours: 'Keep yours',
  useTheirsFor: 'Use latest for {path}',
  keepYoursFor: 'Keep yours for {path}',
};

export interface ConflictNoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** The record when editing started (its version the save was based on). */
  base: JsonValue;
  /** The record as the form holds it now. */
  yours: JsonValue;
  /** The record someone else saved: what the server returned with its 409 / 412. */
  theirs: JsonValue;
  /** Who saved it, e.g. "Alex Novak". */
  changedBy?: string;
  /** When, already formatted for the reader, e.g. "14:02". */
  changedAt?: string;
  /** A field's name from its path (`$.priority`). Default: the key itself. */
  labelFor?: (path: string) => ReactNode;
  /** How a value shows in the comparison (a name for an id, a date). See `DiffViewer`. */
  renderValue?: (value: JsonValue | undefined, path: string, side: DiffSide) => ReactNode;
  /**
   * Reload latest: continue from their record with every change of yours kept (where you both
   * changed a field, theirs). Load `merged` into the form and the new version as its base.
   */
  onReload: (merged: JsonValue | undefined) => void;
  /**
   * Apply the comparison's choices: `merged` is their record with your changes kept, and yours
   * where you chose "Keep yours". Without it the comparison only shows what changed.
   */
  onApply?: (merged: JsonValue | undefined, resolutions: Record<string, DiffResolution>) => void;
  /** Offer "Discard my changes" (load their record, drop yours). */
  onDiscard?: () => void;
  /** Open the comparison at first (default: when you both changed a field). */
  defaultReviewing?: boolean;
  labels?: Partial<ConflictNoticeLabels>;
}

const keyOf = (path: string) => (path === '$' ? path : path.replace(/^\$\./, ''));

/**
 * "Changed by someone else while you were editing" (the UIx enterprise UX study, forms notes
 * section 3): a banner, not a toast, when a save comes back 409 / 412. It says who and when,
 * keeps the person's input, names the fields the other person changed, and offers Reload latest
 * (their record, with the person's changes kept) and a review in `DiffViewer`, field by field,
 * where only the fields both changed need a choice. The ref is the banner: give focus to it when
 * the conflict arrives from a submit.
 */
export const ConflictNotice = forwardRef<HTMLDivElement, ConflictNoticeProps>(function ConflictNotice({
  base, yours, theirs, changedBy, changedAt, labelFor, renderValue, onReload, onApply, onDiscard,
  defaultReviewing, labels: labelsProp, className, ...props
}, ref) {
  const labels: ConflictNoticeLabels = { ...DEFAULT_CONFLICT_NOTICE_LABELS, ...useUixLabels().conflictNotice, ...labelsProp };
  const id = useId();
  const changes = useMemo(() => recordConflictChanges(base, yours, theirs), [base, yours, theirs]);
  const overlapping = changes.filter((change) => change.overlap);
  const [reviewing, setReviewing] = useState(defaultReviewing ?? overlapping.length > 0);
  /** Their change to a field you left alone is taken; a field you both changed waits for a choice. */
  const seeded = (list: readonly RecordConflictChange[]) => Object.fromEntries(list.map((change) => [change.path, (change.overlap ? 'pending' : 'accept') as DiffResolution]));
  const [resolutions, setResolutions] = useState<Record<string, DiffResolution>>(() => seeded(changes));
  const signature = changes.map((change) => `${change.path}:${change.overlap}`).join('|');
  // A new conflict (another save arrived) starts the choices again.
  useEffect(() => { setResolutions(seeded(changes)); }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = (path: string): ReactNode => labelFor?.(path) ?? keyOf(path);
  const textOf = (path: string): string => {
    const node = nameOf(path);
    return typeof node === 'string' || typeof node === 'number' ? String(node) : keyOf(path);
  };
  const title = changedBy && changedAt ? fillLabel(labels.titleByAt, { name: changedBy, time: changedAt })
    : changedBy ? fillLabel(labels.titleBy, { name: changedBy }) : labels.title;
  const pending = overlapping.some((change) => (resolutions[change.path] ?? 'pending') === 'pending');
  const reviewId = `${id}-review`;
  const pendingId = `${id}-pending`;

  return (
    <div className={cx('uix-conflict-notice', className)} data-uix-conflict-notice="">
      <Alert
        ref={ref}
        tone="warning"
        tabIndex={-1}
        title={title}
        {...props}
        actions={(
          <>
            {changes.length > 0 && (
              <Button size="sm" aria-expanded={reviewing} aria-controls={reviewId} onClick={() => setReviewing((open) => !open)}>
                {labels.review}
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={() => onReload(mergeRecordConflict(base, yours, theirs))}>{labels.reload}</Button>
            {onDiscard && <Button size="sm" variant="ghost" onClick={onDiscard}>{labels.discard}</Button>}
          </>
        )}
      >
        <p className="uix-conflict-notice__line">{labels.kept}</p>
        {changes.length > 0 && (
          <p className="uix-conflict-notice__line">
            <span>{labels.changed}</span>
            {' '}
            <span className="uix-conflict-notice__fields">
              {changes.map((change) => <span key={change.path} className="uix-conflict-notice__field" data-overlap={change.overlap || undefined}>{nameOf(change.path)}</span>)}
            </span>
          </p>
        )}
        {overlapping.length > 0 && (
          <p className="uix-conflict-notice__line">{fillLabel(labels.overlap, { fields: joinList(overlapping.map((change) => textOf(change.path))) })}</p>
        )}
      </Alert>
      {changes.length > 0 && (
        <div id={reviewId} className="uix-conflict-notice__review" hidden={!reviewing}>
          {reviewing && (
            <>
              <DiffViewer
                entries={recordConflictEntries(changes)}
                resolutions={resolutions}
                onResolutionChange={(path, resolution) => setResolutions((current) => ({ ...current, [path]: resolution }))}
                labelFor={nameOf}
                renderValue={renderValue}
                labels={{
                  region: labels.region,
                  base: labels.base,
                  current: labels.yours,
                  incoming: labels.theirs,
                  acceptIncoming: labels.useTheirs,
                  keepCurrent: labels.keepYours,
                  acceptIncomingFor: labels.useTheirsFor,
                  keepCurrentFor: labels.keepYoursFor,
                }}
              />
              {onApply && (
                <div className="uix-conflict-notice__apply">
                  <Button
                    size="sm"
                    variant="primary"
                    aria-disabled={pending || undefined}
                    aria-describedby={pending ? pendingId : undefined}
                    onClick={() => { if (!pending) onApply(mergeRecordConflict(base, yours, theirs, resolutions), resolutions); }}
                  >
                    {labels.apply}
                  </Button>
                  {pending && <span id={pendingId} className="uix-conflict-notice__pending">{labels.choosePending}</span>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});
