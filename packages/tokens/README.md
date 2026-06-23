# @tensor_1/tokens

UIx v2 design tokens — the **`--uix-*` contract** (colors, typography, spacing, radii, motion, light/dark) for the house products. One [DTCG](https://www.designtokens.org/) source generates **CSS variables**, a **Tailwind theme**, and **typed TS constants**.

> Stack-neutral. Drop the CSS into any project (HTML, React, Vue, Tailwind, server-rendered). The `--uix-*` names *are* the contract — override values, never names.

## Install

```sh
npm i @tensor_1/tokens
```

## Use

**Tailwind / shadcn:**
```css
@import "@tensor_1/tokens/css";            /* the --uix-* contract (light + dark) */
@import "@tensor_1/tokens/themes/tensor";  /* a product brand */
@import "@tensor_1/tokens/tailwind";       /* @theme — bg-uix-accent, rounded-uix-md, … */
@import "tailwindcss";
```
(Tailwind v3: `presets: [require('@tensor_1/tokens/tailwind/preset')]`.)

**Plain CSS:** link `@tensor_1/tokens/css`, then a product theme.

**TS / ECharts / React Native:**
```ts
import { cssVar, light, dark, num } from "@tensor_1/tokens/ts";
```
`cssVar` in the browser (respects brand + dark); `light` / `dark` / `num` for non-DOM (SSR, RN, server-rendered charts).

## Brand a project

Override the write-only brand slots; `accent` / `link` / `ring` / `brand-muted` re-chain automatically:
```css
:root { --uix-brand: #16A34A; --uix-brand-fg: #FFFFFF; }
:root:where(.dark,[data-theme="dark"]) { --uix-brand: #22C55E; }
```

## Exports

| Subpath | What |
|---|---|
| `./css` | the `--uix-*` contract (`:root` light, dark selector) |
| `./styles` | component CSS (use with the tokens + a theme) |
| `./tailwind` · `./tailwind/preset` | Tailwind v4 `@theme` / v3 preset |
| `./ts` | typed `cssVar` / `light` / `dark` / `num` |
| `./themes/{tensor,posx,shopx,mission-control}` | per-product brand |

Source of truth: `tokens/*.json` (DTCG) → [Style Dictionary](https://styledictionary.com). Part of the **[UIx v2 styleguide](https://github.com/COx-ORG-H/UIx)**.
