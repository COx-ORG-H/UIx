# @tensor_1/react

Thin React wrappers over the UIx v2 CSS component library — every component is driven by the [`@tensor_1/tokens`](https://www.npmjs.com/package/@tensor_1/tokens) `--uix-*` contract.

## Install

```sh
npm i @tensor_1/react @tensor_1/tokens
```
Peer deps: `react` / `react-dom` (`^18` or `^19`). Install `echarts` only when using a chart entry, and the Tiptap/`marked`/`emojibase-data` peers only for `./rich-text` and `./emoji` (see below).

## Use

Load the token CSS once (see [`@tensor_1/tokens`](https://www.npmjs.com/package/@tensor_1/tokens)), then import components:

```tsx
import { Button, Card } from "@tensor_1/react";

export default function Example() {
  return (
    <Card>
      <Button>Save</Button>
    </Card>
  );
}
```

Charts (ECharts) live behind a separate entry so they stay out of the main bundle:

```tsx
import { Chart } from "@tensor_1/react/chart";
```

For common line, bar, and pie charts, the tree-shaken preset avoids shipping the complete ECharts build:

```tsx
import { Chart } from "@tensor_1/react/chart/preset";
```

Both chart entries also export `ChartMetric`, `ChartLegend`, and `ChartLegendItem` for consistent analytical card
chrome. `Chart` supports `headerAction`, `footer`, `loading`, `empty`, and an accessible table equivalent. For
workflow surfaces, the main entry exports `Pipeline`/`PipelineStage` (compact or detailed operational rail) and
`Flow`/`FlowNode` (consumer-owned graph geometry with explicit text states).

Large fixed-height tables can use `useVirtualRows(rows, { rowHeight })`; attach its `containerRef` to
`TableWrap` and render the returned row window between spacer rows.

## Rich text, markdown and emoji

Three optional entries (RTE-01). None of them is imported by the root entry.

| Entry | Exports | Needs |
|---|---|---|
| `@tensor_1/react/markdown` | `Markdown`, `parseMarkdown`, `parseInline`, `plainText`, `defaultMarkdownIsSafeUrl` | nothing (server-component safe: no hooks, no `"use client"`) |
| `@tensor_1/react/rich-text` | `RichTextEditor`, `RichTextEditorFallback`, `roundTripMarkdown`, `DEFAULT_RICH_TEXT_LABELS`, `emojiImageFileName` | the optional peers below |
| `@tensor_1/react/emoji` | `EmojiPicker`, `ReactionBar`, `loadEmojiData`, `buildEmojiData`, `searchEmoji`, `canRenderEmoji`, `emojiImageFileName`, `normalizeEmojiImageBaseUrl` | `emojibase-data` (dynamic import on first open) |

Install the optional peers at exactly the versions `@tensor_1/react` declares (`npm view @tensor_1/react peerDependencies`):
`@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-list`,
`@tiptap/extension-table`, `@tiptap/extension-image`, `@tiptap/extension-emoji`, `@tiptap/extensions`,
`@tiptap/suggestion`, `marked`, `emojibase-data` — all MIT. Styles ship in `@tensor_1/tokens` (`.uix-rich-text`,
`.uix-prose`, `.uix-emoji-picker`, `.uix-reactions`); the editor injects no `<style>` at runtime.

```tsx
import { RichTextEditor } from "@tensor_1/react/rich-text";
import { Markdown } from "@tensor_1/react/markdown";

<RichTextEditor value={body} onChange={setBody} aria-labelledby="body-label" features="full" maxLength={20000} />;
<Markdown resolveImageSrc={(src) => (isOurImage(src) ? withBasePath(src) : null)}>{body}</Markdown>;
```

**Markdown is the stored format, and the editor never rewrites it silently.**
`onChange` fires only for user edits, never on mount or when `value` changes from outside. Blocks the user did not
touch keep their exact source bytes, including their spacing, list markers, table alignment, CRLF line endings,
`{{variables}}`, umlauts and emoji ZWJ sequences. Only edited blocks are re-serialized, and their text is escaped
only where a markdown reader would misread it (`Tom & Jerry` and `snake_case` stay as typed). Raw HTML is never
interpreted; it stays literal text. The one exception is `<br>`, which is read as a line break because GFM table cells have no other way to hold one. Gate your own content with the same pipeline, which runs without a DOM:

```ts
import { roundTripMarkdown } from "@tensor_1/react/rich-text";
for (const doc of corpus) expect(await roundTripMarkdown(doc.body)).toBe(doc.body);
```

Pass the markdown from `onChange` back as `value` in the same update, as React state does. The editor treats any
other `value` as an outside change and replaces its content.

Markdown cannot represent everything a user can type. When the editor re-serializes an edited block:

- Leading spaces on a line are dropped.
- Tabs in list items and table cells, and runs of spaces in table cells, become single spaces.
- A line break inside a checklist item is saved as a new paragraph of that item.
- Reference definitions (`[id]: url`) are kept. If their surrounding block is deleted, they move to the end.

Editor props: `features` (`full` / `comment` / `template`), `headingLevels` (limits the toolbar and input rules;
existing headings at other levels keep their level), `onUploadImage` (enables the image button and image paste/drop),
`isSafeUrl`, `resolveImageSrc` (its return value is used verbatim), `onSubmitShortcut` (Ctrl/Cmd+Enter), `emoji`,
`emojiImageBaseUrl`, `maxLength` (counter; over the limit sets `aria-invalid`), `placeholder`, `disabled`, `readOnly`,
`labels` (every string, placeholders `{count}` `{max}`), `emojiPickerLabels`, `emojiLocale`, `id`, `name` (adds a
hidden input), ARIA props, `variant` (`field` / `composer`, which renders in `Composer` with the toolbar in `ComposerBar`),
`toolbarEnd`, `minRows`, `className`, `onBlur`. Markdown shortcuts (`## `, `- `, `1. `, `[ ] `, `> `, triple backtick)
work in every preset; the toolbar is one tab stop with arrow-key navigation and scrolls sideways on narrow screens.
`RichTextEditorFallback` takes the same props and renders a plain textarea, for loading and error-boundary states.

**No network access.** The editor, picker and reaction bar make no requests. `@tiptap/extension-emoji` is configured
with a list stripped of its CDN `fallbackImage` URLs and GitHub image emoji (`forceFallbackImages: false`), and the
emoji dataset is a bundled dynamic-import chunk. A jsdom egress test guards this.

**Emoji fallback images (`emojiImageBaseUrl`).** Unset by default, which means native emoji only; UIx ships no image
set. On clients without a colour emoji font (VDI, thin clients), pass a same-origin folder (`"/static/emoji"` or
`"./emoji"`). Values with a scheme or `//` are ignored, with a development warning. Emoji the device cannot draw then
render as `<img class="uix-emoji-img" src="{base}/{file}" alt="{emoji}">`. `{file}` is every code point of the emoji
in lowercase hex, joined with `-`, keeping `fe0f` and `200d`:

| Emoji | File |
|---|---|
| 👍 | `1f44d.png` |
| ❤️ | `2764-fe0f.png` |
| 👩‍💻 | `1f469-200d-1f4bb.png` |
| 👍🏽 | `1f44d-1f3fd.png` |
| 🇩🇪 | `1f1e9-1f1ea.png` |

Image sets that drop `fe0f` from file names (Twemoji, for example) need copies under the full name.
`emojiImageFileName(emoji)` generates the mapping.

`EmojiPicker` (`onSelect`, `trigger`, `locale: 'en' | 'de'`, `labels`, `quickPicks`, `emojiImageBaseUrl`,
`loadData`) searches localized names, remembers recent picks in `localStorage` and loads its data on first open.
`ReactionBar` (`reactions`, `onToggle`, `disabled`, `quickPicks`, `labels`, `pickerLabels`, `locale`,
`emojiImageBaseUrl`) renders `aria-pressed` toggle chips named after the reactors (`{names} reacted with {emoji}`),
plus an add-reaction picker.

## UIX-V3 capability components

Phase 46.9 adds eleven controlled, domain-neutral components:

- Authoring: `RuleBuilder` and `BuilderCanvas`.
- Time: `SchedulingCalendar` and `DateRangePicker`.
- Relationships and review: `RelationshipGraph` and `MatchReview`.
- Configuration: `MetricInput`, `LicensePositionBar`, `BrandProfiles` (also
  `BrandProfileEditor`), `DiffViewer`, and `ColorPicker`.

Their serializable helpers are exported from the main entry as well: immutable
rule-tree operations, calendar/time-zone helpers, bounded graph layout and
traversal, three-way JSON diffing, metric parsing/stepping, color conversion and
contrast checks, plus brand-profile apply/restore helpers. No graph or date
runtime dependency is required.

### RelationshipGraph layouts

`RelationshipGraph` has two layouts:
- `radial` (the default): a small neighbourhood ringed around the selection.
- `layered` (ADR-0003): reads left to right by distance from `rootId`.

Layered mode draws shared nodes once, marks cycles, collapses leaf fan-outs into clusters and labels edges. It adds structural keyboard traversal (←/→ along edges, ↑/↓ in a column, Home, End), pan and Ctrl/⌘-wheel zoom.

```tsx
<RelationshipGraph
  layout="layered"
  rootId={root.id}
  nodes={nodes}            // { id, label, type?, description?, depth? }
  edges={edges}            // { id, source, target, type?, label?, arrow?, emphasis? }
  labels={translatedLabels} // Partial<RelationshipGraphLabels>
  renderNode={(node) => <MyNodeBody node={node} />}
  nodeAriaLabel={(node) => `${node.label}, ${riskText(node)}`}
  onSelect={openPeek}
  height="clamp(360px, 60vh, 640px)"
/>
```

Rules the component cannot enforce for you:

- **Whatever `renderNode` / `renderCluster` shows must also be in the accessible name.** Pass `nodeAriaLabel` whenever the node body carries meaning beyond `label`, `type` and `description`.
- **Keep the equivalent list.** `showList={false}` is allowed only when the same labelled region renders a complete equivalent: every node, its relations and its state.
- **Dimming is not a signal.** `dimmedNodeIds` must be accompanied by text that says what is dimmed and why.
- **Localise everything.** Every visible and announced string comes from `labels`; the English defaults live in `DEFAULT_RELATIONSHIP_GRAPH_LABELS`.

Radial mode still shortens long labels to fit its ring, but every node carries its full label in a `<title>`, and the `viewBox` grows to contain every node, including nodes you position yourself. Use `layout="layered"` when the labels matter more than the ring.

### Conversations, save feedback and kept tabs

- **`Comment variant="system"`** marks a product event, such as a status change, apart from people. It has no speech bubble and a `systemLabel` byline (default "System").
- **`Comment replyTo`** quotes the answered message above the body. Its label comes from `replyToLabel` (default "In reply to"). Mentions in a body use the `.uix-mention` class.
- **`SaveStatus`** shows `idle`, `saving`, `saved` or `failed` for inline edits and autosave. It offers `onRetry` when a save fails, and every string comes from `labels`. The status text sits in a polite live region that stays mounted while idle, so keep one `SaveStatus` mounted and change its `state`. Mounting it only when a save starts means the first announcement is lost.
- **`TabPanel keepMounted`** keeps an inactive panel in the DOM, `hidden` and out of the tab order, so switching back keeps its state and data. It is off by default.

```tsx
<Comment variant="system" systemLabel={t('system')} meta={ago}>{t('statusChanged', { to })}</Comment>
<Comment author={name} meta={ago} replyTo={<a href={`#c-${parent.id}`}>{parent.excerpt}</a>} replyToLabel={t('inReplyTo')}>
  {body}
</Comment>
<SaveStatus state={saveState} onRetry={save} labels={{ saving: t('saving'), saved: t('saved'), failed: t('saveFailed'), retry: t('retry') }} />
<TabPanel value="history" keepMounted>{history}</TabPanel>
```

### Scrolling tabs, toned stat tiles and copying

- **`Tabs overflow="scroll"`** keeps a long tab row on one line that scrolls sideways. The selected tab is always scrolled into view, and edge buttons appear only on the side that has hidden tabs. The buttons are pointer-only: keyboard users move with Arrow, Home and End. Combine it with `TabPanel keepMounted` on a record page with many sections.
- **`Stat tone`** (`warning`, `danger`) draws a toned outline and value; the label stays muted, so the tone never replaces words. `size="compact"` fits dense fact bands.
- **`Stat onActivate`** makes the whole tile a button that opens an editor (`aria-haspopup="dialog"`). Pass `activateLabel` (e.g. "change") so the name reads "Priority: P1, change", and `expanded` while the editor is open. The ref points at the button, for anchoring a popover.
- **`CopyButton`** copies `value`. Name it for what it copies (`label="Copy email"`), pass `copiedLabel`, and pass `failedLabel` so a refused copy is explained rather than silent.

```tsx
<Tabs value={tab} onChange={setTab} overflow="scroll">{tabs}</Tabs>
<Stat label={t('sla')} value={remaining} tone={breached ? 'danger' : 'neutral'} size="compact" />
<Stat ref={anchor} label={t('priority')} value="P1" onActivate={openEditor} activateLabel={t('change')} expanded={open} size="compact" />
<CopyButton value={email} label={t('copyEmail')} copiedLabel={t('copied')} failedLabel={t('copyFailed')} />
```

### DiffViewer words and control size

- **Every word is a label.** `labels` (a `Partial<DiffViewerLabels>`, English defaults in `DEFAULT_DIFF_VIEWER_LABELS`) covers the version names, group titles, the summary, the live progress text, and the action buttons.
- **Each action is named for its entry.** The visible words come from `acceptIncoming` / `keepCurrent` / `markPending`. The accessible names come from `acceptIncomingFor` / `keepCurrentFor` / `markPendingFor`, e.g. "Accept incoming for $.limit". Each entry's three buttons sit in a group named by `resolve`. When you translate a name, keep the visible word inside it, so people using speech input can say what they see (WCAG 2.5.3).
- **`controlSize`** sets the height of the action buttons and the entry rows. `sm` (the default) is the compact 28px kit size. `md` follows `--uix-control-h`, so a theme with 60px controls gets 60px actions. `lg` is 44px.

```tsx
<DiffViewer
  base={published} current={draft} incoming={remote}
  controlSize="md"
  labels={{
    acceptIncoming: t('acceptIncoming'), acceptIncomingFor: t('acceptIncomingFor'), // 'Prihvati dolazno za {path}'
    keepCurrent: t('keepCurrent'), keepCurrentFor: t('keepCurrentFor'),
    markPending: t('markPending'), markPendingFor: t('markPendingFor'),
    resolve: t('resolve'), /* …the rest of DiffViewerLabels */
  }}
  onResolutionChange={record}
/>
```

Ships **ESM + CJS + types**, with per-file `"use client"` so it's safe under React Server Components. Part of the **[UIx v2 styleguide](https://github.com/COx-ORG-H/UIx)**.
