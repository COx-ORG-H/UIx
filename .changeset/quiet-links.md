---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Quiet links (INTRA-04 follow-up): new `styles/components/link.css` ships the first-class quiet-link pattern for anchors whose container is the affordance. Anchors in the editorial-home title slots (`.uix-content-list__title a`, `.uix-news-lead__title a`, `.uix-rundown__item-title a`, `.uix-event-row__title a`) and classless `.uix-table td` anchors now inherit the surrounding text colour with no underline at rest (underline returns on hover/focus); `.uix-link--quiet` is the opt-in utility for hand-composed block links. In-text links inside prose keep the base `--uix-link` blue + persistent underline (WCAG 1.4.1 / link-in-text-block). Consumers carrying app-level overrides for these slots (e.g. TENSOR's globals.css "Quiet links" block) can delete them and point bespoke `.link-quiet` sites at `.uix-link--quiet`. React wrappers are unchanged (title slots already accept anchors); render tests lock the anchor-inside-title-slot nesting the CSS scoping depends on.
