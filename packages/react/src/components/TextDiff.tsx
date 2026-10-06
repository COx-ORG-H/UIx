"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { diffText, textDiffRows } from '../text-diff-model.js';
import type { TextDiffGranularity, TextDiffLine, TextDiffRow, TextDiffSegment } from '../text-diff-model.js';

export interface TextDiffLabels {
  before: string;
  after: string;
  /** `{added}`, `{removed}`: lines or words, by granularity. */
  summary: string;
  noChanges: string;
  /** Read before removed text. */
  removed: string;
  /** Read before added text. */
  added: string;
  /** Fold button. `{count}`. */
  showUnchanged: string;
  tooLarge: string;
}

export const DEFAULT_TEXT_DIFF_LABELS: TextDiffLabels = {
  before: 'Before',
  after: 'After',
  summary: '{added} added, {removed} removed',
  noChanges: 'No changes',
  removed: 'Removed',
  added: 'Added',
  showUnchanged: 'Show {count} unchanged lines',
  tooLarge: 'These versions are too large to compare here.',
};

export interface TextDiffProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  before: string;
  after: string;
  /** Column heading for `before`, e.g. "Version 3". Defaults to `labels.before`. */
  beforeLabel?: ReactNode;
  afterLabel?: ReactNode;
  /** `line` (default) pairs changed lines and marks the words inside; `word` diffs prose as one flow. */
  granularity?: TextDiffGranularity;
  /** `split` (default) puts the versions side by side, stacking on narrow containers; `unified` interleaves them. */
  view?: 'split' | 'unified';
  /** Line diffs: unchanged lines kept around each change; longer runs fold behind a button. Default: show all. */
  context?: number;
  /** Names the diff for assistive technology, e.g. "Changes to the article body". */
  label?: string;
  /** Hide the added/removed summary. */
  hideSummary?: boolean;
  /** Passed to the model (`maxTokens`, `maxEdits`); see `diffText`. */
  maxTokens?: number;
  maxEdits?: number;
  labels?: Partial<TextDiffLabels>;
}

function Marked({ segments, side, labels, whole }: { segments: TextDiffSegment[]; side: 'before' | 'after'; labels: TextDiffLabels; whole?: boolean }) {
  const Tag = side === 'before' ? 'del' : 'ins';
  return (
    <>
      {segments.map((segment, i) => (segment.changed
        ? <Tag key={i} data-whole={whole || undefined}><span className="uix-visually-hidden">{side === 'before' ? labels.removed : labels.added}: </span>{segment.text}</Tag>
        : <Fragment key={i}>{segment.text}</Fragment>))}
    </>
  );
}

function Cell({ line, side, kind, labels }: { line?: TextDiffLine; side: 'before' | 'after'; kind: TextDiffRow['kind']; labels: TextDiffLabels }) {
  if (!line) return <div className="uix-text-diff__cell" data-side={side} data-empty="" aria-hidden="true" />;
  const changed = kind !== 'equal';
  return (
    <div className="uix-text-diff__cell" data-side={side} data-kind={changed ? (side === 'before' ? 'delete' : 'insert') : 'equal'}>
      <span className="uix-text-diff__num" aria-hidden="true">{line.number}</span>
      <span className="uix-text-diff__sign" aria-hidden="true">{changed ? (side === 'before' ? '−' : '+') : ''}</span>
      <span className="uix-text-diff__text">
        {line.segments.length === 1 && line.segments[0].text === '' ? '​' : <Marked segments={line.segments} side={side} labels={labels} whole={line.segments.length === 1} />}
      </span>
    </div>
  );
}

