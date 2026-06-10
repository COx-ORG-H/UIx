/* @uix registry item — ported from ITSMx apps/web/components/ui/stat-tile.tsx */

import type { ReactNode } from 'react';
import { StatusPill, type StatusPillTone } from './status-pill';
import { cn } from './utils';

/**
 * "Eyebrow over data-hero" stat tile: small uppercase label, large
 * tabular-nums number at weight 400 (NOT bold), meta hint + optional
 * trend pill on the bottom row.
 *
 * Port decouplings from the ITSMx donor:
 *   - next/link → plain <a href> (registry items are framework-agnostic;
 *     same precedent as detail-layout backHref).
 *   - trend pill → relative ./status-pill import (generic tones, no ITSM
 *     taxonomy).
 *   - ITSMx global classes → uix tokens: .type-eyebrow / .type-data-hero /
 *     .type-meta become inline token reads; .surface-card becomes
 *     bg/border utilities + the 'var(--uix-shadow-sm), var(--uix-highlight-top)'
 *     shadow pair (the light-mode highlight-top is a no-op inset, so the
 *     comma list is valid in both modes).
 *
 * Background/border ship as theme utilities (not inline style) so the
 * href variant's hover:border-uix-line-strong lift actually wins — an
 * inline borderColor would out-rank the hover class.
 */

export interface StatTileTrend {
  tone: StatusPillTone;
  label: ReactNode;
}

export interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: StatTileTrend;
  /** When set, the tile becomes a link with a hover border lift. */
  href?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatTile({ label, value, hint, trend, href, icon, className }: StatTileProps) {
  const body = (
    <div
      className={cn(
        'group flex h-full flex-col gap-3 rounded-md border border-uix-line bg-uix-surface p-5 transition-colors',
        href ? 'hover:border-uix-line-strong' : '',
        className,
      )}
      style={{
        boxShadow: 'var(--uix-shadow-sm), var(--uix-highlight-top)',
        color: 'var(--uix-text)',
        transitionDuration: 'var(--uix-dur)',
        transitionTimingFunction: 'var(--uix-ease-out-strong)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[11px] uppercase"
          style={{
            letterSpacing: 'var(--uix-tracking-eyebrow)',
            color: 'var(--uix-text-hushed)',
          }}
        >
          {label}
        </p>
        {icon ? (
          <span className="text-uix-muted transition-colors group-hover:text-uix-text">
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className="tabular-nums tracking-tight"
        style={{
          fontSize: 'var(--uix-text-data-hero)',
          lineHeight: 'var(--uix-leading-data-hero)',
        }}
      >
        {value}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2">
        {hint ? (
          <span style={{ fontSize: 'var(--uix-text-meta)', color: 'var(--uix-text-muted)' }}>
            {hint}
          </span>
        ) : (
          <span />
        )}
        {trend ? <StatusPill tone={trend.tone}>{trend.label}</StatusPill> : null}
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block h-full">
      {body}
    </a>
  ) : (
    body
  );
}
