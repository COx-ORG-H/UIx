---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

Bar-shaped footers wrap at 320 px instead of pushing their last control out of the box (WCAG 1.4.10 reflow; TENSOR PR #1780).

- **`.uix-composer__bar`** now sets `flex-wrap: wrap` and a `row-gap` of `--uix-space-2`. The column gap is unchanged. An audience toggle (`.uix-segmented`) at the start and the submit button at the end now stack on two rows in a narrow container. Before, the submit button was pushed outside the card.
- **`.uix-dialog__footer`** and **`.uix-card__footer`** wrap the same way. A tertiary action or meta text next to two buttons no longer clips at 320 px.
- **Consumers can drop inline `flexWrap: 'wrap'` overrides** on these bars, such as the one in TENSOR `packages/shared/ui/src/worklog-feed.tsx`. An inline `justify-content: space-between` still works: the groups sit at both ends on one row and stack when they do not fit.
- The rich-text `composer` variant keeps its toolbar row on one line. Its toolbar already scrolls sideways on narrow screens, so it opts out of the wrap.
- Layer order and `--uix-accent-fg` are unchanged. At desktop widths nothing moves: the visual goldens are unchanged.
