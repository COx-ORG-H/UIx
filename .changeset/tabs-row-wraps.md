---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**`Tabs overflow="wrap"` (the default) wraps the tab row** (HAR-1754). `.uix-tabs` was a flex row without `flex-wrap`, so tabs that did not fit shrank and wrapped their labels inside each tab, and at 320 px a tab row could still push the page sideways (TENSOR's routing settings: 44 px). The row now wraps onto more rows in all three variants, and no tab is wider than its row (`max-width: min(16rem, 100%)`, and an unbroken word breaks inside its tab), so one long label wraps inside its tab. A row that fits is unchanged; `overflow="scroll"` keeps its single scrolling row. TENSOR can drop its `.incident-related__tabs` rules after the bump.

In forced-colors mode the selected tab of the `line` and `pill` variants had no cue at all (the underline and the fill are backgrounds, which the mode removes): the underline is now drawn in `SelectedItem` and the selected pill gets an outline. Tab hover only applies where the pointer can hover. The Tabs reference page shows a wrapped row.
