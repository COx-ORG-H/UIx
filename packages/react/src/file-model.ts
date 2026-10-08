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

/** A coarse kind for a file icon. */
export function fileKind(file: { name: string; type?: string }): 'image' | 'video' | 'pdf' | 'sheet' | 'archive' | 'text' | 'other' {
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