function Rows({ rows, view, labels, focusFirst }: { rows: TextDiffRow[]; view: 'split' | 'unified'; labels: TextDiffLabels; focusFirst?: boolean }) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const first = useRef<HTMLDivElement>(null);
  // The fold button is replaced by the lines it hid: keep keyboard focus there, not on <body>.
  useEffect(() => { if (focusFirst) first.current?.focus(); }, [focusFirst]);
  const firstProps = (index: number) => (focusFirst && index === 0 ? { ref: first, tabIndex: -1 } : {});
  return (
    <>
      {rows.map((row, index) => {
        if (row.kind === 'fold') {
          if (open.has(index)) return <Rows key={index} rows={row.rows} view={view} labels={labels} focusFirst />;
          return (
            <div key={index} className="uix-text-diff__row" data-kind="fold">
              <button type="button" className="uix-text-diff__fold" onClick={() => setOpen((s) => new Set(s).add(index))}>
                {fillLabel(labels.showUnchanged, { count: row.count })}
              </button>
            </div>
          );
        }
        const before = row.kind === 'insert' ? undefined : row.before;
        const after = row.kind === 'delete' ? undefined : row.after;
        if (view === 'unified') {
          if (row.kind === 'equal') return <div key={index} className="uix-text-diff__row" data-kind="equal" {...firstProps(index)}><Cell line={after} side="after" kind="equal" labels={labels} /></div>;
          return (
            <Fragment key={index}>
              {before && <div className="uix-text-diff__row" data-kind="delete"><Cell line={before} side="before" kind={row.kind} labels={labels} /></div>}
              {after && <div className="uix-text-diff__row" data-kind="insert"><Cell line={after} side="after" kind={row.kind} labels={labels} /></div>}
            </Fragment>
          );
        }
        return (
          <div key={index} className="uix-text-diff__row" data-kind={row.kind} {...firstProps(index)}>
            <Cell line={before} side="before" kind={row.kind} labels={labels} />
            <Cell line={after} side="after" kind={row.kind} labels={labels} />
          </div>
        );
      })}
    </>
  );
}

/**
 * A two-way diff of two texts (HAR-1368; TENSOR C11 knowledge version diff): by line with word
 * marks inside changed lines, or by word for prose; side by side or unified. Changes are `<del>` /
 * `<ins>` with a −/+ sign and a spoken "Removed"/"Added", never colour alone. `DiffViewer` stays
 * the three-way JSON configuration diff.
 */
export function TextDiff({
  before, after, beforeLabel, afterLabel, granularity = 'line', view = 'split', context, label, hideSummary,
  maxTokens, maxEdits, labels: labelOverrides, className, ...props
}: TextDiffProps) {
  const uixLabels = useUixLabels();
  const labels = { ...DEFAULT_TEXT_DIFF_LABELS, ...uixLabels.textDiff, ...labelOverrides };
  const result = useMemo(() => diffText(before, after, { granularity, maxTokens, maxEdits }), [before, after, granularity, maxTokens, maxEdits]);
  const rows = useMemo(() => (granularity === 'line' && result.status === 'ok' ? textDiffRows(result, { context }) : []), [result, granularity, context]);
  const heads = (
    <div className="uix-text-diff__heads" aria-hidden={view === 'unified' || undefined}>
      <span className="uix-text-diff__head" data-side="before">{view === 'unified' && <span aria-hidden="true">− </span>}{beforeLabel ?? labels.before}</span>
      <span className="uix-text-diff__head" data-side="after">{view === 'unified' && <span aria-hidden="true">+ </span>}{afterLabel ?? labels.after}</span>
    </div>
  );
  const unchanged = result.status === 'ok' && result.added === 0 && result.removed === 0 && result.ops.every((op) => op.type === 'equal');

  let body: ReactNode;
  if (result.status === 'too-large') body = <div className="uix-text-diff__note">{labels.tooLarge}</div>;
  else if (granularity === 'line') body = <div className="uix-text-diff__body"><Rows rows={rows} view={view} labels={labels} /></div>;
  else {
    const prose = (side: 'before' | 'after' | 'both') => (
      <div className="uix-text-diff__prose" data-side={side}>
        {result.ops.map((op, i) => {
          const text = op.tokens.join('');
          if (op.type === 'equal') return <Fragment key={i}>{text}</Fragment>;
          if (op.type === 'delete' && side === 'after') return null;
          if (op.type === 'insert' && side === 'before') return null;
          return <Marked key={i} segments={[{ text, changed: true }]} side={op.type === 'delete' ? 'before' : 'after'} labels={labels} />;
        })}
      </div>
    );
    const side = (which: 'before' | 'after') => (
      <div className="uix-text-diff__side">
        <div className="uix-text-diff__head">{which === 'before' ? beforeLabel ?? labels.before : afterLabel ?? labels.after}</div>
        {prose(which)}
      </div>
    );
    body = <div className="uix-text-diff__body">{view === 'unified' ? prose('both') : <div className="uix-text-diff__row" data-kind="prose">{side('before')}{side('after')}</div>}</div>;
  }

  return (
    <div role="group" aria-label={label} className={cx('uix-text-diff', className)} data-view={view} data-granularity={granularity} {...props}>
      {!hideSummary && result.status === 'ok' && (
        <div className="uix-text-diff__summary">
          {unchanged ? labels.noChanges : fillLabel(labels.summary, { added: result.added, removed: result.removed })}
        </div>
      )}
      {!(granularity === 'word' && view === 'split' && result.status === 'ok') && heads}
      {body}
    </div>
  );
}
