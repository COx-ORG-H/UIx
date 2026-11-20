/* Locale-aware text helpers for every kit search and sort (roadmap #15): one fold for matching and
 * one cached collator for ordering, so CommandPalette, Combobox, Select, SearchSuggest, TagInput,
 * FilterEditor and the table engine all agree on what a query finds and where a row sorts.
 *
 * Matching folds case and diacritics ("cevapi" finds "ćevapi", "strasse" finds "Straße"). Letters
 * that Unicode cannot split into a base letter and a mark fold to what people type for them: đ to
 * "dj" ("djordje" finds "Đorđe"), æ to "ae", ø to "o", ł to "l". Text with đ, or with ä/ö/ü in
 * German, also answers to its other spelling ("dorde", "mueller"). Serbian Cyrillic can fold to
 * Latin, so a Latin query finds Cyrillic text and the other way round.
 *
 * Pure and server-safe: no DOM, no React. Plain ASCII text matches exactly as a lower-cased
 * substring test did before, and sorts with the same numeric, case-insensitive collator. */

/** Text folded for matching, with a map back to the original characters. */
export interface FoldedText {
  /** The folded text: lower case, diacritics stripped, ß → ss, đ → dj. */
  text: string;
  /** For each index of `text`, the start index of the original character it came from. */
  source: number[];
  /** For each index of `text`, the end index (exclusive) of that original character. */
  sourceEnd: number[];
}

/** How {@link foldForSearch} and the kit's search surfaces fold text beyond case and diacritics. */
export interface FoldOptions {
  /**
   * Fold Serbian Cyrillic to Latin, so "djordje" finds "Ђорђе" and "Ђорђе" finds "Đorđe".
   * Default: on when the locale is Bosnian, Croatian, Montenegrin or Serbian (`bs`, `hr`, `cnr`,
   * `sr`, `sh`), off otherwise.
   */
  crossScript?: boolean;
}

const COMBINING_MARK = /\p{M}/u;
// eslint-disable-next-line no-control-regex
const ASCII = /^[\x00-\x7f]*$/;

/** Lower-case letters NFD leaves whole, folded to what people type for them; final ς as σ. */
const LETTERS: Readonly<Record<string, string>> = {
  'ß': 'ss', 'đ': 'dj', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ł': 'l', 'ı': 'i', 'ħ': 'h', 'ŧ': 't',
  'þ': 'th', 'ð': 'd', 'ǆ': 'dz', 'ǉ': 'lj', 'ǌ': 'nj', 'ς': 'σ',
};

/**
 * Serbian Cyrillic (and the few Macedonian and Ukrainian letters NFD reaches) to Latin, already
 * folded the way the Latin letter is: ж → ž → z, џ → dž → dz, љ → lj, њ → nj, ђ → đ → dj.
 */
const CYRILLIC: Readonly<Record<string, string>> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'dj', 'е': 'e', 'ж': 'z', 'з': 'z',
  'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'c', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
  'ч': 'c', 'џ': 'dz', 'ш': 's', 'ѕ': 'dz', 'і': 'i',
};

/** The other spelling: đ as "d" (as many type it), and in German ä/ö/ü as "ae"/"oe"/"ue". */
const ALT_LETTERS: Readonly<Record<string, string>> = { ...LETTERS, 'đ': 'd' };
const ALT_LETTERS_DE: Readonly<Record<string, string>> = { ...ALT_LETTERS, 'ä': 'ae', 'ö': 'oe', 'ü': 'ue' };
const ALT_CYRILLIC: Readonly<Record<string, string>> = { ...CYRILLIC, 'ђ': 'd' };

const CROSS_SCRIPT_LANGUAGES = new Set(['bs', 'hr', 'sr', 'cnr', 'sh']);

/** One way of folding: the letter map, the Cyrillic map (or none), and each character folded so far. */
interface Fold {
  letters: Readonly<Record<string, string>>;
  cyrillic: Readonly<Record<string, string>> | null;
  /** Non-ASCII characters already folded: a 50,000-row search folds each distinct letter once. */
  memo: Map<number, string>;
}

