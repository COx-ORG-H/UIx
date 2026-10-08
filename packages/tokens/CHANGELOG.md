# @tensor_1/tokens

## 2.34.0

### Minor Changes

- 1b7170c: `SchedulingCalendar`: an agenda grouped by day with consumer-owned groups, and a counts-only month for narrow screens (HAR-1520).

  - **`agendaGroups`** (`{ date, heading?, annotations?, rows, hiddenCount?, continuesCount? }[]`): the consumer decides which entry is listed under which day, in which order, and how many are left out. `view="agenda"` renders exactly these and never sorts, groups or counts. Without it the agenda is the flat list sorted by start, as before.
  - **Semantics.** Each day has a heading (`<h3>`; `agendaHeadingLevel` changes the level) with the date through `formatDate`, then its rows in an `<ol>`. Above `virtualizeAbove` rows (default 200) the agenda is one scroller of fixed-height rows and mounts only the rows near the viewport (on the server too, and when the list grows past the threshold after mounting); every row stays reachable with Tab. In that form each window note has a row of its own under the heading, and a narrow row gives the title its own line.
  - **Rows** use the item API: a swatch for `band` and `status`, the time range in the zone, the title (it takes the row width and wraps), `meta`, markers with their text, and the status as words. A row is a button that calls `onSelectEntry` and carries `data-item-id`; its accessible name includes `meta`. The time is two times of day when the entry starts on that day and ends within a day; otherwise both ends go through `formatInstant`, and an `allDay` entry reads the new `labels.allDay` ("All day").
  - **`SchedulingAgendaGroup`** is exported for typing the groups.
  - **Counts and notes.** `hiddenCount` shows "N not shown — open day" (`labels.hiddenInDay`), which calls `onShowMore(date)`; a day with no rows keeps its heading. `continuesCount` shows "Continues: K listed under an earlier day" (`labels.continuesInDay`). `annotations` are windows: one focusable note per window beside the heading, calling `onSelectOverlay`, never one per row. `notice` renders above the first heading.
  - **`monthDensity="counts"`**: each month cell shows the consumer's `days[date].count` and markers only, with no chips and no entry bars, in columns narrow enough for a 375 px screen. Windows keep their bar and name. No count is derived from the entries: a row's "+N" is for windows over `windowLaneCap` only. The setting leaves the week as it is.
  - **Tokens:** agenda and counts-density rules in `components/scheduling-calendar`. The flat agenda's rules are scoped to its own list.
  - **Docs:** the Agenda view of the SchedulingCalendar page is built from `agendaGroups`; a counts-only month specimen.

## 2.33.0

### Minor Changes

- 8c5980d: `SchedulingCalendar`: a Week/Day time grid with real-instant geometry and proposal-based moves (HAR-1509).

  - **Opt-in.** `timeGrid` draws `view="week"` as seven day columns on an hour axis; the new `view="day"` is one column and is always a time grid. Without `timeGrid` the week stays seven day cells. The built-in view switch offers Day only with the time grid, and steps a day at a time (`previousDay` / `nextDay` labels).
  - **Geometry from real instants.** A day column is as tall as its day: 23 rows on the day the clocks go forward (no "02"), 25 on the day they go back ("02" twice, each with its UTC offset). An item sits at the hours that really elapsed since the day began. A week that holds such a day labels that column's hours in the column.
  - **Midnight and the top lane.** `placesInTopLane(entry, timeZone, { crossMidnightMinutes })` (default `TOP_LANE_CROSS_MIDNIGHT_MINUTES = 360`, prop `topLaneCrossMidnightMinutes`): all-day entries (`entry.allDay`), entries longer than a day and entries running more than the threshold past their first local midnight go to a lane above the hours (`topLaneCap`, default 3 rows). A shorter midnight-crosser stays in the grid as a start part (the one tab stop, with the whole accessible name) and a hidden continuation with a "from HH:MM" cue.
  - **Lanes.** Overlapping items share a column in at most `maxLanes` lanes (default 4), and in fewer when a lane would be narrower than an item showing a time and six title characters. What does not fit is hidden, and the column's "+N" is `days[date].overflowCount` when the consumer gives one.
  - **Moves are proposals.** With `canMove` and `onProposeMove(id, { start, end, adjusted })`: drag an item (snapped to `step`, default 15 minutes, and to day columns), or press Shift and an arrow key to build a pending move, Enter to send it, Escape to drop it. A press that travels under 4 px is a click. The calendar never moves, refuses or cancels anything: it draws entries where the props say. "+1 day" keeps the wall-clock time (`addZonedDays`); a time that does not exist that day moves forward once and is announced (`adjusted: 'gap_forward'`). Top-lane spans drag by whole days only. `entry.movable: false` pins one entry. Without `canMove` there is no grab cursor, key binding or hint.
  - **Windows.** One named, focusable bar per window in a strip above the top lane (`windowLaneCap`, default 2 there), "+N windows" for the rest; a `global` window also shades its hours behind the items.
  - **Day heads and now.** Each column head shows the date (`formatDate(date, 'column')`, a new part), the consumer's `days[date].count` and markers with their text, and takes `days[date].label` as its accessible name. `now` (an ISO instant; the component keeps no clock) draws one line in the column of its day.
  - **`renderEntry(entry, context)`** gets `context.availableLines` in the time grid (0: markers only).
  - **New exports:** `placesInTopLane`, `TOP_LANE_CROSS_MIDNIGHT_MINUTES`, `layoutTimeGridDay`, `layoutDaySpans`, `proposeMove`, and the types `MoveProposal`, `TimeGridEntryContext`, `TimeGridEntryInput`, `TimeGridSegment`, `TimeGridPart`, `TimeGridDayLayout`, `DaySpanLayout`, `PlacedDaySpan`. `SchedulingCalendarView` gains `'day'` and `SchedulingDatePart` gains `'column'`.
  - **Tokens:** the time grid rules in `components/scheduling-calendar`; the now-line and the move outline are neutral and read from the colour map.
  - **Docs:** the Week and Day views of the SchedulingCalendar page are the time grid, with a 25-hour day specimen.

