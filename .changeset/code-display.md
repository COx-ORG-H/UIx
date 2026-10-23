---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`CodeDisplay`** (HAR-1253; SHOPx PRE-08 till pairing code, the voucher code): a one-time code shown large. Monospace characters in groups (`groupSize`: a number or a list of lengths; a code that already contains spaces or hyphens keeps its own groups), a drawn `separator` that is never read out, `size` `md` / `lg`, and a visible `label` that names the group. A screen reader hears the code character by character, groups apart ("K 7 Q, 4 P X, 9 M W"); `spell` swaps in a spelling alphabet. `expiresAt` adds a countdown (`m:ss`, one update per second, never a live region): at `warnBefore` seconds (default 60) it turns to a warning and a polite status says "{time} left" once; at zero the code is struck through, the line says it has expired in words (not colour alone), the status says so once, and `onExpire` runs once. A code that arrives already expired is shown expired without an announcement. `copyable` adds a `CopyButton` (copies the bare code) while the code is live. Words: `labels` or `UixLabelsProvider` `codeDisplay` (`expiresIn`, `expiresSoon`, `expired`, `copy`, `copied`, `copyFailed`). Helpers `codeGroups` and `formatCountdown` are exported.

New stylesheet `styles/components/code-display.css`. Groups wrap whole on a narrow screen and the separator ends its line.
