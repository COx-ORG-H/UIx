"use client";

import { useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { Switch } from './Switch.js';

export interface ToggleRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The row's visible label. It is the switch's `<label>`: clicking it flips the switch, and it names the switch. */
  label: ReactNode;
  /** Shown under the label and announced as the switch's description (`aria-describedby`). */
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /**
   * The switch's name when the visible label is not text (an icon, an image).
   * Leave it out for a text label: the label already names the switch, and a
   * repeated `aria-label` would replace it.
   */
  accessibleLabel?: string;
}

export function ToggleRow({ label, description, checked, onCheckedChange, disabled, accessibleLabel, className, ...props }: ToggleRowProps) {
  // HAR-1607 — the label was a plain <div> with no tie to the switch: clicking
  // the words did nothing, and the description was never announced with it.
  const id = useId();
  const switchId = `${id}-switch`;
  const descriptionId = `${id}-description`;
  return (
    <div className={cx('uix-toggle-row', className)} {...props}>
      <div className="uix-toggle-row__copy">
        <div className="uix-toggle-row__label">
          <label htmlFor={switchId}>{label}</label>
        </div>
        {description != null && (
          <div className="uix-toggle-row__description" id={descriptionId}>
            {description}
          </div>
        )}
      </div>
      <Switch
        id={switchId}
        checked={checked}
        disabled={disabled}
        {...(accessibleLabel ? { 'aria-label': accessibleLabel } : {})}
        {...(description != null ? { 'aria-describedby': descriptionId } : {})}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
      />
    </div>
  );
}
