## Summary

This adds rich-text authoring, a markdown viewer and emoji reactions to UIx as three optional subpaths, implementing the UIx part of TENSOR `Docs/plans/2026-09-17-rich-text-editor-design.md` (RTE-01), including its on-premises revision. The root entry imports none of them; a test checks this.

- **`@tensor_1/react/rich-text`:** `RichTextEditor` and `RichTextEditorFallback` on Tiptap 3.31.3, plus `roundTripMarkdown(md)`.
  - Markdown in, markdown out. `onChange` fires only for user edits, never on mount or on outside `value` changes.
  - **Untouched blocks keep their exact source bytes** (block-preserving serializer). Edited blocks are escaped only where a reader would misread them.
  - Raw HTML is never interpreted, except `<br>` as a line break in table cells.
  - `full` / `comment` / `template` presets, `headingLevels`, image upload/paste/drop gated by `onUploadImage` + `resolveImageSrc`, and a `composer` variant with `toolbarEnd`.
  - Source mode, a counter, the Ctrl/Cmd+Enter shortcut, the link dialog, and `:shortcode` suggestions.
- **`@tensor_1/react/markdown`:** TENSOR's zero-dependency viewer, with its behaviour preserved.
  - Adds strikethrough, task lists, GFM tables, nested lists, escapes and entities, and images gated by `resolveImageSrc` (return value used verbatim).
  - Server-component safe: no hooks, no `"use client"`, no HTML sink.
- **`@tensor_1/react/emoji`:** `EmojiPicker` (search, categories, recents, en/de names, lazy bundled data) and `ReactionBar` (`aria-pressed` chips, names in tooltip and accessible name, quick picks).
- **Offline:** no runtime requests. `@tiptap/extension-emoji` runs on a list without its CDN `fallbackImage` URLs or GitHub image emoji (`forceFallbackImages: false`).
- **`emojiImageBaseUrl`** (editor, picker, reaction bar): an optional, same-origin-only folder of `<codepoints>.png` images for devices that cannot draw an emoji. No image set ships.
- **CSS:** `.uix-rich-text` (new module), prose rules for tables, code, rules, images and tasks, and the full picker plus reaction focus/disabled states. Existing `--uix-*` tokens only; light and dark.
- **Peers:** all optional, exact pins and MIT: Tiptap packages 3.31.3, `marked` 17.0.6, `emojibase-data` 17.0.0. Their full dependency closure is MIT too (checked by a test). `is-emoji-supported` ships no LICENSE file.

Release: this PR carries only its changeset. It ships in a joint **2.19.0** with `feat/operator-primitives`, versioned and tagged from `release/2.19.0` after both merge. 2.17.0 and 2.18.0 are already on npm.

## Contract change?

- [ ] **This PR touches the `--uix-*` contract** — the checklist below is REQUIRED.
- [x] **This PR does NOT touch the contract** (opt out). The change is component CSS only, with no token names or values.

## Tests and gates (run locally on Windows with Node 24, in CI's order)

- **CI gates:** `npm ci` → `build:all` → react tests (274) → typecheck → performance → size → parity → contract → tokens → api (3 new reports; root report unchanged) → smoke. The smoke test checks the packed tarballs: `./markdown` with no peers installed, then `./rich-text` + `./emoji` with the exact declared peers, via ESM, CJS and tsc. All green.
- **a11y job:** `test:a11y`, 130 tests (5 skipped by design), including the new `tests/a11y/rich-text.spec.mjs`:
  - axe at rest, and with the picker, link dialog, suggestions and source mode open;
  - toolbar roving focus; input rules and `headingLevels`;
  - emoji picker and suggestion keyboard flows; reactions;
  - the viewer corpus; narrow screens; focus rings;
  - no request leaves the origin.
  
  The suite was stable across 5 repeated runs. Docs tests and `verify-components` also pass; `size:css` passes against the refreshed baseline.
- **Round trip:** byte-exact over a shared fixture corpus (ZWJ emoji, umlauts, `{{vars}}`, aligned tables, CRLF, reference definitions, raw HTML). Plus:
  - a whole-corpus invariant: editing any one block changes only that block;
  - a property test: text survives serialization in paragraphs, headings, quotes, lists, task lists and table cells (30k cases over 6 seeds).
- **Egress (jsdom):** `egress: RichTextEditor (full, comment, template) makes no network request and adds no remote resource`, `egress: EmojiPicker and ReactionBar load, search and pick without network access`, `egress: emojiImageBaseUrl only ever yields same-origin images`, `offline emoji list: the configured extension-emoji list contains no http string`.
- **Visual:** the Docker daemon was not running here, so the Linux goldens were not re-rendered. Instead, the 7 golden pages plus the prose and CRM pages were compared master against this branch, in light and dark, on this machine. They are pixel-identical, so the goldens should stand; CI's `visual` job is the confirmation.
- **Independent review:** a code review agent found 5 high and 3 medium issues, all fixed with regression tests: encoder edge cases, separators, lost reference definitions, viewer DoS bounds, `//host` links and the placeholder policy.

## Sign-off

- [x] Gates are green (`test:parity` + `test:contract`).
- [x] I have read the process below and this PR satisfies it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