## 2.32.0

### Minor Changes

- d2e9330: Calendar math in one explicit IANA zone (HAR-1504): pure functions for zoned days, real hour slots, "+1 day", end-exclusive day spans, lane packing and a top-N cut. They use only `Intl`, never the process time zone or a fixed day length, so daylight-saving days have 23 or 25 hours.

  - **Days and slots:** `zonedDayBounds(dateKey, tz)` (the end of a day is the start of the next; a day whose midnight is skipped starts at its first instant) and `zonedHourSlots(dateKey, tz)` (one `{ instant, label, offsetLabel }` per real hour; a repeated hour appears twice, each with its UTC offset).
  - **"+1 day":** `addZonedDays(instant, n, tz)` keeps the wall-clock time and returns `adjusted: 'gap_forward'` when the time does not exist and moves forward, once.
  - **Day membership:** `zonedDaySpan(start, end, tz)` is end-exclusive (an entry ending at local 00:00 stays on its last day) and throws a `RangeError` on an inverted or empty interval. `enumerateDateKeys(span, { limit })` returns `{ dates, truncated }` instead of stopping silently.
  - **Lanes:** `packLanes(intervals, maxLanes, { order: 'start' | 'given' })` assigns first-fit lanes, `null` for what does not fit, with `laneCount` and `overflow` per overlap cluster.
  - **Top-N:** `rankOverflow(items, compare, n)` → `{ visible, hidden }`.
  - **Formatters:** `cachedDateTimeFormat(locale, options)` shares one `Intl.DateTimeFormat` per locale and options shape. `zonedDateKey` now goes through it (same signature and result), so a 2,100-entry month builds a few formatters instead of one per call.
  - **Deprecated, unchanged:** `zonedDateSpan` (end-inclusive, swaps inverted ends) and `enumerateDateSpan` (stops silently at 370). Use `zonedDaySpan` and `enumerateDateKeys`.
  - **Docs:** a "Calendar model" page with a DST example.

- de741cb: Calm, balanced dark status ramp and a neutral status family (HAR-1562, absorbs HAR-1384).

  - **Dark status values retuned.** Every dark status TEXT token now sits in one lightness band (OKLCH L 74–80 %, chroma ≤ 0.10) near `--uix-text-hushed`; solids are capped at chroma 0.14 and tints are the solid at 12 % alpha. Status text contrast on the dark surface now spans 8.1–9.8:1 (it was 6.8–11.2:1). The dark danger fill is `#BE3A41` (white text 5.4:1), so products no longer need a local dark danger override. `--uix-info` (a fill with white text) is unchanged.
  - **New tokens (additive):** `--uix-success-text` (light aliases `--uix-success`, dark `#7CC79F`), the neutral status family `--uix-neutral-solid` / `-text` / `-bg` / `-border`, and `--uix-radius-xl: 24px`.
  - **Components paint status text with the text role:** `.uix-pill--success` / `--sla-ok`, `.uix-alert--success` / `--warning` icons, `.uix-stat__trend--up` and `.uix-sla[data-state="ok"]`.
  - Light-mode values are unchanged apart from the new tokens.

- a93e0c6: Charts look like UIx with no consumer styling (HAR-1552).

  - **`uixChartTheme()`** (from `@tensor_1/react/chart` and `/chart/preset`): token palette, fonts, a solid hairline grid, axes and the UIx tooltip. `Chart` merges it under your option (your option wins) and re-applies it when `<html>`'s `class` / `data-theme` or the OS scheme changes, without a remount. New prop `theme?: 'uix' | 'none'` (default `'uix'`). Also exported: `mergeChartTheme`, `uixChartTokens` (the resolved analytic roles) and `uixChartAreaGradient`.
  - **New tokens:** `--uix-chart-grid`, `-axis`, `-reference`, `-zone-warning`, `-zone-danger`, `-forecast-band`, `-event`, `-partial`, `-comparison`, light and dark.
  - **Palette re-stepped:** `--uix-chart-1..8` keep their hue order and now pass the dataviz palette checks in both modes (lightness band, chroma ≥ 0.10, adjacent CVD ΔE ≥ 8, normal-vision ΔE ≥ 15, ≥ 3:1 on surface and bg-app). Light failed the normal-vision floor before; dark had 7 of 8 slots outside the band.
  - Docs: a "Chart tokens" foundations page; the styleguide charts consume the same theme (no dashed gridlines).

