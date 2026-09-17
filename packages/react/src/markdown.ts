// @tensor_1/react/markdown — safe, dependency-free markdown viewer (RTE-01).
// Server-component safe: no hooks, no client directive, no Tiptap.
export { Markdown, defaultMarkdownIsSafeUrl } from './components/Markdown.js';
export type { MarkdownProps } from './components/Markdown.js';
export { parseMarkdown, parseInline, plainText } from './markdown-model.js';
export type { MarkdownBlock, MarkdownInline, MarkdownList, MarkdownListItem, TableAlign } from './markdown-model.js';
