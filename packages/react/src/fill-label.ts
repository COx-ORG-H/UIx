import { countLabel } from './plural.js';
import type { UixCountLabel } from './plural.js';

/**
 * TENSOR RX-125 (UIX-12) — fill `{name}` placeholders in a translatable label, so a
 * sentence such as "Move {label} up" can be reordered by a translation.
 */
export function fillLabel(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

/**
 * `fillLabel` for a label that carries a count: picks the plural form of `values.count` in
 * `locale` first (see `countLabel`), then fills every placeholder.
 */
export function fillCountLabel(label: UixCountLabel, values: Readonly<Record<string, string | number>> & { count: number }, locale?: string): string {
  return fillLabel(countLabel(label, values.count, locale), values);
}
