# uix-styleguide — UIx v2

https://cox-org-h.github.io/UIx/docs/explorer.html#introduction

A **framework-agnostic, build-free design system** for CRM/ITSM products. Plain HTML + CSS + a little vanilla
JS power a unified documentation site with component references, adoption status, and live examples; drop the
CSS into any project (HTML, React, Vue, Tailwind, server-rendered — anything) to use it.

It's "UIx v2": the next generation of the house design system. Where **UIx v1** (`../UIx`) is a
React/Next/shadcn token + composite registry locked to that stack, v2 is **stack-neutral** and **standalone**,
while deliberately **reusing v1's `--uix-*` token contract** so the two stay swappable.

> ⚠️ **Branches:** this project (v2) lives on **`master`** — the default branch. A *different, unrelated* project
> (the v1 registry) sits on the **`main`** branch with no shared history. **Never merge between them.** See
> [Docs/repository-branches.md](Docs/repository-branches.md).

## View it

Serve the repository root with any static server and open `index.html`; it redirects to the canonical docs:

```powershell
npx serve .
```

(Opened straight from disk, `tables.html` works, but Chromium refuses to load the docs explorer's module
script from a `file://` page, so the explorer stays empty there.)

No build step. The pages link the shipped bundle, `build/css/styles.css`, which is built and not committed;
in a clone that has not run `npm run build` they load the same rules from `styles/main.css` instead. The docs' **Example gallery** contains the original component specimens, the complete workspace
composition, and the dense UIX-V3 examples (rules, canvas authoring, scheduling, graph, review, configuration,
and branding) in one searchable shell. **Component status** reports CSS, React, docs, and example coverage
separately.

## Use it in a project

`Avatar` accepts named kit sizes or positive numeric pixels, for example
`<Avatar size={28}>AM</Avatar>`. Numeric sizes keep width/height equal and scale initials.
`<PresenceDot size={8} presence="busy" label="Beschäftigt" />` sizes a standalone marker.
Omitting a size preserves the existing default. Invalid numeric sizes fall back to the default;
use `label={null}` for a decorative dot whose state is already written beside it.

`UserChip` shrinks its name and secondary label within the available row width.
Both labels stay on one line and truncate visually; their complete text remains
in the DOM. Pass the existing `title` prop or a profile/peek affordance when the
reader needs the full identity text. The avatar and trailing children retain
their size.

For a nullable single condition, use `RuleBuilder` with `maxConditions={1}`, `conditionsOnly`,
`allowGroups={false}`, `maxDepth={1}` and `checks={{ emptyGroup: false }}`. The limit counts
condition leaves across all groups and prevents further appends; it never trims controlled input.
See [the optional-condition example](Docs/optional-single-condition.md) for the German keyboard walk.

Tokens now ship as the **`@tensor_1/tokens`** package (one DTCG source → CSS variables, a Tailwind
theme, and typed TS constants). Add it as a dependency and import what your stack needs:

- **Tailwind / shadcn (e.g. Tensor):**
  ```css
  @import "@tensor_1/tokens/css";          /* declares the --uix-* contract (light + dark) */
  @import "@tensor_1/tokens/themes/tensor";  /* this product's brand */
  @import "@tensor_1/tokens/tailwind";      /* @theme — utilities like bg-uix-accent, rounded-uix-md */
  @import "tailwindcss";
  ```
  (Tailwind v3 projects use `presets: [require('@tensor_1/tokens/tailwind/preset')]` instead.)

  **If you import `bundle` / `styles` (base + components) into a Tailwind app, declare the
  layer order yourself as the FIRST line of the entry stylesheet:**
  ```css
  @layer theme, base, uix.tokens, uix.base, uix.util, uix.motion, uix.components, components, utilities;
  ```
  A layer's position is fixed by its first mention. Without this, `@import "tailwindcss"`
  declares `theme, base, components, utilities` and the bundle's own `@layer uix.tokens, …`
  statement appends the UIx layers AFTER `utilities` — so `uix.base`'s `h1…h6, p, ul … { margin: 0 }`
  reset beats every `mb-*` / `space-y-*` on a heading or paragraph, and `h1 { font-weight: 600 }`
  beats your own heading class. Layers beat specificity; no utility can win. Preflight (`base`)
  goes before the UIx layers so UIx element defaults still beat preflight's `font-size: inherit`.
- **Plain CSS:** use `@tensor_1/tokens/bundle` for everything, or combine `css`, a theme,
  `motion`, and only the required `components/*` exports for the smallest payload.
- **TS / ECharts / React Native:** `import { cssVar, light, dark, num } from "@tensor_1/tokens/ts";`
  — use `cssVar` in the browser (respects brand + dark), `light`/`dark`/`num` for non-DOM.

Then add `styles/base.css` (+ `styles/motion.css`) and the `styles/components/*.css` files you need,
in load order `base.css` → `utilities.css` → `motion.css` → `components/*` (cascade layers make order
robust regardless). Copy-paste still works too — every file references the same `--uix-*` names.

Theme: set `data-theme="dark"` (or class `.dark`) on `<html>`. Default follows `prefers-color-scheme`.
The no-flash snippet in `packages/tokens/docs/explorer.html` shows how to apply the stored theme before paint.

For an unpaged virtualized `DataWorkspace`, pass `rowActionsColumn` when an actions column should
remain present even if the visible rows have no actions. This lets `rowActions` run only for the
mounted rows and overscan; without the prop the workspace checks every row and hides an entirely
empty column. Keep the renderer stable and update it when permissions change. Grouped, paginated,
and card layouts retain their existing rendering behavior.

