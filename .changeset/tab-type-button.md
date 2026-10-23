---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**`Tab` renders `type="button"`, so a `Tabs` strip inside a `<form>` no longer submits it** (HAR-1764). A `<button>` with no type is a submit button: every click on a tab, and every arrow key in automatic activation (which clicks the tab), sent the surrounding form. TENSOR's article editor can drop its `preventSubmit` workaround after the bump.

Every other kit `<button>` that is not meant to submit was checked: the three `Peek` buttons (previous, next, close) had no type either and now say `type="button"`; all the others (pager, tab-strip scroll buttons, `Segmented` options, `Chip`, `Steps`, menus, pickers, toolbars …) already did. `Button` keeps the HTML default on purpose: it is the generic button, and `<Button type="submit">` or a plain `<Button>` in a form behaves as a `<button>` does. A new source scan (`button-type-scan.test.mjs`) fails on any other kit `<button>` without a type.
