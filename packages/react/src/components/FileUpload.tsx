"use client";

import { useId, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { formatFileSize, partitionFiles } from '../file-model.js';
import type { FileRejection } from '../file-model.js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Progress } from './Progress.js';
import { FileIcon } from './FileIcon.js';

export type FileUploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface FileUploadItem {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  type?: string;
  status: FileUploadStatus;
  /** 0–100 while uploading; without it the bar is indeterminate. */
  progress?: number;
  /** Why it failed (shown under the name with a Retry button). */
  error?: ReactNode;
  /** An object URL or remote URL for an image thumbnail. */
  previewUrl?: string;
  /** Alternative text, when the product asks for it (`onAltChange`). */
  alt?: string;
}

export interface FileUploadLabels {
  /** Main line of the drop zone. */
  title: string;
  choose: string;
  /** Shown while a file is dragged over. */
  drop: string;
  list: string;
  remove: string;
  /** Accessible name of Retry. `{name}`. */
  retry: string;
  /** Visible text of Retry. */
  retryShort: string;
  queued: string;
  /** `{progress}`. */
  uploading: string;
  done: string;
  failed: string;
  /** `{name}` — set `alt` for images. */
  alt: string;
  /** `{count}` files added. */
  added: string;
  /** `{name}`, `{accept}`. */
  wrongType: string;
  /** `{name}`, `{max}`. */
  tooLarge: string;
  /** `{name}`, `{max}`. */
  tooMany: string;
}

export const DEFAULT_FILE_UPLOAD_LABELS: FileUploadLabels = {
  title: 'Drop files here',
  choose: 'Choose files',
  drop: 'Release to add the files',
  list: 'Files',
  remove: 'Remove {name}',
  retry: 'Retry {name}',
  retryShort: 'Retry',
  queued: 'Waiting',
  uploading: 'Uploading, {progress}%',
  done: 'Uploaded',
  failed: 'Upload failed',
  alt: 'Description of {name} for screen readers',
  added: '{count} added',
  wrongType: '{name} is not an accepted file type ({accept}).',
  tooLarge: '{name} is larger than {max}.',
  tooMany: '{name} was not added: at most {max} files.',
};

export interface FileUploadProps {
  /** The files so far, with their upload state (controlled). */
  items: readonly FileUploadItem[];
  /**
   * Called with the files that passed `accept`, `maxSize` and `maxFiles`, and the ones that did
   * not. Add accepted files to `items` and upload them; the component never uploads.
   */
  onFilesAdded: (accepted: File[], rejected: FileRejection[]) => void;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  /** Ask for alt text on image items (MOTUS photo intake). */
  onAltChange?: (id: string, alt: string) => void;
  /** Accepted types, as for `<input accept>`. */
  accept?: string;
  /** Largest file in bytes. */
  maxSize?: number;
  /** Most files in `items`. */
  maxFiles?: number;
  /** Default true. */
  multiple?: boolean;
  /** Open the camera on phones (`user` or `environment`). */
  capture?: 'user' | 'environment';
  disabled?: boolean;
  /** Second line of the drop zone, e.g. "PDF or images, up to 20 MB". */
  hint?: ReactNode;
  locale?: string;
  labels?: Partial<FileUploadLabels>;
  className?: string;
}

/**
 * Drop zone, file picker and upload list (HAR-984; TENSOR C15, MOTUS C-7, MEDx S18/S19). The
 * product owns the upload: it receives validated `File`s and reports progress, success and
 * failure through `items`. Keyboard users get a real button; drop is an extra, not the only way.
 */
export function FileUpload({
  items, onFilesAdded, onRemove, onRetry, onAltChange, accept, maxSize, maxFiles, multiple = true, capture,
  disabled, hint, locale, labels: labelOverrides, className,
}: FileUploadProps) {
  const labels = { ...DEFAULT_FILE_UPLOAD_LABELS, ...labelOverrides };
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [announce, setAnnounce] = useState('');

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const files = Array.from(list);
    const { accepted, rejected } = partitionFiles(files, { accept, maxSize, maxFiles, existing: items.length });
    const max = maxSize !== undefined ? formatFileSize(maxSize, locale) : '';
    setMessages(rejected.map(({ file, reason }) => fillLabel(
      reason === 'type' ? labels.wrongType : reason === 'size' ? labels.tooLarge : labels.tooMany,
      { name: file.name, accept: accept ?? '', max: reason === 'count' ? String(maxFiles) : max },
    )));
    setAnnounce(accepted.length ? fillLabel(labels.added, { count: accepted.length }) : '');
    onFilesAdded(accepted, rejected);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer?.files ?? null);
  };

  return (
    <div className={cx('uix-file-upload', className)} data-disabled={disabled || undefined}>
      <div
        className="uix-dropzone"
        data-dragover={over || undefined}
        onDragOver={(event) => { if (disabled) return; event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={(event) => { if (event.target === event.currentTarget) inputRef.current?.click(); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg>
        <strong aria-hidden={over || undefined}>{over ? labels.drop : labels.title}</strong>
        {hint != null && <span className="uix-file-upload__hint" id={`${id}-hint`}>{hint}</span>}
        <Button type="button" size="sm" disabled={disabled} aria-describedby={hint != null ? `${id}-hint` : undefined} onClick={() => inputRef.current?.click()}>{labels.choose}</Button>
        <input
          ref={inputRef}
          type="file"
          className="uix-visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          accept={accept}
          multiple={multiple}
          capture={capture}
          disabled={disabled}
          onChange={(event) => { take(event.currentTarget.files); event.currentTarget.value = ''; }}
        />
      </div>
      {messages.length > 0 && (
        <ul className="uix-file-upload__errors" role="alert">
          {messages.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      )}
      <span className="uix-visually-hidden" role="status" aria-live="polite">{announce}</span>
      {items.length > 0 && (
        <ul className="uix-filelist uix-file-upload__list" aria-label={labels.list}>
          {items.map((item) => {
            const statusText = item.status === 'uploading'
              ? fillLabel(labels.uploading, { progress: item.progress ?? 0 })
              : item.status === 'done' ? labels.done : item.status === 'error' ? labels.failed : labels.queued;
            const image = !!item.previewUrl;
            return (
              <li key={item.id} className="uix-filelist__item uix-file-upload__item" data-status={item.status}>
                {image
                  ? <img className="uix-file-upload__thumb" src={item.previewUrl} alt="" />
                  : <span className="uix-attachment__icon"><FileIcon name={item.name} type={item.type} /></span>}
                <div className="uix-file-upload__body">
                  <span className="uix-file-upload__name">{item.name}</span>
                  <span className="uix-file-upload__meta">
                    <span>{formatFileSize(item.size, locale)}</span>
                    {item.status !== 'uploading' && <span className="uix-file-upload__status">{statusText}</span>}
                  </span>
                  {item.status === 'uploading' && (
                    <Progress value={item.progress} indeterminate={item.progress === undefined} max={100} label={statusText} />
                  )}
                  {item.status === 'error' && item.error != null && <span className="uix-file-upload__error">{item.error}</span>}
                  {image && onAltChange && (
                    <Input size="sm" aria-label={fillLabel(labels.alt, { name: item.name })} placeholder={fillLabel(labels.alt, { name: item.name })} value={item.alt ?? ''} onChange={(event) => onAltChange(item.id, event.currentTarget.value)} />
                  )}
                </div>
                <div className="uix-file-upload__actions">
                  {item.status === 'error' && onRetry && <Button type="button" size="sm" aria-label={fillLabel(labels.retry, { name: item.name })} onClick={() => onRetry(item.id)}>{labels.retryShort}</Button>}
                  {onRemove && (
                    <Button type="button" size="xs" variant="ghost" icon aria-label={fillLabel(labels.remove, { name: item.name })} onClick={() => onRemove(item.id)}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