- 03d49b6: New `DashboardGrid`, the layout grid for dashboard widgets (HAR-1555; unblocks TENSOR HAR-1557).

  - **Spans:** `DashboardGrid.Item` (also exported as `DashboardGridItem`) takes `span={1 | 2 | 'full'}`. Span 2 clamps to the columns there are, and `full` fills the row at every width.
  - **Columns follow the grid's own width** (a container query), not the viewport: `columns={{ base: 1, sm: 2, lg: 3 }}` with `sm` 36rem, `md` 48rem, `lg` 60rem, `xl` 80rem of grid width. The default is 1 column, 2 from `sm` and 3 from `lg`. `gap` is `sm`, `md` or `lg`.
  - **Size-aware widgets:** each item is an inline-size container (`uix-dashboard-grid-item`), so a Chart can take its height from the item's width (`height="clamp(160px, 40cqi, 360px)"`) and a card can use container queries. Widgets in one row share a height.
  - **Plain HTML and custom elements:** the class contract is `.uix-dashboard-grid` (`--cols-N`, `--{sm,md,lg,xl}-cols-N`, `--gap-sm|lg`) with `.uix-dashboard-grid__item` (`--span-2`, `--full`). `dashboardGridClassName` and `dashboardGridItemClassName` return the same classes for an element you render yourself.
  - **Tokens:** a new `components/dashboard-grid` module.

- 47b2bd5: DateRangePicker and the Calendar day cells now use one shape for every state: hover, range start and end, today and keyboard focus are the same circle, concentric with the cell, and the in-range band is the circle's height and meets the start and end circles with no notches (no band while only a start is picked; RTL mirrors). Focus is a round ring with a surface gap so it stays visible on the accent circle, and forced-colours mode keeps the range (Highlight start/end, underlined in-range days). `DateRangePicker` gains a `today` prop (defaults to the viewer's local date, `null` for none) and marks that day with `aria-current="date"`. The Calendar grid drops its column gap so its range band joins (HAR-1570).
- 26488b2: `FilterEditor` enum presets (HAR-1505; TENSOR change calendar state scope).

  - **`FilterField.presets`:** named selections (`FilterPreset { id, label, values }`) shown as toggle chips (`aria-pressed`) in a labelled group above the search box and options. Activating one replaces the selection with its values. The preset equal to the selection (as a set) is pressed, and editing the options un-presses it. No native `<select>`.
  - **`matchFilterPreset(field, value)`** returns that preset. `summarizeFilter` returns its label, using the new optional `preset` summary label (default `'{label}'`, which also accepts `{field}`).
  - **Labels:** an optional `labels.presets` (default "Presets") names the group. `UixLabelsProvider` gains a `filterEditor` entry for every `FilterEditor` word, and an explicit `labels` prop still wins.
  - **Tokens:** `.uix-filter-editor__presets` in `components/table-toolbar`.

- 5195924: `SchedulingCalendar`: a shared item API, consumer-owned counts and a calm Month (HAR-1506).

  - **Item API.** An entry takes `band` (`none | low | medium | high`: the only dimension with a hue, and only `high` is filled), `status` (`tentative | committed | live | done | dead`: line style and dimming, never a hue), `markers` (a shape or an icon with text) and `accessibleName`. Every item carries `data-item-id`, `data-band` and `data-status`.
  - **Consumer-owned counts.** `days` (`{ count, overflowCount, label, markers }` per date) and `dayEntries` (the chips of each day, already ranked and cut). With both, the calendar places, ranks, cuts and counts nothing, "+N" is `overflowCount`, and a day never expands in place. With `days` alone the chips are still the day's `entries`, cut to `maxEntriesPerDay`.
  - **Spans drawn once.** An entry or window that covers several days is one bar per week row, in lanes above the chips. `layoutMonthSpans(spans, days, { timeZone, weekStartsOn, laneCap })` packs them in the order given and `schedulingGridDays(anchorDate, view, weekStartsOn)` returns the grid it needs; pass the result as `spanLayout`, or let the calendar lay them out. `windowLaneCap` and `spanLaneCap` default to 2 where the cells have a fixed height; where they grow (no `days`, `dayEntries` or `onShowMore`) every span gets a lane. A row with more spans than lanes shows "+N" and calls `onShowMore` with the first day that has a hidden one.
  - **Windows.** An overlay takes `pattern` (`diagonal | cross | dotted | solid`), `kindLabel`, `scopeLabel`, `global` and `accessibleName`. Windows are neutral, named in visible text, focusable, and call `onSelectOverlay`.
  - **Page-owned chrome.** `legend` and `legendCaption` (the legend is exactly the items given), `showHeader`, `notice`, `emptyNote`, `onSelectDate`, and per-view `previousMonth` / `nextMonth` / `previousWeek` / `nextWeek` labels.
  - **Day membership is end-exclusive in `timeZone`** for entries and windows: an entry ending at local midnight stays on its last day, and a window is placed by its zoned days, not its UTC date. `itemDaySpan` and `zonedTimeOfDay` are exported.
  - **Fixed month geometry.** With `days` / `dayEntries`, or `maxEntriesPerDay` together with `onShowMore`, every cell keeps one height.
  - **Changed defaults (visible).** A chip reads `HH:MM title` (24 h, in the zone), and a long title is cut at the chip edge without an ellipsis. In the month and week grids entries are no longer tinted by `state`: `conflicted` and `blackout-violation` show a marker with the word for that state instead (the agenda keeps its state pill until it is rebuilt), and "+N more" takes the text colour. The default instant text in accessible names and the agenda is the `day` date text plus the 24-hour time, so a 2,100-entry month builds at most four `Intl.DateTimeFormat` instances.
  - **Deprecated, unchanged in 2.x:** `entry.state` and `SchedulingEntryState`, `overlay.kind` and `SchedulingOverlayKind` (`kind` is now optional), and the `previous` / `next` labels.
  - **Tokens:** every colour of `components/scheduling-calendar` goes through one block of `--calendar-*` names at the top of the file. Forced-colours repairs for the high band, marker shapes and window hatches.
  - **Docs:** the SchedulingCalendar page is rendered from the component by `packages/react/scripts/render-scheduling-calendar-specimen.mjs`; a test fails when the page and the component differ.

