# UIx engineering lessons

<!-- lesson-skip: 7d2221d squash-merge of 8c831c1 (already skipped: routine CSS layout fixes) -->
<!-- lesson-skip: 8c831c1 routine CSS layout fixes; each cause shown by measuring the element -->
<!-- lesson-skip: 601d975 routine flex-wrap fix; nowrap bar is visible in the CSS, reflow gate already exists -->
<!-- lesson-skip: a7b5224 routine CSS scoping fix; the audit named the cause -->

### 2026-09-22 · docs specimens · `feat/saved-view-menu-sections`
- **Rule:** a list-based specimen (`ul.uix-menu` and similar) inside `.uix-docs__page` has to be looked at rendered, because the docs prose rules (`ul { padding-left }`, `li + li { margin-top }`) are unlayered and so beat every `@layer uix.components` rule.  **Why:** the saved-view specimen had been showing prose indents and gaps since it shipped, while contract, a11y and visual gates all stayed green (its route has no golden). The sectioned redesign made the rows look mis-indented against their section titles.  **Gate:** none general. `docs.css` now scopes its prose list rules with `:where()` to docs-authored lists only, so every kit list (`ul.uix-menu`, `.uix-prose ul`, `.uix-related-links__list`, `.uix-tree ul` …) is exempt; the workspace VR golden moved 44 px for exactly the two kit lists on that page and was re-baselined.  **Tag:** false-green, cascade-layers, docs

### 2026-09-18 · layout tests · `2f6e67a`
- **Rule:** measure an overrun against the parent's *content* box, and calibrate a self-sizing test against a property the fix does not touch.  **Why:** `.uix-composer`'s 8 px padding hid an 8 px `.uix-segmented` overrun that was measured against its border box, and a `min-content` calibration collapsed to one character as soon as `overflow-wrap: anywhere` landed, so the test narrowed the box to nonsense and failed for the wrong reason.  **Gate:** `tests/a11y/reflow-320.spec.mjs` measures against the bar's padding edge and forces `overflow-wrap: normal` on the options while calibrating.  **Tag:** false-green, reflow, test-calibration

### 2026-09-18 · layout tests · `8f4970d`
- **Rule:** an overflow or reflow test run against a docs specimen must first write in the longest real (localised) label the component will get; the specimen's short English copy fits even when the CSS is broken.  **Why:** the `1fr 1fr` + nowrap grid only overflowed with German portal labels, so a plain `scrollWidth === clientWidth` check passed on the broken CSS.  **Gate:** `tests/a11y/reflow-320.spec.mjs` injects a long label before measuring.  **Tag:** false-green, i18n, reflow

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
