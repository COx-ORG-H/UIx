import { createElement } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { DelayedRender } from './DelayedRender.js';
import { FocusOnMount } from './FocusOnMount.js';
import { PENDING_DELAY_MS } from '../motion-timing.js';

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

// ── SuccessState ───────────────────────────────────────────────────────

export interface SuccessStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** What happened, e.g. "Request submitted". Rendered as a heading that takes focus on mount. */
  title: ReactNode;
  /** The heading level (default 1: the outcome usually replaces the page's form). */
  headingLevel?: 1 | 2 | 3;
  /** Supporting copy under the title. */
  children?: ReactNode;
  /** The record's reference, e.g. `<>REQ-0233 <CopyButton … /></>`. */
  reference?: ReactNode;
  /** The words before the reference (default "Your reference"). */
  referenceLabel?: ReactNode;
  /** A short, ordered "what happens next": two to four steps in the person's words. */
  next?: ReactNode[];
  /** The heading of `next` (default "What happens next"). */
  nextTitle?: ReactNode;
  /** The next action, e.g. a `ButtonLink` to the request or back to the portal. */
  action?: ReactNode;
  /**
   * Move focus to the title when it mounts. Default: on for `page` and `full-page` (the outcome
   * replaces the form the person was in), off for a state inside a section, card or drawer.
   */
  focusOnMount?: boolean;
  variant?: StateVariant;
}

/**
 * The outcome of a rare, important journey (HAR-2588; motion standard §2.2 "Rare", §2.8
 * "portal peak"): a request submitted, an application sent. A success mark draws once — never
 * repeats, never a game — then the title, the reference, what happens next, and the next
 * action. On a page, focus moves to the title, so a screen reader reads the outcome first. Under
 * reduced motion the mark is simply there.
 */
export function SuccessState({
  title, headingLevel = 1, children, reference, referenceLabel = 'Your reference', next, nextTitle = 'What happens next',
  action, focusOnMount, variant = 'page', className, ...props
}: SuccessStateProps) {
  const focusTitle = focusOnMount ?? (variant === 'page' || variant === 'full-page');
  const heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  const subheading = `h${Math.min(headingLevel + 1, 6)}` as 'h2' | 'h3' | 'h4';
  return (
    // `section` is the base look: no modifier class (there is no rule for one)
    <div className={cx('uix-empty', 'uix-success', variant !== 'section' && `uix-empty--${variant}`, className)} {...props}>
      <div className="uix-success__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <circle className="uix-success__disc" cx="24" cy="24" r="22" />
          <path className="uix-success__check" d="M14 24.5 21 31.5 34 17.5" pathLength={1} />
        </svg>
      </div>
      <FocusOnMount as={heading} enabled={focusTitle} className="uix-empty__title uix-success__title">{title}</FocusOnMount>
      {children != null && <div className="uix-success__body">{children}</div>}
      {reference != null && (
        <p className="uix-success__reference"><span className="uix-success__reference-label">{referenceLabel}</span> <span className="uix-success__reference-value">{reference}</span></p>
      )}
      {next && next.length > 0 && (
        <div className="uix-success__next">
          {createElement(subheading, { className: 'uix-success__next-title' }, nextTitle)}
          <ol className="uix-success__steps">{next.map((step, i) => <li key={i}>{step}</li>)}</ol>
        </div>
      )}
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
  density?: 'compact' | 'comfortable';
  /** Announced loading text (default "Loading"). */
  label?: string;
  /**
   * Show the skeleton only after it has been mounted this long: `true` is 300 ms, a number is
   * milliseconds (HAR-2580). A first load that answers sooner goes straight to the content.
   * Skeletons are for a first load; a refetch keeps its rows in a `BusyRegion`.
   */
  delay?: boolean | number;
}

/** A stack of skeleton rows for list/section loading. `role="status"`. */
export function LoadingState({ delay, ...props }: LoadingStateProps) {
  if (delay === undefined || delay === false || delay === 0) return <SkeletonRows {...props} />;
  return <DelayedRender delay={delay === true ? PENDING_DELAY_MS : delay}><SkeletonRows {...props} /></DelayedRender>;
}

function SkeletonRows({ rows = 3, density = 'comfortable', label, className, ...props }: Omit<LoadingStateProps, 'delay'>) {
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
