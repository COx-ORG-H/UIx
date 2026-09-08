# UIx documentation and showcase consolidation

## Problem and audience

UIx maintainers and product engineers currently have four competing documentation surfaces: the new documentation app, the original all-in-one style guide, the standalone workspace dashboard, and the Phase 46.9 advanced examples page. The legacy pages contain valuable visual and interaction examples, but their separate navigation, chrome, and ownership model make the new docs feel incomplete and force readers to leave the reference they are using. The goal is one canonical, build-free UIx docs product that states implementation coverage honestly and contains the useful legacy examples in its own information architecture.

## Non-goals

- Do not redesign or change the public UIx component contract merely to make an example easier to migrate.
- Do not invent React support where only a CSS module exists.
- Do not introduce a framework, bundler, runtime API, or server requirement.
- Do not alter concurrent chart/workflow implementation work except to preserve its current examples during migration.
- Do not keep a hidden duplicate of either retired HTML page as another user-facing entry point.

## Acceptance criteria

1. Every public `styles/components/*.css` module is documented and demonstrated by at least one integrated docs example.
2. Every component shown in the legacy pages resolves to a real UIx CSS class or is explicitly labeled as docs-only composition chrome.
3. CSS, React, example, and documentation availability are shown as separate statuses; no layer is inferred from another.
4. The useful content from all 14 original style-guide sections, all 10 advanced-example sections, and the complete workspace composition is reachable inside the new docs shell and search.
5. Component reference pages link to internal example routes, never to retired pages.
6. `packages/tokens/index.html`, `packages/tokens/dashboard.html`, and `packages/tokens/phase-46-9.html` are removed after their current content is preserved.
7. The docs remain static and work on GitHub Pages without a build.
8. Unit, coverage, accessibility, and visual gates pass.

## Architecture decision

Use a static example registry consumed by the existing hash router. Each migrated section becomes a searchable `examples-*` route rendered inside the docs shell. The registry preserves the current example markup as data, while the docs app owns titles, navigation, search, page framing, and links. This follows common component-docs practice: one canonical shell, reference pages colocated with live examples, and an explicit component-status matrix.

The existing UIx production bundle remains the source of component styling. Showcase-only presentation rules remain in `guide/guide.css` temporarily but are scoped beneath the integrated example container. Existing demonstration runtimes are exposed as initializers and invoked after an example route renders. This avoids a second runtime or duplicated component implementation.

## Audit baseline

- Public CSS modules: 80.
- Modules exercised across the legacy pages and current docs: 75.
- Undemonstrated modules: Calendar, List, Toast, Tooltip, Typography.
- Original style-guide sections: 14.
- Advanced-example sections: 10; all ten correspond to exported CSS modules and React components.
- The workspace dashboard uses 127 UIx classes; every one is present in production CSS.
- Legacy page class-contract gaps:
  - Ten `uix-guide*`/specimen classes are legitimate documentation chrome.
  - Three advanced-page names were not production contracts: `uix-eyebrow`, `uix-file-upload`, and `uix-scheduling-calendar__grid--week`. During migration they are replaced with `uix-text-eyebrow`, `uix-dropzone`, or removed when the production base class owns the layout.
  - `uix-select-rich` was an unstyled wrapper despite behavior already using `data-uix-richselect`; the migrated markup removes the misleading class.
  - `uix-builder-canvas__items` is a legitimate React structural class styled through the builder canvas's container-qualified `ol` selector; the audit recognizes public React markup instead of falsely reporting it as phantom CSS.

## Implementation steps

1. Capture the current, including concurrently expanded chart/workflow, contents of all three legacy pages into a generated static example registry.
2. Normalize relative asset links and internal anchors for the docs location.
3. Add an Examples overview, 25 example routes, search entries, and internal component-to-example mapping.
4. Add native specimens for the five previously undemonstrated CSS modules.
5. Add a Component status page/table exposing CSS, React, docs, and example coverage independently.
6. Refactor the two existing showcase scripts into callable, repeatable initializers and invoke the relevant initializer after route render.
7. Scope legacy showcase chrome within the docs article so migrated examples inherit the docs layout rather than recreating a second page.
8. Replace all links to the legacy pages, then delete all three HTML entry points.
9. Replace source-page-dependent tests with registry and production-contract gates.
10. Record the completed audit in `Docs/audits/2026-09-07-uix-adoption-and-docs-audit.md`.

## Risks and early checks

- Dynamic examples may lose behavior when revisited. Expose explicit initializers and test representative interaction routes after each render.
- Old guide CSS may leak into docs chrome. Scope or override every reused guide layout selector under the integrated example host.
- Deleting a dirty source page could lose concurrent work. Generate and diff the registry from the current working-copy content before removal, and do not stage unrelated implementation files.
- A generated coverage claim may be false-green. Compare actual CSS filenames and selectors against the registry in DOM-free tests.

## Data, security, and production readiness

The site remains static. It contains no user data, authentication, persistence, tenant state, secrets, or external writes. Local storage remains limited to the existing theme and demonstration preferences. GitHub Pages remains the delivery path and existing CI remains the release gate.

## Verification

- `node --test packages/tokens/docs/docs.test.js`
- Existing guide/runtime unit tests.
- `npm run test:a11y -- --grep docs` in light and dark modes, expanded to representative example routes.
- `npm run test:visual` on CI.
- Static link scan proving no tracked file references either retired HTML page.
- Coverage audit proving all 80 CSS modules have a docs route and an integrated example.

## Files expected to change

- `packages/tokens/docs/explorer.html`
- `packages/tokens/docs/docs.css`
- `packages/tokens/docs/docs.js`
- `packages/tokens/docs/docs.test.js`
- `packages/tokens/docs/README.md`
- `packages/tokens/docs/showcase-data.js` (new generated registry)
- `packages/tokens/guide/app.js`
- `packages/tokens/guide/phase-46-9.js`
- `packages/tokens/index.html` (removed)
- `packages/tokens/dashboard.html` (removed)
- `packages/tokens/phase-46-9.html` (removed)
- `Docs/audits/2026-09-07-uix-adoption-and-docs-audit.md` (new)
- this plan

## Completion record

- Consolidated all three legacy surfaces into 25 searchable docs routes and removed their standalone HTML files.
- Added the Component status matrix and enforced 80/80 CSS reference/example coverage without presenting the 24 CSS-only modules as React exports.
- Corrected legacy contract mismatches, supplied the five missing specimens, and gave Color Picker its own interactive route instead of a cross-page pointer.
- Expanded the accessibility gate from a few page-level scans to every integrated example in both themes. The migration audit fixed two scroll-region keyboard gaps and invalid calendar ARIA; 79 cases passed together and the single table scan that timed out under concurrent visual load passed alone. All 80 cases therefore have a green Linux result.
- Replaced obsolete index/dashboard/Phase screenshot baselines with representative docs-route baselines. The pinned Linux visual run passes all 10 screenshots.
- Kept direct-file viewing through the repository-root `index.html`; the explicit `packages/tokens/docs/index.html` path also works with the repo's local static-server configuration.