const makeFold = (letters: Readonly<Record<string, string>>, cyrillic: Readonly<Record<string, string>> | null): Fold => ({
  letters, cyrillic, memo: new Map(),
});

/** @internal What a locale and its options resolve to: the main fold and the other spelling. */
export interface FoldContext {
  main: Fold;
  alt: Fold;
  /** Text that holds none of these folds the same both ways, so the other spelling is skipped. */
  altTrigger: RegExp;
}

const contexts = new Map<string, FoldContext>();

const language = (locale: string | undefined): string => (locale ?? '').split(/[-_]/)[0]!.toLowerCase();

/** @internal The fold for `locale` and `options`, built once per combination. */
export function foldContext(locale?: string, options?: FoldOptions): FoldContext {
  const lang = language(locale);
  const crossScript = options?.crossScript ?? CROSS_SCRIPT_LANGUAGES.has(lang);
  const german = lang === 'de';
  const key = `${crossScript ? 1 : 0}${german ? 1 : 0}`;
  let context = contexts.get(key);
  if (!context) {
    context = {
      main: makeFold(LETTERS, crossScript ? CYRILLIC : null),
      alt: makeFold(german ? ALT_LETTERS_DE : ALT_LETTERS, crossScript ? ALT_CYRILLIC : null),
      altTrigger: new RegExp(`[đĐ${crossScript ? 'ђЂ' : ''}${german ? 'äöüÄÖÜ' : ''}]`, 'u'),
    };
    contexts.set(key, context);
  }
  return context;
}

/** One original character, folded (possibly to nothing, or to more than one letter). */
function foldChar(char: string, fold: Fold): string {
  // Lower-case BEFORE decomposing: 'İ'.toLowerCase() is 'i' + a combining dot, which the mark
  // filter below must still see and drop.
  const lower = char.toLowerCase();
  const letter = fold.letters[lower];
  if (letter !== undefined) return letter;
  let out = '';
  for (const part of lower.normalize('NFD')) {
    if (COMBINING_MARK.test(part)) continue;
    out += fold.cyrillic?.[part] ?? part;
  }
  return out;
}

/** Fold with a map back to the original indices (for marking a match). */
function foldTracked(text: string, fold: Fold): FoldedText {
  let folded = '';
  const source: number[] = [];
  const sourceEnd: number[] = [];
  let index = 0;
  for (const char of text) {
    const part = foldChar(char, fold);
    folded += part;
    for (let i = 0; i < part.length; i += 1) {
      source.push(index);
      sourceEnd.push(index + char.length);
    }
    index += char.length;
  }
  return { text: folded, source, sourceEnd };
}

/**
 * Fold without the map, the hot path of a 50,000-row search: ASCII text is only lower-cased, and
 * any other character is folded once and then looked up. The same per-character fold as
 * `foldTracked`, so a row that matches is a row that gets marked.
 */
function foldPlain(text: string, fold: Fold): string {
  if (ASCII.test(text)) return text.toLowerCase();
  const { memo } = fold;
  let out = '';
  let run = 0; // start of the current run of ASCII characters
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) continue;
    if (i > run) out += text.slice(run, i).toLowerCase();
    // a surrogate pair is one character, keyed by its code point
    const pair = code >= 0xd800 && code <= 0xdbff && i + 1 < text.length;
    const key = pair ? text.codePointAt(i)! : code;
    let folded = memo.get(key);
    if (folded === undefined) {
      folded = foldChar(String.fromCodePoint(key), fold);
      // the distinct letters of a few scripts; a cap keeps odd input from growing it for ever
      if (memo.size >= 4096) memo.clear();
      memo.set(key, folded);
    }
    out += folded;
    if (pair) i += 1;
    run = i + 1;
  }
  return run < text.length ? out + text.slice(run).toLowerCase() : out;
}

/**
 * Fold `text` for matching and keep a map back to the original indices: lower case, diacritics
 * stripped, ß → ss, đ → dj, æ → ae, ø → o, ł → l; with `crossScript` (default for `bs`, `hr`,
 * `sr`), Serbian Cyrillic → Latin, with љ → lj, њ → nj, џ → dz. Compare `.text` of a query and a
 * candidate; `searchMatcher` also tries the other spelling (đ as "d", German ü as "ue").
 */