- 0fa70fe: `Select` draws its own list instead of opening the browser's dropdown (HAR-1572). It follows the WAI-ARIA select-only combobox pattern, and existing call sites keep working without changes.

  - **Same API:** `<option>`/`<optgroup>` children (including fragments and `.map()`), `value`/`defaultValue`, `onChange(e)` with `e.target.value`, `name`, `required`, `form`, `disabled`, `ref` (still the `HTMLSelectElement`), react-hook-form `register` and `Controller`. A visually hidden native `<select data-uix-select-proxy>` holds the value, so `FormData`, `form.reset()`, autofill and `required` work as before. The `id` moves to the trigger, so `<label htmlFor>` and `Field` still name it.
  - **Trigger and list:** the trigger is a `<button role="combobox">` with the `.uix-select` look, and long values end in an ellipsis. The list is a top-layer popover placed with `useAnchoredPosition`, so it is never clipped inside a Drawer, a Popover or an `overflow: hidden` cell, and it flips near the edge of the viewport. It is at least as wide as the trigger and at most 320 px tall.
  - **Keyboard (APG):** ↑ ↓ Home End PageUp PageDown, Alt+↓ / Alt+↑, Enter, Space, Tab, Escape (keeps the value and focus), and typeahead (type several letters, or repeat one letter to cycle). Disabled options and groups are skipped.
  - **New optional props:** `options` (options and groups as data, with `description`, `icon`, `keywords`), `onValueChange`, `placeholder`, `invalid`, `readOnly`, `searchable` (`'auto'` above 12 options), `loadOptions` (loading, empty and error-with-retry states; stale requests are aborted), `renderOption`, `renderValue`, `placement` and `labels` (also `UixLabelsProvider` `select`). `multiple` gives a `string[]` value, a "+N" with a spoken count, and Delete to clear.
  - **Phones:** with `(pointer: coarse) and (max-width: 640px)` the list opens as a bottom sheet (`Drawer side="bottom"`) with 44 px rows.
  - **CSS:** `select.css` styles the trigger, the popup, the form proxy and the states. `.uix-listbox` options now show hover/keyboard focus and the selected value differently (the selected one has a check mark), and there are classes for groups, icons and descriptions. Where `appearance: base-select` is supported, a plain `<select class="uix-select">` gets the same look for its open list; Firefox still shows the operating-system list.
  - New exported types: `SelectOption`, `SelectGroup`, `SelectLabels`.

- c170f90: Twelve gaps TENSOR found while moving its hand-built UI onto the kit at 2.31.0 (HAR-1346 follow-ups). Everything is optional except the three items marked **Behaviour change**.

  - **Anchored overlays stay inside the viewport (HAR-1613).** A `Popover` / `useAnchoredPosition` panel that fits neither above nor below its anchor slides over it instead of leaving the viewport, also after a scroll or a resize; once the anchor has left the viewport the panel follows it out. New: `Popover capHeight`, and on the hook `capHeight`, `onAnchorHidden`, `shiftMainAxis`; `computePosition` returns `mainAxisNatural`, `mainAxisRange` and `available`. With CSS anchor positioning, a panel held at the viewport limit (or within 64 px of it) is written as fixed coordinates.
  - **Menu (HAR-1629):** `MenuItemRadio`, `MenuItemCheckbox`, `MenuRadioGroup`; every item kind forwards `id` and `data-*`; Escape and Tab on the trigger close a menu with no item to focus; the menu is capped to the viewport and scrolls.
  - **CollapsibleSection (HAR-1628):** `defaultOpen` (a remembered state wins over it, and a passed `open` no longer overrides the remembered state at mount), `persistStorage="local"`, an `openRequest` already set at mount is honoured and every request focuses the summary (`undefined` and `0` mean "no request"), `compact`, `headingLevel`. Fixed: the browser's own `toggle` event at mount could overwrite the remembered state.
  - **Steps (HAR-1628):** `progress={false}` renders numbered sections that hold content, with no state drawn or announced; `headingLevel`. `DescriptionItem termProps` / `descriptionProps`. `closeLabel` is optional on `PromptDialog` and `ConfirmDialog`.
  - **Tabs (HAR-1600):** `aria-label`, `aria-labelledby` and other HTML attributes reach the `role="tablist"` element, in both overflow modes.
  - **Segmented (HAR-1604):** **Behaviour change:** a `Segmented` is one tab stop (the selected option, or the first enabled one); Arrow keys move and select, Home / End jump, Left / Right swap in right-to-left. `selection="radio"` renders `radiogroup` / `radio` / `aria-checked`.
  - **useVirtualRows (HAR-1616):** `estimatedViewportHeight` (a window instead of every row before the scroller is measured), `enabled`, and a window clamped to the row count in the same render when the data shrinks under a large `scrollTop`. Rows are windowed when `rows.length > threshold`.
  - **RuleBuilder (HAR-1618):** the built-in validation messages are labels (`issue…`) and `checks` turns individual checks off; `conditionsOnly`; `combinator` (fixed, never emits the other value) and `hideCombinator`; `allowGroups`; `UixLabelsProvider` `ruleBuilder`. **Behaviour change:** `readOnly` renders the builder with its controls disabled instead of an English sentence; the sentence is `readOnly="summary"` and its words are labels. `RuleBuilderLabels` has 13 new keys (the seven `issue…` messages and the six summary words): `labels` stays a `Partial`, but an object typed as the full `RuleBuilderLabels` needs them. New exports: `setRuleCombinator`, `DEFAULT_RULE_VALIDATION_MESSAGES`, `DEFAULT_RULE_SUMMARY_WORDS`, `RuleCheck`, `RuleValidationOptions`, `RuleSummaryWords`.
  - **Chip (HAR-1632):** the × is named from `UixLabelsProvider` `chip.remove`; the ref and `bodyProps` reach the body button of a removable chip; `current` for link chips (`aria-current="page"` and the filled look). `Chip` and `Alert` are now `forwardRef` components.
  - **FileUpload and Attachment (HAR-1630):** a long unbroken file name no longer widens `FileUpload`; both read `UixLabelsProvider` (`fileUpload`, `attachment`); `sizeBase={1024}`, `formatSize`, and `formatFileSize(bytes, locale, { base, units })`. Markup: a download link's name "Download {name}" is now visually hidden text inside the link instead of an `aria-label`. Fixed: the rejected-files list had `role="alert"` on the `<ul>`, which removed its list role; the alert is now a wrapper around the list.
  - **Alert, Note, StatusPill, PromptDialog, Popover (HAR-1614):** `Alert` `onDismiss` / `dismissLabel` / `actions`, a forwarded ref, and a text column that wraps a long title at 320 px; `Note tone` accepts `undefined` and `"neutral"`; `StatusPill size` (`sm`, `md`, `lg`); `PromptDialog` `multiline`, `destructive`, `error`, `role`, and its field now takes focus when the dialog opens; `Popover openOnHover`.
  - **Spinner, Meter, Heartbeat (HAR-1606):** `Spinner size="sm"` (16 px); `Meter tone="neutral"` and `tone="accent"` (3:1 against the track in light and dark for every theme); new `Heartbeat` and `LiveIndicator`.
  - **ViewMenu (HAR-1601):** the density options no longer break a label inside a word at phone width; options that do not fit one row wrap as whole options.
  - **CSS:** additions to `menu.css`, `card.css`, `steps.css`, `segmented.css`, `rule-builder.css`, `file-upload.css`, `alert.css`, `status-pill.css`, `spinner.css`, `meter.css` and `view-menu.css`. No token changes.

