/* The markdown pipeline shared by RichTextEditor and roundTripMarkdown (RTE-01).
 *
 * Markdown is the only stored format. Two rules keep regulated text intact:
 *
 * 1. Untouched blocks keep their source bytes. The source is split into top-level
 *    blocks with the same marked lexer the parser uses (token `raw` strings concatenate
 *    back to the exact source). Each block is parsed on its own and remembered as
 *    { raw, nodes }. On serialize, every current top-level node run that still equals a
 *    remembered block is emitted as that block's raw text, with the original separator
 *    when its predecessor is also unchanged. Only edited or new blocks go through the
 *    Tiptap serializer. Reference definitions (`[x]: url`) and blank-line runs live in
 *    the separators.
 * 2. Nothing is ever parsed as raw HTML. A private marked instance (never the global
 *    `marked`, which other code in the app may use) has its html/tag tokenizers
 *    switched off, so `<div>` stays literal text, and the serializer encodes only the
 *    characters that would otherwise be re-read as markup.
 *
 * No React and no DOM here: this module runs in Node for the fixture suite and for
 * consumers gating their own corpus with roundTripMarkdown.
 */
import { getSchema, renderNestedMarkdownContent } from '@tiptap/core';
import type { AnyExtension, JSONContent } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import { MarkdownManager } from '@tiptap/markdown';
import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Image } from '@tiptap/extension-image';
import { StarterKit } from '@tiptap/starter-kit';
import { Marked } from 'marked';
import { defaultIsSafeUrl } from '../url-policy.js';

/** Link policy used when the consumer passes none: http(s), mailto and same-app paths. */
export { defaultIsSafeUrl };

export interface SchemaExtensionOptions {
  /** Heading levels the schema accepts. Parsed headings outside the set still round-trip (see below). */
  headingLevels?: ReadonlyArray<1 | 2 | 3>;
  isSafeUrl?: (url: string) => boolean;
  /** Replacement for the image node (same name and attributes), e.g. with a render policy. */
  image?: AnyExtension;
}

type RenderHelpers = Parameters<typeof renderNestedMarkdownContent>[1];

/**
 * Lines after a hard break in an item's first paragraph are written indented to the
 * item's content (Tiptap reads list continuation at two spaces). Unindented "lazy"
 * continuation lines are fragile: a line containing ` #` ends the item for the next one.
 */
const indentContinuation = (h: RenderHelpers): RenderHelpers => {
  let first = true;
  return {
    ...h,
    renderChildren: (nodes: JSONContent[]) => {
      const out = h.renderChildren(nodes);
      if (!first) return out;
      first = false;
      return out.split('\n').map((line, n) => (n > 0 && line ? h.indent(line) : line)).join('\n');
    },
  };
};

const listItemRender = ListItem.config.renderMarkdown as unknown as (node: JSONContent, h: RenderHelpers, ctx: unknown) => string;
const UixListItem = ListItem.extend({
  renderMarkdown: (node: JSONContent, h: RenderHelpers, ctx: unknown) => listItemRender(node, indentContinuation(h), ctx),
});

/**
 * Tiptap's task-list tokenizer reads one line per item, so a hard break inside a task
 * item cannot be stored as such. Its lines are written as paragraphs of the same item
 * (`- [ ] one` / blank / `  two`), which keeps every word inside the item.
 */
const UixTaskItem = TaskItem.extend({
  renderMarkdown: (node: JSONContent, h: Parameters<typeof renderNestedMarkdownContent>[1]) => {
    const prefix = `- [${node.attrs?.checked ? 'x' : ' '}] `;
    const [first, ...rest] = node.content ?? [];
    if (first?.type !== 'paragraph' || !(first.content ?? []).some((c) => c.type === 'hardBreak')) {
      return renderNestedMarkdownContent(node, h, prefix);
    }
    const lines: JSONContent[][] = [[]];
    for (const child of first.content ?? []) {
      if (child.type === 'hardBreak') lines.push([]);
      else lines[lines.length - 1]!.push(child);
    }
    const paragraphs = lines.filter((line) => line.length > 0).map((content) => ({ type: 'paragraph', content }));
    return renderNestedMarkdownContent({ ...node, content: [...paragraphs, ...rest] }, h, prefix);
  },
});

/**
 * The node/mark set, identical in the editor and in headless use so the same markdown
 * produces the same document everywhere. `headingLevels` limits what input rules,
 * shortcuts and pasted HTML can create; the heading `level` attribute itself is not
 * validated, so existing content at another level (a PIR with an old `## `) still
 * round-trips unchanged.
 */
