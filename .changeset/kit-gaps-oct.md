---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Five gaps MOTUS and TENSOR worked around locally:

- **`Button` / `ButtonLink` `wrap`** (HAR-1813): a long label may wrap. The size becomes a minimum height (`.uix-btn--wrap`), so a human-language label breaks onto a second line in a narrow or 200 %-zoomed column instead of widening it (WCAG 1.4.10). Opt-in; icon-only buttons keep their square and every other button is unchanged.
- **Anchored overlays under CSS `zoom`** (HAR-1798): `useAnchoredPosition` (Select, Popover, Popconfirm, Tooltip, menus) places in on-screen pixels and divides by the effective zoom when it writes, and `Select` sizes its list from the trigger the same way. Under `html { zoom: 2 }` a list opened low on the page used to land at twice its offset, below the viewport, and twice as wide as its trigger.
- **`ContentList` titles and meta** (HAR-1811) break an unbroken word (`overflow-wrap: anywhere`) instead of widening the page at 320 px.
- **`MetricInput` `required` and `hint`** (HAR-1819): the same required marker as `Field`, native `required` and `aria-required` on the input, and a hint under the control in its `aria-describedby`; an `errorMessage` joins the hint.
- **HAR-1814**: a table row the keyboard is in shows its row actions and id-cell arrow (`:focus-within`, as on hover); a sortable header keeps its neighbours' letter-spacing and case; `DetailLayout` without a side gives the main column the full width; `NavItem` draws its own inset focus ring, which a Sidebar's `overflow-x: hidden` no longer clips; and `Input warning` / `Field warning` add a "check this" state (warning border, a polite message; an error still wins).
