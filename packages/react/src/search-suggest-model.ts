/* Pure text model for SearchSuggest: which parts of a result's title and description a query
 * matched, so the row can emphasise them.
 *
 * Matching folds case and diacritics ("ubersicht" marks "Übersicht", "strasse" marks "Straße")
 * and follows the rule most search-and-jump UIs use: the whole query where it occurs, otherwise
 * each query word where it starts a word ("sla pol" marks "SLA" and "pol" in "SLA policies").
 * The consumer decides WHICH rows match; this only decides what to emphasise inside a row. */

/** One run of a result's text, emphasised or not. */
export interface SearchSegment {
  text: string;
  match: boolean;
}

/** Text folded for matching, with a map back to the original characters. */
export interface FoldedText {
  /** The folded text: lower case, diacritics stripped, ß → ss. */
  text: string;
  /** For each index of `text`, the start index of the original character it came from. */
  source: number[];
  /** For each index of `text`, the end index (exclusive) of that original character. */
  sourceEnd: number[];
}

const COMBINING_MARK = /\p{M}/u;

/** Fold `text` for matching and keep a map back to the original indices. */
export function foldForSearch(text: string): FoldedText {
  let folded = '';
  const source: number[] = [];
  const sourceEnd: number[] = [];
  let index = 0;
  for (const char of text) {
    const base = char === 'ß' || char === 'ẞ' ? 'ss' : char.normalize('NFD');
    for (const part of base) {
      if (COMBINING_MARK.test(part)) continue;
      const lower = part.toLowerCase();
      folded += lower;
      for (let i = 0; i < lower.length; i += 1) {
        source.push(index);
        sourceEnd.push(index + char.length);
      }
    }
    index += char.length;
  }
  return { text: folded, source, sourceEnd };
}

type Range = [start: number, end: number];

const isWordStart = (text: string, at: number): boolean => at === 0 || /[\s\-_/.,:;()[\]'"›>·|]/u.test(text[at - 1] ?? '');

function foldedRanges(haystack: string, query: string): Range[] {
  const whole = query.trim();
  if (!whole) return [];
  const out: Range[] = [];
  let from = haystack.indexOf(whole);
  if (from !== -1) {
    while (from !== -1) {
      out.push([from, from + whole.length]);
      from = haystack.indexOf(whole, from + whole.length);
    }
    return out;
  }
  for (const token of whole.split(/\s+/)) {
    let at = haystack.indexOf(token);
    while (at !== -1 && !isWordStart(haystack, at)) at = haystack.indexOf(token, at + 1);
    if (at !== -1) out.push([at, at + token.length]);
  }
  return out;
}

function merge(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const range of sorted) {
    const last = out[out.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else out.push([range[0], range[1]]);
  }
  return out;
}

/** Split `text` into matched and unmatched segments for `query`. */
export function searchSegments(text: string, query: string): SearchSegment[] {
  const foldedQuery = foldForSearch(query).text;
  if (!text || !foldedQuery.trim()) return [{ text, match: false }];
  const folded = foldForSearch(text);
  const ranges = merge(
    foldedRanges(folded.text, foldedQuery).map(
      ([start, end]): Range => [folded.source[start] ?? 0, folded.sourceEnd[end - 1] ?? text.length],
    ),
  );
  if (ranges.length === 0) return [{ text, match: false }];
  const out: SearchSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) out.push({ text: text.slice(cursor, start), match: false });
    out.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), match: false });
  return out;
}
