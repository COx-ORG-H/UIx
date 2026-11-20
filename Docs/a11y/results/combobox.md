# Manual SR Result — `combobox`

Component under test: Combobox and EntityPicker, `packages/react/src/components/Combobox.tsx`; EntityPicker (`EntityPicker.tsx` over `SearchSuggest.tsx`, styled by `search-suggest.css`) is recorded here because the study paired it with Combobox. Script: [`../scripts/combobox.md`](../scripts/combobox.md). Harness:
`tests/at-evidence/harness.html`. See `../manual-sr-protocol.md` (protocol 2).

**No person has run a screen reader against this component yet.** Every pairing below is `not-run`
and needs a human tester. What is recorded is automated: the accessibility tree and live regions in
Chromium (`tests/a11y/at-evidence.spec.mjs`), and NVDA's own speech when a script pressed the keys
on a CI runner (`.github/workflows/at-nvda.yml`), which is real NVDA output that nobody listened to.

## Header (machine-parsable)

```yaml
component: combobox
protocol: 2
uix-version: 2.70.0
tester: none
date: 2026-11-20
nvda-chrome: not-run
jaws-chrome: not-run
jaws-edge: not-run
voiceover-safari: not-run
voiceover-ios: not-run
talkback-chrome: not-run
nvda-firefox: not-run
narrator-edge: not-run
automated-tree: pass
nvda-guidepup: fail
```

- `automated-tree: pass`: `tests/a11y/at-evidence.spec.mjs` passed in Chromium, light and dark, at
  2.70.0 plus this change, on 2026-11-20 (local run and PR #302's CI).
- `nvda-guidepup: fail`: [run 44725485902](https://github.com/COx-ORG-H/UIx/actions/runs/44725485902), 2026-11-20, NVDA portable (Guidepup 0.40.0) + Chrome for Testing on a GitHub `windows-latest` runner. Scored against the script's "Must convey" for the steps it covers: Combobox: options with position, the skipped disabled option, and on Enter "Category, combo box, collapsed, required, … Type to filter, Email". EntityPicker: after typing and ArrowDown NVDA said "Assignee. Search, list", not the option, and never spoke the result count (script step 7). Nobody listened; a person must confirm before any of this counts as `nvda-chrome`.

## Transcript

Nobody has run a pairing yet. The rows below are NVDA's own speech from the automated run, verbatim and in order ("on arrival" first), with the phrases separated by " / ". The keys were sent through NVDA; nobody listened.

| Step | Pairing | Heard | Verdict |
|------|---------|-------|---------|
| Combobox: Category, ArrowDown twice, Enter | NVDA (Guidepup, automated) + Chrome for Testing | "Laptop, list item, focused, 1 of 5" / "Printer, not selected, 2 of 5" / "SOFTWARE, grouping" / "Category, combo box, collapsed, required, has auto complete, editable, Type to filter, Email" | see header |
| EntityPicker: Assignee, type "am", ArrowDown, Enter | NVDA (Guidepup, automated) + Chrome for Testing | "Assignee, combo box, focused, expanded, has auto complete, editable, Choose..., blank" / "a" / "m" / "Assignee. Search, list" / "Assignee: Amra Kovač. Change, button" | see header |

## Checklist results

| # | Item | NVDA+Chrome | JAWS+Chrome | JAWS+Edge | VO macOS | VO iOS | TalkBack | NVDA+FF | Narrator | Automated | Notes |
|---|------|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessible name | not run | not run | not run | not run | not run | not run | not run | not run | Combobox "Category" with description "Type to filter"; listbox "Category"; EntityPicker combobox "Assignee", option "Amra Kovač, IT › Service desk", buttons "Assignee: Amra Kovač. Change" and "Clear Amra Kovač". | |
| 2 | Role | not run | not run | not run | not run | not run | not run | not run | not run | `combobox`, `listbox`, `group` "Hardware" / "Software", `option`, `status`. | |
| 3 | Value / state announced | not run | not run | not run | not run | not run | not run | not run | not run | `aria-required="true"`, `aria-expanded` false → true (opens on focus), disabled "Monitor" `aria-disabled`, chosen option `aria-selected="true"` on return. | |
| 4 | Focus order = visual order | not run | not run | not run | not run | not run | not run | not run | not run | not asserted beyond focus staying in the field while the list is open. | |
| 5 | Full keyboard operability | not run | not run | not run | not run | not run | not run | not run | not run | ArrowDown skips the disabled option; Enter chooses; Escape restores the text; EntityPicker ArrowDown + Enter chooses, a failed search offers a Retry row. | |
| 6 | Focus-visible ring | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |
| 7 | aria-live on async | not run | not run | not run | not run | not run | not run | not run | not run | The no-match status region is mounted empty from the start and says "No matching category"; EntityPicker's polite count after a search. | |
| 8 | Reduced-motion honored | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |

## Known issues

- EntityPicker, NVDA (automated run 44725485902): after typing "am" and ArrowDown, NVDA said "Assignee. Search, list" instead of the option "Amra Kovač", and the polite result count was not spoken. Needs a human NVDA pass to confirm before a fix.
- Combobox clears its text when focus returns to a filled field (it opens with the full list); the chosen option is the active, selected one but the edit field reads blank. Script step 4 decides per reader whether that is a fail of item 3.
- EntityPicker's count says "1 results": `labels.results` is `{count} results` with no plural form. Plural-aware labels are a separate work package in flight; the spec accepts either form until it lands.

## Summary

Not Stable-ready: both T1 pairings (NVDA + Chrome, JAWS + Chrome) are `not-run`. The semantics the
readers depend on are in place and asserted on every PR. Still needed from a person, in this order:
NVDA + Chrome, JAWS + Chrome, JAWS + Edge, VoiceOver + Safari (macOS), then VoiceOver iOS and
TalkBack, NVDA + Firefox and a Narrator smoke check, each through the script, with the transcript
table filled from what was actually heard.
