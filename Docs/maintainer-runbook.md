# Maintainer runbook — UIx v2

Everything a maintainer needs to develop, verify, and ship `@tensor_1/tokens` and
`@tensor_1/react`. This is the operational companion to the *why* docs
(the ADR log, the contract-change process). If you are onboarding, read the
[Local dev loop](#local-dev-loop) and the [First PR walkthrough](#first-pr-walkthrough)
first, then skim [The gates](#the-gates).

All `npm run …` commands below are run from the repo root
(`E:/Development/Projects/UIx`) unless noted. Node 22 is the CI baseline — match it
locally.

---

## Local dev loop

```bash
npm ci            # install the workspace (root + packages/* via npm workspaces)
npm run build     # build @tensor_1/tokens only: tokens -> CSS + Tailwind + TS. Fast.
npm run build:all # build tokens AND @tensor_1/react (see the build:all gotcha below)
```

`npm run build` is the one you want 90% of the time — it regenerates
`packages/tokens/build/**` (the `--uix-*` contract CSS, the Tailwind preset, the typed
TS constants), which is what the static styleguide and the parity/contract gates read.
Only reach for `build:all` when you need the compiled React `dist/` (e.g. before the
smoke gate).

Then run whichever gates cover what you touched (all are safe to run locally *except*
the visual one — see its section):

```bash
npm run test:parity      # token values unchanged vs the frozen baseline
npm run test:contract    # contract is structurally whole; no raw values in component CSS
npm run test:api         # @tensor_1/react public API matches the committed .api.md
npm run test:smoke       # packed tarballs install + import + type-check in a throwaway consumer
npm run test:a11y        # axe over the static styleguide, light + dark
# npm run test:visual    # Playwright VR — see caveat; do NOT trust local results on Windows
```

To eyeball the styleguide the gates render against:

```bash
npm run serve:styleguide   # serve . on http://localhost:4178
# then open http://localhost:4178/packages/tokens/index.html  (also tables.html, dashboard.html)
```

---

## The gates

Six trust gates guard every PR and every publish (they are the *same* jobs — see
[The release ritual](#the-release-ritual)). Each one proves a specific class of
regression can't land silently. The CI definition is
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

| Gate | Command | What it proves | Goldens / baseline live in |
|---|---|---|---|
| **parity** | `npm run test:parity` | Byte-for-byte (whitespace-normalized) equivalence of every `--uix-*` declaration in the generated CSS vs the frozen contract snapshot. | `packages/tokens/tests/tokens.baseline.css` |
| **contract** | `npm run test:contract` | The contract is structurally complete (every token family present, every theme covers its tier) and no component CSS hardcodes a contract-class value. | enforced in-script; justified exceptions in `packages/tokens/tests/raw-value-allowlist.json` |
| **api** | `npm run test:api` | The public API surface of `@tensor_1/react` (main + `./chart`) is unchanged. | `packages/react/etc/uix-react.api.md` and `packages/react/etc/uix-react-chart.api.md` |
| **smoke** | `npm run test:smoke` | The *published* tarballs actually install, import (ESM + CJS), resolve their subpath exports, and type-check for a real consumer. | `tests/smoke-consumer/` (fixtures: `app.tsx`, `tsconfig.json`) |
| **visual** | `npm run test:visual` | Full-page rendering of the 3 styleguide pages, light + dark, is pixel-stable. | `tests/visual/__screenshots__/*-linux.png` |
| **a11y** | `npm run test:a11y` | No serious/critical WCAG 2.1 A/AA violations across the styleguide, light + dark. | enforced in-script; exceptions in the `A11Y_ALLOW` list in `tests/a11y/a11y.spec.mjs` (currently empty) |

### parity — `packages/tokens/scripts/check-parity.mjs`

Parses `packages/tokens/build/css/tokens.css` and compares it against the frozen
snapshot `packages/tokens/tests/tokens.baseline.css`: same selectors, same `--uix-*`
names per selector, same values. The runtime tokens (`var(--uix-brand, …)`,
`color-mix(…)`) must match exactly — a drift there silently breaks every product's live
brand override. **A deliberate token change means updating both the token source *and*
`tokens.baseline.css` in the same reviewed commit.** Run `npm run build` first so the
generated CSS is current.

### contract — `packages/tokens/scripts/check-contract.mjs`

Complements parity (which guards *values*) by proving the contract is *whole*. Three
checks: (A) every load-bearing token family (`bg`, `surface`, `border`, `text`,
`brand`, `space`, `radius`, `z`, …) is present; (B) every `themes/*.css` emits its brand
tier including a dark-mode `--uix-brand`; (C) "full-strict" — no raw hex/color/z-index in
component CSS, and raw `px` only in geometry properties (widths, offsets, border-widths).
Any other raw value must be tokenized or added to `packages/tokens/tests/raw-value-allowlist.json`
with a written reason. Run `npm run build` first.

### api — api-extractor vs the committed report

`test:api` runs `api-extractor` twice against
`packages/react/api-extractor.json` and `packages/react/api-extractor.chart.json`,
comparing the current type surface to the committed `etc/uix-react.api.md` and
`etc/uix-react-chart.api.md`. If you intentionally changed the public API, regenerate
the report with `npm run test:api:update` and commit the updated `.api.md` files with
your change. Requires the React build (`npm run build:all` or
`npm run build:react`) first.

### smoke — `tests/smoke-consumer/run.mjs`

Packs `@tensor_1/tokens` and `@tensor_1/react` to tarballs, installs them into a
throwaway project *outside* the workspace (so npm can't symlink and hide packaging
bugs), then exercises every consumption mode: esbuild ESM bundle, ESM runtime import,
CJS `require`, subpath export resolution (`./css`, `./styles`, `./bundle`, `./tailwind`,
theme, `./chart`), and a `tsc --noEmit` type-check. Assumes the packages are built —
run `npm run build:all` first (CI does).

### visual — Playwright VR (read this before running locally)

`test:visual` runs `playwright test tests/visual`: full-page screenshots of
`index.html`, `tables.html`, and `dashboard.html` in both `light` and `dark` projects,
compared against the committed `*-linux.png` goldens.

- **The goldens are Linux-rendered and OS-suffixed.** On Windows/macOS, Playwright
  produces `*-win32` / `*-darwin` images that will **not** match the Linux goldens and
  are gitignored. Running `test:visual` locally proves only that the harness runs — **do
  not assert on its pass/fail on Windows.** Trust the CI `visual` job for the real verdict.
- **Goldens are regenerated, never hand-edited.** After an intended rendering change,
  re-baseline them in the *pinned* Playwright container so they match the CI runner
  exactly — CI pins `mcr.microsoft.com/playwright:v1.61.0-jammy`. Either run the
  `update-visual-goldens` workflow (manual dispatch) and download + commit the
  `*-linux.png` artifact, or locally:

  ```bash
  docker run --rm -v "$PWD:/w" -w /w mcr.microsoft.com/playwright:v1.61.0-jammy \
    sh -c "npm ci && npm run build:all && npm run test:visual:update"
  ```

  Then commit only the `tests/visual/__screenshots__/*-linux.png` files.

### a11y — `tests/a11y/a11y.spec.mjs`

Runs axe-core over the same three styleguide pages in light + dark, gating on
**serious/critical** WCAG 2.1 A/AA violations (minor/moderate are attached for triage,
not failed). It is DOM-rule based and therefore OS-independent, so it runs safely
locally and needs no pinned container (CI runs it on plain `ubuntu-latest` with a
chromium install). Justified exceptions go in the `A11Y_ALLOW` list at the top of the
spec, each with a reason and the smallest possible scope — currently the list is empty
(the two design-level rules calibrated during bring-up have since been remediated and
are now enforced).

---

## The release ritual

Publishing is **tag-driven** and the gates are the hard precondition. As of GOV-6,
[`release.yml`](../.github/workflows/release.yml) does **not** keep its own copy of the
gates — it *calls* `ci.yml` as a reusable workflow (`uses: ./.github/workflows/ci.yml`).
So the exact `gates` + `visual` + `a11y` jobs that guard every PR also guard publishing,
and they can never drift: add a gate step in `ci.yml` and it automatically becomes a
publish precondition.

The flow:

1. **Version bump.** `npm run version` (i.e. `changeset version`) consumes the pending
   changesets, bumps `@tensor_1/tokens` + `@tensor_1/react` (they are version-linked),
   and regenerates the CHANGELOGs. Commit the result.
2. **Tag + push.** Create tag `vX.Y.Z` and push it. That triggers `release.yml`.
3. **Gates run, then publish.** `release.yml`'s `ci` job runs `ci.yml`'s gates + visual +
   a11y. Only if that passes does the `publish` job run `npx changeset publish`, which
   pushes any package whose version isn't yet on npm.

The publish step is **inert-safe**: without the `NPM_TOKEN` secret the gates still run
and publish skips cleanly (it prints a notice and exits 0), so the workflow can land
before the npm scope is claimed.

To queue a release from a feature branch, add a changeset while you work:

```bash
npm run changeset   # interactively record the bump (patch/minor/major) + summary
```

---

## Governance-artifact map

The rules that decide *whether* a change may land, and *who* must approve it:

| Artifact | Path | Purpose |
|---|---|---|
| Contract-change process | [`Docs/contract-change-process.md`](./contract-change-process.md) | How to propose and land a change to the `--uix-*` contract without breaking consumers. |
| Reviewer policy | [`Docs/reviewer-policy.md`](./reviewer-policy.md) | Who reviews what, and the approval bar per change class. |
| Code owners | [`.github/CODEOWNERS`](../.github/CODEOWNERS) | Path-based required reviewers, enforced by GitHub. |
| PR template | [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) | The checklist every PR must fill in (gates run, contract impact, changeset). |
| ADR log | [`../../../Docs/adr/`](../../../Docs/adr/) | The workspace decision record — the *why* behind the contract, the gates, and the release model (start at `README.md`, then ADR-0000). |

---

## First PR walkthrough

A fresh maintainer's happy path, from clone to a green PR. Say you're tweaking a
component's CSS.

1. **Set up.**
   ```bash
   npm ci
   npm run build
   ```
2. **Branch.** `git checkout -b your-change` off `master`.
3. **Make the change** in `packages/tokens/styles/components/…` (or wherever), then
   rebuild: `npm run build`.
4. **Eyeball it.** `npm run serve:styleguide`, open
   `http://localhost:4178/packages/tokens/index.html`, confirm it looks right.
5. **Run the gates you touched.**
   ```bash
   npm run test:parity       # if you changed token values, expect this to fail until you
                             # also update packages/tokens/tests/tokens.baseline.css
   npm run test:contract     # catches raw hex/px that should be tokenized
   npm run test:a11y         # DOM-rule based; trustworthy locally
   ```
   If you changed the React public API, also `npm run build:all` then `npm run test:api`
   (regenerate with `npm run test:api:update` if the change is intentional). If you
   changed packaging, `npm run test:smoke`. Do **not** rely on `npm run test:visual` on
   Windows — let CI's `visual` job be the judge; if it flags an intended rendering
   change, re-baseline the goldens (see the visual gate section).
6. **Record the release intent.** `npm run changeset` — pick the bump, write the summary.
7. **Fill in the PR template.** It's auto-loaded from
   [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md); confirm the
   gates you ran and the contract impact. [CODEOWNERS](../.github/CODEOWNERS) will pull in
   the required reviewers per the [reviewer policy](./reviewer-policy.md).
8. **Push and open the PR.** CI runs all six gates. Green + approvals = merge.

To then ship it, follow [The release ritual](#the-release-ritual).

---

## Two "not build:all" CI gotchas

These are non-obvious and easy to reintroduce, so they are called out in the workflow
comments. Preserve them.

1. **The `visual` and `a11y` jobs run `npm run build` (tokens only), NOT `npm run
   build:all`.** `build:all`'s inner step does `cd packages/react && npm ci`, which
   reconciles the workspace and *prunes the root devDependencies* — including `playwright`
   and `serve` — that those two jobs need in the very next step. Building tokens only
   regenerates the styleguide CSS without touching the root install.

2. **The `publish` job runs `npm ci` twice, for the same reason.** It does `npm ci` →
   `npm run build:all` → `npm ci` again. `build:all`'s inner react `npm ci` prunes the
   root devDeps (here `@changesets/cli`), so the second `npm ci` restores them and lets
   `npx changeset publish` resolve its executable.
