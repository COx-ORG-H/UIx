# Batch 2 — React size budgets · jest-axe harness · wrappers A · TW/TS examples

*Depends on Batch 1 (merged). Paste below the line into a fresh agent.*

> **Splittable:** A11Y-3 touches only `packages/react/**` + a new `react-a11y` CI job. If you want more
> concurrency, run A11Y-3 in its own window parallel to the rest of this batch — just coordinate the two
> `packages/react/package.json` devDep appends and the two NEW disjoint `ci.yml` jobs at merge.

---

Work in `E:/Development/Projects/UIx` (clean `master`). Branch:
`git checkout master && git pull && git checkout -b batch2-perf-a11y-wrappersA-examples`. Assume Batch 0–1 landed
(docs scaffold+pages, maturity registry in the gates job, ADRs 0017/0018/0019, roadmap, `examples/` harness from
FR-2, GOV-6 ci↔release reuse). `ci.yml` writers here are **two NEW top-level jobs** (`size` from PERF-1,
`react-a11y` from A11Y-3) — textually disjoint from each other and from the `gates` job, so no collision.

### PERF-1 — size-limit budgets for React main + `./chart` (new `size` CI job)  *(dep PERF-2)*
Create `packages/react/.size-limit.cjs` with ≥2 checks — `dist/index.js` (main ESM) and `dist/chart.js` — each
brotli-limited with `react`,`react-dom`,`echarts` marked **external** (mirror `tsup.config.ts`) so budgets measure
only shipped code. Add an assertion proving **echarts is NOT bundled into the main entry** (main stays small vs the
chart entry). Record baseline numbers as comments. Pin `size-limit` + deps to EXACT versions in
`packages/react/package.json` devDependencies; add a `size` script there; add root `test:size = npm run size -w
@tensor_1/react`. Add a NEW `size` job to `ci.yml`: `npm ci` → `npm run build:react` → `npm run test:size` AND
`npm run test:size:css` (PERF-2 landed in Batch 0). This job **owns all size CI wiring**. **Verify:** `npm run
test:size` passes at HEAD; lowering a limit → non-zero; new `size` CI job green.

### A11Y-3 — jest-axe React-component a11y harness (new `react-a11y` CI job)  *(dep A11Y-2)*
`node --test` can't render TSX, so wire `vitest` + `jsdom` + `jest-axe` + `@testing-library/react` as
`packages/react` devDeps (pinned). Create `packages/react/vitest.config.ts` (scope to `src/**/*.test.tsx` ONLY, so
`table-engine.test.mjs` still runs under `node --test`), `src/a11y/setup.ts`, `src/a11y/axe.test.tsx` (render the
form primitives + Modal, assert `toHaveNoViolations`), and `src/a11y/keyboard.test.tsx` (Modal focus-trap/Esc,
Space+Enter activation, focus-visible, `prefers-reduced-motion`). Add a `test:a11y` script to
`packages/react/package.json`. Add a NEW `react-a11y` job to `ci.yml` that installs the react workspace and runs
the vitest suite (a **separate job**, not the `gates` job — it needs the react devDeps that `build:all`'s inner
`npm ci` prunes). **Verify:** `cd packages/react && npm run test:a11y` green (zero violations); new `react-a11y`
CI job green; `test:api` lock + `table-engine` node:test still pass. *(This covers the ~45 components plain axe
over the styleguide misses — the audit's A11y-automated dimension.)*

### BREADTH-2 — Wrapper batch A (FIRST of the strictly-serial wrapper chain)  *(dep BREADTH-1)*
Create `packages/react/src/components/{Breadcrumbs,Kbd,Steps,Sla,Heartbeat}.tsx` following the
`Label.tsx`/`Button.tsx` pattern (`import { cx } from '../cx.js'`, typed props extending the right
`HTMLAttributes`, root classes matching the REAL CSS — verify each via
`git show HEAD:packages/tokens/styles/components/<name>.css`: `uix-breadcrumbs`, `uix-kbd`, `uix-steps/uix-step`,
`uix-sla`, `uix-heartbeat`). Export all five + Props types from `packages/react/src/index.ts` inside ONE
contiguous `// --- breadth batch A ---` block appended at the END of the barrel. Regenerate
`packages/react/etc/uix-react.api.md` via `npm run test:api:update`. Append a demo block to
`packages/tokens/index.html` (append-only). Flip these five rows Planned→Alpha in `Docs/component-roadmap.md`.
**Verify:** `npm run build:react && npm run test:api` (no api.md drift after commit) + `npm run typecheck -w
@tensor_1/react`. **VR/a11y (correction C4):** appending to `index.html` changes rendering — (1) do NOT assert
local `test:visual` on Windows; re-baseline the committed `*-linux.png` goldens via the pinned container
`docker run --rm -v "$PWD":/w -w /w mcr.microsoft.com/playwright:v1.61.0-jammy npm run test:visual:update` (or the
`update-visual-goldens` workflow) and commit them; (2) run `npm run test:a11y` locally and **fix any axe violation
your new demo markup introduces** before merge.

### FR-3 — Tailwind consumer example  *(dep FR-2)*
Create `examples/tailwind/{index.html,src/input.css,package.json,README.md,verify.mjs}`. `input.css` uses the exact
README import order: `@tensor_1/tokens/css` → `.../themes/tensor` → `.../tailwind` → `tailwindcss`. `index.html`
uses ≥3 generated utilities that exist only because of `@theme` (`bg-uix-accent`, `text-uix-text-muted`,
`rounded-uix-md`) + a `.uix-*` class. `verify.mjs` packs tokens, installs it + a PINNED tailwindcss into an
isolated consumer (reuse FR-2's harness, no symlink), runs the Tailwind build, and greps the compiled output for a
`uix-*` utility rule. **Verify:** `node examples/tailwind/verify.mjs`.

### FR-4 — TS / cssVar consumer example  *(dep FR-2)*
Create `examples/ts/{app.ts,tsconfig.json,README.md,verify.mjs}`. `app.ts` imports `{ cssVar, light, dark, num }`
from `@tensor_1/tokens/ts`, reads one member of each with correct narrow types (match `build/ts/tokens.d.ts`), plus
a commented invalid-token-name line documenting the union guard. `tsconfig` `moduleResolution` = `Bundler` or
`NodeNext` (copy `tests/smoke-consumer/tsconfig.json`). `verify.mjs` packs tokens, installs into an isolated
consumer, runs `tsc --noEmit` against the packed `.d.ts`, and runtime-asserts `cssVar.accent==='var(--uix-accent)'`
and `num['space-4']` is a number. **Verify:** `node examples/ts/verify.mjs`.

### WHEN DONE
`npm run build:all`, `test:parity`, `test:contract`, `test:api` (matches your regenerated api.md), `test:smoke`,
`test:a11y` (must pass with the new demo markup), `test:size`, and `cd packages/react && npm run test:a11y` all
green. **Re-baseline the VR goldens** for the `index.html` demo change (pinned container / `update-visual-goldens`)
and commit the PNGs — do not assert local `test:visual` on Windows. Add a **changeset (minor)** for the new
`@tensor_1/react` exports. Commit and push.
