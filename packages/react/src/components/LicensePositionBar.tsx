import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { Meter } from './Meter.js';
import { StatusPill } from './StatusPill.js';

export interface LicensePositionBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  consumed: number;
  entitled: number;
  consumedLabel?: string;
  entitledLabel?: string;
  availableLabel?: string;
  overLabel?: string;
  unit?: string;
  formatValue?: (value: number) => string;
}

const defaultCapacityFormat = (value: number) => new Intl.NumberFormat().format(value);

/** Capacity-versus-limit recipe with a visible and textual over-allocation state. */
export function LicensePositionBar({
  consumed, entitled, consumedLabel = 'Consumed', entitledLabel = 'Entitled',
  availableLabel = 'available', overLabel = 'over limit', unit = '',
  formatValue = defaultCapacityFormat, className, ...props
}: LicensePositionBarProps) {
  const safeConsumed = Math.max(0, consumed);
  const safeEntitled = Math.max(0, entitled);
  const over = Math.max(0, safeConsumed - safeEntitled);
  const available = Math.max(0, safeEntitled - safeConsumed);
  const percent = safeEntitled === 0 ? (safeConsumed > 0 ? 100 : 0) : (safeConsumed / safeEntitled) * 100;
  const format = (value: number) => `${formatValue(value)}${unit ? ` ${unit}` : ''}`;
  const summary = `${consumedLabel}: ${format(safeConsumed)}. ${entitledLabel}: ${format(safeEntitled)}. ${over > 0 ? `${format(over)} ${overLabel}` : `${format(available)} ${availableLabel}`}.`;

  return (
    <div className={cx('uix-license-position', over > 0 && 'uix-license-position--over', className)} {...props}>
      <div className="uix-license-position__header">
        <span className="uix-license-position__value">{format(safeConsumed)} / {format(safeEntitled)}</span>
        <StatusPill tone={over > 0 ? 'danger' : percent >= 80 ? 'warning' : 'success'}>
          {over > 0 ? `${format(over)} ${overLabel}` : `${format(available)} ${availableLabel}`}
        </StatusPill>
      </div>
      <div className="uix-license-position__track">
        <Meter value={Math.min(100, percent)} tone={over > 0 ? 'danger' : percent >= 80 ? 'warning' : 'success'} aria-label={summary} aria-valuetext={summary} />
        {over > 0 && (
          <span
            className="uix-license-position__overflow"
            style={{ width: `${Math.min(100, safeEntitled === 0 ? 100 : (over / safeEntitled) * 100)}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <span className="uix-visually-hidden">{summary}</span>
    </div>
  );
}
