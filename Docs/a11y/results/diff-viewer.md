# Manual SR Result — `diff-viewer`

Component under test: DiffViewer, `packages/react/src/components/DiffViewer.tsx`. Script: [`../scripts/diff-viewer.md`](../scripts/diff-viewer.md). Harness:
`tests/at-evidence/harness.html`. See `../manual-sr-protocol.md` (protocol 2).

**No person has run a screen reader against this component yet.** Every pairing below is `not-run`
and needs a human tester. What is recorded is automated: the accessibility tree and live regions in
Chromium (`tests/a11y/at-evidence.spec.mjs`), and NVDA's own speech when a script pressed the keys
on a CI runner (`.github/workflows/at-nvda.yml`), which is real NVDA output that nobody listened to.

## Header (machine-parsable)

```yaml
component: diff-viewer
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
- `nvda-guidepup: fail`: [run 44725485902](https://github.com/COx-ORG-H/UIx/actions/runs/44725485902), 2026-11-20, NVDA portable (Guidepup 0.40.0) + Chrome for Testing on a GitHub `windows-latest` runner. Scored against the script's "Must convey" for the steps it covers: the button and its state on arrival ("… toggle button, focused, not pressed") and the progress ("1 of 3 differences resolved.") were spoken; the new "pressed" state after Enter was not (script step 5). Nobody listened; a person must confirm before any of this counts as `nvda-chrome`.

## Transcript

Nobody has run a pairing yet. The rows below are NVDA's own speech from the automated run, verbatim and in order ("on arrival" first), with the phrases separated by " / ". The keys were sent through NVDA; nobody listened.

| Step | Pairing | Heard | Verdict |
|------|---------|-------|---------|
| DiffViewer: "Accept incoming for $.priority", Enter | NVDA (Guidepup, automated) + Chrome for Testing | "Accept incoming for $ dot priority, toggle button, focused, not pressed" / "1 of 3 differences resolved." | see header |

## Checklist results

| # | Item | NVDA+Chrome | JAWS+Chrome | JAWS+Edge | VO macOS | VO iOS | TalkBack | NVDA+FF | Narrator | Automated | Notes |
|---|------|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessible name | not run | not run | not run | not run | not run | not run | not run | not run | Region "Configuration differences"; group "Difference summary"; h3 "Conflicted 1", "Changed 2"; regions "Base / Current / Incoming value for $.priority"; group "Resolve $.priority"; buttons "Accept incoming for $.priority" etc. | |
| 2 | Role | not run | not run | not run | not run | not run | not run | not run | not run | `region`, `group`, `heading` level 3, toggle `button`s. | |
| 3 | Value / state announced | not run | not run | not run | not run | not run | not run | not run | not run | `aria-pressed` moves from "Mark pending" to "Accept incoming" on Enter. | |
| 4 | Focus order = visual order | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |
| 5 | Full keyboard operability | not run | not run | not run | not run | not run | not run | not run | not run | not asserted beyond a click; the buttons are native. | |
| 6 | Focus-visible ring | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |
| 7 | aria-live on async | not run | not run | not run | not run | not run | not run | not run | not run | Polite progress "0 of 3 differences resolved." → "1 of 3 differences resolved.". | |
| 8 | Reduced-motion honored | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |

## Known issues

- NVDA (automated run 44725485902): after Enter on "Accept incoming for $.priority" NVDA spoke the progress line but not the button's new "pressed" state. Needs a human NVDA pass to confirm.
- Each conflict adds three named `region`s (Base, Current, Incoming value), so a landmark list grows by three per conflict. Whether that helps or clutters is for the manual pass to judge (script step 3).

## Summary

Not Stable-ready: both T1 pairings (NVDA + Chrome, JAWS + Chrome) are `not-run`. The semantics the
readers depend on are in place and asserted on every PR. Still needed from a person, in this order:
NVDA + Chrome, JAWS + Chrome, JAWS + Edge, VoiceOver + Safari (macOS), then VoiceOver iOS and
TalkBack, NVDA + Firefox and a Narrator smoke check, each through the script, with the transcript
table filled from what was actually heard.
