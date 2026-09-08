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
| `component-specimens.js` | Explicit catalogue-to-specimen selector registry; references and compositions consume the same markup. |
| `form-specimens.js` | Shared tag-input and file-selection markup and local demo behavior. |
| `docs.test.js` | DOM-free tests for rendering helpers, search, catalogue parity, example coverage, and public-class integrity. |

## Content model

`NAV_ITEMS` in `docs.js` is the canonical page order and search metadata. `PAGES` maps hand-authored guide and
component slugs to content renderers. Add a major guide page in both places, then use the shared `pageHeader`,
`section`, `demo`, `codeBlock`, `callout`, and `compare` helpers so reference pages keep one rhythm.

The complete component inventory lives in `COMPONENT_GROUPS`. Every entry gets its own route: a hand-authored
page when one exists, otherwise a generated reference with its import path, behavior boundary, and inline
preview/code view. `COMPONENT_SPECIMENS` locates the maintained specimen for every route; complete example
boundaries preserve companion controls. All components are listed in the sidebar. `COMPOSITE_PATTERNS`
identifies compositions that do not have standalone CSS exports.
Search and catalogue cards always open the component route directly.

`SHOWCASE_PAGES` is the canonical example inventory: 14 core specimen chapters, 10 advanced component chapters,
and one complete workspace composition. The unit tests compare the non-composite catalogue with
`styles/components/*.css`, require every CSS module to appear in an integrated example, and reject example markup
that names a class outside production or docs-only CSS. Adding a public stylesheet without docs and example
coverage therefore fails the docs test instead of silently creating a gap.

`tests/docs/verify-components.mjs` checks that all 82 component pages mount their registered specimen in light
and dark mode, ordinary specimens are visible, navigation selects the component, and tag input, file selection,
color editing, combobox selection and repeated lightbox visits work. It also checks narrow/wide pages and axe
on the new guides and focused form references. CI runs this in the a11y job. The explicit selector must belong
to the component's production CSS module; a generic button elsewhere in the gallery is not sufficient.

Add component-specific guidance in `COMPONENT_DETAILS` for behavior beyond the family baseline. The
`#build-with-uix` and `#extend-the-system` pages describe composition and the contribution contract for
humans and agents. Call `disposeShowcase()` before replacing mounted markup to release global listeners,
observers and tooltip nodes. A preview documents the HTML/CSS layer and docs behavior, not a mounted React tree.

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
node tests/docs/verify-components.mjs
npm run test:a11y -- --grep docs
```

The page uses the same no-flash `uix-theme` preference and generated CSS bundle as the primary showcase. It has
no backend or uploads. Interactive selections stay local; existing theme and showcase view preferences use
local storage. The standalone browser verification intercepts local files and does not start a server. Optional
`UIX_PLAYWRIGHT_MODULE` and `UIX_AXE_PATH` variables select bundled dependencies on machines without a complete install.
