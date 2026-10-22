/**
 * Typed column filters for `FilterEditor` (HAR-1365; TENSOR C6 `table-filter-editor.tsx`,
 * MOTUS C-1 "+ filter"). The value is data the product serializes into its own query; the
 * summary feeds a `Chip`. Pure, so a server can summarize a saved view too.
 */

export interface FilterChoice {
  value: string;
  label: string;
}

export type TextFilterOperator = 'contains' | 'not-contains' | 'is' | 'is-not' | 'starts-with';
export type NumberFilterOperator = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between';
/**
 * A date condition (HAR-1832). `on`, `before` and `after` take one day in `from`; `between` takes
 * `from` and `to`, both inclusive. "Before" excludes the day and "after" starts the next day:
 * `dateFilterBounds` turns each into the half-open range a query needs.
 */
export type DateFilterOperator = 'on' | 'before' | 'after' | 'between';

export type FilterValue =
  | { kind: 'enum'; values: string[] }
  | { kind: 'text'; operator: TextFilterOperator; text: string }
  | { kind: 'number'; operator: NumberFilterOperator; value?: number; to?: number }
  | { kind: 'date-range'; from?: string; to?: string }
  /** A date with a condition (HAR-1832); `YYYY-MM-DD`. A saved `between` stays `between`, even of one day. */
  | { kind: 'date'; operator: DateFilterOperator; from?: string; to?: string }
  | { kind: 'boolean'; value?: boolean }
  | { kind: 'reference'; values: FilterChoice[] }
  /** Free-text values typed in as tags (HAR-1832), e.g. several hostnames; matched by the product. */
  | { kind: 'tags'; values: string[] };

export type FilterValueKind = FilterValue['kind'];

/**
 * A named selection for an `enum` field (HAR-1505), e.g. "Open work" = new, open and pending.
 * The id, label and values come from the product.
 */
export interface FilterPreset {
  id: string;
  label: string;
  /** The option values the preset selects. Compared as a set: order and repeats do not matter. */
  values: readonly string[];
}

export interface FilterField {
  id: string;
  /** Column name, also the start of the chip summary. */
  label: string;
  kind: FilterValueKind;
  /** `enum`: the choices. */
  options?: readonly FilterChoice[];
  /** `reference`: finds records to pick; rejected promises show the error state. */
  onSearch?: (query: string) => Promise<readonly FilterChoice[]>;
  /**
   * `reference`: labels for chosen ids that arrived without one (a saved view restores ids).
   * The editor asks once for every id whose label is missing or equal to the id.
   */
  resolveLabels?: (ids: readonly string[]) => Promise<readonly FilterChoice[]>;
  /** `text` / `number`: the operators offered, in order. Default: all of the kind. */
  operators?: readonly (TextFilterOperator | NumberFilterOperator)[];
  /** `date`: the conditions offered, in order. Default: on, before, after, between. */
  dateOperators?: readonly DateFilterOperator[];
  /** `number`: a unit shown after the value, e.g. "days". */
  unit?: string;
  /** `boolean`: words for true and false, e.g. Escalated / Not escalated. Default from labels. */
  trueLabel?: string;
  falseLabel?: string;
  /**
   * `enum`: named selections shown as toggle chips above the options. Activating one replaces
   * the selection with its values; the one equal to the selection is pressed, and the chip
   * summary names it.
   */
  presets?: readonly FilterPreset[];
}

export interface FilterSummaryLabels {
  operators: Record<TextFilterOperator | NumberFilterOperator, string>;
  yes: string;
  no: string;
  /** `{from}`, `{to}`; also used for a number range. */
  range: string;
  /** Only a start date. `{from}`. */
  from: string;
  /** Only an end date. `{to}`. */
  until: string;
  /** More than `maxListed` values: `{first}`, `{count}`. */
  more: string;
  /** An `enum` value equal to a preset: `{label}` (the preset), `{field}`. Default `{label}`. */
  preset?: string;
  /** `date` conditions (HAR-1832), `{date}`. Default "{date}", "before {date}", "after {date}". */
  on?: string;
  before?: string;
  after?: string;
}

