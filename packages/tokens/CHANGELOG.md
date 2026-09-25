# @tensor_1/tokens

## 2.26.0

### Minor Changes

- 83c749b: Drawer closes on a backdrop click; images in the comment and template editor presets, and a notice where images aren't allowed (TENSOR HAR-547, HAR-749, HAR-770).

  - **Drawer closes on a backdrop click** (opt out with `dismissOnBackdrop={false}`). A click on the dimmed backdrop calls `onClose`, like Escape and the close button, so consumers need no change. Set `dismissOnBackdrop={false}` on a drawer that holds unsaved form input; Escape and the close button still close it. `Peek` already closed this way, and both now share one handler (`hooks/backdropDismiss.ts`): a click on the `<dialog>` itself outside its box counts, a click on its content never does, and a click that lands mid-close never re-fires `onClose`. A consumer `onClick` on either still runs first. On a phone, the browser's modal `max-width` leaves a 2em + 6px strip of backdrop (34 px at 320 px), and a tap on it closes the panel too.
  - **Images in every `RichTextEditor` preset.** `comment` and `template` now take pasted or dropped images, and show the toolbar image button, whenever `onUploadImage` is set, as `full` already did. Without `onUploadImage` nothing changes in the toolbar.
  - **`imagesUnavailableReason?: string`.** An image file pasted or dropped where images are off used to vanish silently. Now the editor inserts nothing and says why in its status line (`role="status"`): this text, or the new `imagesUnsupported` label ("Images can't be added here."). The notice clears on the next edit. A paste that also carries text (Excel, Word and Docs add a PNG rendering of what you copied) stays a text paste: no upload, no notice.
  - **Composer status row.** In `variant="composer"` a status message (uploading, failed, images off) takes its own row under the tools. Inline, it squeezed the toolbar to a sliver on a 320 px phone.
  - **`.uix-mark` (HAR-770).** It was reported as a phantom class. It is defined in `table.css` (since 2.5.0) and renders a themed tint in both themes. A new test now checks that every `uix-*` class a React component emits has a rule in `@tensor_1/tokens`, with deliberate hook classes listed by name and reason.
  - **Labels:** new `imagesUnsupported` in `RichTextLabels` (default above). Translate it with the others.
  - **Migration:** none. Every new prop is optional. A consumer with a drawer that must not close on a stray click sets `dismissOnBackdrop={false}`.

## 2.25.0

### Minor Changes

