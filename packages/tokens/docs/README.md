# UIx Docs

The build-free UIx documentation product. It turns the token package, CSS catalogue, React package, and
enterprise interaction patterns into a searchable reference without introducing a second framework or build.

## Entry points

| File | Purpose |
|---|---|
| `index.html` | Clean `/docs/` entry that preserves a requested hash and opens the canonical explorer. |
| `explorer.html` | Persistent application shell: product header, grouped navigation, article host, page TOC, search dialog, mobile drawer, and copy feedback. |
| `docs.css` | Documentation-only chrome. It consumes the generated `--uix-*` contract and is never shipped to product consumers. |
| `docs.js` | Static content registry, hash router, search ranking, navigation, status matrix, copy actions, examples, tabs, theme handling, and mobile focus behavior. |
| `showcase-data.js` | One-time migration of the retired style-guide, workspace, and advanced specimens into 25 independently addressable docs routes. |
| `docs.test.js` | DOM-free tests for rendering helpers, search, catalogue parity, example coverage, and public-class integrity. |

## Content model

`NAV_ITEMS` in `docs.js` is the canonical page order and search metadata. `PAGES` maps hand-authored guide and
component slugs to content renderers. Add a major guide page in both places, then use the shared `pageHeader`,
`section`, `demo`, `codeBlock`, `callout`, and `compare` helpers so reference pages keep one rhythm.

The complete component inventory lives in `COMPONENT_GROUPS`. Every entry gets its own route: a hand-authored
page when one exists, otherwise a generated reference with its verified import path and a link to the relevant
integrated example. `COMPOSITE_PATTERNS` identifies showcase compositions that do not have standalone CSS exports.
Search and catalogue cards always open the component route directly.

`SHOWCASE_PAGES` is the canonical example inventory: 14 core specimen chapters, 10 advanced component chapters,
and one complete workspace composition. The unit tests compare the non-composite catalogue with
`styles/components/*.css`, require every CSS module to appear in an integrated example, and reject example markup
that names a class outside production or docs-only CSS. Adding a public stylesheet without docs and example
coverage therefore fails the docs test instead of silently creating a gap.

Do not add another standalone showcase page. Add a route to the registry (or a hand-authored docs renderer), map
the related catalogue entries to it, and keep **Component status** honest about whether CSS, React, docs, and an
example each exist.

Keep package names, exports, version labels, class names, and props synchronized with the live manifests and
`packages/react/etc/uix-react.api.md`. The docs must describe verified reality, not a future API.

## Run and test

From the repository root:

```sh
npm run serve:styleguide
# http://localhost:4178/packages/tokens/docs/index.html

node --test packages/tokens/docs/docs.test.js
npm run test:a11y -- --grep docs
```

The page uses the same no-flash `uix-theme` preference and generated CSS bundle as the primary showcase. It has
no runtime data source, user data, or persistence beyond that existing color-mode preference.
