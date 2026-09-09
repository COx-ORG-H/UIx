# ADR-0002: Component-owned documentation

Status: Accepted

Date: 2026-09-08

## Context

Consolidating standalone showcases into a docs shell left most component references with
only CSS imports and a link to a family example. A gallery-wide selector test passed even
when the component's own page showed no component. Users need appearance, integration and
behavior expectations together, and a repeatable contribution path from product projects.

## Decision

Keep the dependency-free documentation application. Each catalogue entry owns an inline
preview/code view, selected explicitly through `docs/component-specimens.js` from the
maintained composition markup. Preview and copy view use the same initial HTML. Complete
specimen boundaries retain companion controls. Larger composition routes remain useful
and link to their component references. All catalogue entries appear in navigation.

CSS, React adapters, docs behavior and backend responsibilities are stated independently.
Build-with-UIx and extension guides connect foundations to component use and contribution.
The browser coverage gate checks every component page in both themes, ordinary component
visibility, key interactions and narrow layout. Global showcase behavior is disposed on
navigation so component routing does not accumulate listeners.

## Consequences

New components need a catalogue entry, explicit specimen mapping, guidance and tests in
the same change. The gallery remains a single markup source rather than a separate style
guide. Extraction depends on stable specimen selectors and boundaries; a browser gate
detects missing targets, while interaction tests remain necessary for behavior claims.
The static preview demonstrates HTML/CSS and documentation behavior, not mounted React.

## Alternatives

Keeping only links preserves the original usability failure. Copying every specimen into
a second registry duplicates its markup. A framework migration adds build/dependency cost
without being necessary to fix component ownership; reconsider when mounted adapter demos
become a requirement.
