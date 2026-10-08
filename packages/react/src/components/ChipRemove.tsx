"use client";

import { XIcon } from '../icons/components.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';

interface ChipRemoveButtonProps {
  /** The chip's `removeLabel`, when one was passed. */
  label?: string;
  /** The chip text for `{label}`; empty when the chip's children are not text. */
  text: string;
  disabled?: boolean;
  onRemove: () => void;
}

/**
 * The × of a removable `Chip`. Internal. Its own client component so its name can come from
 * `UixLabelsProvider` (`chip.remove`) while `Chip` itself stays server-renderable (HAR-1632).
 */
export function ChipRemoveButton({ label, text, disabled, onRemove }: ChipRemoveButtonProps) {
  const provided = useUixLabels().chip?.remove;
  const template = label ?? provided ?? 'Remove {label}';
  return (
    <button type="button" className="uix-chip__remove" aria-label={fillLabel(template, { label: text }).trim()} disabled={disabled} onClick={onRemove}>
      <XIcon />
    </button>
  );
}
