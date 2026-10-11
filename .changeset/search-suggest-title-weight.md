---
"@tensor_1/tokens": patch
---

`SearchSuggest`: the matched letters of a result title stand out. `.uix-search-suggest__title` is now weight 400 (was 500), so the 700 of `.uix-search-suggest__match` reads as emphasis against it rather than as a slightly heavier run of the same text.

**Visible change:** every result title in a `SearchSuggest` list is drawn regular instead of medium, including the list an `EntityPicker` opens and lists with no query (recent items). The value an `EntityPicker` shows once a record is picked (`.uix-entity-picker__title`) stays 500, and the match weight in the context line stays 600. CSS only; no markup or API change.
