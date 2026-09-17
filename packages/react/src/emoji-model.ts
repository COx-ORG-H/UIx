/* Emoji data model for EmojiPicker and the editor's emoji button (RTE-01).
 * Framework-free. The emojibase datasets (~600 KB per locale) are only fetched through
 * `loadEmojiData`, i.e. when a picker first opens; nothing here imports them statically. */

export type EmojiLocale = 'en' | 'de';

export interface EmojiEntry {
  /** The Unicode emoji — the only form ever stored. */
  emoji: string;
  /** Localized name ("thumbs up" / "Daumen hoch"). */
  name: string;
  /** Localized search terms. */
  tags: ReadonlyArray<string>;
  /** Index into `EmojiData.groups`. */
  group: number;
}

export interface EmojiGroup {
  key: string;
  /** Localized category name. */
  name: string;
}

export interface EmojiData {
  locale: EmojiLocale;
  groups: ReadonlyArray<EmojiGroup>;
  emojis: ReadonlyArray<EmojiEntry>;
  /** Localized names by emoji, for aria-labels of quick picks and recents. */
  names: ReadonlyMap<string, string>;
}

export type EmojiDataLoader = (locale: EmojiLocale) => Promise<EmojiData>;

/** Shape of `emojibase-data/<locale>/compact.json` entries (the fields we read). */
export interface CompactEmoji {
  unicode: string;
  label: string;
  group?: number;
  order?: number;
  tags?: string[];
}

/** Shape of `emojibase-data/<locale>/messages.json` (the fields we read). */
export interface EmojiMessages {
  groups: ReadonlyArray<{ key: string; message: string; order: number }>;
}

/** emojibase group 2 holds skin-tone and hair components, not pickable emoji. */
const COMPONENT_GROUP_KEY = 'component';

const capitalize = (s: string): string => (s ? s[0]!.toLocaleUpperCase() + s.slice(1) : s);

/** Build picker data from the emojibase JSON of one locale. */
export function buildEmojiData(locale: EmojiLocale, compact: ReadonlyArray<CompactEmoji>, messages: EmojiMessages): EmojiData {
  const sourceGroups = [...messages.groups].sort((a, b) => a.order - b.order);
  const groups: EmojiGroup[] = [];
  const groupIndex = new Map<number, number>();
  for (const g of sourceGroups) {
    if (g.key === COMPONENT_GROUP_KEY) continue;
    groupIndex.set(g.order, groups.length);
    groups.push({ key: g.key, name: capitalize(g.message) });
  }
  const emojis: EmojiEntry[] = [];
  const names = new Map<string, string>();
  const sorted = [...compact].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const item of sorted) {
    if (item.group === undefined) continue;
    const group = groupIndex.get(item.group);
    if (group === undefined) continue;
    const entry = { emoji: item.unicode, name: item.label, tags: item.tags ?? [], group };
    emojis.push(entry);
    names.set(item.unicode, item.label);
    // Quick picks are often written without the emoji presentation selector.
    names.set(item.unicode.replace(/️/g, ''), item.label);
  }
  return { locale, groups, emojis, names };
}

const cache = new Map<EmojiLocale, Promise<EmojiData>>();

/**
 * Default loader: dynamic imports of the emojibase JSON, one chunk per locale, cached.
 * Requires the optional peer `emojibase-data`.
 */
export const loadEmojiData: EmojiDataLoader = (locale) => {
  let pending = cache.get(locale);
  if (!pending) {
    const files =
      locale === 'de'
        ? Promise.all([import('emojibase-data/de/compact.json'), import('emojibase-data/de/messages.json')])
        : Promise.all([import('emojibase-data/en/compact.json'), import('emojibase-data/en/messages.json')]);
    pending = files.then(([compact, messages]) =>
      buildEmojiData(
        locale,
        ((compact as { default?: unknown }).default ?? compact) as CompactEmoji[],
        ((messages as { default?: unknown }).default ?? messages) as EmojiMessages,
      ),
    );
    pending.catch(() => cache.delete(locale));
    cache.set(locale, pending);
  }
  return pending;
};

const fold = (s: string): string => s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Search by name and tags. Word-prefix matches rank before substring matches;
 * dataset order breaks ties. Case and diacritics are folded, so "uberr" finds "Überraschung".
 */
export function searchEmoji(data: EmojiData, query: string, limit = 64): EmojiEntry[] {
  const q = fold(query.trim());
  if (!q) return [];
  const prefix: EmojiEntry[] = [];
  const contains: EmojiEntry[] = [];
  for (const entry of data.emojis) {
    const name = fold(entry.name);
    const words = [...name.split(/[\s:,-]+/), ...entry.tags.map(fold)];
    if (words.some((w) => w.startsWith(q)) || name.startsWith(q)) prefix.push(entry);
    else if (name.includes(q)) contains.push(entry);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
}

export const DEFAULT_RECENT_KEY = 'uix-emoji-recent';
const RECENT_MAX = 16;

/** Recently used emoji from localStorage; empty when storage is unavailable. */
export function readRecentEmoji(key: string = DEFAULT_RECENT_KEY): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((e): e is string => typeof e === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/** Move `emoji` to the front of the recent list and persist it (best effort). */
export function pushRecentEmoji(emoji: string, key: string = DEFAULT_RECENT_KEY): string[] {
  const next = [emoji, ...readRecentEmoji(key).filter((e) => e !== emoji)].slice(0, RECENT_MAX);
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(next));
  } catch {
    /* private mode or quota: recents are a convenience */
  }
  return next;
}

/**
 * Next focus index in a grid of `count` cells with `columns` columns, for arrow keys,
 * Home and End. Returns `null` for other keys.
 */
export function emojiGridMove(index: number, key: string, count: number, columns: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowRight': return Math.min(index + 1, count - 1);
    case 'ArrowLeft': return Math.max(index - 1, 0);
    case 'ArrowDown': return Math.min(index + columns, count - 1);
    case 'ArrowUp': return index - columns < 0 ? null : index - columns;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}

/** Fill `{name}` placeholders in a label template. */
export function formatLabel(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
