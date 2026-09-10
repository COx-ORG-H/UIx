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

## An a11y scan only sees the states a specimen renders at load

The selected filter chip used the solid accent as text on a tint of that accent: 3.21:1 in dark
mode, and under 3:1 in light mode for bright brands. The axe matrix stayed green because every
specimen renders its chips unselected, and `data-on` is only set after a click. A consumer's axe
run found it (mission-control, 2026-09-10). Stateful colour pairs need a computed check, not a
page scan. Gate: `npm run test:tokens` evaluates the built CSS and every theme file in cascade
order and asserts the selected-chip text clears 4.5:1 in both modes. It was watched to fail with
the old rule restored.

## A green Release run can publish nothing

The `v2.16.0` tag passed every gate and the Release run went green, yet npm had no 2.16.0. The
`NPM_TOKEN` secret had been replaced the day after 2.15.0 and resolved blank, and the publish
step treated a missing token as "inert-safe" and exited 0 with a notice. Check the registry, not
the run colour, after every tag. Gate: the publish step now fails the run when the token is
missing or blank.
