# Phase 2 — Release loop + trust gates (ADR-0016)

**Status:** In progress (kicked off 2026-06-22)
**Owner:** Haris (direction) + Claude (architecture/implementation)
**Spec:** `D:\Development\Docs\adr\0016-uix-v2-supersedes-v1-public-npm-distribution.md` — Decisions **2** (contract-completeness gate), **6** (release loop + trust gates), **7** (governance).
**Phase of:** the UIx-elevation roadmap — Phase 0 identity → 1 publishable → **2 release+gates** → 3 TENSOR cutover → 4 content gaps → 5 prove on POSx + governance.

## Where we are (verified 2026-06-22)

- **Phase 0 (identity) — done.** `origin → github.com/COx-ORG-H/UIx` (repo migrated under the COx org per Decision 4). npm scope `@uix` named in both `package.json`s.
- **Phase 1 (publishable) — done.** Self-sufficient build: per-file `"use client"` (tsup `bundle:false` ESM + bundled CJS), pinned inner React install (`react/` has its own lockfile + `npm ci`), `@uix/react` clean export surface (commit `b13cb4a`).
- **Phase 2 (release + gates) — greenfield.** No `.github/`, no changesets, no VR/a11y/api-lock/smoke gates, no CODEOWNERS, no contract-change doc. `check-parity.mjs` guards token **values** only.
- **Human-gated remainder confirmed pending:** `@uix/tokens` is unpublished (npm 404); not logged into npm locally. Scope claim + `NPM_TOKEN` + portfolio-PAT secrets are human actions (ADR §7.6 / directory-governance §4).

## Layout note (post-S1)

As of S1 the repo is a **`packages/*` monorepo**: `@uix/tokens` → `packages/tokens/` (DTCG source, build, themes, scripts, tests, **and** the build-free styleguide showcase), `@uix/react` → `packages/react/`, root is a private workspace. Paths in the slice table below that read `tokens/`, `styles/`, `scripts/`, `tests/` are now under `packages/tokens/`. Root `index.html` is a redirect into the showcase.

## Directives for this push (2026-06-22)

1. **Gate strictness = full-strict (ADR-literal):** *no raw hex/px/z-index in component CSS* — every raw value is **tokenized or explicitly justified**, nothing silent.
2. **Scope = all autonomous infra in one push:** every repo-local Phase 2 deliverable; leave only the human-gated npm scope claim + secrets.

## Calibration findings (drive the design)

Component CSS today (`styles/components/*.css` + `styles/*.css`):

- **Raw colors: 3** — a scrim `rgba(0,0,0,.45)` (avatar), a knob `#fff` (switch), a one-off `#92400E` warning-fg (status-pill). Trivially gateable → tokenize.
- **Raw z-index: ~7** (`1`, `3`, `20`, `100`…) and **no `--uix-z-*` scale exists.** → introduce a z scale + migrate.
- **Raw px: 382 occurrences.** `1px ×111` (hairline borders), `2px ×33`, `3px ×22`, then spacing-scale dupes (`8 ×18`, `16 ×12`, `24`, `32`…) and unique layout geometry (`220/280/360/460/520/700/820px`).

**Two consequences for "full-strict, done right":**
- **Contract-class values get tokenized** — colors, and px that duplicate the spacing/radius/type scales (`tokens/base/space.json`, `size.json`, `typography.json`).
- **Geometry/borders get *justified*, not tokenized into the contract.** Minting `--uix-width-820` or tokenizing `1px` borders would pollute the `--uix-*` namespace with non-contract junk — that is worse design-system practice, not stricter. They live in a **reviewed allowlist the gate enforces** (a new unaccounted raw value still fails CI — Law 1).
- **Mapping is property-dependent:** `8px` → `--uix-space-2` (padding/gap) **but** `--uix-radius-sm` (border-radius); they collide by value. The migration must read property context per occurrence → no blind find-replace. A wrong map changes rendering silently → **needs the VR gate as a safety net first.**

## Slice plan (dependency order)

