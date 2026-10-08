import type { HTMLAttributes, LiHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { formatFileSize } from '../file-model.js';
import type { FileSizeFormatter } from '../file-model.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { DEFAULT_ATTACHMENT_LABELS } from '../attachment-labels.js';
import type { AttachmentLabels } from '../attachment-labels.js';
import { AttachmentRemoveButton, AttachmentText } from './AttachmentParts.js';
import { FileIcon } from './FileIcon.js';

export { DEFAULT_ATTACHMENT_LABELS };
export type { AttachmentLabels };

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
  /** Count sizes in 1024s (1 MB = 1,048,576 bytes) instead of 1000s. Default `1000`. */
  sizeBase?: 1000 | 1024;
  /** The product's own size formatter; it replaces `formatFileSize` (and `sizeBase`). */
  formatSize?: FileSizeFormatter;
  /**
   * Words for this row. Each one defaults to `UixLabelsProvider` `attachment`, then to English,
   * so one provider translates every row below it (HAR-1630).
   */
  labels?: Partial<AttachmentLabels>;
}

/**
 * One file row (HAR-985; TENSOR C15/B12 `attachments-panel-view.tsx`, MEDx S19/S52): glyph or
 * thumbnail, the name as a link, size and meta, a state slot, and remove. Server-renderable:
 * the words that come from `UixLabelsProvider` are rendered by small client parts.
 */
export function Attachment({
  name, size, type, href, download, renderLink, meta, state, thumbnail, onRemove, status = 'ready', error, actions, locale,
  sizeBase, formatSize, labels, className, ...props
}: AttachmentProps) {
  const linked = href != null && status !== 'loading' && status !== 'forbidden';
  const nameNode = linked
    ? renderUixLink(renderLink, {
      href,
      className: 'uix-attachment__name',
      // A download link is named "Download {name}": the visible name, plus the translated
      // sentence for assistive technology in place of it.
      children: download
        ? <><span aria-hidden="true">{name}</span><span className="uix-visually-hidden"><AttachmentText label="download" override={labels?.download} name={name} /></span></>
        : name,
      ...(download ? { download: typeof download === 'string' ? download : '' } : {}),
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
          {size !== undefined && <span className="uix-attachment__size">{formatSize ? formatSize(size, locale) : formatFileSize(size, locale, { base: sizeBase })}</span>}
          {meta != null && <span>{meta}</span>}
          {status === 'loading' && <span><AttachmentText label="loading" override={labels?.loading} name={name} /></span>}
          {status === 'forbidden' && <span><AttachmentText label="forbidden" override={labels?.forbidden} name={name} /></span>}
        </span>
        {status === 'error' && error != null && <span className="uix-attachment__error" role="alert">{error}</span>}
      </span>
      {(actions != null || onRemove) && (
        <span className="uix-attachment__actions">
          {actions}
          {onRemove && <AttachmentRemoveButton override={labels?.remove} name={name} onRemove={onRemove} />}
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
