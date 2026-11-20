---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Search and sort follow the locale (roadmap #15). One fold and one collator now serve every kit search and sort, so they agree on what a query finds and where a row goes.

- `foldForSearch(text, locale?, { crossScript? })` lower-cases and strips diacritics as before. đ now folds to "dj", the way people in Bosnia and Herzegovina, Croatia and Serbia type it ("djordje" finds "Đorđe"); text with đ also answers to "d" ("dorde", as in 2.70). æ → ae, œ → oe, þ → th, and the digraph code points ǆ ǉ ǌ → dz lj nj join ß → ss, ø → o, ł → l, ı → i. With `crossScript` (the default for `bs`, `hr`, `cnr`, `sr`, `sh`), Serbian Cyrillic folds to Latin, with љ → lj, њ → nj, џ → dz, so a Latin query finds Cyrillic text and the other way round. In German, ä/ö/ü also answer to "ae"/"oe"/"ue". `foldForSearch` still returns `FoldedText`; only the folded text of đ changed.
- New `compareFor(locale)`: a cached `Intl.Collator` comparator with numbers by value ("INC-2" before "INC-10"), case-insensitive, that falls back to the runtime's collation for an unknown tag. New `searchMatcher(query, locale?, options?)`: a folded "contains" test, for a DataWorkspace that searches on the client. New type `FoldOptions`.
- The kit uses them everywhere it searches or sorts text: `filterCommandItems` (CommandPalette ranking), `filterComboboxOptions` / `filterComboboxItems` (Combobox, which now folds diacritics too), `filterSelectItems`, `selectOptionMatches` and `typeahead` (Select), `searchSegments` (SearchSuggest, EntityPicker and the palette's marks), TagInput suggestions and duplicates, FilterEditor's value search, the Menu, Tree and OrgChart typeahead, emoji search, and the table engine's `multiSort`, `searchRows`, `matchFilter` / `applyFilters` (`contains`, `startsWith`) and `highlightSegments`. Each pure function takes an optional `locale` argument; the components read it from `UixLabelsProvider` (its `locale`, then `dateFormat.locale`). `useTable` takes a `locale` option (default: the provider's) and `Highlighted` a `locale` prop (it stays server-safe).

Plain ASCII text matches and sorts exactly as before. Without a provider locale, sorts use the runtime's collation as they did.
