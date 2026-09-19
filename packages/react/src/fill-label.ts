/**
 * TENSOR RX-125 (UIX-12) — fill `{name}` placeholders in a translatable label, so a
 * sentence such as "Move {label} up" can be reordered by a translation.
 */
export function fillLabel(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