export function createSchemaExtensions(options: SchemaExtensionOptions = {}): AnyExtension[] {
  const isSafeUrl = options.isSafeUrl ?? defaultIsSafeUrl;
  return [
    StarterKit.configure({
      underline: false,
      listItem: false,
      heading: { levels: [...(options.headingLevels ?? [1, 2, 3])] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        // Unsafe links never become marks: pasted or typed, they stay text.
        isAllowedUri: (url) => isSafeUrl(url),
        shouldAutoLink: (url) => isSafeUrl(url),
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null },
      },
    }),
    UixListItem,
    TaskList,
    UixTaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: false } }),
    options.image ?? Image.configure({ inline: true, allowBase64: false }),
  ];
}

/** Characters that start markup only in some positions; see encodeText. */
const ENTITY_AFTER_AMP = /^(?:#\d+;|#x[\da-f]+;|[a-z][a-z\d]*;)/i;
const TAG_START = /^[a-z/!?]$/i;
const ASCII_PUNCT = /[!-/:-@[-`{-~]/;
const LIST_MARKER = /^(?:\d+|[ivxlcdmIVXLCDM]+|[a-zA-Z]{1,2})$/;

export interface EncodeTextOptions {
  /** The text sits in a table cell, where `|` ends the cell. */
  inTable?: boolean;
  /** The next inline node opens a link, so a trailing `!` would turn it into an image. */
  beforeLink?: boolean;
  /** The text starts a line (first in its block, or after a hard break). Default true. */
  lineStart?: boolean;
  /** The text ends an ATX heading, where a trailing ` #` run would be dropped as a closing sequence. */
  headingEnd?: boolean;
}

/**
 * Text encoding for serialized (edited) blocks. Tiptap's default turns every `&`, `<`
 * and `>` into an entity and backslash-escapes every `_` and `*`, so a user typing
 * "Tom & Jerry" or "snake_case" would store `Tom &amp; Jerry` / `snake\_case`. This
 * encodes only what a CommonMark reader would otherwise misread, which keeps the stored
 * text readable in every plain-text sink.
 *
 * At the start of a line (first text in a block, or after a hard break) leading
 * whitespace is dropped and list/heading/quote/rule/setext markers are escaped, so edited
 * text never changes its block type.
 */

const BACKSLASH = String.fromCharCode(92);

export function encodeText(text: string, options: EncodeTextOptions = {}): string {
  let out = '';
  const chars = Array.from(text);
  let lineStart = 0;
  let inLead = options.lineStart ?? true;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]!;
    const prev = chars[i - 1] ?? '';
    const next = chars[i + 1] ?? '';
    if (ch === '\n') {
      out += ch;
      lineStart = i + 1;
      inLead = true;
      continue;
    }
    if (inLead && (ch === ' ' || ch === '\t')) {
      // Insignificant in a markdown paragraph (every reader strips it), and four spaces
      // or a tab would turn the line into a code block: leave it out.
      continue;
    }
    const atStart = inLead;
    inLead = false;
    const lineRest = chars.slice(i).join('').split('\n')[0]!;
    const endOrSpace = next === '' || next === '\n' || /\s/u.test(next);
    // Ordered-list markers as @tiptap/extension-list reads them: 12. / iv) / a. / AB)
    const markerBefore = !atStart && LIST_MARKER.test(out.slice(out.lastIndexOf('\n') + 1));
    if (
      // `#` always: marked ends a list item at a line starting with `#`, space or not.
      (atStart && (ch === '#' || (/[-+*]/.test(ch) && endOrSpace))) ||
      (atStart && /[-=*_]/.test(ch) && new RegExp(`^(?:\\${ch}[ \\t]*)+$`).test(lineRest)) ||
      (markerBefore && /[.)]/.test(ch) && endOrSpace)
    ) {
      out += BACKSLASH + ch;
      continue;
    }
    if (ch === '#' && options.headingEnd && (prev === '' || /\s/u.test(prev)) && /^#+$/.test(lineRest)) {
      out += BACKSLASH + ch;
      continue;
    }
    switch (ch) {
      case BACKSLASH:
        // A backslash is only an escape before ASCII punctuation (`C:\Users` stays as is).
        out += ASCII_PUNCT.test(next) || next === '' ? BACKSLASH + BACKSLASH : BACKSLASH;
        break;
      case '`':
      case '[':
      case ']':
      case '~':
        out += BACKSLASH + ch;
        break;
      case '|':
        out += options.inTable ? BACKSLASH + ch : ch;
        break;
      case '&':
        out += ENTITY_AFTER_AMP.test(chars.slice(i + 1, i + 40).join('')) ? '&amp;' : ch;
        break;
      case '<':
        out += TAG_START.test(next) ? '&lt;' : ch;
        break;
      case '!':
        out += next === '' && options.beforeLink ? BACKSLASH + ch : ch;
        break;
      case '*':
      case '_': {
        const spaced = (prev === '' || /\s/u.test(prev)) && (next === '' || /\s/u.test(next));
        const intraword = ch === '_' && /[\p{L}\p{N}]/u.test(prev) && /[\p{L}\p{N}]/u.test(next);
        out += spaced || intraword ? ch : BACKSLASH + ch;
        break;
      }
      case '>':
        out += atStart ? BACKSLASH + ch : ch;
        break;
      default:
        out += ch;
    }
  }
  return out;
}

