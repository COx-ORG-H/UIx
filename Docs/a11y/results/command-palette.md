# Manual SR Result — `command-palette`

Component under test: CommandPalette, `packages/react/src/components/CommandPalette.tsx`. Script: [`../scripts/command-palette.md`](../scripts/command-palette.md). Harness:
`tests/at-evidence/harness.html`. See `../manual-sr-protocol.md` (protocol 2).

**No person has run a screen reader against this component yet.** Every pairing below is `not-run`
and needs a human tester. What is recorded is automated: the accessibility tree and live regions in
Chromium (`tests/a11y/at-evidence.spec.mjs`), and NVDA's own speech when a script pressed the keys
on a CI runner (`.github/workflows/at-nvda.yml`), which is real NVDA output that nobody listened to.

## Header (machine-parsable)

```yaml
component: command-palette
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
nvda-guidepup: pass
```

- `automated-tree: pass`: `tests/a11y/at-evidence.spec.mjs` passed in Chromium, light and dark, at
  2.70.0 plus this change, on 2026-11-20 (local run and PR #302's CI).
- `nvda-guidepup: pass`: [run 44734650775](https://github.com/COx-ORG-H/UIx/actions/runs/44734650775), 2026-11-20, NVDA portable (Guidepup 0.40.0) + Playwright chromium 149.0.7827.55 (headed) on a GitHub `windows-latest` runner; earlier runs 44725485902, 44733256135 and 44734133463 heard the same. Scored against the script's "Must convey" for the steps it covers: on arrival the active option with its shortcut and position ("1 of 6"); typing speaks the count ("1 result"); ArrowDown speaks "Assign to me A, A, 2 of 6". Known gap: after clearing the query the final count ("6 results") is not spoken. Nobody listened; a person must confirm before any of this counts as `nvda-chrome`.

## Transcript

Nobody has run a pairing yet. The rows below are NVDA's own speech from run 44734650775, one row per key or group of keys, verbatim and in order ("arrival" is what NVDA said on landing), with the phrases separated by " / ". The keys were sent through NVDA; nobody listened.

| Step | Pairing | Heard | Verdict |
|------|---------|-------|---------|
| CommandPalette (in place): type:rep | NVDA (Guidepup, automated) + Playwright chromium 149.0.7827.55 | (arrival) "Create incident Control plus I, list item, focused, selected, Control plus, I, 1 of 6" / "PAGES, grouping" / "3 results" / "1 result" | expected |
| CommandPalette (in place): Backspace, Backspace, Backspace | NVDA (Guidepup, automated) + Playwright chromium 149.0.7827.55 | "3 results" / "4 results" / "ACTIONS, grouping" | known issue |
| CommandPalette (in place): ArrowDown | NVDA (Guidepup, automated) + Playwright chromium 149.0.7827.55 | "Assign to me A, A, 2 of 6" | expected |

## Checklist results

| # | Item | NVDA+Chrome | JAWS+Chrome | JAWS+Edge | VO macOS | VO iOS | TalkBack | NVDA+FF | Narrator | Automated | Notes |
|---|------|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessible name | not run | not run | not run | not run | not run | not run | not run | not run | Combobox "Commands in place" / "Commands" (dialog); listbox of the same name; groups "Actions", "Pages"; options named with their shortcut ("Create incident Control+I"). | |
| 2 | Role | not run | not run | not run | not run | not run | not run | not run | not run | `combobox` (expanded), `listbox`, `group`, `option`, `status`; the dialog palette is a native `<dialog>`. | |
| 3 | Value / state announced | not run | not run | not run | not run | not run | not run | not run | not run | Active option `aria-selected="true"` through `aria-activedescendant`; disabled option `aria-disabled`; `aria-keyshortcuts="Control+I"`. | |
| 4 | Focus order = visual order | not run | not run | not run | not run | not run | not run | not run | not run | Opening the dialog puts focus in the field; Escape returns it to "Open command palette". | |
| 5 | Full keyboard operability | not run | not run | not run | not run | not run | not run | not run | not run | Typing filters; ArrowDown and End move the active option, End skips the disabled last item; Escape closes. | |
| 6 | Focus-visible ring | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |
| 7 | aria-live on async | not run | not run | not run | not run | not run | not run | not run | not run | Polite count "6 results", then "1 result" (singular) after typing "rep". | |
| 8 | Reduced-motion honored | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |

## Known issues

- NVDA (automated run 44733256135): clearing the query spoke the intermediate counts ("3 results", "4 results") and then the new active option's group ("ACTIONS, grouping"), but not the final "6 results". The polite count lost to the active-option change. Needs a human NVDA pass to confirm.
- Active-option speech through `aria-activedescendant` is unverified on VoiceOver macOS, where support has varied (script step 3).

## Summary

Not Stable-ready: both T1 pairings (NVDA + Chrome, JAWS + Chrome) are `not-run`. The semantics the
readers depend on are in place and asserted on every PR. Still needed from a person, in this order:
NVDA + Chrome, JAWS + Chrome, JAWS + Edge, VoiceOver + Safari (macOS), then VoiceOver iOS and
TalkBack, NVDA + Firefox and a Narrator smoke check, each through the script, with the transcript
table filled from what was actually heard.
