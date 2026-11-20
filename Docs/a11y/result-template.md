# Manual SR Result — `<component-id>`

Copy this file to `results/<component-id>.md` and fill it in. The `component-id` is the
lowercase basename of the component's CSS file in
`packages/tokens/styles/components/` (e.g. `button`, `data-workspace`). See `../manual-sr-protocol.md`
(protocol 2). `tests/a11y-results.test.mjs` checks the header below.

## Header (machine-parsable)

Keep this fenced block intact. Every line is `key: value`; do not rename, reorder, or remove keys.
Pairing verdicts are one of `pass` | `fail` | `na` | `not-run` (protocol §1). `not-run` means
nobody has run it: it needs a human tester.

```yaml
component: <id>
protocol: 2
uix-version: <x.y.z>
tester: <name, or "none" when only automated evidence is recorded>
date: <YYYY-MM-DD>
nvda-chrome: pass|fail|na|not-run
jaws-chrome: pass|fail|na|not-run
jaws-edge: pass|fail|na|not-run
voiceover-safari: pass|fail|na|not-run
voiceover-ios: pass|fail|na|not-run
talkback-chrome: pass|fail|na|not-run
nvda-firefox: pass|fail|na|not-run
narrator-edge: pass|fail|na|not-run
automated-tree: pass|fail|not-run
nvda-guidepup: pass|fail|not-run
```

Header key reference:

- `component`: component id (lowercase CSS-file basename; matches A11Y-2 / BREADTH-1).
- `protocol`: `2`. A file without it is a protocol-1 file (`results/button.md`).
- `uix-version`: `version` in `packages/tokens/package.json` at test time.
- `tester`: the person who ran the human pairings; `none` when every pairing is `not-run`.
- `date`: the date of the latest run recorded here, ISO `YYYY-MM-DD`.
- `nvda-chrome`, `jaws-chrome`: T1, required for Stable.
- `jaws-edge`, `voiceover-safari`: T2, recommended.
- `voiceover-ios`, `talkback-chrome`: T2, required for touch-relevant components.
- `nvda-firefox`: T3 (protocol 1's T1). `narrator-edge`: T3 smoke check.
- `automated-tree`: `tests/a11y/at-evidence.spec.mjs` (accessibility tree, names, states, live
  regions in Chromium). Never a substitute for a human pairing.
- `nvda-guidepup`: the NVDA speech capture of `.github/workflows/at-nvda.yml`. Never a substitute
  for `nvda-chrome`.

## Script

`../scripts/<component-id>.md`.

## Transcript

What each reader actually said, per script step. Leave a pairing out until someone has run it.

| Step | Pairing | Heard | Verdict |
|------|---------|-------|---------|

## Checklist results

One row per checklist item from `manual-sr-protocol.md` §2.

| # | Item | NVDA+Chrome | JAWS+Chrome | JAWS+Edge | VO macOS | VO iOS | TalkBack | NVDA+FF | Narrator | Automated | Notes |
|---|------|---|---|---|---|---|---|---|---|---|---|
| 1 | Accessible name | | | | | | | | | | |
| 2 | Role | | | | | | | | | | |
| 3 | Value / state announced | | | | | | | | | | |
| 4 | Focus order = visual order | | | | | | | | | | |
| 5 | Full keyboard operability | | | | | | | | | | |
| 6 | Focus-visible ring | | | | | | | | | | |
| 7 | aria-live on async | | | | | | | | | | |
| 8 | Reduced-motion honored | | | | | | | | | | |

## Known issues

<One line each, with a ticket or PR.>

## Summary

<Overall verdict, what still needs a human pass.>
