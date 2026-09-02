# plain-css example

The smallest real consumer: a static HTML page that links the **shipped**
`@tensor_1/tokens` CSS with plain `<link>` tags — no bundler, no framework, no build step.
It renders `.uix-btn` and `.uix-card`, and toggles light/dark via `[data-theme]` on `<html>`.

## Run it

From this directory (`examples/plain-css/`):

```sh
npm install          # installs @tensor_1/tokens into ./node_modules
npx serve .          # or: python -m http.server, or any static server
```

Then open the served URL. `index.html` links the contract, theme, motion, and only the two modules it uses:

| `<link>`                                            | Export subpath                   | What it provides                                            |
| --------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| `node_modules/@tensor_1/tokens/build/css/tokens.css`     | `@tensor_1/tokens/css`           | the `--uix-*` token contract (light on `:root`, dark on `[data-theme="dark"]`) |
| `node_modules/@tensor_1/tokens/themes/tensor.css`        | `@tensor_1/tokens/themes/tensor` | the Tensor brand override layer                             |
| `node_modules/@tensor_1/tokens/styles/motion.css` | `@tensor_1/tokens/motion` | shared motion and reduced-motion safeguards |
| `node_modules/@tensor_1/tokens/styles/components/button.css` | `@tensor_1/tokens/components/button` | Button module CSS |
| `node_modules/@tensor_1/tokens/styles/components/card.css` | `@tensor_1/tokens/components/card` | Card module CSS |

> Browsers can't resolve bare `@tensor_1/tokens/...` specifiers in a `<link href>`, so the page
> references the installed `node_modules` paths directly. That's why `npm install` comes first.
> (The single-file `@tensor_1/tokens/bundle` — `build/css/styles.css` — is available when a full
> catalog in one request is preferable.) A bundler-based consumer can instead import selective
> paths such as `@tensor_1/tokens/components/button` and let
> the bundler resolve the specifiers — see the FR-3 Tailwind and FR-4 TypeScript examples.

## Smoke check

```sh
node verify.mjs
```

This is the example's smoke coverage. It packs `@tensor_1/tokens` to a tarball, installs it into
an **isolated** temp dir outside the workspace (via `file:<tgz>`, so npm can't symlink and hide
packaging bugs), then `require.resolve`s aggregate and selective subpaths, including
`components/button`, `components/card`, and `motion`. Exit code `0` means
the published package really exposes what the example links. It cleans up its temp dir on exit and
uses Node built-ins only.

The isolated-tarball approach is copied verbatim from `tests/smoke-consumer/run.mjs`
(ADR-0016 Decision 6).
