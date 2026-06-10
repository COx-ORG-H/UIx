# UIx Modularity Audit — fitness for GOVx / SKLx / SHOPx / POSx

**Date:** 2026-06-10 · **Tree:** post-rename (`hx` → `uix`), HEAD `5b98ffb` + rename · **Method:** full read of tokens package, all 17 registry component files, all 6 gate/utility scripts, both fixtures, CI workflow; every numbered claim spot-verified against file:line.

> **Status update (2026-06-10, post-build):** this audit drove a same-day build-out (commits `5c9fd5a..` on main); the document below is preserved as written. Where it stands now: **§1 blocker fixed** — all composites re-wired to the contract (utility classes + `var(--uix-*)` only) and the gate hole closed (`lint:registry` + broadened `lint:fixtures` enforce the triplet ban, unknown-var, and write-only-slot checks; fixtures mount every composite at `/preview`). **§2 shipped** — brand slot tier (`--uix-brand`/`--uix-brand-fg`) with chained accent/link/ring fallbacks, plus `themes/_template.css` overlays. **§3 partially addressed** — `toast`, `app-shell`, `status-pill`, `stat-tile` landed; `form` gained select/checkbox/radio-group/date; `data-table` gained pagination/row-selection/sticky header (registry now 20 items). **§4 hardened** — commit-based registry stamps on every distributed file + `uix-diff check --max-age-days`; exact dependency pins. **§5 secondary findings all addressed.** See README → Build-out phases.

## Verdict

The two-mechanism architecture (npm for token values, shadcn registry for vendored component code, no shared primitives) is sound for a solo-maintained multi-product portfolio, and the token layer is well built. But the system has one blocker-class defect: **the 17 composites do not consume the token contract they ship with** — they still speak the legacy ITSMx token dialect, and the gate suite is structurally blind to it. Until that is fixed, `shadcn add @uix/<item>` delivers components whose colors silently resolve to invalid CSS in every new product. Fix this before any product onboards (a "Phase 0.5"); the per-product branding question and the ERP component gaps are real but secondary, because they only matter once the composites are actually on the contract.

---

## 1. Blocker: composites are not wired to `@uix/tokens`

The components were ported verbatim from `@itsmx/shared-ui` and still reference ITSMx's channel-triplet token scheme via inline styles — `155` occurrences of `rgb(var(--<legacy-name>))` across the registry:

| Legacy name referenced | Count | Defined by `@uix/tokens`? |
|---|---|---|
| `--text-primary` | 46 | No (contract has `--uix-text`) — resolves to nothing |
| `--text-hushed` | 44 | Only as `--uix-text-hushed` — resolves to nothing |
| `--bg-hover` | 23 | Only as `--uix-bg-hover` — resolves to nothing |
| `--surface` | 18 | Only as `--uix-surface` — resolves to nothing |
| `--danger-text`, `--danger-fg`, `--focus-ring`, `--amber` | 12 | Defined nowhere, in either system |
| `--accent`, `--danger`, `--success`, `--accent-fg`, `--text-muted`, `--bg-app` | 16 | Bridge defines some unprefixed — but as **full hex values**, so `rgb(#E4F222)` is still invalid CSS |

Example (`registry/uix/async-operation-status/async-operation-status.tsx:77-80`): every state color is `rgb(var(--text-hushed))`-style. In a consumer that wires tokens exactly as the README instructs, all of these compute to invalid values → transparent/inherited colors. This is precisely the failure class README line 81 claims the linter prevents.

**Why every gate is green anyway** — each gate has a scope that excludes inline-style CSS variables:

| Gate | What it actually scans | Why this slips through |
|---|---|---|
| `check-emission` | Tailwind class literals in `className=`/`cn()` vs built fixture CSS | Broken tokens live in `style={{…}}` objects and JS color maps — never parsed |
| `uix-lint-tokens` (incl. its own `rgb(var())` ban, line 81) | Only `fixtures/*/app/globals.css` (`package.json:12`) | Vendored component files are never linted |
| `check-purity` | Import specifiers + template-literal classNames | Doesn't look at CSS var names |
| `check:semver` | Token-name set vs `contract-snapshot.json` | Snapshot is byte-identical to the contract → currently inert; value/mode changes also invisible |
| Dual fixture build | Compile + class emission | `app/all/page.tsx` only imports modules and lists export names — no composite is ever visually mounted |

