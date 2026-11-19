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

/** A level the latest value should not cross (`above`: higher is bad; `below`: lower is bad). */
export interface SparklineThreshold {
  value: number;
  direction: 'above' | 'below';
}

export interface SparklineProps extends Omit<SVGAttributes<SVGSVGElement>, 'values' | 'target'> {
  /**
   * The series, oldest first. `null` (or `NaN`) is a missing value: the line breaks there and it
   * is never drawn as zero. A lone value between two gaps is a small dot.
   */
  values: ReadonlyArray<number | null>;
  /** Width in px. Default 86. */
  width?: number;
  /** Height in px. Default 24. */
  height?: number;
  /** `ink` (default): a muted line with an ink endpoint. `series`: the series blue. */
  tone?: 'ink' | 'series';
  /**
   * What the line shows ("Rückstand der letzten 11 Wochen"). With `valueText` the accessible name
   * is "label: valueText". Without either the sparkline is decoration (`aria-hidden`): say the
   * number beside it in words.
   */
  label?: string;
  /**
   * The current value in words or numbers ("85 offen, Ziel 60"). It joins the accessible name;
   * with `showValue` it is also written beside the line. Mention the target or threshold here:
   * the dashed line and the diamond are not read out on their own.
   */
  valueText?: string;
  /** Write `valueText` beside the line (the group becomes one image with the same name). Default false. */
  showValue?: boolean;
  /** A horizontal dashed reference line at this value; the scale always includes it. */
  target?: number;
  /** When the latest value is past it, the last mark becomes an amber diamond (shape and colour). */
  threshold?: SparklineThreshold;
  /** Mark the latest known value with a dot. Default true. */
  highlightLast?: boolean;
}

const isValue = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const round = (n: number) => Number(n.toFixed(1));

/**
 * A trend line without axes, beside a number: an ink-grey line and a dot on the latest value.
 * Missing values are gaps, an optional dashed `target` sits under the data, a crossed `threshold`
 * turns the last dot into a diamond, and `valueText` keeps the value in text. `className` goes
 * on the outermost element; every other attribute goes on the `svg.uix-sparkline`.
 */
export function Sparkline({
  values, width = 86, height = 24, tone = 'ink', label, valueText, showValue = false, target, threshold,
  highlightLast = true, className, ...props
}: SparklineProps) {
  const pad = 3;
  const known = values.filter(isValue);
  const domain = isValue(target) ? [...known, target] : known;
  const min = Math.min(...domain);
  const max = Math.max(...domain);
  const x = (i: number) => (values.length < 2 ? width / 2 : pad + (i * (width - 2 * pad)) / (values.length - 1));
  const y = (v: number) => (max === min ? height / 2 : height - pad - ((v - min) / (max - min)) * (height - 2 * pad));

  // consecutive known values form a segment; a missing one ends it
  const segments: Array<Array<readonly [number, number]>> = [];
  let run: Array<readonly [number, number]> | null = null;
  let lastIndex = -1;
  values.forEach((v, i) => {
    if (!isValue(v)) { run = null; return; }
    if (!run) { run = []; segments.push(run); }
    run.push([x(i), y(v)]);
    lastIndex = i;
  });
  const lastValue = lastIndex >= 0 ? (values[lastIndex] as number) : undefined;
  const crossed = threshold != null && lastValue !== undefined
    && (threshold.direction === 'above' ? lastValue > threshold.value : lastValue < threshold.value);
  const end = lastValue !== undefined ? ([x(lastIndex), y(lastValue)] as const) : undefined;
  const markEnd = end !== undefined && (highlightLast || crossed);
  const fmt = (n: number) => n.toFixed(1);

  const name = [label, valueText].filter(Boolean).join(': ');
  const grouped = showValue && Boolean(valueText);
  const svg = (
    <svg
      className={cx('uix-sparkline', tone === 'series' && 'uix-sparkline--series', !grouped && className)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      {...(name && !grouped ? { role: 'img', 'aria-label': name } : { 'aria-hidden': true })}
      focusable="false"
      {...props}
    >
      {isValue(target) && known.length > 0 && (
        <line className="uix-sparkline__target" x1={pad} x2={width - pad} y1={round(y(target))} y2={round(y(target))} />
      )}
      {segments.map((points) => {
        const [px, py] = points[0]!;
        if (points.length > 1) {
          const d = points.map(([sx, sy], i) => `${i ? 'L' : 'M'}${fmt(sx)} ${fmt(sy)}`).join(' ');
          return <path key={`${px}`} className="uix-sparkline__line uix-arrive__trace" d={d} pathLength={1} />;
        }
        if (markEnd && end && px === end[0]) return null;
        return <circle key={`${px}`} className="uix-sparkline__point" cx={round(px)} cy={round(py)} r={1.25} />;
      })}
      {markEnd && end && (crossed ? (
        <path
          className="uix-sparkline__end uix-sparkline__end--crossed"
          d={`M${fmt(end[0])} ${fmt(end[1] - 3.5)} L${fmt(end[0] + 3.5)} ${fmt(end[1])} L${fmt(end[0])} ${fmt(end[1] + 3.5)} L${fmt(end[0] - 3.5)} ${fmt(end[1])} Z`}
        />
      ) : (
        <circle className="uix-sparkline__end" cx={round(end[0])} cy={round(end[1])} r={2.5} />
      ))}
    </svg>
  );
  if (!grouped) return svg;
  return (
    <span className={cx('uix-sparkline-group', className)} role="img" aria-label={name}>
      {svg}
      <span className="uix-sparkline__value">{valueText}</span>
    </span>
  );
}
