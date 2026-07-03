# Batch 0 — Foundations

*Paste everything below the line into a fresh agent. Assumes the [pre-flight](README.md#5-pre-flight-do-this-once-before-any-batch)
is done (packages/ restored, clean `master`, `npm run build:all` green, distribution bet chosen).*

---

You are working in the UIx v2 monorepo at `E:/Development/Projects/UIx` (branch `master`). Pre-flight is done:
`packages/` matches HEAD, `npm ci` has been run, and `test:parity` + `test:contract` are green. Read files
normally. (If `git status` unexpectedly shows `packages/**` mass-deleted, STOP — the tree regressed.) Create a
branch: `git checkout -b batch0-foundations`.

This is the **foundation batch**: 12 independent slices, no two write the same file. Implement them in this
order (GOV-0 and GOV-6 first — later batches depend on them). When a slice writes `packages/tokens/package.json`
or `.github/*`, edit serially and never reorder existing keys.

### GOV-0 — Reconcile the ADR log (do FIRST)
The ADR log at `E:/Development/Docs/adr/` contains 0000–0012, but the codebase already **cites ADR-0013–0016**
(grep: `tsup.config.ts`, `packages/tokens/scripts/check-contract.mjs`, `tests/raw-value-allowlist.json`,
`Docs/contract-change-process.md`, `.github/workflows/release.yml`, `Docs/repository-branches.md`). Backfill
those four as short retrospective ADRs from the existing cited sources, following `E:/Development/Docs/adr/template.md`
(Status: Accepted, dated to the decision they record), so the log is contiguous and internally consistent:
- `0013-*` = the `--uix-*` token contract + DTCG source + parity/contract gates (source: contract-change-process.md, check-parity/contract.mjs).
- `0014-*` = RSC-aware per-file `use client` dual build (source: `packages/react/tsup.config.ts` header).
- `0015-*` = the CI trust-gates + publish-on-tag model (source: ci.yml/release.yml headers).
- `0016-*` = the contract-change process + semver one-way-doors (source: contract-change-process.md).
Then **new ADRs start at 0017**. Regenerate the index ONCE at the end of this batch (see ADR-INDEX note).
**Acceptance:** files 0013–0016 exist and match template sections; each cites its real source. **Verify (manual):**
reviewer confirms the four backfilled decisions match what the code references.

### GOV-6 — Make `release.yml` reuse `ci.yml` (lockstep)
Today `.github/workflows/release.yml` is a hand-maintained COPY of the ci.yml gates (its header even says "keep
in lockstep"). Refactor so it can't drift: add `workflow_call:` to `ci.yml`'s `on:`, then replace release.yml's
`gates`/`visual`/`a11y` jobs with `uses: ./.github/workflows/ci.yml` (keep the `publish` job `needs:` the called
workflow). Net effect: **any gate step later added to ci.yml automatically gates publishing** — this is the
mechanism the rest of the plan relies on (corrections C3). **Verify:** `act`-free static check — release.yml no
longer duplicates step lists; a YAML lint passes; open a draft PR and confirm the reusable workflow resolves in
the Actions tab (post-merge). **Acceptance:** release.yml has no hardcoded parity/contract/api/smoke steps.

### DOCS-1 — Docs-site scaffold (build-free component-explorer shell)
Create `packages/tokens/docs/{explorer.html,docs.css,docs.js,docs.test.js,README.md}`. `explorer.html` is a
no-build shell served from the static root: left component nav, right per-component page template with EMPTY
regions keyed by `data-region` (`overview`, `live-example`, `props-table`, `do-dont`, `a11y-notes`). Copy the
**exact no-flash inline theme script** + `styles/main.css` + `[data-theme]`/`data-uix-theme-toggle` mechanism
from `packages/tokens/index.html`. `docs.js` exposes PURE helpers (`slugify`, `componentNav`, `renderPropsTable`)
behind the `if (typeof document !== 'undefined')` guard used in `guide/app.js`; `docs.test.js` covers them with
`node:test`. Add only a `docs:serve` key to `packages/tokens/package.json`. Add a "Documentation site" section
to `README.md`. Do NOT touch `index.html`/`guide.css` (keeps VR goldens stable).
**Verify:** `npm run serve:styleguide`, open `http://localhost:4178/packages/tokens/docs/explorer.html` — shell
renders, theme toggles light/dark no-flash; `node --test packages/tokens/docs/docs.test.js` passes.

### A11Y-1 — Manual screen-reader protocol + result template
Create under `E:/Development/Docs/a11y/` (shared workspace tree, outside this repo): `manual-sr-protocol.md`
(AT/OS/browser matrix — NVDA+Firefox / JAWS+Chrome on Windows, VoiceOver+Safari on macOS; which tier is REQUIRED
for Stable; a per-component checklist: accessible name, role, value/state announced, focus order = visual order,
full keyboard operability Tab/Shift-Tab/Enter/Space/Esc/arrows, focus-visible ring, aria-live on async,
reduced-motion honored), `result-template.md` (a **machine-parsable header block**: component id, per-AT
pass/fail/na, tester, date, uix version), `results/.gitkeep`, and one worked `results/button.md` filled against
the real Button. Component-id vocabulary = lowercase css-file basenames (`button`, `modal`) — MUST match A11Y-2
and BREADTH-1. **Verify (manual + grep):** `button.md` contains every header key from `result-template.md`
(`grep -q` each key).

### DIST-1 — ADR-0017: the distribution bet
Create `E:/Development/Docs/adr/0017-uix-distribution-bet-registry-companion.md` (per template; Accepted;
2026-07-03). Context: today only versioned npm (`@tensor_1/tokens` exports `./css,./styles,./bundle` +
`@tensor_1/react`) plus an undocumented copy-paste path and the `uix:sync` vendor model. Alternatives: **(A)**
npm-only, **(B)** shadcn-style registry JSON, **(C)** simple copy-in manifest (`registry.json` of CSS files +
`--uix-*` deps + install steps). **Record the chosen bet — the decision is option C** (locked
in pre-flight): a copy-in `registry.json` manifest + a `uix add` CLI; B's full per-component shadcn registry is
an optional later add (DIST-5). NON-GOALS: React stays npm-canonical; no bespoke package manager. Write the ADR
with C as Accepted and A/B as considered-and-rejected alternatives. **Verify:** file exists at 0017; after the
ADR-INDEX step, `git diff adr/README.md` shows only the 0017 row (plus GOV-0's backfilled rows).

### DTCG-1 — DTCG 2025.10 conformance audit (pure analysis)
Create `Docs/2026-07-03-dtcg-2025.10-conformance-audit.md`. Enumerate every `$type` in use (color, fontFamily,
dimension, number, shadow, cubicBezier, duration) across `packages/tokens/tokens/base/*.json` + `tokens/dark/*.json`
and classify each family CONFORMANT or DEVIATION vs a **pinned** DTCG revision (state the exact revision/date).
Document each deviation with a file+key example and a verdict `{keep-deliberate | migrate-later | must-not-change-parity}`,
covering at least: shadow as CSS string vs composite object; cubicBezier string vs `[x1,y1,x2,y2]`; fontFamily
comma-string vs array; dimension `"Npx"`/`"-0.02em"`/`"0"` vs `{value,unit}`; missing `$schema`/aliases — cite the
load-bearing reason (identity `uix/value` transform + runtime `var()`/`color-mix()` brand override) from
`style-dictionary.config.mjs`. **Edit NO token JSON.** **Verify:** `git status` shows only the new Docs file;
`test:parity` + `test:contract` unchanged/green; `grep` confirms all 7 `$type` families each have a verdict.

### GOV-1 — PR template
Create `.github/PULL_REQUEST_TEMPLATE.md` (single file): a "Contract change?" gate with an opt-out box, the 7
checklist items from `Docs/contract-change-process.md`, and the semver one-way-door table. Link
`contract-change-process.md` and `Docs/reviewer-policy.md` (GOV-2, this batch). **Verify:** `gh pr create --draft`
pre-fills the body.

### GOV-2 — Reviewer/rotation policy
Create `Docs/reviewer-policy.md`: the second-reviewer expectation, the **narrowed canonical contract paths**
(`packages/tokens/tokens/`, `themes/`, `tests/tokens.baseline.css`, `style-dictionary.config.mjs`,
`scripts/{build-styles,build-themes,check-parity,check-contract}.mjs` — NOT the whole `scripts/` dir; correction
C5), required branch-protection settings (require PR, code-owner review, required checks gates+visual+a11y+
contract-guard, include-admins, no force-push), the solo-maintainer reality + a rotation slot, and how to add a
second CODEOWNER. Add a COMMENT-ONLY pointer line to `.github/CODEOWNERS` (no ownership changes). **Verify:**
`grep -q reviewer-policy .github/CODEOWNERS`.

### GOV-4 — Maintainer runbook
Create `Docs/maintainer-runbook.md`: local dev loop; each gate (parity/contract/api/smoke/visual/a11y — what it
proves + where goldens live); the release ritual from `release.yml` (now a reusable-workflow call after GOV-6);
the governance-artifact map (contract-change-process, CODEOWNERS, reviewer-policy, PR template, ADR log); a
"first PR" walkthrough; and the two "not `build:all`" ci gotchas. **Verify (manual):** internal links resolve; a
fresh reader can run every `npm run test:*`.

### PERF-2 — Per-CSS-file size report + baseline
Create `packages/tokens/scripts/size-report.mjs` (enumerate `styles/components/*.css` + `build/css/{tokens,components,styles}.css`;
compute raw+gzip+brotli via `node:zlib` at a FIXED level; print sorted-largest table; `--check` fails on growth
past a per-file tolerance vs the committed baseline, `--update` rewrites it) and `packages/tokens/tests/css-size.baseline.json`.
Add `size:css`/`size:css:update` to `packages/tokens/package.json` (after DOCS-1's `docs:serve` key) and
`test:size:css` to root `package.json`. Node built-ins only. Do NOT wire CI here (PERF-1 owns the `size` job).
**Verify:** `npm run build && npm run test:size:css` prints the table and passes at HEAD; bulk-add rules to one
css → `--check` fails until `size:css:update`.

### FR-2 — Plain-CSS example + isolated-tarball smoke harness
Create `examples/README.md` (indexes example apps, each doubles as smoke coverage) and
`examples/plain-css/{index.html,README.md,verify.mjs}`. `index.html` links `@tensor_1/tokens/css` +
`.../themes/tensor` + `./styles` (or `./bundle`), no bundler, renders `.uix-btn` + `.uix-card`, toggles
light/dark via `data-theme`. `verify.mjs` packs `@tensor_1/tokens` to a tarball and installs into an **isolated
temp dir — copy the approach from `tests/smoke-consumer/run.mjs` VERBATIM (no symlink)** — then asserts
`require.resolve` for `css`, `styles`, `bundle`, `themes/tensor`. This establishes the shared `examples/` harness
FR-3/FR-4/FR-1 reuse. **Verify:** `node examples/plain-css/verify.mjs` exits 0 and prints the four resolved paths.

### BREADTH-1 — Component roadmap + fix the stale backlog
Create `Docs/component-roadmap.md`: a table `[Component · CSS file · React export · Maturity · A11y-reviewed ·
Notes]` over ALL 67 `styles/components/*.css` files. Mark the **16 genuinely-absent** wrappers React=absent /
Maturity=Planned: breadcrumbs, kbd, steps, stepper, reactions, attachment, audit-log, notification-center,
pipeline, flow, sla, heartbeat, media, lightbox, contact-card, view-menu. Mark `table-toolbar` and `utility-bits`
React=n/a (css-only support). Mark already-exported components ✓ (verify against `git show HEAD:packages/react/src/index.ts`)
— **correctness fix:** Meter/Progress/Segmented/Inbox/DescriptionList/Composer/Comments/Timeline/Kanban/
CommandPalette are ALREADY wrapped; correct the stale "coverage backlog" in `Docs/design-system.md` and link the
roadmap as canonical. Maturity vocab = Planned/Alpha/Beta/Stable (maps to A11Y-2's draft/beta/stable). Do NOT
edit `README.md` here (its roadmap link is folded into DIST-4/Batch 5 to keep README single-writer).
**Verify:** `node -e` diff of `git ls-tree` component list vs the table shows every css file once.

### ADR-INDEX (shared — do ONCE, LAST)
After GOV-0's 0013–0016 and DIST-1's 0017 files all exist, run the generator a single time (never hand-edit the
index): `node E:/Development/Infrastructure/agent-kits/adr-kit/gen-adr-index.mjs`. **Verify:** `git diff` of
`E:/Development/Docs/adr/README.md` shows rows 0013–0017 added between the `ADR-INDEX` markers.

### WHEN DONE
`npm run build:all`, `test:parity`, `test:contract`, `test:api`, `test:smoke`, `test:visual`, `test:a11y` all
green (this batch adds no component CSS or tokens, so goldens/baselines are untouched). No changeset (no published
`@tensor_1/*` source surface changed — docs/ scaffold isn't in the api-extractor or css contract). Commit and push.
