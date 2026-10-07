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
TS constants, and the two minified bundles), which is what the static styleguide and the
parity/contract/size gates read. Everything it writes is committed except the two bundles —
see [Generated files and parallel PRs](#generated-files-and-parallel-prs).
Only reach for `build:all` when you need the compiled React `dist/` (e.g. before the
smoke gate).

Then run whichever gates cover what you touched (all are safe to run locally *except*
the visual one — see its section):

```bash
npm run test:parity      # token values unchanged vs the frozen baseline
npm run test:contract    # contract is structurally whole; no raw values in component CSS
npm run test:size:css    # no stylesheet grew past its budget; the bundles are still minified
npm run test:api         # @tensor_1/react public API matches the committed .api.md
npm run test:smoke       # packed tarballs install + import + type-check in a throwaway consumer
npm run test:a11y        # axe over the static styleguide, light + dark
# npm run test:visual    # Playwright VR — see caveat; do NOT trust local results on Windows
```

To inspect the documentation and examples the gates render against:

```bash
npm run serve:styleguide   # serve . on http://localhost:4178
# then open http://localhost:4178/packages/tokens/docs/index.html  (also tables.html)
```

---

## The gates

Seven trust gates guard every PR and every publish (they are the *same* jobs — see
[The release ritual](#the-release-ritual)). Each one proves a specific class of
regression can't land silently. The CI definition is
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

| Gate | Command | What it proves | Goldens / baseline live in |
|---|---|---|---|
| **parity** | `npm run test:parity` | Byte-for-byte (whitespace-normalized) equivalence of every `--uix-*` declaration in the generated CSS vs the frozen contract snapshot. | `packages/tokens/tests/tokens.baseline.css` |
| **contract** | `npm run test:contract` | The contract is structurally complete (every token family present, every theme covers its tier) and no component CSS hardcodes a contract-class value. | enforced in-script; justified exceptions in `packages/tokens/tests/raw-value-allowlist.json` |
| **css-size** | `npm run test:size:css` | No authored stylesheet grew past max(2%, 64 B) of its recorded raw/gzip/brotli size, none was added or removed unacknowledged, and each bundle is still the minified sum of its inputs. | `packages/tokens/tests/css-size.baseline.json` (one entry per stylesheet; none for the bundles) |
| **api** | `npm run test:api` | The public API surface of `@tensor_1/react` (main + `./chart`) is unchanged. | `packages/react/etc/uix-react.api.md` and `packages/react/etc/uix-react-chart.api.md` |
| **smoke** | `npm run test:smoke` | The *published* tarballs actually install, import (ESM + CJS), resolve their subpath exports, and type-check for a real consumer. | `tests/smoke-consumer/` (fixtures: `app.tsx`, `tsconfig.json`) |
| **visual** | `npm run test:visual` | Representative docs/example routes and the table specimen are pixel-stable in light + dark. | `tests/visual/__screenshots__/*-linux.png` |
| **a11y** | `npm run test:a11y` | No serious/critical WCAG 2.1 A/AA violations across every integrated example route, the docs shell, and the table specimen. | enforced in-script; exceptions in the `A11Y_ALLOW` list in `tests/a11y/a11y.spec.mjs` (currently empty) |

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

### css-size — `packages/tokens/scripts/size-report.mjs`

One baseline entry per authored stylesheet: every `styles/components/*.css` plus whatever
else `styles/main.css` and `styles/components.css` reach through `@import` (base,
utilities, motion, forced-colors, the generated `build/css/tokens.css`). `--check` fails
when a file's raw, gzip or brotli size grows past max(2%, 64 B) of its entry, or when a
file appears or disappears. After a deliberate size change run `npm run size:css:update`:
it rewrites **only** the entries that are out of tolerance, new or gone, so the diff is
the stylesheets you resized and nothing else. Commit it with the change.

The two bundles have no entry. A bundle's size is the sum of its inputs, so a stored
total was a line every CSS PR rewrote, and every pair of open PRs conflicted on it.
Instead `--check` compares each bundle's raw bytes with the raw bytes of its inputs
(about 74% when minified, 100% when not) and fails above 85%: that catches the one thing
the per-file entries cannot, a regression in the build step itself. The bundle sizes are
printed on every run, so the CI log of any commit has them. Run `npm run build` first.

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

`test:visual` runs `playwright test tests/visual`: full-page screenshots of representative integrated docs
examples and `tables.html` in both `light` and `dark` projects, compared against the committed `*-linux.png`
goldens.

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

Runs axe-core over every integrated example route, the docs shell, and the table specimen in light + dark, gating on
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

The publish step **fails closed**: if the `NPM_TOKEN` secret is missing or blank, the
gates still run but the run goes red with an error, because nothing was published. It
used to skip with a notice and exit 0, which let `v2.16.0` go green with no package on
npm. After fixing the secret, re-run the failed `publish` job for the same tag. Always
confirm the version with `npm view @tensor_1/tokens version` afterwards.

To queue a release from a feature branch, add a changeset while you work:

```bash
npm run changeset   # interactively record the bump (patch/minor/major) + summary
```

---

## Generated files and parallel PRs

What a PR commits, and what it must leave to the build:

| Path | Committed? | Why |
|---|---|---|
| `packages/tokens/build/css/tokens.css`, `build/tailwind/**`, `build/ts/**`, `themes/*.css` | yes | The reviewed output of a token change. Multi-line, so git merges two edits to different tokens, and `test:parity` compares it with the frozen baseline. |
| `packages/tokens/build/css/styles.css`, `build/css/components.css` | **no** (git-ignored) | Each is one minified line. Any two branches that rebuilt it conflict, whatever they changed. |
| `packages/tokens/tests/css-size.baseline.json` | yes | One entry per stylesheet; a PR changes only the entries of the files it resized. |

The bundles are produced wherever they are needed: `npm run build` locally, the build step
of every CI job, `docs-pages.yml` before it assembles the site, and `prepublishOnly` plus
`release.yml` before a publish. The published tarball is unchanged. A clone that has not
built still shows the docs: the `<link>` to the bundle in `docs/explorer.html` and
`tables.html` has an `onerror` that loads `styles/main.css`, and
`tests/a11y/docs-source-fallback.spec.mjs` keeps that rendering identical to the bundle's.
The Playwright suites themselves refuse to start without the bundle
(`tests/global-setup.mjs`), so they always test what ships.

Gates: `packages/tokens/tests/generated-bundles.test.mjs` fails if a bundle is tracked
again or a docs page loses its fallback; `packages/tokens/tests/size-report.test.mjs`
three-way-merges the baselines of two simulated PRs with `git merge-file` and fails on a
conflict.

**What can still conflict.** Two PRs that resize the *same* stylesheet both rewrite its
baseline entry. Two PRs that change tokens both regenerate `build/css/tokens.css` and
its siblings; those merge line by line and conflict only on the same token. Both are
conflicts between related changes. Resolve the source first, then
`npm run build && npm run size:css:update` and commit what changed.

**A branch cut before the bundles were untracked** (it still modifies
`build/css/styles.css`) conflicts once more when master is merged in. No regeneration is
needed to resolve it:

```bash
git merge origin/master
git rm packages/tokens/build/css/styles.css packages/tokens/build/css/components.css
git checkout origin/master -- packages/tokens/tests/css-size.baseline.json
# resolve any conflict in files you authored, then:
npm run build && npm run size:css:update
git add packages/tokens/tests/css-size.baseline.json && git commit
```

**Why not regenerate on master from CI, or a merge driver.** A workflow that commits the
bundles to master after each merge needs a token that can push to the default branch,
which [the reviewer policy](./reviewer-policy.md#required-branch-protection-settings)
rules out, and the commit it pushes gets no CI run. A `.gitattributes` merge driver is
never run by GitHub, so PRs would still show as conflicting and the merge button would
still be disabled; it also runs per file in the middle of a merge, before the sources it
would have to rebuild from are merged.

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
   `http://localhost:4178/packages/tokens/docs/index.html`, then the relevant reference and example routes.
5. **Run the gates you touched.**
   ```bash
   npm run test:parity       # if you changed token values, expect this to fail until you
                             # also update packages/tokens/tests/tokens.baseline.css
   npm run test:contract     # catches raw hex/px that should be tokenized
   npm run test:size:css     # if a stylesheet grew on purpose: npm run size:css:update, commit the baseline
   npm run test:a11y         # DOM-rule based; trustworthy locally
   ```
   Do not commit `build/css/styles.css` or `build/css/components.css`; they are git-ignored
   on purpose ([why](#generated-files-and-parallel-prs)).
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
8. **Push and open the PR.** CI runs all seven gates. Green + approvals = merge.

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
