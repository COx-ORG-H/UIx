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
import { getSchema } from '@tiptap/core';
import type { AnyExtension, JSONContent } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import { MarkdownManager } from '@tiptap/markdown';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Image } from '@tiptap/extension-image';
import { StarterKit } from '@tiptap/starter-kit';
import { Marked } from 'marked';

/** Link policy used when the consumer passes none: http(s), mailto and same-app paths. */
export const DEFAULT_SAFE_URL_RE = /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i;
export const defaultIsSafeUrl = (url: string): boolean => DEFAULT_SAFE_URL_RE.test(url.trim());

export interface SchemaExtensionOptions {
  /** Heading levels the schema accepts. Parsed headings outside the set still round-trip (see below). */
  headingLevels?: ReadonlyArray<1 | 2 | 3>;
  isSafeUrl?: (url: string) => boolean;
  /** Replacement for the image node (same name and attributes), e.g. with a render policy. */
  image?: AnyExtension;
}

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
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: false } }),
    options.image ?? Image.configure({ inline: true, allowBase64: false }),
  ];
}

/** Characters that start markup only in some positions; see encodeText. */
const ENTITY_LIKE = /&(?=#\d+;|#x[\da-f]+;|[a-z][a-z\d]*;)/gi;
const TAG_LIKE = /<(?=[a-z/!?])/gi;
const ASCII_PUNCT = /[!-/:-@[-`{-~]/;

/**
 * Text encoding for serialized (edited) blocks. Tiptap's default turns every `&`, `<`
 * and `>` into an entity and backslash-escapes every `_` and `*`, so a user typing
 * "Tom & Jerry" or "snake_case" would store `Tom &amp; Jerry` / `snake\_case`. This
 * encodes only what a CommonMark reader would otherwise misread, which keeps the stored
 * text readable in every plain-text sink.
 */
export function encodeText(text: string): string {
  let out = '';
  const chars = Array.from(text);
  let lineStart = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]!;
    const prev = chars[i - 1] ?? '';
    const next = chars[i + 1] ?? '';
    if (ch === '\n') lineStart = i + 1;
    // Block syntax only counts at the start of a line; a text node is treated as one.
    if (i === lineStart || (i > lineStart && /^\d+$/.test(chars.slice(lineStart, i).join('')))) {
      const line = chars.slice(lineStart).join('').split('\n')[0]!;
      const endOrSpace = next === '' || next === '\n' || /\s/u.test(next);
      if (
        (i === lineStart && /[-+*#]/.test(ch) && (endOrSpace || (ch === '#' && next === '#'))) ||
        (i === lineStart && /[-=*_]/.test(ch) && new RegExp(`^(?:\\${ch}\\s*){2,}$`).test(line)) ||
        (i > lineStart && /[.)]/.test(ch) && endOrSpace)
      ) {
        out += `\\${ch}`;
        continue;
      }
    }
    switch (ch) {
      case '\\':
        // A backslash is only an escape before ASCII punctuation (`C:\Users` stays as is).
        out += ASCII_PUNCT.test(next) || next === '' ? '\\\\' : '\\';
        break;
      case '`':
      case '[':
      case ']':
      case '~':
        out += `\\${ch}`;
        break;
      case '*':
      case '_': {
        const spaced = (prev === '' || /\s/u.test(prev)) && (next === '' || /\s/u.test(next));
        const intraword = ch === '_' && /[\p{L}\p{N}]/u.test(prev) && /[\p{L}\p{N}]/u.test(next);
        out += spaced || intraword ? ch : `\\${ch}`;
        break;
      }
      case '>':
        out += i === 0 ? '\\>' : ch;
        break;
      default:
        out += ch;
    }
  }
  return out.replace(ENTITY_LIKE, '&amp;').replace(TAG_LIKE, '&lt;');
}

type ManagerInternals = {
  encodeTextForMarkdown: (text: string, node: JSONContent, parentNode?: JSONContent) => string;
  codeTypes: Set<string>;
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
    return inCode ? text : encodeText(text);
  };
  return manager;
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
}

export interface MarkdownSource {
  source: string;
  blocks: MarkdownBlock[];
  /** Text after the last block (usually the final newline). */
  tail: string;
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
  const tokens = manager.instance.lexer(source) as Array<{ type: string; raw: string }>;
  const joined = tokens.map((t) => t.raw).join('');
  const blocks: MarkdownBlock[] = [];
  let lead = '';

  const pushBlock = (raw: string) => {
    let nodes: JSONContent[];
    try {
      nodes = normalize(schema, manager.parse(raw).content ?? []);
    } catch {
      nodes = normalize(schema, [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }]);
    }
    if (nodes.length === 0) {
      // Parses to nothing (e.g. an empty heading marker): keep it with the separators.
      lead += raw;
      return;
    }
    blocks.push({ raw, lead, nodes, keys: nodes.map(nodeKey) });
    lead = '';
  };

  if (joined !== source) {
    // Defensive: if the lexer ever drops bytes, treat the whole source as one block.
    const core = source.replace(/\s+$/u, '');
    lead = source.slice(0, source.length - source.trimStart().length);
    if (core.trim()) pushBlock(core.trimStart());
    const tail = source.slice(core.length);
    return { source, blocks, tail, doc: { type: 'doc', content: blocks.flatMap((b) => b.nodes) } };
  }

  for (const token of tokens) {
    if (SEPARATOR_TOKENS.has(token.type) || token.raw.trim() === '') {
      lead += token.raw;
      continue;
    }
    const core = token.raw.replace(/\s+$/u, '');
    pushBlock(core);
    lead += token.raw.slice(core.length);
  }

  return {
    source,
    blocks,
    tail: lead,
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
  const { blocks } = origin;
  type Piece = { text: string; block?: number };
  const pieces: Piece[] = [];
  let i = 0;
  let j = 0;

  while (i < content.length) {
    if (j < blocks.length && matchesAt(keys, i, blocks[j]!)) {
      pieces.push({ text: blocks[j]!.raw, block: j });
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
    pieces.push({ text: manager.serialize({ type: 'doc', content: [content[i]!] }).replace(/^\n+|\n+$/g, '') });
    i += 1;
    // An edited node replaces the block it sits on, unless new nodes are being inserted before it.
    if (!insert && j < blocks.length) j += 1;
  }

  let out = '';
  pieces.forEach((piece, n) => {
    const prev = pieces[n - 1];
    if (n === 0) {
      out += piece.block === 0 ? blocks[0]!.lead : '';
    } else if (piece.block !== undefined && prev?.block === piece.block - 1) {
      out += blocks[piece.block]!.lead;
    } else {
      out += '\n\n';
    }
    out += piece.text;
  });
  const last = pieces[pieces.length - 1]!;
  if (last.block === blocks.length - 1) out += origin.tail;
  else if (origin.tail.endsWith('\n')) out += '\n';
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
