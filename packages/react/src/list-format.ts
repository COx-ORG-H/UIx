/** `Intl.ListFormat` (ES2021), typed here because the package targets an older `lib`. */
type ListFormatCtor = new (locale?: string, options?: { style?: 'long' | 'short' | 'narrow'; type?: 'conjunction' | 'disjunction' | 'unit' }) => { format(items: readonly string[]): string };

/** "A", "A and B", "A, B and C" in the locale's words (the document's language by default), with a plain fallback. */
export function joinList(items: readonly string[], locale?: string): string {
  const ListFormat = (Intl as unknown as { ListFormat?: ListFormatCtor }).ListFormat;
  const lang = locale ?? (typeof document !== 'undefined' ? document.documentElement.lang || undefined : undefined);
  try {
    if (ListFormat) return new ListFormat(lang, { style: 'long', type: 'conjunction' }).format(items);
  } catch { /* an unknown locale */ }
  return items.join(', ');
}
