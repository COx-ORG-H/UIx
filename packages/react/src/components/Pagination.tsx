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

export interface PaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onChange, className, ...props }: PaginationProps) {
  const pages = getPageNumbers(page, pageCount);

  return (
    <nav aria-label="Pagination" className={cx('uix-pagination', className)} {...props}>
      <button
        className="uix-pagination__btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
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
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
