# UIx adoption and documentation audit

**Date:** 2026-09-07
**Scope:** the retired component style guide, workspace dashboard, Phase 46.9 examples, production component CSS, public React catalogue, and the unified docs app.

## Outcome

UIx now has one canonical, build-free documentation surface at `packages/tokens/docs/`. The useful content from the three former standalone pages is retained as 25 independently addressable example routes inside the docs shell: 14 core specimen chapters, 10 advanced component chapters, and one complete workspace composition.

Coverage is complete at the CSS documentation/example layer, but React parity is intentionally not claimed where it does not exist. The new **Component status** page reports CSS, React, reference, and example availability as separate facts.

| Layer | Audited result | Enforcement |
|---|---:|---|
| Public component CSS | 80 modules | Catalogue parity test reads `styles/components/*.css` |
| CSS modules with a docs reference | 80 / 80 | Every non-composite catalogue entry resolves to a route |
| CSS modules used by an integrated example | 80 / 80 | Coverage test requires at least one module class in migrated/additional markup |
| Mapped React catalogue entries | 58 | Explicit allowlist; never inferred from CSS |
| Integrated example routes | 25 | Unique-route and registry tests |
| Legacy top-level content retained | 14 core + 10 advanced + 1 workspace | Static registry and search inventory |

## What the audit found

### Five CSS modules had no demonstrated specimen

Calendar, List, Toast, Tooltip, and Typography existed in production CSS and were documented by the component catalogue, but no live example exercised them across the old pages and docs. Focused specimens are now attached to the relevant integrated example chapters. This closes the example-coverage total from 75/80 to 80/80.

### The workspace example was valid but architecturally isolated

The dashboard used 127 distinct `uix-*` classes, all backed by production CSS. It was therefore a good composition test, not a contract problem. Its complete content now lives at `#examples-workspace` inside the docs shell, where component references and search can link to it directly.

### Advanced examples represented real capabilities with four markup inconsistencies

All 10 Phase 46.9 example sections corresponded to shipped CSS modules and React components. The page nevertheless used names that did not match the public contract:

- `uix-eyebrow` is normalized to the shipped `uix-text-eyebrow` utility.
- `uix-file-upload` is normalized to the shipped `uix-dropzone` component.
- `uix-scheduling-calendar__grid--week` is removed because the base scheduling grid owns that layout.
- `uix-builder-canvas__items` is retained: it is emitted by the public React wrapper and styled by the builder canvas's container-qualified list selector.

The original guide also used `uix-select-rich` as an unstyled wrapper even though its behavior is correctly keyed by `data-uix-richselect`. The migrated markup removes that misleading class and retains the data hook.

The remaining guide/specimen classes are documentation chrome defined in `guide/guide.css`; they are not presented as product exports.

### CSS does not imply a React wrapper

Twenty-four CSS modules do not currently have a mapped React catalogue entry:

`slider`, `combobox`, `tag-input`, `file-upload`, `breadcrumbs`, `steps`, `stepper`, `menu`, `table-toolbar`, `calendar`, `lightbox`, `contact-card`, `attachment`, `audit-log`, `notification-center`, `sla`, `heartbeat`, `typography`, `reactions`, `media`, `kbd`, `link`, `utility-bits`, and `view-menu`.

This is a visible adoption fact, not a docs defect. Consumers can use these as framework-neutral CSS primitives. The status matrix prevents the old failure mode where a CSS example was mistaken for a React export.

## Documentation architecture

The consolidation follows the common reference-plus-examples pattern used by mature design-system docs:

1. **Reference pages** explain installation, API, accessibility, and component contracts.
2. **An example gallery** organizes specimens by user task rather than placing one enormous catalogue page beside the docs.
3. **Component pages link to a canonical live example** in the same shell.
4. **A status matrix** makes maturity and implementation layers inspectable.
5. **Search and persistent navigation** index both reference and example routes.

`docs/showcase-data.js` owns the migrated static markup. `docs/docs.js` owns navigation, routing, reference content, status, and component-to-example relationships. `guide/app.js` and `guide/phase-46-9.js` expose initializers so interactive specimens work after hash-route rendering. No server, framework, or build step is required to read the docs.

The retired `packages/tokens/index.html`, `packages/tokens/dashboard.html`, and `packages/tokens/phase-46-9.html` should not be recreated. New examples belong in the docs registry or a hand-authored docs renderer and must be linked from the related component catalogue entries.

## Verification contract

- The docs unit suite verifies catalogue parity, route uniqueness, 80/80 example coverage, absence of phantom public classes, and explicit React mappings.
- The accessibility suite scans every example route in both themes, plus the docs/status surfaces and specialist table specimen.
- The visual suite captures representative core, workspace, advanced, responsive, and table surfaces; Linux goldens remain the CI authority.
- Static link scanning must find no active-code or operational-doc reference to a retired page. Historical plans/specifications may retain old filenames as an accurate record of prior architecture.

## Files and ownership

- Canonical entry: `packages/tokens/docs/index.html`
- Docs shell: `packages/tokens/docs/explorer.html`
- Content/router/status: `packages/tokens/docs/docs.js`
- Integrated examples: `packages/tokens/docs/showcase-data.js`
- Docs presentation: `packages/tokens/docs/docs.css`
- Interactive specimen runtimes: `packages/tokens/guide/app.js`, `packages/tokens/guide/phase-46-9.js`
- Coverage tests: `packages/tokens/docs/docs.test.js`
- Browser gates: `tests/a11y/`, `tests/visual/`