- a93a5a0: New `TextDiff`, a two-way diff of two texts (HAR-1368; TENSOR C11 knowledge-article version diff).

  - **Line diff:** a Myers diff. Removed and added lines are paired by similarity, so a renumbered list still lines up, with the changed words marked inside each pair.
  - **Word diff:** compares prose word by word.
  - **Views and folding:** split (stacks in narrow containers) or unified. `context` folds long unchanged runs, and focus moves to the first revealed line.
  - **Not colour alone:** changes are `<del>`/`<ins>` with a −/+ sign and spoken words.
  - **Large input:** a `maxTokens` limit, and a `maxEdits` budget past which the changed middle shows as one replacement.
  - **Model:** `diffText`, `diffTokens`, `textDiffRows`, `tokenizeText`.
  - **Tokens:** a new `components/text-diff` module.

### Patch Changes

- 451dc9e: The `#file-upload` docs specimen now matches the React `FileUpload`: a centred UIx "Choose files" button under the title and hint, instead of a full-width native file input. An empty `.uix-filelist` no longer adds a spacer below the drop zone (HAR-1567).
- 9a3b00d: `FilterPopover` renders a plain UIx field: the label sits above the control, tied to it with `for`/`id`, 8 px apart, with 16 px before Clear/Apply and 16 px padding all round. It used to wrap the control in `<label class="uix-label">`, the Label tag pill, which drew an accent-tinted band around the field with 1 px under the select. The `.uix-filter-popover .uix-label` rule is gone, and the tag pill rule is now `.uix-label:not(label)`, so a `<label class="uix-label">` left in consumer markup no longer paints the band (use `.uix-field__label` for form labels). A new test fails on any `<label>` with `uix-label` in the React sources, docs, guide and `tables.html` (HAR-1573).
- 94b3210: CollapsibleSection's chevron is now the UIx `ChevronDown` icon (an inline SVG in a fixed 16 x 16 box centred on the summary row) instead of the text character U+2304, which an OS fallback font drew narrow and distorted and which jumped about 13 px on every toggle. The chevron only rotates, about its own centre, and takes the text colour on summary hover (HAR-1571).
- 9708b8a: Tag and chip remove "x": one spec for `.uix-tag__remove` and `.uix-chip__remove` (HAR-1569). Both are now a 20 px circle with the Lucide X centred in it, at the pill's trailing end 2 px from the edge, with a concentric 24 px hit area, a round focus ring and a hover tint of the text colour that shows on any pill (it was a 16 px rounded square on the tag, off-centre, with a hover lighter than the tag). The pill height is unchanged. Forced-colours mode outlines the hovered control. `<Chip onRemove>` draws `XIcon` from the UIx icon set, and the docs tag-input specimen uses the Lucide X instead of a text "×". Markup that put a text "×" inside `.uix-tag__remove` should switch to an SVG icon (e.g. `XIcon` from `@tensor_1/react/icons`).
- e6fbae3: List, Toast and Pipeline: a title and its secondary text now stack with the same result whatever element the markup uses. `.uix-list__title`/`__meta` and `.uix-pipeline__title`/`__description` are block-level, and `.uix-toast__body` is a flex column with a `--uix-space-1` gap, so `<span>`/`<strong>` markup no longer renders as one run-on line with a 0 px gap. The React output is unchanged. The three docs specimens use `<div>`, and `tests/a11y/docs-text-stacks.spec.mjs` measures every explorer route for glued text (HAR-1568).

