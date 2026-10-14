/* The mention node of the RichTextEditor schema (TENSOR HAR-1599).
 *
 * A mention is one inline atom — edited, selected and deleted as a unit — with the
 * person's id and the name the author picked. It is stored in markdown as
 * `@[Display name](mention:<id>)` (see `formatMention` / `readMention` in
 * markdown-model.ts), which the Markdown viewer reads too, so a mention is still a
 * mention after save → load → edit → save. It is never a link: `isSafeUrl` is not asked
 * about it and cannot drop it.
 *
 * The node is part of the schema in every editor and in the headless pipeline, so the
 * same markdown produces the same document everywhere; only the `@` listbox depends on
 * the consumer supplying `onMentionSearch`.
 *
 * No React and no DOM here (runs in Node for the fixture suite).
 */
import { mergeAttributes, Node } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { formatMention, readMention } from '../markdown-model.js';

/** A person the consumer offers in the `@` listbox. */
export interface MentionCandidate {
  /** Stored in the text; letters, digits and `_ . -` only (see `isMentionId`). */
  id: string;
  /** The name inserted and shown. */
  label: string;
  /** A second line in the listbox (e.g. team or e-mail), never stored. */
  description?: string;
}

export const Mention = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    };
  },
  parseHTML() {
    return [{
      tag: 'span[data-mention-id]',
      getAttrs: (el) => {
        const node = el as HTMLElement;
        const id = node.getAttribute('data-mention-id') ?? '';
        const label = node.getAttribute('data-mention-label') ?? node.textContent?.replace(/^@/, '') ?? '';
        return formatMention({ id, label }) ? { id, label } : false;
      },
    }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const label = String(node.attrs.label ?? '');
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'uix-mention',
        'data-mention-id': String(node.attrs.id ?? ''),
        'data-mention-label': label,
        contenteditable: 'false',
      }),
      `@${label}`,
    ];
  },
  renderText({ node }) {
    return `@${String(node.attrs.label ?? '')}`;
  },
  markdownTokenizer: {
    name: 'mention',
    level: 'inline',
    start: (src: string) => src.indexOf('@['),
    tokenize: (src: string) => {
      const found = readMention(src);
      if (!found) return undefined;
      return { type: 'mention', raw: src.slice(0, found.length), id: found.id, label: found.label };
    },
  },
  parseMarkdown: (token, helpers) =>
    helpers.createNode('mention', { id: String(token.id ?? ''), label: String(token.label ?? '') }),
  renderMarkdown: (node: JSONContent) =>
    formatMention({ id: String(node.attrs?.id ?? ''), label: String(node.attrs?.label ?? '') })
    // A node that cannot be stored as a mention keeps its words.
    ?? `@${String(node.attrs?.label ?? '')}`,
});
