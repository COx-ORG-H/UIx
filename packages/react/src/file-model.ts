/** File helpers shared by `FileUpload` and `Attachment` (HAR-984/985). Pure. */

export interface FileSizeOptions {
  /**
   * `1000` (default): decimal, as file managers on macOS and most of the web show sizes
   * (1 MB = 1,000,000 bytes). `1024`: binary, as Windows and many servers count them
   * (1 MB = 1,048,576 bytes) — use it when the rest of the product does, so one file never
   * shows two sizes (HAR-1630).
   */
  base?: 1000 | 1024;
  /**
   * The five unit labels, bytes first. Default `['B', 'KB', 'MB', 'GB', 'TB']` for both bases;
   * pass `['B', 'KiB', 'MiB', 'GiB', 'TiB']` to mark base 1024 the IEC way, or localised ones.
   */
  units?: readonly [string, string, string, string, string];
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** A product's own size formatter for `FileUpload` and `Attachment` (`formatSize`). */
export type FileSizeFormatter = (bytes: number, locale?: string) => string;

/**
 * "1.2 MB", "340 KB", "12 B" in the locale's number format. Base 1000 unless `options.base`
 * is 1024.
 */
export function formatFileSize(bytes: number, locale?: string, options: FileSizeOptions = {}): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const base = options.base === 1024 ? 1024 : 1000;
  const units = options.units ?? UNITS;
  let value = bytes;
  let unit = 0;
  while (value >= base && unit < units.length - 1) { value /= base; unit += 1; }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value)} ${units[unit]}`;
}

/** Whether a file matches an `accept` list (".pdf,image/*,application/zip"). An empty list accepts all. */
export function fileMatchesAccept(file: { name: string; type?: string }, accept?: string): boolean {
  if (!accept || !accept.trim()) return true;
  const name = file.name.toLowerCase();
  const type = (file.type ?? '').toLowerCase();
  return accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export type FileRejectionReason = 'type' | 'size' | 'count';

export interface FileRejection<F = File> {
  file: F;
  reason: FileRejectionReason;
}

/**
 * Splits picked files into accepted and rejected (wrong type, over `maxSize` bytes, or beyond
 * `maxFiles` counting the `existing` ones). Order is kept.
 */
export function partitionFiles<F extends { name: string; type?: string; size: number }>(
  files: readonly F[],
  { accept, maxSize, maxFiles, existing = 0 }: { accept?: string; maxSize?: number; maxFiles?: number; existing?: number },
): { accepted: F[]; rejected: FileRejection<F>[] } {
  const accepted: F[] = [];
  const rejected: FileRejection<F>[] = [];
  for (const file of files) {
    if (!fileMatchesAccept(file, accept)) rejected.push({ file, reason: 'type' });
    else if (maxSize !== undefined && file.size > maxSize) rejected.push({ file, reason: 'size' });
    else if (maxFiles !== undefined && existing + accepted.length >= maxFiles) rejected.push({ file, reason: 'count' });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

/** The coarse kinds of the object form of `fileKind`, read by `FileUpload` and `Attachment`. */
export type LegacyFileKind = 'image' | 'video' | 'pdf' | 'sheet' | 'archive' | 'text' | 'other';

function legacyFileKind(file: { name: string; type?: string }): LegacyFileKind {
  const type = (file.type ?? '').toLowerCase();
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return 'image';
  if (type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) return 'video';
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || type.includes('spreadsheet') || type === 'text/csv') return 'sheet';
  if (['zip', '7z', 'gz', 'tar', 'rar'].includes(ext) || type.includes('zip')) return 'archive';
  if (type.startsWith('text/') || ['txt', 'md', 'log', 'json', 'xml', 'doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'text';
  return 'other';
}

/**
 * What a service-desk agent does with a file, as one of eleven kinds (file kit 2.57, office
 * formats split out in 2.59): `img` (Bild), `doc` (Dokument: Word and other word-processor
 * files), `sheet` (Tabelle), `slides` (Präsentation), `pdf` (PDF), `mail` (E-Mail), `code`
 * (Code & Konfiguration), `log` (Protokoll), `archive` (Archiv), `text` (Text) and `other`
 * (Datei). Each has a colour (`--uix-file-<kind>`) and a glyph; `FileIcon`, `FileRow` and
 * `FileDrop` read it. The office kinds take the colour people know from the program (Word
 * blue, Excel green, PowerPoint orange, PDF red), tuned to stay clear of the status colours.
 */
export type FileKind = 'img' | 'doc' | 'sheet' | 'slides' | 'pdf' | 'mail' | 'code' | 'log' | 'archive' | 'text' | 'other';

/** The eleven kinds in display order (`other` last). */
export const FILE_KINDS: readonly FileKind[] = ['img', 'doc', 'sheet', 'slides', 'pdf', 'mail', 'code', 'log', 'archive', 'text', 'other'];

/** The extensions of each kind, lower case and without the dot. `other` has none. */
export const FILE_KIND_EXTENSIONS: Readonly<Record<FileKind, readonly string[]>> = {
  img: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'bmp', 'svg'],
  doc: ['docx', 'doc', 'docm', 'dotx', 'odt', 'rtf', 'pages'],
  sheet: ['xlsx', 'xls', 'xlsm', 'csv', 'ods', 'tsv', 'numbers'],
  slides: ['pptx', 'ppt', 'pptm', 'ppsx', 'pps', 'potx', 'odp'],
  pdf: ['pdf'],
  mail: ['eml', 'msg'],
  code: ['json', 'yaml', 'yml', 'xml', 'ps1', 'sh', 'py', 'js', 'ts', 'ini', 'conf', 'toml'],
  log: ['log', 'evtx', 'har', 'dmp', 'trace'],
  archive: ['zip', '7z', 'rar', 'tar', 'gz', 'tgz'],
  text: ['txt', 'md', 'markdown'],
  other: [],
};

const KIND_BY_EXTENSION = new Map<string, FileKind>();
for (const kind of FILE_KINDS) for (const ext of FILE_KIND_EXTENSIONS[kind]) KIND_BY_EXTENSION.set(ext, kind);

/** The words for each kind, German by default (`DEFAULT_FILE_KIND_LABELS`). */
export type FileKindLabels = Record<FileKind, string>;

export const DEFAULT_FILE_KIND_LABELS: FileKindLabels = {
  img: 'Bild', doc: 'Dokument', sheet: 'Tabelle', slides: 'Präsentation', pdf: 'PDF', mail: 'E-Mail',
  code: 'Code & Konfiguration', log: 'Protokoll', archive: 'Archiv', text: 'Text', other: 'Datei',
};

/** The English kind names, for `labels` or `UixLabelsProvider` (`fileKinds`). */
export const FILE_KIND_LABELS_EN: FileKindLabels = {
  img: 'Image', doc: 'Document', sheet: 'Spreadsheet', slides: 'Presentation', pdf: 'PDF', mail: 'Email',
  code: 'Code & configuration', log: 'Log', archive: 'Archive', text: 'Text', other: 'File',
};

/**
 * The extension of a file name, lower case and without the dot: `"report.PDF"` → `"pdf"`,
 * `"backup.tar.gz"` → `"gz"`. `""` when the name has none (`"README"`, `"archive."`).
 */
export function fileExtension(name: string): string {
  const base = name.slice(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
  const dot = base.lastIndexOf('.');
  return dot < 0 ? '' : base.slice(dot + 1).toLowerCase();
}

/** The kind a MIME type names, or `other`. A drag event gives only the type, not the name. */
function kindOfMime(mime: string): FileKind {
  const m = mime.trim().toLowerCase();
  if (!m) return 'other';
  if (m.startsWith('image/')) return 'img';
  if (/\bpdf\b/.test(m)) return 'pdf';
  if (/presentation|powerpoint/.test(m)) return 'slides';
  if (/msword|wordprocessing|opendocument\.text|rtf/.test(m)) return 'doc';
  if (/spreadsheet|excel|csv|tab-separated/.test(m)) return 'sheet';
  if (/markdown/.test(m)) return 'text';
  if (/rfc822|outlook/.test(m)) return 'mail';
  if (/x-log\b/.test(m)) return 'log';
  if (/json|xml|yaml|x-sh|javascript|typescript|x-python|toml/.test(m)) return 'code';
  if (/zip|x-7z|x-rar|vnd\.rar|gzip|x-tar|compressed-tar/.test(m)) return 'archive';
  if (m === 'text/plain') return 'text';
  return 'other';
}

/**
 * The kind of a file from its name and MIME type (file kit 2.57). A known extension wins,
 * because it is the more specific of the two (a `.log` arrives as `text/plain`, a `.ts` as
 * `video/mp2t`); then the MIME type; then `other`. Pass `''` as the name when only the type is
 * known, as in a drag event before the drop.
 *
 * The object form (`fileKind({ name, type })`) is the older coarse mapping that `FileUpload`
 * and `Attachment` use.
 */
export function fileKind(name: string, mime?: string): FileKind;
/** @deprecated The coarse kinds of `FileUpload` and `Attachment`; use `fileKind(name, mime)`. */
export function fileKind(file: { name: string; type?: string }): LegacyFileKind;
export function fileKind(nameOrFile: string | { name: string; type?: string }, mime?: string): FileKind | LegacyFileKind {
  if (typeof nameOrFile !== 'string') return legacyFileKind(nameOrFile);
  return KIND_BY_EXTENSION.get(fileExtension(nameOrFile)) ?? kindOfMime(mime ?? '');
}

/**
 * The short type label a `FileIcon` shows on its corner: the extension in capitals, at most
 * four letters (`"PDF"`, `"XLSX"`, `"JPEG"`; `"markdown"` → `"MARK"`). `""` without one.
 */
export function fileTypeLabel(name: string): string {
  return fileExtension(name).slice(0, 4).toUpperCase();
}
