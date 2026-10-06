import type { HTMLAttributes, LiHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { formatFileSize } from '../file-model.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { Button } from './Button.js';
import { FileIcon } from './FileIcon.js';

export interface AttachmentLabels {
  /** Remove button. `{name}`. */
  remove: string;
  /** Download link name when `download` is set. `{name}`. */
  download: string;
  loading: string;
  forbidden: string;
}

export const DEFAULT_ATTACHMENT_LABELS: AttachmentLabels = {
  remove: 'Remove {name}',
  download: 'Download {name}',
  loading: 'Loading…',
  forbidden: 'You do not have access to this file.',
};

export interface AttachmentProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'children'> {
  /** File name as the user should read it (decrypted, if the product stores it encrypted). */
  name: string;
  /** Bytes. */
  size?: number;
  /** MIME type, for the file glyph. */
  type?: string;
  /** Opens or downloads the file. The name becomes the link. */
  href?: string;
  /** Download instead of opening; a string sets the saved file name. */
  download?: boolean | string;
  renderLink?: UixRenderLink;
  /** A quieter line: who added it and when. */
  meta?: ReactNode;
  /** A state slot after the name, e.g. `<StatusPill tone="warning">Scanning</StatusPill>`. */
  state?: ReactNode;
  /** Replaces the file glyph (e.g. an image thumbnail). */
  thumbnail?: ReactNode;
  /** Adds a remove button; confirm destructive removals in the handler (`ConfirmDialog`/`Popconfirm`). */
  onRemove?: () => void;
  /** `loading` (no link yet), `error` (shows `error`), `forbidden` (no link, a reason). */
  status?: 'ready' | 'loading' | 'error' | 'forbidden';
  error?: ReactNode;
  /** Extra actions at the end of the row. */
  actions?: ReactNode;
  locale?: string;
  labels?: Partial<AttachmentLabels>;
}

/**
 * One file row (HAR-985; TENSOR C15/B12 `attachments-panel-view.tsx`, MEDx S19/S52): glyph or
 * thumbnail, the name as a link, size and meta, a state slot, and remove. Server-renderable.
 */
export function Attachment({
  name, size, type, href, download, renderLink, meta, state, thumbnail, onRemove, status = 'ready', error, actions, locale,
  labels: labelOverrides, className, ...props
}: AttachmentProps) {
  const labels = { ...DEFAULT_ATTACHMENT_LABELS, ...labelOverrides };
  const linked = href != null && status !== 'loading' && status !== 'forbidden';
  const nameNode = linked
    ? renderUixLink(renderLink, {
      href, className: 'uix-attachment__name', children: name,
      ...(download ? { download: typeof download === 'string' ? download : '', 'aria-label': fillLabel(labels.download, { name }) } : {}),
    })
    : <span className="uix-attachment__name">{name}</span>;
  return (
    <li className={cx('uix-attachment', className)} data-status={status === 'ready' ? undefined : status} aria-busy={status === 'loading' || undefined} {...props}>
      <span className="uix-attachment__icon" aria-hidden="true">{thumbnail ?? <FileIcon name={name} type={type} />}</span>
      <span className="uix-attachment__body">
        <span className="uix-attachment__line">
          {nameNode}
          {state != null && <span className="uix-attachment__state">{state}</span>}
        </span>
        <span className="uix-attachment__meta">
          {size !== undefined && <span className="uix-attachment__size">{formatFileSize(size, locale)}</span>}
          {meta != null && <span>{meta}</span>}
          {status === 'loading' && <span>{labels.loading}</span>}
          {status === 'forbidden' && <span>{labels.forbidden}</span>}
        </span>
        {status === 'error' && error != null && <span className="uix-attachment__error" role="alert">{error}</span>}
      </span>
      {(actions != null || onRemove) && (
        <span className="uix-attachment__actions">
          {actions}
          {onRemove && (
            <Button type="button" size="xs" variant="ghost" icon aria-label={fillLabel(labels.remove, { name })} onClick={onRemove}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
            </Button>
          )}
        </span>
      )}
    </li>
  );
}

export interface AttachmentListProps extends HTMLAttributes<HTMLUListElement> {
  /** Names the list, e.g. "Attachments (3)". */
  label?: string;
  children?: ReactNode;
}

/** A list of `Attachment` rows. */
export function AttachmentList({ label, className, children, ...props }: AttachmentListProps) {
  return <ul className={cx('uix-attachments', 'uix-attachments--list', className)} aria-label={label} {...props}>{children}</ul>;
}
