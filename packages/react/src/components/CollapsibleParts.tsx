import type { ReactNode, Ref } from 'react';
import { cx } from '../cx.js';
import { ChevronDownIcon } from '../icons/components.js';

export type CollapsibleHeadingLevel = 2 | 3 | 4 | 5 | 6;

/** Root classes shared by the plain and the stateful `CollapsibleSection`. */
export const collapsibleClass = (compact: boolean | undefined, className: string | undefined): string =>
  cx('uix-collapsible', compact && 'uix-collapsible--compact', className);

/** With a heading level the body is a region named by the title. */
export const collapsibleBodyProps = (headingLevel: CollapsibleHeadingLevel | undefined, titleId: string) =>
  (headingLevel ? { role: 'region', 'aria-labelledby': titleId } : {});

interface CollapsibleSummaryProps {
  title: ReactNode;
  summary?: ReactNode;
  headingLevel?: CollapsibleHeadingLevel;
  titleId: string;
  summaryRef?: Ref<HTMLElement>;
}

/**
 * The `<summary>` row of a `CollapsibleSection`. Internal. With `headingLevel` the title sits
 * in a real heading (a heading is the one block element a `<summary>` may hold), so the section
 * shows up in the page outline; without it the markup is what 2.31.0 rendered.
 */
export function CollapsibleSummary({ title, summary, headingLevel, titleId, summaryRef }: CollapsibleSummaryProps) {
  const Heading = headingLevel ? (`h${headingLevel}` as 'h2') : 'span';
  return (
    <summary ref={summaryRef} className="uix-collapsible__summary">
      <Heading className={headingLevel ? 'uix-collapsible__heading' : undefined}>
        <span id={headingLevel ? titleId : undefined} className="uix-collapsible__title">{title}</span>
        {summary != null && <span className="uix-collapsible__meta">{summary}</span>}
      </Heading>
      <span className="uix-collapsible__chevron" aria-hidden="true"><ChevronDownIcon size="sm" /></span>
    </summary>
  );
}
