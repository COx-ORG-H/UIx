'use client';
/* @hx registry item — ported from @itsmx/shared-ui/src/states.tsx */

import { AlertCircle, Lock } from 'lucide-react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import type { DataTableDensity } from './data-table';
import { cn } from './utils';

/**
 * UI-PRIM-01 / addendum 5 — the universal three-state triplet plus
 * <ForbiddenState/> (permission-denied alias of <ErrorState/>).
 *
 * Per Docs/design-system.md § Tables — Empty / loading / error states.
 *
 * Variants:
 *   - `inline`     (default) — replaces a block within a page (e.g.
 *                  the table body). Caller's column count is irrelevant
 *                  because these primitives wrap themselves; the
 *                  consumer renders <EmptyState/> in place of `<tbody>`
 *                  via a single `<td colSpan={...}>` cell when needed.
 *   - `full-page`  — entire route. Larger icon + larger heading.
 *   - `drawer`     — inside a side drawer or modal. Compact spacing.
 *
 * Loading variant accepts `density` so the skeleton row pitch matches
 * the universal DataTable's compact / standard / comfortable per
 * design-system.md § Tables.
 *
 * Strings are RESOLVER-PASSED by the caller. The primitives do NOT
 * reach into the customization registry — Hard Rule 10 is enforced
 * upstream.
 */

export type StateVariant = 'inline' | 'full-page' | 'drawer';

/** Pixel sizes for the icon at each variant. */
const ICON_PX_BY_VARIANT: Record<StateVariant, number> = {
  inline: 32,
  'full-page': 48,
  drawer: 28,
};

const WRAPPER_CLS_BY_VARIANT: Record<StateVariant, string> = {
  inline: 'flex flex-col items-center justify-center gap-2 py-12 px-4 text-center',
  'full-page': 'flex flex-col items-center justify-center gap-3 py-24 px-6 text-center',
  drawer: 'flex flex-col items-center justify-center gap-2 py-8 px-4 text-center',
};

const HEADING_CLS_BY_VARIANT: Record<StateVariant, string> = {
  inline: 'text-base font-medium',
  'full-page': 'text-xl font-medium',
  drawer: 'text-sm font-medium',
};

const DESCRIPTION_CLS = 'text-sm';

// -- EmptyState --------------------------------------------------------

