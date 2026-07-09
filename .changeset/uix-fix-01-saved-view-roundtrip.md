---
"@tensor_1/react": patch
---

**UIX-FIX-01 — table engine: saved views no longer silently match zero rows.**

`parseView` was lossy: it hard-coded every restored filter to `kind: 'text'`, stringified all values, and inferred array-vs-scalar from whether the serialized text contained a `|` — which collapsed single-value enum arrays (`['open']` → `'open'`). `matchFilter` had no `date` branch, so date ops fell through to the numeric path where `asNum(isoString)` is `NaN` and matched nothing. After a saved-view URL round-trip, every numeric / enum / boolean / date filter silently matched zero rows (booleans were worse — `is: false` restored to the truthy string `'false'` and matched the wrong rows).

Fixes:

- `serializeView` now carries each filter's `kind` in the token (`field~kind~op~value`) and escapes field/value so a literal `~`, `|`, or `,` inside a value survives the round-trip.
- `parseView` restores the `kind` verbatim and re-types values from it (number, boolean, date), deciding array-vs-scalar from the **op** (`isAnyOf` / `isNoneOf` / `between` are arrays) rather than from the text — so single-value enums stay arrays.
- `matchFilter` gains a `date` branch that compares by instant via a new `asTime` coercion (`Date` | epoch-ms | ISO/date string).
- Legacy kind-less URLs (`field~op~value`) still parse — the kind is inferred from the op — so existing saved-view links keep working.

Public component/prop APIs are unchanged. The serialized URL format gained a `kind` segment; the parser reads both the new and the old format.
