# Component docs — the explorer shell

A **build-free** documentation site for the UIx v2 components, served straight from the static
repo root. No bundler, no framework — just an HTML shell, one stylesheet, and one ES module.

## Files

| File | What |
|---|---|
| `explorer.html` | The shell: left component nav + a per-component page whose regions are **empty** and keyed by `data-region` (`overview`, `live-example`, `props-table`, `do-dont`, `a11y-notes`). Later slices fill those regions. |
| `docs.css` | Two-column layout chrome (nav + content). Uses the `--uix-*` tokens from `../styles/main.css`; declares no tokens. |
| `docs.js` | Pure helpers (`slugify`, `componentNav`, `renderPropsTable`, `esc`) exported for tests, plus DOM wiring guarded by `if (typeof document !== 'undefined')` so it imports DOM-free under `node:test`. |
| `docs.test.js` | `node:test` unit tests for the pure helpers. |

## Theming

`explorer.html` reuses the styleguide's theming verbatim: the no-flash inline `<script>` sets
`data-theme` on `<html>` before first paint, `../styles/main.css` provides the token contract, and
the `[data-uix-theme-toggle]` button flips light/dark (persisted in `localStorage` under `uix-theme`),
so theming behaves identically to `../index.html`.

> The stylesheet link is `../styles/main.css` (not `styles/main.css`): `docs/explorer.html` sits one
> directory deeper than `index.html`, so the `../` prefix climbs back up to `packages/tokens/`.

## Serve it

From the repo root (the static root the styleguide is served from):

```sh
npm run docs:serve
# → http://localhost:4178/packages/tokens/docs/explorer.html
```

`docs:serve` is modeled on the root `serve:styleguide` (`serve -l 4178 .`) — same static root, same
port — so relative links to `../styles/main.css` resolve exactly as they do for the styleguide.

## Test

```sh
node --test docs/docs.test.js
```
