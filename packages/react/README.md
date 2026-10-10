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
### SchedulingCalendar

A month, week or agenda of UTC ranges in one explicit IANA zone (HAR-1347, HAR-1506). The calendar draws; the
consumer owns every word, count and ranking.

```tsx
import { SchedulingCalendar, layoutMonthSpans, schedulingGridDays } from '@tensor_1/react';
import { TriangleAlertIcon } from '@tensor_1/react/icons';

// The item: one hue dimension (band), one state channel (status), markers with text.
const entry = {
  id: 'e1', title: 'Firewall rule update', start: '2026-10-06T08:00:00Z', end: '2026-10-06T09:00:00Z',
  band: 'high',            // 'none' | 'low' | 'medium' | 'high' — only 'high' is filled
  status: 'tentative',     // 'tentative' | 'committed' | 'live' | 'done' | 'dead' — line style, never a hue
  markers: [{ id: 'm', label: 'Needs sign-off', emphasis: 'warning', icon: <TriangleAlertIcon /> }],
  accessibleName: 'Firewall rule update, high, tentative, 6 October 10:00 to 11:00',
};
// A window: neutral, hatched, named, focusable. `global: false` never gets the global treatment.
const hold = { id: 'w1', label: 'Quarter close', kindLabel: 'Hold', scopeLabel: 'Payroll services', pattern: 'cross',
  start: '2026-10-04T22:00:00Z', end: '2026-10-09T22:00:00Z' };

// Controlled month: the consumer ranks, cuts and counts; the calendar renders what it is given.
const grid = schedulingGridDays('2026-10-07', 'month', 1);
const spanLayout = layoutMonthSpans(spansInSalienceOrder, grid, { timeZone, weekStartsOn: 1 }); // lanes in the order given
<SchedulingCalendar timeZone="Europe/Berlin" anchorDate="2026-10-07" showHeader={false}
  entries={multiDayEntries} overlays={[hold]} spanLayout={spanLayout}
  dayEntries={{ '2026-10-07': topThree }}                                        // already ranked and cut
  days={{ '2026-10-07': { count: 50, overflowCount: 47, label: '50 items' } }}   // "+47 more", never entries.length
  maxEntriesPerDay={3} onShowMore={(date) => openDay(date)}                      // a controlled day never expands in place
  onSelectEntry={openItem} onSelectOverlay={openWindow} onSelectDate={openDayView}
  legend={legendOfWhatIsOnScreen} legendCaption="Times in Europe/Berlin"
  notice={truncated && <p>Showing the first 2,000 items.</p>} emptyNote="Nothing is scheduled this month." />
```

- **Drawn once.** An entry or window that covers several days is one bar per week row, in lanes above the chips
  (`windowLaneCap`, `spanLaneCap`, default 2 each). Windows never take a chip slot. A row with more spans than lanes
  shows "+N" and calls `onShowMore` with the first day that has a hidden span.
- **Day membership is end-exclusive in `timeZone`**: 22:00–00:00 is on its start day only.
- **Fixed geometry.** With `days` / `dayEntries` (or `maxEntriesPerDay` plus `onShowMore`) every cell keeps one
  height: the head, the lane caps, the chip rows and the "+N" line. A chip reads `HH:MM title` (24 h, in the zone)
  unless `renderEntry` replaces it.
- **Week and Day as a time grid** (`timeGrid`, HAR-1509): day columns on an hour axis.

  ```tsx
  <SchedulingCalendar view="week" timeGrid timeZone="Europe/Berlin" anchorDate="2026-10-07" showHeader={false}
    entries={entries} overlays={windows} days={dayCounts} now={serverNow}
    canMove={userMayMove} step={15}
    onProposeMove={(id, { start, end, adjusted }) => reschedule(id, start, end)}   // the server decides; the calendar never moves an item
    onSelectEntry={openItem} onShowMore={openDay} />
  ```

  - A column is as tall as its day (23, 24 or 25 hours); an item sits at its real time. `view="day"` is one column.
  - An entry that crosses midnight by up to `topLaneCrossMidnightMinutes` (default 360) is one item in two joined
    parts; all-day (`allDay`), longer and later-running entries go to the lane above the hours (`placesInTopLane`).
  - Moves are proposals: drag, or Shift and an arrow key, then Enter (Escape drops it). An entry whose props do not
    change stays where it was, so a refused move snaps back by construction. `movable: false` pins an entry.
  - Overlapping items share at most `maxLanes` lanes, fewer in a narrow column; the column "+N" is the consumer's
    `days[date].overflowCount`. `renderEntry(entry, { availableLines })` says how many text lines fit.
