import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface CollapsibleSectionProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'title'> {
  title: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
}

export function CollapsibleSection({ title, summary, children, className, ...props }: CollapsibleSectionProps) {
  return (
    <details className={cx('uix-collapsible', className)} {...props}>
      <summary className="uix-collapsible__summary">
        <span><span className="uix-collapsible__title">{title}</span>{summary != null && <span className="uix-collapsible__meta">{summary}</span>}</span>
        <span className="uix-collapsible__chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="uix-collapsible__body">{children}</div>
    </details>
  );
}
