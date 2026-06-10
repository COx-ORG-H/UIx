'use client';
/* @uix registry item — ported from @itsmx/shared-ui/src/column-visibility-menu.tsx */

import { ArrowDown, ArrowUp, Columns3, Eye, EyeOff } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { cn } from './utils';

/**
 * CUS-07 Phase 2 — column visibility menu per Docs/design-system.md
 * § Tables — Toolbar item 5.
 *
 * Renders a checkbox list of declared columns with visibility toggle +
 * up/down reorder (drag-reorder deferred to a follow-up slice — keyboard
 * accessible up/down buttons cover the same ground for v1).
 *
 * Footer carries a "Reset sort" action that the consumer wires to
 * clearing the active sort state on the parent DataTable.
 *
 * Pure presentational: takes `columns` (ordered, with visible flag) +
 * emits `onToggle(column_id)` / `onReorder(column_id, direction)` /
 * `onResetSort`.
 */

export interface ColumnVisibilityEntry {
  readonly id: string;
  /** Resolver-passed label. */
  readonly label: ReactNode;
  readonly visible: boolean;
  /** When true, the user cannot hide this column (e.g. primary key). */
  readonly required?: boolean;
}

export interface ColumnVisibilityMenuProps {
  columns: ReadonlyArray<ColumnVisibilityEntry>;
  onToggle: (column_id: string) => void;
  onReorder: (column_id: string, direction: 'up' | 'down') => void;
  /** Optional reset-sort handler. When omitted, the footer affordance is hidden. */
  onResetSort?: () => void;
  /** Resolver-passed labels. */
  labels?: Partial<ColumnVisibilityMenuLabels>;
  className?: string;
}

export interface ColumnVisibilityMenuLabels {
  trigger: string;
  show: string;
  hide: string;
  move_up: string;
  move_down: string;
  reset_sort: string;
}

const DEFAULT_LABELS: ColumnVisibilityMenuLabels = {
  trigger: 'Columns',
  show: 'Show',
  hide: 'Hide',
  move_up: 'Move up',
  move_down: 'Move down',
  reset_sort: 'Reset sort',
};

export function ColumnVisibilityMenu({
  columns,
  onToggle,
  onReorder,
  onResetSort,
  labels: providedLabels,
  className,
}: ColumnVisibilityMenuProps) {
  const labels = { ...DEFAULT_LABELS, ...providedLabels };
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn('relative inline-flex flex-col', className)}
      data-component="column-visibility-menu"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={labels.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border"
        style={{
          background: 'rgb(var(--surface))',
          color: 'rgb(var(--text-hushed))',
          borderColor: 'var(--border-strong)',
        }}
        title={labels.trigger}
      >
        <Columns3 size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="absolute top-full right-0 z-10 mt-1 min-w-[240px] rounded-md border shadow-md"
          style={{
            background: 'rgb(var(--surface))',
            borderColor: 'var(--border-strong)',
          }}
          role="menu"
        >
          <ul className="flex flex-col py-1">
            {columns.map((c, i) => (
              <li
                key={c.id}
                className="group/row flex items-center gap-1 px-2 py-1"
                data-column-id={c.id}
                data-visible={c.visible}
              >
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={c.visible}
                  disabled={c.required}
                  onClick={() => onToggle(c.id)}
                  aria-label={c.visible ? labels.hide : labels.show}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-[rgb(var(--bg-hover))] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    color: c.visible ? 'rgb(var(--text-primary))' : 'rgb(var(--text-hushed))',
                  }}
                >
                  {c.visible ? (
                    <Eye size={12} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <EyeOff size={12} strokeWidth={1.75} aria-hidden="true" />
                  )}
                </button>
                <span
                  className="flex-1 truncate text-sm"
                  style={{ color: 'rgb(var(--text-primary))' }}
                >
                  {c.label}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100">
                  <button
                    type="button"
                    onClick={() => onReorder(c.id, 'up')}
                    disabled={i === 0}
                    aria-label={labels.move_up}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-[rgb(var(--bg-hover))] disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ color: 'rgb(var(--text-hushed))' }}
                    data-direction="up"
                  >
                    <ArrowUp size={12} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(c.id, 'down')}
                    disabled={i === columns.length - 1}
                    aria-label={labels.move_down}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-[rgb(var(--bg-hover))] disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ color: 'rgb(var(--text-hushed))' }}
                    data-direction="down"
                  >
                    <ArrowDown size={12} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {onResetSort ? (
            <div className="border-t px-2 py-2" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => {
                  onResetSort();
                  setOpen(false);
                }}
                className="text-xs underline decoration-dotted underline-offset-4"
                style={{ color: 'rgb(var(--text-hushed))' }}
              >
                {labels.reset_sort}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
