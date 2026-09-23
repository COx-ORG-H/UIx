"use client";

import { useId, useMemo, useState } from 'react';
import type { JsonValue } from '../json-value.js';
import { buildThreeWayDiff, summarizeDiff } from '../diff-model.js';
import type { DiffEntry, DiffKind, DiffResolution } from '../diff-model.js';
import { cx } from '../cx.js';
import { StatusPill } from './StatusPill.js';
import { fillLabel } from '../fill-label.js';

/**
 * Every word the diff viewer renders (TENSOR RX-125, UIX-12). `base` / `current` /
 * `incoming` keep their meaning from before; `{path}`, `{version}`, `{resolved}` and
 * `{total}` are placeholders.
 *
 * `acceptIncomingFor` / `keepCurrentFor` / `markPendingFor` are the accessible names of
 * the three action buttons, so a screen reader hears which entry each one resolves. Keep
 * the visible word inside the translated name (WCAG 2.5.3 Label in Name): speech-input
 * users say what they see.
 */
export interface DiffViewerLabels {
  base: string;
  current: string;
  incoming: string;
  region: string;
  summary: string;
  noDifferences: string;
  noDifferencesDetail: string;
  conflicted: string;
  changed: string;
  added: string;
  removed: string;
  resolved: string;
  pending: string;
  valueFor: string;
  resolve: string;
  acceptIncoming: string;
  keepCurrent: string;
  markPending: string;
  acceptIncomingFor: string;
  keepCurrentFor: string;
  markPendingFor: string;
  resolutionAccept: string;
  resolutionSkip: string;
  resolutionPending: string;
  notPresent: string;
  progress: string;
}

export const DEFAULT_DIFF_VIEWER_LABELS: DiffViewerLabels = {
  base: 'Base',
  current: 'Current',
  incoming: 'Incoming',
  region: 'Configuration differences',
  summary: 'Difference summary',
  noDifferences: 'No differences',
  noDifferencesDetail: 'Base, current, and incoming values are aligned.',
  conflicted: 'Conflicted',
  changed: 'Changed',
  added: 'Added',
  removed: 'Removed',
  resolved: 'resolved',
  pending: 'pending',
  valueFor: '{version} value for {path}',
  resolve: 'Resolve {path}',
  acceptIncoming: 'Accept incoming',
  keepCurrent: 'Keep current',
  markPending: 'Mark pending',
  acceptIncomingFor: 'Accept incoming for {path}',
  keepCurrentFor: 'Keep current for {path}',
  markPendingFor: 'Mark pending for {path}',
  resolutionAccept: 'accepted',
  resolutionSkip: 'kept',
  resolutionPending: 'pending',
  notPresent: 'Not present',
  progress: '{resolved} of {total} differences resolved.',
};

