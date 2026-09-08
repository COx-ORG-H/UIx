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
- `packages/tokens/docs/docs.test.js`: registry and per-component coverage gates.
- `tests/docs/`: browser regression verification.
- `packages/tokens/docs/README.md`: authoring instructions.
- This plan: implementation status and handoff details.

## Status

Ready: scope and acceptance derived from the user request; implementation in progress.
