import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

// ── EmptyState ─────────────────────────────────────────────────────────

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title?: ReactNode;
  /** Supporting copy / description. */
  children?: ReactNode;
  /** Primary action (e.g. a Button) shown under the body. */
  action?: ReactNode;
}

/** Centered empty state over `.uix-empty`. */
export function EmptyState({ icon, title, children, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cx('uix-empty', className)} {...props}>
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
}

/** Error state over `.uix-empty` with a danger-toned icon; `role="alert"`. */
export function ErrorState({ icon, title, detail, action, className, ...props }: ErrorStateProps) {
  return (
    <div className={cx('uix-empty', 'uix-empty--danger', className)} role="alert" {...props}>
      {icon != null && <div className="uix-empty__icon uix-empty__icon--danger">{icon}</div>}
      {title != null && <div className="uix-empty__title">{title}</div>}
      {detail != null && <p>{detail}</p>}
      {action}
    </div>
  );
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
}

/** A stack of skeleton rows for list/section loading. `role="status"`. */
export function LoadingState({ rows = 3, className, ...props }: LoadingStateProps) {
  return (
    <div className={cx('uix-stack', className)} role="status" aria-busy="true" {...props}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="text" width={`${92 - (i % 3) * 14}%`} />
      ))}
    </div>
  );
}
