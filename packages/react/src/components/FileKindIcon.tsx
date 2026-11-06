import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { fileKind, fileTypeLabel } from '../file-model.js';
import type { FileKind } from '../file-model.js';
import {
  FileArchiveIcon, FileCodeIcon, FileIcon, FileImageIcon, FileSpreadsheetIcon, FileTerminalIcon, FileTextIcon, MailIcon,
} from '../icons/components.js';
import type { UixIcon } from '../icons/types.js';

/** The Lucide glyph of each kind. E-Mail keeps the envelope: Lucide has no file-shaped mail icon. */
export const FILE_KIND_GLYPHS: Readonly<Record<FileKind, UixIcon>> = {
  img: FileImageIcon,
  doc: FileTextIcon,
  sheet: FileSpreadsheetIcon,
  mail: MailIcon,
  code: FileCodeIcon,
  log: FileTerminalIcon,
  archive: FileArchiveIcon,
  other: FileIcon,
};

/** `md` 34 px (a list row), `sm` 30 px (a compact panel row), `lg` 52 px. */
export type FileKindIconSize = 'sm' | 'md' | 'lg';

export interface FileKindIconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The file name; gives the kind (by extension) and the type label. */
  name?: string;
  /** The MIME type; gives the kind when the name has no known extension (a drag event). */
  mime?: string;
  /** Sets the kind outright instead of reading it from `name` and `mime`. */
  kind?: FileKind;
  /**
   * The type label on the corner. Default: the extension in capitals, at most four letters
   * (`fileTypeLabel`). `""` hides it.
   */
  typeLabel?: string;
  size?: FileKindIconSize;
  /**
   * An accessible name ("PDF-Dokument"). Without one the icon is decorative (`aria-hidden`):
   * a `FileRow` already says the name and the kind in words.
   */
  label?: string;
}

const STROKE: Record<FileKindIconSize, number> = { sm: 1.5, md: 1.5, lg: 1.4 };

/**
 * A file's kind at a glance (file kit 2.57, variation H): the kind's Lucide glyph in the kind's
 * colour (`--uix-file-<kind>`), with the type as a small solid label on its bottom-right corner,
 * ringed in the surface colour. Server-renderable; it has no words of its own.
 */
export function FileKindIcon({ name = '', mime, kind, typeLabel, size = 'md', label, className, ...props }: FileKindIconProps) {
  const resolved = kind ?? fileKind(name, mime);
  const Glyph = FILE_KIND_GLYPHS[resolved];
  const tag = (typeLabel ?? fileTypeLabel(name)).slice(0, 4).toUpperCase();
  return (
    <span
      className={cx('uix-file-icon', size !== 'md' && `uix-file-icon--${size}`, className)}
      data-file-kind={resolved}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      <Glyph className="uix-file-icon__glyph" strokeWidth={STROKE[size]} />
      {tag && <span className="uix-file-icon__type" data-length={tag.length}>{tag}</span>}
    </span>
  );
}