- **Agenda grouped by day** (`agendaGroups`, HAR-1520): the consumer builds the day groups and the calendar renders
  them in order, each under a heading.

  ```tsx
  <SchedulingCalendar view="agenda" timeZone="Europe/Berlin" anchorDate="2026-10-07" entries={[]} showHeader={false}
    agendaGroups={[
      { date: '2026-10-07', annotations: [hold], rows: firstTen, hiddenCount: 4 },   // "4 not shown — open day"
      { date: '2026-10-08', rows: [], hiddenCount: 12, continuesCount: 2 },           // the heading stays
    ]}
    onSelectEntry={openItem} onSelectOverlay={openWindow} onShowMore={openDay}
    notice={truncated && <p>Showing the first 500 items.</p>} />
  ```

  Above `virtualizeAbove` rows (default 200) the agenda is one scroller of 44 px rows and only the rows near the
  viewport are mounted, on the server too; each window note then has a row of its own under the heading. In a box
  of 576 px or less those rows are 64 px with three lines: the title, the time, then markers and status. A row
  there holds one line of title, so `renderEntry` content must fit one line. A row shows its status as words and
  its markers with their text. Its time is two times of day when the entry starts on that day and ends within a
  day by the clock; otherwise both ends go through `formatInstant` (pass a short form for narrow screens: an end
  that does not fit its half of the line is cut), and an `allDay` entry reads `labels.allDay` or the days it
  covers. Crossing `virtualizeAbove` swaps the two forms, which resets focus and scroll inside the agenda. Type
  the groups with `SchedulingAgendaGroup`.
- **A narrow month** (`monthDensity="counts"`): a cell is the date, the consumer's `days[date].count` and its markers.
  No entry is drawn and none is counted: a row's "+N" is for windows over `windowLaneCap` only. The setting does not
  touch the week.
- **Keyboard (HAR-1527).** The month grid, the time grid and the agenda are each **one tab stop**; no item is a
  tab stop of its own.
  - Month: arrows move between days, Home/End go to the first/last day shown. **Enter** on a day with items moves
    into them (ArrowUp/ArrowDown, Home, End between them; Enter calls `onSelectEntry`; **Esc** returns to the day).
    **Space** or a click on the day number calls `onSelectDate`; so does Enter on a day with no items.
  - Week/Day time grid: the tab stop is a day head (ArrowLeft/ArrowRight between days). Enter goes into the
    day's items and windows. On an item, Enter selects it, or confirms a pending move (`onProposeMove`); Esc drops
    a pending move, otherwise returns to the day head.
  - Agenda (grouped or flat): ArrowUp/ArrowDown, Home and End walk rows, window notes and "open day", also
    through the rows a long agenda has not mounted yet.
  - The keys act on the calendar's own items only: a field or link you render inside a cell or an item keeps its
    keys. A row's "+N" is reached from the day it opens. An item reached with the pointer takes the tab stop to
    its day. Esc on an item returns to its day and is not passed on; a second Esc reaches a surrounding dialog.
  - A day button is named with the date and `days[date].label` (the count and the highest signal), through
    `labels.dayName` (`'{date}, {label}'`). If your labels already say the date, set `dayName: '{label}'`.
  - To put focus back on an item after closing your own panel: `querySelector('[data-item-id="…"]')?.focus()`.
- **Emphasis.** `entry.emphasis: 'highlight' | 'dim'` sets `data-highlight` / `data-dim` on that item in every
  view. Highlight is a heavier edge in the text colour and a heavier weight, dim is quieter text;
  neither changes a hue, the line style of the state, or the band's leading edge. With forced colours a
  highlighted title is underlined and dimmed text is grey.
