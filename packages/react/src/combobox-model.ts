import { foldContext, textMatcher } from './locale-text.js';
import type { FoldOptions } from './locale-text.js';

export interface ComboboxOption {
  value: string;
  label: string;
  keywords?: readonly string[];
  disabled?: boolean;
}

/** A titled group of options (HAR-1588). */
export interface ComboboxGroup {
  label: string;
  options: readonly ComboboxOption[];
  /** Disables every option in the group. */
  disabled?: boolean;
}

const isGroup = (item: ComboboxOption | ComboboxGroup): item is ComboboxGroup => Array.isArray((item as ComboboxGroup).options);

const optionMatches = (option: ComboboxOption, matches: (text: string) => boolean): boolean =>
  [option.label, option.value, ...(option.keywords ?? [])].some(matches);

/**
 * Options whose label, value or keywords contain `query`, folded for `locale` (see
 * `foldForSearch`): "cevapi" finds "Ćevapi", "djordje" finds "Đorđe".
 */
export function filterComboboxOptions(options: readonly ComboboxOption[], query: string, locale?: string, foldOptions?: FoldOptions): ComboboxOption[] {
  const needle = query.trim();
  if (!needle) return [...options];
  const matches = textMatcher(needle, foldContext(locale, foldOptions));
  return options.filter((option) => optionMatches(option, matches));
}

/** Options and groups that match `query` (label, value or keywords); a group stays when any of its options does. */
export function filterComboboxItems(items: readonly (ComboboxOption | ComboboxGroup)[], query: string, locale?: string, foldOptions?: FoldOptions): (ComboboxOption | ComboboxGroup)[] {
  const needle = query.trim();
  if (!needle) return [...items];
  const matches = textMatcher(needle, foldContext(locale, foldOptions));
  const out: (ComboboxOption | ComboboxGroup)[] = [];
  for (const item of items) {
    if (isGroup(item)) {
      const options = item.options.filter((option) => optionMatches(option, matches));
      if (options.length) out.push({ ...item, options });
    } else if (optionMatches(item, matches)) {
      out.push(item);
    }
  }
  return out;
}
