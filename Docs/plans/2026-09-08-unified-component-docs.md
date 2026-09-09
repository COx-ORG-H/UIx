# Unified component documentation

## Ready / scope

People and coding agents need each UIx component reference to show its actual appearance,
copyable markup, supported integration layer, and expected behavior. Current references
send readers to family showcases and generic CSS imports; coverage only proves that a
selector occurs somewhere in the gallery.

Keep the existing static ES-module docs application and production UIx CSS. Reuse the
maintained specimens as one source rather than introduce another framework or duplicated
component implementations. No package API redesign, deployment, or new backend is in
scope. Demonstration data stays local; file selection must never imply a real upload.

## Acceptance criteria

- Every component is reachable in the sidebar and has a rendered specimen on its own page.
- Color picker, tag input, and file upload have focused, usable previews and specific
  guidance about input, validation, results, and implementation responsibilities.
- Preview and copyable HTML come from the same specimen. React availability is explicit.
- Foundations explain how to compose and theme a whole UI with UIx; a contribution guide
  connects product discoveries to reusable components and required docs/tests.
- Larger examples link to their constituent components within the same docs shell.
- Tests check per-component preview coverage, not just gallery-wide class occurrence;
  browser checks cover rendering, navigation, copy views, interactions, themes and width.

## Implementation sequence

1. Define component-to-specimen selectors against existing CSS and showcase markup.
2. Render focused specimens on references using the shared demo renderer; initialize the
   existing behavior against the mounted document. Keep family compositions as context.
3. Add specific usage/behavior guidance, system composition and extension pages, and
   sidebar entries for the full catalogue. Fix tag/file demo interactions locally.
4. Add coverage and browser regression checks. Verify with the available bundled browser
   runtime without starting a dev server or rebuilding packages (workspace preference).
5. Record exact results and limitations here, review, commit and push the feature branch.

## Risks and mitigations

- Extracted specimens can lose required ancestors or related controls: select complete
  example boundaries and verify every mounted component in a browser.
- CSS-only specimens can suggest unsupported React/backend behavior: state availability
  and caller responsibilities alongside previews; never simulate persisted success.
- Old coverage claims may be stale: verify rendered DOM and production selectors.

## Files

- `packages/tokens/docs/docs.js`: routing, references, shared preview mounting, guides/nav.
- `packages/tokens/docs/component-specimens.js`: explicit specimen selection contract.
- `packages/tokens/docs/component-guidance.js`: use case and expected result for all 92 entries (80 CSS modules and 12 component compositions).
- `packages/tokens/docs/form-specimens.js`: shared working tag/file examples.
- `packages/tokens/guide/app.js`: route lifecycle cleanup.
- `packages/tokens/guide/phase-46-9.js`: working HSV/hex/contrast demo, scoped to the picker.
- `packages/react/src/components/Pipeline.tsx`: keyboard-focusable detailed overflow rail.
- `packages/react/src/workflow-chart-components.test.mjs`: React Pipeline render contract.
- `packages/tokens/docs/docs.test.js`: registry and per-component coverage gates.
- `tests/docs/`: browser regression verification.
- `packages/tokens/docs/README.md`: authoring instructions.
- This plan: implementation status and handoff details.

## Status

Implemented. References now mount previews from maintained composition markup; all 92 entries
have navigation, guidance and specimen contracts. Added Build with UIx and Extend the system
guides. Compositions link back to their constituent references. Tag and file examples work
locally; color HSV/hex editing updates the actual swatch and computes white-text contrast.

## Verification and handoff

- 57 docs/guide unit tests pass.
- Browser verification passes 92 routes in both themes (184 mounts), visible ordinary
  specimens, combobox filtering/selection, repeated lightbox visits, tag add/duplicate/remove,
  local file selection, code view, color HSV/hex and computed swatch/contrast checks.
- Axe reports no serious/critical WCAG A/AA findings on the three focused controls and two
  new guides in both themes, including the open color picker (10 scans).
- Narrow/wide screenshots inspected. Native file input uses the UIx input class to avoid
  overflowing its narrow preview. Color screenshots reset scroll after opening the picker.
- CI's a11y job now runs the docs unit suite and component browser verification.
- Linux visual coverage now includes the actual color-picker, tag-input and file-upload
  references, plus existing foundations, workspace, rule-builder and table pages (14 images).
- Independent read-only review caught stale global listeners, a wrong combobox specimen,
  static color behavior and a swatch variable-resolution issue. All were fixed and covered
  by interaction or computed-style assertions.
- Follow-up audit on 2026-09-08 found CI's full a11y matrix correctly blocking the static
  Pipeline preview: first the scrollable demo panel and then the detailed rail itself had no
  keyboard focus target. Demo tabpanels are now focusable; detailed plain-HTML pipelines receive
  `tabindex="0"`; and the React adapter supplies the same default while preserving a caller
  override. The browser gate explicitly focuses the actual Pipeline element.
- The same audit found Modal, Drawer, Popover, Peek and Lightbox code views copying their entire
  family showcase, including docs-only layout classes, and Media copying a repository-only image
  URL. Overlay specimen contracts now select the matching trigger and surface explicitly, and
  extracted images use a self-contained data image. The browser gate rejects docs-only classes
  and assets in every copied component snippet and opens/closes all seven overlay references.
- Follow-up verification: token build, parity and contract checks pass; docs/guide tests pass 57/57;
  component browser verification passes 92 routes in both themes; React workflow/chart tests pass
  5/5; API extraction passes; the isolated package smoke test passes with React 18 and 19; and the
  full accessibility matrix passes 80/80 in light and dark. Linux visual status remains delegated
  to CI by repository policy; final-revision confirmation is recorded in the PR check history.
- Integration with the current default branch added ten React component compositions: Filter popover,
  Saved view menu, Relative time, Confirm dialog, Prompt dialog, Async operation status, Detail page,
  Related links, Toggle row and Collapsible section. Each now has component-specific guidance, a shared
  portable specimen and an explicit React-availability mapping. The catalogue duplicate for View menu
  was removed, the browser gate opens both new dialogs, and the coverage count is now 92 unique routes.

Scope limits: previews demonstrate production HTML/CSS plus documented sample behavior;
they do not mount the React adapters or provide backend persistence/uploads. Existing React
API reports remain the exact prop reference. No production deployment or package release.
This branch builds on `codex/release-uix-2-13-0` (PR #23); review it against that branch to
avoid including earlier workflow/chart changes. Follow normal required CI gates before merge.
