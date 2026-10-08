import { useId } from 'react';
import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { CollapsibleSummary, collapsibleBodyProps, collapsibleClass } from './CollapsibleParts.js';
import { CollapsibleSectionState } from './CollapsibleSectionState.js';

export interface CollapsibleSectionProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'title'> {
  title: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
  /**
   * Open when first rendered. With `persistKey`, what the person last chose wins over it:
   * "open by default, but remember" (HAR-1628). `open` is the same starting state and also
   * re-applies whenever the parent changes it.
   */
  defaultOpen?: boolean;
  /**
   * Mount the body only while it is needed (HAR-1352; TENSOR B32): `true` mounts it while
   * open and unmounts it on close; `'keep'` mounts it on first open and keeps it. For
   * bodies that fetch or chart. Default: always mounted (and server-renderable).
   */
  lazy?: boolean | 'keep';
  /**
   * Remember the open state under this key (`uix:collapsible:<key>`), in `persistStorage`.
   * Applied after mount, so the server HTML uses `open` / `defaultOpen`; a remembered state
   * then replaces either.
   */
  persistKey?: string;
  /**
   * Where `persistKey` keeps the state: `'session'` (`sessionStorage`, this tab until it
   * closes) or `'local'` (`localStorage`, across sessions). Default `'session'`.
   */
  persistStorage?: 'session' | 'local';
  /**
   * Each new value opens the section, scrolls it into view and moves focus to its summary
   * ("jump to SLA"). A value already set when the section mounts is honoured too (a deep link
   * that lands on a closed section); `undefined` and `0` mean "no request yet", so a counter
   * that starts at 0 does not open anything.
   */
  openRequest?: number;
  /**
   * A quiet row for a section inside a card: no border or background of its own, tighter
   * padding, a rule between neighbouring compact sections.
   */
  compact?: boolean;
  /**
   * Render the title as a heading of this level, and make the body a `role="region"` named by
   * it. Leave unset for a section that should stay out of the page outline.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/**
 * A `<details>` disclosure. Without `lazy`, `persistKey` or `openRequest` it is a plain,
 * server-renderable element that toggles without JavaScript; with any of them it becomes
 * a client component that tracks its open state.
 */
export function CollapsibleSection(props: CollapsibleSectionProps) {
  const { title, summary, children, className, lazy, persistKey, persistStorage, openRequest, open, defaultOpen, compact, headingLevel, ...rest } = props;
  const titleId = useId();
  if (lazy || persistKey !== undefined || openRequest !== undefined) return <CollapsibleSectionState {...props} />;
  return (
    <details className={collapsibleClass(compact, className)} {...rest} open={open ?? defaultOpen}>
      <CollapsibleSummary title={title} summary={summary} headingLevel={headingLevel} titleId={titleId} />
      <div className="uix-collapsible__body" {...collapsibleBodyProps(headingLevel, titleId)}>{children}</div>
    </details>
  );
}
