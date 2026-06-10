# hx-ui — the house design system

One source of truth for how every project in this portfolio looks: a **token contract** (colors, typography, spacing, motion, light/dark) plus a **library of proven composite components**, installable into any project with two commands.

> **Status: Phase 0 built and verified** (2026-06-10). The architecture was validated by a multi-agent design review (3 competing proposals, fact-check against live shadcn registry docs, 2 adversarial judges), then built: 61-token contract, 15 registry items ported from `@itsmx/shared-ui`, dual fixtures (Radix/Next 15 + Base UI/Next 16) building green, all gates passing (`pnpm check`), and a real `shadcn add @hx/data-table` proven end-to-end against the HTTP registry. **Pending your action:** npm login + scope claim (then publish `@hx/tokens@1.0.0` — rename the `@hx` placeholder first if the scope differs), and optionally a GitHub remote. See [Build-out phases](#build-out-phases).

---

## What this is

ITSMx carries the canonical design spec ([`ITSMx/Docs/design-system.md`](../ITSMx/Docs/design-system.md) — Ramp-calibrated warm neutrals, one near-black at two opacities, hairline borders, solar accent). DASHx **hand-copied** those token values into its own CSS. Every future project would copy them again, and every value change would have to be re-applied by hand in N places. hx-ui replaces the copying with plumbing.

Three real-world constraints shaped the architecture — they are why this is *not* a conventional shared component library:

1. **The consumers already diverge structurally.** ITSMx: Next 15, hand-maintained **Radix** primitives, dark mode via `[data-theme="dark"]`. DASHx: Next 16, CLI-managed **Base UI**, dark mode via `.dark`. Forcing them onto one shared component package would mean a risky, zero-user-value migration.
2. **Lesson L47 (Tailwind v4 + pnpm).** Tailwind v4 doesn't scan `node_modules`; pnpm symlinks workspace/npm packages into it. Classes used only inside a shared component *package* are silently never emitted → invisibly unstyled UI. Pure-CSS tokens and vendored component code are structurally immune; compiled component packages are permanently exposed.
3. **Solo maintenance.** One person, ~10 projects, an autonomous CI build running on ITSMx. Anything that breaks hard when ignored for three months (expiring registry tokens, publish pipelines in the hotfix path) is disqualified. The worst allowed failure mode is *staleness*.

## The architecture in one picture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — COMPOSITES        custom shadcn registry (@hx/…)      │
│ data-table, command-palette, detail-layout, confirm-action, …   │
│ → vendored into each project via `npx shadcn add @hx/<item>`    │
│ → you own the code; forks legal but marked (// hx-fork:)        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1 — PRIMITIVES        ★ deliberately NOT shared ★         │
│ each project keeps its own components/ui and its own            │
│ Radix-or-BaseUI choice — the token contract makes them          │
│ render identically                                              │
├─────────────────────────────────────────────────────────────────┤
│ Layer 0 — TOKENS            @hx/tokens npm package (semver'd)   │
│ pure CSS custom properties: colors, fonts, radius, motion,      │
│ light+dark — one `pnpm up @hx/tokens` updates every project     │
└─────────────────────────────────────────────────────────────────┘
```

Exactly **two distribution mechanisms** (npm for values, shadcn registry for code) and **one deliberate absence** (no shared primitives). Each layer gets the cheapest mechanism that matches how often it changes and how it fails.

## How it works

### Layer 0 — `@hx/tokens` (the contract)

A tiny npm package of pure CSS — no classes, no JS, nothing for Tailwind to scan, so L47 cannot bite. Everything is prefixed `--hx-` to never collide with shadcn or project-local names.

**Names are the contract; values are defaults.** Projects override values, never invent names.

| File | Role |
|---|---|
| `tokens.json` | Single machine-readable source. The build emits everything below from it — contract and CSS can never diverge by hand-edit. |
| `tokens.css` | The values, light + dark. Dark is declared once under `:root:where(.dark, [data-theme="dark"])` — serving **both** dark-mode conventions at specificity (0,1,0), so project overrides written after the import always win by source order. |
| `shadcn-bridge.css` | Maps shadcn's semantic names (`--background`, `--primary`, `--ring`, …) onto `--hx-*` vars. Needs **no dark block** — the hx vars flip underneath it. This is what makes raw shadcn components on-brand with zero per-component work, on either primitive base. |
| `tailwind.css` | Optional `@theme inline` bindings so `bg-hx-subtle`, `text-hx-hushed`, `ease-out-strong` utilities exist without boilerplate. Safe from node_modules because `@theme` entries are definitions, not class usages. |
| `theme-contract.json` | The required-token name list `{name, type, requiredModes}` — what the linter enforces. |
| `bin/hx-lint-tokens.mjs` | The gate, shipped *inside* the package so every consumer gets the current linter with the dependency (gates can't drift behind the rules). |

**Versioning law** (mechanized, publish-blocking): adding a token = minor; renaming/removing = **major + ADR**. CI diffs the contract snapshot against the last published version and fails the publish on a wrong bump type.

### Layer 1 — primitives (none, on purpose)

Each project runs `shadcn init --base radix` or `--base base-ui` and owns its `components/ui/`. The bridge + tokens make a Radix button and a Base UI button visually identical. This dissolves the Radix/Base-UI, CLI/hand-maintained, and Next 15/16 divergences without anyone paying a migration. **1:1 styling wrappers around shadcn primitives are banned** — tokens already do that job; a wrapper would be pure tax.

### Layer 2 — the `@hx` composite registry

Components earn a place here only when they encode a **cross-project product convention**, not a styling preference. The seed inventory is the proven `@itsmx/shared-ui` set:

`data-table` (+ toolbar, column visibility, saved views) · `command-palette` · `detail-layout` · `filter-popover` · `confirm-action` · `markdown` · `relative-time` · `states` (empty/loading/error) · `status-pill` · `stat-tile` · `user-chip` · `cheat-sheet`

Mechanics:

- Built with `npx shadcn build` → static JSON in `dist/r/`. Consumed via the `@hx` namespace in each project's `components.json` (HTTPS static hosting on Cloudflare; local-file adds — `shadcn add ./dist/r/<item>.json` — work before any hosting exists).
- **Vendored**: `shadcn add @hx/data-table` copies source into your app tree. Tailwind scans it natively (L47-immune). Builds never contact the registry — if hx-ui vanished tomorrow, every app still builds.
- **Purity rule** (CI-enforced): composite source imports only `@/components/ui/*`, `lucide-react`, and `cn` — never `@radix-ui/*`, `@base-ui/*`, or `next/*`. That's the property that lets one composite source install into both a Radix and a Base UI project: `registryDependencies` resolve against *that project's* primitives.
- **Dual-fixture CI**: every item is installed into a Radix/Next-15 fixture *and* a Base UI/Next-16 fixture, type-checked, built, and smoke-rendered in both dark conventions before publish, with an emission gate proving every static class actually lands in the built CSS.

### The gates (an unenforced rule is a suggestion)

| Gate | Where it runs | What it stops |
|---|---|---|
| `hx-lint-tokens` | every consumer CI | missing contract tokens (the "invalid var fails to transparent" class), cold-gray palette (slate/zinc/gray banned), invented `--hx-*` names, overrides outside the `@hx-overrides` marker block |
| token semver check | hx-ui publish job | renames/removals shipping without a major bump + ADR |
| primitives-purity + import bans | hx-ui registry CI | composites coupling to a primitive base or a Next version |
| dual-fixture build + emission gate | hx-ui registry CI | base-specific API breakage; silently-unemitted classes |
| drift lint | every consumer CI | silent forks — vendored `components/hx/*` must hash-match the add-time record **or** carry a `// hx-fork: <reason>` header |

## How to use it

### Start a new project

```powershell
mkdir D:\Development\Projects\<name>; cd D:\Development\Projects\<name>
pnpm create next-app@latest . --typescript --app --tailwind --eslint
npx shadcn@latest init -d --base base-ui        # or --base radix — your choice, freely

pnpm add @hx/tokens
npx shadcn add @hx/base        # wires the CSS imports, bridge, and @hx registry entry
npx shadcn add @hx/data-table @hx/confirm-action @hx/states   # composites on demand

# Land the gate with the adoption:
#   package.json → "lint:tokens": "hx-lint-tokens app/globals.css"   (wire into CI)
```

Your `globals.css` ends up as:

```css
@import "tailwindcss";
@import "@hx/tokens/tokens.css";
@import "@hx/tokens/shadcn-bridge.css";
@import "@hx/tokens/tailwind.css";

@custom-variant dark (&:is(.dark *));   /* project-local; hook must live on <html> */

/* @hx-overrides — brand layer (possibly empty) */
:root { }
/* @hx-overrides-end */
```

### Override the theme (brand a project)

Plain CSS cascade — write value overrides after the imports, inside the marker block. Same selectors as the package (`:root` / `:root:where(...)`), later-in-source wins. Example, a blue-accent project:

```css
/* @hx-overrides */
:root {
  --hx-accent: #0088FF;  --hx-accent-fg: #FFFFFF;  --hx-ring: #0088FF;
  --hx-radius-md: 10px;                       /* softer corners, everything chains */
  --hx-font-sans: var(--font-geist-sans), system-ui, sans-serif;  /* next/font */
}
:root:where(.dark, [data-theme="dark"]) {
  --hx-accent: #0091FF;
}
/* @hx-overrides-end */
```

Rules: override **values** freely; never define a `--hx-*` name that isn't in `theme-contract.json` (lint rejects it); re-pointing a bridge name (`--background: var(--hx-bg-subtle)`) is also legal. A project using the house defaults has an empty block — **defaults encode the house style; projects pay only for their divergence.**

### Update (day 2)

```powershell
pnpm up @hx/tokens                          # token values everywhere, instantly
npx shadcn add @hx/data-table --overwrite   # refresh a vendored composite
node ..\hx-ui\scripts\hx-diff.mjs           # report: clean-current / outdated / forked
```

Run composite updates **on a branch and review the diff** — `registryDependencies` resolution can write default-registry primitives next to hand-maintained ones (shadcn skips existing files, but an alias mismatch writes new ones).

### Fork a composite (the 11pm hotfix)

Vendoring means forking is legal — that's the point. The only rule: mark it, or the drift lint fails.

```tsx
// hx-fork: needs project-specific row grouping not in the shared contract
```

Forked files show up in `hx-diff` as forked-and-X forever, so divergence is always visible, never silent.

### Promote a component into the registry

**Rule of two:** a component moves from a project into `registry/` only when a *second* project actually needs it. Then: copy the source in, strip project couplings until it passes primitives-purity, add the item manifest, let dual-fixture CI prove it on both bases, publish, and re-`add` it back into the donor project.

## Repo layout

```
hx-ui\
├── packages\tokens\          → npm @hx/tokens (public scope — no auth anywhere, ever)
│   ├── tokens.json           single source; scripts\build.mjs emits the rest
│   ├── tokens.css shadcn-bridge.css tailwind.css theme-contract.json   (generated)
│   └── bin\hx-lint-tokens.mjs
├── registry\
│   ├── registry.json         shadcn build manifest (15 items)
│   └── hx\{utils, data-table, command-palette, detail-layout, …}\
├── fixtures\
│   ├── radix-app\            Next 15 + [data-theme] dark, house-default theme (mirrors ITSMx)
│   └── baseui-app\           Next 16 + .dark, DASHx-brand override block      (mirrors DASHx)
├── scripts\                  check-token-semver, check-purity, check-emission,
│                             copy-to-fixtures, hx-diff, serve-registry
├── contract-snapshot.json    contract as of last published version (semver gate)
├── .github\workflows\ci.yml  runs `pnpm check` (the full gate chain)
└── dist\r\                   built registry JSON (gitignored; rebuild via pnpm build:registry)
```

Registry hosting: `node scripts/serve-registry.mjs` serves `dist/r` on `http://127.0.0.1:8377` for local adds; the static Cloudflare deploy is deliberately deferred until a second machine needs it. `@hx` (npm scope, registry namespace) is a **placeholder pending scope claim** (ADR-0004) — rename before first publish if the final scope differs; the `--hx-` CSS prefix needs no registry and stays.

## Build-out phases

1. **Phase 0 — build this repo.** Lift token values from ITSMx `globals.css` + `design-system.md`; seed the registry from `packages/shared/ui`; stand up fixtures + CI; publish `@hx/tokens@1.0.0`. *First verification:* Tailwind v4 `@import` of `@hx/tokens/*.css` from pnpm-symlinked `node_modules` on Windows.
2. **DASHx — one PR.** Replace its hand-copied token blocks with the imports + a brand layer (blue accent, Apple-ish status colors as explicit overrides). Keeps Base UI, `.dark`, next-themes. Visual diff ≈ zero.
3. **ITSMx — globals-only PR, safe mid-autonomous-build.** Import tokens, alias local names (`--bg-app: var(--hx-bg-app)`), convert RGB-triplet legacy. Zero component files touched; one normal 6-gate merge.
4. **ITSMx composite flip — only after the autonomous build completes.** Until then, hx-ui treats `@itsmx/shared-ui` as upstream donor (composite fixes are copied to both places during the bounded interim). Afterwards `packages/shared/ui` and its `@source` line retire.

## References

- [`ITSMx/Docs/design-system.md`](../ITSMx/Docs/design-system.md) — the value donor; becomes prose rationale pointing at the token contract once Phase 0 lands.
- `D:\Development\adr\` — the ADR (to be written at Phase 0) freezing the one-way doors: `--hx-*` contract names, the `@hx` scope/namespace, the semver law.
- `D:\Development\ai-engineering-lessons.md` — Law 1 (gates) and the multi-client token-rename law this design mechanizes; L47 is in ITSMx `Docs/lessons-learned.md`.
