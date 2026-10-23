---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**No browser dropdown anywhere in UIx** (HAR-1575, operator review 2026-10-07). `RuleBuilder` (the all/any combinator, each condition's field and operator, each action's type), `BrandProfiles` (the profile) and `FilterPopover` (`type="select" | "enum" | "boolean"`) render the kit `Select` instead of a native `<select>`; values, events and labels are unchanged, and every choice is keyboard-driven as in `Select`. A rule builder's field and operator columns now grow to their longest label before the value column takes the rest, so "is greater than" is no longer cut off. The docs and `tables.html` use the real Select markup (its saved-view menu and its inline priority and assignee edits included), and the docs' Select specimens fire `input` and `change` on their form proxy like the React one. Gates: `packages/react/src/no-native-select.test.mjs` (static: React sources, docs, guide and every tokens page) and a sweep of every explorer route in both themes in `tests/a11y/a11y.spec.mjs` (runtime).
