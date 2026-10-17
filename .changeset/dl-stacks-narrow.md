---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

**`.uix-dl` / `DescriptionList` stack when narrow** (HAR-2032, TENSOR audit UXC-04): below 22rem of the list's own width each label sits above its value and both take the full width, so a long label ("Neue Tickets pro Person und Stunde") no longer squeezes the value to a letter per line or pushes it off a 320 px screen. It is a container query on the list itself, so a 20rem side rail stacks at desktop width too, and a wide card keeps its label column. Products that stacked the list with a local override (TENSOR's `STACK_ON_A_PHONE`, HAR-1651) can delete it.

Where it stacks now: a phone card, a 20rem side rail, and always in a `DetailLayout` side column (280 px, which leaves the list about 230 px). A peek or drawer (about 380 px of list) keeps its label column.

The list is an inline-size container for this, so its content no longer sizes it:

- In a box sized by its content it is now **12rem wide, and stacked**, where it used to be as wide as its content: a flex row, the kit `Popover` or a hover card, a rich `Tooltip` (`max-content`), an auto-layout table cell, `inline-block`, a float, a column flexbox that does not stretch its children (`align-items: center`), a grid track sized by content. Give the list `flex: 1` or a width there.
- Its minimum width is 12rem too, where it used to be its longest label plus a gap, so a long label no longer pushes a phone page sideways through a parent grid with `auto` tracks.
- Inside a value, an unnamed `@container` query or a `cqi` / `cqw` unit (Tailwind v4's `@sm:` variants) now measures the list, not the container outside it. Name the container you mean (`@container/card`, Tailwind `@sm/card:`).
- Label/value pairs wrapped in `display: contents` `<div>`s stack too. The stacked label is pulled 8 px toward its value, which assumes the default 12 px row gap.