export interface EmptyStateProps {
  /** Lucide icon component, typically pulled from `ENTITY_ICONS`. */
  icon?: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  /** Heading text, e.g. "No incidents yet". Resolver-passed by caller. */
  title: ReactNode;
  /** Optional supporting text. Resolver-passed. */
  description?: ReactNode;
  /** Optional primary CTA (e.g. "Create an incident"). */
  action?: ReactNode;
  /**
   * Optional "Clear filters" link rendered when the empty state was
   * caused by an active filter set. Caller wires its own clear handler.
   */
  onClearFilters?: () => void;
  /** Resolver-passed clear-filters link label. Required when onClearFilters set. */
  clearFiltersLabel?: ReactNode;
  variant?: StateVariant;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onClearFilters,
  clearFiltersLabel,
  variant = 'inline',
  className,
}: EmptyStateProps) {
  const iconSize = ICON_PX_BY_VARIANT[variant];
  return (
    <div
      className={cn(WRAPPER_CLS_BY_VARIANT[variant], className)}
      data-variant={variant}
      // biome-ignore lint/a11y/useSemanticElements: empty/loading messaging is wrapper-styled; <output> is for form-derived values, not arbitrary status text.
      role="status"
    >
      {Icon ? (
        <Icon
          size={iconSize}
          strokeWidth={1.5}
          style={{ color: 'rgb(var(--text-hushed))' }}
          aria-hidden="true"
        />
      ) : null}
      <h3 className={HEADING_CLS_BY_VARIANT[variant]} style={{ color: 'rgb(var(--text-primary))' }}>
        {title}
      </h3>
      {description ? (
        <p className={DESCRIPTION_CLS} style={{ color: 'rgb(var(--text-hushed))' }}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
      {onClearFilters && clearFiltersLabel ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 text-sm underline decoration-dotted underline-offset-4"
          style={{ color: 'rgb(var(--text-primary))' }}
        >
          {clearFiltersLabel}
        </button>
      ) : null}
    </div>
  );
}

// -- LoadingState ------------------------------------------------------

export interface LoadingStateProps {
  /** Number of skeleton "rows" to render. Default 5. */
  rowCount?: number;
  /**
   * Density per design-system.md § Tables. When passed, controls
   * skeleton row height to match the DataTable density. Default
   * 'standard'.
   */
  density?: DataTableDensity;
  variant?: StateVariant;
  className?: string;
  /** Accessible label. Resolver-passed. Default "Loading". */
  ariaLabel?: string;
}

const SKELETON_HEIGHT_BY_DENSITY: Record<DataTableDensity, string> = {
  compact: 'h-3.5',
  standard: 'h-5',
  comfortable: 'h-6',
};

export function LoadingState({
  rowCount = 5,
  density = 'standard',
  variant = 'inline',
  className,
  ariaLabel = 'Loading',
}: LoadingStateProps) {
  const skeletonHeight = SKELETON_HEIGHT_BY_DENSITY[density];
  return (
    <div
      className={cn('flex flex-col gap-2', variant === 'inline' ? 'p-4' : 'p-6', className)}
      data-variant={variant}
      // biome-ignore lint/a11y/useSemanticElements: loading skeleton is wrapper-styled; <output> is for form-derived values, not arbitrary status text. Matches the <EmptyState/> rationale above.
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {Array.from({ length: rowCount }, (_, i) => `skeleton-${i}`).map((key, i) => (
        <span
          key={key}
          className={cn('block animate-pulse rounded', skeletonHeight)}
          style={{
            background: 'var(--border)',
            // Vary width slightly so the skeleton doesn't look like a single block.
            width: `${[88, 72, 95, 60, 80][i % 5]}%`,
          }}
        />
      ))}
    </div>
  );
}

// -- ErrorState --------------------------------------------------------

export interface RFC7807Problem {
  readonly title: string;
  readonly detail?: string;
  readonly type?: string;
  readonly status?: number;
  readonly [key: string]: unknown;
}

export interface ErrorStateProps {
  /**
   * RFC 7807 problem object. Title is required; detail is rendered if
   * present. All other RFC 7807 fields surface in the developer
   * tooltip on the icon (a debug aid, not user-facing).
   */
  problem: RFC7807Problem;
  /** Optional retry handler. When present, renders a retry button. */
  onRetry?: () => void;
  /** Resolver-passed retry label. Default "Retry". Required if onRetry set. */
  retryLabel?: ReactNode;
  variant?: StateVariant;
  className?: string;
}

export function ErrorState({
  problem,
  onRetry,
  retryLabel = 'Retry',
  variant = 'inline',
  className,
}: ErrorStateProps) {
  const iconSize = ICON_PX_BY_VARIANT[variant];
  return (
    <div
      className={cn(WRAPPER_CLS_BY_VARIANT[variant], className)}
      data-variant={variant}
      role="alert"
    >
      <AlertCircle
        size={iconSize}
        strokeWidth={1.5}
        style={{ color: 'rgb(var(--danger-text))' }}
        aria-hidden="true"
      />
      <h3 className={HEADING_CLS_BY_VARIANT[variant]} style={{ color: 'rgb(var(--text-primary))' }}>
        {problem.title}
      </h3>
      {problem.detail ? (
        <p className={DESCRIPTION_CLS} style={{ color: 'rgb(var(--text-hushed))' }}>
          {problem.detail}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-md border px-3.5 text-sm"
          style={{
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--text-primary))',
            borderColor: 'var(--border-strong)',
          }}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

// -- ForbiddenState ----------------------------------------------------

export interface ForbiddenStateProps {
  /** The missing permission key, surfaced for support. */
  permission?: string;
  /** Resolver-passed heading. Default "You can't view this". */
  title?: ReactNode;
  /** Resolver-passed description. */
  description?: ReactNode;
  variant?: StateVariant;
  className?: string;
}

/**
 * Permission-denied state. Typed alias of <ErrorState/> with the
 * canonical title and a lock icon. Used by every page where
 * `requirePermission` rejects — the entity surface stays mounted but
 * the content area renders <ForbiddenState/> so the user has a clear
 * recovery path (typically: switch persona / request access).
 */
export function ForbiddenState({
  permission,
  title = "You can't view this",
  description = 'This view requires a permission your role does not grant. Switch persona or ask an admin to assign the role.',
  variant = 'full-page',
  className,
}: ForbiddenStateProps) {
  const iconSize = ICON_PX_BY_VARIANT[variant];
  return (
    <div
      className={cn(WRAPPER_CLS_BY_VARIANT[variant], className)}
      data-variant={variant}
      data-permission={permission}
      role="alert"
    >
      <Lock
        size={iconSize}
        strokeWidth={1.5}
        style={{ color: 'rgb(var(--text-hushed))' }}
        aria-hidden="true"
      />
      <h3 className={HEADING_CLS_BY_VARIANT[variant]} style={{ color: 'rgb(var(--text-primary))' }}>
        {title}
      </h3>
      <p className={DESCRIPTION_CLS} style={{ color: 'rgb(var(--text-hushed))' }}>
        {description}
      </p>
      {permission ? (
        <p className="mt-1 text-xs tabular-nums" style={{ color: 'rgb(var(--text-hushed))' }}>
          {permission}
        </p>
      ) : null}
    </div>
  );
}
