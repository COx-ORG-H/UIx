---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

TENSOR deep-pass fixes (RX-125): translatable words everywhere, dark-mode elevation, and interaction fixes for trees, tabs, record pages and the date picker.

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
