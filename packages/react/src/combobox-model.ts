export interface ComboboxOption {
  value: string;
  label: string;
  keywords?: readonly string[];
  disabled?: boolean;
}

export function filterComboboxOptions(options: readonly ComboboxOption[], query: string): ComboboxOption[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [...options];
  return options.filter((option) =>
    [option.label, option.value, ...(option.keywords ?? [])]
      .some((part) => part.toLocaleLowerCase().includes(needle)),
  );
}
