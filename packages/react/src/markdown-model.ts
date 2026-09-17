/* Markdown → small syntax tree for the UIx Markdown viewer (RTE-01).
 *
 * Ported from TENSOR's zero-dependency renderer (packages/shared/ui/src/markdown.tsx)
 * with its behaviour preserved — line-based blocks, single newline = line break,
 * blockquote lines joined, raw HTML never interpreted — and extended with the
 * constructs the RichTextEditor writes: strikethrough, task lists, GFM tables,
 * images, nested lists, `---` rules, backslash escapes and character references.
 *
 * Pure data: no React, no DOM, no URL decisions (the renderer applies the policy).
 */

export type MarkdownInline =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong'; children: MarkdownInline[] }
  | { type: 'em'; children: MarkdownInline[] }
  | { type: 'del'; children: MarkdownInline[] }
  | { type: 'link'; href: string; title?: string; children: MarkdownInline[]; bare?: boolean }
  | { type: 'image'; src: string; alt: string; title?: string }
  | { type: 'br' };

export type TableAlign = 'left' | 'center' | 'right' | null;

export interface MarkdownListItem {
  /** `null` for a plain item, otherwise the task state. */
  checked: boolean | null;
  children: MarkdownInline[];
  /** Nested lists. */
  lists: MarkdownList[];
}

export interface MarkdownList {
  type: 'list';
  ordered: boolean;
  start: number;
  items: MarkdownListItem[];
}

export type MarkdownBlock =
  | { type: 'paragraph'; children: MarkdownInline[] }
  | { type: 'heading'; level: number; children: MarkdownInline[] }
  | { type: 'code'; lang: string; value: string }
  | { type: 'quote'; children: MarkdownInline[] }
  | { type: 'rule' }
  | MarkdownList
  | { type: 'table'; align: TableAlign[]; head: MarkdownInline[][]; rows: MarkdownInline[][][] };

// ── inline ─────────────────────────────────────────────────────────────────────

const ASCII_PUNCT = /[!-/:-@[-`{-~]/;
const WORD = /[\p{L}\p{N}]/u;
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', hellip: '…', mdash: '—', ndash: '–',
};
const ENTITY_RE = /^&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([a-zA-Z][a-zA-Z\d]{1,31}));/;
const ENTITY_GLOBAL = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[a-zA-Z][a-zA-Z\d]{1,31});/g;
const BARE_URL_RE = /^https?:\/\/[^\s<>()]+/;
const AUTOLINK_RE = /^<((?:https?:|mailto:)[^\s<>]*)>/i;

const decodeEntity = (match: RegExpExecArray): string | null => {
  const [, dec, hex, name] = match;
  const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : undefined;
  if (code !== undefined) return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '�';
  return name && Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name]! : null;
};

/**
 * Bounds that keep hostile input linear-ish on the server: link text and destinations
 * longer than MAX_SCAN characters are not links, and spans nest at most MAX_DEPTH deep.
 */
const MAX_SCAN = 2000;
const MAX_DEPTH = 12;

/** Index of the `]` matching the `[` at `open`, honouring escapes and nesting. */
const findBracketEnd = (text: string, open: number): number => {
  let depth = 0;
  const stop = Math.min(text.length, open + MAX_SCAN);
  for (let i = open; i < stop; i += 1) {
    const ch = text[i];
    if (ch === '\\') { i += 1; continue; }
    if (ch === '`') {
      const close = text.indexOf('`', i + 1);
      if (close > 0) { i = close; continue; }
    }
    if (ch === '[') depth += 1;
    else if (ch === ']') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
};

