---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Rich-text authoring, a markdown viewer and emoji reactions (RTE-01), as three optional entries. The root entry imports none of them.

- **`@tensor_1/react/rich-text`:** `RichTextEditor` and `RichTextEditorFallback` on Tiptap 3.31.3.
  - Markdown in, markdown out. `onChange` fires only for user edits.
  - Untouched blocks keep their exact source bytes, CRLF and `{{variables}}` included. Only edited blocks are re-serialized.
  - Raw HTML stays literal text. Link and image policies come from `isSafeUrl` and `resolveImageSrc`.
  - `full` / `comment` / `template` presets, `headingLevels`, image upload, paste and drop, and a Ctrl/Cmd+Enter submit shortcut.
  - Markdown source mode, a character counter, and a `composer` variant that renders in `Composer` / `ComposerBar` with `toolbarEnd`.
  - Unicode emoji from a toolbar picker and `:shortcode` suggestions.
  - `roundTripMarkdown(md)` runs the same pipeline without a DOM, so consumers can gate their own content corpus.
- **`@tensor_1/react/markdown`:** TENSOR's dependency-free, sink-free `Markdown` viewer, with its behaviour preserved.
  - Adds strikethrough, task lists, GFM tables, nested lists, escapes and character references.
  - Renders images only when `resolveImageSrc` returns a URL, which is used verbatim.
  - Server-component safe: no hooks, no `"use client"`.
- **`@tensor_1/react/emoji`:** `EmojiPicker` and `ReactionBar`.
  - `EmojiPicker`: search, categories, recent picks, and English or German names. The emoji data is a lazily imported bundled chunk.
  - `ReactionBar`: `aria-pressed` chips with reactor names in the tooltip and in the accessible name, plus quick picks.
- **Offline by design:** no runtime network requests.
  - `@tiptap/extension-emoji` runs on a list without its CDN `fallbackImage` URLs or GitHub image emoji (`forceFallbackImages: false`).
  - A jsdom egress test spies on fetch, XHR, WebSocket, EventSource, beacons, image sources and appended resources.
- **`emojiImageBaseUrl`** (editor, picker, reaction bar): an optional same-origin folder of `<codepoints>.png` images for devices that cannot draw an emoji. Unset means native emoji only, and no image set ships.
- **Styles:** `.uix-rich-text` (new module), prose rules for tables, code blocks, rules, images and task lists, and the full `.uix-emoji-picker` and reaction focus/disabled states. Existing `--uix-*` tokens only; light and dark.

Optional peer dependencies, all exact pins and all MIT:
- `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-list`, `@tiptap/extension-table`, `@tiptap/extension-image`, `@tiptap/extension-emoji`, `@tiptap/extensions` and `@tiptap/suggestion`, all 3.31.3.
- `marked` 17.0.6 and `emojibase-data` 17.0.0.

Their installed dependencies are also all MIT (prosemirror-*, linkifyjs, emoji-regex, emojibase, is-emoji-supported, @floating-ui/*, fast-equals, use-sync-external-store); `is-emoji-supported` 0.0.5 ships no LICENSE file. `dist/` bundles none of this code. `@tensor_1/react` itself is `UNLICENSED` and ships no LICENSE file.
