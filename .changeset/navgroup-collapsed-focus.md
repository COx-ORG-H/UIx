---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

Sidebar nav group: collapsed panels are no longer keyboard-focusable.

The collapsible group hid its panel with the grid-template-rows (`0fr` + `overflow: hidden`)
animation alone, which only clips content visually — the links inside stayed in the tab order,
so a keyboard user could Tab into invisible items. The collapsed panel now also gets
`visibility: hidden`, riding the same transition so the collapse/expand animation is unchanged:
the panel stays visible for the whole collapse and hides at the end. Applies to both the CSS
contract (`.uix-navgroup__panel`) and the React `NavGroup`, which renders the same classes.
New a11y gate: `tests/a11y/nav-contract.spec.mjs` pins the keyboard contract.
