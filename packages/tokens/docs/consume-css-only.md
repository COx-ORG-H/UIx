# Consuming UIx without React (CSS-only)

`@tensor_1/react` is the canonical React channel, but the `--uix-*` contract and the `.uix-*`
component CSS stand alone — you can use them from **any** stack (Rails, Django, Astro, Web
Components, plain HTML) with no bundler and no framework. This is the option-C path from
**ADR-0017** (the distribution bet, in the workspace ADR log): npm for the tokens,
and either an npm import of the component CSS **or** a copy-in via the registry.

## 1. Install the tokens

```bash
npm install @tensor_1/tokens
```

## 2. Load the contract + a brand theme (always)

Every component references `--uix-*` variables, so the token contract and a brand theme must load
first, in this order:

```css
@import "@tensor_1/tokens/css";            /* the --uix-* contract: light on :root, dark on [data-theme="dark"] */
@import "@tensor_1/tokens/themes/tensor";  /* a product brand (tensor | posx | shopx | mission-control) */
```

Set the theme on the root element; the default follows `prefers-color-scheme`:

```html
<html data-theme="dark"> … </html>
```

## 3. Get the module CSS — three ways

### A. Selective npm imports (smallest managed payload)

Import only the modules the page uses. Add utilities or motion when those shared classes/keyframes
are needed:

```css
@import "@tensor_1/tokens/motion";
@import "@tensor_1/tokens/components/button";
@import "@tensor_1/tokens/components/card";
```

### B. npm import (all modules)

Import the whole component layer (pairs with the contract above), or the single-file bundle:

```css
@import "@tensor_1/tokens/styles";   /* all .uix-* components (components.css) */
/* — or — the everything bundle (tokens + base + utilities + motion + components): */
@import "@tensor_1/tokens/bundle";
```

### C. Copy-in a single module (the registry / `uix add`)

When you only want a couple of components at source (to own/fork them, or avoid pulling the whole
layer), use the copy-in manifest [`registry/registry.json`](../registry/registry.json). Each entry
lists the component's CSS file and the exact `--uix-*` tokens it depends on. The `uix add` CLI
(shipped with `@tensor_1/tokens`) copies a component's CSS for you and prints what to import:

```bash
npx uix add button --dest ./src/styles/uix
```

You still need step 2 (the contract + theme) loaded, because the copied `button.css` only references
`--uix-*` variables — it does not redefine them.

## Worked example — a button

```html
<!doctype html>
<html data-theme="light">
<head>
  <link rel="stylesheet" href="node_modules/@tensor_1/tokens/build/css/tokens.css">
  <link rel="stylesheet" href="node_modules/@tensor_1/tokens/themes/tensor.css">
  <link rel="stylesheet" href="node_modules/@tensor_1/tokens/styles/motion.css">
  <link rel="stylesheet" href="node_modules/@tensor_1/tokens/styles/components/button.css">
</head>
<body>
  <button class="uix-btn uix-btn--primary">Save changes</button>
</body>
</html>
```

Using a bundler that understands the `exports` map (Vite, esbuild, webpack)? Import the subpaths
instead of file paths: `@tensor_1/tokens/css`, `@tensor_1/tokens/themes/tensor`,
`@tensor_1/tokens/motion`, and `@tensor_1/tokens/components/button`.

The button's exact token dependencies (and every other component's) are enumerated in
[`registry/registry.json`](../registry/registry.json) — the generated, drift-gated inventory.