export const DEFAULT_FILTER_SUMMARY_LABELS: FilterSummaryLabels = {
  operators: {
    contains: 'contains', 'not-contains': 'does not contain', is: 'is', 'is-not': 'is not', 'starts-with': 'starts with',
    eq: '=', neq: '≠', lt: '<', lte: '≤', gt: '>', gte: '≥', between: 'between',
  },
  yes: 'Yes',
  no: 'No',
  range: '{from} – {to}',
  from: 'from {from}',
  until: 'until {to}',
  more: '{first} +{count}',
  preset: '{label}',
  on: '{date}',
  before: 'before {date}',
  after: 'after {date}',
};

export const TEXT_FILTER_OPERATORS: readonly TextFilterOperator[] = ['contains', 'not-contains', 'is', 'is-not', 'starts-with'];
export const NUMBER_FILTER_OPERATORS: readonly NumberFilterOperator[] = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between'];
export const DATE_FILTER_OPERATORS: readonly DateFilterOperator[] = ['on', 'before', 'after', 'between'];

/** The empty value for a field kind (what Clear resets to). */
export function emptyFilterValue(kind: FilterValueKind): FilterValue {
  switch (kind) {
    case 'enum': return { kind, values: [] };
    case 'text': return { kind, operator: 'contains', text: '' };
    case 'number': return { kind, operator: 'eq' };
    case 'date-range': return { kind };
    case 'date': return { kind, operator: 'on' };
    case 'boolean': return { kind };
    case 'reference': return { kind, values: [] };
    case 'tags': return { kind, values: [] };
  }
}

/** True when the value filters nothing (so the chip goes away). */
export function isFilterEmpty(value: FilterValue | undefined): boolean {
  if (!value) return true;
  switch (value.kind) {
    case 'enum': case 'reference': case 'tags': return value.values.length === 0;
    case 'text': return value.text.trim() === '';
    case 'number': return value.value === undefined || (value.operator === 'between' && value.to === undefined);
    case 'date-range': return !value.from && !value.to;
    case 'date': return !value.from || (value.operator === 'between' && !value.to);
    case 'boolean': return value.value === undefined;
  }
}

/** `YYYY-MM-DD` plus `days`, in the calendar (no time zone involved). */
function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

/**
 * The half-open range a `date` filter means, for a query (HAR-1832): `{ from }` is the first day
 * included, `{ until }` the first day NOT included, either may be missing. "On 5 Oct" is
 * `[5 Oct, 6 Oct)`, "before 5 Oct" is `[…, 5 Oct)`, "after 5 Oct" is `[6 Oct, …)`, "between 1 and
 * 5 Oct" is `[1 Oct, 6 Oct)`. A `date-range` value reads as `between` with optional ends. Empty
 * values give `{}`.
 */
export function dateFilterBounds(value: FilterValue | undefined): { from?: string; until?: string } {
  if (value?.kind === 'date-range') {
    return { ...(value.from ? { from: value.from } : {}), ...(value.to ? { until: addDays(value.to, 1) } : {}) };
  }
  if (value?.kind !== 'date' || isFilterEmpty(value)) return {};
  const day = value.from!;
  switch (value.operator) {
    case 'on': return { from: day, until: addDays(day, 1) };
    case 'before': return { until: day };
    case 'after': return { from: addDays(day, 1) };
    case 'between': return { from: day, until: addDays(value.to!, 1) };
  }
}

/** True for a chosen reference whose label is missing or only repeats its id (restored from an id). */
export const isUnresolvedChoice = (choice: FilterChoice): boolean => !choice.label || choice.label === choice.value;

/**
 * Fills in the labels of a `reference` value restored from ids (HAR-1832), with
 * `field.resolveLabels`. Other values, and values whose labels are all known, come back as they
 * are. Ids the resolver does not return keep the label they had.
 */
export async function resolveFilterLabels(field: FilterField, value: FilterValue | undefined): Promise<FilterValue | undefined> {
  if (value?.kind !== 'reference' || !field.resolveLabels) return value;
  const missing = value.values.filter(isUnresolvedChoice).map((v) => v.value);
  if (missing.length === 0) return value;
  const resolved = new Map((await field.resolveLabels(missing)).map((c) => [c.value, c.label]));
  return { kind: 'reference', values: value.values.map((v) => (resolved.has(v.value) ? { value: v.value, label: resolved.get(v.value)! } : v)) };
}

