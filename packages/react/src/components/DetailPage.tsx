import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { DetailLayout } from './DetailLayout.js';
import { PageHeader } from './PageHeader.js';

export interface DetailPageTab {
  id: string;
  label: ReactNode;
  href: string;
  active?: boolean;
}

export interface DetailPageMetric {
  id: string;
  label: ReactNode;
  value: ReactNode;
}

export interface DetailPageProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  back?: { href: string; label: ReactNode };
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tabs?: readonly DetailPageTab[];
  metrics?: readonly DetailPageMetric[];
  side?: ReactNode;
  children?: ReactNode;
  tabsLabel?: string;
}

/** Framework-neutral record-detail scaffold; routing and data policy stay with the application. */
export function DetailPage({ back, eyebrow, title, subtitle, actions, tabs, metrics, side, children, tabsLabel, className, ...props }: DetailPageProps) {
  return (
    <section className={cx('uix-detail-page', className)} {...props}>
      {back && <a className="uix-link uix-link--quiet uix-detail-page__back" href={back.href}>{back.label}</a>}
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} />
      {metrics && metrics.length > 0 && (
        <dl className="uix-detail-page__metrics">
          {metrics.map((metric) => <div key={metric.id}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
        </dl>
      )}
      {tabs && tabs.length > 0 && (
        <nav className="uix-tabs" aria-label={tabsLabel}>
          {tabs.map((tab) => <a key={tab.id} className="uix-tab" aria-current={tab.active ? 'page' : undefined} href={tab.href}>{tab.label}</a>)}
        </nav>
      )}
      <DetailLayout side={side}>{children}</DetailLayout>
    </section>
  );
}