```tsx
<DataWorkspace label="Items" rows={rows} columns={columns} getRowId={getRowId}
  virtualize rowActionsColumn rowActions={renderActions} />
```

For dashboard bodies, `ChartMetric` is available from the lightweight `@tensor_1/react` root:
`<ChartMetric value="1.234,5" label="Vorgänge pro Arbeitsstunde" delta="−12 %" deltaTone="positive" align="start" />`.
It adds no card chrome or chart engine. Omit `align` to preserve the existing responsive
chart-header alignment; `start` and `end` follow writing direction. `deltaTone` describes
sentiment independently of the numerical direction. Existing chart-entry imports remain supported.

`@tensor_1/react/component-inventory.json` exposes a machine-readable component inventory for the
installed release. Schema version 1 lists `{ name, subpath }` entries; `.` means the root package,
and other subpaths name their own entry point. Aliases are listed by their exported names, including
subpath-only components and icons. Hooks, types, utilities, constants and classes are excluded.
The inventory is checked against public TypeScript exports by the React test suite. Regenerate it
after changing exports with `node packages/react/scripts/component-inventory.mjs --write`.

## Brand a project (override the theme)

The house accent is blue. Override the write-only brand slots; accent, link, ring and brand-muted re-chain:

```css
:root {
  --uix-brand: #16A34A;       /* your accent */
  --uix-brand-fg: #000000;    /* text on accent fills */
}
:root:where(.dark,[data-theme="dark"]) { --uix-brand: #22C55E; }
```

Override **values** freely; reuse the `--uix-*` **names** (never invent new ones — that's the contract).

## Tokens

The single source of truth is **`tokens/*.json`** (W3C DTCG format). [Style Dictionary](https://styledictionary.com)
generates every output from it:

```
tokens/base/*.json   tokens/dark/*.json          # DTCG source — edit here
        │  npm run build:tokens
        ▼
build/css/tokens.css        # the --uix-* contract: light on :root, dark on the dark selector
build/tailwind/theme.css    # Tailwind v4 @theme (+ preset.cjs for v3)
build/ts/tokens.{js,d.ts}   # typed constants: cssVar / light / dark / num
```

`styles/tokens.css` is now a thin re-export of the generated file (kept as a stable import path).
The build is **byte-faithful** to the original contract — `npm run test:parity` fails if any generated
`--uix-*` name or value drifts from the frozen baseline (`tests/tokens.baseline.css`). The runtime tokens
(`--uix-accent` etc. via `var(--uix-brand,…)`, and `--uix-brand-muted` via `color-mix`) are emitted
verbatim so live brand overrides keep working. Names match UIx v1; values derive from the "Square UI" template.

Per-product brand lives in `themes/<product>.tokens.json` → generated `themes/<product>.css` via
`npm run build:themes`. Products override only the write-only `--uix-brand` / `--uix-brand-fg` slots
(allowlist enforced in `scripts/build-themes.mjs`); accent/link/ring/brand-muted re-chain automatically.

## Relationship to UIx v1 & versioning

This is a separate project (its own git repo) that shares the token contract — **not** a `-v2` folder copy.
Per the workspace directory-governance, versions live in git, not folder suffixes; if v2 supersedes v1 in
projects, v1 moves to `_Archive`.

## Build & publish

```powershell
npm install
npm run build        # build:tokens + build:themes -> build/ and themes/*.css
npm run test:parity  # assert the generated CSS still matches the contract baseline
```

Generated output under `build/` is committed (so the showcase stays build-free to open), with one exception:
the two minified bundles, `build/css/styles.css` and `build/css/components.css`, are built by `npm run build`,
by CI, by the docs deployment and before every publish, and are git-ignored. Each is a single line, so two
branches that both committed one always conflicted
([maintainer runbook](Docs/maintainer-runbook.md#generated-files-and-parallel-prs)). `package.json`
`exports` maps `./css`, `./tailwind`, `./ts`, and `./themes/*` for consumers. The package is `private` by
default — set your registry (`publishConfig`, e.g. GitHub Packages) and remove `private` before publishing.

## Fonts & icons

Fonts: **Inter** (body) + **IBM Plex Sans** (headings) + **IBM Plex Mono**, loaded via Google Fonts
in the docs shell. Icons are **lucide**, inline SVG, `currentColor`, sized via `--uix-icon-*`.
The React icon entry is generated from Lucide 1.61.0. `scripts/icon-glyph-compat.json`
preserves public UIx glyph identities when upstream renames an alias; `building-2`
and `trash-2` remain valid. Regenerate with
`node packages/react/scripts/generate-icons.mjs <installed-lucide-react-package>`.
The generator also reads the earlier `__iconNode` format; Lucide is a generation
input only and is never a runtime dependency of the package.

For migrations that already rely on native SVG presentation attributes, import
named icons from `@tensor_1/react/icons/intrinsic`. These default to 24 SVG units;
`size={14}` and `size="1em"` set SVG `width`/`height` attributes, so button, menu,
and product CSS retain their existing priority. They keep forwarded SVG refs,
raw ARIA attributes, and title children. The regular `./icons` entry keeps its
token-sized default and explicit inline numeric dimensions. Both entries accept
`sizeMode="intrinsic"` or `sizeMode="explicit"` to select the sizing contract;
named `sm`/`md`/`lg` sizes always use the existing token classes. The intrinsic
entry uses a separate class so component selectors for `.uix-icon` do not alter
existing consumer geometry. Its `animate` prop shares the kit motion rules.