/**
 * The first of `field.presets` whose values equal the value's as a set, or undefined. Only an
 * `enum` value can match a preset.
 */
export function matchFilterPreset(field: FilterField, value: FilterValue | undefined): FilterPreset | undefined {
  if (value?.kind !== 'enum' || !field.presets?.length) return undefined;
  const chosen = new Set(value.values);
  return field.presets.find((preset) => {
    const wanted = new Set(preset.values);
    return wanted.size === chosen.size && [...wanted].every((v) => chosen.has(v));
  });
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

export interface SummarizeFilterOptions {
  labels?: Partial<FilterSummaryLabels>;
  /** Formats a `YYYY-MM-DD` date (a product format such as DD.MM.YYYY). Default: as given. */
  formatDate?: (date: string) => string;
  /** Formats a number. Default: `String`. */
  formatNumber?: (value: number) => string;
  /** List this many values before "+N". Default 2. */
  maxListed?: number;
}

/**
 * One line for the filter chip, e.g. "State: Open, Pending", "Priority ≥ 2", "Created:
 * 01.10.2026 – 05.10.2026", "Created: before 05.10.2026", "Host: db-01, db-02 +1", "Escalated: Yes". An enum value equal to one of `field.presets`
 * gives that preset's label (the `preset` label). Empty values give an empty string.
 */
export function summarizeFilter(field: FilterField, value: FilterValue | undefined, options: SummarizeFilterOptions = {}): string {
  if (!value || isFilterEmpty(value)) return '';
  const labels = { ...DEFAULT_FILTER_SUMMARY_LABELS, ...options.labels, operators: { ...DEFAULT_FILTER_SUMMARY_LABELS.operators, ...options.labels?.operators } };
  const date = options.formatDate ?? ((d: string) => d);
  const num = (n: number) => `${options.formatNumber?.(n) ?? String(n)}${field.unit ? ` ${field.unit}` : ''}`;
  const list = (items: string[]) => {
    const max = Math.max(1, options.maxListed ?? 2);
    return items.length > max ? fill(labels.more, { first: items.slice(0, max).join(', '), count: items.length - max }) : items.join(', ');
  };
  switch (value.kind) {
    case 'enum': {
      const preset = matchFilterPreset(field, value);
      if (preset) return fill(labels.preset ?? DEFAULT_FILTER_SUMMARY_LABELS.preset!, { label: preset.label, field: field.label });
      const byValue = new Map((field.options ?? []).map((o) => [o.value, o.label]));
      return `${field.label}: ${list(value.values.map((v) => byValue.get(v) ?? v))}`;
    }
    case 'reference': return `${field.label}: ${list(value.values.map((v) => v.label))}`;
    case 'tags': return `${field.label}: ${list(value.values)}`;
    case 'text': return `${field.label} ${labels.operators[value.operator]} “${value.text.trim()}”`;
    case 'number': return value.operator === 'between'
      ? `${field.label}: ${fill(labels.range, { from: num(value.value!), to: num(value.to!) })}`
      : `${field.label} ${labels.operators[value.operator]} ${num(value.value!)}`;
    case 'date-range': return `${field.label}: ${value.from && value.to ? fill(labels.range, { from: date(value.from), to: date(value.to) })
      : value.from ? fill(labels.from, { from: date(value.from) }) : fill(labels.until, { to: date(value.to!) })}`;
    case 'date': {
      if (value.operator === 'between') return `${field.label}: ${fill(labels.range, { from: date(value.from!), to: date(value.to!) })}`;
      const template = labels[value.operator] ?? DEFAULT_FILTER_SUMMARY_LABELS[value.operator]!;
      return `${field.label}: ${fill(template, { date: date(value.from!) })}`;
    }
    case 'boolean': return `${field.label}: ${value.value ? field.trueLabel ?? labels.yes : field.falseLabel ?? labels.no}`;
  }
}
