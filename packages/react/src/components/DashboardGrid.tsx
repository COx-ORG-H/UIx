import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

/** Columns at one width. */
export type DashboardGridColumnCount = 1 | 2 | 3 | 4;

/**
 * A width of the GRID itself (a container query), not of the viewport:
 * `base` any width, `sm` ≥ 36rem, `md` ≥ 48rem, `lg` ≥ 60rem, `xl` ≥ 80rem.
 */
export type DashboardGridBreakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * One column count for every width, or a count per breakpoint. A breakpoint you leave out keeps
 * the count of the next smaller one, and a missing `base` is 1.
 */
export type DashboardGridColumns = DashboardGridColumnCount | Partial<Record<DashboardGridBreakpoint, DashboardGridColumnCount>>;

/** How much of the row an item takes. `2` clamps to the columns there are; `full` is always the whole row. */
export type DashboardGridSpan = 1 | 2 | 'full';

/** Space between items: `sm` --uix-space-3, `md` --uix-space-4, `lg` --uix-space-6. */
export type DashboardGridGap = 'sm' | 'md' | 'lg';

export interface DashboardGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Default: 1 column, 2 from `sm`, 3 from `lg` (of the grid's own width). */
  columns?: DashboardGridColumns;
  /** Default `md`. */
  gap?: DashboardGridGap;
}

export interface DashboardGridItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Default `1`. */
  span?: DashboardGridSpan;
}

const BREAKPOINTS = ['sm', 'md', 'lg', 'xl'] as const;

const count = (value: number | undefined, fallback: DashboardGridColumnCount): DashboardGridColumnCount => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(4, Math.max(1, Math.round(value))) as DashboardGridColumnCount;
};

/**
 * The class list of a dashboard grid, for markup you render yourself (a server template, or a
 * drag-and-drop library's own element). Same output as `<DashboardGrid>`.
 */
export function dashboardGridClassName(columns?: DashboardGridColumns, gap: DashboardGridGap = 'md'): string {
  const classes = ['uix-dashboard-grid'];
  if (gap === 'sm' || gap === 'lg') classes.push(`uix-dashboard-grid--gap-${gap}`);
  if (columns == null) return classes.join(' ');
  if (typeof columns === 'number') {
    classes.push(`uix-dashboard-grid--cols-${count(columns, 1)}`);
    return classes.join(' ');
  }
  // An explicit base, so the CSS defaults (2 from sm, 3 from lg) never mix into a custom set.
  classes.push(`uix-dashboard-grid--cols-${count(columns.base, 1)}`);
  for (const breakpoint of BREAKPOINTS) {
    if (columns[breakpoint] != null) classes.push(`uix-dashboard-grid--${breakpoint}-cols-${count(columns[breakpoint], 1)}`);
  }
  return classes.join(' ');
}

/** The class list of a dashboard grid item, for markup you render yourself. */
export function dashboardGridItemClassName(span: DashboardGridSpan = 1): string {
  if (span === 'full') return 'uix-dashboard-grid__item uix-dashboard-grid__item--full';
  if (span === 2) return 'uix-dashboard-grid__item uix-dashboard-grid__item--span-2';
  return 'uix-dashboard-grid__item';
}

/**
 * A cell of a {@link DashboardGrid}: one column, two, or the full row. It is an inline-size
 * container (container name: uix-dashboard-grid-item), so its content can size from it, e.g. a Chart with
 * `height="clamp(160px, 40cqi, 360px)"`. Widgets in one row share a height.
 */
export const DashboardGridItem = forwardRef<HTMLDivElement, DashboardGridItemProps>(function DashboardGridItem(
  { span = 1, className, ...props },
  ref,
) {
  return <div ref={ref} className={cx(dashboardGridItemClassName(span), className)} {...props} />;
});

const DashboardGridRoot = forwardRef<HTMLDivElement, DashboardGridProps>(function DashboardGrid(
  { columns, gap = 'md', className, ...props },
  ref,
) {
  return <div ref={ref} className={cx(dashboardGridClassName(columns, gap), className)} {...props} />;
});

/**
 * The layout grid for dashboard widgets (HAR-1555). The column count follows the grid's own
 * width, so it adapts to a sidebar as well as to the screen. Pure layout: drag-and-drop,
 * persistence and widget chrome stay in the product. Server-renderable.
 *
 * ```tsx
 * <DashboardGrid columns={{ base: 1, sm: 2, lg: 3 }}>
 *   <DashboardGrid.Item><Stat … /></DashboardGrid.Item>
 *   <DashboardGrid.Item span={2}>…</DashboardGrid.Item>
 *   <DashboardGrid.Item span="full"><Chart … /></DashboardGrid.Item>
 * </DashboardGrid>
 * ```
 */
export const DashboardGrid = Object.assign(DashboardGridRoot, { Item: DashboardGridItem });