## 2.31.0

### Minor Changes

- 5fda359: New `EntityPicker`: a form field that holds one record found by an async search (HAR-1366; TENSOR B28/C5 `entity-picker.tsx` and its eight consumers, MOTUS B-P10). It shows the chosen record with a named clear button. Choosing again opens a `SearchSuggest` list with loading, empty and error states, and Retry is a keyboard-reachable list row (the defect in TENSOR HAR-1336). Stale results are ignored and focus is returned. `name` posts the id; `id` and `aria-describedby` work with `Field`.

  `SearchSuggest` gains `inputId` and `inputDescribedBy`, which put an id and a description on the input itself.

- 61ea6bc: New `FileUpload` and `Attachment` / `AttachmentList` (HAR-984/985; TENSOR C15 attachments panel, MOTUS C-7 photo intake). `FileUpload` checks picked or dropped files against `accept`, `maxSize` and `maxFiles` and hands the accepted ones to the product, which uploads them and reports progress, success and failure through `items`. It has a real "Choose files" button, a rejection alert, per-file progress, Retry, remove, thumbnails and optional alt text. `Attachment` is a stored-file row: the name as a link or download, size, meta, a state slot, actions, remove, and `loading`/`error`/`forbidden` statuses. It's server-renderable. New pure helpers: `formatFileSize`, `fileMatchesAccept`, `partitionFiles`, `fileKind`. Tokens: `.uix-file-upload*` rules in `components/file-upload` and list rules in `components/attachment` (`.uix-attachments--list`, `__body`, `__line`, `__meta`, `__error`, `__actions`). Existing `.uix-dropzone`, `.uix-filelist` and `.uix-attachment` rules are unchanged.
- 372e973: New `FilterEditor` and a typed filter model (HAR-1365; TENSOR C6 `table-filter-editor.tsx`, MOTUS C-1 "+ filter"). `FilterPopover`'s value is one string; `FilterEditor` edits a typed `FilterValue`:

  - `enum`: multi-select checkboxes, with a diacritic-insensitive option search once the list is long.
  - `text`: a condition and text.
  - `number`: a condition (incl. `between`) and an optional unit.
  - `date-range`: two date fields.
  - `boolean`: Any / Yes / No.
  - `reference`: records found by an async `onSearch`, with loading, empty and error-with-retry states and removable chips.

  `summarizeFilter(field, value, { formatDate })` writes the chip text ("State: Open, Pending", "Age: 3 – 14 days", "Created: 01.10.2026 – 05.10.2026"). `isFilterEmpty` and `emptyFilterValue` complete the model. `FilterPopover` is unchanged. Tokens: `.uix-filter-editor*` rules in `components/table-toolbar`.

- 9d3143a: New `Lightbox`, a full-screen media viewer (HAR-1367; TENSOR C12 `capture-viewer.tsx`, MOTUS C-8 programme gallery). It has previous/next buttons, ←/→, Home/End and swipe, an announced counter, a caption, a fit/actual-size toggle and video items. It's a native `<dialog>` with focus on Close and focus returned to the opener. Tokens: gallery rules in `components/lightbox` (`.uix-lightbox--gallery`, `__stage`, `__media`, `__bar`, `__nav`, `__close`). The single-image `.uix-lightbox` is unchanged.

## 2.30.0

### Minor Changes

- 7d5e9e7: New `SchedulingTimeline`: lanes of bars on a time axis (HAR-1364; TENSOR C8, the change day/week timeline, rollout Gantt rows and licence-renewal markers).

  - **Props:** `lanes`, `items` (`laneId`, `title`, `start`, `end`, `state`, `meta`, `movable`), `range`, `scale` (`hour`/`day`/`week`/`month`), `timeZone`, `locale`, `overlays` (`freeze`/`maintenance`/`blackout`, all lanes or one), `markers`, `now`, `weekStartsOn`, `tickWidth`, `step`, `formatTick`, `formatInstant`, `renderItem`, `onSelectItem`, `onMoveItem`, `loading`/`error`/`onRetry`, and `labels` (also through `UixLabelsProvider` as `schedulingTimeline`).
  - **Bars:** overlapping bars stack and are hatched. Bars move by drag or Shift+arrow keys, and their end changes with Alt+Shift+arrow keys; moves snap to the step and are announced.
  - **Keyboard and screen readers:** one tab stop with arrow and Home/End navigation. Windows and markers are listed for screen readers.
  - **Pure model:** `timelineTicks` (wall-clock ticks in a zone, DST-safe), `placeSpan`, `layoutLane`, `shiftSpan`, `snapToStep`, `pixelsToMs`, `defaultTimelineStep`.
  - **Tokens:** new `components/scheduling-timeline` stylesheet.

  Fix: the `SchedulingCalendar` grid is now the containing block for visually hidden text (entry states, badge words). Before, a hidden word could escape the grid's scroller and widen the page on a phone.

## 2.29.0

### Minor Changes

