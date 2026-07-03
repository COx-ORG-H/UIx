# Batch 5 — Docs-coverage gate + non-React consumer docs

*Depends on Batch 4 (merged). Paste below the line into a fresh agent.*

---

Work in `E:/Development/Projects/UIx` (clean `master`). Branch:
`git checkout master && git pull && git checkout -b batch5-docscoverage-distdocs`. Assume Batch 0–4 landed (DOCS-2
page pattern + button/table content, DIST-2 `registry.json`, ADR-0017). **GATE CHECK:** DIST-4 is conditional on
ADR-0017 not being option A — see the fallback note in DIST-4. `ci.yml` writer here is DOCS-4 only; DIST-4 owns
`README.md` + `design-system.md`.

### DOCS-4 — Docs-coverage CI gate with shrinking allowlist  *(dep DOCS-2)*
Create `packages/tokens/scripts/check-docs-coverage.mjs` (read the component list from
`packages/react/etc/uix-react.api.md` and the `docs/content/*.json` set; fail for any component missing a content
file OR the required fields `overview`/`do`/`dont`/`a11yNotes`, UNLESS its id is in
`docs-coverage-allowlist.json`) and `packages/tokens/docs/docs-coverage-allowlist.json` (with a one-line reason
header pointing at DOCS-6 as the burn-down, matching the `raw-value-allowlist.json` convention). With Button+Table
done and everything else allowlisted, the gate passes green. Add `test:docs` to `packages/tokens/package.json` + a
root `test:docs` alias. Add a "Docs coverage" step to the `gates` job in `ci.yml` after `test:api`. **Verify:**
`npm run test:docs` exits 0 with the allowlist; delete an entry for an undocumented component → exits 1; new
"Docs coverage" CI step green.

### DIST-4 — `components.json` descriptor + CSS-only consumer docs  *(dep DIST-1, DIST-2; conditional)*
Create `packages/tokens/components.json` (shadcn-recognizable shape: `$schema`, `style`, css/config pointers,
aliases; pointing at `@tensor_1/tokens/css` + themes + the registry — validate it references
`registry/registry.json`, no invented list) and `packages/tokens/docs/consume-css-only.md` (the full non-React
path: install tokens + theme, then npm-import `components.css` OR copy-in via `uix add`, worked example for button
with exact `--uix-*` imports). Update `README.md`: add a "CSS-only / non-React consumers" subsection linking the
new doc (and, once DIST-3 lands, the CLI), replacing the vague "Copy-paste still works too" line; **also add the
`Docs/component-roadmap.md` link** (the README line deferred from BREADTH-1, folded here so README stays
single-writer). Update `Docs/design-system.md`'s vendor-sync section to reference the registry manifest as the
canonical copy-in inventory. **Option-A fallback (correction C8):** if ADR-0017 chose npm-only, DROP the
registry/CLI references — the doc degrades to "import `@tensor_1/tokens/styles` (or `./bundle`) + a theme", and
`components.json`/the roadmap link are skipped. **Verify:** link-check every path/command in
`consume-css-only.md` + the README subsection; `components.json` validates against its `$schema`.

### WHEN DONE
`npm run build:all`, `test:parity`, `test:contract`, `test:api`, `test:smoke`, `test:visual`, `test:a11y`,
`test:docs` green. No component CSS/token change → goldens/baselines untouched. Add a changeset if
`components.json` is a `@tensor_1/tokens` published-surface addition. Commit and push.
