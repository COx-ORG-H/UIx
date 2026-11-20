/* Pure text model for SearchSuggest: which parts of a result's title and description a query
 * matched, so the row can emphasise them.
 *
 * Matching folds case and diacritics with `foldForSearch` ("ubersicht" marks "Übersicht",
 * "strasse" marks "Straße", "djordje" marks "Đorđe") and follows the rule most search-and-jump
 * UIs use: the whole query where it occurs, otherwise each query word where it starts a word
 * ("sla pol" marks "SLA" and "pol" in "SLA policies"). The consumer decides WHICH rows match;
 * this only decides what to emphasise inside a row. */

import { foldContext, foldKeys, foldVariants } from './locale-text.js';
import type { FoldOptions } from './locale-text.js';

/** One run of a result's text, emphasised or not. */
export interface SearchSegment {
  text: string;
  match: boolean;
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
    // every word-start occurrence, as the whole-query branch marks every occurrence
    for (let at = haystack.indexOf(token); at !== -1; at = haystack.indexOf(token, at + 1)) {
      if (isWordStart(haystack, at)) out.push([at, at + token.length]);
    }
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

/**
 * Split `text` into matched and unmatched segments for `query`, folded for `locale` (see
 * `foldForSearch`): the text's main spelling first, then its other one ("dorde" marks "Đorđe").
 */
export function searchSegments(text: string, query: string, locale?: string, options?: FoldOptions): SearchSegment[] {
  if (!text || !query.trim()) return [{ text, match: false }];
  const context = foldContext(locale, options);
  const queries = foldKeys(query, context).filter((q) => q.trim());
  if (queries.length === 0) return [{ text, match: false }];
  let ranges: Range[] = [];
  for (const folded of foldVariants(text, context)) {
    for (const foldedQuery of queries) {
      ranges = foldedRanges(folded.text, foldedQuery).map(
        ([start, end]): Range => [folded.source[start] ?? 0, folded.sourceEnd[end - 1] ?? text.length],
      );
      if (ranges.length) break;
    }
    if (ranges.length) break;
  }
  ranges = merge(ranges);
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
