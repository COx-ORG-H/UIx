"use client";

import { XIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';

interface AlertDismissButtonProps {
  /** The alert's `dismissLabel`, when one was passed. */
  label?: string;
  onDismiss: () => void;
}

/**
 * The × of a dismissible `Alert`. Internal. Its own client component so its name can come from
 * `UixLabelsProvider` (`alert.dismiss`) while `Alert` itself stays server-renderable (HAR-1614).
 */
export function AlertDismissButton({ label, onDismiss }: AlertDismissButtonProps) {
  const provided = useUixLabels().alert?.dismiss;
  return (
    <button type="button" className="uix-btn uix-btn--ghost uix-btn--xs uix-btn--icon uix-alert__dismiss" aria-label={label ?? provided ?? 'Dismiss'} onClick={onDismiss}>
      <XIcon size="sm" />
    </button>
  );
}
