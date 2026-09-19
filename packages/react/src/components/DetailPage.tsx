import { Fragment } from 'react';
import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
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

/** What `renderLink` receives: render it as your router's link (TENSOR RX-125, UIX-10). */
export interface DetailPageLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  'aria-current'?: 'page';
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
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
  /**
   * Renders the back link and every tab link. Default: a plain `<a>`. Pass your
   * router's link (e.g. next/link) so switching tabs never reloads the page.
   */
  renderLink?: (props: DetailPageLinkProps) => ReactNode;
  /**
   * Controlled tabs: called with the tab id on a plain left click, which then does
   * not navigate. `href` stays the progressive-enhancement fallback (new tab,
   * modified click, no JS).
   */
  onTabSelect?: (id: string) => void;
}

const plainLink = ({ href, className, children, onClick, ...rest }: DetailPageLinkProps) => (
  <a href={href} className={className} onClick={onClick} {...rest}>{children}</a>
);

/** A click that should open elsewhere (new tab/window, download) keeps the browser default. */
const isPlainLeftClick = (e: MouseEvent<HTMLAnchorElement>) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** Framework-neutral record-detail scaffold; routing and data policy stay with the application. */
export function DetailPage({
  back, eyebrow, title, subtitle, actions, tabs, metrics, side, children, tabsLabel,
  renderLink = plainLink, onTabSelect, className, ...props
}: DetailPageProps) {
  return (
    <section className={cx('uix-detail-page', className)} {...props}>
      {back && renderLink({ href: back.href, className: 'uix-link uix-link--quiet uix-detail-page__back', children: back.label })}
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} />
      {metrics && metrics.length > 0 && (
        <dl className="uix-detail-page__metrics">
          {metrics.map((metric) => <div key={metric.id}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
        </dl>
      )}
      {tabs && tabs.length > 0 && (
        <nav className="uix-tabs" aria-label={tabsLabel}>
          {tabs.map((tab) => (
            <Fragment key={tab.id}>
              {renderLink({
                href: tab.href,
                className: 'uix-tab',
                children: tab.label,
                ...(tab.active ? { 'aria-current': 'page' as const } : {}),
                ...(onTabSelect
                  ? {
                      onClick: (e: MouseEvent<HTMLAnchorElement>) => {
                        if (!isPlainLeftClick(e)) return;
                        e.preventDefault();
                        onTabSelect(tab.id);
                      },
                    }
                  : {}),
              })}
            </Fragment>
          ))}
        </nav>
      )}
      <DetailLayout side={side}>{children}</DetailLayout>
    </section>
  );
}
