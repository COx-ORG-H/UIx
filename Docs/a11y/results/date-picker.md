# Manual SR Result — `date-picker`

Component under test: DatePicker, `packages/react/src/components/DatePicker.tsx` with `DateFieldParts.tsx` (`MonthCalendar`, `useFieldPopover`). Script: [`../scripts/date-picker.md`](../scripts/date-picker.md). Harness:
`tests/at-evidence/harness.html`. See `../manual-sr-protocol.md` (protocol 2).

**No person has run a screen reader against this component yet.** Every pairing below is `not-run`
and needs a human tester. What is recorded is automated: the accessibility tree and live regions in
Chromium (`tests/a11y/at-evidence.spec.mjs`), and NVDA's own speech when a script pressed the keys
on a CI runner (`.github/workflows/at-nvda.yml`), which is real NVDA output that nobody listened to.

## Header (machine-parsable)

```yaml
component: date-picker
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
- `nvda-guidepup: fail`: [run 44725485902](https://github.com/COx-ORG-H/UIx/actions/runs/44725485902), 2026-11-20, NVDA portable (Guidepup 0.40.0) + Chrome for Testing on a GitHub `windows-latest` runner. Scored against the script's "Must convey" for the steps it covers: ArrowDown in the field spoke "Calendar, dialog", but neither the chosen day nor the day ArrowLeft moved to was named: "out of toggle button, toggle button, not pressed" (script steps 3–4). Escape returned to the field and NVDA read it. Nobody listened; a person must confirm before any of this counts as `nvda-chrome`.

## Transcript

Nobody has run a pairing yet. The rows below are NVDA's own speech from the automated run, verbatim and in order ("on arrival" first), with the phrases separated by " / ". The keys were sent through NVDA; nobody listened.

| Step | Pairing | Heard | Verdict |
|------|---------|-------|---------|
| DatePicker: Due date, ArrowDown opens the calendar, ArrowLeft, Escape | NVDA (Guidepup, automated) + Chrome for Testing | "Due date, edit, focused, Weekdays only, 20 slash 11 slash 2026" / "Calendar, dialog" / "out of toggle button, toggle button, not pressed" / "Due date, edit, Weekdays only, 20 slash 11 slash 2026" | see header |

## Checklist results

| # | Item | NVDA+Chrome | JAWS+Chrome | JAWS+Edge | VO macOS | VO iOS | TalkBack | NVDA+FF | Narrator | Automated | Notes |
|---|------|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessible name | not run | not run | not run | not run | not run | not run | not run | not run | Textbox "Due date" described by "Weekdays only"; button "Change date, Friday, 20 November 2026"; dialog "Calendar"; day buttons named with the full date; "Show previous month" / "Show next month". | |
| 2 | Role | not run | not run | not run | not run | not run | not run | not run | not run | `textbox`, `button`, `dialog`, `group` (the month), day `button`s. | |
| 3 | Value / state announced | not run | not run | not run | not run | not run | not run | not run | not run | Chosen day `aria-pressed`; today `aria-current="date"`; weekends and days before `min` disabled; `aria-invalid="true"` and an `alert` for "31/02/2026", the alert also in the field's description. | |
| 4 | Focus order = visual order | not run | not run | not run | not run | not run | not run | not run | not run | Opening puts focus on the chosen day; Escape returns it to the button the calendar was opened from; Enter from the field's calendar returns it to the field. | |
| 5 | Full keyboard operability | not run | not run | not run | not run | not run | not run | not run | not run | Arrows by day and week, PageDown by month, Enter picks, Escape closes. | |
| 6 | Focus-visible ring | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |
| 7 | aria-live on async | not run | not run | not run | not run | not run | not run | not run | not run | The month name is a polite live region ("December 2026" after PageDown); the invalid-date message is `role="alert"`. | |
| 8 | Reduced-motion honored | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |

## Known issues

- NVDA (automated run 44725485902): with the calendar open, NVDA said "Calendar, dialog" and, after ArrowLeft, "out of toggle button, toggle button, not pressed": the focused day's name ("Thursday, 19 November 2026") was not spoken. Needs a human NVDA pass to confirm; if it holds, it fails item 1 for NVDA.
- Whether readers say that 18 November is today (`aria-current="date"`) is unverified (script step 5).
- Unavailable days take focus by design and must be announced as unavailable (script step 6).

## Summary

Not Stable-ready: both T1 pairings (NVDA + Chrome, JAWS + Chrome) are `not-run`. The semantics the
readers depend on are in place and asserted on every PR. Still needed from a person, in this order:
NVDA + Chrome, JAWS + Chrome, JAWS + Edge, VoiceOver + Safari (macOS), then VoiceOver iOS and
TalkBack, NVDA + Firefox and a Narrator smoke check, each through the script, with the transcript
table filled from what was actually heard.
