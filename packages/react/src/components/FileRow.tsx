"use client";

import { useEffect, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { announcePolite } from '../announce.js';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { DEFAULT_FILE_KIND_LABELS, fileKind, formatFileSize } from '../file-model.js';
import type { FileKind, FileKindLabels, FileSizeFormatter } from '../file-model.js';
import { DownloadIcon, EllipsisIcon, XIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import { Button } from './Button.js';
import { FileKindIcon } from './FileKindIcon.js';

/**
 * Where a file is (file kit 2.57):
 * - `idle`: at rest, the kind's tint on the left edge. Files that were already there.
 * - `uploading`: a fill in the kind's colour grows to `progress`.
 * - `done`: just finished. A check draws on the icon and the fill fades; render `idle` for a
 *   file that was already there, so the check only plays for the upload someone watched.
 * - `scanning`: the malware check after the upload. Words only, no motion.
 * - `blocked`: the check found something. Amber instead of the kind colour.
 * - `failed`: the upload broke. Red instead of the kind colour.
 */
export type FileRowState = 'idle' | 'uploading' | 'done' | 'scanning' | 'blocked' | 'failed';

/** The words of a `FileRow`, German by default. `{name}` is the file name. */
export interface FileRowLabels {
  /** Download button. `{name}`. */
  download: string;
  /** "More actions" button. `{name}`. */
  more: string;
  /** Cancel button while uploading. `{name}`. */
  cancel: string;
  /** First part of the meta line while uploading. */
  uploading: string;
  /** `{percent}`. */
  percent: string;
  /** `{loaded}`, `{total}`: formatted sizes. */
  transferred: string;
  /** The progress bar's name. `{name}`. */
  progress: string;
  /** Said once when an upload finishes. `{name}`. */
  done: string;
  scanning: string;
  blocked: string;
  failed: string;
  /** The button of a blocked file. */
  details: string;
  /** The button of a failed upload. */
  retry: string;
}

export const DEFAULT_FILE_ROW_LABELS: FileRowLabels = {
  download: '{name} herunterladen',
  more: 'Weitere Aktionen für {name}',
  cancel: 'Hochladen von {name} abbrechen',
  uploading: 'Wird hochgeladen',
  percent: '{percent} %',
  transferred: '{loaded} von {total}',
  progress: '{name} wird hochgeladen',
  done: '{name} hochgeladen',
  scanning: 'Wird auf Schadsoftware geprüft',
  blocked: 'Gesperrt: Schadsoftware gefunden. Nicht gespeichert.',
  failed: 'Hochladen fehlgeschlagen. Verbindung unterbrochen.',
  details: 'Details',
  retry: 'Erneut versuchen',
};

/** The English words, for `labels` or `UixLabelsProvider` (`fileRow`). */
export const FILE_ROW_LABELS_EN: FileRowLabels = {
  download: 'Download {name}',
  more: 'More actions for {name}',
  cancel: 'Cancel uploading {name}',
  uploading: 'Uploading',
  percent: '{percent}%',
  transferred: '{loaded} of {total}',
  progress: 'Uploading {name}',
  done: '{name} uploaded',
  scanning: 'Checking for malware',
  blocked: 'Blocked: malware found. Not saved.',
  failed: 'Upload failed. The connection was interrupted.',
  details: 'Details',
  retry: 'Try again',
};

export interface FileRowProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The file name as people should read it. Long names end in an ellipsis; `title` has it whole. */
  name: string;
  /** The MIME type, for the kind when the name has no known extension. */
  mime?: string;
  /** Sets the kind outright instead of reading it from `name` and `mime`. */
  kind?: FileKind;
  /** The type label on the icon corner. Default: the extension, at most four letters. */
  typeLabel?: string;
  /** Bytes. */
  size?: number;
  /** Who added it and when ("Lena Brandt, vor 12 Min."), after the kind and the size. */
  meta?: ReactNode;
  state?: FileRowState;
  /** Upload progress, 0 to 1. Default `loaded / size` when both are given. */
  progress?: number;
  /** Bytes uploaded so far. Default `progress × size`. */
  loaded?: number;
  /** Replaces the words of a `blocked` or `failed` row (the reason the server gave). */
  message?: ReactNode;
  /** Download link: the download button becomes `<a href download>`. */
  href?: string;
  /** Saves under this name instead of the URL's (with `href`). */
  download?: string;
  /** Download handler, when the download is not a plain link. */
  onDownload?: () => void;
  /** Shows a "Weitere Aktionen" button; open your `Menu` from it. */
  onMoreActions?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Replaces the resting actions (download, more). */
  actions?: ReactNode;
  /** Shows the cancel button while uploading. */
  onCancel?: () => void;
  /** Shows "Erneut versuchen" on a failed upload. */
  onRetry?: () => void;
  /** Shows "Details" on a blocked file. */
  onDetails?: () => void;
  /** `compact`: a 30 px icon and tighter padding, for a 340 px side panel. */
  density?: 'default' | 'compact';
  /** `li` inside a `<ul class="uix-file-rows">`. Default `div`. */
  as?: 'div' | 'li';
  locale?: string;
  /** Count sizes in 1024s instead of 1000s. Default `1000`. */
  sizeBase?: 1000 | 1024;
  formatSize?: FileSizeFormatter;
  /** Words for this row; each defaults to `UixLabelsProvider` `fileRow`, then German. */
  labels?: Partial<FileRowLabels>;
  /** Kind names for this row; each defaults to `UixLabelsProvider` `fileKinds`, then German. */
  kindLabels?: Partial<FileKindLabels>;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * One file in a list (file kit 2.57, variation H): the kind icon, the name, a meta line (kind
 * in its colour · size · who and when) and actions that appear on hover or focus. At rest its
 * left edge carries a tint of the kind's colour fading into the surface; while uploading the
 * same tint grows to the real progress, and fades out when the upload finishes.
 */
export function FileRow({
  name, mime, kind, typeLabel, size, meta, state = 'idle', progress, loaded, message, href, download, onDownload,
  onMoreActions, actions, onCancel, onRetry, onDetails, density = 'default', as: Root = 'div', locale = 'de-DE',
  sizeBase, formatSize, labels: labelsProp, kindLabels: kindLabelsProp, className, style, ...props
}: FileRowProps) {
  const provided = useUixLabels();
  const labels: FileRowLabels = { ...DEFAULT_FILE_ROW_LABELS, ...provided.fileRow, ...labelsProp };
  const kindLabels: FileKindLabels = { ...DEFAULT_FILE_KIND_LABELS, ...provided.fileKinds, ...kindLabelsProp };
  const resolved = kind ?? fileKind(name, mime);
  const sizeText = (bytes: number) => (formatSize ? formatSize(bytes, locale) : formatFileSize(bytes, locale, { base: sizeBase }));

  const ratio = clamp(progress ?? (loaded !== undefined && size ? loaded / size : 0));
  const percent = Math.round(ratio * 100);

  // Say the outcome once, when it changes; never the progress ticks.
  const rootRef = useRef<HTMLElement>(null);
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    const words = state === 'done' ? fillLabel(labels.done, { name })
      : state === 'blocked' ? (typeof message === 'string' ? message : labels.blocked)
        : state === 'failed' ? (typeof message === 'string' ? message : labels.failed)
          : '';
    if (words) announcePolite(state === 'done' ? words : `${name}: ${words}`, rootRef.current);
  }, [state, name, message, labels.done, labels.blocked, labels.failed]);

  let line: ReactNode;
  if (state === 'uploading') {
    const parts = [labels.uploading, fillLabel(labels.percent, { percent })];
    if (size !== undefined) {
      const total = sizeText(size);
      let done = sizeText(loaded ?? ratio * size);
      // "1,5 von 2,4 MB": the unit once when both sides share it
      const unit = total.slice(total.lastIndexOf(' '));
      if (unit.length > 1 && done.endsWith(unit)) done = done.slice(0, -unit.length);
      parts.push(fillLabel(labels.transferred, { loaded: done, total }));
    }
    line = parts.join(' · ');
  } else if (state === 'scanning') line = labels.scanning;
  else if (state === 'blocked') line = message ?? labels.blocked;
  else if (state === 'failed') line = message ?? labels.failed;
  else {
    line = (
      <>
        <span className="uix-file-row__kind">{kindLabels[resolved]}</span>
        {size !== undefined && <> · {sizeText(size)}</>}
        {meta != null && meta !== false && <> · {meta}</>}
      </>
    );
  }

  let tools: ReactNode = null;
  if (state === 'uploading') {
    tools = onCancel && (
      <Button type="button" size="sm" variant="ghost" icon className="uix-file-row__keep" aria-label={fillLabel(labels.cancel, { name })} onClick={onCancel}>
        <XIcon size="sm" />
      </Button>
    );
  } else if (state === 'blocked') {
    tools = onDetails && <Button type="button" size="xs" variant="secondary" className="uix-file-row__keep" onClick={onDetails}>{labels.details}</Button>;
  } else if (state === 'failed') {
    tools = onRetry && <Button type="button" size="xs" variant="secondary" className="uix-file-row__keep" onClick={onRetry}>{labels.retry}</Button>;
  } else if (state !== 'scanning') {
    tools = actions ?? (
      <>
        {href ? (
          <a className="uix-btn uix-btn--ghost uix-btn--sm uix-btn--icon" href={href} download={download ?? true} aria-label={fillLabel(labels.download, { name })} onClick={onDownload}>
            <DownloadIcon size="sm" />
          </a>
        ) : onDownload && (
          <Button type="button" size="sm" variant="ghost" icon aria-label={fillLabel(labels.download, { name })} onClick={onDownload}>
            <DownloadIcon size="sm" />
          </Button>
        )}
        {onMoreActions && (
          <Button type="button" size="sm" variant="ghost" icon aria-label={fillLabel(labels.more, { name })} aria-haspopup="menu" onClick={onMoreActions}>
            <EllipsisIcon size="sm" />
          </Button>
        )}
      </>
    );
  }

  const filling = state === 'uploading' || state === 'done';
  return (
    <Root
      ref={rootRef as never}
      className={cx('uix-file-row', density === 'compact' && 'uix-file-row--compact', className)}
      data-file-kind={resolved}
      data-state={state}
      style={filling ? ({ '--file-progress': state === 'done' ? 1 : ratio, ...style } as CSSProperties) : style}
      {...props}
    >
      {filling && (
        <span
          className="uix-file-row__fill"
          {...(state === 'uploading'
            ? { role: 'progressbar', 'aria-label': fillLabel(labels.progress, { name }), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent }
            : { 'aria-hidden': true })}
        />
      )}
      {state === 'uploading' && <span className="uix-file-row__edge" aria-hidden="true" />}
      <span className="uix-file-row__icon">
        <FileKindIcon name={name} kind={resolved} typeLabel={typeLabel} size={density === 'compact' ? 'sm' : 'md'} />
        {state === 'done' && (
          <span className="uix-file-row__check" aria-hidden="true">
            <svg viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.5l4.5-5" pathLength={1} /></svg>
          </span>
        )}
      </span>
      <span className="uix-file-row__text">
        <span className="uix-file-row__name" title={name}>{name}</span>
        <span className="uix-file-row__meta">{line}</span>
      </span>
      {tools && <span className="uix-file-row__actions">{tools}</span>}
    </Root>
  );
}
