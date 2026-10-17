---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`SearchBar`** (HAR-2030, TENSOR audit UXC-02): one search field look and behaviour over the `.uix-searchbar` contract, so no product hand-builds a search box. `label` names the field and its `search` landmark (visually hidden; the field shows `placeholder`); `value` / `defaultValue` with `onValueChange`; `onSubmit` on Enter or the optional submit button (`submitButton`); `onClear` after the clear button or Escape emptied the field (focus stays in the field; an empty field lets Escape through, so it still closes a dialog); `size` `md` (default, header and toolbar) or `lg` (44 px, public pages); `submitVariant`; `inputDescribedBy`; `landmark={false}` for a field that filters a list or table (by default it is a `search` landmark, so do not wrap it in a `<search>` of your own). It is not a `<form>`: Enter never submits a surrounding form. Words: `labels` or a new `UixLabelsProvider` group `searchBar` (`clear`, `submit`).

`.uix-searchbar` gains the parts it needs: `.uix-searchbar__clear` (inside the field's end; where it is present the browser's own search × is not drawn, so hand-built markup keeps it), `.uix-searchbar--md` (keeps its submit button beside it on a phone), and a field with no submit button now takes the whole row (it used to stop 8 px short, at the empty button column's gap).
