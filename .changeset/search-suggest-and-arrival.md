---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

SearchSuggest and `.uix-arrival`: "search and jump", the pattern behind Windows and Android Settings search (TENSOR HAR-763, for per-setting settings search).

- **`<SearchSuggest>`** is a search field with a result list underneath. Each row shows:
  - a **title**, with the matched letters in bold;
  - a **breadcrumb** (`meta`), where the middle crumbs truncate first so the outermost and innermost stay readable, and the full path is in the row's `title`;
  - up to two lines of **context** (`description`).
- **Keyboard and screen readers.** It follows the ARIA combobox pattern: focus stays in the field and `aria-activedescendant` names the active row.
  - ↑/↓ wrap. Home/End jump once a row is active.
  - Enter opens the active row, or the first row when none is active.
  - Escape closes the list, and a second Escape clears the text.
  - Each row is named "title, crumb › crumb" and described by its context.
  - An Enter or arrow key that belongs to an IME composition is left alone, and after Escape closes the list, Enter does not open a row the user can no longer see.
- **Optional slots:**
  - `heading` + `headingAction`, e.g. "Recently opened · Clear";
  - `footer`, a last row reachable by the arrow keys, e.g. "Show all 23 results";
  - `loading`, with a spinner in the field and the list;
  - `empty` and `error` states;
  - `status`, a polite live region, e.g. "8 results";
  - `shortcutHint`, a `/` badge in the empty field;
  - a clear button;
  - `size="lg"` for page-level search;
  - `inputRef`, to focus the field from a shortcut;
  - controlled `open`.
- **Matching.** `searchSegments(text, query)` and `foldForSearch(text)` fold case, diacritics and ß, so "ubersicht" marks "Übersicht" and "strasse" marks "Straße". The whole query is marked where it occurs; otherwise each word is marked where it starts a word. The consumer still decides which rows match.
- **`.uix-arrival`** is the "you are here" highlight for the element a link or result landed on. It tints the target for about 2.4 s and fades out. Under `prefers-reduced-motion` or forced colours it becomes a steady outline for 2 s. It sets `scroll-margin-block`, so a sticky header doesn't cover the target.
- **Tests:**
  - `search-suggest-dom.test.mjs` covers the ARIA contract and keyboard model;
  - `search-suggest-model.test.mjs` covers match folding;
  - `tests/a11y/search-suggest.spec.mjs` runs in the browser, in both themes:
    - axe on results, the recent list, loading and error;
    - the opaque popup surface;
    - middle-first truncation at 280 px;
    - the 2-line clamp;
    - the keyboard journey to a landed target;
    - the reduced-motion arrival.
- **Migration:** none. Both are new.
