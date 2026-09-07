"use client";

import { useId, useMemo, useState } from 'react';
import type { JsonValue } from '../json-value.js';
import { buildThreeWayDiff, summarizeDiff } from '../diff-model.js';
import type { DiffEntry, DiffKind, DiffResolution } from '../diff-model.js';
import { cx } from '../cx.js';
import { StatusPill } from './StatusPill.js';

export interface DiffViewerProps {
  base?: JsonValue;
  current?: JsonValue;
  incoming?: JsonValue;
  entries?: DiffEntry[];
  resolutions?: Record<string, DiffResolution>;
  onResolutionChange?: (path: string, resolution: DiffResolution) => void;
  labels?: Partial<Record<'base' | 'current' | 'incoming', string>>;
  className?: string;
}

const GROUPS: Array<{ kind: DiffKind; label: string }> = [
  { kind: 'conflicted', label: 'Conflicted' },
  { kind: 'changed', label: 'Changed' },
  { kind: 'added', label: 'Added' },
  { kind: 'removed', label: 'Removed' },
];
const DEFAULT_LABELS: NonNullable<DiffViewerProps['labels']> = {};

const renderValue = (value: JsonValue | undefined) => value === undefined ? 'Not present' : JSON.stringify(value, null, 2);

/** Three-way configuration diff with per-entry keyboard-operable resolution. */
export function DiffViewer({
  base, current, incoming, entries: providedEntries, resolutions: controlledResolutions,
  onResolutionChange, labels = DEFAULT_LABELS, className,
}: DiffViewerProps) {
  const id = useId();
  const entries = useMemo(() => providedEntries ?? buildThreeWayDiff(base, current, incoming), [providedEntries, base, current, incoming]);
  const [internalResolutions, setInternalResolutions] = useState<Record<string, DiffResolution>>({});
  const resolutions = controlledResolutions ?? internalResolutions;
  const summary = summarizeDiff(entries, resolutions);
  const resolve = (path: string, resolution: DiffResolution) => {
    if (controlledResolutions === undefined) setInternalResolutions((currentState) => ({ ...currentState, [path]: resolution }));
    onResolutionChange?.(path, resolution);
  };

  if (entries.length === 0) return <section className={cx('uix-diff-viewer uix-diff-viewer--empty', className)} aria-label="Configuration differences"><h3>No differences</h3><p>Base, current, and incoming values are aligned.</p></section>;

  return (
    <section className={cx('uix-diff-viewer', className)} aria-label="Configuration differences">
      <div className="uix-diff-viewer__summary" aria-label="Difference summary">
        {GROUPS.map((group) => <span key={group.kind}><b>{summary[group.kind]}</b> {group.label.toLowerCase()}</span>)}
        <span><b>{summary.resolved}</b> resolved</span><span><b>{summary.pending}</b> pending</span>
      </div>
      {GROUPS.map((group) => {
        const grouped = entries.filter((entry) => entry.kind === group.kind);
        if (!grouped.length) return null;
        return <section key={group.kind} className="uix-diff-viewer__group" aria-labelledby={`${id}-${group.kind}`}>
          <h3 id={`${id}-${group.kind}`}>{group.label} <span>{grouped.length}</span></h3>
          {grouped.map((entry) => {
            const resolution = resolutions[entry.path] ?? 'pending';
            return <details key={entry.path} className="uix-diff-viewer__entry" data-kind={entry.kind} open={entry.kind === 'conflicted'}>
              <summary><code>{entry.path}</code><StatusPill tone={resolution === 'pending' ? 'warning' : 'success'}>{resolution}</StatusPill></summary>
              <div className="uix-diff-viewer__versions">
                {(['base', 'current', 'incoming'] as const).map((version) => <div key={version} role="region" aria-label={`${labels[version] ?? `${version[0]!.toUpperCase()}${version.slice(1)}`} value for ${entry.path}`}>
                  <strong>{labels[version] ?? `${version[0]!.toUpperCase()}${version.slice(1)}`}</strong>
                  <pre>{renderValue(entry[version])}</pre>
                </div>)}
              </div>
              <div className="uix-diff-viewer__actions" aria-label={`Resolve ${entry.path}`}>
                <button type="button" className="uix-btn uix-btn--primary uix-btn--sm" aria-pressed={resolution === 'accept'} onClick={() => resolve(entry.path, 'accept')}>Accept incoming</button>
                <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" aria-pressed={resolution === 'skip'} onClick={() => resolve(entry.path, 'skip')}>Keep current</button>
                <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" aria-pressed={resolution === 'pending'} onClick={() => resolve(entry.path, 'pending')}>Mark pending</button>
              </div>
            </details>;
          })}
        </section>;
      })}
      <p className="uix-visually-hidden" aria-live="polite">{summary.resolved} of {entries.length} differences resolved.</p>
    </section>
  );
}
