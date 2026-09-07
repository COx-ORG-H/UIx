# UIx documentation site — implementation plan

**Date:** 2026-09-07
**Status:** Complete
**Owner:** Codex
**Delivery surface:** `packages/tokens/docs/` and GitHub Pages

## Definition of Ready

### Problem and audience

UIx already has a comprehensive build-free showcase, token package, React package, and realistic example applications, but its dedicated documentation surface is only an empty explorer shell. Product engineers and designers need a polished, searchable reference that explains how to install UIx, adopt its token contract, choose the correct package, apply themes, and use common components without reverse-engineering the showcase source.

### Non-goals

- Do not replace the existing style guide, dashboard, table demo, or advanced capability showcase.
- Do not add a framework, build step, backend, authentication, analytics, or external content service.
- Do not claim pricing, support guarantees, public availability, or package capabilities not present in the repository.
- Do not attempt exhaustive handwritten API documentation for every React export in this first delivery; make the full inventory discoverable and provide detailed pages for the highest-frequency adoption paths and primitives.
- Do not add a hosted runtime, custom domain, or deployment platform beyond the user-requested GitHub Pages static publication.

### Acceptance criteria

1. `packages/tokens/docs/explorer.html` opens directly and through the existing static server with a complete documentation experience, not empty regions.
2. The first page gives an actionable UIx quick start with accurate CSS, Tailwind, and React installation paths derived from the live package manifests and README.
3. Persistent navigation groups cover Getting started, Foundations, Components, and Patterns; the complete 80-module CSS component inventory remains discoverable.
4. Search works from the header and keyboard (`/` or `Ctrl/Cmd+K`), ranks useful results, supports arrow-key selection, Enter navigation, and Escape dismissal.
5. Detailed reference pages exist for the core adoption surfaces: introduction, installation, theming, design tokens, all components, Button, Input, Table, Status Pill, Alert, Tabs, App Shell, and React usage.
6. Component pages include real UIx-rendered examples, copyable code, practical usage guidance, and accessibility notes.
7. Light/dark mode, mobile navigation, visible focus, reduced motion, semantic landmarks, skip navigation, and empty/no-result recovery work.
8. Existing pure helper tests continue to pass; new route/search helpers are unit tested; serious/critical axe violations are gated on the docs page.
9. The repository build and relevant docs tests pass, and the finished page is verified from the served artifact.

### Stack and rationale

Preserve the project’s existing build-free architecture: semantic HTML, the generated UIx CSS bundle, one docs-only stylesheet, and one vanilla ES module. This keeps the docs directly openable from disk, exercises the production CSS contract, avoids a second UI stack, and follows the established `docs/` scaffold. A client-rendered hash router provides multiple documentation views without introducing generated files or server routing.

### Top risks and early checks

1. **Docs drift from shipped APIs.** Copy package names, exports, class names, and versions from live manifests/source; link the exhaustive catalogue back to the canonical showcase.
2. **Documentation chrome fights the design-system cascade.** Keep chrome in `docs.css`, use `--uix-*` tokens exclusively, and render examples with real `.uix-*` classes.
3. **Dense navigation becomes inaccessible on small screens.** Add an explicit mobile drawer pattern, focus management, overlay dismissal, and responsive checks.

### Data, security, and compliance

All content is first-party static documentation. There is no user data, persistence beyond the existing theme preference, network data, or executable user input. Interpolated search and route labels are escaped before insertion. Code-copy uses fixed repository-authored samples only.

### Production-readiness seed

- Accessibility: owned in this slice through semantics, keyboard paths, reduced motion, and axe coverage.
- Delivery: GitHub Pages publishes the verified static package through a pinned GitHub Actions workflow.
- Observability, tenancy, identity, persistence, recovery, secrets, compliance logging, and AI safety: deferred until UIx docs gain a hosted runtime or user-owned data because this surface is static and read-only.

## Visual thesis

**Enterprise field manual.** A compact indigo top rail, crisp neutral reading surface, editorially strong typography, and a subtle cyan signal accent make the system feel like a maintained commercial product while preserving UIx’s dense enterprise DNA. The memorable element is a live “system specimen” beside the quick start: tokens, status, form control, and action hierarchy shown together in the first viewport.

## Implementation sequence

1. Replace the empty explorer HTML shell with complete global chrome, accessible mobile controls, search dialog, navigation hosts, page host, and footer/resource links.
2. Rebuild `docs.css` around UIx tokens: three-column desktop documentation layout, responsive side drawer, readable article measure, live example frames, code blocks, component inventory, search results, and dark mode.
3. Expand `docs.js` into a static content registry and hash router while retaining/exporting the existing pure helpers. Add navigation generation, search ranking, table-of-contents generation, code copy, example/code tabs, theme switching, and mobile focus behavior.
4. Add `docs/index.html` as the clean directory entry while preserving `explorer.html` as the established canonical file.
5. Update docs tests with route/search behavior and add the docs page to the axe test matrix.
6. Update `packages/tokens/docs/README.md` and the tokens package README so a future agent knows the current structure and extension points.
7. Run unit tests, the token build/contract checks, and the docs accessibility gate. Serve the repository and verify the resulting artifact.

## Files created or changed

- `Docs/plans/2026-09-07-uix-documentation-site.md` — this Ready brief, implementation plan, and handoff record.
- `packages/tokens/docs/explorer.html` — canonical documentation shell.
- `packages/tokens/docs/index.html` — clean entry point for `/docs/`.
- `packages/tokens/docs/docs.css` — documentation chrome and responsive presentation.
- `packages/tokens/docs/docs.js` — content registry, search, routing, and interactions.
- `packages/tokens/docs/docs.test.js` — pure helper coverage.
- `packages/tokens/docs/README.md` — maintainer guide.
- `packages/tokens/README.md` — consumer-facing docs entry update.
- `tests/a11y/a11y.spec.mjs` — documentation page included in the existing accessibility gate.
- `.github/workflows/docs-pages.yml` — builds and publishes the static UIx package to GitHub Pages.

## Verification record

- `node --check packages/tokens/docs/docs.js` — passed.
- `node --test packages/tokens/docs/docs.test.js` — 14/14 tests passed.
- `npm run build` — token, theme, and style builds completed successfully.
- `npm run test:parity` — 214 `--uix-*` declarations match the frozen baseline.
- `npm run test:contract` — all 23 contract categories passed with no unjustified raw values.
- `npx playwright test tests/a11y/a11y.spec.mjs --grep docs --reporter=line` — documentation page passed the serious/critical WCAG gate in light and dark projects.
- `Invoke-WebRequest http://localhost:4178/packages/tokens/docs/explorer.html#introduction` — served artifact returned HTTP 200.
- The live documentation route was handed off to the Codex preview at `http://localhost:4178/packages/tokens/docs/explorer.html#introduction`.

### GitHub Pages addendum

At the user's request, the repository's existing GitHub Pages configuration is now driven by
`.github/workflows/docs-pages.yml`. The workflow builds the token contract, assembles the static package without
source-only or dependency directories, uploads the Pages artifact, and deploys it with least-privilege permissions.
Every third-party action is pinned to an immutable commit SHA. The full style guide publishes at the Pages root and
the documentation product at `/docs/`; the repository homepage points directly to that documentation URL.

Unrelated in-progress chart/workflow edits appeared in the shared worktree during verification and were preserved
outside this documentation slice.
