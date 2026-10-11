---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`Stat`: interactive tiles line up with read-only tiles in a row, and a new `pending` state (HAR-1753).

- **Fixed: a button tile centred its rows.** A grid or flex row stretches its tiles to the tallest one, and a `<button>` that is taller than its content centres that content. `.uix-stat--interactive` was `display: block`, so in one row of four 95 px compact tiles the label started 13 px from the top on a read-only tile, 16 px on a button tile with a one-line meta and 27 px on a button tile with no meta. The interactive tile is now a flex column: label, value and meta start at the top whatever the height of the tile. The link tile (`href`) is an `<a>` and was not affected.
- **Visible change:** an interactive tile that is taller than its content (stretched by its row, or given a height) now has its rows at the top and the spare room below them, like a read-only tile. A tile that is as tall as its content looks the same. A consumer that worked around this with its own `display: flex; flex-direction: column` on the tile can delete that rule.
- **New: `Stat pending`.** On a tile with `onActivate` it sets `aria-busy="true"` and `aria-disabled="true"`, and `onActivate`, `onClick` and `onKeyDown` are not called until it ends. The button is never natively `disabled`, so it keeps focus. Read-only and link tiles ignore the prop.
- **CSS:** `.uix-stat--interactive[aria-busy="true"]` is dimmed, shows `cursor: progress` and has no hover tint. Plain-HTML consumers set the two ARIA attributes on the button themselves.
- No token changes.
