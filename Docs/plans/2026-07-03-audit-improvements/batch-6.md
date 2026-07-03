# Batch 6 — Examples CI + copy-in CLI + fill doc pages + WC spike

*Depends on Batch 5 (merged). Paste below the line into a fresh agent.*

> **Highly parallel batch.** DOCS-6 (content JSON), DIST-3 (CLI), FR-1 (spike) touch disjoint file sets and can
> be split across windows. Only FR-5 edits `ci.yml` + root `package.json` + `README.md`.

---

Work in `E:/Development/Projects/UIx` (clean `master`). Branch:
`git checkout master && git pull && git checkout -b batch6-examples-cli-docsfill`. Assume Batch 0–5 landed
(FR-2/3/4 examples + verify scripts, DIST-2 registry, DOCS-2 + DOCS-4 docs pattern + coverage gate). **GATE CHECK:**
DIST-3 is conditional on ADR-0017 not being option A.

### FR-5 — Wire examples into CI + document the CSS-only bundle story  *(dep FR-2, FR-3, FR-4)*
Create `examples/verify-all.mjs` (run `plain-css`, `tailwind`, `ts` verify scripts in sequence, fail-fast). Add
root `test:examples = node examples/verify-all.mjs`. Add ONE step to the EXISTING `gates` job in `ci.yml` after
"Build all" running `npm run test:examples`. Update README's "Use it in a project" with a "CSS-only (no framework)"
subsection documenting `@tensor_1/tokens/bundle` (single file: tokens+base+util+motion+components) vs
`@tensor_1/tokens/styles` (components-only, pair with `./css` + a theme) and the `base→utilities→motion→components`
load order. This slice **owns** the root `package.json` + `ci.yml` + `README.md` edits for the examples area.
**Verify:** `npm run test:examples` (all three verifiers pass) + new gates step green.

### DIST-3 — `uix add` copy-in CLI  *(dep DIST-2; conditional)*
Create `packages/tokens/bin/uix.mjs` (`uix add <name> --dest <dir>`: look up `<name>` in `registry/registry.json`,
copy `styles/components/<file>` to `<dest>`, print required token imports `@tensor_1/tokens/css` + a theme + the
component's `--uix-*` deps; `uix list`; unknown name exits non-zero), `packages/tokens/scripts/lib/resolve-component.mjs`,
`tests/registry-consumer/run.mjs` (drive the CLI over ~5 components — button, card, table, alert, status-pill —
asserting each css lands and its declared token deps exist in `build/css/tokens.css`), `tests/registry-consumer/README.md`.
Declare a `bin` entry (`uix`→`bin/uix.mjs`) and a `test:registry:consumer` script in `packages/tokens/package.json`
(package-only, so it doesn't race FR-5's root `package.json` edit). Zero runtime npm deps (node built-ins). **Verify:**
`npm run build && npm run test:registry:consumer` green; `node packages/tokens/bin/uix.mjs add button --dest <tmp>`
produces `button.css` and prints its token imports.

### DOCS-6 — Fill remaining doc pages + burn down the allowlist  *(dep DOCS-2, DOCS-4)*
For every component exported in `packages/react/etc/uix-react.api.md` lacking a `docs/content/<slug>.json`, author
one (overview, whenToUse, do[], dont[], a11yNotes[], liveExampleHtml with real `.uix-*` classes) — **enumerate
strictly from api.md, never from memory**. Remove each completed component from
`packages/tokens/docs/docs-coverage-allowlist.json` (append-only removals) as its page lands. Ground do/dont in
`Docs/design-system.md` policy, not invented advice. Splittable across sessions (5–8 components each; each agent
removes only its own allowlist entries). **Verify:** `test:docs` stays green throughout; with the allowlist EMPTY,
`test:docs` green; spot-check several pages for props + do/dont + a11y + light/dark live example.

### FR-1 — Web-components feasibility spike (throwaway)  *(dep FR-2)*
Create `examples/wc-spike/uix-button.mjs` (ONE `<uix-button>` custom element rendering `.uix-btn` and resolving
`--uix-*`; test BOTH a light-DOM variant AND a shadow-DOM variant, documenting that `--uix-*` custom properties
INHERIT through the shadow boundary but `.uix-*` class RULES do NOT — a shadow-DOM element needs the component CSS
re-injected via `adoptedStyleSheets`), `examples/wc-spike/uix-button.html` (loads `@tensor_1/tokens/css` + a theme
+ the element next to a plain `.uix-btn` for parity), `examples/wc-spike/README.md`, and
`Docs/specs/2026-07-03-web-components-feasibility-spike.md` (findings, the shadow-DOM styling constraint, a
maintenance-cost estimate, and an EXPLICIT go/no-go trigger: "promote to a maintained `@tensor_1/wc` package only
when a concrete non-React product surface is committed"). MUST stay throwaway: NO `package.json` exports entry, NO
CI gate, NO `packages/wc` dir. **Verify (manual):** open `uix-button.html` — `<uix-button>` renders identically to
the adjacent `.uix-btn` in light+dark; the decision doc records a go/no-go trigger.

### WHEN DONE
`npm run build:all`, `test:parity`, `test:contract`, `test:api`, `test:smoke`, `test:visual`, `test:a11y`,
`test:examples`, `test:docs` (aim for empty allowlist), `test:registry:consumer` green. Add a changeset if the CLI
`bin` entry / `components.json` is a `@tensor_1/tokens` published-surface change. Commit and push.