- **`<List roving>`**: the items are one tab stop (ArrowUp/ArrowDown, Home, End; Enter or Space activates the
  focused item's `onClick`). A control inside an item keeps its own tab stop and keys. Items may be wrapped or
  rendered later by a child component.
- **Print (HAR-1541).** The stylesheet has `@media print` rules; add no print CSS of your own. On paper the same
  markup has no scroller, fits the page width, and keeps a week row or an agenda row on one page. The colours are
  the `--uix-print-*` tokens (light, whatever theme the screen has). Nothing depends on a background: the `high`
  band is a heavy edge on a paper surface (`--calendar-band-high-surface`, new: the fill of the band, which read
  `--calendar-band-high-fill` before), each window pattern has an edge style of its own (`solid`, `diagonal` dashed, `cross`
  double, `dotted` dotted), and the hour lines are drawn as lines. Month chips wrap to show the whole title, and
  a time-grid item is at least as tall as its time and grows to hold its words (one too short for a line on a
  screen prints them too). The header's buttons, the "now" line and a pending move are not printed; the period
  title, the zone label and the legend are. A long agenda mounts every row while the page prints (`beforeprint`,
  or print media) and is a window of rows again afterwards. One limit: `window.print()` called from an effect in
  the render that mounts the calendar runs before those rows are there, so a page that prints itself on mount
  passes `virtualizeAbove={Infinity}`.
- **Colour.** Every calendar colour is named once at the top of `scheduling-calendar.css` (`--calendar-*`).
- **Deprecated, still working in 2.x:** `entry.state` / `SchedulingEntryState`, `overlay.kind` /
  `SchedulingOverlayKind` and the `previous` / `next` labels. An entry with `state` is no longer tinted: the two
  problem states show a marker with the word for that state.

### SchedulingTimeline

Lanes of bars on a time axis (HAR-1364, HAR-1521): schedules by service, rollout rows, renewal markers. It pairs
with `SchedulingCalendar`: the same item API (`band`, `status`, `markers`, `accessibleName`), the same explicit
time zone, the same proposal model for moves.

```tsx
<SchedulingTimeline
  lanes={services.map((s) => ({ id: s.id, label: s.name }))}
  groups={[{ id: 'pay', label: 'Payments', laneIds: ['checkout', 'ledger'], collapsed, summary: { count: 7 } }]}
  onToggleGroup={(id) => toggle(id)}
  items={rows.map((r) => ({ id: r.id, laneId: r.serviceId, title: r.title, start: r.start, end: r.end, band: r.band, status: r.status, markers: r.markers }))}
  range={{ start: weekStart, end: weekEnd }} scale="day" subTicks={[6, 12, 18]} timeZone={tz} now={nowIso}
  overlays={[{ id: 'q4', kindLabel: 'Hold', label: 'Quarter close', pattern: 'diagonal', laneIds: ['ledger'], start, end }]}
  flagOverlaps={false}
  onSelectItem={(item) => open(item.id)}
  onProposeMove={(id, { start, end }) => askToMove(id, start, end)}
  notice={truncated && 'Showing 500 of 1,240 items.'}
  columnNotes={{ '2026-10-08': '12 more not shown' }}
/>
```

- **Axis:** `scale` is `hour`, `day` (default), `week` or `month`. Ticks fall on wall-clock boundaries in `timeZone` (DST and half-hour zones included). `tickWidth` sets the width of one unit; the axis scrolls inside the component and the lane column stays put. On a `day` axis `subTicks` (local hours) draws minor ticks inside each day; on an `hour` axis an hour that occurs twice (the clocks went back) shows its UTC offset.
- **Groups:** `groups` puts lanes into collapsible blocks, in the order given; a lane no group names is drawn after them. A collapsed group is one row with `summary.count` and `summary.markers`, which the consumer supplies: the timeline derives no count, and the `groupSummary` label words it (`Items: {count}` by default). That row stands for the lanes it hides: when a window covers one of them (or every lane), the row gets a strip under its head, one sub-row tall, and the window is drawn there, where the group label cannot lie over it. With `onToggleGroup` the consumer owns `collapsed`; without it the group opens and closes itself.
- **Bars:** bars that share time in a lane stack in sub-rows, packed by `packLanes`. A bar is drawn at least 24 px wide (`--timeline-bar-min`) and is packed as that wide, so two bars never cover each other and each is a 24 × 24 px target with nothing over it. The price is height: where bars are closer together than 24 px of axis, a lane takes more sub-rows than it has bars running at once. On a month axis at the default `tickWidth` 24 px is about six days, so a lane of daily bars is six sub-rows tall; a wider `tickWidth` brings it back down. The packing follows the width of the track (it is measured), and when it changes the first row in view is kept where it was. Only `band="high"` is filled; `status` is a line style; `markers` are shapes or icons with text. `renderItem` replaces the bar text, which is cut at a word: a first word that does not fit is not shown, so no part of a word or of a time is. The full title is in the name and the `title` tooltip.
- **Stacking flag:** by default a bar that shares time with another bar of its lane is hatched (`data-conflict`) and its name says so (`labels.conflict`). With `flagOverlaps={false}` the stacking stays and the hatch and the words go: the consumer says what clashes, with a reason, through `markers`.
- **Windows and markers:** an overlay is one neutral element with a `pattern` and its `kindLabel`, name and `scopeLabel` as text, however many rows there are. `laneIds` limits it to the rows of those lanes (unset: every row). With `onSelectOverlay` each window is a named button; without, windows are listed for screen readers. `markers` (a point in time, optionally with `laneIds`) and `now` are one line each. The now-line is neutral.
- **Moving:** three models, chosen by the callback.
  - `onProposeMove(id, { start, end, adjusted })`: drag a bar, or press Shift+←/→ to build a pending move, Enter to send it and Escape to drop it. One call per finished gesture. The timeline never moves the bar: an item whose props do not change is back where it was, so a refused move snaps back. Return a promise to keep the outline until it settles. On a week or month axis a step is a calendar day (the wall-clock time is kept across a clock change).
  - `onMoveItem(id, { start, end })`: the 2.x model, one call for every key press and every drop.
  - `onResizeItem(id, { start, end })`: Alt+Shift+←/→ moves the end of a bar. Without it there is no resize and no hint offers one.
  Moves snap to `step` (15 min on an hour axis, 1 h on a day axis, 1 day otherwise). `movable: false` pins a bar.
- **Keyboard:** the bars are one tab stop. ←/→ go to the previous or next bar in a lane, ↑/↓ to the nearest bar in the next lane (over group heads), Home/End to the ends of the lane, and Enter selects, or confirms a pending move, never both (a click or Space does nothing while a move is pending). A move that was sent is announced (`moveSent`).
- **Long timelines:** above `virtualizeAbove` rows (default 150) only the rows near the viewport are mounted, and an arrow key that goes to a bar that is not mounted mounts it, scrolls to it and focuses it. The rows counted are the ones passed, `lanes` plus `groups`: the answer does not move with the width, with what is collapsed or with how the bars pack. What is mounted is what the viewport shows plus overscan (under 150 row elements up to a viewport of about 7,000 px). The row of the focused control is never unmounted. `maxHeight` makes the lanes scroll inside the timeline under the axis; without it the page scrolls.
- **Notice and counts:** `notice` is shown above the axis; `columnNotes` puts a note on the column of a day (`YYYY-MM-DD` in `timeZone`).
- **Row heights:** with `groups`, `laneIds` or a virtual window every row has a fixed height (a lane is its sub-rows, a group head one line) and a lane label that does not fit is cut with an ellipsis. A timeline that uses none of them keeps rows that grow with their label.
- **Colour:** every colour is named once at the top of `scheduling-timeline.css` (`--timeline-*`). Forced colours are handled in `forced-colors.css`, as for the calendar.
- **Print (HAR-1541).** The stylesheet has `@media print` rules; add no print CSS of your own. On paper the timeline has no scroller and nothing sticks: the axis is fitted to the page width and the bars follow (every position is a share of the axis), and a lane stays on one page. The colours are the `--uix-print-*` tokens (light, whatever theme the screen has). Nothing depends on a background: the `high` band is a heavy edge on a paper surface (`--timeline-band-high-surface`, new: the fill of the band, which read `--timeline-band-high-fill` before), each window pattern has an edge style of its own, and the grid lines are drawn as lines. A note on the column of a day is shown in full. The "now" line and a pending move are not printed. A timeline over `virtualizeAbove` rows mounts every row and bar while the page prints and windows again afterwards; a page that calls `window.print()` from an effect on mount passes `virtualizeAbove={Infinity}` instead. One limit: a bar keeps its share of the axis, so on a narrow page it may be too short for its title (the title is still the bar's name).
- **Deprecated, still working in 2.x:** `item.state` / `SchedulingEntryState`, `overlay.kind` / `SchedulingTimelineOverlayKind` and the `states` / `overlays` labels. A bar with `state` is no longer tinted: the two problem states show a marker with the word for that state, and the kinds are told apart by pattern.
- Pure helpers are exported for tests and server code: `timelineTicks`, `timelineSubTicks`, `timelineRepeatedHourOffset`, `placeSpan`, `layoutLane`, `shiftSpan`, `snapToStep`, `pixelsToMs`, `defaultTimelineStep`, `timelineStepDelta`.

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

### DashboardGrid

The layout grid for dashboard widgets (HAR-1555; TENSOR's role dashboards). Pure layout: drag-and-drop, persistence and widget chrome stay in the product. Server-renderable.

```tsx
<DashboardGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="md">
  <DashboardGrid.Item><Stat label="Open incidents" value={42} /></DashboardGrid.Item>
  <DashboardGrid.Item span={2}><Card title="Queue by team">…</Card></DashboardGrid.Item>
  <DashboardGrid.Item span="full">
    <Chart title="Resolved per hour" option={option} height="clamp(160px, 40cqi, 360px)" />
  </DashboardGrid.Item>
</DashboardGrid>
```

- **Columns follow the grid's own width**, not the viewport (a container query), so the same dashboard has fewer columns beside an open sidebar. Breakpoints: `sm` 36rem, `md` 48rem, `lg` 60rem, `xl` 80rem of grid width, sized for widgets of about 280–320 px (2 columns from 36rem, 3 from 60rem, 4 from 80rem). A breakpoint you leave out keeps the count of the next smaller one; a missing `base` is 1. Without `columns`: 1, 2 from `sm`, 3 from `lg`. Counts are 1–4.
- **Spans:** `span={1}` (default), `span={2}` (clamps to the columns there are, so it is the whole row at one column), `span="full"` (`grid-column: 1 / -1`, the whole row at every width).
- **Size-aware content:** each item is an inline-size container named `uix-dashboard-grid-item`. Give a Chart a height in `cqi` (a share of the item's width), or pass your own height per widget size; the Chart already redraws at the item's width. Use `@container uix-dashboard-grid-item (min-width: …)` for a card's own split layout. Widgets in one row share a height (the item's last child grows).
- **`gap`:** `sm` (--uix-space-3), `md` (default, --uix-space-4), `lg` (--uix-space-6).
- Refs reach the grid and item `<div>`s, and other props pass through. For an element you render yourself (a drag-and-drop library's sortable node, a server template), use `dashboardGridClassName(columns, gap)` and `dashboardGridItemClassName(span)`.
- Plain HTML: `.uix-dashboard-grid` with `--cols-N` / `--{sm,md,lg,xl}-cols-N` and `--gap-sm|lg`, items `.uix-dashboard-grid__item` with `--span-2` / `--full`. Every direct child of the grid is a cell.

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

### Gaps from the TENSOR migration (2.32.0)

Found on 2026-10-07/08 while TENSOR moved its hand-built UI onto 2.31.0. Everything is optional
unless a line says **Behaviour change**.

#### Anchored overlays stay inside the viewport

A `Popover` / `useAnchoredPosition` panel that fits neither above nor below its anchor used to
leave the viewport (a 384 px panel under a trigger in the middle of a 640 px phone screen got a
negative `top`). It now slides over the anchor and stays inside the 8 px padding, after a scroll
and after a resize as well. Once the anchor itself has left the viewport the panel follows it out.

```tsx
<Popover anchor={triggerRef} capHeight>…</Popover>          // taller than the screen: capped, scrolls inside
useAnchoredPosition(anchorRef, panelRef, {
  open,
  capHeight: true,                 // max-height = viewport − 2 × padding (a smaller own max-height still applies)
  onAnchorHidden: () => setOpen(false),   // what `Popover closeWhenAnchorHidden` is built on
  shiftMainAxis: false,            // opt out: the 2.31.0 placement
});
computePosition(anchor, size, viewport).mainAxisRange   // [min, max] the top is kept in, or null
```

With CSS anchor positioning the browser moves a box with its anchor *after* resolving `top`, so
no value can hold it at the viewport limit while the page scrolls. While a panel is held at the
limit, or within 64 px of it, the hook writes fixed coordinates instead; they cannot drift.

#### Menu: radio and checkbox items, attributes, Escape on the trigger

```tsx
<Menu trigger={<Button>Preset</Button>}>
  <MenuItem id="manage" data-action-id="preset.manage" onSelect={manage}>Manage presets</MenuItem>
  <MenuSeparator />
  <MenuRadioGroup label="Dashboard preset" value={preset} onValueChange={setPreset}>
    <MenuItemRadio value="mine">My queue</MenuItemRadio>
    <MenuItemRadio value="team">Team</MenuItemRadio>
  </MenuRadioGroup>
  <MenuItemCheckbox checked={zebra} onCheckedChange={setZebra}>Alternating rows</MenuItemCheckbox>
</Menu>
```

- `MenuItemRadio` / `MenuItemCheckbox` render `menuitemradio` / `menuitemcheckbox` with
  `aria-checked` and a check column. The menu opens on the checked radio item.
- A click or Enter follows `closeOnSelect` (radio: `true`, checkbox: `false`); Space changes the
  state and leaves the menu open.
- Every item kind forwards `id` and `data-*` to its own element.
- Escape (and Tab) on the trigger closes a menu that has no item to focus (every item disabled).
- The menu is capped to the viewport and scrolls.

#### CollapsibleSection and Steps

```tsx
<CollapsibleSection title="Details" defaultOpen persistKey={`incident:${id}:details`} persistStorage="local">…</CollapsibleSection>
<CollapsibleSection title="SLA" compact headingLevel={3} lazy openRequest={jumpToSla}>…</CollapsibleSection>
```

- `defaultOpen` is the starting state; with `persistKey`, what the person chose wins over it. A
  passed `open` is the same starting state and no longer overrides the remembered state at
  mount; it still applies when the parent changes it.
- `persistStorage`: `'session'` (default) or `'local'`.
- `openRequest` already set at mount is honoured (a deep link), and every request moves focus to
  the summary. `undefined` and `0` mean "no request yet".
- `compact`: a quiet row inside a card. `headingLevel`: the title is a real heading and the body a
  `role="region"` named by it.

```tsx
<Steps progress={false} headingLevel={2} label="New change">
  <Step title="What is changing" description="One sentence is enough."><Field …/></Step>
  <Step title="When"><Field …/></Step>
</Steps>
```

`progress={false}` is a numbered list of sections that are all on screen: no state is drawn or
announced, and each step's children are its content, in a group named by the step title. Without
it `Steps` is the progress indicator it was.

Also: `DescriptionItem termProps` / `descriptionProps` (attributes for the `<dt>` / `<dd>`), and
`closeLabel` is optional on `PromptDialog` and `ConfirmDialog`.

#### Tabs: a name for the tablist

```tsx
<Tabs aria-label="Inbox filters" value={tab} onChange={setTab}>…</Tabs>
<Tabs aria-labelledby="news-heading" overflow="scroll" …>…</Tabs>
```

`Tabs` passes HTML attributes to its `role="tablist"` element, in both overflow modes.

#### Segmented: one tab stop, arrow keys, a radiogroup mode

```tsx
<Segmented aria-label="Row density" value={density} onChange={setDensity}>…</Segmented>
<Segmented selection="radio" aria-labelledby="theme-label" value={theme} onChange={setTheme}>…</Segmented>
```

- **Behaviour change:** a `Segmented` is one tab stop (the selected option, or the first enabled
  one). Arrow Right/Down and Left/Up move and select, wrapping; Home / End jump; Left and Right
  swap in a right-to-left group. Before, every option was a tab stop and no key was handled.
- `selection="radio"` renders `radiogroup` / `radio` / `aria-checked` instead of `group` /
  `aria-pressed`, for a setting with exactly one value.

#### useVirtualRows

```tsx
const v = useVirtualRows(rows, { rowHeight: 44, estimatedViewportHeight: 600, enabled: rows.length > 0 });
```

- `estimatedViewportHeight`: the height to assume until the scroller is measured (and whenever it
  measures 0), so a 5,000-row table mounts with one window, not 5,000 rows.
- When the row count shrinks under a large `scrollTop`, the window is clamped to the new count in
  the same render: the spacer is never taller than the list.
- `enabled: false` returns every row and no spacers. Rows are windowed when
  `rows.length > threshold` (default 100).

#### RuleBuilder for a flat AND-list

```tsx
<RuleBuilder value={rule} onChange={setRule} fields={fields} operators={operators}
  conditionsOnly combinator="and" allowGroups={false} checks={{ emptyGroup: false }} labels={t.ruleBuilder} />
<RuleBuilder … readOnly />              // the builder, every control disabled
<RuleBuilder … readOnly="summary" />    // one sentence
```

- The built-in validation messages are labels (`issueEmptyGroup`, `issueNoActions`,
  `issueMissingField`, …) and `checks` turns individual checks off.
- `conditionsOnly`: no "Then" block; `actions` is then optional.
- `combinator` fixes every group to one value (shown as text, never emits the other);
  `hideCombinator` removes the control. `allowGroups={false}` hides "Add group".
- **Behaviour change:** `readOnly` renders the builder with its controls disabled, not a sentence.
  The sentence is `readOnly="summary"`, and its words are labels.
- `UixLabelsProvider labels={{ ruleBuilder }}` translates every builder below it.

#### Chip

```tsx
<Chip ref={chipRef} onClick={openEditor} onRemove={clear}
  bodyProps={{ 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-controls': editorId }}>Status: Open</Chip>
<Chip href="/incidents" current renderLink={link}>Incidents</Chip>
```

- The × is named from `UixLabelsProvider` `chip.remove` (`'{label} entfernen'`); `removeLabel`
  still wins.
- The ref is the body (the button, link or span that carries the chip's action), also on a
  removable chip; `bodyProps` puts attributes there.
- `current` on a link chip: `aria-current="page"` and the filled look.

#### FileUpload and Attachment

- A long unbroken file name no longer widens `FileUpload` past its container.
- Both read `UixLabelsProvider` (`fileUpload`, `attachment`); a `labels` prop wins per word.
- `sizeBase={1024}` counts in 1024s, `formatSize` takes the product's formatter, and
  `formatFileSize(bytes, locale, { base: 1024, units })` does the same outside a component.

#### Alert, Note, StatusPill, PromptDialog, Popover

```tsx
<Alert ref={errorRef} tone="info" title="…" actions={<Button size="xs" variant="ghost">Details</Button>} onDismiss={hide}>…</Alert>
<StatusPill size="lg" tone="success" dot>Operational</StatusPill>
<PromptDialog … multiline destructive error={serverError} />
<Popover anchor={userRef} openOnHover>…</Popover>
```

- `Alert`: `onDismiss` + `dismissLabel` (`UixLabelsProvider` `alert.dismiss`), a trailing `actions`
  slot, a forwarded ref, and a text column that wraps a long title at 320 px.
- `Note tone={undefined}` and `tone="neutral"` are the default look.
- `StatusPill size`: `'sm' | 'md' | 'lg'`.
- `PromptDialog`: `multiline` (a textarea; Ctrl/⌘+Enter submits), `destructive` (a danger submit,
  `role="alertdialog"`), an `error` slot, `role`. The field takes focus when the dialog opens.
- `Popover openOnHover`: opens on pointer or focus on its anchor, stays while either is on the
  anchor or the popover, closes after both left and on Escape.

#### Spinner, Meter, Heartbeat

```tsx
<Spinner size="sm" label="Uploading" />
<Meter tone="neutral" value={42} label="Option A, 42% of votes" />
<LiveIndicator state="live">Live</LiveIndicator>   <Heartbeat state="danger" label="Connection lost" />
```

- `Spinner size="sm"` is 16 px.
- `Meter tone="neutral"` (grey) and `tone="accent"` (brand) are fills for a proportion that is not
  a status; both clear 3:1 against the track in light and dark, and no tone word is spoken.
- `Heartbeat` is the pulsing dot (`live`, `idle`, `warning`, `danger`), decorative unless it has a
  `label`; `LiveIndicator` adds the state in text. The ring stops under `prefers-reduced-motion`.

#### ViewMenu

The density options no longer break a label inside a word at phone width ("Großzügig"); options
that do not fit one row wrap as whole options.

### Date fields, InlineEdit and other older gaps (2.36.0)

Older kit issues that TENSOR's triage still found blocking on 2026-10-08. Everything is additive.

#### DatePicker, DateTimePicker, DateRangePicker `mode="field"`

```tsx
<Field label={t('dueDate')} hint={t('workingDaysOnly')}>
  <DatePicker value={due} onValueChange={setDue} name="due" locale={locale} weekStartsOn={1}
    min="2026-11-02" max="2026-12-31" isUnavailable={isWeekend} />
</Field>

<Field label={t('starts')}>
  <DateTimePicker value={starts} onValueChange={setStarts} timeZone="Europe/Vienna" minuteStep={15} />
</Field>

<DateRangePicker mode="field" value={period} onChange={setPeriod} label={t('period')} locale={locale} />
```

- **`DatePicker`** is a text input that shows the date and reads a typed one, with a button that
  opens one month in a popover. The value is ISO `YYYY-MM-DD` or `null`; `name` submits it in a
  hidden input whatever the field shows.
- **Typing:** read on Enter and when focus leaves. ISO is always accepted; otherwise three numbers
  in the locale's order (`3.4.2026` is 3 April in German, `3/4/2026` is 4 March in en-US). Text
  that is not a date, or a date outside `min` / `max` / `isUnavailable`, marks the field invalid,
  says why, and leaves `value` alone (`onInputProblem` tells a form). Clearing the field sets
  `null`.
- **Format:** the locale's numeric date by default. `formatDate` changes what the field writes;
  pass `parseDate` with it when your format is not three numbers, and a `placeholder` so the
  message can name the shape.
- **Calendar keys:** arrows by day and week, Home / End to the ends of the week, PageUp / PageDown
  by month, with Shift by year. Focus never leaves `min` / `max`; a day refused by `isUnavailable`
  can take focus and is read out, but cannot be chosen. ArrowDown in the field opens the
  calendar; Escape closes it, returns focus to the field and does not close a drawer around it.
- **`DateTimePicker`** adds a time input. The value is `YYYY-MM-DDTHH:mm`, the shape
  `datetime-local` holds, so it replaces that input without changing what a form submits. The
  zone the wall clock is in is shown beside the time and is its description: `timeZone` shows
  that zone's short name on the chosen day (it follows daylight saving), `timeZoneLabel` replaces
  the text, and without either the viewer's own zone is shown. The value carries no zone.
- **`DateRangePicker mode="field"`** is a trigger that shows the range and opens the months in a
  popover; it closes when the range has both ends. `DateRangePicker` also takes `weekStartsOn`.
- **Words:** `UixLabelsProvider` `datePicker`, `dateTimePicker` and the three new
  `dateRangePicker` keys (`placeholder`, `fieldStart`, `fieldRange`).
- **Helpers:** `parseDateInput`, `formatDateKey`, `datePattern`, `dateOrder`, `isValidDateKey`,
  `splitDateTime`, `joinDateTime`, `timeZoneName`.

#### InlineEdit

```tsx
<DescriptionItem term={t('title')}>
  <InlineEdit label={t('title')} value={record.title} onSave={(next) => api.rename(record.id, next)}
    validate={(next) => (next.trim() ? undefined : t('titleRequired'))} />
</DescriptionItem>
```

The value is a button named by the value and "Edit {label}". Activating it swaps in an editor with
Save and Cancel: Enter saves (Ctrl/⌘+Enter in `multiline`), Escape cancels without reaching a
drawer around it, and nothing is saved on blur. A promise from `onSave` shows the busy state; a
rejection keeps the draft and shows the reason. Afterwards focus is back on the value.
`renderView` and `renderEditor` replace either half (a `Select`, a `DatePicker`); `disabled`
renders plain text. Words: `labels` or `UixLabelsProvider` `inlineEdit`.

#### RadioCard

```tsx
<RadioGroup variant="card" label={t('rollout')}>
  <RadioCard name="rollout" value="team" title={t('oneTeam')} description={t('oneTeamHint')}
    checked={rollout === 'team'} onChange={() => setRollout('team')} />
  …
</RadioGroup>
```

A native radio inside a card: one tab stop for the group, arrow keys choose, the whole card is
the target. The choice is a border and a check mark, not colour alone. `media` puts a preview
above the text. The grid wraps to one column on a phone.

#### Tree loads children on expand

```tsx
<Tree nodes={roots} loadChildren={(node) => api.org.children(node.id)} />   // roots: { id, label, hasChildren: true }
```

A node with `hasChildren` and no `children` is expandable. The first time it is expanded
`loadChildren` runs: the node is `aria-busy` and shows a loading row; a rejection shows an error
row whose Enter, Space or click retries. Focus follows the row that replaces the one it was on,
and lands on the node once its children are there. The tree keeps the loaded children; pass them
back in `nodes` when you own the data. Words: `labels` or `UixLabelsProvider` `tree`.

#### Avatar presence

```tsx
<Avatar presence="busy" src={user.photo} alt={user.name} />   <PresenceDot presence="away" />
```

`presence` is `online` (a filled dot), `busy` (a dot with a bar), `away` and `offline` (two
rings): a shape as well as a colour, and the state in visually hidden text (`presenceLabels`
translates it). `status` is still `presence="online"`. `PresenceDot` is the dot alone, named by
its state (`label={null}` makes it decorative). Fixed: the dot was clipped to a quarter by the avatar's round
mask; an avatar with a dot no longer clips it.

#### EntityPicker and CommandPalette words

- `EntityPicker onSearch` may resolve `{ options, hasMore: true }` when its list was cut off: the
  list ends with a row that says more match (not an option; arrow keys skip it) and the polite
  status says so too. Below `minQueryLength` the open list shows "Type at least {count}
  characters." Both, and every other word, come from `labels` or `UixLabelsProvider`
  `entityPicker`. `SearchSuggest` has the two slots these use: `idle` and `note`.
- `CommandPalette` announces its result count through `UixLabelsProvider` `commandPalette`
  (`resultsOne`, `resultsMany`, `{count}`) or a `resultsLabel(count)` prop; English is unchanged.
