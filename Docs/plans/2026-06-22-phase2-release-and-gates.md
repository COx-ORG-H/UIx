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
- [ ] First publish: tag `v2.0.0`; confirm the release workflow gates pass, then `@uix/tokens@2.0.0` + `@uix/react@2.0.0` resolve on npm.
- [ ] (Phase 3) Point TENSOR at the npm packages; hard-fail `uix-sync.mjs`.

## Definition of Done (Phase 2)

Every gate in S1–S9 is wired and green on a PR; the publish workflow is authored and proven inert-safe (skips cleanly without `NPM_TOKEN`); governance files are in place; the only remaining steps are the human-gated npm scope claim + secrets + first tag. Partials named explicitly, never the spec softened to match what shipped.
