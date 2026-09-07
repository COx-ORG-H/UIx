# UIx documentation coverage expansion

## Goal

Make the build-free UIx documentation a complete, enforceable index of the canonical token-package showcase and every independently importable CSS component.

## Definition of Ready

- The existing documentation app is already live and remains a static, hash-routed site under `packages/tokens/docs/`.
- The canonical implementation inventory is `packages/tokens/styles/components/*.css`; the canonical visual/state matrix is `packages/tokens/index.html`.
- No build step, framework, runtime fetch, or server-only behavior may be introduced because the docs must keep working from `file://`.
- The work is isolated to docs files, docs tests, and this plan. Concurrent chart/workflow changes elsewhere in the worktree are out of scope.
- Existing detailed reference pages remain authoritative. Generic reference pages must not invent React props or claim a standalone CSS export for composite showcase patterns.

## Comparison findings

1. The docs catalogue contains 81 names while the component directory contains 80 CSS modules.
2. `Nav favourites` and `Composer` appear in the original showcase as composed patterns, but neither has a standalone component stylesheet.
3. `segmented.css` is independently importable but absent from the docs catalogue.
4. Only the handful of hand-authored component pages have dedicated routes. Every other catalogue search result currently returns readers to `All components`.
5. The showcase sections for motion and icon/asset guidance have no direct destination in the docs navigation.

## Implementation plan

1. Correct `COMPONENT_GROUPS` by adding Segmented while retaining and explicitly identifying the two composite patterns.
2. Add a generic component-reference renderer for every catalogue entry without a hand-authored page. It must include the verified CSS import path when one exists, distinguish composite patterns, link to the relevant state matrix in the original showcase, and include concise usage/accessibility guidance.
3. Route catalogue cards and search results to each component’s own reference page.
4. Add dedicated Motion and Icons & assets foundation pages that map the uncovered showcase sections into the docs product.
5. Export coverage metadata and routing helpers for DOM-free tests.
6. Add tests that compare the catalogue against actual component CSS filenames, verify composite declarations, verify all canonical showcase sections are mapped, and prove every component slug resolves.
7. Update the docs maintainer README with the coverage model and gate.

## Verification

- `node --test packages/tokens/docs/docs.test.js`
- Serve the existing static site and run the docs accessibility checks in both themes.
- Confirm an importable module route (for example `#segmented`) and a composite route (for example `#composer`) render with different availability guidance.
- Confirm a search result opens its dedicated route rather than the catalogue root.
- Inspect the final diff and stage only the files listed below.

## Files owned by this change

- `packages/tokens/docs/docs.js`
- `packages/tokens/docs/docs.test.js`
- `packages/tokens/docs/README.md`
- `Docs/plans/2026-09-07-uix-docs-coverage.md`

## Handoff notes

The generated CSS bundles and `packages/tokens/index.html` may be dirty because another workflow is expanding charts and workflows. Do not stage or modify those files. If the component directory changes while this work is in progress, rerun the coverage test and update the catalogue only when the new module is an intentional public export.

## Completed outcome

- Added dedicated reference routing for all 82 catalogue entries: 80 verified CSS module exports and two explicitly labeled composite patterns.
- Restored the missing Segmented entry and preserved Nav favourites and Composer without claiming nonexistent package exports.
- Added Motion and Icons & assets foundation pages covering the old showcase’s motion, icons, emoji, and image sections.
- Added a coverage gate for component filenames, composite declarations, showcase-section mapping, and route resolution.
- Verified 18 documentation unit tests and the docs accessibility suite in light and dark themes.