| # | Slice | Output | Gate / acceptance | Dep |
|---|---|---|---|---|
| S0 | **This plan + scope** | this doc | — | — |
| S1 | **Changesets** | `.changeset/config.json` (linked `@uix/tokens`+`@uix/react`), CHANGELOG generation, root workspace glob for package discovery (build keeps Phase-1 separate inner install) | `npx changeset status` resolves both packages | — |
| S2 | **Governance** (Decision 7) | `CODEOWNERS` over `tokens/`+`themes/`; `Docs/contract-change-process.md` | files present; CODEOWNERS paths valid | — |
| S3 | **API lock** | `react/api-extractor.json` + `etc/uix-react.api.md` baseline; `test:api` | api-extractor passes against committed report | Phase 1 build |
| S4 | **Smoke build** | `tests/smoke-consumer/` — minimal app importing `@uix/tokens` + `@uix/react`, builds via `npm pack` tarballs | `test:smoke` builds clean | Phase 1 build |
| S5 | **Visual regression** | Playwright config + specs over the static styleguide (`index.html`, `tables.html`, `dashboard.html`) in light+dark; golden snapshots of **current** rendering (the safety net) | `test:visual` green vs committed goldens | — |
| S6 | **a11y** | axe over the same static pages; `test:a11y` | no serious/critical violations (calibrated baseline) | S5 harness |
| S7 | **Tokenize migration** (full-strict) | new `--uix-z-*` scale in `tokens/base/effect.json` (+ baseline update); component CSS colors + scale-dupe px → `var(--uix-*)`; `tests/raw-value-allowlist.*` for justified geometry/borders | VR (S5) stays green through migration; `test:parity` green | S5, S8a |
| S8a | **Completeness gate (report)** | `scripts/check-contract.mjs` — structural categories present, every theme covers its tier, raw color/px/z scan with allowlist; runs in **report** mode | runs, prints violation count | S1–S2 |
| S8b | **Completeness gate (blocking)** | flip `check-contract` to exit 1; wire `test:contract` + `prepublishOnly` | exits 0 after S7 reaches zero-unjustified | S7 |
| S9 | **CI + release workflows** | `.github/workflows/ci.yml` (PR: `build:all → test:parity → test:contract → test:visual → test:a11y → test:api → test:smoke`); `release.yml` (publish-on-tag: gates as hard precondition → `changeset publish`, **inert until `NPM_TOKEN`**); `renovate.json` | workflows lint (`actionlint`); release job guarded on secret presence | S1,S3–S8 |
| S10 | **Human-action handoff** | checklist section below kept current | — | all |

## Human-action checklist (cannot be automated — ADR §7.6)