So "Phase 0 verified, all gates passing" is true and yet proves compile-correctness only, not themed rendering.

**Fix (Phase 0.5, do before first consumer):**
1. Mechanically re-wire all 155 refs to the contract idiom (`var(--uix-text)` etc. — full-value vars, no `rgb()` wrapper; alpha via `color-mix`, which is the contract's own convention). The four never-defined names (`--danger-text`, `--danger-fg`, `--focus-ring`, `--amber`) need token decisions, not just renames — either add them to the contract or map to existing tokens.
2. Close the gate hole: extend `uix-lint-tokens --src` (it already walks a source tree for the cold-gray ban) to also reject `rgb(var(--…))` and any `var(--…)` name outside the contract + bridge set, inside `components/uix/`. Run the same check against `registry/uix/` in this repo's CI.
3. Add one fixture page that actually renders each composite, even without screenshots — it makes manual verification possible and catches import-time regressions.

---

## 2. Theming: one house brand vs. brand-per-product

### What works today (single brand)

The override mechanism is genuinely well designed and verified working:

- Consumers re-point tokens inside a fenced block in their own `globals.css`; the linter enforces contract-names-only and block placement (`uix-lint-tokens.mjs:58-78`), and `test-lint-tokens.mjs` codifies the pattern. The baseui fixture already does a brand override this way (accent/fg/ring/link, light + dark).
- Dark mode answers both conventions at once — `:root:where(.dark,[data-theme="dark"])` at (0,1,0) specificity — so consumer overrides win by source order and per-product theming composes correctly with light/dark.
- One `pnpm up @uix/tokens` propagates value changes to every product; the linter ships inside the package so it can't drift behind the contract.

**Caveat:** today this only themes Layer-1 primitives (via the shadcn bridge). It does nothing for the composites until §1 is fixed — a GOVx blue accent would restyle buttons and miss every data table, dialog, and status card.

### What brand-per-product would require

If GOVx/SKLx/SHOPx/POSx each get their own brand, the current contract is too thin in four places:

1. **No brand slot, only `accent`.** A product brand is realistically accent + link + ring + selection + sidebar emphasis + chart anchor. Today that's 4 manual override lines that must stay mutually consistent per product, twice (light/dark). Add a small derived tier — e.g. `--uix-brand`, `--uix-brand-fg`, `--uix-brand-muted` — that `accent`/`link`/`ring`/`sidebar-primary` default from, so a product brand is 2–3 lines.
2. **Single-tier hardcoded hex.** `tokens.json` has no primitive→semantic layering — every value is a literal. Fine for one brand; for four, each override is hand-derived (no ramp to lean on for hover/active/bg variants of a new brand color). Acceptable cost if overrides stay small; becomes painful the moment products want distinct status colors or chart palettes.
3. **No per-product theme artifact.** The clean mechanism at 4+ products: `@uix/tokens` additionally ships optional `themes/<product>.css` overlays (just override blocks, same linter rules), so a product's brand is versioned in this repo rather than living as copy-paste in each consumer's `globals.css`. One npm package, N small overlay files — no change to the distribution model.
4. **Status/chart color surface doesn't exist as override targets** — see §3. You can't re-brand what isn't tokenized.

**Decision cost:** going brand-per-product later is cheap *if* §1's fix routes all composite colors through contract vars now — then branding is purely a token-layer concern. The expensive path is letting products fork composites to restyle them (see §4).

---

## 3. ERP component coverage

The portfolio's strength is the ITSM-derived list/detail/command pattern; the transactional half of an ERP surface is thin to absent.

**Present and solid:** data table (multi-sort, 7 typed filter kinds, column visibility/reorder, 3-density), schema-driven form (react-hook-form + zod), command palette (actions/nav/entity-jump, permission- and flag-filtered), detail layout, empty/loading/error/forbidden states, confirm-with-challenge + undoable-action hook, relative time, user chip, markdown, cheat sheet. A11y posture across all of them is consistently good (roles, aria-sort, aria-activedescendant, focus management).

**Missing, by what GOVx/SKLx/SHOPx/POSx will actually ask for:**

| Gap | Evidence | Hits hardest |
|---|---|---|
| Table: no pagination, row selection, inline edit, column resize, sticky header, CSV export; virtualization explicitly out of scope | `data-table.tsx:142` | All four (any admin list > 1 screen) |
| Form: field types are text/email/password/number/url/tel/textarea only — no select, checkbox, radio, date, file, combobox, field arrays | `form.tsx:33` | All four (no ERP form survives without selects) |
| No number/currency formatting or money input anywhere | — | SHOPx, POSx |
| No date/range picker (filtering uses native `<input type=date>`); locale hardcoded en-US/en-GB in `relative-time` default formatter | `filter-popover.tsx:398`, `relative-time.tsx:114-135` | SKLx (scheduling), GOVx |
| No charts and no chart palette tokens | — | All dashboards |
| No app shell / sidebar / topbar / breadcrumb components (tokens reserve `--uix-sidebar-w` + 8 bridge sidebar slots, nothing consumes them) | `tokens.json:76,103-110` | All four — every product rebuilds the shell |
| No toast system (the undo hook *assumes* one exists) | `confirm-action.tsx:269-301` | All four |
| No file upload | — | GOVx (documents), SKLx |
| Density is hardcoded Tailwind class maps inside components, not tokens — products can't retune compactness centrally | `data-table.tsx:41-51`, `states.tsx:144-148` | POSx (touch) vs GOVx (dense) pull opposite directions |
| Token contract lacks: focus-ring token (components call an undefined `--focus-ring`), status color ramps (one step + bg each), spacing scale, z-index scale | `theme-contract.json` | — |

**Domain leakage to scrub** (cheap, do during §1's rewrite): hardcoded `INC-…` placeholder in command palette (`command-palette.tsx:315`), non-injectable English `LABELS` in async-operation-status (`:83-88`), "Recent tickets"/"Owned CIs" defaults in user-chip, ITSM example IDs in list-surfaces errors. Everything else is label-prop-overridable. There is no i18n story beyond per-prop label injection — adequate for now, worth a deliberate decision before SKLx/GOVx if they're not English-only.

**Manifest drift:** README's seed list names `status-pill` and `stat-tile`; neither exists in `registry.json` or `registry/uix/`.

---

## 4. Distribution & drift at 5 products

The vendoring model means 5 products × 17 files = **85 independently mutable copies**. The mechanics that exist are good but pull-only:

- Updates reach a product only when someone runs `npx shadcn add @uix/<item> --overwrite` there. No push, no notification, no per-item version — `registry.json` items carry no version field, so "you're on data-table from January" is not expressible anywhere.
- `uix-diff check` classifies copies (clean-current / clean-but-outdated / forked / untracked / missing) against `.uix-lock.json` + an optional `--registry dist/r`. Two soft spots: **clean-but-outdated never fails CI** (staleness is surfaced, not enforced), and the registry comparison requires a locally built `dist/r`, which is gitignored (not committed, not built in CI) — wherever a consumer runs `uix-diff` without first building the registry, staleness is invisible.
- Fork markers (`// uix-fork: <reason>` in first 5 lines, else exit 1) make divergence *visible*, not *reconciled*; a forked file is severed from updates permanently, by design.

Two consequences worth acting on:

1. **§1 multiplies drift.** If products onboard before the composites are re-wired, every product immediately forks every component to fix its colors — 85 day-one forks, maximum divergence, the worst possible start. This is the strongest argument for Phase 0.5.
2. **Cheap leverage:** stamp a version/commit header into each registry file at `shadcn build` time (one line in the build step), and make `clean-but-outdated` configurable to fail after N months. Together they convert "drift is visible if you look" into "drift ages loudly."

The token layer has none of these problems — npm semver + in-package linter is the right call, and `check-token-semver`'s rename/removal→major policy is correct (once the snapshot actually diverges from the contract; today it's byte-identical, so the gate has never fired).

---

## 5. Secondary findings

1. `lucide-react: ^1.17.0` in both fixtures while npm's `latest` dist-tag points at 1.16.0. The spec does resolve (lockfile pins 1.17.0, regenerated 2026-06-10), so installs work — but a version ahead of `latest` is unusual; pin exact to avoid surprises if the tag situation changes.
2. No `engines` field or `.nvmrc` anywhere; Node 22 + pnpm 10 are pinned only in CI and `packageManager`. Add `engines` to root + tokens package.
3. Tailwind **v4-only** by construction (`@theme inline`, `@custom-variant`, `color-mix` alpha idiom). A future v3 consumer breaks completely. Document as an explicit support floor.
4. `--uix-font-sans` defaults to `"Geist"` but neither fixture loads the font — CI never renders the real brand typeface. Load via `next/font` in fixtures.
5. `markdown.tsx:56-60`: module-level mutable `keySeq` for React keys — non-deterministic keys under concurrent SSR. Replace with per-render counter.
6. `states.tsx` mixes `var(--border)` (works via bridge) and `rgb(var(--text-hushed))` (broken) in one file — symptomatic of §1; the rewrite should normalize the idiom file-wide, not patch hits.
7. Adding `@uix/states` (or `@uix/async-operation-status`) transitively vendors the entire data-table chain and installs `@tanstack/react-table` — the imports are type-only, so the cost is dependency/vendoring footprint, not bundle size. Extracting `DataTableDensity` + `RFC7807Problem` into a tiny `@uix/types` item would cut the knot.
8. `shadcn` CLI is caret-pinned (`^4.10.0`) — the registry build isn't reproducible across CLI minors. Pin exact.
9. README says "15 registry items" but data-table bundles 3 files (17 component files total) — fine, just keep the counts straight when adding items.

---

## 6. Recommended sequence

1. **Phase 0.5 — contract re-wire (blocker):** migrate all 155 legacy refs to `var(--uix-*)`; decide the 4 missing tokens (`danger-text`, `danger-fg`, `focus-ring`, `amber`); scrub domain strings (§3); extend `uix-lint-tokens` to scan component sources; add a fixture page that mounts every composite. Exit criterion: a fresh consumer gets correctly themed composites with zero overrides.
2. **Per-product branding decision:** if yes — add the brand slot tier and `themes/<product>.css` overlays to `@uix/tokens` (§2). Do this before the first non-house-brand product, not after.
3. **Drift hardening (before product #2):** version stamp in registry files; `clean-but-outdated` max-age; build `dist/r` in CI so `uix-diff --registry` has something to compare against.
4. **ERP backlog, demand-ordered (rule of two still applies):** select/checkbox/date form fields and table pagination + selection will be demanded first by whichever product onboards first; currency formatting before SHOPx/POSx; app shell + toasts are the highest-leverage new items since all four products need them on day one.

---

## Appendix: rename notes (hx → uix, 2026-06-10)

- Full namespace rename executed: `@uix/tokens`, `--uix-*` vars, registry `uix`, `components/uix/`, `uix-lint-tokens`, `uix-diff`, `.uix-lock.json`, `// uix-fork:` markers, `@uix-overrides` blocks, GitHub homepage → `harisdizdarevic/uix`. Display name in prose: **UIx**. `contract-snapshot.json` renamed in lockstep with the contract, so the semver gate's baseline stays consistent (no false major).
- `pnpm-lock.yaml` regenerated (workspace package names changed).
- **npm scope caveat carries over:** zero packages exist under `@uix` (registry search, 2026-06-10), but scope-name availability can't be confirmed until claim time — same placeholder status ADR-0004 documented for `@hx`.
- No other project in `D:\Development\Projects` references `hx-ui` or `@hx/` (swept all md/json/ts/tsx/css/mjs/yml outside node_modules) — the rename has no external blast radius.
- Folder rename `hx-ui` → `UIx` on disk: left to you (re-add the folder in Cowork afterward).
