"use client";

import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { DEFAULT_ATTACHMENT_LABELS } from '../attachment-labels.js';
import type { AttachmentLabels } from '../attachment-labels.js';
import { Button } from './Button.js';

/** Prop, then `UixLabelsProvider` `attachment`, then the English default. */
function useAttachmentLabel(key: keyof AttachmentLabels, override: string | undefined): string {
  const provided = useUixLabels().attachment?.[key];
  return override ?? provided ?? DEFAULT_ATTACHMENT_LABELS[key];
}

interface AttachmentTextProps {
  label: keyof AttachmentLabels;
  /** The row's own `labels[label]`, when it was passed. */
  override?: string;
  name: string;
}

/**
 * One translated string of an `Attachment` row. Internal. `Attachment` is server-renderable
 * and so cannot read `UixLabelsProvider` itself; these small client parts do it for it
 * (HAR-1630).
 */
export function AttachmentText({ label, override, name }: AttachmentTextProps) {
  return <>{fillLabel(useAttachmentLabel(label, override), { name })}</>;
}

interface AttachmentRemoveButtonProps {
  override?: string;
  name: string;
  onRemove: () => void;
}

/** The remove button of an `Attachment` row. Internal. */
export function AttachmentRemoveButton({ override, name, onRemove }: AttachmentRemoveButtonProps) {
  return (
    <Button type="button" size="xs" variant="ghost" icon aria-label={fillLabel(useAttachmentLabel('remove', override), { name })} onClick={onRemove}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
    </Button>
  );
}
