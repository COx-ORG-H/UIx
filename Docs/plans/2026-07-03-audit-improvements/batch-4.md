# Batch 4 — Registry manifest · wrappers C · contract-guard · size PR comment

*Depends on Batch 3 (merged). Paste below the line into a fresh agent.*

---

Work in `E:/Development/Projects/UIx` (clean `master`). Branch:
`git checkout master && git pull && git checkout -b batch4-registry-wrappersC-govguard`. Assume Batch 0–3 landed
(ADR-0017 distribution bet, wrapper batches A+B, GOV-2 reviewer policy with the **narrowed** canonical contract
paths, PERF-1 `size` job). **GATE CHECK:** DIST-2 is conditional on ADR-0017. If it chose **option A (npm-only)**,
skip DIST-2 and report it cancelled; otherwise proceed. `ci.yml` writer here is DIST-2 only; GOV-3 and PERF-3 are
standalone workflow files; BREADTH-4 owns the wrapper hotspots.

### DIST-2 — `registry.json` manifest + drift gate  *(dep DIST-1; conditional)*
Create `packages/tokens/scripts/build-registry.mjs` (read all 67 `styles/components/*.css`; per file emit
`{ name, file, layer, tokens: [sorted unique --uix-* names via a `var(--uix-*)` regex handling `color-mix()` +
nested fallbacks] }` into `registry/registry.json` with a schema version; ASSERT count == 67; Button lists real
deps), `check-registry.mjs` (regenerate in-memory, diff vs committed, non-zero on drift — mirror
`check-contract.mjs` style), and `registry/registry.json` (committed). Add `build:registry` to the tokens build
chain after `build:styles`; add root `test:registry`. Add ONE "Registry manifest up-to-date" step to the EXISTING
`gates` job in `ci.yml`. **Verify:** `npm run build && npm run test:registry` green; touch a component's token
usage without regenerating → fails; regenerate → passes; new gates step green.

### BREADTH-4 — Wrapper batch C (THIRD/last serial wrapper batch)  *(dep BREADTH-3)*
Create `packages/react/src/components/{ContactCard,Pipeline,Flow,Media,Lightbox}.tsx`. `ContactCard` renders
`uix-contact` with name/role/actions/stats/stat sub-parts (confirm via `git show HEAD:.../contact-card.css`) and
**composes the existing `Button`** for actions. Pipeline/Flow/Media/Lightbox use real root classes with
sub-components matching the CSS BEM (verify each via `git show` first). Expose named sub-parts (`ContactCardStat`,
`PipelineStage`) consistent with `Kanban`/`Column` + `Timeline`/`TimelineItem`. Keep `Lightbox` **stateless**
(open/close is consumer state). If any component's CSS actually needs real logic, split it out and leave it Planned
rather than forcing a fake wrapper. Append exports in a `// --- breadth batch C ---` block after A+B; regenerate
api.md via `npm run test:api:update` (contains A+B+C); append a demo block to `packages/tokens/index.html`; flip
these rows Planned→Alpha in `Docs/component-roadmap.md` (Planned presentational count → zero). **Verify:**
`npm run build:react && npm run test:api` (no drift) + `npm run typecheck -w @tensor_1/react`; optionally
`npm run test:smoke`. **VR/a11y (correction C4):** re-baseline goldens via pinned container / `update-visual-goldens`;
run `test:a11y` and fix any new violation; don't assert local `test:visual` on Windows.

### GOV-3 — Contract-surface diff-detection gate  *(dep GOV-2)*
Create `.github/workflows/contract-guard.yml` (STANDALONE; on `pull_request`; checkout `fetch-depth: 0`; one job
that always completes green/red so it's safe as a required check) and `scripts/check-contract-diff.mjs` (compute
`git diff --name-only origin/<base>...HEAD`; match against the **narrowed** canonical contract path list —
`packages/tokens/tokens/`, `packages/tokens/themes/`, `packages/tokens/tests/tokens.baseline.css`,
`packages/tokens/style-dictionary.config.mjs`, and specifically `scripts/{build-styles,build-themes,check-parity,
check-contract}.mjs` — **NOT the whole `scripts/` dir**, correction C5; exit 0 if none touched, else require the
`contract-change` label OR a checked PR box, failing with a pointer to `contract-change-process.md`). Comment that
the list mirrors `contract-change-process.md` as the single source of truth. Invoke the script directly from the
workflow (keep `modifies` empty of root `package.json`). **Verify:** contract-guard green on a docs-only PR, red on
a PR editing `packages/tokens/tokens/` without the label; `node scripts/check-contract-diff.mjs` runs on a synthetic diff.

### PERF-3 — PR size-diff comment/artifact  *(dep PERF-1)*
Create `.github/workflows/size-report.yml` (STANDALONE; on `pull_request`; builds base + head and posts a brotli
before/after diff for the two React entries + CSS bundle totals — via `size-limit-action` pinned to a SHA, or a
self-contained `actions/github-script` node step). `permissions: pull-requests: write` scoped to this file only;
on fork PRs without comment perms, degrade to uploading the diff as an artifact. Pin all actions by SHA. **Verify
(post-merge):** a throwaway PR adding bytes → the workflow comments the positive delta; a no-op PR shows ~0. *(This
verify is a post-merge PR round-trip; it does not block the slice PR.)*

### WHEN DONE
`npm run build:all`, `test:parity`, `test:contract`, `test:api`, `test:smoke`, `test:a11y`, `test:registry` green;
re-baseline VR goldens for the `index.html` change. Add changesets: **minor** for `@tensor_1/react` (BREADTH-4),
and for `@tensor_1/tokens` if `registry/registry.json` is treated as a published-surface addition. Commit and push.
