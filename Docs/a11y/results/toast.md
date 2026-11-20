# Manual SR Result — `toast`

Component under test: Toast and live regions, `packages/react/src/components/Toast.tsx` (`Toast`, `Toaster`) and `toast-store.ts`. Script: [`../scripts/toast.md`](../scripts/toast.md). Harness:
`tests/at-evidence/harness.html`. See `../manual-sr-protocol.md` (protocol 2).

**No person has run a screen reader against this component yet.** Every pairing below is `not-run`
and needs a human tester. What is recorded is automated: the accessibility tree and live regions in
Chromium (`tests/a11y/at-evidence.spec.mjs`), and NVDA's own speech when a script pressed the keys
on a CI runner (`.github/workflows/at-nvda.yml`), which is real NVDA output that nobody listened to.

## Header (machine-parsable)

```yaml
component: toast
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
- `nvda-guidepup: pass`: [run 44734650775](https://github.com/COx-ORG-H/UIx/actions/runs/44734650775), 2026-11-20, NVDA portable (Guidepup 0.40.0) + Playwright chromium 149.0.7827.55 (headed) on a GitHub `windows-latest` runner; earlier runs 44725485902, 44733256135 and 44734133463 heard the same. Scored against the script's "Must convey" for the steps it covers: the success toast spoken exactly once ("Incident INC-1002 saved"), the error at once as an alert, exactly once ("alert, Could not save INC-1002. Try again."). Nobody listened; a person must confirm before any of this counts as `nvda-chrome`.

## Transcript

Nobody has run a pairing yet. The rows below are NVDA's own speech from run 44734650775, one row per key or group of keys, verbatim and in order ("arrival" is what NVDA said on landing), with the phrases separated by " / ". The keys were sent through NVDA; nobody listened.

| Step | Pairing | Heard | Verdict |
|------|---------|-------|---------|
| Toast: Enter | NVDA (Guidepup, automated) + Playwright chromium 149.0.7827.55 | (arrival) "Show success toast, button, focused" / "Incident INC-1002 saved" | expected |
| Toast: Enter | NVDA (Guidepup, automated) + Playwright chromium 149.0.7827.55 | (arrival) "Show error toast, button, focused" / "alert, Could not save INC-1002. Try again." | expected |

## Checklist results

| # | Item | NVDA+Chrome | JAWS+Chrome | JAWS+Edge | VO macOS | VO iOS | TalkBack | NVDA+FF | Narrator | Automated | Notes |
|---|------|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessible name | not run | not run | not run | not run | not run | not run | not run | not run | Region "Notifications"; "Dismiss" and "Undo" buttons. | |
| 2 | Role | not run | not run | not run | not run | not run | not run | not run | not run | `region` landmark; persistent `status`; an error toast is `alert`; a polite toast inside a Toaster is not a second live region. | |
| 3 | Value / state announced | not run | not run | not run | not run | not run | not run | not run | not run | A loading toast is `aria-busy` until the promise settles. | |
| 4 | Focus order = visual order | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here (focus moves after Dismiss are in `packages/react/src/toast-store-dom.test.mjs`). | |
| 5 | Full keyboard operability | not run | not run | not run | not run | not run | not run | not run | not run | Undo reachable and operable with Enter; it undoes and does not commit. | |
| 6 | Focus-visible ring | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |
| 7 | aria-live on async | not run | not run | not run | not run | not run | not run | not run | not run | The polite region exists, empty, before any toast; a success toast lands in it exactly once; an error toast is `aria-live="assertive"`; a promise toast speaks "Exporting 8 incidents…" then "Export ready". | |
| 8 | Reduced-motion honored | not run | not run | not run | not run | not run | not run | not run | not run | not asserted here. | |

## Known issues

- Fixed in this change (#302): in a React StrictMode build the announce effect ran twice, so the polite region held "Incident INC-1002 saved Incident INC-1002 saved". A per-instance ref now guards it; `tests/a11y/at-evidence.spec.mjs` and `toast-store-dom.test.mjs` cover it, and the spec failed without the fix.
- Three toasts in quick succession are joined into one announcement by design; how each reader speaks the joined text is unverified (script step 7).

## Summary

Not Stable-ready: both T1 pairings (NVDA + Chrome, JAWS + Chrome) are `not-run`. The semantics the
readers depend on are in place and asserted on every PR. Still needed from a person, in this order:
NVDA + Chrome, JAWS + Chrome, JAWS + Edge, VoiceOver + Safari (macOS), then VoiceOver iOS and
TalkBack, NVDA + Firefox and a Narrator smoke check, each through the script, with the transcript
table filled from what was actually heard.
