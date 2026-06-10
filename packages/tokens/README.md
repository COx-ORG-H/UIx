# @uix/tokens

House design-system token contract: pure CSS custom properties (light + dark), a shadcn bridge, Tailwind utility bindings, shipped theme overlays, and the `uix-lint-tokens` gate. Generated from `tokens.json` by `scripts/build.mjs` — never hand-edit the emitted files.

## Support floor

**Tailwind CSS v4+ only.** The package leans on v4-only mechanics with no v3 fallback:

- `tailwind.css` uses `@theme inline` to bind utilities to `--uix-*` variables.
- Dark mode is wired for `@custom-variant` consumers (`.dark` class or `[data-theme="dark"]`, both answered by one `:root:where(.dark, [data-theme="dark"])` block).
- Alpha is the v4 `color-mix()` idiom on full color values — the v3 channel-triplet pattern (`rgb()`/`rgba()`/`hsl()`/`hsla()` over a `var()`) is rejected by the linter.

**Node ≥ 22** for the `uix-lint-tokens` CLI.

## Imports

```css
@import "tailwindcss";
@import "@uix/tokens/tokens.css";
@import "@uix/tokens/shadcn-bridge.css";
@import "@uix/tokens/tailwind.css";          /* utility bindings — see note below */
@import "@uix/tokens/themes/<product>.css";  /* optional brand overlay — must come last */
```

`tailwind.css` is **required when installing `@uix` composites** (they style themselves with the `*-uix-*` utilities); optional for tokens-only consumers.

Source order is the override mechanism: everything is specificity (0,1,0), so whatever comes later wins. The linter enforces that theme overlays are imported after `tokens.css` and `shadcn-bridge.css`.

## The brand tier (write-only slots)

`--uix-brand` and `--uix-brand-fg` are contract names that are **deliberately never emitted** — they are unset slots. Each brand-chained semantic token carries its house value as its `var()` fallback:

```css
--uix-accent:    var(--uix-brand, #E4F222);   /* house solar yellow */
--uix-accent-fg: var(--uix-brand-fg, #0C0A08);
--uix-link:      var(--uix-brand, #5683D2);   /* house blue */
--uix-ring:      var(--uix-brand, #5683D2);
```

With no brand declared you get the house look (yellow accent, blue link/ring). The moment a brand is declared, all four chain to it. That is the **2+1-line brand recipe**:

```css
/* @uix-overrides */
:root {
  --uix-brand: #0088FF;
  --uix-brand-fg: #FFFFFF;
}
:root:where(.dark, [data-theme="dark"]) {
  --uix-brand: #0091FF;
}
/* @uix-overrides-end */
```

Rules and caveats:

- **Write-only.** Components must never read `var(--uix-brand)` / `var(--uix-brand-fg)` — read `--uix-accent` / `--uix-accent-fg` / `--uix-link` / `--uix-ring` instead. The linter rejects slot reads in source.
- **Set the slots at `:root`** (and the dark selector). The fallback chain resolves per element, so a slot declared on a subtree rebrands only that subtree — rarely what you want.
- **`--uix-accent-dark` / `--uix-accent-light` do not chain.** They stay house-literal; override them separately if the brand needs pressed/washed shades.
- **Link-contrast escape hatch.** If the brand hue fails AA as link text on the app background, override `--uix-link` back out to an accessible hue after setting the brand.
- `--uix-brand-muted` is a derived wash: `color-mix` over `--uix-accent`, so it chains brand → accent → muted automatically.

## Status foregrounds

`--uix-danger-fg`, `--uix-warning-fg`, `--uix-info-fg` mirror the pre-existing `--uix-success-fg`: white text on the saturated light-mode fills, near-black (`#0C0A08`) in dark mode where the status hues lighten. The shadcn bridge points `--destructive-foreground` at `--uix-danger-fg` (white-on-light-red in dark mode was a latent bug).

## Theme overlays (`themes/`)

`themes/*.css` is a stable export path (`@uix/tokens/themes/<product>.css`). An overlay is a consumer override block that ships inside the package: value overrides of contract tokens (and bridge re-points) inside the `/* @uix-overrides */ … /* @uix-overrides-end */` fence, nothing else. Start from `themes/_template.css` (all comments, zero active declarations — its header documents the rules). Import the overlay **after** the base imports so it wins by source order. Overlays are gated by `uix-lint-tokens <file> --overlay`.

## Linter CLI

```
uix-lint-tokens [globals.css] [--src <dir>] [--contract <path>]
                [--overlay] [--strict-vars] [--allow-vars <prefix,prefix,...>]
```

Either a CSS file, `--src`, or both must be given (src-only invocation is legal).

| Flag | Meaning |
| --- | --- |
| `--src <dir>` | walk `<dir>` (`.ts/.tsx/.js/.jsx/.css`, skipping `node_modules` and dotdirs) and run the source checks; a nonexistent `<dir>` is a usage error (exit 2) |
| `--contract <path>` | use an explicit `theme-contract.json` (default: the one shipped next to the binary) |
| `--overlay` | lint a theme overlay: skips the required-@imports and theme-import-order checks |
| `--strict-vars` | apply the unknown-var check to all walked JS/TS files, not just `components/uix/` ones |
| `--allow-vars <p,p>` | extra var-name prefixes the unknown-var check accepts (`--tw-` is always allowed) |

CSS-file checks (run against comment-stripped CSS, so commented-out code never satisfies or trips a check; errors carry the source line number):

1. imports `@uix/tokens/tokens.css` and `shadcn-bridge.css` (skipped under `--overlay`);
2. every `--uix-*` defined is a contract name — override values, never invent names (slot tokens may be *defined*);
3. definitions only inside the `@uix-overrides` fence (bridge re-points included) — defining a `--uix-*` token or re-pointing a bridge name with no fence present is an error;
4. no `rgb()`/`rgba()`/`hsl()`/`hsla()` over `var(--…)` triplets;
5. theme overlays imported after both base imports (skipped under `--overlay`).

`--src` scan checks:

6. no cold-gray Tailwind classes (`slate`/`zinc`/`gray` banned);
7. no `rgb()`/`rgba()`/`hsl()`/`hsla()` over `var(--…)` triplets in any walked file;
8. unknown-var check (JS/TS under a `components/uix/` path segment, or all JS/TS with `--strict-vars`): every fallback-less `var(--name)` read must be a contract token, a bridge name, or match an allowed prefix; `var(--x, fallback)` is allowed for non-slot names; reading a write-only slot (`var(--uix-brand)`) is always an error, even with a fallback.

Exit codes: `0` clean, `1` problems found, `2` usage error (including a nonexistent `--src` directory).