type ManagerInternals = {
  encodeTextForMarkdown: (text: string, node: JSONContent, parentNode?: JSONContent) => string;
  codeTypes: Set<string>;
  uixInTable?: boolean;
};

/**
 * A marked instance of our own: raw HTML is never tokenized (it stays literal text),
 * and `use()` calls made by Tiptap extensions land here, not on the global `marked`.
 */
export function createMarked(): Marked {
  return new Marked({
    gfm: true,
    tokenizer: {
      html: () => undefined,
      tag: () => undefined,
    },
  });
}

const hasLink = (node: JSONContent | undefined): boolean =>
  (node?.marks ?? []).some((m) => (typeof m === 'string' ? m : m.type) === 'link');

/**
 * Applies the narrower text encoding to a Tiptap MarkdownManager. The method is
 * private upstream; the exact version pin plus the byte-exact fixture suite guard it.
 */
export function patchManager(manager: MarkdownManager): MarkdownManager {
  const internals = manager as unknown as ManagerInternals;
  internals.encodeTextForMarkdown = function encode(text, node, parentNode) {
    const inCode =
      (parentNode?.type != null && internals.codeTypes.has(parentNode.type)) ||
      (node.marks ?? []).some((m) => internals.codeTypes.has(typeof m === 'string' ? m : m.type));
    if (inCode) return text;
    const siblings = parentNode?.content ?? [];
    const index = siblings.indexOf(node);
    const previous = index > 0 ? siblings[index - 1] : undefined;
    const next = index >= 0 ? siblings[index + 1] : undefined;
    return encodeText(text, {
      inTable: !!internals.uixInTable,
      beforeLink: hasLink(next) && !hasLink(node),
      // Unknown position (node not found among its siblings): assume a line start, the safe side.
      lineStart: index <= 0 || previous?.type === 'hardBreak',
      headingEnd: parentNode?.type === 'heading' && (index < 0 || index === siblings.length - 1),
    });
  };
  return manager;
}

/** Serialize one top-level node with the patched encoder. */
function serializeNode(manager: MarkdownManager, node: JSONContent): string {
  const internals = manager as unknown as ManagerInternals;
  internals.uixInTable = node.type === 'table';
  try {
    return manager.serialize({ type: 'doc', content: [node] }).replace(/^\n+|\n+$/g, '');
  } finally {
    internals.uixInTable = false;
  }
}

export function createManager(extensions: AnyExtension[]): MarkdownManager {
  return patchManager(new MarkdownManager({ marked: createMarked() as never, extensions }));
}

// ── block segmentation ─────────────────────────────────────────────────────────

export interface MarkdownBlock {
  /** Source text of the block without its trailing blank lines. */
  raw: string;
  /** Whitespace and reference definitions between the previous block and this one. */
  lead: string;
  /** Normalized top-level nodes the block parsed to (usually one). */
  nodes: JSONContent[];
  /** JSON keys of `nodes`, for comparison with the live document. */
  keys: string[];
  /** Reference definitions (and other text that parses to nothing) inside `lead`. */
  defs: string[];
}

export interface MarkdownSource {
  source: string;
  blocks: MarkdownBlock[];
  /** Text after the last block (usually the final newline). */
  tail: string;
  /** Reference definitions inside `tail`. */
  tailDefs: string[];
  /** Line ending the document uses throughout (CRLF only when every break is CRLF). */
  eol: string;
  /** The document the editor loads. */
  doc: JSONContent;
}

const SEPARATOR_TOKENS = new Set(['space', 'def']);

/** Stable key of a node for equality; attribute order is fixed by the schema. */
export const nodeKey = (node: JSONContent): string => JSON.stringify(node);

