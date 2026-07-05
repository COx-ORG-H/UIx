# Web-components feasibility spike (FR-1)

**Status:** Spike complete — findings recorded, no package built.
**Artifact:** `examples/wc-spike/` (`uix-button.mjs`, `uix-button.html`). Throwaway by design.

## Question

The audit scored **framework reach 4/5**. React is the canonical wrapper channel; could UIx also
offer a **framework-agnostic** custom-elements layer (`@tensor_1/wc`) cheaply, reusing the existing
`--uix-*` / `.uix-*` system? This spike builds one `<uix-button>` to find the real constraints
before committing to a maintained package.

## What was built

A single `<uix-button variant …>` custom element with two modes:

- **Light DOM** — renders `.uix-btn` into the element's light DOM.
- **Shadow DOM** (`shadow` attribute) — renders `.uix-btn` into an attached shadow root.

Placed next to a hand-written `.uix-btn` for a pixel-parity comparison, with a light/dark toggle.

## Findings

1. **Light-DOM custom elements are trivially compatible.** The element just emits `.uix-btn` markup;
   the page's component stylesheet (`@tensor_1/tokens/styles`) styles it with zero extra work, and it
   is pixel-identical to a plain `.uix-btn` in both themes. A light-DOM WC layer would be a very thin
   wrapper over the existing CSS — essentially the React wrappers' story without React.

2. **The shadow-DOM styling constraint is the whole cost.** Two different behaviours meet at the
   boundary:
   - `--uix-*` **custom properties inherit through** the shadow boundary. The token contract (and the
     live brand override via `var()`/`color-mix()`) resolves correctly *inside* a shadow root with no
     extra work — theming and dark mode Just Work.
   - `.uix-*` **class rules do NOT cross** the boundary. A `.uix-btn` inside a shadow root is unstyled
     unless the component CSS is **re-injected** into that root. The spike re-injects via `<link>`;
     the production-correct approach is `adoptedStyleSheets` with the component CSS parsed **once** into
     a shared `CSSStyleSheet` and adopted by every instance (avoids N copies).

   So shadow encapsulation is achievable, but every WC would need a build step that pairs it with its
   slice of the component CSS (the registry manifest from DIST-2 already knows which file + which
   `--uix-*` deps each component needs — it would feed this).

## Maintenance-cost estimate

- **Light-DOM-only WC layer:** *low.* A generator over the same class map the React wrappers use; no
  per-component CSS bundling. But it gives up encapsulation (page CSS can collide) — it is barely more
  than "use the classes directly."
- **Shadow-DOM WC layer (encapsulated):** *medium-to-high, ongoing.* Needs per-component CSS
  extraction + inlining, an `adoptedStyleSheets` runtime, SSR/declarative-shadow-DOM handling, and a
  second a11y/VR test surface — a standing package to keep in lockstep with every CSS change. This is
  a real second product, not a thin wrapper.

## Decision — go/no-go trigger

**No-go for now.** Do not build a maintained `@tensor_1/wc` package on speculation.

**Promote to a maintained `@tensor_1/wc` package only when a concrete, committed non-React product
surface needs it** (e.g. a house product shipping without React, or an embed/widget that must be
framework-agnostic and style-encapsulated). When that trigger fires, prefer the **shadow-DOM +
`adoptedStyleSheets`** design fed by the DIST-2 registry, and add it to CI (VR + jest-axe-equivalent)
as a first-class surface. Until then, non-React consumers use the CSS-only path
(`docs/consume-css-only.md`) + the `uix add` copy-in CLI.