/** Parses `(url "title")` at `open`; returns the destination, title and end index. */
const readDestination = (text: string, open: number): { url: string; title?: string; end: number } | null => {
  if (text[open] !== '(') return null;
  let depth = 0;
  let end = -1;
  const stop = Math.min(text.length, open + MAX_SCAN);
  for (let i = open; i < stop; i += 1) {
    const ch = text[i];
    if (ch === '\\') { i += 1; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  const inner = text.slice(open + 1, end).trim();
  const titled = /^(\S+)\s+(?:"([^"]*)"|'([^']*)')$/.exec(inner);
  const rawUrl = titled ? titled[1]! : inner;
  const url = rawUrl
    .replace(/^<(.*)>$/, '$1')
    .replace(/\\([!-/:-@[-`{-~])/g, '$1')
    .replace(ENTITY_GLOBAL, (match: string) => decodeEntity(ENTITY_RE.exec(match)!) ?? match);
  const title = titled ? (titled[2] ?? titled[3]) : undefined;
  return title === undefined ? { url, end } : { url, title, end };
};

const backtickRun = (text: string, at: number): string => {
  let end = at;
  while (text[end] === '`') end += 1;
  return text.slice(at, end);
};

/**
 * Finds the closing delimiter run for emphasis-like spans. `misses` remembers, per
 * delimiter, the earliest start that found no closer: a later start cannot find one either.
 */
const findCloser = (text: string, from: number, delim: string, misses: Map<string, number>): number => {
  if (from >= (misses.get(delim) ?? Infinity)) return -1;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\') { i += 1; continue; }
    if (ch === '`') {
      const run = backtickRun(text, i);
      const close = text.indexOf(run, i + run.length);
      if (close > 0) { i = close + run.length - 1; continue; }
    }
    if (text.startsWith(delim, i) && i > from && !/\s/u.test(text[i - 1]!)) {
      if (delim[0] === '_' && WORD.test(text[i + delim.length] ?? '')) continue;
      // `**` inside `*…*` must not close the single delimiter early.
      if (delim.length === 1 && text[i + 1] === delim) { i += 1; continue; }
      return i;
    }
  }
  misses.set(delim, Math.min(from, misses.get(delim) ?? Infinity));
  return -1;
};

const pushText = (out: MarkdownInline[], value: string) => {
  if (!value) return;
  const last = out[out.length - 1];
  if (last?.type === 'text') last.value += value;
  else out.push({ type: 'text', value });
};

/** Inline markdown to nodes. Newlines become line breaks. */
export function parseInline(text: string, depth = 0): MarkdownInline[] {
  const out: MarkdownInline[] = [];
  if (depth > MAX_DEPTH) {
    pushText(out, text);
    return out;
  }
  const misses = new Map<string, number>();
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    const rest = text.slice(i);

    if (ch === '\\' && ASCII_PUNCT.test(text[i + 1] ?? '')) {
      pushText(out, text[i + 1]!);
      i += 2;
      continue;
    }
    if (ch === '\n') {
      out.push({ type: 'br' });
      i += 1;
      continue;
    }
    if (ch === '`') {
      const run = backtickRun(text, i);
      const close = text.indexOf(run, i + run.length);
      if (close > 0 && text[close + run.length] !== '`') {
        let value = text.slice(i + run.length, close).replace(/\n/g, ' ');
        if (/^ .* $/.test(value) && value.trim()) value = value.slice(1, -1);
        out.push({ type: 'code', value });
        i = close + run.length;
        continue;
      }
      pushText(out, run);
      i += run.length;
      continue;
    }
    if (ch === '!' && text[i + 1] === '[') {
      const end = findBracketEnd(text, i + 1);
      const dest = end > 0 ? readDestination(text, end + 1) : null;
      if (dest) {
        const alt = plainText(parseInline(text.slice(i + 2, end), depth + 1));
        out.push(dest.title === undefined
          ? { type: 'image', src: dest.url, alt }
          : { type: 'image', src: dest.url, alt, title: dest.title });
        i = dest.end + 1;
        continue;
      }
    }
    if (ch === '[') {
      const end = findBracketEnd(text, i);
      const dest = end > 0 ? readDestination(text, end + 1) : null;
      if (dest) {
        const children = parseInline(text.slice(i + 1, end), depth + 1);
        out.push(dest.title === undefined
          ? { type: 'link', href: dest.url, children }
          : { type: 'link', href: dest.url, title: dest.title, children });
        i = dest.end + 1;
        continue;
      }
    }
    if (ch === '<') {
      const auto = AUTOLINK_RE.exec(rest);
      if (auto) {
        out.push({ type: 'link', href: auto[1]!, children: [{ type: 'text', value: auto[1]!.replace(/^mailto:/i, '') }], bare: true });
        i += auto[0].length;
        continue;
      }
    }
    if (ch === '&') {
      const entity = ENTITY_RE.exec(rest);
      const decoded = entity ? decodeEntity(entity) : null;
      if (entity && decoded !== null) {
        pushText(out, decoded);
        i += entity[0].length;
        continue;
      }
    }
    if (ch === '~' && text[i + 1] === '~' && text[i + 2] && !/\s/u.test(text[i + 2]!)) {
      const close = findCloser(text, i + 2, '~~', misses);
      if (close > 0) {
        out.push({ type: 'del', children: parseInline(text.slice(i + 2, close), depth + 1) });
        i = close + 2;
        continue;
      }
    }
    if (ch === '*' || ch === '_') {
      const leftOk = ch === '*' || !WORD.test(text[i - 1] ?? '');
      const double = text[i + 1] === ch;
      const delim = double ? ch + ch : ch;
      const after = text[i + delim.length];
      if (leftOk && after && !/\s/u.test(after)) {
        const close = findCloser(text, i + delim.length, delim, misses);
        if (close > 0) {
          const children = parseInline(text.slice(i + delim.length, close), depth + 1);
          out.push(double ? { type: 'strong', children } : { type: 'em', children });
          i = close + delim.length;
          continue;
        }
      }
      const run = new RegExp(`^\\${ch}+`).exec(rest)![0];
      pushText(out, run);
      i += run.length;
      continue;
    }
    if (ch === 'h' && !WORD.test(text[i - 1] ?? '')) {
      const bare = BARE_URL_RE.exec(rest);
      if (bare) {
        const url = bare[0].replace(/[.,;:!?'"]+$/, '');
        out.push({ type: 'link', href: url, children: [{ type: 'text', value: url }], bare: true });
        i += url.length;
        continue;
      }
    }
    pushText(out, ch);
    i += 1;
  }
  return out;
}

/** The text a reader sees, for accessible names and image alt text. */
export function plainText(nodes: ReadonlyArray<MarkdownInline>): string {
  return nodes.map((n) => {
    switch (n.type) {
      case 'text':
      case 'code': return n.value;
      case 'br': return ' ';
      case 'image': return n.alt;
      default: return plainText(n.children);
    }
  }).join('');
}

// ── blocks ─────────────────────────────────────────────────────────────────────

const FENCE_RE = /^(`{3,}|~{3,})\s*([^`\s]*)/;
const HEADING_RE = /^(#{1,6})\s+(.*?)(?:\s+#+)?$/;
const RULE_RE = /^(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
const BULLET_RE = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED_RE = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const TASK_RE = /^\[([ xX])\]\s+(.*)$/;
const DELIMITER_ROW_RE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

const indentOf = (s: string): number => s.replace(/\t/g, '    ').length;

/** Split a table row on unescaped pipes outside code spans. */
export function splitTableRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  let inCode = false;
  for (let i = 0; i < row.length; i += 1) {
    const ch = row[i]!;
    if (ch === '\\' && row[i + 1] === '|') { cell += '|'; i += 1; continue; }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) { cells.push(cell.trim()); cell = ''; continue; }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

const alignOf = (cell: string): TableAlign => {
  const c = cell.trim();
  const left = c.startsWith(':');
  const right = c.endsWith(':');
  return left && right ? 'center' : right ? 'right' : left ? 'left' : null;
};

interface ListLine { indent: number; ordered: boolean; number: number; text: string }

const matchListLine = (line: string): ListLine | null => {
  const bullet = BULLET_RE.exec(line);
  if (bullet && !RULE_RE.test(line.trim())) return { indent: indentOf(bullet[1]!), ordered: false, number: 1, text: bullet[3]! };
  const ordered = ORDERED_RE.exec(line);
  if (ordered) return { indent: indentOf(ordered[1]!), ordered: true, number: Number(ordered[2]), text: ordered[3]! };
  return null;
};

const toItem = (text: string): MarkdownListItem => {
  const task = TASK_RE.exec(text);
  return task
    ? { checked: task[1] !== ' ', children: parseInline(task[2]!), lists: [] }
    : { checked: null, children: parseInline(text), lists: [] };
};

/**
 * Builds nested lists from consecutive list lines. A line indented deeper than its
 * item's marker opens a nested list; a marker kind change at the top level ends the
 * list (as in the original renderer).
 */
const buildList = (lines: ListLine[]): MarkdownList[] => {
  const lists: MarkdownList[] = [];
  const stack: Array<{ list: MarkdownList; indent: number }> = [];
  for (const line of lines) {
    while (stack.length && line.indent < stack[stack.length - 1]!.indent) stack.pop();
    let top = stack[stack.length - 1];
    if (top && line.indent > top.indent) {
      const parentItem = top.list.items[top.list.items.length - 1]!;
      const nested: MarkdownList = { type: 'list', ordered: line.ordered, start: line.number, items: [] };
      parentItem.lists.push(nested);
      stack.push({ list: nested, indent: line.indent });
      top = stack[stack.length - 1];
    } else if (!top || top.list.ordered !== line.ordered) {
      const list: MarkdownList = { type: 'list', ordered: line.ordered, start: line.number, items: [] };
      if (stack.length <= 1) {
        lists.push(list);
        stack.length = 0;
      } else {
        stack.pop();
        const parent = stack[stack.length - 1]!.list;
        parent.items[parent.items.length - 1]!.lists.push(list);
      }
      stack.push({ list, indent: line.indent });
      top = stack[stack.length - 1];
    }
    top!.list.items.push(toItem(line.text));
  }
  return lists;
};

/** Markdown source to blocks. Empty or whitespace-only input yields no blocks. */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed === '') { flush(); i += 1; continue; }

    const fence = FENCE_RE.exec(trimmed);
    if (fence) {
      flush();
      const marker = fence[1]!;
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith(marker)) {
        body.push(lines[i]!);
        i += 1;
      }
      i += 1; // closing fence, if any
      blocks.push({ type: 'code', lang: fence[2] ?? '', value: body.join('\n') });
      continue;
    }

    const heading = HEADING_RE.exec(trimmed);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1]!.length, children: parseInline(heading[2]!) });
      i += 1;
      continue;
    }

    if (RULE_RE.test(trimmed)) {
      flush();
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      flush();
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('>')) {
        quote.push(lines[i]!.trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', children: parseInline(quote.join(' ')) });
      continue;
    }

    if (trimmed.includes('|') && i + 1 < lines.length && DELIMITER_ROW_RE.test(lines[i + 1]!) && lines[i + 1]!.includes('-')) {
      const head = splitTableRow(line);
      const delimiters = splitTableRow(lines[i + 1]!);
      if (delimiters.length === head.length) {
        flush();
        const rows: MarkdownInline[][][] = [];
        i += 2;
        while (i < lines.length && lines[i]!.trim() !== '' && lines[i]!.includes('|')) {
          const cells = splitTableRow(lines[i]!);
          rows.push(head.map((_, c) => parseInline(cells[c] ?? '')));
          i += 1;
        }
        blocks.push({ type: 'table', align: delimiters.map(alignOf), head: head.map((c) => parseInline(c)), rows });
        continue;
      }
    }

    const first = matchListLine(line);
    if (first) {
      flush();
      const listLines: ListLine[] = [];
      while (i < lines.length) {
        const current = lines[i]!;
        const item = matchListLine(current);
        if (item) {
          if (listLines.length && item.indent <= listLines[0]!.indent && item.ordered !== listLines[0]!.ordered) break;
          listLines.push(item);
        } else if (current.trim() !== '' && indentOf(current) > listLines[0]!.indent && listLines.length) {
          // Lazy continuation of the previous item.
          listLines[listLines.length - 1]!.text += `\n${current.trim()}`;
        } else {
          break;
        }
        i += 1;
      }
      const base = Math.min(...listLines.map((l) => l.indent));
      blocks.push(...buildList(listLines.map((l) => ({ ...l, indent: l.indent - base }))));
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }
  flush();
  return blocks;
}
