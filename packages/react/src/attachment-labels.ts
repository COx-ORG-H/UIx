/**
 * The words of an `Attachment` row. In a module of its own, with no "use client": the
 * server-renderable `Attachment` and its client parts both read it, and a server component can
 * still import the defaults as plain values.
 */
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
