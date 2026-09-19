import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

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
}

export const DEFAULT_PAGINATION_LABELS: PaginationLabels = {
  region: 'Pagination',
  previous: 'Previous page',
  next: 'Next page',
};

export interface PaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  labels?: Partial<PaginationLabels>;
}

export function Pagination({ page, pageCount, onChange, labels: labelOverrides, className, ...props }: PaginationProps) {
  const labels = { ...DEFAULT_PAGINATION_LABELS, ...labelOverrides };
  const pages = getPageNumbers(page, pageCount);

  return (
    <nav aria-label={labels.region} className={cx('uix-pagination', className)} {...props}>
      <button
        className="uix-pagination__btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={labels.previous}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="uix-pagination__ellipsis">…</span>
        ) : (
          <button
            key={p}
            className="uix-pagination__btn"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        className="uix-pagination__btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label={labels.next}
      >
        ›
      </button>
    </nav>
  );
}
