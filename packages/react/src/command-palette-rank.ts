/* The CommandPalette ranking (roadmap #9): how well a command matches the query, which alias
 * matched, and how much the current screen (`contextBoost`) and the person's own use (frecency)
 * lift it. Pure and server-safe.
 *
 * The match tiers are those of `filterCommandItems` (a label that starts with the query, then
 * every word of the query starting a word, then the label containing every word, then keywords),
 * so items without aliases, boosts or frecency come out in exactly the order they did before.
 * Folding is locale-aware by default (roadmap #15, the same fold as `filterCommandItems`): each
 * spelling a text answers to counts (đ as "dj" or "d", Serbian Cyrillic as Latin), the best one
 * ranks. `CommandFold` replaces it whole. */
import { foldContext, foldKeys } from './locale-text.js';
import type { CommandPaletteItem } from './command-palette-model.js';

/** Every folded spelling `text` answers to, best first (lower case, diacritics stripped). */
export type CommandFold = (text: string) => readonly string[];

/** The fold for `locale`: every spelling, best first, case and diacritics folded, as `filterCommandItems` folds. */
export function commandFoldFor(locale?: string): CommandFold {
  const context = foldContext(locale);
  return (text) => foldKeys(text, context);
}

/** The fold with no locale: case and diacritics folded, đ as "dj" or "d". */
export const defaultCommandFold: CommandFold = commandFoldFor();

/** A found command, with what found it. */
export interface RankedCommand {
  /** The command found. */
  item: CommandPaletteItem;
  /** Higher is better: the match quality (1 for a label that starts with the query) times the boosts. */
  score: number;
  /** The alias that matched better than the label, shown as "Label (alias)". */
  alias?: string;
}

/** How `rankCommandItems` folds text and weighs the person's use. */
export interface RankCommandOptions {
  /** The locale whose fold matches (the palette passes the `UixLabelsProvider` one), e.g. Serbian Cyrillic answering to Latin. Ignored with `fold`. */
  locale?: string;
  /** How text is folded for matching, replacing the locale's fold. Default `commandFoldFor(locale)`. */
  fold?: CommandFold;
  /** The person's use of each command, 0 (never) to 1 (all the time): `useCommandFrecency().score`. */
  frecency?: (id: string) => number;
}

/** How far the person's own use lifts a command: at most this share of its score again. */
export const FRECENCY_WEIGHT = 0.5;

const words = (folded: string) => folded.split(/[\s\-_/.,:;()[\]'"›>·|]+/u).filter(Boolean);

/** 1 (starts with the query), 0.8 (every token starts a word), 0.6 (contains every token), else 0. */
function quality(text: string, query: string, tokens: readonly string[]): number {
  if (text.startsWith(query)) return 1;
  const textWords = words(text);
  if (tokens.every((t) => textWords.some((w) => w.startsWith(t)))) return 0.8;
  if (tokens.every((t) => text.includes(t))) return 0.6;
  return 0;
}

/** An alias typed whole counts like a label prefix; any other alias match a little less than the label's. */
const ALIAS_FACTOR = 0.9;
/** Every token somewhere in the label, an alias or a keyword. */
const KEYWORD_QUALITY = 0.4;

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const boostOf = (value: number | undefined) => (value != null && Number.isFinite(value) ? Math.max(0, value) : 0);

/** The match quality of `item` for one folded query, and the alias that gave it (if it beat the label). */
function match(item: CommandPaletteItem, query: string, tokens: readonly string[], fold: CommandFold): { quality: number; alias?: string } {
  const labels = fold(item.label);
  let best = 0;
  for (const label of labels) best = Math.max(best, quality(label, query, tokens));
  let alias: string | undefined;
  const aliases = (item.aliases ?? []).map((text) => ({ text, spellings: fold(text) }));
  for (const { text, spellings } of aliases) {
    for (const spelling of spellings) {
      const q = spelling === query ? 1 : quality(spelling, query, tokens) * ALIAS_FACTOR;
      if (q > best) { best = q; alias = text; }
    }
  }
  if (best > 0) return { quality: best, alias };
  const others = [...aliases.flatMap((a) => a.spellings), ...(item.keywords ?? []).flatMap((k) => fold(k))];
  const anywhere = labels.some((label) => tokens.every((t) => label.includes(t) || others.some((o) => o.includes(t))));
  return { quality: anywhere ? KEYWORD_QUALITY : 0 };
}

/**
 * The commands `query` finds, best first, each with its score and the alias that matched. An
 * item's `contextBoost` multiplies its score by `1 + boost`, and `frecency` by up to
 * `1 + FRECENCY_WEIGHT`; neither ever drops a command. An empty query finds every item, ordered by
 * those two alone. Equal scores keep the order the items were given in.
 */
export function rankCommandItems(items: readonly CommandPaletteItem[], query: string, options: RankCommandOptions = {}): RankedCommand[] {
  const fold = options.fold ?? (options.locale ? commandFoldFor(options.locale) : defaultCommandFold);
  const queries = [...new Set(fold(query.trim()))]
    .map((folded) => ({ folded, tokens: folded.split(/\s+/).filter(Boolean) }))
    .filter((q) => q.tokens.length > 0);
  const ranked: (RankedCommand & { index: number })[] = [];
  items.forEach((item, index) => {
    let found: { quality: number; alias?: string } = { quality: queries.length === 0 ? 1 : 0 };
    for (const q of queries) {
      const m = match(item, q.folded, q.tokens, fold);
      if (m.quality > found.quality) found = m;
    }
    if (found.quality <= 0) return;
    const frecency = options.frecency ? clamp01(options.frecency(item.id)) : 0;
    const score = found.quality * (1 + boostOf(item.contextBoost)) * (1 + FRECENCY_WEIGHT * frecency);
    ranked.push({ item, score, alias: found.alias, index });
  });
  return ranked
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item, score, alias }) => (alias === undefined ? { item, score } : { item, score, alias }));
}
