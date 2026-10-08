/**
 * Select model (HAR-1572) — pure, DOM-free logic behind the UIx `Select` listbox:
 * flattening options and groups, keyboard movement (APG select-only combobox), typeahead,
 * filtering and the multi-select value helpers. Unit-tested in select-model.test.mjs.
 */
import type { ReactNode } from 'react';
import { foldForSearch } from './search-suggest-model.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** A second, muted line under the label. */
  description?: string;
  /** Shown before the label, in the list and on the trigger. */
  icon?: ReactNode;
  /** Extra words that match a search or typeahead (never shown). */
  keywords?: readonly string[];
}

export interface SelectGroup {
  label: string;
  options: readonly SelectOption[];
  /** Disables every option in the group. */
  disabled?: boolean;
}

export type SelectItem = SelectOption | SelectGroup;

export const isSelectGroup = (item: SelectItem): item is SelectGroup =>
  Array.isArray((item as SelectGroup).options);

/** @internal One option in list order, with what navigation needs. */
export interface SelectEntry {
  option: SelectOption;
  /** Position among all entries (the `aria-activedescendant` target index). */
  index: number;
  /** Index into `sections`. */
  section: number;
  disabled: boolean;
  /** In the form value only (an `<option hidden>` placeholder); never listed or focused. */
  hidden: boolean;
}

/** @internal A run of entries: one group, or the ungrouped options between groups. */
export interface SelectSection {
  label?: string;
  disabled: boolean;
  entries: SelectEntry[];
}

/** @internal */
export interface SelectModel {
  sections: SelectSection[];
  /** Every visible entry, in order (hidden placeholder options are left out). */
  entries: SelectEntry[];
  /** Every option including hidden ones, for the form proxy and value lookups. */
  all: SelectEntry[];
}

type HiddenFlag = { hidden?: boolean };

/** @internal Flatten options and groups into sections and a navigable entry list. */
export function buildSelectModel(items: readonly SelectItem[]): SelectModel {
  const sections: SelectSection[] = [];
  const entries: SelectEntry[] = [];
  const all: SelectEntry[] = [];
  let loose: SelectSection | null = null;
  const add = (section: SelectSection, sectionIndex: number, option: SelectOption, groupDisabled: boolean) => {
    const hidden = !!(option as SelectOption & HiddenFlag).hidden;
    const entry: SelectEntry = {
      option,
      index: hidden ? -1 : entries.length,
      section: sectionIndex,
      disabled: groupDisabled || !!option.disabled,
      hidden,
    };
    all.push(entry);
    if (hidden) return;
    entries.push(entry);
    section.entries.push(entry);
  };
  for (const item of items) {
    if (isSelectGroup(item)) {
      loose = null;
      const section: SelectSection = { label: item.label, disabled: !!item.disabled, entries: [] };
      sections.push(section);
      for (const option of item.options) add(section, sections.length - 1, option, !!item.disabled);
    } else {
      if (!loose) {
        loose = { disabled: false, entries: [] };
        sections.push(loose);
      }
      add(loose, sections.length - 1, item, false);
    }
  }
  return { sections: sections.filter((s) => s.entries.length > 0 || s.label != null), entries, all };
}

/** @internal Index of the first enabled entry at or after `from` going `step`, or -1. */
function scan(entries: readonly SelectEntry[], from: number, step: 1 | -1): number {
  for (let i = from; i >= 0 && i < entries.length; i += step) if (!entries[i]!.disabled) return i;
  return -1;
}

export const firstEnabled = (entries: readonly SelectEntry[]): number => scan(entries, 0, 1);
export const lastEnabled = (entries: readonly SelectEntry[]): number => scan(entries, entries.length - 1, -1);

/**
 * Move the active option by `delta` (±1 for arrows, ±10 for PageUp/PageDown), skipping
 * disabled options and stopping at the ends (the APG list does not wrap). With no active
 * option, moving down lands on the first enabled option and moving up on the last.
 */
export function moveActive(entries: readonly SelectEntry[], from: number, delta: number): number {
  if (!entries.length) return -1;
  if (from < 0) return delta > 0 ? firstEnabled(entries) : lastEnabled(entries);
  const step: 1 | -1 = delta > 0 ? 1 : -1;
  const target = Math.max(0, Math.min(entries.length - 1, from + delta));
  const found = scan(entries, target, step);
  if (found >= 0 && found !== from) return found;
  // nothing enabled past the target in that direction: the nearest enabled one before it
  const back = scan(entries, target, step === 1 ? -1 : 1);
  return back >= 0 ? (step === 1 ? Math.max(back, from) : Math.min(back, from)) : from;
}

const fold = (text: string): string => foldForSearch(text).text;

/**
 * Typeahead (APG): the typed buffer matches the start of a label. Repeating one character
 * ("s", "s") cycles through the options that start with it; a longer string ("re") keeps the
 * current option while it still matches. Disabled options are skipped. Returns -1 for no match.
 */
export function typeahead(entries: readonly SelectEntry[], buffer: string, from: number): number {
  const query = fold(buffer);
  if (!query || !entries.length) return -1;
  const chars = [...query];
  const repeated = chars.length > 1 && chars.every((c) => c === chars[0]);
  const needle = repeated ? chars[0]! : query;
  const start = repeated || chars.length === 1 ? from + 1 : Math.max(0, from);
  const n = entries.length;
  for (let k = 0; k < n; k += 1) {
    const i = (((start + k) % n) + n) % n;
    const entry = entries[i]!;
    if (!entry.disabled && fold(entry.option.label).trimStart().startsWith(needle)) return i;
  }
  return -1;
}

/** Does the option match a search query (label, value-free keywords and description)? */
export function selectOptionMatches(option: SelectOption, query: string): boolean {
  const needle = fold(query).trim();
  if (!needle) return true;
  return [option.label, ...(option.keywords ?? [])].some((part) => fold(part).includes(needle));
}

/** Keep only the options (and the groups holding them) that match `query`. */
export function filterSelectItems(items: readonly SelectItem[], query: string): SelectItem[] {
  if (!fold(query).trim()) return [...items];
  const out: SelectItem[] = [];
  for (const item of items) {
    if (isSelectGroup(item)) {
      const options = item.options.filter((o) => selectOptionMatches(o, query));
      if (options.length) out.push({ ...item, options });
    } else if (selectOptionMatches(item, query)) {
      out.push(item);
    }
  }
  return out;
}

/** Count the options in a list of options and groups. */
export const countSelectOptions = (items: readonly SelectItem[]): number =>
  items.reduce((n, item) => n + (isSelectGroup(item) ? item.options.length : 1), 0);

/** @internal A form value (string, number, array or nothing) as a list of strings. */
export function toValueList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [String(value)];
}

/** @internal Toggle `value` in a multi-select value, keeping list order stable. */
export function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