export function foldForSearch(text: string, locale?: string, options?: FoldOptions): FoldedText {
  return foldTracked(text, foldContext(locale, options).main);
}

/** @internal `text` folded each way it answers to: the main fold, then the other spelling if any. */
export function foldVariants(text: string, context: FoldContext): FoldedText[] {
  const main = foldTracked(text, context.main);
  if (!context.altTrigger.test(text)) return [main];
  const alt = foldTracked(text, context.alt);
  return alt.text === main.text ? [main] : [main, alt];
}

/** @internal The folded keys of `text` (no index map): the main fold, then the other spelling. */
export function foldKeys(text: string, context: FoldContext): string[] {
  const main = foldPlain(text, context.main);
  if (!context.altTrigger.test(text)) return [main];
  const alt = foldPlain(text, context.alt);
  return alt === main ? [main] : [main, alt];
}

/** @internal How a matcher compares a folded candidate with the folded query. */
export type MatchMode = 'contains' | 'startsWith' | 'equals';

const test = (key: string, needle: string, mode: MatchMode): boolean =>
  mode === 'contains' ? key.includes(needle) : mode === 'startsWith' ? key.startsWith(needle) : key === needle;

/**
 * @internal A test of candidates against `query` (not trimmed), folded once. A candidate matches
 * when any of its keys passes against any of the query's keys.
 */
export function textMatcher(query: string, context: FoldContext, mode: MatchMode = 'contains'): (text: string) => boolean {
  const needles = foldKeys(query, context);
  const [first, second] = needles;
  return (text) => {
    if (ASCII.test(text)) {
      // ASCII has no other spelling: one lower-case, as the 2.70 searches did
      const lower = text.toLowerCase();
      return test(lower, first!, mode) || (second !== undefined && test(lower, second, mode));
    }
    const main = foldPlain(text, context.main);
    if (test(main, first!, mode) || (second !== undefined && test(main, second, mode))) return true;
    if (!context.altTrigger.test(text)) return false;
    const alt = foldPlain(text, context.alt);
    return alt !== main && (test(alt, first!, mode) || (second !== undefined && test(alt, second, mode)));
  };
}

/**
 * A test of whether a text contains `query`, with the kit's folding: case, diacritics, đ as "dj"
 * or "d", German ü as "u" or "ue", and (with `crossScript`) Serbian Cyrillic as Latin. The query
 * is trimmed and folded once; an empty query matches everything. For a client-side search, e.g.
 * `rows.filter((row) => matches(row.title))` with `const matches = searchMatcher(query, locale)`.
 */
export function searchMatcher(query: string, locale?: string, options?: FoldOptions): (text: string) => boolean {
  const trimmed = query.trim();
  if (!trimmed) return () => true;
  return textMatcher(trimmed, foldContext(locale, options));
}

const collators = new Map<string, Intl.Collator>();
const COLLATOR_OPTIONS: Intl.CollatorOptions = { numeric: true, sensitivity: 'base' };

/**
 * A comparator that orders text the way `locale` does, with numbers by value ("INC-2" before
 * "INC-10"), cached per locale. Case and accents only break ties where the locale makes a letter
 * its own: Croatian puts "čaj" after "cvijet", English sorts it among the c's. Without a locale,
 * the runtime's. An unknown locale tag falls back to the runtime's instead of throwing.
 */
export function compareFor(locale?: string | readonly string[]): (a: string, b: string) => number {
  const key = locale == null ? '' : typeof locale === 'string' ? locale : locale.join(',');
  let collator = collators.get(key);
  if (!collator) {
    try {
      collator = new Intl.Collator(locale as string | string[] | undefined, COLLATOR_OPTIONS);
    } catch {
      collator = new Intl.Collator(undefined, COLLATOR_OPTIONS);
    }
    // a few locales per app; a cap keeps a stream of odd tags from growing the cache for ever
    if (collators.size >= 32) collators.clear();
    collators.set(key, collator);
  }
  return collator.compare;
}
