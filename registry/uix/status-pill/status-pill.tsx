/* @uix registry item — generic-tone rebuild of the ITSMx StatusPill/Badge pair */

import type { CSSProperties, ReactNode } from 'react';
import { cn } from './utils';

/**
 * Compact status pill with a generic tone API — deliberately NOT the ITSMx
 * badge taxonomy (severity-*, state-*, compliance-*); consumers map their own
 * domain semantics onto tones.
 *
 * Color contract:
 *   - on pale `*-bg` washes the TEXT is the status color itself
 *     (e.g. warning text on warning-bg) — the `*-fg` tokens are
 *     text-on-SOLID-fill colors and are only used for the one solid
 *     fill in the matrix (critical = solid danger + danger-fg).
 *   - outline treatment derives its border from the tone color via
 *     color-mix (40%; 60% for critical so the most urgent outline
 *     reads strongest).
 *
 * Geometry mirrors the ITSMx Badge §9 spec, including the literal
 * 0.04em letter-spacing — the donor pins 0.04em explicitly while
 * --uix-tracking-eyebrow is 0.06em (eyebrow labels track wider than
 * bold 11px pills), so the literal is the closer match.
 *
 * A <span>, not a button — pills are passive labels.
 */

export type StatusPillTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'muted';

export type StatusPillTreatment = 'filled' | 'outline';

export interface StatusPillProps {
  /** Default 'neutral'. */
  tone?: StatusPillTone;
  /** Default 'filled'. */
  treatment?: StatusPillTreatment;
  className?: string;
  children: ReactNode;
}

const FILLED: Record<StatusPillTone, CSSProperties> = {
  critical: { background: 'var(--uix-danger)', color: 'var(--uix-danger-fg)' },
  danger: { background: 'var(--uix-danger-bg)', color: 'var(--uix-danger)' },
  warning: { background: 'var(--uix-warning-bg)', color: 'var(--uix-warning)' },
  success: { background: 'var(--uix-success-bg)', color: 'var(--uix-success)' },
  info: { background: 'var(--uix-info-bg)', color: 'var(--uix-info)' },
  neutral: { background: 'var(--uix-bg-active)', color: 'var(--uix-text-hushed)' },
  muted: { background: 'transparent', color: 'var(--uix-text-muted)' },
};

const OUTLINE: Record<StatusPillTone, CSSProperties> = {
  critical: {
    background: 'transparent',
    color: 'var(--uix-danger)',
    border: '1px solid color-mix(in srgb, var(--uix-danger) 60%, transparent)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--uix-danger)',
    border: '1px solid color-mix(in srgb, var(--uix-danger) 40%, transparent)',
  },
  warning: {
    background: 'transparent',
    color: 'var(--uix-warning)',
    border: '1px solid color-mix(in srgb, var(--uix-warning) 40%, transparent)',
  },
  success: {
    background: 'transparent',
    color: 'var(--uix-success)',
    border: '1px solid color-mix(in srgb, var(--uix-success) 40%, transparent)',
  },
  info: {
    background: 'transparent',
    color: 'var(--uix-info)',
    border: '1px solid color-mix(in srgb, var(--uix-info) 40%, transparent)',
  },
  neutral: {
    background: 'transparent',
    color: 'var(--uix-text-hushed)',
    border: '1px solid var(--uix-border-strong)',
  },
  muted: {
    background: 'transparent',
    color: 'var(--uix-text-muted)',
    border: '1px solid var(--uix-border)',
  },
};

export function StatusPill({
  tone = 'neutral',
  treatment = 'filled',
  className,
  children,
}: StatusPillProps) {
  const toneStyle = treatment === 'outline' ? OUTLINE[tone] : FILLED[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[2px] text-[11px] font-bold uppercase tabular-nums',
        className,
      )}
      style={{ ...toneStyle, letterSpacing: '0.04em' }}
      data-tone={tone}
      data-treatment={treatment}
    >
      {children}
    </span>
  );
}
