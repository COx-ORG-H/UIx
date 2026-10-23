---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`NavItem` and `SubNavItem` forward their ref** (HAR-1810) to the rendered `<a>` or `<button>`, so a nav row can anchor a `Popover` (`<NavItem as="button" ref={anchor} popoverTarget="account-menu">` with `<Popover anchor={anchor}>`): MOTUS's account and "…" utility rows no longer need to be hand-built `button.uix-navitem`. `popoverTarget` and the other button attributes still pass through with `as="button"`. The ref type is `HTMLAnchorElement | HTMLButtonElement`.
