"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { isFilterEmpty, summarizeFilter } from '../filter-model.js';
import type { FilterChoice, FilterField, FilterValue } from '../filter-model.js';
import { BusyRegion } from './BusyRegion.js';
import { Button } from './Button.js';
import { Chip } from './Chip.js';
import { FilterEditor } from './FilterEditor.js';
import { Popover } from './Popover.js';
import { RelativeTime } from './RelativeTime.js';
import { StatusPill } from './StatusPill.js';
import type { StatusPillProps } from './StatusPill.js';
import { EmptyState, ErrorState, FilteredEmptyState, ForbiddenState, LoadingState } from './States.js';

/** One entry of an access or change history. The consumer supplies it free of personal health data. */
export interface AuditLogEvent {
  id: string;
  /** Who did it: a name, or a node (an avatar and a name). */
  actor: ReactNode;
  /** What they did: a key of `actions`. */
  action: string;
  /** What it was done to: "Patient record 1042", "Invoice R-2026-118". */
  target?: ReactNode;
  /** When: a `Date`, epoch ms or an ISO string. */
  at: Date | number | string;
  /** More about it, behind a Details disclosure: fields changed, the reason given, the IP. */
  detail?: ReactNode;
}

/** How an action reads and looks; the consumer labels its own action enum. */
export interface AuditLogAction {
  label: string;
  tone?: StatusPillProps['tone'];
}

/** The filters the person chose: `when` (a date range), `actor` and `action` (sets of ids). */
export interface AuditLogFilters {
  when?: Extract<FilterValue, { kind: 'date-range' }>;
  actor?: Extract<FilterValue, { kind: 'enum' }>;
  action?: Extract<FilterValue, { kind: 'enum' }>;
}

export interface AuditLogLabels {
  /** Names the list. */
  list: string;
  /** Names the filter group. */
  filters: string;
  when: string;
  actor: string;
  action: string;
  clearFilters: string;
  details: string;
  loadMore: string;
  /** Polite status while more entries load. */
  loadingMore: string;
  /** Polite status after more entries arrived. `{count}`. */
  loaded: string;
  loading: string;
  empty: string;
  emptyDetail: string;
  filteredEmpty: string;
  filteredEmptyDetail: string;
  error: string;
  retry: string;
  forbidden: string;
  forbiddenDetail: string;
}

export const DEFAULT_AUDIT_LOG_LABELS: AuditLogLabels = {
  list: 'Access history',
  filters: 'Filter the history',
  when: 'When',
  actor: 'Who',
  action: 'What',
  clearFilters: 'Clear filters',
  details: 'Details',
  loadMore: 'Show older entries',
  loadingMore: 'Loading older entries…',
  loaded: '{count} older entries shown',
  loading: 'Loading the history',
  empty: 'No access recorded yet',
  emptyDetail: 'Every time someone opens or changes this record, it shows here.',
  filteredEmpty: 'Nothing matches these filters',
  filteredEmptyDetail: 'Clear a filter or choose a longer period.',
  error: 'The history could not be loaded',
  retry: 'Try again',
  forbidden: 'You cannot see this history',
  forbiddenDetail: 'Ask an administrator of this practice for access.',
};

