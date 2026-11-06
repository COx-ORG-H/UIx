import type { CSSProperties, HTMLAttributes, ReactNode, SVGAttributes } from 'react';
import { cx } from '../cx.js';
import { StatusDot } from './StatusDot.js';
import type { StatusDotTone } from './StatusDot.js';

/* The small marks a glance card holds (calm kit 2.56): a bar list, a service status strip and a
 * sparkline. Plain HTML and SVG on the chart-card.css classes, server-renderable, no chart engine.
 * Inside an `Arrive` stage the bars grow and the line traces in once. */

// ── BarList ────────────────────────────────────────────────────────────────────────────────

export interface BarListItem {
  /** Stable key; defaults to the position. */
  id?: string;
  label: ReactNode;
  value: number;
  /** What the value column shows; default the number in the runtime locale. */
  display?: ReactNode;
  /** `series` (default, the series blue), `comparison` (grey) or `warning` (a bucket that needs a look). */
  tone?: 'series' | 'comparison' | 'warning';
}

export interface BarListProps extends HTMLAttributes<HTMLUListElement> {
  items: BarListItem[];
  /** The value of a full bar. Default the largest value. */
  max?: number;
}

/**
 * One row per bucket: its label, a bar and its value ("Wie alt ist der Rückstand?": four age
 * buckets). Every value is written out, so the bars are decoration for the eye; a bar above zero
 * is never thinner than 2 %, so a 1 next to an 82 still shows.
 */
export function BarList({ items, max, className, ...props }: BarListProps) {
  const top = max ?? Math.max(0, ...items.map((item) => item.value));
  return (
    <ul className={cx('uix-bar-list', className)} {...props}>
      {items.map((item, index) => {
        const share = top > 0 ? Math.max(0, Math.min(1, item.value / top)) : 0;
        const val = item.value > 0 ? Math.max(share, 0.02) : 0;
        return (
          <li key={item.id ?? index} className="uix-bar-list__row" data-tone={item.tone && item.tone !== 'series' ? item.tone : undefined}>
            <span className="uix-bar-list__label">{item.label}</span>
            <span className="uix-bar-list__track" aria-hidden="true">
              <span className="uix-bar-list__bar uix-arrive__grow" style={{ '--val': val, '--uix-arrive-j': index } as CSSProperties} />
            </span>
            <span className="uix-bar-list__value">{item.display ?? item.value.toLocaleString()}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ── StatusStrip ────────────────────────────────────────────────────────────────────────────

export type StatusStripTone = 'ok' | 'warning' | 'critical' | 'unknown';

export interface StatusStripItem {
  id: string;
  label: ReactNode;
  tone: StatusStripTone;
  /** The state in words for the affected list: "eingeschränkt", "gestört". */
  state?: ReactNode;
}

export interface StatusStripProps extends HTMLAttributes<HTMLDivElement> {
  items: StatusStripItem[];
  /** What the strip says as a whole, for assistive technology: "9 von 12 Diensten in Betrieb". */
  summary: string;
  /** List the services that are not ok under the strip (default true). */
  listAffected?: boolean;
}

const STRIP_DOT: Record<StatusStripTone, StatusDotTone> = { ok: 'success', warning: 'warning', critical: 'critical', unknown: 'neutral' };

/**
 * One cell per service, then only the affected ones by name ("Laufen die Dienste?"): the strip
 * is the glance, the list is the answer. Critical services come first, then degraded, then
 * unknown; healthy ones are only cells.
 */
export function StatusStrip({ items, summary, listAffected = true, className, ...props }: StatusStripProps) {
  const rank: Record<StatusStripTone, number> = { critical: 0, warning: 1, unknown: 2, ok: 3 };
  const affected = items.filter((item) => item.tone !== 'ok').sort((a, b) => rank[a.tone] - rank[b.tone]);
  return (
    <div className={cx('uix-status-strip', className)} {...props}>
      <div className="uix-status-strip__cells" role="img" aria-label={summary}>
        {items.map((item) => <span key={item.id} className="uix-status-strip__cell" data-tone={item.tone} />)}
      </div>
      {listAffected && affected.length > 0 && (
        <ul className="uix-status-strip__list">
          {affected.map((item) => (
            <li key={item.id} className="uix-status-strip__item">
              <StatusDot tone={STRIP_DOT[item.tone]} quiet className="uix-status-strip__name">{item.label}</StatusDot>
              {item.state != null && <span className="uix-status-strip__state">{item.state}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────────────────────

export interface SparklineProps extends Omit<SVGAttributes<SVGSVGElement>, 'values'> {
  values: number[];
  /** Width in px. Default 86. */
  width?: number;
  /** Height in px. Default 24. */
  height?: number;
  /** `ink` (default): a muted line with an ink endpoint. `series`: the series blue. */
  tone?: 'ink' | 'series';
  /**
   * What the line says ("Rückstand der letzten 11 Wochen, von 20 auf 85"). Without it the
   * sparkline is decoration (`aria-hidden`): say the number beside it in words.
   */
  label?: string;
}

/** A trend line without axes, beside a number: an ink-grey line and a dot on the latest value. */
export function Sparkline({ values, width = 86, height = 24, tone = 'ink', label, className, ...props }: SparklineProps) {
  const finite = values.filter((v) => Number.isFinite(v));
  const pad = 3;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const x = (i: number) => (values.length < 2 ? width / 2 : pad + (i * (width - 2 * pad)) / (values.length - 1));
  const y = (v: number) => height - pad - ((v - min) / (max - min || 1)) * (height - 2 * pad);
  const points = values.map((v, i) => [x(i), y(v)] as const).filter((_, i) => Number.isFinite(values[i]));
  const d = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <svg
      className={cx('uix-sparkline', tone === 'series' && 'uix-sparkline--series', className)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      focusable="false"
      {...props}
    >
      {points.length > 1 && <path className="uix-sparkline__line uix-arrive__trace" d={d} pathLength={1} />}
      {last && <circle className="uix-sparkline__end" cx={last[0]} cy={last[1]} r={2.5} />}
    </svg>
  );
}
