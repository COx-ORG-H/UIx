# ADR-0004: A free-text mode on SearchSuggest

**Status:** Accepted

**Date:** 2026-10-23

**Decision owners:** UIx maintainers
**Scope:** `@tensor_1/react` `SearchSuggest` (`freeText`), `search-suggest.css`
**Records:** TENSOR's device make/model plan, decision DR-7 (resolution D8; slice DF-06, Linear HAR-2465). CI-prefill CP-03 has the same need and uses the same mode.

## Context

TENSOR wants a text field that offers known spellings (a manufacturer, a library name) while the person types, and keeps whatever they typed when nothing fits. `SearchSuggest`, as shipped, is a search box: Enter opens the first row when none is active, and with no rows Enter is not prevented, so inside a `<form>` it submits the form. `Combobox` is a closed set (unmatched text reverts on blur), and `EntityPicker` holds a record, not text. None of them can be a free-text value.

## Decision

`SearchSuggest` gains a `freeText` prop instead of a new export: the list, rows, states, placement and words are the same component, and only the contract of the value changes.

- The value is the text. Enter without an active row keeps it, closes the list and is always `preventDefault`ed, so it never submits the enclosing form, also while `loading`.
- No row is picked unless the person moves to it (ArrowDown / ArrowUp, then Enter) or clicks it. Choosing a row puts its title in the field through `onValueChange` (and still calls `onSelect`, now optional) without submitting.
- Blur, Tab and Escape keep the text. A second Escape does not clear it (it is a value, not a query) and is left to what is around the field.
- No magnifier is drawn; the field is a value field.
- The search mode (`freeText` off) is unchanged, and so are `Combobox` and `EntityPicker`.

## Consequences

- One component to style and test for "text with suggestions" and "search and jump".
- Out of scope for this decision (kept as P2 follow-ups): a second Escape restoring the last committed value, right-aligned row meta, and a non-option note row in free-text mode.
- Gates: `packages/react/src/search-suggest-free-text-dom.test.mjs` (the six cases of HAR-2465, each in a `<form>`) and the free-text cases of `tests/a11y/form-fields.spec.mjs` (Enter in a real form with a submit spy).
