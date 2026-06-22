# uix-styleguide — UIx v2

A **framework-agnostic, build-free style guide** for CRM/ITSM products. Plain HTML + CSS + a little vanilla
JS — open `index.html` in any browser to see every component in light and dark mode; drop the CSS into any
project (HTML, React, Vue, Tailwind, server-rendered — anything) to use it.

It's "UIx v2": the next generation of the house design system. Where **UIx v1** (`../UIx`) is a
React/Next/shadcn token + composite registry locked to that stack, v2 is **stack-neutral** and **standalone**,
while deliberately **reusing v1's `--uix-*` token contract** so the two stay swappable.

## View it

Open `index.html` directly, or serve the folder:

```powershell
# any static server works, e.g.
npx serve .
```

No build step.

## Use it in a project

Tokens now ship as the **`@uix/tokens`** package (one DTCG source → CSS variables, a Tailwind
theme, and typed TS constants). Add it as a dependency and import what your stack needs:

- **Tailwind / shadcn (e.g. Tensor):**
  ```css
  @import "@uix/tokens/css";          /* declares the --uix-* contract (light + dark) */
  @import "@uix/tokens/themes/tensor";  /* this product's brand */
  @import "@uix/tokens/tailwind";      /* @theme — utilities like bg-uix-accent, rounded-uix-md */
  @import "tailwindcss";
  ```
  (Tailwind v3 projects use `presets: [require('@uix/tokens/tailwind/preset')]` instead.)
- **Plain CSS:** link `@uix/tokens/build/css/tokens.css`, then your product theme css.
- **TS / ECharts / React Native:** `import { cssVar, light, dark, num } from "@uix/tokens/ts";`
  — use `cssVar` in the browser (respects brand + dark), `light`/`dark`/`num` for non-DOM.

Then add `styles/base.css` (+ `styles/motion.css`) and the `styles/components/*.css` files you need,
in load order `base.css` → `utilities.css` → `motion.css` → `components/*` (cascade layers make order
robust regardless). Copy-paste still works too — every file references the same `--uix-*` names.

Theme: set `data-theme="dark"` (or class `.dark`) on `<html>`. Default follows `prefers-color-scheme`.
The no-flash snippet in `index.html`'s `<head>` shows how to apply the stored theme before paint.

## Brand a project (override the theme)

The house accent is blue. Override the write-only brand slots; accent, link, ring and brand-muted re-chain:

```css
:root {
  --uix-brand: #16A34A;       /* your accent */
  --uix-brand-fg: #FFFFFF;    /* text on accent fills */
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

Generated output under `build/` is committed (so the showcase stays build-free to open) and `package.json`
`exports` maps `./css`, `./tailwind`, `./ts`, and `./themes/*` for consumers. The package is `private` by
default — set your registry (`publishConfig`, e.g. GitHub Packages) and remove `private` before publishing.

## Fonts & icons

Fonts: **Inter** (body) + **IBM Plex Sans** (headings) + **IBM Plex Mono**, loaded via Google Fonts
(`<link>` in `index.html`). Icons are **lucide**, inline SVG, `currentColor`, sized via `--uix-icon-*`.