export interface AuditLogProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  events: readonly AuditLogEvent[];
  /** Every action the log can show, by key: its label and the tone of its pill. */
  actions: Readonly<Record<string, AuditLogAction>>;
  /**
   * `ready` (default), `loading` (the first load: skeleton rows), `error`, or `forbidden`.
   * A reload with rows on show is `refreshing`, not `loading`.
   */
  status?: 'ready' | 'loading' | 'error' | 'forbidden';
  /**
   * A reload is running (the filters changed): the rows on show stay in a `BusyRegion`, busy at
   * once, dimmed under a running bar after 300 ms. Skeleton rows are for `status="loading"` only.
   */
  refreshing?: boolean;
  onRetry?: () => void;
  /** The actors offered in the Who filter. Without them there is no Who filter. */
  actors?: readonly FilterChoice[];
  /** The filters in effect (controlled). With `onFiltersChange`, the filter bar shows. */
  filters?: AuditLogFilters;
  onFiltersChange?: (filters: AuditLogFilters) => void;
  /** More, older entries exist: a Show older entries button calls `onLoadMore` (keyset paging). */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  /** Locale of times and dates; a list falls back in order. */
  locale?: string | readonly string[];
  /**
   * The exact time shown beside the relative one. Default: `Intl` medium date and short time in
   * `locale`. Pass it where the browser lacks the locale's data (Chromium has none for `bs` and
   * prints "2026 M10 22"), or for a fixed product format.
   */
  formatExact?: (date: Date) => string;
  /** Time zone of the times shown, e.g. the practice's `Europe/Sarajevo`. Default: the viewer's. */
  timeZone?: string;
  /** Formats `YYYY-MM-DD` in a filter chip. Default: as given. */
  formatDate?: (date: string) => string;
  /** The current time, for stable relative times in tests and server renders. */
  now?: Date | number;
  labels?: Partial<AuditLogLabels>;
}

const FIELD_IDS = ['when', 'actor', 'action'] as const;
type FieldId = typeof FIELD_IDS[number];

/**
 * Who opened or changed what, and when (HAR-987; MEDx S50 "Historija pristupa", POSx PRT-01 /
 * INT-01): an ordered list of entries (actor, a labelled action, the target, a relative time
 * with the exact one beside it, and an optional Details disclosure), filters by period, person
 * and action (chips that open `FilterEditor`s), keyset "Show older entries", and the first-load,
 * empty, filtered-empty, error and forbidden states. Presentational: the consumer fetches, keeps
 * the audit semantics, and supplies entries free of health data.
 */