- 1132a3d: The UIx icon set, a new `@tensor_1/react/icons` subpath (HAR-996). Icons come only from UIx (workspace ADR-0038). This lets TENSOR (270 files, 199 glyphs), MOTUS (8 files), POSx, MEDx and SHOPx drop `lucide-react` and turn on their icon-library bans.

  - **233 glyphs**, Lucide's (lucide-react 1.39.0, ISC, notice in `THIRD_PARTY_NOTICES.md`). They cover every name TENSOR and MOTUS import today plus the POSx, MEDx and SHOPx lists on HAR-996.
  - **Components:** each glyph is a tree-shakeable `<Name>Icon` component (`ShieldCheckIcon`), plus the older Lucide names the products use as aliases (`AlertTriangleIcon`, `CheckCircle2Icon`, `Loader2Icon`, …). `Icon name="shield-check"` picks one at run time. `UixIcon` replaces `LucideIcon`; `IconName`, `IconProps`, `ICON_GLYPHS` and `createIcon` are also exported. `etc/icon-names.json` maps each Lucide name to its UIx component for a codemod.
  - **Props:** `size` (`sm`/`md`/`lg` = `--uix-icon-*`, or a length), `tone` (`current`, `muted`, `accent`, `success`, `warning`, `danger`, `info`), `label` (role="img" with a name; otherwise `aria-hidden`), `strokeWidth`.
  - **Tokens:** a new `components/icon` stylesheet (`.uix-icon`, sizes, tones, forced-colors, and a `.uix-icon-grid` reference grid). It is in the bundle.

## 2.28.0

### Minor Changes

- b7ed3eb: An imperative toast queue: `toast()`, `toast.success/error/warning/info/loading`, `toast.update`, `toast.dismiss`, `toast.promise` and `toast.undoable`, rendered by `Toaster` (UIx HAR-1363; TENSOR A2/C3 and MOTUS A3/A4/C-13, which retires `sonner` in both).

  - **`Toaster`** now also renders a toast store (default: the one behind `toast()`; `store` prop for another). It shows at most `limit` toasts (default 3), pauses timers while hovered or focused and while the tab is hidden, closes the focused toast on Esc, and takes a `position` (`bottom-end` default, plus `bottom-start`, `bottom-center`, `top-end`, `top-start`, `top-center`). Hand-managed `<Toast>` children render as before.
  - **Defaults:** success/info/default 5 s, warning 8 s; error and loading stay until dismissed or updated. A reused `id` replaces in place. A loading toast that settles is announced again.
  - **`toast.undoable(message, { onUndo, onCommit })`:** the TENSOR C2 undo pattern. `onCommit` runs when the toast closes without Undo.
  - **`Toast`** gains `tone="warning"` and an `action` slot (`.uix-toast__action`). Tone glyphs are built in until the icon set (HAR-996) lands.
  - **The store is a plain module** (`createToastStore`, `createToastApi`, `ToastStore`, `ToastRecord`, `ToastOptions`, …) with no React import.

## 2.27.0

### Minor Changes