- 9001348: InfoTip: a small ? that explains a page, section or field, plus a `help` slot on PageHeader, Card, SectionHead and Field (HAR-737, for TENSOR's contextual help, HAR-736 / ADR-0226).

  - **`<InfoTip content label placement? />`.** `content` is plain text, never HTML, and blank lines become paragraphs. Empty or whitespace-only content renders nothing. `label` is the button's accessible name, e.g. "About: Incidents". The panel is a top-layer kit `Popover` (`popover="manual"`, so it never closes another open popover), at most about 360 px wide, and it is the button's `aria-describedby`.
  - **Behaviour.** Hover opens it after about 300 ms and it stays open while the pointer crosses into the panel. Keyboard focus opens it at once, and a click or tap keeps it open. Esc closes it and keeps focus on the ?. It does not close an enclosing dialog. A press outside also closes it.
  - **The ?** is a fixed 9 px filled glyph (Material Symbols `question_mark`, Apache-2.0), with no circle, the same size next to any text. It sits superscript at the top right of the title or label: its top is 0.2em above the cap line (`vertical-align: calc(1cap + 0.2em - 9px)`). Muted at rest, it turns the primary-button blue (`--uix-accent`) on hover and while open, with a 25 px hit area. The brief asked for a 16 px button with a 12 px `CircleHelp`. The operator replaced that during review because the ringed glyph was unreadable and read as part of the word.
  - **`help?: string | null` + `helpLabel?: string`** on `PageHeader` (after the title), `Card` and `SectionHead` (after the title) and `Field` (after the label, before the required marker). The ? always sits beside the heading or `<label>`, never inside it. A heading keeps its title as its name, and a Field label's control stays the input (a button inside a label becomes its activation target, TENSOR HAR-743). With `help`, Field draws the required marker as `.uix-field__required` after the ?. `helpLabel` defaults to `"About: <title>"` in English, so pass a translated one. The four components stay server-renderable: the slot helpers live outside the `"use client"` InfoTip module.
  - **CSS:** new `info-tip.css` (`.uix-info-tip`, `__button`, `__panel`) and row classes `.uix-page-header__title-row`, `.uix-card__title-row`, `.uix-section-head__title-row`, `.uix-field__label-row` and `.uix-field__required`. Markup without `help` is unchanged.
  - **Migration:** none. Every new prop is optional.

- fe4905d: SearchSuggest and `.uix-arrival`: "search and jump", the pattern behind Windows and Android Settings search (TENSOR HAR-763, for per-setting settings search).

  - **`<SearchSuggest>`** is a search field with a result list underneath. Each row shows:
    - a **title**, with the matched letters in bold;
    - a **breadcrumb** (`meta`), where the middle crumbs truncate first so the outermost and innermost stay readable, and the full path is in the row's `title`;
    - up to two lines of **context** (`description`).
  - **Keyboard and screen readers.** It follows the ARIA combobox pattern: focus stays in the field and `aria-activedescendant` names the active row.
    - ↑/↓ wrap. Home/End jump once a row is active.
    - Enter opens the active row, or the first row when none is active.
    - Escape closes the list, and a second Escape clears the text.
    - Each row is named "title, crumb › crumb" and described by its context.
    - An Enter or arrow key that belongs to an IME composition is left alone, and after Escape closes the list, Enter does not open a row the user can no longer see.
  - **Optional slots:**
    - `heading` + `headingAction`, e.g. "Recently opened · Clear";
    - `footer`, a last row reachable by the arrow keys, e.g. "Show all 23 results";
    - `loading`, with a spinner in the field and the list;
    - `empty` and `error` states;
    - `status`, a polite live region, e.g. "8 results";
    - `shortcutHint`, a `/` badge in the empty field;
    - a clear button;
    - `size="lg"` for page-level search;
    - `strategy="fixed"`, which floats the list on the viewport so a clipping toolbar or header (`overflow: hidden`) cannot cut it off; it follows the field and flips above it when there is no room below;
    - `inputRef`, to focus the field from a shortcut;
    - controlled `open`.
  - **Matching.** `searchSegments(text, query)` and `foldForSearch(text)` fold case, diacritics and ß, so "ubersicht" marks "Übersicht" and "strasse" marks "Straße". The whole query is marked where it occurs; otherwise each word is marked where it starts a word. The consumer still decides which rows match.
  - **`.uix-arrival`** is the "you are here" highlight for the element a link or result landed on. It tints the target for about 2.4 s and fades out. Under `prefers-reduced-motion` or forced colours it becomes a steady outline for 2 s. It sets `scroll-margin-block`, so a sticky header doesn't cover the target.
  - **Tests:**
    - `search-suggest-dom.test.mjs` covers the ARIA contract and keyboard model;
    - `search-suggest-model.test.mjs` covers match folding;
    - `tests/a11y/search-suggest.spec.mjs` runs in the browser, in both themes:
      - axe on results, the recent list, loading and error;
      - the opaque popup surface;
      - middle-first truncation at 280 px;
      - the 2-line clamp;
      - the keyboard journey to a landed target;
      - the reduced-motion arrival.
  - **Migration:** none. Both are new.

## 2.24.0

### Minor Changes

- 746cb14: DiffViewer: each action is named for the entry it resolves, and a `controlSize` option (for the MOTUS programme conflict comparison, EPE-07).

  - **Each action is named for its entry.** New `DiffViewerLabels` templates `acceptIncomingFor`, `keepCurrentFor` and `markPendingFor` (English defaults "Accept incoming for {path}", "Keep current for {path}", "Mark pending for {path}") become the buttons' accessible names. Before, every entry's buttons were all called "Accept incoming", so a screen reader could not tell which entry a button resolved. The visible words still come from `acceptIncoming` / `keepCurrent` / `markPending`. When you translate a name, keep the visible word inside it (WCAG 2.5.3).
  - **The action row and the summary are real groups.** They now have `role="group"`, so their existing `resolve` / `summary` labels are announced. Before, the `aria-label` sat on a plain `div`, where it is not allowed.
  - **`controlSize`** (`sm` default · `md` · `lg`) sets the height of the action buttons and the entry disclosure rows. `md` follows `--uix-control-h`, so a theme with 60px controls gets 60px actions. `lg` is 44px. The root carries `data-control-size`, and `diff-viewer.css` sizes the rows from it.
  - **Migration:** the buttons' accessible names now end with the entry path, so a test that finds them by their exact old name ("Accept incoming") must match "Accept incoming for $.path" instead, or match as a substring. The visible text has not changed.

- a1f1cbc: ViewMenu: its own surface, and column rows you can reorder (TENSOR HAR-666, the columns-menu half of the saved-views work). SavedViewMenu: a pointer drag now lands where you drop it.

  - **Own surface.** `.uix-view-menu` now draws its own background, border, radius and shadow, and scrolls at `min(60vh, 480px)` with `overscroll-behavior: contain`. It stays opaque inside an overlay shell that adds no chrome (TENSOR's `AnchoredOverlay` showed the table through it). Inside a `.uix-popover` it drops its own border and shadow, so there is no double frame. Section titles (`.uix-view-menu__label`) are sticky.
  - **Column rows: grip · checkbox · name · ⋯.** Hover paints the whole row, and long names truncate. `ViewMenuColumn.required` shows the name without a checkbox, in the checkbox's slot, with a tooltip. `textLabel` supplies the plain-text name for the accessible names when `label` is a node.
  - **`onReorder(orderedIds)`** gets every column id, first to last, and turns on reordering. The grip drags a row. The ⋯ menu offers Move up, Move down and Hide or Show, and it is the keyboard path, so the grip stays out of the tab order (the arrow keys still move it once it has been clicked). The ⋯ menu is an APG menu button on a top-layer `Popover`, so the scrolling panel never clips it. Escape closes only the menu and returns focus to its button. After a move, focus stays on the moved row, and a polite status announces the new position.
  - **Grip and ⋯ idle at 75%**, the same floor as SavedViewMenu. The HAR-666 brief asked for 45%, but that value measured below WCAG 1.4.11's 3:1 for the muted grip (see 2.23.0). The browser spec now measures both icons at rest in both themes.
  - **New optional props:** `columnLabels` (`rowActions`, `reorder`, `moveUp`, `moveDown`, `hide`, `show`, `required`, `moved`; English defaults; `{label}` / `{position}` / `{count}` templates), `displayLabel` (title over zebra/freeze), `footer` (e.g. Reset sort), and `className`. The density props are now optional, and the density section renders only when `densityOptions` and `onDensityChange` are given.
  - **SavedViewMenu drag fix.** Dragging a row down could stall after the first step, or land one slot past the pointer. React moves the dragged row's DOM node as the list reorders live, which drops pointer capture, and the drop index counted the dragged row itself. Both menus now follow the drag on the window and count only the other rows.
  - **Migration:** none needed for existing `ViewMenu` usage. A column list with `onReorder` renders more controls per row. `.uix-view-menu__cols` is a `ul` in the React component, and it no longer has its own 180px scroll area, because the panel scrolls instead.

## 2.23.0

### Minor Changes

- fa31f1f: `SavedViewMenu` takes on the saved-views row design from TENSOR's list toolbar (TENSOR PR #1995).

  - **Titled sections.** New `sections` prop (`SavedViewSection[]`: `id`, `label`, `items`), used instead of `items`. Each section renders under a `.uix-menu__label` title inside the same `.uix-menu`, for example your own views above the presets. Empty sections are hidden, and `emptyLabel` shows only when every section is empty. The flat `items` form still works as before.
  - **Row anatomy: grip · name · overflow.** The `actions` slot is now wrapped in `.uix-saved-views__actions` as the row's overflow slot. Names truncate, and a string name also gets a tooltip.
  - **Selection and hover cover the whole row.** The selected row (`active`) gets `data-active` and an accent tint (`--uix-brand-muted`) across grip, name and overflow, and its name button carries `aria-current`. There is no check glyph. Hover also covers the whole row, and the name no longer paints its own grey. In forced-colors mode, the selected row gets a `SelectedItem` outline.
  - **Quiet affordances.** The grip and the overflow slot are dimmed to 75% opacity until the row is hovered or has focus, a drag is under way, or the overflow trigger reports `aria-expanded="true"`. The dimming is deliberate, and the idle value still meets WCAG 1.4.11 3:1 non-text contrast on both themes (grip 3.19:1 light, 4.45:1 dark).
  - **Scrolling panel.** `.uix-saved-views` is capped at `min(60vh, 440px)` height and 400 px width, and it scrolls. Section labels stay pinned (`position: sticky`) while you scroll.
  - **Reorder within a section.** Pass `onReorder(orderedIds, sectionId)` with `reorderLabel` to add a drag grip to every row. You can drag the grip with a pointer, or focus it and press ArrowUp/ArrowDown. A row never leaves its section. The callback receives that section's full id order and its id (`undefined` in the flat form). It fires once per keyboard move and once per drop, and not at all for a drop that doesn't change the order. The new order shows straight away until the consumer's persisted order arrives.

  Persistence, permissions (which actions a row's overflow menu offers) and every label stay with the consumer.

## 2.22.0

### Minor Changes

- 7d2221d: Rendering fixes found in the docs explorer, plus larger avatar sizes.

  - `.uix-metric-input`: the control row is pinned to `--uix-control-h`, so the stacked +/− steps split the input height instead of making the unit and step columns 3 px taller than the input.
  - `.uix-relationship-graph__node`: selected, highlighted and conflicted fills are now opaque (`color-mix` over `--uix-surface`). The old translucent tints let edges, which run to node centres, cross through the node label.
  - `.uix-stepper`: `width: fit-content`, so a stepper no longer stretches to full width inside a column flex or grid container.
  - `.uix-brand-profiles`: form tracks can shrink (`minmax(0,1fr)`), and the native file input is capped at its container. Before this, the input's ~360 px intrinsic width pushed the form underneath the preview card.
  - New `.uix-avatar--xl` (64 px) and `.uix-avatar--2xl` (96 px) sizes with a proportionally larger status dot. React `Avatar` `size` accepts `'xl' | '2xl'`.

## 2.21.0

### Minor Changes

- 5551372: TENSOR deep-pass fixes (RX-125): translatable words everywhere, dark-mode elevation, and interaction fixes for trees, tabs, record pages and the date picker.

  - **Every component's words are translatable.** Accessible names and visible text that were English literals now come from props with English defaults: `closeLabel` (Drawer, Peek), `previousLabel` / `nextLabel` (Peek), `dismissLabel` (Toast), `regionLabel` (Toaster), `skipToContentLabel` / `exitFocusLabel` (AppShell), `onlineLabel` (Avatar), `inputLabel` (CommandPalette), `listLabel` (InboxList), `label` / `selectedLabel` (BulkBar), `expandLabel` / `collapseLabel` (ExpandToggle), `toneLabels` (Meter), `trendLabels` (Stat), and a `labels` object on Pagination, Chart, DateRangePicker, BuilderCanvas, RuleBuilder, MatchReview, DiffViewer, SchedulingCalendar, ColorPicker and BrandProfileEditor (each with an exported `DEFAULT_*_LABELS`). Plural announcements have `…One` / `…Many` templates with `{count}` placeholders. `scripts/literal-a11y-text.mjs` (run by the React tests) fails on any new literal.
  - **Chart loading text** is a real child (`ChartLabels.loading`) instead of CSS `content:`, so it can be translated and is announced inside the busy region.
  - **Dark elevation.** `--uix-shadow-sm/-md/-popover/-overlay` have dark values (a stronger drop plus the top highlight); a light-mode 6% shadow was invisible on dark surfaces. New `--uix-shadow-md`, which the interactive card's hover already used.
  - **Loading buttons** keep a visible ring on every variant (secondary, outline and ghost rendered blank).
  - **Tables are no longer capped at 460px** by default. Opt back in with `.uix-table-wrap--scroll` (`--uix-table-max-height`).
  - **Tree:** the indent stops growing past level 4 and labels wrap to two lines; the chevron is its own button, so a selectable tree selects on a row click and toggles only from the chevron (`toggleOnRowClick` restores the old behaviour, and stays the default for pure navigation trees).
  - **Tabs `activation="manual"`:** arrow keys move focus and Enter/Space selects. `"automatic"` stays the default.
  - **DetailPage `renderLink` / `onTabSelect`:** render the back link and tabs through your router's link, or handle tab selection without navigating (`href` stays the fallback).
  - **DateRangePicker** weekday headers follow `locale` (the grid stays Monday-first).
  - **RelationshipGraph:** each legend type draws its own chart colour, and radial edges of that type draw it too.
  - **Flow** branch / loop / mind-map canvases keep a 640px minimum inside the scrolling panel on narrow screens; the **pipeline** stage bar draws the border its active state colours.

## 2.20.0

### Minor Changes

- fbd452a: Operator primitives: tabs that scroll, toned and interactive stat tiles, and a copy button.

  - **`Tabs overflow="scroll"`** keeps one row that scrolls sideways, keeps the selected tab in view, and shows pointer-only edge buttons only on the side with hidden tabs. Works together with `TabPanel keepMounted`. Long or translated tab labels now wrap to two lines at a 16rem cap instead of stretching the row (all tab variants).
  - **`Stat`** gains `tone` (`neutral` | `warning` | `danger`: a toned outline and value, never a toned label), `size="compact"` for dense fact bands, and `onActivate` / `activateLabel` / `expanded`, which make the whole tile a button that opens an editor, named "label: value, action". `Stat` now forwards its ref.
  - **`CopyButton`** copies a value, confirms with a check and a polite "copied" announcement, and announces `failedLabel` when the copy is refused. `copyText` is the clipboard helper behind it; it never throws.
  - New tokens `--uix-warning-border` and `--uix-danger-border` for outlined toned containers (3:1 non-text contrast on surfaces in both themes).

## 2.19.2

### Patch Changes

- 2f6e67a: `.uix-segmented` fits its container when rendered on a `<fieldset>` (WCAG 1.4.10 reflow; TENSOR worklog composer).

  - **`.uix-segmented`** now sets `min-inline-size: 0` and `max-inline-size: 100%`. A fieldset defaults to `min-inline-size: min-content`, so an audience toggle on one could never be narrower than its longest words side by side and ran ~8 px past `.uix-composer` at 320 px (400 % zoom). On a `<div>` nothing changes.
  - **`.uix-segmented__option`** may now shrink and wrap: `white-space: normal` and `overflow-wrap: anywhere`. A label breaks onto a second line inside its option instead of clipping. At desktop widths nothing moves.
  - Consumers that rendered the toggle on a fieldset can drop any inline `minWidth: 0` or `maxWidth` workaround.

## 2.19.1

### Patch Changes

- 601d975: Bar-shaped footers wrap at 320 px instead of pushing their last control out of the box (WCAG 1.4.10 reflow; TENSOR PR #1780).

  - **`.uix-composer__bar`** now sets `flex-wrap: wrap` and a `row-gap` of `--uix-space-2`. The column gap is unchanged. An audience toggle (`.uix-segmented`) at the start and the submit button at the end now stack on two rows in a narrow container. Before, the submit button was pushed outside the card.
  - **`.uix-dialog__footer`** and **`.uix-card__footer`** wrap the same way. A tertiary action or meta text next to two buttons no longer clips at 320 px.
  - **Consumers can drop inline `flexWrap: 'wrap'` overrides** on these bars, such as the one in TENSOR `packages/shared/ui/src/worklog-feed.tsx`. An inline `justify-content: space-between` still works: the groups sit at both ends on one row and stack when they do not fit.
  - The rich-text `composer` variant keeps its toolbar row on one line. Its toolbar already scrolls sideways on narrow screens, so it opts out of the wrap.
  - Layer order and `--uix-accent-fg` are unchanged. At desktop widths nothing moves: the visual goldens are unchanged.

## 2.19.0

### Minor Changes

- 4c0a8ef: Calm links, a phone-fitting portal grid, kept tab panels, a RelationshipGraph that fits its content, comment variants and a SaveStatus indicator (TENSOR remediation RX-20..RX-23).

  - **Links no longer underline on hover unless they are content links.** The base layer dropped its blanket `a:hover` underline. Classless links in text keep their persistent underline (WCAG 1.4.1). Buttons and tabs rendered as `<a>` stop underlining under the pointer. Opt-in hover underlines (`.uix-link--quiet`, title slots, `.uix-btn--link`) are unchanged. If a product relied on the base hover underline for a class-bearing link inside running text, give that link a visible cue of its own.
  - **`.uix-cell-link`:** a table link that is quiet at rest as well as on hover. It keeps the row's text colour, never underlines, and keeps the focus ring. Use it on framework `<Link className>` anchors in table cells.
  - **`.uix-id-cell__btn`** keeps the row's text colour on hover instead of turning accent blue.
  - **`.uix-shortcut-grid`** fits its container (`auto-fit`, `minmax(min(100%, 12rem), 1fr)`) and lets labels wrap, so it no longer scrolls sideways at 320 px. Desktop column counts now follow the available width instead of a fixed four.
  - **`TabPanel keepMounted`** keeps an inactive panel mounted, `hidden` and out of the tab order. It is off by default.
  - **`RelationshipGraph` (radial):** every node carries its full label in `<title>`, and the `viewBox` grows to contain every node, including consumer-positioned ones.
  - **`Comment`:** `variant="system"` with `systemLabel`, and a `replyTo` quote with `replyToLabel`.
  - **`SaveStatus`:** `idle` / `saving` / `saved` / `failed`, with `onRetry` and translatable `labels`. The text sits in a polite live region that stays mounted in every state. New CSS module `components/save-status.css`.

- e409ef2: Rich-text authoring, a markdown viewer and emoji reactions (RTE-01), as three optional entries. The root entry imports none of them.

  - **`@tensor_1/react/rich-text`:** `RichTextEditor` and `RichTextEditorFallback` on Tiptap 3.31.3.
    - Markdown in, markdown out. `onChange` fires only for user edits.
    - Untouched blocks keep their exact source bytes, CRLF and `{{variables}}` included. Only edited blocks are re-serialized.
    - Raw HTML stays literal text, except `<br>`, which is a line break (GFM table cells need it). Link and image policies come from `isSafeUrl` and `resolveImageSrc`.
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
  - **Default link rule** (viewer and editor, used when no `isSafeUrl` is passed): http(s), mailto and same-app paths only. It refuses `//host`, backslashes and control characters. The viewer also bounds nesting and bracket scans, so hostile input cannot stall a server render.
  - **Known markdown limits**, documented in the README: edited lines lose leading spaces; tabs and space runs in list items and table cells become single spaces; a line break inside a checklist item is saved as a new paragraph of that item.
  - **Styles:** `.uix-rich-text` (new module), prose rules for tables, code blocks, rules, images and task lists, and the full `.uix-emoji-picker` and reaction focus/disabled states. Existing `--uix-*` tokens only; light and dark.

  Optional peer dependencies, all exact pins and all MIT:

  - `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-list`, `@tiptap/extension-table`, `@tiptap/extension-image`, `@tiptap/extension-emoji`, `@tiptap/extensions` and `@tiptap/suggestion`, all 3.31.3.
  - `marked` 17.0.6 and `emojibase-data` 17.0.0.

  Their installed dependencies are also all MIT (prosemirror-_, linkifyjs, emoji-regex, emojibase, is-emoji-supported, @floating-ui/_, fast-equals, use-sync-external-store); `is-emoji-supported` 0.0.5 ships no LICENSE file. `dist/` bundles none of this code. `@tensor_1/react` itself is `UNLICENSED` and ships no LICENSE file.

## 2.18.0

### Minor Changes

- 9fdf28a: `RelationshipGraph` gains an opt-in `layout="layered"` mode (ADR-0003), with no new dependency and no token change.
  - **Layout:** columns by distance from `rootId` (or a supplied `node.depth`), each node drawn once, lateral and cycle edges classified and marked, and leaf fan-outs collapsed into expandable clusters (`clusterThreshold`, `expandedClusterIds`, `onToggleCluster`).
  - **Rendering:** crossing-reduced ordering, edge labels (`edgeLabels`, `edge.emphasis`), arrowheads that can point back along the real relationship (`edge.arrow`), and HTML node buttons with `renderNode` / `renderCluster` slots and a full `nodeAriaLabel`.
  - **Interaction:** pan (drag, pinch, buttons), Ctrl/⌘-wheel zoom, Fit and Reset, structural arrow-key traversal, and controllable focus (`focusId`, `onFocusChange`). `dimmedNodeIds`, `height` and `showList` are also new.
  - **Localisation:** every string in both modes is now localisable through `labels` (`RelationshipGraphLabels`, `DEFAULT_RELATIONSHIP_GRAPH_LABELS`). The English defaults are unchanged.
  - **Model exports:** `layoutLayeredGraph`, `classifyLayeredEdges`, `layeredNeighbor` and `clusterIdFor`.

## 2.17.0

### Minor Changes

- Remediate every S1–S4 finding from the 2026-07 in-depth accessibility audit. Sortable headers are real buttons, the rich select and CommandPalette follow the APG combobox pattern with `aria-activedescendant`, Inbox is a keyboard listbox, and rail-mode nav items keep their accessible names. React: named dialogs with `h2` titles and attribute pass-through, `useDialog(open, onClose?)` releases the scroll lock on a native Esc, WCAG 1.4.13 tooltips, Toast announcer and focus hand-off, a complete Tabs pattern with the new `TabPanel` export, virtual-Tree focus lifecycle and typeahead, Kanban Alt+Arrow moves, Field auto label association, non-hard-disabled loading buttons, a live-region and naming pass over the feedback family, and a skip link in AppShell. Tokens/CSS: a `forced-colors.css` layer for Windows High Contrast, a global `[hidden]` guard, focus-visible reveals for hover-revealed controls, 24px minimum targets, and the type scale moved from px to rem. Two new automated gates scan overlays in their OPEN state and assert keyboard operability.
- 8322a79: `.uix-table`: body-row links stay calm, and the row hover eases in.

  - Links in `tbody` no longer underline or turn link-coloured on hover or keyboard focus. They keep the row's `--uix-text` colour, and the row tint is the cue. This covers plain anchors and class-bearing ones, such as a framework `<Link className>`, which the base layer's `a:hover { text-decoration: underline }` used to reach. Anchors styled with `.uix-btn` are unchanged, and the global `:focus-visible` ring still shows. The quiet-link registry (`link.css`) no longer underlines table body links on hover. Its data-cell hover underline now applies only to `thead`/`tfoot` cells and `.uix-dl dd`.
  - `.uix-table tbody tr` and `.uix-table--pinned-col tbody tr td:first-child` now fade their background over `--uix-dur-fast` / `--uix-ease-out`. Under `prefers-reduced-motion: reduce` there is no transition.
  - The tables guide has a new "Row links" specimen under _Row styles & dividers_, and a Playwright check covers it in light and dark.

  **TENSOR follow-up:** after TENSOR moves to this version, it can delete its HAR-133 override block in `apps/web/app/globals.css` (TENSOR PR #1878). This release ships the same behaviour.

## 2.16.0

### Minor Changes

- a9832e5: Add `--uix-accent-text`, the brand hue as text on neutral or `--uix-brand-muted` surfaces, and use it for the selected filter chip (`.uix-chip[data-on]`).

  The selected chip used the solid accent as its text colour on a tint of that same accent. That measured 3.21:1 in dark mode, and below 3:1 in light mode for the POSx and mission-control brands. `--uix-accent-text` darkens the live accent in light mode and lightens it in dark mode, so it follows any brand override. The worst shipped theme now measures 5.48:1. The chip also gets its own `:focus-visible` ring, matching buttons and cards, so the ring shows even when a consumer does not load the base stylesheet.

  A new `npm run test:tokens` gate computes this contrast for every theme in both modes.

- 3bd1562: Add detailed operational pipeline and flow components, richer analytical chart chrome, explicit chart states, and Mission Control-oriented workflow/chart examples.

## 2.15.0

### Minor Changes

- af365d6: Promote reusable product patterns into UIx: Breadcrumbs, Combobox, RelativeTime, rich states, CardLink, DetailPage, related/settings compositions, generic dialogs, async-operation status, and controlled table view/filter/saved-view controls. Deepen Sidebar and NavGroup with complete rail styling, controlled disclosure, and focus restoration.

## 2.14.2

### Patch Changes

- Align the linked token and React package versions for exact-version consumers.

## 2.14.0

### Minor Changes

- 9ddd973: Add Mission Control Project Hub heat, absence, and dark-only aura roles.

## 2.13.0

### Minor Changes

- 6c119f3: Add the complete Phase 46.9 UIX-V3 component set: rule and canvas authoring,
  scheduling and date ranges, relationship graph and match review, metric and
  license controls, brand profiles, three-way diffs, and an accessible color
  picker. The release includes token-only component CSS, React 18/19 wrappers,
  serializable model helpers, deterministic examples, and accessibility coverage.

### Patch Changes

- 0f676da: `.uix-searchbar`: centre the well and its button and lift the button to the well's 44px height, so the two edges line up at every width (previously the 36px button sat top-aligned, 8px short of the input). README: document the `@layer` order a Tailwind consumer must declare when importing `bundle`/`styles`, so the UIx element reset cannot sit above Tailwind's utilities.

## 2.12.0

### Minor Changes

- 0450b44: Improve table and chart runtime performance, add opt-in row virtualization and a lean chart preset, ship minified CSS with selective component exports, and defer styleguide chart loading.

## 2.11.0

### Minor Changes

- Republish of the platform-wide quiet-link registry, which never reached npm under 2.10.0.

  **No source change from what master already carried.** This release exists because `2.10.0` was claimed twice. The a11y remediation branch (`fix/a11y-remediation-2026-07`, gitHead `6dbc192`) published `2.10.0` to npm on 2026-07-30; the quiet-link work landed on master the next day and its release commit stamped `2.10.0` a second time. Tagging `v2.10.0` then ran the Release workflow, which reported success while publishing nothing — `changeset publish` skips a package whose version already exists on the registry:

  ```
  🦋  warn @tensor_1/tokens is not being published because version 2.10.0 is already published on npm
  🦋  warn No unpublished projects to publish
  ```

  So npm's `2.10.0` is the accessibility release, and every consumer that bumped to it got the a11y remediation with the narrow 2.9.0-era link registry. The platform-wide registry — the title/name slots, `.uix-dl dd` data cells, and the container anchors — ships here, in `2.11.0`. Read the `2.10.0` CHANGELOG entry below for the full registry; it describes this code, just under a version number that never carried it.

  Consumers on `2.10.0` need only bump; there is nothing to migrate.

## 2.10.0

> **Never published under this version.** npm's `2.10.0` is the accessibility remediation release, published from `fix/a11y-remediation-2026-07` before this work landed on master. The changes described below shipped in `2.11.0`.

### Minor Changes

- 52cfd0c: Quiet links, platform-wide: the pattern shipped in 2.9.0 for the editorial-home title slots and table cells now covers the rest of the kit's container-affordance contexts. `link.css` grows a documented registry in four forms — **title/name slots** (adds `.uix-featured__title`, `.uix-rail-card__title`, `.uix-status-row__name`, `.uix-card__title`, `.uix-list__title`, `.uix-inbox__subject`, `.uix-kanban__card-title`, `.uix-media__name`, `.uix-attachment__name`, `.uix-contact__name`, `.uix-user-chip__name`, `.uix-audit__actor`, now scoped `a:not(.uix-btn)` so a button-styled anchor in a title keeps its treatment); **data cells** (adds `.uix-dl dd` alongside `.uix-table td`, both `:not([class])`); **container anchors** — when the anchor _is_ the kit block (`<a class="uix-card">`, `.uix-stat`, `.uix-list__item`, `.uix-inbox__item`, `.uix-kanban__card`, `.uix-notif`, `.uix-media`, `.uix-attachment`, `.uix-contact`, `.uix-cmdk__item`, `.uix-content-list__item`, `.uix-event-row`, `.uix-status-row`), which previously let the base `a { color }` tint every word in the block brand-blue; and the unchanged `.uix-link--quiet` opt-in utility. Container anchors take the standard `--uix-bg-hover` row tint on hover/focus rather than an underline, which would strike through the whole block, and the three that declare no display of their own (`.uix-card`, `.uix-stat`, `.uix-kanban__card`) are laid out as blocks. `.uix-comment__author` is deliberately excluded — a byline reads "Author · 22m ago", so the name is a phrase inside a text run rather than the whole block; opt in with `.uix-link--quiet`.

  Prose and message bodies (`.uix-prose`, `.uix-note`, notice copy, `.uix-timeline__body`, `.uix-audit__detail`, notification copy) and `.uix-alert` / `.uix-toast` / `.uix-peek__title` are deliberately excluded and documented as such — links there sit inside sentences (WCAG 1.4.1) or the colour is the only affordance. `.uix-breadcrumbs a` and `.uix-section-link`, already quiet by their own design, gain `:focus-visible` parity with their hover state. React wrappers are unchanged; `quiet-link.test.mjs` locks the registry from both ends — the wrappers must nest the anchor inside the slot-classed element, and every asserted slot must still appear in `link.css`.

## 2.9.0

### Minor Changes

- 00f0720: Quiet links (INTRA-04 follow-up): new `styles/components/link.css` ships the first-class quiet-link pattern for anchors whose container is the affordance. Anchors in the editorial-home title slots (`.uix-content-list__title a`, `.uix-news-lead__title a`, `.uix-rundown__item-title a`, `.uix-event-row__title a`) and classless `.uix-table td` anchors now inherit the surrounding text colour with no underline at rest (underline returns on hover/focus); `.uix-link--quiet` is the opt-in utility for hand-composed block links. In-text links inside prose keep the base `--uix-link` blue + persistent underline (WCAG 1.4.1 / link-in-text-block). Consumers carrying app-level overrides for these slots (e.g. TENSOR's globals.css "Quiet links" block) can delete them and point bespoke `.link-quiet` sites at `.uix-link--quiet`. React wrappers are unchanged (title slots already accept anchors); render tests lock the anchor-inside-title-slot nesting the CSS scoping depends on.

## 2.8.0

### Minor Changes

- **Editorial-home kit (INTRA-04)** — the intranet "editorial" landing patterns, ported 1:1 from the approved TENSOR intranet prototype (`Docs/prototypes/intranet-reimagined/mockups.css` + `editorial.html`) so the TENSOR Editorial home can be built entirely from UIx components.

  Tokens/CSS — new `styles/components/editorial-home.css` (registered in `components.css` and `main.css`), all `uix-`-prefixed:

  - **Page intro** — `.uix-page-intro` grid, `.uix-page-kicker` / `.uix-page-title` / `.uix-page-lede`, `.uix-intro-search__label`, `.uix-searchbar(__wrap)` with the leading-icon search input, and the full-width `.uix-shortcut-grid`.
  - **Notice queue** — `.uix-notice(__copy/__content/__meta/__actions/__position)` rotating-updates banner, with `.uix-notice__arrow--previous` flipping the previous-arrow icon.
  - **Featured briefing** — ONE `.uix-featured` card whose stage and rundown are internal zones split by a hairline: `.uix-featured(__stage/__visual/__content/__eyebrow/__title/__description/__meta/__now)`, the `.uix-story-signal(__value/__label)` hero numeral, `.uix-story-diagram(__bar)`, and the `.uix-rundown` story list (`__head/__eyebrow/__title/__items/__item[data-selected]/__number/__topic/__item-title`). The selected item grows a caret that breaks the divider toward the stage, and its number renders as a filled ordinal chip mirrored by `.uix-featured__now` in the stage eyebrow — the chip pairing carries the selection link at every breakpoint (the caret flips upward when the card stacks at 920px and turns off in the 620px vertical stack).
  - **Sections & grids** — `.uix-section-head` / `.uix-section-title` / `.uix-section-link`, `.uix-content-grid(--balanced)`, `.uix-rail` / `.uix-rail-card(__title/__meta)`, `.uix-resource-grid`.
  - **Content** — `.uix-news-lead(__meta/__title/__summary)`, `.uix-list-meta`, `.uix-content-list(__item/__title/__meta)`, `.uix-stat-line(__item/__value/__label)`, `.uix-event-row(__title/__meta)` + `.uix-event-date(__month/__day)`, `.uix-status-row(__name)`.
  - The prototype's **920px / 620px responsive rules** are ported with the components (single-column restacks, rundown re-orientation, stat-line flex rows, search-bar stack, story-signal step-down).

  Porting notes: spacing/type values are snapped to the `--uix-*` scales per the contract gate (check C); the genuinely off-scale editorial display sizes (the two fluid title ramps, the 48px story-signal numeral, 18px editorial card headings, the 20px stat numeral) and the 42px search-icon clearance are justified in `tests/raw-value-allowlist.json`.

  React — new presentational, router-free wrappers in `EditorialHome.tsx`, all exported with prop types: `PageIntro`, `SectionHead`, `NoticeQueue`, `FeaturedStage`, `FeaturedRundown` + `FeaturedRundownItem` (selection via `aria-pressed` + `[data-selected]`; `FeaturedStage` takes an `ordinal` prop rendered as the `.uix-featured__now` chip), `NewsLead`, `ContentList` + `ContentListItem`, `ResourceGrid`, `StatLine`, `EventRow`, `StatusRow`. Content, navigation, and behaviour stay with the consumer through `ReactNode` slots and standard DOM handlers; the notice copy and featured-stage content are `aria-live="polite"` regions so queue rotation / story swaps are announced.

  Styleguide: new **Editorial home** section demonstrates the whole kit. Coverage: `Docs/component-roadmap.md` gains the EditorialHome row (Beta).

## 2.7.0

### Minor Changes

- a76bdd1: **UIX-FIX-02 — anchored overlays get viewport-collision handling and render in the top layer.**

  Popover, the rich Select/menu, and Tooltip positioned themselves with CSS anchor positioning (`anchor()` / `position-anchor` / `anchor-size()`), which is Chromium-only: off-Chromium the overlay fell back to the UA-centered position and detached from its trigger, and even in Chromium there was no flip/shift so overlays clipped at the viewport edge. The CSS-only Tooltip (`[data-uix-tip]`) was also clipped by any `overflow: hidden/scroll` ancestor.

  New, framework-agnostic positioning:

  - **`computePosition(anchor, floating, viewport, options)`** (exported) — pure, dependency-free flip (opposite side when the preferred one won't fit) + shift (slide along the cross axis to stay on-screen). Unit-tested across every side/align, both flip directions, both shift edges, and oversized/degenerate inputs.
  - **`useAnchoredPosition(anchor, floatingRef, { open, placement, offset, padding })`** (exported hook) — measures both elements with `getBoundingClientRect`, applies `position: fixed` + left/top, and keeps the overlay glued to its anchor on scroll/resize.

  Component changes:

  - **`Popover`** gains optional `anchor`, `placement`, and `offset` props. With `anchor` set it is placed with cross-browser JS positioning while the native Popover API still provides the top layer (escapes `overflow` clipping) and light-dismiss. Without `anchor` it behaves exactly as before.
  - **`Tooltip`** now renders its bubble in the top layer via the Popover API, so it is never clipped by an `overflow` ancestor. Positioned with flip/shift, shown on hover and keyboard focus, dismissed on blur/Escape, and wired with `role="tooltip"` + `aria-describedby`. Its public props (`label`, children) are unchanged; a `placement` prop was added.

  Tokens/CSS: adds `.uix-tooltip` / `.uix-tooltip__bubble` (top-layer bubble); the legacy `[data-uix-tip]` CSS tooltip is retained for back-compat but is superseded. The styleguide (`guide/app.js`) now positions all `.uix-popover` overlays and upgrades `[data-uix-tip]` tooltips through the same engine, so the vanilla and React layers behave identically.

  Migration: `Popover`/`Tooltip` props are additive. If you targeted the old React `Tooltip`'s `[data-uix-tip]` output in your own CSS, switch to the `label` prop (the bubble is now `.uix-tooltip__bubble`).

- aee4265: **UIX-FIX-04 — accessibility wiring for Field, Tree, and Toast.**

  - **Field** — the error/hint/success message is now wired to the control with `aria-describedby` (so assistive tech announces it) and `aria-invalid` on error; the error carries `role="alert"` so it's announced the moment it appears. A `.uix-field__msg` slot with a reserved single-line `min-height` means an appearing error no longer shifts the layout. The React `Field` clones a single child control to attach the wiring, preserving any existing `aria-describedby`.
  - **Tree** — rebuilt on the WAI-ARIA tree pattern. `role="tree"` / `role="treeitem"` / `role="group"`, `aria-level`, and `aria-expanded` / `aria-selected` now live on the treeitem `<li>` — `aria-selected` was previously (invalidly) on a `<button>`. The treeitem is the focusable element with a **roving tabindex** and full keyboard support (Up/Down, Left/Right to collapse/expand or move to parent/child, Home/End, Enter/Space to select). `.uix-tree__row` is now a presentational span.
  - **Toast** — error/destructive toasts announce **assertively** (`role="alert"`, `aria-live="assertive"`); everything else stays polite (`role="status"`). The `Toaster` container is no longer a live region, so toasts are announced once instead of twice (it previously nested a live region inside a live region).

  Verified with the repo's axe-core gate (`tests/a11y`, both themes, no serious/critical violations) plus keyboard-interaction checks.

  Migration: component APIs are unchanged. Two DOM/CSS-contract notes for consumers who hand-author markup rather than using the components — (1) the `Tree`'s expand/select ARIA moved from the row to the treeitem `<li>`, and the child list is now `.uix-tree__group[role="group"]`; (2) the `Field` message now lives in a `.uix-field__msg` wrapper. Consumers using `<Tree>` / `<Field>` need no changes.

## 2.6.0

### Minor Changes

- d289d0f: Table system v2 + width/focus app-shell.

  **Tokens & CSS (`@tensor_1/tokens`)**

  - **app-shell**: three-tier nav — `data-nav="full | rail | hidden"` — plus an immersive **focus mode** (`data-focus` hides the sidebar _and_ the topbar so a wide grid uses the whole frame) and an opt-in **full-bleed** main (`.uix-shell__main--bleed`). `data-collapsed` is kept as a back-compat alias for the rail. New `--uix-sidebar-w-rail` token so the rail width is contractual (was hard-coded 56px).
  - **table**: the full interaction layer, promoted from the styleguide into the shipped contract and fully tokenized — selection column + contextual **bulk-action bar** (`.uix-bulkbar`), row hover **actions/kebab** (`.uix-rowact`), **expandable** inline rows (`.uix-table__expand` + detail row), **inline cell edit** (`.uix-cell-edit`), column **resize** grip (`.uix-table__resize`), multi-sort ordinals, **search** match highlight (`.uix-mark`), the **cell vocabulary** (`.uix-cell-strong` / `-sub` / `-mono`), the **responsive ladder** (priority-column drop + card transform) and the **compare** view.

  **React (`@tensor_1/react`)**

  - **AppShell**: `nav` / `focus` / `onExitFocus` / `mainBleed` props (with Esc-to-exit for focus mode). `collapsed` still works.
  - **Table**: new subcomponents `BulkBar`, `RowActions`, `RowAction`, `ExpandToggle`, `CellStrong`, `CellSub`, `Mark`, `Highlighted`; `Table` gains `fixed`; `Th` gains `sortOrder`.
  - **Table engine**: a new framework-agnostic, dependency-free module exported from the package root — `multiSort`, `toggleSort`, `applyFilters`, `searchRows`, `highlightSegments`, `serializeView` / `parseView`, `virtualWindow`, `reorder`, and selection helpers (`toggleId`, `selectAllState`, `togglePage`, `mergePinned`). Unit-tested.
  - **useTable**: a hook composing the engine into React sort / filter / search / selection / pinning / saved-view state.

## 2.5.0

### Minor Changes

- Add a reusable **table column-sizing + cell-behaviour** system so consumers (Tensor, POSx, SHOPx) size and truncate table columns by applying a class keyed to a column — never by hand-coding per-app pixel widths or `:nth-child` hacks.

  New `--uix-col-*` width scale in `tokens/base/size.json`: `--uix-col-w-xs` 92 / `-sm` 112 / `-md` 132 / `-lg` 176 / `-xl` 240, plus `--uix-col-title-min` 340 (the floor for the primary/title column).

  New classes in `styles/components/table.css`: `.uix-table--fixed` (opt into fixed layout so widths are authoritative and truncation is reliable); `.uix-col--w-xs … --w-xl` (width tiers — apply to `<col>`, `<th>`, or `<td>`); `.uix-col--flex` / `.uix-col--primary` (fills remaining space with a `--uix-col-title-min` floor); `.uix-col--truncate` / `.uix-col--wrap` (one-line-with-ellipsis vs multi-line); and `.uix-col--num` (tabular figures + right-align).

  The `.uix-id-cell__btn` / `.uix-id-cell__arrow` row click-through pattern moved from `peek.css` into `table.css` so table cells are one story. This generalises and removes the `[data-uix-table-v2] .uix-table td:nth-child(2)` 280px title cap.

## 2.3.0

### Minor Changes

- Add `--uix-amber` / `--uix-amber-text` — the SEV-3 (medium) severity tone that completes the ramp (danger = SEV-1, warning = SEV-2, amber = SEV-3). Light `#C98A1E` / `#795006`, dark `#E6B25C`. A muted ochre kept distinct from the brighter `--uix-warning` so the three severity tiers read apart.

## 2.2.0

### Minor Changes

- Add `DescriptionList` / `DescriptionItem` — a controlled key-value body primitive (the `uix-dl` grid) for detail surfaces like the side-peek drawer. UIx owns the layout; consumers supply the formatted values.

  Add typography utility classes (`.uix-text-display` / `-h1` / `-h2` / `-h3` / `-body` / `-body-hushed` / `-meta` / `-eyebrow` / `-data-hero`) and elevation utilities (`.uix-elevated` / `-popover` / `-pill`). These let consumers apply the `--uix-text-*` scale and `--uix-shadow-*` elevation by class instead of re-deriving them inline — the migration target for house products replacing bespoke `type-*` / `surface-*` classes.

  Scope the `uix.base` margin reset to typographic/form elements instead of a bare `* { margin: 0 }`. The universal form sits above a Tailwind consumer's `utilities` layer and silently zeroed every margin utility (`mb-2`, `mt-4`, `space-y-*`) on layout elements. Dialogs (`uix-dialog`/`uix-drawer`/`uix-peek`/`uix-lightbox`) already set their own margins, so centering is unaffected.