const normalize = (schema: Schema, content: JSONContent[]): JSONContent[] => {
  if (content.length === 0) return [];
  // The manager lifts a paragraph holding only an image to the top level; images are
  // inline here, so wrap runs of top-level inline nodes back into a paragraph.
  const blocks: JSONContent[] = [];
  for (const node of content) {
    if (node.type && schema.nodes[node.type]?.isInline) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'paragraph' && (last as { wrapped?: boolean }).wrapped) last.content!.push(node);
      else blocks.push({ type: 'paragraph', content: [node], wrapped: true } as JSONContent);
    } else {
      blocks.push(node);
    }
  }
  for (const block of blocks) delete (block as { wrapped?: boolean }).wrapped;
  const doc = schema.nodeFromJSON({ type: 'doc', content: blocks });
  doc.check();
  return (doc.toJSON() as JSONContent).content ?? [];
};

/**
 * Split markdown into blocks and build the editor document from them. Each block is
 * parsed alone, so reference-style links render as their literal text (the same as
 * the UIx Markdown viewer) and a block that fails to parse is kept as literal text.
 */
export function readMarkdown(source: string, manager: MarkdownManager, schema: Schema): MarkdownSource {
  // marked lexes with CR/CRLF normalized to LF. Lex that, then cut the ORIGINAL text at the
  // mapped offsets so CRLF documents keep their bytes too.
  const normalized = source.replace(/\r\n?/g, '\n');
  const lexed = manager.instance.lexer(normalized) as Array<{ type: string; raw: string }>;
  const origin: number[] = [];
  for (let i = 0, o = 0; i <= normalized.length; i += 1, o += 1) {
    origin.push(o);
    if (source[o] === '\r' && source[o + 1] === '\n') o += 1;
  }
  let cursor = 0;
  const tokens = lexed.map((t) => {
    const start = origin[cursor]!;
    cursor += t.raw.length;
    return { type: t.type, raw: source.slice(start, origin[cursor]) };
  });
  const joined = lexed.map((t) => t.raw).join('') === normalized ? tokens.map((t) => t.raw).join('') : null;
  const blocks: MarkdownBlock[] = [];
  const eol = /\r\n/.test(source) && !/(^|[^\r])\n/.test(source) ? '\r\n' : '\n';
  let lead = '';
  let defs: string[] = [];
  const keepInLead = (raw: string) => {
    lead += raw;
    const text = raw.replace(/\s+$/u, '').replace(/^\s+/u, '');
    if (text) defs.push(text);
  };

  const pushBlock = (raw: string) => {
    let nodes: JSONContent[];
    try {
      nodes = normalize(schema, manager.parse(raw).content ?? []);
    } catch {
      nodes = normalize(schema, [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }]);
    }
    if (nodes.length === 0) {
      // Parses to nothing (e.g. an empty heading marker): keep it with the separators.
      keepInLead(raw);
      return;
    }
    blocks.push({ raw, lead, nodes, keys: nodes.map(nodeKey), defs });
    lead = '';
    defs = [];
  };

  if (joined !== source) {
    // Defensive: if the lexer ever drops bytes, treat the whole source as one block.
    const core = source.replace(/\s+$/u, '');
    lead = source.slice(0, source.length - source.trimStart().length);
    if (core.trim()) pushBlock(core.trimStart());
    const tail = source.slice(core.length);
    return { source, blocks, tail, tailDefs: [], eol, doc: { type: 'doc', content: blocks.flatMap((b) => b.nodes) } };
  }

  for (const token of tokens) {
    if (SEPARATOR_TOKENS.has(token.type) || token.raw.trim() === '') {
      if (token.type === 'def') keepInLead(token.raw);
      else lead += token.raw;
      continue;
    }
    // marked sometimes attaches the blank lines before a block to its raw text; they are
    // separator, not content (indentation on the first content line is kept).
    const leading = /^(?:[ \t]*\r?\n)*/.exec(token.raw)![0];
    lead += leading;
    const body = token.raw.slice(leading.length);
    const core = body.replace(/\s+$/u, '');
    pushBlock(core);
    lead += body.slice(core.length);
  }

  return {
    source,
    blocks,
    tail: lead,
    tailDefs: defs,
    eol,
    doc: { type: 'doc', content: blocks.flatMap((b) => b.nodes) },
  };
}

const isEmptyParagraph = (node: JSONContent): boolean =>
  node.type === 'paragraph' && !(node.content ?? []).some((c) => c.type !== 'text' || (c.text ?? '').trim() !== '');

const matchesAt = (children: string[], at: number, block: MarkdownBlock): boolean =>
  block.keys.every((key, k) => children[at + k] === key);

