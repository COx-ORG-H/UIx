import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { CircleCheckIcon, CircleQuestionMarkIcon, OctagonAlertIcon, TriangleAlertIcon } from '../icons/components.js';

/*
 * InsightCard (HAR-1556, charts C4): a card whose headline is the ANSWER. It carries the status
 * (text + icon, never colour alone), KPIs with a comparison and a target bullet, the chart, an
 * optional aside (a correlation scatter), an honest coverage note, the source and one action.
 * Server-renderable: no state, no effects.
 */

export type InsightStatusTone = 'ok' | 'warning' | 'critical' | 'unknown';

export interface InsightStatus {
  tone: InsightStatusTone;
  /** The words: the status is always readable without its colour or icon. */
  label: string;
}

export interface InsightComparison {
  text: ReactNode;
  /** Direction × whether that direction is good; `neutral` when it is neither. */
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

export interface InsightTarget {
  actual: number;
  target: number;
  /** Qualitative bands from the start of the scale, e.g. [[0, 10], [10, 15], [15, 24]]. */
  ranges?: [number, number][];
  /** The scale's end. Default: the larger of the last range, the actual and the target, plus 10 %. */
  max?: number;
}

export interface InsightKpi {
  value: ReactNode;
  label: ReactNode;
  comparison?: InsightComparison;
  target?: InsightTarget;
}

export interface InsightCoverage {
  covered: number;
  total: number;
  /** What was counted, e.g. "changes classified". */
  note: ReactNode;
  /** Shown when the last period is still filling up. */
  partialPeriod?: ReactNode;
}

/** Every word the card writes itself. English defaults in {@link DEFAULT_INSIGHT_CARD_LABELS}. */
export interface InsightCardLabels {
  /** "412 of 431 changes classified (96%)". */
  coverage: (covered: number, total: number, percent: number, note: ReactNode) => ReactNode;
  /** The bullet's accessible description. */
  bullet: (actual: string, target: string) => string;
  source: string;
  updated: string;
  kpis: string;
  formatNumber: (value: number) => string;
}

const defaultNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

export const DEFAULT_INSIGHT_CARD_LABELS: InsightCardLabels = {
  coverage: (covered, total, percent, note) => <>{covered} of {total} {note} ({percent}%)</>,
  bullet: (actual, target) => `${actual} against a target of ${target}`,
  source: 'Source',
  updated: 'Updated',
  kpis: 'Key figures',
  formatNumber: (value) => defaultNumber.format(value),
};

export interface InsightCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  /** The answer, as a sentence (≤ 10 words reads best). */
  headline: ReactNode;
  /** The implication and the suggested decision. */
  sowhat?: ReactNode;
  status?: InsightStatus;
  kpis?: InsightKpi[];
  coverage?: InsightCoverage;
  /** One drill-down action (a link or button). */
  actions?: ReactNode;
  source?: ReactNode;
  updated?: ReactNode;
  /** `split` puts the aside on the right when the card is ≥ 60rem (960 px) wide; below, it stacks. */
  layout?: 'stack' | 'split';
  aside?: ReactNode;
  /** The headline's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
  labels?: Partial<InsightCardLabels>;
  children?: ReactNode;
}

const STATUS_ICON = {
  ok: CircleCheckIcon,
  warning: TriangleAlertIcon,
  critical: OctagonAlertIcon,
  unknown: CircleQuestionMarkIcon,
} as const;

export function InsightCard({
  eyebrow,
  headline,
  sowhat,
  status,
  kpis,
  coverage,
  actions,
  source,
  updated,
  layout = 'stack',
  aside,
  headingLevel = 3,
  labels: labelOverrides,
  className,
  children,
  ...props
}: InsightCardProps) {
  const labels = { ...DEFAULT_INSIGHT_CARD_LABELS, ...labelOverrides };
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const StatusIcon = status ? STATUS_ICON[status.tone] : null;
  const percent = coverage && coverage.total > 0 ? Math.round((coverage.covered / coverage.total) * 100) : null;
  const hasFooter = coverage != null || source != null || updated != null || actions != null;
  return (
    <article className={cx('uix-insight', className)} data-layout={layout} {...props}>
      <header className="uix-insight__header">
        <div className="uix-insight__heading">
          {eyebrow != null ? <div className="uix-insight__eyebrow">{eyebrow}</div> : null}
          <Heading className="uix-insight__headline">{headline}</Heading>
          {sowhat != null ? <p className="uix-insight__sowhat">{sowhat}</p> : null}
        </div>
        {status && StatusIcon ? (
          <span className="uix-insight__status" data-tone={status.tone}>
            <StatusIcon size="sm" aria-hidden="true" />
            <span>{status.label}</span>
          </span>
        ) : null}
      </header>
      {kpis?.length ? (
        <dl className="uix-insight__kpis" aria-label={labels.kpis}>
          {kpis.map((kpi, index) => (
            <div className="uix-insight__kpi" key={index}>
              <dt className="uix-insight__kpi-label">{kpi.label}</dt>
              <dd className="uix-insight__kpi-value">{kpi.value}</dd>
              {kpi.comparison ? (
                <dd className="uix-insight__kpi-comparison" data-tone={kpi.comparison.tone ?? 'neutral'}>{kpi.comparison.text}</dd>
              ) : null}
              {kpi.target ? (
                <dd className="uix-insight__kpi-target">
                  <Bullet {...kpi.target} label={labels.bullet(labels.formatNumber(kpi.target.actual), labels.formatNumber(kpi.target.target))} />
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
      {children != null || aside != null ? (
        <div className="uix-insight__body">
          {children != null ? <div className="uix-insight__main">{children}</div> : null}
          {aside != null ? <div className="uix-insight__aside">{aside}</div> : null}
        </div>
      ) : null}
      {hasFooter ? (
        <footer className="uix-insight__footer">
          <div className="uix-insight__meta">
            {coverage && percent != null ? (
              <p className="uix-insight__coverage">
                {labels.coverage(coverage.covered, coverage.total, percent, coverage.note)}
                {coverage.partialPeriod != null ? <span className="uix-insight__partial">{coverage.partialPeriod}</span> : null}
              </p>
            ) : null}
            {source != null || updated != null ? (
              <p className="uix-insight__source">
                {source != null ? <span>{labels.source}: {source}</span> : null}
                {updated != null ? <span>{labels.updated}: {updated}</span> : null}
              </p>
            ) : null}
          </div>
          {actions != null ? <div className="uix-insight__actions">{actions}</div> : null}
        </footer>
      ) : null}
    </article>
  );
}

export interface BulletProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'>, InsightTarget {
  /** The accessible description, e.g. "18.7 h against a target of 15 h". */
  label: string;
}

/**
 * A bullet graph (Few): grey qualitative bands, a dark bar for the actual, a tick for the target.
 * It replaces a gauge: the comparison is a length on one scale, not an angle.
 */
export function Bullet({ actual, target, ranges, max, label, className, style, ...props }: BulletProps) {
  const end = Math.max(max ?? 0, ...(ranges ?? []).map((r) => r[1]), actual, target, 0) * (max ? 1 : 1.1) || 1;
  const pct = (value: number) => `${Math.max(0, Math.min(100, (value / end) * 100))}%`;
  return (
    <div className={cx('uix-bullet', className)} role="img" aria-label={label} style={style} {...props}>
      {(ranges ?? []).map(([from, to], index) => (
        <span
          key={index}
          className="uix-bullet__range"
          data-band={Math.min(index, 2)}
          style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}
        />
      ))}
      <span className="uix-bullet__bar" style={{ width: pct(actual) }} />
      <span className="uix-bullet__target" style={{ left: pct(target) }} />
    </div>
  );
}
