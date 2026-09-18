---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Calm links, a phone-fitting portal grid, kept tab panels, a RelationshipGraph that fits its content, comment variants and a SaveStatus indicator (TENSOR remediation RX-20..RX-23).

- **Links no longer underline on hover unless they are content links.** The base layer dropped its blanket `a:hover` underline. Classless links in text keep their persistent underline (WCAG 1.4.1). Buttons and tabs rendered as `<a>` stop underlining under the pointer. Opt-in hover underlines (`.uix-link--quiet`, title slots, `.uix-btn--link`) are unchanged. If a product relied on the base hover underline for a class-bearing link inside running text, give that link a visible cue of its own.
- **`.uix-cell-link`:** a table link that is quiet at rest as well as on hover. It keeps the row's text colour, never underlines, and keeps the focus ring. Use it on framework `<Link className>` anchors in table cells.
- **`.uix-id-cell__btn`** keeps the row's text colour on hover instead of turning accent blue.
- **`.uix-shortcut-grid`** fits its container (`auto-fit`, `minmax(min(100%, 12rem), 1fr)`) and lets labels wrap, so it no longer scrolls sideways at 320 px. Desktop column counts now follow the available width instead of a fixed four.
- **`TabPanel keepMounted`** keeps an inactive panel mounted, `hidden` and out of the tab order. It is off by default.
- **`RelationshipGraph` (radial):** every node carries its full label in `<title>`, and the `viewBox` grows to contain every node, including consumer-positioned ones.
- **`Comment`:** `variant="system"` with `systemLabel`, and a `replyTo` quote with `replyToLabel`.
- **`SaveStatus`:** `idle` / `saving` / `saved` / `failed`, with `onRetry` and translatable `labels`. The text sits in a polite live region that stays mounted in every state. New CSS module `components/save-status.css`.
