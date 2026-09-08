# UIx engineering lessons

## Component documentation must verify the component route

Gallery-wide CSS selector coverage does not prove that a component reference shows the
component. Use explicit specimen mappings and check the rendered reference page, including
target visibility and meaningful interactions. Gate: `tests/docs/verify-components.mjs`,
run by the CI a11y job. The gate was observed failing for a missing editorial specimen and
a combobox that selected the wrong source fragment before both were corrected.

## Routed specimens need lifecycle cleanup

Legacy standalone initializers often attach document/window handlers and observers. Calling
them on each route retains detached dialogs and stale state. Dispose listeners, observers
and global nodes before replacing the article. Gate: repeated lightbox navigation and
interaction in the component browser verification; implementation: `disposeShowcase()`.

## A shared preview can still produce a non-portable example

Copying a whole family showcase around a component can pull documentation-only classes and local
assets into the product snippet even when the target component itself is valid. Overlay references
must select the matching trigger and surface as explicit specimen parts; extracted media must be
self-contained or use a consumer-owned URL. Gate: the 82-route browser verification rejects
`uix-docs__*`, `uix-guide__*`, and repository `assets/` URLs in copied component markup.

## Focus the element that actually scrolls

A focusable documentation wrapper does not make a nested overflow container keyboard-scrollable.
Detailed Pipeline rails scroll horizontally on narrow surfaces, so plain HTML needs `tabindex="0"`
on the rail and the React adapter must provide that default. Gate: the docs browser check focuses
the Pipeline element, the React render test asserts its default, and the full axe matrix must pass.