- dce872e: The small gaps TENSOR and MOTUS were hand-building around (workspace ADR-0038 "always use UIx"; the 2026-10-06 reuse audits; UIx HAR-1346 batch (a)). Every addition is optional, so existing calls render as before.

  - **SchedulingCalendar** (HAR-1347, TENSOR B1/C9): `weekStartsOn` (0–6, default Monday), `formatDate(date, 'day' | 'weekday' | 'month')` and `formatInstant` for a product date format, `maxEntriesPerDay` with a "+N more" toggle that expands the day or calls `onShowMore`, and `renderDayBadge`. The month and week grids gain weekday column headers. `buildMonthGrid` accepts any `CalendarWeekday`.
  - **ButtonLink** and **`size="xs"`** (HAR-1348, TENSOR A4/B5/B18, MOTUS C-3): a link that looks like a `Button`, and a 24 px button. One link adapter, `renderLink` (`UixRenderLink`, `UixLinkProps`), serves `ButtonLink`, `Stat`, `Pagination`, `MenuItem`, `Chip` and `Step`.
  - **Tooltip `content`** (HAR-1349, TENSOR A3): rich, non-interactive tooltip content.
  - **Stat `href` / `current` / `haspopup`** (HAR-1350, TENSOR B6/B7, MOTUS B-A7): a server-renderable link tile, and `aria-haspopup` that can say `menu` or nothing.
  - **Drawer `side`** (HAR-1351, TENSOR B15, MOTUS C-14): `start` for phone navigation, `bottom` for a bottom sheet.
  - **NavItem `description`** (HAR-1355, TENSOR B31): a wrapping second line. `.uix-navitem` now has a `min-height` of 36 px instead of a fixed height.
  - **CollapsibleSection `lazy` / `persistKey` / `openRequest`** (HAR-1352, TENSOR B32). Without them it is still a JS-free `<details>`.
  - **DescriptionList**: a long unbroken value wraps instead of widening the grid (HAR-1353).
  - **Card `titleId`** (HAR-1354, MOTUS B-A5).
  - **ConfirmDialog** `children`, `error`, `initialFocus`, `aria-describedby`, `tertiaryLabel`/`onTertiary`, `typeToConfirm`, `compensation`; new **Popconfirm**, an anchored single-step confirmation (HAR-1356, TENSOR C2, MOTUS B-A4/C-5). A `destructive` dialog now opens with focus on Cancel.
  - **Pagination** link mode (`hrefFor`) and cursor mode (`mode="cursor"`, First / Previous / Next, `summary`); `PaginationLabels.first` (HAR-1357, MOTUS B-P5/B-A22). Page buttons now carry `type="button"`.
  - **UixLabelsProvider** / **useUixLabels** (HAR-1358, TENSOR C20, MOTUS #3): translate kit chrome once for a subtree.
  - New **Menu**, **MenuItem**, **MenuGroup**, **MenuSeparator** (HAR-1359, TENSOR C1); **Chip**, **ChipGroup** (HAR-1360, TENSOR C7/B34, MOTUS C-6); **Kbd**, **KbdCombo** (HAR-1361, TENSOR C14, MOTUS B-A16); **Steps**, **Step** (HAR-1362, TENSOR C13, MOTUS C-9).

  Fixes found while building these: `PromptDialog`'s input label used `.uix-label` (the Label chip) and rendered as a blue pill; it is now a field label. `.uix-chip__count` used `opacity: .7`, which dropped the count below AA contrast; it now uses `--uix-text-muted` (and inherits on a pressed chip).

### Patch Changes

- b955d5e: The rich-text `composer` variant no longer squeezes its tool row to nothing when `toolbarEnd` is wide (TENSOR HAR-1125).

  - **The bug.** `.uix-rich-text--composer .uix-rich-text__bar` stayed on one row (`flex-wrap: nowrap`), and the tool row (`contain: inline-size`, so it has no content width of its own) only got the space the other items left. An audience toggle plus a submit button in `toolbarEnd` left it 0 px wide at 375 and 320 px: no formatting tool or emoji was reachable, and a click on a tool landed on the toggle.
  - **The fix** (`@tensor_1/tokens`, `rich-text.css`). The bar wraps, and the tool row keeps at least five tools (160 px, or the whole bar when the bar is narrower). When the counter or `toolbarEnd` would take that room, they move to their own row below the tools; the submit stays at the end. The tool row still scrolls sideways and never wraps. A status message still takes its own row (HAR-749); its separate `:has()` rule is gone because the bar now always wraps.
  - **What moves.** Only composers whose tool row was narrower than five tools: their trailing items now sit below the tools. Where the row already had room for five tools, nothing moves, and the visual goldens are unchanged. The loading/error fallback bar (no tools) wraps too, so a wide `toolbarEnd` stacks there instead of overflowing.
  - `@tensor_1/react` has no code change and is versioned in lockstep.
  - **Migration:** none. Consumers can delete local overrides of the composer bar's wrapping.

## 2.26.3

### Patch Changes

- e20cdc8: `EmojiPicker` no longer jumps when a category is chosen, stays attached to its trigger while the page scrolls, and closes once the trigger is scrolled out of view (TENSOR HAR-993). Every anchored overlay (`Popover`, `InfoTip`, `Tooltip`, `SearchSuggest`) gets the same placement fixes.

  - **The bug.** The picker was placed when it opened, before its content existed. The category bar only appeared once the emoji data had loaded, so the picker then grew past the space below its trigger without being placed again. `useAnchoredPosition` listened for scroll events in the capture phase, so the first scroll _inside_ the picker's grid (a category click) re-ran the flip from scratch, and the picker jumped from below the trigger to above it. The click also used `scrollIntoView()` and a plain `focus()`, which could scroll the page as well. While the page scrolled, the picker trailed its trigger by a frame, because it was moved from a JS scroll listener.
  - **One size.** The picker's rows have fixed heights in every state: the category bar is always rendered (buttons once the data is there, and it stays during a search). The loading, failure and "no results" line sits inside the fixed-height grid. The picker's size is the same loading, loaded, searching and failed.
  - **A side that stays.** While open, an anchored overlay keeps the side it opened on. It flips only when that side no longer fits and the other side does (`computePosition` option `stickySide`), so a size change or a small scroll never flips it back and forth. Scrolls inside the overlay are ignored, and so are scroll containers that do not hold the anchor. A `ResizeObserver` places it again when the overlay or its anchor changes size.
  - **No page scroll.** A category click scrolls only the grid, to the category's heading, and focuses its first emoji with `preventScroll`. Arrow keys scroll only the grid too.
  - **Attached while scrolling.** Where the browser supports CSS anchor positioning (Chromium 125+, Safari 26+), the engine's result is written as an offset from the anchor (`position-anchor` + `anchor()`), so the browser moves the overlay with its anchor in the same frame. The engine still decides the side, alignment and viewport clamp. The overlay is checked once per open to be where the engine placed it, and falls back to `position: fixed` left/top if not. Other browsers keep the fixed left/top path. The anchor name and `position-anchor` are removed on close and unmount.
  - **Closes when out of view.** New optional `Popover` props: `closeWhenAnchorHidden` (default `false`) closes the popover once an `IntersectionObserver` reports the anchor fully out of view (outside the viewport or a clipping ancestor), and `onAnchorHidden` is called just before it closes. Focus inside the popover is let go instead of returning to the hidden anchor. `EmojiPicker` turns this on and does not move focus back to its trigger in that case, so the page does not scroll back to the editor.
  - **Motion** (`@tensor_1/tokens`, `popover.css`). The popover fades and slides `--uix-lift` over `--uix-dur-fast`, always away from its anchor. It rises from below when placed on top, and moves sideways when placed left or right. An anchored `Popover` is held at its first frame until it has been placed, so the slide starts on the side it actually opens on. `prefers-reduced-motion` still turns the motion off.
  - **Migration:** none. Consumers that anchor their own `Popover` get the placement fixes automatically; `closeWhenAnchorHidden` is opt-in.

## 2.26.2

### Patch Changes

- No changes. Released in lockstep with `@tensor_1/react` 2.26.2, because consumers pin both packages to one exact version (TENSOR `installed-artifacts.test.ts`).

## 2.26.1

### Patch Changes

- No changes. Released in lockstep with `@tensor_1/react` 2.26.1, because consumers pin both packages to one exact version (TENSOR `installed-artifacts.test.ts`).

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