export function AuditLog({
  events, actions, status = 'ready', refreshing = false, onRetry, actors, filters = {}, onFiltersChange,
  hasMore = false, onLoadMore, loadingMore = false, locale, formatExact, timeZone, formatDate, now, labels: labelOverrides, className, ...props
}: AuditLogProps) {
  const labels = { ...DEFAULT_AUDIT_LOG_LABELS, ...useUixLabels().auditLog, ...labelOverrides };
  const id = useId();
  const [announced, setAnnounced] = useState('');
  const countBefore = useRef<number | null>(null);
  // After "Show older entries", say how many arrived, once the consumer has added them.
  useEffect(() => {
    const before = countBefore.current;
    if (before == null || loadingMore || events.length === before) return;
    countBefore.current = null;
    if (events.length > before) setAnnounced(fillLabel(labels.loaded, { count: events.length - before }));
  }, [events.length, loadingMore, labels.loaded]);

  const intlExact = new Intl.DateTimeFormat(locale as string | string[] | undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone });
  const exact = formatExact ?? ((date: Date) => intlExact.format(date));
  const fields: Record<FieldId, FilterField | null> = {
    when: { id: 'when', label: labels.when, kind: 'date-range' },
    actor: actors?.length ? { id: 'actor', label: labels.actor, kind: 'enum', options: actors } : null,
    action: { id: 'action', label: labels.action, kind: 'enum', options: Object.entries(actions).map(([value, a]) => ({ value, label: a.label })) },
  };
  const active = FIELD_IDS.filter((f) => !isFilterEmpty(filters[f]));
  const setFilter = (field: FieldId, value: FilterValue | undefined) => {
    const next = { ...filters } as Record<FieldId, FilterValue | undefined>;
    if (value === undefined || isFilterEmpty(value)) delete next[field]; else next[field] = value;
    onFiltersChange?.(next as AuditLogFilters);
  };

  const filterBar = onFiltersChange && (
    <div className="uix-audit-log__filters" role="group" aria-label={labels.filters}>
      {FIELD_IDS.map((f) => fields[f] && (
        <AuditFilter key={f} id={`${id}-${f}`} field={fields[f]!} value={filters[f]} formatDate={formatDate} onApply={(v) => setFilter(f, v)} />
      ))}
      {active.length > 0 && <Button size="sm" variant="link" onClick={() => onFiltersChange({})}>{labels.clearFilters}</Button>}
    </div>
  );

  let body: ReactNode;
  if (status === 'loading') body = <LoadingState rows={5} label={labels.loading} />;
  else if (status === 'forbidden') body = <ForbiddenState title={labels.forbidden} detail={labels.forbiddenDetail} />;
  else if (status === 'error') body = <ErrorState title={labels.error} action={onRetry && <Button size="sm" onClick={onRetry}>{labels.retry}</Button>} />;
  else if (events.length === 0 && active.length > 0) body = <FilteredEmptyState title={labels.filteredEmpty} action={<Button size="sm" onClick={() => onFiltersChange?.({})}>{labels.clearFilters}</Button>}>{labels.filteredEmptyDetail}</FilteredEmptyState>;
  else if (events.length === 0) body = <EmptyState title={labels.empty}>{labels.emptyDetail}</EmptyState>;
  else body = (
    <>
      <BusyRegion busy={refreshing} className="uix-audit-log__region">
      <ol className="uix-audit uix-audit-log__list" aria-label={labels.list}>
        {events.map((event) => {
          const action = actions[event.action];
          const date = new Date(event.at);
          return (
            <li key={event.id} className="uix-audit__row uix-audit-log__row">
              <span className="uix-audit__actor">{event.actor}</span>
              <span className="uix-audit__detail uix-audit-log__what">
                <StatusPill tone={action?.tone ?? 'neutral'}>{action?.label ?? event.action}</StatusPill>
                {event.target != null && <span className="uix-audit-log__target">{event.target}</span>}
              </span>
              <span className="uix-audit__time uix-audit-log__when">
                <RelativeTime value={event.at} now={now} locale={locale} timeZone={timeZone} />
                {!Number.isNaN(date.getTime()) && <span className="uix-audit-log__exact">{exact(date)}</span>}
              </span>
              {event.detail != null && (
                <details className="uix-audit-log__more">
                  <summary>{labels.details}</summary>
                  <div className="uix-audit-log__detail">{event.detail}</div>
                </details>
              )}
            </li>
          );
        })}
      </ol>
      </BusyRegion>
      {hasMore && onLoadMore && (
        <div className="uix-audit-log__more-row">
          <Button size="sm" loading={loadingMore} onClick={() => { if (loadingMore) return; countBefore.current = events.length; setAnnounced(labels.loadingMore); onLoadMore(); }}>
            {labels.loadMore}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <section className={cx('uix-audit-log', className)} aria-label={labels.list} {...props}>
      {filterBar}
      {body}
      <span className="uix-visually-hidden" role="status">{announced}</span>
    </section>
  );
}

/** One filter chip: its summary when set, the field's name when not; a popover with the editor. */
function AuditFilter({ id, field, value, formatDate, onApply }: { id: string; field: FilterField; value?: FilterValue; formatDate?: (d: string) => string; onApply: (v: FilterValue | undefined) => void }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [draft, setDraft] = useState<FilterValue | undefined>(value);
  const set = !isFilterEmpty(value);
  const popover = () => document.getElementById(`${id}-pop`);
  return (
    <span ref={anchor} className="uix-audit-log__filter">
      {/* The kit's filter chips: a set filter shows its summary and a × that clears it; an unset
          one is the dashed "add" chip. Either opens the editor. */}
      {set
        ? <Chip aria-haspopup="dialog" onClick={() => { setDraft(value); popover()?.togglePopover(); }} onRemove={() => onApply(undefined)}>{summarizeFilter(field, value, { formatDate })}</Chip>
        : <Chip variant="add" aria-haspopup="dialog" onClick={() => { setDraft(value); popover()?.togglePopover(); }}>{field.label}</Chip>}
      <Popover id={`${id}-pop`} anchor={anchor} role="dialog" aria-label={field.label}>
        <FilterEditor
          field={field} value={draft} onValueChange={setDraft}
          onApply={(v) => { onApply(v); popover()?.hidePopover(); }}
          onClear={() => { setDraft(undefined); onApply(undefined); popover()?.hidePopover(); }}
        />
      </Popover>
    </span>
  );
}
