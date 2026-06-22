import type { ReactNode, TableHTMLAttributes, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface TableWrapProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function TableWrap({ children, className, ...props }: TableWrapProps) {
  return (
    <div className={cx('uix-table-wrap', className)} {...props}>
      {children}
    </div>
  );
}

export type TableDensity = 'compact' | 'standard' | 'comfortable';
export type SortDirection = 'ascending' | 'descending' | 'none';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  density?: TableDensity;
  zebra?: boolean;
  pinnedCol?: boolean;
  rowPeek?: boolean;
  v2?: boolean;
}

export function Table({
  density = 'standard',
  zebra = true,
  pinnedCol,
  rowPeek,
  v2,
  className,
  children,
  ...props
}: TableProps) {
  return (
    <table
      className={cx('uix-table', !zebra && 'uix-table--no-zebra', pinnedCol && 'uix-table--pinned-col', className)}
      data-density={density !== 'standard' ? density : undefined}
      data-uix-rowpeek={rowPeek || undefined}
      data-uix-table-v2={v2 || undefined}
      {...props}
    >
      {children}
    </table>
  );
}

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
}

export function Th({ sortable, sortDirection, onSort, className, children, onClick, ...props }: ThProps) {
  return (
    <th
      className={className}
      data-sort={sortable || undefined}
      aria-sort={sortDirection && sortDirection !== 'none' ? sortDirection : undefined}
      onClick={sortable ? onSort ?? onClick : onClick}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  pinned?: boolean;
}

export function Td({ pinned, className, children, ...props }: TdProps) {
  return (
    <td className={className} data-pinned={pinned || undefined} {...props}>
      {children}
    </td>
  );
}

export interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  pinned?: boolean;
}

export function Tr({ selected, pinned, className, children, ...props }: TrProps) {
  return (
    <tr
      className={className}
      aria-selected={selected || undefined}
      data-pinned={pinned || undefined}
      {...props}
    >
      {children}
    </tr>
  );
}
