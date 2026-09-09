import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

// ── EmptyState ─────────────────────────────────────────────────────────

export type StateVariant = 'section' | 'inline' | 'drawer' | 'page' | 'full-page';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title?: ReactNode;
  /** Supporting copy / description. */
  children?: ReactNode;
  /** Primary action (e.g. a Button) shown under the body. */
  action?: ReactNode;
  /** Layout context changes spacing without changing semantics. */
  variant?: StateVariant;
}

/** Centered empty state over `.uix-empty`. */
export function EmptyState({ icon, title, children, action, variant = 'section', className, ...props }: EmptyStateProps) {
  return (
    <div className={cx('uix-empty', `uix-empty--${variant}`, className)} {...props}>
      {icon != null && <div className="uix-empty__icon">{icon}</div>}
      {title != null && <div className="uix-empty__title">{title}</div>}
      {children}
      {action}
    </div>
  );
}

// ── ErrorState ─────────────────────────────────────────────────────────

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title?: ReactNode;
  /** Error detail / message. */
  detail?: ReactNode;
  /** Recovery action (e.g. a Retry Button). */
  action?: ReactNode;
  variant?: StateVariant;
}

/** Error state over `.uix-empty` with a danger-toned icon; `role="alert"`. */
export function ErrorState({ icon, title, detail, action, variant = 'section', className, ...props }: ErrorStateProps) {
  return (
    <div className={cx('uix-empty', 'uix-empty--danger', `uix-empty--${variant}`, className)} role="alert" {...props}>
      {icon != null && <div className="uix-empty__icon uix-empty__icon--danger">{icon}</div>}
      {title != null && <div className="uix-empty__title">{title}</div>}
      {detail != null && <p>{detail}</p>}
      {action}
    </div>
  );
}

export interface AccessStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title?: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  variant?: StateVariant;
}

/** Permission-denied state. Copy and recovery controls stay application-owned. */
export function ForbiddenState({ icon, title, detail, action, variant = 'section', className, ...props }: AccessStateProps) {
  return (
    <div className={cx('uix-empty', 'uix-empty--warning', `uix-empty--${variant}`, className)} {...props}>
      {icon != null && <div className="uix-empty__icon uix-empty__icon--warning">{icon}</div>}
      {title != null && <div className="uix-empty__title">{title}</div>}
      {detail != null && <p>{detail}</p>}
      {action}
    </div>
  );
}

/** Not-found state. Copy and navigation remain application-owned. */
export function NotFoundState({ icon, title, detail, action, variant = 'section', className, ...props }: AccessStateProps) {
  return (
    <div className={cx('uix-empty', `uix-empty--${variant}`, className)} {...props}>
      {icon != null && <div className="uix-empty__icon">{icon}</div>}
      {title != null && <div className="uix-empty__title">{title}</div>}
      {detail != null && <p>{detail}</p>}
      {action}
    </div>
  );
}

/** Empty-result state for an active search or filter, kept distinct for analytics and recovery copy. */
export function FilteredEmptyState(props: EmptyStateProps) {
  return <EmptyState data-filtered="true" {...props} />;
}

// ── Skeleton + LoadingState ────────────────────────────────────────────

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'block' | 'text' | 'circle';
  width?: number | string;
  height?: number | string;
}

/** Shimmer placeholder over `.uix-skeleton`. */
export function Skeleton({ variant = 'block', width, height, className, style, ...props }: SkeletonProps) {
  const dims: CSSProperties = { width, height, ...style };
  return (
    <div
      className={cx(
        'uix-skeleton',
        variant === 'text' && 'uix-skeleton--text',
        variant === 'circle' && 'uix-skeleton--circle',
        className,
      )}
      style={dims}
      {...props}
    />
  );
}

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of skeleton rows to render. */
  rows?: number;
  density?: 'compact' | 'comfortable';
  /** Announced loading text (default "Loading"). */
  label?: string;
}

/** A stack of skeleton rows for list/section loading. `role="status"`. */
export function LoadingState({ rows = 3, density = 'comfortable', label, className, ...props }: LoadingStateProps) {
  return (
    // no aria-busy: busy=true tells AT the region isn't ready and suppresses the announcement (UIX-A11Y-4)
    <div className={cx('uix-stack', density === 'compact' && 'uix-stack--compact', className)} role="status" {...props}>
      <span className="uix-visually-hidden">{label ?? 'Loading'}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="text" width={`${92 - (i % 3) * 14}%`} />
      ))}
    </div>
  );
}
