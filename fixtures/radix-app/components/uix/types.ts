/* @uix registry item — shared cross-component types (no runtime code) */

/** Three density modes; @uix/data-table maps these to row/cell paddings. */
export type DataTableDensity = 'compact' | 'standard' | 'comfortable';

export interface RFC7807Problem {
  readonly title: string;
  readonly detail?: string;
  readonly type?: string;
  readonly status?: number;
  readonly [key: string]: unknown;
}
