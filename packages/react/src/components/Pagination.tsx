import { Fragment } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';

function getPageNumbers(page: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (page > 3) pages.push('ellipsis');
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (page < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

/** TENSOR RX-125 (UIX-04): the pager's accessible names. */
export interface PaginationLabels {
  region: string;
  previous: string;
  next: string;
  /** Cursor mode's "back to the start" control (HAR-1357). */
  first: string;
}

export const DEFAULT_PAGINATION_LABELS: PaginationLabels = {
  region: 'Pagination',
  previous: 'Previous page',
  next: 'Next page',
  first: 'First page',
};

export interface PaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * `offset` (default): numbered pages, needs `page` and `pageCount`.
   * `cursor` (HAR-1357; MOTUS B-A22): keyset paging with no total — First, Previous, an
   * optional `summary` ("21–40") and Next.
   */
  mode?: 'offset' | 'cursor';
  /** Offset mode: the current page, from 1. */
  page?: number;
  /** Offset mode: the number of pages. */
  pageCount?: number;
  /** Offset mode, button pager: called with the page to show. */
  onChange?: (page: number) => void;
  /**
   * Offset mode, link pager (HAR-1357; MOTUS B-P5): every page is a real link, so a
   * server-rendered list pages without JavaScript. Wins over `onChange`.
   */
  hrefFor?: (page: number) => string;
  /** Your router's link for `hrefFor` and the cursor hrefs; default a plain `<a>`. */
  renderLink?: UixRenderLink;
  /** Cursor mode: whether an earlier page exists (enables First and Previous). */
  hasPrevious?: boolean;
  /** Cursor mode: whether a later page exists. */
  hasNext?: boolean;
  onFirst?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  firstHref?: string;
  previousHref?: string;
  nextHref?: string;
  /** Cursor mode: text between the controls, e.g. "21–40". */
  summary?: ReactNode;
  labels?: Partial<PaginationLabels>;
}

interface Control {
  key: string;
  content: ReactNode;
  label?: string;
  current?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}

export function Pagination({
  mode = 'offset', page = 1, pageCount = 1, onChange, hrefFor, renderLink,
  hasPrevious = false, hasNext = false, onFirst, onPrevious, onNext, firstHref, previousHref, nextHref, summary,
  labels: labelOverrides, className, ...props
}: PaginationProps) {
  const labels = { ...DEFAULT_PAGINATION_LABELS, ...labelOverrides };

  const render = ({ key, content, label, current, disabled, href, onClick }: Control) => {
    if (href != null && !disabled) {
      return <Fragment key={key}>{renderUixLink(renderLink, {
        href, className: 'uix-pagination__btn', 'aria-label': label, 'aria-current': current ? 'page' : undefined, children: content,
      })}</Fragment>;
    }
    if (href != null || (disabled && onClick == null)) {
      // A link pager's unavailable control: no href, announced as an unavailable link.
      return <a key={key} className="uix-pagination__btn" role="link" aria-disabled="true" aria-label={label}>{content}</a>;
    }
    return (
      <button key={key} type="button" className="uix-pagination__btn" aria-label={label} aria-current={current ? 'page' : undefined} disabled={disabled} onClick={onClick}>
        {content}
      </button>
    );
  };

  let controls: ReactNode;
  if (mode === 'cursor') {
    const linked = firstHref != null || previousHref != null || nextHref != null;
    controls = (
      <>
        {(onFirst || firstHref != null) && render({ key: 'first', content: '«', label: labels.first, disabled: !hasPrevious, href: linked ? firstHref ?? '' : undefined, onClick: onFirst })}
        {render({ key: 'prev', content: '‹', label: labels.previous, disabled: !hasPrevious, href: linked ? previousHref ?? '' : undefined, onClick: onPrevious })}
        {summary != null && <span className="uix-pagination__summary">{summary}</span>}
        {render({ key: 'next', content: '›', label: labels.next, disabled: !hasNext, href: linked ? nextHref ?? '' : undefined, onClick: onNext })}
      </>
    );
  } else {
    const go = (target: number) => (hrefFor ? { href: hrefFor(target) } : { onClick: () => onChange?.(target) });
    controls = (
      <>
        {render({ key: 'prev', content: '‹', label: labels.previous, disabled: page <= 1, ...go(page - 1) })}
        {getPageNumbers(page, pageCount).map((p, i) =>
          p === 'ellipsis'
            ? <span key={`e${i}`} className="uix-pagination__ellipsis">…</span>
            : render({ key: `p${p}`, content: p, current: p === page, ...go(p) }),
        )}
        {render({ key: 'next', content: '›', label: labels.next, disabled: page >= pageCount, ...go(page + 1) })}
      </>
    );
  }

  return (
    <nav aria-label={labels.region} className={cx('uix-pagination', className)} {...props}>
      {controls}
    </nav>
  );
}
