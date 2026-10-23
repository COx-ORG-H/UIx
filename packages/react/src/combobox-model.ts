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

export function filterComboboxOptions(options: readonly ComboboxOption[], query: string): ComboboxOption[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [...options];
  return options.filter((option) =>
    [option.label, option.value, ...(option.keywords ?? [])]
      .some((part) => part.toLocaleLowerCase().includes(needle)),
  );
}

/** Options and groups that match `query` (label, value or keywords); a group stays when any of its options does. */
export function filterComboboxItems(items: readonly (ComboboxOption | ComboboxGroup)[], query: string): (ComboboxOption | ComboboxGroup)[] {
  if (!query.trim()) return [...items];
  const out: (ComboboxOption | ComboboxGroup)[] = [];
  for (const item of items) {
    if (isGroup(item)) {
      const options = filterComboboxOptions(item.options, query);
      if (options.length) out.push({ ...item, options });
    } else if (filterComboboxOptions([item], query).length) {
      out.push(item);
    }
  }
  return out;
}