- [ ] Claim the **`@uix` org/scope on npmjs.com** (the placeholder ADR-0004 reserved); enable public access.
- [ ] Create an **npm automation token**; add as `NPM_TOKEN` secret on `COx-ORG-H/UIx` (or org-level).
- [ ] Add the **portfolio PAT** secret (bot pushes that retrigger downstream CI — ADR-0006 / fleet lesson) for Renovate automerge.
- [ ] **Bootstrap the VR goldens (S5):** run the `update-visual-goldens` workflow → download the `visual-goldens-linux` artifact → commit the `tests/visual/__screenshots__/*-linux.png`. The `visual` CI gate is red until these land (expected). Re-run after any intended rendering change to re-baseline. **NB:** the 2026-06-23 visual-a11y contrast pass changed the intended rendering (palette/labels/link underlines), so the first bootstrap will capture the *post-contrast* look as the baseline — no separate re-baseline needed for it. (`workflow_dispatch` needs the workflow registered on the default branch `master`; it's currently only on this feature branch.)
- [ ] First publish: tag `v2.0.0`; confirm the release workflow gates pass, then `@uix/tokens@2.0.0` + `@uix/react@2.0.0` resolve on npm.
- [ ] (Phase 3) Point TENSOR at the npm packages; hard-fail `uix-sync.mjs`.

## Status — end of kickoff session (2026-06-23)

**Done + verified + committed** (branch `feat/uix-v2-phase2-release-gates`, on top of Phase 1):
- **S0** plan · **S1** packages/* monorepo + linked Changesets · **S2** governance (CODEOWNERS + contract-change process) · **S3** api-extractor public-API lock (both entry points, LF, CI-verify green) · **S4** per-consumer smoke build (ESM/CJS/resolve/types) · **S5** Playwright VR harness (pinned container; Linux goldens bootstrap pending) · **S6** axe a11y gate (structural fixed; contrast/link calibrated) · **S7** full-strict tokenization (`ENFORCE_RAW=true`, 0 unjustified) · **S8** completeness gate (A structural + B theme-tier + **C raw-value scan now blocking**) · **S9** CI + publish-on-tag (inert-safe) + Renovate.
- Full CI gate sequence verified green from a clean install: `build:all → parity → contract → api → smoke`.

**S7 decisions (full-strict tokenization — done 2026-06-23):**
- *New tokens:* `--uix-scrim` (.5) + `--uix-scrim-strong` (.7) — standardized the four scrim opacities (peek `.4` / avatar `.45` → `.5`; lightbox `.7` kept as the strong rung; theme-invariant, no dark override). 6-rung semantic `--uix-z-*` ladder (raised 1 / sticky 3 / dropdown 10 / overlay 20 / tooltip 30 / toast 100) in `effect.json`; every rendered value preserved (tooltip 20→30 is invisible — nothing else occupies that band). `--uix-radius-xs` (4px) absorbs the 3/4/5px small radii (±1px, sub-perceptible). `--uix-warning-text` (light `#92400E`, dark `var(--uix-warning,#FCBB00)`) promotes the pill's hand-tuned amber into the contract and collapses its dark special-case rule.
- *Plan corrections (the originally-suggested maps were wrong):* `#fff` switch knob & avatar icon → `--uix-text-reverse` (white in **both** modes), **not** `--uix-surface` (flips to `#111` in dark → invisible knob). `#92400E` → the new `--uix-warning-text`, **not** `--uix-warning-fg` (that is `#1A1A1A`, near-black). True debt was **44** not 43: `check-contract`'s px scan used a `/g` regex with `.test()` (stateful `lastIndex`) and silently skipped `prose.css border-radius:4px` — fixed to a stateless `.match()`.
- *Justified (kept raw):* 11 component-intrinsic geometry values in `tests/raw-value-allowlist.json` (concentric inner radii `calc(--uix-radius-md - 3px)`, hairline `1px` pads, `38px` icon clearance, `-6px` thumb centering, `-1px` border overlap, `18px` emoji glyph). The gate loads it, routes matches to a justified log, fails on anything unlisted, and warns on stale entries. `'z'` added to `REQUIRED_CATEGORIES`.
- *Verified:* parity + contract + api + smoke green from a clean install; light+dark computed-value spot-checks (switch knob white in dark, warning pill `#92400E`/`#FCBB00`, modal backdrop `rgba(0,0,0,.5)`, radii 4px, tooltip z 30); a negative test confirms the gate exits 1 on an injected raw value.

**S5 decisions (Playwright VR — done 2026-06-23):**
- *Harness:* `playwright.config.mjs` + `tests/visual/styleguide.spec.mjs` — full-page snapshots of index/tables/dashboard × {light,dark}. Theme is seeded via `localStorage['uix-theme']` in an `addInitScript` (all three pages share that no-flash bootstrap), asserted on `[data-theme]`, `document.fonts.ready` awaited, animations disabled. Showcase JS is deterministic (no `Math.random`/`Date`/timers), so full-page captures are stable. `serve.json` (`cleanUrls:false`) stops `serve` from stripping `/index.html` → re-rooting the page's relative CSS (a 404 that silently unstyles the page — this also fixed a preview-time gotcha).
- *Goldens are Linux-only, bootstrap pending:* no local Docker, and Windows/macOS renders differ from the CI runner. The `visual` CI job + the `update-visual-goldens` workflow_dispatch both run the **pinned** `mcr.microsoft.com/playwright:v1.61.0-jammy` container so goldens render identically wherever generated. Snapshots are OS-suffixed; `*-win32`/`*-darwin` are gitignored. **Handoff:** run `update-visual-goldens` once → download the `visual-goldens-linux` artifact → commit the `*-linux.png` → the `visual` gate goes green (added to the checklist below).
- *Verified:* on Windows the generate→compare loop passes green (6/6) — proves server + theming + fonts + capture + pixel-diff all work; only the goldens' OS suffix differs from CI.

**S6 decisions (axe a11y — done 2026-06-23):**
- *Harness:* `tests/a11y/a11y.spec.mjs` (axe-core via `@axe-core/playwright`) reuses the VR theming over index/tables/dashboard × {light,dark}; gates on **serious + critical** WCAG 2.1 A/AA. Wired as a separate `a11y` CI job (plain ubuntu-latest + chromium — DOM-rule based, no container pinning needed, unlike VR). `playwright.config.mjs` `testDir` widened to `./tests`; `test:visual`/`test:a11y` filter by subdir.
- *Fixed (structural — visually inert):* the scan surfaced 6 rule types; the semantic bugs were FIXED, not calibrated — `aria-allowed-attr` (listbox/inbox/rich-select got `role=listbox`/`option` so their `[aria-selected]` styling is valid, incl. role-tagging inside the rich-select JS), `label` (2 demo inputs associated via `for`/`id`), `button-name` (icon-only save-view button got `aria-label`), `scrollable-region-focusable` (`tabindex=0` on the 2 overflowing table-wraps). A re-scan confirms these are now 0.
- *Calibrated (design-level — deferred at kickoff, **now REMEDIATED** 2026-06-23):* `color-contrast` (238 nodes: hushed/muted meta, tinted labels/pills/eyebrows, trend deltas) + `link-in-text-block` (10: links by color alone) were accepted in `A11Y_ALLOW` at kickoff because a real fix shifts the palette / link styling system-wide. That pass is now done — both rules are enforced (`A11Y_ALLOW` is empty). See *S6 follow-up — visual-a11y contrast pass* below.
- *Rich-select (concurrent work):* index.html + guide/app.js carried uncommitted rich-select feature work (a popover listbox replacing native `<select>`) that appeared mid-session — confirmed intended by Haris, included in scope, and made accessible here (verified it still opens/selects after role-tagging).
- *serve.json refinement:* dropped `trailingSlash:false` (it broke directory-URL serving: `/x/` → `/x` → unstyled) and pointed `.claude/launch.json` at the local `serve` (`npm run serve:styleguide`) so the preview honors `serve.json` like the tests/CI. (A stale cached 301 from the old strip-behavior needs a hard reload to clear in an already-open tab.)

**S6 follow-up — visual-a11y contrast pass (done 2026-06-23):** drove the two calibrated rules to **zero** AA violations and removed them from `A11Y_ALLOW` (now enforced). `npm run test:a11y` is green 6/6 (index/tables/dashboard × light/dark) with the allowlist empty; parity + contract stay green.
- *New tokens (mirror `--uix-warning-text`):* `--uix-danger-text` (light `#C20012` / dark `#F87171`) and `--uix-info-text` (light `#1447E6` / dark `#60A5FA`) — legible TEXT roles. The base `--uix-danger`/`--uix-info` are **unchanged**: they stay the SOLID role (danger button bg, critical pill, dots, borders, strokes), so nothing white-on-solid regressed. Every danger/info *text* usage (pill, alert, field-error, stat-trend, validation-summary, menu, sla, node, audit `del`, the inline SLA cells + `.tbx-card--dont` tag in the HTML) was repointed to the `-text` variant. Baseline updated in lockstep (3 changed/added token lines × 2 themes).
- *Token value change:* `--uix-text-muted` light `#737373`→`#6B6B6B` (was 4.34:1 on `--uix-bg-subtle` #F5F5F5 — the eyebrow/kbd/meta/avatar cluster). Dark muted unchanged (already AA).
- *Component/HTML fixes (no raw values — tokens / `color-mix` / `text-decoration`):* `.uix-label` text → `color-mix(--label-color 55%, var(--uix-text))` (auto-darkens on light / lightens on dark; raw chart hues like amber #F59E0B were 1.9:1 as text; the dot keeps the full hue). Accent-as-text-on-tint (active navitem, flow `--active`, pipeline `[active]`, listbox selected, guide navlink, the "Pop" motion demo) → `--uix-link` (the brightened-on-dark accent; identical to accent in light). Meta-on-tint (`notif[data-unread]`, active `navitem__badge`) → `--uix-text-hushed` (composites darker on the tint). In-text links: persistent underline via `a[href]:not([class])` in base.css (chrome links are all class-bearing, so this scopes to content links — WCAG 1.4.1). Removed the inline `opacity:.65` on the "Low" priority pills in index.html (opacity dimmed the text below AA; the neutral gray already de-emphasizes).
- *Verified:* a re-run of the axe scan (all impacts, both rules) reports 0 nodes across the 3 pages × 2 themes; local light+dark element screenshots confirm pills/labels/trends read cleanly and the hue identity is preserved. **No local Docker + the workflow isn't on the default branch (`master`)**, so the Linux VR goldens still can't be generated here — see the updated checklist item: bootstrapping them now captures this corrected rendering as the baseline (not the old, lower-contrast one).

**Remaining (human-gated only — all autonomous repo-local Phase 2 gates are wired & green):**
- **S10 — human actions** (the checklist above): npm scope claim + `NPM_TOKEN` + portfolio PAT + the VR-goldens bootstrap, then first tag.
- *Follow-up (separate from the Phase 2 gates):* ~~burn down the calibrated a11y debt — a `color-contrast` + `link-in-text-block` remediation pass~~ **DONE 2026-06-23** (see *S6 follow-up — visual-a11y contrast pass* above). Both rules are enforced; `A11Y_ALLOW` is empty. The VR goldens were not yet bootstrapped when this landed (no local Docker; workflow not on the default branch), so the pass was verified locally (axe = 0 + parity + contract + light/dark screenshots) instead of against the VR net — bootstrapping the goldens now baselines the corrected rendering.

**Local tooling note (footgun):** this is an npm workspace whose root is private and members are publishable. Incremental `npm install -D <x>` at root can re-hoist and silently prune existing root devDeps (hit twice: dropped `@changesets/cli`, then `style-dictionary`; also found `node_modules` pre-pruned at the start of the S7 session). **The committed `package-lock.json` is correct** — CI's `npm ci` is unaffected. **Best recovery: just run `npm ci`** — it restores the full tree from the (already-correct) committed lockfile *without* regenerating it, so it un-prunes deterministically and is preferred over `rm -rf node_modules package-lock.json && npm install` (which needlessly re-resolves the lockfile). After an incremental `npm install -D`, the lockfile is already updated correctly; a follow-up `npm ci` un-prunes any collateral. Re-verify `build:all` either way.

**Footgun corollary (`build:all` prunes — bit the S6 CI jobs):** `npm run build:all` *itself* prunes the root devDeps — its inner `cd packages/react && npm ci` reconciles the whole workspace and drops root-only bins (`playwright`, `serve`, `style-dictionary`; `@microsoft/api-extractor` happens to survive, which is why the `gates` job's post-`build:all` `test:api`/`test:smoke` still pass). So any job/script that runs a root-devDep tool *after* `build:all` breaks. The `visual` + `a11y` CI jobs therefore build with **tokens-only `npm run build`** (regenerates `build/css` for the static styleguide; no inner react `npm ci`, so `playwright`/`serve` survive) — never `build:all`. Verified: `npm ci → npm run build → test:a11y` stays green; `npm ci → build:all` drops the playwright bin.

## Definition of Done (Phase 2)

Every gate in S1–S9 is wired and green on a PR; the publish workflow is authored and proven inert-safe (skips cleanly without `NPM_TOKEN`); governance files are in place; the only remaining steps are the human-gated npm scope claim + secrets + first tag. Partials named explicitly, never the spec softened to match what shipped.
