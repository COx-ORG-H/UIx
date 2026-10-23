---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Showing what changed (motion rollout WP2: HAR-2583, HAR-2585, HAR-2587).

- `ChangeHighlight` (`value`, `as`, `variant: 'tint' | 'ring'`, `announce`, `disabled`), `useChangeHighlight(value, { announce, disabled })` and `flashChanged(el)`: a value that changed in place is tinted at once and the tint fades (about 1.3 s), never on the first render; a row tints its cells, a ring suits a pill. Reduced motion and forced colours: a steady outline for the same time. Plain markup: `.uix-changed`. New stylesheet `components/change-highlight.css`.
- `announcePolite(text, from?)`: one polite live region per page, or per open dialog.
- `Count` (`value`, `format`): one 4 px tick in the change's direction with a fade, tabular figures; reduced motion fades only. New stylesheet `components/count.css`.
- `useOptimisticValue(serverValue, commit, { onRollback })` → `{ value, set, pending, rollback, rollbacks }`: optimistic only for reversible personal actions; a failed save comes back visibly (flash it with `ChangeHighlight value={rollbacks}`) and `onRollback` says what was restored. Types `OptimisticRollback`, `UseOptimisticValueOptions`, `UseOptimisticValueResult`, `ChangeHighlightOptions`, `ChangeHighlightProps`, `CountProps`.
