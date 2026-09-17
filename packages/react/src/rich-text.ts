// @tensor_1/react/rich-text — markdown rich-text editor on Tiptap v3 (RTE-01).
// Requires the optional peers listed in package.json (`@tiptap/*`, `marked`,
// `emojibase-data`); the root entry never imports them.
export { RichTextEditor, RichTextEditorFallback, DEFAULT_RICH_TEXT_LABELS } from './components/RichTextEditor.js';
export type {
  RichTextEditorProps,
  RichTextLabels,
  RichTextFeatures,
  RichTextHeadingLevel,
} from './components/RichTextEditor.js';
export { roundTripMarkdown } from './rich-text/round-trip.js';
export type { SchemaExtensionOptions as RoundTripOptions } from './rich-text/pipeline.js';
