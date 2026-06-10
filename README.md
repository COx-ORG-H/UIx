# UIx — the house design system

One source of truth for how every project in this portfolio looks: a **token contract** (colors, typography, spacing, motion, light/dark) plus a **library of proven composite components**, installable into any project with two commands.

> **Status: built, audited, and hardened** (2026-06-10). The architecture was validated by a multi-agent design review (3 competing proposals, fact-check against live shadcn registry docs, 2 adversarial judges), then built and — same day — audited (`AUDIT.md`) and hardened: 67-token contract (v1.0.0, with a brand slot tier), 20 registry items / 22 component files (15 ported from `@itsmx/shared-ui` and re-wired to the contract, plus `@uix/types`, `toast`, `status-pill`, `stat-tile`, `app-shell`), dual fixtures (Radix/Next 15 + Base UI/Next 16) building green with a `/preview` gallery mounting every composite, all gates passing (`pnpm check`), and a real `shadcn add @uix/data-table` proven end-to-end against the HTTP registry. **Pending your action:** npm login + scope claim (then publish `@uix/tokens@1.0.0` — rename the `@uix` placeholder first if the scope differs), and optionally a GitHub remote. See [Build-out phases](#build-out-phases).

---

## What this is

ITSMx carries the canonical design spec ([`ITSMx/Docs/design-system.md`](../ITSMx/Docs/design-system.md) — Ramp-calibrated warm neutrals, one near-black at two opacities, hairline borders, solar accent). DASHx **hand-copied** those token values into its own CSS. Every future project would copy them again, and every value change would have to be re-applied by hand in N places. UIx replaces the copying with plumbing.

Three real-world constraints shaped the architecture — they are why this is *not* a conventional shared component library:

1. **The consumers already diverge structurally.** ITSMx: Next 15, hand-maintained **Radix** primitives, dark mode via `[data-theme="dark"]`. DASHx: Next 16, CLI-managed **Base UI**, dark mode via `.dark`. Forcing them onto one shared component package would mean a risky, zero-user-value migration.
2. **Lesson L47 (Tailwind v4 + pnpm).** Tailwind v4 doesn't scan `node_modules`; pnpm symlinks workspace/npm packages into it. Classes used only inside a shared component *package* are silently never emitted → invisibly unstyled UI. Pure-CSS tokens and vendored component code are structurally immune; compiled component packages are permanently exposed.
3. **Solo maintenance.** One person, ~10 projects, an autonomous CI build running on ITSMx. Anything that breaks hard when ignored for three months (expiring registry tokens, publish pipelines in the hotfix path) is disqualified. The worst allowed failure mode is *staleness*.

## The architecture in one picture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — COMPOSITES        custom shadcn registry (@uix/…)      │
│ data-table, app-shell, command-palette, toast, form, …           │
│ → vendored into each project via `npx shadcn add @uix/<item>`    │
│ → you own the code; forks legal but marked (// uix-fork:)        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1 — PRIMITIVES        ★ deliberately NOT shared ★         │
│ each project keeps its own components/ui and its own            │
│ Radix-or-BaseUI choice — the token contract makes them          │
│ render identically                                              │
├─────────────────────────────────────────────────────────────────┤
│ Layer 0 — TOKENS            @uix/tokens npm package (semver'd)   │
│ pure CSS custom properties: colors, fonts, radius, motion,      │
│ light+dark — one `pnpm up @uix/tokens` updates every project     │
└─────────────────────────────────────────────────────────────────┘
```

Exactly **two distribution mechanisms** (npm for values, shadcn registry for code) and **one deliberate absence** (no shared primitives). Each layer gets the cheapest mechanism that matches how often it changes and how it fails.

## How it works

### Layer 0 — `@uix/tokens` (the contract)

A tiny npm package of pure CSS — no classes, no JS, nothing for Tailwind to scan, so L47 cannot bite. Everything is prefixed `--uix-` to never collide with shadcn or project-local names.

**Names are the contract; values are defaults.** Projects override values, never invent names.

| File | Role |
|---|---|
| `tokens.json` | Single machine-readable source. The build emits everything below from it — contract and CSS can never diverge by hand-edit. |
| `tokens.css` | The values, light + dark. Dark is declared once under `:root:where(.dark, [data-theme="dark"])` — serving **both** dark-mode conventions at specificity (0,1,0), so project overrides written after the import always win by source order. |
| `shadcn-bridge.css` | Maps shadcn's semantic names (`--background`, `--primary`, `--ring`, …) onto `--uix-*` vars. Needs **no dark block** — the uix vars flip underneath it. This is what makes raw shadcn components on-brand with zero per-component work, on either primitive base. |
| `tailwind.css` | `@theme inline` bindings so `bg-uix-subtle`, `text-uix-hushed`, `ease-out-strong` utilities exist without boilerplate. **Required when installing composites** — they style themselves with `*-uix-*` utilities. Safe from node_modules because `@theme` entries are definitions, not class usages. |
| `theme-contract.json` | The required-token name list `{name, type, requiredModes}` — what the linter enforces. |
| `themes/_template.css` | Theme-overlay starting point (all comments, zero effect when imported). Copy to `themes/<product>.css` for a brand that ships inside the package. |
| `bin/uix-lint-tokens.mjs` | The gate, shipped *inside* the package so every consumer gets the current linter with the dependency (gates can't drift behind the rules). |

**Versioning law** (mechanized, publish-blocking): adding a token = minor; renaming/removing = **major + ADR**. CI diffs the contract snapshot against the last published version and fails the publish on a wrong bump type.

### Layer 1 — primitives (none, on purpose)

Each project runs `shadcn init --base radix` or `--base base-ui` and owns its `components/ui/`. The bridge + tokens make a Radix button and a Base UI button visually identical. This dissolves the Radix/Base-UI, CLI/hand-maintained, and Next 15/16 divergences without anyone paying a migration. **1:1 styling wrappers around shadcn primitives are banned** — tokens already do that job; a wrapper would be pure tax.

### Layer 2 — the `@uix` composite registry

Components earn a place here only when they encode a **cross-project product convention**, not a styling preference. The seed inventory came from the proven `@itsmx/shared-ui` set; the 2026-06-10 build-out added the app-frame tier. Current inventory (20 items, 22 component files):

`data-table` (+ toolbar, column visibility, saved views, pagination, row selection, sticky header) · `app-shell` (+ breadcrumbs) · `command-palette` · `detail-layout` · `form` (text/textarea/select/checkbox/radio-group/date) · `toast` · `filter-popover` · `confirm-action` · `markdown` · `relative-time` · `states` (empty/loading/error) · `status-pill` · `stat-tile` · `user-chip` · `cheat-sheet` · `async-operation-status` — plus the shared infrastructure items most of them depend on: `utils`, `types`, `use-platform`, `list-surfaces`

Mechanics:

- Built with `npx shadcn build` → static JSON in `dist/r/`. Consumed via the `@uix` namespace in each project's `components.json` (HTTPS static hosting on Cloudflare; local-file adds — `shadcn add ./dist/r/<item>.json` — work before any hosting exists).
- **Vendored**: `shadcn add @uix/data-table` copies source into your app tree. Tailwind scans it natively (L47-immune). Builds never contact the registry — if uix vanished tomorrow, every app still builds.
- **Purity rule** (CI-enforced): composite source imports only allowlisted npm packages (`react`, `react-dom`, `lucide-react`, `clsx`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`) plus relative `./`/`../` paths — never `@radix-ui/*`, `@base-ui/*`, `next/*`, or app-alias imports like `@/components/ui/*` (banned). That's the property that lets one composite source install into both a Radix and a Base UI project.
- **Dual-fixture CI**: every item is installed into a Radix/Next-15 fixture *and* a Base UI/Next-16 fixture, type-checked, built, and smoke-rendered in both dark conventions before publish, with an emission gate proving every static class actually lands in the built CSS.

### The gates (an unenforced rule is a suggestion)

| Gate | Where it runs | What it stops |
|---|---|---|
| `uix-lint-tokens` | every consumer CI | missing contract tokens (the "invalid var fails to transparent" class), cold-gray palette (slate/zinc/gray banned), invented `--uix-*` names, overrides outside the `@uix-overrides` marker block; its `--src` scan also bans `rgb(var(--…))`/`hsl(var(--…))` triplets anywhere, unknown `var(--…)` reads in vendored `components/uix/` source, and any component-source read of a write-only slot (`--uix-brand*`) |
| `lint:registry` + `lint:themes` | UIx registry CI | the same linter pointed at `registry/uix` (`--strict-vars`) and at the shipped theme overlays (`--overlay`) — registry source or overlays that drift off the contract can't merge |
| token semver check | UIx publish job | renames/removals shipping without a major bump + ADR |
| primitives-purity + import bans | UIx registry CI | composites coupling to a primitive base or a Next version |
| dual-fixture build + emission gate | UIx registry CI | base-specific API breakage; silently-unemitted classes |
| drift lint | every consumer CI | silent forks — vendored `components/uix/*` must hash-match the add-time record **or** carry a `// uix-fork: <reason>` header |

## How to use it

### Start a new project

```powershell
mkdir D:\Development\Projects\<name>; cd D:\Development\Projects\<name>
pnpm create next-app@latest . --typescript --app --tailwind --eslint
npx shadcn@latest init -d --base base-ui        # or --base radix — your choice, freely

pnpm add @uix/tokens
# Wire it up by hand — two edits (a future @uix/base bootstrap item may automate this):
#   1. app/globals.css → add the three @uix/tokens @imports + the @uix-overrides fence
#      (the globals.css block below shows the finished result)
#   2. components.json → "registries": { "@uix": "http://127.0.0.1:8377/{name}.json" }
#      (local serve-registry URL; swap in the HTTPS host once the static deploy exists —
#       until then, local-file adds `shadcn add ..\UIx\dist\r\<item>.json` also work)
npx shadcn add @uix/data-table @uix/confirm-action @uix/states   # composites on demand

# Land the gate with the adoption:
#   package.json → "lint:tokens": "uix-lint-tokens app/globals.css --src ."   (wire into CI)
```

Your `globals.css` ends up as:

```css
@import "tailwindcss";
@import "@uix/tokens/tokens.css";
@import "@uix/tokens/shadcn-bridge.css";
@import "@uix/tokens/tailwind.css";

@custom-variant dark (&:is(.dark *));   /* project-local; hook must live on <html> */

/* @uix-overrides — brand layer (possibly empty) */
:root { }
/* @uix-overrides-end */
```

### Override the theme (brand a project)

Plain CSS cascade — write value overrides after the imports, inside the marker block. Same selectors as the package (`:root` / `:root:where(...)`), later-in-source wins. The fast path is the **3-line brand recipe**: `--uix-brand` / `--uix-brand-fg` are write-only slots (unset by default); `--uix-accent`, `--uix-accent-fg`, `--uix-link`, and `--uix-ring` carry the house values as `var()` fallbacks and chain to the slots the moment they're declared. Example, a blue-brand project:

```css
/* @uix-overrides */
:root {
  --uix-brand: #0088FF;       /* lines 1+2: accent, accent-fg, link, and ring */
  --uix-brand-fg: #FFFFFF;    /* all re-chain to the brand slots             */
  --uix-radius-md: 10px;                       /* softer corners, everything chains */
  --uix-font-sans: var(--font-geist-sans), system-ui, sans-serif;  /* next/font */
}
:root:where(.dark, [data-theme="dark"]) {
  --uix-brand: #0091FF;       /* line 3: the dark-mode brand shade */
}
/* @uix-overrides-end */
```

Components never read the slots directly (the linter rejects any component-source `var(--uix-brand*)` read), so a slot stays a pure input; non-brand values (radius, fonts, individual color tokens) override the same way. A productized brand can instead ship inside the package as a theme overlay — copy `themes/_template.css` to `themes/<product>.css` and `@import "@uix/tokens/themes/<product>.css"` **after** the three base imports (the linter enforces the order).

Rules: override **values** freely; never define a `--uix-*` name that isn't in `theme-contract.json` (lint rejects it); re-pointing a bridge name (`--background: var(--uix-bg-subtle)`) is also legal. A project using the house defaults has an empty block — **defaults encode the house style; projects pay only for their divergence.**

### Update (day 2)

```powershell
pnpm up @uix/tokens                          # token values everywhere, instantly
npx shadcn add @uix/data-table --overwrite   # refresh a vendored composite
node ..\UIx\scripts\uix-diff.mjs check     # report: clean-current / outdated / forked
```

Run composite updates **on a branch and review the diff** — `registryDependencies` resolution can write default-registry primitives next to hand-maintained ones (shadcn skips existing files, but an alias mismatch writes new ones).

Every distributed file carries a **registry stamp** on line 1, written by `stamp-registry.mjs` during `pnpm build:registry` (commit-based, so registry builds are byte-deterministic):

```tsx
// @uix-registry data-table 26ca6a9deece 2026-06-10T18:21:33+02:00
'use client';
```

That's "which item, which commit, how old is the copy I'm running" — `--overwrite` refreshes it on every re-add. To make staleness *fail* instead of just being visible, give `uix-diff check` an age budget (applies to clean-but-outdated files; age read from the stamp, falling back to the lock's `addedAt`):

```powershell
pnpm -C ..\UIx build:registry     # stamped dist/r
node ..\UIx\scripts\uix-diff.mjs check --registry ..\UIx\dist\r --max-age-days 90
```

`dist\r` stays gitignored — built on demand; committing it invites hand-edit drift — and the Cloudflare static deploy remains deferred (CI uploads `dist/r` as an artifact for inspection).

### Fork a composite (the 11pm hotfix)

Vendoring means forking is legal — that's the point. The only rule: mark it, or the drift lint fails.

```tsx
// uix-fork: needs project-specific row grouping not in the shared contract
```

Forked files show up in `uix-diff` as forked-and-X forever, so divergence is always visible, never silent.

### Promote a component into the registry

**Rule of two:** a component moves from a project into `registry/` only when a *second* project actually needs it. Then: copy the source in, strip project couplings until it passes primitives-purity, add the item manifest, let dual-fixture CI prove it on both bases, publish, and re-`add` it back into the donor project.

**Prop-naming convention:** status semantics on components use `tone` (`status-pill`, the `stat-tile` trend pill); structural/severity axes on notifications use `variant` (`toast`, `states`). Don't mix the two on one component.

## Repo layout

```
UIx\
├── packages\tokens\          → npm @uix/tokens (public scope — no auth anywhere, ever)
│   ├── tokens.json           single source; scripts\build.mjs emits the rest
│   ├── tokens.css shadcn-bridge.css tailwind.css theme-contract.json   (generated)
│   ├── themes\_template.css  theme-overlay starting point (per-product brands)
│   └── bin\uix-lint-tokens.mjs
├── registry\
│   ├── registry.json         shadcn build manifest (20 items, 22 component files)
│   └── uix\{utils, data-table, command-palette, detail-layout, …}\
├── fixtures\
│   ├── radix-app\            Next 15 + [data-theme] dark, house-default theme (mirrors ITSMx)
│   └── baseui-app\           Next 16 + .dark, DASHx-brand override block      (mirrors DASHx)
├── scripts\                  check-token-semver, check-purity, check-emission,
│                             copy-to-fixtures, uix-diff, serve-registry,
│                             stamp-registry, lint-themes, test-lint-tokens
├── contract-snapshot.json    contract as of last published version (semver gate)
├── .github\workflows\ci.yml  runs `pnpm check` (the full gate chain)
└── dist\r\                   built registry JSON (gitignored; rebuild via pnpm build:registry)
```

Registry hosting: `node scripts/serve-registry.mjs` serves `dist/r` on `http://127.0.0.1:8377` for local adds; the static Cloudflare deploy is deliberately deferred until a second machine needs it. `@uix` (npm scope, registry namespace) is a **placeholder pending scope claim** (ADR-0004) — rename before first publish if the final scope differs; the `--uix-` CSS prefix needs no registry and stays.

## Build-out phases

1. **Phase 0 — build this repo. ✅ DONE 2026-06-10** (npm publish pending scope claim). Token values lifted from `design-system.md`; 15 registry items seeded from `packages/shared/ui` (zero skips; command-palette/cheat-sheet decoupled from `@itsmx/shared-keyboard` via props; the 16th item, `@uix/types`, landed in Phase 2a); fixtures + full gate chain green (`pnpm check`); the L47-critical `@import` from pnpm-symlinked `node_modules` on Windows **verified**, and the HTTP-namespace `shadcn add` consumption path **verified** end-to-end.
2. **Phase 0.5 + build-out — audit fixes and hardening. ✅ DONE 2026-06-10** (same-day audit → fix; see `AUDIT.md`). All 17 ported composites re-wired from the legacy ITSMx token dialect onto the contract, with the gate hole closed (`lint:registry` / broadened `lint:fixtures`: triplet ban, unknown-var, write-only-slot checks). Token layer v1.0.0: brand slot tier + status `*-fg` tokens + theme overlays → 67 tokens. Drift hardening: commit-based registry stamps + `uix-diff --max-age-days`, exact dependency pins. Five new items (`toast`, `status-pill`, `stat-tile`, `app-shell`, `types`) plus form field kinds and data-table pagination/row-selection/sticky header → 20 items.
3. **DASHx — one PR.** Replace its hand-copied token blocks with the imports + a brand layer (blue accent, Apple-ish status colors as explicit overrides). Keeps Base UI, `.dark`, next-themes. Visual diff ≈ zero.
4. **ITSMx — globals-only PR, safe mid-autonomous-build.** Import tokens, alias local names (`--bg-app: var(--uix-bg-app)`), convert RGB-triplet legacy. Zero component files touched; one normal 6-gate merge.
5. **ITSMx composite flip — only after the autonomous build completes.** Until then, UIx treats `@itsmx/shared-ui` as upstream donor (composite fixes are copied to both places during the bounded interim). Afterwards `packages/shared/ui` and its `@source` line retire.

## References

- [`ITSMx/Docs/design-system.md`](../ITSMx/Docs/design-system.md) — the value donor; becomes prose rationale pointing at the token contract once Phase 0 lands.
- `D:\Development\Docs\adr\0004-hx-design-system.md` — the ADR freezing the one-way doors: `--uix-*` contract names, the `@uix` scope/namespace, the semver law.
- `D:\Development\ai-engineering-lessons.md` — Law 1 (gates) and the multi-client token-rename law this design mechanizes; L47 is in ITSMx `Docs/lessons-learned.md`.
