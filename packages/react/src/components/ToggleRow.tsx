"use client";

import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { Switch } from './Switch.js';

export interface ToggleRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  accessibleLabel: string;
}

export function ToggleRow({ label, description, checked, onCheckedChange, disabled, accessibleLabel, className, ...props }: ToggleRowProps) {
  return (
    <div className={cx('uix-toggle-row', className)} {...props}>
      <div className="uix-toggle-row__copy">
        <div className="uix-toggle-row__label">{label}</div>
        {description != null && <div className="uix-toggle-row__description">{description}</div>}
      </div>
      <Switch checked={checked} disabled={disabled} aria-label={accessibleLabel} onChange={(event) => onCheckedChange(event.currentTarget.checked)} />
    </div>
  );
}
