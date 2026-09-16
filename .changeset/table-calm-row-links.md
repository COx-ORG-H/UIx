---
"@tensor_1/tokens": minor
---

`.uix-table`: body-row links stay calm, and the row hover eases in.

- Links in `tbody` no longer underline or turn link-coloured on hover or keyboard focus. They keep the row's `--uix-text` colour, and the row tint is the cue. This covers plain anchors and class-bearing ones, such as a framework `<Link className>`, which the base layer's `a:hover { text-decoration: underline }` used to reach. Anchors styled with `.uix-btn` are unchanged, and the global `:focus-visible` ring still shows. The quiet-link registry (`link.css`) no longer underlines table body links on hover. Its data-cell hover underline now applies only to `thead`/`tfoot` cells and `.uix-dl dd`.
- `.uix-table tbody tr` and `.uix-table--pinned-col tbody tr td:first-child` now fade their background over `--uix-dur-fast` / `--uix-ease-out`. Under `prefers-reduced-motion: reduce` there is no transition.
- The tables guide has a new "Row links" specimen under *Row styles & dividers*, and a Playwright check covers it in light and dark.

**TENSOR follow-up:** after TENSOR moves to this version, it can delete its HAR-133 override block in `apps/web/app/globals.css` (TENSOR PR #1878). This release ships the same behaviour.
