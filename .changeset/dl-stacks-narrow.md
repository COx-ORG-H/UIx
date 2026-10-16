---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

**`.uix-dl` / `DescriptionList` stack when narrow** (HAR-2032, TENSOR audit UXC-04): below 22rem of the list's own width each label sits above its value and both take the full width, so a long label ("Neue Tickets pro Person und Stunde") no longer squeezes the value to a letter per line or pushes it off a 320 px screen. It is a container query on the list itself, so a 20rem side rail stacks at desktop width too, and a wide card keeps its label column. Products that stacked the list with a local override (TENSOR's `STACK_ON_A_PHONE`, HAR-1651) can delete it.

The list is an inline-size container for this, so its content no longer sizes it. In a box sized by its content (a flex row, a `max-content` popover) it is now 12rem wide, and stacked, instead of its content's width; give it `flex: 1` or a width there. Its minimum width is 12rem too, where it used to be its longest label plus a gap, so a long label no longer pushes a phone page sideways through a parent grid with `auto` tracks.
