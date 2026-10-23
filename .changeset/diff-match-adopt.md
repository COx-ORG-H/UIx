---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`DiffViewer` for people, `MatchReview` adopt mode** (HAR-1369, MOTUS B-A9):

- `DiffViewer` `labelFor(path)` names an entry ("Authors" for `$.authors`; a string also names its regions and buttons), `renderValue(value, path, side)` shows a value as the product does instead of `JSON.stringify`, and `provenance(path, side)` says under each version where it came from. Without them nothing changes. Words can come from `UixLabelsProvider` `diffViewer`.
- `MatchReview` `fieldMode="adopt"`: per candidate (`candidateLabel`), a table of the record now against the candidate, field by field, with a checkbox where the values differ ("Same" where not); the Adopt button calls `onAdopt(candidateId, fieldIds)` and is busy only once it has run 300 ms; a failure keeps the choice and says so; `provenance(candidate)` opens in a disclosure; Dismiss stays. On a phone each field stacks as a block (the table keeps its roles). New labels for the mode; all words can come from `UixLabelsProvider` `matchReview`. The default `decide` mode is unchanged.
