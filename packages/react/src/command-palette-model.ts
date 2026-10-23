/* Pure model for the CommandPalette items mode (HAR-1378): which commands a query finds, in which
 * order, grouped. Matching folds case and diacritics with `foldForSearch` ("ubersicht" finds
 * "Übersicht", "strasse" finds "Straße"), so a product no longer needs its own copy of it. */
import type { ReactNode } from 'react';
import { foldForSearch } from './search-suggest-model.js';

/** One command of a `CommandPalette` in items mode. */
export interface CommandPaletteItem {
  /** Unique among the items; also the option's id suffix. */
  id: string;
  label: string;
  /** Group heading the item is listed under. Items without one form a group without a heading. */
  group?: string;
  /** More words that find the item but are not shown: synonyms, an old name, a record number. */
  keywords?: readonly string[];
  /** A second line, e.g. where the command leads. Not searched. */
  description?: string;
  /** Leading icon (decorative). */
  icon?: ReactNode;
  /** Key names (`['Mod', 'K']`) shown at the end of the row and set as `aria-keyshortcuts`. */
  shortcut?: readonly string[];
  /** Runs when the item is chosen. */
  onSelect?: () => void;
  /** Where the item leads: `onNavigate(href)`, else the browser goes there. */
  href?: string;
  /** Shown but not choosable; skipped by the arrow keys. */
  disabled?: boolean;
}

/** A group of found commands, in the order they are shown. */
export interface CommandPaletteGroup {
  /** The group heading; `undefined` for items without a group. */
  label: string | undefined;
  items: CommandPaletteItem[];
}

const words = (folded: string) => folded.split(/[\s\-_/.,:;()[\]'"›>·|]+/u).filter(Boolean);

/**
 * How well `item` matches the folded query tokens: 0 (the label starts with the whole query),
 * 1 (every token starts a word of the label), 2 (every token is in the label), 3 (every token
 * is in the label or a keyword), or -1 (no match).
 */
function score(item: CommandPaletteItem, query: string, tokens: string[]): number {
  const label = foldForSearch(item.label).text;
  if (label.startsWith(query)) return 0;
  const labelWords = words(label);
  if (tokens.every((t) => labelWords.some((w) => w.startsWith(t)))) return 1;
  if (tokens.every((t) => label.includes(t))) return 2;
  const keywords = (item.keywords ?? []).map((k) => foldForSearch(k).text);
  if (tokens.every((t) => label.includes(t) || keywords.some((k) => k.includes(t)))) return 3;
  return -1;
}

/**
 * The commands `query` finds, best first (HAR-1378): a label that starts with the query, then
 * labels where every word of the query starts a word, then labels that contain every word, then
 * matches through `keywords`. Equal matches keep the order they were given in. An empty query
 * finds every item, in order.
 */
export function filterCommandItems(items: readonly CommandPaletteItem[], query: string): CommandPaletteItem[] {
  const folded = foldForSearch(query.trim()).text;
  if (!folded) return [...items];
  const tokens = folded.split(/\s+/).filter(Boolean);
  return items
    .map((item, index) => ({ item, index, rank: score(item, folded, tokens) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}

/**
 * `items` in groups, each group where its first item is, its items in their given order. With a
 * ranked list (from `filterCommandItems`) the group of the best match comes first.
 */
export function groupCommandItems(items: readonly CommandPaletteItem[]): CommandPaletteGroup[] {
  const groups: CommandPaletteGroup[] = [];
  const byLabel = new Map<string | undefined, CommandPaletteGroup>();
  for (const item of items) {
    let group = byLabel.get(item.group);
    if (!group) { group = { label: item.group, items: [] }; byLabel.set(item.group, group); groups.push(group); }
    group.items.push(item);
  }
  return groups;
}
