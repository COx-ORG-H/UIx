/* @uix registry item — shared cross-component types (no runtime code) */

/** Density per Docs/design-system.md § Tables. Three modes; see ROW_PADDING/CELL_PADDING. */
export type DataTableDensity = 'compact' | 'standard' | 'comfortable';

export interface RFC7807Problem {
  readonly title: string;
  readonly detail?: string;
  readonly type?: string;
  readonly status?: number;
  readonly [key: string]: unknown;
}
