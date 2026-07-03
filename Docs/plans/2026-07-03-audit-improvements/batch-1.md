# Batch 1 — Docs pages + maturity registry + conditional ADRs

*Depends on Batch 0 (merged). Paste below the line into a fresh agent.*

---

Work in `E:/Development/Projects/UIx` (branch `master`, clean after Batch 0). Read `packages/*` normally;
fall back to `git show HEAD:<path>` only if a file is missing. Branch:
`git checkout master && git pull && git checkout -b batch1-docs-maturity`. Assume Batch 0 landed (docs scaffold,
SR protocol, ADR-0017, DTCG audit, roadmap, GOV-6 ci↔release reuse, ADR log reconciled to 0013–0016).

Slices are file-disjoint except: DOCS-2 & DOCS-3 both edit `explorer.html`/`docs.css` in **disjoint regions**
(DOCS-2 = page render; DOCS-3 = a dedicated `<header>` search block) — do DOCS-2 then DOCS-3. A11Y-4 & DTCG-4 both
regenerate the ADR index — run the generator once after both files exist. Only A11Y-2 edits `ci.yml`/root
`package.json`; only DOCS-5 edits `README.md`.

### DOCS-2 — Per-component page pattern, proven on Button + Table  *(dep DOCS-1)*
Create `packages/tokens/scripts/build-docs-index.mjs` (parse `packages/react/etc/uix-react.api.md` into
`docs/data/components.json` — per exported component its `*Props` rows: name, type, optional; pin to the
api-extractor block format), `build-docs-index.test.mjs` (`node:test` asserting Button + Table extract),
`docs/data/components.json` (committed), and hand-authored `docs/content/{button,table}.json` (overview,
whenToUse, do[], dont[], a11yNotes[], liveExampleHtml with real `.uix-*` classes). Extend `docs/docs.js` to render
a page from `components.json` + `content/<slug>.json` into the DOCS-1 regions (props table + live example in BOTH
themes + do/dont + a11y). Add a `docs:build` key to `packages/tokens/package.json`. **Verify:**
`node scripts/build-docs-index.mjs` regenerates `components.json`; `node --test build-docs-index.test.mjs` green;
`explorer.html#button` and `#table` render fully.

### DOCS-3 — Client-side search  *(dep DOCS-1)*
Create `packages/tokens/docs/search.js` (pure `buildIndex(components)` + `matchComponents(index,query)` ranked
name>category>keyword; `node:test` in `search.test.js`, no DOM). Add a labelled, keyboard-accessible search input
to a **dedicated `<header>` region** in `explorer.html` (`/` focuses, Esc clears, Enter navigates to top hit)
filtering the nav; read `components.json` if present else degrade to static nav. Add a `.docs-search` block to
`docs.css`. Keep edits inside that region so they don't collide with DOCS-2. **Verify:** `node --test search.test.js`;
typing filters the nav, Enter navigates; input is axe-clean labelled.

### DOCS-5 — Publish docs to GitHub Pages  *(dep DOCS-1)*
Create `.github/workflows/docs-pages.yml` (STANDALONE, not ci.yml): runs `npm run docs:build` if present, then
`actions/upload-pages-artifact` + `actions/deploy-pages` (`pages: write`, `id-token: write`) on push to `master`
+ `workflow_dispatch`, landing on `docs/explorer.html` with Pages-base-safe relative asset paths. Add the live URL
to README's "Documentation site" section. **Manual prerequisite** (call out in the PR): enable Pages
(Settings→Pages, source=GitHub Actions) — an agent can't flip that. **Verify (post-merge):** `workflow_dispatch`
→ workflow green and the Pages URL serves the explorer. *(This verify is post-merge; it does not block the slice PR.)*

### A11Y-2 — Component maturity registry + gate  *(dep A11Y-1, GOV-6)*
Create `packages/react/component-status.json` listing EVERY exported component (cross-check
`git show HEAD:packages/react/src/index.ts` + `etc/uix-react.api.md`) with `{ status: draft|beta|stable,
a11y: { manualSR: <path-or-null> } }`; initialize ALL entries **draft/beta** so the gate passes day one. Create
`packages/react/scripts/check-status.mjs` (fails on: unknown key, missing exported component, out-of-enum status,
or `status==='stable'` without an existing `E:/Development/Docs/a11y/results/<id>.md`) + `check-status.test.mjs`
(pass + each failure mode). Create `E:/Development/Docs/a11y/maturity-model.md` (three tiers; Stable REQUIRES a
manual-SR pass per A11Y-1). Component-id vocabulary = lowercase basenames (matches A11Y-1/BREADTH-1). Add root
`test:a11y-status`. Add ONE step "Component maturity status" to the EXISTING `gates` job in `ci.yml` after
`test:api`. **Because GOV-6 made release.yml reuse ci.yml, this step now also gates publishing automatically** —
do not touch release.yml. **Verify:** `npm run test:a11y-status` green; flip one component to `stable` without a
results file → non-zero; new gates step green in CI.

### A11Y-4 — ADR-0018: VPAT/ACR deferral  *(dep A11Y-1, DIST-1)*
Create `E:/Development/Docs/adr/0018-vpat-acr-deferral.md` (per template; Accepted; dated). Decision: defer a
formal VPAT/ACR now; rationale; explicit triggers to flip it (regulated-sector customer, RFP requirement, N
components Stable); interim evidence UIx already produces (axe gate, manual-SR results, maturity registry).
Cross-link `manual-sr-protocol.md` + `maturity-model.md`.

### DTCG-4 — ADR-0019: DTCG revision target + deviation policy  *(dep DTCG-1, DIST-1)*
Create `E:/Development/Docs/adr/0019-dtcg-revision-target-and-deviation-policy.md`. Decision names the exact DTCG
revision targeted (matching DTCG-1's pinned revision) and ratifies the deliberate deviations (identity `uix/value`
transform preserving runtime brand override; string-form shadow/cubicBezier/dimension; no DTCG aliases).
Consequences: "canonicalizing these to DTCG object/array form is a **parity-breaking** change that must go through
the contract-change process." Cross-link `contract-change-process.md` + the DTCG-1 audit.

**ADR-INDEX (shared, once):** after 0018 and 0019 both exist, run
`node E:/Development/Infrastructure/agent-kits/adr-kit/gen-adr-index.mjs`. **Verify:** `git diff adr/README.md`
shows rows 0018 and 0019 added.

### WHEN DONE
`npm run build:all`, `test:parity`, `test:contract`, `test:api`, `test:smoke`, `test:visual`, `test:a11y` green,
plus `test:a11y-status`. No token/CSS/api-surface change → goldens/baselines untouched; no changeset. Commit and push.