export interface DiffViewerProps {
  base?: JsonValue;
  current?: JsonValue;
  incoming?: JsonValue;
  entries?: DiffEntry[];
  resolutions?: Record<string, DiffResolution>;
  onResolutionChange?: (path: string, resolution: DiffResolution) => void;
  labels?: Partial<DiffViewerLabels>;
  /**
   * Height of the resolution buttons and the entry disclosure rows. `sm` (the default) is
   * the compact 28px kit size; `md` follows `--uix-control-h`, so a theme that sets its
   * own control height (for example 60px touch targets) gets it here too; `lg` is 44px.
   */
  controlSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GROUPS: DiffKind[] = ['conflicted', 'changed', 'added', 'removed'];

const renderValue = (value: JsonValue | undefined, notPresent: string) => value === undefined ? notPresent : JSON.stringify(value, null, 2);

/** Three-way configuration diff with per-entry keyboard-operable resolution. */
export function DiffViewer({
  base, current, incoming, entries: providedEntries, resolutions: controlledResolutions,
  onResolutionChange, labels: labelOverrides, controlSize = 'sm', className,
}: DiffViewerProps) {
  const labels: DiffViewerLabels = { ...DEFAULT_DIFF_VIEWER_LABELS, ...labelOverrides };
  const resolutionLabel = { accept: labels.resolutionAccept, skip: labels.resolutionSkip, pending: labels.resolutionPending } as const;
  const buttonSize = controlSize === 'md' ? undefined : `uix-btn--${controlSize}`;
  const id = useId();
  const entries = useMemo(() => providedEntries ?? buildThreeWayDiff(base, current, incoming), [providedEntries, base, current, incoming]);
  const [internalResolutions, setInternalResolutions] = useState<Record<string, DiffResolution>>({});
  const resolutions = controlledResolutions ?? internalResolutions;
  const summary = summarizeDiff(entries, resolutions);
  const resolve = (path: string, resolution: DiffResolution) => {
    if (controlledResolutions === undefined) setInternalResolutions((currentState) => ({ ...currentState, [path]: resolution }));
    onResolutionChange?.(path, resolution);
  };

  if (entries.length === 0) return <section className={cx('uix-diff-viewer uix-diff-viewer--empty', className)} aria-label={labels.region}><h3>{labels.noDifferences}</h3><p>{labels.noDifferencesDetail}</p></section>;

  return (
    <section className={cx('uix-diff-viewer', className)} aria-label={labels.region} data-control-size={controlSize}>
      <div className="uix-diff-viewer__summary" role="group" aria-label={labels.summary}>
        {GROUPS.map((kind) => <span key={kind}><b>{summary[kind]}</b> {labels[kind].toLowerCase()}</span>)}
        <span><b>{summary.resolved}</b> {labels.resolved}</span><span><b>{summary.pending}</b> {labels.pending}</span>
      </div>
      {GROUPS.map((kind) => {
        const grouped = entries.filter((entry) => entry.kind === kind);
        if (!grouped.length) return null;
        return <section key={kind} className="uix-diff-viewer__group" aria-labelledby={`${id}-${kind}`}>
          <h3 id={`${id}-${kind}`}>{labels[kind]} <span>{grouped.length}</span></h3>
          {grouped.map((entry) => {
            const resolution = resolutions[entry.path] ?? 'pending';
            return <details key={entry.path} className="uix-diff-viewer__entry" data-kind={entry.kind} open={entry.kind === 'conflicted'}>
              <summary><code>{entry.path}</code><StatusPill tone={resolution === 'pending' ? 'warning' : 'success'}>{resolutionLabel[resolution]}</StatusPill></summary>
              <div className="uix-diff-viewer__versions">
                {(['base', 'current', 'incoming'] as const).map((version) => <div key={version} role="region" aria-label={fillLabel(labels.valueFor, { version: labels[version], path: entry.path })}>
                  <strong>{labels[version]}</strong>
                  <pre>{renderValue(entry[version], labels.notPresent)}</pre>
                </div>)}
              </div>
              <div className="uix-diff-viewer__actions" role="group" aria-label={fillLabel(labels.resolve, { path: entry.path })}>
                <button type="button" className={cx('uix-btn uix-btn--primary', buttonSize)} aria-label={fillLabel(labels.acceptIncomingFor, { path: entry.path })} aria-pressed={resolution === 'accept'} onClick={() => resolve(entry.path, 'accept')}>{labels.acceptIncoming}</button>
                <button type="button" className={cx('uix-btn uix-btn--secondary', buttonSize)} aria-label={fillLabel(labels.keepCurrentFor, { path: entry.path })} aria-pressed={resolution === 'skip'} onClick={() => resolve(entry.path, 'skip')}>{labels.keepCurrent}</button>
                <button type="button" className={cx('uix-btn uix-btn--ghost', buttonSize)} aria-label={fillLabel(labels.markPendingFor, { path: entry.path })} aria-pressed={resolution === 'pending'} onClick={() => resolve(entry.path, 'pending')}>{labels.markPending}</button>
              </div>
            </details>;
          })}
        </section>;
      })}
      <p className="uix-visually-hidden" aria-live="polite">{fillLabel(labels.progress, { resolved: summary.resolved, total: entries.length })}</p>
    </section>
  );
}
