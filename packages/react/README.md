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
existing headings at other levels keep their level), `onUploadImage` (enables the image button and image paste/drop in
every preset), `imagesUnavailableReason` (status-line text when an image is pasted or dropped while images are off;
default label `imagesUnsupported`, "Images can't be added here."; a paste that also carries text stays a text paste),
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

### Drawer closes on a backdrop click

`Drawer` closes on a click on the dimmed backdrop, as well as on Escape and its close button, and calls the same
`onClose` (TENSOR HAR-547). `Peek` already did; both now share one handler. On a drawer that holds unsaved form input,
pass `dismissOnBackdrop={false}` so a stray click can't discard it; Escape and the close button still close. On a
phone the panel stops 2em + 6px short of the left edge (the browser's modal-dialog `max-width`), and a tap on that
strip closes it too.

```tsx
<Drawer open={open} onClose={close} title="Edit user" dismissOnBackdrop={!dirty}>…</Drawer>
```

### InfoTip and `help` slots

A small ? next to a title or label opens a plain-text explanation. Use it for what a page, section or field *means*. Keep instructions the user needs while typing ("8+ characters", "ISO date") visible in `hint`.

```tsx
<PageHeader title={t('incidents')} help={t('incidents.help')} helpLabel={t('aboutIncidents')} />
<Card title="Open work" titleAs="h2" help={help.openWork}>…</Card>
<SectionHead title="Latest news" help={help.news} />
<Field label="Impact" required help={help.impact}><Input /></Field>
<InfoTip content={text} label="About: Impact" />
```

- **`help?: string | null`** on `PageHeader`, `Card`, `SectionHead` and `Field`. Empty, whitespace-only or `null` renders nothing, so pass the resolved string without a guard. Blank lines become paragraphs. The text is always plain, never HTML.
- **`helpLabel`** is the ? button's accessible name. It defaults to `"About: <title>"` (English), so pass a translated one.
- **Placement:** the ? is a fixed 9 px glyph, superscript at the top right of the title or label, whatever the text size. It sits beside the heading or `<label>`, never inside it, so the heading's name stays the title and clicking a field label still focuses the input.
- **Behaviour:** hover opens it after about 300 ms, keyboard focus opens it at once, and a click or tap keeps it open. Esc closes it and keeps focus on the ?, and a press outside also closes it. The panel is the button's `aria-describedby`, so screen readers announce it on focus. It uses `popover="manual"`, so it never closes another open popover.

### Small gaps from the UIx reuse audits (2.27.0)

TENSOR and MOTUS were hand-building these because the kit lacked them (workspace ADR-0038; UIx HAR-1346). Every
addition is optional; existing calls render as before.

```tsx
// One link adapter for every component that renders a link
const toRoute = (p: UixLinkProps) => <NextLink {...p} />;
<ButtonLink href="/tickets/new" variant="primary" renderLink={toRoute}>New ticket</ButtonLink>
<Button size="xs" icon aria-label="Remove row"><XIcon /></Button>           // 24 px, the WCAG 2.5.8 floor
<Stat label="Open" value={12} href="/incidents?state=open" current renderLink={toRoute} />
<Stat label="Status" value="New" onActivate={openMenu} haspopup="menu" />
<Pagination page={page} pageCount={9} hrefFor={(p) => `/katalog?page=${p}`} />          // server-safe links
<Pagination mode="cursor" hasPrevious={!!before} hasNext={!!after} onFirst={first} onPrevious={prev} onNext={next} summary="21–40" />

// SchedulingCalendar: week start, product date format, busy days, a per-day badge
<SchedulingCalendar weekStartsOn={0} formatDate={(d, part) => part === 'day' ? toDDMMYYYY(d) : intl(d, part)}
  maxEntriesPerDay={3} onShowMore={(date, entries) => openDay(date)}
  renderDayBadge={(date, entries) => collisions(entries) || null} … />

// Overlays and disclosure
<Drawer side="start" …/>  <Drawer side="bottom" …/>
<Tooltip content={<ul><li>Angry 2</li><li>Calm 5</li></ul>}><button>Mood</button></Tooltip>
<CollapsibleSection title="SLA" lazy persistKey="incident-sla" openRequest={jumpToSla}>…</CollapsibleSection>
<ConfirmDialog … destructive typeToConfirm="web-01" compensation="Restore it from the archive within 30 days."
  error={failure} tertiaryLabel="Archive instead" onTertiary={archive}><dl>…</dl></ConfirmDialog>
<Popconfirm open={asking} anchor={buttonRef} title="Unlink this CI?" … />

// New components
<Menu trigger={<Button>Actions</Button>}>
  <MenuItem onSelect={assign} shortcut={<KbdCombo keys={['Mod', 'M']} />}>Assign to me</MenuItem>
  <MenuSeparator />
  <MenuGroup label="Danger zone"><MenuItem tone="danger" onSelect={remove}>Delete</MenuItem></MenuGroup>
</Menu>
<ChipGroup label="Active filters">
  <Chip pressed={mine} onPressedChange={setMine}>Assigned to me</Chip>
  <Chip count={12} onRemove={clearState}>State: Open</Chip>
  <Chip variant="add" onClick={addFilter}>+ Add filter</Chip>
</ChipGroup>
<Steps label="Intake"><Step title="Scan" state="complete" /><Step title="Review" state="current" /><Step title="Shelve" state="waiting" /></Steps>

// Translate kit chrome once
<UixLabelsProvider labels={{ drawer: { close: 'Schließen' }, peek: { previous: 'Vorheriger Datensatz' } }}>…</UixLabelsProvider>
```

- **`renderLink`** (`UixRenderLink`) receives `UixLinkProps` (`href`, `className`, `children`, ARIA). A nullish return falls back to a plain `<a>`.
- **`UixLabelsProvider`** reaches the client components (`Modal`, `Drawer`, `Peek`, `Toast`, `Toaster`, `AppShell`, `Sidebar`, `SearchSuggest`, `CommandPalette`, `ConfirmDialog`, `Popconfirm`, `SchedulingCalendar`, `DateRangePicker`). `Pagination` and `BulkBar` stay server-renderable, so they cannot read context: pass `labels={useUixLabels().pagination}` from a client parent, or translate on the server. An explicit prop always wins.
- **`CollapsibleSection`** stays a JS-free `<details>` unless you pass `lazy`, `persistKey` or `openRequest`. `lazy` unmounts a closed body; `lazy="keep"` keeps it after the first open.
- **`ConfirmDialog`** focuses the type-to-confirm field, else Cancel when `destructive`. `Popconfirm` is for low-risk, easily undone actions; use `ConfirmDialog` for anything hard to undo.
- **`KbdCombo`** renders the non-Apple glyphs on the server and switches to ⌘/⇧/⌥ after mount, so hydration matches. Pass `platform` to pin it.

### Imperative toasts (2.28.0)

`toast()` queues a toast from anywhere on the client (a mutation hook, a tRPC error handler); every mounted
`<Toaster />` renders the queue (UIx HAR-1363; replaces `sonner` in TENSOR and MOTUS).

```tsx
<Toaster position="bottom-end" limit={3} />                       // once, in the app shell

toast.success('Saved', { description: 'Change CHG-1042 updated.' });
toast.error('Could not save', { action: { label: 'Copy details', onClick: copy } });   // stays until dismissed
toast.warning('Export is taking longer than usual');
const id = toast.loading('Exporting…'); toast.update(id, { kind: 'success', message: 'Exported' });
toast.promise(save(), { loading: 'Saving…', success: 'Saved', error: (e) => `Failed: ${message(e)}` });
toast.undoable('Ticket closed', { onUndo: reopen, onCommit: close });   // TENSOR C2 useUndoableAction
toast.dismiss(id);   // or toast.dismiss() for all
```

- **Timing:** success, info and default toasts stay 5 s, warnings 8 s; errors and loading toasts stay until dismissed or updated. Pass `duration` (ms, or `null`) to override. Timers pause while the pointer or focus is inside the toaster and while the tab is hidden.
- **Stacking:** at most `limit` toasts show (default 3). The rest wait their turn. Reusing an `id` replaces a toast in place.
- **Accessibility:** errors are `role="alert"`. Everything else is announced through the toaster's polite live region, and a loading toast that settles is announced again. Esc closes the focused toast. Tone glyphs are decorative; the text carries the meaning.
- **Stores:** `toast` writes to a default store that `<Toaster />` reads. `createToastApi(createToastStore())` gives a separate queue (tests, embedded apps); pass its `store` to `<Toaster store>`. The store has no React dependency.
- `<Toaster>` still renders hand-managed `<Toast>` children first. `Toast` gains `tone="warning"` and an `action` slot.
### Icons (`@tensor_1/react/icons`)

The UIx icon set (HAR-996): 233 glyphs drawn in `currentColor` at the `--uix-icon-*` sizes. Icons come only from UIx
(workspace ADR-0038); no product adds an icon library. The glyphs are Lucide's (ISC); the licence travels in
`THIRD_PARTY_NOTICES.md`. Import the CSS once: `@tensor_1/tokens/components/icon` (also in the bundle).

```tsx
import { ShieldCheckIcon, TriangleAlertIcon, Icon } from '@tensor_1/react/icons';
import type { UixIcon, IconName } from '@tensor_1/react/icons';

<ShieldCheckIcon />                                   // decorative: aria-hidden, 20 px (md)
<ShieldCheckIcon size="sm" tone="success" label="Verified" />   // role="img" with a name
<Button icon aria-label="Delete"><Trash2Icon /></Button>         // the button carries the name
<Icon name={entityIconName} />                          // chosen at run time (loads the whole set)
const icons: Record<EntityType, UixIcon> = { incident: SirenIcon, change: GitBranchIcon };
```

- **Migrating from `lucide-react`:** import from `@tensor_1/react/icons` and add `Icon` to the name: `ShieldCheck` → `ShieldCheckIcon`. The older Lucide names the products use are kept as aliases (`AlertTriangleIcon`, `CheckCircle2Icon`, `Loader2Icon`, …). `etc/icon-names.json` maps every Lucide name to its UIx component and glyph, for a codemod. `LucideIcon` becomes `UixIcon`.
- **Size:** `sm` 16 px, `md` 20 px (default), `lg` 24 px, or any CSS length or pixel number. A product sizing class (a Tailwind `size-4`) wins over the default.
- **Tone:** `current` (default, inherits the text colour), `muted`, `accent`, `success`, `warning`, `danger`, `info`.
- **Accessibility:** decorative unless `label` is set. Never let an icon carry meaning alone; pair it with text.
- **Bundle size:** each `<Name>Icon` is tree-shaken; one icon adds well under 3 KB minified. `<Icon name>` and `ICON_GLYPHS` load all of them.
- **A glyph is missing?** Add its Lucide name to `scripts/icon-names.txt`, run `node scripts/generate-icons.mjs <lucide-react dir>` and release. Do not paste an SVG into a product.
### SchedulingTimeline

Lanes of bars on a time axis (HAR-1364; TENSOR's change day/week timeline, rollout Gantt rows and licence-renewal
markers). It pairs with `SchedulingCalendar`: same entry states, the same explicit time zone.

```tsx
<SchedulingTimeline
  lanes={[{ id: 'net', label: 'Network', meta: '3 changes' }]}
  items={changes.map((c) => ({ id: c.id, laneId: c.team, title: c.title, start: c.start, end: c.end, state: c.state }))}
  range={{ start: weekStart, end: weekEnd }} scale="day" timeZone={tz} now={nowIso}
  overlays={[{ id: 'q4', kind: 'freeze', label: 'Q4 freeze', start, end }]}
  markers={[{ id: 'r1', label: 'Renewal: Fortinet', at, laneId: 'net' }]}
  onSelectItem={(item) => openChange(item.id)}
  onMoveItem={(id, { start, end }) => reschedule(id, start, end)}
/>
```

- **Axis:** `scale` is `hour`, `day` (default), `week` or `month`. Ticks fall on wall-clock boundaries in `timeZone` (DST and half-hour zones included). `tickWidth` sets the width of one unit; the axis scrolls inside the component and the lane column stays put.
- **Bars:** overlapping bars in a lane stack and are hatched (`data-conflict`), so an overlap reads without colour. A bar cut off by the range shows a dashed edge. `renderItem` replaces the bar text. The full title is in the name and the `title` tooltip.
- **Moving:** with `onMoveItem`, bars move by drag or Shift+←/→ and their end changes with Alt+Shift+←/→. Moves snap to `step` (15 min on an hour axis, 1 h on a day axis, 1 day otherwise), and each move is announced. `movable: false` pins a bar. The component never moves a bar itself; it reports the new start and end and renders what you pass back.
- **Keyboard:** one tab stop. ←/→ go to the previous or next bar in a lane, ↑/↓ to the nearest bar in the next lane, Home/End to the lane's ends, and Enter selects.
- **Windows and markers:** `overlays` (`freeze`, `maintenance`, `blackout`; all lanes, or one with `laneId`), `markers` (a point in time) and `now` are drawn behind the bars and listed for screen readers.
- Pure helpers are exported for tests and server code: `timelineTicks`, `placeSpan`, `layoutLane`, `shiftSpan`, `snapToStep`, `pixelsToMs`, `defaultTimelineStep`.

### Calendar model (zoned days, hour slots, lanes)

Pure functions for calendar geometry in one explicit IANA display zone (HAR-1504). They use only
`Intl.DateTimeFormat`, never the process time zone, and never a fixed day length: DST days have 23 or 25
hours. Every interval is half-open, `[start, end)`.

```ts
zonedDayBounds('2026-10-25', 'Europe/Berlin');   // { start: 2026-10-24T22:00Z, end: 2026-10-25T23:00Z } (25 h)
zonedHourSlots('2026-10-25', 'Europe/Berlin');   // 25 slots; '02' twice, offsetLabel '+02:00' then '+01:00'
zonedHourSlots('2026-03-29', 'Europe/Berlin');   // 23 slots; no '02'
addZonedDays('2026-10-24T20:00Z', 1, 'Europe/Berlin');  // { instant: 2026-10-25T21:00Z, adjusted: null }
addZonedDays('2026-03-28T01:30Z', 1, 'Europe/Berlin');  // 03:30 local, adjusted: 'gap_forward'
zonedDaySpan('2026-10-10T22:00Z', '2026-10-11T22:00Z', 'Europe/Berlin'); // { start: '2026-10-11', end: '2026-10-12' }
enumerateDateKeys({ start: '2026-10-11', end: '2026-10-12' });            // { dates: ['2026-10-11'], truncated: false }
```

- **Days:** `zonedDayBounds(dateKey, tz)` is the day's first instant and the next day's first instant, so the end of
  one day is the start of the next. A day whose midnight is skipped starts at its first existing instant (01:00).
- **Hour slots:** `zonedHourSlots(dateKey, tz)` gives one `{ instant, label, offsetLabel }` per real hour start.
  `label` is the local hour (`'00'`–`'23'`); `offsetLabel` (`'+02:00'`) is set on both occurrences of a repeated
  hour and is `null` otherwise.
- **"+1 day":** `addZonedDays(instant, n, tz)` keeps the wall-clock time. A repeated wall time keeps the source's
  offset; a skipped one moves forward once and returns `adjusted: 'gap_forward'`, so the caller can announce it.
- **Day membership:** `zonedDaySpan(start, end, tz)` returns the days an entry touches as `[start, end)` date keys;
  an entry ending at local 00:00 does not touch the next day. It throws a `RangeError` when `end` is not after
  `start` and never swaps. `enumerateDateKeys(span, { limit })` lists them (default limit 370, `Infinity` for none)
  and returns `truncated: true` instead of stopping silently.
- **Lanes:** `packLanes(intervals, maxLanes, { order })` assigns first-fit lanes; overlapping intervals never share a
  lane, touching ones may. Intervals that do not fit get `lane: null`, and each overlap cluster reports its
  `laneCount` and `overflow`. `order: 'start'` (default) is greedy by start, then end, then id; `order: 'given'`
  packs in input order, so a consumer's ranking decides who gets a lane.
- **Top-N:** `rankOverflow(items, compare, n)` is a stable sort and cut: `{ visible, hidden }`. `hidden` counts only
  what it was given; show the consumer's own total when it has one.
- **Formatters:** `cachedDateTimeFormat(locale, options)` returns one shared `Intl.DateTimeFormat` per locale and
  options shape. The model formats through it, so a 2,100-entry month builds at most a handful of formatters.
- **Deprecated:** `zonedDateSpan` (end-inclusive, swaps inverted ends) and `enumerateDateSpan` (stops silently at
  370) are unchanged in 2.x. Use `zonedDaySpan` and `enumerateDateKeys`.

### FilterEditor (typed column filters)

`FilterEditor` is the content of one column-filter popover with a typed value (HAR-1365; TENSOR's
`table-filter-editor.tsx`, MOTUS's "+ filter"). `summarizeFilter` turns the applied value into the chip text.
`FilterPopover` stays for the single-string case.

```tsx
const field: FilterField = { id: 'state', label: t('state'), kind: 'enum', options: states };
<Popover anchor={chipRef} popover="manual">
  <FilterEditor field={field} value={draft} onValueChange={setDraft} onApply={() => apply(field.id, draft)} onClear={() => clear(field.id)} />
</Popover>
<Chip onClick={edit} onRemove={remove}>{summarizeFilter(field, applied, { formatDate: formatDisplayDate })}</Chip>
```

| `kind` | Value | Editor |
|---|---|---|
| `enum` | `{ values: string[] }` | checkboxes; a diacritic-insensitive search above more than `searchThreshold` (8) options; Select all / Clear selection |
| `text` | `{ operator, text }` | condition (`contains`, `not-contains`, `is`, `is-not`, `starts-with`) + text; Enter applies |
| `number` | `{ operator, value, to? }` | condition (`eq`…`gte`, `between`) + value(s), optional `unit` |
| `date-range` | `{ from?, to? }` | two date fields that bound each other |
| `boolean` | `{ value?: boolean }` | Any / Yes / No (`trueLabel`, `falseLabel`) |
| `reference` | `{ values: { value, label }[] }` | `onSearch(query)` → records, debounced (`searchDelay`), with loading, empty and error (retry) states; chosen records as removable chips |

`isFilterEmpty`, `emptyFilterValue`, the operator lists and all words (`labels`) are exported, and the value is plain
data for your own query string. Stale search results are ignored.

**Presets (enum, HAR-1505).** `field.presets` names selections the product defines, e.g. a default scope. They
render as toggle `Chip`s (`aria-pressed`) in a labelled group above the search box and options. Activating one
replaces the selection with its `values`; the preset whose values equal the selection (as a set) is pressed, so
ticking another option un-presses it. `summarizeFilter` then returns the preset's label (the `preset` summary
label, default `'{label}'`; use `'{field}: {label}'` to keep the column name), and `matchFilterPreset(field, value)`
returns the matching preset for your own use. The group's name is `labels.presets` (default "Presets").

```tsx
const state: FilterField = {
  id: 'state', label: t('state'), kind: 'enum', options: states,
  presets: [
    { id: 'open', label: t('openWork'), values: ['new', 'open', 'pending'] },
    { id: 'all', label: t('all'), values: states.map((s) => s.value) },
  ],
};
```

Every `FilterEditor` word can also come from `<UixLabelsProvider labels={{ filterEditor: { … } }}>`; an
explicit `labels` prop still wins.
### EntityPicker

A form field that holds one record found by an async search (HAR-1366; TENSOR's `entity-picker.tsx` and its
person, incident and CI pickers; MOTUS's author filter). Built on `SearchSuggest`.

```tsx
<Field label={t('assignee')} htmlFor="assignee" hint={t('assigneeHint')}>
  <EntityPicker id="assignee" name="assignee_id" label={t('assignee')} value={assignee} onValueChange={setAssignee}
    onSearch={(q) => api.people.search(q)} labels={{ none: t('choosePerson') }} />
</Field>
```

- **Chosen:** the record shows in the field (title plus its last breadcrumb, or `renderValue`), with a × named "Clear {title}". Choosing the field again opens a fresh search; Escape with an empty query returns to the record.
- **Searching:** debounced (`delay`, 250 ms) from `minQueryLength` (0) characters, with loading, empty and error states. **Retry is a list row**, so arrow keys reach it. Stale results are ignored. Focus returns to the field after a choice.
- **Forms:** `name` posts the chosen id in a hidden input; `id` and the `Field` hint and error wire to the active control. `SearchSuggest` gains `inputId` and `inputDescribedBy` for the same purpose.

### Lightbox

A full-screen media viewer (HAR-1367; TENSOR's capture viewer, MOTUS's programme gallery and photo zoom).

```tsx
<Lightbox items={photos.map((p) => ({ src: p.url, alt: p.alt, caption: p.caption, width: p.w, height: p.h }))}
  index={index} onIndexChange={setIndex} open={open} onClose={() => setOpen(false)} />
```

- **Moving:** previous/next buttons, ←/→, Home/End and a swipe on touch (`loop` wraps). An announced "{index} of {total}" counter and the caption sit under the media.
- **Size:** "Show actual size" switches between fitted and natural size; the stage scrolls when zoomed.
- **Video:** `kind: 'video'` renders a native player, which keeps its own arrow keys.
- **Dialog:** native `<dialog>`. Focus starts on Close, Escape and a backdrop click close it, and focus returns to the opener. Every word is in `labels`.
- **Image size:** pass `width` and `height` so an SVG or a slow image keeps its box.

### FileUpload and Attachment

`FileUpload` is a drop zone, file picker and upload list (HAR-984; TENSOR's attachment panel, MOTUS's photo intake). `Attachment` is a row for a file that is already stored (HAR-985).

```tsx
<FileUpload items={uploads} accept=".pdf,image/*" maxSize={20_000_000} maxFiles={10}
  hint="PDF or photos, up to 20 MB"
  onFilesAdded={(accepted) => accepted.forEach(startUpload)}
  onRetry={retryUpload} onRemove={removeUpload} />

<AttachmentList label={`Attachments (${files.length})`}>
  {files.map((f) => (
    <Attachment key={f.id} name={f.name} size={f.size} type={f.type} href={f.url} download
      meta={`${f.addedBy} · ${f.addedAt}`} onRemove={() => confirmRemove(f)} />
  ))}
</AttachmentList>
```

- **The product uploads.** `onFilesAdded(accepted, rejected)` gets the files that passed `accept`, `maxSize` and `maxFiles` (counting `items`). Report progress, success and failure back through `items` (`status`, `progress`, `error`). Rejected files are listed in an alert, one sentence each.
- **Keyboard:** "Choose files" is a real button, described by the `hint`. Dropping is an extra, not the only way in. `capture` opens the camera on phones.
- **List:** each file shows its size and status. Uploads show a progress bar (indeterminate without `progress`), and failures show the reason and a Retry button. `previewUrl` shows a thumbnail, and `onAltChange` asks for alt text on images.
- **Attachment:** the name is the link (`href`, `download`, `renderLink`). It has a quieter `meta` line, a `state` slot (e.g. a "Scanning" `StatusPill`), `actions`, `onRemove`, and `status` `loading` | `error` | `forbidden` (no link, and the reason shown). It's server-renderable.
- Pure helpers: `formatFileSize`, `fileMatchesAccept`, `partitionFiles`, `fileKind`.

### TextDiff

A two-way diff of two texts (HAR-1368; TENSOR's knowledge-article version diff). `DiffViewer` stays the three-way configuration diff.

```tsx
<TextDiff before={v3.body} after={v4.body} beforeLabel={t('version', { n: 3 })} afterLabel={t('version', { n: 4 })}
  label={t('bodyChanges')} context={3} />
<TextDiff before={v3.title} after={v4.title} granularity="word" label={t('titleChanges')} />
```

- **Lines** (`granularity="line"`, the default): a Myers diff. Removed and added lines are paired with their closest counterpart, so a renumbered list still lines up, and only the changed words are marked inside a pair.
- **Words** (`granularity="word"`): prose compared as one flow. Changed words across a space join into one change.
- **Views:** `split` (the default) puts the versions side by side and stacks below about 36rem of container width. `unified` interleaves them.
- **Not colour alone:** changes are `<del>` / `<ins>`, with a −/+ sign and a spoken "Removed:" / "Added:" (`labels`). Struck and underlined words mark changes inside a line.
- **Long texts:** `context` keeps that many unchanged lines around each change. Longer runs fold behind "Show n unchanged lines", and focus moves to the first revealed line. Over `maxTokens` (20 000) a note replaces the diff. Past `maxEdits` (2 000) the changed middle shows as one replacement instead of stalling.
- Pure model for tests and servers: `diffText`, `diffTokens`, `textDiffRows`, `tokenizeText`.

### Select draws its own list

`Select` (HAR-1572) no longer opens the browser's dropdown. It is the WAI-ARIA select-only combobox: a `<button role="combobox">` trigger and a UIx-drawn listbox in the top layer (a bottom sheet on phones). The props did not change, so existing call sites keep working:

```tsx
<Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
  <option value="" disabled hidden>Choose a status</option>
  <optgroup label="Active">{active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
</Select>
<Select options={teams} value={team} onValueChange={(v) => setTeam(v as string)} searchable="auto" placeholder={t('team')} />
<Select multiple name="labels" options={labels} defaultValue={['network']} />
<Select loadOptions={(q, signal) => api.owners(q, { signal })} searchable options={[owner]} value={owner.value} />
```

- **Forms:** a visually hidden `<select data-uix-select-proxy>` holds `name`, `required`, `form`, `multiple` and the value. `ref` points at it, so `FormData`, `form.reset()`, autofill, react-hook-form `register` and `Controller` work as before. `onChange(e)` gets `e.target.value`, and a failed `required` focuses the trigger.
- **Keyboard:** ↑ ↓ Home End PageUp PageDown and typing move (repeat one letter to cycle). Enter, Space, Tab and Alt+↑ choose. Escape closes and keeps the value. With `multiple`, Space toggles and Delete clears.
- Plain Select for up to about 12 options, `searchable` for longer lists, `EntityPicker` or `SearchSuggest` for records.