/** How far ahead to look for a moved/deleted block before treating a node as edited. */
const LOOKAHEAD = 8;

/**
 * Serialize a document, reusing the source bytes of every unchanged block.
 * `origin` is the MarkdownSource the document was loaded from.
 */
export function writeMarkdown(doc: JSONContent, origin: MarkdownSource, manager: MarkdownManager): string {
  const content = [...(doc.content ?? [])];
  // The editor keeps an empty trailing paragraph after tables/code (TrailingNode) and
  // an empty document is one empty paragraph: neither is content.
  while (content.length > 0 && isEmptyParagraph(content[content.length - 1]!)) content.pop();
  if (content.length === 0) {
    return origin.blocks.length === 0 ? origin.source : '';
  }

  const keys = content.map(nodeKey);
  const { blocks, eol } = origin;
  // `slot`: the original block a piece occupies — reused unchanged, or edited in place.
  // Inserted pieces have none. Separators are kept between consecutive slots.
  type Piece = { text: string; slot?: number; edited: boolean };
  const pieces: Piece[] = [];
  let i = 0;
  let j = 0;

  while (i < content.length) {
    if (j < blocks.length && matchesAt(keys, i, blocks[j]!)) {
      pieces.push({ text: blocks[j]!.raw, slot: j, edited: false });
      i += blocks[j]!.keys.length;
      j += 1;
      continue;
    }
    // A later block matches here → the blocks in between were deleted.
    let skip = 0;
    for (let d = 1; d <= LOOKAHEAD && j + d < blocks.length; d += 1) {
      if (matchesAt(keys, i, blocks[j + d]!)) { skip = d; break; }
    }
    // The current block matches a little later → the nodes in between are new.
    let insert = 0;
    if (j < blocks.length) {
      for (let d = 1; d <= LOOKAHEAD && i + d < content.length; d += 1) {
        if (matchesAt(keys, i + d, blocks[j]!)) { insert = d; break; }
      }
    }
    if (skip && (!insert || skip <= insert)) {
      j += skip;
      continue;
    }
    let text = serializeNode(manager, content[i]!);
    if (eol !== '\n') text = text.replace(/\n/g, eol);
    // An edited single-node block is edited in place, unless new nodes are being inserted before it.
    const inPlace = !insert && j < blocks.length && blocks[j]!.keys.length === 1;
    pieces.push(inPlace ? { text, slot: j, edited: true } : { text, edited: true });
    i += 1;
    if (!insert && j < blocks.length) j += 1;
  }

  const blank = eol + eol;
  const emitted = new Set<number>();
  let out = '';
  pieces.forEach((piece, n) => {
    const prev = pieces[n - 1];
    const slot = piece.slot;
    const lead = slot !== undefined ? blocks[slot]!.lead : '';
    if (n === 0) {
      if (slot === 0) { out += lead; emitted.add(0); }
    } else if (
      slot !== undefined && prev?.slot === slot - 1 &&
      // Next to a re-serialized block, only a separator with a blank line is safe.
      (!(piece.edited || prev.edited) || /\n[ \t]*\r?\n/.test(lead))
    ) {
      out += lead;
      emitted.add(slot);
    } else {
      out += blank;
    }
    out += piece.text;
  });
  const last = pieces[pieces.length - 1]!;
  const tailKept = last.slot === blocks.length - 1;
  // Reference definitions sit in separators the editor never shows: keep the ones whose
  // separator was not written, at the end of the document.
  const lost = [
    ...blocks.flatMap((block, n) => (emitted.has(n) ? [] : block.defs)),
    ...(tailKept ? [] : origin.tailDefs),
  ];
  if (lost.length) out += blank + lost.join(eol);
  if (tailKept) out += origin.tail;
  else if (/\n$/.test(origin.tail)) out += eol;
  return out;
}

export interface MarkdownPipeline {
  extensions: AnyExtension[];
  schema: Schema;
  manager: MarkdownManager;
  read: (source: string) => MarkdownSource;
  write: (doc: JSONContent, origin: MarkdownSource) => string;
}

/** Headless pipeline over the editor's node set. */
export function createPipeline(options: SchemaExtensionOptions = {}): MarkdownPipeline {
  const extensions = createSchemaExtensions(options);
  const schema = getSchema(extensions);
  const manager = createManager(extensions);
  return {
    extensions,
    schema,
    manager,
    read: (source) => readMarkdown(source, manager, schema),
    write: (doc, origin) => writeMarkdown(doc, origin, manager),
  };
}
