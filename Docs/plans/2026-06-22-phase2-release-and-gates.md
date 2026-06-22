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
- [ ] **Bootstrap the VR goldens (S5):** run the `update-visual-goldens` workflow → download the `visual-goldens-linux` artifact → commit the `tests/visual/__screenshots__/*-linux.png`. The `visual` CI gate is red until these land (expected). Re-run after any intended rendering change to re-baseline.
- [ ] First publish: tag `v2.0.0`; confirm the release workflow gates pass, then `@uix/tokens@2.0.0` + `@uix/react@2.0.0` resolve on npm.
- [ ] (Phase 3) Point TENSOR at the npm packages; hard-fail `uix-sync.mjs`.

## Status — end of kickoff session (2026-06-23)

**Done + verified + committed** (branch `feat/uix-v2-phase2-release-gates`, on top of Phase 1):
- **S0** plan · **S1** packages/* monorepo + linked Changesets · **S2** governance (CODEOWNERS + contract-change process) · **S3** api-extractor public-API lock (both entry points, LF, CI-verify green) · **S4** per-consumer smoke build (ESM/CJS/resolve/types) · **S5** Playwright VR harness (pinned container; Linux goldens bootstrap pending) · **S7** full-strict tokenization (`ENFORCE_RAW=true`, 0 unjustified) · **S8** completeness gate (A structural + B theme-tier + **C raw-value scan now blocking**) · **S9** CI + publish-on-tag (inert-safe) + Renovate.
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

**Remaining** (best resumed with fresh context — `/clear` first):
- **S6 — axe a11y** over the same pages; wire `test:a11y`.
- **S10 — human actions** (the checklist above): npm scope claim + `NPM_TOKEN` + portfolio PAT, then first tag.

**Local tooling note (footgun):** this is an npm workspace whose root is private and members are publishable. Incremental `npm install -D <x>` at root can re-hoist and silently prune existing root devDeps (hit twice: dropped `@changesets/cli`, then `style-dictionary`; also found `node_modules` pre-pruned at the start of the S7 session). **The committed `package-lock.json` is correct** — CI's `npm ci` is unaffected. **Best recovery: just run `npm ci`** — it restores the full tree from the (already-correct) committed lockfile *without* regenerating it, so it un-prunes deterministically and is preferred over `rm -rf node_modules package-lock.json && npm install` (which needlessly re-resolves the lockfile). After an incremental `npm install -D`, the lockfile is already updated correctly; a follow-up `npm ci` un-prunes any collateral. Re-verify `build:all` either way.

## Definition of Done (Phase 2)

Every gate in S1–S9 is wired and green on a PR; the publish workflow is authored and proven inert-safe (skips cleanly without `NPM_TOKEN`); governance files are in place; the only remaining steps are the human-gated npm scope claim + secrets + first tag. Partials named explicitly, never the spec softened to match what shipped.
