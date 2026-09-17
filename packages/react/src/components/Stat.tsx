import { forwardRef, useId } from 'react';
import type { ReactNode, HTMLAttributes, Ref } from 'react';
import { cx } from '../cx.js';

export interface StatTrend {
  direction: 'up' | 'down';
  label: ReactNode;
}

export interface StatProps extends HTMLAttributes<HTMLElement> {
  label: ReactNode;
  value: ReactNode;
  /** Optional icon shown at the trailing edge of the label row. */
  icon?: ReactNode;
  /** Supporting line under the value (e.g. "vs last week"). */
  meta?: ReactNode;
  /** Trend chip rendered before the meta text. */
  trend?: StatTrend;
  /** Outline and value colour. `neutral` (default) is today's tile. */
  tone?: 'neutral' | 'warning' | 'danger';
  /** `hero` (default) is today's KPI size; `compact` is for dense fact bands. */
  size?: 'hero' | 'compact';
  /**
   * Makes the whole tile a `<button>` that opens an editor (a popover or dialog). It gets
   * `aria-haspopup="dialog"` and a trailing chevron.
   */
  onActivate?: () => void;
  /** Action word appended to the accessible name, e.g. "change" → "Priority: P1, change". */
  activateLabel?: string;
  /** Whether the editor this tile opens is currently open (`aria-expanded`). */
  expanded?: boolean;
}

const Chevron = () => (
  <span className="uix-stat__chevron" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </span>
);

/**
 * KPI / stat tile over `.uix-stat`. With `onActivate` the tile is a button; the forwarded
 * ref then points at that button, so a popover can anchor to it.
 */
export const Stat = forwardRef<HTMLElement, StatProps>(function Stat(
  { label, value, icon, meta, trend, tone = 'neutral', size = 'hero', onActivate, activateLabel, expanded, className, onClick, ...props },
  ref,
) {
  const id = useId();
  const interactive = onActivate != null;
  const classes = cx(
    'uix-stat',
    tone !== 'neutral' && `uix-stat--${tone}`,
    size === 'compact' && 'uix-stat--compact',
    interactive && 'uix-stat--interactive',
    className,
  );

  // a <button> may only hold phrasing content, so the interactive tile uses block spans
  const Row = interactive ? 'span' : 'div';
  const body = (
    <>
      <Row className="uix-stat__label">
        <span id={interactive ? `${id}-label` : undefined}>{label}</span>
        {icon}
        {interactive && <Chevron />}
      </Row>
      <Row className="uix-stat__value" id={interactive ? `${id}-value` : undefined}>{value}</Row>
      {(meta != null || trend != null) && (
        <Row className="uix-stat__meta" id={interactive ? `${id}-meta` : undefined}>
          {trend != null && (
            <span className={cx('uix-stat__trend', `uix-stat__trend--${trend.direction}`)}>
              {/* direction glyph + hidden text — the chip is otherwise colour-only (UIX-A11Y-4) */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {trend.direction === 'up' ? <path d="M12 19V5m-6 6 6-6 6 6" /> : <path d="M12 5v14m6-6-6 6-6-6" />}
              </svg>
              <span className="uix-visually-hidden">{trend.direction === 'up' ? 'up' : 'down'}</span>
              {trend.label}
            </span>
          )}
          {meta}
        </Row>
      )}
    </>
  );

  if (!interactive) {
    return <div ref={ref as Ref<HTMLDivElement>} className={classes} onClick={onClick} {...(props as HTMLAttributes<HTMLDivElement>)}>{body}</div>;
  }

  // Name = "label: value, action"; the meta line is the description, so a long SLA or
  // reason line doesn't bury the value.
  return (
    <button
      type="button"
      {...(props as HTMLAttributes<HTMLButtonElement>)}
      ref={ref as Ref<HTMLButtonElement>}
      className={classes}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-labelledby={`${id}-label ${id}-sep ${id}-value${activateLabel ? ` ${id}-action` : ''}`}
      aria-describedby={meta != null || trend != null ? `${id}-meta` : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onActivate();
      }}
    >
      <span id={`${id}-sep`} className="uix-visually-hidden">:</span>
      {activateLabel && <span id={`${id}-action`} className="uix-visually-hidden">, {activateLabel}</span>}
      {body}
    </button>
  );
});
