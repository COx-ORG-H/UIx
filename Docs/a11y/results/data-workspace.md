# Manual SR Result — `data-workspace`

Component under test: DataWorkspace, `packages/react/src/components/DataWorkspace.tsx` (table, row model) with `Table.tsx` (`Th` `aria-sort`, `BulkBar`). Script: [`../scripts/data-workspace.md`](../scripts/data-workspace.md). Harness:
`tests/at-evidence/harness.html`. See `../manual-sr-protocol.md` (protocol 2).

**No person has run a screen reader against this component yet.** Every pairing below is `not-run`
and needs a human tester. What is recorded is automated: the accessibility tree and live regions in
Chromium (`tests/a11y/at-evidence.spec.mjs`), and NVDA's own speech when a script pressed the keys
on a CI runner (`.github/workflows/at-nvda.yml`), which is real NVDA output that nobody listened to.

## Header (machine-parsable)

```yaml
component: data-workspace
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
- `nvda-guidepup: fail`: [run 44725485902](https://github.com/COx-ORG-H/UIx/actions/runs/44725485902), 2026-11-20, NVDA portable (Guidepup 0.40.0) + Chrome for Testing on a GitHub `windows-latest` runner. Scored against the script's "Must convey" for the steps it covers: the sort is spoken ("sorted ascending"), but a focused row is announced as "row, focused" and ArrowDown as "row", with none of its cells (script steps 5–6). Nobody listened; a person must confirm before any of this counts as `nvda-chrome`.

## Transcript

Nobody has run a pairing yet. The rows below are NVDA's own speech from the automated run, verbatim and in order ("on arrival" first), with the phrases separated by " / ". The keys were sent through NVDA; nobody listened.

| Step | Pairing | Heard | Verdict |
|------|---------|-------|---------|
| DataWorkspace: the first row, ArrowDown, Tab to its checkbox, Space | NVDA (Guidepup, automated) + Chrome for Testing | "row, focused" / "row" / "Select all rows on this page, column 1, Select INC-1002, check box, not checked" / "checked" | see header |
| DataWorkspace: Enter on the Priority header button | NVDA (Guidepup, automated) + Chrome for Testing | "Priority, button, focused" / "sorted ascending" | see header |

## Checklist results

| # | Item | NVDA+Chrome | JAWS+Chrome | JAWS+Edge | VO macOS | VO iOS | TalkBack | NVDA+FF | Narrator | Automated | Notes |
|---|------|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessible name | not run | not run | not run | not run | not run | not run | not run | not run | Table "Incidents"; header buttons "Title" / "Priority" / "Assignee"; checkboxes "Select all rows on this page", "Select INC-…"; links "Open INC-…". | |
| 2 | Role | not run | not run | not run | not run | not run | not run | not run | not run | Native `table` (not `grid`), `columnheader`, `cell`, `checkbox`, `link`, `toolbar` "Bulk actions". | |
| 3 | Value / state announced | not run | not run | not run | not run | not run | not run | not run | not run | `aria-sort` ascending → descending on the header cell; select-all `checked=mixed` after one row; checked after Space on a row checkbox. | |
| 4 | Focus order = visual order | not run | not run | not run | not run | not run | not run | not run | not run | One row has `tabindex="0"`; the row checkbox is the next Tab stop after the row; Shift+Tab reaches the header buttons. | |
| 5 | Full keyboard operability | not run | not run | not run | not run | not run | not run | not run | not run | ArrowDown / End move the row tab stop and focus; Enter runs the row action; Space on a row only stops scrolling. | |
| 6 | Focus-visible ring | not run | not run | not run | not run | not run | not run | not run | not run | not asserted (covered by the axe and focus-ring suites, not this spec). | |
| 7 | aria-live on async | not run | not run | not run | not run | not run | not run | not run | not run | gap: the bulk count "N selected" is not a live region (asserted: no `status` in the toolbar). | |
| 8 | Reduced-motion honored | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here; the global guard is in `tests/a11y/motion-policy.spec.mjs`. | |

## Known issues

- NVDA (automated run 44725485902) announced a focused row as "row, focused" and the next one as "row", with no cell content, so the row model gives an NVDA user no idea which row they are on. Chromium does compute the row's name from its cells (the spec's snapshot shows it); NVDA does not speak a focused `tr`'s name. The likely fix is a grid / treegrid row model or focus on a named cell, which is a design change: needs a ticket and a human NVDA + JAWS pass first.
- The selection count is not announced: "N selected" in the `BulkBar` is plain text and the bar mounts only once a row is selected, so a live region added inside it would be inserted with its content. A fix belongs in DataWorkspace (a persistent polite region fed by `labels.selected`), with this script re-run. Open: needs a ticket.
- A focused row is named by all its cells and repeats the ID three times ("Select INC-1001 INC-1001 Open INC-1001 Printer on floor 3 offline P2 Amra Kovač"). Whether this is too verbose is for the manual pass to judge.
- Whether NVDA, JAWS and VoiceOver speak the `aria-sort` change while focus stays on the header button is unverified (script steps 3–4).

## Summary

Not Stable-ready: both T1 pairings (NVDA + Chrome, JAWS + Chrome) are `not-run`. The semantics the
readers depend on are in place and asserted on every PR. Still needed from a person, in this order:
NVDA + Chrome, JAWS + Chrome, JAWS + Edge, VoiceOver + Safari (macOS), then VoiceOver iOS and
TalkBack, NVDA + Firefox and a Narrator smoke check, each through the script, with the transcript
table filled from what was actually heard.
