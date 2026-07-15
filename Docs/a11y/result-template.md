# Manual SR Result — `<component-id>`

Copy this file to `results/<component-id>.md` and fill it in. The `component-id` is the
lowercase basename of the component's CSS file in
`packages/tokens/styles/components/` (e.g. `button`, `modal`). See `../manual-sr-protocol.md`.

## Header (machine-parsable)

Keep this fenced block intact. Every line is `key: value`; do not rename, reorder, or remove
keys. Per-tier verdicts are one of `pass` | `fail` | `na`.

```yaml
component: <id>
uix-version: <x.y.z>
tester: <name>
date: <YYYY-MM-DD>
nvda-firefox: pass|fail|na
jaws-chrome: pass|fail|na
voiceover-safari: pass|fail|na
```

Header key reference:

- `component` — component id (lowercase CSS-file basename; matches A11Y-2 / BREADTH-1).
- `uix-version` — value of `version` in `packages/tokens/package.json` at test time.
- `tester` — person who ran the manual test.
- `date` — test date, ISO `YYYY-MM-DD`.
- `nvda-firefox` — Tier 1 verdict (NVDA + Firefox, Windows). REQUIRED for Stable.
- `jaws-chrome` — Tier 2 verdict (JAWS + Chrome, Windows).
- `voiceover-safari` — Tier 3 verdict (VoiceOver + Safari, macOS).

## Checklist results

One row per checklist item from `manual-sr-protocol.md` §2. Mark each tier `pass` / `fail` /
`na`. Add a one-line note for every `fail` or `na`.

| # | Item | NVDA+FF | JAWS+Chrome | VO+Safari | Notes |
|---|------|---------|-------------|-----------|-------|
| 1 | Accessible name | | | | |
| 2 | Role | | | | |
| 3 | Value / state announced | | | | |
| 4 | Focus order = visual order | | | | |
| 5 | Full keyboard operability (Tab/Shift-Tab/Enter/Space/Esc/arrows) | | | | |
| 6 | Focus-visible ring | | | | |
| 7 | aria-live on async | | | | |
| 8 | Reduced-motion honored | | | | |

## Summary

<Overall verdict and any follow-up issues / linked tickets.>
